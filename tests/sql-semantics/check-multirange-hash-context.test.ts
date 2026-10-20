import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import Decimal from 'decimal.js'

type Reference = {
  type: string
  value: string
  seed: string
  little32: number
  little64: string
  big32: number
  big64: string
}
const reference = JSON.parse(readFileSync('tests/fixtures/check-native-hash.json', 'utf8')) as {
  sha256: string
  samples: Reference[]
}
const value = (input: number | bigint | null): Input =>
  input === null ? { kind: 'Null' } : { kind: 'Value', value: input }

it('inherits numeric hash byte order and compares complete multirange alternatives, preserving context-free shapes and seeds in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-multirange-hash-context-'))
  try {
    const sql =
      'hash_multirange(payload)=expected32 AND hash_multirange_extended(payload,seed)=expected64'
    await pg.exec(
      `CREATE TABLE multirange_hash_context(payload nummultirange,seed bigint,expected32 integer,expected64 bigint,CHECK(${sql}))`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'multirange_hash_context')!
    const contexts = [
      { name: 'little', order: 'little' as const },
      { name: 'big', order: 'big' as const },
      { name: 'unspecified', order: undefined },
    ]
    const groups = contexts.map((context) =>
      prepareCheckRustGroup(
        ['source', 'stored'].map((origin) => ({
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: origin + '_' + context.name,
          },
          expression: lowerTableCheck(
            table,
            origin === 'source'
              ? { name: 'check', type: 'check', definition: `CHECK(${sql})` }
              : table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin as 'source' | 'stored',
          )!.expression,
        })),
        context.order ? { nativeByteOrder: context.order } : {},
      ),
    )
    for (const group of groups)
      expect(group.checks.filter((c) => c.kind !== 'supported')).toEqual([])
    const evaluatorSource = groups.map((g) => g.evaluatorSource).join('\n')
    const group: ReturnType<typeof prepareCheckRustGroup> = {
      ...groups[0]!,
      checks: groups.flatMap((g) => g.checks),
      evaluatorSource,
      source: {
        ...groups[0]!.source!,
        modules: groups[0]!.source!.modules.map((m) =>
          m.name === 'checks'
            ? { ...m, files: [{ path: 'evaluators.rs', source: evaluatorSource }] }
            : m,
        ),
      },
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const numeric = reference.samples.filter((s) => s.type === 'pg_catalog."numeric"')
    const seeds = [...new Set(numeric.map((s) => s.seed))]
    const values = [...new Set(numeric.map((s) => s.value))]
    let nativeReferences = 0,
      deferred = 0,
      portable = 0
    const specs = ['{}', '{(,)}']
    for (const a of values) {
      specs.push(`{[${a},${a}]}`, `{(,${a})}`, `{[${a},)}`)
      for (const b of values) specs.push(`{[${a},${a}],[${b},${b}]}`)
    }
    for (const seed of seeds) {
      const samples = numeric.filter((s) => s.seed === seed)
      const get = (text: string | null) =>
        text === null
          ? null
          : samples.find((s) => {
              if (text === 'NaN') return s.value === 'NaN'
              return new Decimal(s.value).eq(text)
            })!
      for (const rendered of specs) {
        const payload = await readMultirangeFixture(pg, 'pg_catalog.nummultirange', rendered)
        const members = (
          await pg.query<{ lower: string | null; upper: string | null; flags: number }>(
            `SELECT lower(span)::text lower,upper(span)::text upper,
          (CASE WHEN lower_inc(span) THEN 2 ELSE 0 END)+(CASE WHEN upper_inc(span) THEN 4 ELSE 0 END)+(CASE WHEN lower_inf(span) THEN 8 ELSE 0 END)+(CASE WHEN upper_inf(span) THEN 16 ELSE 0 END) flags
          FROM unnest($1::nummultirange) WITH ORDINALITY AS p(span,position) ORDER BY position`,
            [rendered],
          )
        ).rows
        const alternatives: Record<string, { h32: number; h64: bigint }> = {}
        for (const order of ['little', 'big'] as const) {
          let h32 = 1,
            h64 = 1n
          for (const member of members) {
            const lower = get(member.lower),
              upper = get(member.upper)
            if (member.lower !== null) expect(lower).toBeDefined()
            if (member.upper !== null) expect(upper).toBeDefined()
            const result = (
              await pg.query<{ h32: number; h64: string }>(
                `WITH h AS(SELECT hashint4($1::integer) # $2::integer a,hashint4extended($1::integer,$6::bigint) # $4::bigint b)
              SELECT (((a<<1)|(a>>31 & 1)) # $3::integer) h32,((((b<<1)&(-4294967298::bigint))|((b>>31)&4294967297::bigint)) # $5::bigint)::text h64 FROM h`,
                [
                  member.flags,
                  lower?.[(order + '32') as 'little32' | 'big32'] ?? 0,
                  upper?.[(order + '32') as 'little32' | 'big32'] ?? 0,
                  lower?.[(order + '64') as 'little64' | 'big64'] ?? '0',
                  upper?.[(order + '64') as 'little64' | 'big64'] ?? '0',
                  seed,
                ],
              )
            ).rows[0]!
            h32 = (Math.imul(h32, 31) + result.h32) | 0
            h64 = BigInt.asIntN(64, h64 * 31n + BigInt(result.h64))
          }
          alternatives[order] = { h32, h64 }
        }
        const native = (
          await pg.query<{ h32: number; h64: string }>(
            'SELECT hash_multirange($1::nummultirange) h32,hash_multirange_extended($1::nummultirange,$2)::text h64',
            [rendered, seed],
          )
        ).rows[0]!
        expect(alternatives.little).toEqual({ h32: native.h32, h64: BigInt(native.h64) })
        await pg.query('INSERT INTO multirange_hash_context VALUES($1::nummultirange,$2,$3,$4)', [
          rendered,
          seed,
          native.h32,
          native.h64,
        ])
        nativeReferences++
        const agrees =
          alternatives.little!.h32 === alternatives.big!.h32 &&
          alternatives.little!.h64 === alternatives.big!.h64
        if (agrees) portable++
        else deferred++
        for (const context of contexts) {
          const expected = alternatives[context.order ?? 'little']!
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: origin + '_' + context.name,
              row: {
                payload: { kind: 'Value', value: payload! },
                seed: value(BigInt(seed)),
                expected32: value(expected.h32),
                expected64: value(expected.h64),
              },
              expected: { kind: context.name === 'unspecified' && !agrees ? 'Unknown' : 'True' },
            })
        }
      }
    }
    await runCheckParity(
      directory,
      'multihashcontext',
      group,
      contexts.flatMap((c) => ['source', 'stored'].map((o) => o + '_' + c.name)),
      fixtures,
    )
    expect(deferred).toBeGreaterThan(0)
    expect(portable).toBeGreaterThan(0)
    await mkdir('artifacts/check-multirange-wire-hash', { recursive: true })
    await writeFile(
      'artifacts/check-multirange-wire-hash/context-report.json',
      JSON.stringify(
        {
          nativeReferences,
          fixtures: fixtures.length,
          portable,
          deferred,
          referenceSha256: reference.sha256,
          inheritedNumericReference: 'tests/fixtures/check-native-hash.json',
          completeAlternatives: true,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300000)
