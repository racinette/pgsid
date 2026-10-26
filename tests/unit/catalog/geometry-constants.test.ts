import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseTree, tree, type Tree } from '../../../src/catalog/expression-tree.js'
import {
  storedGeometryConstant,
  validGeometryConstantStorage,
  type GeometryConstantStorage,
  type GeometryConstantType,
} from '../../../src/catalog/geometry-constant-storage.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import { constantScalarExpression } from '../../../src/codegen/shared/check-rust-constants.js'
const node = (bytes: Buffer, width: number, id = 41001): Tree => ({
  kind: 'CONST',
  fields: {
    consttype: [String(id)],
    constlen: [String(width)],
    constbyval: ['false'],
    constisnull: ['false'],
    constcollid: ['0'],
    constvalue: [String(bytes.length), [...bytes].map(String)],
  },
})
const samples: readonly [GeometryConstantType, string][] = [
  ['pg_catalog.point', "'(-0,NaN)'::point"],
  ['pg_catalog.line', "'{1,2,-0}'::line"],
  ['pg_catalog.lseg', "'[(1,2),(-0,Infinity)]'::lseg"],
  ['pg_catalog.box', "'(1,2),(-0,-0)'::box"],
  ['pg_catalog.circle', 'circle(point(-0.0,2.0),-3.0)'],
  ['pg_catalog.path', "'[(-0,NaN),(3,4)]'::path"],
  ['pg_catalog.polygon', "'((0,0),(-0,-0),(3,4))'::polygon"],
]
it('decodes native geometry constants with exact coordinate words, path flags and cached polygon bounds', async () => {
  const pg = await PGlite.create()
  try {
    for (const [type, sql] of samples) {
      const name = type.slice('pg_catalog.'.length),
        send = {
          point: 'point_send',
          line: 'line_send',
          lseg: 'lseg_send',
          box: 'box_send',
          circle: 'circle_send',
          path: 'path_send',
          polygon: 'poly_send',
        }[name]!
      if (name === 'circle') {
        const wire = (await pg.query<{ wire: string }>(`SELECT encode(${send}(${sql}),'hex') wire`))
            .rows[0]!.wire,
          b = Buffer.from(wire, 'hex')
        for (let at = 0; at < b.length; at += 8) b.subarray(at, at + 8).reverse()
        expect(storedGeometryConstant(node(b, 24), type, 'little')).toEqual({
          type,
          words: wire.match(/.{16}/gu),
        })
        continue
      }
      await pg.exec(`CREATE TABLE sample_${name}(n int,CHECK(ROW(n,${sql}) IS NOT NULL))`)
      const r = (
          await pg.query<{ source: string; wire: string }>(
            `SELECT conbin::text source,encode(${send}(${sql}),'hex') wire FROM pg_constraint WHERE conrelid='sample_${name}'::regclass`,
          )
        ).rows[0]!,
        constant = tree(parseTree(r.source.match(/\{CONST[^{}]*\}/u)![0]))!,
        value = storedGeometryConstant(constant, type, 'little')!
      expect(value).not.toBeNull()
      expect(validGeometryConstantStorage(value)).toBe(true)
      expect(value.words.join('')).toBe(
        type === 'pg_catalog.path'
          ? r.wire.slice(10)
          : type === 'pg_catalog.polygon'
            ? r.wire.slice(8)
            : r.wire,
      )
      if (type === 'pg_catalog.path') expect(value.closed).toBe(false)
      if (type === 'pg_catalog.polygon')
        expect(value.bounds).toEqual([
          '4008000000000000',
          '4010000000000000',
          '0000000000000000',
          '0000000000000000',
        ])
    }
  } finally {
    await pg.close()
  }
}, 30_000)
it('preserves arbitrary IEEE words across endian, signed byte spelling, packed headers and shifted IDs', () => {
  const words = ['8000000000000000', '7ff0000000000123', 'fff8000000000456', '0000000000000001'],
    bounds = [...words]
  for (const type of [
    'pg_catalog.point',
    'pg_catalog.line',
    'pg_catalog.lseg',
    'pg_catalog.box',
    'pg_catalog.circle',
    'pg_catalog.path',
    'pg_catalog.polygon',
  ] as const)
    for (const little of [true, false])
      for (const short of [true, false]) {
        const vector = ['pg_catalog.path', 'pg_catalog.polygon'].includes(type),
          count =
            type === 'pg_catalog.point'
              ? 2
              : ['pg_catalog.line', 'pg_catalog.circle'].includes(type)
                ? 3
                : 4,
          payloadWords = words.slice(0, count),
          offset = type === 'pg_catalog.path' ? 12 : type === 'pg_catalog.polygon' ? 36 : 0,
          body = Buffer.alloc(offset + payloadWords.length * 8)
        const write32 = (at: number, value: number) =>
            little ? body.writeInt32LE(value, at) : body.writeInt32BE(value, at),
          writeWord = (at: number, value: string) =>
            little
              ? body.writeBigUInt64LE(BigInt('0x' + value), at)
              : body.writeBigUInt64BE(BigInt('0x' + value), at)
        if (vector) write32(0, payloadWords.length / 2)
        if (type === 'pg_catalog.path') write32(4, 1)
        if (type === 'pg_catalog.polygon') bounds.forEach((word, i) => writeWord(4 + i * 8, word))
        payloadWords.forEach((word, i) => writeWord(offset + i * 8, word))
        const header = Buffer.alloc(vector ? (short ? 1 : 4) : 0),
          length = header.length + body.length
        if (vector) {
          if (short) header[0] = little ? length * 2 + 1 : length + 128
          else if (little) header.writeUInt32LE(length * 4)
          else header.writeUInt32BE(length)
        }
        const expected: GeometryConstantStorage = {
            type,
            words: payloadWords,
            ...(type === 'pg_catalog.path' ? { closed: true } : {}),
            ...(type === 'pg_catalog.polygon' ? { bounds } : {}),
          },
          constant = node(Buffer.concat([header, body]), vector ? -1 : body.length)
        constant.fields.constvalue![1] = (constant.fields.constvalue![1] as string[]).map((n) =>
          +n > 127 ? String(+n - 256) : n,
        )
        expect(
          constantScalarExpression({
            kind: 'certain',
            expression: { ...expected, kind: 'geometry-storage' },
          }),
        ).toBe(true)
        for (const id of [41001, 51001]) {
          constant.fields.consttype = [String(id)]
          expect(storedGeometryConstant(constant, type, little ? 'little' : 'big')).toEqual(
            expected,
          )
          expect(
            storedRowExpression(constant, {
              types: new Map([[id, type]]),
              functions: new Map(),
              columns: new Map(),
              byteOrder: little ? 'little' : 'big',
            }),
          ).toEqual({ PgsidStoredGeometry: expected })
        }
      }
})
it('rejects malformed geometry shapes, storage lengths and headers while retaining NULL', () => {
  for (const type of [
    'pg_catalog.point',
    'pg_catalog.line',
    'pg_catalog.lseg',
    'pg_catalog.box',
    'pg_catalog.circle',
    'pg_catalog.path',
    'pg_catalog.polygon',
  ] as const) {
    for (const size of [0, 1, 3, 7, 15])
      expect(storedGeometryConstant(node(Buffer.alloc(size), size), type, 'little')).toBeUndefined()
    const empty = node(Buffer.alloc(4), -1)
    empty.fields.constisnull = ['true']
    expect(storedGeometryConstant(empty, type, 'little')).toBeNull()
  }
  for (const value of [
    { type: 'pg_catalog.point', words: [] },
    { type: 'pg_catalog.point', words: ['0', '0'] },
    { type: 'pg_catalog.path', words: ['0'.repeat(16), '0'.repeat(16)] },
    { type: 'pg_catalog.polygon', words: ['0'.repeat(16), '0'.repeat(16)], bounds: [] },
    { type: 'pg_catalog.text', words: [] },
  ])
    expect(validGeometryConstantStorage(value)).toBe(false)
  for (const size of [16, 24, 40, 48]) {
    const bytes = Buffer.alloc(size)
    bytes.writeUInt32LE(size * 4)
    bytes.writeInt32LE(2147483647, 4)
    expect(storedGeometryConstant(node(bytes, -1), 'pg_catalog.path', 'little')).toBeUndefined()
    expect(storedGeometryConstant(node(bytes, -1), 'pg_catalog.polygon', 'little')).toBeUndefined()
  }
})
