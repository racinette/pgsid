import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { pathToFileURL } from 'node:url'

const [generatedPath, ...fixturePaths] = process.argv.slice(2)
if (!generatedPath || fixturePaths.length === 0) {
  throw new Error('usage: fixture_check.ts GENERATED_TS FIXTURES_JSON...')
}
const generated = await import(pathToFileURL(generatedPath).href)
const coverage = {
  find: 0,
  count: 0,
  countSupported: 0,
  literal: 0,
  insensitive: 0,
  advanced: 0,
  expandedAdvanced: 0,
  unsupportedAdvanced: 0,
  otherOptions: 0,
  dot: 0,
  mixed: 0,
  anchored: 0,
  escaped: 0,
  classes: 0,
  negatedClasses: 0,
  rangeClasses: 0,
  edgePunctuation: 0,
  absoluteAnchors: 0,
  position: 0,
  newline: new Set<string>(),
}

for (const fixturePath of fixturePaths) {
  const document = JSON.parse(readFileSync(fixturePath, 'utf8'))
  assert.equal(document.schemaVersion, 1)
  assert.equal(document.oracle.database, 'PostgreSQL via PGlite')
  let checked = 0
  for (const [index, fixture] of document.fixtures.entries()) {
    if (fixture.operation && fixture.operation !== 'find') {
      coverage.count++
      const { pattern, subject, options } = fixture.input
      if (
        fixture.operation === 'count' &&
        options.syntax === 'advanced' &&
        (options.expanded
          ? generated.supportsExpandedAdvanced(pattern)
          : generated.supportsSimpleAdvanced(pattern))
      ) {
        const newline = options.newline
        assert.deepEqual(
          (options.expanded ? generated.countExpandedAdvanced : generated.countSimpleAdvanced)(
            pattern,
            subject,
            (fixture.input.start ?? 1) - 1,
            options.caseSensitive,
            newline === 'ordinary' || newline === 'anchors',
            newline === 'sensitive' || newline === 'anchors',
          ),
          fixture.expected,
          `${fixturePath} count fixture ${index}: ${JSON.stringify(fixture.input)}`,
        )
        coverage.countSupported++
      }
      continue
    }
    coverage.find++
    const { pattern, subject, options } = fixture.input
    const from = (fixture.input.start ?? 1) - 1
    let actual
    if (options.syntax === 'literal' && !options.expanded && options.newline === 'ordinary') {
      actual = generated.findLiteral(pattern, subject, from, options.caseSensitive)
      coverage.literal++
      if (!options.caseSensitive) coverage.insensitive++
    } else if (
      options.syntax === 'advanced' &&
      (options.expanded
        ? generated.supportsExpandedAdvanced(pattern)
        : generated.supportsSimpleAdvanced(pattern))
    ) {
      const crossesNewline = options.newline === 'ordinary' || options.newline === 'anchors'
      const lineAnchors = options.newline === 'sensitive' || options.newline === 'anchors'
      actual = (options.expanded ? generated.findExpandedAdvanced : generated.findSimpleAdvanced)(
        pattern,
        subject,
        from,
        options.caseSensitive,
        crossesNewline,
        lineAnchors,
      )
      coverage.advanced++
      if (options.expanded) coverage.expandedAdvanced++
      if (pattern === '.') {
        assert.deepEqual(
          generated.findAnyCharacter(subject, from, crossesNewline),
          fixture.expected,
        )
        coverage.dot++
      }
      if (pattern.includes('.') && Array.from(pattern).length > 1) coverage.mixed++
      if (pattern.includes('^') || pattern.includes('$')) coverage.anchored++
      if (pattern.includes('\\')) coverage.escaped++
      if (pattern.includes('[')) coverage.classes++
      if (pattern.includes('[^')) coverage.negatedClasses++
      if (pattern.includes('[') && pattern.includes('-')) coverage.rangeClasses++
      if (
        pattern.includes('[-') ||
        pattern.includes('-]') ||
        pattern.includes('[]') ||
        pattern.includes('[^]')
      )
        coverage.edgePunctuation++
      if (pattern.includes('\\A') || pattern.includes('\\Z')) coverage.absoluteAnchors++
      coverage.newline.add(options.newline)
    } else {
      if (options.syntax === 'advanced') coverage.unsupportedAdvanced++
      else coverage.otherOptions++
      continue
    }
    if (from > 0) coverage.position++
    assert.deepEqual(
      actual,
      fixture.expected,
      `${fixturePath} fixture ${index}: ${JSON.stringify(fixture.input)}`,
    )
    checked++
  }
  if (basename(fixturePath) === 'targeted-postgres-fixtures.json') {
    assert.equal(checked, document.fixtures.length)
  }
}

assert.ok(coverage.literal >= 40)
assert.ok(coverage.insensitive >= 7)
assert.ok(coverage.advanced >= 100)
assert.ok(coverage.expandedAdvanced >= 200)
assert.ok(coverage.dot >= 20)
assert.ok(coverage.mixed >= 50)
assert.ok(coverage.anchored >= 20)
assert.ok(coverage.escaped >= 40)
assert.ok(coverage.classes >= 50)
assert.ok(coverage.negatedClasses >= 40)
assert.ok(coverage.rangeClasses >= 50)
assert.ok(coverage.edgePunctuation >= 80)
assert.ok(coverage.absoluteAnchors >= 50)
assert.ok(coverage.position >= 6)
assert.ok(coverage.countSupported >= 100)
assert.deepEqual(coverage.newline, new Set(['ordinary', 'sensitive', 'stop', 'anchors']))
assert.equal(
  coverage.find,
  coverage.literal + coverage.advanced + coverage.unsupportedAdvanced + coverage.otherOptions,
)
process.stdout.write(
  `TypeScript find fixtures: ${coverage.literal + coverage.advanced}/${coverage.find} supported (${coverage.literal} literal, ${coverage.advanced} advanced including ${coverage.expandedAdvanced} expanded); ${coverage.unsupportedAdvanced} unsupported advanced, ${coverage.otherOptions} other modes. Count fixtures: ${coverage.countSupported}/${coverage.count} supported. Advanced coverage includes ${coverage.anchored} anchored, ${coverage.escaped} escaped, ${coverage.classes} classes, ${coverage.negatedClasses} negated classes, ${coverage.rangeClasses} ranges, ${coverage.edgePunctuation} class edge cases, ${coverage.absoluteAnchors} absolute anchors, and ${coverage.position} positioned.\n`,
)
