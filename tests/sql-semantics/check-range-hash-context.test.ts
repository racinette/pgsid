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
import { readRangeFixture } from './check-range-fixtures.js'

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

it('inherits numeric hash byte order and compares complete range alternatives, preserving context-free shapes and seeds in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-range-hash-context-'))
  try {
    const sql = 'hash_range(payload)=expected32 AND hash_range_extended(payload,seed)=expected64'
    await pg.exec(
      `CREATE TABLE range_hash_context(payload numrange,seed bigint,expected32 integer,expected64 bigint,CHECK(${sql}))`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'range_hash_context')!
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
    for (const seed of seeds) {
      const samples = numeric.filter((s) => s.seed === seed)
      const get = (text: string | null) =>
        text === null ? null : samples.find((s) => s.value === text)!
      const pairs: [string | null, string | null][] = [[null, null]]
      for (const [i, a] of values.entries())
        pairs.push([a, a], [a, values[(i + 3) % values.length]!], [null, a], [a, null])
      for (const [a, b] of pairs) {
        const swap =
          a !== null &&
          b !== null &&
          (await pg.query<{ swap: boolean }>('SELECT $1::numeric > $2::numeric swap', [a, b]))
            .rows[0]!.swap
        const low = swap ? b : a,
          high = swap ? a : b
        for (const flags of ['[]', '[)', '(]', '()']) {
          const rendered = (
            await pg.query<{ rendered: string }>(
              'SELECT numrange($1::numeric,$2::numeric,$3)::text rendered',
              [low, high, flags],
            )
          ).rows[0]!.rendered
          const payload = await readRangeFixture(
            pg,
            'SELECT $1::numrange span',
            'span',
            'pg_catalog.numrange',
            [rendered],
          )
          const native = (
            await pg.query<{ h32: number; h64: string; flags: number }>(
              `SELECT hash_range(span) h32,hash_range_extended(span,$2) h64,
            CASE WHEN isempty(span) THEN 1 ELSE (CASE WHEN lower_inc(span) THEN 2 ELSE 0 END)+(CASE WHEN upper_inc(span) THEN 4 ELSE 0 END)+(CASE WHEN lower_inf(span) THEN 8 ELSE 0 END)+(CASE WHEN upper_inf(span) THEN 16 ELSE 0 END) END flags FROM (SELECT $1::numrange span) q`,
              [rendered, seed],
            )
          ).rows[0]!
          const lower = payload!.empty ? null : get(low),
            upper = payload!.empty ? null : get(high)
          const alternatives: Record<string, { h32: number; h64: bigint }> = {}
          for (const order of ['little', 'big'] as const) {
            const lh32 = lower?.[(order + '32') as 'little32' | 'big32'] ?? 0
            const uh32 = upper?.[(order + '32') as 'little32' | 'big32'] ?? 0
            const lh64 = lower?.[(order + '64') as 'little64' | 'big64'] ?? '0'
            const uh64 = upper?.[(order + '64') as 'little64' | 'big64'] ?? '0'
            const result = (
              await pg.query<{ h32: number; h64: string }>(
                `WITH h AS(SELECT hashint4($1::integer) # $2::integer a,hashint4extended($1::integer,$6::bigint) # $4::bigint b)
              SELECT (((a<<1)|(a>>31 & 1)) # $3::integer) h32,((((b<<1)&(-4294967298::bigint))|((b>>31)&4294967297::bigint)) # $5::bigint)::text h64 FROM h`,
                [native.flags, lh32, uh32, lh64, uh64, seed],
              )
            ).rows[0]!
            alternatives[order] = { h32: result.h32, h64: BigInt(result.h64) }
          }
          expect(alternatives.little).toEqual({ h32: native.h32, h64: BigInt(native.h64) })
          await pg.query('INSERT INTO range_hash_context VALUES($1::numrange,$2,$3,$4)', [
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
    }
    await runCheckParity(
      directory,
      'rangehashcontext',
      group,
      contexts.flatMap((c) => ['source', 'stored'].map((o) => o + '_' + c.name)),
      fixtures,
    )
    expect(deferred).toBeGreaterThan(0)
    expect(portable).toBeGreaterThan(0)
    await mkdir('artifacts/check-range-wire-hash', { recursive: true })
    await writeFile(
      'artifacts/check-range-wire-hash/context-report.json',
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
