import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseTree, tree } from '../../../src/catalog/expression-tree.js'
import {
  storedAddressBitConstant,
  validAddressBitConstantStorage,
  type AddressBitConstantStorage,
} from '../../../src/catalog/address-bit-constant-storage.js'
import { storedRowExpression } from '../../../src/catalog/stored-row-expressions.js'
import { bindCatalogCheck } from '../../../src/sql-semantics/catalog-check-binder.js'

const constant = (bytes: number[], length = -1, id = 41001) =>
  tree(
    parseTree(
      `{CONST :consttype ${id} :constcollid 0 :constlen ${length} :constbyval false :constisnull false :constvalue ${bytes.length} [ ${bytes.join(' ')} ]}`,
    ),
  )!
const frame = (body: Buffer, byteOrder: 'little' | 'big', short = false): number[] => {
  const header = Buffer.alloc(short ? 1 : 4),
    length = header.length + body.length
  if (short) header[0] = byteOrder === 'little' ? length * 2 + 1 : length + 128
  else if (byteOrder === 'little') header.writeUInt32LE(length * 4)
  else header.writeUInt32BE(length)
  return [...header, ...body]
}

it('recovers exact network, MAC and bit payloads across native formats, source families and shifted identities', async () => {
  const pg = await PGlite.create()
  try {
    const families = (
        await pg.query<{ ipv4: number; ipv6: number }>(
          "SELECT get_byte(inet_send('0.0.0.0'),0) ipv4,get_byte(inet_send('::'),0) ipv6",
        )
      ).rows[0]!,
      samples: [AddressBitConstantStorage['type'], string, string][] = [
        ['pg_catalog.inet', "INET '192.0.2.129/24'", 'inet_send'],
        ['pg_catalog.inet', "INET '255.255.255.255/0'", 'inet_send'],
        ['pg_catalog.inet', "INET '2001:db8::abcd/64'", 'inet_send'],
        ['pg_catalog.inet', "INET '::ffff:192.0.2.1'", 'inet_send'],
        ['pg_catalog.cidr', "CIDR '192.0.2.0/25'", 'cidr_send'],
        ['pg_catalog.cidr', "CIDR '::/0'", 'cidr_send'],
        ['pg_catalog.cidr', "CIDR '2001:db8::/32'", 'cidr_send'],
        ['pg_catalog.macaddr', "MACADDR '08:00:2b:01:02:03'", 'macaddr_send'],
        ['pg_catalog.macaddr8', "MACADDR8 '08:00:2b:ff:fe:01:02:03'", 'macaddr8_send'],
        ['pg_catalog."bit"', "B''", 'bit_send'],
        ['pg_catalog."bit"', "B'10101'", 'bit_send'],
        ['pg_catalog.varbit', "B'101010101'::varbit", 'varbit_send'],
        ['pg_catalog.varbit', "('" + '10100110'.repeat(150) + "'::varbit)", 'varbit_send'],
      ]
    for (const [index, [type, sql, send]] of samples.entries()) {
      await pg.exec(`CREATE TABLE sample_${index}(n int4,CHECK(ROW(n,${sql}) IS NOT NULL))`)
      const r = (
          await pg.query<{ source: string; wire: string }>(
            `SELECT conbin::text source,encode(${send}(${sql}),'hex') wire FROM pg_constraint WHERE conrelid='sample_${index}'::regclass`,
          )
        ).rows[0]!,
        node = tree(parseTree([...r.source.matchAll(/\{CONST[^{}]*\}/gu)][0]![0]))!,
        original = storedAddressBitConstant(node, type, 'little', families)
      expect(original, sql).toBeDefined()
      expect(validAddressBitConstantStorage(original), sql).toBe(true)
      const oracle = (
        await pg.query<{ wire: string }>(`SELECT encode(${send}($1::${type}),'hex') wire`, [
          original!.value,
        ])
      ).rows[0]!.wire
      expect(oracle, sql).toBe(r.wire)
      const wire = Buffer.from(r.wire, 'hex'),
        isNetwork = type === 'pg_catalog.inet' || type === 'pg_catalog.cidr',
        isMac = type === 'pg_catalog.macaddr' || type === 'pg_catalog.macaddr8'
      for (const byteOrder of ['little', 'big'] as const)
        for (const shifted of [false, true]) {
          const profile = shifted ? { ipv4: 17, ipv6: 93 } : families,
            body = isNetwork
              ? Buffer.concat([
                  Buffer.from([wire[0] === families.ipv4 ? profile.ipv4 : profile.ipv6, wire[1]!]),
                  wire.subarray(4),
                ])
              : Buffer.from(wire)
          if (!isNetwork && !isMac && byteOrder === 'little') body.subarray(0, 4).swap32()
          for (const short of !isMac && body.length + 1 <= 127 ? [false, true] : [false])
            for (const id of [41001, 51001]) {
              const bytes = isMac ? [...body] : frame(body, byteOrder, short),
                native = constant(
                  bytes.map((v) => (v > 127 ? v - 256 : v)),
                  isMac ? body.length : -1,
                  id,
                ),
                storage = storedAddressBitConstant(native, type, byteOrder, profile),
                expression = storedRowExpression(native, {
                  types: new Map([[id, type]]),
                  functions: new Map(),
                  columns: new Map(),
                  byteOrder,
                  networkFamilies: profile,
                })
              expect(storage, sql).toEqual(original)
              expect(expression).toEqual({ PgsidStoredAddressBit: original })
              const bound = bindCatalogCheck(
                [],
                { NullTest: { arg: expression, nulltesttype: 'IS_NOT_NULL' } },
                [],
              )
              expect(JSON.stringify(bound.expression)).not.toContain('uncertain')
            }
        }
    }
  } finally {
    await pg.close()
  }
}, 120_000)

