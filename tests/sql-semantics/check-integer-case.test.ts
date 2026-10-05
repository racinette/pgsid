import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { catalogScalarType } from '../../src/sql-semantics/catalog-check-binder.js'
import { builtinCast } from '../../src/postgres/builtins/inventory.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import type { EvalExpression } from '../../src/sql-semantics/eval-expressions.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const scalars = {
  small_wide: 'CASE WHEN flag THEN small ELSE wide END',
  wide_small: 'CASE WHEN flag THEN wide ELSE small END',
  small_big: 'CASE WHEN flag THEN small ELSE big END',
  big_small: 'CASE WHEN flag THEN big ELSE small END',
  wide_big: 'CASE WHEN flag THEN wide ELSE big END',
  big_wide: 'CASE WHEN flag THEN big ELSE wide END',
  all_widths: 'CASE WHEN flag THEN small WHEN wide > 0 THEN wide ELSE big END',
  literal_default: 'CASE WHEN flag THEN small ELSE 0 END',
  literal_arm: 'CASE WHEN flag THEN 0 ELSE small END',
  large_literal: 'CASE WHEN flag THEN wide ELSE 2147483648 END',
  exact_literal: 'CASE WHEN flag THEN small ELSE 9007199254740993 END',
  absent_else: 'CASE WHEN flag THEN small END',
  null_arm: 'CASE WHEN flag THEN NULL ELSE small END',
  typed_null: 'CASE WHEN flag THEN small ELSE NULL::bigint END',
  nested: 'CASE WHEN flag THEN CASE WHEN wide > 0 THEN small ELSE wide END ELSE big END',
  simple: 'CASE flag WHEN true THEN small WHEN false THEN wide ELSE big END',
  small_overflow: 'CASE WHEN flag THEN small + small ELSE big END',
  integer_overflow: 'CASE WHEN flag THEN wide + 1 ELSE big END',
  zero_division: 'CASE WHEN flag THEN small / wide ELSE big END',
  narrowed_arm: 'CASE WHEN flag THEN big::smallint ELSE wide END',
} as const
const expressions: Record<string, string> = Object.fromEntries(
  Object.entries(scalars).map(([name, sql]) => [name, `(${sql}) = expected`]),
)
Object.assign(expressions, {
  context_keeps_integer: '(CASE WHEN flag THEN small ELSE 0 END) + 2147483647 = expected',
  case_in_match: 'CASE small WHEN CASE WHEN flag THEN wide ELSE big END THEN true ELSE false END',
})
const value = (value: number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const incoming: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
const base: Row = {
  small: value(7),
  wide: value(3),
  big: value(9007199254740993n),
  flag: value(true),
  expected: value(7n),
}

describe('integer CASE result coercion', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  const operand = (sql: string): EvalExpression => {
    const plan = lowerTableCheck(
      table,
      {
        name: 'probe',
        type: 'check',
        definition: `CHECK ((${sql}) IS NULL)`,
      },
      [],
      catalog.domains,
    )!
    if (plan.expression.kind !== 'eval-scalar' || plan.expression.expression.kind !== 'null-test')
      throw new Error('Expected scalar null test')
    return plan.expression.expression.operand
  }
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-integer-case-'))
    await pg.exec(`CREATE DOMAIN small_stock AS smallint;
      CREATE DOMAIN wide_stock AS integer;
      CREATE DOMAIN big_stock AS bigint;
      CREATE DOMAIN nested_stock AS big_stock;
      CREATE TABLE case_stock (small small_stock, wide wide_stock, big nested_stock, flag bool, expected bigint,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
          .join(',')});`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((item) => item.name === 'case_stock')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('selects the PostgreSQL result type and casts each arm after its original computation', async () => {
    for (const [name, sql] of Object.entries(scalars)) {
      const expression = operand(sql)
      expect(expression.kind, name).toBe('case')
      if (expression.kind !== 'case') throw new Error('Expected CASE')
      const type = (
        await pg.query<{ type: string }>(
          `WITH candidate AS MATERIALIZED (SELECT NULL::smallint small, NULL::integer wide, NULL::bigint big, NULL::bool flag) SELECT pg_typeof(${sql})::text type FROM candidate`,
        )
      ).rows[0]!.type
      expect(expression.type, name).toBe(catalogScalarType(type))
    }
    for (const [name, source, target] of [
      ['small_wide', 'pg_catalog.int2', 'pg_catalog.int4'],
      ['small_big', 'pg_catalog.int2', 'pg_catalog.int8'],
      ['wide_big', 'pg_catalog.int4', 'pg_catalog.int8'],
    ] as const) {
      const expression = operand(scalars[name])
      if (expression.kind !== 'case') throw new Error('Expected CASE')
      const arm = expression.branches[0]!.then
      expect(arm.kind).toBe('call')
      if (arm.kind !== 'call') throw new Error('Expected cast')
      expect(arm.call).toEqual({
        kind: 'cast',
        signature: builtinCast(source, target)!.implementation,
        type: target,
      })
      expect(arm.operands[0]!.kind).toBe('input')
    }
    const expression = operand(scalars.small_overflow)
    if (expression.kind !== 'case') throw new Error('Expected CASE')
    const arm = expression.branches[0]!.then
    if (arm.kind !== 'call' || arm.operands[0]!.kind !== 'call')
      throw new Error('Expected cast after arithmetic')
    expect(arm.call.kind).toBe('cast')
    expect(arm.operands[0]!.call.type).toBe('pg_catalog.int2')
  })

  it('defers unsupported result conversions and incompatible branches', async () => {
    for (const sql of [
      'CASE WHEN flag THEN small ELSE 1.5 END',
      'CASE WHEN flag THEN small ELSE 1::float8 END',
      "CASE WHEN flag THEN small ELSE '7' END",
      'CASE WHEN flag THEN small ELSE abs(1.5) END',
    ]) {
      await pg.query(`SELECT ${sql} FROM case_stock`)
      const plan = lowerTableCheck(
        table,
        { name: 'probe', type: 'check', definition: `CHECK ((${sql}) IS NULL)` },
        [],
        catalog.domains,
      )!
      expect(plan.expression).toEqual({ kind: 'uncertain' })
    }
    const sql = 'CASE WHEN flag THEN small ELSE false END'
    await expect(pg.query(`SELECT ${sql} FROM case_stock`)).rejects.toMatchObject({ code: '42804' })
    expect(
      lowerTableCheck(
        table,
        { name: 'probe', type: 'check', definition: `CHECK ((${sql}) IS NULL)` },
        [],
        catalog.domains,
      )!.expression,
    ).toEqual({ kind: 'uncertain' })
  })

  it('matches raw and stored CHECKs across Rust, Go and TypeScript, including lazy errors and partial inputs', async () => {
    const entries = table.constraints
      .filter((item) => item.type === 'check')
      .flatMap((constraint) => [
        {
          ...constraint,
          name: `raw_${constraint.name}`,
          definition: `CHECK (${expressions[constraint.name]})`,
        },
        { ...constraint, name: `stored_${constraint.name}` },
      ])
    const group = prepareCheckRustGroup(
      entries.map((constraint) => ({
        expression: lowerTableCheck(table, constraint, [], catalog.domains)!.expression,
        identity: {
          schema: table.schema,
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      })),
    )
    expect(group.checks.every((item) => item.kind === 'supported')).toBe(true)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const rows = [
      [-32768, -2147483648, -9223372036854775808n],
      [32767, 2147483647, 9223372036854775807n],
      [7, 0, 9007199254740993n],
      [-7, -3, -9007199254740993n],
      [0, 1, 2147483648n],
      [null, 3, 5n],
      [7, null, 5n],
      [7, 3, null],
      [null, null, null],
    ] as const
    for (const [small, wide, big] of rows)
      for (const flag of [true, false, null])
        for (const [name, sql] of Object.entries(expressions)) {
          for (const expectedValue of [0n, big]) {
            let expected: Outcome
            try {
              const result = (
                await pg.query<{ value: boolean | null }>(
                  `WITH candidate AS MATERIALIZED (SELECT $1::smallint small, $2::integer wide, $3::bigint big, $4::bool flag, $5::bigint expected) SELECT (${sql}) value FROM candidate`,
                  [
                    small,
                    wide,
                    big === null ? null : String(big),
                    flag,
                    expectedValue === null ? null : String(expectedValue),
                  ],
                )
              ).rows[0]!.value
              expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
            } catch (error) {
              const code = (error as { code: string }).code
              expect(['22003', '22012']).toContain(code)
              expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
            }
            for (const prefix of ['raw', 'stored'])
              fixtures.push({
                name: `${prefix}_${name}`,
                row: {
                  small: value(small),
                  wide: value(wide),
                  big: value(big),
                  flag: value(flag),
                  expected: value(expectedValue),
                },
                expected,
              })
          }
        }
    for (const prefix of ['raw', 'stored']) {
      for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, incoming] as Input[]) {
        fixtures.push(
          {
            name: `${prefix}_small_big`,
            row: { ...base, small: state },
            expected: state as Outcome,
          },
          { name: `${prefix}_small_big`, row: { ...base, big: state }, expected: { kind: 'True' } },
          {
            name: `${prefix}_wide_big`,
            row: { ...base, flag: value(false), wide: state, expected: base.big! },
            expected: { kind: 'True' },
          },
        )
      }
      fixtures.push(
        {
          name: `${prefix}_small_big`,
          row: { ...base, flag: { kind: 'Unknown' } },
          expected: { kind: 'Unknown' },
        },
        { name: `${prefix}_small_big`, row: { ...base, flag: incoming }, expected: incoming },
        {
          name: `${prefix}_small_big`,
          row: { ...base, flag: value(null), small: incoming, expected: base.big! },
          expected: { kind: 'True' },
        },
        {
          name: `${prefix}_small_overflow`,
          row: { ...base, flag: value(false), small: value(32767), expected: base.big! },
          expected: { kind: 'True' },
        },
        {
          name: `${prefix}_small_overflow`,
          row: { ...base, small: value(32767), expected: value(null) },
          expected: incoming,
        },
        {
          name: `${prefix}_integer_overflow`,
          row: { ...base, wide: value(2147483647), expected: value(null) },
          expected: incoming,
        },
        {
          name: `${prefix}_zero_division`,
          row: { ...base, flag: value(false), wide: value(0), expected: base.big! },
          expected: { kind: 'True' },
        },
      )
    }
    await runCheckParity(
      directory,
      'integercase',
      group,
      entries.map((item) => item.name),
      fixtures,
    )
  }, 120_000)
})
