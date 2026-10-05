import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import type { FunctionMetadata } from '../../src/postgres/builtins/catalog.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const source = readFileSync(
  new URL(
    '../../crates/check-evaluator/src/operations/pg_catalog/bigint_arithmetic.rs',
    import.meta.url,
  ),
  'utf8',
)
const callables = builtinCallables()
  .filter((fn): fn is FunctionMetadata => fn.kind === 'function')
  .filter((fn) => source.includes(`fn ${fn.rustName}(`))
const expressions: Record<string, string> = {
  add: 'big + other = expected',
  subtract: 'big - other = expected',
  multiply: 'big * other = expected',
  divide: 'big / other = expected',
  remainder: 'big % other = expected',
  small_multiply: 'small * big = expected',
  big_small_multiply: 'big * small = expected',
  small_divide: 'small / big = expected',
  big_small_divide: 'big / small = expected',
  wide_multiply: 'wide * big = expected',
  big_wide_multiply: 'big * wide = expected',
  wide_divide: 'wide / big = expected',
  big_wide_divide: 'big / wide = expected',
  literal_multiply: 'big * 2 = expected',
  literal_divide: 'big / 2 = expected',
  literal_remainder: 'big % 2::bigint = expected',
  product_roundtrip: '(big * other) / other = big',
  division_roundtrip: '(big / other) * other + big % other = big',
  lazy_product: 'CASE WHEN flag THEN true ELSE big * other = expected END',
  lazy_division: 'flag OR big / other = expected',
  lazy_remainder: 'flag AND big % other = expected',
  division_null_test: '(big / other) IS NULL',
  remainder_null_test: '(big % other) IS NULL',
  selected_product: '(CASE WHEN flag THEN big * other ELSE big END) = expected',
  negate: '-big = expected',
  positive: '+big = expected',
  absolute: 'abs(big) = expected',
  small_add: 'small + big = expected',
  big_small_add: 'big + small = expected',
  small_subtract: 'small - big = expected',
  big_small_subtract: 'big - small = expected',
  wide_add: 'wide + big = expected',
  big_wide_add: 'big + wide = expected',
  wide_subtract: 'wide - big = expected',
  big_wide_subtract: 'big - wide = expected',
  literal_add: 'big + 1 = expected',
  literal_subtract: '1 - big = expected',
  literal_negate: "-'-9223372036854775808'::bigint = expected",
  nested: '(big + other) - other = big',
  mixed_nested: '(big + small) - small = big',
  cancellation: '(big + other) - other = expected',
  selected: '(CASE WHEN flag THEN big + other ELSE big - other END) = expected',
  lazy_case: 'CASE WHEN flag THEN true ELSE -big = expected END',
  lazy_and: 'flag AND abs(big) = expected',
  lazy_or: 'flag OR big + other = expected',
  null_test: '(big + other) IS NULL',
  negate_null_test: '(-big) IS NULL',
}
for (const fn of callables)
  expressions[`call_${fn.name}`] =
    `pg_catalog.${fn.name}(${fn.args.map((type, index) => (type === 'pg_catalog.int2' ? 'small' : type === 'pg_catalog.int4' ? 'wide' : index === 0 ? 'big' : 'other')).join(',')}) = expected`

const value = (value: number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const minimum = -9223372036854775808n
const maximum = 9223372036854775807n
const overflow: Outcome = { kind: 'Error', value: { state: parseInt('22003', 36) } }
const incoming: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }
const base: Row = {
  big: value(0n),
  other: value(0n),
  small: value(0),
  wide: value(0),
  expected: value(0n),
  flag: value(false),
}

