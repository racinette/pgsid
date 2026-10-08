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
  ['text_slice', 'text_bool'].flatMap((name) =>
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
const argName = (type: string, index: number) =>
  type === 'pg_catalog.text'
    ? 'label'
    : type === 'pg_catalog.bool'
      ? 'active'
      : index === 1
        ? 'starting'
        : 'width'
const queryFor = (fn: FunctionMetadata) =>
  `pg_catalog.${fn.name}(${fn.args.map(argName).join(',')})`
const expressionFor = (fn: FunctionMetadata) => `(${queryFor(fn)}) COLLATE "C" = recorded`
const collations = [
  'pg_catalog."default"',
  'pg_catalog."C"',
  'public.deterministic_order',
  'public.insensitive_order',
]

describe('text slicing and Boolean output collations', () => {
  it('accepts intrinsic text slicing and Boolean output with every collation', () => {
    expect(functions).toHaveLength(8)
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
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-text-slice-collation-'))
    try {
      await pg.exec(`CREATE COLLATION public.deterministic_order (provider=icu,locale='und',deterministic=true);
        CREATE COLLATION public.insensitive_order (provider=icu,locale='und',deterministic=false);`)
      for (const [index, collation] of collations.entries()) {
        const left = collation
        await pg.exec(`CREATE TABLE text_slice_collation_${index} (label text COLLATE ${left},starting integer,width integer,active boolean,recorded text COLLATE "C",
        ${functions.map((fn) => `CONSTRAINT ${fn.rustName} CHECK (${expressionFor(fn)})`).join(',')})`)
      }
      const catalog = await snapshotCatalog(pg)
      const checks: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const [index, collation] of collations.entries()) {
        const table = catalog.tables.find(
          (table) => table.name === `text_slice_collation_${index}`,
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
                `SELECT (${queryFor(fn)})::text value FROM (SELECT 'é😊 a'::text COLLATE ${left} label,2::integer starting,3::integer width,true::boolean active) sample`,
              )
            ).rows[0]!.value
            const recorded = result
            const row: Row = {
              label: input('é😊 a'),
              starting: input(2),
              width: input(3),
              active: { kind: 'Value', value: true },
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
      expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
      await runCheckParity(
        directory,
        'pgsid-text-slice-collation',
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
