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
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'

const packet = 'artifacts/goal-checks/timetz-zone-active'
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
  deferred: (zone: string) => boolean
}[] = [
  {
    session: 'UTC',
    context: common,
    zones: [
      'UTC',
      'GMT',
      'Etc/UTC',
      'EST',
      'EDT',
      'PST',
      'MSD',
      'MSK',
      'America/New_York',
      'Europe/Moscow',
      '+02',
      'UTC+02',
      'AAA2',
      '+167:59:60',
      '-167:59:60',
      '+168',
      '',
      null,
    ],
    deferred: (z) => ['MSK', 'America/New_York', 'Europe/Moscow'].includes(z),
  },
  {
    session: 'America/New_York',
    context: { ...common, timeZone: 'America/New_York' },
    zones: ['EST', 'EDT', 'LMT', 'America/New_York', 'UTC', 'MSK', null],
    deferred: (z) => ['America/New_York', 'MSK'].includes(z),
  },
  {
    session: 'Europe/Dublin',
    context: { ...common, timeZone: 'Europe/Dublin' },
    zones: ['GMT', 'IST', 'DMT', 'Europe/Dublin', 'UTC', 'MSK', null],
    deferred: (z) => ['IST', 'Europe/Dublin', 'MSK'].includes(z),
  },
  {
    session: 'Europe/Moscow',
    context: { ...common, timeZone: 'Europe/Moscow' },
    zones: ['MSK', 'MSD', 'MMT', 'Europe/Moscow', 'UTC', null],
    deferred: (z) => ['MSK', 'MMT', 'Europe/Moscow'].includes(z),
  },
  {
    session: 'ABC3abc4,M3.2.0,M11.1.0',
    context: { ...common, timeZone: 'ABC3abc4,M3.2.0,M11.1.0' },
    zones: ['ABC', 'abc', 'UTC', 'ABC3abc4,M3.2.0,M11.1.0', null],
    deferred: (z) => z.includes(','),
  },
  {
    session: 'ABC3BC4,M3.2.0,M11.1.0',
    context: { ...common, timeZone: 'ABC3BC4,M3.2.0,M11.1.0' },
    zones: ['ABC', 'BC', 'ABC3BC4,M3.2.0,M11.1.0', null],
    deferred: (z) => z.includes(','),
  },
  {
    session: '<UTC>-02',
    context: { ...common, timeZone: '<UTC>-02' },
    zones: ['UTC', 'utc', 'Etc/UTC', null],
    deferred: () => false,
  },
  {
    session: '<Etc/UTC>-02',
    context: { ...common, timeZone: '<Etc/UTC>-02' },
    zones: ['Etc/UTC', 'etc/utc', 'UTC', null],
    deferred: () => false,
  },
  {
    session: 'UTC',
    context: { ...common, timeZone: undefined },
    zones: ['UTC', 'Etc/UTC', '', null],
    deferred: () => true,
  },
  {
    session: 'UTC',
    context: { ...common, timeZoneAbbreviations: undefined },
    zones: ['UTC', 'Etc/UTC', 'EST', '', null],
    deferred: (z) => z !== 'UTC',
  },
  {
    session: 'UTC',
    context: { ...common, maxIdentifierBytes: undefined },
    zones: ['UTC', 'Etc/UTC', '', null],
    deferred: (z) => z !== '',
  },
  {
    session: 'UTC',
    context: { ...common, serverEncoding: undefined },
    zones: ['UTC', 'Etc/UTC', 'ÉTC/UTC', '', null],
    deferred: (z) => z === 'ÉTC/UTC',
  },
]
const forms = {
  direct: "encode(timetz_send(timezone(zone,v)),'hex')",
  nested: "encode(timetz_send((ARRAY[timezone(zone,v)::clock_zone_domain,NULL])[1]),'hex')",
}
const known = (value: string | bigint | boolean | { time: bigint; zone: number } | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('resolves fixed timetz zones and constant forced histories without a transaction clock, retaining variable-offset requirements and stored widths', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp('/tmp/pgsid-timetz-zone-')
  const names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  try {
    const requirements = []
    for (const [session, zone, dates, seconds] of [
      ['UTC', 'MSK', ['2000-07-01', '2012-07-01'], [10800, 14400]],
      ['Europe/Dublin', 'IST', ['1900-07-01', '2000-07-01'], [2079, 3600]],
      ['Europe/Moscow', 'MMT', ['1900-07-01', '1917-07-01'], [9017, 9079]],
      ['UTC', 'America/New_York', ['2000-01-01', '2000-07-01'], [-18000, -14400]],
      ['Europe/Dublin', 'GMT', ['1900-07-01', '2000-07-01'], [0, 0]],
      ['Europe/Moscow', 'MSD', ['1900-07-01', '2000-07-01'], [14400, 14400]],
    ] as const) {
      await pg.query("SELECT set_config('TimeZone',$1,false)", [session])
      const offsets = []
      for (const date of dates)
        offsets.push(
          Number(
            (
              await pg.query<{ value: string }>(
                "SELECT extract(epoch FROM timezone($1,$2::timestamptz)-timezone('Etc/UTC',$2::timestamptz)) value",
                [zone, date + ' 00:00+00'],
              )
            ).rows[0]!.value,
          ),
        )
      expect(offsets, session + '/' + zone).toEqual(seconds)
      requirements.push({ session, zone, dates, seconds: offsets })
    }
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/requirements.json', JSON.stringify(requirements, null, 2) + '\n')
    const facetSql =
      'CASE WHEN bypass THEN true ELSE timetz_send(timezone(stamp::text,v)) IS NOT DISTINCT FROM timetz_send(expected_clock) END'
    await pg.exec(
      `CREATE TABLE clock_zone_facets(stamp timestamp,v timetz,expected_clock timetz,bypass boolean,CONSTRAINT partial_zone CHECK(${facetSql}))`,
    )
    await pg.exec(`SET TimeZone='UTC';CREATE DOMAIN clock_zone_domain AS timetz;
      CREATE TABLE clock_inputs(id serial, v timetz);
      INSERT INTO clock_inputs(v) VALUES ('00:00+00'),('24:00+00'),('12:34:56.123456+05:30'),('23:59:59.999999-15:59:59'),(NULL),
        (timezone(interval '-2147483648 seconds',timetz '24:00+00')),
        (timezone(interval '2147483647 seconds',timetz '12:34:56.123456+00'));
      CREATE TABLE clock_checks(v timetz,zone text,expected text COLLATE "C",bypass boolean,${Object.entries(
        forms,
      )
        .map(
          ([name, sql]) =>
            `CONSTRAINT ${name} CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
        )
        .join(',')})`)
    for (const [name, sql] of Object.entries(forms))
      await pg.exec(
        `CREATE TABLE clock_oracle_${name}(LIKE clock_checks);ALTER TABLE clock_oracle_${name} ADD CHECK(CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END)`,
      )
    const inputs = (
      await pg.query<{ id: number; wire: string | null }>(
        "SELECT id,encode(timetz_send(v),'hex') wire FROM clock_inputs ORDER BY id",
      )
    ).rows
    expect(inputs).toHaveLength(7)
    expect(Buffer.from(inputs[5]!.wire!, 'hex').readInt32BE(8)).toBe(-2147483648)
    expect(Buffer.from(inputs[6]!.wire!, 'hex').readInt32BE(8)).toBe(-2147483647)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'clock_checks')!
    const groups = profiles.map((profile, index) =>
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
                  table.constraints.find((c) => c.name === operation)!,
                  catalog.enums,
                  catalog.domains,
                  origin,
                  catalog.rangeTypes,
                  catalog.compositeTypeGraph,
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
    )
    const facetTable = catalog.tables.find((t) => t.name === 'clock_zone_facets')!
    groups.push(
      prepareCheckRustGroup(
        (['source', 'stored'] as const).map((origin) => {
          const name = 'facet_' + origin
          names.push(name)
          return {
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: facetTable.name,
              constraint: name,
            },
            expression: portableCheckAtoms(
              lowerTableCheck(
                facetTable,
                facetTable.constraints[0]!,
                catalog.enums,
                catalog.domains,
                origin,
                catalog.rangeTypes,
                catalog.compositeTypeGraph,
                origin === 'source' ? `CHECK(${facetSql})` : undefined,
              )!.expression,
            ),
          }
        }),
        common,
      ),
    )
    const evaluatorSource = groups.map((g) => g.evaluatorSource!).join('\n')
    for (const g of groups) expect(g.evaluatorSource).toContain('sql__pg_catalog__timezone__nsm6(')
    const group = {
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
      await pg.query("SELECT set_config('TimeZone',$1,false)", [profile.session])
      for (const input of inputs)
        for (const zone of profile.zones)
          for (const [operation, sql] of Object.entries(forms)) {
            let output: string | null = null,
              error: Outcome | undefined
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `SELECT (${sql}) value FROM(SELECT v,$1::text zone FROM clock_inputs WHERE id=$2)s`,
                  [zone, input.id],
                )
              ).rows[0]!.value
            } catch (e) {
              const code = (e as { code: string }).code
              expect(code).toMatch(/^[A-Z0-9]{5}$/u)
              error = { kind: 'Error', value: { state: parseInt(code, 36) } }
            }
            const value =
              input.wire === null
                ? null
                : {
                    time: Buffer.from(input.wire, 'hex').readBigInt64BE(),
                    zone: Buffer.from(input.wire, 'hex').readInt32BE(8),
                  }
            for (const expectedText of [output, 'wrong'])
              for (const bypass of [false, true]) {
                const reference: Outcome = bypass
                  ? { kind: 'True' }
                  : (error ?? { kind: output === expectedText ? 'True' : 'False' })
                let code: string | undefined
                try {
                  await pg.query(
                    `INSERT INTO clock_oracle_${operation} SELECT v,$1::text,$2::text,$3::boolean FROM clock_inputs WHERE id=$4`,
                    [zone, expectedText, bypass, input.id],
                  )
                } catch (e) {
                  code = (e as { code: string }).code
                }
                expect(code, `${index}/${input.id}/${zone}/${operation}`).toBe(
                  reference.kind === 'Error'
                    ? reference.value.state.toString(36).toUpperCase().padStart(5, '0')
                    : reference.kind === 'False'
                      ? '23514'
                      : undefined,
                )
                const expected: Outcome =
                  !bypass && value !== null && zone !== null && profile.deferred(zone)
                    ? { kind: 'Unknown' }
                    : reference
                native.push({
                  profile: index,
                  input: input.id,
                  zone,
                  operation,
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
                      zone: known(zone),
                      expected: known(expectedText),
                      bypass: known(bypass),
                    },
                    expected,
                  })
              }
          }
    }
    for (const name of names.filter((name) => name.startsWith('p'))) {
      const base: Row = {
        v: known({ time: 0n, zone: 0 }),
        zone: known('UTC'),
        expected: known('x'),
        bypass: known(false),
      }
      for (const field of ['v', 'zone'])
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
          zone: { kind: 'Error', value: { state: parseInt('22003', 36) } },
        },
        expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      })
    }
    const facetRows: {
      row: Row
      expected: Outcome
      params?: [string | null, string | null, string | null, boolean]
    }[] = [
      {
        row: {
          stamp: known(0n),
          v: known(null),
          expected_clock: known(null),
          bypass: known(false),
        },
        expected: { kind: 'True' },
        params: ['2000-01-01', null, null, false],
      },
      {
        row: {
          stamp: known(null),
          v: known({ time: 0n, zone: 0 }),
          expected_clock: known(null),
          bypass: known(false),
        },
        expected: { kind: 'True' },
        params: [null, '00:00+00', null, false],
      },
      {
        row: {
          stamp: known(0n),
          v: known({ time: 0n, zone: 0 }),
          expected_clock: known(null),
          bypass: known(false),
        },
        expected: { kind: 'Unknown' },
        params: ['2000-01-01', '00:00+00', null, false],
      },
      {
        row: {
          stamp: known(0n),
          v: known({ time: 0n, zone: 0 }),
          expected_clock: known(null),
          bypass: known(true),
        },
        expected: { kind: 'True' },
        params: ['2000-01-01', '00:00+00', null, true],
      },
      {
        row: {
          stamp: known(null),
          v: known(null),
          expected_clock: known({ time: 0n, zone: 0 }),
          bypass: known(false),
        },
        expected: { kind: 'False' },
        params: [null, null, '00:00+00', false],
      },
      {
        row: {
          stamp: known(0n),
          v: { kind: 'Unknown' },
          expected_clock: known(null),
          bypass: known(false),
        },
        expected: { kind: 'Unknown' },
      },
      {
        row: {
          stamp: known(0n),
          v: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          expected_clock: known(null),
          bypass: known(false),
        },
        expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      },
      {
        row: {
          stamp: { kind: 'Error', value: { state: parseInt('22003', 36) } },
          v: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          expected_clock: known(null),
          bypass: known(false),
        },
        expected: { kind: 'Error', value: { state: parseInt('22003', 36) } },
      },
      {
        row: {
          stamp: { kind: 'Unknown' },
          v: known(null),
          expected_clock: known(null),
          bypass: known(false),
        },
        expected: { kind: 'True' },
      },
    ]
    for (const { row, expected, params } of facetRows) {
      for (const origin of ['source', 'stored'])
        fixtures.push({ name: 'facet_' + origin, row, expected })
      if (params) {
        let code: string | undefined
        try {
          await pg.query(
            'INSERT INTO clock_zone_facets VALUES($1::timestamp,$2::timetz,$3::timetz,$4::boolean)',
            params,
          )
        } catch (e) {
          code = (e as { code: string }).code
        }
        expect(code).toBe(
          expected.kind === 'Unknown' ? '22023' : expected.kind === 'False' ? '23514' : undefined,
        )
        native.push({ operation: 'partial_zone', params, expected, databaseSqlstate: code })
      }
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
    await runCheckParity(root, 'timetz_zone', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 300000)
