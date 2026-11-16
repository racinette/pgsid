import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { runRule } from 'espalier'
import { checkRustAsset } from '../../src/codegen/shared/check-rust-assets.js'
// Espalier rules and their helpers are runtime JavaScript modules, not TypeScript sources.
// @ts-expect-error -- this in-repository .mjs module intentionally has no declaration file
import { createParser } from '../../tools/check-transpiler/dialects/addons.mjs'
// @ts-expect-error -- this in-repository .mjs rule intentionally has no declaration file
import * as rule from '../../crates/espalier/regex-engine/src/[...path]/regex-dialect.rs.mjs'

type Parse = (graph: unknown) => { document?: unknown; error?: string }

// Each case's verdict is the one the regex transpiler's validator gave it: the dialect the
// engine was written in before it joined the CHECK graph.
const cases = JSON.parse(
  readFileSync(new URL('../fixtures/regex-dialect/cases.json', import.meta.url), 'utf8'),
) as { source: string; accepted: boolean }[]

const parse = (createParser as (wasm: Buffer) => Parse)(checkRustAsset('check-rust-parser.wasm'))
const path = 'regex-engine/src/lib.rs'

async function verdict(source: string) {
  const linked = parse({
    schemaVersion: 1,
    modules: [
      { name: 'regex_engine', dependencies: [], files: [{ path: `crates/${path}`, source }] },
    ],
  })
  const issues = await runRule(rule, { path, tree: { [path]: source }, addons: { parse } })
  return { accepted: linked.error === undefined && issues.length === 0, issues }
}

describe('regex engine dialect', () => {
  it.each(cases)('$accepted: $source', async ({ source, accepted }) => {
    expect((await verdict(source)).accepted).toBe(accepted)
  })

  it('reports each construct at its position', async () => {
    const source = 'pub fn f(left: i32, right: i32) -> i32 {\n    left * right\n}'
    const { issues } = await verdict(source)
    expect(issues.map(({ code, line, column }) => ({ code, line, column }))).toEqual([
      { code: 'outside_regex_dialect', line: 2, column: 5 },
    ])
  })

  it('accepts the engine as written', async () => {
    const source = readFileSync(new URL(`../../crates/${path}`, import.meta.url), 'utf8')
    expect((await verdict(source)).issues).toEqual([])
  })
})
