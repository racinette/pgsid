import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { emitCheckRustEvaluator } from '../../src/codegen/shared/check-rust-evaluator.js'
import {
  prepareCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Outcome } from '../../tools/check-rust/parity.js'

// The cases are written as expression trees; each stands for the SQL it renders to, which the
// catalog binder then lowers as it lowers a stored CHECK.
type Atom = { kind: string; [key: string]: unknown }
type RegexOptions = {
  syntax?: 'advanced' | 'extended' | 'basic' | 'literal'
  caseSensitive?: boolean
  expanded?: boolean
  newline?: 'ordinary' | 'sensitive' | 'stop' | 'anchors'
}

type Expected = { certain: false } | { certain: true; value: boolean | null; error?: string }

interface CheckCase {
  name: string
  expression: Atom
  expected: Expected
}

const certain = (input: boolean | null): Atom => ({
  kind: 'certain',
  expression: { kind: 'boolean', type: 'pg_catalog.bool', value: input },
})

const uncertain: Atom = { kind: 'uncertain' }

const regex = (
  subject: string | null,
  pattern: string,
  options: RegexOptions = {},
  negated = false,
): Atom => ({
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
  options: RegexOptions = {},
  negated = false,
): Atom => ({
  ...regex(subject, '', options, negated),
  pattern: { kind: 'text', type: 'pg_catalog.text', value: pattern },
})

const text = (value: string | null): Atom => ({
  kind: 'text',
  type: 'pg_catalog.text',
  value,
})

const regexCall = (
  kind: 'operator' | 'function',
  name: string,
  operands: readonly Atom[],
): Atom => ({
  kind: 'eval-call',
  call: {
    kind,
    type: 'pg_catalog.bool',
    signature: `${kind}:${JSON.stringify(['pg_catalog', name])}(${operands.map((operand) => operand.type).join(',')})`,
    collation: 'C',
    operands,
  },
})

const similar = (pattern: Atom, escape?: Atom): Atom => ({
  kind: 'function',
  type: 'pg_catalog.text',
  signature: `function:["pg_catalog","similar_to_escape"](${escape ? 'pg_catalog.text,pg_catalog.text' : 'pg_catalog.text'})`,
  operands: escape ? [pattern, escape] : [pattern],
})

const concat = (left: Atom, right: Atom): Atom => ({
  kind: 'operator',
  type: 'pg_catalog.text',
  signature: 'operator:["pg_catalog","||"](pg_catalog.text,pg_catalog.text)',
  operands: [left, right],
})

const evalCertain = (expression: Atom): Atom => ({
  kind: 'certain',
  expression,
})

const evalType = (expression: Atom): string =>
  expression.kind === 'certain'
    ? ((expression['expression'] as Atom)['type'] as string)
    : expression.kind === 'regex-count'
      ? 'pg_catalog.int4'
      : expression.kind === 'call'
        ? ((expression['call'] as Atom)['type'] as string)
        : (expression['type'] as string)

const evalCall = (
  kind: 'operator' | 'function',
  name: string,
  type: string,
  operands: readonly Atom[],
): Atom => ({
  kind: 'call',
  call: {
    kind,
    type,
    signature: `${kind}:${JSON.stringify(['pg_catalog', name])}(${operands.map(evalType).join(',')})`,
    collation: 'C',
  },
  operands,
})

const bpchar = (value: string | null): Atom => ({
  kind: 'text-coercion',
  type: 'pg_catalog.bpchar',
  length: 3,
  explicit: false,
  operand: text(value),
})

const integer = (value: string): Atom => ({
  kind: 'integer',
  type: 'pg_catalog.int4',
  value,
})

const divisionByZero: Atom = {
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
] as const satisfies readonly (readonly [string, Atom, Expected])[]

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
      // Comparison is strict, so a NULL operand decides it whatever the other one holds.
      if (
        (leftExpected.certain && leftExpected.value === null) ||
        (rightExpected.certain && rightExpected.value === null)
      )
        expected = { certain: true, value: null }
      else if (!leftExpected.certain || !rightExpected.certain) expected = { certain: false }
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
    name: 'lookbehind regex matches',
    expression: regex('ab', '(?<=a)b'),
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
    name: 'alternation regex matches',
    expression: regex('a', 'a|b'),
    expected: { certain: true, value: true },
  },
  {
    name: 'case folding matches',
    expression: regex('A', 'a', { caseSensitive: false }),
    expected: { certain: true, value: true },
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
    name: 'dynamic alternation regex matches',
    expression: dynamicRegex('b', 'a|b'),
    expected: { certain: true, value: true },
  },
  {
    name: 'dynamic case folding option matches',
    expression: dynamicRegex('ABC', 'abc', { caseSensitive: false }),
    expected: { certain: true, value: true },
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

const partialScalarCases: CheckCase[] = [
  ...(
    [
      ['date', { kind: 'temporal', type: 'pg_catalog.date', value: '2024-01-01' }],
      [
        'uuid',
        { kind: 'uuid', type: 'pg_catalog.uuid', value: '00000000-0000-0000-0000-000000000000' },
      ],
    ] as const
  ).map(([name, literal]) => ({
    name: `typed ${name} uncertainty survives equality`,
    expression: {
      kind: 'eval-scalar' as const,
      expression: evalCall('operator', '=', 'pg_catalog.bool', [
        { kind: 'uncertain', type: literal.type },
        evalCertain(literal as Atom),
      ]),
    },
    expected: { certain: false } as const,
  })),
  {
    name: 'typed COALESCE uses a later value after SQL NULL',
    expression: {
      kind: 'eval-scalar',
      expression: evalCall('operator', '>', 'pg_catalog.bool', [
        {
          kind: 'coalesce',
          type: 'pg_catalog.int4',
          operands: [
            evalCertain({ kind: 'integer', type: 'pg_catalog.int4', value: null }),
            evalCertain(integer('7')),
          ],
        },
        evalCertain(integer('0')),
      ]),
    },
    expected: { certain: true, value: true },
  },
  {
    name: 'typed COALESCE stops at uncertainty',
    expression: {
      kind: 'eval-scalar',
      expression: evalCall('operator', '>', 'pg_catalog.bool', [
        {
          kind: 'coalesce',
          type: 'pg_catalog.int4',
          operands: [{ kind: 'uncertain', type: 'pg_catalog.int4' }, evalCertain(integer('7'))],
        },
        evalCertain(integer('0')),
      ]),
    },
    expected: { certain: false },
  },
  {
    name: 'typed CASE skips an unselected error',
    expression: {
      kind: 'eval-scalar',
      expression: {
        kind: 'case',
        type: 'pg_catalog.bool',
        branches: [
          {
            when: evalCertain({ kind: 'boolean', type: 'pg_catalog.bool', value: false }),
            then: evalCall('operator', '>', 'pg_catalog.bool', [
              evalCertain({
                kind: 'operator',
                type: 'pg_catalog.int4',
                signature: 'operator:["pg_catalog","/"](pg_catalog.int4,pg_catalog.int4)',
                operands: [integer('1'), integer('0')],
              }),
              evalCertain(integer('0')),
            ]),
          },
        ],
        otherwise: evalCertain({ kind: 'boolean', type: 'pg_catalog.bool', value: true }),
      },
    },
    expected: { certain: true, value: true },
  },
  {
    name: 'typed CASE uncertain condition is uncertain',
    expression: {
      kind: 'eval-scalar',
      expression: {
        kind: 'case',
        type: 'pg_catalog.bool',
        branches: [
          {
            when: { kind: 'uncertain', type: 'pg_catalog.bool' },
            then: evalCertain({ kind: 'boolean', type: 'pg_catalog.bool', value: true }),
          },
        ],
        otherwise: evalCertain({ kind: 'boolean', type: 'pg_catalog.bool', value: false }),
      },
    },
    expected: { certain: false },
  },
  {
    name: 'typed CASE skips an unselected uncertain value',
    expression: {
      kind: 'eval-scalar',
      expression: {
        kind: 'case',
        type: 'pg_catalog.bool',
        branches: [
          {
            when: evalCertain({ kind: 'boolean', type: 'pg_catalog.bool', value: false }),
            then: { kind: 'uncertain', type: 'pg_catalog.bool' },
          },
        ],
        otherwise: evalCertain({ kind: 'boolean', type: 'pg_catalog.bool', value: true }),
      },
    },
    expected: { certain: true, value: true },
  },
  {
    name: 'typed NULL test distinguishes uncertainty',
    expression: {
      kind: 'eval-scalar',
      expression: {
        kind: 'null-test',
        type: 'pg_catalog.bool',
        negated: false,
        operand: { kind: 'uncertain', type: 'pg_catalog.text' },
      },
    },
    expected: { certain: false },
  },
  {
    name: 'typed boolean AND discovers false through uncertainty',
    expression: {
      kind: 'eval-scalar',
      expression: {
        kind: 'boolean-logic',
        type: 'pg_catalog.bool',
        operation: 'and',
        operands: [
          { kind: 'uncertain', type: 'pg_catalog.bool' },
          evalCertain({ kind: 'boolean', type: 'pg_catalog.bool', value: false }),
        ],
      },
    },
    expected: { certain: true, value: false },
  },
  {
    name: 'typed uncertain text propagates through length and comparison',
    expression: {
      kind: 'eval-scalar',
      expression: evalCall('operator', '>', 'pg_catalog.bool', [
        evalCall('function', 'length', 'pg_catalog.int4', [
          { kind: 'uncertain', type: 'pg_catalog.text' },
        ]),
        evalCertain(integer('0')),
      ]),
    },
    expected: { certain: false },
  },
  {
    name: 'typed total calls stay certain',
    expression: {
      kind: 'eval-scalar',
      expression: evalCall('operator', '>', 'pg_catalog.bool', [
        evalCall('function', 'length', 'pg_catalog.int4', [evalCertain(text('abc'))]),
        evalCertain(integer('0')),
      ]),
    },
    expected: { certain: true, value: true },
  },
  {
    name: 'typed SQL NULL is not uncertainty',
    expression: {
      kind: 'eval-scalar',
      expression: evalCall('operator', '>', 'pg_catalog.bool', [
        evalCall('function', 'length', 'pg_catalog.int4', [evalCertain(text(null))]),
        evalCertain(integer('0')),
      ]),
    },
    expected: { certain: true, value: null },
  },
  {
    name: 'typed known error dominates uncertainty',
    expression: {
      kind: 'eval-scalar',
      expression: evalCall('operator', '>', 'pg_catalog.bool', [
        { kind: 'uncertain', type: 'pg_catalog.int4' },
        evalCertain({
          kind: 'operator',
          type: 'pg_catalog.int4',
          signature: 'operator:["pg_catalog","/"](pg_catalog.int4,pg_catalog.int4)',
          operands: [integer('1'), integer('0')],
        }),
      ]),
    },
    expected: { certain: true, value: null, error: '22012' },
  },
  {
    name: 'false AND skips typed uncertain scalar',
    expression: {
      kind: 'eval-boolean-logic',
      operation: 'and',
      operands: [
        certain(false),
        {
          kind: 'eval-scalar',
          expression: evalCall('operator', '>', 'pg_catalog.bool', [
            { kind: 'uncertain', type: 'pg_catalog.int4' },
            evalCertain(integer('0')),
          ]),
        },
      ],
    },
    expected: { certain: true, value: false },
  },
]

interface RegexCallableCase extends CheckCase {
  sql: string
  params: (string | null)[]
}

const regexCallableCases: RegexCallableCase[] = [
  {
    name: 'lookbehind operator matches',
    expression: regexCall('operator', '~', [text('ab'), text('(?<=a)b')]),
    expected: { certain: true, value: true },
    sql: 'SELECT $1::text OPERATOR(pg_catalog.~) $2::text AS value',
    params: ['ab', '(?<=a)b'],
  },
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
      expected: { certain: true, value: !operator.startsWith('!') } as const,
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
        expected: { certain: true, value: suffix.endsWith('regexeq') } as const,
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
    name: 'regex operator computes alternation',
    expression: regexCall('operator', '~', [
      text('b'),
      {
        kind: 'operator',
        type: 'pg_catalog.text',
        signature: 'operator:["pg_catalog","||"](pg_catalog.text,pg_catalog.text)',
        operands: [text('a|'), text('b')],
      },
    ]),
    expected: { certain: true, value: true },
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
        : ({ certain: true, value: true } as const),
    sql: 'SELECT pg_catalog.regexp_like($1::text, $2::text, $3::text) AS value',
    params: ['a', 'a', flag],
  })),
  {
    name: 'regexp_like case-insensitive flag matches',
    expression: regexCall('function', 'regexp_like', [text('A'), text('a'), text('i')]),
    expected: { certain: true, value: true },
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
    name: 'SIMILAR TO wildcard matches',
    expression: regexCall('operator', '~', [text('abc'), similar(text('a%c'))]),
    expected: { certain: true, value: true },
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

interface RegexCountCase extends CheckCase {
  sql: string
  params: (string | number | null)[]
}

const countExpression = (operands: readonly Atom[]): Atom => ({
  kind: 'regex-count',
  signature: `function:["pg_catalog","regexp_count"](${operands.map(evalType).join(',')})`,
  collation: 'C',
  operands,
})

const countCase = (
  name: string,
  args: readonly (string | number | null)[],
  target: number,
  expected: Expected,
): RegexCountCase => {
  const operands = args.map((argument, index) =>
    evalCertain(
      index === 2
        ? { kind: 'integer', type: 'pg_catalog.int4', value: argument?.toString() ?? null }
        : text(argument as string | null),
    ),
  )
  const sqlArgs = args.map((_, index) => `$${index + 1}::${index === 2 ? 'int4' : 'text'}`)
  return {
    name,
    expression: {
      kind: 'eval-scalar',
      expression: evalCall('operator', '=', 'pg_catalog.bool', [
        countExpression(operands),
        evalCertain(integer(String(target))),
      ]),
    },
    expected,
    sql: `SELECT pg_catalog.regexp_count(${sqlArgs.join(', ')}) = ${target} AS value`,
    params: [...args],
  }
}

const regexCountCases: RegexCountCase[] = [
  countCase('regexp_count counts nonoverlapping literal matches', ['aaaa', 'aa'], 2, {
    certain: true,
    value: true,
  }),
  countCase('regexp_count starts at a character position', ['aaaa', 'aa', 2], 1, {
    certain: true,
    value: true,
  }),
  countCase('regexp_count start counts Unicode code points', ['😀a😀', '😀', 2], 1, {
    certain: true,
    value: true,
  }),
  countCase('regexp_count start after end yields zero', ['abc', 'a', 9], 0, {
    certain: true,
    value: true,
  }),
  countCase('regexp_count includes zero-length matches', ['😀a', ''], 3, {
    certain: true,
    value: true,
  }),
  countCase('regexp_count end anchor counts once', ['abc', '$'], 1, {
    certain: true,
    value: true,
  }),
  countCase('regexp_count literal syntax flag', ['a.a a.a', 'a.a', 1, 'q'], 2, {
    certain: true,
    value: true,
  }),
  countCase('regexp_count alternation counts', ['aba', 'a|b'], 3, {
    certain: true,
    value: true,
  }),
  countCase('regexp_count invalid start', ['a', 'a', 0], 1, {
    certain: true,
    value: null,
    error: '22023',
  }),
  countCase('regexp_count invalid start precedes unsupported pattern', ['a', 'a|b', 0], 1, {
    certain: true,
    value: null,
    error: '22023',
  }),
  countCase('regexp_count invalid flags', ['a', 'a', 1, 'g'], 1, {
    certain: true,
    value: null,
    error: '22023',
  }),
  countCase('regexp_count rejects flags before an invalid pattern', ['a', '(', 1, 'g'], 1, {
    certain: true,
    value: null,
    error: '22023',
  }),
  countCase('regexp_count invalid pattern', ['a', '('], 1, {
    certain: true,
    value: null,
    error: '2201B',
  }),
  countCase('regexp_count NULL subject', [null, '('], 1, {
    certain: true,
    value: null,
  }),
  countCase('regexp_count NULL start', ['a', 'a', null], 1, {
    certain: true,
    value: null,
  }),
  countCase('regexp_count NULL flags', ['a', 'a', 1, null], 1, {
    certain: true,
    value: null,
  }),
  {
    name: 'regexp_count computed pattern',
    expression: {
      kind: 'eval-scalar',
      expression: evalCall('operator', '=', 'pg_catalog.bool', [
        countExpression([evalCertain(text('aba')), evalCertain(concat(text('a'), text('')))]),
        evalCertain(integer('2')),
      ]),
    },
    expected: { certain: true, value: true },
    sql: 'SELECT pg_catalog.regexp_count($1::text, $2::text || $3::text) = 2 AS value',
    params: ['aba', 'a', ''],
  },
  {
    name: 'regexp_count computed flags',
    expression: {
      kind: 'eval-scalar',
      expression: evalCall('operator', '=', 'pg_catalog.bool', [
        countExpression([
          evalCertain(text('a.a a.a')),
          evalCertain(text('a.a')),
          evalCertain(integer('1')),
          evalCertain(concat(text(''), text('q'))),
        ]),
        evalCertain(integer('2')),
      ]),
    },
    expected: { certain: true, value: true },
    sql: 'SELECT pg_catalog.regexp_count($1::text, $2::text, $3::int4, $4::text || $5::text) = 2 AS value',
    params: ['a.a a.a', 'a.a', 1, '', 'q'],
  },
  {
    name: 'regexp_count computed invalid pattern',
    expression: {
      kind: 'eval-scalar',
      expression: evalCall('operator', '=', 'pg_catalog.bool', [
        countExpression([evalCertain(text('a')), evalCertain(concat(text('('), text('')))]),
        evalCertain(integer('1')),
      ]),
    },
    expected: { certain: true, value: null, error: '2201B' },
    sql: 'SELECT pg_catalog.regexp_count($1::text, $2::text || $3::text) = 1 AS value',
    params: ['a', '(', ''],
  },
]

const allCases: CheckCase[] = [
  ...logicCases,
  ...notCases,
  ...testCases,
  ...comparisonCases,
  ...compositionCases,
  ...regexCases,
  ...partialScalarCases,
  ...regexCallableCases,
  ...similarCases,
  ...regexCountCases,
  {
    name: 'regexp_count uncertain pattern propagates through comparison',
    expression: {
      kind: 'eval-scalar',
      expression: evalCall('operator', '=', 'pg_catalog.bool', [
        countExpression([evalCertain(text('aba')), { kind: 'uncertain', type: 'pg_catalog.text' }]),
        evalCertain(integer('2')),
      ]),
    },
    expected: { certain: false },
  },
]

// A column of each type an Unknown operand has; every case reads them as Unknown.
const unknownColumns: Record<string, string> = {
  'pg_catalog.bool': 'boolean',
  'pg_catalog.int4': 'integer',
  'pg_catalog.text': 'text',
  'pg_catalog.date': 'date',
  'pg_catalog.uuid': 'uuid',
}
const unknownColumn = (type = 'pg_catalog.bool'): string => {
  if (!unknownColumns[type]) throw new Error(`No Unknown column of type ${type}`)
  return 'unknown_' + type.slice('pg_catalog.'.length)
}

const quote = (value: string): string => `'${value.replaceAll("'", "''")}'`

const callable = (signature: string): string => {
  const [schema, name] = JSON.parse(
    signature.slice(signature.indexOf(':') + 1, signature.indexOf(']') + 1),
  ) as [string, string]
  return `${schema}.${name}`
}

const regexFlags = (options: RegexOptions): string =>
  ({ advanced: '', extended: 'e', basic: 'b', literal: 'q' })[options.syntax ?? 'advanced'] +
  (options.caseSensitive === false ? 'i' : '') +
  (options.expanded ? 'x' : '') +
  { ordinary: '', sensitive: 'n', stop: 'p', anchors: 'w' }[options.newline ?? 'ordinary']

function render(node: Atom): string {
  const operands = (node['operands'] ?? []) as Atom[]
  const value = node['value'] as string | null
  switch (node.kind) {
    case 'boolean':
      return value === null ? 'NULL::boolean' : String(value)
    case 'text':
      return value === null ? 'NULL::text' : `${quote(value)}::text`
    case 'integer':
      return value === null ? 'NULL::int4' : `(${value})::int4`
    case 'name':
      return `${quote(value!)}::name`
    case 'temporal':
      return `${quote(value!)}::date`
    case 'uuid':
      return `${quote(value!)}::uuid`
    case 'text-coercion':
      return `CAST(${render(node['operand'] as Atom)} AS char(${node['length'] as number}))`
    case 'certain':
    case 'eval-scalar':
      return render(node['expression'] as Atom)
    case 'uncertain':
      return unknownColumn(node['type'] as string | undefined)
    case 'operator':
    case 'function':
    case 'call':
    case 'regex-count': {
      const call = (node['call'] as Atom | undefined) ?? node
      const signature = call['signature'] as string
      const name = callable(signature)
      return signature.startsWith('operator:')
        ? operands.length === 1
          ? `(OPERATOR(${name}) ${render(operands[0]!)})`
          : `(${render(operands[0]!)} OPERATOR(${name}) ${render(operands[1]!)})`
        : `${name}(${operands.map(render).join(', ')})`
    }
    case 'eval-call':
      return render(node['call'] as Atom)
    case 'coalesce':
      return `COALESCE(${operands.map(render).join(', ')})`
    case 'case':
    case 'eval-case':
      return `(CASE ${(node['branches'] as { when: Atom; then: Atom }[])
        .map((branch) => `WHEN ${render(branch.when)} THEN ${render(branch.then)}`)
        .join(' ')} ELSE ${render(node['otherwise'] as Atom)} END)`
    case 'null-test':
      return `((${render(node['operand'] as Atom)}) IS ${node['negated'] ? 'NOT ' : ''}NULL)`
    case 'boolean-logic':
    case 'eval-boolean-logic':
      return node['operation'] === 'not'
        ? `(NOT ${render(operands[0]!)})`
        : `(${render(operands[0]!)} ${(node['operation'] as string).toUpperCase()} ${render(operands[1]!)})`
    case 'eval-test':
      return `(${render(node['operand'] as Atom)} IS ${node['negated'] ? 'NOT ' : ''}${(node['test'] as string).toUpperCase()})`
    case 'eval-comparison':
      return `(${render(operands[0]!)} ${node['operation'] as string} ${render(operands[1]!)})`
    case 'eval-regex': {
      const pattern = node['pattern'] as string | Atom
      return `(${node['negated'] ? 'NOT ' : ''}pg_catalog.regexp_like(${render(node['subject'] as Atom)}, ${typeof pattern === 'string' ? `${quote(pattern)}::text` : render(pattern)}, ${quote(regexFlags((node['options'] ?? {}) as RegexOptions))}))`
    }
  }
  throw new Error(`Unrendered case expression: ${node.kind}`)
}

const outcome = (expected: Expected): Outcome =>
  !expected.certain
    ? { kind: 'Unknown' }
    : expected.error
      ? { kind: 'Error', value: { state: Number.parseInt(expected.error, 36) } }
      : expected.value === null
        ? { kind: 'Null' }
        : { kind: expected.value ? 'True' : 'False' }

const flagCases: RegexCallableCase[] = [
  {
    name: 'regexp_like applies flags in order',
    expression: regexCall('function', 'regexp_like', [
      text('A'),
      text('a # comment'),
      text('qecixn'),
    ]),
    expected: { certain: true, value: true },
    sql: 'SELECT pg_catalog.regexp_like($1::text, $2::text, $3::text) AS value',
    params: ['A', 'a # comment', 'qecixn'],
  },
  {
    name: 'regexp_like later flags undo earlier ones',
    expression: regexCall('function', 'regexp_like', [text('a b'), text('a b'), text('nxst')]),
    expected: { certain: true, value: true },
    sql: 'SELECT pg_catalog.regexp_like($1::text, $2::text, $3::text) AS value',
    params: ['a b', 'a b', 'nxst'],
  },
  ...['g', 'z'].map((flags) => ({
    name: `regexp_like rejects the ${flags} option`,
    expression: regexCall('function', 'regexp_like', [text('abc'), text('abc'), text(flags)]),
    expected: { certain: true, value: null, error: '22023' } as const,
    sql: 'SELECT pg_catalog.regexp_like($1::text, $2::text, $3::text) AS value',
    params: ['abc', 'abc', flags],
  })),
]

const context = {
  defaultCollation: 'C',
  defaultCtype: 'C',
  serverEncoding: 'UTF8',
  maxIdentifierBytes: 63,
} as const

describe('CHECK predicate evaluation', () => {
  let pg: PGlite
  let table: TableInfo
  const bind = (sql: string) =>
    lowerTableCheck(table, { name: 'probe', type: 'check', definition: `CHECK (${sql})` })!
      .expression

  beforeAll(async () => {
    pg = await PGlite.create()
    await pg.exec(
      `CREATE TABLE evaluation_cases (${Object.entries(unknownColumns)
        .map(([type, sql]) => `${unknownColumn(type)} ${sql}`)
        .join(', ')})`,
    )
    table = (await snapshotCatalog(pg)).tables.find((item) => item.name === 'evaluation_cases')!
  })

  afterAll(async () => {
    await pg.close()
  })

  const matchesPostgres = async (
    fixtures: readonly (CheckCase & { sql: string; params: (string | number | null)[] })[],
  ) => {
    for (const fixture of fixtures) {
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
  }

  it('matches PostgreSQL for catalog regex call forms', async () => {
    await matchesPostgres([...regexCallableCases, ...similarCases, ...regexCountCases])
  })

  it('maps regexp_like flags in order and rejects invalid options', async () => {
    await matchesPostgres(flagCases)
  })

  it('decides every case in every target', async () => {
    const cases = [...allCases, ...flagCases]
    const names = cases.map((_, index) => `case_${index}`)
    const group = prepareCheckRustGroup(
      cases.map((fixture, index) => ({
        expression: lowerTableCheck(table, {
          name: names[index]!,
          type: 'check',
          definition: `CHECK (${render(fixture.expression)})`,
        })!.expression,
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: names[index]! },
      })),
      context,
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind === 'unsupported' ? check.reason : check.kind, cases[index]!.name).toBe(
        'supported',
      )
    const row = Object.fromEntries(
      Object.keys(unknownColumns).map((type) => [
        unknownColumn(type),
        { kind: 'Unknown' } as const,
      ]),
    )
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-check-evaluation-'))
    try {
      await runCheckParity(
        directory,
        'check_evaluation',
        group,
        names,
        cases.map((fixture, index) => ({
          name: names[index]!,
          row,
          expected: outcome(fixture.expected),
        })),
      )
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }, 360_000)

  it('selects the regular expression engine only for evaluators that match patterns', () => {
    const requiresRegex = (sql: string) => {
      const prepared = prepareCheckRust(bind(sql), undefined, context)
      if (prepared.kind !== 'supported') throw new Error(prepared.reason)
      return prepared.evaluator.requiresRegex
    }
    expect(requiresRegex('unknown_bool')).toBe(false)
    expect(requiresRegex("'abc' ~ 'abc$'")).toBe(true)
    expect(requiresRegex("unknown_text ~ 'abc$'")).toBe(true)
    expect(requiresRegex("unknown_text ~ pg_catalog.similar_to_escape('abc')")).toBe(true)
    expect(requiresRegex("'abc' ~ pg_catalog.similar_to_escape('a' || unknown_text)")).toBe(true)
    expect(requiresRegex("'abc' ~ ('a' || unknown_text)")).toBe(true)
    expect(requiresRegex("pg_catalog.regexp_count(unknown_text, 'aa') = 2")).toBe(true)
    expect(requiresRegex("pg_catalog.regexp_count('aaaa', 'a' || unknown_text) = 2")).toBe(true)
  })

  it('rejects malformed incomplete expressions', () => {
    const constant = (value: boolean) =>
      ({
        kind: 'certain',
        expression: { kind: 'boolean', type: 'pg_catalog.bool', value },
      }) as const
    expect(() =>
      emitCheckRustEvaluator({
        kind: 'certain',
        expression: { kind: 'text', type: 'pg_catalog.text', value: 'not boolean' },
      }),
    ).toThrow('A Rust CHECK constant must be bool')
    expect(() =>
      emitCheckRustEvaluator({
        kind: 'eval-boolean-logic',
        operation: 'and',
        operands: [constant(true)],
      }),
    ).toThrow('Expected binary Boolean operation')
    expect(() =>
      emitCheckRustEvaluator({
        kind: 'eval-boolean-logic',
        operation: 'not',
        operands: [constant(true), constant(false)],
      }),
    ).toThrow('Expected unary NOT')
    expect(() =>
      emitCheckRustEvaluator({ kind: 'eval-case', branches: [], otherwise: constant(false) }),
    ).toThrow('Expected a CASE branch')
  })
})
