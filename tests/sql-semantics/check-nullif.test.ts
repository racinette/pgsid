import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
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
    [`${name}_null`, `NULLIF(${name}_left, ${name}_right) IS NULL`],
    [`${name}_value`, `NULLIF(${name}_left, ${name}_right) IS NOT DISTINCT FROM ${name}_left`],
  ]),
)
const compositions: Record<string, string> = {
  division: 'amount / NULLIF(divisor, 0) > 0',
  null_first: 'NULLIF(NULL::integer, amount / divisor) IS NULL',
  untyped_null_first: 'NULLIF(NULL, amount / divisor) IS NULL',
  null_second: 'NULLIF(amount / divisor, NULL::integer) IS NULL',
  nested: 'NULLIF(NULLIF(amount, divisor), 1) IS DISTINCT FROM NULL',
  computed: 'NULLIF(amount / divisor, amount + 2147483647) IS NULL',
  conditional: 'CASE WHEN flag THEN NULLIF(amount / divisor, amount) IS NULL ELSE true END',
  selected: 'NULLIF(CASE WHEN flag THEN amount ELSE divisor END, amount) IS NULL',
  fallback: 'COALESCE(NULLIF(amount, divisor), amount / divisor) > 0',
  boolean: 'COALESCE(NULLIF(flag, other_flag), amount / divisor > 0)',
  boolean_test: 'NULLIF(flag, other_flag) IS UNKNOWN',
  conjunction: 'flag AND NULLIF(amount / divisor, amount) IS NULL',
  disjunction: 'flag OR NULLIF(amount / divisor, amount) IS NULL',
  constant_error: 'CASE WHEN flag THEN true ELSE NULLIF(NULL::integer, 1 / 0) IS NULL END',
  nested_constant: 'NULLIF(amount + 1 / 0, divisor) IS NULL',
  folded_null: 'NULLIF(NULLIF(NULL::integer, amount / divisor), amount / divisor) IS NULL',
  folded_equal: 'NULLIF(NULLIF(1, 1), amount / divisor) IS NULL',
  strict_parent: 'pg_catalog.int4eq(NULLIF(1,1), amount / divisor) IS NULL',
  strict_arithmetic: '10 / NULLIF(1,1) > amount / divisor',
  folded_parent_error: 'pg_catalog.int4eq(NULLIF(1,1), amount + 1 / 0) IS NULL',
  skipped_constant: 'CASE WHEN false THEN NULLIF(NULL::integer, 1 / 0) IS NULL ELSE flag END',
  constant_guard: 'CASE WHEN NULLIF(1,1) IS NULL THEN flag ELSE 1 / 0 > 0 END',
  skipped_operand_constant:
    'NULLIF(NULL::integer, CASE WHEN true THEN amount / divisor ELSE 1 / 0 END) IS NULL',
  reached_operand_constant:
    'NULLIF(NULL::integer, CASE WHEN flag THEN amount / divisor ELSE 1 / 0 END) IS NULL',
  skipped_coalesce: 'NULLIF(NULL::integer, COALESCE(1,1 / 0)) IS NULL',
  reached_coalesce: 'NULLIF(NULL::integer, COALESCE(amount,1 / 0)) IS NULL',
  typed_literal: 'NULLIF(amount, 1) IS NULL',
  both_null: 'NULLIF(NULL,NULL) IS NULL',
  text_literal: "NULLIF('a','b') = 'a'",
  enum_literal: "NULLIF(status_left, 'pending') IS NOT DISTINCT FROM status_left",
  mixed_small: 'NULLIF(small, amount) IS NOT DISTINCT FROM small',
  mixed_big: 'NULLIF(amount, large) IS NOT DISTINCT FROM amount',
  numeric_coercion: 'NULLIF(amount, decimal_right) IS NOT DISTINCT FROM amount::numeric',
  text_coercion: 'NULLIF(varchar_left, text_right) IS NOT DISTINCT FROM varchar_left::text',
  network_coercion: 'NULLIF(cidr_left, inet_right) IS NOT DISTINCT FROM cidr_left::inet',
  network_literal: "NULLIF(cidr_left, '192.0.2.1/24') IS NOT DISTINCT FROM cidr_left::inet",
  bit_coercion: 'NULLIF(bit_left, varbit_right) IS NOT DISTINCT FROM bit_left::varbit',
  domain: 'NULLIF(domain_amount, amount) IS NOT DISTINCT FROM domain_amount::integer',
  numeric_payload: 'numeric_send(NULLIF(decimal_left, decimal_right)) = numeric_send(decimal_left)',
  character_payload: 'octet_length(NULLIF(bpchar_left, bpchar_right)) = octet_length(bpchar_left)',
}
Object.assign(expressions, compositions)
const base: Row = {
  amount: input(1),
  divisor: input(1),
  flag: input(true),
  other_flag: input(false),
  small: input(1),
  large: input(1n),
  domain_amount: input(1),
}
const candidate = `WITH candidate AS MATERIALIZED (SELECT $1::integer amount, $2::integer divisor, $3::boolean flag, $4::boolean other_flag, 1::smallint small, 1::bigint large, 1::review_amount domain_amount)`

