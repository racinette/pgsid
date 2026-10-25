import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import { storedOrderingKey } from '../../../src/catalog/stored-row-orderings.js'
import { oidList, type Tree } from '../../../src/catalog/expression-tree.js'

it('captures the selected row-ordering support function after family changes and independently of deployment IDs', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted) await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int)")
      await pg.exec(`CREATE TYPE result_value AS(n int,old bool);
    CREATE OPERATOR public.#< (LEFTARG=int4,RIGHTARG=int4,FUNCTION=pg_catalog.int4lt);
    CREATE OPERATOR FAMILY selected_order USING btree;
    ALTER OPERATOR FAMILY selected_order USING btree ADD OPERATOR 1 public.#< (int4,int4),FUNCTION 1 (int4,int4) pg_catalog.btint4cmp(int4,int4);
    CREATE TABLE history(n int,d int,CHECK(ROW(n,ROW(n,n/d) OPERATOR(public.#<) ROW(d,0))::result_value IS NOT NULL));
    CREATE TABLE direct(n int,d int,CHECK(ROW(n,n/d) OPERATOR(public.#<) ROW(d,0)));
    ALTER TYPE result_value DROP ATTRIBUTE old;`)
      const before = await snapshotCatalog(pg)
      await pg.exec(`ALTER OPERATOR FAMILY selected_order USING btree DROP FUNCTION 1 (int4,int4);
    ALTER OPERATOR FAMILY selected_order USING btree ADD FUNCTION 1 (int4,int4) pg_catalog.int4larger(int4,int4);`)
      const c = await snapshotCatalog(pg)
      for (const name of ['history', 'direct']) {
        const t = c.tables.find((t) => t.name === name)!,
          k = t.constraints[0]!,
          old = before.tables.find((t) => t.name === name)!.constraints[0]!
        expect(k.definition).toBe(old.definition)
        expect(k.rowCoercionContext?.complete).toBe(true)
        expect(JSON.stringify(k.rowCoercionContext)).toContain('int4larger')
        expect(JSON.stringify(old.rowCoercionContext)).toContain('btint4cmp')
        expect(JSON.stringify(k.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
        for (const origin of ['source', 'stored'] as const)
          expect(
            lowerTableCheck(t, k, c.enums, c.domains, origin, c.rangeTypes, c.compositeTypeGraph)!
              .expression.kind,
          ).not.toBe('uncertain')
      }
      expect(
        (await pg.query<{ value: boolean }>('SELECT ROW(1,1) OPERATOR(public.#<) ROW(2,0) value'))
          .rows[0]!.value,
      ).toBe(false)
      await expect(pg.exec('INSERT INTO direct VALUES(1,2)')).rejects.toMatchObject({
        code: '23514',
      })
      contexts.push(
        c.tables
          .filter((t) => ['history', 'direct'].includes(t.name))
          .map((t) => t.constraints[0]!.rowCoercionContext),
      )
      ids.push(
        (
          await pg.query<{ oid: number }>(
            "SELECT oid FROM pg_opfamily WHERE opfname='selected_order'",
          )
        ).rows[0]!.oid,
      )
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30_000)

it('defers unavailable selected support functions instead of substituting the builtin comparator', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE FUNCTION unavailable(int4,int4) RETURNS int4 LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT 0';
   CREATE OPERATOR public.#< (LEFTARG=int4,RIGHTARG=int4,FUNCTION=pg_catalog.int4lt);
   CREATE OPERATOR FAMILY selected_order USING btree;
   ALTER OPERATOR FAMILY selected_order USING btree ADD OPERATOR 1 public.#< (int4,int4),FUNCTION 1 (int4,int4) unavailable(int4,int4);
   CREATE TABLE direct(n int,d int,CHECK(ROW(n,n/d) OPERATOR(public.#<) ROW(d,0)));`)
    const c = await snapshotCatalog(pg),
      t = c.tables.find((t) => t.name === 'direct')!
    expect(t.constraints[0]!.rowCoercionContext?.complete).toBe(false)
  } finally {
    await pg.close()
  }
})

it('validates native ordering list widths, selected families, collations and strategies', () => {
  const variable: Tree = {
      kind: 'VAR',
      fields: {
        varno: ['1'],
        varattno: ['1'],
        varlevelsup: ['0'],
        vartype: ['101'],
        varcollid: ['0'],
      },
    },
    node: Tree = {
      kind: 'ROWCOMPAREEXPR',
      fields: {
        cmptype: ['1'],
        opnos: [['o', '202', '202']],
        opfamilies: [['o', '303', '303']],
        inputcollids: [['o', '0', '0']],
        largs: [[variable, variable]],
        rargs: [[variable, variable]],
      },
    },
    input = {
      types: new Map([[101, 'pg_catalog.int4']]),
      functions: new Map(),
      columns: new Map([[1, { name: 'n', type: 101 }]]),
      byteOrder: 'little' as const,
      orderings: new Map([
        [
          storedOrderingKey(202, 303, 1),
          {
            operator: 'operator:["pg_catalog","<"](pg_catalog.int4,pg_catalog.int4)',
            family: 'pg_catalog.integer_ops',
            strategy: 1 as const,
            comparator: 'function:["pg_catalog","btint4cmp"](pg_catalog.int4,pg_catalog.int4)',
          },
        ],
      ]),
    }
  expect(storedRowExpression(node, input)).toMatchObject({
    PgsidStoredRowCompare: {
      strategy: 1,
      pairs: [{ family: 'pg_catalog.integer_ops' }, { family: 'pg_catalog.integer_ops' }],
    },
  })
  for (const [key, value] of Object.entries({
    cmptype: ['3'],
    opnos: [['o', '202']],
    opfamilies: [['o', '303', '404']],
    inputcollids: [['o', '999', '0']],
  }))
    expect(
      storedRowExpression({ ...node, fields: { ...node.fields, [key]: value } }, input),
    ).toBeUndefined()
  for (const list of [
    ['i', '1'],
    ['o', '-1'],
    ['o', '4294967296'],
    ['o', 'bad'],
  ])
    expect(oidList({ ...node, fields: { opnos: [list] } }, 'opnos')).toBeUndefined()
  expect(storedRowExpression(node, { ...input, orderings: new Map() })).toBeUndefined()
})
