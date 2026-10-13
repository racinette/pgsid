import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
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
    '294276-12-31',
    '294277-01-01',
    '400000-01-01',
    null,
  ],
  time: [
    '00:00',
    '00:00:00.0000005',
    '00:00:00.0000015',
    '12:34:56.123456',
    '23:59:59.999999',
    '24:00',
    null,
  ],
  timetz: ['00:00+15:59:59', '12:34:56.123456-05:30', '23:59:59.999999+02', '24:00+00', null],
  timestamp: [
    '-infinity',
    'infinity',
    '1999-12-31 23:59:59.999999',
    '2000-01-01 00:00:00',
    '2000-01-01 24:00',
    '294276-12-31 23:59:59.999999',
    null,
  ],
  interval: [
    '0',
    '1 month',
    '1 month -30 days',
    '9223372036854.775807 seconds',
    'infinity',
    '-infinity',
    null,
  ],
  int4: [-2147483648, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 9, 2147483647, null],
}

describe('clock precision and scalar constructors', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-clock-constructors-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('matches catalog calls, operators and casts in raw/stored CHECKs, including rounding, bounds and lazy errors', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/time_constructors.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(11)
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
    const aliases: Record<string, { sql: string; fn: string; precision?: number }> = {
      timestamp_to_clock: {
        sql: 'time_send(arg0_timestamp::time) = expected',
        fn: 'sql__pg_catalog__time__3gc2',
      },
      date_plus_clock: {
        sql: 'timestamp_send(arg0_date + arg1_time) = expected',
        fn: 'sql__pg_catalog__datetime_pl__wora',
      },
      clock_plus_date: {
        sql: 'timestamp_send(arg0_time + arg1_date) = expected',
        fn: 'sql__pg_catalog__timedate_pl__lhsk',
      },
      date_plus_zoned: {
        sql: 'timestamptz_send(arg0_date + arg1_timetz) = expected',
        fn: 'sql__pg_catalog__datetimetz_pl__w8dd',
      },
      zoned_plus_date: {
        sql: 'timestamptz_send(arg0_timetz + arg1_date) = expected',
        fn: 'sql__pg_catalog__timetzdate_pl__1ycq',
      },
    }
    for (const type of ['time', 'timetz'])
      for (const precision of [0, 1, 3, 6, 9])
        aliases[type + '_precision_' + precision] = {
          sql: `${type}_send(arg0_${type}::${type}(${precision})) = expected`,
          fn: functions.find((fn) => fn.name === type && fn.args.length === 2)!.rustName,
          precision: Math.min(precision, 6),
        }
    Object.assign(
      expressions,
      Object.fromEntries(Object.entries(aliases).map(([name, item]) => [name, item.sql])),
    )
    await pg.exec(`CREATE DOMAIN clock_domain AS time;
      CREATE TABLE clock_constructor_checks (${Object.entries(columns)
        .map(([name, type]) => `${name} ${name === 'arg0_time' ? 'clock_domain' : type}`)
        .join(',')},
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'clock_constructor_checks')!
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
      if (fn.name === 'make_time')
        for (const hour of [-1, 0, 1, 23, 24, 25, null])
          for (const minute of [-1, 0, 34, 59, 60, null])
            for (const second of [
              -1,
              -0.0000001,
              -0.0000005,
              -0,
              0,
              5e-324,
              0.0000001,
              0.0000005,
              0.0000015,
              0.0000025,
              59.9999999,
              60,
              60.0000001,
              60.0000005,
              60.1,
              NaN,
              Infinity,
              null,
            ])
              rows.push([hour, minute, second])
      else if (fn.args.length === 2)
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
          expect(code).toBe('22008')
          expected = error(code)
        }
        add(fn.rustName, row, expected)
        add(fn.rustName + '_lazy', row, expected)
        add(fn.rustName + '_lazy', { ...row, skip: value(true) }, { kind: 'True' })
        for (const [name, alias] of Object.entries(aliases))
          if (
            alias.fn === fn.rustName &&
            (alias.precision === undefined || alias.precision === values[1])
          )
            add(name, row, expected)
      }
      const baseline = fixtures.find(
        (fixture) => fixture.name === fn.rustName + '_raw' && fixture.expected.kind === 'True',
      )!.row
      for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, error('22012')] as Input[]) {
        const row = { ...baseline, [argument(fn.args[0]!, 0)]: state }
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
      'clockconstructors',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 240_000)
})
