import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { catalogScalarType } from '../../src/sql-semantics/catalog-check-binder.js'
import { builtinCast, operatorMetadata } from '../../src/postgres/builtins/inventory.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import type { EvalExpression } from '../../src/sql-semantics/eval-expressions.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const scalars = {
  small_wide: 'small % wide',
  wide_small: 'wide % small',
  small_big: 'small % big',
  big_small: 'big % small',
  wide_big: 'wide % big',
  big_wide: 'big % wide',
  small_literal: 'small % 2',
  big_literal: 'big % 2',
  small_large_literal: 'small % 32768',
  wide_large_literal: 'wide % 2147483648',
  small_null: 'small % NULL',
  small_widened_null: 'small % NULL::bigint',
  explicit_bigint_call: 'pg_catalog.int8mod(small, wide)',
  explicit_integer_call: 'pg_catalog.int4mod(small, wide)',
  literal_call: 'pg_catalog.int8mod(small, 3)',
  null_call: 'pg_catalog.int8mod(NULL, small)',
  nested: '(small % wide) % big',
  exact_add: 'small + wide',
  exact_divide: 'big / small',
  exact_small_remainder: 'small % small',
  exact_abs: 'abs(small)',
} as const
const expressions: Record<string, string> = Object.fromEntries(
  Object.entries(scalars).map(([name, expression]) => [name, `(${expression}) = expected`]),
)
Object.assign(expressions, {
  lazy_case: 'CASE WHEN flag THEN true ELSE small % big = expected END',
  lazy_and: 'flag AND big % wide = expected',
  lazy_or: 'flag OR wide % big = expected',
  null_test: '(small % big) IS NULL',
  promotion_after_error: '(-small) % big = expected',
  intermediate_integer_overflow: '(wide + 1) % big = expected',
})
const value = (value: number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const incoming: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
const zeroDivision: Outcome = { kind: 'Error', value: { state: parseInt('22012', 36) } }
const base: Row = {
  small: value(7),
  wide: value(3),
  big: value(5n),
  expected: value(0n),
  flag: value(false),
}

function operand(
  table: TableInfo,
  sql: string,
  domains: CatalogSnapshot['domains'],
): EvalExpression {
  const plan = lowerTableCheck(
    table,
    { name: 'probe', type: 'check', definition: `CHECK ((${sql}) IS NULL)` },
    [],
    domains,
  )!
  expect(plan.expression.kind).toBe('eval-scalar')
  if (plan.expression.kind !== 'eval-scalar' || plan.expression.expression.kind !== 'null-test')
    throw new Error('Expected a scalar null test')
  return plan.expression.expression.operand
}

describe('catalog integer CHECK promotion', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-integer-promotion-'))
    await pg.exec(`CREATE DOMAIN small_change AS smallint;
      CREATE DOMAIN wide_change AS integer;
      CREATE DOMAIN big_change AS bigint;
      CREATE DOMAIN nested_big_change AS big_change;
      CREATE TABLE integer_promotions (small small_change, wide wide_change, big nested_big_change, expected bigint, flag bool,
        ${Object.entries(expressions)
          .map(([name, expression]) => `CONSTRAINT "${name}" CHECK (${expression})`)
          .join(',')});`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((item) => item.name === 'integer_promotions')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('matches PostgreSQL result types and inserts catalog casts without replacing exact overloads', async () => {
    for (const [name, sql] of Object.entries(scalars)) {
      const expression = operand(table, sql, catalog.domains)
      expect(expression.kind, name).toBe('call')
      if (expression.kind !== 'call') throw new Error('Expected a callable')
      const type = (
        await pg.query<{ type: string }>(
          `WITH candidate AS MATERIALIZED (SELECT NULL::smallint small, NULL::integer wide, NULL::bigint big) SELECT pg_typeof(${sql})::text type FROM candidate`,
        )
      ).rows[0]!.type
      expect(expression.call.type, name).toBe(catalogScalarType(type))
    }
    for (const [sql, source, target] of [
      ['small % big', 'pg_catalog.int2', 'pg_catalog.int8'],
      ['wide % big', 'pg_catalog.int4', 'pg_catalog.int8'],
      ['small % 2', 'pg_catalog.int2', 'pg_catalog.int4'],
    ] as const) {
      const expression = operand(table, sql, catalog.domains)
      if (expression.kind !== 'call') throw new Error('Expected a callable')
      const cast = expression.operands[0]!
      expect(cast.kind).toBe('call')
      if (cast.kind !== 'call') throw new Error('Expected a widening cast')
      expect(cast.call.signature).toBe(builtinCast(source, target)!.implementation)
      expect(operatorMetadata(expression.call.signature!).args).toEqual([target, target])
    }
    const exact = operand(table, 'small + wide', catalog.domains)
    if (exact.kind !== 'call') throw new Error('Expected a callable')
    expect(operatorMetadata(exact.call.signature!).args).toEqual([
      'pg_catalog.int2',
      'pg_catalog.int4',
    ])
    expect(exact.operands.map((value) => value.kind)).toEqual(['input', 'input'])
  })

  it('defers ambiguous calls, implicit narrowing and noninteger overload winners', async () => {
    for (const [sql, code] of [
      ['pg_catalog.gcd(small, small)', '42725'],
      ['pg_catalog.int2mod(wide, wide)', '42883'],
      ['pg_catalog.int4mod(big, wide)', '42883'],
      ['pg_catalog.int2pl(small, 1)', '42883'],
    ]) {
      await expect(pg.query(`SELECT ${sql} FROM integer_promotions`)).rejects.toMatchObject({
        code,
      })
      const plan = lowerTableCheck(
        table,
        { name: 'probe', type: 'check', definition: `CHECK ((${sql}) IS NULL)` },
        [],
        catalog.domains,
      )!
      expect(plan.expression).toEqual({ kind: 'uncertain' })
    }
    const sql = 'pg_catalog.width_bucket(small, small, small, small)'
    await pg.exec(`CREATE VIEW numeric_overload AS SELECT ${sql} value FROM integer_promotions`)
    const plan = lowerTableCheck(
      table,
      { name: 'probe', type: 'check', definition: `CHECK ((${sql}) IS NULL)` },
      [],
      catalog.domains,
    )!
    expect(plan.expression).toEqual({ kind: 'uncertain' })
  })

  it('matches raw and stored CHECKs in Rust, Go and TypeScript with errors, domains, NULLs and lazy branches', async () => {
    const entries = table.constraints
      .filter((constraint) => constraint.type === 'check')
      .flatMap((constraint) => [
        {
          ...constraint,
          name: `raw_${constraint.name}`,
          definition: `CHECK (${expressions[constraint.name]})`,
        },
        { ...constraint, name: `stored_${constraint.name}` },
      ])
    const names = entries.map((entry) => entry.name)
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
    expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const bigValues = [
      -9223372036854775808n,
      -9007199254740993n,
      -3n,
      -1n,
      0n,
      3n,
      9007199254740993n,
      9223372036854775807n,
      null,
    ]
    for (const [smallIndex, small] of [-32768, -7, -1, 0, 1, 32767, null].entries())
      for (const [index, wide] of [-2147483648, -7, -1, 0, 1, 2147483647, null].entries())
        for (const big of [
          bigValues[(smallIndex + index) % bigValues.length]!,
          bigValues[(smallIndex * 2 + index + 4) % bigValues.length]!,
        ]) {
          const flag = index % 2 === 0
          for (const [constraint, sql] of Object.entries(expressions)) {
            let expected: Outcome
            try {
              const result = (
                await pg.query<{ value: boolean | null }>(
                  `WITH candidate AS MATERIALIZED (SELECT $1::smallint small, $2::integer wide, $3::bigint big, 0::bigint expected, $4::bool flag) SELECT (${sql}) value FROM candidate`,
                  [small, wide, big === null ? null : String(big), flag],
                )
              ).rows[0]!.value
              expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
            } catch (error) {
              const code = (error as { code: string }).code
              expect(['22003', '22012']).toContain(code)
              expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
            }
            const row = {
              small: value(small),
              wide: value(wide),
              big: value(big),
              expected: value(0n),
              flag: value(flag),
            }
            for (const prefix of ['raw', 'stored'])
              fixtures.push({ name: `${prefix}_${constraint}`, row, expected })
          }
        }
    for (const prefix of ['raw', 'stored']) {
      for (const [constraint, inputs] of [
        ['small_big', ['small', 'big']],
        ['wide_big', ['wide', 'big']],
        ['small_wide', ['small', 'wide']],
        ['explicit_bigint_call', ['small', 'wide']],
      ] as const)
        for (const input of inputs)
          for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, incoming] as Input[])
            fixtures.push({
              name: `${prefix}_${constraint}`,
              row: { ...base, [input]: state },
              expected: state as Outcome,
            })
      fixtures.push(
        {
          name: `${prefix}_small_big`,
          row: { ...base, small: value(7), big: value(0n), expected: value(null) },
          expected: zeroDivision,
        },
        {
          name: `${prefix}_small_big`,
          row: { ...base, small: incoming, big: { kind: 'Unknown' } },
          expected: incoming,
        },
        {
          name: `${prefix}_small_big`,
          row: { ...base, small: { kind: 'Unknown' }, big: incoming },
          expected: incoming,
        },
        {
          name: `${prefix}_small_big`,
          row: { ...base, small: value(null), big: incoming },
          expected: incoming,
        },
        {
          name: `${prefix}_small_big`,
          row: { ...base, small: value(null), big: value(0n) },
          expected: { kind: 'Null' },
        },
        {
          name: `${prefix}_small_big`,
          row: { ...base, small: { kind: 'Unknown' }, big: value(0n) },
          expected: { kind: 'Unknown' },
        },
        {
          name: `${prefix}_lazy_case`,
          row: { ...base, small: incoming, big: value(0n), flag: value(true) },
          expected: { kind: 'True' },
        },
        {
          name: `${prefix}_lazy_and`,
          row: { ...base, wide: value(0), flag: value(false) },
          expected: { kind: 'False' },
        },
        {
          name: `${prefix}_lazy_or`,
          row: { ...base, big: value(0n), flag: value(true) },
          expected: { kind: 'True' },
        },
        {
          name: `${prefix}_promotion_after_error`,
          row: { ...base, small: value(-32768), big: value(9007199254740993n) },
          expected: incoming,
        },
        {
          name: `${prefix}_intermediate_integer_overflow`,
          row: { ...base, wide: value(2147483647), big: value(9007199254740993n) },
          expected: incoming,
        },
      )
    }
    await runCheckParity(directory, 'integerpromotion', group, names, fixtures)
  }, 120_000)
})
