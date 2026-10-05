import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { assembleCheckRust } from '../../src/codegen/shared/check-rust-source.js'
import { writeCheckRustSources } from '../check-rust/sources.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'

type Shape =
  | 'int2_pair_int2'
  | 'int2_single_int2'
  | 'int2_single_int4'
  | 'int2_single_int8'
  | 'int4_single_int2'
  | 'int4_single_int8'
  | 'int8_single_int2'
  | 'int8_single_int4'
  | 'int24_pair_int4'
  | 'int42_pair_int4'
  | 'int8_pair_int8'
  | 'int8_single_int8'
  | 'int82_pair_int8'
  | 'int28_pair_int8'
  | 'int84_pair_int8'
  | 'int48_pair_int8'
  | 'int8_pair_bool'
  | 'int84_pair_bool'
  | 'int48_pair_bool'
  | 'int4_pair_bool'
  | 'int4_pair_int4'
  | 'int4_single_int4'
  | 'bool_pair_bool'
  | 'text_pair_bool'
  | 'text_single_int4'
type State =
  | { kind: 'Value'; value: boolean | number | string }
  | { kind: 'Null' | 'Unknown' }
  | { kind: 'Error'; state: number }
type Expected =
  | { kind: 'Value'; value: boolean | number | string }
  | { kind: 'Null' | 'Unknown' }
  | { kind: 'Error'; state: number }
type Case = { inputs: State[]; expected: Expected }
type Fixture = {
  rustName: string
  wrapper: string
  functionName: string
  shape: Shape
  cases: Case[]
}

const [rustOutput, fixtureOutput, rustTestOutput, goTestOutput] = process.argv.slice(2)
if (!rustOutput || !fixtureOutput || !rustTestOutput || !goTestOutput)
  throw new Error('usage: generate.ts RUST FIXTURES RUST_TEST GO_TEST')

