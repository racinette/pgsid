import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { builtinCast, functionMetadata } from '../../src/postgres/builtins/inventory.js'
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

const expressions: Record<string, string> = {
  small_to_integer: 'small::integer = wide',
  small_to_bigint: 'small::bigint = big',
  integer_to_bigint: 'wide::bigint = big',
  integer_to_small: 'wide::smallint = small',
  bigint_to_integer: 'big::integer = wide',
  bigint_to_small: 'big::smallint = small',
  bigint_roundtrip_integer: 'big::integer::bigint = big',
  bigint_roundtrip_small: 'big::smallint::bigint = big',
  bigint_null_test: 'big::integer IS NULL',
  bigint_small_null_test: 'big::smallint IS NULL',
  bigint_selected: '(CASE WHEN flag THEN big::smallint ELSE small END) = small',
  bigint_lazy_case: 'CASE WHEN flag THEN true ELSE big::integer = wide END',
  bigint_lazy_and: 'flag AND big::smallint = small',
  bigint_lazy_or: 'flag OR big::integer = wide',
  call_int2_big: 'pg_catalog.int2(big) = small',
  call_int4_big: 'pg_catalog.int4(big) = wide',

  widened_narrowing: 'wide::bigint::smallint = small',
  roundtrip: 'wide::smallint::integer = wide',
  same_bigint: 'big::bigint = big',
  null_test: 'wide::smallint IS NULL',
  selected: '(CASE WHEN flag THEN wide::smallint ELSE small END) = small',
  lazy_case: 'CASE WHEN flag THEN true ELSE wide::smallint = small END',
  lazy_and: 'flag AND wide::smallint = small',
  lazy_or: 'flag OR wide::smallint = small',
  literal: "small = '-32768'::smallint",
  negative_literal: 'small = (-32768)::smallint',
  positive_literal: 'small = 42::smallint',
  call_int2: 'pg_catalog.int2(wide) = small',
  call_int4: 'pg_catalog.int4(small) = wide',
  call_int8_small: 'pg_catalog.int8(small) = big',
  call_int8_integer: 'pg_catalog.int8(wide) = big',
}
const closedExpressions: Record<string, string> = {
  literal_overflow: '32768::smallint = 0',
  literal_underflow: '(-32769)::smallint = 0',
  literal_widening: "(-2147483648)::bigint = '-2147483648'::bigint",
  bigint_literal_overflow: '2147483648::integer = 0',
  bigint_literal_underflow: '(-2147483649)::integer = 0',
  bigint_small_literal_overflow: "'32768'::bigint::smallint = 0",
  bigint_small_literal_underflow: "'-32769'::bigint::smallint = 0",
}
const bigintExpressions = Object.keys(expressions).filter(
  (name) => name.startsWith('bigint_') || name.endsWith('_big'),
)
const bigintValues = [
  -9223372036854775808n,
  -9007199254740993n,
  -4294967296n,
  -2147483649n,
  -2147483648n,
  -2147483647n,
  -32769n,
  -32768n,
  -32767n,
  -1n,
  0n,
  1n,
  32766n,
  32767n,
  32768n,
  2147483646n,
  2147483647n,
  2147483648n,
  4294967295n,
  4294967296n,
  9007199254740993n,
  9223372036854775807n,
  null,
] as const
const value = (value: number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})
const error: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }

