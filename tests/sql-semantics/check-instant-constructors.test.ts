import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'

const packet = 'artifacts/goal-checks/instant-constructor-active'
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
  full?: boolean
  lmt?: boolean
}[] = [
  { session: 'UTC', context: common, full: true },
  {
    session: 'America/New_York',
    context: { ...common, timeZone: 'America/New_York' },
    full: true,
    lmt: true,
  },
  ...[
    'Australia/Lord_Howe',
    'Europe/Dublin',
    'Europe/Moscow',
    'Pacific/Guam',
    ':America/New_York',
  ].map((session) => ({ session, context: { ...common, timeZone: session }, lmt: true })),
  ...['167.999', '-167.999', 'abc3bcd2,m3.2.0,m11.1.0'].map((session) => ({
    session,
    context: { ...common, timeZone: session },
  })),
  { session: 'UTC', context: { ...common, timeZone: undefined } },
  { session: 'UTC', context: { ...common, timeZoneAbbreviations: undefined } },
  { session: 'UTC', context: { ...common, maxIdentifierBytes: undefined } },
  { session: 'UTC', context: { ...common, serverEncoding: undefined } },
]
type Calendar = readonly [
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  string | null,
]
const calendars: Calendar[] = [
  [2000, 2, 29, 12, 34, '56.123456'],
  [2021, 3, 14, 2, 30, '0'],
  [2021, 11, 7, 1, 30, '0'],
  [1880, 7, 1, 12, 34, '56.789012'],
  [2040, 7, 1, 12, 34, '56'],
  ...[
    '0',
    '-0',
    '0.0000004',
    '0.0000005',
    '0.0000005000000000000001',
    '0.0000015',
    '-0.0000004',
    '-0.0000005',
    '-0.0000006',
    '59.9999994',
    '59.9999995',
    '60',
    '60.0000004',
    '60.0000005',
    '60.0000006',
    'NaN',
    'Infinity',
    '-Infinity',
  ].map((s) => [2000, 1, 1, 0, 0, s] as const),
  [2000, 1, 1, 23, 59, '60'],
  [2000, 1, 1, 24, 0, '-0.0000004'],
  [2000, 1, 1, 24, 0, '0.0000004'],
  [2000, 1, 1, 24, 1, '0'],
  [2000, 1, 1, -1, 0, '0'],
  [2000, 1, 1, 0, 60, '0'],
  [-1, 2, 29, 0, 0, '0'],
  [-4, 2, 29, 0, 0, '0'],
  [-5, 2, 29, 0, 0, '0'],
  [1900, 2, 29, 0, 0, '0'],
  [2001, 2, 29, 0, 0, '0'],
  [2000, 2, 30, 0, 0, '0'],
  [2000, 13, 1, 0, 0, '0'],
  [2000, 0, 1, 0, 0, '0'],
  [2000, 1, 0, 0, 0, '0'],
  [2000, 1, 32, 0, 0, '0'],
  [0, 1, 1, 0, 0, '0'],
  [-2147483648, 1, 1, 0, 0, '0'],
  [2147483647, 1, 1, 0, 0, '0'],
  [-4714, 11, 23, 24, 0, '0'],
  [-4714, 11, 23, 23, 59, '60'],
  [-4714, 11, 23, 23, 59, '59.9999994'],
  [-4714, 11, 24, 0, 0, '0'],
  [-4714, 10, 31, 24, 0, '0'],
  [-4715, 12, 31, 24, 0, '0'],
  [294276, 12, 31, 23, 59, '59.9999994'],
  [294276, 12, 31, 23, 59, '59.9999995'],
  [294277, 1, 1, 0, 0, '0'],
  [5874897, 12, 31, 0, 0, '0'],
  [5874898, 1, 1, 0, 0, '0'],
  [null, 13, 1, 0, 0, '0'],
  [2000, null, 1, 0, 0, '0'],
  [2000, 1, null, 0, 0, '0'],
  [2000, 1, 1, null, 0, '0'],
  [2000, 1, 1, 0, null, '0'],
  [0, 1, 1, 0, 0, null],
]
const pairs: readonly [string | null, string | null][] = [
  ['2000-01-01', '00:00'],
  ['2000-01-01', '24:00'],
  ['2021-03-14', '02:30'],
  ['2021-11-07', '01:30'],
  ['1880-07-01', '12:34:56.789012'],
  ['4714-11-24 BC', '00:00'],
  ['294276-12-31', '23:59:59.999999'],
  ['294276-12-31', '24:00'],
  ['294277-01-01', '00:00'],
  ['5874897-12-31', '00:00'],
  ['infinity', '24:00'],
  ['-infinity', '00:00'],
  ['infinity', null],
  [null, '00:00'],
  ['2000-01-01', null],
]
const zones: (string | null)[] = [
  'UTC',
  'America/New_York',
  'MSK',
  'LMT',
  '+02',
  '-02',
  'UTC+02',
  ':America/New_York',
  '',
  null,
]
const grammar = [
  '+',
  '-',
  '++2',
  '-+2',
  '+-0',
  '-+0',
  '+1:',
  '-1::',
  '+:',
  '-::',
  '+01:02:03',
  '-15:59:59',
  '+1:2',
  '+0001',
  '+ 01',
  '+\t01',
  '+1:+2:-0',
  '+1:-2',
  '+-1',
  '--1',
  '+1599',
  '+1600',
  '+16abc',
  '16',
  '+2147483648',
  '+1:2147483648',
  '+1:0:2147483648',
  '+000001',
  '<éab>-02',
  ':UTC',
  '+2junk',
  '+1:2:3junk',
  '+1.2',
  ' +02',
  'UTC' + ' '.repeat(300),
  '+' + '0'.repeat(300),
  '+' + '9'.repeat(300),
]
const unresolvedGrammar = new Set(['+2junk', '+1:2:3junk', '+1.2', 'UTC' + ' '.repeat(300)])
const role = (value: string | null, type: string) =>
  value === null ? `NULL::${type}` : `'${value}'::${type}`
