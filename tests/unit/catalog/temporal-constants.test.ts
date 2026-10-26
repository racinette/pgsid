import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseTree, tree } from '../../../src/catalog/expression-tree.js'
import {
  storedTemporalConstant,
  validTemporalConstantStorage,
} from '../../../src/catalog/temporal-constant-storage.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import { bindCatalogCheck } from '../../../src/sql-semantics/catalog-check-binder.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'

it('recovers temporal native payloads without text conversion across endian, Datum widths and shifted identities', async () => {
  const pg = await PGlite.create()
  try {
    const samples: [string, string[]][] = [
      [
        'date',
        ['2000-01-01', '1999-12-31', '4714-11-24 BC', '5874897-12-31', 'infinity', '-infinity'],
      ],
      [
        'timestamp',
        [
          '1999-12-31 23:59:59.999999',
          '2001-02-03 04:05:06.123456',
          '4714-11-24 00:00:00 BC',
          '294276-12-31 23:59:59.999999',
          'infinity',
          '-infinity',
        ],
      ],
      [
        'timestamptz',
        [
          '1999-12-31 23:59:59.999999+00',
          '2001-02-03 04:05:06.123456+03:02',
          'infinity',
          '-infinity',
        ],
      ],
      ['time', ['00:00:00', '12:34:56.123456', '24:00:00']],
      ['timetz', ['00:00:00+15:59:59', '24:00:00-15:59:59', '12:34:56.123456-05:30']],
      [
        'interval',
        [
          '0',
          '-1 month 2 days -03:04:05.000006',
          '2147483647 months -2147483648 days 9223372036854.775807 seconds',
          'infinity',
          '-infinity',
        ],
      ],
    ]
    for (const [type, values] of samples)
      for (const [i, value] of values.entries()) {
        const name = type + '_' + i,
          send = type + '_send'
        await pg.exec(`CREATE TABLE ${name}(n int4,CHECK(ROW(n,'${value}'::${type}) IS NOT NULL))`)
        const r = (
            await pg.query<{ source: string; hex: string }>(
              `SELECT conbin::text source,encode(${send}('${value}'::${type}),'hex') hex FROM pg_constraint WHERE conrelid='${name}'::regclass`,
            )
          ).rows[0]!,
          raw = [...r.source.matchAll(/\{CONST[^{}]*\}/gu)][0]![0],
          native = tree(parseTree(raw))!,
          canonical = ['time', 'timestamp', 'interval'].includes(type)
            ? 'pg_catalog."' + type + '"'
            : 'pg_catalog.' + type,
          original = storedTemporalConstant(native, canonical, 'little')!
        expect(original, value).toBeDefined()
        const wire = Buffer.from(r.hex, 'hex'),
          expected = {
            type: canonical,
            value:
              wire.length === 4 ? String(wire.readInt32BE()) : wire.readBigInt64BE().toString(),
            ...(type === 'timetz' ? { zone: wire.readInt32BE(8) } : {}),
            ...(type === 'interval'
              ? { days: wire.readInt32BE(8), months: wire.readInt32BE(12) }
              : {}),
          }
        expect(original, value).toEqual(expected)
        for (const byteOrder of ['little', 'big'] as const)
          for (const byval of wire.length === 4
            ? [true]
            : wire.length === 8
              ? [true, false]
              : [false])
            for (const width of wire.length === 4 ? [4, 8] : [wire.length])
              for (const id of [41001, 51001]) {
                const body = Buffer.from(wire)
                if (byteOrder === 'little') {
                  if (body.length === 4) body.swap32()
                  else {
                    body.subarray(0, 8).swap64()
                    if (body.length > 8) body.subarray(8).swap32()
                  }
                }
                const bytes = Buffer.alloc(width, wire[0]! & 128 ? 255 : 0)
                body.copy(bytes, byteOrder === 'big' ? width - body.length : 0)
                const node = tree(
                    parseTree(
                      `{CONST :consttype ${id} :constcollid 0 :constlen ${wire.length} :constbyval ${byval} :constisnull false :constvalue ${wire.length} [ ${[...bytes].map((v) => (v > 127 ? v - 256 : v)).join(' ')} ]}`,
                    ),
                  )!,
                  storage = storedTemporalConstant(node, canonical, byteOrder),
                  expression = storedRowExpression(node, {
                    types: new Map([[id, canonical]]),
                    functions: new Map(),
                    columns: new Map(),
                    byteOrder,
                  })
                expect(storage, value).toEqual(expected)
                expect(expression).toEqual({ PgsidStoredTemporal: expected })
                expect(JSON.stringify(expression)).not.toMatch(/41001|51001/)
                const bound = bindCatalogCheck(
                  [],
                  { NullTest: { arg: expression, nulltesttype: 'IS_NOT_NULL' } },
                  [],
                )
                expect(JSON.stringify(bound.expression)).toContain('temporal-storage')
                expect(JSON.stringify(bound.expression)).not.toContain('uncertain')
              }
      }
    const before = await snapshotCatalog(pg)
    await pg.exec(
      "SET DateStyle='SQL, DMY';SET IntervalStyle='postgres_verbose';SET TimeZone='Asia/Kathmandu'",
    )
    const after = await snapshotCatalog(pg)
    expect(before.tables.map((t) => t.constraints)).toEqual(after.tables.map((t) => t.constraints))
    const settings = (
      await pg.query<{ style: string; interval: string; zone: string }>(
        "SELECT current_setting('DateStyle') style,current_setting('IntervalStyle') interval,current_setting('TimeZone') zone",
      )
    ).rows[0]!
    expect(settings).toEqual({
      style: 'SQL, DMY',
      interval: 'postgres_verbose',
      zone: 'Asia/Kathmandu',
    })
  } finally {
    await pg.close()
  }
}, 120_000)

