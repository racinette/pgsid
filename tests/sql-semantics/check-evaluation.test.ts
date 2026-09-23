import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
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
import type { SqlExpression } from '../../src/sql-semantics/expressions.js'
import type { PostgresRegexOptions } from '../../src/sql-semantics/regex/ast.js'

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

const allCases = [
  ...logicCases,
  ...notCases,
  ...testCases,
  ...comparisonCases,
  ...compositionCases,
  ...regexCases,
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
  })
})
