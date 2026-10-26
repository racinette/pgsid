import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'

const packet = 'artifacts/goal-checks/posix-casing-active'
const common: CheckExecutionContext = {
  timeZoneAbbreviations: 'Default',
  maxIdentifierBytes: 63,
  serverEncoding: 'UTF8',
  clientEncoding: 'UTF8',
  dateStyle: { format: 'Postgres', order: 'MDY' },
  defaultCollation: 'C',
}
const profiles = [
  { zone: 'abc2', variable: false, labels: ['abc', 'aBc'] },
  { zone: '<AbC>-02', variable: false, labels: ['abc', 'aBc'] },
  { zone: 'abc3bCd4,m3.2.0,m11.1.0', variable: true, labels: ['abc', 'bCd'] },
  { zone: 'abc3bcd2,m3.2.0,m11.1.0', variable: true, labels: ['abc', 'bCd'] },
  { zone: 'abc3abc4,m3.2.0,m11.1.0', variable: true, labels: ['abc', 'ABC'] },
  { zone: 'abc3bcd3,m3.2.0,m11.1.0', variable: false, labels: ['abc', 'bCd'] },
  { zone: 'abc3bcd4,j60/2,j300/2', variable: true, labels: ['abc', 'bCd'] },
  { zone: 'abc3bcd4,60/2,300/2', variable: true, labels: ['abc', 'bCd'] },
  { zone: 'Pacific/Guam', variable: true, labels: ['UTC'] },
  { zone: 'pAcIfIc/gUaM', variable: true, labels: ['UTC'] },
  { zone: '<abc/utc>-02', variable: false, labels: ['aBc/uTc'] },
]
const forms: {
  [name: string]: {
    sql: string
    operand: 'v' | 'stamp' | 'clock' | 'zoned_clock'
    variable?: boolean
  }
} = {
  text: { sql: 'v::text', operand: 'v' },
  array_text: { sql: 'ARRAY[v,NULL]::text', operand: 'v' },
  json: { sql: 'to_json(v)::text', operand: 'v' },
  project: { sql: "encode(timestamp_send(v::timestamp),'hex')", operand: 'v' },
  project_clock: { sql: "encode(timetz_send(v::timetz),'hex')", operand: 'v' },
  attach: { sql: "encode(timestamptz_send(stamp::timestamptz),'hex')", operand: 'stamp' },
  attach_clock: {
    sql: "encode(timetz_send(clock::timetz),'hex')",
    operand: 'clock',
    variable: true,
  },
  calendar: { sql: "encode(timestamptz_send(v+interval '1 day'),'hex')", operand: 'v' },
  truncate: { sql: "encode(timestamptz_send(date_trunc('day',v)),'hex')", operand: 'v' },
  explicit_calendar: {
    sql: "encode(timestamptz_send(date_add(v,interval '1 month',zone)),'hex')",
    operand: 'v',
  },
  explicit_truncate: {
    sql: "encode(timestamptz_send(date_trunc('day',v,zone)),'hex')",
    operand: 'v',
  },
  explicit_attach: {
    sql: "encode(timestamptz_send(timezone(zone,stamp)),'hex')",
    operand: 'stamp',
  },
  explicit_project: { sql: "encode(timestamp_send(timezone(zone,v)),'hex')", operand: 'v' },
  zone_clock: {
    sql: "encode(timetz_send(timezone(zone,zoned_clock)),'hex')",
    operand: 'zoned_clock',
    variable: true,
  },
  abbreviation_clock: {
    sql: "encode(timetz_send(timezone(abbreviation,zoned_clock)),'hex')",
    operand: 'zoned_clock',
  },
  abbreviation_truncate: {
    sql: "encode(timestamptz_send(date_trunc('day',v,abbreviation)),'hex')",
    operand: 'v',
  },
}
const stamps = [
  '1880-01-01 12:34:56.123456',
  '2000-01-01 12:34:56.123456',
  '2000-07-01 12:34:56.123456',
  '2000-02-29 12:34:56.123456',
  '2024-03-10 01:30:00',
  '2024-11-03 02:30:00',
  'infinity',
  null,
]
const known = (value: string | bigint | boolean | { time: bigint; zone: number } | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const decode = (wire: string | null): bigint | null =>
  wire === null ? null : Buffer.from(wire, 'hex').readBigInt64BE()
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })

