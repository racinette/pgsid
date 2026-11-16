import { readFileSync } from 'node:fs'
import { runRule } from 'espalier'
import { createParser, parserWasm } from './addons.mjs'
import * as rule from '../../../tests/fixtures/sql-semantics/projects/espalier/evaluators.rs.mjs'

// The evaluator dialect rule's findings for one generated evaluator module.
export function evaluatorDialectIssues(source, parse) {
  return runRule(rule, {
    path: 'evaluators.rs',
    tree: { 'evaluators.rs': source },
    addons: { parse },
  })
}

if (import.meta.main) {
  const parse = createParser(parserWasm())
  for (const file of process.argv.slice(2))
    for (const issue of await evaluatorDialectIssues(readFileSync(file, 'utf8'), parse)) {
      console.error(`${file}:${issue.line}:${issue.column ?? 1}: ${issue.message}`)
      process.exitCode = 1
    }
}