describe('Rust bigint CHECK arithmetic', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-bigint-arithmetic-'))
    await pg.exec(`CREATE DOMAIN big_change AS bigint;
      CREATE DOMAIN nested_big_change AS big_change;
      CREATE DOMAIN small_change AS smallint;
      CREATE DOMAIN wide_change AS integer;
      CREATE TABLE bigint_arithmetic (big nested_big_change, other bigint, small small_change, wide wide_change, expected bigint, flag bool,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
          .join(',')});`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((t) => t.name === 'bigint_arithmetic')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('resolves all catalog callables and preserves exact values, overflow, domains, states and lazy branches in all targets', async () => {
    expect(callables).toHaveLength(25)
    const constraints = table.constraints.filter((c) => c.type === 'check')
    const ordered = constraints.map((c) => c.name)
    const group = prepareCheckRustGroup(
      constraints.map((constraint) => ({
        expression: lowerTableCheck(table, constraint, [], catalog.domains)!.expression,
        identity: {
          schema: table.schema,
          kind: 'table' as const,
          owner: table.name,
          constraint: constraint.name,
        },
      })),
    )
    expect(
      group.checks.map((c, index) => ({
        name: ordered[index],
        kind: c.kind,
        ...(c.kind === 'unsupported' ? { reason: c.reason } : {}),
      })),
    ).toEqual(ordered.map((name) => ({ name, kind: 'supported' })))
    for (const fn of callables) expect(group.evaluatorSource).toContain(fn.rustName)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const big of [
      minimum,
      minimum + 1n,
      -9007199254740993n,
      -3037000500n,
      -3037000499n,
      -2147483648n,
      -32768n,
      -7n,
      -3n,
      -2n,
      -1n,
      0n,
      1n,
      2n,
      3n,
      7n,
      3037000499n,
      3037000500n,
      32767n,
      2147483647n,
      9007199254740993n,
      maximum - 1n,
      maximum,
      null,
    ])
      for (const [index, other] of [minimum, -1n, 0n, 1n, maximum, null].entries()) {
        const small = [-32768, -1, 0, 1, 32767, null][index]!
        const wide = [-2147483648, -1, 0, 1, 2147483647, null][index]!
        for (const name of ordered) {
          let expected: Outcome
          try {
            const result = (
              await pg.query<{ v: boolean | null }>(
                `WITH candidate AS MATERIALIZED (SELECT $1::bigint big, $2::bigint other, $3::smallint small, $4::integer wide, 0::bigint expected, false flag)
                SELECT (${expressions[name]}) AS v FROM candidate`,
                [
                  big === null ? null : String(big),
                  other === null ? null : String(other),
                  small,
                  wide,
                ],
              )
            ).rows[0]!.v
            expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
          } catch (caught) {
            const code = (caught as { code: string }).code
            expect(['22003', '22012']).toContain(code)
            expected = { kind: 'Error', value: { state: parseInt(code, 36) } }
          }
          fixtures.push({
            name,
            row: {
              ...base,
              big: value(big),
              other: value(other),
              small: value(small),
              wide: value(wide),
            },
            expected,
          })
        }
      }
    for (const fn of callables)
      for (const [index, type] of fn.args.entries()) {
        const input =
          type === 'pg_catalog.int2'
            ? 'small'
            : type === 'pg_catalog.int4'
              ? 'wide'
              : index === 0
                ? 'big'
                : 'other'
        for (const state of [{ kind: 'Unknown' }, { kind: 'Null' }, incoming] as Input[])
          fixtures.push({
            name: `call_${fn.name}`,
            row: { ...base, [input]: state },
            expected: state as Outcome,
          })
      }
    fixtures.push(
      {
        name: 'add',
        row: { ...base, big: incoming, other: { kind: 'Unknown' } },
        expected: incoming,
      },
      { name: 'add', row: { ...base, big: value(null), other: incoming }, expected: incoming },
      {
        name: 'add',
        row: { ...base, big: { kind: 'Unknown' }, other: value(null) },
        expected: { kind: 'Unknown' },
      },
      {
        name: 'add',
        row: { ...base, big: value(maximum), other: value(1n), expected: value(null) },
        expected: overflow,
      },
      {
        name: 'cancellation',
        row: { ...base, big: value(maximum), other: value(1n), expected: value(maximum) },
        expected: overflow,
      },
      {
        name: 'selected',
        row: {
          ...base,
          big: value(maximum),
          other: value(1n),
          expected: value(maximum - 1n),
          flag: value(false),
        },
        expected: { kind: 'True' },
      },
      {
        name: 'selected',
        row: { ...base, big: value(maximum), other: value(1n), flag: value(true) },
        expected: overflow,
      },
      {
        name: 'lazy_case',
        row: { ...base, big: value(minimum), flag: value(true) },
        expected: { kind: 'True' },
      },
      {
        name: 'lazy_case',
        row: { ...base, big: incoming, flag: value(true) },
        expected: { kind: 'True' },
      },
      {
        name: 'lazy_and',
        row: { ...base, big: value(minimum), flag: value(false) },
        expected: { kind: 'False' },
      },
      {
        name: 'lazy_or',
        row: { ...base, big: value(maximum), other: value(1n), flag: value(true) },
        expected: { kind: 'True' },
      },
      {
        name: 'big_small_add',
        row: {
          ...base,
          big: value(9007199254740993n),
          small: value(1),
          expected: value(9007199254740994n),
        },
        expected: { kind: 'True' },
      },
      {
        name: 'wide_subtract',
        row: {
          ...base,
          big: value(-9007199254740993n),
          wide: value(-1),
          expected: value(9007199254740992n),
        },
        expected: { kind: 'True' },
      },
    )
    for (const name of ['lazy_product', 'lazy_division', 'selected_product'])
      fixtures.push({
        name,
        row: {
          ...base,
          big: value(maximum),
          other: value(2n),
          expected: value(maximum),
          flag: value(name !== 'selected_product'),
        },
        expected: { kind: 'True' },
      })
    fixtures.push(
      {
        name: 'divide',
        row: { ...base, big: value(minimum), other: value(-1n) },
        expected: overflow,
      },
      {
        name: 'remainder',
        row: { ...base, big: value(minimum), other: value(-1n) },
        expected: { kind: 'True' },
      },
      {
        name: 'divide',
        row: {
          ...base,
          big: value(9007199254740993n),
          other: value(3n),
          expected: value(3002399751580331n),
        },
        expected: { kind: 'True' },
      },
      {
        name: 'multiply',
        row: {
          ...base,
          big: value(3037000499n),
          other: value(3037000499n),
          expected: value(9223372030926249001n),
        },
        expected: { kind: 'True' },
      },
      {
        name: 'product_roundtrip',
        row: { ...base, big: value(maximum), other: value(2n) },
        expected: overflow,
      },
      {
        name: 'lazy_division',
        row: { ...base, big: value(minimum), other: value(0n), flag: value(true) },
        expected: { kind: 'True' },
      },
      {
        name: 'lazy_remainder',
        row: { ...base, big: value(minimum), other: value(0n), flag: value(false) },
        expected: { kind: 'False' },
      },
      {
        name: 'divide',
        row: { ...base, expected: value(null) },
        expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      },
      {
        name: 'remainder',
        row: { ...base, expected: value(null) },
        expected: { kind: 'Error', value: { state: parseInt('22012', 36) } },
      },
      {
        name: 'multiply',
        row: { ...base, big: value(maximum), other: value(2n), expected: value(null) },
        expected: overflow,
      },
    )
    await runCheckParity(directory, 'bigintarithmetic', group, ordered, fixtures)
  }, 120_000)

  it('defers implicit promotion without mixed catalog operators', () => {
    for (const sql of ['small % big = expected']) {
      const group = prepareCheckRustGroup([
        {
          expression: lowerTableCheck(
            table,
            { name: 'probe', type: 'check', definition: `CHECK (${sql})` },
            [],
            catalog.domains,
          )!.expression,
          identity: { schema: table.schema, kind: 'table', owner: table.name, constraint: 'probe' },
        },
      ])
      if (group.checks[0]!.kind === 'supported')
        expect(group.evaluatorSource).toContain('check_unknown()')
      else expect(group.checks[0]!.kind).toBe('unsupported')
    }
  })
})