const num = (n: number | null) => (n === null ? 'NULL' : String(n))
const setup = `SET TimeZone='UTC';CREATE DOMAIN constructor_local AS timestamp;CREATE DOMAIN constructor_instant AS timestamptz;CREATE TYPE constructor_record AS(instant timestamptz,stamp timestamp);CREATE COLLATION constructor_other(provider=icu,locale='und',deterministic=false);
  CREATE TABLE constructor_inputs(id serial,kind text,y integer,m integer,d integer,h integer,n integer,s float8,date_value date,clock_value time,stamp timestamp);
  INSERT INTO constructor_inputs(kind,y,m,d,h,n,s,date_value,clock_value,stamp) VALUES ${calendars
    .map(
      (c) =>
        `('calendar',${c
          .slice(0, 5)
          .map((n) => num(n as number | null))
          .join(
            ',',
          )},${role(c[5], 'float8')},date '2000-01-01',time '00:00',timestamp '2000-01-01')`,
    )
    .join(',')};
  INSERT INTO constructor_inputs(kind,y,m,d,h,n,s,date_value,clock_value,stamp) VALUES ${pairs.map(([d, c]) => `('pair',2000,1,1,0,0,0,${role(d, 'date')},${role(c, 'time')},timestamp '2000-01-01')`).join(',')};
  SET TimeZone='-24';INSERT INTO constructor_inputs(kind,y,m,d,h,n,s,date_value,clock_value,stamp) VALUES('pair',2000,1,1,0,0,0,timestamptz '4714-11-24 00:00+00 BC'::date,time '24:00',timestamp '2000-01-01');
  SET TimeZone='-167.999';INSERT INTO constructor_inputs(kind,y,m,d,h,n,s,date_value,clock_value,stamp) VALUES('pair',2000,1,1,0,0,0,timestamptz '4714-11-24 00:00+00 BC'::date,time '24:00',timestamp '2000-01-01');SET TimeZone='UTC';`
