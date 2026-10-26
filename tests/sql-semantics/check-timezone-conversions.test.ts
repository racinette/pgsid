import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'
const known = (value: string | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const common: CheckExecutionContext = {
  timeZone: 'UTC',
  timeZoneAbbreviations: 'Default',
  maxIdentifierBytes: 63,
  serverEncoding: 'UTF8',
  defaultCollation: 'C',
}
const profiles: {
  session: string
  context: CheckExecutionContext
  zones: (string | null)[]
  defer?: (zone: string | null) => boolean
}[] = [
  {
    session: 'UTC',
    context: common,
    zones: [
      'UTC',
      'Etc/UTC',
      'America/New_York',
      'Europe/Moscow',
      'MSK',
      'GMT',
      'EST',
      '+02',
      '+167:59:60',
      '-167:59:60',
      '',
      null,
    ],
  },
  {
    session: 'America/New_York',
    context: { ...common, timeZone: 'America/New_York' },
    zones: ['LMT', 'EST', 'EDT', 'UTC', 'America/New_York'],
  },
  {
    session: 'Europe/Dublin',
    context: { ...common, timeZone: 'Europe/Dublin' },
    zones: ['GMT', 'IST', 'DMT', 'UTC', 'Europe/Dublin'],
  },
  {
    session: 'Europe/Moscow',
    context: { ...common, timeZone: 'Europe/Moscow' },
    zones: ['MSK', 'MSD', 'MMT', 'UTC', 'Europe/Moscow'],
  },
  {
    session: '<UTC>-02',
    context: { ...common, timeZone: '<UTC>-02' },
    zones: ['UTC', 'utc', 'Etc/UTC', 'GMT'],
  },
  {
    session: '<Etc/UTC>-02',
    context: { ...common, timeZone: '<Etc/UTC>-02' },
    zones: ['Etc/UTC', 'etc/utc', 'UTC'],
  },
  {
    session: '<America/New_York>-02',
    context: { ...common, timeZone: '<America/New_York>-02' },
    zones: ['America/New_York', 'America/New_Xxxx', 'UTC'],
    defer: (z) => z === 'America/New_Xxxx',
  },
  {
    session: 'ABC3abc4,M3.2.0,M11.1.0',
    context: { ...common, timeZone: 'ABC3abc4,M3.2.0,M11.1.0' },
    zones: ['ABC', 'abc', 'UTC', 'Etc/UTC'],
  },
  {
    session: 'ABC3BC4,M3.2.0,M11.1.0',
    context: { ...common, timeZone: 'ABC3BC4,M3.2.0,M11.1.0' },
    zones: ['ABC', 'BC', 'UTC'],
  },
  {
    session: 'UTC',
    context: { ...common, timeZone: undefined },
    zones: ['UTC', 'Etc/UTC', 'MSK', ''],
    defer: () => true,
  },
  {
    session: 'UTC',
    context: { ...common, timeZoneAbbreviations: undefined },
    zones: ['UTC', 'Etc/UTC', 'MSK', ''],
    defer: (z) => z !== 'UTC',
  },
  {
    session: 'UTC',
    context: { ...common, maxIdentifierBytes: undefined },
    zones: ['UTC', 'Etc/UTC', 'MSK', ''],
    defer: (z) => z !== '',
  },
]
const forms = {
  attach: "encode(timestamptz_send(timezone(zone,localstamp)),'hex')",
  project: "encode(timestamp_send(timezone(zone,instant)),'hex')",
  attach_nested:
    "encode(timestamptz_send((ARRAY[timezone(zone,localstamp)::zone_instant_domain,NULL])[1]),'hex')",
  project_nested:
    "encode(timestamp_send((ARRAY[timezone(zone,instant)::zone_local_domain,NULL])[1]),'hex')",
}
it('preserves fixed, dynamic and full-name timezone conversions with native forced histories, stored boundaries and INSERT parity', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp('/tmp/pgsid-timezone-conversions-'),
    packet = 'artifacts/goal-checks/timezone-consumers-active',
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  try {
    const source = await readFile('vendor/postgresql-timezone/Default', 'utf8'),
      abbreviations = source
        .split('\n')
        .map((l) => l.split('#')[0]!.trim().split(/\s+/u)[0]!)
        .filter(Boolean)
    expect(
      (
        await pg.query<{ value: string }>(
          "SELECT pg_read_file('/pglite/share/postgresql/timezonesets/Default') value",
        )
      ).rows[0]!.value,
    ).toBe(source)
    expect(abbreviations).toHaveLength(195)
    await pg.exec(
      `SET TimeZone='UTC';CREATE DOMAIN zone_instant_domain AS timestamptz;CREATE DOMAIN zone_local_domain AS timestamp;CREATE TABLE zone_inputs(id serial,label text,stamp timestamp,instant timestamptz)`,
    )
    for (const [index, v] of [
      '1880-07-01 12:34:56+00',
      '1930-06-20 21:59:59.999999+00',
      '1930-06-20 22:00:00+00',
      '1930-06-20 22:00:00.000001+00',
      '2000-07-01 12:34:56+00',
      '2012-07-01 12:34:56+00',
      '2015-07-01 12:34:56+00',
      '2024-03-10 02:30:00+00',
      '2024-11-03 01:30:00+00',
      '4714-11-24 00:00:00+00 BC',
      'infinity',
      '-infinity',
      null,
    ].entries())
      await pg.query(
        'INSERT INTO zone_inputs(label,stamp,instant)VALUES($1,$2::timestamp,$2::timestamptz)',
        [index === 4 ? 'nested' : 'ordinary', v],
      )
    await pg.exec(
      "INSERT INTO zone_inputs(label,stamp,instant)VALUES('nested',('294276-12-31 23:59:59.999999'::timestamp)::timestamp(0),('294276-12-31 23:59:59.999999+00'::timestamptz)::timestamptz(0));SET TimeZone='-167.999';INSERT INTO zone_inputs(label,stamp,instant)VALUES('nested',(('4714-11-24 00:00:00+00 BC'::timestamptz)::date)::timestamp,'4714-11-24 00:00:00+00 BC');SET TimeZone='UTC'",
    )
    const inputs = (
      await pg.query<{ id: number; label: string; stamp: string | null; instant: string | null }>(
        "SELECT id,label,encode(timestamp_send(stamp),'hex') stamp,encode(timestamptz_send(instant),'hex') instant FROM zone_inputs ORDER BY id",
      )
    ).rows
    await pg.exec(
      `CREATE TABLE timezone_checks(localstamp timestamp,instant timestamptz,zone text,expected text COLLATE "C",bypass boolean,${Object.entries(
        forms,
      )
        .map(
          ([name, sql]) =>
            `CONSTRAINT ${name} CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
        )
        .join(',')})`,
    )
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE timezone_oracle_${name}(LIKE timezone_checks);ALTER TABLE timezone_oracle_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
    const c = await snapshotCatalog(pg),
      table = c.tables.find((t) => t.name === 'timezone_checks')!,
      groups = profiles.map((profile, index) =>
        prepareCheckRustGroup(
          Object.entries(forms).flatMap(([operation, sql]) =>
            (['source', 'stored'] as const).map((origin) => {
              const name = `p${index}_${operation}_${origin}`
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
                    c.enums,
                    c.domains,
                    origin,
                    c.rangeTypes,
                    c.compositeTypeGraph,
                    origin === 'source'
                      ? `CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`
                      : undefined,
                  )!.expression,
                ),
              }
            }),
          ),
          profile.context,
        ),
      ),
      evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
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
    group.checks.forEach((check, index) => expect(check.kind, names[index]).toBe('supported'))
    for (const [index, profile] of profiles.entries()) {
      await pg.exec("SET TimeZone='GMT'")
      await pg.query("SELECT set_config('TimeZone',$1,false)", [profile.session])
      const cases = inputs.flatMap((input) =>
        profile.zones.map((zone) => ({ input, zone, full: false })),
      )
      if (index === 0)
        for (const zone of abbreviations)
          for (const input of [inputs[0]!, inputs[4]!]) cases.push({ input, zone, full: true })
      for (const { input, zone, full } of cases) {
        const stamp =
            input.stamp === null ? null : Buffer.from(input.stamp, 'hex').readBigInt64BE(),
          instant =
            input.instant === null ? null : Buffer.from(input.instant, 'hex').readBigInt64BE()
        for (const [operation, sql] of Object.entries(forms)) {
          if (operation.includes('nested') && (full || input.label !== 'nested')) continue
          let output: string | null = null,
            error: Outcome | undefined
          try {
            output = (
              await pg.query<{ value: string | null }>(
                `SELECT (${sql}) value FROM(SELECT stamp localstamp,instant,$1::text zone FROM zone_inputs WHERE id=$2)s`,
                [zone, input.id],
              )
            ).rows[0]!.value
          } catch (e) {
            const code = (e as { code: string }).code
            expect(code).toMatch(/^[A-Z0-9]{5}$/u)
            error = { kind: 'Error', value: { state: parseInt(code, 36) } }
          }
          const operand = operation.startsWith('attach') ? stamp : instant,
            finite =
              operand !== null &&
              operand !== -9223372036854775808n &&
              operand !== 9223372036854775807n
          for (const expectedText of [output, 'wrong'])
            for (const bypass of [false, true]) {
              const reference: Outcome = bypass
                ? { kind: 'True' }
                : (error ?? { kind: output === expectedText ? 'True' : 'False' })
              let code: string | undefined
              try {
                await pg.query(
                  `INSERT INTO timezone_oracle_${operation} SELECT stamp,instant,$1::text,$2::text,$3::boolean FROM zone_inputs WHERE id=$4`,
                  [zone, expectedText, bypass, input.id],
                )
              } catch (e) {
                code = (e as { code: string }).code
              }
              expect(code, `${index}/${input.id}/${zone}/${operation}`).toBe(
                reference.kind === 'Error'
                  ? reference.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : reference.kind === 'False'
                    ? stamp !== null &&
                      stamp !== -9223372036854775808n &&
                      stamp < -211813488000000000n
                      ? '22008'
                      : '23514'
                    : undefined,
              )
              const expected: Outcome =
                !bypass && finite && zone !== null && profile.defer?.(zone)
                  ? { kind: 'Unknown' }
                  : reference
              native.push({
                databaseSqlstate: code,
                profile: index,
                input: input.id,
                zone,
                operation,
                reference,
                expected,
                expectedText,
                bypass,
              })
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: `p${index}_${operation}_${origin}`,
                  row: {
                    localstamp: known(stamp),
                    instant: known(instant),
                    zone: known(zone),
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
      const operand = name.includes('_attach') ? 'localstamp' : 'instant',
        base: Row = {
          localstamp: known(0n),
          instant: known(0n),
          zone: known('UTC'),
          expected: known('x'),
          bypass: known(false),
        }
      for (const field of [operand, 'zone'])
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
          zone: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          [operand]: { kind: 'Error', value: { state: parseInt('22012', 36) } },
        },
        expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/native.json', JSON.stringify(native, null, 2) + '\n')
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
    await runCheckParity(root, 'timezone_conversions', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)

it('keeps first-slot POSIX abbreviations fixed for calendar callers and retains context-independent conversion states', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp('/tmp/pgsid-timezone-facets-')
  try {
    const names = ['calendar', 'truncate', 'attach', 'project', 'rescue', 'full_zone_error'],
      expressions = [
        "date_add(instant,interval '1 month','ABC') IS NOT DISTINCT FROM date_add(instant,interval '1 month','UTC+03')",
        "date_trunc('day',instant,'ABC') IS NOT DISTINCT FROM date_trunc('day',instant,'UTC+03')",
        'timezone(v::text,stamp) IS NOT DISTINCT FROM expected_instant',
        'timezone(v::text,instant) IS NOT DISTINCT FROM expected_stamp',
        "timezone('UTC',v) IS NOT DISTINCT FROM expected_instant",
        "timezone('+167:59:60',v) IS NOT DISTINCT FROM expected_instant",
      ]
    await pg.exec(
      `CREATE TABLE zone_facets(v timestamp,stamp timestamp,instant timestamptz,expected_instant timestamptz,expected_stamp timestamp,${expressions.map((sql, i) => `CONSTRAINT ${names[i]} CHECK(${sql})`).join(',')})`,
    )
    const c = await snapshotCatalog(pg),
      table = c.tables.find((t) => t.name === 'zone_facets')!,
      checks = expressions.map((sql, index) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: names[index]!,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            table.constraints.find((k) => k.name === names[index])!,
            c.enums,
            c.domains,
            'source',
            c.rangeTypes,
            c.compositeTypeGraph,
            `CHECK(${sql})`,
          )!.expression,
        ),
      })),
      groups = [
        prepareCheckRustGroup(checks.slice(0, 2), {
          ...common,
          timeZone: 'ABC3abc4,M3.2.0,M11.1.0',
        }),
        prepareCheckRustGroup(checks.slice(2, 4), { serverEncoding: 'UTF8' }),
        prepareCheckRustGroup(checks.slice(4), { ...common, timeZone: '<UTC>167:59:60' }),
      ],
      evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n'),
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
      },
      fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const v of ['2000-01-30 23:00+00', '2000-07-30 23:00+00']) {
      await pg.query("SELECT set_config('TimeZone',$1,false)", ['ABC3abc4,M3.2.0,M11.1.0'])
      for (const index of [0, 1]) {
        const result = (
          await pg.query<{ v: boolean; wire: string }>(
            `SELECT (${expressions[index]}) v,encode(timestamptz_send(instant),'hex') wire FROM(SELECT $1::timestamptz instant)s`,
            [v],
          )
        ).rows[0]!
        expect(result.v).toBe(true)
        fixtures.push({
          name: names[index]!,
          row: { instant: known(Buffer.from(result.wire, 'hex').readBigInt64BE()) },
          expected: { kind: 'True' },
        })
      }
    }
    await pg.exec("SET TimeZone='UTC'")
    const base: Row = {
      v: known(0n),
      stamp: known(9223372036854775807n),
      instant: known(-9223372036854775808n),
      expected_instant: known(9223372036854775807n),
      expected_stamp: known(-9223372036854775808n),
    }
    for (const name of ['attach', 'project']) {
      const operand = name === 'attach' ? 'stamp' : 'instant',
        expectedField = name === 'attach' ? 'expected_instant' : 'expected_stamp'
      fixtures.push({ name, row: base, expected: { kind: 'True' } })
      fixtures.push({
        name,
        row: { ...base, [operand]: known(null), [expectedField]: known(null) },
        expected: { kind: 'True' },
      })
      fixtures.push({
        name,
        row: { ...base, v: known(null), [expectedField]: known(null) },
        expected: { kind: 'True' },
      })
      fixtures.push({ name, row: { ...base, [operand]: known(0n) }, expected: { kind: 'Unknown' } })
      fixtures.push({
        name,
        row: { ...base, v: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({
        name,
        row: { ...base, v: { kind: 'Error', value: { state: parseInt('22012', 36) } } },
        expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      })
      const sql =
        name === 'attach'
          ? "SELECT timezone((timestamp '2000-01-01')::text,timestamp 'infinity')=timestamptz 'infinity' v"
          : "SELECT timezone((timestamp '2000-01-01')::text,timestamptz '-infinity')=timestamp '-infinity' v"
      expect((await pg.query<{ v: boolean }>(sql)).rows[0]!.v).toBe(true)
    }
    await pg.exec(
      "SET TimeZone='-167.999';CREATE TABLE rescue_input(v timestamp);INSERT INTO rescue_input VALUES((('4714-11-24 00:00:00+00 BC'::timestamptz)::date)::timestamp);SET TimeZone='<UTC>167:59:60'",
    )
    const rescued = (
        await pg.query<{ source: string; result: string }>(
          "SELECT encode(timestamp_send(v),'hex') source,encode(timestamptz_send(timezone('UTC',v)),'hex') result FROM rescue_input",
        )
      ).rows[0]!,
      sourceBits = Buffer.from(rescued.source, 'hex').readBigInt64BE(),
      resultBits = Buffer.from(rescued.result, 'hex').readBigInt64BE()
    expect(sourceBits).toBe(-211814092800000000n)
    expect(resultBits).toBe(-211813488000000000n)
    await expect(
      pg.query("SELECT timezone('+167:59:60',v) FROM rescue_input"),
    ).rejects.toMatchObject({ code: '22008' })
    fixtures.push({
      name: 'rescue',
      row: { v: known(sourceBits), expected_instant: known(resultBits) },
      expected: { kind: 'True' },
    })
    fixtures.push({
      name: 'full_zone_error',
      row: { v: known(sourceBits), expected_instant: known(resultBits) },
      expected: { kind: 'Error', value: { state: parseInt('22008', 36) } },
    })
    await runCheckParity(root, 'timezone_facets', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
})
