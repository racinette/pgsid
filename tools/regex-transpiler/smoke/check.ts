import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const [generatedPath] = process.argv.slice(2)
if (!generatedPath) throw new Error('usage: check.ts GENERATED_TS')

const generated = await import(pathToFileURL(generatedPath).href)
const input = { start: 1, end: 3 }
const expected = { start: 3, end: 5 }
const actual = generated.shiftSpan(input, 2)
assert.deepEqual(actual, expected)
assert.deepEqual(input, { start: 1, end: 3 })
assert.equal(generated.sameSpan(actual, expected), true)
assert.equal(generated.spanStart(input), 1)
assert.equal(generated.borrowedSpanStart(input), 1)
assert.throws(() => generated.spanStart({ start: -1, end: 2 }), RangeError)
const token = generated.makeToken(7)
assert.equal(generated.tokenValue(token), 7)
assert.equal(Object.isFrozen(token), true)
assert.throws(() => generated.tokenValue({ ...token }), TypeError)

const parameter = { start: 1, end: 3 }
assert.deepEqual(generated.shiftParameter(parameter, 2), { start: 3, end: 3 })
assert.deepEqual(parameter, { start: 1, end: 3 })

const snapshotInput = { start: 1, end: 3 }
assert.deepEqual(generated.snapshotBeforeShift(snapshotInput, 2), {
  before: { start: 1, end: 3 },
  after: { start: 3, end: 3 },
})
assert.deepEqual(snapshotInput, { start: 1, end: 3 })

const characters = ['a']
const echoed = generated.echoChars(characters)
echoed[0] = 'b'
assert.deepEqual(characters, ['a'])
const forwarded = generated.forwardedChars(characters)
forwarded[0] = 'b'
assert.deepEqual(characters, ['a'])
assert.deepEqual(generated.forwardedSpan(input, 2), expected)
assert.deepEqual(input, { start: 1, end: 3 })
assert.deepEqual(generated.charStack('😀'), ['b'])
assert.throws(() => generated.charStack('\ud800'), RangeError)
assert.deepEqual(generated.spanStack({ start: 1, end: 2 }), [{ start: 2, end: 2 }])
const spanStack = [{ start: 1, end: 2 }]
const shiftedSpanStack = generated.shiftSpanStack(spanStack, 0, 2)
assert.deepEqual(shiftedSpanStack, [{ start: 3, end: 2 }])
spanStack[0]!.start = 9
assert.deepEqual(shiftedSpanStack, [{ start: 3, end: 2 }])
assert.deepEqual(generated.spanStackAt(shiftedSpanStack, 0), { start: 3, end: 2 })
assert.throws(() => generated.spanStackAt(shiftedSpanStack, 1), RangeError)
assert.throws(() => generated.shiftSpanStack([{ start: -1, end: 2 }], 0, 2), RangeError)
assert.equal(generated.echoBool(true), true)
assert.throws(() => generated.echoBool('false' as never), TypeError)

const bag = { characters: ['a'] }
const echoedBag = generated.echoBag(bag)
echoedBag.characters[0] = 'b'
assert.deepEqual(bag.characters, ['a'])
assert.equal(generated.charAt(['a'], 0), 'a')
assert.throws(() => generated.charAt(['a'], 1), RangeError)
assert.equal(generated.addPositions(2, 3), 5)
assert.equal(generated.subtractPositions(5, 3), 2)
assert.throws(() => generated.addPositions(2147483647, 1), RangeError)
assert.throws(() => generated.subtractPositions(0, 1), RangeError)
assert.throws(() => generated.addPositions(0.5, 1), RangeError)
assert.throws(() => generated.echoChars(['ab']), RangeError)
assert.equal(generated.isBeforeFirst(-1), true)
assert.throws(() => generated.isBeforeFirst(2147483648), RangeError)
assert.equal(generated.charCount('😀'), 1)
assert.throws(() => generated.charCount('\ud800'), RangeError)
assert.equal(generated.charCodepoint('😀'), 128512)
assert.throws(() => generated.charCodepoint('\ud800'), RangeError)
assert.equal(generated.indexFromCodepoint('😀'), 128512)
assert.throws(() => generated.indexFromCodepoint('\ud800'), RangeError)
assert.equal(generated.indexFromU32(2147483647), 2147483647)
assert.throws(() => generated.indexFromU32(2147483648), RangeError)
assert.equal(generated.choosePosition(2, 3), 2)
assert.equal(generated.choosePosition(4, 3), 3)
assert.equal(generated.chooseWithReturns(2, 3), 2)
assert.equal(generated.chooseWithReturns(4, 3), 3)
assert.equal(generated.classifyPosition(2, 3), 1)
assert.equal(generated.classifyPosition(3, 3), 2)
assert.equal(generated.classifyPosition(4, 3), 3)
assert.equal(generated.belowDefaultLimit(2), true)
assert.equal(generated.belowDefaultLimit(3), false)
assert.equal(generated.namedPosition({ fromPosition: 2 }), 2)
assert.equal(generated.stackProbe(3), 6)
const positions = [2]
assert.equal(generated.appendPosition(positions, 4), 2)
assert.equal(generated.overwritePosition(positions, 0, 4), 4)
assert.deepEqual(positions, [2])
assert.throws(() => generated.appendPosition([-1], 4), RangeError)
assert.throws(() => generated.appendPosition(positions, 2147483648), RangeError)
assert.throws(() => generated.overwritePosition(positions, 1, 4), RangeError)

assert.equal(generated.conditionLiterals({ kind: 'Run' }), 1)
assert.equal(generated.conditionLiterals({ kind: 'Stop' }), 0)
