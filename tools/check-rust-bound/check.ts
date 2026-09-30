import { dirname } from 'node:path'
import { writeCheckRustSources } from '../check-rust/sources.js'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
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
import {
  checkTypescriptArtifacts,
  transpileCheckRust,
  transpileCheckRustFiles,
} from '../../src/codegen/shared/check-rust-transpile.js'

const run = promisify(execFile)
const directory = fileURLToPath(new URL('../../artifacts/check-rust-bound/', import.meta.url))
await mkdir(directory, { recursive: true })
const cases: readonly [number | null, boolean | null, string | null][] = [
  [1, true, 'abc'],
  [-2, false, null],
  [-2147483648, true, 'abc'],
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
const constraintNames = [
  'decision',
  'flag_null',
  'length_guard',
  'negative_floor',
  'minimum_floor',
  'conditional_check',
  'wide_guard',
  'prefix_guard',
  'nested_check',
]
const lengthCases: readonly (string | null)[] = ['', 'a', '😀', null]
let lengthExpected: (boolean | null)[]
let negativeExpected: (boolean | null)[]
let minimumExpected: (boolean | null)[]
let conditionalExpected: (boolean | null)[]
let prefixExpected: (boolean | null)[]
let nestedExpected: (boolean | null)[]
try {
  await pg.exec(
    'CREATE TABLE public.check_rust_bound (amount integer, flag boolean, note text COLLATE "C", wide bigint, ' +
      "CONSTRAINT decision CHECK ((amount > 0 OR flag IS NULL) AND NOT (note ~ '^x+$')), " +
      'CONSTRAINT flag_null CHECK (flag IS NULL), ' +
      'CONSTRAINT length_guard CHECK (length(note) > 0), ' +
      'CONSTRAINT negative_floor CHECK (amount > -1), ' +
      'CONSTRAINT minimum_floor CHECK (amount >= -2147483648), ' +
      'CONSTRAINT conditional_check CHECK (CASE WHEN flag THEN amount + 1 > 0 ELSE note IS NULL END), ' +
      'CONSTRAINT wide_guard CHECK (wide > 0), ' +
      "CONSTRAINT prefix_guard CHECK (starts_with(note, 'ab')), " +
      'CONSTRAINT nested_check CHECK ((CASE WHEN flag THEN amount + 1 > 0 ELSE note IS NULL END) AND amount > 0))',
  )
  const catalog = await snapshotCatalog(pg)
  const table = catalog.tables.find((item) => item.name === 'check_rust_bound')!
  expressions = constraintNames.map(
    (name) =>
      lowerTableCheck(
        table,
        table.constraints.find((item) => item.name === name)!,
      )!.expression,
  )
  assert.equal(prepareCheckRust(expressions[2]!).kind, 'supported')
  for (const expression of expressions.slice(3, 6))
    assert.equal(prepareCheckRust(expression).kind, 'supported')
  const wide = prepareCheckRust(expressions[6]!)
  assert.equal(wide.kind, 'unsupported')
  if (wide.kind === 'unsupported')
    assert.match(wide.reason, /Unsupported Rust CHECK input type: pg_catalog.int8/u)
  assert.equal(prepareCheckRust(expressions[7]!).kind, 'supported')
  assert.equal(prepareCheckRust(expressions[8]!).kind, 'supported')
  expected = []
  negativeExpected = []
  minimumExpected = []
  conditionalExpected = []
  prefixExpected = []
  nestedExpected = []
  for (const [amount, flag, note] of cases) {
    const result = await pg.query<{ value: boolean | null }>(
      'SELECT (($1::int4 > 0 OR $2::bool IS NULL) AND NOT (($3::text COLLATE "C") ~ \'^x+$\')) AS value',
      [amount, flag, note],
    )
    expected.push(result.rows[0]!.value)
    const extras = await pg.query<{
      negative: boolean | null
      minimum: boolean | null
      conditional: boolean | null
      prefix: boolean | null
      nested: boolean | null
    }>(
      'SELECT ($1::int4 > -1) AS negative, ($1::int4 >= -2147483648) AS minimum, ' +
        '(CASE WHEN $2::bool THEN $1::int4 + 1 > 0 ELSE $3::text IS NULL END) AS conditional, ' +
        'starts_with(($3::text) COLLATE "C", \'ab\') AS prefix, ' +
        '((CASE WHEN $2::bool THEN $1::int4 + 1 > 0 ELSE $3::text IS NULL END) AND $1::int4 > 0) AS nested',
      [amount, flag, note],
    )
    negativeExpected.push(extras.rows[0]!.negative)
    minimumExpected.push(extras.rows[0]!.minimum)
    conditionalExpected.push(extras.rows[0]!.conditional)
    prefixExpected.push(extras.rows[0]!.prefix)
    nestedExpected.push(extras.rows[0]!.nested)
  }
  lengthExpected = []
  for (const note of lengthCases) {
    const result = await pg.query<{ value: boolean | null }>(
      'SELECT length(($1::text) COLLATE "C") > 0 AS value',
      [note],
    )
    lengthExpected.push(result.rows[0]!.value)
  }
  const lazyCase = await pg.query<{ value: boolean | null }>(
    'SELECT CASE WHEN false THEN 2147483647::int4 + 1 > 0 ELSE true END AS value',
  )
  assert.equal(lazyCase.rows[0]!.value, true)
  await assert.rejects(
    pg.query('SELECT CASE WHEN true THEN 2147483647::int4 + 1 > 0 ELSE true END'),
    (error: unknown) =>
      typeof error === 'object' && error !== null && 'code' in error && error.code === '22003',
  )
} finally {
  await pg.close()
}

const group = prepareCheckRustGroup(
  expressions.map((expression, index) => ({
    expression,
    identity: {
      schema: 'public',
      kind: 'table',
      owner: 'check_rust_bound',
      constraint: constraintNames[index]!,
    },
  })),
)
assert.deepEqual(
  group.checks.map((check) => check.kind),
  [
    'supported',
    'supported',
    'supported',
    'supported',
    'supported',
    'supported',
    'unsupported',
    'supported',
    'supported',
  ],
)
assert.deepEqual(
  group.checks[5]?.kind === 'supported' ? group.checks[5].inputs.map((input) => input.name) : [],
  ['flag', 'amount', 'note'],
)
assert.ok(group.source && group.evaluatorSource)
await writeFile(directory + '/group-evaluator.rs', group.evaluatorSource)
writeCheckRustSources(directory + '/group.rs', group.source)
const grouped = transpileCheckRust(group.source)
assert.match(grouped.typescript, /function evaluateCheckPublicTableCheckRustBoundDecisionHggxf\(/u)
assert.match(grouped.typescript, /function evaluateCheckPublicTableCheckRustBoundFlagNullHun52\(/u)
assert.match(
  grouped.typescript,
  /function evaluateCheckPublicTableCheckRustBoundLengthGuardHu3mx\(/u,
)
assert.match(
  grouped.typescript,
  /function evaluateCheckPublicTableCheckRustBoundConditionalCheckHcion\(/u,
)
assert.match(
  grouped.typescript,
  /function evaluateCheckPublicTableCheckRustBoundNestedCheckHklip\(/u,
)
assert.match(grouped.go, /func EvaluateCheckPublicTableCheckRustBoundDecisionHggxf\(/u)
assert.match(grouped.go, /func EvaluateCheckPublicTableCheckRustBoundFlagNullHun52\(/u)
assert.match(grouped.go, /func EvaluateCheckPublicTableCheckRustBoundLengthGuardHu3mx\(/u)
assert.match(grouped.go, /func EvaluateCheckPublicTableCheckRustBoundConditionalCheckHcion\(/u)
assert.match(grouped.go, /func EvaluateCheckPublicTableCheckRustBoundNestedCheckHklip\(/u)
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
  return `    assert!(evaluate_check_public_table_check_rust_bound_length_guard_hu3mx(${value}) == CheckOutcome::${expected});`
})
const outcomeName = (value: boolean | null): string =>
  value === null ? 'Null' : value ? 'True' : 'False'
const rustGroupChecks = cases.flatMap(([amount, flag, note], index) => {
  const integer = amount === null ? 'int4_null()' : `make_int4_value(${amount})`
  const boolean = flag === null ? 'bool_null()' : `make_bool_value(${flag})`
  const text = note === null ? 'text_null()' : `make_text_value(${JSON.stringify(note)})`
  return [
    `    assert!(evaluate_check_public_table_check_rust_bound_negative_floor_htqx9(${integer}) == CheckOutcome::${outcomeName(negativeExpected[index]!)});`,
    `    assert!(evaluate_check_public_table_check_rust_bound_minimum_floor_hea6n(${integer}) == CheckOutcome::${outcomeName(minimumExpected[index]!)});`,
    `    assert!(evaluate_check_public_table_check_rust_bound_conditional_check_hcion(${boolean}, ${integer}, ${text}) == CheckOutcome::${outcomeName(conditionalExpected[index]!)});`,
    `    assert!(evaluate_check_public_table_check_rust_bound_prefix_guard_hmvou(${text}) == CheckOutcome::${outcomeName(prefixExpected[index]!)});`,
    `    assert!(evaluate_check_public_table_check_rust_bound_nested_check_hklip(${boolean}, ${integer}, ${text}) == CheckOutcome::${outcomeName(nestedExpected[index]!)});`,
  ]
})
rustGroupChecks.push(
  '    assert!(evaluate_check_public_table_check_rust_bound_conditional_check_hcion(make_bool_value(false), make_int4_value(2147483647), text_null()) == CheckOutcome::True);',
  '    assert!(evaluate_check_public_table_check_rust_bound_conditional_check_hcion(make_bool_value(true), make_int4_value(2147483647), text_null()) == CheckOutcome::Error(make_sql_error(3452547)));',
  '    assert!(evaluate_check_public_table_check_rust_bound_conditional_check_hcion(bool_unknown(), make_int4_value(1), text_null()) == CheckOutcome::Unknown);',
  '    assert!(evaluate_check_public_table_check_rust_bound_conditional_check_hcion(BoolValue::Error(make_sql_error(3452547)), make_int4_value(1), text_null()) == CheckOutcome::Error(make_sql_error(3452547)));',
  '    assert!(evaluate_check_public_table_check_rust_bound_prefix_guard_hmvou(text_unknown()) == CheckOutcome::Unknown);',
  '    assert!(evaluate_check_public_table_check_rust_bound_prefix_guard_hmvou(TextValue::Error(make_sql_error(3452591))) == CheckOutcome::Error(make_sql_error(3452591)));',
  '    assert!(evaluate_check_public_table_check_rust_bound_nested_check_hklip(bool_unknown(), make_int4_value(0), text_null()) == CheckOutcome::False);',
  '    assert!(evaluate_check_public_table_check_rust_bound_nested_check_hklip(BoolValue::Error(make_sql_error(3452547)), make_int4_value(0), text_null()) == CheckOutcome::Error(make_sql_error(3452547)));',
)
await writeFile(
  directory + '/group-test.rs',
  `include!("group.rs");` +
    '\n#[test]\nfn grouped_checks_match_postgres() {\n' +
    [...rustLength, ...rustGroupChecks].join('\n') +
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
  return `    if actual := EvaluateCheckPublicTableCheckRustBoundLengthGuardHu3mx(${value}); actual.Kind != CheckOutcome${expected} { t.Errorf("length ${index}: %+v", actual) }`
})
const goGroupChecks = cases.flatMap(([amount, flag, note], index) => {
  const integer = amount === null ? 'Int4Null()' : `MakeInt4Value(${amount})`
  const boolean = flag === null ? 'BoolNull()' : `MakeBoolValue(${flag})`
  const text = note === null ? 'TextNull()' : `MakeTextValue(${JSON.stringify(note)})`
  return [
    `    if actual := EvaluateCheckPublicTableCheckRustBoundNegativeFloorHtqx9(${integer}); actual.Kind != CheckOutcome${outcomeName(negativeExpected[index]!)} { t.Errorf("negative ${index}: %+v", actual) }`,
    `    if actual := EvaluateCheckPublicTableCheckRustBoundMinimumFloorHea6n(${integer}); actual.Kind != CheckOutcome${outcomeName(minimumExpected[index]!)} { t.Errorf("minimum ${index}: %+v", actual) }`,
    `    if actual := EvaluateCheckPublicTableCheckRustBoundConditionalCheckHcion(${boolean}, ${integer}, ${text}); actual.Kind != CheckOutcome${outcomeName(conditionalExpected[index]!)} { t.Errorf("CASE ${index}: %+v", actual) }`,
    `    if actual := EvaluateCheckPublicTableCheckRustBoundPrefixGuardHmvou(${text}); actual.Kind != CheckOutcome${outcomeName(prefixExpected[index]!)} { t.Errorf("prefix ${index}: %+v", actual) }`,
    `    if actual := EvaluateCheckPublicTableCheckRustBoundNestedCheckHklip(${boolean}, ${integer}, ${text}); actual.Kind != CheckOutcome${outcomeName(nestedExpected[index]!)} { t.Errorf("nested ${index}: %+v", actual) }`,
  ]
})
goGroupChecks.push(
  '    if actual := EvaluateCheckPublicTableCheckRustBoundConditionalCheckHcion(MakeBoolValue(false), MakeInt4Value(2147483647), TextNull()); actual.Kind != CheckOutcomeTrue { t.Errorf("lazy CASE: %+v", actual) }',
  '    if actual := EvaluateCheckPublicTableCheckRustBoundConditionalCheckHcion(MakeBoolValue(true), MakeInt4Value(2147483647), TextNull()); actual.Kind != CheckOutcomeError || actual.Error.State != 3452547 { t.Errorf("selected CASE overflow: %+v", actual) }',
  '    if actual := EvaluateCheckPublicTableCheckRustBoundConditionalCheckHcion(BoolUnknown(), MakeInt4Value(1), TextNull()); actual.Kind != CheckOutcomeUnknown { t.Errorf("uncertain CASE guard: %+v", actual) }',
  '    if actual := EvaluateCheckPublicTableCheckRustBoundPrefixGuardHmvou(TextUnknown()); actual.Kind != CheckOutcomeUnknown { t.Errorf("prefix unknown: %+v", actual) }',
  '    if actual := EvaluateCheckPublicTableCheckRustBoundPrefixGuardHmvou(TextValue{Kind: TextValueError, Error: SqlError{State: 3452591}}); actual.Kind != CheckOutcomeError { t.Errorf("prefix error: %+v", actual) }',
  '    if actual := EvaluateCheckPublicTableCheckRustBoundNestedCheckHklip(BoolUnknown(), MakeInt4Value(0), TextNull()); actual.Kind != CheckOutcomeFalse { t.Errorf("nested unknown and false: %+v", actual) }',
  '    if actual := EvaluateCheckPublicTableCheckRustBoundNestedCheckHklip(BoolValue{Kind: BoolValueError, Error: SqlError{State: 3452547}}, MakeInt4Value(0), TextNull()); actual.Kind != CheckOutcomeError { t.Errorf("nested error: %+v", actual) }',
)
await writeFile(
  directory + '/go-group/check_test.go',
  'package generated\nimport "testing"\nfunc TestGroupedChecks(t *testing.T) {\n' +
    [...goLength, ...goGroupChecks].join('\n') +
    '\n}\n',
)
await run('go', ['test', '.'], {
  cwd: directory + '/go-group',
  env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
})
const reorderedSource = {
  ...group.source,
  modules: [...group.source.modules]
    .reverse()
    .map((module) => ({ ...module, files: [...module.files].reverse() })),
}
const split = transpileCheckRustFiles(reorderedSource, 'pgsid-check-rust-group-split/pg_catalog')
assert.ok(split.typescript.regex.includes('function find('))
assert.ok(split.typescript.operations.includes('function int4gt5vlv'))
assert.ok(split.typescript.checks.includes('pg_catalog.int4gt5vlv'))
assert.ok(
  split.typescript.checks.includes('function evaluateCheckPublicTableCheckRustBoundDecisionHggxf'),
)
assert.ok(!split.typescript.checks.includes('function find('))
assert.ok(split.go.regex.includes('func Find('))
assert.ok(split.go.operations.includes('regexengine.Find('))
assert.ok(split.go.regex.startsWith('package regexengine'))
assert.ok(split.go.checks.includes('pg_catalog.Int4gt5vlv('))
assert.ok(split.go.operations.includes('func Int4gt5vlv('))
assert.ok(!split.go.operations.includes('sqlPgCatalog'))
assert.ok(split.go.runtime.includes('func AndFinish('))
assert.ok(split.go.language.includes('func CheckedSubtract('))
assert.ok(split.go.checks.includes('checkruntime.AndFinish('))
assert.ok(split.go.checks.includes('langruntime.CheckedSignedNegate('))
assert.ok(split.go.operations.includes('checkruntime.Int4Value'))
assert.ok(split.go.regex.includes('langruntime.CheckedSubtract('))
assert.ok(split.typescript.runtime.includes('function andFinish('))
assert.ok(split.typescript.language.includes('function checkedSubtract('))
assert.ok(split.typescript.checks.includes('checkruntime.andFinish('))
assert.ok(split.typescript.regex.includes('langruntime.checkedSubtract('))
for (const files of [split.go, split.typescript]) {
  assert.doesNotMatch(
    files.operations,
    /(?:func|function) (?:AndFinish|andFinish|CheckedSubtract|checkedSubtract)\(/u,
  )
  assert.doesNotMatch(files.operations, /(?:type|interface) Int4Value\b/u)
  assert.doesNotMatch(files.regex, /(?:func|function) [Cc]heckedSubtract\(/u)
}

for (const [goName, typescriptName] of [
  ['AndStops', 'andStops'],
  ['OrStops', 'orStops'],
  ['CaseGuardStops', 'caseGuardStops'],
]) {
  const goBody = split.go.runtime.match(new RegExp(`func ${goName}\\([\\s\\S]*?\\n}`))?.[0]
  const typescriptBody = split.typescript.runtime.match(
    new RegExp(`function ${typescriptName}\\([\\s\\S]*?\\n}`),
  )?.[0]
  assert.ok(goBody && typescriptBody)
  assert.doesNotMatch(goBody, /\.Error|_ =/u)
  assert.doesNotMatch(typescriptBody, /\.value|const error/u)
}

const typescriptDirectory = directory + '/ts-group-split'
await rm(typescriptDirectory, { recursive: true, force: true })
for (const artifact of checkTypescriptArtifacts(split.typescript)) {
  const path = typescriptDirectory + '/' + artifact.path
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, artifact.content)
}
for (const suffix of ['', '.pg_catalog', '.checkruntime', '.langruntime', '.regex', '.operations'])
  await rm(directory + '/group-split' + suffix + '.ts', { force: true })
assert.ok(split.typescript.checks.includes('"./pg_catalog/operations.js"'))
assert.ok(split.typescript.operations.includes('"../checkruntime/runtime.js"'))
assert.ok(split.typescript.regex.includes('"../langruntime/runtime.js"'))
await run('node_modules/.bin/tsc', [
  '--strict',
  '--noEmit',
  '--target',
  'es2022',
  '--module',
  'esnext',
  '--moduleResolution',
  'bundler',
  '--skipLibCheck',
  typescriptDirectory + '/checks.ts',
])
const splitModule = await import(pathToFileURL(typescriptDirectory + '/checks.ts').href)
assert.equal(
  splitModule.evaluateCheckPublicTableCheckRustBoundFlagNullHun52(splitModule.boolNull()).kind,
  'True',
)
assert.equal('find' in splitModule, false)
assert.equal(
  Object.keys(splitModule).some((name) => name.startsWith('sqlPgCatalog')),
  false,
)
await mkdir(directory + '/go-group-split', { recursive: true })
await rm(directory + '/go-group-split/operations.go', { force: true })
await rm(directory + '/go-group-split/regex.go', { force: true })
await mkdir(directory + '/go-group-split/pg_catalog', { recursive: true })
await mkdir(directory + '/go-group-split/regexengine', { recursive: true })
await mkdir(directory + '/go-group-split/checkruntime', { recursive: true })
await mkdir(directory + '/go-group-split/langruntime', { recursive: true })
await rm(directory + '/go-group-split/pg_catalog/regex.go', { force: true })
for (const [name, source] of Object.entries(split.go))
  if (source)
    await writeFile(
      directory +
        `/go-group-split/${name === 'checks' ? '' : name === 'regex' ? 'regexengine/' : name === 'runtime' ? 'checkruntime/' : name === 'language' ? 'langruntime/' : 'pg_catalog/'}${name}.go`,
      source,
    )
await writeFile(
  directory + '/go-group-split/go.mod',
  'module pgsid-check-rust-group-split\n\ngo 1.25\n',
)
await writeFile(
  directory + '/go-group-split/check_test.go',
  (await readFile(directory + '/go-group/check_test.go', 'utf8')).replace(
    'import "testing"',
    'import ("testing"; . "pgsid-check-rust-group-split/checkruntime")',
  ),
)
await run('go', ['test', '.'], {
  cwd: directory + '/go-group-split',
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
  tsGroup.evaluateCheckPublicTableCheckRustBoundDecisionHggxf(
    tsGroup.makeInt4Value(1),
    tsGroup.makeBoolValue(true),
    tsGroup.makeTextValue('abc'),
  ).kind,
  'True',
)
assert.equal(
  tsGroup.evaluateCheckPublicTableCheckRustBoundFlagNullHun52(tsGroup.boolNull()).kind,
  'True',
)
for (const [index, note] of lengthCases.entries())
  assert.equal(
    tsGroup.evaluateCheckPublicTableCheckRustBoundLengthGuardHu3mx(
      note === null ? tsGroup.textNull() : tsGroup.makeTextValue(note),
    ).kind,
    lengthExpected[index] === null ? 'Null' : lengthExpected[index] ? 'True' : 'False',
  )
for (const [index, [amount, flag, note]] of cases.entries()) {
  const integer = amount === null ? tsGroup.int4Null() : tsGroup.makeInt4Value(amount)
  const boolean = flag === null ? tsGroup.boolNull() : tsGroup.makeBoolValue(flag)
  const text = note === null ? tsGroup.textNull() : tsGroup.makeTextValue(note)
  assert.equal(
    tsGroup.evaluateCheckPublicTableCheckRustBoundNegativeFloorHtqx9(integer).kind,
    outcomeName(negativeExpected[index]!),
  )
  assert.equal(
    tsGroup.evaluateCheckPublicTableCheckRustBoundMinimumFloorHea6n(integer).kind,
    outcomeName(minimumExpected[index]!),
  )
  assert.equal(
    tsGroup.evaluateCheckPublicTableCheckRustBoundConditionalCheckHcion(boolean, integer, text)
      .kind,
    outcomeName(conditionalExpected[index]!),
  )
  assert.equal(
    tsGroup.evaluateCheckPublicTableCheckRustBoundPrefixGuardHmvou(text).kind,
    outcomeName(prefixExpected[index]!),
  )
  assert.equal(
    tsGroup.evaluateCheckPublicTableCheckRustBoundNestedCheckHklip(boolean, integer, text).kind,
    outcomeName(nestedExpected[index]!),
  )
}
assert.equal(
  tsGroup.evaluateCheckPublicTableCheckRustBoundPrefixGuardHmvou(tsGroup.textUnknown()).kind,
  'Unknown',
)
assert.deepEqual(
  tsGroup.evaluateCheckPublicTableCheckRustBoundPrefixGuardHmvou({
    kind: 'Error',
    value: { state: 3452591 },
  }),
  {
    kind: 'Error',
    value: { state: 3452591 },
  },
)
assert.equal(
  tsGroup.evaluateCheckPublicTableCheckRustBoundNestedCheckHklip(
    tsGroup.boolUnknown(),
    tsGroup.makeInt4Value(0),
    tsGroup.textNull(),
  ).kind,
  'False',
)
assert.deepEqual(
  tsGroup.evaluateCheckPublicTableCheckRustBoundNestedCheckHklip(
    { kind: 'Error', value: { state: 3452547 } },
    tsGroup.makeInt4Value(0),
    tsGroup.textNull(),
  ),
  { kind: 'Error', value: { state: 3452547 } },
)
assert.equal(
  tsGroup.evaluateCheckPublicTableCheckRustBoundConditionalCheckHcion(
    tsGroup.makeBoolValue(false),
    tsGroup.makeInt4Value(2147483647),
    tsGroup.textNull(),
  ).kind,
  'True',
)
assert.deepEqual(
  tsGroup.evaluateCheckPublicTableCheckRustBoundConditionalCheckHcion(
    tsGroup.makeBoolValue(true),
    tsGroup.makeInt4Value(2147483647),
    tsGroup.textNull(),
  ),
  { kind: 'Error', value: { state: 3452547 } },
)
assert.equal(
  tsGroup.evaluateCheckPublicTableCheckRustBoundConditionalCheckHcion(
    tsGroup.boolUnknown(),
    tsGroup.makeInt4Value(1),
    tsGroup.textNull(),
  ).kind,
  'Unknown',
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
writeCheckRustSources(directory + '/check.rs', source)
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
  `include!("check.rs");` +
    '\n#[test]\nfn bound_check_matches_postgres() {\n' +
    rustChecks.join('\n') +
    '\n}\n',
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
