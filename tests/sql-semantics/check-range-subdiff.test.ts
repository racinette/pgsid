import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PG18_RANGE_TYPES } from '../../src/postgres/builtins/type-ranges.generated.js'
import { builtinMetadata } from '../../src/postgres/builtins/inventory.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { portableCheckAtoms } from '../../src/codegen/shared/check-atom-support.js'
import { checkRustEntryName } from '../../src/codegen/shared/check-rust-names.js'
import { readMultirangeFixture } from './check-multirange-fixtures.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { rangeBoundProjection, rangeCoreSamples, readRangeFixture } from './check-range-fixtures.js'

const cell = (value: string | boolean | bigint | number | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

it('evaluates all builtin range subtype distances with cast-before-subtraction precision, temporal markers, numeric failures and composed CHECKs', async () => {
  const pg = await PGlite.create()
  const directory = await mkdtemp(join(tmpdir(), 'pgsid-range-subdiff-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const families = Object.values(PG18_RANGE_TYPES).map((range, index) => {
      const metadata = builtinMetadata(range.subtypeDiff)
      expect(metadata).toMatchObject({
        kind: 'function',
        strict: true,
        volatility: 'i',
        returnsSet: false,
        args: [range.subtype, range.subtype],
        result: 'pg_catalog.float8',
      })
      return { range, index, metadata }
    })
    for (const family of families)
      await pg.exec(
        `CREATE DOMAIN distance_input_${family.index} AS ${family.range.subtype};CREATE DOMAIN distance_nested_${family.index} AS distance_input_${family.index}`,
      )
    await pg.exec('CREATE DOMAIN nonnegative_distance AS float8 CHECK(VALUE>=0)')
    const forms = families.flatMap((family) => {
      const fn = family.metadata.name,
        call = `${fn}(first_value,second_value)`
      return [
        { name: 'direct', expr: call, wire: false },
        { name: 'wire', expr: `encode(float8send(${call}),'hex')`, wire: true },
        {
          name: 'domain',
          expr: `${fn}(first_value::distance_nested_${family.index},second_value::distance_nested_${family.index})`,
          wire: false,
        },
        { name: 'coalesce', expr: `COALESCE(${call},0::float8)`, wire: false },
        {
          name: 'choice',
          expr: `CASE WHEN choose THEN ${fn}(second_value,first_value) ELSE ${call} END`,
          wire: false,
        },
        { name: 'nullif', expr: `NULLIF(${call},0::float8)`, wire: false },
        {
          name: 'greatest',
          expr: `greatest(${call},${fn}(second_value,first_value))`,
          wire: false,
        },
        { name: 'checked_result', expr: `(${call})::nonnegative_distance`, wire: false },
        {
          name: 'array',
          expr: `(array_sort(ARRAY[${call},${fn}(second_value,first_value)]))[2]`,
          wire: false,
        },
        { name: 'range_bounds', expr: `${fn}(upper(payload),lower(payload))`, wire: false },
      ].map((form, index) => ({
        ...family,
        ...form,
        table: `range_distance_${family.index}_${index}`,
        sql: `CASE WHEN bypass THEN true ELSE (${form.expr}) IS NOT DISTINCT FROM ${form.wire ? 'expected_wire' : 'expected'} END`,
      }))
    })
    for (const form of forms)
      await pg.exec(
        `CREATE TABLE ${form.table}(first_value ${form.range.subtype},second_value ${form.range.subtype},payload ${form.range.identity},expected float8,expected_wire text,choose boolean,bypass boolean,CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = forms.flatMap((form) => {
      const table = catalog.tables.find((t) => t.name === form.table)!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: form.table,
          constraint: origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { ...table.constraints[0]!, definition: `CHECK(${form.sql})` }
              : table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const check of group.checks)
      expect(check.kind, JSON.stringify(check).slice(0, 1600)).toBe('supported')
    const samples: Record<string, (string | null)[]> = {
      'pg_catalog.int4': [null, '-2147483648', '2147483647', '-1', '0', '1', '16777217'],
      'pg_catalog.int8': [
        null,
        '-9223372036854775808',
        '9223372036854775807',
        '9223372036854775296',
        '9007199254740991',
        '9007199254740992',
        '9007199254740993',
        '9007199254740994',
        '-1',
        '0',
        '1',
      ],
      'pg_catalog."numeric"': [
        null,
        '-0.00',
        '1.0000',
        '1.0000000000000000001',
        '9007199254740993',
        '-Infinity',
        'Infinity',
        'NaN',
        '1e309',
        '-1e309',
        '1e-400',
        '-1e-400',
      ],
      'pg_catalog.date': [
        null,
        '-infinity',
        'infinity',
        '4714-11-24 BC',
        '5874897-12-31',
        '1999-12-31',
        '2000-01-01',
        '2000-01-02',
      ],
      'pg_catalog."timestamp"': [
        null,
        '-infinity',
        'infinity',
        '4714-11-24 00:00:00 BC',
        '294276-12-31 23:59:59.999999',
        '2000-01-01 00:00:00',
        '2000-01-01 00:00:00.000001',
        '1999-12-31 23:59:59.999999',
        '2285-06-04 23:47:34.740993',
      ],
      'pg_catalog.timestamptz': [
        null,
        '-infinity',
        'infinity',
        '4714-11-24 00:00:00+00 BC',
        '294276-12-31 23:59:59.999999+00',
        '2000-01-01 00:00:00+00',
        '2000-01-01 00:00:00.000001+00',
        '1999-12-31 23:59:59.999999+00',
        '2285-06-04 23:47:34.740993+00',
      ],
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const references: unknown[] = []
    let inserts = 0
    for (const family of families) {
      const inputs = new Map<string | null, Input>()
      for (const text of samples[family.range.subtype]!) {
        if (text === null) {
          inputs.set(null, { kind: 'Null' })
          continue
        }
        const temporal =
          family.range.subtype === 'pg_catalog."timestamp"' ||
          family.range.subtype === 'pg_catalog.timestamptz'
        const projection = temporal
          ? `encode(${family.range.subtype === 'pg_catalog.timestamptz' ? 'timestamptz_send' : 'timestamp_send'}(v),'hex')`
          : rangeBoundProjection('v', family.range.subtype)
        const normalized = (
          await pg.query<{ v: string }>(
            `SELECT ${projection} v FROM (SELECT $1::${family.range.subtype} v) q`,
            [text],
          )
        ).rows[0]!.v
        inputs.set(
          text,
          cell(
            family.range.subtype === 'pg_catalog.int4' || family.range.subtype === 'pg_catalog.date'
              ? Number(normalized)
              : family.range.subtype === 'pg_catalog."numeric"'
                ? normalized
                : temporal
                  ? BigInt.asIntN(64, BigInt('0x' + normalized))
                  : BigInt(normalized),
          ),
        )
      }
      for (const first of samples[family.range.subtype]!)
        for (const second of samples[family.range.subtype]!)
          for (const form of forms.filter(
            (f) => f.index === family.index && f.name !== 'range_bounds',
          )) {
            const choose = first === second
            let output: string | null = null,
              wire: string | null = null,
              outputError: string | undefined
            try {
              const result = (
                await pg.query<{ output: string | null; wire: string | null }>(
                  `SELECT (${form.expr})::text output,${form.wire ? 'NULL::text' : `encode(float8send(${form.expr}),'hex')`} wire FROM (SELECT $1::${family.range.subtype} first_value,$2::${family.range.subtype} second_value,$3::boolean choose) q`,
                  [first, second, choose],
                )
              ).rows[0]!
              output = result.output
              wire = result.wire
            } catch (error) {
              outputError = (error as { code: string }).code
            }
            references.push({
              type: family.range.identity,
              form: form.name,
              first,
              second,
              output,
              wire,
              outputError,
            })
            for (const correct of [true, false]) {
              const expectedText = form.wire ? null : correct ? output : '42',
                expectedWire = form.wire ? (correct ? output : 'wrong') : null
              let expectedBits: bigint | null = null
              if (expectedText !== null)
                expectedBits = BigInt.asIntN(
                  64,
                  BigInt(
                    '0x' +
                      (
                        await pg.query<{ wire: string }>(
                          "SELECT encode(float8send($1::float8),'hex') wire",
                          [expectedText],
                        )
                      ).rows[0]!.wire,
                  ),
                )
              let outcome: Outcome
              try {
                const result = (
                  await pg.query<{ result: boolean | null }>(
                    `INSERT INTO ${form.table}(first_value,second_value,expected,expected_wire,choose,bypass) VALUES($1::${family.range.subtype},$2::${family.range.subtype},$3::float8,$4,$5,false) RETURNING (${form.sql}) result`,
                    [first, second, expectedText, expectedWire, choose],
                  )
                ).rows[0]!.result
                outcome = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
              } catch (error) {
                const code = (error as { code: string }).code
                outcome =
                  code === '23514' &&
                  (error as { constraint?: string }).constraint !== 'nonnegative_distance_check'
                    ? { kind: 'False' }
                    : { kind: 'Error', value: { state: parseInt(code, 36) } }
              }
              inserts++
              if (form.wire && output === '7ff8000000000000' && !outputError)
                outcome = { kind: 'Unknown' }
              for (const origin of ['source', 'stored'])
                fixtures.push({
                  name: form.table + '_' + origin,
                  row: {
                    first_value: inputs.get(first)!,
                    second_value: inputs.get(second)!,
                    payload: { kind: 'Null' },
                    expected: cell(expectedBits),
                    expected_wire: cell(expectedWire),
                    choose: cell(choose),
                    bypass: cell(false),
                  },
                  expected: outcome,
                })
            }
          }
      for (const form of forms.filter((f) => f.index === family.index && f.name !== 'range_bounds'))
        for (const state of [
          { kind: 'Unknown' },
          { kind: 'Error', value: { state: parseInt('22012', 36) } },
        ] as Input[])
          for (const bypass of [false, true])
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: form.table + '_' + origin,
                row: {
                  first_value: state,
                  second_value: state,
                  payload: { kind: 'Null' },
                  expected: cell(0n),
                  expected_wire: cell(''),
                  choose: cell(false),
                  bypass: cell(bypass),
                },
                expected: bypass ? { kind: 'True' } : (state as Outcome),
              })
    }
    for (const form of forms.filter((f) => f.name === 'range_bounds')) {
      for (const text of rangeCoreSamples(form.range.identity).ranges) {
        const payload = await readRangeFixture(
          pg,
          `SELECT $1::${form.range.identity} span`,
          'span',
          form.range.identity,
          [text],
        )
        let output: string | null = null,
          wire: string | null = null,
          outputError: string | undefined
        try {
          const result = (
            await pg.query<{ output: string | null; wire: string | null }>(
              `SELECT (${form.expr})::text output,encode(float8send(${form.expr}),'hex') wire FROM (SELECT $1::${form.range.identity} payload) q`,
              [text],
            )
          ).rows[0]!
          output = result.output
          wire = result.wire
        } catch (error) {
          outputError = (error as { code: string }).code
        }
        references.push({
          type: form.range.identity,
          form: form.name,
          text,
          output,
          wire,
          outputError,
        })
        for (const correct of [false, true])
          for (const bypass of [false, true]) {
            const expectedText = correct ? output : '42'
            const expectedBits = correct
              ? wire === null
                ? null
                : BigInt.asIntN(64, BigInt('0x' + wire))
              : 4631107791820423168n
            let outcome: Outcome
            try {
              const result = (
                await pg.query<{ result: boolean | null }>(
                  `INSERT INTO ${form.table}(payload,expected,bypass) VALUES($1::${form.range.identity},$2::float8,$3) RETURNING (${form.sql}) result`,
                  [text, expectedText, bypass],
                )
              ).rows[0]!.result
              outcome = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
            } catch (error) {
              const code = (error as { code: string }).code
              outcome =
                code === '23514'
                  ? { kind: 'False' }
                  : { kind: 'Error', value: { state: parseInt(code, 36) } }
            }
            inserts++
            for (const origin of ['source', 'stored'])
              fixtures.push({
                name: form.table + '_' + origin,
                row: {
                  first_value: { kind: 'Null' },
                  second_value: { kind: 'Null' },
                  payload: payload === null ? { kind: 'Null' } : { kind: 'Value', value: payload },
                  expected: cell(expectedBits),
                  expected_wire: { kind: 'Null' },
                  choose: cell(false),
                  bypass: cell(bypass),
                },
                expected: outcome,
              })
          }
      }
    }
    await mkdir('artifacts/range-subdiff', { recursive: true })
    await writeFile(
      'artifacts/range-subdiff/references.json',
      JSON.stringify({ inserts, plans: plans.length, references }, null, 2) + '\n',
    )
    await runCheckParity(
      directory,
      'rangesubdiff',
      group,
      plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
      fixtures,
    )
    await writeFile(
      'artifacts/range-subdiff/report.json',
      JSON.stringify({ inserts, plans: plans.length, fixtures: fixtures.length }, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 600_000)

it('preserves strict partial states, constant preparation and lazy runtime distance errors', async () => {
  const pg = await PGlite.create(),
    directory = await mkdtemp(join(tmpdir(), 'pgsid-range-subdiff-state-'))
  try {
    await pg.exec("SET DateStyle='ISO,YMD';SET TimeZone='UTC'")
    const forms = Object.values(PG18_RANGE_TYPES).map((range, index) => {
      const fn = builtinMetadata(range.subtypeDiff).name
      const samples = rangeCoreSamples(range.identity).elements
      return {
        table: `distance_constant_${index}`,
        range,
        sql: `CASE WHEN bypass THEN true ELSE ${fn}('${samples[2]}'::${range.subtype},'${samples[3]}'::${range.subtype})=expected END`,
      }
    })
    const numeric = [
      ['overflow', 'numrange_subdiff(1e309::numeric,0::numeric)>0'],
      ['underflow', 'numrange_subdiff(1e-400::numeric,0::numeric)>0'],
      ['runtime', 'numrange_subdiff(amount,0::numeric)>0'],
      ['argument_error', 'numrange_subdiff(amount,(1/divisor)::numeric)>0'],
      [
        'nan_wire',
        "encode(float8send(numrange_subdiff('NaN'::numeric,0::numeric)),'hex')='7ff8000000000000'",
      ],
      [
        'nan_base64',
        "encode(float8send(numrange_subdiff('NaN'::numeric,0::numeric)),'BASE64')='native output'",
      ],
      [
        'nan_escape',
        "encode(float8send(numrange_subdiff('NaN'::numeric,0::numeric)),'EsCaPe')='native output'",
      ],
      ['nan_float4', "encode(float4send('NaN'::float4),'hex')='7fc00000'"],
      [
        'invalid_format',
        "encode(float8send(numrange_subdiff(1::numeric,0::numeric)),'invalid')='native output'",
      ],
    ].map(([name, expr]) => ({
      table: 'distance_prepare_' + name,
      sql: `CASE WHEN bypass THEN true ELSE ${expr} END`,
    }))
    for (const form of [...forms, ...numeric])
      await pg.exec(
        `CREATE TABLE ${form.table}(expected float8,amount numeric,divisor integer,bypass boolean,CHECK(${form.sql}))`,
      )
    const catalog = await snapshotCatalog(pg)
    const plans = [...forms, ...numeric].flatMap((form) => {
      const table = catalog.tables.find((t) => t.name === form.table)!
      return (['source', 'stored'] as const).map((origin) => ({
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: form.table,
          constraint: origin,
        },
        expression: portableCheckAtoms(
          lowerTableCheck(
            table,
            origin === 'source'
              ? { ...table.constraints[0]!, definition: `CHECK(${form.sql})` }
              : table.constraints[0]!,
            catalog.enums,
            catalog.domains,
            origin,
          )!.expression,
        ),
      }))
    })
    const group = prepareCheckRustGroup(plans, { defaultCollation: 'C', serverEncoding: 'UTF8' })
    for (const check of group.checks)
      expect(check.kind, JSON.stringify(check).slice(0, 1000)).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [],
      references: unknown[] = []
    let inserts = 0
    for (const form of [...forms, ...numeric])
      for (const bypass of [false, true]) {
        let outcome: Outcome
        try {
          const result = (
            await pg.query<{ result: boolean | null }>(
              `INSERT INTO ${form.table} VALUES(0,1e309,0,$1) RETURNING (${form.sql}) result`,
              [bypass],
            )
          ).rows[0]!.result
          outcome = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
        } catch (error) {
          const code = (error as { code: string }).code
          outcome =
            code === '23514'
              ? { kind: 'False' }
              : { kind: 'Error', value: { state: parseInt(code, 36) } }
        }
        inserts++
        references.push({ table: form.table, bypass, outcome })
        if (form.table.startsWith('distance_prepare_nan_') && !bypass) outcome = { kind: 'Unknown' }
        for (const origin of ['source', 'stored'])
          fixtures.push({
            name: form.table + '_' + origin,
            row: {
              expected: cell(0n),
              amount: cell('1e309'),
              divisor: cell(0),
              bypass: cell(bypass),
            },
            expected: outcome,
          })
      }
    const failure = parseInt('22012', 36)
    for (const [index, range] of Object.values(PG18_RANGE_TYPES).entries()) {
      const metadata = builtinMetadata(range.subtypeDiff)
      if (metadata.kind !== 'function') throw new Error('Expected scalar distance support')
      const fn = metadata.rustName
      const prefix =
        range.subtype === 'pg_catalog."numeric"'
          ? 'Numeric'
          : range.subtype === 'pg_catalog.int4'
            ? 'Int4'
            : range.subtype === 'pg_catalog.int8'
              ? 'Int8'
              : range.subtype === 'pg_catalog.date'
                ? 'Date'
                : range.subtype === 'pg_catalog.timestamptz'
                  ? 'Timestamptz'
                  : 'Timestamp'
      const scalar = (state: string) => `${prefix}Value::${state}`
      const source = `pub fn distance_state_${index}()->BoolValue {
        let first=make_sql_error(${failure});
        let second=make_sql_error(${parseInt('22003', 36)});
        if ${fn}(${scalar('Error(first)')},${scalar('Error(second)')}) != Float8Value::Error(first) {return make_bool_value(false);};
        if ${fn}(${scalar('Unknown')},${scalar('Error(second)')}) != Float8Value::Error(second) {return make_bool_value(false);};
        if ${fn}(${scalar('Null')},${scalar('Error(first)')}) != Float8Value::Error(first) {return make_bool_value(false);};
        if ${fn}(${scalar('Null')},${scalar('Null')}) != Float8Value::Null {return make_bool_value(false);};
        if ${fn}(${scalar('Unknown')},${scalar('Unknown')}) != Float8Value::Unknown {return make_bool_value(false);};
        make_bool_value(true)
      }`
      group
        .source!.modules.find((m) => m.name === 'pg_catalog')!
        .files.push({ path: `tests/distance_state_${index}.rs`, source })
      const entry = checkRustEntryName({
        schema: 'public',
        kind: 'table',
        owner: 'range_distance',
        constraint: 'state_' + index,
      })
      group.checks = [...group.checks, { kind: 'supported', entryName: entry, inputs: [] }]
      group.evaluatorSource += `\npub fn ${entry}()->CheckOutcome { let result=distance_state_${index}();check_from_bool(result) }\n`
      group.source!.modules.find((m) => m.name === 'checks')!.files[0]!.source =
        group.evaluatorSource!
      fixtures.push({ name: `state_${index}`, row: {}, expected: { kind: 'True' } })
    }
    await runCheckParity(
      directory,
      'rangesubdiffstates',
      group,
      [
        ...plans.map((p) => p.identity.owner + '_' + p.identity.constraint),
        ...Object.values(PG18_RANGE_TYPES).map((_r, i) => `state_${i}`),
      ],
      fixtures,
    )
    await writeFile(
      'artifacts/range-subdiff/state-report.json',
      JSON.stringify({ inserts, fixtures: fixtures.length, references }, null, 2) + '\n',
    )
  } finally {
    await pg.close()
    await rm(directory, { recursive: true, force: true })
  }
}, 180_000)

it('captures exact temporal range and multirange microseconds at stored limits and float precision boundaries', async () => {
  const pg = await PGlite.create()
  try {
    await pg.exec("SET TimeZone='UTC';SET DateStyle='ISO,YMD'")
    for (const type of ['pg_catalog.tsrange', 'pg_catalog.tstzrange'] as const) {
      const zone = type === 'pg_catalog.tstzrange' ? '+00' : ''
      const samples = [
        {
          text: `["294276-12-31 23:59:59.999998${zone}","294276-12-31 23:59:59.999999${zone}"]`,
          lo: 9223371331199999998n,
          hi: 9223371331199999999n,
        },
        {
          text: `["4714-11-24 00:00:00${zone} BC","4714-11-24 00:00:00.000001${zone} BC"]`,
          lo: -211813488000000000n,
          hi: -211813487999999999n,
        },
        {
          text: `["2285-06-04 23:47:34.740992${zone}","2285-06-04 23:47:34.740993${zone}"]`,
          lo: 9007199254740992n,
          hi: 9007199254740993n,
        },
        {
          text: `["1999-12-31 23:59:59.999999${zone}","2000-01-01 00:00:00${zone}"]`,
          lo: -1n,
          hi: 0n,
        },
        { text: '[-infinity,infinity]', lo: -9223372036854775808n, hi: 9223372036854775807n },
      ]
      for (const sample of samples) {
        const payload = await readRangeFixture(pg, `SELECT $1::${type} span`, 'span', type, [
          sample.text,
        ])
        const kind = type === 'pg_catalog.tstzrange' ? 'Timestamptz' : 'Timestamp'
        expect(payload!.bounds).toEqual([
          { kind, value: sample.lo },
          { kind, value: sample.hi },
        ])
        const metadata = PG18_RANGE_TYPES[type]
        const multi = await readMultirangeFixture(pg, metadata.multirange, `{${sample.text}}`)
        expect(multi!.ranges).toEqual([{ kind: 'Value', value: payload }])
      }
    }
  } finally {
    await pg.close()
  }
}, 30_000)
