import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [generatedPath, fixturePath] = process.argv.slice(2)
if (!generatedPath || !fixturePath) throw new Error('usage: check.ts GENERATED_TS FIXTURES_JSON')
const generated = await import(pathToFileURL(generatedPath).href)
const fixtures = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
  wrapper: string
  functionName: string
  cases: {
    left: { kind: string; value?: number; state?: number }
    right: { kind: string; value?: number; state?: number }
    expected: { kind: string; value?: boolean; state?: number }
  }[]
}[]
const int4 = (state: { kind: string; value?: number; state?: number }): unknown => {
  if (state.kind === 'Value') return generated.makeInt4Value(state.value)
  if (state.kind === 'Error') return { kind: 'Error', value: { state: state.state } }
  return { kind: state.kind }
}
const expected = (state: { kind: string; value?: boolean; state?: number }): unknown => {
  if (state.kind === 'Value') return { kind: 'Value', value: state.value }
  if (state.kind === 'Error') return { kind: 'Error', value: { state: state.state } }
  return { kind: state.kind }
}
for (const fixture of fixtures) {
  const targetName = fixture.wrapper
    .split('_')
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
    .join('')
  for (const test of fixture.cases) {
    assert.deepEqual(
      generated[targetName](int4(test.left), int4(test.right)),
      expected(test.expected),
      fixture.functionName,
    )
  }
}
