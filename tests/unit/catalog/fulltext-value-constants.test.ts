import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import {
  storedTsvectorValue,
  validStoredTsvectorValue,
} from '../../../src/catalog/tsvector-constant-storage.js'
import {
  storedTsqueryValue,
  validTsqueryConstantStorage,
} from '../../../src/catalog/tsquery-constant-storage.js'
import { parseTree, tree, type Tree } from '../../../src/catalog/expression-tree.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../../src/codegen/shared/check-rust-source.js'

const constant = (bytes: Buffer, id: number): Tree => ({
  kind: 'CONST',
  fields: {
    consttype: [String(id)],
    constcollid: ['0'],
    constisnull: ['false'],
    constbyval: ['false'],
    constlen: ['-1'],
    constvalue: [String(bytes.length), [...bytes].map((n) => String(n > 127 ? n - 256 : n))],
  },
})
const framed = (body: Buffer, little: boolean, short: boolean) => {
  const header = Buffer.alloc(short ? 1 : 4),
    length = body.length + header.length
  if (short) header[0] = little ? length * 2 + 1 : length | 128
  else if (little) header.writeUInt32LE(length * 4)
  else header.writeUInt32BE(length)
  return Buffer.concat([header, body])
}
it('decodes full stored document entries with native bitfields, packed headers and noncanonical data placement', () => {
  for (const little of [true, false])
    for (const short of [true, false])
      for (const id of [51001, 61001]) {
        const body = Buffer.alloc(52, 165),
          write = (n: number, at: number) =>
            little ? body.writeUInt32LE(n, at) : body.writeUInt32BE(n, at),
          half = (n: number, at: number) =>
            little ? body.writeUInt16LE(n, at) : body.writeUInt16BE(n, at)
        write(2, 0)
        write(little ? 20 * 4096 + 2 * 2 : 2 * 1048576 + 20, 4)
        write(little ? 2 * 2 + 1 : 2147483648 + 2 * 1048576, 8)
        Buffer.from('ab').copy(body, 32)
        Buffer.from('é').copy(body, 12)
        half(2, 14)
        half(49152, 16)
        half(2, 18)
        const bytes = framed(body, little, short),
          node = constant(bytes, id),
          order = little ? 'little' : 'big',
          expected = {
            nativeBytes: 56,
            lexemeCount: 2,
            lexemes: [
              { text: 'ab', positions: [] },
              {
                text: 'é',
                positions: [
                  { position: 0, weight: 3 },
                  { position: 2, weight: 0 },
                ],
              },
            ],
          }
        expect(storedTsvectorValue(node, order, true)).toEqual(expected)
        expect(validStoredTsvectorValue(expected)).toBe(true)
        expect(
          storedRowExpression(node, {
            types: new Map([[id, 'pg_catalog.tsvector']]),
            functions: new Map(),
            columns: new Map(),
            byteOrder: order,
            utf8: true,
          }),
        ).toEqual({ PgsidStoredTsvector: expected })
        expect(storedTsvectorValue(node, order, false)).toBeUndefined()
        expect(
          storedTsvectorValue(constant(bytes.subarray(0, -1), id), order, true),
        ).toBeUndefined()
        const bad = Buffer.from(body)
        if (little) bad.writeUInt32LE(0xfffff001, 4)
        else bad.writeUInt32BE(0x801fffff, 4)
        expect(
          storedTsvectorValue(constant(framed(bad, little, short), id), order, true),
        ).toBeUndefined()
      }
  for (const input of [
    null,
    {},
    { nativeBytes: 8, lexemeCount: 1, lexemes: [] },
    { nativeBytes: 12, lexemeCount: 1, lexemes: [{ text: '', positions: [] }] },
    {
      nativeBytes: 20,
      lexemeCount: 1,
      lexemes: [
        {
          text: 'a',
          positions: [
            { position: 2, weight: 0 },
            { position: 1, weight: 0 },
          ],
        },
      ],
    },
  ])
    expect(validStoredTsvectorValue(input)).toBe(false)
})
it('recovers exact stored query trees in short and long headers without parsing their rendered grouping', async () => {
  const pg = await PGlite.create()
  try {
    for (const [i, text] of ['', 'a', 'a & (b & c)', 'é:*AB <2> (!x | 😀)'].entries()) {
      await pg.exec(`CREATE TABLE q_${i}(n int,CHECK(ROW(n,$q$${text}$q$::tsquery) IS NOT NULL))`)
      const source = (
          await pg.query<{ source: string }>(
            `SELECT conbin::text source FROM pg_constraint WHERE conrelid='q_${i}'::regclass`,
          )
        ).rows[0]!.source,
        node = tree(parseTree(source.match(/\{CONST[^{}]*\}/u)![0]))!,
        original = storedTsqueryValue(node, 'little', true)
      expect(validTsqueryConstantStorage(original)).toBe(true)
      const raw = node.fields.constvalue![1] as string[],
        bytes = Buffer.from(raw.map(Number)),
        body = bytes.subarray(4)
      if (body.length < 126)
        expect(
          storedTsqueryValue(constant(framed(body, true, true), 61001), 'little', true),
        ).toEqual(original)
      expect(storedTsqueryValue(node, 'little', false)).toEqual(
        /[^\x00-\x7f]/u.test(text) ? undefined : original,
      )
    }
    for (const value of [null, 0, {}, [], { nodes: [], nativeBytes: 8, root: 1 }])
      expect(validTsqueryConstantStorage(value)).toBe(false)
  } finally {
    await pg.close()
  }
})
it('captures full-text values recursively across independent catalogs and changed domain checks', async () => {
  const contexts: unknown[][] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted) await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int)")
      await pg.exec(`CREATE DOMAIN saved_vector AS tsvector CHECK(length(VALUE)<=3);
    CREATE TYPE saved AS(document saved_vector,query tsquery,old int);CREATE TYPE result AS(n int,old saved[]);
    CREATE TABLE history(n int,CHECK(ROW(n,'{"(\\"a:1A é:2B\\",\\"a & (b & c)\\",1)",NULL}'::saved[])::result IS NOT NULL));
    CREATE TABLE plain(n int,CHECK(ROW(n,'a:1A'::tsvector,'a & (b & c)'::tsquery) IS NOT NULL));
    ALTER TYPE result DROP ATTRIBUTE old;ALTER DOMAIN saved_vector ADD CHECK(length(VALUE)>3) NOT VALID;
    ALTER TYPE saved DROP ATTRIBUTE old;ALTER TYPE saved RENAME ATTRIBUTE document TO current_document;`)
      const c = await snapshotCatalog(pg),
        out: unknown[] = []
      for (const name of ['history', 'plain']) {
        const t = c.tables.find((t) => t.name === name)!,
          k = t.constraints[0]!
        expect(k.rowCoercionContext?.complete, name).toBe(true)
        const p = lowerTableCheck(
            t,
            k,
            c.enums,
            c.domains,
            'stored',
            c.rangeTypes,
            c.compositeTypeGraph,
          )!,
          g = prepareCheckRustGroup(
            [
              {
                identity: { schema: 'public', kind: 'table', owner: name, constraint: 'stored' },
                expression: p.expression,
              },
            ],
            { serverEncoding: 'UTF8' },
          )
        expect(g.checks[0]!.kind, name).toBe('supported')
        expect(g.evaluatorSource).not.toMatch(/tsvector_from_(?:stored_)?text|tsquery_from_text/u)
        out.push(k.rowCoercionContext)
      }
      await pg.exec('INSERT INTO history VALUES(1)')
      await expect(pg.exec('INSERT INTO history VALUES(NULL)')).rejects.toMatchObject({
        code: '23514',
      })
      contexts.push(out)
      ids.push((await pg.query<{ id: number }>("SELECT 'saved'::regtype::oid id")).rows[0]!.id)
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts[0]).toEqual(contexts[1])
}, 30_000)