it('normalizes POSIX casing across zone output and consumers while retaining TZif spelling and variable-offset clock requirements', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp('/tmp/pgsid-posix-casing-'),
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = [],
    requirements: unknown[] = []
  try {
    await pg.exec(`SET TimeZone='UTC';CREATE TABLE case_inputs(id serial,v timestamptz,stamp timestamp,clock time,zoned_clock timetz);
      CREATE TABLE case_checks(v timestamptz,stamp timestamp,clock time,zoned_clock timetz,zone text,abbreviation text,expected text COLLATE "C",bypass boolean,${Object.entries(
        forms,
      )
        .map(
          ([name, { sql }]) =>
            `CONSTRAINT ${name} CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
        )
        .join(',')})`)
    for (const [name, { sql }] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE case_oracle_${name}(LIKE case_checks);ALTER TABLE case_oracle_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
    for (const stamp of stamps)
      await pg.query(
        "INSERT INTO case_inputs(v,stamp,clock,zoned_clock) VALUES($1::timestamp AT TIME ZONE 'UTC',$1::timestamp,$2::time,$3::timetz)",
        [
          stamp,
          stamp === null ? null : '12:34:56.123456',
          stamp === null ? null : '12:34:56.123456+02:30',
        ],
      )
    const inputs = (
      await pg.query<{
        id: number
        instant: string | null
        local: string | null
        clock: string | null
        zoned: string | null
      }>(
        "SELECT id,encode(timestamptz_send(v),'hex') instant,encode(timestamp_send(stamp),'hex') local,encode(time_send(clock),'hex') clock,encode(timetz_send(zoned_clock),'hex') zoned FROM case_inputs ORDER BY id",
      )
    ).rows
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'case_checks')!
    const groups = profiles.map((profile, index) =>
      prepareCheckRustGroup(
        Object.entries(forms).flatMap(([operation, { sql }]) =>
          (['source', 'stored'] as const).map((origin) => {
            const name = `p${index}_${operation}_${origin}`
            names.push(name)
            const expression = lowerTableCheck(
              table,
              table.constraints.find((k) => k.name === operation)!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source'
                ? `CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`
                : undefined,
            )!.expression
            expect(hasUncertain(expression), name).toBe(false)
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: table.name,
                constraint: name,
              },
              expression: portableCheckAtoms(expression),
            }
          }),
        ),
        { ...common, timeZone: profile.zone },
      ),
    )
    const evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
      group = {
        checks: groups.flatMap((g) => g.checks),
        evaluatorSource,
        source: assembleCheckRust({
          source: evaluatorSource,
          callables: [
            ...new Set([...evaluatorSource.matchAll(/\b(sql__\w+)\(/gu)].map((m) => m[1]!)),
          ],
        }),
        requiresRegex: false,
      }
    group.checks.forEach((check, i) => expect(check.kind, names[i]).toBe('supported'))
    for (const [index, profile] of profiles.entries()) {
      await pg.exec("SET TimeZone='GMT'")
      await pg.query(
        "SELECT set_config('TimeZone',$1,false),set_config('DateStyle','Postgres,MDY',false)",
        [profile.zone],
      )
      const canonical = (
        await pg.query<{ value: string }>("SELECT current_setting('TimeZone') value")
      ).rows[0]!.value
      expect(canonical).toBe(
        profile.zone.includes('Guam') || profile.zone.includes('gUaM')
          ? 'Pacific/Guam'
          : profile.zone.toUpperCase(),
      )
      const offsets = (
        await pg.query<{ value: string }>(
          'SELECT extract(timezone FROM v)::text value FROM case_inputs WHERE id IN(1,2,3) ORDER BY id',
        )
      ).rows.map((r) => r.value)
      expect(new Set(offsets).size > 1, profile.zone).toBe(profile.variable)
      requirements.push({
        profile: index,
        declared: profile.zone,
        canonical,
        offsets,
        variable: profile.variable,
      })
      for (const input of inputs) {
        const abbreviation = profile.labels[(input.id - 1) % profile.labels.length]!,
          value = decode(input.instant),
          local = decode(input.local),
          clock = decode(input.clock),
          zoned =
            input.zoned === null
              ? null
              : { time: decode(input.zoned)!, zone: Buffer.from(input.zoned, 'hex').readInt32BE(8) }
        for (const [operation, { sql, operand, variable }] of Object.entries(forms)) {
          let output: string | null = null,
            failed: Outcome | undefined
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${sql}) value FROM(SELECT v,stamp,clock,zoned_clock,$1::text zone,$2::text abbreviation FROM case_inputs WHERE id=$3)s`,
                [profile.zone, abbreviation, input.id],
              )
            ).rows[0]!.value
          } catch (e) {
            const code = (e as { code: string }).code
            expect(['22008', '22023', '0A000']).toContain(code)
            failed = error(code)
          }
          if (operation === 'text') {
            if (canonical === 'Pacific/Guam' && input.id === 5) expect(output).toContain('ChST')
            if (canonical !== 'Pacific/Guam' && input.id === 3)
              expect(profile.labels.some((label) => output?.includes(label.toUpperCase()))).toBe(
                true,
              )
          }
          for (const expectedText of [output, 'wrong'])
            for (const bypass of [false, true]) {
              const reference: Outcome = bypass
                ? { kind: 'True' }
                : (failed ?? { kind: output === expectedText ? 'True' : 'False' })
              let code: string | undefined
              try {
                await pg.query(
                  `INSERT INTO case_oracle_${operation} SELECT v,stamp,clock,zoned_clock,$1::text,$2::text,$3::text,$4::boolean FROM case_inputs WHERE id=$5`,
                  [profile.zone, abbreviation, expectedText, bypass, input.id],
                )
              } catch (e) {
                code = (e as { code: string }).code
              }
              expect(code, `${index}/${input.id}/${operation}`).toBe(
                reference.kind === 'Error'
                  ? reference.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : reference.kind === 'False'
                    ? '23514'
                    : undefined,
              )
              const field =
                operand === 'v'
                  ? value
                  : operand === 'stamp'
                    ? local
                    : operand === 'clock'
                      ? clock
                      : zoned
              const expected: Outcome =
                !bypass && variable && profile.variable && field !== null
                  ? { kind: 'Unknown' }
                  : reference
              native.push({
                profile: index,
                input: input.id,
                operation,
                abbreviation,
                expectedText,
                bypass,
                reference,
                expected,
                databaseSqlstate: code,
              })
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: `p${index}_${operation}_${origin}`,
                  row: {
                    v: known(value),
                    stamp: known(local),
                    clock: known(clock),
                    zoned_clock: known(zoned),
                    zone: known(profile.zone),
                    abbreviation: known(abbreviation),
                    expected: known(expectedText),
                    bypass: known(bypass),
                  },
                  expected,
                })
            }
        }
      }
    }
    for (const [index, profile] of profiles.entries())
      for (const [operation, { operand }] of Object.entries(forms))
        for (const origin of ['source', 'stored']) {
          const name = `p${index}_${operation}_${origin}`,
            base: Row = {
              v: known(0n),
              stamp: known(0n),
              clock: known(0n),
              zoned_clock: known({ time: 0n, zone: 0 }),
              zone: known(profile.zone),
              abbreviation: known(profile.labels[0]!),
              expected: known('x'),
              bypass: known(false),
            }
          for (const state of [{ kind: 'Unknown' }, error('22012')] as Input[]) {
            fixtures.push({ name, row: { ...base, [operand]: state }, expected: state as Outcome })
            fixtures.push({
              name,
              row: { ...base, [operand]: state, bypass: known(true) },
              expected: { kind: 'True' },
            })
          }
        }
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/native.json', JSON.stringify(native, null, 2) + '\n')
    await writeFile(packet + '/requirements.json', JSON.stringify(requirements, null, 2) + '\n')
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          checks: names.length,
          fixtures: fixtures.length,
          inserts: native.length,
          profiles: profiles.length,
          inputs: inputs.length,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'posix_casing', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)

