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
const operations = [
  ['eq', '='],
  ['ne', '<>'],
  ['lt', '<'],
  ['le', '<='],
  ['gt', '>'],
  ['ge', '>='],
  ['distinct', 'IS DISTINCT FROM'],
  ['same', 'IS NOT DISTINCT FROM'],
] as const
const ordered = new Set(['lt', 'le', 'gt', 'ge'])
const expressions: Record<string, string> = Object.fromEntries(
  families.flatMap(({ name }) =>
    operations.map(([label, operator]) => [
      `${name}_${label}`,
      `ROW(${name}_left, amount) ${operator} ROW(${name}_right, divisor)`,
    ]),
  ),
)
const compositions: Record<string, string> = {
  mixed: 'ROW(small,large) < ROW(amount,small)',
  numeric_coercion: 'ROW(amount,small) <= ROW(decimal_right,large)',
  text_coercion: 'ROW(varchar_left,amount) < ROW(text_right,divisor)',
  network_coercion: 'ROW(cidr_left,amount) >= ROW(inet_right,divisor)',
  bit_coercion: 'ROW(bit_left,amount) <= ROW(varbit_right,divisor)',
  domain: 'ROW(domain_amount,first) <= ROW(amount,other_first)',
  single: 'ROW(amount) < ROW(divisor)',
  single_null_left: 'ROW(NULL::integer) < ROW(amount / divisor)',
  ordered_null_left: 'ROW(NULL::integer,first) < ROW(amount / divisor,other_first)',
  equality_null_left: 'ROW(NULL::integer,first) = ROW(amount / divisor,other_first)',
  runtime_ordered: 'ROW(first,amount / divisor) < ROW(other_first,0)',
  runtime_equal: 'ROW(first,amount / divisor) = ROW(other_first,0)',
  runtime_distinct: 'ROW(first,amount / divisor) IS DISTINCT FROM ROW(other_first,0)',
  runtime_same: 'ROW(first,amount / divisor) IS NOT DISTINCT FROM ROW(other_first,0)',
  constant_ordered: 'ROW(1,1 / 0) < ROW(2,0)',
  constant_equal: 'ROW(1,1 / 0) = ROW(2,0)',
  constant_ne: 'ROW(1,1 / 0) <> ROW(2,0)',
  constant_distinct: 'ROW(1,1 / 0) IS DISTINCT FROM ROW(2,0)',
  constant_same: 'ROW(1,1 / 0) IS NOT DISTINCT FROM ROW(2,0)',
  constant_null_ordered: 'ROW(NULL::integer,1 / 0) < ROW(2,0)',
  constant_parent: 'COALESCE(ROW(1,1 / 0) < ROW(2,0),true)',
  constant_null_parent: 'COALESCE(ROW(NULL::integer,1 / 0) < ROW(2,0),true)',
  outer_false: 'CASE WHEN false THEN ROW(1,1 / 0) < ROW(2,0) ELSE flag END',
  dynamic_case: 'CASE WHEN flag THEN true ELSE ROW(first,1 / 0) < ROW(other_first,0) END',
  argument_case: 'ROW(first,CASE WHEN true THEN amount ELSE 1 / 0 END) < ROW(other_first,0)',
  argument_coalesce: 'ROW(first,COALESCE(1,1 / 0)) < ROW(other_first,0)',
  reached_argument_case:
    'ROW(first,CASE WHEN flag THEN amount ELSE 1 / 0 END) < ROW(other_first,0)',
  conjunction: 'flag AND ROW(first,amount / divisor) < ROW(other_first,0)',
  disjunction: 'flag OR ROW(first,amount / divisor) < ROW(other_first,0)',
  boolean_test: '(ROW(first,amount) <= ROW(other_first,divisor)) IS UNKNOWN',
}
Object.assign(expressions, compositions)
const base: Row = {
  first: input(1),
  other_first: input(2),
  amount: input(1),
  divisor: input(1),
  small: input(1),
  large: input(1n),
  domain_amount: input(1),
  flag: input(true),
}
const candidate =
  'WITH candidate AS MATERIALIZED (SELECT $1::integer first,$2::integer other_first,$3::integer amount,$4::integer divisor,$5::boolean flag,1::smallint small,1::bigint large,1::review_amount domain_amount)'

