import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PGlite } from '@electric-sql/pglite'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  callableIdentity,
  type FunctionMetadata,
  type OperatorMetadata,
} from '../../src/postgres/builtins/catalog.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
const source = readFileSync(
  'crates/check-evaluator/src/operations/pg_catalog/temporal_extract.rs',
  'utf8',
)
const unitsSource = readFileSync(
  'crates/check-evaluator/src/operations/pg_catalog/temporal_fields.rs',
  'utf8',
)
const names = new Set(
  [...source.matchAll(/pub fn (sql__[a-z0-9_]+)\(/gu)].map((match) => match[1]!),
)
const callables = builtinCallables().filter(
  (fn): fn is FunctionMetadata => fn.kind === 'function' && names.has(fn.rustName),
)
const short = (type: string) => type.replace('pg_catalog.', '').replaceAll('"', '')
const argument = (index: number, type: string) => `arg${index}_${short(type)}`
const recorded = (type: string) => `recorded_${short(type)}`
const columns: Record<string, string> = { skip: 'boolean' }
const expressions: Record<string, string> = {}
for (const fn of callables) {
  fn.args.forEach((type, index) => (columns[argument(index, type)] = type))
  columns[recorded(fn.result)] = fn.result
  expressions[fn.rustName] =
    `pg_catalog.${fn.name}(${fn.args.map((type, index) => argument(index, type)).join(',')}) = ${recorded(fn.result)}`
}
const identities = new Map(callables.map((fn) => [callableIdentity(fn), fn]))
for (const op of builtinCallables().filter(
  (fn): fn is OperatorMetadata => fn.kind === 'operator' && identities.has(fn.implementation),
)) {
  const fn = identities.get(op.implementation)!
  const args = op.args.map((type, index) => argument(index, type))
  expressions['operator_' + fn.rustName] =
    `(${args[0]} OPERATOR(pg_catalog.${op.name}) ${args[1]}) = ${recorded(fn.result)}`
}
const big = (type: string) =>
  ['pg_catalog.int8', 'pg_catalog."timestamp"', 'pg_catalog.timestamptz'].includes(type)
const input = (value: number | bigint | boolean | string | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const decode = (type: string, value: string | null): Input =>
  value === null
    ? input(null)
    : input(
        ['pg_catalog.text', 'pg_catalog."numeric"'].includes(type)
          ? value
          : type === 'pg_catalog.bool'
            ? value === 'true'
            : big(type)
              ? BigInt(value)
              : Number(value),
      )
const defaults = (): Row =>
  Object.fromEntries(
    Object.entries(columns).map(([name, type]) => [
      name,
      input(
        type === 'boolean' || type === 'pg_catalog.bool'
          ? false
          : type === 'pg_catalog.text'
            ? 'year'
            : type === 'pg_catalog."numeric"'
              ? '0'
              : big(type)
                ? 0n
                : 0,
      ),
    ]),
  )
describe('date field extraction CHECKs', () => {
  it('matches raw and stored expressions, aliases and states', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pgsid-temporal-prototype-'))
    let pg = await PGlite.create()
    try {
      await pg.exec(
        `SET TimeZone='UTC'; CREATE TABLE temporal_function_checks (${Object.entries(columns)
          .map(([name, type]) => `"${name}" ${type}`)
          .join(',')},${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
          .join(',')})`,
      )
      const catalog = await snapshotCatalog(pg)
      const table = catalog.tables.find((table) => table.name === 'temporal_function_checks')!
      const prepared = Object.entries(expressions).flatMap(([name, sql]) =>
        ['raw', 'stored'].map((form) => {
          const plan = lowerTableCheck(
            table,
            form === 'stored'
              ? table.constraints.find((check) => check.name === name)!
              : { name, type: 'check', definition: `CHECK (${sql})` },
            [],
            catalog.domains,
          )!
          expect(plan.expression.kind, name + '_' + form).not.toBe('uncertain')
          return {
            expression: plan.expression,
            identity: {
              schema: 'public',
              kind: 'table' as const,
              owner: table.name,
              constraint: name + '_' + form,
            },
          }
        }),
      )
      expect(callables).toHaveLength(1)
      const group = prepareCheckRustGroup(prepared)
      for (const check of group.checks) expect(check.kind).toBe('supported')
      const tokens = /const TEMPORAL_UNIT_KEYS[^=]*= &\[([\s\S]*?)\];/u.exec(unitsSource)![1]!
      const keys = [...tokens.matchAll(/"([^"]*)"/gu)].map((match) => match[1]!)
      expect(keys).toHaveLength(61)
      const units = [
        ...keys,
        ...keys.map((key) => key.toUpperCase()),
        ...[
          'dow',
          'doy',
          'epoch',
          'isodow',
          'isoyear',
          'j',
          'jd',
          'julian',
          'mm',
          '+infinity',
          '-infinity',
          'allballs',
          'infinity',
          'now',
          'today',
          'tomorrow',
          'yesterday',
        ],
        'microseconds',
        'microsecondsextra',
        'millisecondsextra',
        'timezone_hour',
        'timezone_minute',
        'epoch',
        'dow',
        'isoyear',
        'year ',
        ' year',
        '',
        'bogus',
        'millenniaX',
        null,
      ]
      const timestamps = [
        '-infinity',
        'infinity',
        '4714-11-24 BC',
        '4001-03-01 BC',
        '1001-03-01 BC',
        '0101-03-01 BC',
        '0011-03-01 BC',
        '0010-03-01 BC',
        '0002-03-01 BC',
        '0001-03-01 BC',
        '0001-03-01',
        '0010-03-01',
        '0100-03-01',
        '1000-03-01',
        '1999-12-31',
        '2000-01-01',
        '2000-01-02',
        '2000-02-29',
        '2019-12-30',
        '2020-01-01',
        '2021-01-01',
        '2024-02-29',
        '5874897-12-31',
        null,
      ]
      const decodeWire = (value: string | null) =>
        value === null ? null : BigInt.asIntN(32, BigInt('0x' + value)).toString()
      const encoded = new Map<string | null, string | null>()
      for (const timestamp of timestamps)
        encoded.set(
          timestamp,
          decodeWire(
            (
              await pg.query<{ value: string | null }>(
                "SELECT encode(date_send($1::date),'hex') value",
                [timestamp],
              )
            ).rows[0]!.value,
          ),
        )
      const oracle: {
        rustName: string
        args: readonly string[]
        result: string
        inputs: (string | null)[]
        output: string | null
        error?: string
      }[] = []
      for (const unit of units)
        for (const timestamp of timestamps) {
          if (oracle.length > 0 && oracle.length % 500 === 0) {
            await pg.close()
            pg = await PGlite.create()
          }
          let output: string | null = null
          let error: string | undefined
          try {
            output = (
              await pg.query<{ value: string | null }>(
                'SELECT pg_catalog.extract($1::text,$2::date)::text value',
                [unit, timestamp],
              )
            ).rows[0]!.value
          } catch (failure) {
            error = (failure as { code: string }).code
            expect(['22008', '22023', '0A000']).toContain(error)
          }
          oracle.push({
            rustName: callables[0]!.rustName,
            args: callables[0]!.args,
            result: callables[0]!.result,
            inputs: [unit, encoded.get(timestamp)!],
            output,
            error,
          })
        }
      expect(oracle).toHaveLength(units.length * timestamps.length)
      const fixtures: { name: string; row: Row; expected: Outcome }[] = []
      const record = (fn: FunctionMetadata, row: Row, expected: Outcome) => {
        const labels = [
          fn.rustName,
          ...(expressions['operator_' + fn.rustName] ? ['operator_' + fn.rustName] : []),
        ]
        for (const name of labels)
          for (const form of ['raw', 'stored'])
            fixtures.push({
              name: name + '_' + form,
              row: { ...row },
              expected,
            })
      }
      for (const test of oracle) {
        const fn = callables.find((fn) => fn.rustName === test.rustName)!
        const row = defaults()
        fn.args.forEach(
          (type, index) => (row[argument(index, type)] = decode(type, test.inputs[index]!)),
        )
        if (test.error) {
          record(fn, row, {
            kind: 'Error',
            value: { state: parseInt(test.error, 36) },
          })
          continue
        }
        if (test.output === null) {
          record(fn, row, { kind: 'Null' })
          continue
        }
        const timestampResult = ['pg_catalog."timestamp"', 'pg_catalog.timestamptz'].includes(
          fn.result,
        )
        const result = test.output
        if (
          !timestampResult ||
          BigInt(result) < 9223371331200000000n ||
          BigInt(result) === 9223372036854775807n
        ) {
          row[recorded(fn.result)] = decode(fn.result, result)
          record(fn, row, { kind: 'True' })
        }
        row[recorded(fn.result)] = decode(
          fn.result,
          result === '0'
            ? '1'
            : fn.result === 'pg_catalog.bool'
              ? result === 'true'
                ? 'false'
                : 'true'
              : '0',
        )
        record(fn, row, { kind: 'False' })
      }
      for (const fn of callables) {
        const row = defaults()
        for (const [index, type] of fn.args.entries()) {
          const name = argument(index, type)
          for (const state of ['Null', 'Unknown'] as const) {
            row[name] = { kind: state }
            record(fn, row, { kind: state })
          }
          row[name] = {
            kind: 'Error',
            value: { state: parseInt('22003', 36) },
          }
          record(fn, row, {
            kind: 'Error',
            value: { state: parseInt('22003', 36) },
          })
          if (index > 0) {
            row[argument(0, fn.args[0]!)] = input(null)
            record(fn, row, {
              kind: 'Error',
              value: { state: parseInt('22003', 36) },
            })
            row[argument(0, fn.args[0]!)] = defaults()[argument(0, fn.args[0]!)]!
          }
          row[name] = defaults()[name]!
        }
      }
      await runCheckParity(
        directory,
        'pgsid-date-extract-checks',
        group,
        Object.keys(expressions).flatMap((name) =>
          ['raw', 'stored'].map((form) => name + '_' + form),
        ),
        fixtures,
      )
    } finally {
      await pg.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 600_000)
})
