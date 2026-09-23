import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { factory, identifier, printFile } from '../../src/codegen/typescript/ast.js'
import { typescriptEvalBoolBackend } from '../../src/codegen/typescript/sql/check.js'
import { typescriptSqlBackend } from '../../src/codegen/typescript/sql/registry.js'
import { typescriptSqlRuntime } from '../../src/codegen/typescript/sql/runtime.js'
import { go, printGoFile } from '../../src/codegen/go/ast.js'
import { goEvalBoolBackend } from '../../src/codegen/go/sql/check.js'
import { goSqlBackend } from '../../src/codegen/go/sql/registry.js'
import { goSqlRuntime } from '../../src/codegen/go/sql/runtime.js'
import {
  emitEvalBoolExpression,
  type EvalBoolExpression,
} from '../../src/sql-semantics/check-expressions.js'
import { emitSqlExpression, type SqlExpression } from '../../src/sql-semantics/expressions.js'
import type { PostgresRegexOptions } from '../../src/sql-semantics/regex/ast.js'
import { parseRegexpLikeFlags } from '../../src/sql-semantics/regex/flags.js'
import { numericMathCopyright } from '../../src/sql-semantics/numeric-math-license.js'

const run = promisify(execFile)

type Expected = { certain: false } | { certain: true; value: boolean | null; error?: string }

interface CheckCase {
  name: string
  expression: EvalBoolExpression
  expected: Expected
}

const certain = (input: boolean | null): EvalBoolExpression => ({
  kind: 'certain',
  expression: { kind: 'boolean', type: 'pg_catalog.bool', value: input },
})

const uncertain: EvalBoolExpression = { kind: 'uncertain' }

const regex = (
  subject: string | null,
  pattern: string,
  options: PostgresRegexOptions = {},
  negated = false,
): Extract<EvalBoolExpression, { kind: 'eval-regex' }> => ({
  kind: 'eval-regex',
  subject: { kind: 'text', type: 'pg_catalog.text', value: subject },
  pattern,
  options,
  negated,
  collation: 'C',
})

const dynamicRegex = (
  subject: string | null,
  pattern: string | null,
  options: PostgresRegexOptions = {},
  negated = false,
): Extract<EvalBoolExpression, { kind: 'eval-regex' }> => ({
  ...regex(subject, '', options, negated),
  pattern: { kind: 'text', type: 'pg_catalog.text', value: pattern },
})

const text = (value: string | null): SqlExpression => ({
  kind: 'text',
  type: 'pg_catalog.text',
  value,
})

const regexCall = (
  kind: 'operator' | 'function',
  name: string,
  operands: readonly SqlExpression[],
): EvalBoolExpression => ({
  kind: 'eval-call',
  call: {
    kind,
    type: 'pg_catalog.bool',
    signature: `${kind}:${JSON.stringify(['pg_catalog', name])}(${operands.map((operand) => operand.type).join(',')})`,
    collation: 'C',
    operands,
  },
})

const similar = (pattern: SqlExpression, escape?: SqlExpression): SqlExpression => ({
  kind: 'function',
  type: 'pg_catalog.text',
  signature: `function:["pg_catalog","similar_to_escape"](${escape ? 'pg_catalog.text,pg_catalog.text' : 'pg_catalog.text'})`,
  operands: escape ? [pattern, escape] : [pattern],
})

const concat = (left: SqlExpression, right: SqlExpression): SqlExpression => ({
  kind: 'operator',
  type: 'pg_catalog.text',
  signature: 'operator:["pg_catalog","||"](pg_catalog.text,pg_catalog.text)',
  operands: [left, right],
})

const bpchar = (value: string | null): SqlExpression => ({
  kind: 'text-coercion',
  type: 'pg_catalog.bpchar',
  length: 3,
  explicit: false,
  operand: text(value),
})

const integer = (value: string): SqlExpression => ({
  kind: 'integer',
  type: 'pg_catalog.int4',
  value,
})

const divisionByZero: EvalBoolExpression = {
  kind: 'certain',
  expression: {
    kind: 'operator',
    type: 'pg_catalog.bool',
    signature: 'operator:["pg_catalog","="](pg_catalog.int4,pg_catalog.int4)',
    operands: [
      {
        kind: 'operator',
        type: 'pg_catalog.int4',
        signature: 'operator:["pg_catalog","/"](pg_catalog.int4,pg_catalog.int4)',
        operands: [integer('1'), integer('0')],
      },
      integer('0'),
    ],
  },
}

const latticeAtoms = [
  ['true', certain(true), { certain: true, value: true }],
  ['false', certain(false), { certain: true, value: false }],
  ['null', certain(null), { certain: true, value: null }],
  ['uncertain', uncertain, { certain: false }],
] as const satisfies readonly (readonly [string, EvalBoolExpression, Expected])[]

const andTable: readonly (readonly Expected[])[] = [
  [
    { certain: true, value: true },
    { certain: true, value: false },
    { certain: true, value: null },
    { certain: false },
  ],
  [
    { certain: true, value: false },
    { certain: true, value: false },
    { certain: true, value: false },
    { certain: true, value: false },
  ],
  [
    { certain: true, value: null },
    { certain: true, value: false },
    { certain: true, value: null },
    { certain: false },
  ],
  [{ certain: false }, { certain: true, value: false }, { certain: false }, { certain: false }],
]

const orTable: readonly (readonly Expected[])[] = [
  [
    { certain: true, value: true },
    { certain: true, value: true },
    { certain: true, value: true },
    { certain: true, value: true },
  ],
  [
    { certain: true, value: true },
    { certain: true, value: false },
    { certain: true, value: null },
    { certain: false },
  ],
  [
    { certain: true, value: true },
    { certain: true, value: null },
    { certain: true, value: null },
    { certain: false },
  ],
  [{ certain: true, value: true }, { certain: false }, { certain: false }, { certain: false }],
]

