import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [generatedPath, fixturePath] = process.argv.slice(2)
if (!generatedPath || !fixturePath) throw new Error('usage: check.ts GENERATED_TS FIXTURES_JSON')
const generated = await import(pathToFileURL(generatedPath).href)
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
  | 'int8_pair_bool'
  | 'int84_pair_bool'
  | 'int48_pair_bool'
  | 'int4_pair_bool'
  | 'int4_pair_int4'
  | 'int4_single_int4'
  | 'bool_pair_bool'
  | 'text_pair_bool'
  | 'text_single_int4'
type State = { kind: string; value?: boolean | number | string; state?: number }
const fixtures = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
  wrapper: string
  functionName: string
  shape: Shape
  cases: { inputs: State[]; expected: State }[]
}[]
const input = (shape: Shape, state: State, index: number): unknown => {
  if (state.kind === 'Value')
    return shape === 'int2_pair_int2' ||
      shape.startsWith('int2_single_') ||
      (shape === 'int24_pair_int4' && index === 0) ||
      (shape === 'int42_pair_int4' && index === 1)
      ? generated.makeInt2Value(state.value)
      : shape === 'int8_pair_bool' ||
          shape.startsWith('int8_single_') ||
          (shape === 'int84_pair_bool' && index === 0) ||
          (shape === 'int48_pair_bool' && index === 1)
        ? generated.makeInt8Value(BigInt(state.value as string))
        : [
              'int24_pair_int4',
              'int42_pair_int4',
              'int4_pair_bool',
              'int4_pair_int4',
              'int4_single_int4',
              'int4_single_int2',
              'int4_single_int8',
              'int84_pair_bool',
              'int48_pair_bool',
            ].includes(shape)
          ? generated.makeInt4Value(state.value)
          : shape === 'bool_pair_bool'
            ? generated.makeBoolValue(state.value)
            : generated.makeTextValue(state.value)
  if (state.kind === 'Error') return { kind: 'Error', value: { state: state.state } }
  return { kind: state.kind }
}
const expected = (shape: Shape, state: State): unknown => {
  if (state.kind === 'Value')
    return { kind: 'Value', value: shape.endsWith('_int8') ? BigInt(state.value!) : state.value }
  if (state.kind === 'Error') return { kind: 'Error', value: { state: state.state } }
  return { kind: state.kind }
}
for (const fixture of fixtures) {
  const targetName = fixture.wrapper
    .split('_')
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
    .join('')
  for (const test of fixture.cases)
    assert.deepEqual(
      generated[targetName](
        ...test.inputs.map((state, index) => input(fixture.shape, state, index)),
      ),
      expected(fixture.shape, test.expected),
      fixture.functionName,
    )
}
