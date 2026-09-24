import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [generatedPath, vectorsPath] = process.argv.slice(2)
if (!generatedPath || !vectorsPath) throw new Error('usage: check.ts GENERATED_TS VECTORS_JSON')

const generated = await import(pathToFileURL(generatedPath).href)
const vectors = JSON.parse(readFileSync(vectorsPath, 'utf8')) as {
  search: {
    pattern: string
    subject?: string
    subjectRepeat?: { text: string; count: number }
    expected: unknown
  }[]
  shift: { input: { start: number; end: number }; offset: number; expected: unknown }[]
}

for (const vector of vectors.search) {
  const subject = vector.subject ?? vector.subjectRepeat!.text.repeat(vector.subjectRepeat!.count)
  assert.deepEqual(generated.literal_search(vector.pattern, subject), vector.expected)
}
for (const vector of vectors.shift) {
  const input = { ...vector.input }
  const actual = generated.shift_span(input, vector.offset)
  assert.deepEqual(actual, vector.expected)
  assert.deepEqual(input, vector.input)
  assert.equal(generated.same_span(actual, vector.expected), true)
}
