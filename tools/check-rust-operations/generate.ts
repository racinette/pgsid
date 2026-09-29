import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'

type Operand = 'int4' | 'text'
type State =
  | { kind: 'Value'; value: number | string }
  | { kind: 'Null' | 'Unknown' }
  | { kind: 'Error'; state: number }
type Expected =
  | { kind: 'Value'; value: boolean }
  | { kind: 'Null' | 'Unknown' }
  | { kind: 'Error'; state: number }
type Case = { left: State; right: State; expected: Expected }
type Fixture = {
  rustName: string
  wrapper: string
  functionName: string
  operand: Operand
  cases: Case[]
}

const [rustOutput, fixtureOutput, rustTestOutput, goTestOutput] = process.argv.slice(2)
if (!rustOutput || !fixtureOutput || !rustTestOutput || !goTestOutput)
  throw new Error('usage: generate.ts RUST FIXTURES RUST_TEST GO_TEST')

const readSource = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
const values = readSource('../../crates/check-evaluator/src/values.rs')
const integer = readSource('../../crates/check-evaluator/src/operations/integer.rs')
const text = readSource('../../crates/check-evaluator/src/operations/text.rs')
const names = [...`${integer}\n${text}`.matchAll(/\bfn (sql__[a-z0-9_]+)\s*\(/gu)].map(
  (match) => match[1]!,
)
const catalog = new Map(
  builtinCallables()
    .filter((callable) => callable.kind === 'function')
    .map((callable) => [callable.rustName, callable]),
)
const operandOf = (args: readonly string[], result: string): Operand | null => {
  if (result !== 'pg_catalog.bool') return null
  if (args.join(',') === 'pg_catalog.int4,pg_catalog.int4') return 'int4'
  if (args.join(',') === 'pg_catalog.text,pg_catalog.text') return 'text'
  return null
}
const functions = names.map((name) => {
  const metadata = catalog.get(name)
  if (!metadata) throw new Error(`Rust implementation is absent from catalog: ${name}`)
  const operand = operandOf(metadata.args, metadata.result)
  if (
    !operand ||
    metadata.schema !== 'pg_catalog' ||
    !/^[a-z][a-z0-9_]*$/u.test(metadata.name) ||
    !metadata.strict ||
    metadata.volatility !== 'i' ||
    metadata.returnsSet
  )
    throw new Error(`Operation parity harness does not support ${name}`)
  return { rustName: name, functionName: metadata.name, operand }
})

const int4Samples: readonly [number | null, number | null][] = [
  [-2147483648, 2147483647],
  [-1, 0],
  [0, -1],
  [0, 0],
  [1, 0],
  [2147483647, -2147483648],
  [null, 0],
  [0, null],
]
const textSamples: readonly [string | null, string | null][] = [
  ['', ''],
  ['', 'a'],
  ['a', ''],
  ['a', 'a'],
  ['a', 'b'],
  ['b', 'a'],
  ['a', 'ab'],
  ['ab', 'a'],
  ['b', 'az'],
  ['B', 'a'],
  ['a', 'B'],
  ['é', 'e'],
  ['é', 'z'],
  ['z', 'é'],
  ['é', 'é'],
  ['\u007f', '\u0080'],
  ['abc', 'abd'],
  ['😀', '😁'],
  ['😁', '😀'],
  ['a', '😀'],
  ['a\u0301', 'á'],
  [null, 'a'],
  ['a', null],
  [null, null],
]
const value = (input: number | string | null): State =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }
const samplesOf = (
  operand: Operand,
): readonly [number | string | null, number | string | null][] =>
  operand === 'int4' ? int4Samples : textSamples
const queryOf = (operand: Operand, functionName: string): string =>
  operand === 'int4'
    ? `SELECT pg_catalog.${functionName}($1::int4, $2::int4) AS value`
    : `SELECT pg_catalog.${functionName}(($1::text) COLLATE "C", ($2::text) COLLATE "C") AS value`

