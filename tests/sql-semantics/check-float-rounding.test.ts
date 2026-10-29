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
  '0.5',
  '-0.5',
  '1.5',
  '2.5',
  '-2.5',
  '0.49999999999999994',
  '4503599627370495.5',
  '4503599627370496',
  '-4503599627370495.5',
  '123.456',
  '-1e-300',
  null,
]
let seed = 0x6a09e667f3bcc909n
for (let index = 0; index < 512; index++) {
  seed = BigInt.asUintN(64, seed * 6364136223846793005n + 1442695040888963407n)
  const bytes = Buffer.alloc(8)
  bytes.writeBigUInt64BE(seed)
  const number = bytes.readDoubleBE()
  if (Number.isFinite(number)) samples.push(String(number))
}

describe('float8 rounding, sign and angle conversion functions', () => {
  let pg: PGlite
  let directory: string
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-float-rounding-'))
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  it('matches exact float8 bits, signed zero, halfway cases, infinities, NaNs, overflow and lazy branches in raw/stored CHECKs', async () => {
    const source = await readFile(
      'crates/check-evaluator/src/operations/pg_catalog/float_rounding.rs',
      'utf8',
    )
    const functions = builtinCallables().filter(
      (fn): fn is FunctionMetadata =>
        fn.kind === 'function' &&
        fn.args.length === 1 &&
        source.includes('pub fn ' + fn.rustName + '('),
    )
    expect(functions).toHaveLength(10)
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
    expressions.pi_wire = "float8send(pi()) = '\\x400921fb54442d18'::bytea"
    expressions.literal_halfway =
      "round('2.5'::float8) = 2::float8 AND float8send(round('-0.5'::float8)) = '\\x8000000000000000'::bytea"
    expressions.literal_lazy_error =
      "CASE WHEN true THEN true ELSE degrees('1e308'::float8) > 0::float8 END"
    await pg.exec(
      `CREATE TABLE rounding_checks(input_value float8, recorded_value float8, recorded_wire bytea, skip bool,${Object.entries(
        expressions,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')})`,
    )
    const catalog = await snapshotCatalog(pg),
      table = catalog.tables.find((table) => table.name === 'rounding_checks')!
    const constraints = Object.entries(expressions).flatMap(([name, sql]) => {
      const stored = table.constraints.find((constraint) => constraint.name === name)!
      return [
        { ...stored, name: name + '_raw', definition: `CHECK (${sql})` },
        { ...stored, name: name + '_stored' },
      ]
    })
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => {
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
      }),
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
          expect((caught as { code: string }).code).toBe('22003')
          expected = error('22003')
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
          add(name, row, nanWire && name !== fn.rustName ? { kind: 'Unknown' } : expected)
        if (expected.kind === 'True') {
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
        ).rejects.toMatchObject({ code: '22012' })
    }
    add('pi_wire', {}, { kind: 'True' })
    add('literal_halfway', {}, { kind: 'True' })
    add('literal_lazy_error', {}, { kind: 'True' })
    await runCheckParity(
      directory,
      'floatrounding',
      group,
      constraints.map((constraint) => constraint.name),
      fixtures,
    )
  }, 300_000)
})
