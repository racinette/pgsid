import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import type { Tree } from '../../../src/catalog/expression-tree.js'

it('captures XML operations and mapped names across independent catalogs and schema changes', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted) await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int)")
      await pg.exec(`CREATE TYPE result_value AS(n int,old xml);
        CREATE TABLE history(n int,label text,CHECK(ROW(n,XMLELEMENT(NAME "😊",XMLATTRIBUTES(label),n))::result_value IS NOT NULL));
        CREATE TABLE direct(n int,label text,CHECK(XMLSERIALIZE(CONTENT XMLELEMENT(NAME "_x1F60A_",label) AS varchar(7)) IS NOT NULL));
        CREATE TABLE document(n int,label text,CHECK(XMLPARSE(CONTENT label) IS DOCUMENT));
        ALTER TYPE result_value DROP ATTRIBUTE old;ALTER TABLE history RENAME COLUMN label TO current_label;`)
      const c = await snapshotCatalog(pg)
      for (const name of ['history', 'direct', 'document']) {
        const t = c.tables.find((t) => t.name === name)!,
          k = t.constraints[0]!
        expect(k.rowCoercionContext?.complete, name).toBe(true)
        expect(JSON.stringify(k.rowCoercionContext)).toMatch(/XmlExpr|XmlSerialize/u)
        expect(JSON.stringify(k.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
        for (const origin of ['source', 'stored'] as const)
          expect(
            lowerTableCheck(t, k, c.enums, c.domains, origin, c.rangeTypes, c.compositeTypeGraph)!
              .expression.kind,
          ).not.toBe('uncertain')
      }
      const h = c.tables.find((t) => t.name === 'history')!.constraints[0]!
      expect(JSON.stringify(h.rowCoercionContext)).toContain('_x1F60A_')
      expect(JSON.stringify(h.rowCoercionContext)).toContain('__pgsid_mapped_arguments')
      await pg.exec("INSERT INTO history VALUES(1,'x');INSERT INTO document VALUES(1,'<r/>')")
      await expect(pg.exec("INSERT INTO direct VALUES(1,'x')")).rejects.toMatchObject({
        code: '22001',
      })
      await expect(pg.exec("INSERT INTO document VALUES(1,'text')")).rejects.toMatchObject({
        code: '23514',
      })
      contexts.push(
        c.tables
          .filter((t) => ['history', 'direct', 'document'].includes(t.name))
          .map((t) => t.constraints[0]!.rowCoercionContext),
      )
      ids.push(
        (await pg.query<{ oid: number }>("SELECT 'result_value'::regtype::oid oid")).rows[0]!.oid,
      )
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30_000)

it('validates native XML operation shapes, named operands, modes and result identities', () => {
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
    node: Tree = {
      kind: 'XMLEXPR',
      fields: {
        op: ['1'],
        name: ['_x1F60A_'],
        named_args: [[n]],
        arg_names: [['"n"']],
        args: [[n]],
        xmloption: ['0'],
        indent: ['false'],
        type: ['202'],
        typmod: ['-1'],
      },
    },
    input = {
      types: new Map([
        [101, 'pg_catalog.int4'],
        [202, 'pg_catalog.xml'],
        [303, 'pg_catalog.text'],
      ]),
      functions: new Map(),
      columns: new Map([[1, { name: 'n', type: 101 }]]),
      byteOrder: 'little' as const,
    }
  expect(storedRowExpression(node, input)).toMatchObject({
    XmlExpr: {
      op: 'IS_XMLELEMENT',
      __pgsid_mapped_name: '_x1F60A_',
      __pgsid_mapped_arguments: ['n'],
    },
  })
  for (const changed of [
    { op: ['8'] },
    { xmloption: ['2'] },
    { indent: ['yes'] },
    { type: ['303'] },
    { name: ['<>'] },
    { arg_names: [['n']] },
    { named_args: [[]] },
  ] as Tree['fields'][])
    expect(
      storedRowExpression({ ...node, fields: { ...node.fields, ...changed } }, input),
    ).toBeUndefined()
  const document = {
    ...node,
    fields: { ...node.fields, op: ['7'], name: ['<>'], named_args: ['<>'], arg_names: ['<>'] },
  }
  expect(storedRowExpression(document, input)).toMatchObject({ XmlExpr: { op: 'IS_DOCUMENT' } })
  expect(
    storedRowExpression({ ...document, fields: { ...document.fields, args: [[n, n]] } }, input),
  ).toBeUndefined()
  expect(
    storedRowExpression(
      { ...document, fields: { ...document.fields, op: ['6'], type: ['303'] } },
      input,
    ),
  ).toMatchObject({ XmlSerialize: { xmloption: 'XMLOPTION_DOCUMENT', indent: false } })
})
