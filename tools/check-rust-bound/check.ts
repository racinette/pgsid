import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import type { EvalBoolExpression } from '../../src/sql-semantics/check-expressions.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { emitCheckRustEvaluator } from '../../src/codegen/shared/check-rust-evaluator.js'
import {
  assembleCheckRust,
  prepareCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import { transpileCheckRust } from '../../src/codegen/shared/check-rust-transpile.js'

const run = promisify(execFile)
const directory = fileURLToPath(new URL('../../artifacts/check-rust-bound/', import.meta.url))
await mkdir(directory, { recursive: true })
const cases: readonly [number | null, boolean | null, string | null][] = [
  [1, true, 'abc'],
  [0, true, 'abc'],
  [0, null, 'abc'],
  [1, true, 'xxx'],
  [null, true, 'abc'],
  [null, null, 'abc'],
  [1, false, null],
]

const pg = await PGlite.create()
let expected: (boolean | null)[]
let expressions: EvalBoolExpression[]
const lengthCases: readonly (string | null)[] = ['', 'a', '😀', null]
let lengthExpected: (boolean | null)[]
try {
  await pg.exec(
    'CREATE TABLE public.check_rust_bound (amount integer, flag boolean, note text COLLATE "C", wide bigint, ' +
      "CONSTRAINT decision CHECK ((amount > 0 OR flag IS NULL) AND NOT (note ~ '^x+$')), " +
      'CONSTRAINT flag_null CHECK (flag IS NULL), ' +
      'CONSTRAINT length_guard CHECK (length(note) > 0), ' +
      'CONSTRAINT wide_guard CHECK (wide > 0))',
  )
  const catalog = await snapshotCatalog(pg)
  const table = catalog.tables.find((item) => item.name === 'check_rust_bound')!
  expressions = ['decision', 'flag_null', 'length_guard', 'wide_guard'].map(
    (name) =>
      lowerTableCheck(
        table,
        table.constraints.find((item) => item.name === name)!,
      )!.expression,
  )
  assert.equal(prepareCheckRust(expressions[2]!).kind, 'supported')
  const wide = prepareCheckRust(expressions[3]!)
  assert.equal(wide.kind, 'unsupported')
  if (wide.kind === 'unsupported')
    assert.match(wide.reason, /Unsupported Rust CHECK input type: pg_catalog.int8/u)
  expected = []
  for (const [amount, flag, note] of cases) {
    const result = await pg.query<{ value: boolean | null }>(
      'SELECT (($1::int4 > 0 OR $2::bool IS NULL) AND NOT (($3::text COLLATE "C") ~ \'^x+$\')) AS value',
      [amount, flag, note],
    )
    expected.push(result.rows[0]!.value)
  }
  lengthExpected = []
  for (const note of lengthCases) {
    const result = await pg.query<{ value: boolean | null }>(
      'SELECT length(($1::text) COLLATE "C") > 0 AS value',
      [note],
    )
    lengthExpected.push(result.rows[0]!.value)
  }
} finally {
  await pg.close()
}

const group = prepareCheckRustGroup(expressions)
assert.deepEqual(
  group.checks.map((check) => check.kind),
  ['supported', 'supported', 'supported', 'unsupported'],
)
assert.ok(group.source && group.evaluatorSource)
await writeFile(directory + '/group-evaluator.rs', group.evaluatorSource)
await writeFile(directory + '/group.rs', group.source)
const grouped = transpileCheckRust(group.source)
assert.match(grouped.typescript, /function evaluateCheck0\(/u)
assert.match(grouped.typescript, /function evaluateCheck1\(/u)
assert.match(grouped.typescript, /function evaluateCheck2\(/u)
assert.match(grouped.go, /func EvaluateCheck0\(/u)
assert.match(grouped.go, /func EvaluateCheck1\(/u)
assert.match(grouped.go, /func EvaluateCheck2\(/u)
await run('rustc', [
  '--edition',
  '2021',
  '-Awarnings',
  '--crate-type',
  'lib',
  directory + '/group.rs',
  '-o',
  directory + '/group.rlib',
])
const rustLength = lengthCases.map((note, index) => {
  const value = note === null ? 'text_null()' : `make_text_value(${JSON.stringify(note)})`
  const expected =
    lengthExpected[index] === null ? 'Null' : lengthExpected[index] ? 'True' : 'False'
  return `    assert!(evaluate_check_2(${value}) == CheckOutcome::${expected});`
})
await writeFile(
  directory + '/group-test.rs',
  group.source +
    '\n#[test]\nfn length_check_matches_postgres() {\n' +
    rustLength.join('\n') +
    '\n}\n',
)
await run('rustc', [
  '--edition',
  '2021',
  '-Awarnings',
  '--test',
  directory + '/group-test.rs',
  '-o',
  directory + '/group-test',
])
await run(directory + '/group-test', [])
await mkdir(directory + '/go-group', { recursive: true })
await writeFile(directory + '/go-group/check.go', grouped.go)
await writeFile(directory + '/go-group/go.mod', 'module pgsid-check-rust-group\n\ngo 1.25\n')
const goLength = lengthCases.map((note, index) => {
  const value = note === null ? 'TextNull()' : `MakeTextValue(${JSON.stringify(note)})`
  const expected =
    lengthExpected[index] === null ? 'Null' : lengthExpected[index] ? 'True' : 'False'
  return `    if actual := EvaluateCheck2(${value}); actual.Kind != CheckOutcome${expected} { t.Errorf("length ${index}: %+v", actual) }`
})
await writeFile(
  directory + '/go-group/check_test.go',
  'package generated\nimport "testing"\nfunc TestLengthCheck(t *testing.T) {\n' +
    goLength.join('\n') +
    '\n}\n',
)
await run('go', ['test', '.'], {
  cwd: directory + '/go-group',
  env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
})
await writeFile(directory + '/group.ts', grouped.typescript)
await run('node_modules/.bin/tsc', [
  '--strict',
  '--noEmit',
  '--target',
  'es2022',
  '--module',
  'esnext',
  '--skipLibCheck',
  directory + '/group.ts',
])
const tsGroup = await import(pathToFileURL(directory + '/group.ts').href)
assert.equal(
  tsGroup.evaluateCheck0(
    tsGroup.makeInt4Value(1),
    tsGroup.makeBoolValue(true),
    tsGroup.makeTextValue('abc'),
  ).kind,
  'True',
)
assert.equal(tsGroup.evaluateCheck1(tsGroup.boolNull()).kind, 'True')
for (const [index, note] of lengthCases.entries())
  assert.equal(
    tsGroup.evaluateCheck2(note === null ? tsGroup.textNull() : tsGroup.makeTextValue(note)).kind,
    lengthExpected[index] === null ? 'Null' : lengthExpected[index] ? 'True' : 'False',
  )
const evaluator = emitCheckRustEvaluator(expressions[0]!)
assert.deepEqual(
  evaluator.inputs.map((input) => input.name),
  ['amount', 'flag', 'note'],
)
assert.equal(evaluator.requiresRegex, true)
await writeFile(directory + '/evaluator.rs', evaluator.source)
const source = assembleCheckRust(evaluator)
const generated = transpileCheckRust(source)
await writeFile(directory + '/check.rs', source)
await writeFile(directory + '/check.ts', generated.typescript)
await mkdir(directory + '/go', { recursive: true })
await writeFile(directory + '/go/check.go', generated.go)
await writeFile(directory + '/go/go.mod', 'module pgsid-check-rust-bound\n\ngo 1.25\n')

const rustInput = (value: number | boolean | string | null, type: 'int4' | 'bool' | 'text') => {
  if (value === null) return type + '_null()'
  return 'make_' + type + '_value(' + JSON.stringify(value) + ')'
}
const rustOutcome = (value: boolean | null) =>
  'CheckOutcome::' + (value === null ? 'Null' : value ? 'True' : 'False')
const rustChecks = cases.map(
  ([amount, flag, note], index) =>
    '    assert!(evaluate_check(' +
    [rustInput(amount, 'int4'), rustInput(flag, 'bool'), rustInput(note, 'text')].join(', ') +
    ') == ' +
    rustOutcome(expected[index]!) +
    ');',
)
rustChecks.push(
  '    assert!(evaluate_check(int4_unknown(), make_bool_value(true), make_text_value("abc")) == CheckOutcome::Unknown);',
  '    assert!(evaluate_check(int4_unknown(), bool_null(), make_text_value("abc")) == CheckOutcome::True);',
  '    assert!(evaluate_check(make_int4_value(0), make_bool_value(true), TextValue::Error(make_sql_error(3452591))) == CheckOutcome::False);',
  '    assert!(evaluate_check(make_int4_value(1), BoolValue::Error(make_sql_error(3452591)), make_text_value("abc")) == CheckOutcome::True);',
  '    assert!(evaluate_check(make_int4_value(0), BoolValue::Error(make_sql_error(3452591)), make_text_value("abc")) == CheckOutcome::Error(make_sql_error(3452591)));',
  '    assert!(evaluate_check(make_int4_value(1), make_bool_value(true), TextValue::Error(make_sql_error(3452591))) == CheckOutcome::Error(make_sql_error(3452591)));',
)
await writeFile(
  directory + '/check-test.rs',
  source + '\n#[test]\nfn bound_check_matches_postgres() {\n' + rustChecks.join('\n') + '\n}\n',
)
await run('rustc', [
  '--edition',
  '2021',
  '-Awarnings',
  '--test',
  directory + '/check-test.rs',
  '-o',
  directory + '/rust-test',
])
await run(directory + '/rust-test', [])

const goInput = (value: number | boolean | string | null, type: 'Int4' | 'Bool' | 'Text') => {
  if (value === null) return type + 'Null()'
  return 'Make' + type + 'Value(' + JSON.stringify(value) + ')'
}
const goOutcome = (value: boolean | null) =>
  'CheckOutcome{Kind: CheckOutcome' + (value === null ? 'Null' : value ? 'True' : 'False') + '}'
const goChecks = cases.map(
  ([amount, flag, note], index) =>
    '    if actual := EvaluateCheck(' +
    [goInput(amount, 'Int4'), goInput(flag, 'Bool'), goInput(note, 'Text')].join(', ') +
    '); actual != (' +
    goOutcome(expected[index]!) +
    ') { t.Errorf("case ' +
    index +
    ': %+v", actual) }',
)
goChecks.push(
  '    if actual := EvaluateCheck(Int4Unknown(), MakeBoolValue(true), MakeTextValue("abc")); actual.Kind != CheckOutcomeUnknown { t.Errorf("unknown: %+v", actual) }',
  '    if actual := EvaluateCheck(Int4Unknown(), BoolNull(), MakeTextValue("abc")); actual.Kind != CheckOutcomeTrue { t.Errorf("deciding OR: %+v", actual) }',
  '    if actual := EvaluateCheck(MakeInt4Value(0), MakeBoolValue(true), TextValue{Kind: TextValueError, Error: SqlError{State: 3452591}}); actual.Kind != CheckOutcomeFalse { t.Errorf("lazy AND: %+v", actual) }',
  '    if actual := EvaluateCheck(MakeInt4Value(1), BoolValue{Kind: BoolValueError, Error: SqlError{State: 3452591}}, MakeTextValue("abc")); actual.Kind != CheckOutcomeTrue { t.Errorf("lazy OR: %+v", actual) }',
  '    if actual := EvaluateCheck(MakeInt4Value(0), BoolValue{Kind: BoolValueError, Error: SqlError{State: 3452591}}, MakeTextValue("abc")); actual.Kind != CheckOutcomeError { t.Errorf("OR error: %+v", actual) }',
  '    if actual := EvaluateCheck(MakeInt4Value(1), MakeBoolValue(true), TextValue{Kind: TextValueError, Error: SqlError{State: 3452591}}); actual.Kind != CheckOutcomeError { t.Errorf("NOT error: %+v", actual) }',
)
await writeFile(
  directory + '/go/check_test.go',
  'package generated\n\nimport "testing"\n\nfunc TestBoundCheck(t *testing.T) {\n' +
    goChecks.join('\n') +
    '\n}\n',
)
await run('go', ['test', '.'], {
  cwd: directory + '/go',
  env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
})

const tsModule = await import(pathToFileURL(directory + '/check.ts').href)
const tsInput = (value: number | boolean | string | null, type: 'int4' | 'bool' | 'text') =>
  value === null
    ? tsModule[type + 'Null']()
    : tsModule['make' + type[0]!.toUpperCase() + type.slice(1) + 'Value'](value)
for (const [index, [amount, flag, note]] of cases.entries())
  assert.equal(
    tsModule.evaluateCheck(tsInput(amount, 'int4'), tsInput(flag, 'bool'), tsInput(note, 'text'))
      .kind,
    expected[index] === null ? 'Null' : expected[index] ? 'True' : 'False',
  )
assert.equal(
  tsModule.evaluateCheck(
    tsModule.int4Unknown(),
    tsModule.makeBoolValue(true),
    tsModule.makeTextValue('abc'),
  ).kind,
  'Unknown',
)
assert.equal(
  tsModule.evaluateCheck(tsModule.int4Unknown(), tsModule.boolNull(), tsModule.makeTextValue('abc'))
    .kind,
  'True',
)
assert.equal(
  tsModule.evaluateCheck(
    tsModule.makeInt4Value(0),
    { kind: 'Error', value: { state: 3452591 } },
    tsModule.makeTextValue('abc'),
  ).kind,
  'Error',
)
assert.equal(
  tsModule.evaluateCheck(tsModule.makeInt4Value(1), tsModule.makeBoolValue(true), {
    kind: 'Error',
    value: { state: 3452591 },
  }).kind,
  'Error',
)
assert.equal(
  tsModule.evaluateCheck(tsModule.makeInt4Value(0), tsModule.makeBoolValue(true), {
    kind: 'Error',
    value: { state: 3452591 },
  }).kind,
  'False',
)
assert.equal(
  tsModule.evaluateCheck(
    tsModule.makeInt4Value(1),
    { kind: 'Error', value: { state: 3452591 } },
    tsModule.makeTextValue('abc'),
  ).kind,
  'True',
)
console.log('bound CHECK matches PGlite in Rust, Go, and TypeScript')
