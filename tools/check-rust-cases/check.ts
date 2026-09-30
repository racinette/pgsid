import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  checkTypescriptArtifacts,
  transpileCheckRustFiles,
} from '../../src/codegen/shared/check-rust-transpile.js'
import { writeCheckRustSources } from '../check-rust/sources.js'

const run = promisify(execFile)
const directory = fileURLToPath(new URL('../../artifacts/check-rust-cases/', import.meta.url))
await rm(directory, { recursive: true, force: true })
await mkdir(directory, { recursive: true })
const definitions = {
  simple_int4:
    'CASE amount WHEN NULL THEN false WHEN 0 THEN flag IS NULL WHEN 1 THEN note IS NULL ELSE amount > 0 END',
  simple_bool: 'CASE flag WHEN true THEN amount > 0 WHEN false THEN note IS NULL END',
  simple_text:
    "CASE note WHEN NULL THEN false WHEN 'a' THEN true WHEN '😀' THEN flag IS NULL ELSE false END",
  simple_once: 'CASE amount + 1 WHEN 0 THEN true WHEN 1 THEN false ELSE flag IS NULL END',
  simple_regex: "CASE amount WHEN 0 THEN note ~ '^a+$' ELSE true END",
  scalar_int4: '(CASE WHEN flag THEN amount + 1 ELSE 0 END) > 0',
  regex_guard: "(CASE WHEN note ~ '^a+$' THEN amount ELSE 0 END) > 0",
  scalar_text: "(CASE WHEN flag THEN note ELSE 'a' END) = 'a'",
  scalar_bool: '(CASE WHEN amount > 0 THEN flag ELSE true END) = true',
  nested: '(CASE amount WHEN 0 THEN (CASE WHEN flag THEN 1 ELSE 0 END) ELSE amount END) > 0',
  scalar_no_else: '(CASE WHEN flag THEN amount END) IS NULL',
  lazy_when: 'CASE amount WHEN 0 THEN true WHEN amount + 1 THEN false ELSE true END',
  guard_error: '(CASE WHEN amount + 1 > 0 THEN note ELSE NULL END) IS NULL',
}
type Name = keyof typeof definitions
type Input =
  | { kind: 'Value'; value: number | boolean | string }
  | { kind: 'Null' }
  | { kind: 'Unknown' }
  | { kind: 'Error'; value: { state: number } }
type Row = { amount: Input; flag: Input; note: Input }
type Outcome =
  { kind: 'True' | 'False' | 'Null' | 'Unknown' } | { kind: 'Error'; value: { state: number } }
