import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck, lowerDomainCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { renderTypescriptSchemaArtifacts } from '../../src/codegen/typescript/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import { renderGoCheckTests, type GoCheckCase } from './check-codegen.js'

const run = promisify(execFile)
const supported: Record<string, string> = {
  equal: 'a = b',
  unequal: 'a <> b',
  less: 'a < b',
  less_equal: 'a <= b',
  greater: 'a > b',
  greater_equal: 'a >= b',
  infinity: "a < 'infinity'::timestamptz",
  negative_infinity: "a > '-infinity'::timestamptz",
  membership: 'a IN (b, NULL)',
  between: 'a BETWEEN b AND b',
  simple_case: 'CASE a WHEN NULL THEN false WHEN b THEN flag ELSE NULL END',
  scalar_case: '(CASE WHEN flag THEN a ELSE b END) = b',
  null_test: 'a IS NULL',
  scalar_null: '(CASE WHEN flag THEN a END) IS NULL',
  nullable_case: '(CASE WHEN flag THEN a END) = b',
}
for (const fn of builtinCallables())
  if (
    fn.kind === 'function' &&
    fn.args.length === 2 &&
    fn.args.every((type) => type === 'pg_catalog.timestamptz') &&
    fn.result === 'pg_catalog.bool'
  )
    supported['direct_' + fn.name] = `pg_catalog.${fn.name}(a,b)`
