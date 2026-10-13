import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { builtinMetadata } from '../../src/postgres/builtins/inventory.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'

import { comparisonFamilies as families } from './check-comparison-values.js'

const input = (value: string | number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const error = (code: string): Input & Outcome => ({
  kind: 'Error',
  value: { state: parseInt(code, 36) },
})
const expressions: Record<string, string> = Object.fromEntries(
  families.flatMap(({ name }) => [
    [`${name}_distinct`, `${name}_left IS DISTINCT FROM ${name}_right`],
    [`${name}_same`, `${name}_left IS NOT DISTINCT FROM ${name}_right`],
  ]),
)
const compositions: Record<string, string> = {
  mixed_small: 'small IS DISTINCT FROM amount',
  mixed_big: 'amount IS NOT DISTINCT FROM large',
  domain: 'amount IS DISTINCT FROM domain_amount',
  text_relabel: 'text_left IS NOT DISTINCT FROM varchar_right',
  network_relabel: 'inet_left IS DISTINCT FROM cidr_right',
  null_literal: 'amount IS DISTINCT FROM NULL',
  left_null: 'NULL IS NOT DISTINCT FROM amount',
  both_null: 'NULL IS DISTINCT FROM NULL',
  both_same_null: 'NULL IS NOT DISTINCT FROM NULL',
  typed_null: 'NULL::integer IS DISTINCT FROM amount / divisor',
  reverse_null: 'amount / divisor IS NOT DISTINCT FROM NULL::integer',
  both_errors: 'amount / divisor IS DISTINCT FROM amount + 2147483647',
  nested: '(amount IS DISTINCT FROM divisor) IS NOT DISTINCT FROM flag',
  boolean_test: '(amount IS DISTINCT FROM divisor) IS UNKNOWN',
  conditional:
    'CASE WHEN amount IS NOT DISTINCT FROM divisor THEN flag ELSE amount / divisor > 0 END',
  result: '(CASE WHEN flag THEN amount ELSE divisor END) IS DISTINCT FROM amount',
  coalesce: 'COALESCE(amount IS DISTINCT FROM divisor, amount / divisor > 0)',
  conjunction: '(amount IS DISTINCT FROM divisor) AND amount / divisor > 0',
  disjunction: '(amount IS NOT DISTINCT FROM divisor) OR amount / divisor > 0',
  skipped_division: '(NULL::integer IS DISTINCT FROM NULL::integer) AND amount / divisor > 0',
  skipped_or: '(NULL::integer IS NOT DISTINCT FROM NULL::integer) OR amount / divisor > 0',
  skipped_case: 'CASE WHEN NULL IS NOT DISTINCT FROM NULL THEN flag ELSE 1 / 0 > 0 END',
  constant_error: 'CASE WHEN flag THEN true ELSE NULL::integer IS DISTINCT FROM 1 / 0 END',
  nested_constant_error: 'amount + 1 / 0 IS DISTINCT FROM divisor',
  conditional_constant_error:
    '(CASE WHEN flag THEN NULL::integer ELSE amount + 1 / 0 END) IS NOT DISTINCT FROM divisor',
  coalesce_constant_error: 'COALESCE(amount, 1 / 0) IS DISTINCT FROM divisor',
  skipped_operand_constant:
    '(CASE WHEN true THEN amount ELSE 1 / 0 END) IS NOT DISTINCT FROM divisor',
  skipped_coalesce_constant: 'COALESCE(1, 1 / 0) IS DISTINCT FROM amount',
  rewritten_constant_error: 'CASE WHEN flag THEN true ELSE NULL IS DISTINCT FROM 1 / 0 END',
  text_literals: "'a' IS DISTINCT FROM 'b'",
  enum_literal: "status_left IS NOT DISTINCT FROM 'approved'",
  scalar_literal: 'amount IS DISTINCT FROM 1',
  typed_literal: 'amount IS NOT DISTINCT FROM NULL::integer',
  array_null: 'items IS DISTINCT FROM NULL',
  array_same_null: 'NULL IS NOT DISTINCT FROM items',
}
Object.assign(expressions, compositions)
const base: Row = {
  amount: input(1),
  small: input(1),
  large: input(1n),
  domain_amount: input(1),
  divisor: input(1),
  flag: input(true),
  items: input(null),
}

describe('NULL-safe equality in CHECK evaluators', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-distinct-'))
    await pg.exec(`SET timezone = 'UTC';
      CREATE TYPE review_status AS ENUM ('pending', 'approved');
      CREATE DOMAIN review_amount AS integer;
      CREATE TABLE distinct_checks (
        ${families.flatMap(({ name, type }) => [`${name}_left ${type}`, `${name}_right ${type}`]).join(',')},
        amount integer, small smallint, large bigint, domain_amount review_amount, divisor integer, flag boolean, items integer[],
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
          .join(',')}
      )`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((item) => item.name === 'distinct_checks')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  const lower = (name: string, sql: string) =>
    lowerTableCheck(
      table,
      { name, type: 'check', definition: `CHECK (${sql})` },
      catalog.enums,
      catalog.domains,
    )!.expression

  it('preserves catalog resolution and defers unavailable coercions and value families', async () => {
    const expression = lower('mixed', compositions['mixed_small']!)
    expect(expression.kind).toBe('eval-scalar')
    if (expression.kind !== 'eval-scalar' || expression.expression.kind !== 'distinct')
      throw new Error('Expected distinct expression')
    const metadata = builtinMetadata(expression.expression.comparison.signature!)
    expect(metadata.kind).toBe('operator')
    expect(metadata.args).toEqual(['pg_catalog.int2', 'pg_catalog.int4'])
    await expect(pg.query("SELECT 1 IS DISTINCT FROM '1.5'")).rejects.toMatchObject({
      code: '22P02',
    })
    expect(hasUncertain(lower('coercion', "1 IS DISTINCT FROM '1.5'"))).toBe(true)
    await expect(pg.query('SELECT NULL::json IS DISTINCT FROM NULL::json')).rejects.toMatchObject({
      code: '42883',
    })
    expect(hasUncertain(lower('json', 'NULL::json IS DISTINCT FROM NULL::json'))).toBe(true)
    for (const sql of ['1::float8 IS DISTINCT FROM 1::float8']) {
      const expression = lower('float', sql)
      expect(hasUncertain(expression), sql).toBe(false)
      const group = prepareCheckRustGroup([
        {
          expression,
          identity: {
            schema: 'public',
            kind: 'table',
            owner: table.name,
            constraint: 'float_support',
          },
        },
      ])
      expect(group.checks[0]?.kind, sql).toBe('supported')
    }
    for (const sql of [
      'ROW(ROW(amount, divisor), amount) IS DISTINCT FROM ROW(ROW(divisor, amount), divisor)',
    ]) {
      const group = prepareCheckRustGroup([
        {
          expression: lower('unavailable', sql),
          identity: {
            schema: 'public',
            kind: 'table',
            owner: table.name,
            constraint: 'unavailable',
          },
        },
      ])
      expect(hasUncertain(lower('unavailable', sql)) || group.checks[0]?.kind !== 'supported').toBe(
        true,
      )
    }
  })

  it('matches raw/stored PostgreSQL semantics across values, NULL, Unknown, errors and composition', async () => {
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
    const group = prepareCheckRustGroup(
      entries.map((constraint) => {
        const expression = lowerTableCheck(
          table,
          constraint,
          catalog.enums,
          catalog.domains,
        )!.expression
        expect(hasUncertain(expression), constraint.name).toBe(false)
        return {
          expression,
          identity: {
            schema: table.schema,
            kind: 'table' as const,
            owner: table.name,
            constraint: constraint.name,
          },
        }
      }),
    )
    group.checks.forEach((check, index) =>
      expect(check.kind, entries[index]!.name).toBe('supported'),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const add = (name: string, row: Row, expected: Outcome) => {
      for (const prefix of ['raw', 'stored'])
        fixtures.push({ name: `${prefix}_${name}`, row, expected })
    }
    for (const family of families) {
      const values = [{ sql: 'NULL', input: input(null) }, ...family.values]
      for (const left of values)
        for (const right of values)
          for (const suffix of ['distinct', 'same']) {
            const name = `${family.name}_${suffix}`
            const result = (
              await pg.query<{ value: boolean }>(
                `WITH candidate AS MATERIALIZED (SELECT ${left.sql}::${family.type} ${family.name}_left, ${right.sql}::${family.type} ${family.name}_right) SELECT (${expressions[name]}) value FROM candidate`,
              )
            ).rows[0]!.value
            add(
              name,
              { [`${family.name}_left`]: left.input, [`${family.name}_right`]: right.input },
              { kind: result ? 'True' : 'False' },
            )
          }
      for (const suffix of ['distinct', 'same'])
        for (const [left, right, expected] of [
          [{ kind: 'Unknown' }, input(null), { kind: 'Unknown' }],
          [input(null), { kind: 'Unknown' }, { kind: 'Unknown' }],
          [{ kind: 'Unknown' }, error('22003'), error('22003')],
          [error('22012'), { kind: 'Unknown' }, error('22012')],
          [error('22012'), error('22003'), error('22012')],
          [input(null), error('22003'), error('22003')],
          [error('22003'), input(null), error('22003')],
        ] as [Input, Input, Outcome][])
          add(
            `${family.name}_${suffix}`,
            { [`${family.name}_left`]: left, [`${family.name}_right`]: right },
            expected,
          )
    }
    const numericNames = Object.keys(compositions).filter(
      (name) =>
        ![
          'text_relabel',
          'network_relabel',
          'enum_literal',
          'array_null',
          'array_same_null',
        ].includes(name),
    )
    for (const amount of [null, 0, 1, -2147483648])
      for (const divisor of [null, 0, 1, -1])
        for (const flag of [null, true, false])
          for (const name of numericNames) {
            let expected: Outcome
            try {
              const result = (
                await pg.query<{ value: boolean | null }>(
                  `WITH candidate AS MATERIALIZED (SELECT $1::integer amount, $2::integer divisor, $3::bool flag, 1::smallint small, 1::bigint large, 1::review_amount domain_amount) SELECT (${expressions[name]}) value FROM candidate`,
                  [amount, divisor, flag],
                )
              ).rows[0]!.value
              expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
            } catch (exception) {
              const code = (exception as { code: string }).code
              expect(['22003', '22012']).toContain(code)
              expected = error(code)
            }
            add(
              name,
              { ...base, amount: input(amount), divisor: input(divisor), flag: input(flag) },
              expected,
            )
          }
    for (const name of ['text_relabel', 'network_relabel', 'enum_literal']) {
      const row = {
        text_left: input('a'),
        varchar_right: input('a '),
        inet_left: input('192.0.2.0/24'),
        cidr_right: input('192.0.2.0/24'),
        status_left: input(1),
      }
      const result = (
        await pg.query<{ value: boolean }>(
          `WITH candidate AS MATERIALIZED (SELECT 'a'::text text_left, 'a '::varchar varchar_right, '192.0.2.0/24'::inet inet_left, '192.0.2.0/24'::cidr cidr_right, 'approved'::review_status status_left) SELECT (${expressions[name]}) value FROM candidate`,
        )
      ).rows[0]!.value
      add(name, row, { kind: result ? 'True' : 'False' })
    }
    for (const name of ['array_null', 'array_same_null'])
      for (const [items, expected] of [
        [input(null), { kind: name === 'array_null' ? 'False' : 'True' }],
        [input('SQL-coerced array'), { kind: name === 'array_null' ? 'True' : 'False' }],
        [{ kind: 'Unknown' }, { kind: 'Unknown' }],
        [error('22003'), error('22003')],
      ] as [Input, Outcome][])
        add(name, { items }, expected)
    for (const [name, row, expected] of [
      [
        'typed_null',
        { ...base, amount: { kind: 'Unknown' }, divisor: error('22003') },
        error('22003'),
      ],
      ['nested', { ...base, amount: { kind: 'Unknown' } }, { kind: 'Unknown' }],
      ['coalesce', { ...base, amount: { kind: 'Unknown' } }, { kind: 'Unknown' }],
      [
        'conjunction',
        { ...base, divisor: input(1), amount: input(1), flag: error('22003') },
        { kind: 'False' },
      ],
      ['skipped_division', { ...base, divisor: error('22003') }, { kind: 'False' }],
      ['skipped_or', { ...base, divisor: error('22003') }, { kind: 'True' }],
      ['skipped_case', { ...base, flag: { kind: 'Unknown' } }, { kind: 'Unknown' }],
    ] as [string, Row, Outcome][])
      add(name, row, expected)
    await runCheckParity(
      directory,
      'distinctchecks',
      group,
      entries.map((entry) => entry.name),
      fixtures,
    )
  }, 180_000)
})
