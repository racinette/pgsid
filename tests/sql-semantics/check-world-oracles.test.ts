import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { WorldCheckOracles } from './check-world-oracles.js'
import { parseSql } from '../../src/ast.js'
import { deparseWorldSql } from '../../scripts/check-measurements/worlds.js'

it('preserves parsed string bytes in seeded worlds and CHECK oracles', async () => {
  const pg = await PGlite.create()
  try {
    for (const input of [
      'a\nb',
      'a\rb',
      'a\r\nb',
      'a\tb',
      'a\bb\fc',
      'a\\nb',
      "a'b",
      '',
      'é😊',
      'a\\\nb',
    ]) {
      const original = `SELECT $sample$${input}$sample$ value,0 n,NULL absent,true flag,1.25 amount`
      const statement = (await parseSql(original)).stmts![0]!.stmt!
      const sql = deparseWorldSql(statement)
      expect((await pg.query(sql)).rows).toEqual((await pg.query(original)).rows)
    }
    const oracles = new WorldCheckOracles()
    await oracles.load(
      pg,
      `CREATE TABLE text_bytes(payload text,expected text,
      CONSTRAINT exact CHECK(payload=E'first\\nsecond\\tend\\r'),
      CONSTRAINT same CHECK(payload=expected));
      INSERT INTO text_bytes VALUES(E'first\\nsecond\\tend\\r',E'first\\nsecond\\tend\\r');`,
      'public',
    )
    expect((await pg.query('SELECT payload FROM text_bytes')).rows).toEqual([
      { payload: 'first\nsecond\tend\r' },
    ])
    for (const constraint of ['exact', 'same']) {
      const sql = oracles.expression('public.text_bytes.' + constraint, 'candidate')
      expect((await pg.query(`SELECT ${sql} value FROM text_bytes candidate`)).rows).toEqual([
        { value: true },
      ])
    }
    await expect(
      pg.exec("INSERT INTO text_bytes VALUES('first\\nsecond\\tend\\r','first\\nsecond\\tend\\r')"),
    ).rejects.toMatchObject({ code: '23514' })
  } finally {
    await pg.close()
  }
})

it('retains XML indentation in world schemas, parsed CHECK oracles and serialization types', async () => {
  const pg = await PGlite.create()
  try {
    for (const mode of ['CONTENT', 'DOCUMENT'])
      for (const type of ['text', 'varchar(100)'])
        for (const indent of ['INDENT', 'NO INDENT']) {
          const original = `SELECT XMLSERIALIZE(${mode} '<r><a/></r>'::xml AS ${type} ${indent}) value`
          const statement = (await parseSql(original)).stmts![0]!.stmt!
          expect((await pg.query(deparseWorldSql(statement))).rows).toEqual(
            (await pg.query(original)).rows,
          )
        }
    const oracles = new WorldCheckOracles()
    await oracles.load(
      pg,
      `CREATE TABLE xml_previews(payload xml,expected text,
      CONSTRAINT pretty CHECK(XMLSERIALIZE(CONTENT payload AS text INDENT)=expected));
      INSERT INTO xml_previews VALUES('<r><a/></r>',E'<r>\\n  <a/>\\n</r>');`,
      'public',
    )
    const expression = oracles.expression('public.xml_previews.pretty', 'candidate')
    expect((await pg.query(`SELECT ${expression} value FROM xml_previews candidate`)).rows).toEqual(
      [{ value: true }],
    )
    expect((await pg.query('SELECT expected FROM xml_previews')).rows).toEqual([
      { expected: '<r>\n  <a/>\n</r>' },
    ])
  } finally {
    await pg.close()
  }
})

