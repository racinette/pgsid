import { PGlite } from '@electric-sql/pglite'
import { expect, it } from 'vitest'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { restoreXmlStorageText } from '../../../src/catalog/xml-storage-text.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'

const quote = (text: string) => '"' + text.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"'

it('captures original XML text in whole-record constants independently of erased record output', async () => {
  const pg = await PGlite.create()
  try {
    const raw = '<?xml version="1.0" encoding="UTF8"?><r/>',
      array = '{' + quote(raw) + ',NULL,' + quote('<é/>') + '}',
      record = '(' + quote(raw) + ',17,' + quote(array) + ')'
    await pg.exec(`CREATE TYPE xml_pair AS(x xml,n int4,xs xml[]);
      CREATE TABLE xml_records(expected text,CHECK(($record$${record}$record$::xml_pair).x::text=expected));`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'xml_records')!,
      constraint = table.constraints[0]!
    expect(constraint.xmlConstants).toMatchObject({
      complete: true,
      containers: [
        {
          value: {
            kind: 'record',
            fields: [
              { kind: 'xml', text: raw },
              null,
              {
                kind: 'array',
                elements: [{ kind: 'xml', text: raw }, null, { kind: 'xml', text: '<é/>' }],
              },
            ],
          },
        },
      ],
    })
    const printed = (await pg.query<{ value: string }>('SELECT $1::xml_pair::text value', [record]))
        .rows[0]!.value,
      restored = restoreXmlStorageText(printed, constraint.xmlConstants!.containers![0]!.value!)
    expect(restored).toBeDefined()
    expect(
      JSON.stringify(
        lowerTableCheck(
          table,
          constraint,
          catalog.enums,
          catalog.domains,
          'stored',
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
        )!.expression,
      ),
    ).toContain('"xmlStorage":true')
    expect(
      (
        await pg.query<{ x: string; array_value: string }>(
          'SELECT ($1::xml_pair).x::text x,(($1::xml_pair).xs)[1]::text AS array_value',
          [restored],
        )
      ).rows[0],
    ).toEqual({ x: raw, array_value: raw })
    await pg.query('INSERT INTO xml_records VALUES($1)', [raw])
    await expect(pg.query('INSERT INTO xml_records VALUES($1)', ['<r/>'])).rejects.toMatchObject({
      code: '23514',
    })
  } finally {
    await pg.close()
  }
}, 60_000)

it('retains logical XML facets across independent catalog identities and records behavioral changes hidden by printed CHECK text', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shift of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shift) await pg.exec("CREATE TYPE consumed AS ENUM('x');DROP TYPE consumed")
      const raw = '<?xml version="1.0"?><r/>',
        original = '(' + quote(raw) + ')'
      await pg.exec(
        `CREATE TYPE xml_identity AS(document xml);CREATE TABLE xml_saved(expected text,CONSTRAINT original CHECK(($record$${original}$record$::xml_identity).document::text=expected))`,
      )
      const first = await snapshotCatalog(pg),
        table = first.tables.find((t) => t.name === 'xml_saved')!,
        constraint = table.constraints[0]!
      contexts.push(constraint.xmlConstants)
      ids.push(
        (await pg.query<{ oid: number }>("SELECT 'xml_identity'::regtype::oid oid")).rows[0]!.oid,
      )
      await pg.exec(
        `ALTER TABLE xml_saved DROP CONSTRAINT original;ALTER TABLE xml_saved ADD CONSTRAINT original CHECK(($record$(<r/>)$record$::xml_identity).document::text=expected)`,
      )
      const after = await snapshotCatalog(pg),
        changed = after.tables.find((t) => t.name === 'xml_saved')!.constraints[0]!
      expect(changed.definition).toBe(constraint.definition)
      expect(changed.xmlConstants?.containers).not.toEqual(constraint.xmlConstants?.containers)
      const { diffCatalogs } = await import('../../../src/catalog/diff.js')
      expect(diffCatalogs(first, after).modified.map((c) => c.entityId)).toContain(
        'public.xml_saved',
      )
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 60_000)