const logicCases: CheckCase[] = (['and', 'or'] as const).flatMap((operation) =>
  latticeAtoms.flatMap(([leftName, left], leftIndex) =>
    latticeAtoms.map(([rightName, right], rightIndex) => ({
      name: `${leftName} ${operation.toUpperCase()} ${rightName}`,
      expression: { kind: 'eval-boolean-logic', operation, operands: [left, right] },
      expected: (operation === 'and' ? andTable : orTable)[leftIndex]![rightIndex]!,
    })),
  ),
)

const notCases: CheckCase[] = latticeAtoms.map(([name, expression], index) => ({
  name: `NOT ${name}`,
  expression: { kind: 'eval-boolean-logic', operation: 'not', operands: [expression] },
  expected: [
    { certain: true, value: false },
    { certain: true, value: true },
    { certain: true, value: null },
    { certain: false },
  ][index] as Expected,
}))

const tests = ['true', 'false', 'unknown'] as const
const testCases: CheckCase[] = tests.flatMap((test) =>
  [false, true].flatMap((negated) =>
    latticeAtoms.map(([name, expression, expected]) => {
      let result: Expected = { certain: false }
      if (expected.certain) {
        const matched =
          test === 'true'
            ? expected.value === true
            : test === 'false'
              ? expected.value === false
              : expected.value === null
        result = { certain: true, value: negated ? !matched : matched }
      }
      return {
        name: `${name} IS ${negated ? 'NOT ' : ''}${test.toUpperCase()}`,
        expression: { kind: 'eval-test', test, negated, operand: expression },
        expected: result,
      }
    }),
  ),
)

const comparisons = ['=', '<>', '<', '<=', '>', '>='] as const
const compare = (
  operation: (typeof comparisons)[number],
  left: boolean,
  right: boolean,
): boolean => {
  const a = Number(left)
  const b = Number(right)
  return operation === '='
    ? a === b
    : operation === '<>'
      ? a !== b
      : operation === '<'
        ? a < b
        : operation === '<='
          ? a <= b
          : operation === '>'
            ? a > b
            : a >= b
}

const comparisonCases: CheckCase[] = comparisons.flatMap((operation) =>
  latticeAtoms.flatMap(([leftName, left, leftExpected]) =>
    latticeAtoms.map(([rightName, right, rightExpected]) => {
      let expected: Expected
      if (!leftExpected.certain || !rightExpected.certain) expected = { certain: false }
      else if (leftExpected.value === null || rightExpected.value === null)
        expected = { certain: true, value: null }
      else
        expected = {
          certain: true,
          value: compare(operation, leftExpected.value, rightExpected.value),
        }
      return {
        name: `${leftName} ${operation} ${rightName}`,
        expression: { kind: 'eval-comparison', operation, operands: [left, right] },
        expected,
      }
    }),
  ),
)

const compositionCases: CheckCase[] = [
  {
    name: 'uncertain CASE condition is uncertain',
    expression: {
      kind: 'eval-case',
      branches: [{ when: uncertain, then: certain(true) }],
      otherwise: certain(false),
    },
    expected: { certain: false },
  },
  {
    name: 'false CASE condition skips an uncertain result',
    expression: {
      kind: 'eval-case',
      branches: [{ when: certain(false), then: uncertain }],
      otherwise: certain(true),
    },
    expected: { certain: true, value: true },
  },
  {
    name: 'null CASE condition skips its result',
    expression: {
      kind: 'eval-case',
      branches: [{ when: certain(null), then: uncertain }],
      otherwise: certain(false),
    },
    expected: { certain: true, value: false },
  },
  {
    name: 'true CASE condition selects an uncertain result',
    expression: {
      kind: 'eval-case',
      branches: [{ when: certain(true), then: uncertain }],
      otherwise: certain(false),
    },
    expected: { certain: false },
  },
  {
    name: 'false AND does not evaluate an erroneous right arm',
    expression: {
      kind: 'eval-boolean-logic',
      operation: 'and',
      operands: [certain(false), divisionByZero],
    },
    expected: { certain: true, value: false },
  },
  {
    name: 'true OR does not evaluate an erroneous right arm',
    expression: {
      kind: 'eval-boolean-logic',
      operation: 'or',
      operands: [certain(true), divisionByZero],
    },
    expected: { certain: true, value: true },
  },
  {
    name: 'CASE does not evaluate an unselected erroneous result',
    expression: {
      kind: 'eval-case',
      branches: [{ when: certain(false), then: divisionByZero }],
      otherwise: certain(true),
    },
    expected: { certain: true, value: true },
  },
  {
    name: 'true AND evaluates an erroneous right arm',
    expression: {
      kind: 'eval-boolean-logic',
      operation: 'and',
      operands: [certain(true), divisionByZero],
    },
    expected: { certain: true, value: null, error: '22012' },
  },
  {
    name: 'false OR evaluates an erroneous right arm',
    expression: {
      kind: 'eval-boolean-logic',
      operation: 'or',
      operands: [certain(false), divisionByZero],
    },
    expected: { certain: true, value: null, error: '22012' },
  },
  {
    name: 'CASE evaluates a selected erroneous result',
    expression: {
      kind: 'eval-case',
      branches: [{ when: certain(true), then: divisionByZero }],
      otherwise: certain(false),
    },
    expected: { certain: true, value: null, error: '22012' },
  },
]