it('preserves named whole-row overloads, column shadowing and schema-qualified owners in parsed oracles', async () => {
  const pg = await PGlite.create(),
    oracles = new WorldCheckOracles()
  try {
    await pg.exec('CREATE SCHEMA "Oracle.Rows";SET search_path="Oracle.Rows",public')
    await oracles.load(
      pg,
      `CREATE TABLE "Rows.Name"(n int4,"__pgsid_row" text,
      CONSTRAINT old_builtin CHECK(to_jsonb("Rows.Name") IS NOT NULL),
      CONSTRAINT qualified CHECK((to_jsonb("Oracle.Rows"."Rows.Name".*)->>'n')::int4>=0),
      CONSTRAINT expanded CHECK((to_jsonb(ROW("Oracle.Rows"."Rows.Name".*))->>'f1')::int4>=0));
      CREATE FUNCTION to_jsonb("Rows.Name") RETURNS jsonb LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT NULL::jsonb';
      ALTER TABLE "Rows.Name" ADD CONSTRAINT selected CHECK(to_jsonb("Rows.Name") IS NULL) NOT VALID;
      CREATE FUNCTION accepted("Rows.Name") RETURNS bool LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT ($1).n>=0';
      ALTER TABLE "Rows.Name" ADD CONSTRAINT computed CHECK("Rows.Name".accepted) NOT VALID;
      CREATE TABLE shadow(shadow int4,n int4,
        CONSTRAINT scalar CHECK(to_jsonb(shadow) IS NOT NULL),
        CONSTRAINT whole CHECK((pg_catalog.to_jsonb(shadow.*)->>'n')::int4>=0));
      CREATE TABLE tableoid(n int4,CONSTRAINT system_value CHECK((to_jsonb(tableoid)->>'n')::int4>=0),CONSTRAINT whole_value CHECK((to_jsonb(tableoid.*)->>'n')::int4>=0));
      CREATE TABLE system_parent(n int4,CONSTRAINT system_present CHECK(tableoid='"Oracle.Rows".system_parent'::regclass));
      CREATE TABLE system_child(extra int4) INHERITS(system_parent);`,
      'Oracle.Rows',
    )
    for (const [n, label, results] of [
      [1, 'x', [true, true, true, true, true]],
      [-1, 'x', [true, false, false, true, false]],
      [null, null, [true, null, null, true, null]],
    ] as const) {
      const sql = ['old_builtin', 'qualified', 'expanded', 'selected', 'computed']
          .map(
            (c, i) => oracles.expression('Oracle.Rows.Rows.Name.' + c, 'candidate') + ' AS c' + i,
          )
          .join(','),
        result = (
          await pg.query<Record<string, boolean | null>>(
            `SELECT ${sql} FROM (SELECT $1::int4 n,$2::text AS "__pgsid_row") candidate`,
            [n, label],
          )
        ).rows[0]!
      expect(Object.values(result)).toEqual(results)
      const insert = pg.query('INSERT INTO "Rows.Name" VALUES($1,$2)', [n, label])
      if (n !== null && n < 0) await expect(insert).rejects.toMatchObject({ code: '23514' })
      else await insert
    }
    const scalar = oracles.expression('Oracle.Rows.shadow.scalar', 'candidate'),
      whole = oracles.expression('Oracle.Rows.shadow.whole', 'candidate'),
      result = (
        await pg.query<{ scalar: boolean; whole: boolean }>(
          `SELECT ${scalar} scalar,${whole} whole FROM(SELECT NULL::int4 shadow,1::int4 n) candidate`,
        )
      ).rows[0]!
    expect(result).toEqual({ scalar: false, whole: true })
    const system = oracles.expression('Oracle.Rows.tableoid.system_value', 'candidate'),
      table = oracles.expression('Oracle.Rows.tableoid.whole_value', 'candidate'),
      systemResult = (
        await pg.query<{ system: boolean | null; whole: boolean }>(
          `SELECT ${system} system,${table} whole FROM(SELECT -1::int4 n) candidate`,
        )
      ).rows[0]!
    expect(systemResult).toEqual({ system: null, whole: false })
    for (const [relation, expected] of [
      ['system_parent', true],
      ['system_child', false],
    ] as const) {
      const expr = oracles.expression('Oracle.Rows.' + relation + '.system_present', 'candidate')
      expect(
        (
          await pg.query<{ value: boolean }>(
            `SELECT ${expr} value FROM(SELECT 1::int4 n) candidate`,
          )
        ).rows[0]!.value,
      ).toBe(expected)
      const insert = pg.exec(`INSERT INTO ${relation}(n) VALUES(1)`)
      if (expected) await insert
      else await expect(insert).rejects.toMatchObject({ code: '23514' })
    }
  } finally {
    await pg.close()
  }
}, 60_000)

