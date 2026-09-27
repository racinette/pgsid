import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [generatedPath, ...fixturePaths] = process.argv.slice(2)
if (!generatedPath || fixturePaths.length === 0) {
  throw new Error('usage: fixture_check.ts GENERATED_TS FIXTURES_JSON...')
}
const generated = await import(pathToFileURL(generatedPath).href)
const coverage = { find: 0, count: 0, captures: 0, find_all: 0, captures_all: 0 }
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
    assert.ok(
      !fixture.operation ||
        fixture.operation === 'find' ||
        fixture.operation === 'count' ||
        fixture.operation === 'captures' ||
        fixture.operation === 'find_all' ||
        fixture.operation === 'captures_all',
      'unknown fixture operation',
    )
    const { pattern, subject, options } = fixture.input
    const syntax = syntaxKinds[options.syntax as keyof typeof syntaxKinds]
    const newline = newlineKinds[options.newline as keyof typeof newlineKinds]
    assert.ok(syntax, 'unknown syntax option')
    assert.ok(newline, 'unknown newline option')
    const operation = fixture.operation ?? 'find'
    const functionName =
      operation === 'find_all'
        ? 'findAll'
        : operation === 'captures_all'
          ? 'capturesAll'
          : operation
    const from = (fixture.input.start ?? 1) - 1
    const settings = {
      syntax: { kind: syntax },
      newline: { kind: newline },
      caseSensitive: options.caseSensitive,
      expanded: options.expanded,
    }
    const outcome = generated[functionName](pattern, subject, from, settings)
    const actual = outcome.kind === 'InvalidPattern' ? { ...outcome, sqlstate: '2201B' } : outcome
    assert.deepEqual(
      actual,
      fixture.expected,
      `${fixturePath} fixture ${index}: ${JSON.stringify(fixture.input)}`,
    )
    const compiled = generated.compile(pattern, settings)
    const compiledOutcome =
      compiled.kind === 'Compiled'
        ? generated[`${functionName}Compiled`](compiled.value, subject, from)
        : { kind: compiled.kind }
    const compiledActual =
      compiledOutcome.kind === 'InvalidPattern'
        ? { ...compiledOutcome, sqlstate: '2201B' }
        : compiledOutcome
    assert.deepEqual(
      compiledActual,
      fixture.expected,
      `${fixturePath} compiled fixture ${index}: ${JSON.stringify(fixture.input)}`,
    )
    coverage[operation as keyof typeof coverage]++
  }
}
process.stdout.write(
  `TypeScript unified operations: ${coverage.find} find and ${coverage.count} count and ${coverage.captures} capture and ${coverage.find_all} find-all and ${coverage.captures_all} global-capture PostgreSQL fixtures; zero skipped.\n`,
)
