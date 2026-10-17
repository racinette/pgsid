import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { createHashOracle } from './oracle.js'
type Scalar = {
  type: string
  value: string
  sqlValue?: string
  seed: string
  little32: number
  little64: string
  big32: number
  big64: string
  nan?: boolean
}
const scalar = (
  JSON.parse(readFileSync('tests/fixtures/check-scalar-hash.json', 'utf8')) as { samples: Scalar[] }
).samples.filter((s) => s.seed === '0' || s.seed === '-9223372036854775808')
const native = (
  JSON.parse(readFileSync('tests/fixtures/check-native-hash.json', 'utf8')) as { samples: Scalar[] }
).samples.filter(
  (s) =>
    [
      'pg_catalog.text',
      'pg_catalog."numeric"',
      'pg_catalog.tid',
      'pg_catalog.macaddr',
      'pg_catalog.uuid',
      'pg_catalog.inet',
    ].includes(s.type) &&
    (s.seed === '0' || s.seed === '-9223372036854775808'),
)
const sourcePath = process.argv[2]
assert.ok(sourcePath, 'Pass PostgreSQL 18 src/common/hashfn.c')
const oracle = await createHashOracle(sourcePath),
  pg = await PGlite.create()
try {
  await pg.exec("SET TimeZone='UTC'")
  const bytes = Buffer.from('d4263200', 'hex'),
    hashes = await oracle.hash(bytes, '0')
  assert.notEqual(hashes.little32, hashes.big32)
  const cancellation: Scalar = {
    type: 'pg_catalog.bytea',
    value: bytes.toString('hex'),
    seed: '0',
    ...hashes,
  }
  const samples: unknown[] = []
  for (const sample of [...scalar, ...native, cancellation]) {
    let sqlValue = sample.sqlValue ?? sample.value
    if (sample.type === 'pg_catalog.tid') {
      const bits = BigInt(sample.value)
      sqlValue = `(${bits / 65536n},${bits % 65536n})`
    }
    const element = sample.type === 'pg_catalog.bytea' ? "decode($1,'hex')" : `$1::${sample.type}`
    const patterns = [
      { name: 'one', sql: `ARRAY[${element}]`, cells: [true] },
      { name: 'mixed', sql: `ARRAY[${element},NULL,${element}]`, cells: [true, false, true] },
      {
        name: 'multi',
        sql: `ARRAY[[${element},NULL],[${element},${element}]]`,
        cells: [true, false, true, true],
      },
      { name: 'shifted', sql: `array_fill(${element},ARRAY[2],ARRAY[-3])`, cells: [true, true] },
      { name: 'empty', sql: `ARRAY[]::${sample.type}[]`, cells: [] },
      { name: 'nulls', sql: `ARRAY[NULL,NULL]::${sample.type}[]`, cells: [false, false] },
    ]
    if (sample === cancellation)
      patterns.push({
        name: 'cancellation',
        sql: `array_fill(${element},ARRAY[64])`,
        cells: Array<boolean>(64).fill(true),
      })
    for (const pattern of patterns) {
      const used = pattern.cells.some(Boolean)
      // Preserve the same parameter positions even when an empty/NULL pattern does not read its scalar.
      const row = (
        await pg.query<{ source: string; h32: number; h64: string }>(
          `SELECT (${pattern.sql})::text AS source,hash_array(${pattern.sql}) h32,hash_array_extended(${pattern.sql},seed)::text h64 FROM (SELECT $1::text dummy,$2::bigint seed) params`,
          [sqlValue, sample.seed],
        )
      ).rows[0]!
      assert.equal(typeof row.source, 'string')
      const fold = (key: 'little32' | 'big32' | 'little64' | 'big64', width: number) =>
        String(
          BigInt.asIntN(
            width,
            pattern.cells.reduce(
              (a, present) => a * 31n + (present ? BigInt(sample[key]) : 0n),
              1n,
            ),
          ),
        )
      const little32 = Number(fold('little32', 32)),
        big32 = Number(fold('big32', 32)),
        little64 = fold('little64', 64),
        big64 = fold('big64', 64)
      assert.equal(little32, row.h32)
      assert.equal(little64, row.h64)
      if (pattern.name === 'cancellation') assert.equal(little32, big32)
      samples.push({
        type: sample.type,
        seed: sample.seed,
        pattern: pattern.name,
        array: row.source,
        little32,
        big32,
        little64,
        big64,
        nan: used && Boolean(sample.nan),
        encoding:
          used &&
          ['pg_catalog.text', 'pg_catalog.jsonb'].includes(sample.type) &&
          /[^\x00-\x7f]/u.test(row.source),
      })
    }
  }
  const output = JSON.stringify({ sourceSha256: oracle.sourceSha256, samples }) + '\n',
    target = 'tests/fixtures/check-array-hash.json'
  if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8'), output)
  else writeFileSync(target, output)
  console.log(
    JSON.stringify({
      samples: samples.length,
      postgresAssertions: samples.length * 2,
      bytes: Buffer.byteLength(output),
    }),
  )
} finally {
  await pg.close()
  oracle.close()
}