const regexCases: CheckCase[] = [
  {
    name: 'supported regex matches',
    expression: regex('before😀after', '^before😀after$'),
    expected: { certain: true, value: true },
  },
  {
    name: 'supported regex does not match',
    expression: regex('abc\n', '^abc$'),
    expected: { certain: true, value: false },
  },
  {
    name: 'supported negated regex inverts its result',
    expression: regex('abc', '^abc$', {}, true),
    expected: { certain: true, value: false },
  },
  {
    name: 'supported regex preserves SQL NULL',
    expression: regex(null, '^abc$'),
    expected: { certain: true, value: null },
  },
  {
    name: 'unsupported regex is uncertain',
    expression: regex('a', 'a|b'),
    expected: { certain: false },
  },
  {
    name: 'unsupported case folding is uncertain',
    expression: regex('A', 'a', { caseSensitive: false }),
    expected: { certain: false },
  },
  {
    name: 'unsupported regex preserves SQL NULL',
    expression: regex(null, 'a|b'),
    expected: { certain: true, value: null },
  },
  {
    name: 'invalid regex raises the PostgreSQL SQLSTATE',
    expression: regex('anything', '('),
    expected: { certain: true, value: null, error: '2201B' },
  },
  {
    name: 'invalid regex preserves SQL NULL',
    expression: regex(null, '('),
    expected: { certain: true, value: null },
  },
  {
    name: 'false AND does not evaluate an invalid regex',
    expression: {
      kind: 'eval-boolean-logic',
      operation: 'and',
      operands: [certain(false), regex('anything', '(')],
    },
    expected: { certain: true, value: false },
  },
  {
    name: 'true AND evaluates an invalid regex',
    expression: {
      kind: 'eval-boolean-logic',
      operation: 'and',
      operands: [certain(true), regex('anything', '(')],
    },
    expected: { certain: true, value: null, error: '2201B' },
  },
  {
    name: 'dynamic supported regex matches',
    expression: dynamicRegex('xxabcyy', 'abc'),
    expected: { certain: true, value: true },
  },
  {
    name: 'dynamic pattern is computed by a scalar expression',
    expression: {
      ...dynamicRegex('xxabcyy', null),
      pattern: {
        kind: 'operator',
        type: 'pg_catalog.text',
        signature: 'operator:["pg_catalog","||"](pg_catalog.text,pg_catalog.text)',
        operands: [
          { kind: 'text', type: 'pg_catalog.text', value: 'ab' },
          { kind: 'text', type: 'pg_catalog.text', value: 'c' },
        ],
      },
    },
    expected: { certain: true, value: true },
  },
  {
    name: 'dynamic supported regex is negated',
    expression: dynamicRegex('abc', '^abc$', {}, true),
    expected: { certain: true, value: false },
  },
  {
    name: 'dynamic literal syntax option matches metacharacters literally',
    expression: dynamicRegex('xa.*y', 'a.*', { syntax: 'literal' }),
    expected: { certain: true, value: true },
  },
  {
    name: 'dynamic expanded syntax option removes comments',
    expression: dynamicRegex('xxabyy', 'a # comment\n b', { expanded: true }),
    expected: { certain: true, value: true },
  },
  {
    name: 'dynamic unsupported regex is uncertain',
    expression: dynamicRegex('b', 'a|b'),
    expected: { certain: false },
  },
  {
    name: 'dynamic case folding option is uncertain',
    expression: dynamicRegex('ABC', 'abc', { caseSensitive: false }),
    expected: { certain: false },
  },
  {
    name: 'dynamic invalid regex raises SQLSTATE',
    expression: dynamicRegex('abc', '('),
    expected: { certain: true, value: null, error: '2201B' },
  },
  {
    name: 'dynamic null subject suppresses invalid pattern',
    expression: dynamicRegex(null, '('),
    expected: { certain: true, value: null },
  },
  {
    name: 'dynamic null pattern is SQL NULL',
    expression: dynamicRegex('abc', null),
    expected: { certain: true, value: null },
  },
  {
    name: 'false AND skips dynamic invalid regex',
    expression: {
      kind: 'eval-boolean-logic',
      operation: 'and',
      operands: [certain(false), dynamicRegex('abc', '(')],
    },
    expected: { certain: true, value: false },
  },
  {
    name: 'true AND evaluates dynamic invalid regex',
    expression: {
      kind: 'eval-boolean-logic',
      operation: 'and',
      operands: [certain(true), dynamicRegex('abc', '(')],
    },
    expected: { certain: true, value: null, error: '2201B' },
  },
]

interface RegexCallableCase extends CheckCase {
  sql: string
  params: (string | null)[]
}

