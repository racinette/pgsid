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
  ['text_hash', 'text_index_compare'].flatMap((name) =>
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
  type === 'pg_catalog.int8'
    ? 'seed'
    : type === 'pg_catalog.bpchar'
      ? 'fixed_label'
      : index === 0
        ? 'label'
        : 'peer'
const queryFor = (fn: FunctionMetadata) =>
  `pg_catalog.${fn.name}(${fn.args.map(argName).join(',')})`
const expressionFor = (fn: FunctionMetadata) =>
  `${queryFor(fn)} = ${fn.result === 'pg_catalog.int8' ? 'recorded_seeded' : 'recorded'}`
const comparators = new Set(['gin_cmp_tslexeme', 'gin_compare_jsonb'])
const collations = [
  'pg_catalog."default"',
  'pg_catalog."C"',
  'public.deterministic_order',
  'public.insensitive_order',
  'mixed',
]

describe('text hash and index comparator collations', () => {
  it('allows deterministic UTF8 hashes and intrinsic comparators while deferring locale sort-key hashing', () => {
    expect(functions).toHaveLength(6)
    for (const fn of functions) {
      const identity = callableIdentity(fn)
      for (const collation of ['C', 'deterministic'])
        expect(supportsTextCallableCollation(identity, collation)).toBe(true)
      for (const collation of [undefined, 'other'])
        expect(supportsTextCallableCollation(identity, collation)).toBe(comparators.has(fn.name))
    }
  })

  it('matches raw and stored PostgreSQL CHECKs with default, C, ICU and conflicting implicit collations in Rust and both targets', async () => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-text-hash-collation-'))
    try {
      await pg.exec(`CREATE COLLATION public.deterministic_order (provider=icu,locale='und',deterministic=true);
        CREATE COLLATION public.insensitive_order (provider=icu,locale='und',deterministic=false);`)
      for (const [index, collation] of collations.entries()) {
        const left = collation === 'mixed' ? 'public.insensitive_order' : collation
        const right = collation === 'mixed' ? 'public.deterministic_order' : collation
        await pg.exec(`CREATE TABLE text_hash_collation_${index} (label text COLLATE ${left},fixed_label bpchar COLLATE ${left},peer text COLLATE ${right},seed bigint,recorded integer,recorded_seeded bigint,
          ${functions.map((fn) => `CONSTRAINT ${fn.rustName} CHECK (${expressionFor(fn)})`).join(',')})`)
      }
      const catalog = await snapshotCatalog(pg)
      const checks: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const [index, collation] of collations.entries()) {
        const table = catalog.tables.find((table) => table.name === `text_hash_collation_${index}`)!
        for (const fn of functions) {
          const supported = comparators.has(fn.name) || index < 3
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
            expect(plan.expression.kind === 'uncertain', name).toBe(!supported)
            checks.push({
              expression: plan.expression,
              identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
            })
            const left = collation === 'mixed' ? 'public.insensitive_order' : collation
            const right = collation === 'mixed' ? 'public.deterministic_order' : collation
            const result = (
              await pg.query<{ value: string }>(
                `SELECT (${queryFor(fn)})::text value FROM (SELECT 'é😊 a'::text COLLATE ${left} label,'é😊 a  '::bpchar COLLATE ${left} fixed_label,'ê😊'::text COLLATE ${right} peer,'-9223372036854775808'::bigint seed) sample`,
              )
            ).rows[0]!.value
            const recorded = fn.result === 'pg_catalog.int8' ? BigInt(result) : Number(result)
            const row: Row = {
              label: input('é😊 a'),
              fixed_label: input('é😊 a  '),
              peer: input('ê😊'),
              seed: input(-9223372036854775808n),
              recorded: input(0),
              recorded_seeded: input(0n),
            }
            const column = fn.result === 'pg_catalog.int8' ? 'recorded_seeded' : 'recorded'
            row[column] = input(recorded)
            fixtures.push({
              name,
              row: { ...row },
              expected: { kind: supported ? 'True' : 'Unknown' },
            })
            fixtures.push({
              name,
              row: {
                ...row,
                [column]: input(
                  typeof recorded === 'bigint'
                    ? recorded === 0n
                      ? 1n
                      : 0n
                    : recorded === 0
                      ? 1
                      : 0,
                ),
              },
              expected: { kind: supported ? 'False' : 'Unknown' },
            })
            fixtures.push({
              name,
              row: { ...row, [argName(fn.args[0]!, 0)]: input(null) },
              expected: { kind: supported ? 'Null' : 'Unknown' },
            })
          }
        }
      }
      const table = catalog.tables.find((table) => table.name === 'text_hash_collation_0')!
      for (const fn of functions.filter((fn) => comparators.has(fn.name))) {
        const sql = `pg_catalog.${fn.name}(label COLLATE "C",peer COLLATE public.deterministic_order) IS NOT NULL`
        expect(
          lowerTableCheck(table, {
            name: 'conflicting',
            type: 'check',
            definition: `CHECK (${sql})`,
          })!.expression,
        ).toEqual({ kind: 'uncertain' })
        await expect(
          pg.query(
            `SELECT pg_catalog.${fn.name}('a'::text COLLATE "C",'b'::text COLLATE public.deterministic_order)`,
          ),
        ).rejects.toMatchObject({ code: '42P21' })
      }
      const group = prepareCheckRustGroup(checks)
      expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
      await runCheckParity(
        directory,
        'pgsid-text-hash-collation',
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
