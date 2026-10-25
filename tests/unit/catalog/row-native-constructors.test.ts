import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import type { Tree } from '../../../src/catalog/expression-tree.js'
import type { ConstantStorageType } from '../../../src/catalog/container-constant-storage.js'

it('captures historical Boolean and nested row expressions independently of deployment identities and current domain input checks', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted)
        await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int4)")
      await pg.exec(`SET search_path=public,pg_catalog;
        CREATE TYPE inner_value AS(v int4,old int4,label text COLLATE "C");
        CREATE DOMAIN positive AS int4 CHECK(VALUE>=0);CREATE TYPE positive_span AS RANGE(subtype=positive);
        CREATE TYPE domain_row AS(v positive);CREATE TYPE history_row AS(n int4,old bool);
        CREATE TABLE history(n int4,d int4,label text,pick bool,
          CHECK(ROW(n,(n/d>0) IS TRUE)::history_row IS NOT NULL),
          CHECK(ROW(n,ROW(n/d,NULL) IS NULL)::history_row IS NOT NULL),
          CHECK(ROW(n,(ROW(n,1/d,label)::inner_value).v>0)::history_row IS NOT NULL),
          CHECK(ROW(n,(to_jsonb(ROW(lower('[1,3)'::positive_span))::domain_row)->>'v')::int4=1)::history_row IS NOT NULL));
        ALTER TYPE history_row DROP ATTRIBUTE old;ALTER TYPE inner_value DROP ATTRIBUTE old;
        ALTER TYPE inner_value RENAME ATTRIBUTE v TO score;ALTER TYPE inner_value ADD ATTRIBUTE added int4;
        ALTER DOMAIN positive ADD CHECK(VALUE>=10);`)
      const catalog = await snapshotCatalog(pg),
        table = catalog.tables.find((t) => t.name === 'history')!
      for (const constraint of table.constraints) {
        expect(constraint.rowCoercionContext?.complete).toBe(true)
        expect(JSON.stringify(constraint.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
        for (const origin of ['source', 'stored'] as const)
          expect(
            lowerTableCheck(
              table,
              constraint,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
            )!.expression.kind,
          ).not.toBe('uncertain')
      }
      contexts.push(table.constraints.map((c) => c.rowCoercionContext))
      ids.push(
        (await pg.query<{ oid: number }>("SELECT 'inner_value'::regtype::oid oid")).rows[0]!.oid,
      )
      await pg.exec("INSERT INTO history VALUES(1,1,'x',true)")
      await expect(pg.exec('SELECT 1::positive')).rejects.toMatchObject({ code: '23514' })
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30_000)

it('validates physical named-row members, Boolean variants and untyped string storage before reconstruction', () => {
  const column: Tree = {
      kind: 'VAR',
      fields: {
        varno: ['1'],
        varlevelsup: ['0'],
        varattno: ['1'],
        vartype: ['101'],
        varcollid: ['0'],
      },
    },
    bool: Tree = { kind: 'VAR', fields: { ...column.fields, varattno: ['2'], vartype: ['202'] } },
    definition: ConstantStorageType = {
      oid: 500,
      identity: 'public.reading',
      kind: 'c',
      base: 0,
      element: null,
      length: -1,
      alignment: 'd',
      delimiter: ',',
      attributes: [
        { name: 'renamed', type: 101, length: 4, alignment: 'i', dropped: false },
        { type: 101, length: 4, alignment: 'i', dropped: true },
        { name: 'flag', type: 202, length: 1, alignment: 'c', dropped: false },
      ],
    },
    input = {
      types: new Map([
        [101, 'pg_catalog.int4'],
        [202, 'pg_catalog.bool'],
        [500, 'public.reading'],
        [900, 'pg_catalog.unknown'],
      ]),
      functions: new Map(),
      columns: new Map([
        [1, { name: 'n', type: 101 }],
        [2, { name: 'pick', type: 202 }],
      ]),
      byteOrder: 'little' as const,
      storageTypes: new Map([[500, definition]]),
    },
    row: Tree = {
      kind: 'ROWEXPR',
      fields: { row_typeid: ['500'], args: [[column, column, bool]], colnames: ['<>'] },
    }
  expect(storedRowExpression(row, input)).toMatchObject({
    PgsidStoredRow: { type: 'public.reading', live: [0, 2] },
  })
  expect(
    storedRowExpression(row, {
      ...input,
      storageTypes: new Map([
        [
          500,
          {
            ...definition,
            attributes: [
              { ...definition.attributes[0]!, type: 202 },
              ...definition.attributes.slice(1),
            ],
          },
        ],
      ]),
    }),
  ).toBeUndefined()
  for (const variant of ['0', '1', '2', '3', '4', '5'])
    expect(
      storedRowExpression(
        { kind: 'BOOLEANTEST', fields: { arg: [bool], booltesttype: [variant] } },
        input,
      ),
    ).toBeDefined()
  for (const variant of [undefined, '6', 'bad'])
    expect(
      storedRowExpression(
        {
          kind: 'BOOLEANTEST',
          fields: { arg: [bool], ...(variant === undefined ? {} : { booltesttype: [variant] }) },
        },
        input,
      ),
    ).toBeUndefined()
  const constant = (bytes: number[]): Tree => ({
      kind: 'CONST',
      fields: {
        consttype: ['900'],
        constlen: ['-2'],
        constbyval: ['false'],
        constisnull: ['false'],
        constvalue: [String(bytes.length), bytes.map(String)],
      },
    }),
    bytes = [...Buffer.from('é😊'), 0]
  expect(storedRowExpression(constant(bytes), { ...input, utf8: true })).toEqual({
    A_Const: { sval: { sval: 'é😊' } },
  })
  expect(storedRowExpression(constant(bytes), input)).toBeUndefined()
  for (const bytes of [[], [120], [120, 0, 0], [255, 0]])
    expect(storedRowExpression(constant(bytes), { ...input, utf8: true })).toBeUndefined()
})
