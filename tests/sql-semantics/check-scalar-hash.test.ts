import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
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

const reference = JSON.parse(readFileSync('tests/fixtures/check-scalar-hash.json', 'utf8')) as {
  sourceSha256: string
  postgresAssertions: number
  samples: {
    type: string
    value: string
    sqlValue: string
    seed: string
    little32: number
    little64: string
    big32: number
    big64: string
    nan: boolean
    encoding: boolean
  }[]
}
const known = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(state, 36) },
})
const contexts: Record<string, CheckExecutionContext> = {
  little: { nativeByteOrder: 'little', serverEncoding: 'UTF8' },
  big: { nativeByteOrder: 'big', serverEncoding: 'UTF8' },
  unspecified: { serverEncoding: 'UTF8' },
  encoding_unspecified: { nativeByteOrder: 'little' },
}
const column: Record<string, string> = {
  'pg_catalog.float4': 'a',
  'pg_catalog.float8': 'b',
  'pg_catalog.jsonb': 'document',
}
const inputFor = (sample: (typeof reference.samples)[number]) =>
  known(
    sample.type === 'pg_catalog.float4'
      ? Number(sample.value)
      : sample.type === 'pg_catalog.float8'
        ? BigInt(sample.value)
        : sample.value,
  )

it('matches float and logical JSONB hashes, native layouts, canonical traversal, strict states and composed Unknown validity in every target', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-scalar-hash-'))
  try {
    const calls: Record<string, string> = {
      a32: 'hashfloat4(a)=expected32',
      a64: 'hashfloat4extended(a,seed)=expected64',
      b32: 'hashfloat8(b)=expected32',
      b64: 'hashfloat8extended(b,seed)=expected64',
      document32: 'jsonb_hash(document)=expected32',
      document64: 'jsonb_hash_extended(document,seed)=expected64',
      a_wrapped: 'cardinality(ARRAY[hashfloat4(a)])=1',
      b_wrapped: 'cardinality(ARRAY[hashfloat8(b)])=1',
      document_wrapped: 'cardinality(ARRAY[jsonb_hash(document)])=1',
      widened: 'hashfloat8(a::float8)=expected32',
      mixed: 'hashfloat4(a)=hashfloat8(a::float8)',
      coalesced: 'hashfloat8(COALESCE(b,a::float8))=expected32',
      text_input: 'jsonb_hash(source::jsonb)=expected32',
      json_input: 'jsonb_hash(source::json::jsonb)=expected32',
      literal_nan: "hashfloat8('NaN'::float8)=expected32",
      nan_constant: "hashfloat8('NaN'::float8)=0",
      nan_wrapped: "cardinality(ARRAY[hashfloat8('NaN'::float8)])=1",
      prepared_error: 'hashfloat8((1.0::float8)/(0.0::float8))=expected32',
      lazy_error: 'hashfloat8(b/divisor)=expected32',
      prepared_json_error: "jsonb_hash(('{'::text)::jsonb)=expected32",
      pruned_json_error:
        "CASE WHEN true THEN true ELSE jsonb_hash(('{'::text)::jsonb)=expected32 END",
      scalar_json: 'jsonb_hash(to_jsonb(amount))=expected32',
      built: "jsonb_hash(jsonb_build_object('key',amount,'flag',true))=expected32",
      extracted: "jsonb_hash(document->'a')=expected32",
      merged: 'jsonb_hash(document||\'{"extra":true}\'::jsonb)=expected32',
      zero_seed_low:
        '(jsonb_hash(document)::bigint & 4294967295) = (jsonb_hash_extended(document,0) & 4294967295)',
    }
    const expressions = Object.fromEntries(
      Object.entries(calls).map(([name, sql]) => [
        name,
        `CASE WHEN bypass THEN true ELSE (${sql}) END`,
      ]),
    )
    await pg.exec(
      `CREATE DOMAIN hash_single AS float4;CREATE DOMAIN hash_document AS jsonb;CREATE DOMAIN retained_hash_document AS hash_document;CREATE TABLE scalar_hashes(a hash_single,b float8,document retained_hash_document,source text,amount numeric,seed bigint,divisor float8,expected32 integer,expected64 bigint,bypass boolean,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT ${name} CHECK(${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'scalar_hashes')!
    const groups = Object.entries(contexts).map(([contextName, context]) => {
      const plans = Object.entries(expressions).flatMap(([name, sql]) =>
        ['raw', 'stored'].map((origin) => ({
          expression: lowerTableCheck(
            table,
            origin === 'raw'
              ? { name, type: 'check', definition: `CHECK(${sql})` }
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
      for (const origin of ['raw', 'stored'])
        fixtures.push({ name: `${context}_${name}_${origin}`, row, expected })
    }
    let postgresObservations = 0
    for (const sample of reference.samples) {
      const input = column[sample.type]!,
        expected = (context: string, suffix: '32' | '64'): Outcome => ({
          kind:
            sample.nan ||
            (context === 'encoding_unspecified' && sample.encoding) ||
            (context === 'unspecified' && sample[`little${suffix}`] !== sample[`big${suffix}`])
              ? 'Unknown'
              : 'True',
        })
      const fn =
        sample.type === 'pg_catalog.float4'
          ? 'hashfloat4'
          : sample.type === 'pg_catalog.float8'
            ? 'hashfloat8'
            : 'jsonb_hash'
      const ext = sample.type === 'pg_catalog.jsonb' ? 'jsonb_hash_extended' : fn + 'extended'
      const result = (
        await pg.query<{ h32: number; h64: string }>(
          `SELECT ${fn}($1::${sample.type}) h32,${ext}($1::${sample.type},$2::bigint)::text h64`,
          [sample.sqlValue, sample.seed],
        )
      ).rows[0]!
      expect(result.h32).toBe(sample.little32)
      expect(result.h64).toBe(sample.little64)
      postgresObservations += 2
      for (const context of Object.keys(contexts)) {
        const row: Row = {
          [input]: inputFor(sample),
          seed: known(BigInt(sample.seed)),
          expected32: known(context === 'big' ? sample.big32 : sample.little32),
          expected64: known(BigInt(context === 'big' ? sample.big64 : sample.little64)),
          bypass: known(false),
        }
        for (const suffix of ['32', '64'] as const)
          add(context, input + suffix, row, expected(context, suffix))
        if (sample.seed === '0') {
          add(context, input + '_wrapped', row, { kind: 'True' })
          const wrong = {
            ...row,
            expected32: known((context === 'big' ? sample.big32 : sample.little32) === 0 ? 1 : 0),
          }
          add(
            context,
            input + '32',
            wrong,
            expected(context, '32').kind === 'Unknown' ? { kind: 'Unknown' } : { kind: 'False' },
          )
          if (input === 'a') {
            add(context, 'widened', row, expected(context, '32'))
            add(context, 'mixed', row, expected(context, '32'))
            add(context, 'coalesced', { ...row, b: known(null) }, expected(context, '32'))
          }
          if (input === 'document') {
            add(
              context,
              'text_input',
              { ...row, source: known(sample.value) },
              expected(context, '32'),
            )
            add(
              context,
              'json_input',
              { ...row, source: known(sample.value) },
              expected(context, '32'),
            )
            add(context, 'zero_seed_low', row, expected(context, '32'))
          }
        }
      }
    }
    const base: Row = {
      a: known(1065353216),
      b: known(4607182418800017408n),
      document: known('{"a":1}'),
      source: known('{"a":1}'),
      amount: known('1'),
      seed: known(0n),
      divisor: known(4607182418800017408n),
      expected32: known(0),
      expected64: known(0n),
      bypass: known(false),
    }
    for (const context of Object.keys(contexts)) {
      for (const input of ['a', 'b', 'document'])
        for (const state of [
          { kind: 'Unknown' } as const,
          { kind: 'Null' } as const,
          error('22012'),
        ]) {
          for (const suffix of ['32', '64']) {
            add(context, input + suffix, { ...base, [input]: state }, state)
            add(
              context,
              input + suffix,
              { ...base, [input]: state, bypass: known(true) },
              { kind: 'True' },
            )
          }
          add(
            context,
            input + '64',
            { ...base, [input]: state, seed: error('22003') },
            state.kind === 'Error' ? state : error('22003'),
          )
          add(
            context,
            input + '_wrapped',
            { ...base, [input]: state },
            state.kind === 'Error' ? state : { kind: 'True' },
          )
        }
      for (const sample of reference.samples.filter((s) => s.seed === '0' && s.nan))
        add(
          context,
          column[sample.type] + '64',
          { ...base, [column[sample.type]!]: inputFor(sample), seed: known(null) },
          { kind: 'Null' },
        )
      add(context, 'literal_nan', base, { kind: 'Unknown' })
      add(context, 'literal_nan', { ...base, bypass: known(true) }, { kind: 'True' })
      add(context, 'nan_constant', base, { kind: 'Unknown' })
      add(context, 'nan_constant', { ...base, bypass: known(true) }, { kind: 'True' })
      add(context, 'nan_wrapped', base, { kind: 'True' })
      add(context, 'prepared_error', { ...base, bypass: known(true) }, error('22012'))
      add(context, 'prepared_json_error', { ...base, bypass: known(true) }, error('22P02'))
      add(context, 'pruned_json_error', base, { kind: 'True' })
      add(context, 'lazy_error', { ...base, divisor: known(0n) }, error('22012'))
      add(
        context,
        'lazy_error',
        { ...base, divisor: known(0n), bypass: known(true) },
        { kind: 'True' },
      )
      add(context, 'text_input', { ...base, source: known('{') }, error('22P02'))
      add(
        context,
        'text_input',
        { ...base, source: known('{'), bypass: known(true) },
        { kind: 'True' },
      )
    }
    for (const [name, sql] of Object.entries({
      scalar_json: 'jsonb_hash(to_jsonb(amount))',
      built: "jsonb_hash(jsonb_build_object('key',amount,'flag',true))",
      extracted: "jsonb_hash(document->'a')",
      merged: 'jsonb_hash(document||\'{"extra":true}\'::jsonb)',
    })) {
      for (const amount of ['0', '-0.00', '1.00', '12345.6789', 'NaN', 'Infinity']) {
        const result = (
          await pg.query<{ value: number | null }>(
            `SELECT ${sql} value FROM (SELECT $1::numeric amount,'{"a": 0, "b": [true]}'::jsonb document) input`,
            [amount],
          )
        ).rows[0]!.value
        postgresObservations++
        add(
          'little',
          name,
          {
            ...base,
            document: known('{"a": 0, "b": [true]}'),
            amount: known(amount),
            expected32: known(result),
          },
          { kind: result === null ? 'Null' : 'True' },
        )
      }
    }
    await runCheckParity(directory, 'scalarhash', group, names, fixtures)
    await mkdir('artifacts/goal-checks/scalar-hash', { recursive: true })
    await writeFile(
      'artifacts/goal-checks/scalar-hash/measurements.json',
      JSON.stringify(
        {
          fixtures: fixtures.length,
          postgresObservations,
          referenceSamples: reference.samples.length,
          contexts: Object.keys(contexts),
          outcomes: Object.fromEntries(
            [...new Set(fixtures.map((f) => f.expected.kind))].map((k) => [
              k,
              fixtures.filter((f) => f.expected.kind === k).length,
            ]),
          ),
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 300_000)

it('retains uncertain typed-literal preparation before a skipped hash branch', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-hash-literal-preparation-'))
  try {
    for (const [name, expression, state] of [
      ['division', 'hashfloat8((1.0::float8)/(0.0::float8))=0', '22012'],
      ['json_input', "jsonb_hash(('{'::text)::jsonb)=0", '22P02'],
    ] as const) {
      await pg.exec(
        `CREATE TEMP TABLE prepared_${name}(bypass boolean,CHECK(CASE WHEN bypass THEN true ELSE (${expression}) END))`,
      )
      await expect(
        pg.exec(`INSERT INTO prepared_${name}(bypass) VALUES(true)`),
      ).rejects.toMatchObject({ code: state })
    }
    await pg.exec(
      "CREATE TEMP TABLE prepared_pruned(bypass boolean,CHECK(CASE WHEN bypass THEN true ELSE CASE WHEN true THEN true ELSE jsonb_hash(('{'::text)::jsonb)=0 END END))",
    )
    await pg.exec('INSERT INTO prepared_pruned(bypass) VALUES(false)')
    const sql = `CASE WHEN bypass THEN true ELSE jsonb_hash('"\\u20ac"'::jsonb)=0 END`
    await pg.exec(`CREATE TABLE hash_literal_preparation(bypass boolean,CHECK(${sql}))`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'hash_literal_preparation')!
    const expression = lowerTableCheck(
      table,
      { name: 'literal', type: 'check', definition: `CHECK(${sql})` },
      [],
      catalog.domains,
      'source',
    )!.expression
    const group = prepareCheckRustGroup(
      [
        {
          expression,
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: 'literal' },
        },
      ],
      { nativeByteOrder: 'little' },
    )
    expect(group.checks[0]!.kind).toBe('supported')
    await runCheckParity(
      directory,
      'hashliteralpreparation',
      group,
      ['literal'],
      [{ name: 'literal', row: { bypass: known(true) }, expected: { kind: 'Unknown' } }],
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 120_000)