describe('fixed ROW constructor comparisons in CHECKs', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-row-comparisons-'))
    await pg.exec(`SET timezone='UTC'; CREATE TYPE review_status AS ENUM ('pending','approved');
      CREATE TYPE review_pair AS (amount integer,label text);
      CREATE DOMAIN review_amount AS integer; CREATE DOMAIN review_stage AS review_status;
      CREATE COLLATION row_locale (provider=icu,locale='en-US',deterministic=true);
      CREATE TABLE row_checks (
        ${families.flatMap(({ name, type }) => [`${name}_left ${type}${['text', 'varchar', 'bpchar'].includes(name) ? ' COLLATE "C"' : ''}`, `${name}_right ${type}${['text', 'varchar', 'bpchar'].includes(name) ? ' COLLATE "C"' : ''}`]).join(',')},
        first integer,other_first integer,amount integer,divisor integer,small smallint,large bigint,flag boolean,
        domain_amount review_amount,domain_stage review_stage,locale_text text COLLATE row_locale,record_value review_pair,floating_amount double precision,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
          .join(',')})`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((item) => item.name === 'row_checks')!
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

  it('resolves B-tree comparators from each operator identity and keeps broader records and contexts explicit', async () => {
    const expression = lower(compositions['mixed']!)
    if (expression.kind !== 'eval-scalar' || expression.expression.kind !== 'row-compare')
      throw new Error('Expected row ordering')
    expect(expression.expression.strategy).toBe(1)
    expect(
      expression.expression.pairs.map((pair) => builtinMetadata(pair.comparison.signature!).name),
    ).toEqual(['btint24cmp', 'btint82cmp'])
    for (const sql of ['ROW(floating_amount,amount) < ROW(floating_amount,divisor)']) {
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
    for (const sql of [
      'ROW(locale_text,amount) < ROW(locale_text,divisor)',
      'ROW(record_value,amount) = ROW(record_value,divisor)',
      'ROW(ROW(amount,divisor),first) = ROW(ROW(divisor,amount),other_first)',
    ]) {
      const expression = lower(sql)
      const group = prepareCheckRustGroup([
        {
          expression,
          identity: {
            schema: 'public',
            kind: 'table',
            owner: table.name,
            constraint: 'unsupported',
          },
        },
      ])
      expect(hasUncertain(expression) || group.checks[0]?.kind !== 'supported', sql).toBe(true)
    }
    for (const [sql, code] of [
      ['ROW(amount,divisor) < ROW(first)', '42601'],
      ['ROW() = ROW()', '0A000'],
      ['ROW(domain_stage,amount) < ROW(status_left,divisor)', '42883'],
      ['ROW(NULL::json,amount) IS DISTINCT FROM ROW(NULL,divisor)', '42883'],
    ] as const) {
      await expect(pg.query(`SELECT ${sql} FROM row_checks`)).rejects.toMatchObject({ code })
      expect(hasUncertain(lower(sql)), sql).toBe(true)
    }
  })

  it('matches PostgreSQL raw/stored ordering, NULLs, planning, lazy fields and partial inputs across represented values', async () => {
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
      const collation = ['text', 'varchar', 'bpchar'].includes(family.name) ? ' COLLATE "C"' : ''
      for (const left of values)
        for (const right of values)
          for (const tail of [0, 1]) {
            const row: Row = {
              [`${family.name}_left`]: left.input,
              [`${family.name}_right`]: right.input,
              amount: input(0),
              divisor: input(tail),
            }
            const query = `WITH candidate AS MATERIALIZED (SELECT ${left.sql}::${family.type}${collation} ${family.name}_left,${right.sql}::${family.type}${collation} ${family.name}_right,0::integer amount,${tail}::integer divisor)`
            for (const [label] of operations) await oracle(`${family.name}_${label}`, query, row)
          }
      for (const [label] of operations) {
        add(
          `${family.name}_${label}`,
          {
            [`${family.name}_left`]: { kind: 'Unknown' },
            [`${family.name}_right`]: input(null),
            amount: input(0),
            divisor: input(1),
          },
          ordered.has(label)
            ? { kind: 'Null' }
            : { kind: label === 'eq' || label === 'same' ? 'False' : 'True' },
        )
        add(
          `${family.name}_${label}`,
          {
            [`${family.name}_left`]: { kind: 'Unknown' },
            [`${family.name}_right`]: input(null),
            amount: error('22003'),
            divisor: input(0),
          },
          label === 'eq' || label === 'ne'
            ? error('22003')
            : { kind: ordered.has(label) ? 'Null' : 'Unknown' },
        )
        add(
          `${family.name}_${label}`,
          {
            [`${family.name}_left`]: error('22012'),
            [`${family.name}_right`]: { kind: 'Unknown' },
            amount: error('22003'),
            divisor: input(0),
          },
          error('22012'),
        )
      }
    }
    for (const [name, sql, row] of [
      [
        'numeric_coercion',
        '1::integer amount,1.00::numeric decimal_right,1::smallint small,2::bigint large',
        { amount: input(1), decimal_right: input('1.00'), small: input(1), large: input(2n) },
      ],
      [
        'text_coercion',
        '\'a\'::varchar COLLATE "C" varchar_left,\'é\'::text COLLATE "C" text_right,1::integer amount,0::integer divisor',
        { varchar_left: input('a'), text_right: input('é'), amount: input(1), divisor: input(0) },
      ],
      [
        'network_coercion',
        "'192.0.2.0/24'::cidr cidr_left,'192.0.2.1/32'::inet inet_right,1::integer amount,0::integer divisor",
        {
          cidr_left: input('192.0.2.0/24'),
          inet_right: input('192.0.2.1/32'),
          amount: input(1),
          divisor: input(0),
        },
      ],
      [
        'bit_coercion',
        "B'001'::bit(3) bit_left,B'111'::varbit varbit_right,1::integer amount,0::integer divisor",
        { bit_left: input('001'), varbit_right: input('111'), amount: input(1), divisor: input(0) },
      ],
    ] as [string, string, Row][])
      await oracle(name, `WITH candidate AS MATERIALIZED (SELECT ${sql})`, row)
    for (const args of [
      [1, 2, 1, 0, true],
      [1, 1, 1, 0, false],
      [2, 1, 1, 0, null],
      [null, 1, 1, 0, true],
      [null, null, 1, 0, false],
      [1, null, null, 0, false],
      [1, 1, -2147483648, -1, true],
      [1, 1, 0, 1, false],
    ] as const) {
      const row = {
        ...base,
        first: input(args[0]),
        other_first: input(args[1]),
        amount: input(args[2]),
        divisor: input(args[3]),
        flag: input(args[4]),
      }
      for (const name of Object.keys(compositions).filter(
        (name) =>
          !['numeric_coercion', 'text_coercion', 'network_coercion', 'bit_coercion'].includes(name),
      ))
        await oracle(name, candidate, row, [...args])
    }
    add('single_null_left', { ...base, amount: error('22003') }, { kind: 'Null' })
    add('ordered_null_left', { ...base, amount: error('22003') }, error('22003'))
    add('equality_null_left', { ...base, amount: error('22003') }, { kind: 'False' })
    add('outer_false', { ...base, flag: { kind: 'Unknown' } }, { kind: 'Unknown' })
    add('dynamic_case', { ...base, flag: { kind: 'Unknown' } }, error('22012'))
    await runCheckParity(
      directory,
      'rowcomparisons',
      group,
      entries.map((entry) => entry.name),
      fixtures,
    )
  }, 240_000)
})
