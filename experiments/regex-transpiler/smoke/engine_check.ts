import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const [generatedPath] = process.argv.slice(2)
if (!generatedPath) throw new Error('usage: engine_check.ts GENERATED_TS')

const generated = await import(pathToFileURL(generatedPath).href)

function testOptions(
  syntax: string,
  caseSensitive: boolean,
  crosses: boolean,
  anchors: boolean,
  expanded: boolean,
) {
  const newline = crosses ? (anchors ? 'Anchors' : 'Ordinary') : anchors ? 'Sensitive' : 'Stop'
  return { syntax: { kind: syntax }, caseSensitive, newline: { kind: newline }, expanded }
}

assert.deepEqual(
  generated.find('😀', 'a😀a', 0, testOptions('Literal', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 1, end: 2 },
  },
)
assert.deepEqual(generated.find('', 'a😀a', 3, testOptions('Literal', true, true, false, false)), {
  kind: 'Found',
  value: { start: 3, end: 3 },
})
assert.deepEqual(generated.find('a', 'a😀a', 4, testOptions('Literal', true, true, false, false)), {
  kind: 'NoMatch',
})
assert.deepEqual(generated.find('a', 'bA', 0, testOptions('Literal', false, true, false, false)), {
  kind: 'Found',
  value: { start: 1, end: 2 },
})
assert.deepEqual(generated.find('Z', 'z', 0, testOptions('Literal', false, true, false, false)), {
  kind: 'Found',
  value: { start: 0, end: 1 },
})
assert.deepEqual(generated.find('a', 'A', 0, testOptions('Literal', true, true, false, false)), {
  kind: 'NoMatch',
})
assert.deepEqual(generated.find('Å', 'å', 0, testOptions('Literal', false, true, false, false)), {
  kind: 'NoMatch',
})
assert.deepEqual(generated.find('K', 'K', 0, testOptions('Literal', false, true, false, false)), {
  kind: 'NoMatch',
})
assert.deepEqual(
  generated.find('.', '\n😀', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 0, end: 1 },
  },
)
assert.deepEqual(
  generated.find('.', '\n😀', 0, testOptions('Advanced', true, false, false, false)),
  {
    kind: 'Found',
    value: { start: 1, end: 2 },
  },
)
assert.deepEqual(generated.find('.', '\n', 0, testOptions('Advanced', true, false, false, false)), {
  kind: 'NoMatch',
})
assert.deepEqual(generated.find('.', '😀', 1, testOptions('Advanced', true, true, false, false)), {
  kind: 'NoMatch',
})
assert.deepEqual(
  generated.find('a.b', 'za😀b', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 1, end: 4 },
  },
)
assert.deepEqual(
  generated.find('a.b', 'a\nb', 0, testOptions('Advanced', true, false, true, false)),
  {
    kind: 'NoMatch',
  },
)
assert.deepEqual(
  generated.find('a*', 'aaa', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 0, end: 3 },
  },
)
assert.deepEqual(
  generated.find('a+b', 'zaaab', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 1, end: 5 },
  },
)
assert.deepEqual(
  generated.find('[ab]*c', 'abbc', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 0, end: 4 },
  },
)
assert.deepEqual(
  generated.find('a|ab', 'ab', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 0, end: 2 },
  },
)
assert.deepEqual(
  generated.find('a|b', 'ba', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 0, end: 1 },
  },
)
assert.deepEqual(
  generated.find('a*?', 'aaa', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 0, end: 0 },
  },
)
assert.deepEqual(
  generated.find('a+?', 'aaa', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 0, end: 1 },
  },
)
assert.deepEqual(
  generated.find('a{2,4}b', 'aaaab', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 0, end: 5 },
  },
)
assert.deepEqual(
  generated.find('a{0}', 'bbb', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 0, end: 0 },
  },
)

assert.deepEqual(
  generated.find('a{foo}', 'za{foo}', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 1, end: 7 },
  },
)
assert.deepEqual(
  generated.count('a*', 'baa', 0, {
    syntax: { kind: 'Advanced' },
    newline: { kind: 'Ordinary' },
    caseSensitive: true,
    expanded: false,
  }),
  {
    kind: 'Count',
    value: 3,
  },
)
assert.deepEqual(
  generated.count('a*?', 'aaa', 0, {
    syntax: { kind: 'Advanced' },
    newline: { kind: 'Ordinary' },
    caseSensitive: true,
    expanded: false,
  }),
  {
    kind: 'Count',
    value: 4,
  },
)

