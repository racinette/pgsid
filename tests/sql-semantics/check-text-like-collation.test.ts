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
  ['text_like'].flatMap((name) =>
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
const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const argName = (type: string, index: number) =>
  type === 'pg_catalog.text'
    ? index === 0
      ? 'label'
      : index === 1
        ? 'from_label'
        : 'fill_label'
    : index === 2
      ? 'starting'
      : 'width'
const intrinsic = (fn: FunctionMetadata) => fn.name === 'like_escape'
const folded = (fn: FunctionMetadata) => fn.name.includes('iclike') || fn.name.includes('icnlike')
const queryFor = (fn: FunctionMetadata) =>
  `pg_catalog.${fn.name}(${fn.args.map((type, index) => (type === 'pg_catalog.bpchar' ? 'fixed_label' : argName(type, index))).join(',')})`
const expressionFor = (fn: FunctionMetadata) =>
  fn.result === 'pg_catalog.text'
    ? `(${queryFor(fn)}) COLLATE "C" = recorded`
    : `(${queryFor(fn)}) = recorded_bool`
const collations = [
  'pg_catalog."default"',
  'pg_catalog."C"',
  'public.deterministic_order',
  'public.insensitive_order',
]

describe('text LIKE and escape collations', () => {
  it('accepts deterministic LIKE, C ILIKE and collation-independent escape normalization', () => {
    expect(functions).toHaveLength(11)
    for (const fn of functions) {
      const identity = callableIdentity(fn)
      expect(supportsTextCallableCollation(identity, 'C')).toBe(true)
      expect(supportsTextCallableCollation(identity, 'deterministic')).toBe(!folded(fn))
      for (const collation of [undefined, 'other'])
        expect(supportsTextCallableCollation(identity, collation)).toBe(intrinsic(fn))
    }
  })

  it('matches supported raw and stored CHECK collations and defers nondeterministic LIKE and non-C ILIKE in Rust and both targets', async () => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-text-padding-collation-'))
    try {
      await pg.exec(`CREATE COLLATION public.deterministic_order (provider=icu,locale='und',deterministic=true);
        CREATE COLLATION public.insensitive_order (provider=icu,locale='und',deterministic=false);`)
      for (const [index, collation] of collations.entries()) {
        const left = collation
        await pg.exec(`CREATE TABLE text_search_collation_${index} (label text COLLATE ${left},fixed_label bpchar COLLATE ${left},from_label text COLLATE ${left},fill_label text COLLATE ${left},starting integer,width integer,recorded text COLLATE "C",recorded_bool boolean,
        ${functions.map((fn) => `CONSTRAINT ${fn.rustName} CHECK (${expressionFor(fn)})`).join(',')})`)
      }
      const catalog = await snapshotCatalog(pg)
      const checks: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const [index, collation] of collations.entries()) {
        const table = catalog.tables.find(
          (table) => table.name === `text_search_collation_${index}`,
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
            const deferred = !intrinsic(fn) && (folded(fn) ? index !== 1 : index === 3)
            if (!deferred) expect(plan.expression.kind === 'uncertain', name).toBe(false)
            checks.push({
              expression: plan.expression,
              identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
            })
            const left = collation
            const query = `SELECT (${queryFor(fn)})::text value FROM (SELECT 'é😊 a'::text COLLATE ${left} label,'é😊 a'::bpchar COLLATE ${left} fixed_label,'😊'::text COLLATE ${left} from_label,'Z'::text COLLATE ${left} fill_label,3::integer starting,1::integer width) sample`
            let result: string
            if (folded(fn) && index === 3) {
              await expect(pg.query(query)).rejects.toMatchObject({ code: '0A000' })
              result = 'false'
            } else result = (await pg.query<{ value: string }>(query)).rows[0]!.value
            const recorded = result
            const row: Row = {
              label: input('é😊 a'),
              fixed_label: input('é😊 a'),
              from_label: input('😊'),
              fill_label: input('Z'),
              starting: input(3),
              width: input(1),
              recorded_bool: input(recorded === 'true'),
              recorded: input(recorded),
            }
            const column = fn.result === 'pg_catalog.text' ? 'recorded' : 'recorded_bool'
            fixtures.push({
              name,
              row: { ...row },
              expected: { kind: deferred ? 'Unknown' : 'True' },
            })
            fixtures.push({
              name,
              row: {
                ...row,
                [column]: input(
                  fn.result === 'pg_catalog.text' ? recorded + '!' : recorded !== 'true',
                ),
              },
              expected: { kind: deferred ? 'Unknown' : 'False' },
            })
            fixtures.push({
              name,
              row: {
                ...row,
                [fn.args[0] === 'pg_catalog.bpchar' ? 'fixed_label' : argName(fn.args[0]!, 0)]:
                  input(null),
              },
              expected: { kind: deferred ? 'Unknown' : 'Null' },
            })
          }
        }
      }
      const group = prepareCheckRustGroup(checks)
      expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
      await runCheckParity(
        directory,
        'pgsid-text-padding-collation',
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
