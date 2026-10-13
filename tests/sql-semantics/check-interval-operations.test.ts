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
const sender = (type: string) => family(type) + '_send'
const samples: Record<string, (string | number | null)[]> = {
  date: [
    '-infinity',
    'infinity',
    '4714-11-24 BC',
    '1999-12-31',
    '2000-01-01',
    '2000-01-31',
    '2000-02-29',
    '294276-12-31',
    '294277-01-01',
    '400000-01-01',
    null,
  ],
  timestamp: [
    '-infinity',
    'infinity',
    '4714-11-24 BC',
    '0001-01-31 BC',
    '0001-01-31 AD',
    '1900-01-31 12:34:56.123456',
    '1900-02-28',
    '1999-12-31 23:59:59.999999',
    '2000-01-01 00:00:00',
    '2000-01-31 12:34:56.123456',
    '2000-02-29',
    '2001-01-31 12:34:56.123456',
    '2001-02-28',
    '2000-01-01 24:00',
    '294276-12-31 23:59:59.999999',
    null,
  ],
  interval: [
    '0',
    '1 microsecond',
    '-1 microsecond',
    '1 month',
    '-1 month',
    '12 months',
    '-12 months',
    '1 month -30 days',
    '1 month -29 days -1 hour',
    '-1 month 29 days 1 hour',
    '1 day -1 hour',
    '-1 day 1 hour',
    '49 hours',
    '-49 hours',
    '30 days',
    '-30 days',
    '2147483647 months',
    '-2147483648 months',
    '2147483647 days',
    '-2147483648 days',
    '2147483647 days 48 hours',
    '-2147483648 days -48 hours',
    '9223372036854.775807 seconds',
    '-9223372036854.775808 seconds',
    'infinity',
    '-infinity',
    null,
  ],
  float8: [
    -Infinity,
    -1e300,
    -1e10,
    -2,
    -1,
    -0.999999999999,
    -0.5,
    -0.1,
    -0,
    0,
    5e-324,
    1e-300,
    0.0000005,
    0.1,
    0.5,
    1,
    1.000000000001,
    2,
    3,
    30,
    1e10,
    1e300,
    Infinity,
    NaN,
    null,
  ],
  int4: [-2147483648, -2, -1, 0, 1, 6, 65535, 2147483647, null],
}
samples.timestamptz = samples.timestamp!.map((value) =>
  typeof value !== 'string' || value.includes('infinity')
    ? value
    : value.includes(' BC')
      ? value.replace(' BC', ' 00:00+00 BC')
      : value.includes(' AD')
        ? value.replace(' AD', ' 00:00+00 AD')
        : value.includes(':')
          ? value + '+00'
          : value + ' 00:00+00',
)
for (const range of [4, 2, 6, 8, 1024, 1032, 2048, 3080, 3072, 32767, 4096, 7176, 7168, 6144, 123])
  for (const precision of [0, 1, 2, 3, 4, 5, 6, 7, 65535])
    samples.int4!.push(range * 65536 + precision)
let seed = 0x9b53ad21
for (let index = 0; index < 32; index++) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  samples.interval!.push(
    `${index % 2 ? '-' : ''}${seed % 10000} months ${index % 3 ? '-' : ''}${(seed >>> 8) % 1000} days ${index % 5 ? '-' : ''}${seed % 1000000}.${(seed >>> 16) % 1000000} seconds`,
  )
}

