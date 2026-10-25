import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseTree, tree, type Tree, type Value } from '../../../src/catalog/expression-tree.js'
import { storedNumericConstant } from '../../../src/catalog/numeric-constant-storage.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'

const constant = (bytes: number[], length = bytes.length): Tree =>
  tree(
    parseTree(
      `{CONST :consttype 41001 :constcollid 0 :constlen -1 :constbyval false :constisnull false :constvalue ${length} [ ${bytes.join(' ')} ]}`,
    ),
  )!

it('recovers exact native numeric constants, display scales and special values with explicit source byte order', async () => {
  const pg = await PGlite.create()
  try {
    const values = [
      '0',
      '-0.0000',
      '1.25',
      '-1.2500',
      '9999.9999',
      '10000.0000',
      '0.00000001',
      '1e252',
      '1e256',
      '1e-252',
      '1e-256',
      '1e-260',
      '0.' + '0'.repeat(62) + '1',
      '0.' + '0'.repeat(63) + '1',
      '1e131071',
      '1e-16383',
      'NaN',
      'Infinity',
      '-Infinity',
    ]
    const expressions: unknown[] = []
    for (const [index, value] of values.entries()) {
      await pg.exec(
        `CREATE TABLE probe_${index}(n int4,CHECK(ROW(n,'${value}'::numeric) IS NOT NULL))`,
      )
      const source = (
        await pg.query<{ value: string; definition: string }>(
          `SELECT $1::numeric::text AS value,conbin::text AS definition FROM pg_constraint WHERE conrelid=$2::regclass`,
          [value, 'probe_' + index],
        )
      ).rows[0]!
      let native: Tree | undefined
      const visit = (value: Value): void => {
        if (Array.isArray(value)) value.forEach(visit)
        else if (typeof value === 'object') {
          if (value.kind === 'CONST' && value.fields['constlen']?.[0] === '-1') native = value
          Object.values(value.fields).forEach(visit)
        }
      }
      visit(parseTree(source.definition))
      expect(native, value).toBeDefined()
      const raw = native!.fields['constvalue']![1] as string[],
        original = Buffer.from(raw.map((v) => Number(v) & 255)),
        body = original.subarray(4)
      for (const byteOrder of ['little', 'big'] as const)
        for (const short of body.length + 1 <= 127 ? [false, true] : [false]) {
          const payload = Buffer.from(body)
          if (byteOrder === 'big') payload.swap16()
          const header = Buffer.alloc(short ? 1 : 4),
            length = header.length + payload.length
          if (short) header[0] = byteOrder === 'little' ? length * 2 + 1 : length + 128
          else if (byteOrder === 'little') header.writeUInt32LE(length * 4)
          else header.writeUInt32BE(length)
          for (const signed of [false, true]) {
            const bytes = [...header, ...payload].map((v) => (signed && v > 127 ? v - 256 : v)),
              node = constant(bytes)
            expect(storedNumericConstant(node, byteOrder), value).toBe(source.value)
            expect(
              storedNumericConstant(node, byteOrder === 'little' ? 'big' : 'little'),
            ).toBeUndefined()
            if (value === '-1.2500')
              for (const id of [41001, 51001]) {
                const shifted = { ...node, fields: { ...node.fields, consttype: [String(id)] } }
                expressions.push(
                  storedRowExpression(shifted, {
                    types: new Map([[id, 'pg_catalog."numeric"']]),
                    functions: new Map(),
                    columns: new Map(),
                    byteOrder,
                  }),
                )
              }
          }
        }
    }
    expect(expressions[0]).toBeDefined()
    expect(expressions.every((e) => JSON.stringify(e) === JSON.stringify(expressions[0]))).toBe(
      true,
    )
    expect(JSON.stringify(expressions[0])).toContain('-1.2500')
    expect(JSON.stringify(expressions)).not.toMatch(/41001|51001/)
  } finally {
    await pg.close()
  }
})

it('rejects invalid numeric storage and reserved special headers without guessing values', () => {
  for (const bytes of [
    [],
    [1],
    [128],
    [24, 0, 0, 0, 0],
    [25, 0, 0, 0, 0, 128],
    [26, 0, 0, 0, 0, 128],
    [0, 0, 0, 6, 0, 128],
    [24, 0, 0, 0, 1, 192],
    [24, 0, 0, 0, 0, 224],
    [24, 0, 0, 0, 0, 0],
    [32, 0, 0, 0, 0, 128, 16, 39],
    [32, 0, 0, 0, 0, 128, 0, 0],
    [32, 0, 0, 0, 127, 128, 1, 0],
    [28, 0, 0, 0, 0, 128, 1],
    [24, 0, 0, 0, 256, 128],
    [24, 0, 0, 0, -129, 128],
  ])
    expect(storedNumericConstant(constant(bytes), 'little'), bytes.join(' ')).toBeUndefined()
  expect(storedNumericConstant(constant([24, 0, 0, 0, 0, 128], 7), 'little')).toBeUndefined()
  expect(storedNumericConstant(tree(parseTree('{CONST :constisnull true}'))!, 'big')).toBeNull()
  expect(storedNumericConstant(constant([32, 0, 0, 0, 0, 192, 42, 0]), 'little')).toBe('NaN')
  expect(storedNumericConstant(constant([24, 0, 0, 0, 0, 128]), 'little')).toBe('0')
})