const values = 'y,m,d,h,n,s'
const forms = {
  local: { kind: 'local', sql: `encode(timestamp_send(make_timestamp(${values})),'hex')` },
  local_array: {
    kind: 'local',
    sql: `encode(timestamp_send((ARRAY[make_timestamp(${values})::constructor_local,NULL])[1]),'hex')`,
  },
  implicit: {
    kind: 'implicit',
    sql: `encode(timestamptz_send(make_timestamptz(${values})),'hex')`,
  },
  implicit_array: {
    kind: 'implicit',
    sql: `encode(timestamptz_send((ARRAY[make_timestamptz(${values})::constructor_instant,NULL])[1]),'hex')`,
  },
  explicit: {
    kind: 'explicit',
    sql: `encode(timestamptz_send(make_timestamptz(${values},zone_name)),'hex')`,
  },
  explicit_record: {
    kind: 'explicit',
    sql: `encode(timestamptz_send((ROW(make_timestamptz(${values},zone_name),NULL::timestamp)::constructor_record).instant),'hex')`,
  },
  pair: {
    kind: 'pair',
    sql: "encode(timestamptz_send(pg_catalog.timestamptz(date_value,clock_value)),'hex')",
  },
  pair_array: {
    kind: 'pair',
    sql: "encode(timestamptz_send((ARRAY[pg_catalog.timestamptz(date_value,clock_value),NULL::timestamptz])[1]),'hex')",
  },
  facet: {
    kind: 'facet',
    sql: `encode(timestamptz_send(make_timestamptz(${values},stamp::text)),'hex')`,
  },
} as const
const selectedForms = (index: number) =>
  Object.entries(forms).filter(([name]) => index === 0 || name !== 'facet')
