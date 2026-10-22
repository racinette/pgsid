import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { WorldCheckOracles } from './check-world-oracles.js'

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
