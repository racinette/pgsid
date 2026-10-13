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
import { enumType } from '../../src/sql-semantics/expressions.js'
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
const operations = ['greatest', 'least'] as const
const expressions: Record<string, string> = Object.fromEntries(
  families.flatMap(({ name }) =>
    operations.flatMap((operation) => [
      [`${name}_${operation}_null`, `${operation}(${name}_left, ${name}_right) IS NULL`],
      [
        `${name}_${operation}_value`,
        `${operation}(${name}_left, ${name}_right, ${name}_left) IS NOT DISTINCT FROM ${name}_left`,
      ],
    ]),
  ),
)
const compositions: Record<string, string> = {
  mixed: 'GREATEST(small, amount, large) = large',
  decimal_coercion: 'LEAST(amount, decimal_left) = decimal_left',
  text_coercion: 'octet_length(GREATEST(varchar_left,text_right)) = octet_length(varchar_left)',
  reverse_text: 'octet_length(LEAST(text_left,varchar_right)) = octet_length(text_left)',
  character_coercion:
    'octet_length(GREATEST(bpchar_left,varchar_right)) = octet_length(bpchar_left)',
  reverse_character: 'octet_length(LEAST(varchar_left,bpchar_right)) = octet_length(varchar_left)',
  network_coercion: 'GREATEST(cidr_left,inet_right) IS NOT DISTINCT FROM cidr_left::inet',
  mac_coercion: 'LEAST(macaddr_left,macaddr8_right) IS NOT DISTINCT FROM macaddr_left',
  reverse_mac: 'GREATEST(macaddr8_left,macaddr_right) IS NOT DISTINCT FROM macaddr8_left',
  bit_coercion: 'GREATEST(bit_left,varbit_right) IS NOT DISTINCT FROM bit_left',
  reverse_bit: 'LEAST(varbit_left,bit_right) IS NOT DISTINCT FROM varbit_left',
  domain: 'GREATEST(domain_amount, amount) IS NOT DISTINCT FROM amount',
  enum_domain: 'GREATEST(domain_stage,domain_stage) IS NULL',
  mixed_enum_domain: 'LEAST(domain_stage,status_left) IS NOT DISTINCT FROM status_left',
  numeric_payload:
    'numeric_send(GREATEST(decimal_left, decimal_right)) = numeric_send(decimal_left)',
  least_numeric_payload:
    'numeric_send(LEAST(decimal_left, decimal_right)) = numeric_send(decimal_left)',
  character_payload: 'octet_length(GREATEST(bpchar_left,bpchar_right)) = octet_length(bpchar_left)',
  least_character_payload:
    'octet_length(LEAST(bpchar_left,bpchar_right)) = octet_length(bpchar_left)',
  single: 'GREATEST(amount) IS NOT DISTINCT FROM amount',
  single_text: 'LEAST(locale_text) IS NOT DISTINCT FROM locale_text',
  both_null: 'GREATEST(NULL,NULL) IS NULL',
  text_literals: "GREATEST('a' COLLATE \"C\",'b') = 'b'",
  enum_literal: "LEAST(status_left,'approved') IS NOT DISTINCT FROM status_left",
  network_literal: "GREATEST(cidr_left,'192.0.3.0/24') IS NOT DISTINCT FROM cidr_left",
  numeric_literal: "LEAST(decimal_left,'1.25') IS NOT DISTINCT FROM decimal_left",
  nulls: 'LEAST(NULL::integer, amount, NULL, divisor, NULL) IS NULL',
  bool_root: 'GREATEST(flag, other_flag)',
  bool_least: 'LEAST(flag, other_flag)',
  bool_test: 'LEAST(flag, other_flag) IS UNKNOWN',
  eager: 'GREATEST(amount, amount / divisor) > 0',
  null_eager: 'LEAST(NULL::integer, amount / divisor) IS NULL',
  both_errors: 'GREATEST(amount / divisor, amount + 2147483647) > 0',
  reverse_errors: 'LEAST(amount + 2147483647, amount / divisor) > 0',
  nested: 'GREATEST(LEAST(amount, divisor), amount) = amount',
  argument_case: 'GREATEST(CASE WHEN flag THEN amount ELSE divisor END, divisor) > 0',
  conditional: 'CASE WHEN flag THEN GREATEST(amount, amount / divisor) > 0 ELSE true END',
  conjunction: 'flag AND LEAST(amount, amount / divisor) > 0',
  disjunction: 'flag OR GREATEST(amount, amount / divisor) > 0',
  coalesce: 'COALESCE(LEAST(amount,divisor), amount / divisor) > 0',
  nullif: 'GREATEST(NULLIF(NULL::integer, amount / divisor), amount) = amount',
  strict_parent:
    'pg_catalog.int4eq(GREATEST(NULL::integer,NULL::integer), amount / divisor) IS NULL',
  folded_parent: 'pg_catalog.int4eq(LEAST(NULLIF(1,1),NULL::integer), amount / divisor) IS NULL',
  constant_error: 'CASE WHEN flag THEN true ELSE GREATEST(amount,1 / 0) > 0 END',
  skipped_constant: 'CASE WHEN false THEN LEAST(amount,1 / 0) > 0 ELSE flag END',
  skipped_inner_case: 'GREATEST(CASE WHEN true THEN amount ELSE 1 / 0 END, divisor) > 0',
  reached_inner_case: 'LEAST(CASE WHEN flag THEN amount ELSE 1 / 0 END, divisor) > 0',
  skipped_inner_coalesce: 'GREATEST(COALESCE(1,1 / 0), amount) > 0',
  reached_inner_coalesce: 'LEAST(COALESCE(amount,1 / 0), divisor) > 0',
  constant_guard: 'CASE WHEN GREATEST(NULL::integer,1) = 1 THEN flag ELSE 1 / 0 > 0 END',
  skipped_or: 'GREATEST(false,true) OR amount / divisor > 0',
  skipped_and: 'LEAST(false,true) AND amount / divisor > 0',
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
  domain_stage: input(0),
  status_left: input(0),
}
const candidate =
  "WITH candidate AS MATERIALIZED (SELECT $1::integer amount, $2::integer divisor, $3::boolean flag, $4::boolean other_flag, 1::smallint small, 1::bigint large, 1::review_amount domain_amount, 'pending'::review_stage domain_stage, 'pending'::review_status status_left)"

