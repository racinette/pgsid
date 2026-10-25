import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import {
  storedRowExpression,
  type StoredRowExpressionInput,
} from '../../../src/catalog/stored-row-expressions.js'
import type { Tree } from '../../../src/catalog/expression-tree.js'

const replaceExists = (expression: string) =>
  `CREATE OR REPLACE FUNCTION pg_catalog.jsonb_path_exists(target jsonb,path jsonpath,vars jsonb DEFAULT ${expression},silent bool DEFAULT false) RETURNS bool LANGUAGE internal IMMUTABLE STRICT AS 'jsonb_path_exists'`

it('captures current transitive defaults and named argument slots independently of deployment IDs', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted)
        await pg.exec("CREATE TYPE padding AS ENUM('x'); CREATE TABLE padding_row(n int4)")
      await pg.exec(`CREATE TYPE reading AS(n int4,old bool);
        CREATE TABLE history(n int4,document jsonb,CHECK(ROW(n,jsonb_path_exists(document,'$need'))::reading IS NOT NULL));
        CREATE TABLE live(document jsonb,CHECK(jsonb_path_exists(path=>'$need',target=>document)));
        ALTER TYPE reading DROP ATTRIBUTE old;`)
      const before = await snapshotCatalog(pg)
      await expect(pg.exec("INSERT INTO history VALUES(1,'{}')")).rejects.toMatchObject({
        code: '42704',
      })
      await pg.exec(replaceExists(`jsonb_set('{}'::jsonb,ARRAY['need'],'true'::jsonb)`))
      const after = await snapshotCatalog(pg)
      for (const name of ['history', 'live']) {
        const t = after.tables.find((t) => t.name === name)!,
          k = t.constraints[0]!,
          old = before.tables.find((t) => t.name === name)!.constraints[0]!
        expect(k.definition).toBe(old.definition)
        expect(k.rowCoercionContext?.complete).toBe(true)
        expect(k.rowCoercionContext).not.toEqual(old.rowCoercionContext)
        expect(JSON.stringify(k.rowCoercionContext)).toContain('jsonb_set')
        expect(JSON.stringify(k.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
        for (const origin of ['source', 'stored'] as const)
          expect(
            lowerTableCheck(
              t,
              k,
              after.enums,
              after.domains,
              origin,
              after.rangeTypes,
              after.compositeTypeGraph,
            )!.expression.kind,
          ).not.toBe('uncertain')
      }
      await pg.exec("INSERT INTO history VALUES(1,'{}'); INSERT INTO live VALUES('{}')")
      contexts.push(
        after.tables
          .filter((t) => ['history', 'live'].includes(t.name))
          .map((t) => t.constraints[0]!.rowCoercionContext),
      )
      ids.push((await pg.query<{ oid: number }>("SELECT 'reading'::regtype::oid oid")).rows[0]!.oid)
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30_000)

it('keeps supplied expressions in the ordinary binder and ignores unavailable unused defaults', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TABLE complex(n int4,d int4,CHECK(jsonb_path_exists(path=>'$',target=>to_jsonb(GREATEST(n,d)))));
      CREATE TABLE explicit(document jsonb,CHECK(jsonb_path_exists(path=>'$need',target=>document,vars=>'{"need":true}',silent=>false)));
      CREATE FUNCTION unavailable() RETURNS jsonb LANGUAGE SQL IMMUTABLE AS 'SELECT ''{"need":true}''::jsonb';`)
    await pg.exec(replaceExists('public.unavailable()'))
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'complex')!,
      full = c.tables.find((t) => t.name === 'explicit')!
    expect(t.constraints[0]!.rowCoercionContext?.complete).toBe(false)
    expect(full.constraints[0]!.rowCoercionContext?.complete).toBe(true)
    await pg.exec("INSERT INTO explicit VALUES('{}')")
    await pg.exec(replaceExists("'{}'::jsonb"))
    const restored = await snapshotCatalog(pg),
      complex = restored.tables.find((t) => t.name === 'complex')!,
      k = complex.constraints[0]!
    expect(k.rowCoercionContext?.complete).toBe(true)
    expect(JSON.stringify(k.rowCoercionContext)).toContain('PgsidStoredArgument')
    for (const origin of ['source', 'stored'] as const) {
      const p = lowerTableCheck(
        complex,
        k,
        restored.enums,
        restored.domains,
        origin,
        restored.rangeTypes,
        restored.compositeTypeGraph,
      )!
      expect(p.expression.kind).not.toBe('uncertain')
      expect(JSON.stringify(p.expression)).toContain('greatest')
    }
    await pg.exec('INSERT INTO complex VALUES(1,2)')
  } finally {
    await pg.close()
  }
})

it('fills only omitted formal slots and rejects malformed, missing or recursive default expansions', () => {
  const type = 'pg_catalog.int4',
    literal = (n: number): Tree => ({
      kind: 'CONST',
      fields: {
        consttype: ['1'],
        constlen: ['4'],
        constbyval: ['true'],
        constisnull: ['false'],
        constcollid: ['0'],
        constvalue: ['4', [String(n), '0', '0', '0']],
      },
    }),
    named = (position: number, value = 9): Tree => ({
      kind: 'NAMEDARGEXPR',
      fields: { argnumber: [String(position)], arg: [literal(value)] },
    }),
    call = (args: Tree[]): Tree => ({
      kind: 'FUNCEXPR',
      fields: {
        funcid: ['10'],
        funcresulttype: ['1'],
        funcretset: ['false'],
        funccollid: ['0'],
        inputcollid: ['0'],
        args: [args],
      },
    }),
    fn = {
      signature:
        'function:["pg_catalog","example"](pg_catalog.int4,pg_catalog.int4,pg_catalog.int4)',
      args: [type, type, type],
      result: type,
      defaults: [literal(2), literal(3)],
    },
    input: StoredRowExpressionInput = {
      types: new Map([[1, type]]),
      functions: new Map([[10, fn]]),
      columns: new Map(),
      byteOrder: 'little',
    }
  const value = storedRowExpression(call([literal(1), named(2)]), input) as {
    PgsidStoredCall: { args: { TypeCast: { arg: { A_Const: { sval: { sval: string } } } } }[] }
  }
  expect(value.PgsidStoredCall.args.map((v) => v.TypeCast.arg.A_Const.sval.sval)).toEqual([
    '1',
    '2',
    '9',
  ])
  for (const args of [
    [named(2)],
    [literal(1), named(1), named(1)],
    [literal(1), named(-1)],
    [named(1), literal(2)],
  ])
    expect(storedRowExpression(call(args), input)).toBeUndefined()
  expect(
    storedRowExpression(call([literal(1)]), {
      ...input,
      functions: new Map([[10, { ...fn, defaults: undefined }]]),
    }),
  ).toBeUndefined()
  const recursive = { ...fn, defaults: [call([literal(1)]), literal(3)] }
  expect(
    storedRowExpression(call([literal(1)]), { ...input, functions: new Map([[10, recursive]]) }),
  ).toBeUndefined()
  expect(
    storedRowExpression(call([literal(1), literal(2), literal(3)]), {
      ...input,
      functions: new Map([[10, recursive]]),
    }),
  ).toBeDefined()
})
