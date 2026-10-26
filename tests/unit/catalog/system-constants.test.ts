import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import {
  storedSystemConstant,
  validSystemConstantStorage,
  isSystemConstantType,
} from '../../../src/catalog/system-constant-storage.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import { parseTree, tree, type Tree } from '../../../src/catalog/expression-tree.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../../src/codegen/shared/check-rust-source.js'
const node = (bytes: Buffer, width: number, byval: boolean, id = 41001): Tree => ({
  kind: 'CONST',
  fields: {
    consttype: [String(id)],
    constlen: [String(width)],
    constbyval: [String(byval)],
    constisnull: ['false'],
    constcollid: ['0'],
    constvalue: [String(byval ? width : bytes.length), [...bytes].map(String)],
  },
})
it('retains unsigned scalar words across Datum widths, native byte orders and local type IDs', () => {
  for (const type of [
    'pg_catalog.oid',
    'pg_catalog.xid',
    'pg_catalog.cid',
    'pg_catalog.xid8',
    'pg_catalog.pg_lsn',
  ] as const) {
    const width = type === 'pg_catalog.xid8' || type === 'pg_catalog.pg_lsn' ? 8 : 4,
      max = width === 8 ? 18446744073709551615n : 4294967295n
    for (const value of [0n, 1n, BigInt(2) ** BigInt(width * 8 - 1), max])
      for (const little of [true, false])
        for (const datum of width === 8 ? [8] : [4, 8])
          for (const byval of width === 8 ? [true, false] : [true]) {
            const bytes = Buffer.alloc(datum, 165),
              start = little ? 0 : datum - width
            if (width === 8) {
              if (little) bytes.writeBigUInt64LE(value, start)
              else bytes.writeBigUInt64BE(value, start)
            } else if (little) bytes.writeUInt32LE(Number(value), start)
            else bytes.writeUInt32BE(Number(value), start)
            for (const id of [41001, 51001]) {
              const c = node(bytes, width, byval, id),
                expected = { type, value: value.toString() }
              c.fields.constvalue![1] = (c.fields.constvalue![1] as string[]).map((n) =>
                +n > 127 ? String(+n - 256) : n,
              )
              expect(storedSystemConstant(c, type, little ? 'little' : 'big')).toEqual(expected)
              expect(
                storedRowExpression(c, {
                  types: new Map([[id, type]]),
                  functions: new Map(),
                  columns: new Map(),
                  byteOrder: little ? 'little' : 'big',
                }),
              ).toEqual({ PgsidStoredSystem: expected })
              expect(validSystemConstantStorage(expected)).toBe(true)
            }
          }
  }
})
it('decodes tuple-pointer block halves and offsets without a native 32-bit reinterpretation', () => {
  for (const block of [0, 1, 0x12345678, 0xffffffff])
    for (const offset of [0, 1, 0x1234, 65535])
      for (const little of [true, false]) {
        const bytes = Buffer.alloc(6),
          parts = [Math.floor(block / 65536), block % 65536, offset]
        parts.forEach((v, i) =>
          little ? bytes.writeUInt16LE(v, i * 2) : bytes.writeUInt16BE(v, i * 2),
        )
        expect(
          storedSystemConstant(node(bytes, 6, false), 'pg_catalog.tid', little ? 'little' : 'big'),
        ).toEqual({
          type: 'pg_catalog.tid',
          value: (BigInt(block) * 65536n + BigInt(offset)).toString(),
        })
      }
})
it('rejects malformed storage, logical overflow and catalog-alias carriers', () => {
  for (const type of [
    'pg_catalog.oid',
    'pg_catalog.xid',
    'pg_catalog.cid',
    'pg_catalog.xid8',
    'pg_catalog.pg_lsn',
    'pg_catalog.tid',
  ] as const) {
    for (const value of ['-1', '01', '+1', '1.0', '0x1', '18446744073709551616', '9'.repeat(100)])
      expect(validSystemConstantStorage({ type, value })).toBe(false)
    const empty = node(Buffer.alloc(0), 0, true)
    expect(storedSystemConstant(empty, type, 'little')).toBeUndefined()
    empty.fields.constisnull = ['true']
    expect(storedSystemConstant(empty, type, 'little')).toBeNull()
  }
  for (const type of [
    'pg_catalog.regclass',
    'pg_catalog.regtype',
    'pg_catalog.regrole',
    'pg_catalog.regproc',
  ]) {
    expect(isSystemConstantType(type)).toBe(false)
    expect(validSystemConstantStorage({ type, value: '1' })).toBe(false)
  }
  expect(validSystemConstantStorage({ type: 'pg_catalog.tid', value: '281474976710656' })).toBe(
    false,
  )
  for (const type of ['pg_catalog.oid', 'pg_catalog.xid', 'pg_catalog.cid'])
    expect(validSystemConstantStorage({ type, value: '4294967296' })).toBe(false)
  const c = node(Buffer.alloc(4), 4, true)
  c.fields.constvalue![1] = ['0', '0', '0', '256']
  expect(storedSystemConstant(c, 'pg_catalog.oid', 'little')).toBeUndefined()
})
it('captures native numeric values independently of catalog IDs and leaves symbolic references unresolved', async () => {
  const contexts: unknown[] = [],
    ids: number[] = []
  for (const shifted of [false, true]) {
    const pg = await PGlite.create()
    try {
      if (shifted) await pg.exec("CREATE TYPE padding AS ENUM('x');CREATE TABLE padding_row(n int)")
      await pg.exec(`CREATE TABLE reference(n int);CREATE TYPE result_value AS(n int,old tid);
 CREATE TABLE history(n int,CHECK(ROW(n,'(305419896,4660)'::tid)::result_value IS NOT NULL));
 CREATE TABLE numeric(value oid,CHECK(value='4294967295'::oid));
 CREATE TABLE symbolic(value oid,CHECK(value='reference'::regclass::oid));
 ALTER TYPE result_value DROP ATTRIBUTE old;`)
      const c = await snapshotCatalog(pg),
        id = (await pg.query<{ id: number }>("SELECT 'reference'::regclass::oid id")).rows[0]!.id
      for (const name of ['history', 'numeric']) {
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
          g = prepareCheckRustGroup([
            {
              identity: { schema: 'public', kind: 'table', owner: name, constraint: 'stored' },
              expression: p.expression,
            },
          ])
        expect(g.checks[0]!.kind).toBe('supported')
        expect(g.evaluatorSource).not.toMatch(/oid_from_text\(|tid_from_text\(/u)
        contexts.push(k.rowCoercionContext)
      }
      const t = c.tables.find((t) => t.name === 'symbolic')!,
        p = lowerTableCheck(
          t,
          t.constraints[0]!,
          c.enums,
          c.domains,
          'stored',
          c.rangeTypes,
          c.compositeTypeGraph,
        )!,
        g = prepareCheckRustGroup([
          {
            identity: { schema: 'public', kind: 'table', owner: 'symbolic', constraint: 'stored' },
            expression: p.expression,
          },
        ])
      expect(g.evaluatorSource ?? '').not.toContain(`make_oid_value(${id}i64)`)
      expect(JSON.stringify(p.expression)).not.toContain(`"value":"${id}"`)
      await pg.query('INSERT INTO symbolic VALUES($1)', [id])
      await expect(pg.query('INSERT INTO symbolic VALUES($1)', [id + 1])).rejects.toMatchObject({
        code: '23514',
      })
      const raw = (
          await pg.query<{ source: string }>(
            "SELECT conbin::text source FROM pg_constraint WHERE conrelid='history'::regclass",
          )
        ).rows[0]!.source,
        constant = tree(parseTree(raw.match(/\{CONST[^{}]*\}/u)![0]))!
      expect(storedSystemConstant(constant, 'pg_catalog.tid', 'little')).toEqual({
        type: 'pg_catalog.tid',
        value: (0x12345678n * 65536n + 0x1234n).toString(),
      })
      ids.push(id)
    } finally {
      await pg.close()
    }
  }
  expect(ids[0]).not.toBe(ids[1])
  expect(contexts.slice(0, 2)).toEqual(contexts.slice(2))
}, 30_000)
