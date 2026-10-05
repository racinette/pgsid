import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck, lowerDomainCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import {
  runCheckParity,
  type Input,
  type Outcome,
  type Row,
} from '../../tools/check-rust/parity.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'

const expressions: Record<string, string> = {
  equal: 'a = b',
  unequal: 'a <> b',
  less: 'a < b',
  less_equal: 'a <= b',
  greater: 'a > b',
  greater_equal: 'a >= b',
  integral_literal: 'a > 0',
  fractional_literal: 'a <= 0.00000000000000000000001',
  exponent_literal: 'a = 12345e-4',
  large_literal: 'a > 9223372036854775808',
  bigint_literal: 'a >= 9007199254740993',
  negative_literal: 'a >= -123.4500',
  nan_literal: "a = 'NaN'::numeric",
  infinity_literal: "a < 'Infinity'::numeric",
  negative_infinity_literal: "a > '-Infinity'::numeric",
  simple_case: 'CASE a WHEN b THEN true ELSE false END',
  scalar_case: '(CASE WHEN flag THEN a ELSE b END) = b',
  scalar_null: '(CASE WHEN flag THEN a END) IS NULL',
  membership: 'a IN (b, NULL)',
  between: 'a BETWEEN b AND b',
  null_test: 'a IS NULL',
}
const domainExpressions: Record<string, string> = {
  equal: 'a = b',
  unequal: 'a <> b',
  less: 'a < b',
  less_equal: 'a <= b',
  greater: 'a > b',
  greater_equal: 'a >= b',
  relabel: 'a::numeric = b::numeric',
  nonnegative: 'a >= 0',
  nullable: 'a IS NULL OR a >= 0',
  scalar_case: '(CASE WHEN flag THEN a ELSE b END)::numeric = b',
}
for (const fn of builtinCallables())
  if (
    fn.kind === 'function' &&
    fn.args.length === 2 &&
    fn.args.every((type) => type === 'pg_catalog."numeric"') &&
    fn.result === 'pg_catalog.bool'
  )
    expressions['direct_' + fn.name] = `pg_catalog.${fn.name}(a,b)`
const values: (string | null)[] = [
  null,
  '-Infinity',
  '-9223372036854775808',
  '-123.4500',
  '-0.00000000000000000000001',
  '-0',
  '0.0000',
  '0.00000000000000000000001',
  '0.00000000000000000000002',
  '0.1',
  '0.10',
  '0.10000000000000000000001',
  '1',
  '1.2345',
  '123.45',
  '9007199254740992',
  '9007199254740993',
  '9223372036854775808',
  '1e131071',
  '1e-16383',
  '1e1000',
  '1e-1000',
  'Infinity',
  'NaN',
]
const value = (value: string | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})

