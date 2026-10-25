import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../../src/codegen/shared/check-rust-source.js'

it('captures recursive logical constants independently of deployment OIDs and later domain checks', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted)
        await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int4)")
      await pg.exec(`CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);
        CREATE TYPE loose_span AS RANGE(subtype=int4);
        CREATE TYPE positive_span AS RANGE(subtype=positive);
        CREATE TYPE payload AS(v positive,spans loose_span[],groups int4multirange,span positive_span);
        CREATE TYPE result_row AS(n int4,old payload);`)
      const text = (
          await pg.query<{ value: string }>(
            `SELECT (ROW(1::positive,ARRAY['[1,3]'::loose_span,NULL],'{[1,3),[5,9)}'::int4multirange,'[1,3)'::positive_span)::payload)::text value`,
          )
        ).rows[0]!.value,
        quote = (s: string) => "'" + s.replaceAll("'", "''") + "'"
      await pg.exec(`CREATE TABLE history(n int4,CHECK(ROW(n,${quote(text)}::payload)::result_row IS NOT NULL));
        ALTER TYPE result_row DROP ATTRIBUTE old;
        ALTER DOMAIN positive ADD CHECK(VALUE>=10);`)
      const c = await snapshotCatalog(pg),
        t = c.tables.find((t) => t.name === 'history')!,
        k = t.constraints[0]!
      expect(k.rowCoercionContext?.complete).toBe(true)
      const serialized = JSON.stringify(k.rowCoercionContext)
      for (const marker of [
        'PgsidStoredRecordConstant',
        'PgsidStoredArrayConstant',
        'PgsidStoredRangeConstant',
        'PgsidStoredMultirangeConstant',
      ])
        expect(serialized).toContain(marker)
      expect(serialized).not.toMatch(/"\w*oid\w*":/iu)
      for (const origin of ['source', 'stored'] as const) {
        const expression = lowerTableCheck(
            t,
            k,
            c.enums,
            c.domains,
            origin,
            c.rangeTypes,
            c.compositeTypeGraph,
          )!.expression,
          group = prepareCheckRustGroup(
            [
              {
                expression,
                identity: { schema: 'public', kind: 'table', owner: 'history', constraint: origin },
              },
            ],
            { defaultCollation: 'C', serverEncoding: 'UTF8' },
          )
        expect(expression.kind).not.toBe('uncertain')
        expect(JSON.stringify(expression)).not.toContain('"kind":"domain-cast"')
        expect(group.checks[0]!.kind).toBe('supported')
      }
      await pg.exec('INSERT INTO history VALUES(1)')
      await expect(pg.exec(`SELECT ${quote(text)}::payload`)).rejects.toMatchObject({
        code: '23514',
      })
      contexts.push(k.rowCoercionContext)
      ids.push((await pg.query<{ oid: number }>("SELECT 'payload'::regtype::oid oid")).rows[0]!.oid)
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30_000)
