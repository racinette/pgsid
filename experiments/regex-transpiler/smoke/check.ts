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

const parameter = { start: 1, end: 3 }
assert.deepEqual(generated.shift_parameter(parameter, 2), { start: 3, end: 3 })
assert.deepEqual(parameter, { start: 1, end: 3 })

const snapshotInput = { start: 1, end: 3 }
assert.deepEqual(generated.snapshot_before_shift(snapshotInput, 2), {
  before: { start: 1, end: 3 },
  after: { start: 3, end: 3 },
})
assert.deepEqual(snapshotInput, { start: 1, end: 3 })

const characters = ['a']
const echoed = generated.echo_chars(characters)
echoed[0] = 'b'
assert.deepEqual(characters, ['a'])

const bag = { characters: ['a'] }
const echoedBag = generated.echo_bag(bag)
echoedBag.characters[0] = 'b'
assert.deepEqual(bag.characters, ['a'])
assert.equal(generated.char_at(['a'], 0), 'a')
assert.throws(() => generated.char_at(['a'], 1), RangeError)
assert.equal(generated.add_positions(2, 3), 5)
assert.equal(generated.subtract_positions(5, 3), 2)
assert.throws(() => generated.add_positions(2147483647, 1), RangeError)
assert.throws(() => generated.subtract_positions(0, 1), RangeError)
assert.throws(() => generated.add_positions(0.5, 1), RangeError)
assert.throws(() => generated.echo_chars(['ab']), RangeError)
assert.equal(generated.is_before_first(-1), true)
assert.throws(() => generated.is_before_first(2147483648), RangeError)
assert.equal(generated.char_count('😀'), 1)
assert.throws(() => generated.char_count('\ud800'), RangeError)
assert.equal(generated.char_codepoint('😀'), 128512)
assert.throws(() => generated.char_codepoint('\ud800'), RangeError)