it('retains UTF8 POSIX label bytes while uppercasing their ASCII letters', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp('/tmp/pgsid-posix-utf8-'),
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = []
  const expressions = {
    text: 'v::text',
    clock: "encode(timetz_send(timezone('éab',zoned_clock)),'hex')",
  }
  try {
    await pg.query(
      "SELECT set_config('TimeZone','<éab>-02',false),set_config('DateStyle','Postgres,MDY',false)",
    )
    expect(
      (await pg.query<{ value: string }>("SELECT current_setting('TimeZone') value")).rows[0]!
        .value,
    ).toBe('<éAB>-02')
    await pg.exec(
      `CREATE TABLE utf8_zones(v timestamptz,zoned_clock timetz,expected text COLLATE "C",${Object.entries(
        expressions,
      )
        .map(
          ([name, sql]) =>
            `CONSTRAINT ${name} CHECK((${sql}) COLLATE "C" IS NOT DISTINCT FROM expected)`,
        )
        .join(',')})`,
    )
    for (const [name, sql] of Object.entries(expressions))
      await pg.exec(
        `CREATE TABLE utf8_oracle_${name}(LIKE utf8_zones);ALTER TABLE utf8_oracle_${name} ADD CHECK((${sql}) COLLATE "C" IS NOT DISTINCT FROM expected)`,
      )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'utf8_zones')!
    const group = prepareCheckRustGroup(
      Object.entries(expressions).flatMap(([operation, sql]) =>
        (['source', 'stored'] as const).map((origin) => {
          const name = operation + '_' + origin
          names.push(name)
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                table,
                table.constraints.find((k) => k.name === operation)!,
                catalog.enums,
                catalog.domains,
                origin,
                catalog.rangeTypes,
                catalog.compositeTypeGraph,
                origin === 'source'
                  ? `CHECK((${sql}) COLLATE "C" IS NOT DISTINCT FROM expected)`
                  : undefined,
              )!.expression,
            ),
          }
        }),
      ),
      { ...common, timeZone: '<éab>-02' },
    )
    group.checks.forEach((check) => expect(check.kind).toBe('supported'))
    for (const input of ['2000-01-01 12:00+00', null])
      for (const [operation, sql] of Object.entries(expressions)) {
        const native = (
          await pg.query<{ value: string | null; wire: string | null }>(
            `SELECT (${sql}) value,encode(timestamptz_send(v),'hex') wire FROM(SELECT $1::timestamptz v,$2::timetz zoned_clock)s`,
            [input, input === null ? null : '12:00+00'],
          )
        ).rows[0]!
        if (operation === 'text' && input !== null) expect(native.value).toContain('éAB')
        for (const expectedText of [native.value, 'wrong']) {
          let code: string | undefined
          try {
            await pg.query(
              `INSERT INTO utf8_oracle_${operation} VALUES($1::timestamptz,$2::timetz,$3)`,
              [input, input === null ? null : '12:00+00', expectedText],
            )
          } catch (e) {
            code = (e as { code: string }).code
          }
          expect(code).toBe(expectedText === native.value ? undefined : '23514')
          for (const origin of ['source', 'stored'])
            fixtures.push({
              name: operation + '_' + origin,
              row: {
                v: known(decode(native.wire)),
                zoned_clock: known(input === null ? null : { time: 43200000000n, zone: 0 }),
                expected: known(expectedText),
              },
              expected: { kind: expectedText === native.value ? 'True' : 'False' },
            })
        }
      }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/utf8-summary.json',
      JSON.stringify(
        {
          checks: names.length,
          fixtures: fixtures.length,
          inserts: fixtures.length / 2,
          targets: ['Rust', 'Go', 'TypeScript'],
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'posix_utf8', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)