it('retains quoted CHECK row owners for star expansion and qualified fields in parsed oracle bodies', async () => {
  const pg = await PGlite.create()
  try {
    const oracles = new WorldCheckOracles()
    await pg.exec('CREATE SCHEMA "Oracle.Owner";SET search_path="Oracle.Owner",public')
    await oracles.load(
      pg,
      `CREATE TABLE "Rows.Name"(n int4,expected int4,bypass bool,
      CONSTRAINT expanded CHECK(CASE WHEN bypass THEN true ELSE (to_jsonb(ROW("Rows.Name".*))->>'f1')::int4 IS NOT DISTINCT FROM expected END),
      CONSTRAINT qualified CHECK(CASE WHEN bypass THEN true ELSE "Rows.Name".n>=0 END));`,
      'Oracle.Owner',
    )
    for (const [n, expected, bypass, results] of [
      [1, 1, false, [true, true]],
      [1, 2, false, [false, true]],
      [-1, -1, false, [true, false]],
      [null, null, false, [true, null]],
      [-1, 2, true, [true, true]],
    ] as const) {
      const expressions = ['expanded', 'qualified'].map((name) =>
          oracles.expression('Oracle.Owner.Rows.Name.' + name, 'candidate'),
        ),
        row = (
          await pg.query<Record<string, boolean | null>>(
            `SELECT ${expressions.map((e, i) => e + ' AS result' + i).join(',')} FROM (SELECT $1::int4 n,$2::int4 expected,$3::bool bypass) candidate`,
            [n, expected, bypass],
          )
        ).rows[0]!
      expect(Object.values(row)).toEqual(results)
      const insert = pg.query('INSERT INTO "Rows.Name" VALUES($1,$2,$3)', [n, expected, bypass])
      if (results.some((v) => v === false))
        await expect(insert).rejects.toMatchObject({ code: '23514' })
      else await insert
    }
  } finally {
    await pg.close()
  }
})

