import { expect, it } from 'vitest'
import { parseTree } from '../../../src/catalog/expression-tree.js'
import {
  storedRowExpression,
  type StoredRowExpressionInput,
} from '../../../src/catalog/stored-row-expressions.js'

it('decodes captured integer datums with explicit source byte order before creating portable expressions', () => {
  const expressions: unknown[] = []
  for (const byteOrder of ['little', 'big'] as const)
    for (const typeOid of [23111, 45678]) {
      const input: StoredRowExpressionInput = {
          types: new Map([[typeOid, 'pg_catalog.int4']]),
          functions: new Map(),
          columns: new Map(),
          byteOrder,
        },
        data = byteOrder === 'little' ? '254 255 255 255' : '255 255 255 254'
      expressions.push(
        storedRowExpression(
          parseTree(
            `{CONST :consttype ${typeOid} :constlen 4 :constbyval true :constisnull false :constvalue 4 [ ${data} ]}`,
          ),
          input,
        ),
      )
      expect(
        storedRowExpression(
          parseTree(
            `{CONST :consttype ${typeOid} :constlen 4 :constbyval true :constisnull false :constvalue 4 [ 254 255 ]}`,
          ),
          input,
        ),
      ).toBeUndefined()
      expect(
        storedRowExpression(
          parseTree(
            `{CONST :consttype ${typeOid} :constlen 4 :constbyval true :constisnull false :constvalue 4 [ 256 255 255 255 ]}`,
          ),
          input,
        ),
      ).toBeUndefined()
    }
  expect(expressions.every((e) => JSON.stringify(e) === JSON.stringify(expressions[0]))).toBe(true)
  expect(JSON.stringify(expressions[0])).toContain('-2')
  expect(JSON.stringify(expressions)).not.toMatch(/23111|45678/)
})

it('recovers narrow Boolean/integer values from both Datum widths and int8 reference storage', () => {
  for (const [type, value, width] of [
    ['bool', 0n, 1],
    ['bool', 1n, 1],
    ['int2', -32768n, 2],
    ['int4', -2n, 4],
    ['int8', -9223372036854775808n, 8],
  ] as const) {
    const expressions: unknown[] = []
    for (const byteOrder of ['little', 'big'] as const)
      for (const datumWidth of width === 8 ? [8] : [4, 8]) {
        const bytes = Buffer.alloc(datumWidth)
        if (datumWidth === 8) {
          if (byteOrder === 'little') bytes.writeBigInt64LE(value)
          else bytes.writeBigInt64BE(value)
        } else if (byteOrder === 'little') bytes.writeInt32LE(Number(value))
        else bytes.writeInt32BE(Number(value))
        expressions.push(
          storedRowExpression(
            parseTree(
              `{CONST :consttype 12345 :constlen ${width} :constbyval ${width === 8 ? 'false' : 'true'} :constisnull false :constvalue ${width} [ ${[...bytes].join(' ')} ]}`,
            ),
            {
              types: new Map([[12345, 'pg_catalog.' + type]]),
              columns: new Map(),
              functions: new Map(),
              byteOrder,
            },
          ),
        )
      }
    expect(expressions[0], type).toBeDefined()
    expect(
      expressions.every((e) => JSON.stringify(e) === JSON.stringify(expressions[0])),
      type,
    ).toBe(true)
    expect(JSON.stringify(expressions[0])).toContain(
      type === 'bool' ? (value === 0n ? 'false' : 'true') : value.toString(),
    )
  }
})

it('recovers lossless text with explicit storage order and canonical collation identities', () => {
  const original = "a😊'\\b\u0001",
    expressions: unknown[] = []
  for (const byteOrder of ['little', 'big'] as const)
    for (const short of [false, true])
      for (const id of [12345, 54321]) {
        const body = Buffer.from(original),
          header = Buffer.alloc(short ? 1 : 4),
          length = header.length + body.length
        if (short) header[0] = byteOrder === 'little' ? length * 2 + 1 : length + 128
        else if (byteOrder === 'little') header.writeUInt32LE(length * 4)
        else header.writeUInt32BE(length)
        const raw = parseTree(
            `{CONST :consttype ${id} :constcollid ${id + 1} :constlen -1 :constbyval false :constisnull false :constvalue ${length} [ ${[...header, ...body].join(' ')} ]}`,
          ),
          input: StoredRowExpressionInput = {
            types: new Map([[id, 'pg_catalog.text']]),
            columns: new Map(),
            functions: new Map(),
            byteOrder,
            utf8: true,
            collations: new Map([
              [id + 1, { schema: 'pg_catalog', name: 'default', deterministic: true }],
            ]),
          }
        const expression = storedRowExpression(raw, input)
        expressions.push(expression)
        expect(JSON.stringify(expression)).toContain(JSON.stringify(original).slice(1, -1))
        expect(storedRowExpression(raw, { ...input, utf8: false })).toBeUndefined()
        expect(storedRowExpression(raw, { ...input, collations: new Map() })).toBeUndefined()
        expect(
          storedRowExpression(raw, {
            ...input,
            byteOrder: byteOrder === 'little' ? 'big' : 'little',
          }),
        ).toBeUndefined()
      }
  expect(expressions.every((e) => JSON.stringify(e) === JSON.stringify(expressions[0]))).toBe(true)
  expect(JSON.stringify(expressions)).not.toMatch(/12345|54321/)
})
