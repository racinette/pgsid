import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const [generatedPath] = process.argv.slice(2)
if (!generatedPath) throw new Error('usage: check.ts GENERATED_TS')

const generated = await import(pathToFileURL(generatedPath).href)
const input = { start: 1, end: 3 }
const expected = { start: 3, end: 5 }
const actual = generated.shift_span(input, 2)
assert.deepEqual(actual, expected)
assert.deepEqual(input, { start: 1, end: 3 })
assert.equal(generated.same_span(actual, expected), true)
