import { checkRustAsset } from '../../../src/codegen/shared/check-rust-assets.js'
// Espalier rules and their helpers are runtime JavaScript modules, not TypeScript sources.
// @ts-expect-error -- this in-repository .mjs module intentionally has no declaration file
import { createParser } from '../dialects/addons.mjs'
// @ts-expect-error -- this in-repository .mjs module intentionally has no declaration file
import { evaluatorDialectIssues } from '../dialects/evaluator-dialect.mjs'

type Issue = { message: string; line?: number; column?: number }
const parserFor = createParser as (wasm: Buffer) => unknown
const issuesOf = evaluatorDialectIssues as (source: string, parse: unknown) => Promise<Issue[]>
let parse: unknown

// Throws with every finding when a generated evaluator module leaves the evaluator dialect.
export async function assertEvaluatorDialect(source: string): Promise<void> {
  parse ??= parserFor(checkRustAsset('check-rust-parser.wasm'))
  const issues = await issuesOf(source, parse)
  if (issues.length)
    throw new Error(
      issues
        .map(({ line, column, message }) => `${line ?? 1}:${column ?? 1}: ${message}`)
        .join('\n'),
    )
}