const dates = [
  null,
  '-infinity',
  '4714-11-24 00:00:00+00 BC',
  '0044-03-15 12:00:00+00 BC',
  '1970-01-01 00:00:00+00',
  '1999-12-31 23:59:59.999999+00',
  '2000-01-01 00:00:00+00',
  '2000-01-01 00:00:00.000001+00',
  '2000-01-01 01:00:00+01',
  '1999-12-31 19:00:00-05',
  '2285-06-04 23:47:34.740992+00',
  '2285-06-04 23:47:34.740993+00',
  '294276-12-31 23:59:59.999999+00',
  'infinity',
]
const value = (value: bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('portable Rust CHECK timestamptz', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  const microseconds = new Map<string | null, bigint | null>()
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-timestamptz-'))
    await pg.exec(
      `CREATE DOMAIN valid_instant AS timestamptz CHECK (VALUE > '-infinity'::timestamptz); CREATE DOMAIN instant AS timestamptz; CREATE DOMAIN nested_instant AS instant; CREATE TABLE timestamptz_checks (a timestamptz, b nested_instant, flag bool, ${Object.entries(
        supported,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')});`,
    )
    await pg.exec(`CREATE TABLE chronology_checks (
      started_at timestamptz, finished_at timestamptz, label text,
      CONSTRAINT chronology CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at)
    )`)
    await pg.exec(`CREATE TABLE typed_temporal_inputs (
      event_day date CHECK (event_day IS NOT NULL),
      occurred_at nested_instant CHECK (occurred_at > '-infinity'::timestamptz)
    )`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((table) => table.name === 'timestamptz_checks')!
    for (const date of dates) {
      const hex = (
        await pg.query<{ binary: string | null }>(
          "SELECT encode(timestamptz_send($1::timestamptz), 'hex') AS binary",
          [date],
        )
      ).rows[0]!.binary
      microseconds.set(date, hex === null ? null : Buffer.from(hex, 'hex').readBigInt64BE())
    }
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  const bind = (sql: string) =>
    lowerTableCheck(
      table,
      { name: 'probe', type: 'check', definition: `CHECK (${sql})` },
      [],
      catalog.domains,
    )!.expression
  it('keeps parsing, timezone casts, timestamp, and arithmetic outside this slice', () => {
    for (const sql of [
      "a > '2000-01-01'::timestamp",
      'a::date = b::date',
      "a + INTERVAL '1 day' > b",
    ])
      expect(
        bind(sql).kind === 'uncertain' ||
          prepareCheckRustGroup([
            {
              expression: bind(sql),
              identity: { schema: 'public', kind: 'table', owner: table.name, constraint: 'probe' },
            },
          ]).checks[0]!.kind === 'unsupported',
      ).toBe(true)
  })
  it('preserves the PostgreSQL epoch, microseconds, boundaries, and infinities', () => {
    expect(microseconds.get('2000-01-01 00:00:00+00')).toBe(0n)
    expect(microseconds.get('1999-12-31 23:59:59.999999+00')).toBe(-1n)
    expect(microseconds.get('2000-01-01 00:00:00.000001+00')).toBe(1n)
    expect(microseconds.get('2000-01-01 01:00:00+01')).toBe(0n)
    expect(microseconds.get('1999-12-31 19:00:00-05')).toBe(0n)
    expect(microseconds.get('4714-11-24 00:00:00+00 BC')).toBe(-211813488000000000n)
    expect(microseconds.get('294276-12-31 23:59:59.999999+00')).toBe(9223371331199999999n)
    expect(microseconds.get('-infinity')).toBe(-9223372036854775808n)
    expect(microseconds.get('infinity')).toBe(9223372036854775807n)
  })
  it('matches PGlite through bound CHECKs, native Rust, Go, and TypeScript', async () => {
    const names = Object.keys(supported)
    const domain = catalog.domains.find((domain) => domain.name === 'valid_instant')!
    const group = prepareCheckRustGroup([
      ...names.map((name) => ({
        expression: lowerTableCheck(
          table,
          table.constraints.find((constraint) => constraint.name === name)!,
          [],
          catalog.domains,
        )!.expression,
        identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
      })),
      {
        expression: lowerDomainCheck(domain, domain.checks[0]!)!.expression,
        identity: {
          schema: 'public',
          kind: 'domain',
          owner: domain.name,
          constraint: domain.checks[0]!.name,
        },
      },
    ])
    for (const [index, item] of group.checks.entries())
      expect(item.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const date of dates) {
      const result = (
        await pg.query<{ value: boolean | null }>(
          "SELECT $1::timestamptz > '-infinity'::timestamptz AS value",
          [date],
        )
      ).rows[0]!.value
      fixtures.push({
        name: 'domain',
        row: { value: value(microseconds.get(date)!) },
        expected: { kind: result === null ? 'Null' : result ? 'True' : 'False' },
      })
    }
    for (const a of dates)
      for (const b of dates) {
        const input = [a, b, a !== null]
        const row: Row = {
          a: value(microseconds.get(a)!),
          b: value(microseconds.get(b)!),
          flag: value(a !== null),
        }
        const result = (
          await pg.query<Record<string, boolean | null>>(
            `SELECT ${names.map((name) => `(${supported[name]}) AS "${name}"`).join(',')} FROM (SELECT $1::timestamptz a, $2::timestamptz b, $3::bool flag) candidate`,
            input,
          )
        ).rows[0]!
        for (const name of names)
          fixtures.push({
            name,
            row,
            expected: { kind: result[name] === null ? 'Null' : result[name] ? 'True' : 'False' },
          })
      }
    const unknown: Row = Object.fromEntries(
      table.columns.map((column) => [column.name, { kind: 'Unknown' }]),
    )
    const error: Input = { kind: 'Error', value: { state: Number.parseInt('22008', 36) } }
    for (const [payload, text] of [
      [-211813488000000001n, '4714-11-23 23:59:59.999999+00 BC'],
      [9223371331200000000n, '294277-01-01 00:00:00+00'],
    ] as const) {
      await expect(pg.query('SELECT $1::timestamptz', [text])).rejects.toMatchObject({
        code: '22008',
      })
      fixtures.push({
        name: 'equal',
        row: { a: value(payload), b: value(0n), flag: value(true) },
        expected: error,
      })
    }
    for (const name of ['equal', 'unequal', 'less', 'less_equal', 'greater', 'greater_equal']) {
      fixtures.push({ name, row: unknown, expected: { kind: 'Unknown' } })
      fixtures.push({
        name,
        row: { ...unknown, a: { kind: 'Null' }, b: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({ name, row: { ...unknown, a: { kind: 'Null' }, b: error }, expected: error })
      fixtures.push({
        name,
        row: { ...unknown, a: error, b: { kind: 'Unknown' } },
        expected: error,
      })
    }
    fixtures.push({
      name: 'scalar_case',
      row: { ...unknown, flag: value(false), b: value(0n) },
      expected: { kind: 'True' },
    })
    fixtures.push({
      name: 'scalar_case',
      row: { ...unknown, flag: value(false), a: error, b: value(0n) },
      expected: { kind: 'True' },
    })
    fixtures.push({
      name: 'scalar_null',
      row: { ...unknown, flag: value(false), a: error },
      expected: { kind: 'True' },
    })
    const unsupported = prepareCheckRustGroup([
      {
        expression: bind("a > '2000-01-01+00'::timestamptz"),
        identity: { schema: 'public', kind: 'table', owner: table.name, constraint: 'literal' },
      },
    ])
    const literalDirectory = join(directory, 'literal')
    await mkdir(literalDirectory)
    await runCheckParity(
      literalDirectory,
      'timestamptzliteral',
      unsupported,
      ['literal'],
      [{ name: 'literal', row: { a: value(0n) }, expected: { kind: 'Unknown' } }],
    )
    await runCheckParity(directory, 'timestamptzchecks', group, [...names, 'domain'], fixtures)
  }, 120_000)

  it('exposes portable wrappers through both public row APIs', async () => {
    const chronology = catalog.tables.find((table) => table.name === 'chronology_checks')!
    const ts = renderTypescriptSchemaCheckArtifacts([table, chronology], catalog.domains)
    await writeFile(join(directory, 'package.json'), '{"type":"module"}')
    await writeFile(join(directory, 'checks.ts'), ts.checks)
    for (const artifact of checkTypescriptArtifacts(ts.rustFiles!)) {
      const path = join(directory, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await run('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(directory, 'js'),
      join(directory, 'checks.ts'),
    ])
    const runtime = await import(
      pathToFileURL(join(directory, 'js/checks-rust/checkruntime/runtime.js')).href
    )
    const {
      evaluatePublicTimestamptzChecksChecks: evaluate,
      evaluatePublicValidInstantDomainChecks: evaluateDomain,
      evaluatePublicChronologyChecksChecks: evaluateChronology,
    } = await import(pathToFileURL(join(directory, 'js/checks.js')).href)
    const cases: GoCheckCase[] = []
    for (const date of dates) {
      const row = { a: microseconds.get(date), b: 0n, flag: true }
      const wrapped = {
        ...row,
        a: date === null ? runtime.timestamptzNull() : runtime.makeTimestamptzValue(row.a),
        b: runtime.makeTimestamptzValue(0n),
      }
      const results = evaluate(wrapped).map(
        ({ constraint, result }: GoCheckCase['results'][number]) => ({ constraint, result }),
      )
      cases.push({ name: date ?? 'NULL', table, row, timestamptzColumns: ['a', 'b'], results })
      const oracle = (
        await pg.query<{ value: boolean | null }>(
          "SELECT $1::timestamptz > '-infinity'::timestamptz AS value",
          [date],
        )
      ).rows[0]!.value
      expect(evaluateDomain({ value: wrapped.a })[0].result).toEqual({
        certain: true,
        value: oracle,
      })
    }
    cases.push({
      name: 'missing',
      table,
      row: {},
      results: evaluate({}).map(({ constraint, result }: GoCheckCase['results'][number]) => ({
        constraint,
        result,
      })),
    })
    expect(
      evaluate({ a: new Date('2000-01-01'), b: runtime.makeTimestamptzValue(0n) })[0].result,
    ).toEqual({
      certain: false,
    })
    for (const payload of [-211813488000000001n, 9223371331200000000n])
      expect(runtime.makeTimestamptzValue(payload)).toEqual({
        kind: 'Error',
        value: { state: Number.parseInt('22008', 36) },
      })
    for (const [start, finish, accepted] of [
      ['2000-01-01 00:00:00+00', '2000-01-01 00:00:00.000001+00', true],
      ['2000-01-01 00:00:00.000001+00', '2000-01-01 00:00:00+00', false],
      ['2000-01-01 01:00:00+01', '1999-12-31 19:00:00-05', true],
      ['2285-06-04 23:47:34.740993+00', '2285-06-04 23:47:34.740992+00', false],
      ['2000-01-01 00:00:00+00', null, true],
      [null, '2000-01-01 00:00:00+00', true],
      ['infinity', '2000-01-01 00:00:00+00', false],
    ] as const) {
      await pg.exec('BEGIN')
      let rejected = false
      try {
        await pg.query("INSERT INTO chronology_checks VALUES ($1,$2,'parity')", [start, finish])
      } catch (error) {
        expect((error as { code: string }).code).toBe('23514')
        rejected = true
      } finally {
        await pg.exec('ROLLBACK')
      }
      expect(!rejected).toBe(accepted)
      const results = evaluateChronology({
        started_at: start === null ? null : runtime.makeTimestamptzValue(microseconds.get(start)),
        finished_at:
          finish === null ? null : runtime.makeTimestamptzValue(microseconds.get(finish)),
        label: 'parity',
      })
      expect(results[0].result).toEqual({ certain: true, value: accepted })
      cases.push({
        name: `chronology ${start} -> ${finish}`,
        table: chronology,
        row: {
          started_at: microseconds.get(start),
          finished_at: microseconds.get(finish),
          label: 'parity',
        },
        timestamptzColumns: ['started_at', 'finished_at'],
        results,
      })
    }
    for (const invalid of [
      0n,
      '2000-01-01',
      { kind: 'Value', value: 0 },
      { kind: 'Value', value: 9223372036854775808n },
    ])
      expect(evaluate({ a: invalid, b: runtime.makeTimestamptzValue(0n) })[0].result).toEqual({
        certain: false,
      })
    expect(() =>
      evaluate({
        a: runtime.makeTimestamptzValue(9223371331200000000n),
        b: runtime.makeTimestamptzValue(0n),
      }),
    ).toThrow()
    expect(
      evaluateChronology({
        started_at: runtime.makeTimestamptzValue(0n),
        finished_at: { kind: 'Null' },
      })[0].result,
    ).toEqual({ certain: true, value: true })
    for (const nulls of ['pointers', 'structs']) {
      const root = join(directory, nulls)
      await mkdir(root)
      const config = parseConfigString(
        `schema: schema.sql\nsql:\n  codegen:\n    go:\n      nulls: ${nulls}\n      schema: { outDir: schema }\n`,
      )
      const generated = renderGoSchemaArtifacts(
        catalog,
        config,
        {},
        join(root, 'schema'),
        'timestamptzchecks/schema',
      )
      expect(generated.diagnostics).toEqual([])
      for (const artifact of generated.artifacts) {
        await mkdir(dirname(artifact.path), { recursive: true })
        await writeFile(artifact.path, artifact.content)
      }
      await writeFile(
        join(root, 'go.mod'),
        'module timestamptzchecks\n\ngo 1.25\n\nrequire github.com/jackc/pgx/v5 v5.10.0\n',
      )
      await writeFile(
        join(root, 'go.sum'),
        await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
      )
      await writeFile(
        join(root, 'schema/public/checks_test.go'),
        renderGoCheckTests('public', cases, {
          dateRuntime: 'timestamptzchecks/schema/public/checkrust/checkruntime',
        }),
      )
      await run('go', ['test', '-mod=mod', './...'], {
        cwd: root,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      }).catch((error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      })
    }
  }, 120_000)

  it('types date and timestamptz wrappers separately in generated schema APIs', async () => {
    const root = join(directory, 'typed')
    const config = parseConfigString(
      'schema: schema.sql\nsql:\n  codegen:\n    typescript:\n      schema: { outDir: schema }\n',
    )
    const generated = renderTypescriptSchemaArtifacts(catalog, config, {}, join(root, 'schema'))
    expect(generated.diagnostics).toEqual([])
    for (const artifact of generated.artifacts) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
    }
    await writeFile(
      join(root, 'consumer.ts'),
      `import { evaluatePublicTypedTemporalInputsChecks, evaluatePublicValidInstantDomainChecks } from './schema/public/checks.js'
import { makeDateValue, makeTimestamptzValue } from './schema/public/checks-rust/checkruntime/runtime.js'
evaluatePublicTypedTemporalInputsChecks({ event_day: makeDateValue(0), occurred_at: makeTimestamptzValue(0n) })
evaluatePublicTypedTemporalInputsChecks({ event_day: null, occurred_at: null })
evaluatePublicValidInstantDomainChecks({ value: makeTimestamptzValue(0n) })
// @ts-expect-error native date objects need caller conversion
evaluatePublicTypedTemporalInputsChecks({ occurred_at: new Date() })
// @ts-expect-error date and timestamp payloads have different types
evaluatePublicTypedTemporalInputsChecks({ event_day: makeTimestamptzValue(0n) })
// @ts-expect-error temporal domains use the timestamp wrapper
evaluatePublicValidInstantDomainChecks({ value: makeDateValue(0) })
`,
    )
    await run('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--noEmit',
      join(root, 'consumer.ts'),
    ])
  }, 120_000)
})