const regexCallableCases: RegexCallableCase[] = [
  ...(['text', 'name', 'bpchar'] as const).flatMap((subjectType) => {
    const subject =
      subjectType === 'text'
        ? text('a')
        : subjectType === 'name'
          ? ({ kind: 'name', type: 'pg_catalog.name', value: 'a' } as const)
          : bpchar('a')
    const cast = subjectType === 'bpchar' ? 'char(3)' : subjectType
    return (['~', '!~', '~*', '!~*'] as const).map((operator) => ({
      name: `${subjectType} ${operator} operator`,
      expression: regexCall('operator', operator, [subject, text('a')]),
      expected: operator.endsWith('*')
        ? ({ certain: false } as const)
        : ({ certain: true, value: operator === '~' } as const),
      sql: `SELECT $1::${cast} OPERATOR(pg_catalog.${operator}) $2::text AS value`,
      params: ['a', 'a'],
    }))
  }),
  ...(['text', 'name', 'bpchar'] as const).flatMap((subjectType) => {
    const subject =
      subjectType === 'text'
        ? text('a')
        : subjectType === 'name'
          ? ({ kind: 'name', type: 'pg_catalog.name', value: 'a' } as const)
          : bpchar('a')
    const cast = subjectType === 'bpchar' ? 'char(3)' : subjectType
    return (['regexeq', 'regexne', 'icregexeq', 'icregexne'] as const).map((suffix) => {
      const name = `${subjectType}${suffix}`
      return {
        name: `${name} function`,
        expression: regexCall('function', name, [subject, text('a')]),
        expected: suffix.startsWith('ic')
          ? ({ certain: false } as const)
          : ({ certain: true, value: suffix === 'regexeq' } as const),
        sql: `SELECT pg_catalog.${name}($1::${cast}, $2::text) AS value`,
        params: ['a', 'a'],
      }
    })
  }),
  {
    name: 'bpchar regex sees trailing spaces',
    expression: regexCall('operator', '~', [bpchar('a'), text(' $')]),
    expected: { certain: true, value: true },
    sql: 'SELECT $1::char(3) OPERATOR(pg_catalog.~) $2::text AS value',
    params: ['a', ' $'],
  },
  {
    name: 'bpchar regex end anchor follows padding',
    expression: regexCall('operator', '~', [bpchar('a'), text('a$')]),
    expected: { certain: true, value: false },
    sql: 'SELECT $1::char(3) OPERATOR(pg_catalog.~) $2::text AS value',
    params: ['a', 'a$'],
  },
  {
    name: 'regex function NULL subject suppresses invalid pattern',
    expression: regexCall('function', 'textregexeq', [text(null), text('(')]),
    expected: { certain: true, value: null },
    sql: 'SELECT pg_catalog.textregexeq($1::text, $2::text) AS value',
    params: [null, '('],
  },
  {
    name: 'regex function NULL pattern stays SQL NULL',
    expression: regexCall('function', 'bpcharregexne', [bpchar('a'), text(null)]),
    expected: { certain: true, value: null },
    sql: 'SELECT pg_catalog.bpcharregexne($1::char(3), $2::text) AS value',
    params: ['a', null],
  },
  {
    name: 'regex operator computes its pattern at evaluation time',
    expression: regexCall('operator', '~', [
      text('xxabcyy'),
      {
        kind: 'operator',
        type: 'pg_catalog.text',
        signature: 'operator:["pg_catalog","||"](pg_catalog.text,pg_catalog.text)',
        operands: [text('ab'), text('c')],
      },
    ]),
    expected: { certain: true, value: true },
    sql: 'SELECT $1::text OPERATOR(pg_catalog.~) ($2::text || $3::text) AS value',
    params: ['xxabcyy', 'ab', 'c'],
  },
  {
    name: 'regex operator computes an unsupported pattern',
    expression: regexCall('operator', '~', [
      text('b'),
      {
        kind: 'operator',
        type: 'pg_catalog.text',
        signature: 'operator:["pg_catalog","||"](pg_catalog.text,pg_catalog.text)',
        operands: [text('a|'), text('b')],
      },
    ]),
    expected: { certain: false },
    sql: 'SELECT $1::text OPERATOR(pg_catalog.~) ($2::text || $3::text) AS value',
    params: ['b', 'a|', 'b'],
  },
  {
    name: 'regex operator computes an invalid pattern',
    expression: regexCall('operator', '~', [
      text('b'),
      {
        kind: 'operator',
        type: 'pg_catalog.text',
        signature: 'operator:["pg_catalog","||"](pg_catalog.text,pg_catalog.text)',
        operands: [text('('), text('')],
      },
    ]),
    expected: { certain: true, value: null, error: '2201B' },
    sql: 'SELECT $1::text OPERATOR(pg_catalog.~) ($2::text || $3::text) AS value',
    params: ['b', '(', ''],
  },
  {
    name: 'regexp_like without flags',
    expression: regexCall('function', 'regexp_like', [text('xxabyy'), text('ab')]),
    expected: { certain: true, value: true },
    sql: 'SELECT pg_catalog.regexp_like($1::text, $2::text) AS value',
    params: ['xxabyy', 'ab'],
  },
  {
    name: 'regexp_like literal-syntax flag',
    expression: regexCall('function', 'regexp_like', [text('xa.*y'), text('a.*'), text('q')]),
    expected: { certain: true, value: true },
    sql: 'SELECT pg_catalog.regexp_like($1::text, $2::text, $3::text) AS value',
    params: ['xa.*y', 'a.*', 'q'],
  },
  ...(
    [
      ['b', 'a', 'a', true],
      ['e', 'a', 'a', true],
      ['m', 'a', 'a', true],
      ['n', 'a', 'a', true],
      ['p', 'a', 'a', true],
      ['s', 'a', 'a', true],
      ['w', 'a', 'a', true],
      ['x', 'ab', 'a # comment\n b', true],
      ['t', 'a b', 'a b', true],
      ['c', 'A', 'a', false],
      ['ic', 'A', 'a', false],
    ] as const
  ).map(([flags, subject, pattern, value]) => ({
    name: `regexp_like ${flags} flags`,
    expression: regexCall('function', 'regexp_like', [text(subject), text(pattern), text(flags)]),
    expected: { certain: true, value } as const,
    sql: 'SELECT pg_catalog.regexp_like($1::text, $2::text, $3::text) AS value',
    params: [subject, pattern, flags],
  })),
  {
    name: 'regexp_like computed flags',
    expression: regexCall('function', 'regexp_like', [
      text('xa.*y'),
      text('a.*'),
      {
        kind: 'operator',
        type: 'pg_catalog.text',
        signature: 'operator:["pg_catalog","||"](pg_catalog.text,pg_catalog.text)',
        operands: [text(''), text('q')],
      },
    ]),
    expected: { certain: true, value: true },
    sql: 'SELECT pg_catalog.regexp_like($1::text, $2::text, $3::text) AS value',
    params: ['xa.*y', 'a.*', 'q'],
  },
  ...(['b', 'c', 'e', 'm', 'n', 'p', 's', 't', 'w', 'x', 'i', 'z'] as const).map((flag) => ({
    name: `regexp_like computed ${flag} flag`,
    expression: regexCall('function', 'regexp_like', [
      text('a'),
      text('a'),
      {
        kind: 'operator',
        type: 'pg_catalog.text',
        signature: 'operator:["pg_catalog","||"](pg_catalog.text,pg_catalog.text)',
        operands: [text(''), text(flag)],
      },
    ]),
    expected:
      flag === 'z'
        ? ({ certain: true, value: null, error: '22023' } as const)
        : flag === 'i'
          ? ({ certain: false } as const)
          : ({ certain: true, value: true } as const),
    sql: 'SELECT pg_catalog.regexp_like($1::text, $2::text, $3::text) AS value',
    params: ['a', 'a', flag],
  })),
  {
    name: 'regexp_like case-insensitive flag stays uncertain',
    expression: regexCall('function', 'regexp_like', [text('A'), text('a'), text('i')]),
    expected: { certain: false },
    sql: 'SELECT pg_catalog.regexp_like($1::text, $2::text, $3::text) AS value',
    params: ['A', 'a', 'i'],
  },
  ...(['g', 'z'] as const).map((flag) => ({
    name: `regexp_like rejects ${flag} flag`,
    expression: regexCall('function', 'regexp_like', [text('a'), text('a'), text(flag)]),
    expected: { certain: true, value: null, error: '22023' } as const,
    sql: 'SELECT pg_catalog.regexp_like($1::text, $2::text, $3::text) AS value',
    params: ['a', 'a', flag],
  })),
  {
    name: 'regexp_like computed invalid flags',
    expression: regexCall('function', 'regexp_like', [
      text('a'),
      text('a'),
      {
        kind: 'operator',
        type: 'pg_catalog.text',
        signature: 'operator:["pg_catalog","||"](pg_catalog.text,pg_catalog.text)',
        operands: [text(''), text('g')],
      },
    ]),
    expected: { certain: true, value: null, error: '22023' },
    sql: 'SELECT pg_catalog.regexp_like($1::text, $2::text, $3::text) AS value',
    params: ['a', 'a', 'g'],
  },
  {
    name: 'regexp_like rejects flags before compiling pattern',
    expression: regexCall('function', 'regexp_like', [text('a'), text('('), text('g')]),
    expected: { certain: true, value: null, error: '22023' },
    sql: 'SELECT pg_catalog.regexp_like($1::text, $2::text, $3::text) AS value',
    params: ['a', '(', 'g'],
  },
  {
    name: 'regexp_like NULL suppresses invalid flags',
    expression: regexCall('function', 'regexp_like', [text(null), text('a'), text('g')]),
    expected: { certain: true, value: null },
    sql: 'SELECT pg_catalog.regexp_like($1::text, $2::text, $3::text) AS value',
    params: [null, 'a', 'g'],
  },
  {
    name: 'regexp_like NULL flags yield SQL NULL',
    expression: regexCall('function', 'regexp_like', [text('a'), text('a'), text(null)]),
    expected: { certain: true, value: null },
    sql: 'SELECT pg_catalog.regexp_like($1::text, $2::text, $3::text) AS value',
    params: ['a', 'a', null],
  },
  {
    name: 'false AND skips regexp_like invalid flags',
    expression: {
      kind: 'eval-boolean-logic',
      operation: 'and',
      operands: [
        certain(false),
        regexCall('function', 'regexp_like', [text('a'), text('a'), text('g')]),
      ],
    },
    expected: { certain: true, value: false },
    sql: 'SELECT false AND pg_catalog.regexp_like($1::text, $2::text, $3::text) AS value',
    params: ['a', 'a', 'g'],
  },
]

