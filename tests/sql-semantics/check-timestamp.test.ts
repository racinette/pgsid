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
  baseline_literal: "a >= TIMESTAMP '2000-01-01'",
  ignored_offset_literal: "a = TIMESTAMP '2000-01-01 00:00:00+01'",
  infinity: "a < 'infinity'::timestamp",
  negative_infinity: "a > '-infinity'::timestamp",
  membership: 'a IN (b, NULL)',
  between: 'a BETWEEN b AND b',
  simple_case: 'CASE a WHEN NULL THEN false WHEN b THEN flag ELSE NULL END',
  scalar_case: '(CASE WHEN flag THEN a ELSE b END) = b',
  scalar_null: '(CASE WHEN flag THEN a END) IS NULL',
  null_test: 'a IS NULL',
  to_utc: "(a AT TIME ZONE 'UTC') = instant",
  from_utc: "(instant AT TIME ZONE 'UTC') = a",
  timestamp_roundtrip: "timezone('uTc', timezone('utc', a)) = a",
  instant_roundtrip: "timezone('UTC', timezone('UTC', instant)) = instant",
  zone_to_utc: 'timezone(zone, a) = instant',
  zone_from_utc: 'timezone(zone, instant) = a',
  utc_case: "(CASE WHEN flag THEN timezone('UTC', instant) ELSE b END) = b",
  utc_null: "timezone('UTC', a) IS NULL",
}
for (const fn of builtinCallables())
  if (
    fn.kind === 'function' &&
    fn.args.length === 2 &&
    fn.args.every((type) => type === 'pg_catalog."timestamp"') &&
    fn.result === 'pg_catalog.bool'
  )
    supported['direct_' + fn.name] = `pg_catalog.${fn.name}(a,b)`
