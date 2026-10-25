import { expect, it } from 'vitest'
import { storedContainerConstant } from '../../../src/catalog/container-value-constant-storage.js'
import type { ConstantStorageType } from '../../../src/catalog/container-constant-storage.js'
import type { Tree } from '../../../src/catalog/expression-tree.js'

it('recovers portable range flags, ordered multiranges and dropped tuple fields in either source byte order', () => {
  const outputs: unknown[] = []
  for (const little of [true, false])
    for (const offset of [0, 1000])
      for (const alignment of [4, 8] as const) {
        const scalar: ConstantStorageType = {
            oid: 101 + offset,
            identity: 'pg_catalog.int4',
            kind: 'b',
            base: 0,
            element: null,
            length: 4,
            alignment: 'i',
            delimiter: ',',
            attributes: [],
          },
          range = {
            ...scalar,
            oid: 102 + offset,
            identity: 'public.span',
            kind: 'r',
            length: -1,
            rangeSubtype: scalar.oid,
          },
          multi = {
            ...range,
            oid: 103 + offset,
            identity: 'public.spans',
            kind: 'm',
            rangeSubtype: undefined,
            rangeType: range.oid,
          },
          record = {
            ...scalar,
            oid: 104 + offset,
            identity: 'public.reading',
            kind: 'c',
            length: -1,
            attributes: [
              { type: scalar.oid, length: 4, alignment: 'i', dropped: true },
              { type: range.oid, length: -1, alignment: 'i', dropped: false },
              { type: multi.oid, length: -1, alignment: 'i', dropped: false },
            ],
          },
          types = new Map([scalar, range, multi, record].map((t) => [t.oid, t])),
          word = (b: Buffer, position: number, value: number) =>
            little
              ? b.writeUInt32LE(value >>> 0, position)
              : b.writeUInt32BE(value >>> 0, position),
          short = (b: Buffer, position: number, value: number) =>
            little ? b.writeUInt16LE(value, position) : b.writeUInt16BE(value, position),
          frame = (size: number) => {
            const b = Buffer.alloc(size)
            word(b, 0, little ? size * 4 : size)
            return b
          },
          rangeBytes = (flags: number, lower = 1, upper = 3) => {
            const values =
                flags & 1 ? [] : [...(flags & 8 ? [] : [lower]), ...(flags & 16 ? [] : [upper])],
              b = frame(9 + 4 * values.length)
            word(b, 4, range.oid)
            values.forEach((v, i) => word(b, 8 + 4 * i, v))
            b[b.length - 1] = flags
            return b
          },
          multiBytes = (count: number) => {
            const flags = 12 + Math.max(0, count - 1) * 4,
              begin = count ? Math.ceil((flags + count) / 4) * 4 : 12,
              b = frame(begin + count * 8)
            word(b, 4, multi.oid)
            word(b, 8, count)
            for (let i = 0; i < count; i++) {
              if (i) word(b, 12 + (i - 1) * 4, i % 4 === 0 ? 0x80000000 | (i * 8) : 8)
              b[flags + i] = 2
              word(b, begin + i * 8, i * 4)
              word(b, begin + i * 8 + 4, i * 4 + 2)
            }
            return b
          },
          decode = (b: Buffer, type: number) => {
            const node: Tree = {
              kind: 'CONST',
              fields: {
                consttype: [String(type)],
                constlen: ['-1'],
                constbyval: ['false'],
                constisnull: ['false'],
                constvalue: [String(b.length), [...b].map(String)],
              },
            }
            return storedContainerConstant(
              node,
              types,
              little ? 'little' : 'big',
              alignment,
              (bytes, type) => ({
                integer: little ? bytes.readInt32LE(0) : bytes.readInt32BE(0),
                type: type.identity,
              }),
            )
          },
          values = [1, 2, 4, 8, 16, 24, 2 | 16, 4 | 8, 2 | 4].map((flags) =>
            decode(rangeBytes(flags), range.oid),
          )
        expect(values.every((v) => v !== undefined)).toBe(true)
        expect(decode(rangeBytes(1 | 2), range.oid)).toBeUndefined()
        expect(decode(rangeBytes(8 | 2), range.oid)).toBeUndefined()
        const ranges = [0, 1, 2, 6].map((n) => decode(multiBytes(n), multi.oid))
        expect(ranges.every((v) => v !== undefined)).toBe(true)
        const r = rangeBytes(2),
          m = multiBytes(6),
          start = 28,
          second = Math.ceil((start + r.length) / 4) * 4,
          tuple = frame(second + m.length)
        word(tuple, 4, 0xffffffff)
        word(tuple, 8, record.oid)
        short(tuple, 18, 3)
        tuple[22] = 24
        word(tuple, 24, 123)
        r.copy(tuple, start)
        m.copy(tuple, second)
        const value = decode(tuple, record.oid)
        expect(value).toBeDefined()
        expect(JSON.stringify(value)).not.toContain('123')
        const corrupt = Buffer.from(tuple)
        word(corrupt, 8, record.oid + 999)
        expect(decode(corrupt, record.oid)).toBeUndefined()
        expect(decode(tuple.subarray(0, tuple.length - 1), record.oid)).toBeUndefined()
        outputs.push({ values, ranges, value })
      }
  expect(outputs.every((value) => JSON.stringify(value) === JSON.stringify(outputs[0]))).toBe(true)
})

