import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readCatalogCompositeTypes } from '../../../src/postgres/composite-types.js'

it('captures default comparison implementations and PostgreSQL recursive availability before NULL handling', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE DOMAIN positive AS int4 NOT NULL CHECK(VALUE>0);
CREATE TYPE simple AS(n positive,label varchar(3) COLLATE "C");
CREATE TYPE document AS(n int4,value json);CREATE TYPE nested AS(n int4,value document);
CREATE TYPE bags AS(n int4,value document[]);CREATE TYPE empty AS();
CREATE TYPE dropped AS(n int4,old_value json);ALTER TYPE dropped DROP ATTRIBUTE old_value;
CREATE TYPE privilege AS(value aclitem);`)
    const graph = await readCatalogCompositeTypes(pg),
      nodes = new Map(graph.definitions.map((n) => [n.identity, n]))
    expect(nodes.get('public.positive')!.comparison).toMatchObject({
      btreeClass: 'pg_catalog.int4_ops',
      equality: 'operator:["pg_catalog","="](pg_catalog.int4,pg_catalog.int4)',
      equalityImplementation: 'function:["pg_catalog","int4eq"](pg_catalog.int4,pg_catalog.int4)',
      comparator: 'function:["pg_catalog","btint4cmp"](pg_catalog.int4,pg_catalog.int4)',
      equalityAvailable: true,
      comparisonAvailable: true,
    })
    expect(nodes.get('pg_catalog."varchar"')!.comparison).toMatchObject({
      equalityImplementation: 'function:["pg_catalog","texteq"](pg_catalog.text,pg_catalog.text)',
      comparator: 'function:["pg_catalog","bttextcmp"](pg_catalog.text,pg_catalog.text)',
    })
    for (const identity of ['public.simple', 'public.empty', 'public.dropped'])
      expect(nodes.get(identity)!.comparison, identity).toMatchObject({
        equalityImplementation:
          'function:["pg_catalog","record_eq"](pg_catalog.record,pg_catalog.record)',
        comparator: 'function:["pg_catalog","btrecordcmp"](pg_catalog.record,pg_catalog.record)',
        equalityAvailable: true,
        comparisonAvailable: true,
      })
    for (const identity of ['public.document', 'public.nested', 'public.bags'])
      expect(nodes.get(identity)!.comparison, identity).toMatchObject({
        equalityImplementation:
          'function:["pg_catalog","record_eq"](pg_catalog.record,pg_catalog.record)',
        comparator: 'function:["pg_catalog","btrecordcmp"](pg_catalog.record,pg_catalog.record)',
        equalityAvailable: false,
        comparisonAvailable: false,
      })
    expect(nodes.get('public._document')!.comparison).toMatchObject({
      equalityImplementation:
        'function:["pg_catalog","array_eq"](pg_catalog.anyarray,pg_catalog.anyarray)',
      equalityAvailable: false,
      comparisonAvailable: false,
    })
    expect(nodes.get('pg_catalog."json"')!.comparison).toMatchObject({
      equality: null,
      comparator: null,
      equalityAvailable: false,
      comparisonAvailable: false,
    })
    expect(nodes.get('pg_catalog.aclitem')!.comparison).toMatchObject({
      btreeClass: null,
      hashClass: 'pg_catalog.aclitem_ops',
      equalityImplementation:
        'function:["pg_catalog","aclitemeq"](pg_catalog.aclitem,pg_catalog.aclitem)',
      comparator: null,
      equalityAvailable: true,
      comparisonAvailable: false,
    })
    expect(nodes.get('public.privilege')!.comparison).toMatchObject({
      equalityAvailable: true,
      comparisonAvailable: false,
    })
    for (const type of ['document', 'nested', 'bags']) {
      expect(
        (
          await pg.query<{ value: boolean }>(
            `SELECT ROW(1,NULL)::${type}=ROW(2,NULL)::${type} value`,
          )
        ).rows[0]!.value,
      ).toBe(false)
      await expect(
        pg.query(`SELECT ROW(1,NULL)::${type}=ROW(1,NULL)::${type}`),
      ).rejects.toMatchObject({ code: '42883' })
      await expect(
        pg.query(`SELECT ROW(1,NULL)::${type}<ROW(1,NULL)::${type}`),
      ).rejects.toMatchObject({ code: '42883' })
    }
    expect(
      (await pg.query<{ value: boolean }>('SELECT ROW(NULL)::dropped=ROW(NULL)::dropped value'))
        .rows[0]!.value,
    ).toBe(true)
    expect(
      (
        await pg.query<{ value: number }>(
          'SELECT count(*)::int value FROM pg_class WHERE relname LIKE $1',
          ['_pgsid_type_comparison_%'],
        )
      ).rows[0]!.value,
    ).toBe(0)
  } finally {
    await pg.close()
  }
}, 60_000)

it('captures custom default operator classes without executing field callbacks or depending on identifier rendering', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE SCHEMA "Compare.Types";CREATE TYPE "Compare.Types".stage AS ENUM('z','a');
CREATE TYPE sample AS(value "Compare.Types".stage);`)
    const before = await readCatalogCompositeTypes(pg)
    await pg.exec(`CREATE FUNCTION "Compare.Types".equal("Compare.Types".stage,"Compare.Types".stage) RETURNS bool LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN RAISE EXCEPTION 'field equality executed';END$$;
CREATE FUNCTION "Compare.Types".compare("Compare.Types".stage,"Compare.Types".stage) RETURNS int4 LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN RAISE EXCEPTION 'field ordering executed';END$$;`)
    for (const [name, symbol] of [
      ['less', '<'],
      ['less_equal', '<='],
      ['greater_equal', '>='],
      ['greater', '>'],
    ] as const)
      await pg.exec(
        `CREATE FUNCTION "Compare.Types".${name}("Compare.Types".stage,"Compare.Types".stage) RETURNS bool LANGUAGE sql IMMUTABLE STRICT AS 'SELECT "Compare.Types".compare($1,$2) ${symbol} 0'`,
      )
    for (const [name, fn] of [
      ['<', 'less'],
      ['<=', 'less_equal'],
      ['=', 'equal'],
      ['>=', 'greater_equal'],
      ['>', 'greater'],
    ] as const)
      await pg.exec(
        `CREATE OPERATOR "Compare.Types".${name}(LEFTARG="Compare.Types".stage,RIGHTARG="Compare.Types".stage,FUNCTION="Compare.Types".${fn})`,
      )
    await pg.exec(`CREATE OPERATOR CLASS "Compare.Types".stage_ops DEFAULT FOR TYPE "Compare.Types".stage USING btree AS
OPERATOR 1 "Compare.Types".<,OPERATOR 2 "Compare.Types".<=,OPERATOR 3 "Compare.Types".=,OPERATOR 4 "Compare.Types".>=,OPERATOR 5 "Compare.Types".>,FUNCTION 1 "Compare.Types".compare("Compare.Types".stage,"Compare.Types".stage);`)
    const graph = await readCatalogCompositeTypes(pg),
      stage = graph.definitions.find((n) => n.identity === '"Compare.Types".stage')!
    expect(stage.comparison).toMatchObject({
      btreeClass: '"Compare.Types".stage_ops',
      equality: 'operator:["Compare.Types","="]("Compare.Types".stage,"Compare.Types".stage)',
      equalityImplementation:
        'function:["Compare.Types","equal"]("Compare.Types".stage,"Compare.Types".stage)',
      comparator:
        'function:["Compare.Types","compare"]("Compare.Types".stage,"Compare.Types".stage)',
      equalityAvailable: true,
      comparisonAvailable: true,
    })
    expect(before.definitions.find((n) => n.identity === stage.identity)!.comparison).not.toEqual(
      stage.comparison,
    )
    expect(
      (await pg.query<{ value: boolean }>('SELECT ROW(NULL)::sample=ROW(NULL)::sample value'))
        .rows[0]!.value,
    ).toBe(true)
    await expect(pg.query("SELECT ROW('z')::sample=ROW('a')::sample")).rejects.toMatchObject({
      code: 'P0001',
    })
    await expect(pg.query("SELECT ROW('z')::sample<ROW('a')::sample")).rejects.toMatchObject({
      code: 'P0001',
    })
    await pg.exec('SET quote_all_identifiers=on;SET search_path=pg_catalog;')
    const savedPath = (
      await pg.query<{ value: string }>("SELECT current_setting('search_path') value")
    ).rows[0]!.value
    expect(await readCatalogCompositeTypes(pg)).toEqual(graph)
    expect(
      (await pg.query<{ value: string }>("SELECT current_setting('quote_all_identifiers') value"))
        .rows[0]!.value,
    ).toBe('on')
    expect(
      (await pg.query<{ value: string }>("SELECT current_setting('search_path') value")).rows[0]!
        .value,
    ).toBe(savedPath)
  } finally {
    await pg.close()
  }
}, 60_000)

