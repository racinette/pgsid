import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readCatalogCompositeTypes } from '../../../src/postgres/composite-types.js'
import { readTypeComparisons } from '../../../src/postgres/builtins/type-comparisons.js'

const schema = `CREATE TYPE phase AS ENUM('z','a');CREATE DOMAIN positive AS int4 NOT NULL CHECK(VALUE>0);
CREATE TYPE simple AS(n positive,label varchar(3) COLLATE "C",phase phase);
CREATE TYPE document AS(n int4,value json);CREATE TYPE nested AS(n int4,value document);
CREATE TYPE bags AS(n int4,value document[]);CREATE TYPE empty AS();
CREATE TYPE dropped AS(n int4,old_value json);ALTER TYPE dropped DROP ATTRIBUTE old_value;
CREATE TYPE privilege AS(value aclitem);CREATE DOMAIN approved AS simple;CREATE TYPE wrapped AS(value approved[]);`

it('captures selected record hashes and recursive type-cache availability before NULL field handling', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(schema)
    const graph = await readCatalogCompositeTypes(pg),
      nodes = new Map(graph.definitions.map((n) => [n.identity, n]))
    for (const id of [
      'public.simple',
      'public.empty',
      'public.dropped',
      'public.privilege',
      'public.approved',
      'public.wrapped',
    ])
      expect(nodes.get(id)!.comparison, id).toMatchObject({
        hash: 'function:["pg_catalog","hash_record"](pg_catalog.record)',
        hashExtended:
          'function:["pg_catalog","hash_record_extended"](pg_catalog.record,pg_catalog.int8)',
        hashAvailable: true,
        hashExtendedAvailable: true,
      })
    expect(nodes.get('public.positive')!.comparison).toMatchObject({
      hash: 'function:["pg_catalog","hashint4"](pg_catalog.int4)',
      hashExtended: 'function:["pg_catalog","hashint4extended"](pg_catalog.int4,pg_catalog.int8)',
      hashAvailable: true,
      hashExtendedAvailable: true,
    })
    expect(nodes.get('public.phase')!.comparison).toMatchObject({
      hash: 'function:["pg_catalog","hashenum"](pg_catalog.anyenum)',
      hashExtended:
        'function:["pg_catalog","hashenumextended"](pg_catalog.anyenum,pg_catalog.int8)',
      hashAvailable: true,
      hashExtendedAvailable: true,
    })
    for (const id of ['public.document', 'public.nested', 'public.bags', 'public._document'])
      expect(nodes.get(id)!.comparison, id).toMatchObject({
        hashAvailable: false,
        hashExtendedAvailable: false,
      })
    expect(nodes.get('pg_catalog."json"')!.comparison).toMatchObject({
      hash: null,
      hashExtended: null,
      hashAvailable: false,
      hashExtendedAvailable: false,
    })
    for (const type of ['document', 'nested', 'bags'])
      for (const fn of ['hash_record', 'hash_record_extended']) {
        await expect(
          pg.query(`SELECT ${fn}(NULL::${type}${fn.endsWith('extended') ? ',0::int8' : ''}) value`),
        ).resolves.toMatchObject({ rows: [{ value: null }] })
        await expect(
          pg.query(
            `SELECT ${fn}(ROW(1,NULL)::${type}${fn.endsWith('extended') ? ',0::int8' : ''})`,
          ),
        ).rejects.toMatchObject({ code: '42883' })
        await expect(
          pg.query(`SELECT ${fn}(ROW(NULL::${type})${fn.endsWith('extended') ? ',0::int8' : ''})`),
        ).rejects.toMatchObject({ code: '42883' })
      }
    expect(
      (
        await pg.query<{ a: number; b: string }>(
          `SELECT hash_record(ROW()::empty) a,hash_record_extended(ROW(NULL)::dropped,9223372036854775807)::text b`,
        )
      ).rows[0],
    ).toEqual({ a: 0, b: '0' })
    expect(
      (
        await pg.query<{ n: number }>(
          "SELECT count(*)::int n FROM pg_class WHERE relname LIKE '_pgsid_type_comparison_%'",
        )
      ).rows[0]!.n,
    ).toBe(0)
  } finally {
    await pg.close()
  }
}, 60_000)

