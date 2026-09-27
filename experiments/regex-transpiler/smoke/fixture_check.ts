import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [generatedPath, ...fixturePaths] = process.argv.slice(2)
if (!generatedPath || fixturePaths.length === 0) {
  throw new Error('usage: fixture_check.ts GENERATED_TS FIXTURES_JSON...')
}
const generated = await import(pathToFileURL(generatedPath).href)
const coverage = { find: 0, count: 0, countSupported: 0 }
const syntaxKinds = {
  advanced: 'Advanced',
  basic: 'Basic',
  extended: 'Extended',
  literal: 'Literal',
}
const newlineKinds = {
  ordinary: 'Ordinary',
  sensitive: 'Sensitive',
  stop: 'Stop',
  anchors: 'Anchors',
}
for (const fixturePath of fixturePaths) {
  const document = JSON.parse(readFileSync(fixturePath, 'utf8'))
  assert.equal(document.schemaVersion, 1)
  assert.equal(document.oracle.database, 'PostgreSQL via PGlite')
  assert.ok(document.fixtures.length > 0)
  for (const [index, fixture] of document.fixtures.entries()) {
    if (fixture.operation === 'count') {
      coverage.count++
      const { pattern, subject, options } = fixture.input
      const simple = options.expanded
        ? generated.supportsExpandedAdvanced(pattern)
        : generated.supportsSimpleAdvanced(pattern)
      const choice = generated.supportsGroupChoice(pattern, options.expanded)
      const lookbehind = generated.supportsFixedLookbehind(pattern, options.expanded)
      const lookahead = generated.supportsLeadingLookahead(pattern, options.expanded)
      const backref = generated.supportsFixedBackref(pattern, options.expanded)
      if (
        fixture.operation === 'count' &&
        options.syntax === 'advanced' &&
        (simple || choice || lookbehind || lookahead || backref)
      ) {
        const newline = options.newline
        const args = [
          pattern,
          subject,
          (fixture.input.start ?? 1) - 1,
          options.caseSensitive,
          newline === 'ordinary' || newline === 'anchors',
          newline === 'sensitive' || newline === 'anchors',
        ] as const
        assert.deepEqual(
          backref
            ? generated.countFixedBackref(...args, options.expanded)
            : lookahead
              ? generated.countLeadingLookahead(...args, options.expanded)
              : lookbehind
                ? generated.countFixedLookbehind(...args, options.expanded)
                : choice
                  ? generated.countGroupChoice(...args, options.expanded)
                  : (options.expanded
                      ? generated.countExpandedAdvanced
                      : generated.countSimpleAdvanced)(...args),
          fixture.expected,
          `${fixturePath} count fixture ${index}: ${JSON.stringify(fixture.input)}`,
        )
        coverage.countSupported++
      }
      assert.equal(coverage.countSupported, coverage.count, 'unsupported count fixture')
      continue
    }
    assert.ok(!fixture.operation || fixture.operation === 'find', 'unknown fixture operation')
    const { pattern, subject, options } = fixture.input
    const syntax = syntaxKinds[options.syntax as keyof typeof syntaxKinds]
    const newline = newlineKinds[options.newline as keyof typeof newlineKinds]
    assert.ok(syntax, 'unknown syntax option')
    assert.ok(newline, 'unknown newline option')
    const outcome = generated.find(pattern, subject, (fixture.input.start ?? 1) - 1, {
      syntax: { kind: syntax },
      newline: { kind: newline },
      caseSensitive: options.caseSensitive,
      expanded: options.expanded,
    })
    const actual = outcome.kind === 'InvalidPattern' ? { ...outcome, sqlstate: '2201B' } : outcome
    assert.deepEqual(
      actual,
      fixture.expected,
      `${fixturePath} fixture ${index}: ${JSON.stringify(fixture.input)}`,
    )
    coverage.find++
  }
}
assert.equal(coverage.countSupported, coverage.count)
process.stdout.write(
  `TypeScript unified find: ${coverage.find} PostgreSQL fixtures; count: ${coverage.countSupported}/${coverage.count}; zero skipped.\n`,
)
