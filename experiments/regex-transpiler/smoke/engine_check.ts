import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const [generatedPath] = process.argv.slice(2)
if (!generatedPath) throw new Error('usage: engine_check.ts GENERATED_TS')

const generated = await import(pathToFileURL(generatedPath).href)

assert.equal(generated.supportsFlatGroups('a((b)c)', false), true)
for (const pattern of ['(a|b)c', '(ab)+', '(a)\\1', '(?=a)a', '(ab']) {
  assert.equal(generated.supportsFlatGroups(pattern, false), false)
}
assert.equal(generated.supportsGroupChoice('a(b|bc)', false), true)
for (const pattern of ['(a|b)+', '((a|b))', '(a|b)\\1', '(?=a|b)c', 'a|b(c|d)']) {
  assert.equal(generated.supportsGroupChoice(pattern, false), false)
}
assert.equal(generated.supportsFixedLookbehind('(?<=ab)c', false), true)
for (const pattern of ['(?<=a|b)c', '(?<=a+)c', '(?<=a\\n)b', '(?=a)b']) {
  assert.equal(generated.supportsFixedLookbehind(pattern, false), false)
}
assert.equal(generated.supportsLeadingLookahead('(?=ab)a.', false), true)
for (const pattern of ['(?=(ab))a', '(?=[ab])a', 'a(?=b)b', '(?=a\\nb)a']) {
  assert.equal(generated.supportsLeadingLookahead(pattern, false), false)
}
assert.equal(generated.supportsFixedBackref('(ab)c\\1', false), true)
for (const pattern of ['([ab])\\1', '(a+)\\1', '(a)\\2', '(a)|(b)\\1', '(a)*\\1']) {
  assert.equal(generated.supportsFixedBackref(pattern, false), false)
}
for (const pattern of ['(?i)ab', '(?n)^b', '(?x)a b', '(?t)a b']) {
  assert.equal(generated.supportsInlineAdvanced(pattern, false), true)
}
for (const pattern of ['(?b)a+b', '(?e)a+b', 'a(?i)b', '(?z)ab']) {
  assert.equal(generated.supportsInlineAdvanced(pattern, false), false)
}
assert.equal(generated.supportsMiddleLookahead('a(?=b)b', false), true)
for (const pattern of ['a+(?=b)b', 'a(?=[bc])b', '(?=b)b', 'a(?=(b))b']) {
  assert.equal(generated.supportsMiddleLookahead(pattern, false), false)
}
assert.equal(generated.supportsBoundedGroup('(ab){1,3}c', false), true)
for (const pattern of ['(a|b){2}', '(ab){1,}', '(ab)*', '(a+){2}', '(ab){17}']) {
  assert.equal(generated.supportsBoundedGroup(pattern, false), false)
}
assert.equal(generated.supportsExtendedGroup('(a|ab)b', false), true)
assert.equal(generated.supportsExtendedGroup('(a|ab)\\w', false), false)
assert.equal(generated.supportsBasicLiteralPunctuation('a+b', false), true)
assert.equal(generated.supportsBasicLiteralPunctuation('a\\+b', false), false)
assert.equal(generated.supportsBasicLiteralPunctuation('[a+b]', false), false)
assert.equal(generated.supportsExtendedLiteralEscape('a\\wb', false), true)
assert.equal(generated.supportsExtendedLiteralEscape('[\\w]', false), false)
assert.equal(generated.supportsExtendedLiteralEscape('a\\1b', false), false)
assert.equal(generated.supportsBasicLetterEscape('a\\wb', false), true)
assert.equal(generated.supportsBasicLetterEscape('a\\w\\(b\\)', false), false)

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
assert.deepEqual(generated.findSimpleAdvanced('a{foo}', 'za{foo}', 0, true, true, false), {
  kind: 'Found',
  value: { start: 1, end: 7 },
})
assert.deepEqual(generated.countSimpleAdvanced('a*', 'baa', 0, true, true, false), {
  kind: 'Count',
  value: 3,
})
assert.deepEqual(generated.countSimpleAdvanced('a*?', 'aaa', 0, true, true, false), {
  kind: 'Count',
  value: 4,
})
assert.equal(generated.supportsExpandedAdvanced('a # comment\nb'), true)
assert.deepEqual(generated.findExpandedAdvanced('a # comment\nb', 'ab', 0, true, true, false), {
  kind: 'Found',
  value: { start: 0, end: 2 },
})
assert.deepEqual(generated.findExpandedAdvanced('a[ #]b', 'za#b', 0, true, true, false), {
  kind: 'Found',
  value: { start: 1, end: 4 },
})
assert.deepEqual(generated.countExpandedAdvanced('a *', 'baa', 0, true, true, false), {
  kind: 'Count',
  value: 3,
})
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