it('decodes native tuple byte orders without fixed catalog IDs and refuses malformed or unavailable storage', async () => {
  const pg = await PGlite.create()
  try {
    const raw = '<?xml version="1.0"?><é/>',
      record = '(' + quote(raw) + ',17,' + quote('') + ')'
    await pg.exec(
      `CREATE TYPE xml_frame AS(x xml,n int4,z xml);CREATE TABLE xml_frames(expected text,CHECK(($record$${record}$record$::xml_frame).x::text=expected))`,
    )
    const rows = (
        await pg.query<
          import('../../../src/catalog/xml-container-constants.js').XmlStorageType
        >(`SELECT t.oid,n.nspname||'.'||t.typname identity,t.typtype kind,t.typbasetype base,NULL::oid element,t.typlen::int length,t.typalign alignment,t.typdelim delimiter,
   COALESCE((SELECT json_agg(json_build_object('type',a.atttypid::bigint,'length',a.attlen::int,'alignment',a.attalign,'dropped',a.attisdropped) ORDER BY attnum) FROM pg_attribute a WHERE a.attrelid=t.typrelid AND a.attnum>0),'[]'::json) attributes
   FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.oid IN('xml_frame'::regtype,'xml'::regtype,'int4'::regtype)`)
      ).rows,
      types = new Map(rows.map((t) => [t.oid, t])),
      oid = rows.find((t) => t.identity === 'public.xml_frame')!.oid,
      tree = (
        await pg.query<{ tree: string }>(
          "SELECT conbin::text tree FROM pg_constraint WHERE conrelid='xml_frames'::regclass",
        )
      ).rows[0]!.tree,
      bytes = Buffer.from(
        tree
          .match(
            new RegExp(`:consttype ${oid}\\b[\\s\\S]*?:constvalue \\d+ \\[([^\\]]+)\\]`, 'u'),
          )![1]!
          .trim()
          .split(/\s+/u)
          .map((n) => Number(n) & 255),
      )
    const { xmlContainerConstant } = await import('../../../src/catalog/xml-container-constants.js')
    const expected = xmlContainerConstant(bytes, oid, types, true)
    expect(expected).toEqual({
      kind: 'record',
      fields: [{ kind: 'xml', text: raw }, null, { kind: 'xml', text: '' }],
    })
    const foreign = Buffer.from(bytes)
    foreign.writeUInt32BE(bytes.length, 0)
    foreign.writeInt32BE(bytes.readInt32LE(4), 4)
    foreign.writeUInt32BE(oid, 8)
    foreign.writeUInt16BE(bytes.readUInt16LE(18), 18)
    foreign.writeUInt16BE(bytes.readUInt16LE(20), 20)
    let position = bytes[22]!
    for (const attribute of rows.find((t) => t.oid === oid)!.attributes) {
      if (attribute.length === -1) {
        if (bytes[position] === 0) position = Math.ceil(position / 4) * 4
        const first = bytes[position]!,
          short = (first & 1) !== 0,
          length = short ? first >>> 1 : bytes.readUInt32LE(position) >>> 2
        if (short) foreign[position] = 128 | length
        else foreign.writeUInt32BE(length, position)
        position += length
      } else {
        position = Math.ceil(position / 4) * 4
        foreign.writeInt32BE(bytes.readInt32LE(position), position)
        position += attribute.length
      }
    }
    expect(xmlContainerConstant(foreign, oid, types, true)).toEqual(expected)
    expect(xmlContainerConstant(bytes, oid + 1, types, true)).toBeUndefined()
    expect(xmlContainerConstant(bytes, oid, types, false)).toBeUndefined()
    expect(
      xmlContainerConstant(bytes.subarray(0, bytes.length - 1), oid, types, true),
    ).toBeUndefined()
    const corrupt = Buffer.from(bytes)
    corrupt.writeUInt16LE(2047, 18)
    expect(xmlContainerConstant(corrupt, oid, types, true)).toBeUndefined()
  } finally {
    await pg.close()
  }
}, 60_000)
