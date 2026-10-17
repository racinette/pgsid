import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity, type Row } from '../../tools/check-rust/parity.js'

it('searches 50,000 thresholds with borrowed midpoint reads in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-bucket-scale-'))
  try {
    const sql = 'width_bucket(probe,thresholds::integer[]) IS NOT DISTINCT FROM expected'
    await pg.exec(
      `CREATE TABLE bucket_scale(thresholds text,probe integer,expected integer,CONSTRAINT bucket_check CHECK(${sql}));CREATE TABLE bucket_scale_oracle(thresholds text,probe integer)`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'bucket_scale')!
    const plans = (['source', 'stored'] as const).map((origin) => ({
      identity: {
        schema: 'public',
        kind: 'table' as const,
        owner: table.name,
        constraint: 'bucket_' + origin,
      },
      expression: portableCheckAtoms(
        lowerTableCheck(
          table,
          origin === 'stored'
            ? table.constraints.find((c) => c.name === 'bucket_check')!
            : { name: 'bucket_check', type: 'check', definition: `CHECK(${sql})` },
          catalog.enums,
          catalog.domains,
          origin,
        )!.expression,
      ),
    }))
    const group = prepareCheckRustGroup(plans, { arrayNulls: true })
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    const count = 50000,
      thresholds = '{' + Array.from({ length: count }, (_, i) => i).join(',') + '}'
    const fixtures: { name: string; row: Row; expected: { kind: 'True' } }[] = [],
      references: unknown[] = []
    for (const probe of [-1, 0, 25000, 49999, 50000]) {
      await pg.exec('TRUNCATE bucket_scale_oracle')
      await pg.query('INSERT INTO bucket_scale_oracle VALUES($1,$2)', [thresholds, probe])
      const expected = (
        await pg.query<{ value: number }>(
          'SELECT width_bucket(probe,thresholds::integer[]) value FROM bucket_scale_oracle',
        )
      ).rows[0]!.value
      references.push({ count, probe, postgres: expected })
      for (const origin of ['source', 'stored'])
        fixtures.push({
          name: 'bucket_' + origin,
          row: {
            thresholds: { kind: 'Value', value: thresholds },
            probe: { kind: 'Value', value: probe },
            expected: { kind: 'Value', value: expected },
          },
          expected: { kind: 'True' },
        })
    }
    await mkdir('artifacts/array-bucket', { recursive: true })
    await writeFile(
      'artifacts/array-bucket/scale-fixtures.json',
      JSON.stringify(fixtures, null, 2) + '\n',
    )
    await writeFile(
      'artifacts/array-bucket/scale-references.json',
      JSON.stringify(references, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'arraybucketscale',
      group,
      plans.map((p) => p.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 240_000)
