import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseTree } from '../../../src/catalog/expression-tree.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import { bindCatalogCheck } from '../../../src/sql-semantics/catalog-check-binder.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../../src/sql-semantics/catalog-checks.js'

it('preserves every IEEE bit through native Datum widths, reference storage, explicit endian and shifted identities', () => {
  for (const [type, patterns] of [
    [
      'float4',
      [
        '00000000',
        '80000000',
        '3dcccccd',
        '00000001',
        '007fffff',
        '00800000',
        '7f7fffff',
        '7f800000',
        'ff800000',
        '7fc00001',
        '7f800001',
        'ffc01234',
      ],
    ],
    [
      'float8',
      [
        '0000000000000000',
        '8000000000000000',
        '3fb999999999999b',
        '0000000000000001',
        '000fffffffffffff',
        '0010000000000000',
        '7fefffffffffffff',
        '7ff0000000000000',
        'fff0000000000000',
        '7ff8000000000001',
        '7ff0000000000001',
        'fff8000000001234',
      ],
    ],
  ] as const) {
    const length = type === 'float4' ? 4 : 8
    for (const bits of patterns) {
      const expressions: unknown[] = []
      for (const byteOrder of ['little', 'big'] as const)
        for (const byval of type === 'float4' ? [true] : [true, false])
          for (const width of type === 'float4' ? [4, 8] : [8])
            for (const id of [41001, 51001]) {
              const bytes = Buffer.alloc(width),
                value = BigInt.asIntN(length * 8, BigInt('0x' + bits))
              if (width === 8) {
                if (byteOrder === 'little') bytes.writeBigInt64LE(value)
                else bytes.writeBigInt64BE(value)
              } else if (byteOrder === 'little') bytes.writeInt32LE(Number(value))
              else bytes.writeInt32BE(Number(value))
              const node = parseTree(
                  `{CONST :consttype ${id} :constcollid 0 :constlen ${length} :constbyval ${byval} :constisnull false :constvalue ${length} [ ${[...bytes].map((v) => (v > 127 ? v - 256 : v)).join(' ')} ]}`,
                ),
                expression = storedRowExpression(node, {
                  types: new Map([[id, 'pg_catalog.' + type]]),
                  functions: new Map(),
                  columns: new Map(),
                  byteOrder,
                })
              expect(expression).toEqual({ PgsidStoredFloat: { type: 'pg_catalog.' + type, bits } })
              expressions.push(expression)
              const bound = bindCatalogCheck(
                [],
                {
                  NullTest: { arg: expression, nulltesttype: 'IS_NOT_NULL' },
                },
                [],
              )
              expect(JSON.stringify(bound.expression)).toContain(`"bits":"${bits}"`)
              expect(JSON.stringify(bound.expression)).not.toContain('uncertain')
            }
      expect(expressions.every((e) => JSON.stringify(e) === JSON.stringify(expressions[0]))).toBe(
        true,
      )
      expect(JSON.stringify(expressions)).not.toMatch(/41001|51001/)
    }
  }
})

it('rejects malformed captured float datums and invalid portable bit literals', () => {
  for (const raw of [
    ':constlen 4 :constbyval true :constvalue 4 [ 0 0 0 ]',
    ':constlen 4 :constbyval false :constvalue 4 [ 0 0 0 0 ]',
    ':constlen 8 :constbyval true :constvalue 8 [ 0 0 0 0 0 0 0 0 ]',
    ':constlen 4 :constbyval true :constvalue 4 [ 0 0 0 256 ]',
    ':constlen 4 :constbyval true :constvalue 4 [ 0 0 0 -129 ]',
  ])
    expect(
      storedRowExpression(parseTree(`{CONST :consttype 41001 :constisnull false ${raw}}`), {
        types: new Map([[41001, 'pg_catalog.float4']]),
        functions: new Map(),
        columns: new Map(),
        byteOrder: 'little',
      }),
    ).toBeUndefined()
  for (const [type, bits] of [
    ['pg_catalog.float4', '0000'],
    ['pg_catalog.float8', '00000000'],
    ['pg_catalog.int8', '0000000000000000'],
    ['pg_catalog.float8', 'NaN'],
    ['pg_catalog.float4', null],
  ]) {
    const bound = bindCatalogCheck(
      [],
      {
        NullTest: { arg: { PgsidStoredFloat: { type, bits } }, nulltesttype: 'IS_NOT_NULL' },
      },
      [],
    )
    expect(JSON.stringify(bound.expression)).toContain('uncertain')
  }
})

it('matches native float sends and captures hidden narrowing constants independently of text rendering settings', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec(`CREATE TYPE integer_reading AS(n int4,v int4);CREATE TYPE double_reading AS(n int4,v float8);
      CREATE TABLE changing(n int4,CHECK(ROW(n,'1.00000006'::float8)::integer_reading IS DISTINCT FROM ROW(n,'1.00000006'::float8)::double_reading));`)
    const native = []
    for (const type of ['float4', 'float8'])
      for (const [i, value] of [
        '0',
        '-0',
        '0.10000000000000002',
        'NaN',
        'Infinity',
        '-Infinity',
      ].entries()) {
        const name = type + '_' + i
        await pg.exec(`CREATE TABLE ${name}(n int4,CHECK(ROW(n,'${value}'::${type}) IS NOT NULL))`)
        const row = (
            await pg.query<{ source: string; bits: string }>(
              `SELECT conbin::text source,encode(${type}send('${value}'::${type}),'hex') bits FROM pg_constraint WHERE conrelid='${name}'::regclass`,
            )
          ).rows[0]!,
          raw = [...row.source.matchAll(/\{CONST[^{}]*\}/gu)][0]![0],
          oid = Number(/:consttype (\d+)/u.exec(raw)![1]),
          expression = storedRowExpression(parseTree(raw), {
            types: new Map([[oid, 'pg_catalog.' + type]]),
            functions: new Map(),
            columns: new Map(),
            byteOrder: 'little',
          })
        expect(expression).toEqual({
          PgsidStoredFloat: { type: 'pg_catalog.' + type, bits: row.bits },
        })
        native.push(expression)
      }
    const first = await snapshotCatalog(pg)
    await pg.exec('SET extra_float_digits=-3')
    const second = await snapshotCatalog(pg),
      before = first.tables.find((t) => t.name === 'changing')!,
      after = second.tables.find((t) => t.name === 'changing')!
    expect(before.constraints[0]!.rowCoercionContext?.complete).toBe(true)
    expect(before.constraints[0]!.rowCoercionContext).toEqual(
      after.constraints[0]!.rowCoercionContext,
    )
    const plan = lowerTableCheck(
      after,
      after.constraints[0]!,
      second.enums,
      second.domains,
      'source',
      second.rangeTypes,
      second.compositeTypeGraph,
      "CHECK(ROW(n,'1.00000006'::float8)::integer_reading IS DISTINCT FROM ROW(n,'1.00000006'::float8)::double_reading)",
    )!
    expect(JSON.stringify(plan.expression)).not.toContain('uncertain')
    const bits = (
      await pg.query<{ bits: string }>("SELECT encode(float8send('1.00000006'::float8),'hex') bits")
    ).rows[0]!.bits
    expect(JSON.stringify(plan.expression)).toContain(bits)
    expect(native).toHaveLength(12)
    await pg.exec('INSERT INTO changing VALUES(1)')
  } finally {
    await pg.close()
  }
})
