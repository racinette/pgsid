import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readCatalogCompositeTypes } from '../../src/postgres/composite-types.js'
import { catalogCompositeType } from '../../src/sql-semantics/composite-profiles.js'
import { anonymousRecordType } from '../../src/sql-semantics/anonymous-records.js'
import {
  recordFieldHashSupport,
  recordHashLayouts,
} from '../../src/codegen/shared/check-record-hash.js'

it('distinguishes direct record layouts from field support and recursively missing classes', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      'CREATE TYPE good AS(n int4);CREATE TYPE bad AS(doc json);CREATE TYPE nested AS(child bad);CREATE TYPE bags AS(items bad[]);CREATE TYPE mixed AS(n int4,child good);',
    )
    const graph = await readCatalogCompositeTypes(pg)
    for (const name of ['bad', 'nested', 'bags']) {
      const type = catalogCompositeType('public.' + name, graph)!
      expect(recordFieldHashSupport(type, false).availability, name).toBe(0)
      expect(recordFieldHashSupport('array:' + type, true).availability, name).toBe(0)
      const outer = anonymousRecordType([{ type }])
      expect(recordHashLayouts(outer, false)![0]!.fields[0]!.availability).toBe(0)
    }
    const good = catalogCompositeType('public.good', graph)!,
      anonymous = anonymousRecordType([{ type: 'pg_catalog.int4' }])
    expect(recordFieldHashSupport(good, false).availability).toBe(1)
    expect(recordFieldHashSupport(anonymous, false).availability).toBe(0)
    expect(recordHashLayouts(anonymous, false)![0]!.fields[0]!.availability).toBe(1)
    expect(
      recordHashLayouts(
        anonymousRecordType([{ type: 'pg_catalog.text', unknown: true }]),
        false,
      )![0]!.fields[0]!.availability,
    ).toBe(0)
    const changed = structuredClone(graph),
      support = changed.definitions.find((n) => n.identity === 'public.good')!.comparison!
    support.hashAvailable = false
    support.hash = 'function:["public","custom_hash"](public.good)'
    const uncertain = catalogCompositeType('public.good', changed)!
    expect(recordFieldHashSupport(uncertain, false).availability).toBe(-1)
    expect(recordFieldHashSupport(uncertain, true).availability).toBe(1)
    expect(recordFieldHashSupport(good, false).availability).toBe(1)
    support.hash = 'function:["pg_catalog","hash_record"](pg_catalog.record)'
    expect(
      recordFieldHashSupport(catalogCompositeType('public.good', changed)!, false).availability,
    ).toBe(-1)
  } finally {
    await pg.close()
  }
}, 60_000)

it('defers contradictory cached hash observations when a selected callback remains present', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE custom AS(n int4);
CREATE FUNCTION custom_hash(custom) RETURNS int4 LANGUAGE sql IMMUTABLE CALLED ON NULL INPUT AS 'SELECT 17';
CREATE OPERATOR CLASS custom_hash DEFAULT FOR TYPE custom USING hash AS OPERATOR 1 =(record,record),FUNCTION 1 custom_hash(custom);`)
    expect(
      (await pg.query<{ value: number }>('SELECT hash_record(ROW(NULL::custom)) value')).rows[0]!
        .value,
    ).toBe(0)
    const graph = await readCatalogCompositeTypes(pg),
      support = graph.definitions.find((n) => n.identity === 'public.custom')!.comparison!,
      type = catalogCompositeType('public.custom', graph)!
    expect(support.hashAvailable).toBe(false)
    expect(support.hash).not.toBeNull()
    await expect(pg.query('SELECT hash_record(ROW(NULL::custom))')).rejects.toMatchObject({
      code: '42883',
    })
    expect(recordFieldHashSupport(type, false).availability).toBe(-1)
  } finally {
    await pg.close()
  }
}, 60_000)