describe('GREATEST and LEAST CHECK evaluation', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-minmax-'))
    await pg.exec(`SET timezone = 'UTC'; CREATE TYPE review_status AS ENUM ('pending','approved');
      CREATE TYPE other_status AS ENUM ('pending','approved');
      CREATE DOMAIN review_amount AS integer; CREATE DOMAIN review_stage AS review_status;
      CREATE COLLATION minmax_locale (provider=icu, locale='en-US', deterministic=true);
      CREATE COLLATION minmax_insensitive (provider=icu, locale='en-US-u-ks-level2', deterministic=false);
      CREATE TABLE minmax_checks (
        ${families.flatMap(({ name, type }) => [`${name}_left ${type}${['text', 'varchar', 'bpchar'].includes(name) ? ' COLLATE "C"' : ''}`, `${name}_right ${type}${['text', 'varchar', 'bpchar'].includes(name) ? ' COLLATE "C"' : ''}`]).join(',')},
        amount integer, divisor integer, small smallint, large bigint, flag boolean, other_flag boolean,
        domain_amount review_amount, domain_stage review_stage, floating_amount double precision,
        locale_text text COLLATE minmax_locale, insensitive_text text COLLATE minmax_insensitive,
        ${Object.entries(expressions)
          .map(([name, sql]) => `CONSTRAINT ${name} CHECK (${sql})`)
          .join(',')})`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((item) => item.name === 'minmax_checks')!
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

  it('selects common types before catalog ordering, preserving first-type preferences and unsupported winners', async () => {
    for (const [args, type, comparisonType, pgType] of [
      ['small,amount,large', 'pg_catalog.int8', 'pg_catalog.int8', 'bigint'],
      ['amount,decimal_left', 'pg_catalog."numeric"', 'pg_catalog."numeric"', 'numeric'],
      ['varchar_left,text_right', 'pg_catalog."varchar"', 'pg_catalog.text', 'character varying'],
      ['text_left,varchar_right', 'pg_catalog.text', 'pg_catalog.text', 'text'],
      ['bpchar_left,varchar_right', 'pg_catalog.bpchar', 'pg_catalog.bpchar', 'character'],
      ['varchar_left,bpchar_right', 'pg_catalog."varchar"', 'pg_catalog.text', 'character varying'],
      ['cidr_left,cidr_right', 'pg_catalog.cidr', 'pg_catalog.inet', 'cidr'],
      ['cidr_left,inet_right', 'pg_catalog.inet', 'pg_catalog.inet', 'inet'],
      ['macaddr_left,macaddr8_right', 'pg_catalog.macaddr', 'pg_catalog.macaddr', 'macaddr'],
      ['macaddr8_left,macaddr_right', 'pg_catalog.macaddr8', 'pg_catalog.macaddr8', 'macaddr8'],
      ['bit_left,varbit_right', 'pg_catalog."bit"', 'pg_catalog."bit"', 'bit'],
      ['varbit_left,bit_right', 'pg_catalog.varbit', 'pg_catalog.varbit', 'bit varying'],
      ['amount,floating_amount', 'pg_catalog.float8', 'pg_catalog.float8', 'double precision'],
      [
        'status_left,status_right',
        enumType({ schema: 'public', name: 'review_status' }),
        'pg_catalog.anyenum',
        'review_status',
      ],
    ])
      for (const operation of operations) {
        const sql = `${operation}(${args})`
        expect(
          (
            await pg.query<{ type: string }>(
              `SELECT pg_typeof(${sql})::text type FROM minmax_checks RIGHT JOIN (VALUES(1)) p(value) ON true`,
            )
          ).rows[0]!.type,
          sql,
        ).toBe(pgType)
        const expression = lower(`${sql} IS NULL`)
        if (
          expression.kind !== 'eval-scalar' ||
          expression.expression.kind !== 'null-test' ||
          expression.expression.operand.kind !== 'minmax'
        )
          throw new Error(`Expected minmax for ${sql}`)
        const value = expression.expression.operand
        expect(value.type, sql).toBe(type)
        const metadata = builtinMetadata(value.comparison.signature!)
        expect(metadata.args, sql).toEqual([comparisonType, comparisonType])
        expect(metadata.name, sql).toBe(operation === 'greatest' ? '<' : '>')
        const ordering = (
          await pg.query<{ implementation: string }>(
            `SELECT o.oprcode::regproc::text implementation FROM pg_opclass c
        JOIN pg_am am ON am.oid=c.opcmethod AND am.amname='btree'
        JOIN pg_amop a ON a.amopfamily=c.opcfamily AND a.amoplefttype=c.opcintype AND a.amoprighttype=c.opcintype AND a.amopstrategy=$2
        JOIN pg_operator o ON o.oid=a.amopopr
        WHERE c.opcdefault AND c.opcintype=$1::regtype`,
            [comparisonType, operation === 'greatest' ? 1 : 5],
          )
        ).rows
        expect(ordering).toHaveLength(1)
        if (metadata.kind !== 'operator') throw new Error('Expected ordering operator')
        expect(builtinMetadata(metadata.implementation).name, sql).toBe(ordering[0]!.implementation)
      }
    for (const sql of ['GREATEST(amount,floating_amount) IS NULL']) {
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
      'LEAST(date_left,timestamptz_left) IS NULL',
      'GREATEST(locale_text,locale_text) IS NULL',
      'LEAST(insensitive_text,insensitive_text) IS NULL',
      'GREATEST(text_left COLLATE "C", text_right COLLATE minmax_locale) IS NULL',
      'GREATEST(ROW(amount,divisor),ROW(divisor,amount)) IS NULL',
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
      ['GREATEST(amount,flag)', '42804'],
      ["LEAST(status_left,'pending'::other_status)", '42846'],
      ["GREATEST(amount,'1.5')", '22P02'],
      ['LEAST(NULL::json,NULL::json)', '42883'],
    ]) {
      await expect(pg.query(`SELECT ${sql} FROM minmax_checks`)).rejects.toMatchObject({ code })
      expect(hasUncertain(lower(`${sql} IS NULL`)), sql).toBe(true)
    }
  })

  it('matches PostgreSQL raw/stored selection, NULLs, ties, casts, planning and partial inputs in every target', async () => {
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
          const query = `WITH candidate AS MATERIALIZED (SELECT ${left.sql}::${family.type} ${family.name}_left,${right.sql}::${family.type} ${family.name}_right)`
          for (const operation of operations)
            for (const suffix of ['null', 'value'])
              await oracle(`${family.name}_${operation}_${suffix}`, query, row)
          if (family.name === 'decimal')
            for (const name of ['numeric_payload', 'least_numeric_payload'])
              await oracle(name, query, row)
          if (family.name === 'bpchar')
            for (const name of ['character_payload', 'least_character_payload'])
              await oracle(name, query, row)
        }
      if (family.name === 'decimal') {
        const row = { decimal_left: input('1.00'), decimal_right: input('1.0') }
        const query =
          'WITH candidate AS MATERIALIZED (SELECT 1.00::numeric decimal_left,1.0::numeric decimal_right)'
        await oracle('numeric_payload', query, row)
        await oracle('least_numeric_payload', query, row)
      }
      for (const operation of operations)
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
          ] as [Input, Input, Outcome][])
            add(
              `${family.name}_${operation}_${suffix}`,
              { [`${family.name}_left`]: left, [`${family.name}_right`]: right },
              expected,
            )
    }
    for (const [name, sql, row] of [
      [
        'decimal_coercion',
        '1::integer amount, 1.00::numeric decimal_left',
        { amount: input(1), decimal_left: input('1.00') },
      ],
      [
        'text_coercion',
        "'é'::varchar varchar_left, 'a'::text text_right",
        { varchar_left: input('é'), text_right: input('a') },
      ],
      [
        'reverse_text',
        "'a'::text text_left, 'é'::varchar varchar_right",
        { text_left: input('a'), varchar_right: input('é') },
      ],
      [
        'character_coercion',
        "'a '::bpchar bpchar_left, 'a'::varchar varchar_right",
        { bpchar_left: input('a '), varchar_right: input('a') },
      ],
      [
        'reverse_character',
        "'a '::varchar varchar_left,'a '::bpchar bpchar_right",
        { varchar_left: input('a '), bpchar_right: input('a ') },
      ],
      [
        'network_coercion',
        "'192.0.2.0/24'::cidr cidr_left,'192.0.2.1/32'::inet inet_right",
        { cidr_left: input('192.0.2.0/24'), inet_right: input('192.0.2.1/32') },
      ],
      [
        'mac_coercion',
        "'08:00:2b:01:02:03'::macaddr macaddr_left,'08:00:2b:ff:fe:01:02:04'::macaddr8 macaddr8_right",
        {
          macaddr_left: input('08:00:2b:01:02:03'),
          macaddr8_right: input('08:00:2b:ff:fe:01:02:04'),
        },
      ],
      [
        'reverse_mac',
        "'08:00:2b:ff:fe:01:02:03'::macaddr8 macaddr8_left,'08:00:2b:01:02:04'::macaddr macaddr_right",
        {
          macaddr8_left: input('08:00:2b:ff:fe:01:02:03'),
          macaddr_right: input('08:00:2b:01:02:04'),
        },
      ],
      [
        'bit_coercion',
        "B'001'::bit(3) bit_left,B'111'::varbit varbit_right",
        { bit_left: input('001'), varbit_right: input('111') },
      ],
      [
        'reverse_bit',
        "B'001'::varbit varbit_left,B'111'::bit(3) bit_right",
        { varbit_left: input('001'), bit_right: input('111') },
      ],
      ['single_text', "'é'::text COLLATE minmax_locale locale_text", { locale_text: input('é') }],
      [
        'mac_coercion',
        "NULL::macaddr macaddr_left,'08:00:2b:01:02:03:04:05'::macaddr8 macaddr8_right",
        { macaddr_left: input(null), macaddr8_right: input('08:00:2b:01:02:03:04:05') },
      ],
      ['network_literal', "'192.0.2.0/24'::cidr cidr_left", { cidr_left: input('192.0.2.0/24') }],
      ['numeric_literal', '1.00::numeric decimal_left', { decimal_left: input('1.00') }],
    ] as [string, string, Row][])
      await oracle(name, `WITH candidate AS MATERIALIZED (SELECT ${sql})`, row)
    for (const [amount, divisor, flag, otherFlag] of [
      [1, 1, true, false],
      [1, 0, false, true],
      [1, 0, true, false],
      [null, 0, false, null],
      [-2147483648, -1, false, false],
      [0, 1, null, null],
    ] as const) {
      const row = {
        ...base,
        amount: input(amount),
        divisor: input(divisor),
        flag: input(flag),
        other_flag: input(otherFlag),
      }
      for (const name of Object.keys(compositions).filter(
        (name) =>
          !name.includes('payload') &&
          ![
            'decimal_coercion',
            'text_coercion',
            'reverse_text',
            'character_coercion',
            'reverse_character',
            'network_coercion',
            'mac_coercion',
            'reverse_mac',
            'bit_coercion',
            'reverse_bit',
            'single_text',
            'network_literal',
            'numeric_literal',
          ].includes(name),
      ))
        await oracle(name, candidate, row, [amount, divisor, flag, otherFlag])
    }
    for (const [name, row, expected] of [
      ['eager', { ...base, amount: { kind: 'Unknown' }, divisor: error('22012') }, error('22012')],
      ['conditional', { ...base, flag: input(false), divisor: error('22012') }, { kind: 'True' }],
      ['conjunction', { ...base, flag: input(false), divisor: error('22012') }, { kind: 'False' }],
      ['disjunction', { ...base, flag: input(true), divisor: error('22012') }, { kind: 'True' }],
      [
        'bool_root',
        { ...base, flag: input(true), other_flag: { kind: 'Unknown' } },
        { kind: 'Unknown' },
      ],
      ['bool_least', { ...base, flag: input(false), other_flag: error('22003') }, error('22003')],
      ['constant_error', { ...base, flag: { kind: 'Unknown' } }, error('22012')],
      ['skipped_constant', { ...base, flag: { kind: 'Unknown' } }, { kind: 'Unknown' }],
      ['strict_parent', { ...base, amount: error('22003') }, { kind: 'True' }],
      ['folded_parent', { ...base, amount: error('22003') }, { kind: 'True' }],
    ] as [string, Row, Outcome][])
      add(name, row, expected)
    await runCheckParity(
      directory,
      'minmaxchecks',
      group,
      entries.map((entry) => entry.name),
      fixtures,
    )
  }, 180_000)
})
