import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { catalogScalarType } from '../../src/sql-semantics/catalog-check-binder.js'
import { enumType } from '../../src/sql-semantics/expressions.js'
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
  small: 'COALESCE(small, NULL::smallint)',
  wide: 'COALESCE(wide, 0)',
  big: 'COALESCE(big, wide, small, 0)',
  small_literal: 'COALESCE(small, 0)',
  reverse_widths: 'COALESCE(small, wide, big)',
  large_literal: 'COALESCE(wide, 2147483648)',
  note: "COALESCE(note, 'fallback')",
  variable_text: "COALESCE(short_note, note, 'fallback')",
  reversed_text: "COALESCE(note, short_note, 'fallback')",
  fixed_text: "COALESCE(code, 'A')",
  decimal: 'COALESCE(amount, 0)',
  day: "COALESCE(day, DATE '2000-01-01')",
  clock: "COALESCE(clock, TIMESTAMP '2000-01-01')",
  instant: "COALESCE(instant, TIMESTAMPTZ '2000-01-01 00:00:00+00')",
  stage: "COALESCE(stage, 'ready')",
  flag: 'COALESCE(flag, false)',
  single: 'COALESCE(small)',
  nulls: 'COALESCE(NULL, NULL)',
  null_literals: "COALESCE(NULL, NULL, 'fallback')",
  nested: 'COALESCE(NULL, COALESCE(small, wide), big)',
  lazy_division: 'COALESCE(big, wide / small, 0)',
  intermediate_overflow: 'COALESCE(small + small, big)',
  typed_null: 'COALESCE(small, NULL::bigint)',
  case_argument: 'COALESCE(CASE WHEN flag THEN small ELSE wide END, big)',
} as const
const expressions: Record<string, string> = Object.fromEntries(
  Object.entries(scalars).map(([name, sql]) => [name, `(${sql}) IS NULL`]),
)
Object.assign(expressions, {
  mixed_equal: 'COALESCE(small, wide, big) = big',
  bool_root: 'COALESCE(flag, wide > 0, false)',
  bool_null_first: 'COALESCE(NULL, flag, false)',
  bool_false_stops: 'COALESCE(flag, wide / small > 0)',
  false_literal: 'COALESCE(false, wide / small > 0)',
  text_equal: "COALESCE(note, 'fallback') = 'fallback'",
  text_regex: "COALESCE(note ~ '^a+$', false)",
  enum_equal: "COALESCE(stage, 'ready') = 'ready'",
  date_equal: "COALESCE(day, DATE '2000-01-01') = DATE '2000-01-01'",
  decimal_equal: 'COALESCE(amount, 0) = 0',
  integer_context: 'COALESCE(small, 0) + 2147483647 = big',
  coalesce_guard: 'CASE WHEN COALESCE(flag, false) THEN true ELSE wide / small > 0 END',
})
const columns = [
  ['small', 'smallint'],
  ['wide', 'integer'],
  ['big', 'bigint'],
  ['note', 'text'],
  ['short_note', 'varchar'],
  ['code', 'char'],
  ['amount', 'numeric'],
  ['day', 'date'],
  ['clock', 'timestamp'],
  ['instant', 'timestamptz'],
  ['stage', 'shipment_stage'],
  ['flag', 'bool'],
] as const
const value = (value: number | bigint | boolean | string | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const incoming: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
const divideError: Outcome = { kind: 'Error', value: { state: parseInt('22012', 36) } }
const base: Row = {
  small: value(7),
  wide: value(3),
  big: value(9007199254740993n),
  note: value('aaa'),
  short_note: value('a'),
  code: value('A'),
  amount: value('0'),
  day: value(0),
  clock: value(0n),
  instant: value(0n),
  stage: value(0),
  flag: value(true),
}

describe('COALESCE CHECK control flow', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  const lower = (sql: string) =>
    lowerTableCheck(
      table,
      {
        name: 'probe',
        type: 'check',
        definition: `CHECK (${sql})`,
      },
      catalog.enums,
      catalog.domains,
    )!.expression
  const operand = (sql: string): EvalExpression => {
    const expression = lower(`(${sql}) IS NULL`)
    if (expression.kind !== 'eval-scalar' || expression.expression.kind !== 'null-test')
      throw new Error('Expected scalar null test')
    return expression.expression.operand
  }
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-coalesce-'))
    await pg.exec(`CREATE TYPE shipment_stage AS ENUM ('ready', 'held');
      CREATE TYPE other_stage AS ENUM ('ready', 'held');
      CREATE DOMAIN stock_count AS bigint;
      CREATE DOMAIN nested_stock AS stock_count;
      CREATE TABLE coalesce_checks (
        ${columns.map(([name, type]) => `${name} ${name === 'big' ? 'nested_stock' : type}${['note', 'short_note', 'code'].includes(name) ? ' COLLATE "C"' : ''}`).join(',')},
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
          .join(',')});`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((item) => item.name === 'coalesce_checks')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('uses PostgreSQL result types, concrete enums, collation and widening casts', async () => {
    for (const [name, sql] of Object.entries(scalars)) {
      const expression = operand(sql)
      expect(expression.kind, name).toBe('coalesce')
      if (expression.kind !== 'coalesce') throw new Error('Expected COALESCE')
      const type = (
        await pg.query<{ type: string }>(
          `WITH candidate AS MATERIALIZED (SELECT ${columns.map(([name, type]) => `NULL::${type} AS "${name}"`).join(',')}) SELECT pg_typeof(${sql})::text type FROM candidate`,
        )
      ).rows[0]!.type
      expect(expression.type, name).toBe(
        name === 'stage'
          ? enumType(catalog.enums.find((item) => item.name === 'shipment_stage')!)
          : catalogScalarType(type),
      )
    }
    const expression = operand(scalars.reverse_widths)
    if (expression.kind !== 'coalesce') throw new Error('Expected COALESCE')
    for (const [index, source] of ['pg_catalog.int2', 'pg_catalog.int4'].entries()) {
      const cast = expression.operands[index]!
      if (cast.kind !== 'call') throw new Error('Expected widening cast')
      expect(cast.call.signature).toBe(builtinCast(source, 'pg_catalog.int8')!.implementation)
    }
    expect(
      prepareCheckRustGroup([
        {
          expression: lower(expressions.text_regex!),
          identity: {
            schema: 'public',
            kind: 'table',
            owner: 'probe',
            constraint: 'regex',
          },
        },
      ]).requiresRegex,
    ).toBe(true)
  })

  it('defers unavailable conversions and rejects incompatible types without selecting an implementation', async () => {
    for (const sql of [
      'COALESCE(small, amount)',
      'COALESCE(wide, 1::float8)',
      "COALESCE(small, '7')",
      'COALESCE(code, note)',
    ]) {
      await pg.query(`SELECT ${sql} FROM coalesce_checks`)
      expect(lower(`(${sql}) IS NULL`)).toEqual({ kind: 'uncertain' })
    }
    const unavailable = prepareCheckRustGroup([
      {
        expression: lower('COALESCE(abs(1.5), amount) IS NULL'),
        identity: { schema: 'public', kind: 'table', owner: 'probe', constraint: 'unavailable' },
      },
    ])
    expect(unavailable.checks[0]!.kind).toBe('unsupported')
    await expect(
      pg.query('SELECT COALESCE(small, flag) FROM coalesce_checks'),
    ).rejects.toMatchObject({ code: '42804' })
    expect(lower('COALESCE(small, flag) IS NULL')).toEqual({ kind: 'uncertain' })
    await expect(
      pg.query("SELECT COALESCE(stage, 'ready'::other_stage) FROM coalesce_checks"),
    ).rejects.toMatchObject({ code: '42846' })
    expect(lower("COALESCE(stage, 'ready'::other_stage) IS NULL")).toEqual({ kind: 'uncertain' })
    expect(lower('COALESCE(NULL, NULL)')).toEqual({ kind: 'uncertain' })
  })

  it('matches raw and stored PostgreSQL CHECKs in Rust, Go and TypeScript and stops at Unknown or errors', async () => {
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
        expression: lowerTableCheck(table, constraint, catalog.enums, catalog.domains)!.expression,
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
    const rows: Row[] = [
      base,
      ...columns.map(([name]) => ({ ...base, [name]: value(null) })),
      Object.fromEntries(columns.map(([name]) => [name, value(null)])),
      { ...base, small: value(0), big: value(null), flag: value(null) },
      {
        ...base,
        small: value(32767),
        wide: value(2147483647),
        big: value(9223372036854775807n),
        flag: value(false),
      },
      {
        ...base,
        small: value(-32768),
        wide: value(-2147483648),
        big: value(-9223372036854775808n),
        flag: value(false),
      },
      {
        ...base,
        note: value(''),
        short_note: value(null),
        amount: value('NaN'),
        stage: value(1),
        flag: value(false),
      },
    ]
    for (const row of rows) {
      const parameters = columns.map(([name, type]) => {
        const input = row[name]!
        if (input.kind === 'Null') return null
        if (input.kind !== 'Value') throw new Error('Expected SQL input')
        if (type === 'shipment_stage') return ['ready', 'held'][Number(input.value)]
        if (type === 'date') return '2000-01-01'
        if (type === 'timestamp' || type === 'timestamptz') return '2000-01-01 00:00:00+00'
        return typeof input.value === 'bigint' ? String(input.value) : input.value
      })
      for (const [name, sql] of Object.entries(expressions)) {
        let expected: Outcome
        try {
          const result = (
            await pg.query<{ value: boolean | null }>(
              `WITH candidate AS MATERIALIZED (SELECT ${columns.map(([name, type], index) => `$${index + 1}::${type}${['note', 'short_note', 'code'].includes(name) ? ' COLLATE "C"' : ''} AS "${name}"`).join(',')}) SELECT (${sql}) value FROM candidate`,
              parameters,
            )
          ).rows[0]!.value
          expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
        } catch (error) {
          const code = (error as { code: string }).code
          expect(['22003', '22012']).toContain(code)
          expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
        }
        for (const prefix of ['raw', 'stored'])
          fixtures.push({ name: `${prefix}_${name}`, row, expected })
      }
    }
    for (const prefix of ['raw', 'stored']) {
      for (const name of [
        'small',
        'wide',
        'big',
        'note',
        'decimal',
        'day',
        'clock',
        'instant',
        'stage',
        'flag',
      ]) {
        const input = name === 'decimal' ? 'amount' : name
        for (const state of [{ kind: 'Unknown' }, incoming] as Input[])
          fixtures.push({
            name: `${prefix}_${name}`,
            row: { ...base, [input]: state },
            expected: state as Outcome,
          })
      }
      fixtures.push(
        {
          name: `${prefix}_big`,
          row: { ...base, wide: incoming, small: { kind: 'Unknown' } },
          expected: { kind: 'False' },
        },
        {
          name: `${prefix}_big`,
          row: { ...base, big: value(null), wide: value(null), small: incoming },
          expected: incoming,
        },
        {
          name: `${prefix}_big`,
          row: { ...base, big: { kind: 'Unknown' }, wide: incoming },
          expected: { kind: 'Unknown' },
        },
        {
          name: `${prefix}_big`,
          row: { ...base, big: value(null), wide: { kind: 'Unknown' }, small: incoming },
          expected: { kind: 'Unknown' },
        },
        {
          name: `${prefix}_lazy_division`,
          row: { ...base, small: value(0) },
          expected: { kind: 'False' },
        },
        {
          name: `${prefix}_lazy_division`,
          row: { ...base, big: value(null), small: value(0) },
          expected: divideError,
        },
        {
          name: `${prefix}_bool_false_stops`,
          row: { ...base, flag: value(false), small: value(0) },
          expected: { kind: 'False' },
        },
        {
          name: `${prefix}_bool_root`,
          row: { ...base, flag: { kind: 'Unknown' }, wide: incoming },
          expected: { kind: 'Unknown' },
        },
        {
          name: `${prefix}_bool_root`,
          row: {
            ...base,
            flag: incoming,
            wide: { kind: 'Error', value: { state: parseInt('22012', 36) } },
          },
          expected: incoming,
        },
        {
          name: `${prefix}_text_equal`,
          row: { ...base, note: { kind: 'Unknown' } },
          expected: { kind: 'Unknown' },
        },
      )
    }
    await runCheckParity(
      directory,
      'coalescechecks',
      group,
      entries.map((item) => item.name),
      fixtures,
    )
  }, 120_000)
})
