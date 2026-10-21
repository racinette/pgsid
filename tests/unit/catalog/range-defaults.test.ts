import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { readCatalogRangeTypes } from '../../../src/postgres/range-types.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../../scripts/check-measurements/probes.js'
import { customDefaultSchema } from '../../sql-semantics/check-custom-range-default-fixtures.js'

it('captures qualified stored defaults independently of search paths and catalog OIDs', async () => {
  const first = await PGlite.create(),
    second = await PGlite.create()
  try {
    await first.exec(customDefaultSchema)
    await second.exec('CREATE TABLE discarded(v int4);DROP TABLE discarded;' + customDefaultSchema)
    const captures = []
    for (const pg of [first, second]) {
      await pg.exec('SET search_path TO "Default.Range",public')
      const profiles = await readCatalogRangeTypes(pg, ['Default.Range'])
      expect((await pg.query("SELECT current_setting('search_path') value")).rows).toEqual([
        { value: '"Default.Range", public' },
      ])
      const span = profiles.find((p) => p.name === 'span')!
      expect(span.callables!.find((c) => c.name === 'closed')!.defaultExprs).toEqual([
        '1',
        '3',
        "'[]'::text",
      ])
      expect(span.callables!.find((c) => c.name === 'pack')!.defaultExprs).toEqual([
        '\'[1,3)\'::"Default.Range".span',
      ])
      expect(span.callables!.find((c) => c.name === 'many')!.defaultExprs).toEqual([
        'ARRAY[\'[1,3)\'::"Default.Range".span, \'[5,7)\'::"Default.Range".span]',
      ])
      captures.push(profiles.map((p) => p.callables))
    }
    expect(captures[0]).toEqual(captures[1])
    expect(
      (await first.query(`SELECT '"Default.Range".span'::regtype::oid value`)).rows[0],
    ).not.toEqual((await second.query(`SELECT '"Default.Range".span'::regtype::oid value`)).rows[0])
  } finally {
    await first.close()
    await second.close()
  }
}, 30_000)

it('rejects missing, malformed, column-referencing and recursive omitted defaults while retaining fully supplied calls', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      customDefaultSchema +
        'CREATE TABLE default_sources(start_position int4,finish_position int4,bypass bool);',
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables[0]!
    for (const expressions of [
      undefined,
      [],
      ['bad syntax'],
      ['start_position', '3', "'[]'::text"],
      ['lower("Default.Range".closed())', '3', "'[]'::text"],
      ['(SELECT 1)', '3', "'[]'::text"],
    ]) {
      const profiles = catalog.rangeTypes.map((p) => ({
        ...p,
        callables: p.callables!.map((c) =>
          c.name === 'closed' ? { ...c, defaultExprs: expressions } : c,
        ),
      }))
      for (const [call, uncertain] of [
        ['"Default.Range".closed(hi=>finish_position)', true],
        ['"Default.Range".closed(start_position,finish_position,\'[)\')', false],
      ] as const) {
        const expression = lowerTableCheck(
          table,
          {
            name: 'test',
            type: 'check',
            definition: `CHECK(CASE WHEN bypass THEN true ELSE isempty(${call}) END)`,
          },
          catalog.enums,
          catalog.domains,
          'source',
          profiles,
        )!.expression
        expect(hasUncertain(expression), JSON.stringify(expressions) + '/' + call).toBe(uncertain)
      }
    }
  } finally {
    await pg.close()
  }
}, 30_000)
