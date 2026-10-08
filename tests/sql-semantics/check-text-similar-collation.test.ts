import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { supportsTextCallableCollation } from '../../src/sql-semantics/collation.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const sourceNames = new Set(
  ['text_similar'].flatMap((name) =>
    [
      ...readFileSync(
        `crates/check-evaluator/src/operations/pg_catalog/${name}.rs`,
        'utf8',
      ).matchAll(/pub fn (sql__[a-z0-9_]+)\(/gu),
    ].map((match) => match[1]!),
  ),
)
const functions = builtinCallables().filter(
  (fn): fn is FunctionMetadata => fn.kind === 'function' && sourceNames.has(fn.rustName),
)
const input = (value: string | number | bigint | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const argName = (_type: string, index: number) => (index === 0 ? 'pattern' : 'escape')
const queryFor = (fn: FunctionMetadata) =>
  `pg_catalog.${fn.name}(${fn.args.map(argName).join(',')})`
const expressionFor = (fn: FunctionMetadata) => `(${queryFor(fn)}) COLLATE "C" = recorded`
const collations = [
  'pg_catalog."default"',
  'pg_catalog."C"',
  'public.deterministic_order',
  'public.insensitive_order',
]

describe('SQL pattern conversion collations', () => {
  it('accepts intrinsic SQL pattern conversion with every collation', () => {
    expect(functions).toHaveLength(2)
    for (const fn of functions) {
      const identity = callableIdentity(fn)
      for (const collation of ['C', 'deterministic'])
        expect(supportsTextCallableCollation(identity, collation)).toBe(true)
      for (const collation of [undefined, 'other'])
        expect(supportsTextCallableCollation(identity, collation)).toBe(true)
    }
  })

  it('matches raw and stored PostgreSQL CHECKs with default, C, ICU and inherited input collations in Rust and both targets', async () => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-text-similar-collation-'))
    try {
      await pg.exec(`CREATE COLLATION public.deterministic_order (provider=icu,locale='und',deterministic=true);
        CREATE COLLATION public.insensitive_order (provider=icu,locale='und',deterministic=false);`)
      for (const [index, collation] of collations.entries()) {
        const left = collation
        await pg.exec(`CREATE TABLE text_similar_collation_${index} (pattern text COLLATE ${left},escape text COLLATE ${left},recorded text COLLATE "C",
        ${functions.map((fn) => `CONSTRAINT ${fn.rustName} CHECK (${expressionFor(fn)})`).join(',')})`)
      }
      const catalog = await snapshotCatalog(pg)
      const conflict =
        'pg_catalog.similar_to_escape(pattern COLLATE "C", escape COLLATE public.insensitive_order) COLLATE "C" = recorded'
      await expect(
        pg.query(`SELECT ${conflict} FROM text_similar_collation_0`),
      ).rejects.toMatchObject({ code: '42P21' })
      const conflicted = lowerTableCheck(
        catalog.tables.find((table) => table.name === 'text_similar_collation_0')!,
        {
          name: 'conflicting_pattern_collations',
          type: 'check',
          definition: `CHECK (${conflict})`,
        },
      )!
      expect(conflicted.expression.kind).toBe('uncertain')
      const checks: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const [index, collation] of collations.entries()) {
        const table = catalog.tables.find(
          (table) => table.name === `text_similar_collation_${index}`,
        )!
        for (const fn of functions) {
          for (const form of ['raw', 'stored']) {
            const name = `${fn.rustName}_${index}_${form}`
            const plan = lowerTableCheck(
              table,
              form === 'raw'
                ? { name: fn.rustName, type: 'check', definition: `CHECK (${expressionFor(fn)})` }
                : table.constraints.find((item) => item.name === fn.rustName)!,
              [],
              catalog.domains,
            )!
            expect(plan.expression.kind === 'uncertain', name).toBe(false)
            checks.push({
              expression: plan.expression,
              identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
            })
            const left = collation
            const result = (
              await pg.query<{ value: string }>(
                `SELECT (${queryFor(fn)})::text value FROM (SELECT '%é😊_%'::text COLLATE ${left} pattern,'😊'::text COLLATE ${left} escape) sample`,
              )
            ).rows[0]!.value
            const recorded = result
            const row: Row = {
              pattern: input('%é😊_%'),
              escape: input('😊'),
              recorded: input(recorded),
            }
            const column = 'recorded'
            fixtures.push({
              name,
              row: { ...row },
              expected: { kind: 'True' },
            })
            fixtures.push({
              name,
              row: {
                ...row,
                [column]: input(recorded + '!'),
              },
              expected: { kind: 'False' },
            })
            fixtures.push({
              name,
              row: { ...row, [argName(fn.args[0]!, 0)]: input(null) },
              expected: { kind: 'Null' },
            })
          }
        }
      }
      const group = prepareCheckRustGroup(checks)
      expect(group.requiresRegex).toBe(false)
      expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
      await runCheckParity(
        directory,
        'pgsid-text-similar-collation',
        group,
        checks.map((check) => check.identity.constraint),
        fixtures,
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 600000)
})