describe('interval arithmetic, precision and calendar operations', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-interval-operations-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('matches catalog calls, operators and casts in raw/stored CHECKs, including rounding, bounds and lazy errors', async () => {
    const source = (
      await Promise.all(
        ['interval_math', 'interval_calendar'].map((name) =>
          readFile(`crates/check-evaluator/src/operations/pg_catalog/${name}.rs`, 'utf8'),
        ),
      )
    ).join('\n')
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(16)
    const columns: Record<string, string> = { expected: 'bytea', skip: 'bool' }
    const expressions: Record<string, string> = {}
    for (const fn of functions) {
      fn.args.forEach((type, index) => {
        columns[argument(type, index)] = type
      })
      const call = `pg_catalog."${fn.name}"(${fn.args.map(argument).join(',')})`
      expressions[fn.rustName] =
        fn.result === 'pg_catalog.bool' ? call : `${sender(fn.result)}(${call}) = expected`
      expressions[fn.rustName + '_lazy'] =
        `CASE WHEN skip THEN true ELSE ${expressions[fn.rustName]} END`
    }
    const aliases: Record<string, { sql: string; fn: string; defaults?: boolean }> = {}
    const identities = new Map(functions.map((fn) => [callableIdentity(fn), fn]))
    for (const operator of builtinCallables().filter(
      (fn): fn is OperatorMetadata => fn.kind === 'operator' && identities.has(fn.implementation),
    )) {
      const fn = identities.get(operator.implementation)!
      const operands = operator.args.map(argument)
      aliases['operator_' + fn.rustName] = {
        sql: `${sender(fn.result)}(${operands[0]} OPERATOR(pg_catalog.${operator.name}) ${operands[1]}) = expected`,
        fn: fn.rustName,
      }
    }
    const constructor = functions.find((fn) => fn.name === 'make_interval')!
    aliases.constructor_default = {
      sql: 'interval_send(make_interval(arg0_int4)) = expected',
      fn: constructor.rustName,
      defaults: true,
    }
    Object.assign(
      expressions,
      Object.fromEntries(Object.entries(aliases).map(([name, item]) => [name, item.sql])),
    )
    await pg.exec(`CREATE DOMAIN span_domain AS interval;
      CREATE TABLE interval_operation_checks (${Object.entries(columns)
        .map(([name, type]) => `${name} ${name === 'arg0_interval' ? 'span_domain' : type}`)
        .join(',')},
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'interval_operation_checks')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK (${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => ({
        expression: lowerTableCheck(table, constraint, [], catalog.domains)!.expression,
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
    const inputs = new Map<string, Input>()
    const decode = async (type: string, text: string | number | null): Promise<Input> => {
      const key = type + ':' + text
      if (inputs.has(key)) return inputs.get(key)!
      let input: Input
      const name = family(type)
      if (text === null || name === 'int4') input = value(text)
      else if (name === 'float8') {
        const bytes = Buffer.alloc(8)
        bytes.writeDoubleBE(Number(text))
        input = value(bytes.readBigInt64BE())
      } else {
        const wire = (
          await pg.query<{ wire: string }>(
            `SELECT encode(${sender(type)}($1::${type}),'hex') wire`,
            [text],
          )
        ).rows[0]!.wire
        const bytes = Buffer.from(wire, 'hex')
        const time = name === 'date' ? bytes.readInt32BE() : bytes.readBigInt64BE()
        input = value(
          name === 'timetz'
            ? { time: time as bigint, zone: bytes.readInt32BE(8) }
            : name === 'interval'
              ? { time: time as bigint, days: bytes.readInt32BE(8), months: bytes.readInt32BE(12) }
              : time,
        )
      }
      inputs.set(key, input)
      return input
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const fn of functions) {
      const rows: (string | number | null)[][] = []
      if (fn.name === 'make_interval') {
        const numbers = [
          -2147483648,
          -178956971,
          -178956970,
          -306783379,
          -1,
          0,
          1,
          178956970,
          178956971,
          306783378,
          306783379,
          2147483647,
          null,
        ]
        for (let index = 0; index < 7; index++)
          for (const number of index === 6
            ? [
                ...samples.float8!,
                -9223372036854.775808,
                9223372036854.775807,
                -0.0000015,
                0.0000015,
                1e308,
              ]
            : numbers) {
            const row: (string | number | null)[] = [0, 0, 0, 0, 0, 0, 0]
            row[index] = number
            rows.push(row)
          }
        rows.push(
          [178956971, -12, 0, 0, 0, 0, 0],
          [0, 0, 306783379, -7, 0, 0, 0],
          [0, 0, 0, 0, 2147483647, 2147483647, -1e12],
        )
        let seed = 0x9b53ad21
        for (let index = 0; index < 128; index++) {
          const row: number[] = []
          for (let arg = 0; arg < 6; arg++) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
            row.push((seed % 200000001) - 100000000)
          }
          row.push(((seed % 20001) - 10000) / 1000000)
          rows.push(row)
        }
      } else if (fn.args.length === 2)
        for (const left of samples[family(fn.args[0]!)]!)
          for (const right of samples[family(fn.args[1]!)]!) rows.push([left, right])
      else for (const input of samples[family(fn.args[0]!)]!) rows.push([input])
      for (const values of rows) {
        const row: Row = { expected: value(''), skip: value(false) }
        for (const [index, type] of fn.args.entries())
          row[argument(type, index)] = await decode(type, values[index]!)
        const call = `pg_catalog."${fn.name}"(${fn.args.map((type, index) => `$${index + 1}::${type}`).join(',')})`
        let expected: Outcome
        try {
          const result = (
            await pg.query<{ result: boolean | string | null }>(
              `SELECT ${fn.result === 'pg_catalog.bool' ? call : `encode(${sender(fn.result)}(${call}),'hex')`} result`,
              values,
            )
          ).rows[0]!.result
          expected = {
            kind:
              result === null
                ? 'Null'
                : fn.result === 'pg_catalog.bool'
                  ? result
                    ? 'True'
                    : 'False'
                  : 'True',
          }
          if (fn.result !== 'pg_catalog.bool') row.expected = value(result as string | null)
        } catch (caught) {
          const code = (caught as { code: string }).code
          expect(['22008', '22012', '22023', 'XX000', '22003']).toContain(code)
          expected = error(code)
        }
        add(fn.rustName, row, expected)
        add(fn.rustName + '_lazy', row, expected)
        add(fn.rustName + '_lazy', { ...row, skip: value(true) }, { kind: 'True' })
        for (const [name, alias] of Object.entries(aliases))
          if (
            alias.fn === fn.rustName &&
            (!alias.defaults || values.slice(1).every((value) => value === 0))
          )
            add(name, row, expected)
      }
      const baseline = fixtures.find(
        (fixture) => fixture.name === fn.rustName + '_raw' && fixture.expected.kind === 'True',
      )!.row
      for (const [index, type] of fn.args.entries())
        for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, error('22012')] as Input[]) {
          const row = { ...baseline, [argument(type, index)]: state }
          add(fn.rustName, row, state as Outcome)
          add(fn.rustName + '_lazy', { ...row, skip: value(true) }, { kind: 'True' })
        }
      if (fn.args.length > 1)
        add(
          fn.rustName,
          {
            ...baseline,
            [argument(fn.args[0]!, 0)]: { kind: 'Unknown' },
            [argument(fn.args[1]!, 1)]: error('22003'),
          },
          error('22003'),
        )
    }
    await runCheckParity(
      directory,
      'intervaloperations',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 360_000)
})