describe('NULLIF CHECK evaluation', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-nullif-'))
    await pg.exec(`SET timezone = 'UTC'; CREATE TYPE review_status AS ENUM ('pending','approved');
      CREATE DOMAIN review_amount AS integer; CREATE DOMAIN review_stage AS review_status;
      CREATE TABLE nullif_checks (
        ${families.flatMap(({ name, type }) => [`${name}_left ${type}`, `${name}_right ${type}`]).join(',')},
        amount integer, divisor integer, flag boolean, other_flag boolean, small smallint, large bigint, domain_amount review_amount, domain_stage review_stage, floating_amount double precision,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
          .join(',')})`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((item) => item.name === 'nullif_checks')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  const lower = (sql: string) =>
    lowerTableCheck(
      table,
      { name: 'probe', type: 'check', definition: `CHECK (${sql})` },
      catalog.enums,
      catalog.domains,
    )!.expression

  it('resolves equality before coercion, preserving the coerced first operand type and catalog identity', async () => {
    for (const [sql, args, result] of [
      ['NULLIF(small,amount)', ['pg_catalog.int2', 'pg_catalog.int4'], 'smallint'],
      ['NULLIF(amount,large)', ['pg_catalog.int4', 'pg_catalog.int8'], 'integer'],
      ['NULLIF(amount,decimal_right)', ['pg_catalog."numeric"', 'pg_catalog."numeric"'], 'numeric'],
      ['NULLIF(varchar_left,varchar_right)', ['pg_catalog.text', 'pg_catalog.text'], 'text'],
      ['NULLIF(cidr_left,cidr_right)', ['pg_catalog.inet', 'pg_catalog.inet'], 'inet'],
      ['NULLIF(bit_left,varbit_right)', ['pg_catalog.varbit', 'pg_catalog.varbit'], 'bit varying'],
      ['NULLIF(domain_amount,amount)', ['pg_catalog.int4', 'pg_catalog.int4'], 'integer'],
    ] as const) {
      const expected = (
        await pg.query<{ type: string }>(
          `SELECT pg_typeof(${sql})::text type FROM nullif_checks RIGHT JOIN (VALUES (1)) placeholder(value) ON true`,
        )
      ).rows[0]!.type
      expect(expected, sql).toBe(result)
      const expression = lower(`(${sql}) IS NULL`)
      if (
        expression.kind !== 'eval-scalar' ||
        expression.expression.kind !== 'null-test' ||
        expression.expression.operand.kind !== 'nullif'
      )
        throw new Error('Expected NULLIF operand')
      const value = expression.expression.operand
      expect(builtinMetadata(value.comparison.signature!).args, sql).toEqual(args)
      expect(value.type, sql).toBe(args[0])
    }
    const malformedSql = "NULLIF(amount,'1.5') IS NULL"
    await expect(pg.query(`SELECT ${malformedSql} FROM nullif_checks`)).rejects.toMatchObject({
      code: '22P02',
    })
    const malformed = lower(malformedSql)
    expect(hasUncertain(malformed)).toBe(false)
    const malformedGroup = prepareCheckRustGroup([
      {
        expression: malformed,
        identity: {
          schema: 'public',
          kind: 'table',
          owner: table.name,
          constraint: 'malformed_integer_literal',
        },
      },
    ])
    expect(malformedGroup.checks[0]?.kind).toBe('supported')
    const malformedRows: Row[] = [
      { amount: { kind: 'Unknown' } },
      { amount: input(1) },
      { amount: input(null) },
      { amount: error('22012') },
    ]
    await runCheckParity(
      await mkdtemp(join(directory, 'literal-')),
      'nullifliteral',
      malformedGroup,
      ['malformed_integer_literal'],
      malformedRows.map((row) => ({
        name: 'malformed_integer_literal',
        row,
        expected: error('22P02'),
      })),
    )
    for (const [sql, code] of [
      ['NULLIF(macaddr_left,macaddr8_right)', '42725'],
      ['NULLIF(domain_stage,status_left)', '42883'],
      ['NULLIF(NULL::json,NULL::json)', '42883'],
    ]) {
      await expect(pg.query(`SELECT ${sql} FROM nullif_checks`)).rejects.toMatchObject({ code })
      expect(hasUncertain(lower(`(${sql}) IS NULL`)), sql).toBe(true)
    }
    for (const sql of [
      'NULLIF(1::float8,1::float8) IS NULL',
      'NULLIF(amount,floating_amount) IS NULL',
    ]) {
      const expression = lower(sql)
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
    for (const sql of ['NULLIF(ROW(amount,divisor),ROW(divisor,amount)) IS NULL']) {
      const expression = lower(sql)
      const group = prepareCheckRustGroup([
        {
          expression,
          identity: {
            schema: 'public',
            kind: 'table',
            owner: table.name,
            constraint: 'unavailable',
          },
        },
      ])
      expect(hasUncertain(expression) || group.checks[0]?.kind !== 'supported', sql).toBe(true)
    }
    const unsupported = lower('NULLIF(amount,floating_amount) IS NULL')
    if (
      unsupported.kind !== 'eval-scalar' ||
      unsupported.expression.kind !== 'null-test' ||
      unsupported.expression.operand.kind !== 'nullif'
    )
      throw new Error('Expected the catalog-resolved float NULLIF')
    expect(unsupported.expression.operand.type).toBe('pg_catalog.float8')
    expect(builtinMetadata(unsupported.expression.operand.comparison.signature!).args).toEqual([
      'pg_catalog.float8',
      'pg_catalog.float8',
    ])
  }, 120_000)

  it('matches PostgreSQL raw/stored values, NULLs, ownership, partial inputs, planning and lazy branches in every target', async () => {
    const entries = table.constraints
      .filter((check) => check.type === 'check')
      .flatMap((check) => [
        { ...check, name: `raw_${check.name}`, definition: `CHECK (${expressions[check.name]})` },
        { ...check, name: `stored_${check.name}` },
      ])
    const group = prepareCheckRustGroup(
      entries.map((check) => {
        const expression = lowerTableCheck(table, check, catalog.enums, catalog.domains)!.expression
        expect(hasUncertain(expression), check.name).toBe(false)
        return {
          expression,
          identity: {
            schema: table.schema,
            kind: 'table' as const,
            owner: table.name,
            constraint: check.name,
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
    const oracle = async (name: string, query: string, row: Row, args?: unknown[]) => {
      let expected: Outcome
      try {
        const value = (
          await pg.query<{ value: boolean | null }>(
            `${query} SELECT (${expressions[name]}) value FROM candidate`,
            args,
          )
        ).rows[0]!.value
        expected = { kind: value === null ? 'Null' : value ? 'True' : 'False' }
      } catch (exception) {
        const code = (exception as { code: string }).code
        expect(['22003', '22012']).toContain(code)
        expected = error(code)
      }
      add(name, row, expected)
    }
    for (const family of families) {
      const values = [{ sql: 'NULL', input: input(null) }, ...family.values]
      for (const left of values)
        for (const right of values) {
          const row = { [`${family.name}_left`]: left.input, [`${family.name}_right`]: right.input }
          const query = `WITH candidate AS MATERIALIZED (SELECT ${left.sql}::${family.type} ${family.name}_left, ${right.sql}::${family.type} ${family.name}_right)`
          for (const suffix of ['null', 'value'])
            await oracle(`${family.name}_${suffix}`, query, row)
          if (family.name === 'decimal') await oracle('numeric_payload', query, row)
          if (family.name === 'bpchar') await oracle('character_payload', query, row)
        }
      for (const suffix of ['null', 'value'])
        for (const [left, right, expected] of [
          [{ kind: 'Unknown' }, input(null), { kind: 'Unknown' }],
          [input(null), { kind: 'Unknown' }, { kind: 'Unknown' }],
          [{ kind: 'Unknown' }, family.values[0]!.input, { kind: 'Unknown' }],
          [family.values[0]!.input, { kind: 'Unknown' }, { kind: 'Unknown' }],
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
    const separate = [
      'enum_literal',
      'numeric_coercion',
      'text_coercion',
      'network_coercion',
      'network_literal',
      'bit_coercion',
      'numeric_payload',
      'character_payload',
    ]
    for (const amount of [null, 0, 1, -2147483648])
      for (const divisor of [null, 0, 1, -1])
        for (const flag of [null, true, false])
          for (const name of Object.keys(compositions).filter((name) => !separate.includes(name)))
            await oracle(
              name,
              candidate,
              { ...base, amount: input(amount), divisor: input(divisor), flag: input(flag) },
              [amount, divisor, flag, false],
            )
    for (const name of separate.filter(
      (name) => !['numeric_payload', 'character_payload'].includes(name),
    ))
      for (const [amount, decimal] of [
        [1, '1.00'],
        [1, '2.00'],
        [null, null],
      ] as const) {
        const row: Row = {
          amount: input(amount),
          decimal_right: input(decimal),
          varchar_left: input('a '),
          text_right: input('a'),
          cidr_left: input('192.0.2.0/24'),
          inet_right: input('192.0.2.0/32'),
          bit_left: input('001'),
          varbit_right: input('001'),
          status_left: input(1),
        }
        await oracle(
          name,
          `WITH candidate AS MATERIALIZED (SELECT $1::integer amount,$2::numeric decimal_right,'a '::varchar varchar_left,'a'::text text_right,'192.0.2.0/24'::cidr cidr_left,'192.0.2.0/32'::inet inet_right,B'001'::bit(3) bit_left,B'001'::varbit varbit_right,'approved'::review_status status_left)`,
          row,
          [amount, decimal],
        )
      }
    for (const [name, row, expected] of [
      [
        'null_first',
        { ...base, amount: error('22003'), divisor: { kind: 'Unknown' } },
        { kind: 'True' },
      ],
      [
        'untyped_null_first',
        { ...base, amount: { kind: 'Unknown' }, divisor: error('22003') },
        { kind: 'True' },
      ],
      ['folded_null', { ...base, amount: error('22003') }, { kind: 'True' }],
      ['folded_equal', { ...base, amount: error('22003') }, { kind: 'True' }],
      ['strict_parent', { ...base, amount: error('22003') }, { kind: 'True' }],
      ['strict_arithmetic', { ...base, amount: error('22003') }, { kind: 'Null' }],
      ['typed_literal', { ...base, amount: { kind: 'Unknown' } }, { kind: 'Unknown' }],
      ['null_second', { ...base, amount: input(null), divisor: error('22003') }, error('22003')],
      ['boolean', { ...base, flag: { kind: 'Unknown' } }, { kind: 'Unknown' }],
      [
        'boolean',
        { ...base, flag: input(true), other_flag: input(false), divisor: error('22003') },
        { kind: 'True' },
      ],
      ['skipped_constant', { ...base, flag: { kind: 'Unknown' } }, { kind: 'Unknown' }],
      ['constant_guard', { ...base, flag: error('22003') }, error('22003')],
      ['reached_operand_constant', { ...base, flag: { kind: 'Unknown' } }, error('22012')],
    ] as [string, Row, Outcome][])
      add(name, row, expected)
    await runCheckParity(
      directory,
      'nullifchecks',
      group,
      entries.map((entry) => entry.name),
      fixtures,
    )
  }, 180_000)
})
