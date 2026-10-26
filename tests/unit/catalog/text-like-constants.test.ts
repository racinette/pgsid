import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import {
  storedTextLikeConstant,
  validTextLikeConstantStorage,
} from '../../../src/catalog/text-like-constant-storage.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import { parseTree, tree, type Tree } from '../../../src/catalog/expression-tree.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../../src/codegen/shared/check-rust-source.js'
const node = (bytes: number[], width: number, byval = false, oid = 41001): Tree => ({
  kind: 'CONST',
  fields: {
    consttype: [String(oid)],
    constlen: [String(width)],
    constbyval: [String(byval)],
    constisnull: ['false'],
    constcollid: ['0'],
    constvalue: [String(byval ? width : bytes.length), bytes.map(String)],
  },
})
it('decodes every stored char byte independently of Datum width, signed byte spelling, endian and local type IDs', () => {
  for (let byte = 0; byte < 256; byte++)
    for (const byteOrder of ['little', 'big'] as const)
      for (const width of [4, 8])
        for (const signed of [false, true]) {
          const bytes = Array<number>(width).fill(0)
          bytes[byteOrder === 'little' ? 0 : width - 1] = signed && byte > 127 ? byte - 256 : byte
          const constant = node(bytes, 1, true),
            expected = { type: 'pg_catalog."char"', value: byte }
          expect(storedTextLikeConstant(constant, 'pg_catalog."char"', byteOrder, false)).toEqual(
            expected,
          )
          expect(
            storedRowExpression(constant, {
              types: new Map([[41001, 'pg_catalog."char"']]),
              functions: new Map(),
              columns: new Map(),
              byteOrder,
            }),
          ).toEqual({ PgsidStoredTextLike: expected })
        }
})
it('decodes name storage using its captured width and ignores bytes after the first terminator', () => {
  for (const value of ['', 'alpha ', 'é😊', 'a'.repeat(120)])
    for (const byteOrder of ['little', 'big'] as const) {
      const body = Buffer.from(value),
        width = body.length + 7,
        bytes = Buffer.alloc(width, 255)
      body.copy(bytes)
      bytes[body.length] = 0
      const constant = node([...bytes], width)
      expect(storedTextLikeConstant(constant, 'pg_catalog.name', byteOrder, true)).toEqual({
        type: 'pg_catalog.name',
        value,
      })
      expect(storedTextLikeConstant(constant, 'pg_catalog.name', byteOrder, false)).toEqual(
        /[^\x00-\x7f]/u.test(value) ? undefined : { type: 'pg_catalog.name', value },
      )
    }
})
it('retains refcursor text through either varlena header and byte order without a name length limit', () => {
  for (const value of ['', 'cursor é😊', 'a'.repeat(1000)])
    for (const byteOrder of ['little', 'big'] as const)
      for (const short of [false, true]) {
        const body = Buffer.from(value)
        if (short && body.length + 1 > 127) continue
        const header = Buffer.alloc(short ? 1 : 4),
          length = header.length + body.length
        if (short) header[0] = byteOrder === 'little' ? length * 2 + 1 : length + 128
        else if (byteOrder === 'little') header.writeUInt32LE(length * 4)
        else header.writeUInt32BE(length)
        expect(
          storedTextLikeConstant(
            node([...header, ...body], -1),
            'pg_catalog.refcursor',
            byteOrder,
            true,
          ),
        ).toEqual({ type: 'pg_catalog.refcursor', value })
      }
})
it('rejects malformed storage and logical carriers rather than guessing bytes or encoding', () => {
  for (const c of [
    node([1], 1, true),
    node([0, 0, 0, 256], 1, true),
    node([0, 0, 0, 0], 2, true),
    node([0, 0, 0, 0], 1),
    node([0, 0, 0, -129], 1, true),
  ])
    expect(storedTextLikeConstant(c, 'pg_catalog."char"', 'little', true)).toBeUndefined()
  for (const bytes of [
    [65, 66],
    [195, 0],
    [240, 159, 0],
  ])
    expect(
      storedTextLikeConstant(node(bytes, bytes.length), 'pg_catalog.name', 'little', true),
    ).toBeUndefined()
  for (const value of [-1, 256, 1.5, NaN, '1', null])
    expect(validTextLikeConstantStorage({ type: 'pg_catalog."char"', value })).toBe(false)
  for (const value of ['a\0b', '\ud800', '\udc00', null, 1])
    for (const type of ['pg_catalog.name', 'pg_catalog.refcursor'])
      expect(validTextLikeConstantStorage({ type, value })).toBe(false)
  for (const type of ['pg_catalog.name', 'pg_catalog.refcursor'])
    expect(validTextLikeConstantStorage({ type, value: 'é😊' })).toBe(true)
  expect(validTextLikeConstantStorage({ type: 'pg_catalog.text', value: 'x' })).toBe(false)
})
it('captures native values and arrays independently of catalog IDs without repeating name input', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted) await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int)")
      await pg.exec(`CREATE TYPE result_value AS(n int,old name);
 CREATE TABLE history(n int,CHECK(ROW(n,'${'é😊'.repeat(30)}'::name)::result_value IS NOT NULL));
 CREATE TABLE direct(n int,CHECK(namesend('alpha'::name)='\\x616c706861'::bytea));
 CREATE TABLE octet(n int,CHECK(charsend('\\377'::"char")='\\xff'::bytea));
 ALTER TYPE result_value DROP ATTRIBUTE old;`)
      const c = await snapshotCatalog(pg)
      for (const name of ['history', 'direct', 'octet']) {
        const t = c.tables.find((t) => t.name === name)!,
          k = t.constraints[0]!
        expect(k.rowCoercionContext?.complete, name).toBe(true)
        expect(JSON.stringify(k.rowCoercionContext)).not.toMatch(/"\w*oid\w*":/iu)
        for (const origin of ['source', 'stored'] as const) {
          const expression = lowerTableCheck(
              t,
              k,
              c.enums,
              c.domains,
              origin,
              c.rangeTypes,
              c.compositeTypeGraph,
            )!.expression,
            group = prepareCheckRustGroup(
              [
                {
                  identity: { schema: 'public', kind: 'table', owner: name, constraint: origin },
                  expression,
                },
              ],
              { serverEncoding: 'UTF8', clientEncoding: 'UTF8', defaultCollation: 'C' },
            )
          expect(group.checks[0]!.kind, name).toBe('supported')
          expect(group.evaluatorSource).not.toContain('name_from_text_context(')
          expect(group.evaluatorSource).not.toContain('internal_char_from_text(')
        }
      }
      const raw = (
          await pg.query<{ source: string }>(
            "SELECT conbin::text source FROM pg_constraint WHERE conrelid='octet'::regclass",
          )
        ).rows[0]!.source,
        constant = tree(parseTree([...raw.matchAll(/\{CONST[^{}]*\}/gu)][0]![0]))!
      expect(storedTextLikeConstant(constant, 'pg_catalog."char"', 'little', true)).toEqual({
        type: 'pg_catalog."char"',
        value: 255,
      })
      await pg.exec(
        'INSERT INTO history VALUES(1);INSERT INTO direct VALUES(1);INSERT INTO octet VALUES(1)',
      )
      contexts.push(
        c.tables
          .filter((t) => ['history', 'direct', 'octet'].includes(t.name))
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
