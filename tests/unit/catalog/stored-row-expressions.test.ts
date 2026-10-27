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

it('preserves a catalog cast target when PostgreSQL retags a binary-compatible function result', async () => {
  const { parse } = await import('libpg-query')
  const { builtinCast, builtinMetadata } =
    await import('../../../src/postgres/builtins/inventory.js')
  await parse('SELECT 1')
  const source = 'pg_catalog.bpchar',
    target = 'pg_catalog."varchar"'
  const cast = builtinCast(source, target)!
  const callable = builtinMetadata(cast.implementation!)
  expect(cast.method).toBe('f')
  expect(callable.kind).toBe('function')
  if (callable.kind !== 'function') throw new Error('Expected a captured cast function')
  expect(callable.result).toBe('pg_catalog.text')
  const captured: unknown[] = []
  for (const base of [11000, 55000]) {
    const input: StoredRowExpressionInput = {
      types: new Map([
        [base, source],
        [base + 1, target],
        [base + 2, callable.result],
        [base + 3, 'pg_catalog.int4'],
      ]),
      functions: new Map([
        [
          base + 4,
          { signature: cast.implementation!, args: callable.args, result: callable.result },
        ],
      ]),
      columns: new Map([[1, { name: 'label', type: base }]]),
      byteOrder: 'little',
    }
    const node = (format: number, result = base + 1) =>
      parseTree(
        `{FUNCEXPR :funcid ${base + 4} :funcresulttype ${result} :funcretset false :funcvariadic false :funcformat ${format} :funccollid 0 :inputcollid 0 :args ({VAR :varno 1 :varattno 1 :vartype ${base} :varcollid 0 :varlevelsup 0})}`,
      )
    for (const format of [1, 2]) {
      const expression = storedRowExpression(node(format), input)
      expect(expression).toEqual({
        PgsidStoredCast: {
          arg: { ColumnRef: { fields: [{ String: { sval: 'label' } }] } },
          type: target,
          source,
          signature: cast.implementation,
          kind: 'function',
        },
      })
      captured.push(expression)
      expect(storedRowExpression(node(format, base + 3), input)).toBeUndefined()
      expect(
        storedRowExpression(node(format), {
          ...input,
          functions: new Map([
            [base + 4, { signature: 'unrelated', args: callable.args, result: callable.result }],
          ]),
        }),
      ).toBeUndefined()
    }
    expect(storedRowExpression(node(0), input)).toBeUndefined()
    expect(storedRowExpression(node(0, base + 2), input)).toBeDefined()
  }
  expect(captured.every((value) => JSON.stringify(value) === JSON.stringify(captured[0]))).toBe(
    true,
  )
  expect(JSON.stringify(captured)).not.toMatch(/11000|55000/)
})
