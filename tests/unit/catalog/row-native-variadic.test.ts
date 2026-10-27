import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../../src/codegen/shared/check-rust-source.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import type { Tree } from '../../../src/catalog/expression-tree.js'

it('captures expanded and explicit variadic calls independently of deployment IDs and later shadowing', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted) await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int)")
      await pg.exec(`SET search_path=public,pg_catalog;CREATE TYPE result_value AS(n int,old jsonb);
    CREATE TYPE stage AS ENUM('a','b');
    CREATE TABLE history(n int,d int,CHECK(ROW(n,jsonb_build_array(n,d,'a'::stage))::result_value IS NOT NULL));
    CREATE TABLE direct(n int,d int,CHECK(jsonb_build_array(n,d)='[1,2]'::jsonb));
    CREATE TABLE expanded(n int,d int,CHECK(jsonb_build_array(VARIADIC ARRAY[n,d])='[1,2]'::jsonb));
    ALTER TYPE result_value DROP ATTRIBUTE old;ALTER TYPE stage RENAME VALUE 'a' TO 'cold';
    CREATE FUNCTION public.jsonb_build_array(int4,int4) RETURNS jsonb LANGUAGE SQL IMMUTABLE AS 'SELECT ''[99]''::jsonb';
    CREATE TABLE shadowed(n int,d int,CHECK(jsonb_build_array(n,d)='[99]'::jsonb));`)
      const c = await snapshotCatalog(pg)
      for (const name of ['history', 'direct', 'expanded']) {
        const t = c.tables.find((t) => t.name === name)!,
          k = t.constraints[0]!
        expect(k.rowCoercionContext?.complete, name).toBe(true)
        expect(JSON.stringify(k.rowCoercionContext)).toContain('PgsidStoredCall')
        expect(JSON.stringify(k.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
        for (const origin of ['source', 'stored'] as const)
          expect(
            lowerTableCheck(t, k, c.enums, c.domains, origin, c.rangeTypes, c.compositeTypeGraph)!
              .expression.kind,
          ).not.toBe('uncertain')
      }
      const shadowed = c.tables.find((t) => t.name === 'shadowed')!
      expect(shadowed.constraints[0]!.rowCoercionContext?.complete).toBe(false)
      expect(
        (await pg.query<{ value: unknown }>('SELECT public.jsonb_build_array(1,2) value')).rows[0]!
          .value,
      ).toEqual([99])
      await pg.exec(
        'INSERT INTO direct VALUES(1,2);INSERT INTO expanded VALUES(1,2);INSERT INTO history VALUES(1,2)',
      )
      contexts.push(
        c.tables
          .filter((t) => ['history', 'direct', 'expanded'].includes(t.name))
          .map((t) => t.constraints[0]!.rowCoercionContext),
      )
      ids.push((await pg.query<{ oid: number }>("SELECT 'stage'::regtype::oid oid")).rows[0]!.oid)
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30_000)

it('keeps internal range constructors portable when their names collide with builtin variadic functions', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE public.int4multirange AS RANGE(subtype=int4);
   CREATE TABLE h(n int,d int,CHECK(public.int4multirange(n,d) IS NOT NULL))`)
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'h')!,
      expression = lowerTableCheck(
        t,
        t.constraints[0]!,
        c.enums,
        c.domains,
        'stored',
        c.rangeTypes,
        c.compositeTypeGraph,
      )!.expression
    expect(
      prepareCheckRustGroup([
        {
          identity: { schema: 'public', kind: 'table', owner: 'h', constraint: 'range' },
          expression,
        },
      ]).checks[0]!.kind,
    ).toBe('supported')
    await pg.exec('INSERT INTO h VALUES(1,2)')
  } finally {
    await pg.close()
  }
})

it('retains implemented generic null counts in captured discarded fields', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      `CREATE TYPE result_value AS(n int,old bool);CREATE TABLE h(n int,d int,CHECK(ROW(n,num_nonnulls(n,d)>0)::result_value IS NOT NULL));ALTER TYPE result_value DROP ATTRIBUTE old`,
    )
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'h')!,
      k = t.constraints[0]!
    expect(k.rowCoercionContext?.complete).toBe(true)
    const expression = lowerTableCheck(
      t,
      k,
      c.enums,
      c.domains,
      'stored',
      c.rangeTypes,
      c.compositeTypeGraph,
    )!.expression
    expect(
      prepareCheckRustGroup([
        {
          identity: { schema: 'public', kind: 'table', owner: 'h', constraint: 'generic' },
          expression,
        },
      ]).checks[0]!.kind,
    ).toBe('supported')
    await pg.exec('INSERT INTO h VALUES(1,NULL)')
    await expect(pg.exec('INSERT INTO h VALUES(NULL,1)')).rejects.toMatchObject({ code: '23514' })
  } finally {
    await pg.close()
  }
})

it('retains expanded versus explicit argument slots and rejects malformed variadic arities', () => {
  const n: Tree = {
      kind: 'VAR',
      fields: {
        varno: ['1'],
        varlevelsup: ['0'],
        varattno: ['1'],
        vartype: ['101'],
        varcollid: ['0'],
      },
    },
    a: Tree = { kind: 'VAR', fields: { ...n.fields, varattno: ['2'], vartype: ['404'] } },
    node: Tree = {
      kind: 'FUNCEXPR',
      fields: {
        funcid: ['303'],
        funcresulttype: ['202'],
        funcretset: ['false'],
        funcvariadic: ['false'],
        inputcollid: ['0'],
        funccollid: ['0'],
        args: [[n, n, n]],
      },
    },
    input = {
      types: new Map([
        [101, 'pg_catalog.int4'],
        [202, 'pg_catalog.jsonb'],
        [404, 'pg_catalog._int4'],
      ]),
      functions: new Map([
        [
          303,
          {
            signature: 'function:["pg_catalog","jsonb_build_array"](pg_catalog."any")',
            args: ['pg_catalog."any"'],
            variadic: 'pg_catalog."any"',
            result: 'pg_catalog.jsonb',
            defaults: [],
          },
        ],
      ]),
      columns: new Map([
        [1, { name: 'n', type: 101 }],
        [2, { name: 'a', type: 404 }],
      ]),
      byteOrder: 'little' as const,
      arrayElements: new Map([[404, 101]]),
    }
  expect(storedRowExpression(node, input)).toMatchObject({
    PgsidStoredCall: { variadic: false, args: [{}, {}, {}] },
  })
  expect(
    storedRowExpression({ ...node, fields: { ...node.fields, funcvariadic: ['true'] } }, input),
  ).toBeUndefined()
  expect(
    storedRowExpression(
      { ...node, fields: { ...node.fields, funcvariadic: ['true'], args: [[a]] } },
      input,
    ),
  ).toMatchObject({ PgsidStoredCall: { variadic: true, args: [{}] } })
  expect(
    storedRowExpression({ ...node, fields: { ...node.fields, args: [[]] } }, input),
  ).toBeUndefined()
})
