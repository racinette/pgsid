import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { isTemporalInstantPeriod } from '../../src/sql-semantics/temporal-casts.js'
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
import { selectCheckFunctions } from './check-function-selection.js'

const available = builtinCallables().filter(
  (fn): fn is FunctionMetadata => fn.kind === 'function' && isTemporalInstantPeriod(fn),
)
const { functions, scope } = selectCheckFunctions(
  available,
  process.env['PGSID_CHECK_INSTANT_PERIOD_FUNCTIONS'],
)
const basePacket = 'artifacts/goal-checks/instant-period-active'
const packet =
  scope.kind === 'all-functions'
    ? basePacket
    : basePacket + '/scoped/' + functions.map((f) => f.rustName).join('+')
const profiles = [
  'UTC',
  'America/New_York',
  'Australia/Lord_Howe',
  'Europe/Dublin',
  'Europe/Moscow',
  'Pacific/Guam',
  '167.999',
  '-167.999',
  'abc3bcd2,m3.2.0,m11.1.0',
  undefined,
]
const epoch = '2000-01-01 00:00+00',
  minimum = '4714-11-24 00:00+00 BC',
  maximum = '294276-12-31 23:59:59.999999+00'
const rounded = "raw:(timestamptz '294276-12-31 23:59:59.999999+00')::timestamptz(0)"
const offsets = [
  '0',
  '1 microsecond',
  '-1 microsecond',
  '24 hours',
  '-24 hours',
  '1 day',
  '-1 day',
  '1 month',
  '-1 month',
  '1 month -30 days',
  '1 month -31 days',
  '-1 month 30 days',
  '1 month 1 day',
  'infinity',
  '-infinity',
  '2147483647 months',
  '-2147483648 months',
  '2147483647 days',
  '-2147483648 days',
  '9223372036854.775807 seconds',
  '-9223372036854.775808 seconds',
  '2147483647 months -2147483648 days',
  '2147483647 days -9223372036854.775808 seconds',
  null,
]
type Case = {
  label: string
  kind: 'range' | 'overlap'
  a: string | null
  b: string | null
  c: string | null
  d: string | null
  s1: string | null
  s2: string | null
}
const cases: Case[] = offsets.map((s1, i) => ({
  label: 'offset_' + i,
  kind: 'range',
  a: epoch,
  b: epoch,
  c: null,
  d: null,
  s1,
  s2: null,
}))
for (const [label, a, b] of [
  ['month_end', '2000-02-29 12:00+00', '2000-01-31 12:00+00'],
  ['gap', '2024-03-10 11:30+00', '2024-03-09 12:00+00'],
  ['fold', '2024-11-03 12:30+00', '2024-11-02 12:00+00'],
  ['value_positive', 'infinity', epoch],
  ['value_negative', '-infinity', epoch],
  ['base_positive', epoch, 'infinity'],
  ['base_negative', epoch, '-infinity'],
  ['both_positive', 'infinity', 'infinity'],
  ['both_negative', '-infinity', '-infinity'],
  ['lower', minimum, minimum],
  ['upper', maximum, maximum],
  ['rounded', rounded, rounded],
  ['null_value', null, epoch],
  ['null_base', epoch, null],
] as const)
  for (const s1 of [
    '0',
    '1 day',
    '1 month',
    'infinity',
    '2147483647 days -9223372036854.775808 seconds',
  ])
    cases.push({ label, kind: 'range', a, b, c: null, d: null, s1, s2: null })
for (const [i, s1] of offsets.entries())
  cases.push({
    label: 'duration_' + i,
    kind: 'overlap',
    a: '2000-01-31 12:00+00',
    b: '2000-02-29 12:00+00',
    c: '2000-02-01 12:00+00',
    d: '2000-03-01 12:00+00',
    s1,
    s2: s1,
  })
