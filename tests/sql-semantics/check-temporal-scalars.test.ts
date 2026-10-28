import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import {
  prepareCheckRustGroup,
  assembleCheckRust,
} from '../../src/codegen/shared/check-rust-source.js'
import type { CheckExecutionContext } from '../../src/codegen/shared/check-rust-evaluator.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { selectCheckFunctions } from './check-function-selection.js'
const available = builtinCallables().filter(
  (f): f is FunctionMetadata =>
    f.kind === 'function' &&
    ['sql__pg_catalog__date_part__g4hw', 'sql__pg_catalog__to_timestamp__kymq'].includes(
      f.rustName,
    ),
)
const { functions, scope } = selectCheckFunctions(
  available,
  process.env['PGSID_CHECK_TEMPORAL_SCALAR_FUNCTIONS'],
)
const basePacket = 'artifacts/goal-checks/temporal-scalars-active',
  packet =
    scope.kind === 'all-functions'
      ? basePacket
      : basePacket + '/scoped/' + functions.map((f) => f.rustName).join('+')
const profiles: { name: string; context: CheckExecutionContext }[] = [
  { name: 'full', context: { maxIdentifierBytes: 63, serverEncoding: 'UTF8' } },
  { name: 'missing_limit', context: { serverEncoding: 'UTF8' } },
  { name: 'missing_encoding', context: { maxIdentifierBytes: 63 } },
  { name: 'empty_identifier', context: { maxIdentifierBytes: 0, serverEncoding: 'UTF8' } },
  { name: 'short_identifier', context: { maxIdentifierBytes: 4, serverEncoding: 'UTF8' } },
  { name: 'missing_context', context: {} },
]
const forms = functions.flatMap((fn) =>
  fn.name === 'date_part'
    ? [
        {
          name: 'date_direct',
          fn,
          family: 'date',
          call: 'pg_catalog.date_part(unit_name,day_value)',
        },
        {
          name: 'date_contained',
          fn,
          family: 'date',
          call: '(ARRAY[pg_catalog.date_part(unit_name COLLATE public.scalar_other,day_value)::scalar_field,NULL])[1]',
        },
        {
          name: 'date_lost_unit',
          fn,
          family: 'date',
          call: 'pg_catalog.date_part(lost_stamp::text,day_value)',
        },
        {
          name: 'date_null_unit',
          fn,
          family: 'date',
          call: 'pg_catalog.date_part(NULL::text,day_value)',
        },
      ]
    : [
        { name: 'epoch_direct', fn, family: 'epoch', call: 'pg_catalog.to_timestamp(seconds)' },
        {
          name: 'epoch_contained',
          fn,
          family: 'epoch',
          call: '(ARRAY[pg_catalog.to_timestamp(seconds)::scalar_instant,NULL])[1]',
        },
        {
          name: 'epoch_nan',
          fn,
          family: 'epoch',
          call: "pg_catalog.to_timestamp(seconds+'NaN'::float8)",
        },
        {
          name: 'epoch_float4',
          fn,
          family: 'epoch',
          call: 'pg_catalog.to_timestamp(seconds::float4)',
        },
        {
          name: 'epoch_integer',
          fn,
          family: 'epoch',
          call: 'pg_catalog.to_timestamp(seconds::bigint)',
        },
      ],
)
const expression = (call: string, family: string) =>
  `CASE WHEN bypass THEN true ELSE (encode(${family === 'date' ? 'float8send' : 'timestamptz_send'}(${call}),'hex') COLLATE "C") IS NOT DISTINCT FROM expected END`
