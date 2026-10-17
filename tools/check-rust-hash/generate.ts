import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PGlite } from '@electric-sql/pglite'
import { builtinMetadata, builtinTypeComparison } from '../../src/postgres/builtins/inventory.js'

const run = promisify(execFile)
const sourcePath = process.argv[2]
assert.ok(sourcePath, 'Pass the PostgreSQL 18 src/common/hashfn.c source path')
const original = readFileSync(sourcePath, 'utf8')
const directory = mkdtempSync(join(tmpdir(), 'pgsid-hash-oracle-'))
const pg = await PGlite.create()
try {
  const source = original
    .replace(
      '#include "postgres.h"',
      `#include <stdint.h>
#include <string.h>
typedef uint32_t uint32;
typedef uint64_t uint64;
#define pg_rotate_left32(v,n) (((v) << (n)) | ((v) >> (32-(n))))`,
    )
    .replace('#include "common/hashfn.h"', '')
    .replace('#include "port/pg_bitutils.h"', '')
    .replaceAll('if (((uintptr_t) k & UINT32_ALIGN_MASK) == 0)', 'if (0)')
  writeFileSync(join(directory, 'hashfn.c'), source.slice(0, source.indexOf('/*\n * string_hash:')))
  for (const order of ['little', 'big'])
    await run('cc', [
      '-O2',
      ...(order === 'big' ? ['-DWORDS_BIGENDIAN'] : []),
      ...[
        'hash_bytes',
        'hash_bytes_extended',
        'hash_bytes_uint32',
        'hash_bytes_uint32_extended',
      ].map((name) => `-D${name}=${order}_${name}`),
      '-c',
      join(directory, 'hashfn.c'),
      '-o',
      join(directory, `${order}.o`),
    ])
  writeFileSync(
    join(directory, 'main.c'),
    `#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
uint32_t little_hash_bytes(const unsigned char*,int);
uint32_t big_hash_bytes(const unsigned char*,int);
uint64_t little_hash_bytes_extended(const unsigned char*,int,uint64_t);
uint64_t big_hash_bytes_extended(const unsigned char*,int,uint64_t);
int main(int argc, char **argv) {
  unsigned char bytes[4096]; char hex[8193], seed[32];
  while(argc > 2) {
    snprintf(hex,sizeof(hex),"%s",argv[1]);
    snprintf(seed,sizeof(seed),"%s",argv[2]);
    argc = 0;
    int len=0;
    if(hex[0]!='-') for(int i=0;hex[i];i+=2) { unsigned x; sscanf(hex+i,"%2x",&x); bytes[len++]=(unsigned char)x; }
    uint64_t salt=(uint64_t)strtoll(seed,0,10);
    printf("%d %lld %d %lld\\n",(int32_t)little_hash_bytes(bytes,len),(long long)little_hash_bytes_extended(bytes,len,salt),(int32_t)big_hash_bytes(bytes,len),(long long)big_hash_bytes_extended(bytes,len,salt));
  }
  return 0;
}`,
  )
  const oracle = join(directory, 'oracle')
  await run('cc', [
    join(directory, 'main.c'),
    join(directory, 'little.o'),
    join(directory, 'big.o'),
    '-o',
    oracle,
  ])
  const hash = async (bytes: Buffer, seed: string) => {
    const [little32, little64, big32, big64] = (
      await run(oracle, [bytes.toString('hex') || '-', seed], { encoding: 'utf8' })
    ).stdout
      .trim()
      .split(' ')
    return { little32: Number(little32), little64: little64!, big32: Number(big32), big64: big64! }
  }
  const seeds = [
    '0',
    '1',
    '-1',
    '-9223372036854775808',
    '9223372036854775807',
    '1311768467750121216',
  ]
  const samples: {
    type: string
    value: string
    seed: string
    little32: number
    little64: string
    big32: number
    big64: string
  }[] = []
  for (const n of [...Array.from({ length: 41 }, (_, i) => i), 47, 48, 49, 255, 256, 257])
    for (let kind = 0; kind < 4; kind++) {
      const bytes = Buffer.from(
        Array.from({ length: n }, (_, i) =>
          kind === 0
            ? 0
            : kind === 1
              ? 255
              : kind === 2
                ? (i * 37 + n * 13) % 256
                : (i * 137 + n * 17 + 91) % 256,
        ),
      )
      for (const seed of seeds)
        samples.push({
          type: 'pg_catalog.bytea',
          value: bytes.toString('hex'),
          seed,
          ...(await hash(bytes, seed)),
        })
    }
  const profiles: [string, string[]][] = [
    ['text', ['', 'a', 'abcd', 'abcdefgh', 'abcdefghi', 'é雪😊']],
    ['bpchar', ['', '   ', 'abc  ', 'é雪😊  ']],
    ['name', ['', 'a', 'abcd', 'é雪😊']],
    [
      '"numeric"',
      [
        '0',
        '-0.0000',
        'NaN',
        'Infinity',
        '-Infinity',
        '1',
        '-1',
        '1.0000',
        '1234',
        '12345.678900',
        '0.0000000123',
        '1e100',
      ],
    ],
    ['inet', ['0.0.0.0/0', '192.168.1.2/24', '::/0', '2001:db8::1234/64']],
    ['macaddr', ['00:00:00:00:00:00', '00:80:ff:12:34:56']],
    ['macaddr8', ['00:00:00:00:00:00:00:00', '00:80:ff:12:34:56:78:90']],
    ['uuid', ['00000000-0000-0000-0000-000000000000', '12345678-9abc-def0-1122-334455667788']],
    ['tid', ['(0,0)', '(0,1)', '(1,0)', '(65537,0)', '(65538,7)', '(4294967295,65535)']],
  ]
  for (const [name, values] of profiles) {
    const type = 'pg_catalog.' + name,
      support = builtinTypeComparison(type)!
    const fn32 = builtinMetadata(support.hash!),
      fn64 = builtinMetadata(support.hashExtended!)
    const send = (
      await pg.query<{ send: string }>(
        'SELECT typsend::regproc::text send FROM pg_type WHERE oid=$1::regtype',
        [type],
      )
    ).rows[0]!.send
    assert.ok(fn32.kind === 'function' && fn64.kind === 'function')
    for (const value of values)
      for (const seed of seeds) {
        const row: { bytes: Uint8Array; h32: number; h64: string } = (
          await pg.query<{ bytes: Uint8Array; h32: number; h64: string }>(
            `SELECT ${send}($1::${type}) bytes, pg_catalog.${fn32.name}($1::${type}) h32, pg_catalog.${fn64.name}($1::${type},$2::bigint)::text h64`,
            [value, seed],
          )
        ).rows[0]!
        let big = Buffer.from(row.bytes),
          unit = 1,
          weight = 0,
          special = false,
          zero = false
        if (name === 'bpchar') big = Buffer.from(value.replace(/ +$/u, ''), 'utf8')
        if (name === 'inet') big = Buffer.concat([big.subarray(0, 2), big.subarray(4)])
        if (name === 'tid') unit = 2
        if (name === '"numeric"') {
          special = big.readUInt16BE(4) >= 0xc000
          weight = big.readInt16BE(2)
          big = big.subarray(8)
          while (big.length > 0 && big.readUInt16BE(0) === 0) {
            big = big.subarray(2)
            weight--
          }
          while (big.length > 0 && big.readUInt16BE(big.length - 2) === 0)
            big = big.subarray(0, big.length - 2)
          zero = big.length === 0
          unit = 2
        }
        const little = Buffer.from(big)
        if (unit === 2) little.swap16()
        const le = await hash(little, seed),
          be = await hash(big, seed)
        let result = {
          little32: le.little32,
          little64: le.little64,
          big32: be.big32,
          big64: be.big64,
        }
        if (name === '"numeric"') {
          const transform32 = (h: number) => (special ? 0 : zero ? -1 : h ^ weight)
          const transform64 = (h: string) =>
            String(
              special
                ? BigInt(seed)
                : zero
                  ? BigInt.asIntN(64, BigInt(seed) - 1n)
                  : BigInt(h) ^ BigInt(weight),
            )
          result = {
            little32: transform32(result.little32),
            little64: transform64(result.little64),
            big32: transform32(result.big32),
            big64: transform64(result.big64),
          }
        }
        assert.equal(result.little32, row.h32, type + ' ' + value)
        assert.equal(result.little64, row.h64, type + ' ' + value)
        const input =
          name === 'tid'
            ? String(BigInt(value.match(/\d+/gu)![0]!) * 65536n + BigInt(value.match(/\d+/gu)![1]!))
            : value
        samples.push({ type, value: input, seed, ...result })
      }
  }
  const fixture =
    JSON.stringify({
      source:
        'https://raw.githubusercontent.com/postgres/postgres/REL_18_STABLE/src/common/hashfn.c',
      sha256: createHash('sha256').update(original).digest('hex'),
      bytewiseLoads: true,
      samples,
    }) + '\n'
  const target = 'tests/fixtures/check-native-hash.json'
  if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8'), fixture)
  else writeFileSync(target, fixture)
  console.log(JSON.stringify({ samples: samples.length, bytes: Buffer.byteLength(fixture) }))
} finally {
  await pg.close()
  rmSync(directory, { recursive: true, force: true })
}
