import { afterAll, beforeAll, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { catalogScalarType } from '../../src/sql-semantics/catalog-check-binder.js'
import { builtinMetadata, builtinCast } from '../../src/postgres/builtins/inventory.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import type { EvalExpression } from '../../src/sql-semantics/eval-expressions.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const scalars: Record<string, string> = {
  small_left: 'small + amount',
  small_right: 'amount + small',
  wide_left: 'wide - amount',
  wide_right: 'amount - wide',
  big_left: 'big * amount',
  big_right: 'amount * big',
  divide_wide: 'amount / wide',
  divide_big: 'big / amount',
  remainder_small: 'amount % small',
  remainder_big: 'big % amount',
  decimal_literal: '0.125 + wide',
  integer_literal: 'amount / 2',
  bigint_literal: 'amount + 9223372036854775807',
  unknown_literal: "amount + '2.2500'",
  explicit_add: 'pg_catalog.numeric_add(big, amount)',
  explicit_divide: 'pg_catalog.numeric_div(amount, wide)',
  round: 'pg_catalog.round(amount, small)',
  trunc: 'pg_catalog.trunc(amount, small)',
  gcd: 'pg_catalog.gcd(amount, big)',
  lcm: 'pg_catalog.lcm(wide, amount)',
  div: 'pg_catalog.div(big, amount)',
  mod: 'pg_catalog.mod(amount, big)',
  bucket: 'pg_catalog.width_bucket(amount, small, big, wide)',
  round_unknown: "pg_catalog.round(amount, '2')",
  round_null: 'pg_catalog.round(amount, NULL)',
  nested: '(amount / wide) + big',
  intermediate_overflow: '(wide + 1) + amount',
}
const expressions: Record<string, string> = Object.fromEntries(
  Object.entries(scalars).flatMap(([name, sql]) => [
    [name, `(${sql}) = recorded`],
    [`wire_${name}`, `pg_catalog.numeric_send(${sql}) = recorded_wire`],
    [`scale_${name}`, `pg_catalog.scale(${sql}) = recorded_scale`],
  ]),
)
Object.assign(expressions, {
  lazy: 'CASE WHEN skip THEN true ELSE amount / wide = recorded END',
  nullness: '(amount / wide) IS NULL',
  first_error: '(amount / wide) + (1 / small) = recorded',
})
let pg: PGlite
let directory: string
let catalog: CatalogSnapshot
let table: TableInfo
beforeAll(async () => {
  pg = await PGlite.create()
  directory = await mkdtemp(join(tmpdir(), 'pgsid-check-numeric-coercion-'))
  await pg.exec(`CREATE DOMAIN invoice_amount AS numeric;
    CREATE DOMAIN invoice_count AS integer;
    CREATE TABLE numeric_coercions(small smallint, wide invoice_count, big bigint, amount invoice_amount,
      recorded numeric, recorded_wire bytea, recorded_scale integer, skip boolean,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')});`)
  catalog = await snapshotCatalog(pg)
  table = catalog.tables.find((item) => item.name === 'numeric_coercions')!
})
afterAll(async () => {
  if (pg && !pg.closed) await pg.close()
  if (directory) await rm(directory, { recursive: true, force: true })
})
function lower(sql: string) {
  return lowerTableCheck(
    table,
    { name: 'probe', type: 'check', definition: `CHECK (${sql})` },
    [],
    catalog.domains,
  )!
}
function operand(sql: string): EvalExpression {
  const plan = lower(`(${sql}) IS NULL`)
  expect(plan.expression.kind, sql).toBe('eval-scalar')
  if (plan.expression.kind !== 'eval-scalar' || plan.expression.expression.kind !== 'null-test')
    throw new Error(`Expected a bound scalar: ${sql}`)
  return plan.expression.expression.operand
}
it('selects PostgreSQL numeric overloads before inserting catalog-declared implicit conversions', async () => {
  for (const sql of Object.values(scalars)) {
    const expression = operand(sql)
    expect(expression.kind, sql).toBe('call')
    if (expression.kind !== 'call') throw new Error('Expected callable')
    const result = (
      await pg.query<{ type: string }>(`SELECT pg_typeof(${sql})::text AS type FROM
      (SELECT NULL::smallint small, NULL::integer wide, NULL::bigint big, NULL::numeric amount) inputs`)
    ).rows[0]!
    expect(expression.call.type, sql).toBe(catalogScalarType(result.type))
  }
  for (const [sql, position, type] of [
    ['small + amount', 0, 'pg_catalog.int2'],
    ['amount / wide', 1, 'pg_catalog.int4'],
    ['big * amount', 0, 'pg_catalog.int8'],
  ] as const) {
    const expression = operand(sql)
    if (expression.kind !== 'call') throw new Error('Expected operator')
    expect(builtinMetadata(expression.call.signature!).args).toEqual([
      'pg_catalog."numeric"',
      'pg_catalog."numeric"',
    ])
    const conversion = expression.operands[position]!
    expect(conversion.kind).toBe('call')
    if (conversion.kind !== 'call') throw new Error('Expected implicit conversion')
    expect(conversion.call.signature).toBe(
      builtinCast(type, 'pg_catalog."numeric"')!.implementation,
    )
  }
})

const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const base: Row = {
  small: input(2),
  wide: input(3),
  big: input(9007199254740993n),
  amount: input('1.2500'),
  recorded: input('0'),
  recorded_wire: input(''),
  recorded_scale: input(0),
  skip: input(false),
}
const error = (code: string): Outcome => ({ kind: 'Error', value: { state: parseInt(code, 36) } })
it('preserves exact mixed arithmetic, numeric wire values, scales, first errors and lazy branches in all targets', async () => {
  const entries = table.constraints
    .filter((c) => c.type === 'check')
    .flatMap((constraint) => [
      {
        ...constraint,
        name: `raw_${constraint.name}`,
        definition: `CHECK (${expressions[constraint.name]})`,
      },
      { ...constraint, name: `stored_${constraint.name}` },
    ])
  const plans = entries.map((constraint) =>
    lowerTableCheck(table, constraint, [], catalog.domains)!,
  )
  expect(plans.every((plan) => plan.expression.kind !== 'uncertain')).toBe(true)
  const group = prepareCheckRustGroup(
    plans.map((plan, index) => ({
      expression: plan.expression,
      identity: {
        schema: table.schema,
        kind: 'table' as const,
        owner: table.name,
        constraint: entries[index]!.name,
      },
    })),
  )
  expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
  const fixtures: { name: string; row: Row; expected: Outcome }[] = []
  const add = (name: string, row: Row, expected: Outcome) => {
    for (const origin of ['raw', 'stored'])
      fixtures.push({ name: `${origin}_${name}`, row, expected })
  }
  const samples: Partial<Row>[] = [
    {},
    { amount: input('0.0000') },
    { amount: input('-12.34500'), small: input(-2) },
    { amount: input('NaN') },
    { amount: input('Infinity') },
    { amount: input('-Infinity') },
    { big: input(-9223372036854775808n) },
    { big: input(9223372036854775807n) },
    { amount: input('0.00000000000000000001') },
    { wide: input(0) },
    { small: input(0) },
    { amount: input(null) },
    { wide: input(null) },
    { small: input(null) },
    { big: input(null) },
    { wide: input(2147483647), small: input(0) },
  ]
  const query = (row: Row) =>
    ['small', 'wide', 'big', 'amount', 'skip'].map((key) => {
      const value = row[key]!
      if (value.kind === 'Null') return null
      if (value.kind !== 'Value') throw new Error('Expected concrete oracle input')
      return typeof value.value === 'bigint' ? String(value.value) : value.value
    })
  const columns = `(SELECT $1::smallint small, $2::integer wide, $3::bigint big, $4::numeric amount, $5::boolean skip)`
  for (const [name, sql] of Object.entries(scalars)) {
    for (const [index, sample] of samples.entries()) {
      const row: Row = { ...base }
      Object.assign(row, sample)
      let result: { value: string | null; wire: string | null; scale: number | null }
      try {
        result = (
          await pg.query<typeof result>(
            `WITH inputs AS MATERIALIZED ${columns},
          computed AS MATERIALIZED (SELECT ${sql} value FROM inputs)
          SELECT value::text value, encode(pg_catalog.numeric_send(value),'hex') wire,
            pg_catalog.scale(value) scale FROM computed`,
            query(row),
          )
        ).rows[0]!
      } catch (failure) {
        const code = (failure as { code: string }).code
        expect(code).toMatch(/^[0-9A-Z]{5}$/u)
        for (const prefix of ['', 'wire_', 'scale_']) add(`${prefix}${name}`, row, error(code))
        continue
      }
      const recorded = {
        ...row,
        recorded: input(result.value),
        recorded_wire: input(result.wire),
        recorded_scale: input(result.scale),
      }
      for (const prefix of ['', 'wire_', 'scale_'])
        add(`${prefix}${name}`, recorded, {
          kind: (prefix === 'scale_' ? result.scale : result.value) === null ? 'Null' : 'True',
        })
      if (index === 0 && result.value !== null) {
        const mismatch = {
          ...row,
          recorded: input('99999999.9876'),
          recorded_wire: input(''),
          recorded_scale: input(-999),
        }
        for (const prefix of ['', 'wire_', 'scale_'])
          add(`${prefix}${name}`, mismatch, { kind: 'False' })
      }
    }
  }
  const unknown: Input = { kind: 'Unknown' }
  const incoming: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
  add('divide_wide', { ...base, amount: unknown }, { kind: 'Unknown' })
  add('divide_wide', { ...base, amount: unknown, wide: input(0) }, { kind: 'Unknown' })
  add('divide_wide', { ...base, amount: incoming, wide: input(0) }, error('22003'))
  add('first_error', { ...base, amount: incoming, small: input(0) }, error('22003'))
  add('first_error', { ...base, amount: unknown, small: input(0) }, { kind: 'Unknown' })
  add('first_error', { ...base, small: input(0) }, error('22012'))
  add('first_error', { ...base, wide: input(0), small: input(0) }, error('22012'))
  add('lazy', { ...base, skip: input(true), amount: incoming, wide: incoming }, { kind: 'True' })
  add('lazy', { ...base, skip: input(false), amount: incoming, wide: input(0) }, error('22003'))
  add('nullness', { ...base, amount: input(null) }, { kind: 'True' })
  add('nullness', { ...base, wide: input(0) }, error('22012'))
  const artifactDirectory = process.env['PGSID_COERCION_ARTIFACTS']
  if (artifactDirectory) {
    await mkdir(artifactDirectory, { recursive: true })
    await writeFile(
      join(artifactDirectory, 'fixtures.json'),
      JSON.stringify(fixtures, (_, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    )
    await writeFile(join(artifactDirectory, 'plans.json'), JSON.stringify(plans))
  }
  console.log(`Numeric coercion: ${fixtures.length} cross-target fixtures`)
  await runCheckParity(
    directory,
    'numericcoercions',
    group,
    entries.map((entry) => entry.name),
    fixtures,
  )
}, 240000)

it('keeps invalid text coercion and genuinely ambiguous overloads unresolved', async () => {
  for (const [sql, code] of [
    ["amount + '2'::text", '42883'],
    ['pg_catalog.gcd(small, small)', '42725'],
    ['pg_catalog.numeric_add(amount, NULL::text)', '42883'],
    ['pg_catalog.int2mod(wide, small)', '42883'],
  ]) {
    await expect(pg.query(`SELECT ${sql} FROM numeric_coercions`)).rejects.toMatchObject({ code })
    expect(lower(`(${sql}) IS NULL`).expression).toEqual({ kind: 'uncertain' })
  }
  for (const sql of ['pg_catalog.pg_sleep(amount)', 'pg_catalog.setseed(amount)']) {
    await pg.exec(
      `CREATE OR REPLACE VIEW unavailable_numeric AS SELECT (${sql}) IS NULL AS value` +
        ' FROM numeric_coercions',
    )
    expect(lower(`(${sql}) IS NULL`).expression.kind).toBe('uncertain')
  }
})
