import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { checkRustAsset } from '../../src/codegen/shared/check-rust-assets.js'
// Espalier rules and their helpers are runtime JavaScript modules, not TypeScript sources.
// @ts-expect-error -- this in-repository .mjs module intentionally has no declaration file
import { createParser } from '../../tools/check-transpiler/dialects/addons.mjs'
// @ts-expect-error -- this in-repository .mjs module intentionally has no declaration file
import { evaluatorDialectIssues } from '../../tools/check-transpiler/dialects/evaluator-dialect.mjs'

type Issue = { code: string; message: string; line?: number; column?: number }

// Every verdict is the one the standalone evaluator dialect checker gave: its own test cases,
// cases for each rule it applied, and mutations of evaluators the golden pins.
const corpus = JSON.parse(
  readFileSync(new URL('../fixtures/evaluator-dialect/corpus.json', import.meta.url), 'utf8'),
) as {
  cases: { source: string; accepted: boolean }[]
  evaluators: string[]
  mutations: [string, string][]
  mutated: { evaluator: number; mutation: number | null; accepted: boolean }[]
}

const parse = (createParser as (wasm: Buffer) => unknown)(checkRustAsset('check-rust-parser.wasm'))
const issues = (source: string) =>
  (evaluatorDialectIssues as (source: string, parse: unknown) => Promise<Issue[]>)(source, parse)

describe('evaluator dialect', () => {
  it.each(corpus.cases)('$accepted: $source', async ({ source, accepted }) => {
    expect((await issues(source)).length === 0).toBe(accepted)
  })

  it.each(corpus.mutated)(
    'evaluator $evaluator, mutation $mutation: $accepted',
    async ({ evaluator, mutation, accepted }) => {
      const base = corpus.evaluators[evaluator]!
      const source =
        mutation === null
          ? base
          : base.replace(new RegExp(corpus.mutations[mutation]![0]), corpus.mutations[mutation]![1])
      expect(source === base).toBe(mutation === null)
      expect((await issues(source)).length === 0).toBe(accepted)
    },
  )

  it('reports a finding at its line in the golden layout', async () => {
    const valid =
      'pub fn evaluate_check(flag: BoolValue) -> CheckOutcome {\n    let nullness = bool_is_null(flag);\n    check_from_bool(nullness)\n}\n'
    const golden = [
      `// first case\n${valid}`,
      '// undecided case\n// a reason\n',
      `// second case\n${valid.replace('check_from_bool(nullness)', 'nullness.to_owned()')}`,
    ].join('\n')
    expect((await issues(golden)).map(({ code, line }) => ({ code, line }))).toEqual([
      { code: 'outside_evaluator_dialect', line: 13 },
    ])
  })
})