it('retains CHECK constants parsed before domain changes in table and column constraints and ALTER additions', async () => {
  const pg = await PGlite.create()
  try {
    const oracles = new WorldCheckOracles()
    await pg.exec('CREATE SCHEMA "Oracle.World";SET search_path="Oracle.World",public')
    await oracles.load(
      pg,
      `SET search_path=public;
       CREATE DOMAIN bound AS int4 CHECK(VALUE>0);
       CREATE TYPE span AS RANGE(subtype=bound);
       CREATE TABLE public.witness (
         position int CONSTRAINT column_check CHECK(position IS DISTINCT FROM 7),
         payload text,bypass bool,
         CONSTRAINT saved_literal CHECK(CASE WHEN bypass THEN true ELSE lower('[1,3]'::span)<=position END));
       ALTER TABLE public.witness ADD CONSTRAINT runtime_cast CHECK(CASE WHEN bypass THEN true ELSE isempty(payload::span) END);
       CREATE TABLE public.child(extra int) INHERITS(public.witness);
       CREATE TABLE public.grandchild(other text) INHERITS(public.child);
       ALTER DOMAIN bound ADD CONSTRAINT tighter CHECK(VALUE>2) NOT VALID;`,
      'Oracle.World',
    )
    for (const [position, payload, bypass, expected] of [
      [1, 'empty', false, [true, true, true]],
      [0, 'empty', false, [true, false, true]],
      [7, 'empty', false, [false, true, true]],
      [null, null, false, [true, null, null]],
      [0, 'bad', true, [true, true, true]],
    ] as const) {
      const expressions = ['column_check', 'saved_literal', 'runtime_cast'].map((name) =>
        oracles.expression(`Oracle.World.witness.${name}`, 'candidate'),
      )
      const row = (
        await pg.query<Record<string, boolean | null>>(
          `WITH candidate AS MATERIALIZED (SELECT $1::int position,$2::text payload,$3::bool bypass)
           SELECT ${expressions.map((expr, i) => `${expr} AS result${i}`).join(',')} FROM candidate`,
          [position, payload, bypass],
        )
      ).rows[0]!
      expect(Object.values(row)).toEqual(expected)
      if (expected.some((value) => value === false))
        await expect(
          pg.query('INSERT INTO witness VALUES($1,$2,$3)', [position, payload, bypass]),
        ).rejects.toMatchObject({ code: '23514' })
      else await pg.query('INSERT INTO witness VALUES($1,$2,$3)', [position, payload, bypass])
      for (const relation of ['child', 'grandchild']) {
        const expression = oracles.expression(`Oracle.World.${relation}.saved_literal`, 'candidate')
        expect(
          (
            await pg.query<{ value: boolean | null }>(
              `SELECT ${expression} value FROM (SELECT $1::int position,$2::text payload,$3::bool bypass,0 extra,'' other) candidate`,
              [position, payload, bypass],
            )
          ).rows[0]!.value,
        ).toBe(expected[1])
      }
    }
    await expect(pg.exec(`SELECT lower('[1,3]'::span)`)).rejects.toMatchObject({ code: '23514' })
    const expression = oracles.expression('Oracle.World.witness.runtime_cast', 'candidate')
    for (const [payload, code] of [
      ['bad', '22P02'],
      ['[1,3]', '23514'],
    ] as const) {
      await expect(
        pg.query(
          `SELECT ${expression} FROM (SELECT 1 position,$1::text payload,false bypass) candidate`,
          [payload],
        ),
      ).rejects.toMatchObject({ code })
      await expect(
        pg.query('INSERT INTO witness VALUES(1,$1,false)', [payload]),
      ).rejects.toMatchObject({ code })
    }
    const catalog = await snapshotCatalog(pg)
    expect(catalog.tables.map((table) => [table.schema, table.name])).toEqual([
      ['Oracle.World', 'child'],
      ['Oracle.World', 'grandchild'],
      ['Oracle.World', 'witness'],
    ])
    expect(catalog.functions.some((fn) => fn.name.startsWith('pgsid_check_'))).toBe(false)
    expect(() => oracles.expression('Oracle.World.witness.missing', 'candidate')).toThrow(
      'Missing parsed world CHECK oracle',
    )
  } finally {
    await pg.close()
  }
})

it('keeps runtime casts as column expressions so strict NULL arguments and later errors cannot prune earlier input errors', async () => {
  const pg = await PGlite.create()
  try {
    const oracles = new WorldCheckOracles()
    await oracles.load(
      pg,
      `CREATE TABLE null_arguments(payload text,pretty bool,CONSTRAINT valid CHECK(array_to_json(payload::json[],pretty) IS NULL));
       CREATE TABLE error_order(payload text,divisor int,CONSTRAINT valid CHECK(json_build_array(payload::json[],1/divisor) IS NULL));
       CREATE TABLE overflow_input(payload text,reading int,CONSTRAINT valid CHECK(cardinality(ARRAY[float8_accum(payload::numeric[],reading)])=0));`,
      'public',
    )
    for (const [relation, values, code] of [
      ['null_arguments', `'bad'::text payload,NULL::bool pretty`, '22P02'],
      ['error_order', `'bad'::text payload,0 divisor`, '22P02'],
      ['overflow_input', `'{1e9999,0,0}'::text payload,NULL::int reading`, '22003'],
    ] as const) {
      const expression = oracles.expression(`public.${relation}.valid`, 'candidate')
      await expect(
        pg.query(`SELECT ${expression} FROM (SELECT ${values}) candidate`),
      ).rejects.toMatchObject({ code })
      await expect(pg.query(`INSERT INTO ${relation} SELECT ${values}`)).rejects.toMatchObject({
        code,
      })
    }
  } finally {
    await pg.close()
  }
})