const dates = [
  null,
  '-infinity',
  '4714-11-24 00:00:00 BC',
  '0044-03-15 12:00:00 BC',
  '1970-01-01 00:00:00',
  '1999-12-31 23:59:59.999999',
  '2000-01-01 00:00:00',
  '2000-01-01 00:00:00.000001',
  '2285-06-04 23:47:34.740992',
  '2285-06-04 23:47:34.740993',
  '294276-12-31 23:59:59.999999',
  'infinity',
]
const value = (value: bigint | boolean | string | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

describe('portable Rust CHECK timestamp and timezone offsets', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  const microseconds = new Map<string | null, bigint | null>()
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-timestamp-'))
    await pg.exec(`CREATE DOMAIN local_time AS timestamp;
      CREATE DOMAIN nested_local_time AS local_time;
      CREATE DOMAIN valid_local_time AS timestamp CHECK (timezone('UTC', VALUE) >= TIMESTAMPTZ '2000-01-01 00:00:00Z');
      CREATE TABLE timestamp_checks (a timestamp, b nested_local_time, instant timestamptz, zone text, flag bool,
        ${Object.entries(supported)
          .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
          .join(',')});
      CREATE TABLE utc_agreement (local_at nested_local_time, instant_at timestamptz,
        CONSTRAINT agreement CHECK (timezone('UTC',local_at) = instant_at));
      CREATE TABLE fixed_agreement (local_at timestamp, instant_at timestamptz, zone text, active bool,
        CONSTRAINT agreement CHECK (CASE WHEN active THEN timezone(zone,local_at) = instant_at ELSE true END));`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((table) => table.name === 'timestamp_checks')!
    for (const date of dates) {
      const hex = (
        await pg.query<{ binary: string | null }>(
          "SELECT encode(timestamp_send($1::timestamp), 'hex') AS binary",
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

  it('matches PGlite in Rust, Go, and TypeScript, without session timezone dependence', async () => {
    const names = Object.keys(supported)
    const domain = catalog.domains.find((domain) => domain.name === 'valid_local_time')!
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
      ...[
        "a > 'now'::timestamp",
        'a::timestamptz = instant',
        'instant::timestamp = a',
        "timezone(INTERVAL '1 hour',a) = instant",
        "a = '2000-01-01 00:00:00'::timestamp(3)",
      ].map((sql, index) => ({
        expression: bind(sql),
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: 'unsupported_' + index,
        },
      })),
    ])
    for (const [index, item] of group.checks.slice(0, names.length + 1).entries())
      expect(item.kind, names[index] ?? 'domain').toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const session of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
      await pg.exec(`SET timezone = '${session}'`)
      for (const a of dates)
        for (const b of dates) {
          const row: Row = {
            a: value(microseconds.get(a)!),
            b: value(microseconds.get(b)!),
            instant: value(microseconds.get(a)!),
            zone: value('UTC'),
            flag: value(a !== null),
          }
          const result = (
            await pg.query<Record<string, boolean | null>>(
              `SELECT ${names.map((name) => `(${supported[name]}) AS "${name}"`).join(',')}
          FROM (SELECT $1::timestamp a, $2::timestamp b, timezone('UTC', $1::timestamp) instant,
          'UTC'::text zone, $3::bool flag) candidate`,
              [a, b, a !== null],
            )
          ).rows[0]!
          for (const name of names) fixtures.push({ name, row, expected: outcome(result[name]!) })
        }
    }
    for (const date of dates) {
      const result = (
        await pg.query<{ value: boolean | null }>(
          "SELECT timezone('UTC',$1::timestamp) >= TIMESTAMPTZ '2000-01-01 00:00:00Z' AS value",
          [date],
        )
      ).rows[0]!.value
      fixtures.push({
        name: 'domain',
        row: { value: value(microseconds.get(date)!) },
        expected: outcome(result),
      })
    }
    for (const zone of ['UTC', 'utc', 'uTc', 'Europe/Paris', 'not-a-zone', ' UTC ', null])
      for (const date of [null, '-infinity', '2000-01-01 00:00:00.000001', 'infinity']) {
        const micros = microseconds.get(date)!
        const row: Row = { a: value(micros), instant: value(micros), zone: value(zone) }
        const definite =
          zone === null ||
          date === null ||
          date === '-infinity' ||
          date === 'infinity' ||
          zone === 'Europe/Paris' ||
          zone.toLowerCase() === 'utc'
        const expected: Outcome = definite
          ? outcome(
              (
                await pg.query<{ value: boolean | null }>(
                  "SELECT timezone($1,$2::timestamp) = timezone('UTC',$2::timestamp) AS value",
                  [zone, date],
                )
              ).rows[0]!.value,
            )
          : { kind: 'Unknown' }
        for (const name of ['zone_to_utc', 'zone_from_utc']) fixtures.push({ name, row, expected })
      }
    const fixedZones = [
      'UTC',
      'GMT',
      'uTc+2',
      'gmt-02:30',
      'UTC0',
      'GMT-0',
      '0',
      '+0',
      '-0',
      '2',
      '+02',
      '-02',
      '+02:30',
      '-02:30:45',
      'UTC+002:003:004',
      'GMT24',
      '+167:59:60',
      '-167:59:60',
      'UTC1:59:60',
      '',
      '+',
      '-',
      'UTC+',
      '+168',
      'UTC0230',
      'GMT1:60',
      'UTC1:59:61',
      'UTC1:',
      'UTC1::',
      'UTC1:2:',
      'UTC--2',
    ]
    for (const session of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
      await pg.exec(`SET timezone = '${session}'`)
      for (const zone of fixedZones)
        for (const date of dates)
          for (const name of ['zone_to_utc', 'zone_from_utc']) {
            const toInstant = name === 'zone_to_utc'
            let converted: bigint | null = null
            let expected: Outcome = { kind: 'True' }
            try {
              const binary = (
                await pg.query<{ binary: string | null }>(
                  toInstant
                    ? "SELECT encode(timestamptz_send(timezone($1,$2::timestamp)), 'hex') AS binary"
                    : "SELECT encode(timestamp_send(timezone($1,timezone('UTC',$2::timestamp))), 'hex') AS binary",
                  [zone, date],
                )
              ).rows[0]!.binary
              converted = binary === null ? null : Buffer.from(binary, 'hex').readBigInt64BE()
              if (converted === null) expected = { kind: 'Null' }
            } catch (error) {
              const state = (error as { code: string }).code
              expect(['22008', '22023']).toContain(state)
              expected = { kind: 'Error', value: { state: Number.parseInt(state, 36) } }
            }
            const row: Row = {
              a: value(toInstant ? microseconds.get(date)! : converted),
              instant: value(toInstant ? converted : microseconds.get(date)!),
              zone: value(zone),
            }
            fixtures.push({ name, row, expected })
            if (
              expected.kind === 'True' &&
              converted !== null &&
              converted !== -9223372036854775808n &&
              converted !== 9223372036854775807n
            ) {
              fixtures.push({
                name,
                row: {
                  ...row,
                  [toInstant ? 'instant' : 'a']: value(
                    converted === 9223371331199999999n ? converted - 1n : converted + 1n,
                  ),
                },
                expected: { kind: 'False' },
              })
            }
          }
    }
    for (const zone of [
      'EST',
      'UTC2DST',
      'UTC2FOO',
      'UTC:2',
      ' UTC+2',
      'UTC+2 ',
      '+1:02:03:04',
      '<+02>-2',
      'Z',
      'UTC' + '0'.repeat(129),
    ]) {
      for (const name of ['zone_to_utc', 'zone_from_utc'])
        fixtures.push({
          name,
          row: { a: value(0n), instant: value(0n), zone: value(zone) },
          expected: { kind: 'Unknown' },
        })
    }
    const unknown: Row = Object.fromEntries(
      table.columns.map((column) => [column.name, { kind: 'Unknown' }]),
    )
    const error: Input = { kind: 'Error', value: { state: Number.parseInt('22008', 36) } }
    const zoneError: Input = { kind: 'Error', value: { state: Number.parseInt('22009', 36) } }
    for (const name of ['equal', 'less', 'zone_to_utc', 'zone_from_utc']) {
      fixtures.push({ name, row: unknown, expected: { kind: 'Unknown' } })
      fixtures.push({ name, row: { ...unknown, a: error, instant: error }, expected: error })
    }
    for (const name of ['zone_to_utc', 'zone_from_utc']) {
      fixtures.push({
        name,
        row: { ...unknown, a: error, instant: error, zone: zoneError },
        expected: zoneError,
      })
      fixtures.push({
        name,
        row: { ...unknown, a: value(9223372036854775807n), instant: value(9223372036854775807n) },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({
        name,
        row: { ...unknown, a: { kind: 'Null' }, instant: { kind: 'Null' }, zone: value('UTC') },
        expected: { kind: 'Null' },
      })
    }
    for (const name of ['scalar_case', 'utc_case'])
      fixtures.push({
        name,
        row: { ...unknown, a: error, instant: error, b: value(0n), flag: value(false) },
        expected: { kind: 'True' },
      })
    for (const [payload, text] of [
      [-211813488000000001n, '4714-11-23 23:59:59.999999 BC'],
      [9223371331200000000n, '294277-01-01 00:00:00'],
    ] as const) {
      await expect(pg.query('SELECT $1::timestamp', [text])).rejects.toMatchObject({
        code: '22008',
      })
      fixtures.push({ name: 'equal', row: { a: value(payload), b: value(0n) }, expected: error })
    }
    const unsupported = group.checks.slice(names.length + 1)
    for (const [index, check] of unsupported.entries())
      if (check.kind === 'supported')
        fixtures.push({
          name: 'unsupported_' + index,
          row: { a: value(0n), instant: value(0n) },
          expected: { kind: 'Unknown' },
        })
    await runCheckParity(
      directory,
      'timestampchecks',
      group,
      [...names, 'domain', ...unsupported.map((_, index) => 'unsupported_' + index)],
      fixtures,
    )
  }, 120_000)

  it('exposes portable timestamp inputs and fixed offsets through both public APIs', async () => {
    const agreement = catalog.tables.find((table) => table.name === 'utc_agreement')!
    const fixedAgreement = catalog.tables.find((table) => table.name === 'fixed_agreement')!
    const ts = renderTypescriptSchemaCheckArtifacts([agreement, fixedAgreement], catalog.domains)
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
      evaluatePublicUtcAgreementChecks: evaluate,
      evaluatePublicValidLocalTimeDomainChecks: evaluateDomain,
      evaluatePublicFixedAgreementChecks: evaluateFixed,
    } = await import(pathToFileURL(join(directory, 'js/checks.js')).href)
    const cases: GoCheckCase[] = []
    for (const [local, instant] of [
      [null, null],
      ['2000-01-01 00:00:00', '2000-01-01 00:00:00'],
      ['1999-12-31 23:59:59.999999', '2000-01-01 00:00:00'],
      ['2285-06-04 23:47:34.740992', '2285-06-04 23:47:34.740993'],
      ['infinity', 'infinity'],
      ['-infinity', 'infinity'],
    ] as const) {
      await pg.exec('BEGIN')
      let accepted = true
      try {
        await pg.query("INSERT INTO utc_agreement VALUES ($1,timezone('UTC',$2::timestamp))", [
          local,
          instant,
        ])
      } catch (error) {
        expect((error as { code: string }).code).toBe('23514')
        accepted = false
      } finally {
        await pg.exec('ROLLBACK')
      }
      const row = { local_at: microseconds.get(local), instant_at: microseconds.get(instant) }
      const results = evaluate({
        local_at: row.local_at === null ? null : runtime.makeTimestampValue(row.local_at),
        instant_at: row.instant_at === null ? null : runtime.makeTimestamptzValue(row.instant_at),
      })
      expect(results[0].result).toEqual({
        certain: true,
        value: local === null || instant === null ? null : accepted,
      })
      cases.push({
        name: `${local} / ${instant}`,
        table: agreement,
        row,
        timestampColumns: ['local_at'],
        timestamptzColumns: ['instant_at'],
        results,
      })
    }
    for (const [zone, local, instant, active] of [
      ['UTC+2', 0n, 7200000000n, true],
      ['-02:30:45', 1n, -9044999999n, true],
      ['GMT24', 0n, 86400000001n, true],
      ['+168', 0n, 0n, true],
      ['UTC1:60', 0n, 0n, true],
      ['-1', -211813488000000000n, 0n, true],
      ['+1', 9223371331199999999n, 0n, true],
      ['UTC2DST', 0n, 0n, true],
      ['UTC+', 9223372036854775807n, 9223372036854775807n, true],
      ['UTC+', -9223372036854775808n, -9223372036854775808n, true],
      ['UTC+', null, 0n, true],
      [null, 0n, 0n, true],
      ['+168', 0n, 0n, false],
    ] as const) {
      const row = { zone, local_at: local, instant_at: instant, active }
      const wrapped = {
        ...row,
        local_at: local === null ? null : runtime.makeTimestampValue(local),
        instant_at: runtime.makeTimestamptzValue(instant),
      }
      const inputSql = (kind: 'timestamp' | 'timestamptz', micros: bigint | null): string =>
        micros === null
          ? `NULL::${kind}`
          : micros === 9223372036854775807n
            ? `'infinity'::${kind}`
            : micros === -9223372036854775808n
              ? `'-infinity'::${kind}`
              : `${kind} '2000-01-01 00:00:00${kind === 'timestamptz' ? 'Z' : ''}' + INTERVAL '${micros} microseconds'`
      await pg.exec('BEGIN')
      let sqlstate: string | undefined
      try {
        await pg.query(
          `INSERT INTO fixed_agreement VALUES (${inputSql('timestamp', local)},
          ${inputSql('timestamptz', instant)},$1,$2)`,
          [zone, active],
        )
      } catch (error) {
        sqlstate = (error as { code: string }).code
      } finally {
        await pg.exec('ROLLBACK')
      }
      const result: GoCheckCase['results'][number]['result'] =
        zone === 'UTC2DST'
          ? { certain: false }
          : sqlstate && sqlstate !== '23514'
            ? { certain: true, error: sqlstate }
            : {
                certain: true,
                value: active && (zone === null || local === null) ? null : sqlstate !== '23514',
              }
      if (result.error)
        expect(() => evaluateFixed(wrapped)).toThrow(
          expect.objectContaining({ code: result.error }),
        )
      else expect(evaluateFixed(wrapped)[0].result).toEqual(result)
      cases.push({
        name: `${zone} / ${local} / ${instant} / ${active}`,
        table: fixedAgreement,
        row,
        timestampColumns: ['local_at'],
        timestamptzColumns: ['instant_at'],
        results: [{ constraint: 'agreement', result }],
      })
    }
    expect(evaluate({})[0].result).toEqual({ certain: false })
    for (const invalid of [
      new Date(),
      0n,
      '2000-01-01',
      { kind: 'Value', value: 0 },
      { kind: 'Value', value: 9223372036854775808n },
    ])
      expect(
        evaluate({ local_at: invalid, instant_at: runtime.makeTimestamptzValue(0n) })[0].result,
      ).toEqual({ certain: false })
    expect(evaluateDomain({ value: runtime.makeTimestampValue(-1n) })[0].result).toEqual({
      certain: true,
      value: false,
    })
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
        'timestampchecks/schema',
      )
      expect(generated.diagnostics).toEqual([])
      for (const artifact of generated.artifacts) {
        await mkdir(dirname(artifact.path), { recursive: true })
        await writeFile(artifact.path, artifact.content)
      }
      await writeFile(
        join(root, 'go.mod'),
        'module timestampchecks\n\ngo 1.25\n\nrequire github.com/jackc/pgx/v5 v5.10.0\n',
      )
      await writeFile(
        join(root, 'go.sum'),
        await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
      )
      await writeFile(
        join(root, 'schema/public/checks_test.go'),
        renderGoCheckTests('public', cases, {
          dateRuntime: 'timestampchecks/schema/public/checkrust/checkruntime',
        }),
      )
      await run('go', ['test', '-mod=mod', './...'], {
        cwd: root,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      }).catch((error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      })
    }
    const root = join(directory, 'typed')
    const generated = renderTypescriptSchemaArtifacts(
      catalog,
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    typescript:\n      schema: { outDir: schema }\n',
      ),
      {},
      join(root, 'schema'),
    )
    expect(generated.diagnostics).toEqual([])
    for (const artifact of generated.artifacts) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
    }
    await writeFile(
      join(root, 'consumer.ts'),
      `import { evaluatePublicUtcAgreementChecks, evaluatePublicValidLocalTimeDomainChecks } from './schema/public/checks.js'
import { makeTimestampValue, makeTimestamptzValue, makeDateValue } from './schema/public/checks-rust/checkruntime/runtime.js'
evaluatePublicUtcAgreementChecks({ local_at: makeTimestampValue(0n), instant_at: makeTimestamptzValue(0n) })
evaluatePublicUtcAgreementChecks({ local_at: null, instant_at: null })
evaluatePublicValidLocalTimeDomainChecks({ value: makeTimestampValue(0n) })
// @ts-expect-error native date objects require caller conversion
evaluatePublicUtcAgreementChecks({ local_at: new Date() })
// @ts-expect-error date day counts are not timestamp microseconds
evaluatePublicValidLocalTimeDomainChecks({ value: makeDateValue(0) })
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
