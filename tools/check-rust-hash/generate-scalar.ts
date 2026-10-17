import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { createHashOracle } from './oracle.js'

const sourcePath = process.argv[2]
assert.ok(sourcePath, 'Pass the PostgreSQL 18 src/common/hashfn.c source path')
const oracle = await createHashOracle(sourcePath),
  pg = await PGlite.create()
const seeds = ['0', '1', '-1', '-9223372036854775808', '9223372036854775807', '1311768467750121216']
type Hashes = { little32: number; little64: string; big32: number; big64: string }
const samples: (Hashes & {
  type: string
  value: string
  sqlValue: string
  seed: string
  nan: boolean
  encoding: boolean
})[] = []
let postgresAssertions = 0
try {
  const floatBits: [string, bigint[]][] = [
    [
      'float4',
      [
        0n,
        -2147483648n,
        1n,
        -2147483647n,
        8388607n,
        8388608n,
        1065353216n,
        -1082130432n,
        1073741826n,
        2139095039n,
        2139095040n,
        -8388608n,
        2143289344n,
        2139095041n,
        -4194303n,
      ],
    ],
    [
      'float8',
      [
        0n,
        -9223372036854775808n,
        1n,
        -9223372036854775807n,
        4503599627370495n,
        4503599627370496n,
        4607182418800017408n,
        -4616189618054758400n,
        4611686019501129728n,
        9218868437227405311n,
        9218868437227405312n,
        -4503599627370496n,
        9221120237041090560n,
        9218868437227405313n,
        -2251799813685247n,
      ],
    ],
  ]
  for (const [type, bitValues] of floatBits) {
    const read = (bits: bigint) => {
      const input = Buffer.alloc(type === 'float4' ? 4 : 8)
      if (type === 'float4') input.writeInt32BE(Number(bits))
      else input.writeBigInt64BE(bits)
      return type === 'float4' ? input.readFloatBE() : input.readDoubleBE()
    }
    for (const bits of bitValues) {
      const number = read(bits),
        nan = Number.isNaN(number)
      const sqlValue = nan ? 'NaN' : Object.is(number, -0) ? '-0' : String(number)
      for (const seed of seeds) {
        const result = (
          await pg.query<{ h32: number; h64: string; widened: Uint8Array }>(
            `SELECT hash${type}($1::${type}) h32,hash${type}extended($1::${type},$2::bigint)::text h64,float8send($1::${type}::float8) widened`,
            [sqlValue, seed],
          )
        ).rows[0]!
        const big = Buffer.from(result.widened),
          little = Buffer.from(big).reverse()
        const le = await oracle.hash(little, seed),
          be = await oracle.hash(big, seed)
        const hashes = {
          little32: number === 0 ? 0 : le.little32,
          little64: number === 0 ? seed : le.little64,
          big32: number === 0 ? 0 : be.big32,
          big64: number === 0 ? seed : be.big64,
        }
        assert.equal(hashes.little32, result.h32, type + ' ' + sqlValue)
        assert.equal(hashes.little64, result.h64, type + ' ' + sqlValue)
        postgresAssertions += 2
        samples.push({
          type: 'pg_catalog.' + type,
          value: String(bits),
          sqlValue,
          seed,
          nan,
          encoding: false,
          ...hashes,
        })
      }
    }
  }
  const numericCache = new Map<string, Hashes>()
  const numeric = async (text: string, seed: string): Promise<Hashes> => {
    const key = text + ':' + seed,
      cached = numericCache.get(key)
    if (cached) return cached
    const row = (
      await pg.query<{ bytes: Uint8Array }>('SELECT numeric_send($1::numeric) bytes', [text])
    ).rows[0]!
    const wire = Buffer.from(row.bytes)
    let weight = wire.readInt16BE(2),
      bytes = wire.subarray(8)
    while (bytes.length && bytes.readUInt16BE(0) === 0) {
      bytes = bytes.subarray(2)
      weight--
    }
    while (bytes.length && bytes.readUInt16BE(bytes.length - 2) === 0)
      bytes = bytes.subarray(0, bytes.length - 2)
    const zero = bytes.length === 0
    const le = await oracle.hash(Buffer.from(bytes).swap16(), seed),
      be = await oracle.hash(bytes, seed)
    const result = {
      little32: zero ? -1 : le.little32 ^ weight,
      little64: String(
        zero ? BigInt.asIntN(64, BigInt(seed) - 1n) : BigInt(le.little64) ^ BigInt(weight),
      ),
      big32: zero ? -1 : be.big32 ^ weight,
      big64: String(
        zero ? BigInt.asIntN(64, BigInt(seed) - 1n) : BigInt(be.big64) ^ BigInt(weight),
      ),
    }
    numericCache.set(key, result)
    return result
  }
  const jsonb = async (text: string, seed: string): Promise<Hashes> => {
    const actual = (
      await pg.query<{ canonical: string; h32: number; h64: string }>(
        'SELECT $1::jsonb::text canonical,jsonb_hash($1::jsonb) h32,jsonb_hash_extended($1::jsonb,$2::bigint)::text h64',
        [text, seed],
      )
    ).rows[0]!
    let little32 = 0,
      big32 = 0,
      little64 = 0n,
      big64 = 0n
    if (actual.canonical === '[]' || actual.canonical === '{}') {
      little64 = BigInt(seed)
      big64 = BigInt(seed)
    } else {
      const tokens = actual.canonical.match(
        /"(?:[^"\\]|\\.)*"|[\[\]{}]|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/gu,
      )!
      if (tokens[0] !== '[' && tokens[0] !== '{') {
        little32 = big32 = 0x40000000
        little64 = big64 = 0x4000000040000000n
      }
      const rotate32 = (n: number) => (n << 1) | (n >>> 31)
      const rotate64 = (n: bigint) => {
        const unsigned = BigInt.asUintN(64, n),
          lo = Number(unsigned & 0xffffffffn),
          hi = Number(unsigned >> 32n)
        return BigInt.asIntN(64, (BigInt(rotate32(hi) >>> 0) << 32n) | BigInt(rotate32(lo) >>> 0))
      }
      for (const token of tokens) {
        if (token === '[' || token === '{') {
          const flag = token === '[' ? 0x40000000 : 0x20000000
          little32 ^= flag
          big32 ^= flag
          little64 ^= (BigInt(flag) << 32n) | BigInt(flag)
          big64 ^= (BigInt(flag) << 32n) | BigInt(flag)
          continue
        }
        if (token === ']' || token === '}') continue
        let scalar: Hashes
        if (token[0] === '"')
          scalar = await oracle.hash(Buffer.from(JSON.parse(token) as string, 'utf8'), seed)
        else if (token === 'null')
          scalar = {
            little32: 1,
            big32: 1,
            little64: String(BigInt.asIntN(64, BigInt(seed) + 1n)),
            big64: String(BigInt.asIntN(64, BigInt(seed) + 1n)),
          }
        else if (token === 'true' || token === 'false') {
          const bit = token === 'true' ? 1 : 0,
            fixed = bit ? 2 : 4
          const bytes = Buffer.alloc(4)
          bytes.writeUInt32LE(bit)
          const salt = seed === '0' ? String(fixed) : (await oracle.hash(bytes, seed)).little64
          scalar = { little32: fixed, big32: fixed, little64: salt, big64: salt }
        } else scalar = await numeric(token, seed)
        little32 = rotate32(little32) ^ scalar.little32
        big32 = rotate32(big32) ^ scalar.big32
        little64 = rotate64(little64) ^ BigInt(scalar.little64)
        big64 = rotate64(big64) ^ BigInt(scalar.big64)
      }
    }
    assert.equal(little32, actual.h32, text + ' ' + seed)
    assert.equal(String(little64), actual.h64, text + ' ' + seed)
    postgresAssertions += 2
    return { little32, little64: String(little64), big32, big64: String(big64) }
  }
  const documents = [
    'null',
    'false',
    'true',
    '0',
    '-0.000',
    '1',
    '-1.00',
    '1e100',
    '0.0000000123',
    '""',
    '"abc"',
    '"é雪😊"',
    '[]',
    '{}',
    '[null,false,true,0,1,"abc"]',
    '[[],{}]',
    '[[[1,2],[3]],{"nested": [true, "word"]}]',
    '{"zz":1,"b":false,"a":true,"ccc":null}',
    '{"dup":1,"dup":2,"a":1.0000}',
    '{"é":1,"aa":2,"雪":3,"😀":"é"}',
    '[1,1.00,-0.0,0]',
    JSON.stringify(Array(64).fill('abc')),
    JSON.stringify(Array(64).fill(1234)),
    JSON.stringify(Array(33).fill(null)),
    JSON.stringify({ long: 'x'.repeat(3000), nested: [1, 2, 3] }),
  ]
  for (const text of documents)
    for (const seed of seeds)
      samples.push({
        type: 'pg_catalog.jsonb',
        value: text,
        sqlValue: text,
        seed,
        nan: false,
        encoding: /[^\x00-\x7f]/u.test(text),
        ...(await jsonb(text, seed)),
      })
  const output =
    JSON.stringify({ sourceSha256: oracle.sourceSha256, postgresAssertions, samples }) + '\n'
  const target = 'tests/fixtures/check-scalar-hash.json'
  if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8'), output)
  else writeFileSync(target, output)
  console.log(
    JSON.stringify({
      samples: samples.length,
      postgresAssertions,
      bytes: Buffer.byteLength(output),
    }),
  )
} finally {
  await pg.close()
  oracle.close()
}