const readSource = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
const boolean = readSource('../../crates/check-evaluator/src/operations/pg_catalog/boolean.rs')
const bigint = readSource('../../crates/check-evaluator/src/operations/pg_catalog/bigint.rs')
const bigintArithmetic = readSource(
  '../../crates/check-evaluator/src/operations/pg_catalog/bigint_arithmetic.rs',
)
const integer = readSource('../../crates/check-evaluator/src/operations/pg_catalog/integer.rs')
const smallint = readSource('../../crates/check-evaluator/src/operations/pg_catalog/smallint.rs')
const integerCast = readSource(
  '../../crates/check-evaluator/src/operations/pg_catalog/integer_cast.rs',
)
const textSource = readSource('../../crates/check-evaluator/src/operations/pg_catalog/text.rs')
const names = [
  ...`${boolean}\n${integer}\n${bigint}\n${bigintArithmetic}\n${integerCast}\n${textSource}`.matchAll(
    /\bfn (sql__[a-z0-9_]+)\s*\(/gu,
  ),
].map((match) => match[1]!)
const catalog = new Map(
  builtinCallables()
    .filter((callable) => 'rustName' in callable)
    .filter((callable) => callable.kind === 'function')
    .map((callable) => [callable.rustName, callable]),
)
for (const match of smallint.matchAll(/\bfn (sql__[a-z0-9_]+)\s*\(/gu)) {
  const name = match[1]!
  const metadata = catalog.get(name)
  if (!metadata) throw new Error(`Rust implementation is absent from catalog: ${name}`)
  if (metadata.result === 'pg_catalog.int2' || metadata.result === 'pg_catalog.int4')
    names.push(name)
}
const shapeOf = (args: readonly string[], result: string): Shape | null => {
  if (result === 'pg_catalog.bool') {
    if (args.join(',') === 'pg_catalog.int8,pg_catalog.int8') return 'int8_pair_bool'
    if (args.join(',') === 'pg_catalog.int8,pg_catalog.int4') return 'int84_pair_bool'
    if (args.join(',') === 'pg_catalog.int4,pg_catalog.int8') return 'int48_pair_bool'
    if (args.join(',') === 'pg_catalog.int4,pg_catalog.int4') return 'int4_pair_bool'
    if (args.join(',') === 'pg_catalog.bool,pg_catalog.bool') return 'bool_pair_bool'
    if (args.join(',') === 'pg_catalog.text,pg_catalog.text') return 'text_pair_bool'
  }
  if (result === 'pg_catalog.int8') {
    if (args.join(',') === 'pg_catalog.int8,pg_catalog.int8') return 'int8_pair_int8'
    if (args.join(',') === 'pg_catalog.int8') return 'int8_single_int8'
    if (args.join(',') === 'pg_catalog.int8,pg_catalog.int2') return 'int82_pair_int8'
    if (args.join(',') === 'pg_catalog.int2,pg_catalog.int8') return 'int28_pair_int8'
    if (args.join(',') === 'pg_catalog.int8,pg_catalog.int4') return 'int84_pair_int8'
    if (args.join(',') === 'pg_catalog.int4,pg_catalog.int8') return 'int48_pair_int8'
  }
  if (result === 'pg_catalog.int4' && args.join(',') === 'pg_catalog.int2')
    return 'int2_single_int4'
  if (result === 'pg_catalog.int8' && args.join(',') === 'pg_catalog.int2')
    return 'int2_single_int8'
  if (result === 'pg_catalog.int2' && args.join(',') === 'pg_catalog.int4')
    return 'int4_single_int2'
  if (result === 'pg_catalog.int8' && args.join(',') === 'pg_catalog.int4')
    return 'int4_single_int8'
  if (result === 'pg_catalog.int2' && args.join(',') === 'pg_catalog.int8')
    return 'int8_single_int2'
  if (result === 'pg_catalog.int4' && args.join(',') === 'pg_catalog.int8')
    return 'int8_single_int4'
  if (result === 'pg_catalog.int2' && args.join(',') === 'pg_catalog.int2,pg_catalog.int2')
    return 'int2_pair_int2'
  if (result === 'pg_catalog.int2' && args.join(',') === 'pg_catalog.int2')
    return 'int2_single_int2'
  if (result === 'pg_catalog.int4' && args.join(',') === 'pg_catalog.int2,pg_catalog.int4')
    return 'int24_pair_int4'
  if (result === 'pg_catalog.int4' && args.join(',') === 'pg_catalog.int4,pg_catalog.int2')
    return 'int42_pair_int4'
  if (result === 'pg_catalog.int4' && args.join(',') === 'pg_catalog.int4,pg_catalog.int4')
    return 'int4_pair_int4'
  if (result === 'pg_catalog.int4' && args.join(',') === 'pg_catalog.int4')
    return 'int4_single_int4'
  if (result === 'pg_catalog.int4' && args.join(',') === 'pg_catalog.text')
    return 'text_single_int4'
  return null
}
const functions = names.map((name) => {
  const metadata = catalog.get(name)
  if (!metadata) throw new Error(`Rust implementation is absent from catalog: ${name}`)
  const shape = shapeOf(metadata.args, metadata.result)
  if (
    !shape ||
    metadata.schema !== 'pg_catalog' ||
    !/^[a-z][a-z0-9_]*$/u.test(metadata.name) ||
    !metadata.strict ||
    metadata.volatility !== 'i' ||
    metadata.returnsSet
  )
    throw new Error(`Operation parity harness does not support ${name}`)
  return { rustName: name, functionName: metadata.name, shape }
})

const int4Samples: readonly (readonly [number | null, number | null])[] = [
  [-2147483648, 2147483647],
  [-1, 0],
  [0, -1],
  [0, 0],
  [1, 0],
  [2147483647, -2147483648],
  [null, 0],
  [0, null],
]
const int4ArithmeticSamples: readonly (readonly [number | null, number | null])[] = [
  [-7, 3],
  [7, -3],
  [-7, -3],
  [-2147483648, 1],
  [2147483647, 2],
  [-2147483648, 2],
  [46340, 46340],
  [46341, 46341],
  [-46340, -46340],
  [-46341, -46341],
  [46341, -46341],
  [-46341, 46341],
  [-2147483648, -1],
  [-2147483648, 0],
  [-2147483647, -1],
  [-1, -2147483648],
  [-1, 0],
  [0, -1],
  [0, 0],
  [0, 2147483647],
  [1, 2147483647],
  [2147483646, 1],
  [2147483647, 1],
  [2147483647, -2147483648],
  [null, 0],
  [0, null],
]
const int2ArithmeticValues = [
  -32768,
  -32767,
  -182,
  -181,
  -7,
  -3,
  -1,
  0,
  1,
  3,
  7,
  181,
  182,
  32766,
  32767,
  null,
]
const int2ArithmeticSamples = int2ArithmeticValues.flatMap((left) =>
  int2ArithmeticValues.map((right) => [left, right]),
)
const mixedInt4Values = [
  -2147483648,
  -2147483647,
  -65537,
  -65536,
  -1,
  0,
  1,
  3,
  65536,
  65537,
  2147483646,
  2147483647,
  null,
]
const int24ArithmeticSamples = int2ArithmeticValues.flatMap((left) =>
  mixedInt4Values.map((right) => [left, right]),
)
const boolSamples: readonly (readonly [boolean | null, boolean | null])[] = [
  [false, false],
  [false, true],
  [true, false],
  [true, true],
  [null, false],
  [true, null],
  [null, null],
]
const textSamples: readonly (readonly [string | null, string | null])[] = [
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
const textSingleSamples: readonly (readonly [string | null])[] = [
  [''],
  ['a'],
  ['abc'],
  ['é'],
  ['😀'],
  ['a\u0301'],
  [null],
]
const int8Values = [
  '-9223372036854775808',
  '-9007199254740993',
  '-2147483649',
  '-1',
  '0',
  '1',
  '2147483648',
  '9007199254740992',
  '9007199254740993',
  '9223372036854775807',
  null,
] as const
const int8Samples = int8Values.flatMap((left) => int8Values.map((right) => [left, right]))
const mixedSamples = int8Values.flatMap((left) =>
  [-2147483648, -1, 0, 1, 2147483647, null].map((right) => [left, right]),
)
const int8CastValues = [
  '-9223372036854775808',
  '-9007199254740993',
  '-4294967296',
  '-2147483649',
  '-2147483648',
  '-2147483647',
  '-32769',
  '-32768',
  '-32767',
  '-1',
  '0',
  '1',
  '32766',
  '32767',
  '32768',
  '2147483646',
  '2147483647',
  '2147483648',
  '4294967295',
  '4294967296',
  '9007199254740993',
  '9223372036854775807',
  null,
] as const
const int8ArithmeticValues = [
  '-9223372036854775808',
  '-9223372036854775807',
  '-9223372036854775806',
  '-9223372036854743040',
  '-9223372034707292160',
  '-9007199254740993',
  '-3037000500',
  '-3037000499',
  '-2147483648',
  '-32768',
  '-7',
  '-3',
  '-2',
  '-1',
  '0',
  '1',
  '2',
  '3',
  '7',
  '32767',
  '2147483647',
  '3037000499',
  '3037000500',
  '9007199254740993',
  '9223372034707292160',
  '9223372036854743040',
  '9223372036854775806',
  '9223372036854775807',
  null,
] as const
const int8ArithmeticSamples = int8ArithmeticValues.flatMap((left) =>
  int8ArithmeticValues.map((right) => [left, right]),
)
const int82ArithmeticSamples = int8ArithmeticValues.flatMap((left) =>
  [-32768, -1, 0, 1, 32767, null].map((right) => [left, right]),
)
const int84ArithmeticSamples = int8ArithmeticValues.flatMap((left) =>
  [-2147483648, -1, 0, 1, 2147483647, null].map((right) => [left, right]),
)
const int4CastValues = [
  -2147483648,
  -32769,
  -32768,
  -32767,
  -1,
  0,
  1,
  32766,
  32767,
  32768,
  2147483647,
  null,
]
const samplesOf = (shape: Shape): readonly (readonly (boolean | number | string | null)[])[] =>
  shape === 'int8_pair_int8'
    ? int8ArithmeticSamples
    : shape === 'int8_single_int8'
      ? int8ArithmeticValues.map((value) => [value])
      : shape === 'int82_pair_int8'
        ? int82ArithmeticSamples
        : shape === 'int28_pair_int8'
          ? int82ArithmeticSamples.map(([left, right]) => [right!, left!])
          : shape === 'int84_pair_int8'
            ? int84ArithmeticSamples
            : shape === 'int48_pair_int8'
              ? int84ArithmeticSamples.map(([left, right]) => [right!, left!])
              : shape.startsWith('int8_single_')
                ? int8CastValues.map((value) => [value])
                : shape === 'int4_single_int2' || shape === 'int4_single_int8'
                  ? int4CastValues.map((value) => [value])
                  : shape === 'int24_pair_int4'
                    ? int24ArithmeticSamples
                    : shape === 'int42_pair_int4'
                      ? int24ArithmeticSamples.map(([left, right]) => [right!, left!])
                      : shape === 'int2_pair_int2'
                        ? int2ArithmeticSamples
                        : shape.startsWith('int2_single_')
                          ? int2ArithmeticValues.map((value) => [value])
                          : shape === 'int8_pair_bool'
                            ? int8Samples
                            : shape === 'int84_pair_bool'
                              ? mixedSamples
                              : shape === 'int48_pair_bool'
                                ? mixedSamples.map((sample) => [sample[1]!, sample[0]!])
                                : shape === 'int4_pair_bool'
                                  ? int4Samples
                                  : shape === 'int4_pair_int4'
                                    ? int4ArithmeticSamples
                                    : shape === 'int4_single_int4'
                                      ? [-2147483648, -2147483647, -1, 0, 1, 2147483647, null].map(
                                          (value) => [value],
                                        )
                                      : shape === 'bool_pair_bool'
                                        ? boolSamples
                                        : shape === 'text_pair_bool'
                                          ? textSamples
                                          : textSingleSamples
const inputType = (
  shape: Shape,
  index = 0,
): 'Int2Value' | 'Int4Value' | 'Int8Value' | 'BoolValue' | 'TextValue' =>
  shape === 'int2_pair_int2' ||
  shape.startsWith('int2_single_') ||
  (shape === 'int24_pair_int4' && index === 0) ||
  (shape === 'int42_pair_int4' && index === 1) ||
  (shape === 'int28_pair_int8' && index === 0) ||
  (shape === 'int82_pair_int8' && index === 1)
    ? 'Int2Value'
    : shape === 'int8_pair_bool' ||
        shape === 'int8_pair_int8' ||
        (shape === 'int28_pair_int8' && index === 1) ||
        (shape === 'int82_pair_int8' && index === 0) ||
        shape.startsWith('int8_single_') ||
        ((shape === 'int84_pair_bool' || shape === 'int84_pair_int8') && index === 0) ||
        ((shape === 'int48_pair_bool' || shape === 'int48_pair_int8') && index === 1)
      ? 'Int8Value'
      : [
            'int24_pair_int4',
            'int42_pair_int4',
            'int4_pair_bool',
            'int4_pair_int4',
            'int4_single_int4',
            'int4_single_int2',
            'int4_single_int8',
            'int84_pair_int8',
            'int48_pair_int8',
            'int84_pair_bool',
            'int48_pair_bool',
          ].includes(shape)
        ? 'Int4Value'
        : shape === 'bool_pair_bool'
          ? 'BoolValue'
          : 'TextValue'
const resultType = (shape: Shape): 'BoolValue' | 'Int2Value' | 'Int4Value' | 'Int8Value' =>
  shape.endsWith('_int8')
    ? 'Int8Value'
    : shape.endsWith('_int2')
      ? 'Int2Value'
      : shape.endsWith('_int4')
        ? 'Int4Value'
        : 'BoolValue'
const inputCount = (shape: Shape): number => (shape.includes('_single_') ? 1 : 2)
const queryOf = (shape: Shape, functionName: string): string => {
  const args = Array.from({ length: inputCount(shape) }, (_, index) => {
    const type = inputType(shape, index)
    return type === 'Int8Value'
      ? `$${index + 1}::int8`
      : type === 'Int2Value'
        ? `$${index + 1}::int2`
        : type === 'Int4Value'
          ? `$${index + 1}::int4`
          : type === 'BoolValue'
            ? `$${index + 1}::bool`
            : `($${index + 1}::text) COLLATE "C"`
  })
  return `SELECT pg_catalog.${functionName}(${args.join(', ')}) AS value`
}
const state = (input: boolean | number | string | null): State =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }

const pg = await PGlite.create()
let fixtures: Fixture[]
try {
  fixtures = []
  for (const [index, fn] of functions.entries()) {
    const cases: Case[] = []
    for (const sample of samplesOf(fn.shape)) {
      let expected: Expected
      try {
        const result = await pg.query<{ value: boolean | number | string | null }>(
          queryOf(fn.shape, fn.functionName),
          [...sample],
        )
        const observed = result.rows[0]!.value
        expected =
          observed === null
            ? { kind: 'Null' }
            : {
                kind: 'Value',
                value: resultType(fn.shape) === 'Int8Value' ? String(observed) : observed,
              }
      } catch (error) {
        const sqlstate = (error as { code?: unknown }).code
        if (sqlstate !== '22003' && sqlstate !== '22012') throw error
        expected = { kind: 'Error', state: Number.parseInt(sqlstate, 36) }
      }
      cases.push({ inputs: sample.map(state), expected })
    }
    const ordinary = (index: number) =>
      state(
        inputType(fn.shape, index) === 'Int8Value'
          ? '0'
          : ['Int2Value', 'Int4Value'].includes(inputType(fn.shape, index))
            ? 0
            : fn.shape === 'bool_pair_bool'
              ? false
              : 'a',
      )
    const error = { kind: 'Error', state: 3452591 } as const
    for (let position = 0; position < inputCount(fn.shape); position++) {
      const inputs = Array.from({ length: inputCount(fn.shape) }, (_, index) => ordinary(index))
      cases.push({
        inputs: inputs.map((input, index) => (index === position ? { kind: 'Unknown' } : input)),
        expected: { kind: 'Unknown' },
      })
      cases.push({
        inputs: inputs.map((input, index) => (index === position ? error : input)),
        expected: error,
      })
    }
    if (inputCount(fn.shape) === 2)
      cases.push(
        { inputs: [{ kind: 'Unknown' }, { kind: 'Null' }], expected: { kind: 'Unknown' } },
        { inputs: [{ kind: 'Null' }, { kind: 'Unknown' }], expected: { kind: 'Unknown' } },
        { inputs: [error, { kind: 'Null' }], expected: error },
        { inputs: [error, { kind: 'Unknown' }], expected: error },
      )
    fixtures.push({ ...fn, wrapper: `evaluate_callable_${index}`, cases })
  }
} finally {
  await pg.close()
}

const wrappers = fixtures
  .map((item) => {
    const parameters = Array.from(
      { length: inputCount(item.shape) },
      (_, index) => `input_${index}: ${inputType(item.shape, index)}`,
    )
    const arguments_ = Array.from(
      { length: inputCount(item.shape) },
      (_, index) => `input_${index}`,
    )
    return `pub fn ${item.wrapper}(${parameters.join(', ')}) -> ${resultType(item.shape)} {\n    ${item.rustName}(${arguments_.join(', ')})\n}`
  })
  .join('\n\n')
writeCheckRustSources(rustOutput, assembleCheckRust({ source: wrappers, callables: names }))
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
const rustInput = (shape: Shape, input: State, index: number): string => {
  const type = inputType(shape, index)
  if (input.kind === 'Value')
    return type === 'Int8Value'
      ? `make_int8_value(${input.value}i64)`
      : type === 'Int2Value'
        ? `make_int2_value(${input.value})`
        : type === 'Int4Value'
          ? `make_int4_value(${input.value})`
          : type === 'BoolValue'
            ? `make_bool_value(${input.value})`
            : `make_text_value(${rustString(String(input.value))})`
  if (input.kind === 'Error') return `${type}::Error(make_sql_error(${input.state}))`
  return `${type}::${input.kind}`
}
const rustExpected = (shape: Shape, expected: Expected): string => {
  const type = resultType(shape)
  if (expected.kind === 'Value')
    return `${type}::Value(${expected.value}${type === 'Int8Value' ? 'i64' : ''})`
  if (expected.kind === 'Error') return `${type}::Error(make_sql_error(${expected.state}))`
  return `${type}::${expected.kind}`
}
writeFileSync(
  rustTestOutput,
  `extern crate check_operations;\nuse check_operations::*;\n\n#[test]\nfn matches_postgres() {\n${fixtures
    .flatMap((item) =>
      item.cases.map(
        (test) =>
          `    assert!(${item.wrapper}(${test.inputs.map((input, index) => rustInput(item.shape, input, index)).join(', ')}) == ${rustExpected(item.shape, test.expected)});`,
      ),
    )
    .join('\n')}\n}\n`,
)

const goTarget = (wrapper: string): string =>
  wrapper
    .replace(/^evaluate/u, 'Evaluate')
    .replace(/_([a-z0-9])/gu, (_, part: string) => part.toUpperCase())
const goInput = (shape: Shape, input: State, index: number): string => {
  const type = inputType(shape, index)
  if (input.kind === 'Value')
    return type === 'Int8Value'
      ? `MakeInt8Value(${input.value})`
      : type === 'Int2Value'
        ? `MakeInt2Value(${input.value})`
        : type === 'Int4Value'
          ? `MakeInt4Value(${input.value})`
          : type === 'BoolValue'
            ? `MakeBoolValue(${input.value})`
            : `MakeTextValue(${goString(String(input.value))})`
  if (input.kind === 'Error')
    return `${type}{Kind: ${type}Error, Error: SqlError{State: ${input.state}}}`
  return `${type}{Kind: ${type}${input.kind}}`
}
const goExpected = (shape: Shape, expected: Expected): string => {
  const type = resultType(shape)
  if (expected.kind === 'Value') return `${type}{Kind: ${type}Value, Value: ${expected.value}}`
  if (expected.kind === 'Error')
    return `${type}{Kind: ${type}Error, Error: SqlError{State: ${expected.state}}}`
  return `${type}{Kind: ${type}${expected.kind}}`
}
writeFileSync(
  goTestOutput,
  `package generated\n\nimport "testing"\n\nfunc TestOperationsAgainstPostgres(t *testing.T) {\n${fixtures
    .flatMap((item) =>
      item.cases.map(
        (test) =>
          `    if actual := ${goTarget(item.wrapper)}(${test.inputs.map((input, index) => goInput(item.shape, input, index)).join(', ')}); actual != (${goExpected(item.shape, test.expected)}) { t.Errorf("${item.functionName}: got %+v", actual) }`,
      ),
    )
    .join('\n')}\n}\n`,
)
const counted = (shape: Shape): number => fixtures.filter((item) => item.shape === shape).length
console.log(
  `checked ${counted('int2_single_int4') + counted('int2_single_int8') + counted('int4_single_int2') + counted('int4_single_int8') + counted('int8_single_int2') + counted('int8_single_int4')} Rust integer casts, ${counted('int8_pair_int8') + counted('int8_single_int8') + counted('int82_pair_int8') + counted('int28_pair_int8') + counted('int84_pair_int8') + counted('int48_pair_int8')} Rust bigint arithmetic functions, ${counted('int24_pair_int4') + counted('int42_pair_int4')} Rust mixed int2/int4 arithmetic functions, ${counted('int2_pair_int2') + counted('int2_single_int2')} Rust smallint arithmetic functions, ${counted('int8_pair_bool') + counted('int84_pair_bool') + counted('int48_pair_bool')} Rust int8/mixed comparisons, ${counted('int4_pair_bool')} Rust int4 comparisons, ${counted('int4_pair_int4') + counted('int4_single_int4')} Rust int4 arithmetic functions, ${counted('bool_pair_bool')} Rust boolean comparisons, ${counted('text_pair_bool')} Rust text boolean functions, and ${counted('text_single_int4')} Rust text-to-int4 functions against PGlite`,
)
