import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const [generatedPath, oraclePath] = process.argv.slice(2)
if (!generatedPath || !oraclePath) {
  throw new Error('usage: rust_parity.ts GENERATED_TS RUST_ORACLE_JSON')
}
const generated = await import(pathToFileURL(generatedPath).href)
const oracle = JSON.parse(readFileSync(oraclePath, 'utf8'))
assert.equal(oracle.schemaVersion, 1)
assert.ok(oracle.cases.length >= 1000)

for (const [index, testCase] of oracle.cases.entries()) {
  let actual
  switch (testCase.operation) {
    case 'find_literal':
      actual = generated.find_literal(
        testCase.pattern,
        testCase.subject,
        testCase.from,
        testCase.caseSensitive,
      )
      break
    case 'find_any_character':
      actual = generated.find_any_character(
        testCase.subject,
        testCase.from,
        testCase.dotCrossesNewline,
      )
      break
    case 'find_simple_advanced':
      actual = generated.find_simple_advanced(
        testCase.pattern,
        testCase.subject,
        testCase.from,
        testCase.caseSensitive,
        testCase.dotCrossesNewline,
      )
      break
    case 'charge_work':
      actual = generated.charge_work(testCase.current, testCase.amount)
      break
    default:
      throw new Error(`unknown oracle operation ${testCase.operation}`)
  }
  assert.deepEqual(
    actual,
    testCase.expected,
    `Rust parity case ${index}: ${JSON.stringify(testCase)}`,
  )
}

process.stdout.write(`TypeScript matched ${oracle.cases.length} Rust cases\n`)