it('preserves internal char array bounds in world schemas and parsed CHECK oracles', async () => {
  const pg = await PGlite.create()
  try {
    for (const type of ['"char"[]', 'pg_catalog."char"[]', '"char"[2]', 'pg_catalog."char"[2][]']) {
      const source = `SELECT ts_filter('a:1A b:2B'::tsvector,'{A}'::${type})::text filtered,pg_typeof('{A}'::${type})::text type`
      const statement = (await parseSql(source)).stmts![0]!.stmt!
      const rendered = deparseWorldSql(statement)
      expect(rendered.match(/\[\d*\]/gu)).toEqual(source.match(/\[\d*\]/gu))
      expect((await pg.query(rendered)).rows).toEqual((await pg.query(source)).rows)
    }
    const oracles = new WorldCheckOracles()
    await oracles.load(
      pg,
      `CREATE TABLE document_weights(document tsvector,weights "char"[],expected tsvector,CONSTRAINT filtered CHECK(ts_filter(document,weights)=expected));INSERT INTO document_weights VALUES('a:1A b:2B','{A}','a:1A');`,
      'public',
    )
    const expression = oracles.expression('public.document_weights.filtered', 'candidate')
    expect(
      (await pg.query(`SELECT ${expression} value FROM document_weights candidate`)).rows,
    ).toEqual([{ value: true }])
    await expect(
      pg.exec("INSERT INTO document_weights VALUES('a:1A b:2B','{B}','a:1A')"),
    ).rejects.toMatchObject({ code: '23514' })
  } finally {
    await pg.close()
  }
})

it('rebuilds dependent oracle bodies when native row field modifiers rebuild CHECKs', async () => {
  const pg = await PGlite.create(),
    oracles = new WorldCheckOracles()
  try {
    await oracles.load(
      pg,
      `CREATE TYPE reading AS(n int4,flags bit(5));
      CREATE DOMAIN positive AS int4 CHECK(VALUE>0);
      CREATE TYPE span AS RANGE(subtype=positive);
      CREATE TABLE original(n int4,CONSTRAINT saved CHECK(n=lower('[1,3]'::span)));
      CREATE TABLE history(n int4,label text,expected bit(6),bypass bool,
        CONSTRAINT valid CHECK(CASE WHEN bypass THEN true ELSE (ROW(n,label::varbit)::reading).flags=expected END));
      ALTER DOMAIN positive ADD CONSTRAINT tighter CHECK(VALUE>2) NOT VALID;
      ALTER TYPE reading ALTER ATTRIBUTE flags TYPE bit(6);`,
      'public',
    )
    const expression = oracles.expression('public.history.valid', 'candidate')
    for (const [label, expected, bypass, outcome] of [
      ['1010111', '101010', false, true],
      ['1010111', '101011', false, false],
      [null, '101010', false, null],
      ['bad', '101010', true, true],
    ] as const) {
      expect(
        (
          await pg.query<{ result: boolean | null }>(
            `SELECT ${expression} result FROM(SELECT 1::int4 n,$1::text label,$2::bit(6) expected,$3::bool bypass) candidate`,
            [label, expected, bypass],
          )
        ).rows[0]!.result,
      ).toBe(outcome)
      const insert = pg.query('INSERT INTO history VALUES(1,$1,$2,$3)', [label, expected, bypass])
      if (outcome === false) await expect(insert).rejects.toMatchObject({ code: '23514' })
      else await insert
    }
    const original = oracles.expression('public.original.saved', 'candidate')
    expect(
      (
        await pg.query<{ result: boolean }>(
          `SELECT ${original} result FROM(SELECT 1::int4 n) candidate`,
        )
      ).rows[0]!.result,
    ).toBe(true)
  } finally {
    await pg.close()
  }
})
