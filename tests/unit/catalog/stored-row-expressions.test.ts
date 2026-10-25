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
