import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { callableIdentity } from '../../src/postgres/builtins/catalog.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { supportsTextCallableCollation } from '../../src/sql-semantics/collation.js'

describe('temporal field collation', () => {
  it('limits collation-independent field decoding to the represented immutable overloads', () => {
    const callables = builtinCallables().filter(
      (item) =>
        item.kind === 'function' &&
        ['date_trunc', 'extract', 'date_part', 'date_add', 'date_subtract'].includes(item.name),
    )
    const supported = callables.filter((item) =>
      supportsTextCallableCollation(callableIdentity(item), 'other'),
    )
    expect(supported).toHaveLength(14)
    for (const item of supported) {
      expect(item).toMatchObject({
        kind: 'function',
        schema: 'pg_catalog',
        strict: true,
        volatility: 'i',
        returnsSet: false,
      })
      for (const collation of [undefined, 'C', 'deterministic', 'other'])
        expect(supportsTextCallableCollation(callableIdentity(item), collation)).toBe(true)
    }
    for (const item of callables.filter((item) => !supported.includes(item)))
      expect(supportsTextCallableCollation(callableIdentity(item), 'deterministic')).toBe(false)
  })

  it('binds raw and stored fields and zone names independently of text collation', async () => {
    const pg = await PGlite.create()
    try {
      await pg.exec(`
        SET TimeZone = 'UTC';
        CREATE COLLATION public.insensitive (provider = icu, locale = 'und', deterministic = false);
        CREATE COLLATION public.other_collation (provider = icu, locale = 'und', deterministic = true);
      `)
      const collations = [
        '',
        ' COLLATE pg_catalog."C"',
        ' COLLATE public.insensitive',
        ' COLLATE public.other_collation',
      ]
      const expressions = {
        truncate_local: "pg_catalog.date_trunc(unit_name, local_time) = timestamp '2000-01-01'",
        truncate_zone:
          "pg_catalog.date_trunc(unit_name, absolute_time, zone_name) = timestamptz '2000-01-01 00:00:00+00'",
        extract_date: 'pg_catalog.extract(unit_name, day_value) = 2000::numeric',
        extract_timestamp: 'pg_catalog.extract(unit_name, local_time) = 2000::numeric',
        extract_clock: 'pg_catalog.extract(clock_unit, clock_value) = 56.123456::numeric',
        extract_zoned_clock: 'pg_catalog.extract(clock_unit, zoned_clock) = 56.123456::numeric',
        extract_span: 'pg_catalog.extract(unit_name, duration) = 2::numeric',
        legacy_clock: 'pg_catalog.date_part(clock_unit, clock_value) = 56.123456::float8',
        legacy_zoned_clock: 'pg_catalog.date_part(clock_unit, zoned_clock) = 56.123456::float8',
        legacy_span: 'pg_catalog.date_part(unit_name, duration) = 2::float8',
        legacy_timestamp: 'pg_catalog.date_part(clock_unit, local_time) = 56.123456::float8',
        calendar_add:
          "pg_catalog.date_add(absolute_time,interval '1 day',zone_name) = timestamptz '2000-08-26 12:00+00'",
        calendar_subtract:
          "pg_catalog.date_subtract(absolute_time,interval '1 day',zone_name) = timestamptz '2000-08-24 12:00+00'",
        truncate_span: "pg_catalog.date_trunc(unit_name,duration) = interval '2 years'",
      }
      for (const [index, collation] of collations.entries())
        await pg.exec(`CREATE TABLE public.field_checks_${index} (
          unit_name text${collation}, clock_unit text${collation}, zone_name text COLLATE public.other_collation,
          local_time timestamp, absolute_time timestamptz, day_value date,
          clock_value time, zoned_clock timetz, duration interval,
          ${Object.entries(expressions)
            .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
            .join(',')}
        )`)
      const catalog = await snapshotCatalog(pg)
      for (const table of catalog.tables.filter((table) => table.name.startsWith('field_checks_')))
        for (const [name, sql] of Object.entries(expressions))
          for (const constraint of [
            { name, type: 'check' as const, definition: `CHECK (${sql})` },
            table.constraints.find((constraint) => constraint.name === name)!,
          ])
            expect(
              lowerTableCheck(table, constraint, [], catalog.domains)?.expression.kind,
              `${table.name}.${name}: ${constraint.definition}`,
            ).toBe('eval-scalar')
      const table = catalog.tables.find((table) => table.name === 'field_checks_0')!
      const conflicting =
        'pg_catalog.date_trunc(unit_name COLLATE pg_catalog."C", absolute_time, zone_name COLLATE public.other_collation) IS NOT NULL'
      expect(
        lowerTableCheck(table, {
          name: 'conflict',
          type: 'check',
          definition: `CHECK (${conflicting})`,
        })?.expression,
      ).toEqual({ kind: 'uncertain' })
      await expect(
        pg.query(
          `SELECT pg_catalog.date_trunc('year' COLLATE pg_catalog."C", timestamptz '2000-08-25 12:00+00', 'UTC' COLLATE public.other_collation)`,
        ),
      ).rejects.toMatchObject({ code: '42P21' })
      for (const collation of collations) {
        const result = (
          await pg.query(`SELECT ${Object.entries(expressions)
            .map(([name, sql]) => `(${sql}) AS ${name}`)
            .join(',')}
            FROM (SELECT 'YEAR'::text${collation} unit_name, 'SECOND'::text${collation} clock_unit,
              'UTC'::text${collation} zone_name, timestamp '2000-08-25 12:34:56.123456' local_time,
              timestamptz '2000-08-25 12:00+00' absolute_time, date '2000-08-25' day_value,
              time '12:34:56.123456' clock_value,timetz '12:34:56.123456-05:30' zoned_clock,
              interval '2 years 3 months 4 days 12:34:56.123456' duration) inputs`)
        ).rows[0]
        expect(result).toEqual(
          Object.fromEntries(Object.keys(expressions).map((name) => [name, true])),
        )
      }
    } finally {
      await pg.close()
    }
  })
})
