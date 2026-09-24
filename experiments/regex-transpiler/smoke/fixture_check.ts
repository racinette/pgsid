import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [generatedPath, ...fixturePaths] = process.argv.slice(2)
if (!generatedPath || fixturePaths.length === 0) {
  throw new Error('usage: fixture_check.ts GENERATED_TS FIXTURES_JSON...')
}
const generated = await import(pathToFileURL(generatedPath).href)
const reserved = new Set(['^', '$', '[', ']', '(', ')', '{', '}', '*', '+', '?', '|', '\\'])
const coverage = {
  literal: 0,
  insensitive: 0,
  advanced: 0,
  dot: 0,
  mixed: 0,
  position: 0,
  newline: new Set<string>(),
}

for (const fixturePath of fixturePaths) {
  const document = JSON.parse(readFileSync(fixturePath, 'utf8'))
  assert.equal(document.schemaVersion, 1)
  assert.equal(document.oracle.database, 'PostgreSQL via PGlite')
  for (const [index, fixture] of document.fixtures.entries()) {
    const { pattern, subject, options } = fixture.input
    const from = (fixture.input.start ?? 1) - 1
    let actual
    if (options.syntax === 'literal' && !options.expanded && options.newline === 'ordinary') {
      actual = generated.find_literal(pattern, subject, from, options.caseSensitive)
      coverage.literal++
      if (!options.caseSensitive) coverage.insensitive++
    } else if (
      options.syntax === 'advanced' &&
      !options.expanded &&
      Array.from(pattern).every((character) => !reserved.has(character))
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      actual = generated.find_simple_advanced(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
      )
      coverage.advanced++
      if (pattern === '.') {
        assert.deepEqual(
          generated.find_any_character(subject, from, crossesNewline),
          fixture.expected,
        )
        coverage.dot++
      }
      if (pattern.includes('.') && Array.from(pattern).length > 1) coverage.mixed++
      coverage.newline.add(options.newline)
    } else {
      continue
    }
    if (from > 0) coverage.position++
    assert.deepEqual(
      actual,
      fixture.expected,
      `${fixturePath} fixture ${index}: ${JSON.stringify(fixture.input)}`,
    )
  }
}

assert.ok(coverage.literal >= 40)
assert.ok(coverage.insensitive >= 7)
assert.ok(coverage.advanced >= 100)
assert.ok(coverage.dot >= 20)
assert.ok(coverage.mixed >= 50)
assert.ok(coverage.position >= 6)
assert.deepEqual(coverage.newline, new Set(['ordinary', 'sensitive', 'stop', 'anchors']))
process.stdout.write(
  `TypeScript fixtures: ${coverage.literal} literal, ${coverage.advanced} simple advanced, ${coverage.mixed} mixed, ${coverage.position} positioned\n`,
)