it('admits native date projections outside text input limits across Datum layouts', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec("SET TimeZone='-167.999'")
    const wire = Buffer.from(
        (
          await pg.query<{ wire: string }>(
            "SELECT encode(date_send(('4714-11-24T00:00:00Z BC'::timestamptz)::date),'hex') wire",
          )
        ).rows[0]!.wire,
        'hex',
      ),
      day = wire.readInt32BE(),
      expected = { type: 'pg_catalog.date', value: String(day) }
    expect(day).toBe(-2451552)
    expect(validTemporalConstantStorage(expected)).toBe(true)
    for (const byteOrder of ['little', 'big'] as const)
      for (const width of [4, 8]) {
        const bytes = Buffer.alloc(width)
        if (byteOrder === 'little') bytes.writeInt32LE(day, 0)
        else bytes.writeInt32BE(day, width - 4)
        const node = tree(
          parseTree(
            `{CONST :constisnull false :constlen 4 :constbyval true :constvalue 4 [ ${[...bytes].join(' ')} ]}`,
          ),
        )!
        expect(storedTemporalConstant(node, 'pg_catalog.date', byteOrder)).toEqual(expected)
      }
    await expect(pg.query("SELECT '4714-11-17 BC'::date")).rejects.toMatchObject({ code: '22008' })
  } finally {
    await pg.close()
  }
})

