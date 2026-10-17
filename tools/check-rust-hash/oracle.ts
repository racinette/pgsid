import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const run = promisify(execFile)

export async function createHashOracle(sourcePath: string) {
  const original = readFileSync(sourcePath, 'utf8')
  const directory = mkdtempSync(join(tmpdir(), 'pgsid-hash-oracle-'))
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
    writeFileSync(
      join(directory, 'hashfn.c'),
      source.slice(0, source.indexOf('/*\n * string_hash:')),
    )
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
  unsigned char bytes[32768]; char hex[65537], seed[32];
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
      assert.ok(bytes.length <= 32768)
      const [little32, little64, big32, big64] = (
        await run(oracle, [bytes.toString('hex') || '-', seed], { encoding: 'utf8' })
      ).stdout
        .trim()
        .split(' ')
      return {
        little32: Number(little32),
        little64: little64!,
        big32: Number(big32),
        big64: big64!,
      }
    }
    return {
      hash,
      sourceSha256: createHash('sha256').update(original).digest('hex'),
      close: () => rmSync(directory, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(directory, { recursive: true, force: true })
    throw error
  }
}
