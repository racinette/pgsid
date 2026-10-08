import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { supportsTextCallableCollation } from '../../src/sql-semantics/collation.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
const sourceNames = new Set(
  ['regex_replace'].flatMap((name) =>
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
const input = (value: string | number | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const collations = [
  'pg_catalog."default"',
  'pg_catalog."C"',
  'public.deterministic_order',
  'public.insensitive_order',
]
const columnNames = (fn: FunctionMetadata) => [
  'label',
  'pattern',
  'replacement',
  ...fn.args
    .slice(3)
    .map((type, index) =>
      type === 'pg_catalog.text' ? 'flags' : index === 0 ? 'starting' : 'occurrence',
    ),
]
const query = (fn: FunctionMetadata) =>
  `pg_catalog.${fn.name}(${columnNames(fn).slice(0, fn.args.length).join(',')})`
const expression = (fn: FunctionMetadata) => `${query(fn)} = recorded`
describe('catalog regex output collation boundary', () => {
  it('requires C for every regex output overload', () => {
    expect(functions).toHaveLength(5)
    const identities = new Set(functions.map(callableIdentity))
    const entries = builtinCallables().filter(
      (fn) =>
        identities.has(callableIdentity(fn)) ||
        (fn.kind === 'operator' && identities.has(fn.implementation)),
    )
    expect(entries).toHaveLength(5)
    for (const fn of entries) {
      expect(supportsTextCallableCollation(callableIdentity(fn), 'C')).toBe(true)
      for (const collation of [undefined, 'deterministic', 'other'])
        expect(supportsTextCallableCollation(callableIdentity(fn), collation)).toBe(false)
    }
  })
  it('matches C raw/stored CHECKs and defers other collations in Rust, Go and TypeScript', async () => {
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-regex-collation-'))
    try {
      await pg.exec(`CREATE COLLATION public.deterministic_order(provider=icu,locale='und',deterministic=true);
    CREATE COLLATION public.insensitive_order(provider=icu,locale='und',deterministic=false);`)
      for (const [index, collation] of collations.entries())
        await pg.exec(
          `CREATE TABLE regex_collation_${index}(label text COLLATE ${collation},pattern text COLLATE ${collation},flags text COLLATE ${collation},replacement text COLLATE ${collation}, starting integer, occurrence integer, recorded text COLLATE "C",${functions.map((fn) => `CONSTRAINT ${fn.rustName} CHECK (${expression(fn)})`).join(',')})`,
        )
      const catalog = await snapshotCatalog(pg)
      const checks: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const [index, collation] of collations.entries()) {
        const table = catalog.tables.find((table) => table.name === `regex_collation_${index}`)!
        for (const fn of functions) {
          const querySql = `SELECT (${query(fn)}) value FROM (SELECT 'é😊 a'::text COLLATE ${collation} label,'é😊 a'::text COLLATE ${collation} pattern,'i'::text COLLATE ${collation} flags,'X'::text COLLATE ${collation} replacement,1::integer starting,1::integer occurrence) sample`
          let recorded = ''
          if (index === 3) await expect(pg.query(querySql)).rejects.toMatchObject({ code: '0A000' })
          else recorded = (await pg.query<{ value: string }>(querySql)).rows[0]!.value
          for (const form of ['raw', 'stored']) {
            const name = `${fn.rustName}_${index}_${form}`
            const plan = lowerTableCheck(
              table,
              form === 'raw'
                ? { name: fn.rustName, type: 'check', definition: `CHECK (${expression(fn)})` }
                : table.constraints.find((item) => item.name === fn.rustName)!,
              [],
              catalog.domains,
            )!
            if (index === 1) expect(plan.expression.kind, name).not.toBe('uncertain')
            checks.push({
              expression: plan.expression,
              identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
            })
            const row: Row = {
              label: input('é😊 a'),
              replacement: input('X'),
              starting: input(1),
              occurrence: input(1),
              pattern: input('é😊 a'),
              flags: input('i'),
              recorded: input(recorded),
            }
            fixtures.push({
              name,
              row: { ...row },
              expected: { kind: index === 1 ? 'True' : 'Unknown' },
            })
            fixtures.push({
              name,
              row: { ...row, recorded: input(recorded + '!') },
              expected: { kind: index === 1 ? 'False' : 'Unknown' },
            })
            fixtures.push({
              name,
              row: {
                ...row,
                label: input(null),
              },
              expected: { kind: index === 1 ? 'Null' : 'Unknown' },
            })
          }
        }
      }
      const group = prepareCheckRustGroup(checks)
      expect(group.requiresRegex).toBe(true)
      expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
      await runCheckParity(
        directory,
        'pgsid-regex-collation',
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