const known = (value: number | bigint | string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (state: string): Outcome => ({ kind: 'Error', value: { state: parseInt(state, 36) } })
const bits = (value: number) => {
  const b = Buffer.alloc(8)
  b.writeDoubleBE(value)
  return b.readBigInt64BE()
}
const number = (word: bigint) => {
  const b = Buffer.alloc(8)
  b.writeBigInt64BE(word)
  return b.readDoubleBE()
}
const spelling = (value: number) =>
  Number.isNaN(value)
    ? 'NaN'
    : value === Infinity
      ? 'Infinity'
      : value === -Infinity
        ? '-Infinity'
        : Object.is(value, -0)
          ? '-0'
          : value.toPrecision(17)
const floatCases = () => {
  const words = new Set<bigint>()
  for (const value of [
    0,
    -0,
    946684800,
    -210866803200,
    9224318016000,
    946684800.0000005,
    946684800.0000015,
    946684799.9999995,
    1e-6,
    -1e-6,
    1e10,
    -1e10,
    Number.MIN_VALUE,
    1e20,
    -1e20,
    Infinity,
    -Infinity,
    NaN,
  ])
    for (let step = -4n; step <= 4n; step++) words.add(BigInt.asIntN(64, bits(value) + step))
  let random = 0x1928374655aan
  for (let i = 0; i < 96; i++) {
    random = BigInt.asUintN(64, random * 6364136223846793005n + 1442695040888963407n)
    words.add(BigInt.asIntN(64, random))
  }
  return [...words].map((word) => ({ word, text: spelling(number(word)) }))
}
const dates = [
  '2000-02-29',
  '1970-01-01',
  '1999-12-31',
  '1900-03-01',
  '2001-01-01',
  '2019-12-30',
  '2021-01-01',
  '0001-01-01 BC',
  '0100-12-31 BC',
  '0101-01-01 BC',
  '4714-11-24 BC',
  '294246-01-01',
  '294276-12-31',
  '294277-01-01',
  '5874897-12-31',
  'infinity',
  '-infinity',
  null,
]
const units = [
  'year',
  'month',
  'day',
  'epoch',
  'julian',
  'isoyear',
  'week',
  'doy',
  'dow',
  'isodow',
  'quarter',
  'century',
  'decade',
  'millennium',
  'hour',
  'minute',
  'second',
  'microseconds',
  'milliseconds',
  'timezone',
  'timezone_hour',
  'timezone_minute',
  'YEAR',
  'EPOCH',
  'MiCrOsEcOnDs',
  'm',
  'mon',
  'mm',
  'j',
  'jd',
  'y',
  'qtr',
  'us',
  'ms',
  'microsecon',
  'millisecon',
  'microseconds_extra',
  'year_extra',
  'bad',
  'now',
  'infinity',
  'ago',
  '@',
  '',
  ' year',
  'year ',
  'yearé',
  'é',
  '月',
  null,
]
const clip = (input: string | null, limit: number | undefined) => {
  if (input === null || limit === undefined) return input
  let text = ''
  for (const ch of input) {
    if (Buffer.byteLength(text + ch, 'utf8') > limit) break
    text += ch
  }
  return text
}

it('matches native date legacy fields and numeric epoch conversion with exact float words, range and rounding boundaries, scoped contexts and lazy source/stored composition', async () => {
  const pg = await PGlite.create(),
    root = await mkdtemp('/tmp/pgsid-temporal-scalars-')
  const names: string[] = [],
    fixtures: { name: string; row: Row; expected: Outcome }[] = [],
    native: unknown[] = []
  try {
    expect(available.map((f) => f.rustName).sort()).toEqual([
      'sql__pg_catalog__date_part__g4hw',
      'sql__pg_catalog__to_timestamp__kymq',
    ])
    await pg.exec(`SET TimeZone='UTC';CREATE COLLATION public.scalar_other(provider=icu,locale='und',deterministic=false);CREATE DOMAIN scalar_field AS float8;CREATE DOMAIN scalar_instant AS timestamptz;
   CREATE TABLE scalar_dates(id serial,day_value date);CREATE TABLE scalar_units(id serial,unit_name text);CREATE TABLE scalar_checks(day_value date,unit_name text,seconds float8,lost_stamp timestamp,expected text,bypass boolean,${forms.map((f) => `CONSTRAINT ${f.name} CHECK(${expression(f.call, f.family)})`).join(',')});
   ${forms.map((f) => `CREATE TABLE oracle_${f.name}(day_value date,unit_name text,seconds float8,lost_stamp timestamp,expected text,bypass boolean,CHECK(${expression(f.call, f.family)}));`).join('\n')}`)
    for (const date of dates)
      await pg.query('INSERT INTO scalar_dates(day_value) VALUES($1::date)', [date])
    await pg.exec(
      "SET TimeZone='-24';INSERT INTO scalar_dates(day_value) VALUES(timestamptz '4714-11-24+00 BC'::date);SET TimeZone='UTC'",
    )
    const dateInputs = (
      await pg.query<{ id: number; wire: string | null }>(
        "SELECT id,encode(date_send(day_value),'hex') wire FROM scalar_dates ORDER BY id",
      )
    ).rows.map((r) => ({
      id: r.id,
      value: r.wire === null ? null : Buffer.from(r.wire, 'hex').readInt32BE(),
    }))
    expect(dateInputs.at(-1)!.value).toBeLessThan(-2451545)
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((t) => t.name === 'scalar_checks')!
    const groups = profiles.map((profile, index) =>
      prepareCheckRustGroup(
        forms.flatMap((form) =>
          (['source', 'stored'] as const).map((origin) => {
            const name = `p${index}_${form.name}_${origin}`
            names.push(name)
            const lowered = lowerTableCheck(
              table,
              table.constraints.find((c) => c.name === form.name)!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? 'CHECK(' + expression(form.call, form.family) + ')' : undefined,
            )!
            expect(hasUncertain(lowered.expression), name).toBe(false)
            const value = portableCheckAtoms(lowered.expression)
            expect(hasUncertain(value), name).toBe(false)
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: table.name,
                constraint: name,
              },
              expression: value,
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
    expect(group.checks.every((c) => c.kind === 'supported')).toBe(true)
    const unitIds = new Map<string | null, number>()
    const unitId = async (value: string | null) => {
      const cached = unitIds.get(value)
      if (cached !== undefined) return cached
      const id = (
        await pg.query<{ id: number }>(
          'INSERT INTO scalar_units(unit_name)VALUES($1) RETURNING id',
          [value],
        )
      ).rows[0]!.id
      unitIds.set(value, id)
      return id
    }
    const epochInputs = floatCases()
    let pairs = 0,
      inserts = 0,
      deferred = 0
    for (const [index, profile] of profiles.entries())
      for (const form of forms) {
        if (form.family === 'date') {
          const selected =
            index === 0
              ? dateInputs
              : dateInputs.filter((d) => [1, 14, 15, 16, 17, 18, 19].includes(d.id))
          for (const date of selected)
            for (const unit of index === 0
              ? units
              : ['year', 'microseconds', 'yearé', 'é', '', null]) {
              if (['date_lost_unit', 'date_null_unit'].includes(form.name) && unit !== 'year')
                continue
              const effective = clip(unit, profile.context.maxIdentifierBytes)
              let output: string | null = null,
                failure: Outcome | undefined
              try {
                output = (
                  await pg.query<{ v: string | null }>(
                    `SELECT encode(float8send(${form.call}),'hex') v FROM(SELECT day_value,unit_name,timestamp '2000-01-01' lost_stamp FROM scalar_dates CROSS JOIN scalar_units WHERE scalar_dates.id=$1 AND scalar_units.id=$2)q`,
                    [date.id, await unitId(effective)],
                  )
                ).rows[0]!.v
              } catch (e) {
                failure = error((e as { code: string }).code)
              }
              const castError =
                date.value !== null && date.value !== 2147483647 && date.value >= 106751983
              const defer =
                form.name !== 'date_null_unit' &&
                date.value !== null &&
                !castError &&
                (form.name === 'date_lost_unit' ||
                  (unit !== null &&
                    ((profile.context.maxIdentifierBytes === undefined && unit !== '') ||
                      (profile.context.serverEncoding === undefined &&
                        /[^\x00-\x7f]/u.test(unit)))))
              pairs++
              if (defer) deferred++
              native.push({
                profile: profile.name,
                form: form.name,
                date: date.id,
                unit,
                effective,
                output,
                failure,
                defer,
              })
              for (const expected of failure
                ? [null]
                : [output, output === null ? 'wrong' : output + '!']) {
                const reference: Outcome = failure ?? {
                  kind: expected === output ? 'True' : 'False',
                }
                let state: string | undefined
                try {
                  await pg.query(
                    `INSERT INTO oracle_${form.name} SELECT day_value,$1::text,NULL::float8,timestamp '2000-01-01',$2::text,false FROM scalar_dates WHERE id=$3`,
                    [effective, expected, date.id],
                  )
                } catch (e) {
                  state = (e as { code: string }).code
                }
                expect(
                  state,
                  JSON.stringify({ profile: profile.name, form: form.name, date: date.id, unit }),
                ).toBe(
                  failure?.kind === 'Error'
                    ? failure.value.state.toString(36).toUpperCase().padStart(5, '0')
                    : reference.kind === 'False'
                      ? '23514'
                      : undefined,
                )
                inserts++
                for (const origin of ['source', 'stored'])
                  fixtures.push({
                    name: `p${index}_${form.name}_${origin}`,
                    row: {
                      day_value: known(date.value),
                      unit_name: known(unit),
                      seconds: known(null),
                      lost_stamp: known(0n),
                      expected: known(expected),
                      bypass: known(false),
                    },
                    expected: defer ? { kind: 'Unknown' } : reference,
                  })
              }
            }
        } else {
          const selected = index === 0 ? epochInputs : epochInputs.filter((_, i) => i % 31 === 0)
          for (const [inputIndex, input] of selected.entries()) {
            if (
              ['epoch_nan', 'epoch_float4', 'epoch_integer'].includes(form.name) &&
              inputIndex % 7 !== 0
            )
              continue
            const source = (
              await pg.query<{ v: string }>("SELECT encode(float8send($1::float8),'hex') v", [
                input.text,
              ])
            ).rows[0]!.v
            if (!Number.isNaN(number(input.word)))
              expect(Buffer.from(source, 'hex').readBigInt64BE()).toBe(input.word)
            let output: string | null = null,
              failure: Outcome | undefined
            try {
              output = (
                await pg.query<{ v: string | null }>(
                  `SELECT encode(timestamptz_send(${form.call}),'hex') v FROM(SELECT $1::float8 seconds)q`,
                  [input.text],
                )
              ).rows[0]!.v
            } catch (e) {
              failure = error((e as { code: string }).code)
            }
            pairs++
            native.push({
              profile: profile.name,
              form: form.name,
              input: input.text,
              word: input.word.toString(),
              output,
              failure,
            })
            for (const expected of failure
              ? [null]
              : [output, output === null ? 'wrong' : output + '!']) {
              const reference: Outcome = failure ?? { kind: expected === output ? 'True' : 'False' }
              let state: string | undefined
              try {
                await pg.query(
                  `INSERT INTO oracle_${form.name}(seconds,expected,bypass)VALUES($1::float8,$2::text,false)`,
                  [input.text, expected],
                )
              } catch (e) {
                state = (e as { code: string }).code
              }
              expect(
                state,
                JSON.stringify({ profile: profile.name, form: form.name, input: input.text }),
              ).toBe(
                failure?.kind === 'Error'
                  ? failure.value.state.toString(36).toUpperCase().padStart(5, '0')
                  : reference.kind === 'False'
                    ? '23514'
                    : undefined,
              )
              inserts++
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: `p${index}_${form.name}_${origin}`,
                  row: {
                    day_value: known(null),
                    unit_name: known(null),
                    seconds: known(input.word),
                    lost_stamp: known(0n),
                    expected: known(expected),
                    bypass: known(false),
                  },
                  expected: reference,
                })
            }
          }
        }
      }
    const oversizedDate = (
      await pg.query<{ value: number }>(
        "SELECT '5874897-12-31'::date - '2000-01-01'::date AS value",
      )
    ).rows[0]!.value
    for (const [index] of profiles.entries())
      for (const form of forms)
        for (const origin of ['source', 'stored']) {
          const name = `p${index}_${form.name}_${origin}`,
            row: Row = {
              day_value: known(0),
              unit_name: known('year'),
              seconds: known(0n),
              lost_stamp: known(0n),
              expected: known('wrong'),
              bypass: known(false),
            },
            field = form.family === 'date' ? 'day_value' : 'seconds'
          fixtures.push({
            name,
            row: { ...row, [field]: { kind: 'Unknown' } },
            expected: { kind: form.name === 'date_null_unit' ? 'False' : 'Unknown' },
          })
          fixtures.push({
            name,
            row: { ...row, [field]: error('22003') as Input },
            expected: form.name === 'date_null_unit' ? { kind: 'False' } : error('22003'),
          })
          fixtures.push({
            name,
            row: { ...row, [field]: error('22003') as Input, bypass: known(true) },
            expected: { kind: 'True' },
          })
          fixtures.push({
            name,
            row: { ...row, [field]: known(null) },
            expected: { kind: 'False' },
          })
          if (form.name === 'date_direct' || form.name === 'date_contained') {
            const partials: [Input, Input, Outcome][] = [
              [known(null), { kind: 'Unknown' }, { kind: 'False' }],
              [known(oversizedDate), { kind: 'Unknown' }, error('22008')],
              [{ kind: 'Unknown' }, known(null), { kind: 'Unknown' }],
              [known(0), { kind: 'Unknown' }, { kind: 'Unknown' }],
              [known(oversizedDate), error('22003') as Input, error('22003')],
            ]
            for (const [day, unit, expected] of partials) {
              const partial = { ...row, day_value: day, unit_name: unit }
              fixtures.push({ name, row: partial, expected })
              fixtures.push({
                name,
                row: { ...partial, bypass: known(true) },
                expected: { kind: 'True' },
              })
            }
          }
        }
    await mkdir(packet, { recursive: true })
    await writeFile(
      packet + '/summary.json',
      JSON.stringify(
        {
          scope,
          functions: functions.length,
          checks: names.length,
          profiles: profiles.length,
          dateInputs: dateInputs.length,
          floatInputs: epochInputs.length,
          pairs,
          fixtures: fixtures.length,
          inserts,
          deferred,
          targets: ['Rust', 'Go', 'TypeScript'],
        },
        null,
        2,
      ) + '\n',
    )
    await writeFile(packet + '/native.json', JSON.stringify(native, null, 2) + '\n')
    await runCheckParity(root, 'temporal_scalars', group, names, fixtures)
  } finally {
    await pg.close()
    await rm(root, { recursive: true, force: true })
  }
}, 600000)

it.skipIf(!functions.some((f) => f.name === 'date_part'))(
  'preserves reserved-field errors before stored timestamp calendar validation in numeric and float consumers',
  async () => {
    const pg = await PGlite.create(),
      root = await mkdtemp('/tmp/pgsid-temporal-scalar-fields-')
    const names: string[] = [],
      fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      native: unknown[] = []
    const fields = [
      { name: 'numeric', send: 'numeric_send', call: 'pg_catalog.extract(unit_name,stamp)' },
      { name: 'legacy', send: 'float8send', call: 'pg_catalog.date_part(unit_name,stamp)' },
    ]
    const source = (f: (typeof fields)[number]) =>
      `CASE WHEN bypass THEN true ELSE (encode(${f.send}(${f.call}),'hex') COLLATE "C") IS NOT DISTINCT FROM expected END`
    try {
      await pg.exec(`SET TimeZone='-24';CREATE TABLE field_inputs(id serial,stamp timestamp);INSERT INTO field_inputs(stamp) VALUES(timestamptz '4714-11-24+00 BC'::date::timestamp),(timestamp '4714-11-24 BC'),(timestamp '2000-01-01'),((timestamp '294276-12-31 23:59:59.999999')::timestamp(0)),('infinity'),('-infinity'),(NULL);SET TimeZone='UTC';
   CREATE TABLE field_units(id serial,unit_name text);
   CREATE TABLE field_boundaries(stamp timestamp,unit_name text,expected text,bypass boolean,${fields.map((f) => `CONSTRAINT ${f.name} CHECK(${source(f)})`).join(',')});`)
      const words = [
        'now',
        'allballs',
        'infinity',
        '+infinity',
        '-infinity',
        'today',
        'tomorrow',
        'yesterday',
        'timezone',
        'timezone_hour',
        'timezone_minute',
        'year',
        'month',
        'day',
        'epoch',
        'bad',
        'ago',
        '@',
        '',
        null,
      ]
      for (const unit of words)
        await pg.query('INSERT INTO field_units(unit_name)VALUES($1)', [unit])
      const catalog = await snapshotCatalog(pg),
        table = catalog.tables.find((t) => t.name === 'field_boundaries')!
      const group = prepareCheckRustGroup(
        fields.flatMap((field) =>
          (['source', 'stored'] as const).map((origin) => {
            const name = `${field.name}_${origin}`
            names.push(name)
            const lowered = lowerTableCheck(
              table,
              table.constraints.find((c) => c.name === field.name)!,
              catalog.enums,
              catalog.domains,
              origin,
              catalog.rangeTypes,
              catalog.compositeTypeGraph,
              origin === 'source' ? 'CHECK(' + source(field) + ')' : undefined,
            )!
            expect(hasUncertain(lowered.expression), name).toBe(false)
            return {
              identity: {
                schema: 'public',
                kind: 'table' as const,
                owner: table.name,
                constraint: name,
              },
              expression: portableCheckAtoms(lowered.expression),
            }
          }),
        ),
      )
      expect(group.checks.every((c) => c.kind === 'supported')).toBe(true)
      const inputs = (
        await pg.query<{ id: number; wire: string | null }>(
          "SELECT id,encode(timestamp_send(stamp),'hex') wire FROM field_inputs ORDER BY id",
        )
      ).rows.map((r) => ({
        id: r.id,
        value: r.wire === null ? null : Buffer.from(r.wire, 'hex').readBigInt64BE(),
      }))
      expect(inputs[0]!.value! < -211813488000000000n).toBe(true)
      for (const input of inputs)
        for (const [index, unit] of words.entries())
          for (const field of fields) {
            let output: string | null = null,
              failure: Outcome | undefined
            try {
              output = (
                await pg.query<{ v: string | null }>(
                  `SELECT encode(${field.send}(${field.call}),'hex') v FROM field_inputs CROSS JOIN field_units WHERE field_inputs.id=$1 AND field_units.id=$2`,
                  [input.id, index + 1],
                )
              ).rows[0]!.v
            } catch (e) {
              failure = error((e as { code: string }).code)
            }
            native.push({ input: input.id, unit, field: field.name, output, failure })
            for (const expected of failure
              ? [null]
              : [output, output === null ? 'wrong' : output + '!'])
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: `${field.name}_${origin}`,
                  row: {
                    stamp: known(input.value),
                    unit_name: known(unit),
                    expected: known(expected),
                    bypass: known(false),
                  },
                  expected: failure ?? { kind: expected === output ? 'True' : 'False' },
                })
          }
      await mkdir(packet, { recursive: true })
      await writeFile(
        packet + '/field-boundaries-native.json',
        JSON.stringify(native, null, 2) + '\n',
      )
      await writeFile(
        packet + '/field-boundaries-summary.json',
        JSON.stringify(
          {
            checks: names.length,
            inputs: inputs.length,
            units: words.length,
            fixtures: fixtures.length,
            targets: ['Rust', 'Go', 'TypeScript'],
          },
          null,
          2,
        ) + '\n',
      )
      await runCheckParity(root, 'temporal_scalar_fields', group, names, fixtures)
    } finally {
      await pg.close()
      await rm(root, { recursive: true, force: true })
    }
  },
  600000,
)
