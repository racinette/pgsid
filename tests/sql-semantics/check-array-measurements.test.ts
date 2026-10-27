import { it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { measureArrays, arrayValueRequirements } from '../../scripts/check-measurements/arrays.js'
import { builtinMetadata } from '../../src/postgres/builtins/inventory.js'
it('separates array implementation gaps, aggregate support, volatile operations, set-returning expressions and internal interfaces against PostgreSQL', async () => {
  const pg = await PGlite.create()
  try {
    const report = await measureArrays(pg)
    expect(new Set(report.callables.map((c) => c.identity)).size).toBe(report.callables.length)
    expect(report.summary.callables).toBe(report.callables.length)
    expect(report.summary.representedImmutableGaps).toBe(
      report.callables.filter((c) => c.representedImmutableGap).length,
    )
    for (const c of report.callables) {
      if (c.representedImmutableGap) {
        expect(c.implementationPresent).toBe(false)
        expect(c.metadata.volatility).toBe('i')
        expect(c.missingTypes).toEqual([])
        expect(c.requirements).not.toContain('internal-interface')
        expect(c.metadata.returnsSet).toBe(false)
      }
      if (c.implementationPresent) expect(c.representedImmutableGap).toBe(false)
    }
    for (const name of ['array_sample', 'array_shuffle']) {
      const row = report.callables.find((c) => c.metadata.name === name)!
      expect(row.requirements).toContain('volatile-state')
      expect(row.representedImmutableGap).toBe(false)
    }
    const support = report.callables.find((c) => c.metadata.name === 'float8_accum')!
    expect(support.requirements).toContain('aggregate-support-callable')
    for (const name of ['ts_lexize', 'postgresql_fdw_validator']) {
      const row = report.callables.find((c) => c.metadata.name === name)!
      expect(row.unimplementedImmutableCandidate).toBe(true)
      expect(row.representedImmutableGap).toBe(false)
      expect(row.databaseDependentUnimplemented).toBe(true)
      expect(row.valueRequirements).toMatchObject([
        { kind: 'database', owner: 'tests/sql-semantics/check-array-measurements.test.ts' },
      ])
    }
    expect(report.summary.databaseDependentUnimplemented).toBe(
      report.callables.filter((c) => c.databaseDependentUnimplemented).length,
    )
    const dictionary = (
      await pg.query<{ simple: string[] | null; stemmed: string[] | null }>(
        "SELECT ts_lexize('simple','rats') simple,ts_lexize('english_stem','rats') stemmed",
      )
    ).rows[0]!
    expect(dictionary['simple']).not.toEqual(dictionary['stemmed'])
    await expect(
      pg.query("SELECT postgresql_fdw_validator(ARRAY['user=alice'],'pg_user_mapping'::regclass)"),
    ).resolves.toMatchObject({ rows: [{ postgresql_fdw_validator: true }] })
    await expect(
      pg.query(
        "SELECT postgresql_fdw_validator(ARRAY['user=alice'],'pg_foreign_server'::regclass)",
      ),
    ).rejects.toMatchObject({ code: '42601' })
    const send = report.callables.find((c) => c.metadata.name === 'array_send')!
    expect(send.requirements).not.toContain('internal-interface')
    expect(send.requirements).toContain('session-or-database-state')
    expect(send.valueRequirements).toMatchObject([
      { kind: 'database', owner: 'tests/sql-semantics/check-array-binary-io.test.ts' },
      { kind: 'interface', owner: 'tests/sql-semantics/check-container-binary-length.test.ts' },
    ])
    const record = builtinMetadata('function:["pg_catalog","record_send"](pg_catalog.record)')
    expect(arrayValueRequirements(record)).toMatchObject([
      { kind: 'database', owner: 'tests/sql-semantics/check-composite-binary.test.ts' },
      { kind: 'interface', owner: 'tests/sql-semantics/check-container-binary-length.test.ts' },
    ])
    expect(arrayValueRequirements({ ...record, schema: 'custom' })).toBeNull()
    const receive = report.callables.find((c) => c.metadata.name === 'array_recv')!
    expect(receive.requirements).toContain('internal-interface')
    expect(receive.representedImmutableGap).toBe(false)
    for (const name of ['hash_array', 'hash_array_extended']) {
      const row = report.callables.find((c) => c.metadata.name === name)!
      expect(row.implementationPresent).toBe(true)
      expect(row.valueRequirements?.some((r) => r.requirement.includes('actual label OIDs'))).toBe(
        true,
      )
    }
    expect(report.types.find((t) => t.identity === 'pg_catalog._int4')).toMatchObject({
      represented: true,
      element: 'pg_catalog.int4',
    })
    expect(report.types.find((t) => t.identity === 'pg_catalog._tsvector')).toMatchObject({
      represented: true,
      element: 'pg_catalog.tsvector',
    })
    for (const [sql, code] of [
      ['CREATE TABLE invalid_aggregate(a integer[],CHECK(array_agg(a) IS NOT NULL))', '42803'],
      ['CREATE TABLE invalid_set(a integer[],CHECK(unnest(a)>0))', '0A000'],
    ] as const)
      await expect(pg.exec(sql)).rejects.toMatchObject({ code })
  } finally {
    await pg.close()
  }
}, 60_000)