it('uses the captured double alignment for multirange bound storage rather than target layout', () => {
  const values: unknown[] = []
  for (const little of [true, false])
    for (const alignment of [4, 8] as const) {
      const scalar: ConstantStorageType = {
          oid: 101,
          identity: 'pg_catalog.int8',
          kind: 'b',
          base: 0,
          element: null,
          length: 8,
          alignment: 'd',
          delimiter: ',',
          attributes: [],
        },
        range = {
          ...scalar,
          oid: 102,
          identity: 'public.span',
          kind: 'r',
          length: -1,
          rangeSubtype: 101,
        },
        multi = {
          ...range,
          oid: 103,
          identity: 'public.spans',
          kind: 'm',
          rangeSubtype: undefined,
          rangeType: 102,
        },
        types = new Map([scalar, range, multi].map((t) => [t.oid, t])),
        begin = Math.ceil(18 / alignment) * alignment,
        b = Buffer.alloc(begin + 32),
        word = (at: number, value: number) =>
          little ? b.writeUInt32LE(value, at) : b.writeUInt32BE(value, at)
      word(0, little ? b.length * 4 : b.length)
      word(4, 103)
      word(8, 2)
      word(12, 16)
      b[16] = 2
      b[17] = 4
      for (const [i, n] of [1n, 3n, 5n, 7n].entries()) {
        if (little) b.writeBigInt64LE(n, begin + 8 * i)
        else b.writeBigInt64BE(n, begin + 8 * i)
      }
      const node: Tree = {
          kind: 'CONST',
          fields: {
            consttype: ['103'],
            constlen: ['-1'],
            constbyval: ['false'],
            constisnull: ['false'],
            constvalue: [String(b.length), [...b].map(String)],
          },
        },
        value = storedContainerConstant(
          node,
          types,
          little ? 'little' : 'big',
          alignment,
          (bytes) => ({
            integer: (little ? bytes.readBigInt64LE(0) : bytes.readBigInt64BE(0)).toString(),
          }),
        )
      expect(value).toBeDefined()
      values.push(value)
      expect(
        storedContainerConstant(
          node,
          types,
          little ? 'little' : 'big',
          alignment === 4 ? 8 : 4,
          () => ({ integer: 'wrong' }),
        ),
      ).toBeUndefined()
    }
  expect(values.every((v) => JSON.stringify(v) === JSON.stringify(values[0]))).toBe(true)
})
