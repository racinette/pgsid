import { PGlite } from '@electric-sql/pglite'
import { it, expect } from 'vitest'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { diffCatalogs } from '../../../src/catalog/diff.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { xmlArrayConstantText } from '../../../src/catalog/xml-array-constants.js'

it('captures original XML array constants in table/domain CHECKs when printed declarations are erased', async () => {
  const pg = await PGlite.create()
  try {
    const raw = '<?xml version="1.0" encoding="UTF8"?><r/>',
      array = `[-2:0]={"${raw.replaceAll('"', '\\"')}",NULL,"<r/>"}`
    await pg.exec(`CREATE TABLE xml_array_values(expected text,CONSTRAINT original CHECK(($array$${array}$array$::xml[])[-2]::text=expected));
      CREATE DOMAIN xml_array_label AS text CHECK(($array$${array}$array$::xml[])[-2]::text=VALUE);
      CREATE DOMAIN retained_xml AS xml;
      CREATE DOMAIN retained_xml_array AS retained_xml[];
      CREATE TABLE xml_domain_values(expected text,CONSTRAINT original CHECK(($array$${array}$array$::retained_xml_array)[-2]::text=expected));`)
    const before = await snapshotCatalog(pg),
      table = before.tables.find((t) => t.name === 'xml_array_values')!,
      constraint = table.constraints.find((c) => c.name === 'original')!
    expect(constraint.xmlConstants).toMatchObject({
      complete: true,
      constants: [],
      arrays: [{ text: array }],
    })
    expect(
      before.domains.find((d) => d.name === 'xml_array_label')!.checks[0]!.xmlConstants,
    ).toMatchObject({ complete: true, arrays: [{ text: array }] })
    const expression = JSON.stringify(lowerTableCheck(table, constraint)!.expression)
    expect(expression).toContain('"xmlStorage":true')
    expect(expression).toContain(JSON.stringify(array))
    const domainTable = before.tables.find((t) => t.name === 'xml_domain_values')!,
      domainConstraint = domainTable.constraints.find((c) => c.name === 'original')!
    expect(domainConstraint.xmlConstants).toMatchObject({
      complete: true,
      arrays: [{ text: array }],
    })
    expect(
      JSON.stringify(
        lowerTableCheck(domainTable, domainConstraint, before.enums, before.domains)!.expression,
      ),
    ).toContain('"xmlStorage":true')
    await pg.query('INSERT INTO xml_domain_values VALUES($1)', [raw])
    await pg.query('INSERT INTO xml_array_values VALUES($1)', [raw])
    await pg.exec(`DELETE FROM xml_array_values;ALTER TABLE xml_array_values DROP CONSTRAINT original;
      ALTER TABLE xml_array_values ADD CONSTRAINT original CHECK(($array$[-2:0]={"<r/>",NULL,"<r/>"}$array$::xml[])[-2]::text=expected)`)
    const after = await snapshotCatalog(pg),
      changed = after.tables
        .find((t) => t.name === 'xml_array_values')!
        .constraints.find((c) => c.name === 'original')!
    expect(changed.definition).toBe(constraint.definition)
    expect(changed.xmlConstants?.arrays).not.toEqual(constraint.xmlConstants?.arrays)
    expect(diffCatalogs(before, after).modified.map((x) => x.entityId)).toContain(
      'public.xml_array_values',
    )
    await expect(pg.query('INSERT INTO xml_array_values VALUES($1)', [raw])).rejects.toMatchObject({
      code: '23514',
    })
    await pg.query('INSERT INTO xml_array_values VALUES($1)', ['<r/>'])
  } finally {
    await pg.close()
  }
}, 60_000)

it('decodes a native array frame in either byte order and rejects mismatched headers, element identities and unavailable encodings', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(
      `CREATE TABLE xml_frame(v int,CHECK(($array$[-2:0]={"<?xml version=\\"1.0\\"?><é/>",NULL,"<r/>"}$array$::xml[])[-2] IS DOCUMENT))`,
    )
    const arrayType = (await pg.query<{ oid: number }>("SELECT 'xml[]'::regtype::oid oid")).rows[0]!
        .oid,
      tree = (
        await pg.query<{ tree: string }>(
          "SELECT conbin::text tree FROM pg_constraint WHERE conrelid='xml_frame'::regclass",
        )
      ).rows[0]!.tree,
      bytes = Buffer.from(
        tree
          .match(
            new RegExp(`:consttype ${arrayType}\\b[\\s\\S]*?:constvalue \\d+ \\[([^\\]]+)\\]`, 'u'),
          )![1]!
          .trim()
          .split(/\s+/u)
          .map(Number)
          .map((n) => n & 255),
      ),
      element = (await pg.query<{ oid: number }>("SELECT 'xml'::regtype::oid oid")).rows[0]!.oid
    const expected = xmlArrayConstantText(bytes, element, true)
    expect(expected).toContain('<?xml version=\\"1.0\\"?><é/>')
    const foreign = Buffer.from(bytes)
    const read = (offset: number) => bytes.readInt32LE(offset)
    foreign.writeUInt32BE(bytes.length, 0)
    for (const offset of [4, 8, 12, 16, 20]) foreign.writeInt32BE(read(offset), offset)
    let position = read(8)
    for (const index of [0, 2]) {
      expect(bytes[24]! & (1 << index)).toBeGreaterThan(0)
      position = Math.ceil(position / 4) * 4
      const length = bytes.readUInt32LE(position) / 4
      foreign.writeUInt32BE(length, position)
      position += length
    }
    expect(xmlArrayConstantText(foreign, element, true)).toBe(expected)
    expect(xmlArrayConstantText(bytes, element + 1, true)).toBeUndefined()
    expect(xmlArrayConstantText(bytes, element, false)).toBeUndefined()
    expect(xmlArrayConstantText(bytes.subarray(0, bytes.length - 1), element, true)).toBeUndefined()
    const corrupt = Buffer.from(bytes)
    corrupt.writeInt32LE(7, 4)
    expect(xmlArrayConstantText(corrupt, element, true)).toBeUndefined()
  } finally {
    await pg.close()
  }
}, 60_000)