it('selects base record support for domain arrays even when a domain-only default class exists', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE leaf AS(n int4);CREATE DOMAIN approved AS leaf CHECK((VALUE).n>0);
CREATE FUNCTION domain_equal(approved,approved) RETURNS bool LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN RAISE EXCEPTION 'domain equality callback';END$$;
CREATE FUNCTION domain_compare(approved,approved) RETURNS int4 LANGUAGE plpgsql IMMUTABLE STRICT AS $$BEGIN RAISE EXCEPTION 'domain ordering callback';END$$;`)
    for (const [name, symbol] of [
      ['less', '<'],
      ['less_equal', '<='],
      ['greater_equal', '>='],
      ['greater', '>'],
    ])
      await pg.exec(
        `CREATE FUNCTION domain_${name}(approved,approved) RETURNS bool LANGUAGE sql IMMUTABLE STRICT AS 'SELECT domain_compare($1,$2) ${symbol} 0'`,
      )
    for (const [symbol, fn] of [
      ['<', 'less'],
      ['<=', 'less_equal'],
      ['=', 'equal'],
      ['>=', 'greater_equal'],
      ['>', 'greater'],
    ])
      await pg.exec(
        `CREATE OPERATOR public.${symbol}(LEFTARG=approved,RIGHTARG=approved,FUNCTION=domain_${fn})`,
      )
    await pg.exec(
      `CREATE OPERATOR CLASS approved_ops DEFAULT FOR TYPE approved USING btree AS OPERATOR 1 public.<,OPERATOR 2 public.<=,OPERATOR 3 public.=,OPERATOR 4 public.>=,OPERATOR 5 public.>,FUNCTION 1 domain_compare(approved,approved);`,
    )
    const graph = await readCatalogCompositeTypes(pg),
      nodes = new Map(graph.definitions.map((n) => [n.identity, n]))
    expect(nodes.get('public.approved')!.comparison).toEqual(nodes.get('public.leaf')!.comparison)
    expect(nodes.get('public.approved')!.comparison).toMatchObject({
      btreeClass: 'pg_catalog.record_ops',
      equalityImplementation:
        'function:["pg_catalog","record_eq"](pg_catalog.record,pg_catalog.record)',
      comparisonAvailable: true,
    })
    expect(
      (
        await pg.query<{ value: boolean }>(
          `SELECT ARRAY[ROW(1)::approved]=ARRAY[ROW(1)::approved] value`,
        )
      ).rows[0]!.value,
    ).toBe(true)
    expect(
      (
        await pg.query<{ value: boolean }>(
          `SELECT ARRAY[ROW(1)::approved]<ARRAY[ROW(2)::approved] value`,
        )
      ).rows[0]!.value,
    ).toBe(true)
  } finally {
    await pg.close()
  }
})
