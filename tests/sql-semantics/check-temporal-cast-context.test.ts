import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
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

const specifications = [
  { source: 'time', target: 'timetz' },
  { source: 'timestamp', target: 'timestamptz' },
  { source: 'date', target: 'timestamptz' },
  { source: 'timestamptz', target: 'timestamp' },
  { source: 'timestamptz', target: 'date' },
  { source: 'timestamptz', target: 'time' },
  { source: 'timestamptz', target: 'timetz' },
]
const profiles = [
  undefined,
  'UTC',
  'Etc/GMT+12',
  'America/New_York',
  'Europe/Paris',
  'Australia/Lord_Howe',
  '2.5',
  'UTC+5:30',
  '-167.999',
  'ABC3DEF3,M3.2.0,M11.1.0',
]
const varying = new Set(['America/New_York', 'Europe/Paris', 'Australia/Lord_Howe'])
const samples: Record<string, (string | null)[]> = {
  time: [null, '00:00:00', '24:00:00', '01:59:59.999999', '02:30:00', '23:59:59.999999'],
  date: [
    null,
    '-infinity',
    'infinity',
    '2000-01-01',
    '2024-03-10',
    '2024-11-03',
    '1880-01-01',
    '2050-07-01',
    '0001-01-01 BC',
    '4714-11-24 BC',
    '294276-12-31',
    '294277-01-01',
    '5874897-12-31',
  ],
  timestamp: [
    null,
    '-infinity',
    'infinity',
    '2000-01-01 00:00:00',
    '1880-01-01 00:00:00',
    '2024-03-10 01:59:59.999999',
    '2024-03-10 02:30:00',
    '2024-11-03 01:30:00',
    '2024-10-06 02:15:00',
    '2024-04-07 01:45:00',
    '2050-07-01 00:00:00',
    '10000-07-01 00:00:00',
    '0001-01-01 00:00:00 BC',
    '4714-11-24 00:00:00 BC',
    '294276-12-31 23:59:59.999999',
  ],
  timestamptz: [
    null,
    '-infinity',
    'infinity',
    '2000-01-01T00:00:00Z',
    '1880-01-01T00:00:00Z',
    '2024-03-10T06:59:59.999999Z',
    '2024-03-10T07:00:00Z',
    '2024-11-03T05:30:00Z',
    '2024-11-03T06:30:00Z',
    '2050-07-01T00:00:00Z',
    '10000-07-01T00:00:00Z',
    '0001-01-01T00:00:00Z BC',
    '4714-11-24T00:00:00Z BC',
    '294276-12-31T23:59:59.999999Z',
  ],
}
const known = (value: string | bigint | number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (cause: unknown): Outcome => {
  const code = (cause as { code?: string }).code
  if (!code || !/^[0-9A-Z]{5}$/.test(code)) throw cause
  return { kind: 'Error', value: { state: parseInt(code, 36) } }
}

it('matches selected temporal casts through declared session zones, DST transitions and recursive coercions', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-temporal-casts-')),
    packet = 'artifacts/goal-checks/temporal-casts-active',
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  try {
    const owners = specifications.map(({ source, target }, index) => {
      const owner = `temporal_cast_${index}`,
        expressions: Record<string, string> = {
          scalar: `v::${target}`,
          domain: `((v::${owner}_source)::${target})::${owner}_target`,
          array_record: `(ROW((ARRAY[v,NULL]::${target}[])[1])::${owner}_record).v`,
          callable: `pg_catalog."${target}"(v)`,
        },
        forms = Object.fromEntries(
          Object.entries(expressions).map(([name, sql]) => [
            name,
            `encode(${target}_send(${sql}),'hex')`,
          ]),
        )
      return { source, target, owner, forms }
    })
    for (const { source, target, owner, forms } of owners) {
      await pg.exec(`CREATE DOMAIN ${owner}_source AS ${source} CHECK(VALUE IS NULL OR VALUE IS NOT NULL);
        CREATE DOMAIN ${owner}_target AS ${target} CHECK(VALUE IS NULL OR VALUE IS NOT NULL);
        CREATE TYPE ${owner}_record AS(v ${target});
        CREATE TABLE ${owner}(v ${source},expected text COLLATE "C",bypass boolean,${Object.entries(
          forms,
        )
          .map(
            ([name, sql]) =>
              `CONSTRAINT ${name} CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
          )
          .join(',')})`)
      for (const [name, sql] of Object.entries(forms))
        await pg.exec(
          `CREATE TABLE ${owner}_${name}(LIKE ${owner});ALTER TABLE ${owner}_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
        )
    }
    const catalog = await snapshotCatalog(pg)
    const groups = profiles.map((timeZone, profile) =>
      prepareCheckRustGroup(
        owners.flatMap(({ owner, forms }) => {
          const table = catalog.tables.find((t) => t.name === owner)!
          return Object.entries(forms).flatMap(([operation, sql]) =>
            (['source', 'stored'] as const).map((origin) => {
              const name = `p${profile}_${owner}_${operation}_${origin}`
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
                identity: { schema: 'public', kind: 'table' as const, owner, constraint: name },
                expression,
              }
            }),
          )
        }),
        { timeZone, defaultCollation: 'C', serverEncoding: 'UTF8' },
      ),
    )
    const evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
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
    for (const { source, target, owner, forms } of owners)
      for (const value of samples[source]!) {
        await pg.exec("SET TimeZone='UTC'")
        const wire = (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(${source}_send($1::${source}),'hex') wire`,
              [value],
            )
          ).rows[0]!.wire,
          stored =
            wire === null
              ? null
              : source === 'date'
                ? Buffer.from(wire, 'hex').readInt32BE()
                : Buffer.from(wire, 'hex').readBigInt64BE()
        for (const [profile, zone] of profiles.entries()) {
          await pg.query("SELECT set_config('TimeZone',$1,false)", [zone ?? 'UTC'])
          for (const [operation, sql] of Object.entries(forms)) {
            let output: string | null = null,
              observation: Outcome = { kind: 'True' }
            try {
              output = (
                await pg.query<{ output: string | null }>(
                  `SELECT (${sql}) output FROM(SELECT $1::${source} v)q`,
                  [value],
                )
              ).rows[0]!.output
            } catch (cause) {
              observation = error(cause)
            }
            const finite = value !== null && value !== 'infinity' && value !== '-infinity',
              noContext = finite && (!zone || (source === 'time' && varying.has(zone))),
              unconditional =
                source === 'date' &&
                typeof stored === 'number' &&
                stored >= 106751983 &&
                stored < 2147483647
            for (const expectedText of [output, 'wrong'])
              for (const bypass of [false, true]) {
                const reference: Outcome = bypass
                  ? { kind: 'True' }
                  : observation.kind === 'Error'
                    ? observation
                    : { kind: output === expectedText ? 'True' : 'False' }
                let insertState: string | undefined
                try {
                  await pg.query(
                    `INSERT INTO ${owner}_${operation} VALUES($1::${source},$2::text,$3::boolean)`,
                    [value, expectedText, bypass],
                  )
                } catch (cause) {
                  insertState = (cause as { code: string }).code
                }
                expect(insertState, `${owner}/${operation}/${zone}/${value}`).toBe(
                  reference.kind === 'Error'
                    ? reference.value.state.toString(36).toUpperCase().padStart(5, '0')
                    : reference.kind === 'False'
                      ? '23514'
                      : undefined,
                )
                const expected: Outcome =
                  !bypass && noContext && !unconditional ? { kind: 'Unknown' } : reference
                native.push({
                  source,
                  target,
                  operation,
                  zone: zone ?? null,
                  value,
                  expectedText,
                  bypass,
                  reference,
                  expected,
                })
                for (const origin of ['source', 'stored'])
                  fixtures.push({
                    name: `p${profile}_${owner}_${operation}_${origin}`,
                    row: { v: known(stored), expected: known(expectedText), bypass: known(bypass) },
                    expected,
                  })
              }
          }
        }
      }
    for (const name of names)
      for (const state of [
        { kind: 'Unknown' },
        { kind: 'Error', value: { state: parseInt('22012', 36) } },
      ] as Input[]) {
        fixtures.push({
          name,
          row: { v: state, expected: known('reference'), bypass: known(false) },
          expected: state as Outcome,
        })
        fixtures.push({
          name,
          row: { v: state, expected: known('reference'), bypass: known(true) },
          expected: { kind: 'True' },
        })
      }
    await mkdir(packet, { recursive: true })
    await writeFile(join(packet, 'native.json'), JSON.stringify(native, null, 2) + '\n')
    await writeFile(
      join(packet, 'summary.json'),
      JSON.stringify(
        {
          inserts: native.length,
          fixtures: fixtures.length,
          checks: names.length,
          profiles: profiles.length,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'temporal_cast_context', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)

it('casts already-projected dates without repeating date input validation before timezone resolution', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-projected-date-casts-')),
    packet = 'artifacts/goal-checks/temporal-casts-active',
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = [],
    zones = ['UTC', 'Etc/GMT+12', '-48', '-167.999', 'America/New_York'],
    forms: Record<string, string> = {
      scalar: "encode(timestamptz_send(v::timestamptz),'hex')",
      domain: "encode(timestamptz_send((v::projected_source)::projected_target),'hex')",
      array_record:
        "encode(timestamptz_send((ROW((ARRAY[v,NULL]::timestamptz[])[1])::projected_record).v),'hex')",
    }
  try {
    await pg.exec(`CREATE DOMAIN projected_source AS date CHECK(VALUE IS NULL OR VALUE IS NOT NULL);
      CREATE DOMAIN projected_target AS timestamptz CHECK(VALUE IS NULL OR VALUE IS NOT NULL);
      CREATE TYPE projected_record AS(v timestamptz);
      CREATE TABLE projected_input(v date);
      CREATE TABLE projected_cast(v date,expected text COLLATE "C",bypass boolean,${Object.entries(
        forms,
      )
        .map(
          ([name, sql]) =>
            `CONSTRAINT ${name} CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
        )
        .join(',')})`)
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE projected_${name}(LIKE projected_cast);ALTER TABLE projected_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
    const c = await snapshotCatalog(pg),
      table = c.tables.find((t) => t.name === 'projected_cast')!,
      groups = zones.map((timeZone, index) =>
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
              )!.expression
              expect(hasUncertain(expression), name).toBe(false)
              return {
                identity: {
                  schema: 'public',
                  kind: 'table' as const,
                  owner: 'projected_cast',
                  constraint: name,
                },
                expression,
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
    group.checks.forEach((check, i) => expect(check.kind, names[i]).toBe('supported'))
    for (const sourceZone of zones) {
      await pg.query("SELECT set_config('TimeZone',$1,false)", [sourceZone])
      await pg.exec(
        "TRUNCATE projected_input;INSERT INTO projected_input VALUES(('4714-11-24T00:00:00Z BC'::timestamptz)::date)",
      )
      const wire = (
          await pg.query<{ wire: string }>(
            "SELECT encode(date_send(v),'hex') wire FROM projected_input",
          )
        ).rows[0]!.wire,
        day = Buffer.from(wire, 'hex').readInt32BE()
      for (const [index, zone] of zones.entries()) {
        await pg.query("SELECT set_config('TimeZone',$1,false)", [zone])
        for (const [operation, sql] of Object.entries(forms)) {
          let output: string | null = null,
            observation: Outcome = { kind: 'True' }
          try {
            output = (
              await pg.query<{ output: string | null }>(
                `SELECT (${sql}) output FROM projected_input`,
              )
            ).rows[0]!.output
          } catch (cause) {
            observation = error(cause)
          }
          for (const expectedText of [output, 'wrong'])
            for (const bypass of [false, true]) {
              const expected: Outcome = bypass
                ? { kind: 'True' }
                : observation.kind === 'Error'
                  ? observation
                  : { kind: output === expectedText ? 'True' : 'False' }
              let code: string | undefined
              try {
                await pg.query(
                  `INSERT INTO projected_${operation} SELECT v,$1::text,$2::boolean FROM projected_input`,
                  [expectedText, bypass],
                )
              } catch (cause) {
                code = (cause as { code: string }).code
              }
              expect(code, `${sourceZone}/${zone}/${operation}`).toBe(
                expected.kind === 'Error'
                  ? expected.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : expected.kind === 'False'
                    ? '23514'
                    : undefined,
              )
              native.push({ sourceZone, zone, day, operation, expectedText, bypass, expected })
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: `p${index}_${operation}_${origin}`,
                  row: { v: known(day), expected: known(expectedText), bypass: known(bypass) },
                  expected,
                })
            }
        }
      }
    }
    await writeFile(join(packet, 'projected-native.json'), JSON.stringify(native, null, 2) + '\n')
    await writeFile(
      join(packet, 'projected-summary.json'),
      JSON.stringify(
        { inserts: native.length, fixtures: fixtures.length, checks: names.length },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'projected_date_casts', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)

it('preserves calendar and clock errors before unknown timestamptz timezone resolution', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp(join(tmpdir(), 'pgsid-temporal-calendar-')),
    packet = 'artifacts/goal-checks/temporal-calendar-active'
  try {
    const expressions = {
      scalar: 'raw::timestamptz',
      domain: 'raw::calendar_instant',
      array: '(ARRAY[raw]::timestamptz[])[1]',
      record: '(ROW(raw::timestamptz)::calendar_record).value',
      range: "lower(tstzrange(raw::timestamptz,raw::timestamptz,'[]'))",
    }
    await pg.exec(`CREATE DOMAIN calendar_instant AS timestamptz CHECK(VALUE IS NULL OR VALUE IS NOT NULL);
      CREATE TYPE calendar_record AS (value timestamptz);
      CREATE TABLE calendar_input(raw text,bypass bool,${Object.entries(expressions)
        .map(
          ([name, expression]) =>
            `CONSTRAINT "${name}" CHECK(CASE WHEN bypass THEN true ELSE (${expression}) IS NULL END)`,
        )
        .join(',')})`)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((table) => table.name === 'calendar_input')!
    const constraints = Object.entries(expressions).flatMap(([name, expression]) =>
      (['source', 'stored'] as const).map((origin) => {
        const plan = lowerTableCheck(
          table,
          table.constraints.find((constraint) => constraint.name === name)!,
          catalog.enums,
          catalog.domains,
          origin,
          catalog.rangeTypes,
          catalog.compositeTypeGraph,
          origin === 'source'
            ? `CHECK(CASE WHEN bypass THEN true ELSE (${expression}) IS NULL END)`
            : undefined,
        )!
        expect(hasUncertain(plan.expression), name + '_' + origin).toBe(false)
        return {
          expression: plan.expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: name + '_' + origin,
          },
        }
      }),
    )
    const group = prepareCheckRustGroup(constraints, {
      defaultCollation: 'C',
      serverEncoding: 'UTF8',
    })
    for (const check of group.checks)
      expect(check.kind, 'reason' in check ? check.reason : '').toBe('supported')
    const invalid = [
      '2024-02-30',
      '1900-02-29',
      '0000-01-01',
      '2024-13-01',
      '2024-00-01',
      '2024-01-00',
      '2024-04-31',
      '2147483648-01-01',
      '99999999999999999999-01-01',
      '2024-02-30 BC',
      '0001-02-30 BC',
      '2024-02-30 00:00:00',
      '2024-02-29 25:00:00',
      '2024-02-29 24:00:00.000001',
      '2024-02-29 23:60:00',
      '2024-02-29 23:59:61',
      '2024-02-29 00:00:00+16',
    ]
    const missing = [
      '2000-01-01',
      '2024-02-29',
      '0001-02-29 BC',
      '2024-02-29 12:34:56',
      '2024-02-29 24:00:00',
      '2024-02-29 23:59:60',
      '294277-01-01',
      '294277-01-01 00:00:00',
      '4714-11-23 23:59:59 BC',
    ]
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      observations: unknown[] = []
    for (const zone of ['UTC', 'Etc/GMT-15', 'Etc/GMT+15'])
      for (const style of ['ISO, MDY', 'SQL, DMY', 'German, YMD']) {
        await pg.query("SELECT set_config('TimeZone',$1,false),set_config('DateStyle',$2,false)", [
          zone,
          style,
        ])
        for (const raw of [
          ...invalid,
          ...missing,
          '2000-01-01 00:00:00Z',
          '2024-02-29 12:34:56+05:30',
          null,
        ])
          for (const [name, expression] of Object.entries(expressions)) {
            let expected: Outcome
            try {
              const output = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT (${expression}) IS NULL AS value FROM (SELECT $1::text raw) input`,
                  [raw],
                )
              ).rows[0]!.value
              expected = { kind: output === null ? 'Null' : output ? 'True' : 'False' }
            } catch (cause) {
              expected = error(cause)
            }
            if (raw !== null && invalid.includes(raw)) expect(expected.kind, raw).toBe('Error')
            if (raw !== null && missing.includes(raw)) expected = { kind: 'Unknown' }
            observations.push({ zone, style, raw, expression, expected })
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: name + '_' + origin,
                row: { raw: known(raw), bypass: known(false) },
                expected,
              })
          }
      }
    for (const constraint of constraints) {
      const name = constraint.identity.constraint
      for (const raw of [
        known('2024-02-30'),
        { kind: 'Unknown' } as Input,
        { kind: 'Error', value: { state: parseInt('22012', 36) } } as Input,
      ]) {
        fixtures.push({ name, row: { raw, bypass: known(true) }, expected: { kind: 'True' } })
        if (raw.kind !== 'Value')
          fixtures.push({ name, row: { raw, bypass: known(false) }, expected: raw as Outcome })
      }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/observations.json',
      JSON.stringify(
        { scope: 'complete-owner', observations, fixtures: fixtures.length },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(
      root,
      'temporal_calendar',
      group,
      constraints.map((constraint) => constraint.identity.constraint),
      fixtures,
    )
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 240_000)