it('captures independent 32-bit and extended hash availability without invoking custom value callbacks', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE SCHEMA "Hash.Types";CREATE TYPE "Hash.Types".leaf AS(n int4);
CREATE FUNCTION "Hash.Types".compare("Hash.Types".leaf,"Hash.Types".leaf) RETURNS int4 LANGUAGE sql IMMUTABLE STRICT AS $$SELECT CASE WHEN ($1).n<($2).n THEN -1 WHEN ($1).n>($2).n THEN 1 ELSE 0 END$$;
CREATE FUNCTION "Hash.Types".hash("Hash.Types".leaf) RETURNS int4 LANGUAGE plpgsql IMMUTABLE CALLED ON NULL INPUT AS $$BEGIN RAISE EXCEPTION 'hash callback executed';END$$;
CREATE FUNCTION "Hash.Types".extended("Hash.Types".leaf,int8) RETURNS int8 LANGUAGE plpgsql IMMUTABLE CALLED ON NULL INPUT AS $$BEGIN RAISE EXCEPTION 'extended hash callback executed';END$$;`)
    for (const [name, symbol] of [
      ['lt', '<'],
      ['le', '<='],
      ['eq', '='],
      ['ge', '>='],
      ['gt', '>'],
    ] as const) {
      await pg.exec(
        `CREATE FUNCTION "Hash.Types".${name}("Hash.Types".leaf,"Hash.Types".leaf) RETURNS bool LANGUAGE sql IMMUTABLE STRICT AS 'SELECT "Hash.Types".compare($1,$2) ${symbol} 0';CREATE OPERATOR "Hash.Types".${symbol}(LEFTARG="Hash.Types".leaf,RIGHTARG="Hash.Types".leaf,FUNCTION="Hash.Types".${name});`,
      )
    }
    await pg.exec(`CREATE OPERATOR CLASS "Hash.Types".leaf_order DEFAULT FOR TYPE "Hash.Types".leaf USING btree AS OPERATOR 1 "Hash.Types".<,OPERATOR 2 "Hash.Types".<=,OPERATOR 3 "Hash.Types".=,OPERATOR 4 "Hash.Types".>=,OPERATOR 5 "Hash.Types".>,FUNCTION 1 "Hash.Types".compare("Hash.Types".leaf,"Hash.Types".leaf);
CREATE OPERATOR CLASS "Hash.Types".leaf_hash DEFAULT FOR TYPE "Hash.Types".leaf USING hash AS OPERATOR 1 "Hash.Types".=,FUNCTION 1 "Hash.Types".hash("Hash.Types".leaf);`)
    const first = await readCatalogCompositeTypes(pg),
      support = first.definitions.find((n) => n.identity === '"Hash.Types".leaf')!.comparison!
    expect(support).toMatchObject({
      hashClass: '"Hash.Types".leaf_hash',
      hash: 'function:["Hash.Types","hash"]("Hash.Types".leaf)',
      hashExtended: null,
      hashAvailable: true,
      hashExtendedAvailable: false,
    })
    expect(
      (await pg.query<{ value: number }>('SELECT hash_record(ROW(NULL::"Hash.Types".leaf)) value'))
        .rows[0]!.value,
    ).toBe(0)
    await expect(
      pg.query('SELECT hash_record(ROW(ROW(1)::"Hash.Types".leaf))'),
    ).rejects.toMatchObject({ code: 'P0001' })
    await expect(
      pg.query('SELECT hash_record_extended(ROW(NULL::"Hash.Types".leaf),0)'),
    ).rejects.toMatchObject({ code: '42883' })
    await pg.exec(`DROP OPERATOR FAMILY "Hash.Types".leaf_hash USING hash CASCADE;
CREATE OPERATOR CLASS "Hash.Types".leaf_hash DEFAULT FOR TYPE "Hash.Types".leaf USING hash AS OPERATOR 1 "Hash.Types".=,FUNCTION 1 "Hash.Types".hash("Hash.Types".leaf),FUNCTION 2 "Hash.Types".extended("Hash.Types".leaf,int8);`)
    const second = await readCatalogCompositeTypes(pg),
      extended = second.definitions.find((n) => n.identity === '"Hash.Types".leaf')!.comparison!
    expect(extended).toMatchObject({
      hashExtended: 'function:["Hash.Types","extended"]("Hash.Types".leaf,pg_catalog.int8)',
      hashAvailable: true,
      hashExtendedAvailable: true,
    })
    expect(support.hashExtended).toBeNull()
    expect(
      (
        await pg.query<{ value: string }>(
          'SELECT hash_record_extended(ROW(NULL::"Hash.Types".leaf),-9223372036854775808)::text value',
        )
      ).rows[0]!.value,
    ).toBe('0')
    await expect(
      pg.query('SELECT hash_record_extended(ROW(ROW(1)::"Hash.Types".leaf),0)'),
    ).rejects.toMatchObject({ code: 'P0001' })
    await pg.exec('SET quote_all_identifiers=on;SET search_path=pg_catalog')
    expect(await readCatalogCompositeTypes(pg)).toEqual(second)
  } finally {
    await pg.close()
  }
}, 60_000)

it('keeps captured hash definitions portable across shifted catalog identities and independent snapshots', async () => {
  const first = await PGlite.create(),
    second = await PGlite.create()
  try {
    await first.exec(schema)
    await second.exec(
      "CREATE TYPE shifted AS ENUM('extra');" +
        schema +
        'SET quote_all_identifiers=on;SET search_path=pg_catalog',
    )
    const ids = await Promise.all(
      [first, second].map(
        async (pg) =>
          (await pg.query<{ value: number }>("SELECT 'public.phase'::regtype::oid::int value"))
            .rows[0]!.value,
      ),
    )
    expect(ids[0]).not.toBe(ids[1])
    const graphs = await Promise.all([first, second].map((pg) => readCatalogCompositeTypes(pg)))
    expect(graphs[0]).toEqual(graphs[1])
    const serialized = JSON.stringify(graphs[0])
    expect(serialized).not.toContain('"oid":')
    expect(serialized).not.toContain('valueOids')
    graphs[0]!.definitions.find((n) => n.identity === 'public.phase')!.comparison!.hash = null
    expect(
      graphs[1]!.definitions.find((n) => n.identity === 'public.phase')!.comparison!.hash,
    ).not.toBeNull()
    const baseline = await readTypeComparisons(first, [
      { identity: 'pg_catalog.int4', collation: null },
    ])
    expect(baseline[0]).not.toHaveProperty('hashAvailable')
    expect(baseline[0]).not.toHaveProperty('hashExtendedAvailable')
  } finally {
    await first.close()
    await second.close()
  }
}, 60_000)