const value = (value: number | boolean | string | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const row = (amount: number | null, flag: boolean | null, note: string | null): Row => ({
  amount: value(amount),
  flag: value(flag),
  note: value(note),
})
const fixtures: { name: Name; row: Row; expected: Outcome }[] = []
const pg = await PGlite.create()
let group: ReturnType<typeof prepareCheckRustGroup>
try {
  await pg.exec(
    `CREATE TABLE public.case_checks (amount int4, flag bool, note text COLLATE "C", ${Object.entries(
      definitions,
    )
      .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
      .join(', ')})`,
  )
  const catalog = await snapshotCatalog(pg)
  const table = catalog.tables.find((item) => item.name === 'case_checks')!
  group = prepareCheckRustGroup(
    Object.keys(definitions).map((name) => ({
      expression: lowerTableCheck(
        table,
        table.constraints.find((item) => item.name === name)!,
      )!.expression,
      identity: { schema: 'public', kind: 'table', owner: 'case_checks', constraint: name },
    })),
  )
  for (const [index, check] of group.checks.entries())
    assert.equal(
      check.kind,
      'supported',
      `${Object.keys(definitions)[index]}: ${JSON.stringify(check)}`,
    )
  for (const amount of [-2147483648, -2, -1, 0, 1, 2147483647, null]) {
    for (const flag of [true, false, null]) {
      for (const note of ['a', '😀', null]) {
        const input = row(amount, flag, note)
        for (const [name, sql] of Object.entries(definitions)) {
          let expected: Outcome
          try {
            const result = await pg.query<{ value: boolean | null }>(
              `SELECT (${sql}) AS value FROM (SELECT $1::int4 AS amount, $2::bool AS flag, $3::text COLLATE "C" AS note) AS input`,
              [amount, flag, note],
            )
            expected = {
              kind:
                result.rows[0]!.value === null ? 'Null' : result.rows[0]!.value ? 'True' : 'False',
            }
          } catch (error) {
            assert.ok(error && typeof error === 'object' && 'code' in error)
            assert.equal(error.code, '22003')
            expected = { kind: 'Error', value: { state: Number.parseInt(error.code, 36) } }
          }
          fixtures.push({ name: name as Name, row: input, expected })
        }
      }
    }
  }
} finally {
  await pg.close()
}
const unknown: Input = { kind: 'Unknown' }
const error: Input = { kind: 'Error', value: { state: Number.parseInt('22003', 36) } }
const add = (name: Name, input: Row, expected: Outcome) =>
  fixtures.push({ name, row: input, expected })
add('simple_int4', { ...row(0, null, 'a'), amount: unknown }, { kind: 'Unknown' })
add('simple_int4', { ...row(0, null, 'a'), amount: error }, { kind: 'Error', value: error.value })
add('simple_int4', { ...row(0, null, 'a'), note: error }, { kind: 'True' })
add('simple_regex', { ...row(1, true, 'a'), note: error }, { kind: 'True' })
add('scalar_int4', { ...row(2147483647, false, 'a'), amount: error }, { kind: 'False' })
add('scalar_int4', { ...row(0, true, 'a'), flag: unknown }, { kind: 'Unknown' })
add('scalar_int4', { ...row(0, true, 'a'), flag: error }, { kind: 'Error', value: error.value })
add('scalar_int4', { ...row(0, true, 'a'), amount: unknown }, { kind: 'Unknown' })
add('scalar_text', { ...row(0, false, 'a'), note: unknown }, { kind: 'True' })
add('scalar_text', { ...row(0, true, 'a'), note: error }, { kind: 'Error', value: error.value })
add('scalar_text', { ...row(0, true, 'a'), flag: error }, { kind: 'Error', value: error.value })
add('scalar_bool', { ...row(0, true, 'a'), flag: error }, { kind: 'True' })
add('scalar_bool', { ...row(1, true, 'a'), flag: error }, { kind: 'Error', value: error.value })
add('nested', { ...row(1, true, 'a'), flag: unknown }, { kind: 'True' })
add('scalar_no_else', { ...row(0, false, 'a'), amount: error }, { kind: 'True' })
add('regex_guard', { ...row(1, true, 'a'), note: unknown }, { kind: 'Unknown' })
add('regex_guard', { ...row(1, true, 'a'), note: error }, { kind: 'Error', value: error.value })
assert.ok(group.source && group.evaluatorSource)
const once = group.evaluatorSource
  .split('\n\npub fn ')
  .find((part) => part.includes('_simple_once_'))!
assert.equal((once.match(/sql__pg_catalog__int4pl__[a-z0-9]+\(/gu) ?? []).length, 1)
await writeFile(join(directory, 'evaluators.rs'), group.evaluatorSource)
writeCheckRustSources(join(directory, 'checks.rs'), group.source)
await run('cargo', [
  'run',
  '--quiet',
  '--locked',
  '--manifest-path',
  'tools/check-rust-dialect/Cargo.toml',
  '--',
  join(directory, 'evaluators.rs'),
])
const entries = new Map(
  Object.keys(definitions).map((name, index) => {
    const check = group.checks[index]!
    assert.equal(check.kind, 'supported')
    if (check.kind !== 'supported') throw new Error('Unsupported case')
    return [name, check]
  }),
)
const pascal = (name: string) =>
  name
    .split('_')
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('')
const camel = (name: string) => {
  const result = pascal(name)
  return result[0]!.toLowerCase() + result.slice(1)
}
const inputCode = (input: Input, type: string, target: 'rust' | 'go'): string => {
  const prefix = type === 'pg_catalog.int4' ? 'int4' : type === 'pg_catalog.bool' ? 'bool' : 'text'
  if (target === 'rust') {
    if (input.kind === 'Null' || input.kind === 'Unknown')
      return `${prefix}_${input.kind.toLowerCase()}()`
    if (input.kind === 'Error')
      return `${pascal(prefix)}Value::Error(make_sql_error(${input.value.state}))`
    return `make_${prefix}_value(${JSON.stringify(input.value)})`
  }
  if (input.kind === 'Null' || input.kind === 'Unknown') return `${pascal(prefix)}${input.kind}()`
  if (input.kind === 'Error')
    return `${pascal(prefix)}Value{Kind: ${pascal(prefix)}ValueError, Error: SqlError{State: ${input.value.state}}}`
  return `Make${pascal(prefix)}Value(${JSON.stringify(input.value)})`
}
const rustAssertions: string[] = []
const goAssertions: string[] = []
for (const [index, fixture] of fixtures.entries()) {
  const check = entries.get(fixture.name)!
  const args = (target: 'rust' | 'go') =>
    check.inputs
      .map((input) => inputCode(fixture.row[input.name as keyof Row], input.type, target))
      .join(', ')
  const rustExpected = `CheckOutcome::${fixture.expected.kind}${fixture.expected.kind === 'Error' ? `(make_sql_error(${fixture.expected.value.state}))` : ''}`
  rustAssertions.push(
    `assert!(${check.entryName}(${args('rust')}) == ${rustExpected}, "${fixture.name} ${index}");`,
  )
  const goExpected = `CheckOutcome{Kind: CheckOutcome${fixture.expected.kind}${fixture.expected.kind === 'Error' ? `, Error: SqlError{State: ${fixture.expected.value.state}}` : ''}}`
  goAssertions.push(
    `if actual := ${pascal(check.entryName)}(${args('go')}); actual != (${goExpected}) { t.Fatalf("${fixture.name} ${index}: %+v", actual) }`,
  )
}
await writeFile(
  join(directory, 'checks_test.rs'),
  `include!("checks.rs");\n#[test]\nfn cases_match_postgres() {\n${rustAssertions.join('\n')}\n}\n`,
)
await run('rustc', [
  '--edition',
  '2021',
  '-Awarnings',
  '--test',
  join(directory, 'checks_test.rs'),
  '-o',
  join(directory, 'rust-test'),
])
await run(join(directory, 'rust-test'), [])
const split = transpileCheckRustFiles(group.source, 'case-checks/pg_catalog')
for (const [name, source] of Object.entries(split.go)) {
  if (!source) continue
  const path = join(
    directory,
    'go',
    name === 'checks'
      ? 'checks.go'
      : name === 'runtime'
        ? 'checkruntime/runtime.go'
        : name === 'language'
          ? 'langruntime/runtime.go'
          : name === 'regex'
            ? 'regexengine/regex.go'
            : 'pg_catalog/operations.go',
  )
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, source)
}
await writeFile(join(directory, 'go/go.mod'), 'module case-checks\n\ngo 1.25\n')
await writeFile(
  join(directory, 'go/checks_test.go'),
  `package generated\nimport ("testing"; . "case-checks/checkruntime")\nfunc TestCases(t *testing.T) {\n${goAssertions.join('\n')}\n}\n`,
)
await run('go', ['test', './...'], {
  cwd: join(directory, 'go'),
  env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
})
for (const artifact of checkTypescriptArtifacts(split.typescript)) {
  const path = join(directory, 'typescript', artifact.path)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, artifact.content)
}
await run('node_modules/.bin/tsc', [
  '--strict',
  '--noEmit',
  '--skipLibCheck',
  '--target',
  'es2022',
  '--module',
  'esnext',
  '--moduleResolution',
  'bundler',
  join(directory, 'typescript/checks.ts'),
])
const generated = await import(pathToFileURL(join(directory, 'typescript/checks.ts')).href)
for (const fixture of fixtures) {
  const check = entries.get(fixture.name)!
  const result = generated[camel(check.entryName)](
    ...check.inputs.map((input) => fixture.row[input.name as keyof Row]),
  )
  assert.deepEqual(result, fixture.expected, `${fixture.name}: ${JSON.stringify(fixture.row)}`)
}
process.stdout.write(
  `CASE parity: ${fixtures.length} fixtures passed in Rust, Go, and TypeScript.\n`,
)