for (const [label, a, b, c, d, s1, s2] of [
  [
    'gap',
    '2024-03-09 12:00+00',
    '2024-03-10 12:00+00',
    '2024-03-10 11:15+00',
    '2024-03-10 11:45+00',
    '1 day',
    '30 minutes',
  ],
  [
    'fold',
    '2024-11-02 12:00+00',
    '2024-11-03 12:00+00',
    '2024-11-03 12:15+00',
    '2024-11-03 12:45+00',
    '1 day',
    '30 minutes',
  ],
  [
    'history',
    '1880-07-01 12:00+00',
    '1880-08-01 12:00+00',
    '1880-07-31 11:59+00',
    '1880-07-31 12:01+00',
    '1 month',
    '2 minutes',
  ],
  ['points', epoch, epoch, epoch, epoch, '0', '0'],
  ['touching', epoch, '2000-01-02+00', '2000-01-02+00', '2000-01-03+00', '1 day', '1 day'],
  ['reversed', '2000-01-02+00', epoch, '2000-01-03+00', '2000-01-01+00', '-1 day', '-2 days'],
  ['null_first', null, null, epoch, '2000-01-02+00', '1 month', '1 day'],
  ['null_second', epoch, '2000-01-02+00', null, null, '1 month', '1 day'],
  ['null_starts', null, epoch, null, '2000-01-02+00', 'infinity', '-infinity'],
  ['null_ends', epoch, null, '2000-01-01 12:00+00', null, '1 day', '1 day'],
  ['null_durations', epoch, '2000-01-02+00', '2000-01-01 12:00+00', '2000-01-03+00', null, null],
  ['positive_inf', 'infinity', 'infinity', epoch, 'infinity', '1 month', 'infinity'],
  ['opposite_inf', 'infinity', '-infinity', '-infinity', 'infinity', '-infinity', 'infinity'],
  ['null_with_error', null, null, 'infinity', null, '0', '-infinity'],
  ['first_error', 'infinity', 'infinity', null, null, '-infinity', '0'],
  ['unknown_with_error', epoch, epoch, 'infinity', 'infinity', '1 month', '-infinity'],
  ['minimum', minimum, minimum, epoch, epoch, '-1 day', '0'],
  ['maximum', maximum, maximum, epoch, epoch, '1 microsecond', '0'],
  ['rounded', rounded, maximum, epoch, epoch, '0', '0'],
] as const)
  cases.push({ label, kind: 'overlap', a, b, c, d, s1, s2 })
const sql = (v: string | null, type: string) =>
  v === null ? `NULL::${type}` : v.startsWith('raw:') ? v.slice(4) : `'${v}'::${type}`
const setup = `SET TimeZone='UTC';SET IntervalStyle='postgres';CREATE DOMAIN period_decision AS boolean;
 CREATE TABLE period_inputs(id serial,label text,kind text,a timestamptz,b timestamptz,c timestamptz,d timestamptz,s1 interval,s2 interval);
 INSERT INTO period_inputs(label,kind,a,b,c,d,s1,s2) VALUES ${cases.map((row) => `('${row.label}','${row.kind}',${[row.a, row.b, row.c, row.d].map((v) => sql(v, 'timestamptz')).join(',')},${sql(row.s1, 'interval')},${sql(row.s2, 'interval')})`).join(',')};`
const fields = (fn: FunctionMetadata) =>
  fn.name === 'in_range'
    ? ['a', 'b', 's1', 'backward', 'less']
    : [
        'a',
        fn.args[1] === 'pg_catalog."interval"' ? 's1' : 'b',
        'c',
        fn.args[3] === 'pg_catalog."interval"' ? 's2' : 'd',
      ]
const forms = functions.flatMap((fn) => {
  const args = fields(fn),
    call = `pg_catalog."${fn.name}"(${args.join(',')})`
  return [
    { name: fn.rustName + '_direct', sql: call, fn },
    { name: fn.rustName + '_array', sql: `(ARRAY[(${call})::period_decision,NULL])[1]`, fn },
    ...(fn.name === 'overlaps'
      ? [
          {
            name: fn.rustName + '_syntax',
            sql: `(${args[0]},${args[1]}) OVERLAPS (${args[2]},${args[3]})`,
            fn,
          },
        ]
      : []),
  ]
})
type Span = { time: bigint; days: number; months: number }
const special = (span: Span) =>
  span.months === 2147483647 && span.days === 2147483647 && span.time === 9223372036854775807n
    ? 1
    : span.months === -2147483648 &&
        span.days === -2147483648 &&
        span.time === -9223372036854775808n
      ? -1
      : 0
const infinity = (time: bigint | null) =>
  time === -9223372036854775808n || time === 9223372036854775807n
const calendar = (span: Span) => special(span) === 0 && (span.months !== 0 || span.days !== 0)
const total = (span: Span) =>
  (BigInt(span.months) * 30n + BigInt(span.days)) * 86400000000n + span.time
