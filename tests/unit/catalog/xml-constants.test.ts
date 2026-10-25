import { beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { loadModule, parseSync } from 'libpg-query'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { diffCatalogs } from '../../../src/catalog/diff.js'
import {
  captureXmlConstantContext,
  captureRowCoercionContext,
} from '../../../src/catalog/coercion-context.js'
import { walkStoredExpression } from '../../../src/sql-semantics/row-coercion-sites.js'

beforeAll(() => loadModule())

const original = '<?xml version="1.0" encoding=""?><r/>'
const xmlConst = (bytes: number[], oid = 41001, length = bytes.length) =>
  `{CONST :consttype ${oid} :constlen -1 :constbyval false :constisnull false :constvalue ${length} [ ${bytes.join(' ')} ]}`
const capture = (source: string, utf8 = true) =>
  captureXmlConstantContext(source, 'CHECK (example)', new Set([41001]), new Map(), utf8)

it('decodes captured XML text with validated native headers in either byte order and preserves BOMs and non-XML constructor text', () => {
  for (const text of ['', '<r/>', original, '\ufeff<é>😊</é>', '\u0001', 'a'.repeat(200)]) {
    const body = Buffer.from(text),
      length = body.length + 4
    for (const order of ['little', 'big']) {
      const header = Buffer.alloc(4)
      if (order === 'little') header.writeUInt32LE(length * 4)
      else header.writeUInt32BE(length)
      const bytes = [...header, ...body]
      for (const signed of [false, true]) {
        const serialized = signed ? bytes.map((byte) => (byte > 127 ? byte - 256 : byte)) : bytes
        expect(capture(xmlConst(serialized))).toEqual({
          definition: 'CHECK (example)',
          complete: true,
          constants: [{ site: '', text }],
        })
      }
    }
    if (body.length < 127)
      for (const header of [(body.length + 1) * 2 + 1, 128 + body.length + 1])
        expect(capture(xmlConst([header, ...body]))?.constants).toEqual([{ site: '', text }])
  }
  expect(capture('{CONST :consttype 41001 :constisnull true}', false)?.constants).toEqual([
    { site: '', text: null },
  ])
  expect(capture(xmlConst([16, 0, 0, 0]), false)?.constants).toEqual([{ site: '', text: '' }])
  expect(capture(xmlConst([24, 0, 0, 0, 195, 169]), false)).toMatchObject({
    complete: false,
    constants: [],
  })
  expect(capture(xmlConst([16, 0, 0, 0], 41002))).toBeUndefined()
})

it('defers malformed, compressed, external and non-UTF8 constant storage instead of guessing its layout', () => {
  for (const source of [
    xmlConst([16, 0, 0]),
    xmlConst([16, 0, 0, 0], 41001, 5),
    xmlConst([18, 0, 0, 0]),
    xmlConst([64, 0, 0, 4]),
    xmlConst([1]),
    xmlConst([128]),
    xmlConst([20, 0, 0, 0, 0]),
    xmlConst([20, 0, 0, 0, 255]),
    xmlConst([20, 0, 0, 0, 256]),
    xmlConst([20, 0, 0, 0, -129]),
    '{CONST :consttype 41001 :constlen -1 :constbyval false :constisnull false :constvalue 4 [ 16 0 0 0 ]',
    '{UNSUPPORTED :arg ' + xmlConst([16, 0, 0, 0]) + '}',
  ])
    expect(capture(source), source).toMatchObject({ complete: false })
})

it('retains live XML literal sites and recovers dropped values through row capture', () => {
  const value = xmlConst([32, 0, 0, 0, 60, 114, 47, 62]),
    nullValue = '{CONST :consttype 23 :constisnull true}'
  const rows = new Map([[51000, { identity: 'public.xml_record', depth: 0, fields: [1] }]])
  expect(
    captureXmlConstantContext(
      `{ROWEXPR :row_typeid 51000 :args (${nullValue} ${value})}`,
      'CHECK (example)',
      new Set([41001]),
      rows,
      true,
    ),
  ).toMatchObject({ complete: true, constants: [{ site: '/row/0', text: '<r/>' }] })
  const source = `{ROWEXPR :row_typeid 51000 :args (${value} ${nullValue})}`
  expect(
    captureXmlConstantContext(source, 'CHECK (example)', new Set([41001]), rows, true),
  ).toMatchObject({ complete: true, constants: [] })
  expect(captureRowCoercionContext(source, 'CHECK (example)', rows)).toMatchObject({
    complete: false,
  })
  expect(
    captureRowCoercionContext(source, 'CHECK (example)', rows, {
      types: new Map([
        [41001, 'pg_catalog.xml'],
        [23, 'pg_catalog.int4'],
      ]),
      functions: new Map(),
      columns: new Map(),
      byteOrder: 'little',
      utf8: true,
    }),
  ).toMatchObject({
    complete: true,
    constructors: [{ omitted: [{ position: 0, expression: { PgsidStoredXml: '<r/>' } }] }],
  })
})

it('captures XML literals at semantic positions across table/domain CHECKs and independent catalog identities', async () => {
  const contexts: unknown[] = [],
    identifiers: number[] = []
  for (const padding of ['', "CREATE TYPE padding AS ENUM('unused');"]) {
    const pg = await PGlite.create()
    try {
      await pg.exec(`${padding} CREATE DOMAIN xml_source AS xml;
        CREATE TABLE xml_constants(v xml,t text,
          CONSTRAINT direct CHECK(v::text='${original}'::xml::text),
          CONSTRAINT different CHECK(CASE WHEN t='left' THEN '${original}'::xml::text ELSE '<r/>'::xml::text END=t),
          CONSTRAINT nested CHECK(XMLSERIALIZE(CONTENT xmlconcat('${original}'::xml,'<a/>'::xml) AS text)=t),
          CONSTRAINT named CHECK(XMLSERIALIZE(CONTENT xmlelement(name r,XMLATTRIBUTES('${original}'::xml AS a),'<b/>'::xml) AS text)=t),
          CONSTRAINT domain_value CHECK(('${original}'::xml_source)::text=t),
          CONSTRAINT null_value CHECK(NULL::xml IS DOCUMENT));
        CREATE DOMAIN xml_guard AS text CHECK(VALUE='${original}'::xml::text);`)
      const snapshot = await snapshotCatalog(pg),
        table = snapshot.tables.find((t) => t.name === 'xml_constants')!
      const captured = table.constraints.map((c) => ({ name: c.name, context: c.xmlConstants }))
      for (const check of table.constraints) {
        expect(check.xmlConstants, check.name).toMatchObject({
          definition: check.definition,
          complete: true,
        })
        expect(check.xmlConstants!.constants.length, check.name).toBeGreaterThan(0)
        const parsed = parseSync(`ALTER TABLE holder ADD CONSTRAINT current ${check.definition}`)
        const statement = parsed.stmts[0]!.stmt as unknown as {
          AlterTableStmt: {
            cmds: { AlterTableCmd: { def: { Constraint: { raw_expr: unknown } } } }[]
          }
        }
        const literals = new Map<string, unknown[]>()
        walkStoredExpression(
          statement.AlterTableStmt.cmds[0]!.AlterTableCmd.def.Constraint.raw_expr,
          (node, site) => {
            if (node && typeof node === 'object' && 'A_Const' in node)
              literals.set(site, [...(literals.get(site) ?? []), node.A_Const])
          },
        )
        for (const literal of check.xmlConstants!.constants)
          expect(literals.get(literal.site), check.name + ' ' + literal.site).toHaveLength(1)
      }
      expect(captured.find((c) => c.name === 'direct')!.context!.constants).toEqual([
        { site: '/operator/1', text: original },
      ])
      const different = captured.find((c) => c.name === 'different')!.context!.constants
      expect(different.map((c) => c.text)).toEqual([original, '<r/>'])
      expect(new Set(different.map((c) => c.site)).size).toBe(2)
      const domain = snapshot.domains.find((d) => d.name === 'xml_guard')!.checks[0]!.xmlConstants
      expect(domain?.constants).toEqual([{ site: '/operator/1', text: original }])
      contexts.push({ captured, domain })
      identifiers.push(snapshot.domains.find((d) => d.name === 'xml_source')!.oid)
      await pg.exec('SET xmloption=DOCUMENT')
      expect(
        (await snapshotCatalog(pg)).tables
          .find((t) => t.name === 'xml_constants')!
          .constraints.map((c) => c.xmlConstants),
      ).toEqual(captured.map((c) => c.context))
      expect((await pg.query<{ xmloption: string }>('SHOW xmloption')).rows[0]).toEqual({
        xmloption: 'document',
      })
    } finally {
      await pg.close()
    }
  }
  expect(identifiers[0]).not.toBe(identifiers[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 120_000)

it('reports a behavior change when XML output erases a changed literal declaration', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      `CREATE TABLE changing_xml(v xml,CONSTRAINT retained CHECK(v::text='${original}'::xml::text))`,
    )
    const before = await snapshotCatalog(pg)
    await pg.query('INSERT INTO changing_xml VALUES($1::text::xml)', [original])
    await expect(pg.query("INSERT INTO changing_xml VALUES('<r/>')")).rejects.toMatchObject({
      code: '23514',
    })
    await pg.exec('DELETE FROM changing_xml')
    await pg.exec(
      "ALTER TABLE changing_xml DROP CONSTRAINT retained; ALTER TABLE changing_xml ADD CONSTRAINT retained CHECK(v::text='<r/>'::xml::text)",
    )
    const after = await snapshotCatalog(pg)
    expect(before.tables[0]!.constraints[0]!.definition).toBe(
      after.tables[0]!.constraints[0]!.definition,
    )
    expect(diffCatalogs(before, after).modified.map((c) => c.entityId)).toContain(
      'public.changing_xml',
    )
    await expect(
      pg.query('INSERT INTO changing_xml VALUES($1::text::xml)', [original]),
    ).rejects.toMatchObject({ code: '23514' })
    await pg.query("INSERT INTO changing_xml VALUES('<r/>')")
  } finally {
    await pg.close()
  }
})