describe('portable Rust CHECK numeric comparisons', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-numeric-'))
    await pg.exec(`CREATE DOMAIN exact_amount AS numeric CHECK (VALUE >= 0);
      CREATE DOMAIN nested_amount AS exact_amount;
      CREATE TABLE numeric_checks (a numeric, b numeric, flag bool,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')});
      CREATE TABLE rounded_amounts (amount numeric(10,2));`)
    await pg.exec(`CREATE DOMAIN measured_amount AS numeric(10,3);
      CREATE DOMAIN nested_measurement AS measured_amount;
      CREATE TABLE domain_numeric_checks (a measured_amount, b nested_measurement, flag bool,
      ${Object.entries(domainExpressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')});`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((table) => table.name === 'numeric_checks')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  const bind = (sql: string) =>
    lowerTableCheck(
      table,
      { name: 'probe', type: 'check', definition: `CHECK (${sql})` },
      [],
      catalog.domains,
    )!.expression

  it('matches PostgreSQL values, special values, branches, NULL, unknown, and errors in all three languages', async () => {
    const names = Object.keys(expressions)
    const domain = catalog.domains.find((domain) => domain.name === 'exact_amount')!
    const group = prepareCheckRustGroup([
      ...names.map((name) => ({
        expression: lowerTableCheck(
          table,
          table.constraints.find((c) => c.name === name)!,
          [],
          catalog.domains,
        )!.expression,
        identity: { schema: 'public', kind: 'table' as const, owner: table.name, constraint: name },
      })),
      {
        expression: lowerDomainCheck(domain, domain.checks[0]!)!.expression,
        identity: {
          schema: 'public',
          kind: 'domain',
          owner: domain.name,
          constraint: domain.checks[0]!.name,
        },
      },
    ])
    expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
    expect(group.evaluatorSource).toContain('NumericValue')
    expect(group.evaluatorSource).toContain('make_numeric_value("0")')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const a of values)
      for (const b of values) {
        const row: Row = { a: value(a), b: value(b), flag: value(a !== null) }
        const result = (
          await pg.query<Record<string, boolean | null>>(
            `SELECT ${names.map((name) => `(${expressions[name]}) AS "${name}"`).join(',')} FROM (SELECT $1::numeric a, $2::numeric b, $3::bool flag) candidate`,
            [a, b, a !== null],
          )
        ).rows[0]!
        for (const name of names) fixtures.push({ name, row, expected: outcome(result[name]!) })
      }
    for (const a of values)
      fixtures.push({
        name: 'domain',
        row: { value: value(a) },
        expected: outcome(
          (await pg.query<{ value: boolean | null }>('SELECT $1::numeric >= 0 AS value', [a]))
            .rows[0]!.value,
        ),
      })
    for (const a of [
      ' +001.2300 ',
      '.5',
      '1.',
      '1_234.5_6e-2',
      '1e+1_0',
      'inf',
      '-inf',
      'nAn',
      '0e1073741823',
    ]) {
      const result = (
        await pg.query<{ value: boolean | null }>('SELECT $1::numeric = $2::numeric AS value', [
          a,
          a,
        ])
      ).rows[0]!.value
      fixtures.push({ name: 'equal', row: { a: value(a), b: value(a) }, expected: outcome(result) })
    }
    for (const a of [
      '',
      '+NaN',
      '-NaN',
      '1.2.3',
      '1e',
      '_1',
      '1_',
      '1._0',
      '1__0',
      '1e_2',
      '0x10',
      '1e131072',
      '1e-16384',
      '1e1073741824',
      '१२',
    ]) {
      fixtures.push({
        name: 'equal',
        row: { a: value(a), b: value('0') },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({ name: 'null_test', row: { a: value(a) }, expected: { kind: 'Unknown' } })
    }
    const error: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
    fixtures.push(
      {
        name: 'equal',
        row: { a: { kind: 'Unknown' }, b: value('0') },
        expected: { kind: 'Unknown' },
      },
      {
        name: 'equal',
        row: { a: { kind: 'Unknown' }, b: { kind: 'Null' } },
        expected: { kind: 'Unknown' },
      },
      { name: 'equal', row: { a: error, b: { kind: 'Unknown' } }, expected: error },
      { name: 'equal', row: { a: { kind: 'Null' }, b: error }, expected: error },
      {
        name: 'scalar_case',
        row: { a: error, b: value('0'), flag: value(false) },
        expected: { kind: 'True' },
      },
    )
    await runCheckParity(directory, 'numericchecks', group, [...names, 'domain'], fixtures)
  }, 120_000)

  it('unwraps numeric domains and nested domains without applying new coercions', async () => {
    const domainTable = catalog.tables.find((table) => table.name === 'domain_numeric_checks')!
    const names = Object.keys(domainExpressions)
    const plans = names.map((name) =>
      lowerTableCheck(
        domainTable,
        domainTable.constraints.find((constraint) => constraint.name === name)!,
        [],
        catalog.domains,
      )!,
    )
    expect(
      domainTable.constraints.find((constraint) => constraint.name === 'relabel')!.definition,
    ).toContain('::numeric')
    const group = prepareCheckRustGroup(
      plans.map((plan) => ({
        expression: plan.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: domainTable.name,
          constraint: plan.name,
        },
      })),
    )
    expect(group.checks.every((check) => check.kind === 'supported')).toBe(true)
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const a of [null, '-0.001', '-0.0004', '0', '0.0004', '0.001', '9999999.999', 'NaN'])
      for (const b of [null, '-0.001', '0', '0.001', 'NaN']) {
        const candidate = (
          await pg.query<{ a: string | null; b: string | null }>(
            'SELECT ($1::measured_amount)::text AS a, ($2::nested_measurement)::text AS b',
            [a, b],
          )
        ).rows[0]!
        for (const flag of [true, false, null]) {
          const result = (
            await pg.query<Record<string, boolean | null>>(
              `SELECT ${names.map((name) => `(${domainExpressions[name]}) AS "${name}"`).join(',')} FROM (SELECT $1::measured_amount a, $2::nested_measurement b, $3::bool flag) candidate`,
              [a, b, flag],
            )
          ).rows[0]!
          for (const name of names)
            fixtures.push({
              name,
              row: { a: value(candidate.a), b: value(candidate.b), flag: value(flag) },
              expected: outcome(result[name]!),
            })
        }
      }
    const domainDirectory = join(directory, 'domains')
    await mkdir(domainDirectory)
    await runCheckParity(domainDirectory, 'numericdomains', group, names, fixtures)
    for (const sql of ['a::numeric(10,2) = b', 'a::exact_amount = b', 'a::int4 = 0'])
      expect(
        lowerTableCheck(
          domainTable,
          { name: 'unsupported', type: 'check', definition: `CHECK (${sql})` },
          [],
          catalog.domains,
        )!.expression,
      ).toEqual({ kind: 'uncertain' })
    await expect(pg.query("SELECT '-0.001'::measured_amount::exact_amount")).rejects.toThrow()
  }, 120_000)

  it('validates exact strings and wrappers at the production TypeScript boundary', async () => {
    const output = renderTypescriptSchemaCheckArtifacts([table], catalog.domains, [])
    const publicDirectory = join(directory, 'public')
    await mkdir(publicDirectory, { recursive: true })
    await writeFile(join(publicDirectory, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(publicDirectory, 'checks.ts'), output.checks)
    for (const artifact of checkTypescriptArtifacts(output.rustFiles!)) {
      const path = join(publicDirectory, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await promisify(execFile)('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(publicDirectory, 'js'),
      join(publicDirectory, 'checks.ts'),
    ])
    const generated = await import(pathToFileURL(join(publicDirectory, 'js/checks.js')).href)
    const evaluation = (a: unknown, b: unknown) =>
      generated
        .evaluatePublicNumericChecksChecks({ a, b, flag: true })
        .find((check: { constraint: string }) => check.constraint === 'equal')
    const evaluate = (a: unknown, b: unknown) => evaluation(a, b).result
    expect(evaluate('1.2300', '1.23')).toEqual({ certain: true, value: true })
    expect(evaluate({ kind: 'Value', value: '9007199254740993' }, '9007199254740992')).toEqual({
      certain: true,
      value: false,
    })
    expect(evaluate(null, '1')).toEqual({ certain: true, value: null })
    for (const a of [
      undefined,
      0.1,
      1,
      1n,
      {},
      'invalid',
      { kind: 'Value', value: 'invalid' },
      { kind: 'Value', value: 1 },
    ])
      expect(evaluate(a, '1')).toEqual({ certain: false })
    expect(evaluation(undefined, '1')).toMatchObject({
      owner: 'public.numeric_checks',
      constraint: 'equal',
      result: { certain: false },
      message: expect.stringContaining('input is unavailable'),
    })
    for (const [code, message] of [
      ['22003', 'numeric value out of range'],
      ['22007', 'invalid date/time format'],
      ['22008', 'date/time field value out of range'],
      ['22009', 'time zone displacement out of range'],
      ['22012', 'division by zero'],
      ['2201B', 'invalid regular expression'],
      ['22023', 'invalid parameter value'],
      ['XX000', 'SQL evaluation failed'],
    ])
      expect(
        evaluation({ kind: 'Error', value: { state: parseInt(code!, 36) } }, '1'),
      ).toMatchObject({
        owner: 'public.numeric_checks',
        constraint: 'equal',
        result: { certain: true, error: code },
        message,
      })
  })

  it('keeps precision coercion, runtime casts, and arithmetic outside the comparison slice', () => {
    for (const sql of [
      'a::numeric(10,2) = b',
      '(a + b) > 0',
      '(a::int4) > 0',
      "('1.234'::numeric(3,1)) = a",
    ])
      expect(
        prepareCheckRustGroup([
          {
            expression: bind(sql),
            identity: { schema: 'public', kind: 'table', owner: table.name, constraint: 'probe' },
          },
        ]).evaluatorSource ?? '',
      ).not.toContain('sql__pg_catalog__numeric_eq__')
  })
})
