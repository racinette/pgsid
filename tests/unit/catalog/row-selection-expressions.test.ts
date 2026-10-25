import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { parseTree } from '../../../src/catalog/expression-tree.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'

it('captures native extrema and scoped CASE comparisons independently of deployment identities', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted) await pg.exec("CREATE TYPE padding AS ENUM('x')")
      await pg.exec(`CREATE TYPE reading AS(n int4,old int4);
        CREATE TABLE history(n int4,d int4,label text,__pgsid_case_operand_0 int4,CHECK(ROW(n,
          CASE GREATEST(n,d) WHEN d::int8 THEN
            CASE LEAST(n,d) WHEN 1 THEN 1/d ELSE 2 END
          ELSE CASE COALESCE(NULL::int4[],ARRAY[n,d])::numeric[] WHEN ARRAY[1::numeric,2] THEN 3 ELSE 4 END END
        )::reading IS NOT NULL));
        ALTER TYPE reading DROP ATTRIBUTE old;`)
      const c = await snapshotCatalog(pg),
        t = c.tables.find((t) => t.name === 'history')!,
        k = t.constraints[0]!
      expect(k.rowCoercionContext?.complete).toBe(true)
      const serialized = JSON.stringify(k.rowCoercionContext)
      expect(serialized).toContain('PgsidStoredCaseTest')
      expect(serialized).toContain('IS_GREATEST')
      expect(serialized).toContain('IS_LEAST')
      expect(serialized).toContain('PgsidStoredArrayCoercion')
      expect(serialized).not.toMatch(/"\w*oid\w*":/iu)
      for (const origin of ['source', 'stored'] as const) {
        const plan = lowerTableCheck(
          t,
          k,
          c.enums,
          c.domains,
          origin,
          c.rangeTypes,
          c.compositeTypeGraph,
        )!
        expect(plan.expression.kind).not.toBe('uncertain')
        expect(JSON.stringify(plan.expression)).toContain('__pgsid_case_operand_')
        expect(JSON.stringify(plan.expression)).not.toContain('"name":"__pgsid_case_operand_0"')
      }
      await pg.exec('INSERT INTO history VALUES(1,1,NULL,9)')
      await expect(pg.exec('INSERT INTO history VALUES(0,0,NULL,9)')).resolves.toBeDefined()
      contexts.push(k.rowCoercionContext)
      ids.push((await pg.query<{ oid: number }>("SELECT 'reading'::regtype::oid oid")).rows[0]!.oid)
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30_000)

it('retains the native selected CASE equality when a later operator shadows it', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`SET search_path=public,pg_catalog;
      CREATE TYPE reading AS(n int4,old int4);
      CREATE TABLE earlier(n int4,d int4,CHECK(ROW(n,CASE n WHEN 1 THEN 1/d ELSE 2 END)::reading IS NOT NULL));
      CREATE FUNCTION chosen(int4,int4) RETURNS bool LANGUAGE SQL IMMUTABLE STRICT AS 'SELECT false';
      CREATE OPERATOR public.= (LEFTARG=int4,RIGHTARG=int4,FUNCTION=chosen);
      CREATE TABLE later(n int4,d int4,CHECK(ROW(n,CASE n WHEN 1 THEN 1/d ELSE 2 END)::reading IS NOT NULL));
      ALTER TYPE reading DROP ATTRIBUTE old;`)
    const c = await snapshotCatalog(pg)
    for (const name of ['earlier', 'later']) {
      const t = c.tables.find((t) => t.name === name)!,
        k = t.constraints[0]!
      expect(k.rowCoercionContext?.complete).toBe(name === 'earlier')
      for (const origin of ['source', 'stored'] as const)
        expect(
          lowerTableCheck(t, k, c.enums, c.domains, origin, c.rangeTypes, c.compositeTypeGraph)!
            .expression.kind === 'uncertain',
        ).toBe(name === 'later')
    }
    await expect(pg.exec('INSERT INTO earlier VALUES(1,0)')).rejects.toMatchObject({
      code: '22012',
    })
    await pg.exec('INSERT INTO later VALUES(1,0)')
  } finally {
    await pg.close()
  }
})

it('requires lexical CASE identities and captured extrema collation facts', () => {
  const input = {
      types: new Map([[101, 'pg_catalog.int4']]),
      functions: new Map(),
      columns: new Map(),
      byteOrder: 'little' as const,
    },
    test = parseTree('{CASETESTEXPR :typeId 101 :typeMod -1 :collation 0}')
  expect(storedRowExpression(test, input)).toBeUndefined()
  expect(storedRowExpression(test, { ...input, caseOperand: 102 })).toBeUndefined()
  expect(storedRowExpression(test, { ...input, caseOperand: 101, arrayElement: 102 })).toEqual({
    PgsidStoredCaseTest: {},
  })
  const arg = '{CONST :consttype 101 :constcollid 0 :constlen 4 :constbyval true :constisnull true}'
  for (const op of ['0', '1']) {
    const value = parseTree(
      `{MINMAXEXPR :minmaxtype 101 :minmaxcollid 0 :inputcollid 0 :op ${op} :args (${arg})}`,
    )
    expect(storedRowExpression(value, input)).toBeDefined()
  }
  for (const [op, coll] of [
    ['2', '0'],
    ['0', '1234'],
  ])
    expect(
      storedRowExpression(
        parseTree(
          `{MINMAXEXPR :minmaxtype 101 :minmaxcollid ${coll} :inputcollid 0 :op ${op} :args (${arg})}`,
        ),
        input,
      ),
    ).toBeUndefined()
})
