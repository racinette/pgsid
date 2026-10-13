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
  ['int4', 'int8', 'float8'].includes(family(type)) ? family(type) + 'send' : family(type) + '_send'
const samples: Record<string, (string | null)[]> = {
  text: [
    'microseconds',
    'milliseconds',
    'second',
    'minute',
    'hour',
    'day',
    'week',
    'month',
    'quarter',
    'year',
    'decade',
    'century',
    'millennium',
    'epoch',
    'timezone',
    'timezone_hour',
    'timezone_minute',
    'dow',
    'isodow',
    'isoyear',
    'doy',
    'julian',
    'now',
    'today',
    'infinity',
    'ago',
    '@',
    'foo',
    '',
    'MICROSECONDS',
    'milliseconds_suffix',
    null,
  ],
  int8: [
    '-9223372036854775808',
    '-4294967296',
    '-1',
    '0',
    '1',
    '4294967295',
    '9223372036854775807',
    null,
  ],
  time: ['00:00', '00:00:00.000001', '12:34:56.123456', '23:59:59.999999', '24:00', null],
  timetz: [
    '00:00+15:59:59',
    '00:00-15:59:59',
    '12:34:56.123456-05:30',
    '23:59:59.999999+02',
    '24:00+00',
    null,
  ],
  interval: [
    '0',
    '1 microsecond',
    '-1 microsecond',
    '1 month',
    '30 days',
    '1 month -30 days',
    '1 year 2 months 3 days 25:01:59.999999',
    '-1 year -2 months -3 days -25:01:59.999999',
    '-11 months',
    '-12 months',
    '-13 months',
    '2147483647 months',
    '-2147483648 months',
    '2147483647 days',
    '-2147483648 days',
    '9223372036854.775807 seconds',
    '-9223372036854.775808 seconds',
    '-2147483648 months -2147483648 days -9223372036854.775808 seconds',
    '2147483647 months 2147483647 days 9223372036854.775807 seconds',
    '106751991 days 14454.775807 seconds',
    '106751991 days 14454.775808 seconds',
    '106751992 days -9223372036854 seconds',
    'infinity',
    '-infinity',
    null,
  ],
  timestamp: [
    '-infinity',
    'infinity',
    '4714-11-24 BC',
    '0001-12-31 23:59:59.999999 BC',
    '0001-01-01 AD',
    '1900-02-28',
    '1900-03-01',
    '1999-12-31 23:59:59.999999',
    '2000-01-01',
    '2000-01-31 12:34:56.123456',
    '2000-02-29 23:59:59.999999',
    '2000-03-01',
    '2000-03-31',
    '2001-01-31',
    '2001-02-28',
    '294276-12-31 23:59:59.999999',
    null,
  ],
}
samples.timestamptz = samples.timestamp!.map((raw) => {
  if (raw === null || raw.includes('infinity')) return raw
  const era = raw.endsWith(' BC') ? ' BC' : raw.endsWith(' AD') ? ' AD' : ''
  const body = era ? raw.slice(0, -era.length) : raw
  return body + (body.includes(':') ? '+00' : ' 00:00+00') + era
})

const combinations = (args: readonly string[]): (string | null)[][] =>
  args.reduce<(string | null)[][]>(
    (rows, type) => rows.flatMap((row) => samples[family(type)]!.map((item) => [...row, item])),
    [[]],
  )

describe('temporal fields, hashes, truncation, bins and calendar age', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-time-functions-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('matches catalog calls and operators through raw/stored CHECKs, exact wire output, partial values and lazy errors', async () => {
    const source = (
      await Promise.all(
        ['temporal_hash', 'clock_extract', 'temporal_bins', 'temporal_age'].map((name) =>
          readFile(`crates/check-evaluator/src/operations/pg_catalog/${name}.rs`, 'utf8'),
        ),
      )
    ).join('\n')
    const unitSource = (
      await Promise.all(
        ['temporal_fields', 'temporal_extract'].map((name) =>
          readFile(`crates/check-evaluator/src/operations/pg_catalog/${name}.rs`, 'utf8'),
        ),
      )
    ).join('\n')
    samples.text = [
      ...new Set([
        ...samples.text!,
        ...[...unitSource.matchAll(/^    "([^"\n]+)",$/gm)].map((match) => match[1]!),
      ]),
    ]
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' && source.includes(`pub fn ${fn.rustName}(`),
    )
    expect(functions).toHaveLength(18)
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
      else if (family(type) === 'text') input = value(raw)
      else if (family(type) === 'int8') input = value(BigInt(raw))
      else {
        const wire = (
          await pg.query<{ wire: string }>(
            `SELECT encode(${sender(type)}($1::${type}),'hex') wire`,
            [raw],
          )
        ).rows[0]!.wire
        const bytes = Buffer.from(wire, 'hex'),
          time = bytes.readBigInt64BE()
        input = value(
          family(type) === 'timetz'
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
    for (const fn of functions) {
      let baseline: Row | undefined
      for (const args of combinations(fn.args)) {
        const row: Row = { skip: value(false) }
        for (const [index, type] of fn.args.entries())
          row[argument(type, index)] = await decode(type, args[index]!)
        let expected: Outcome
        try {
          const wire = (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(${sender(fn.result)}(pg_catalog."${fn.name}"(${fn.args.map((type, index) => `$${index + 1}::${type}`).join(',')})),'hex') wire`,
              args,
            )
          ).rows[0]!.wire
          row.expected = value(wire)
          expected = { kind: wire === null ? 'Null' : 'True' }
        } catch (caught) {
          const code = (caught as { code: string }).code
          expect(['22008', '22023', '0A000']).toContain(code)
          row.expected = value('')
          expected = error(code)
        }
        if (!baseline && expected.kind === 'True') baseline = row
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
          add(fn.rustName, row, state as Outcome)
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
      'temporalfunctions',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 360_000)
})