it('rejects invalid temporal payloads, malformed storage and incomplete carriers', () => {
  for (const value of [
    { type: 'pg_catalog.date', value: '-2451553' },
    { type: 'pg_catalog.date', value: '2145031949' },
    { type: 'pg_catalog."timestamp"', value: '-211814092800000001' },
    { type: 'pg_catalog."timestamp"', value: '9223371331200000001' },
    { type: 'pg_catalog.timestamptz', value: '-211813488000000001' },
    { type: 'pg_catalog.timestamptz', value: '9223371331200000001' },
    { type: 'pg_catalog."time"', value: '-1' },
    { type: 'pg_catalog."time"', value: '86400000001' },
    { type: 'pg_catalog.timetz', value: '0' },
    { type: 'pg_catalog.timetz', value: '0', zone: 2147483648 },
    { type: 'pg_catalog."interval"', value: '9223372036854775808', days: 0, months: 0 },
    { type: 'pg_catalog."interval"', value: '0', days: 0 },
    { type: 'pg_catalog."interval"', value: '0', days: 0, months: '1' },
    { type: 'pg_catalog.date', value: '0.0' },
    { type: 'pg_catalog.date', value: '-0' },
    { type: 'pg_catalog.date', value: '00' },
    { type: 'pg_catalog.int8', value: '0' },
    null,
    [],
  ]) {
    expect(validTemporalConstantStorage(value)).toBe(false)
    const bound = bindCatalogCheck(
      [],
      { NullTest: { arg: { PgsidStoredTemporal: value }, nulltesttype: 'IS_NOT_NULL' } },
      [],
    )
    expect(JSON.stringify(bound.expression)).toContain('uncertain')
  }
  for (const body of [
    ':constlen 8 :constbyval true :constvalue 8 [ 0 0 0 0 ]',
    ':constlen 12 :constbyval true :constvalue 12 [ 0 0 0 0 0 0 0 0 0 0 0 0 ]',
    ':constlen 12 :constbyval false :constvalue 12 [ 0 0 0 0 0 0 0 0 0 0 0 256 ]',
    ':constlen 12 :constbyval false :constvalue 13 [ 0 0 0 0 0 0 0 0 0 0 0 0 ]',
  ])
    expect(
      storedTemporalConstant(
        tree(parseTree(`{CONST :constisnull false ${body}}`))!,
        'pg_catalog.timetz',
        'little',
      ),
    ).toBeUndefined()
  expect(
    storedTemporalConstant(tree(parseTree('{CONST :constisnull true}'))!, 'pg_catalog.date', 'big'),
  ).toBeNull()
  expect(
    validTemporalConstantStorage({ type: 'pg_catalog.timetz', value: '0', zone: -2147483648 }),
  ).toBe(true)
})

it('recovers native projected and precision-rounded timestamp storage without text input validation', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec("SET TimeZone='-167.999'")
    const cases = [
      {
        type: 'pg_catalog."timestamp"',
        sql: "(('4714-11-24T00:00:00Z BC'::timestamptz)::date)::timestamp",
        send: 'timestamp_send',
        value: -211814092800000000n,
      },
      {
        type: 'pg_catalog."timestamp"',
        sql: "TIMESTAMP(0) '294276-12-31 23:59:59.999999'",
        send: 'timestamp_send',
        value: 9223371331200000000n,
      },
      {
        type: 'pg_catalog.timestamptz',
        sql: "TIMESTAMPTZ(0) '294276-12-31 23:59:59.999999+00'",
        send: 'timestamptz_send',
        value: 9223371331200000000n,
      },
    ]
    for (const sample of cases) {
      const wire = Buffer.from(
          (
            await pg.query<{ wire: string }>(
              `SELECT encode(${sample.send}(${sample.sql}),'hex') wire`,
            )
          ).rows[0]!.wire,
          'hex',
        ),
        expected = { type: sample.type, value: String(wire.readBigInt64BE()) }
      expect(wire.readBigInt64BE()).toBe(sample.value)
      expect(validTemporalConstantStorage(expected)).toBe(true)
      for (const byteOrder of ['little', 'big'] as const)
        for (const byval of [true, false]) {
          const bytes = Buffer.alloc(8)
          if (byteOrder === 'little') bytes.writeBigInt64LE(sample.value)
          else bytes.writeBigInt64BE(sample.value)
          const node = tree(
            parseTree(
              `{CONST :constisnull false :constlen 8 :constbyval ${byval} :constvalue 8 [ ${[...bytes].join(' ')} ]}`,
            ),
          )!
          expect(storedTemporalConstant(node, sample.type, byteOrder)).toEqual(expected)
          const bound = bindCatalogCheck(
            [],
            { NullTest: { arg: { PgsidStoredTemporal: expected }, nulltesttype: 'IS_NOT_NULL' } },
            [],
          )
          expect(JSON.stringify(bound.expression)).not.toContain('uncertain')
        }
    }
    for (const type of ['timestamp', 'timestamptz'])
      await expect(pg.query(`SELECT '294277-01-01 00:00:00+00'::${type}`)).rejects.toMatchObject({
        code: '22008',
      })
  } finally {
    await pg.close()
  }
})
