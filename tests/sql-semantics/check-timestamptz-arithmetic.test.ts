import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  assembleCheckRust,
  prepareCheckRustGroup,
} from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
const forms: Record<string, string> = {
  plus: "encode(timestamptz_send(v+span),'hex')",
  minus: "encode(timestamptz_send(v-span),'hex')",
  reversed: "encode(timestamptz_send(span+v),'hex')",
  add: "encode(timestamptz_send(date_add(v,span)),'hex')",
  subtract: "encode(timestamptz_send(date_subtract(v,span)),'hex')",
  domain: "encode(timestamptz_send(((v::instant_domain)+span)::instant_domain),'hex')",
  record: "encode(timestamptz_send((ROW((ARRAY[v+span,NULL])[1])::instant_record).v),'hex')",
  present: '((v+span) IS NOT NULL)::text',
}
const profiles = [
  undefined,
  'UTC',
  'America/New_York',
  'Europe/Paris',
  'Australia/Lord_Howe',
  'Pacific/Apia',
  '-167.999',
  'ABC3DEF3,M3.2.0,M11.1.0',
]
const pairs: [string | null, string | null][] = [
  ['2000-01-31T12:34:56.123456Z', '1 month'],
  ['2000-01-31T12:34:56.123456Z', '1 month 1 day 1 hour'],
  ['2000-03-31T12:00:00Z', '-1 month 30 days -1 hour'],
  ['2024-03-09T17:00:00Z', '1 day'],
  ['2024-03-09T17:00:00Z', '24 hours'],
  ['2024-03-10T07:30:00Z', '-1 day'],
  ['2024-11-02T16:30:00Z', '1 day'],
  ['2024-11-02T16:30:00Z', '24 hours'],
  ['2024-11-03T06:30:00Z', '-1 day'],
  ['2024-10-05T15:45:00Z', '1 day'],
  ['2024-04-06T15:00:00Z', '1 day'],
  ['2011-12-29T22:00:00Z', '1 day'],
  ['2050-03-12T17:00:00Z', '1 month 1 day 1 hour'],
  ['0001-01-31T00:00:00Z BC', '1 month'],
  ...['0', '1 hour', '1 day', '-1 day', '1 month', '-1 month'].map(
    (span) => ['4714-11-24T00:00:00Z BC', span] as [string, string],
  ),
  ['294276-12-31T23:59:59.999999Z', '1 microsecond'],
  ['294276-12-31T23:59:59.999999Z', '-1 month'],
  ['2000-01-01T00:00:00Z', '2147483647 months'],
  ['2000-01-01T00:00:00Z', '2147483647 days'],
  ['2000-01-01T00:00:00Z', '-9223372036854.775808 seconds'],
  ['infinity', '1 day'],
  ['-infinity', '-1 month'],
  ['infinity', '-infinity'],
  ['-infinity', 'infinity'],
  ...['0', '-1 second', '-1 day', '-1 month'].map(
    (span) => ['rounded_max', span] as [string, string],
  ),
  ['2000-01-01T00:00:00Z', 'infinity'],
  [null, '1 day'],
  ['2000-01-01T00:00:00Z', null],
]
const known = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const failure = (cause: unknown): Outcome => {
  const code = (cause as { code?: string }).code
  if (!code || !/^[A-Z0-9]{5}$/.test(code)) throw cause
  return { kind: 'Error', value: { state: parseInt(code, 36) } }
}
it('applies calendar months and days in the declared session zone before elapsed microseconds with native INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-timestamptz-arithmetic-')),
    packet = 'artifacts/goal-checks/timestamp-storage-active',
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  try {
    await pg.exec(`CREATE DOMAIN instant_domain AS timestamptz CHECK(VALUE IS NULL OR VALUE IS NOT NULL);CREATE TYPE instant_record AS(v timestamptz);
   CREATE TABLE instant_arithmetic(v timestamptz,span interval,expected text COLLATE "C",bypass boolean,${Object.entries(
     forms,
   )
     .map(
       ([name, sql]) =>
         `CONSTRAINT ${name} CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
     )
     .join(',')})`)
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE oracle_${name}(LIKE instant_arithmetic);ALTER TABLE oracle_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
    const c = await snapshotCatalog(pg),
      table = c.tables.find((t) => t.name === 'instant_arithmetic')!,
      groups = profiles.map((timeZone, index) =>
        prepareCheckRustGroup(
          Object.entries(forms).flatMap(([operation, sql]) =>
            (['source', 'stored'] as const).map((origin) => {
              const name = `p${index}_${operation}_${origin}`
              names.push(name)
              const expression = lowerTableCheck(
                  table,
                  table.constraints.find((k) => k.name === operation)!,
                  c.enums,
                  c.domains,
                  origin,
                  c.rangeTypes,
                  c.compositeTypeGraph,
                  origin === 'source'
                    ? `CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`
                    : undefined,
                )!.expression,
                publicExpression = portableCheckAtoms(expression)
              expect(hasUncertain(expression), name).toBe(false)
              expect(hasUncertain(publicExpression), name).toBe(false)
              return {
                identity: {
                  schema: 'public',
                  kind: 'table' as const,
                  owner: table.name,
                  constraint: name,
                },
                expression: publicExpression,
              }
            }),
          ),
          { timeZone, defaultCollation: 'C', serverEncoding: 'UTF8' },
        ),
      ),
      evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
      callables = [...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!))],
      group = {
        checks: groups.flatMap((g) => g.checks),
        evaluatorSource,
        source: assembleCheckRust({ source: evaluatorSource, callables }),
        requiresRegex: false,
      }
    group.checks.forEach((check, i) =>
      expect(check.kind, names[i] + ('reason' in check ? ':' + check.reason : '')).toBe(
        'supported',
      ),
    )
    for (const [value, amount] of pairs) {
      const parameter = value === 'rounded_max' ? '294276-12-31T23:59:59.999999Z' : value,
        valueSql = value === 'rounded_max' ? '($1::timestamptz)::timestamptz(0)' : '$1::timestamptz'
      const data = (
          await pg.query<{ stamp: string | null; duration: string | null }>(
            `SELECT encode(timestamptz_send(${valueSql}),'hex') stamp,encode(interval_send($2::interval),'hex') duration`,
            [parameter, amount],
          )
        ).rows[0]!,
        timestamp = data.stamp === null ? null : Buffer.from(data.stamp, 'hex').readBigInt64BE(),
        buffer = data.duration === null ? null : Buffer.from(data.duration, 'hex'),
        span: Input = buffer
          ? {
              kind: 'Value',
              value: {
                time: buffer.readBigInt64BE(),
                days: buffer.readInt32BE(8),
                months: buffer.readInt32BE(12),
              },
            }
          : { kind: 'Null' },
        calendar = !!buffer && (buffer.readInt32BE(8) !== 0 || buffer.readInt32BE(12) !== 0),
        finite =
          timestamp !== null &&
          timestamp !== -9223372036854775808n &&
          timestamp !== 9223372036854775807n,
        intervalFinite = amount !== 'infinity' && amount !== '-infinity'
      for (const [index, zone] of profiles.entries()) {
        await pg.query("SELECT set_config('TimeZone',$1,false)", [zone ?? 'UTC'])
        for (const [operation, sql] of Object.entries(forms)) {
          let output: string | null = null,
            observation: Outcome = { kind: 'True' }
          try {
            output = (
              await pg.query<{ output: string | null }>(
                `SELECT (${sql}) output FROM(SELECT ${valueSql} v,$2::interval span)q`,
                [parameter, amount],
              )
            ).rows[0]!.output
          } catch (cause) {
            observation = failure(cause)
          }
          for (const expectedText of [output, 'wrong'])
            for (const bypass of [false, true]) {
              const reference: Outcome = bypass
                ? { kind: 'True' }
                : observation.kind === 'Error'
                  ? observation
                  : { kind: output === expectedText ? 'True' : 'False' }
              let code: string | undefined
              try {
                await pg.query(
                  `INSERT INTO oracle_${operation} VALUES(${valueSql},$2::interval,$3::text,$4::boolean)`,
                  [parameter, amount, expectedText, bypass],
                )
              } catch (cause) {
                code = (cause as { code: string }).code
              }
              expect(code, `${operation}/${zone}/${value}/${amount}`).toBe(
                reference.kind === 'Error'
                  ? reference.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : reference.kind === 'False'
                    ? '23514'
                    : undefined,
              )
              const expected: Outcome =
                !bypass && !zone && calendar && finite && intervalFinite
                  ? { kind: 'Unknown' }
                  : reference
              native.push({
                operation,
                zone: zone ?? null,
                value,
                amount,
                expectedText,
                bypass,
                reference,
                expected,
              })
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: `p${index}_${operation}_${origin}`,
                  row: {
                    v: known(timestamp),
                    span,
                    expected: known(expectedText),
                    bypass: known(bypass),
                  },
                  expected,
                })
            }
        }
      }
    }
    for (const name of names) {
      const base: Row = {
        v: known(0n),
        span: { kind: 'Value', value: { time: 3600000000n, months: 0, days: 0 } },
        expected: known('reference'),
        bypass: known(false),
      }
      for (const field of ['v', 'span'])
        for (const state of [
          { kind: 'Unknown' },
          { kind: 'Error', value: { state: parseInt('22012', 36) } },
        ] as Input[]) {
          fixtures.push({ name, row: { ...base, [field]: state }, expected: state as Outcome })
          fixtures.push({
            name,
            row: { ...base, [field]: state, bypass: known(true) },
            expected: { kind: 'True' },
          })
        }
      fixtures.push({
        name,
        row: {
          ...base,
          v: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          span: { kind: 'Error', value: { state: parseInt('22003', 36) } },
        },
        expected: {
          kind: 'Error',
          value: { state: parseInt(name.includes('_reversed_') ? '22003' : '22012', 36) },
        },
      })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(join(packet, 'arithmetic-native.json'), JSON.stringify(native, null, 2) + '\n')
    await writeFile(
      join(packet, 'arithmetic-summary.json'),
      JSON.stringify(
        {
          inserts: native.length,
          fixtures: fixtures.length,
          checks: names.length,
          pairs: pairs.length,
          profiles: profiles.length,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'timestamptz_arithmetic', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)
