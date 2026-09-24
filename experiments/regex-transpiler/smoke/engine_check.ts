import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const [generatedPath] = process.argv.slice(2)
if (!generatedPath) throw new Error('usage: engine_check.ts GENERATED_TS')

const generated = await import(pathToFileURL(generatedPath).href)

assert.deepEqual(generated.find_literal('😀', 'a😀a', 0, true), {
  kind: 'Found',
  value: { start: 1, end: 2 },
})
assert.deepEqual(generated.find_literal('', 'a😀a', 3, true), {
  kind: 'Found',
  value: { start: 3, end: 3 },
})
assert.deepEqual(generated.find_literal('a', 'a😀a', 4, true), { kind: 'NoMatch' })
assert.deepEqual(generated.find_literal('a', 'bA', 0, false), {
  kind: 'Found',
  value: { start: 1, end: 2 },
})
assert.deepEqual(generated.find_literal('Z', 'z', 0, false), {
  kind: 'Found',
  value: { start: 0, end: 1 },
})
assert.deepEqual(generated.find_literal('a', 'A', 0, true), { kind: 'NoMatch' })
assert.deepEqual(generated.find_literal('Å', 'å', 0, false), { kind: 'NoMatch' })
assert.deepEqual(generated.find_literal('K', 'K', 0, false), { kind: 'NoMatch' })
assert.deepEqual(generated.find_any_character('\n😀', 0, true), {
  kind: 'Found',
  value: { start: 0, end: 1 },
})
assert.deepEqual(generated.find_any_character('\n😀', 0, false), {
  kind: 'Found',
  value: { start: 1, end: 2 },
})
assert.deepEqual(generated.find_any_character('\n', 0, false), { kind: 'NoMatch' })
assert.deepEqual(generated.find_any_character('😀', 1, true), { kind: 'NoMatch' })
assert.deepEqual(generated.find_simple_advanced('a.b', 'za😀b', 0, true, true, false), {
  kind: 'Found',
  value: { start: 1, end: 4 },
})
assert.deepEqual(generated.find_simple_advanced('a.b', 'a\nb', 0, true, false, true), {
  kind: 'NoMatch',
})
assert.deepEqual(generated.find_simple_advanced('a*', 'aaa', 0, true, true, false), {
  kind: 'Uncertain',
})
assert.deepEqual(generated.find_simple_advanced('^a$', '\na\n', 0, true, false, true), {
  kind: 'Found',
  value: { start: 1, end: 2 },
})
assert.deepEqual(generated.find_simple_advanced('^a$', '\na\n', 0, true, true, false), {
  kind: 'NoMatch',
})
assert.equal(generated.supports_simple_advanced('a\\.b'), true)
assert.equal(generated.supports_simple_advanced('a\\nb'), false)
assert.deepEqual(generated.find_simple_advanced('a\\.b', 'za.b', 0, true, true, false), {
  kind: 'Found',
  value: { start: 1, end: 4 },
})
assert.deepEqual(generated.find_simple_advanced('\\^a', 'z^a', 0, true, true, false), {
  kind: 'Found',
  value: { start: 1, end: 3 },
})
assert.deepEqual(generated.charge_work(1999999, 1), {
  kind: 'Ready',
  value: 2000000,
})
assert.deepEqual(generated.charge_work(2000000, 1), { kind: 'Uncertain' })
