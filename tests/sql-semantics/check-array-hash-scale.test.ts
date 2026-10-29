import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row } from '../../tools/check-rust/parity.js'

it('hashes 50,000 cells with borrowed reads and bounded modular arithmetic in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-hash-scale-'))
  try {
    const sql =
      'hash_array(a::integer[])=expected32 AND hash_array_extended(a::integer[],seed)=expected64'
    await pg.exec(
      `CREATE TABLE hash_scale(a text,seed bigint,expected32 integer,expected64 bigint,CHECK(${sql}))`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'hash_scale')!
    const plans = (['source', 'stored'] as const).map((origin) => ({
      expression: lowerTableCheck(
        table,
        origin === 'source'
          ? { name: 'scale', type: 'check', definition: `CHECK(${sql})` }
          : table.constraints.find((c) => c.type === 'check')!,
        [],
        [],
        origin,
      )!.expression,
      identity: {
        schema: 'public',
        kind: 'table' as const,
        owner: table.name,
        constraint: 'scale_' + origin,
      },
    }))
    const group = prepareCheckRustGroup(plans, { arrayNulls: true })
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    const count = 50000,
      a =
        '{' +
        Array.from({ length: count }, (_, i) => (i % 5 === 0 ? 'NULL' : String(i - 25000))).join(
          ',',
        ) +
        '}',
      seed = -9223372036854775808n
    const actual = (
      await pg.query<{ h32: number; h64: string }>(
        'SELECT hash_array($1::integer[]) h32,hash_array_extended($1::integer[],$2::bigint)::text h64',
        [a, String(seed)],
      )
    ).rows[0]!
    const row: Row = {
      a: { kind: 'Value', value: a },
      seed: { kind: 'Value', value: seed },
      expected32: { kind: 'Value', value: actual.h32 },
      expected64: { kind: 'Value', value: BigInt(actual.h64) },
    }
    const started = Date.now()
    await runCheckParity(
      directory,
      'arrayhashscale',
      group,
      plans.map((p) => p.identity.constraint),
      plans.map((p) => ({ name: p.identity.constraint, row, expected: { kind: 'True' as const } })),
    )
    await mkdir('artifacts/goal-checks/array-hash-dispatch', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/array-hash-dispatch/scale-measurements.json',
      JSON.stringify(
        { cells: count, fixtures: plans.length, postgres: actual, elapsedMs: Date.now() - started },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