const similarCases: RegexCallableCase[] = [
  {
    name: 'SIMILAR TO literal pattern',
    expression: regexCall('operator', '~', [text('a.b'), similar(text('a.b'))]),
    expected: { certain: true, value: true },
    sql: 'SELECT $1::text SIMILAR TO $2::text AS value',
    params: ['a.b', 'a.b'],
  },
  {
    name: 'NOT SIMILAR TO literal pattern',
    expression: regexCall('operator', '!~', [text('abc'), similar(text('abd'))]),
    expected: { certain: true, value: true },
    sql: 'SELECT $1::text NOT SIMILAR TO $2::text AS value',
    params: ['abc', 'abd'],
  },
  {
    name: 'SIMILAR TO explicit escape',
    expression: regexCall('operator', '~', [text('a%b'), similar(text('a#%b'), text('#'))]),
    expected: { certain: true, value: true },
    sql: 'SELECT $1::text SIMILAR TO $2::text ESCAPE $3::text AS value',
    params: ['a%b', 'a#%b', '#'],
  },
  {
    name: 'SIMILAR TO empty escape disables escaping',
    expression: regexCall('operator', '~', [text('abc'), similar(text('abc'), text(''))]),
    expected: { certain: true, value: true },
    sql: 'SELECT $1::text SIMILAR TO $2::text ESCAPE $3::text AS value',
    params: ['abc', 'abc', ''],
  },
  {
    name: 'SIMILAR TO computed pattern',
    expression: regexCall('operator', '~', [text('abc'), similar(concat(text('a'), text('bc')))]),
    expected: { certain: true, value: true },
    sql: 'SELECT $1::text SIMILAR TO ($2::text || $3::text) AS value',
    params: ['abc', 'a', 'bc'],
  },
  {
    name: 'SIMILAR TO computed escape',
    expression: regexCall('operator', '~', [
      text('a%b'),
      similar(text('a#%b'), concat(text(''), text('#'))),
    ]),
    expected: { certain: true, value: true },
    sql: 'SELECT $1::text SIMILAR TO $2::text ESCAPE ($3::text || $4::text) AS value',
    params: ['a%b', 'a#%b', '', '#'],
  },
  {
    name: 'SIMILAR TO wildcard is uncertain',
    expression: regexCall('operator', '~', [text('abc'), similar(text('a%c'))]),
    expected: { certain: false },
    sql: 'SELECT $1::text SIMILAR TO $2::text AS value',
    params: ['abc', 'a%c'],
  },
  {
    name: 'SIMILAR TO null pattern',
    expression: regexCall('operator', '~', [text('abc'), similar(text(null))]),
    expected: { certain: true, value: null },
    sql: 'SELECT $1::text SIMILAR TO $2::text AS value',
    params: ['abc', null],
  },
  {
    name: 'SIMILAR TO invalid escape',
    expression: regexCall('operator', '~', [text('abc'), similar(text('abc'), text('##'))]),
    expected: { certain: true, value: null, error: '22025' },
    sql: 'SELECT $1::text SIMILAR TO $2::text ESCAPE $3::text AS value',
    params: ['abc', 'abc', '##'],
  },
  {
    name: 'SIMILAR TO invalid escape precedes null subject',
    expression: regexCall('operator', '~', [text(null), similar(text('abc'), text('##'))]),
    expected: { certain: true, value: null, error: '22025' },
    sql: 'SELECT $1::text SIMILAR TO $2::text ESCAPE $3::text AS value',
    params: [null, 'abc', '##'],
  },
  {
    name: 'SIMILAR TO null escape',
    expression: regexCall('operator', '~', [text('abc'), similar(text('abc'), text(null))]),
    expected: { certain: true, value: null },
    sql: 'SELECT $1::text SIMILAR TO $2::text ESCAPE $3::text AS value',
    params: ['abc', 'abc', null],
  },
  {
    name: 'false AND skips invalid SIMILAR TO escape',
    expression: {
      kind: 'eval-boolean-logic',
      operation: 'and',
      operands: [
        certain(false),
        regexCall('operator', '~', [text('abc'), similar(text('abc'), text('##'))]),
      ],
    },
    expected: { certain: true, value: false },
    sql: 'SELECT false AND ($1::text SIMILAR TO $2::text ESCAPE $3::text) AS value',
    params: ['abc', 'abc', '##'],
  },
  {
    name: 'SIMILAR TO invalid converted regex',
    expression: regexCall('operator', '~', [text('abc'), similar(text('('))]),
    expected: { certain: true, value: null, error: '2201B' },
    sql: 'SELECT $1::text SIMILAR TO $2::text AS value',
    params: ['abc', '('],
  },
  {
    name: 'SIMILAR TO computed invalid quote separators',
    expression: regexCall('operator', '~', [
      text('abc'),
      similar(concat(text('a\\"b\\"'), text('c\\"d'))),
    ]),
    expected: { certain: true, value: null, error: '2200C' },
    sql: 'SELECT $1::text SIMILAR TO ($2::text || $3::text) AS value',
    params: ['abc', 'a\\"b\\"', 'c\\"d'],
  },
  {
    name: 'SIMILAR TO null subject suppresses invalid regex',
    expression: regexCall('operator', '~', [text(null), similar(text('('))]),
    expected: { certain: true, value: null },
    sql: 'SELECT $1::text SIMILAR TO $2::text AS value',
    params: [null, '('],
  },
]

