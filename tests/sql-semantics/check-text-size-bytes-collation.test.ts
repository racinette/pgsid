import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity, type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { supportsTextCallableCollation } from '../../src/sql-semantics/collation.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'
const fn = builtinCallables().find(
  (fn): fn is FunctionMetadata => fn.kind === 'function' && fn.name === 'pg_size_bytes',
)!
describe('text size parsing collations', () => {
  it('ignores text collation while preserving exact bigint output in raw and stored CHECKs', async () => {
    for (const collation of [undefined, 'C', 'deterministic', 'other'])
      expect(supportsTextCallableCollation(callableIdentity(fn), collation)).toBe(true)
    const pg = await PGlite.create()
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-size-bytes-collation-'))
    try {
      await pg.exec(`CREATE COLLATION public.size_deterministic (provider=icu,locale='und',deterministic=true);
    CREATE COLLATION public.size_insensitive (provider=icu,locale='und',deterministic=false);`)
      const collations = [
        'pg_catalog."default"',
        'pg_catalog."C"',
        'public.size_deterministic',
        'public.size_insensitive',
      ]
      const expression = 'pg_catalog.pg_size_bytes(size_label)=recorded_bytes'
      for (const [index, collation] of collations.entries())
        await pg.exec(
          `CREATE TABLE size_collation_${index} (size_label text COLLATE ${collation},recorded_bytes bigint,CONSTRAINT size_value CHECK (${expression}))`,
        )
      const catalog = await snapshotCatalog(pg)
      const checks: Parameters<typeof prepareCheckRustGroup>[0][number][] = []
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      for (const [index, collation] of collations.entries()) {
        const table = catalog.tables.find((table) => table.name === `size_collation_${index}`)!
        const parsed = (
          await pg.query<{ value: string }>(
            `SELECT pg_size_bytes('9007199254740993 bytes'::text COLLATE ${collation})::text value`,
          )
        ).rows[0]!.value
        for (const form of ['raw', 'stored']) {
          const name = `size_${index}_${form}`
          const lowered = lowerTableCheck(
            table,
            form === 'stored'
              ? table.constraints.find((c) => c.name === 'size_value')!
              : { name, type: 'check', definition: `CHECK (${expression})` },
            [],
            catalog.domains,
          )!
          expect(lowered.expression.kind).not.toBe('uncertain')
          checks.push({
            expression: lowered.expression,
            identity: { schema: 'public', kind: 'table', owner: table.name, constraint: name },
          })
          fixtures.push({
            name,
            row: {
              size_label: { kind: 'Value', value: '9007199254740993 bytes' },
              recorded_bytes: { kind: 'Value', value: BigInt(parsed) },
            },
            expected: { kind: 'True' },
          })
          fixtures.push({
            name,
            row: {
              size_label: { kind: 'Value', value: '9007199254740993 bytes' },
              recorded_bytes: { kind: 'Value', value: BigInt(parsed) + 1n },
            },
            expected: { kind: 'False' },
          })
          fixtures.push({
            name,
            row: { size_label: { kind: 'Null' }, recorded_bytes: { kind: 'Value', value: 0n } },
            expected: { kind: 'Null' },
          })
        }
      }
      const group = prepareCheckRustGroup(checks)
      expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
      await runCheckParity(
        directory,
        'pgsid-size-bytes-collation',
        group,
        checks.map((check) => check.identity.constraint),
        fixtures,
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 120000)
})
