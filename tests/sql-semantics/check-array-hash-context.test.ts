import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const known = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const reference = JSON.parse(readFileSync('tests/fixtures/check-array-hash.json', 'utf8')) as {
  samples: {
    type: string
    seed: string
    pattern: string
    array: string
    little32: number
    big32: number
    little64: string
    big64: string
    nan: boolean
    encoding: boolean
  }[]
}
const contexts: Record<string, CheckExecutionContext> = {
  little: {
    arrayNulls: true,
    defaultCollation: 'C',
    nativeByteOrder: 'little',
    serverEncoding: 'UTF8',
  },
  big: { arrayNulls: true, defaultCollation: 'C', nativeByteOrder: 'big', serverEncoding: 'UTF8' },
  unspecified: { arrayNulls: true, defaultCollation: 'C', serverEncoding: 'UTF8' },
  encoding_unspecified: { arrayNulls: true, defaultCollation: 'C', nativeByteOrder: 'little' },
}

it('retains whole-array endian alternatives, cancellation, UTF8 and NaN requirements and only reached collation deferrals', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-array-hash-context-'))
  try {
    await pg.exec(
      "CREATE TABLE hash_context(a text,seed bigint,expected32 integer,expected64 bigint,bypass boolean);CREATE COLLATION hash_insensitive(provider=icu,locale='und',deterministic=false);CREATE TABLE hash_collation(a text COLLATE hash_insensitive,seed bigint,expected32 integer,expected64 bigint,bypass boolean)",
    )
    const types = [...new Set(reference.samples.map((s) => s.type))]
    const forms = types.flatMap((type, index) =>
      ([false, true] as const).map((extended) => ({
        name: 'profile_' + index + '_' + (extended ? '64' : '32'),
        sql: `CASE WHEN bypass THEN true ELSE ${extended ? 'hash_array_extended' : 'hash_array'}(a::${type}[]${extended ? ',seed' : ''}) IS NOT DISTINCT FROM ${extended ? 'expected64' : 'expected32'} END`,
      })),
    )
    for (const form of forms)
      await pg.exec(
        `ALTER TABLE hash_context ADD CONSTRAINT ${form.name} CHECK(${form.sql}) NOT VALID`,
      )
    const collations = {
      plain: 'hash_array(a::text[]) IS NOT DISTINCT FROM expected32',
      seeded: 'hash_array_extended(a::text[],seed) IS NOT DISTINCT FROM expected64',
      wrapped: 'cardinality(ARRAY[hash_array(a::text[])])=1',
      lazy: 'CASE WHEN bypass THEN true ELSE hash_array(a::text[]) IS NOT DISTINCT FROM expected32 END',
    }
    for (const [name, sql] of Object.entries(collations))
      await pg.exec(`ALTER TABLE hash_collation ADD CONSTRAINT ${name} CHECK(${sql}) NOT VALID`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'hash_context')!,
      collation = catalog.tables.find((t) => t.name === 'hash_collation')!
    const groups = Object.entries(contexts).map(([contextName, context]) => {
      const plans = [
        ...forms.map((f) => ({ ...f, table })),
        ...Object.entries(collations).map(([name, sql]) => ({
          name: 'collation_' + name,
          sql,
          table: collation,
          constraint: name,
        })),
      ].flatMap((form) =>
        (['source', 'stored'] as const).map((origin) => ({
          expression: lowerTableCheck(
            form.table,
            origin === 'source'
              ? { name: form.name, type: 'check', definition: `CHECK(${form.sql})` }
              : form.table.constraints.find(
                  (c) => c.name === ('constraint' in form ? form.constraint : form.name),
                )!,
            [],
            catalog.domains,
            origin,
          )!.expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: form.table.name,
            constraint: contextName + '_' + form.name + '_' + origin,
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
    const evaluatorSource = groups.map((g) => g.group.evaluatorSource!).join('\n'),
      first = groups[0]!.group
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
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: context + '_' + name + '_' + origin, row, expected })
    }
    for (const sample of reference.samples)
      for (const context of Object.keys(contexts)) {
        const row: Row = {
          a: known(sample.array),
          seed: known(BigInt(sample.seed)),
          expected32: known(context === 'big' ? sample.big32 : sample.little32),
          expected64: known(BigInt(context === 'big' ? sample.big64 : sample.little64)),
          bypass: known(false),
        }
        for (const width of ['32', '64'] as const) {
          const deferred =
            sample.nan ||
            (sample.encoding && context === 'encoding_unspecified') ||
            (context === 'unspecified' && sample[`little${width}`] !== sample[`big${width}`])
          const name = 'profile_' + types.indexOf(sample.type) + '_' + width
          add(context, name, row, { kind: deferred ? 'Unknown' : 'True' })
          if (sample.pattern === 'one')
            add(context, name, { ...row, bypass: known(true) }, { kind: 'True' })
        }
      }
    const cancellation = reference.samples.find((s) => s.pattern === 'cancellation')!
    expect(cancellation.little32).toBe(cancellation.big32)
    expect(cancellation.little64).not.toBe(cancellation.big64)
    for (const context of Object.keys(contexts))
      for (const a of ['{}', '{NULL,NULL}', '{a,b}', '{"é","雪"}', null]) {
        const row: Row = {
          a: known(a),
          seed: known(0n),
          expected32: known(a === null ? null : a === '{}' ? 1 : 961),
          expected64: known(a === null ? null : a === '{}' ? 1n : 961n),
          bypass: known(false),
        }
        for (const name of ['plain', 'seeded', 'wrapped', 'lazy'])
          add(context, 'collation_' + name, row, {
            kind: a === null || a === '{}' || a === '{NULL,NULL}' ? 'True' : 'Unknown',
          })
        add(context, 'collation_lazy', { ...row, bypass: known(true) }, { kind: 'True' })
      }
    await runCheckParity(directory, 'arrayhashcontext', group, names, fixtures)
    await writeFile(
      'artifacts/goal-checks/array-hash-dispatch/context-measurements.json',
      JSON.stringify(
        {
          fixtures: fixtures.length,
          referenceSamples: reference.samples.length,
          profiles: types.length,
          contexts: Object.keys(contexts),
          cancellation,
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)
