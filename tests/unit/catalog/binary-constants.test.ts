import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseTree, tree } from '../../../src/catalog/expression-tree.js'
import {
  storedBinaryConstant,
  validBinaryConstantStorage,
  type BinaryConstantStorage,
} from '../../../src/catalog/binary-constant-storage.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import { bindCatalogCheck } from '../../../src/sql-semantics/catalog-check-binder.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'

const constant = (bytes: number[], length = -1, id = 41001) =>
  tree(
    parseTree(
      `{CONST :consttype ${id} :constcollid 0 :constlen ${length} :constbyval false :constisnull false :constvalue ${bytes.length} [ ${bytes.join(' ')} ]}`,
    ),
  )!

it('recovers arbitrary binary bytes and UUIDs across native storage, endian, packed headers and shifted identities', async () => {
  const pg = await PGlite.create()
  try {
    const samples: { type: BinaryConstantStorage['type']; sql: string }[] = []
    for (const size of [0, 1, 4, 126, 127, 256, 8192]) {
      const hex = Buffer.from(Array.from({ length: size }, (_, i) => i % 256)).toString('hex')
      samples.push({ type: 'pg_catalog.bytea', sql: String.raw`'\x${hex}'::bytea` })
    }
    for (const uuid of [
      '00000000-0000-0000-0000-000000000000',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      '01234567-89ab-cdef-8012-3456789abcde',
    ])
      samples.push({ type: 'pg_catalog.uuid', sql: `'${uuid}'::uuid` })
    for (const [index, { type, sql }] of samples.entries()) {
      await pg.exec(`CREATE TABLE sample_${index}(n int4,CHECK(ROW(n,${sql}) IS NOT NULL))`)
      const send = type === 'pg_catalog.bytea' ? 'byteasend' : 'uuid_send',
        r = (
          await pg.query<{ source: string; wire: string; output: string }>(
            `SELECT conbin::text source,encode(${send}(${sql}),'hex') wire,(${sql})::text output FROM pg_constraint WHERE conrelid='sample_${index}'::regclass`,
          )
        ).rows[0]!,
        native = tree(parseTree([...r.source.matchAll(/\{CONST[^{}]*\}/gu)][0]![0]))!,
        expected = { type, value: type === 'pg_catalog.bytea' ? r.wire : r.output }
      expect(storedBinaryConstant(native, type, 'little')).toEqual(expected)
      const body = Buffer.from(r.wire, 'hex')
      for (const byteOrder of ['little', 'big'] as const)
        for (const short of type === 'pg_catalog.bytea' && body.length + 1 <= 127
          ? [false, true]
          : [false])
          for (const signed of [false, true])
            for (const id of [41001, 51001]) {
              const header = Buffer.alloc(type === 'pg_catalog.uuid' ? 0 : short ? 1 : 4),
                length = header.length + body.length
              if (type === 'pg_catalog.bytea') {
                if (short) header[0] = byteOrder === 'little' ? length * 2 + 1 : length + 128
                else if (byteOrder === 'little') header.writeUInt32LE(length * 4)
                else header.writeUInt32BE(length)
              }
              const bytes = [...header, ...body].map((v) => (signed && v > 127 ? v - 256 : v)),
                node = constant(bytes, type === 'pg_catalog.uuid' ? 16 : -1, id),
                expression = storedRowExpression(node, {
                  types: new Map([[id, type]]),
                  functions: new Map(),
                  columns: new Map(),
                  byteOrder,
                  utf8: false,
                })
              expect(storedBinaryConstant(node, type, byteOrder)).toEqual(expected)
              expect(expression).toEqual({ PgsidStoredBinary: expected })
              const bound = bindCatalogCheck(
                [],
                { NullTest: { arg: expression, nulltesttype: 'IS_NOT_NULL' } },
                [],
              )
              expect(JSON.stringify(bound.expression)).not.toContain('uncertain')
              expect(JSON.stringify(bound.expression)).toContain(JSON.stringify(expected.value))
            }
    }
    await pg.exec(String.raw`CREATE TYPE pair AS(n int4,old int4);
      CREATE TABLE changing(n int4,d int4,CHECK(ROW(n,octet_length('\x000180ff'::bytea)/d + get_byte(uuid_send('01234567-89ab-cdef-8012-3456789abcde'::uuid),0))::pair IS NOT NULL));
      ALTER TYPE pair DROP ATTRIBUTE old;`)
    const before = await snapshotCatalog(pg)
    await pg.exec("SET bytea_output='escape'")
    const after = await snapshotCatalog(pg),
      a = before.tables.find((t) => t.name === 'changing')!.constraints,
      b = after.tables.find((t) => t.name === 'changing')!.constraints
    expect(a[0]!.rowCoercionContext?.complete).toBe(true)
    expect(a).toEqual(b)
    expect(
      (await pg.query<{ setting: string }>("SELECT current_setting('bytea_output') setting"))
        .rows[0]!.setting,
    ).toBe('escape')
  } finally {
    await pg.close()
  }
}, 120_000)

it('rejects incomplete binary storage and malformed carriers while retaining NULL and empty byte strings', () => {
  for (const bytes of [
    [],
    [1],
    [128],
    [16, 0, 0],
    [18, 0, 0, 0],
    [64, 0, 0, 4],
    [24, 0, 0, 0, 0],
    [20, 0, 0, 0, 256],
    [20, 0, 0, 0, -129],
  ])
    expect(storedBinaryConstant(constant(bytes), 'pg_catalog.bytea', 'little')).toBeUndefined()
  for (const length of [0, 15, 17])
    expect(
      storedBinaryConstant(constant(Array(length).fill(0), 16), 'pg_catalog.uuid', 'little'),
    ).toBeUndefined()
  const byval = constant(Array(16).fill(0), 16)
  byval.fields['constbyval'] = ['true']
  expect(storedBinaryConstant(byval, 'pg_catalog.uuid', 'little')).toBeUndefined()
  const mismatch = constant([16, 0, 0, 0])
  mismatch.fields['constvalue']![0] = '5'
  expect(storedBinaryConstant(mismatch, 'pg_catalog.bytea', 'little')).toBeUndefined()
  expect(storedBinaryConstant(constant([16, 0, 0, 0]), 'pg_catalog.bytea', 'little')).toEqual({
    type: 'pg_catalog.bytea',
    value: '',
  })
  expect(
    storedBinaryConstant(tree(parseTree('{CONST :constisnull true}'))!, 'pg_catalog.uuid', 'big'),
  ).toBeNull()
  for (const value of [
    null,
    [],
    { type: 'pg_catalog.bytea', value: '0' },
    { type: 'pg_catalog.bytea', value: 'zz' },
    { type: 'pg_catalog.bytea', value: 'FF' },
    { type: 'pg_catalog.uuid', value: '00'.repeat(16) },
    { type: 'pg_catalog.uuid', value: 'ffffffff-ffff-ffff-ffff-fffffffffffz' },
    { type: 'pg_catalog.oid', value: '0' },
  ]) {
    expect(validBinaryConstantStorage(value)).toBe(false)
    const bound = bindCatalogCheck(
      [],
      { NullTest: { arg: { PgsidStoredBinary: value }, nulltesttype: 'IS_NOT_NULL' } },
      [],
    )
    expect(JSON.stringify(bound.expression)).toContain('uncertain')
  }
})