const allCases = [
  ...logicCases,
  ...notCases,
  ...testCases,
  ...comparisonCases,
  ...compositionCases,
  ...regexCases,
  ...regexCallableCases,
  ...similarCases,
]

function typescriptProject(): string {
  const emitted = allCases.map((fixture) =>
    emitEvalBoolExpression(fixture.expression, typescriptSqlBackend, typescriptEvalBoolBackend),
  )
  return printFile([
    ...typescriptSqlRuntime(emitted.flatMap((result) => result.helpers)),
    ...emitted.map((result, index) =>
      factory.createFunctionDeclaration(
        undefined,
        undefined,
        identifier(`evaluate${index}`),
        undefined,
        [],
        undefined,
        factory.createBlock([factory.createReturnStatement(result.value.expression)], true),
      ),
    ),
  ])
}

function goProject(): string {
  const emitted = allCases.map((fixture) =>
    emitEvalBoolExpression(fixture.expression, goSqlBackend, goEvalBoolBackend),
  )
  return printGoFile({
    package: 'main',
    imports: [{ path: 'encoding/json' }, { path: 'os' }],
    source:
      goSqlRuntime(
        emitted.flatMap((result) => result.helpers),
        'main',
      ) +
      `
func main() {
  if err := json.NewEncoder(os.Stdout).Encode([]EvalBool{${emitted.map((_, index) => `evaluate${index}()`).join(',')}}); err != nil { panic(err) }
}`,
    declarations: emitted.map((result, index) =>
      go.function(
        `evaluate${index}`,
        [],
        [{ type: go.ident('EvalBool') }],
        [{ kind: 'return', expressions: [result.value.expression] }],
      ),
    ),
  })
}

function normalizeGo(value: {
  Certain: boolean
  Value: { Value: boolean; Valid: boolean; Error: string }
}): Expected {
  if (!value.Certain) return { certain: false }
  if (value.Value.Error) return { certain: true, value: null, error: value.Value.Error }
  return { certain: true, value: value.Value.Valid ? value.Value.Value : null }
}