const pg = await PGlite.create()
let fixtures: Fixture[]
try {
  fixtures = []
  for (const [index, fn] of functions.entries()) {
    const cases: Case[] = []
    for (const [left, right] of samplesOf(fn.operand)) {
      const result = await pg.query<{ value: boolean | null }>(
        queryOf(fn.operand, fn.functionName),
        [left, right],
      )
      const observed = result.rows[0]!.value
      cases.push({
        left: value(left),
        right: value(right),
        expected: observed === null ? { kind: 'Null' } : { kind: 'Value', value: observed },
      })
    }
    const ordinary = value(fn.operand === 'int4' ? 0 : 'a')
    const error = { kind: 'Error', state: 3452591 } as const
    cases.push(
      { left: { kind: 'Unknown' }, right: ordinary, expected: { kind: 'Unknown' } },
      { left: ordinary, right: { kind: 'Unknown' }, expected: { kind: 'Unknown' } },
      { left: { kind: 'Unknown' }, right: { kind: 'Null' }, expected: { kind: 'Unknown' } },
      { left: { kind: 'Null' }, right: { kind: 'Unknown' }, expected: { kind: 'Unknown' } },
      { left: error, right: ordinary, expected: error },
      { left: ordinary, right: error, expected: error },
      { left: error, right: { kind: 'Null' }, expected: error },
      { left: error, right: { kind: 'Unknown' }, expected: error },
    )
    fixtures.push({ ...fn, wrapper: `evaluate_callable_${index}`, cases })
  }
} finally {
  await pg.close()
}

const rustType = (operand: Operand): string => (operand === 'int4' ? 'Int4Value' : 'TextValue')
const wrappers = fixtures
  .map(
    (item) =>
      `pub fn ${item.wrapper}(left: ${rustType(item.operand)}, right: ${rustType(item.operand)}) -> BoolValue {\n    ${item.rustName}(left, right)\n}`,
  )
  .join('\n\n')
writeFileSync(rustOutput, `${values}\n${integer}\n${text}\n${wrappers}\n`)
writeFileSync(fixtureOutput, JSON.stringify(fixtures, null, 2) + '\n')

const rustString = (input: string): string => {
  let encoded = '"'
  for (const character of input) {
    const code = character.codePointAt(0)!
    if (character === '\\' || character === '"') encoded += `\\${character}`
    else if (code === 0x0a) encoded += '\\n'
    else if (code === 0x0d) encoded += '\\r'
    else if (code === 0x09) encoded += '\\t'
    else if (code < 0x20 || code === 0x7f || code > 0x7e) encoded += `\\u{${code.toString(16)}}`
    else encoded += character
  }
  return `${encoded}"`
}
const goString = (input: string): string => {
  let encoded = '"'
  for (const character of input) {
    const code = character.codePointAt(0)!
    if (character === '\\' || character === '"') encoded += `\\${character}`
    else if (code === 0x0a) encoded += '\\n'
    else if (code === 0x0d) encoded += '\\r'
    else if (code === 0x09) encoded += '\\t'
    else if (code < 0x20 || code === 0x7f || code > 0x7e)
      encoded +=
        code <= 0xffff
          ? `\\u${code.toString(16).padStart(4, '0')}`
          : `\\U${code.toString(16).padStart(8, '0')}`
    else encoded += character
  }
  return `${encoded}"`
}
const rustValue = (operand: Operand, state: State): string => {
  if (state.kind === 'Value') {
    return operand === 'int4'
      ? `make_int4_value(${state.value})`
      : `make_text_value(${rustString(String(state.value))})`
  }
  if (state.kind === 'Error') return `${rustType(operand)}::Error(make_sql_error(${state.state}))`
  return `${rustType(operand)}::${state.kind}`
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
          `    assert!(${item.wrapper}(${rustValue(item.operand, test.left)}, ${rustValue(item.operand, test.right)}) == ${rustExpected(test.expected)});`,
      ),
    )
    .join('\n')}\n}\n`,
)

const goTarget = (wrapper: string): string =>
  wrapper
    .replace(/^evaluate/u, 'Evaluate')
    .replace(/_([a-z0-9])/gu, (_, part: string) => part.toUpperCase())
const goValue = (operand: Operand, state: State): string => {
  const type = rustType(operand)
  if (state.kind === 'Value') {
    return operand === 'int4'
      ? `MakeInt4Value(${state.value})`
      : `MakeTextValue(${goString(String(state.value))})`
  }
  if (state.kind === 'Error')
    return `${type}{Kind: ${type}Error, Error: SqlError{State: ${state.state}}}`
  return `${type}{Kind: ${type}${state.kind}}`
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
          `    if actual := ${goTarget(item.wrapper)}(${goValue(item.operand, test.left)}, ${goValue(item.operand, test.right)}); actual != (${goExpected(test.expected)}) { t.Errorf("${item.functionName}: got %+v", actual) }`,
      ),
    )
    .join('\n')}\n}\n`,
)
const counted = (operand: Operand): number =>
  fixtures.filter((item) => item.operand === operand).length
console.log(
  `checked ${counted('int4')} Rust int4 comparison implementations and ${counted('text')} Rust text comparison implementations against PGlite`,
)
