import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinMetadata, builtinTypeComparison } from '../../src/postgres/builtins/inventory.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const reference = JSON.parse(readFileSync('tests/fixtures/check-native-hash.json', 'utf8')) as {
  sha256: string
  bytewiseLoads: boolean
  samples: {
    type: string
    value: string
    seed: string
    little32: number
    little64: string
    big32: number
    big64: string
  }[]
}
const known = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const types = [...new Set(reference.samples.map((s) => s.type))]
const column = (type: string) => 'value_' + type.slice('pg_catalog.'.length).replaceAll('"', '')
const contexts: Record<string, CheckExecutionContext> = {
  little: { nativeByteOrder: 'little', serverEncoding: 'UTF8' },
  big: { nativeByteOrder: 'big', serverEncoding: 'UTF8' },
  unspecified: { serverEncoding: 'UTF8' },
  encoding_unspecified: { nativeByteOrder: 'little' },
}

it('matches both PostgreSQL byte-order branches, native digit/tuple layouts, explicit settings and reached Unknown/NULL/error states in Rust and both targets', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-native-hash-'))
  try {
    expect(reference.bytewiseLoads).toBe(true)
    expect(reference.sha256).toMatch(/^[a-f0-9]{64}$/u)
    const calls: Record<string, string> = {}
    for (const type of types) {
      const support = builtinTypeComparison(type)!
      for (const [suffix, signature] of [
        ['32', support.hash],
        ['64', support.hashExtended],
      ] as const) {
        const fn = builtinMetadata(signature!)
        expect(fn.kind).toBe('function')
        calls[column(type) + '_' + suffix] =
          `pg_catalog.${fn.name}(${column(type)}${suffix === '64' ? ',seed' : ''}) = expected${suffix}`
      }
    }
    calls.wrapped = 'cardinality(ARRAY[hashbytea(value_bytea)]) = 1'
    const expressions = Object.fromEntries(
      Object.entries(calls).map(([name, sql]) => [
        name,
        `CASE WHEN bypass THEN true ELSE (${sql}) END`,
      ]),
    )
    await pg.exec(
      `CREATE TABLE native_hashes(${types.map((type) => column(type) + ' ' + type + (['pg_catalog.text', 'pg_catalog.bpchar', 'pg_catalog.name'].includes(type) ? ' COLLATE "C"' : '')).join(',')},seed bigint,expected32 integer,expected64 bigint,bypass boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'native_hashes')!
    const groups = Object.entries(contexts).map(([contextName, context]) => {
      const plans = Object.entries(expressions).flatMap(([name, sql]) =>
        ['raw', 'stored'].map((origin) => ({
          expression: lowerTableCheck(
            table,
            origin === 'raw'
              ? { name, type: 'check', definition: `CHECK (${sql})` }
              : table.constraints.find((c) => c.name === name)!,
            [],
            catalog.domains,
          )!.expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: `${contextName}_${name}_${origin}`,
          },
        })),
      )
      const group = prepareCheckRustGroup(plans, context)
      for (const [index, check] of group.checks.entries())
        expect(
          check.kind,
          plans[index]!.identity.constraint + ('reason' in check ? ':' + check.reason : ''),
        ).toBe('supported')
      return { group, names: plans.map((p) => p.identity.constraint) }
    })
    const evaluatorSource = groups.map((g) => g.group.evaluatorSource!).join('\n')
    const first = groups[0]!.group
    const group = {
      ...first,
      checks: groups.flatMap((g) => g.group.checks),
      evaluatorSource,
      source: {
        ...first.source!,
        modules: first.source!.modules.map((m) =>
          m.name === 'checks'
            ? { ...m, files: [{ path: 'evaluators.rs', source: evaluatorSource }] }
            : m,
        ),
      },
    }
    const names = groups.flatMap((g) => g.names),
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (context: string, name: string, row: Row, expected: Outcome) => {
      for (const origin of ['raw', 'stored'])
        fixtures.push({ name: `${context}_${name}_${origin}`, row, expected })
    }
    let postgresObservations = 0
    const rawSamples = reference.samples.filter((s) => s.type === 'pg_catalog.bytea')
    for (let start = 0; start < rawSamples.length; start += 64) {
      const samples = rawSamples.slice(start, start + 64)
      const results = (
        await pg.query<{ h32: number; h64: string }>(
          `SELECT hashbytea(decode(hex,'hex')) h32,hashbyteaextended(decode(hex,'hex'),seed)::text h64 FROM (VALUES ${samples.map((s) => `('${s.value}','${s.seed}'::bigint)`).join(',')}) v(hex,seed)`,
        )
      ).rows
      for (const [i, result] of results.entries()) {
        expect(result.h32).toBe(samples[i]!.little32)
        expect(result.h64).toBe(samples[i]!.little64)
        postgresObservations += 2
      }
    }
    for (const sample of reference.samples) {
      const input = column(sample.type),
        value = sample.type === 'pg_catalog.tid' ? BigInt(sample.value) : sample.value
      for (const context of Object.keys(contexts)) {
        const big = context === 'big'
        const row: Row = {
          [input]: known(value),
          seed: known(BigInt(sample.seed)),
          expected32: known(big ? sample.big32 : sample.little32),
          expected64: known(BigInt(big ? sample.big64 : sample.little64)),
          bypass: known(false),
        }
        const encodingMissing =
          context === 'encoding_unspecified' &&
          ['pg_catalog.text', 'pg_catalog.bpchar', 'pg_catalog.name'].includes(sample.type) &&
          /[^\x00-\x7f]/u.test(sample.value)
        for (const suffix of ['32', '64'] as const) {
          const unknown =
            encodingMissing ||
            (context === 'unspecified' && sample[`little${suffix}`] !== sample[`big${suffix}`])
          add(context, input + '_' + suffix, row, { kind: unknown ? 'Unknown' : 'True' })
        }
        if (input === 'value_bytea' && sample.seed === '0')
          add(context, 'wrapped', row, { kind: 'True' })
      }
    }
    const firstError: Input & Outcome = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    const secondError: Input & Outcome = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    for (const context of Object.keys(contexts))
      for (const type of types) {
        const input = column(type),
          base: Row = {
            seed: known(1n),
            expected32: known(0),
            expected64: known(0n),
            bypass: known(false),
          }
        for (const state of [{ kind: 'Null' } as const, { kind: 'Unknown' } as const, firstError]) {
          for (const suffix of ['32', '64']) {
            add(context, input + '_' + suffix, { ...base, [input]: state }, state)
            add(
              context,
              input + '_' + suffix,
              { ...base, [input]: state, bypass: known(true) },
              { kind: 'True' },
            )
          }
          add(
            context,
            input + '_64',
            { ...base, [input]: state, seed: secondError },
            state.kind === 'Error' ? firstError : secondError,
          )
        }
        add(
          context,
          input + '_64',
          { ...base, [input]: { kind: 'Unknown' }, seed: known(null) },
          { kind: 'Unknown' },
        )
      }
    for (const context of Object.keys(contexts)) {
      for (const state of [{ kind: 'Unknown' } as const, firstError])
        add(
          context,
          'wrapped',
          { value_bytea: state, bypass: known(false) },
          state.kind === 'Unknown' ? { kind: 'True' } : state,
        )
      for (const type of types) {
        const sample = reference.samples.find((s) => s.type === type && s.seed === '0')!
        const input = column(type),
          big = context === 'big'
        if (context === 'unspecified' && sample.little32 !== sample.big32) continue
        add(
          context,
          input + '_32',
          {
            [input]: known(type === 'pg_catalog.tid' ? BigInt(sample.value) : sample.value),
            expected32: known((big ? sample.big32 : sample.little32) === 0 ? 1 : 0),
            bypass: known(false),
          },
          { kind: 'False' },
        )
      }
    }
    await runCheckParity(directory, 'nativehash', group, names, fixtures)
    const report = {
      fixtures: fixtures.length,
      referenceSamples: reference.samples.length,
      postgresObservations,
      profiles: types,
      contexts: Object.keys(contexts),
      sourceSha256: reference.sha256,
    }
    await mkdir('artifacts/goal-checks/array-hash', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/array-hash/native-hash-measurements.json',
      JSON.stringify(report, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)