describe('catalog-resolved integer CHECK casts', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-integer-casts-'))
    await pg.exec(`CREATE DOMAIN short_change AS smallint;
      CREATE DOMAIN count_change AS integer;
      CREATE DOMAIN nested_change AS count_change;
      CREATE DOMAIN big_change AS bigint;
      CREATE DOMAIN nested_big_change AS big_change;
      CREATE TABLE integer_casts (small short_change, wide nested_change, big nested_big_change, flag bool,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
          .join(',')});`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((t) => t.name === 'integer_casts')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('matches widening, narrowing, domains, constants, errors and lazy branches in Rust and both targets', async () => {
    const constraints = [
      ...table.constraints.filter((c) => c.type === 'check'),
      ...Object.entries(closedExpressions).map(([name, sql]) => ({
        name,
        type: 'check' as const,
        definition: `CHECK (${sql})`,
      })),
    ]
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
    for (const [source, target] of [
      ['int2', 'int4'],
      ['int2', 'int8'],
      ['int4', 'int8'],
      ['int4', 'int2'],
      ['int8', 'int4'],
      ['int8', 'int2'],
    ]) {
      const conversion = builtinCast(`pg_catalog.${source}`, `pg_catalog.${target}`)!
      expect(conversion.method).toBe('f')
      const metadata = functionMetadata(conversion.implementation!)
      expect(metadata.kind).toBe('function')
      expect(group.evaluatorSource).toContain(metadata.rustName)
    }
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const small of [-32768, -1, 0, 1, 32767, null])
      for (const wide of [-2147483648, -32769, -32768, -1, 0, 1, 32767, 32768, 2147483647, null])
        for (const name of Object.keys(expressions)) {
          const big = wide === null ? null : BigInt(wide)
          let expected: Outcome
          try {
            expected = outcome(
              (
                await pg.query<{ v: boolean | null }>(
                  `WITH candidate AS MATERIALIZED (SELECT $1::smallint small, $2::integer wide, $3::bigint big, $4::bool flag)
                SELECT (${expressions[name]}) AS v FROM candidate`,
                  [small, wide, big === null ? null : String(big), false],
                )
              ).rows[0]!.v,
            )
          } catch (caught) {
            const state = (caught as { code: string }).code
            expect(state).toBe('22003')
            expected = { kind: 'Error', value: { state: parseInt(state, 36) } }
          }
          fixtures.push({
            name,
            row: { small: value(small), wide: value(wide), big: value(big), flag: value(false) },
            expected,
          })
        }
    for (const big of bigintValues) {
      const wide = big !== null && big >= -2147483648n && big <= 2147483647n ? Number(big) : 0
      const small = big !== null && big >= -32768n && big <= 32767n ? Number(big) : 0
      for (const name of bigintExpressions) {
        let expected: Outcome
        try {
          expected = outcome(
            (
              await pg.query<{ v: boolean | null }>(
                `WITH candidate AS MATERIALIZED (SELECT $1::smallint small, $2::integer wide, $3::bigint big, false flag)
              SELECT (${expressions[name]}) AS v FROM candidate`,
                [small, wide, big === null ? null : String(big)],
              )
            ).rows[0]!.v,
          )
        } catch (caught) {
          expect((caught as { code: string }).code).toBe('22003')
          expected = error
        }
        fixtures.push({
          name,
          row: { small: value(small), wide: value(wide), big: value(big), flag: value(false) },
          expected,
        })
      }
    }
    for (const [name, sql] of Object.entries(closedExpressions)) {
      let expected: Outcome
      try {
        expected = outcome(
          (await pg.query<{ v: boolean | null }>(`SELECT (${sql}) AS v`)).rows[0]!.v,
        )
      } catch (caught) {
        expect((caught as { code: string }).code).toBe('22003')
        expected = error
      }
      fixtures.push({ name, row: {}, expected })
    }
    for (const [name, input] of [
      ['small_to_integer', 'small'],
      ['small_to_bigint', 'small'],
      ['integer_to_bigint', 'wide'],
      ['integer_to_small', 'wide'],
      ['bigint_to_integer', 'big'],
      ['bigint_to_small', 'big'],
    ] as const) {
      for (const [state, expected] of [
        [{ kind: 'Unknown' }, { kind: 'Unknown' }],
        [
          { kind: 'Error', value: { state: parseInt('22012', 36) } },
          { kind: 'Error', value: { state: parseInt('22012', 36) } },
        ],
        [{ kind: 'Null' }, { kind: 'Null' }],
      ] as [Input, Outcome][])
        fixtures.push({
          name,
          row: { small: value(0), wide: value(0), big: value(0n), [input]: state },
          expected,
        })
    }
    fixtures.push(
      {
        name: 'bigint_selected',
        row: { flag: value(false), small: value(1), big: error },
        expected: { kind: 'True' },
      },
      {
        name: 'bigint_selected',
        row: { flag: value(true), small: value(1), big: value(32768n) },
        expected: error,
      },
      {
        name: 'bigint_lazy_case',
        row: { flag: value(true), wide: value(1), big: value(9223372036854775807n) },
        expected: { kind: 'True' },
      },
      {
        name: 'bigint_lazy_and',
        row: { flag: value(false), small: value(1), big: value(-32769n) },
        expected: { kind: 'False' },
      },
      {
        name: 'bigint_lazy_or',
        row: { flag: value(true), wide: value(1), big: error },
        expected: { kind: 'True' },
      },
      {
        name: 'bigint_to_integer',
        row: { wide: value(null), big: value(2147483648n) },
        expected: error,
      },
      {
        name: 'bigint_to_small',
        row: { small: value(null), big: value(-32769n) },
        expected: error,
      },
      {
        name: 'selected',
        row: { flag: value(false), small: value(1), wide: error },
        expected: { kind: 'True' },
      },
      {
        name: 'selected',
        row: { flag: value(true), small: value(1), wide: value(32768) },
        expected: error,
      },
      {
        name: 'lazy_case',
        row: { flag: value(true), small: value(1), wide: value(32768) },
        expected: { kind: 'True' },
      },
      {
        name: 'lazy_and',
        row: { flag: value(false), small: value(1), wide: value(-32769) },
        expected: { kind: 'False' },
      },
      {
        name: 'lazy_or',
        row: { flag: value(true), small: value(1), wide: error },
        expected: { kind: 'True' },
      },
      {
        name: 'same_bigint',
        row: { big: value(9223372036854775807n) },
        expected: { kind: 'True' },
      },
    )
    await runCheckParity(directory, 'integercasts', group, ordered, fixtures)
  }, 120_000)

  it('rejects forged conversion identities and defers domain targets', () => {
    const forged = prepareCheckRustGroup([
      {
        expression: {
          kind: 'eval-scalar',
          expression: {
            kind: 'null-test',
            type: 'pg_catalog.bool',
            negated: false,
            operand: {
              kind: 'call',
              call: {
                kind: 'cast',
                signature: 'function:["pg_catalog","abs"](pg_catalog.int4)',
                type: 'pg_catalog.int4',
              },
              operands: [{ kind: 'input', type: 'pg_catalog.int4', name: 'wide' }],
            },
          },
        },
        identity: { schema: table.schema, kind: 'table', owner: table.name, constraint: 'forged' },
      },
    ])
    expect(forged.checks[0]).toEqual({
      kind: 'unsupported',
      reason: 'Invalid Rust CHECK cast function',
    })
    for (const sql of ['wide::short_change > 0', 'big::short_change > 0']) {
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