assert.deepEqual(
  generated.find('a # comment\nb', 'ab', 0, testOptions('Advanced', true, true, false, true)),
  {
    kind: 'Found',
    value: { start: 0, end: 2 },
  },
)
assert.deepEqual(
  generated.find('a[ #]b', 'za#b', 0, testOptions('Advanced', true, true, false, true)),
  {
    kind: 'Found',
    value: { start: 1, end: 4 },
  },
)
assert.deepEqual(
  generated.count('a *', 'baa', 0, {
    syntax: { kind: 'Advanced' },
    newline: { kind: 'Ordinary' },
    caseSensitive: true,
    expanded: true,
  }),
  {
    kind: 'Count',
    value: 3,
  },
)
assert.deepEqual(
  generated.find('^a$', '\na\n', 0, testOptions('Advanced', true, false, true, false)),
  {
    kind: 'Found',
    value: { start: 1, end: 2 },
  },
)
assert.deepEqual(
  generated.find('^a$', '\na\n', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'NoMatch',
  },
)

assert.deepEqual(
  generated.find('a\\.b', 'za.b', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 1, end: 4 },
  },
)
assert.deepEqual(
  generated.find('\\^a', 'z^a', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 1, end: 3 },
  },
)

assert.deepEqual(
  generated.find('a[bc]d', 'zacd', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 1, end: 4 },
  },
)
assert.deepEqual(
  generated.find('[A]', 'a', 0, testOptions('Advanced', false, true, false, false)),
  {
    kind: 'Found',
    value: { start: 0, end: 1 },
  },
)

assert.deepEqual(
  generated.find('[^a]', '\n', 0, testOptions('Advanced', true, false, false, false)),
  {
    kind: 'NoMatch',
  },
)
assert.deepEqual(
  generated.find('[^a]', '\n', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 0, end: 1 },
  },
)

assert.deepEqual(
  generated.find('[A-C]', 'b', 0, testOptions('Advanced', false, true, false, false)),
  {
    kind: 'Found',
    value: { start: 0, end: 1 },
  },
)
assert.deepEqual(
  generated.find('[0-9]', '😀', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'NoMatch',
  },
)

assert.deepEqual(
  generated.find('[-a]', '-', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 0, end: 1 },
  },
)
assert.deepEqual(
  generated.find('[]a]', 'z]', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 1, end: 2 },
  },
)

assert.deepEqual(
  generated.find('\\Aa', '\na', 0, testOptions('Advanced', true, true, true, false)),
  {
    kind: 'NoMatch',
  },
)
assert.deepEqual(
  generated.find('\\Z', 'a\n', 0, testOptions('Advanced', true, true, false, false)),
  {
    kind: 'Found',
    value: { start: 2, end: 2 },
  },
)
assert.deepEqual(generated.find('\\A', 'a', 1, testOptions('Advanced', true, true, false, false)), {
  kind: 'NoMatch',
})

const unifiedOptions = {
  syntax: { kind: 'Advanced' },
  newline: { kind: 'Ordinary' },
  caseSensitive: true,
  expanded: false,
}
for (const pattern of ['(a{255}){255}', `${'(?='.repeat(65)}a${')'.repeat(65)}`]) {
  assert.deepEqual(generated.find(pattern, 'a', 0, unifiedOptions), { kind: 'Uncertain' })
  assert.deepEqual(generated.count(pattern, 'a', 0, unifiedOptions), { kind: 'Uncertain' })
}
assert.deepEqual(generated.find('[', '', 100, unifiedOptions), { kind: 'InvalidPattern' })

assert.deepEqual(generated.count('[', '', 100, unifiedOptions), { kind: 'InvalidPattern' })
const repeatedSubject = 'a'.repeat(250000)
assert.equal(generated.find('(?=a)(?=a)', repeatedSubject, 0, unifiedOptions).kind, 'Found')
assert.deepEqual(generated.count('(?=a)(?=a)', repeatedSubject, 0, unifiedOptions), {
  kind: 'Uncertain',
})
assert.deepEqual(generated.find('a', 'a'.repeat(500000), 0, unifiedOptions), {
  kind: 'Found',
  value: { start: 0, end: 1 },
})

assert.deepEqual(
  generated.find('a(b)*c', 'b'.repeat(300), 0, testOptions('Advanced', true, true, false, false)),
  { kind: 'NoMatch' },
)

const captureResult = generated.captures('(a)?()', '😀', 1, unifiedOptions)
assert.deepEqual(captureResult, {
  kind: 'Found',
  value: [
    { matched: true, start: 1, end: 1 },
    { matched: false, start: 0, end: 0 },
    { matched: true, start: 1, end: 1 },
  ],
})
captureResult.value[0].end = 99
assert.equal(captureResult.value[2].end, 1)
assert.equal(generated.captures('(a)?()', '😀', 1, unifiedOptions).value[0].end, 1)
assert.deepEqual(generated.captures('(', '', 100, unifiedOptions), { kind: 'InvalidPattern' })
assert.deepEqual(generated.captures('a', '', 100, unifiedOptions), { kind: 'NoMatch' })
assert.deepEqual(
  generated.captures(`${'(?='.repeat(65)}a${')'.repeat(65)}`, 'a', 0, unifiedOptions),
  {
    kind: 'Uncertain',
  },
)