describe('generated CHECK predicate evaluation', () => {
  let pg: PGlite

  beforeAll(async () => {
    pg = await PGlite.create()
  })

  afterAll(async () => {
    await pg.close()
  })

  it('matches PostgreSQL for catalog regex call forms', async () => {
    for (const fixture of [...regexCallableCases, ...similarCases]) {
      let observed: { value: boolean | null } | { error: string }
      try {
        const result = await pg.query<{ value: boolean | null }>(fixture.sql, fixture.params)
        observed = result.rows[0]!
      } catch (error) {
        if (!(error instanceof Error) || !('code' in error) || typeof error.code !== 'string')
          throw error
        observed = { error: error.code }
      }
      if (fixture.expected.certain && fixture.expected.error)
        expect(observed, fixture.name).toEqual({ error: fixture.expected.error })
      else if (fixture.expected.certain)
        expect(observed, fixture.name).toEqual({ value: fixture.expected.value })
      else expect(observed, fixture.name).toHaveProperty('value')
    }
  })

  it('maps regexp_like flags in order and rejects invalid options', () => {
    expect(parseRegexpLikeFlags('qecixn')).toEqual({
      kind: 'valid',
      options: { syntax: 'extended', caseSensitive: false, expanded: true, newline: 'sensitive' },
    })
    expect(parseRegexpLikeFlags('nxst')).toEqual({
      kind: 'valid',
      options: { syntax: 'advanced', caseSensitive: true, expanded: false, newline: 'ordinary' },
    })
    expect(parseRegexpLikeFlags('g')).toEqual({ kind: 'invalid', sqlstate: '22023' })
    expect(parseRegexpLikeFlags('z')).toEqual({ kind: 'invalid', sqlstate: '22023' })
  })

  it('executes and typechecks the generated TypeScript evaluator', async () => {
    const source = typescriptProject()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-check-typescript-'))
    try {
      const path = join(directory, 'project.ts')
      await writeFile(path, source)
      const program = ts.createProgram([path], {
        strict: true,
        noEmit: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        types: [],
        lib: ['lib.es2022.d.ts'],
        skipLibCheck: true,
      })
      expect(
        ts
          .getPreEmitDiagnostics(program)
          .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
      ).toEqual([])
      const output = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText
      const result = Function(`${output}
return [${allCases.map((_, index) => `evaluate${index}`).join(',')}].map((evaluate) => {
  try { return evaluate() }
  catch (error) { return { certain: true, value: null, error: error.code } }
})`)() as Expected[]
      expect(result).toEqual(allCases.map((fixture) => fixture.expected))
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('executes the generated Go evaluator', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-check-go-'))
    try {
      await writeFile(join(directory, 'go.mod'), 'module check-evaluation\n\ngo 1.24\n')
      await writeFile(join(directory, 'main.go'), goProject())
      const { stdout } = await run(process.env.PGSID_GO_BINARY ?? 'go', ['run', '.'], {
        cwd: directory,
        env: {
          ...process.env,
          GOCACHE: join(tmpdir(), 'pgsid-sql-semantics-go-cache'),
          GOTOOLCHAIN: 'local',
          GOFLAGS: '-mod=readonly',
        },
      })
      const result = (JSON.parse(stdout) as Parameters<typeof normalizeGo>[0][]).map(normalizeGo)
      expect(result).toEqual(allCases.map((fixture) => fixture.expected))
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('includes only the transitive helpers required by an uncertain atom', () => {
    const typescript = emitEvalBoolExpression(
      uncertain,
      typescriptSqlBackend,
      typescriptEvalBoolBackend,
    )
    expect(typescript.helpers).toEqual(['evalBoolUncertain'])
    const typescriptSource = printFile(typescriptSqlRuntime(typescript.helpers))
    expect(typescriptSource).toContain('function evalBoolUncertain')
    expect(typescriptSource).not.toContain('function evalBoolCertain')
    expect(typescriptSource).not.toContain('function evalBoolAnd')

    const goResult = emitEvalBoolExpression(uncertain, goSqlBackend, goEvalBoolBackend)
    expect(goResult.helpers).toEqual(['evalBoolUncertain'])
    const goSource = goSqlRuntime(goResult.helpers, 'main')
    expect(goSource).toContain('func evalBoolUncertain')
    expect(goSource).not.toContain('func evalBoolCertain')
    expect(goSource).not.toContain('func evalBoolAnd')
  })

  it('embeds only the selected target engine translation for a constant pattern', () => {
    const expression = regex('abc', 'abc$')
    const typescript = emitEvalBoolExpression(
      expression,
      typescriptSqlBackend,
      typescriptEvalBoolBackend,
    )
    const typescriptSource = printFile([
      ...typescriptSqlRuntime(typescript.helpers),
      factory.createExpressionStatement(typescript.value.expression),
    ])
    expect(typescriptSource).toContain(String.raw`(?![\\s\\S])`)
    expect(typescriptSource).not.toContain(String.raw`\\z`)

    const goResult = emitEvalBoolExpression(expression, goSqlBackend, goEvalBoolBackend)
    const goSource =
      goSqlRuntime(goResult.helpers, 'main') +
      printGoFile({
        package: 'main',
        imports: [],
        declarations: [
          go.function(
            'evaluate',
            [],
            [{ type: go.ident('EvalBool') }],
            [{ kind: 'return', expressions: [goResult.value.expression] }],
          ),
        ],
      })
    expect(goSource).toContain(String.raw`\\z`)
    expect(goSource).not.toContain(String.raw`(?![\\s\\S])`)
  })

  it('includes a runtime analyzer only for a dynamic pattern', () => {
    const constant = emitEvalBoolExpression(
      regex('abc', 'abc'),
      typescriptSqlBackend,
      typescriptEvalBoolBackend,
    )
    expect(printFile(typescriptSqlRuntime(constant.helpers))).not.toContain(
      'function evalBoolRegexAnalyze',
    )
    const similarConstant = emitEvalBoolExpression(
      regexCall('operator', '~', [text('abc'), similar(text('abc'))]),
      typescriptSqlBackend,
      typescriptEvalBoolBackend,
    )
    expect(printFile(typescriptSqlRuntime(similarConstant.helpers))).not.toContain(
      'function evalBoolRegexAnalyze',
    )
    const similarDynamic = emitEvalBoolExpression(
      regexCall('operator', '~', [text('abc'), similar(concat(text('a'), text('bc')))]),
      typescriptSqlBackend,
      typescriptEvalBoolBackend,
    )
    const similarDynamicSource = printFile(typescriptSqlRuntime(similarDynamic.helpers))
    expect(similarDynamicSource).toContain('function evalBoolRegexAnalyze')
    expect(similarDynamicSource).toContain('function similarToEscapeDefault')
    expect(similarDynamicSource).toContain(numericMathCopyright)
    const goSimilarDynamic = emitEvalBoolExpression(
      regexCall('operator', '~', [text('abc'), similar(concat(text('a'), text('bc')))]),
      goSqlBackend,
      goEvalBoolBackend,
    )
    expect(goSqlRuntime(goSimilarDynamic.helpers, 'main')).toContain(numericMathCopyright)
    const invalidFlags = emitEvalBoolExpression(
      regexCall('function', 'regexp_like', [text('abc'), text('abc'), text('g')]),
      typescriptSqlBackend,
      typescriptEvalBoolBackend,
    )
    expect(printFile(typescriptSqlRuntime(invalidFlags.helpers))).not.toContain(
      'function evalBoolRegexAnalyze',
    )
    const dynamic = dynamicRegex('abc', 'abc')
    const typescript = emitEvalBoolExpression(
      dynamic,
      typescriptSqlBackend,
      typescriptEvalBoolBackend,
    )
    expect(printFile(typescriptSqlRuntime(typescript.helpers))).toContain(
      'function evalBoolRegexAnalyze',
    )
    const goResult = emitEvalBoolExpression(dynamic, goSqlBackend, goEvalBoolBackend)
    const goSource = goSqlRuntime(goResult.helpers, 'main')
    expect(goSource).toContain('func evalBoolRegexAnalyze')
    expect(goSource).not.toContain('ecmascript.escape-literal')
  })

  it('rejects malformed incomplete expressions', () => {
    expect(() =>
      emitEvalBoolExpression(
        {
          kind: 'certain',
          expression: { kind: 'text', type: 'pg_catalog.text', value: 'not boolean' },
        },
        typescriptSqlBackend,
        typescriptEvalBoolBackend,
      ),
    ).toThrow('A certain CHECK atom must be boolean')
    expect(() =>
      emitEvalBoolExpression(
        { kind: 'eval-boolean-logic', operation: 'and', operands: [certain(true)] },
        typescriptSqlBackend,
        typescriptEvalBoolBackend,
      ),
    ).toThrow('Invalid EvalBool expression')
    expect(() =>
      emitEvalBoolExpression(
        { kind: 'eval-boolean-logic', operation: 'not', operands: [certain(true), certain(false)] },
        goSqlBackend,
        goEvalBoolBackend,
      ),
    ).toThrow('Invalid EvalBool expression')
    expect(() =>
      emitEvalBoolExpression(
        { kind: 'eval-case', branches: [], otherwise: certain(false) },
        goSqlBackend,
        goEvalBoolBackend,
      ),
    ).toThrow('Invalid EvalBool CASE expression')
    expect(() =>
      emitEvalBoolExpression(
        {
          kind: 'eval-regex',
          subject: { kind: 'boolean', type: 'pg_catalog.bool', value: true },
          pattern: 'true',
          negated: false,
          collation: 'C',
        },
        typescriptSqlBackend,
        typescriptEvalBoolBackend,
      ),
    ).toThrow('A regex CHECK atom requires a C-collated text subject')
    expect(() =>
      emitEvalBoolExpression(
        {
          ...regex('value', 'value'),
          collation: 'en_US' as 'C',
        },
        goSqlBackend,
        goEvalBoolBackend,
      ),
    ).toThrow('A regex CHECK atom requires a C-collated text subject')
    expect(() =>
      emitEvalBoolExpression(
        {
          ...dynamicRegex('value', 'value'),
          pattern: { kind: 'boolean', type: 'pg_catalog.bool', value: true },
        },
        typescriptSqlBackend,
        typescriptEvalBoolBackend,
      ),
    ).toThrow('A dynamic regex CHECK pattern must have text type')
    expect(() =>
      emitEvalBoolExpression(
        regexCall('function', 'regexp_count', [text('a'), text('a')]),
        typescriptSqlBackend,
        typescriptEvalBoolBackend,
      ),
    ).toThrow('Unsupported regex CHECK signature')
    expect(() =>
      emitEvalBoolExpression(
        {
          kind: 'eval-call',
          call: {
            kind: 'operator',
            type: 'pg_catalog.bool',
            signature: 'operator:["pg_catalog","~"](pg_catalog.text,pg_catalog.text)',
            collation: 'en_US',
            operands: [text('a'), text('a')],
          },
        },
        goSqlBackend,
        goEvalBoolBackend,
      ),
    ).toThrow('A regex CHECK atom requires a C-collated text subject')
    const totalRegex = (
      regexCall('operator', '~', [text('a'), text('a')]) as Extract<
        EvalBoolExpression,
        { kind: 'eval-call' }
      >
    ).call
    expect(() => emitSqlExpression(totalRegex, typescriptSqlBackend)).toThrow(
      'Unsupported overload',
    )
    const totalRegexpLike = (
      regexCall('function', 'regexp_like', [text('a'), text('a')]) as Extract<
        EvalBoolExpression,
        { kind: 'eval-call' }
      >
    ).call
    expect(() => emitSqlExpression(totalRegexpLike, goSqlBackend)).toThrow('Unsupported overload')
  })
})