const known = (value: bigint | number | boolean | Span | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
const check = (sql: string) =>
  `CASE WHEN bypass THEN true ELSE (${sql}) IS NOT DISTINCT FROM expected END`

it('matches instant range and duration-overlap functions and syntax with ordered calendar arithmetic, interval sign, infinities, non-strict NULLs and missing timezone', async () => {
  let pg = await PGlite.create()
  const root = await mkdtemp('/tmp/pgsid-instant-periods-'),
    names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = [],
    usedInputs = new Set<number>()
  try {
    expect(available).toHaveLength(4)
    await pg.exec(setup)
    const columns =
      'a timestamptz,b timestamptz,c timestamptz,d timestamptz,s1 interval,s2 interval,backward boolean,less boolean,expected boolean,bypass boolean'
    await pg.exec(
      `CREATE TABLE period_checks(${columns},${forms.map((form) => `CONSTRAINT "${form.name}" CHECK(${check(form.sql)})`).join(',')});`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'period_checks')!
    const inputs = (
      await pg.query<{
        id: number
        label: string
        kind: string
        a: string | null
        b: string | null
        c: string | null
        d: string | null
        s1: string | null
        s2: string | null
      }>(
        "SELECT id,label,kind,encode(timestamptz_send(a),'hex') a,encode(timestamptz_send(b),'hex') b,encode(timestamptz_send(c),'hex') c,encode(timestamptz_send(d),'hex') d,encode(interval_send(s1),'hex') s1,encode(interval_send(s2),'hex') s2 FROM period_inputs ORDER BY id",
      )
    ).rows.map((row) => {
      const time = (s: string | null) =>
          s === null ? null : Buffer.from(s, 'hex').readBigInt64BE(),
        span = (s: string | null): Span | null =>
          s === null
            ? null
            : {
                time: Buffer.from(s, 'hex').readBigInt64BE(),
                days: Buffer.from(s, 'hex').readInt32BE(8),
                months: Buffer.from(s, 'hex').readInt32BE(12),
              }
      return {
        ...row,
        a: time(row.a),
        b: time(row.b),
        c: time(row.c),
        d: time(row.d),
        s1: span(row.s1),
        s2: span(row.s2),
      }
    })
    expect(inputs).toHaveLength(cases.length)
    const groups = profiles.map((timeZone, index) =>
      prepareCheckRustGroup(
        forms.flatMap((form) =>
          (['source', 'stored'] as const).map((origin) => {
            const name = `p${index}_${form.name}_${origin}`
            names.push(name)
            const expression = lowerTableCheck(
              table,
              table.constraints.find((c) => c.name === form.name)!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? `CHECK(${check(form.sql)})` : undefined,
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
        { timeZone },
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
    for (const [index, timeZone] of profiles.entries()) {
      if (index > 0) {
        await pg.close()
        pg = await PGlite.create()
        await pg.exec(setup)
      }
      for (const form of forms)
        await pg.exec(`CREATE TABLE oracle_${form.name}(${columns},CHECK(${check(form.sql)}));`)
      await pg.query("SELECT set_config('TimeZone',$1,false)", [timeZone ?? 'UTC'])
      const selected = inputs.filter(
        (input) =>
          index < 2 ||
          index === profiles.length - 1 ||
          input.label.startsWith('offset_') ||
          input.label.startsWith('duration_') ||
          [
            'gap',
            'fold',
            'history',
            'null_with_error',
            'unknown_with_error',
            'minimum',
            'maximum',
            'rounded',
          ].includes(input.label),
      )
      for (const input of selected) {
        const endpointErrors: [string | undefined, string | undefined] = [undefined, undefined]
        if (input.kind === 'overlap')
          for (const [end, start, duration] of [
            [0, 'a', 's1'],
            [1, 'c', 's2'],
          ] as const) {
            try {
              await pg.query(
                `SELECT encode(timestamptz_send(${start}+${duration}),'hex') FROM period_inputs WHERE id=$1`,
                [input.id],
              )
            } catch (e) {
              expect((e as { code: string }).code).toBe('22008')
              endpointErrors[end] = '22008'
            }
          }
        for (const form of forms) {
          if ((form.fn.name === 'in_range') !== (input.kind === 'range')) continue
          const flags: [boolean | null, boolean | null][] =
            input.kind === 'range'
              ? [
                  [false, false],
                  [false, true],
                  [true, false],
                  [true, true],
                  ...(['offset_0', 'offset_2', 'base_positive'].includes(input.label)
                    ? ([
                        [null, false],
                        [false, null],
                        [null, null],
                      ] as [null | boolean, null | boolean][])
                    : []),
                ]
              : [[false, false]]
          for (const [backward, less] of flags) {
            let output: boolean | null = null,
              sqlError: Outcome | undefined
            try {
              output = (
                await pg.query<{ value: boolean | null }>(
                  `SELECT (${form.sql}) value FROM(SELECT *,$1::boolean backward,$2::boolean less FROM period_inputs WHERE id=$3)q`,
                  [backward, less, input.id],
                )
              ).rows[0]!.value
            } catch (e) {
              const code = (e as { code: string }).code
              expect(['22008', '22013', '22015']).toContain(code)
              sqlError = error(code)
            }
            let defer = false
            if (timeZone === undefined) {
              if (
                input.kind === 'range' &&
                input.a !== null &&
                input.b !== null &&
                input.s1 !== null &&
                backward !== null &&
                less !== null
              ) {
                const span = input.s1,
                  negationError =
                    backward &&
                    (span.months === -2147483648 ||
                      span.days === -2147483648 ||
                      span.time === -9223372036854775808n)
                defer = total(span) >= 0n && calendar(span) && !infinity(input.b) && !negationError
              } else if (input.kind === 'overlap') {
                const dependencies = form.fn.args.flatMap((type, i) =>
                    type === 'pg_catalog."interval"' ? [i === 1 ? 0 : 1] : [],
                  ),
                  unknown = dependencies.map((end) => {
                    const start = end === 0 ? input.a : input.c,
                      span = end === 0 ? input.s1 : input.s2
                    return start !== null && span !== null && !infinity(start) && calendar(span)
                  }),
                  knownError = dependencies.some(
                    (end, i) => !unknown[i] && endpointErrors[end] !== undefined,
                  )
                defer = !knownError && unknown.some(Boolean)
              }
            }
            for (const target of [output, output === true ? false : true]) {
              const reference: Outcome = sqlError ?? { kind: output === target ? 'True' : 'False' }
              let code: string | undefined
              try {
                await pg.query(
                  `INSERT INTO oracle_${form.name} SELECT a,b,c,d,s1,s2,$1::boolean,$2::boolean,$3::boolean,false FROM period_inputs WHERE id=$4`,
                  [backward, less, target, input.id],
                )
              } catch (e) {
                code = (e as { code: string }).code
              }
              expect(code, `${index}/${input.id}/${form.name}/${backward}/${less}`).toBe(
                reference.kind === 'Error'
                  ? reference.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : reference.kind === 'False'
                    ? '23514'
                    : undefined,
              )
              const expected: Outcome = defer ? { kind: 'Unknown' } : reference
              usedInputs.add(input.id)
              native.push({
                profile: index,
                input: input.id,
                label: input.label,
                form: form.name,
                backward,
                less,
                target,
                reference,
                expected,
                databaseSqlstate: code,
              })
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: `p${index}_${form.name}_${origin}`,
                  row: {
                    a: known(input.a),
                    b: known(input.b),
                    c: known(input.c),
                    d: known(input.d),
                    s1: known(input.s1),
                    s2: known(input.s2),
                    backward: known(backward),
                    less: known(less),
                    expected: known(target),
                    bypass: known(false),
                  },
                  expected,
                })
            }
          }
        }
      }
      for (const form of forms)
        for (const origin of ['source', 'stored']) {
          const name = `p${index}_${form.name}_${origin}`,
            base: Row = {
              a: known(0n),
              b: known(0n),
              c: known(0n),
              d: known(0n),
              s1: known({ months: 0, days: 0, time: 0n }),
              s2: known({ months: 0, days: 0, time: 0n }),
              backward: known(false),
              less: known(false),
              expected: known(true),
              bypass: known(false),
            },
            args = fields(form.fn)
          for (const field of args)
            for (const state of [{ kind: 'Unknown' } as Input, error('22012') as Input])
              fixtures.push({ name, row: { ...base, [field]: state }, expected: state as Outcome })
          fixtures.push({
            name,
            row: {
              ...base,
              [args[0]!]: error('22003') as Input,
              [args.at(-1)!]: error('22012') as Input,
            },
            expected: error('22003'),
          })
          fixtures.push({
            name,
            row: { ...base, [args[0]!]: error('22003') as Input, bypass: known(true) },
            expected: { kind: 'True' },
          })
        }
    }
    await mkdir(packet, { recursive: true })
    await writeFile(packet + '/native.json', JSON.stringify(native, null, 2) + '\n')
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          scope,
          functions: functions.length,
          checks: names.length,
          fixtures: fixtures.length,
          inserts: native.length,
          profiles: profiles.length,
          inputs: usedInputs.size,
          availableInputs: inputs.length,
        },
        null,
        2,
      ) + '\n',
    )
    await runCheckParity(root, 'instant_periods', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)