it('rejects unknown source families, invalid prefix/host bits, padding and malformed portable values', () => {
  const profile = { ipv4: 2, ipv6: 3 },
    decode = (body: number[], type: AddressBitConstantStorage['type'] = 'pg_catalog.inet') =>
      storedAddressBitConstant(
        constant(frame(Buffer.from(body), 'little')),
        type,
        'little',
        profile,
      )
  expect(
    storedAddressBitConstant(
      constant(frame(Buffer.from([2, 32, 1, 2, 3, 4]), 'little')),
      'pg_catalog.inet',
      'little',
    ),
  ).toBeUndefined()
  for (const body of [
    [9, 32, 1, 2, 3, 4],
    [2, 33, 1, 2, 3, 4],
    [3, 32, 1, 2, 3, 4],
    [2, 24, 1, 2, 3],
  ])
    expect(decode(body)).toBeUndefined()
  expect(decode([2, 24, 192, 0, 2, 1], 'pg_catalog.cidr')).toBeUndefined()
  expect(decode([5, 0, 0, 0, 169], 'pg_catalog."bit"')).toBeUndefined()
  expect(decode([9, 0, 0, 0, 128], 'pg_catalog.varbit')).toBeUndefined()
  expect(decode([255, 255, 255, 255], 'pg_catalog.varbit')).toBeUndefined()
  expect(
    storedAddressBitConstant(constant([0, 1, 2, 3, 4], 6), 'pg_catalog.macaddr', 'little'),
  ).toBeUndefined()
  for (const value of [
    null,
    [],
    { type: 'pg_catalog.inet', value: '999.0.0.1/32' },
    { type: 'pg_catalog.inet', value: '192.0.2.1/33' },
    { type: 'pg_catalog.cidr', value: '192.0.2.1/24' },
    { type: 'pg_catalog.cidr', value: '2001:0db8:0000:0000:0000:0000:0000:0001/32' },
    { type: 'pg_catalog.macaddr', value: '00:11:22:33:44' },
    { type: 'pg_catalog.varbit', value: '102' },
    { type: 'pg_catalog.int4', value: '1' },
  ]) {
    expect(validAddressBitConstantStorage(value)).toBe(false)
    expect(
      JSON.stringify(
        bindCatalogCheck(
          [],
          { NullTest: { arg: { PgsidStoredAddressBit: value }, nulltesttype: 'IS_NOT_NULL' } },
          [],
        ).expression,
      ),
    ).toContain('uncertain')
  }
})