const known = (value: number | bigint | string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
const check = (sql: string) =>
  `CASE WHEN bypass THEN true ELSE (${sql}) COLLATE "C" IS NOT DISTINCT FROM expected END`

it('matches native local and instant constructors with numeric timezone grammar, ordered validation, calendar carry, SQL-coerced date pairs and missing context', async () => {
  let pg = await PGlite.create()
  const root = await mkdtemp('/tmp/pgsid-instant-constructors-'),
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  try {
    await pg.exec(setup)
    const columns =
      'y integer,m integer,d integer,h integer,n integer,s float8,date_value date,clock_value time,stamp timestamp,zone_name text COLLATE constructor_other,expected text COLLATE "C",bypass boolean'
    await pg.exec(
      `CREATE TABLE constructor_checks(${columns},${Object.entries(forms)
        .map(([name, { sql }]) => `CONSTRAINT "${name}" CHECK(${check(sql)})`)
        .join(',')});`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'constructor_checks')!,
      inputs = (
        await pg.query<{
          id: number
          kind: string
          y: number | null
          m: number | null
          d: number | null
          h: number | null
          n: number | null
          s: string | null
          date_value: string | null
          clock_value: string | null
        }>(
          "SELECT id,kind,y,m,d,h,n,encode(float8send(s),'hex') s,encode(date_send(date_value),'hex') date_value,encode(time_send(clock_value),'hex') clock_value FROM constructor_inputs ORDER BY id",
        )
      ).rows.map((input) => ({
        ...input,
        s: input.s === null ? null : Buffer.from(input.s, 'hex').readBigInt64BE(),
        date_value:
          input.date_value === null ? null : Buffer.from(input.date_value, 'hex').readInt32BE(),
        clock_value:
          input.clock_value === null
            ? null
            : Buffer.from(input.clock_value, 'hex').readBigInt64BE(),
      }))
    expect(inputs).toHaveLength(calendars.length + pairs.length + 2)
    expect(inputs.at(-2)!.date_value).toBe(-2451546)
    expect(inputs.at(-1)!.date_value).toBe(-2451552)
    const groups = profiles.map((profile, index) =>
      prepareCheckRustGroup(
        selectedForms(index).flatMap(([operation, { sql }]) =>
          (['source', 'stored'] as const).map((origin) => {
            const name = `p${index}_${operation}_${origin}`
            names.push(name)
            const expression = lowerTableCheck(
              table,
              table.constraints.find((c) => c.name === operation)!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${check(sql)})` : undefined,
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
        profile.context,
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
    group.checks.forEach((c, i) => expect(c.kind, names[i]).toBe('supported'))
    for (const [index, profile] of profiles.entries()) {
      if (index > 0) {
        await pg.close()
        pg = await PGlite.create()
        await pg.exec(setup)
      }
      for (const [operation, { sql }] of selectedForms(index))
        await pg.exec(`CREATE TABLE oracle_${operation}(${columns},CHECK(${check(sql)}));`)
      await pg.query("SELECT set_config('TimeZone',$1,false)", [profile.session])
      const selected = inputs.filter(
        (input) =>
          input.kind === 'pair' ||
          profile.full ||
          [1, 2, 3, 4, 5, 23, 30, 40, 43, 46, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58].includes(
            input.id,
          ),
      )
      for (const input of selected) {
        let localError = false,
          pairError = false
        try {
          await pg.query(
            "SELECT encode(timestamp_send(make_timestamp(y,m,d,h,n,s)),'hex') FROM constructor_inputs WHERE id=$1",
            [input.id],
          )
        } catch (e) {
          expect((e as { code: string }).code).toBe('22008')
          localError = true
        }
        try {
          await pg.query(
            "SELECT encode(timestamp_send(date_value+clock_value),'hex') FROM constructor_inputs WHERE id=$1",
            [input.id],
          )
        } catch (e) {
          expect((e as { code: string }).code).toBe('22008')
          pairError = true
        }
        for (const [operation, { kind, sql }] of selectedForms(index)) {
          if ((kind === 'pair') !== (input.kind === 'pair')) continue
          const selectedZones: (string | null)[] =
            kind === 'explicit'
              ? [
                  ...zones,
                  ...(index === 0 && input.id === 1 ? grammar : []),
                  ...(index >= 10 && input.id === 1 ? ['16', '+16abc'] : []),
                  ...(profile.context.serverEncoding === undefined ? ['<éab>-02'] : []),
                ]
              : [null]
          for (const zone of selectedZones) {
            let output: string | null = null,
              sqlError: Outcome | undefined
            try {
              output = (
                await pg.query<{ value: string | null }>(
                  `SELECT (${sql}) value FROM(SELECT *,$1::text COLLATE constructor_other zone_name FROM constructor_inputs WHERE id=$2)q`,
                  [zone, input.id],
                )
              ).rows[0]!.value
            } catch (e) {
              const code = (e as { code: string }).code
              expect(['22008', '22023']).toContain(code)
              sqlError = error(code)
            }
            const nullCalendar = [input.y, input.m, input.d, input.h, input.n, input.s].some(
                (x) => x === null,
              ),
              nullPair = input.date_value === null || input.clock_value === null,
              pairInfinity = input.date_value === 2147483647 || input.date_value === -2147483648
            let defer = false,
              reason: string | undefined
            if (kind === 'implicit')
              defer = !localError && !nullCalendar && profile.context.timeZone === undefined
            if (kind === 'pair')
              defer =
                !pairError && !nullPair && !pairInfinity && profile.context.timeZone === undefined
            if (kind === 'facet') defer = !localError && !nullCalendar
            if (kind === 'explicit' && !localError && !nullCalendar && zone !== null) {
              const numeric =
                zone[0] === '+' ||
                zone[0] === '-' ||
                (zone[0] !== undefined && zone[0] >= '0' && zone[0] <= '9')
              const missing =
                profile.context.timeZone === undefined ||
                (profile.context.maxIdentifierBytes === undefined && zone !== '') ||
                (profile.context.timeZoneAbbreviations === undefined && zone !== 'UTC')
              if (!numeric && missing) {
                defer = true
                reason = 'lookup-context'
              }
              if (zone === 'LMT' && !profile.lmt) {
                defer = true
                reason = 'uncaptured-zone-definition'
              }
              if (unresolvedGrammar.has(zone)) {
                defer = true
                reason = 'uncaptured-zone-definition'
              }
              if (profile.context.serverEncoding === undefined && zone.includes('é')) {
                defer = true
                reason = 'encoding'
              }
            }
            for (const target of [output, 'wrong']) {
              const reference: Outcome = sqlError ?? { kind: output === target ? 'True' : 'False' }
              let code: string | undefined
              try {
                await pg.query(
                  `INSERT INTO oracle_${operation} SELECT y,m,d,h,n,s,date_value,clock_value,stamp,$1::text,$2::text,false FROM constructor_inputs WHERE id=$3`,
                  [zone, target, input.id],
                )
              } catch (e) {
                code = (e as { code: string }).code
              }
              expect(code, `${index}/${input.id}/${operation}/${zone}`).toBe(
                reference.kind === 'Error'
                  ? reference.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : reference.kind === 'False'
                    ? '23514'
                    : undefined,
              )
              const expected: Outcome = defer ? { kind: 'Unknown' } : reference
              native.push({
                profile: index,
                input: input.id,
                operation,
                zone,
                target,
                reference,
                expected,
                reason,
                databaseSqlstate: code,
              })
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: `p${index}_${operation}_${origin}`,
                  row: {
                    y: known(input.y),
                    m: known(input.m),
                    d: known(input.d),
                    h: known(input.h),
                    n: known(input.n),
                    s: known(input.s),
                    date_value: known(input.date_value),
                    clock_value: known(input.clock_value),
                    stamp: known(0n),
                    zone_name: known(zone),
                    expected: known(target),
                    bypass: known(false),
                  },
                  expected,
                })
            }
          }
        }
      }
      for (const [operation, { kind }] of selectedForms(index))
        for (const origin of ['source', 'stored']) {
          const name = `p${index}_${operation}_${origin}`,
            base: Row = {
              y: known(2000),
              m: known(1),
              d: known(1),
              h: known(0),
              n: known(0),
              s: known(0n),
              date_value: known(0),
              clock_value: known(0n),
              stamp: known(0n),
              zone_name: known('+02'),
              expected: known('wrong'),
              bypass: known(false),
            },
            fields =
              kind === 'pair'
                ? ['date_value', 'clock_value']
                : [
                    'y',
                    'm',
                    'd',
                    'h',
                    'n',
                    's',
                    ...(kind === 'explicit' ? ['zone_name'] : kind === 'facet' ? ['stamp'] : []),
                  ]
          for (const field of fields)
            for (const state of [{ kind: 'Unknown' } as Input, error('22012') as Input])
              fixtures.push({ name, row: { ...base, [field]: state }, expected: state as Outcome })
          fixtures.push({
            name,
            row: {
              ...base,
              [fields[0]!]: error('22003') as Input,
              [fields.at(-1)!]: error('22012') as Input,
            },
            expected: error('22003'),
          })
          fixtures.push({
            name,
            row: { ...base, [fields[0]!]: error('22003') as Input, bypass: known(true) },
            expected: { kind: 'True' },
          })
          if (kind === 'facet')
            fixtures.push({
              name,
              row: { ...base, y: known(null), expected: known(null) },
              expected: { kind: 'True' },
            })
          if (kind === 'explicit' || kind === 'facet')
            fixtures.push({
              name,
              row: {
                ...base,
                y: known(0),
                [kind === 'explicit' ? 'zone_name' : 'stamp']: error('22012') as Input,
              },
              expected: error('22012'),
            })
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
          calendars: calendars.length,
          dateClockPairs: pairs.length + 2,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'instant_constructors', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)
