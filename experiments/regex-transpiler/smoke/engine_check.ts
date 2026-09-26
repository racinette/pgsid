import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const [generatedPath] = process.argv.slice(2)
if (!generatedPath) throw new Error('usage: engine_check.ts GENERATED_TS')

const generated = await import(pathToFileURL(generatedPath).href)

assert.deepEqual(generated.findLiteral('😀', 'a😀a', 0, true), {
  kind: 'Found',
  value: { start: 1, end: 2 },
})
assert.deepEqual(generated.findLiteral('', 'a😀a', 3, true), {
  kind: 'Found',
  value: { start: 3, end: 3 },
})
assert.deepEqual(generated.findLiteral('a', 'a😀a', 4, true), { kind: 'NoMatch' })
assert.deepEqual(generated.findLiteral('a', 'bA', 0, false), {
  kind: 'Found',
  value: { start: 1, end: 2 },
})
assert.deepEqual(generated.findLiteral('Z', 'z', 0, false), {
  kind: 'Found',
  value: { start: 0, end: 1 },
})
assert.deepEqual(generated.findLiteral('a', 'A', 0, true), { kind: 'NoMatch' })
assert.deepEqual(generated.findLiteral('Å', 'å', 0, false), { kind: 'NoMatch' })
assert.deepEqual(generated.findLiteral('K', 'K', 0, false), { kind: 'NoMatch' })
assert.deepEqual(generated.findAnyCharacter('\n😀', 0, true), {
  kind: 'Found',
  value: { start: 0, end: 1 },
})
assert.deepEqual(generated.findAnyCharacter('\n😀', 0, false), {
  kind: 'Found',
  value: { start: 1, end: 2 },
})
assert.deepEqual(generated.findAnyCharacter('\n', 0, false), { kind: 'NoMatch' })
assert.deepEqual(generated.findAnyCharacter('😀', 1, true), { kind: 'NoMatch' })
assert.deepEqual(generated.findSimpleAdvanced('a.b', 'za😀b', 0, true, true, false), {
  kind: 'Found',
  value: { start: 1, end: 4 },
})
assert.deepEqual(generated.findSimpleAdvanced('a.b', 'a\nb', 0, true, false, true), {
  kind: 'NoMatch',
})
assert.deepEqual(generated.findSimpleAdvanced('a*', 'aaa', 0, true, true, false), {
  kind: 'Found',
  value: { start: 0, end: 3 },
})
assert.deepEqual(generated.findSimpleAdvanced('a+b', 'zaaab', 0, true, true, false), {
  kind: 'Found',
  value: { start: 1, end: 5 },
})
assert.deepEqual(generated.findSimpleAdvanced('[ab]*c', 'abbc', 0, true, true, false), {
  kind: 'Found',
  value: { start: 0, end: 4 },
})
assert.deepEqual(generated.findSimpleAdvanced('a|ab', 'ab', 0, true, true, false), {
  kind: 'Found',
  value: { start: 0, end: 2 },
})
assert.deepEqual(generated.findSimpleAdvanced('a|b', 'ba', 0, true, true, false), {
  kind: 'Found',
  value: { start: 0, end: 1 },
})
assert.deepEqual(generated.findSimpleAdvanced('a*?', 'aaa', 0, true, true, false), {
  kind: 'Found',
  value: { start: 0, end: 0 },
})
assert.deepEqual(generated.findSimpleAdvanced('a+?', 'aaa', 0, true, true, false), {
  kind: 'Found',
  value: { start: 0, end: 1 },
})
assert.deepEqual(generated.findSimpleAdvanced('a{2,4}b', 'aaaab', 0, true, true, false), {
  kind: 'Found',
  value: { start: 0, end: 5 },
})
assert.deepEqual(generated.findSimpleAdvanced('a{0}', 'bbb', 0, true, true, false), {
  kind: 'Found',
  value: { start: 0, end: 0 },
})
assert.equal(generated.supportsSimpleAdvanced('a{256}'), false)
assert.deepEqual(generated.findSimpleAdvanced('^a$', '\na\n', 0, true, false, true), {
  kind: 'Found',
  value: { start: 1, end: 2 },
})
assert.deepEqual(generated.findSimpleAdvanced('^a$', '\na\n', 0, true, true, false), {
  kind: 'NoMatch',
})
assert.equal(generated.supportsSimpleAdvanced('a\\.b'), true)
assert.equal(generated.supportsSimpleAdvanced('a\\nb'), true)
assert.deepEqual(generated.findSimpleAdvanced('a\\.b', 'za.b', 0, true, true, false), {
  kind: 'Found',
  value: { start: 1, end: 4 },
})
assert.deepEqual(generated.findSimpleAdvanced('\\^a', 'z^a', 0, true, true, false), {
  kind: 'Found',
  value: { start: 1, end: 3 },
})
assert.equal(generated.supportsSimpleAdvanced('a[bc]d'), true)
assert.equal(generated.supportsSimpleAdvanced('a[b-d]'), true)
assert.deepEqual(generated.findSimpleAdvanced('a[bc]d', 'zacd', 0, true, true, false), {
  kind: 'Found',
  value: { start: 1, end: 4 },
})
assert.deepEqual(generated.findSimpleAdvanced('[A]', 'a', 0, false, true, false), {
  kind: 'Found',
  value: { start: 0, end: 1 },
})
assert.equal(generated.supportsSimpleAdvanced('[^ab]'), true)
assert.equal(generated.supportsSimpleAdvanced('[^a-z]'), true)
assert.deepEqual(generated.findSimpleAdvanced('[^a]', '\n', 0, true, false, false), {
  kind: 'NoMatch',
})
assert.deepEqual(generated.findSimpleAdvanced('[^a]', '\n', 0, true, true, false), {
  kind: 'Found',
  value: { start: 0, end: 1 },
})
assert.equal(generated.supportsSimpleAdvanced('[a-c]'), true)
assert.equal(generated.supportsSimpleAdvanced('[z-a]'), false)
assert.deepEqual(generated.findSimpleAdvanced('[A-C]', 'b', 0, false, true, false), {
  kind: 'Found',
  value: { start: 0, end: 1 },
})
assert.deepEqual(generated.findSimpleAdvanced('[0-9]', '😀', 0, true, true, false), {
  kind: 'NoMatch',
})
assert.equal(generated.supportsSimpleAdvanced('[-a]'), true)
assert.equal(generated.supportsSimpleAdvanced('[]a]'), true)
assert.equal(generated.supportsSimpleAdvanced('[--a]'), false)
assert.deepEqual(generated.findSimpleAdvanced('[-a]', '-', 0, true, true, false), {
  kind: 'Found',
  value: { start: 0, end: 1 },
})
assert.deepEqual(generated.findSimpleAdvanced('[]a]', 'z]', 0, true, true, false), {
  kind: 'Found',
  value: { start: 1, end: 2 },
})
assert.equal(generated.supportsSimpleAdvanced('\\A😀\\Z'), true)
assert.deepEqual(generated.findSimpleAdvanced('\\Aa', '\na', 0, true, true, true), {
  kind: 'NoMatch',
})
assert.deepEqual(generated.findSimpleAdvanced('\\Z', 'a\n', 0, true, true, false), {
  kind: 'Found',
  value: { start: 2, end: 2 },
})
assert.deepEqual(generated.findSimpleAdvanced('\\A', 'a', 1, true, true, false), {
  kind: 'NoMatch',
})
assert.deepEqual(generated.chargeWork(1999999, 1), {
  kind: 'Ready',
  value: 2000000,
})
assert.deepEqual(generated.chargeWork(2000000, 1), { kind: 'Uncertain' })
