import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { diffCatalogs } from '../../../src/catalog/diff.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../../scripts/check-measurements/probes.js'

it('captures original mapped XML names when stored SQL cannot distinguish supplementary characters from literal escape spellings', async () => {
  const pg = await PGlite.create()
  try {
    const longName = '😊'.repeat(13),
      mappedLongName = '_x1F60A_'.repeat(13)
    await pg.exec(`CREATE TABLE xml_headers(source text,expected text,CONSTRAINT instruction CHECK(xmlpi(NAME "😊",source)::text=expected));
   CREATE TABLE xml_long_header(source text,expected text,CONSTRAINT instruction CHECK(xmlpi(NAME "${longName}",source)::text=expected));
   CREATE DOMAIN xml_notice AS text CHECK(xmlpi(NAME "😊",VALUE)::text <> '');`)
    const before = await snapshotCatalog(pg),
      table = before.tables.find((t) => t.name === 'xml_headers')!,
      constraint = table.constraints.find((c) => c.name === 'instruction')!
    expect(constraint.xmlConstants).toMatchObject({
      complete: true,
      constants: [],
      names: [{ name: '_x1F60A_' }],
    })
    expect(
      before.domains.find((d) => d.name === 'xml_notice')!.checks[0]!.xmlConstants,
    ).toMatchObject({ complete: true, names: [{ name: '_x1F60A_' }] })
    const longTable = before.tables.find((t) => t.name === 'xml_long_header')!,
      longCheck = longTable.constraints.find((c) => c.name === 'instruction')!
    expect(longCheck.xmlConstants?.names?.[0]?.name).toBe(mappedLongName)
    expect(JSON.stringify(lowerTableCheck(longTable, longCheck)!.expression)).toContain(
      JSON.stringify(mappedLongName),
    )
    expect(
      hasUncertain(
        lowerTableCheck(longTable, {
          ...longCheck,
          xmlConstants: undefined,
          rowCoercionContext: undefined,
        })!.expression,
      ),
    ).toBe(true)
    await pg.query('INSERT INTO xml_long_header VALUES($1,$2)', ['go', `<?${mappedLongName} go?>`])
    await pg.query('INSERT INTO xml_headers VALUES($1,$2)', ['go', '<?_x1F60A_ go?>'])
    await pg.exec(`DELETE FROM xml_headers; ALTER TABLE xml_headers DROP CONSTRAINT instruction;
   ALTER TABLE xml_headers ADD CONSTRAINT instruction CHECK(xmlpi(NAME "_x1F60A_",source)::text=expected)`)
    const after = await snapshotCatalog(pg),
      changed = after.tables
        .find((t) => t.name === 'xml_headers')!
        .constraints.find((c) => c.name === 'instruction')!
    expect(changed.definition).toBe(constraint.definition)
    expect(changed.xmlConstants).toMatchObject({
      complete: true,
      names: [{ name: '_x005F_x1F60A_' }],
    })
    expect(diffCatalogs(before, after).modified.map((c) => c.entityId)).toContain(
      'public.xml_headers',
    )
    await expect(
      pg.query('INSERT INTO xml_headers VALUES($1,$2)', ['go', '<?_x1F60A_ go?>']),
    ).rejects.toMatchObject({ code: '23514' })
    await pg.query('INSERT INTO xml_headers VALUES($1,$2)', ['go', '<?_x005F_x1F60A_ go?>'])
  } finally {
    await pg.close()
  }
}, 30_000)

it('retains original XML attribute and forest argument names across ambiguous deparsing and implicit column aliases', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TABLE xml_attributes(s text,t text,"xmlThing" text,"a:b" text,expected text,
      CONSTRAINT attributes CHECK(xmlelement(NAME root,XMLATTRIBUTES(s AS "😊",t AS "_x1F60A_"))::text=expected),
      CONSTRAINT forest CHECK(xmlforest("xmlThing","a:b",s AS "😊")::text<>'deny'))`)
    const before = await snapshotCatalog(pg),
      table = before.tables.find((t) => t.name === 'xml_attributes')!,
      check = table.constraints.find((c) => c.name === 'attributes')!,
      forest = table.constraints.find((c) => c.name === 'forest')!
    expect(check.xmlConstants).toMatchObject({
      complete: true,
      argumentNames: [{ names: ['_x1F60A_', '_x005F_x1F60A_'] }],
    })
    expect(forest.xmlConstants).toMatchObject({
      complete: true,
      argumentNames: [{ names: ['_x0078_mlThing', 'a_x003A_b', '_x1F60A_'] }],
    })
    expect(hasUncertain(lowerTableCheck(table, forest)!.expression)).toBe(false)
    expect(
      hasUncertain(
        lowerTableCheck(table, {
          ...forest,
          xmlConstants: undefined,
          rowCoercionContext: undefined,
        })!.expression,
      ),
    ).toBe(true)
    const xml = '<root _x1F60A_="go" _x005F_x1F60A_="stop"/>'
    await pg.query('INSERT INTO xml_attributes VALUES($1,$2,$3,$4,$5)', [
      'go',
      'stop',
      'x',
      'y',
      xml,
    ])
    await pg.exec(`DELETE FROM xml_attributes;ALTER TABLE xml_attributes DROP CONSTRAINT attributes;
      ALTER TABLE xml_attributes ADD CONSTRAINT attributes CHECK(xmlelement(NAME root,XMLATTRIBUTES(s AS "_x1F60A_",t AS "😊"))::text=expected)`)
    const after = await snapshotCatalog(pg),
      changed = after.tables
        .find((t) => t.name === 'xml_attributes')!
        .constraints.find((c) => c.name === 'attributes')!
    expect(changed.definition).toBe(check.definition)
    expect(changed.xmlConstants).toMatchObject({
      complete: true,
      argumentNames: [{ names: ['_x005F_x1F60A_', '_x1F60A_'] }],
    })
    expect(diffCatalogs(before, after).modified.map((x) => x.entityId)).toContain(
      'public.xml_attributes',
    )
    await expect(
      pg.query('INSERT INTO xml_attributes VALUES($1,$2,$3,$4,$5)', ['go', 'stop', 'x', 'y', xml]),
    ).rejects.toMatchObject({ code: '23514' })
  } finally {
    await pg.close()
  }
}, 30_000)
