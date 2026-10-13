import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  callableIdentity,
  type FunctionMetadata,
  type OperatorMetadata,
} from '../../src/postgres/builtins/catalog.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const family = (type: string) => type.replace('pg_catalog.', '').replaceAll('"', '')
const argument = (type: string, index: number) => `arg${index}_${family(type)}`
const value = (value: Extract<Input, { kind: 'Value' }>['value'] | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const sender = (type: string) =>
  ['int4', 'int8', 'float8', 'bool'].includes(family(type))
    ? family(type) + 'send'
    : family(type) + '_send'
const overlapSamples: Record<string, (string | null)[]> = {
  time: ['00:00', '00:00:00.000001', '12:00', '18:00', '23:59:59.999999', '24:00', null],
  timetz: [
    '00:00+15:59:59',
    '12:00+02',
    '11:00+01',
    '24:00+00',
    "timezone(interval '2147483648 seconds',timetz '12:00+02')",
    "timezone(interval '2147483647 seconds',timetz '00:00-15:59:59')",
    null,
  ],
  timestamp: [
    '-infinity',
    'infinity',
    '4714-11-24 BC',
    '2000-01-31 12:00',
    '2000-02-29 12:00',
    '294276-12-31 23:59:59.999999',
    null,
  ],
  timestamptz: [
    '-infinity',
    'infinity',
    '4714-11-24 00:00+00 BC',
    '2000-01-31 12:00+00',
    '2000-02-29 12:00+00',
    '294276-12-31 23:59:59.999999+00',
    null,
  ],
  interval: [
    '0',
    '1 microsecond',
    '-1 microsecond',
    '1 day',
    '1 month',
    '1 month -30 days',
    '-24 hours',
    '-2147483648 months',
    '2147483647 days',
    '9223372036854.775807 seconds',
    'infinity',
    '-infinity',
    null,
  ],
}
const calendarSamples: Record<string, (string | null)[]> = {
  timestamptz: [
    '-infinity',
    'infinity',
    '4714-11-24 00:00+00 BC',
    '4714-11-24 23:59:59.999999+00 BC',
    '0001-01-31 12:00+00 BC',
    '0001-01-31 12:00+00 AD',
    '1900-01-31 12:34:56.123456+00',
    '2000-02-29 12:00+00',
    '2024-02-10 07:30+00',
    '2024-03-09 07:30+00',
    '2024-03-10 06:59:59.999999+00',
    '2024-03-10 07:00+00',
    '2024-10-03 05:30+00',
    '2024-11-02 05:30+00',
    '2024-11-03 05:30+00',
    '2024-11-03 06:30+00',
    '2011-11-30 10:30+00',
    '2011-12-29 10:30+00',
    '2050-03-12 07:30+00',
    '2500-03-13 07:30+00',
    '294276-12-31 00:00+00',
    '294276-12-31 23:59:59.999999+00',
    null,
  ],
  interval: [
    '0',
    '1 microsecond',
    '-1 microsecond',
    '1 day',
    '-1 day',
    '24 hours',
    '-24 hours',
    '1 month',
    '-1 month',
    '1 month 1 day',
    '1 month -1 day',
    '1 month 30 days',
    '-1 month 1 day',
    '1 month -30 days -1 hour',
    '-1 month 29 days 1 hour',
    '12 months',
    '2147483647 months',
    '-2147483648 months',
    '2147483647 days',
    '-2147483648 days',
    '9223372036854.775807 seconds',
    '-9223372036854.775808 seconds',
    'infinity',
    '-infinity',
    null,
  ],
  text: [
    'UTC',
    'gmt',
    '+01',
    '-01',
    'UTC+167',
    'UTC-167',
    'UTC+168',
    'UTC+01:02:03',
    'America/New_York',
    'Europe/Berlin',
    'Australia/Lord_Howe',
    'Pacific/Apia',
    'Asia/Kathmandu',
    'Etc/GMT+12',
    'Europe/Amsterdam',
    'America/St_Johns',
    null,
  ],
}
const sampleSql = (type: string, raw: string | null): string =>
  raw === null
    ? `NULL::${type}`
    : type === 'pg_catalog.timetz' && raw.startsWith('timezone(')
      ? raw
      : `'${raw.replaceAll("'", "''")}'::${type}`

const combinations = (fn: FunctionMetadata): (string | null)[][] => {
  const samples = fn.name === 'overlaps' ? overlapSamples : calendarSamples
  return fn.args.reduce<(string | null)[][]>(
    (rows, type) => rows.flatMap((row) => samples[family(type)]!.map((item) => [...row, item])),
    [[]],
  )
}

describe('explicit-zone calendar arithmetic and non-strict temporal overlaps', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-temporal-next-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('matches catalog calls and operators through raw/stored CHECKs, exact wire output, partial values and lazy errors', async () => {
    const source = (
      await Promise.all(
        ['timezone_calendar', 'temporal_overlaps'].map((name) =>
          readFile(`crates/check-evaluator/src/operations/pg_catalog/${name}.rs`, 'utf8'),
        ),
      )
    ).join('\n')
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(12)
    const columns: Record<string, string> = { expected: 'bytea', skip: 'bool' }
    const expressions: Record<string, string> = {}
    for (const fn of functions) {
      fn.args.forEach((type, index) => {
        columns[argument(type, index)] = type
      })
      expressions[fn.rustName] =
        `${sender(fn.result)}(pg_catalog."${fn.name}"(${fn.args.map(argument).join(',')})) = expected`
      expressions[fn.rustName + '_lazy'] =
        `CASE WHEN skip THEN true ELSE ${expressions[fn.rustName]} END`
    }
    expect(functions.filter((fn) => !fn.strict)).toHaveLength(10)
    expect(functions.every((fn) => fn.volatility === 'i')).toBe(true)
    const literalCases: Record<string, { sql: string; expected: Outcome }> = {
      literal_known_overlap: {
        sql: "(TIME '10:00',NULL::time) OVERLAPS (TIME '09:00',TIME '11:00')",
        expected: { kind: 'True' },
      },
      literal_indeterminate_overlap: {
        sql: "(TIME '09:00',NULL::time) OVERLAPS (TIME '10:00',TIME '12:00')",
        expected: { kind: 'Null' },
      },
      literal_missing_period: {
        sql: "(TIME '09:00',TIME '12:00') OVERLAPS (NULL::time,NULL::time)",
        expected: { kind: 'Null' },
      },
      literal_touching_periods: {
        sql: "(TIME '09:00',TIME '10:00') OVERLAPS (TIME '10:00',TIME '11:00')",
        expected: { kind: 'False' },
      },
      literal_offset_tie: {
        sql: "(TIMETZ '12:00+02',TIMETZ '12:00+02') OVERLAPS (TIMETZ '11:00+01',TIMETZ '11:00+01')",
        expected: { kind: 'False' },
      },
      literal_infinite_points: {
        sql: "(TIMESTAMP 'infinity',TIMESTAMP 'infinity') OVERLAPS (TIMESTAMP 'infinity',TIMESTAMP 'infinity')",
        expected: { kind: 'True' },
      },
    }
    for (const [name, { sql }] of Object.entries(literalCases)) expressions[name] = sql
    const identities = new Map(functions.map((fn) => [callableIdentity(fn), fn]))
    const aliases: Record<string, { sql: string; fn: string }> = {}
    for (const operator of builtinCallables().filter(
      (fn): fn is OperatorMetadata => fn.kind === 'operator' && identities.has(fn.implementation),
    )) {
      const fn = identities.get(operator.implementation)!
      const operands = operator.args.map(argument)
      aliases['operator_' + fn.rustName] = {
        fn: fn.rustName,
        sql: `${sender(fn.result)}(${operands[0]} OPERATOR(pg_catalog.${operator.name}) ${operands[1]}) = expected`,
      }
    }
    Object.assign(
      expressions,
      Object.fromEntries(Object.entries(aliases).map(([name, item]) => [name, item.sql])),
    )
    await pg.exec(
      `CREATE DOMAIN clock_field_domain AS time; CREATE TABLE temporal_function_checks (${Object.entries(
        columns,
      )
        .map(([name, type]) => `${name} ${name === 'arg0_time' ? 'clock_field_domain' : type}`)
        .join(',')}, ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((table) => table.name === 'temporal_function_checks')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK (${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => ({
        expression: (() => {
          const expression = lowerTableCheck(table, constraint, [], catalog.domains)!.expression
          expect(expression.kind, constraint.name).not.toBe('uncertain')
          return expression
        })(),
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      })),
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, constraints[index]!.name).toBe('supported')
    const decoded = new Map<string, Input>()
    const decode = async (type: string, raw: string | null): Promise<Input> => {
      const key = type + ':' + raw
      if (decoded.has(key)) return decoded.get(key)!
      let input: Input
      if (raw === null) input = value(null)
      else if (family(type) === 'bool') input = value(raw === 'true')
      else if (family(type) === 'text') input = value(raw)
      else if (family(type) === 'int8') input = value(BigInt(raw))
      else {
        const wire = (
          await pg.query<{ wire: string }>(
            `SELECT encode(${sender(type)}(${sampleSql(type, raw)}),'hex') wire`,
          )
        ).rows[0]!.wire
        const bytes = Buffer.from(wire, 'hex'),
          time = family(type) === 'date' ? 0n : bytes.readBigInt64BE()
        input = value(
          family(type) === 'date'
            ? bytes.readInt32BE()
            : family(type) === 'timetz'
              ? { time, zone: bytes.readInt32BE(8) }
              : family(type) === 'interval'
                ? { time, days: bytes.readInt32BE(8), months: bytes.readInt32BE(12) }
                : time,
        )
      }
      decoded.set(key, input)
      return input
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const [name, { sql, expected }] of Object.entries(literalCases)) {
      const result = (await pg.query<{ value: boolean | null }>(`SELECT ${sql} AS value`)).rows[0]!
        .value
      expect(result, name).toBe(expected.kind === 'Null' ? null : expected.kind === 'True')
      add(name, {}, expected)
    }
    for (const fn of functions) {
      let baseline: Row | undefined
      let baselineArgs: (string | null)[] | undefined
      for (const args of combinations(fn)) {
        const row: Row = { skip: value(false) }
        for (const [index, type] of fn.args.entries())
          row[argument(type, index)] = await decode(type, args[index]!)
        let expected: Outcome
        try {
          const wire = (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(${sender(fn.result)}(pg_catalog."${fn.name}"(${fn.args.map((type, index) => sampleSql(type, args[index]!)).join(',')})),'hex') wire`,
            )
          ).rows[0]!.wire
          row.expected = value(wire)
          expected = { kind: wire === null ? 'Null' : 'True' }
        } catch (caught) {
          const code = (caught as { code: string }).code
          expect(['22008', '22013', '22023', '0A000']).toContain(code)
          row.expected = value('')
          expected = error(code)
        }
        if (!baseline && expected.kind === 'True') {
          baseline = row
          baselineArgs = args
        }
        add(fn.rustName, row, expected)
        add(fn.rustName + '_lazy', row, expected)
        if (expected.kind === 'Error')
          add(fn.rustName + '_lazy', { ...row, skip: value(true) }, { kind: 'True' })
        for (const [name, alias] of Object.entries(aliases))
          if (alias.fn === fn.rustName) add(name, row, expected)
      }
      expect(baseline).toBeDefined()
      for (const [index, type] of fn.args.entries()) {
        for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, error('22012')] as Input[]) {
          const row = { ...baseline!, [argument(type, index)]: state }
          let expected = state as Outcome
          if (state.kind === 'Null' && !fn.strict) {
            const wire = (
              await pg.query<{ wire: string | null }>(
                `SELECT encode(${sender(fn.result)}(pg_catalog."${fn.name}"(${fn.args.map((argType, argIndex) => sampleSql(argType, argIndex === index ? null : baselineArgs![argIndex]!)).join(',')})),'hex') wire`,
              )
            ).rows[0]!.wire
            expect(baseline!.expected!.kind).toBe('Value')
            expected = {
              kind:
                wire === null
                  ? 'Null'
                  : wire === (baseline!.expected as Extract<Input, { kind: 'Value' }>).value
                    ? 'True'
                    : 'False',
            }
          }
          add(fn.rustName, row, expected)
          add(fn.rustName + '_lazy', { ...row, skip: value(true) }, { kind: 'True' })
        }
        for (const other of [{ kind: 'Unknown' }, { kind: 'Null' }] as Input[])
          if (fn.args.length > 1) {
            const next = (index + 1) % fn.args.length
            add(
              fn.rustName,
              {
                ...baseline!,
                [argument(type, index)]: other,
                [argument(fn.args[next]!, next)]: error('22003'),
              },
              error('22003'),
            )
          }
      }
    }
    await runCheckParity(
      directory,
      'temporalnext',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 900_000)
})
