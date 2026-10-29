import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { type FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

const value = (value: bigint | string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const bits = (hex: string | null): bigint | null =>
  hex === null ? null : BigInt.asIntN(64, BigInt('0x' + hex))
const samples: (string | null)[] = [
  '0',
  '-0',
  '1',
  '2',
  '3',
  '4',
  '9',
  '0.25',
  '1e-300',
  '5e-324',
  '2.2250738585072014e-308',
  '1.7976931348623157e308',
  '-1',
  '-5e-324',
  'Infinity',
  '-Infinity',
  'NaN',
  '0.7853981633974483',
  '1.5707963267948966',
  '3.141592653589793',
  '-3.141592653589793',
  '4.71238898038469',
  '7.0685834705770345',
  '100',
  '-12345.678',
  '1647099',
  '1647100',
  '2e6',
  '-1e10',
  '0.5',
  '-0.5',
  '0.99',
  '1.5',
  '2',
  '20.5',
  '22',
  '710.5',
  '-710.5',
  '1e10',
  '3.7e-9',
  '1e300',
  '-2',
  '-1.5',
  '-2.5',
  '-170.5',
  '-190.5',
  '1e-310',
  '1.4616321449683622',
  '5.9',
  '6',
  '27.2',
  '28',
  '171.6',
  '172',
  '2.5e305',
  '2.6e305',
  '-4503599627370495.5',
  null,
]
// These functions need no argument reduction, so no finite argument defers.
const reducible = (_name: string, _sample: string | null) => true
let seed = 0x6a09e667f3bcc909n
for (let index = 0; index < 512; index++) {
  seed = BigInt.asUintN(64, seed * 6364136223846793005n + 1442695040888963407n)
  const bytes = Buffer.alloc(8)
  bytes.writeBigUInt64BE(seed)
  const number = bytes.readDoubleBE()
  if (Number.isFinite(number)) samples.push(String(number))
}
// Random bit patterns are mostly huge or tiny, so moderate magnitudes exercise every reduction path.
for (let index = 0; index < 256; index++) {
  seed = BigInt.asUintN(64, seed * 6364136223846793005n + 1442695040888963407n)
  const unit = Number(seed >> 11n) / 2 ** 53
  samples.push(String((unit * 2 - 1) * [1, 10, 1e3, 1.6e6][index % 4]!))
}

describe('float8 error and gamma functions under the declared musl math library', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-float-error-function-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches exact float8 bits, signed zero, reduction boundaries, infinities, NaNs and lazy branches in raw/stored CHECKs', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/float_error_function.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' &&
        fn.args.length === 1 &&
        source.includes('pub fn ' + fn.rustName + '('),
    )
    expect(functions).toHaveLength(4)
    const expressions: Record<string, string> = {}
    for (const fn of functions) {
      expect(fn).toMatchObject({
        args: ['pg_catalog.float8'],
        result: 'pg_catalog.float8',
        strict: true,
        volatility: 'i',
      })
      expressions[fn.rustName] = `pg_catalog.${fn.name}(input_value) = recorded_value`
      expressions[fn.rustName + '_wire'] =
        `float8send(pg_catalog.${fn.name}(input_value)) = recorded_wire`
      expressions[fn.rustName + '_lazy'] =
        `CASE WHEN skip THEN true ELSE ${expressions[fn.rustName + '_wire']} END`
    }
    const wire = async (sql: string) =>
      (await pg.query<{ wire: string }>(`SELECT encode(float8send(${sql}),'hex') wire`)).rows[0]!
        .wire
    expressions.literal_error_function = `float8send(lgamma('0.25'::float8)) = '\\x${await wire("lgamma('0.25'::float8)")}'::bytea AND gamma('5'::float8) = 24::float8 AND erfc('Infinity'::float8) = 0::float8`
    expressions.literal_lazy_error =
      "CASE WHEN true THEN true ELSE gamma('0'::float8) > 0::float8 END"
    await pg.exec(
      `CREATE TABLE error_function_checks(input_value float8, recorded_value float8, recorded_wire bytea, skip bool,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((table) => table.name === 'error_function_checks')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK (${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const checks = constraints.map((constraint) => {
      const expression = lowerTableCheck(table, constraint, [], catalog.domains)!.expression
      expect(expression.kind, constraint.name).not.toBe('uncertain')
      return {
        expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      }
    })
    const group = prepareCheckRustGroup(checks, { mathLibrary: 'musl' })
    expect(prepareCheckRustGroup(checks).evaluatorSource).toMatch(
      /sql__pg_catalog__lgamma__rpzb\([^()]*, false\)/u,
    )
    for (const [index, check] of group.checks.entries())
      expect(check.kind, constraints[index]!.name).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const suffix of ['raw', 'stored'])
        fixtures.push({ name: name + '_' + suffix, row, expected })
    }
    for (const fn of functions)
      for (const sample of samples) {
        const input = (
          await pg.query<{ wire: string | null }>(
            "SELECT encode(float8send($1::float8),'hex') wire",
            [sample],
          )
        ).rows[0]!.wire
        let wire: string | null = '',
          expected: Outcome
        try {
          wire = (
            await pg.query<{ wire: string | null }>(
              `SELECT encode(float8send(pg_catalog.${fn.name}($1::float8)),'hex') wire`,
              [sample],
            )
          ).rows[0]!.wire
          expected = { kind: wire === null ? 'Null' : 'True' }
        } catch (caught) {
          const code = (caught as { code: string }).code
          expect(code).toBe('22003')
          expected = error(code)
        }
        const row: Row = {
          input_value: value(bits(input)),
          recorded_value: value(bits(wire || null)),
          recorded_wire: value(wire),
          skip: value(false),
        }
        const nanWire =
          wire !== null &&
          wire.length === 16 &&
          Number.isNaN(Buffer.from(wire, 'hex').readDoubleBE())
        for (const name of [fn.rustName, fn.rustName + '_wire', fn.rustName + '_lazy'])
          add(
            name,
            row,
            (nanWire && name !== fn.rustName) || !reducible(fn.name, sample)
              ? { kind: 'Unknown' }
              : expected,
          )
        if (expected.kind === 'True' && reducible(fn.name, sample)) {
          const wrong: Row = {
            ...row,
            recorded_value: value(
              wire === '0000000000000000' || wire === '8000000000000000'
                ? 4607182418800017408n
                : 0n,
            ),
            recorded_wire: value('00'),
          }
          for (const name of [fn.rustName, fn.rustName + '_wire'])
            add(name, wrong, { kind: 'False' })
        }
        add(fn.rustName + '_lazy', { ...row, skip: value(true) }, { kind: 'True' })
      }
    for (const fn of functions)
      for (const state of [{ kind: 'Null' }, { kind: 'Unknown' }, error('22012')] as Input[]) {
        const row: Row = {
          input_value: state,
          recorded_value: value(0n),
          recorded_wire: value(''),
          skip: value(false),
        }
        add(fn.rustName, row, state as Outcome)
        add(fn.rustName + '_wire', row, state as Outcome)
        add(fn.rustName + '_lazy', { ...row, skip: value(true) }, { kind: 'True' })
        add(
          fn.rustName,
          { ...row, recorded_value: error('22003') },
          state.kind === 'Unknown'
            ? { kind: 'Unknown' }
            : state.kind === 'Error'
              ? state
              : error('22003'),
        )
      }
    for (const fn of functions) {
      add(
        fn.rustName,
        { input_value: value(0x4010000000000000n), recorded_value: error('22003') },
        error('22003'),
      )
      add(
        fn.rustName,
        { input_value: value(-4616189618054758400n), recorded_value: error('22003') },
        error('22003'),
      )
      for (const input of [4, -1, null])
        await expect(
          pg.query(
            `WITH candidate AS MATERIALIZED (SELECT $1::float8 input_value,1::integer amount,0::integer divisor)
             SELECT pg_catalog.${fn.name}(input_value) = (amount/divisor)::float8 FROM candidate`,
            [input],
          ),
        ).rejects.toMatchObject({
          code: input === -1 && fn.name.endsWith('gamma') ? '22003' : '22012',
        })
    }
    add('literal_error_function', {}, { kind: 'True' })
    add('literal_lazy_error', {}, { kind: 'True' })
    await runCheckParity(
      directory,
      'floaterrorfunction',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 300_000)
})
