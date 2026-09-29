import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'

type State =
  { kind: 'Value'; value: number } | { kind: 'Null' | 'Unknown' } | { kind: 'Error'; state: number }
type Expected =
  | { kind: 'Value'; value: boolean }
  | { kind: 'Null' | 'Unknown' }
  | { kind: 'Error'; state: number }
type Case = { left: State; right: State; expected: Expected }
type Fixture = { rustName: string; wrapper: string; functionName: string; cases: Case[] }

const [rustOutput, fixtureOutput, rustTestOutput, goTestOutput] = process.argv.slice(2)
if (!rustOutput || !fixtureOutput || !rustTestOutput || !goTestOutput)
  throw new Error('usage: generate.ts RUST FIXTURES RUST_TEST GO_TEST')

const values = readFileSync(
  fileURLToPath(new URL('../../crates/check-evaluator/src/values.rs', import.meta.url)),
  'utf8',
)
const integer = readFileSync(
  fileURLToPath(new URL('../../crates/check-evaluator/src/operations/integer.rs', import.meta.url)),
  'utf8',
)
const names = [...integer.matchAll(/\bfn (sql__[a-z0-9_]+)\s*\(/gu)].map((match) => match[1]!)
const catalog = new Map(
  builtinCallables()
    .filter((callable) => callable.kind === 'function')
    .map((callable) => [callable.rustName, callable]),
)
const functions = names.map((name) => {
  const metadata = catalog.get(name)
  if (!metadata) throw new Error(`Rust implementation is absent from catalog: ${name}`)
  if (
    metadata.schema !== 'pg_catalog' ||
    !/^[a-z][a-z0-9_]*$/u.test(metadata.name) ||
    metadata.args.join(',') !== 'pg_catalog.int4,pg_catalog.int4' ||
    metadata.result !== 'pg_catalog.bool' ||
    !metadata.strict ||
    metadata.volatility !== 'i' ||
    metadata.returnsSet
  )
    throw new Error(`Operation parity harness does not support ${name}`)
  return { rustName: name, functionName: metadata.name }
})

const samples: readonly [number | null, number | null][] = [
  [-2147483648, 2147483647],
  [-1, 0],
  [0, -1],
  [0, 0],
  [1, 0],
  [2147483647, -2147483648],
  [null, 0],
  [0, null],
]
const value = (input: number | null): State =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }

const pg = await PGlite.create()
let fixtures: Fixture[]
try {
  fixtures = []
  for (const [index, fn] of functions.entries()) {
    const cases: Case[] = []
    for (const [left, right] of samples) {
      const result = await pg.query<{ value: boolean | null }>(
        `SELECT pg_catalog.${fn.functionName}($1::int4, $2::int4) AS value`,
        [left, right],
      )
      const observed = result.rows[0]!.value
      cases.push({
        left: value(left),
        right: value(right),
        expected: observed === null ? { kind: 'Null' } : { kind: 'Value', value: observed },
      })
    }
    cases.push(
      { left: { kind: 'Unknown' }, right: value(0), expected: { kind: 'Unknown' } },
      { left: value(0), right: { kind: 'Unknown' }, expected: { kind: 'Unknown' } },
      {
        left: { kind: 'Error', state: 3452591 },
        right: value(0),
        expected: { kind: 'Error', state: 3452591 },
      },
    )
    fixtures.push({ ...fn, wrapper: `evaluate_callable_${index}`, cases })
  }
} finally {
  await pg.close()
}

const wrappers = fixtures
  .map(
    (item) =>
      `pub fn ${item.wrapper}(left: Int4Value, right: Int4Value) -> BoolValue {\n    ${item.rustName}(left, right)\n}`,
  )
  .join('\n\n')
writeFileSync(rustOutput, `${values}\n${integer}\n${wrappers}\n`)
writeFileSync(fixtureOutput, JSON.stringify(fixtures, null, 2) + '\n')

const rustValue = (state: State): string => {
  if (state.kind === 'Value') return `make_int4_value(${state.value})`
  if (state.kind === 'Error') return `Int4Value::Error(make_sql_error(${state.state}))`
  return `Int4Value::${state.kind}`
}
const rustExpected = (state: Expected): string => {
  if (state.kind === 'Value') return `BoolValue::Value(${state.value})`
  if (state.kind === 'Error') return `BoolValue::Error(make_sql_error(${state.state}))`
  return `BoolValue::${state.kind}`
}
writeFileSync(
  rustTestOutput,
  `extern crate check_operations;\nuse check_operations::*;\n\n#[test]\nfn matches_postgres() {\n${fixtures
    .flatMap((item) =>
      item.cases.map(
        (test) =>
          `    assert!(${item.wrapper}(${rustValue(test.left)}, ${rustValue(test.right)}) == ${rustExpected(test.expected)});`,
      ),
    )
    .join('\n')}\n}\n`,
)

const goValue = (state: State): string => {
  if (state.kind === 'Value') return `MakeInt4Value(${state.value})`
  if (state.kind === 'Error')
    return `Int4Value{Kind: Int4ValueError, Error: SqlError{State: ${state.state}}}`
  return `Int4Value{Kind: Int4Value${state.kind}}`
}
const goExpected = (state: Expected): string => {
  if (state.kind === 'Value') return `BoolValue{Kind: BoolValueValue, Value: ${state.value}}`
  if (state.kind === 'Error')
    return `BoolValue{Kind: BoolValueError, Error: SqlError{State: ${state.state}}}`
  return `BoolValue{Kind: BoolValue${state.kind}}`
}
writeFileSync(
  goTestOutput,
  `package generated\n\nimport "testing"\n\nfunc TestOperationsAgainstPostgres(t *testing.T) {\n${fixtures
    .flatMap((item) =>
      item.cases.map(
        (test) =>
          `    if actual := ${item.wrapper.replace(/^evaluate/u, 'Evaluate').replace(/_([a-z0-9])/gu, (_, part: string) => part.toUpperCase())}(${goValue(test.left)}, ${goValue(test.right)}); actual != (${goExpected(test.expected)}) { t.Errorf("${item.functionName}: got %+v", actual) }`,
      ),
    )
    .join('\n')}\n}\n`,
)
console.log(`checked ${fixtures.length} Rust int4 comparison implementations against PGlite`)
