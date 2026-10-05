import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck, lowerDomainCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import {
  runCheckParity,
  type Input,
  type Row,
  type Outcome,
} from '../../tools/check-rust/parity.js'

const callables = builtinCallables().filter(
  (fn) =>
    fn.kind === 'function' &&
    fn.result === 'pg_catalog.bool' &&
    fn.args.length === 2 &&
    fn.args.includes('pg_catalog.int2') &&
    fn.args.every((type) =>
      ['pg_catalog.int2', 'pg_catalog.int4', 'pg_catalog.int8'].includes(type),
    ),
)
const column = (type: string, index: number): string =>
  type === 'pg_catalog.int2' ? (index === 0 ? 'a' : 'b') : type === 'pg_catalog.int4' ? 'i' : 'big'
const expressions: Record<string, string> = {
  positive: 'a > 0',
  negative_literal: "a >= '-32768'::smallint",
  string_literal: "a <= '32767'::smallint",
  small_null: 'a IS NULL',
  simple_case: 'CASE a WHEN b THEN true ELSE false END',
  scalar_case: '(CASE WHEN flag THEN a ELSE b END) = b',
  scalar_null: '(CASE WHEN flag THEN a END) IS NULL',
  membership: 'a IN (b, NULL::smallint)',
  bounds: "a BETWEEN '-32768'::smallint AND 32767::smallint",
}
for (const fn of callables)
  expressions[fn.name] = `pg_catalog.${fn.name}(${fn.args.map(column).join(',')})`
const samples = (type: string): (number | bigint | null)[] =>
  type === 'pg_catalog.int2'
    ? [-32768, -1, 0, 1, 32767, null]
    : type === 'pg_catalog.int4'
      ? [-2147483648, -32769, -32768, -1, 0, 1, 32767, 32768, 2147483647, null]
      : [
          -9223372036854775808n,
          -32769n,
          -1n,
          0n,
          1n,
          32768n,
          9007199254740993n,
          9223372036854775807n,
          null,
        ]
const value = (value: number | bigint | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }
const outcome = (value: boolean | null): Outcome => ({
  kind: value === null ? 'Null' : value ? 'True' : 'False',
})
const error: Input = { kind: 'Error', value: { state: parseInt('22003', 36) } }
const otherError: Input = { kind: 'Error', value: { state: parseInt('22012', 36) } }

describe('portable smallint CHECK values', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-smallint-'))
    await pg.exec(`CREATE DOMAIN unit_count AS smallint CHECK (VALUE >= 0);
      CREATE DOMAIN nested_count AS unit_count;
      CREATE TABLE smallint_checks (a smallint, b smallint, i integer, big bigint, flag bool,
      ${Object.entries(expressions)
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')});
      CREATE TABLE domain_counts (a unit_count, b nested_count,
      CONSTRAINT matching CHECK (a = b), CONSTRAINT positive CHECK (a > 0));`)
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((t) => t.name === 'smallint_checks')!
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it('matches all catalog comparisons, mixed widths, control flow, domains and value states in Rust and both targets', async () => {
    expect(callables).toHaveLength(30)
    const domainTable = catalog.tables.find((t) => t.name === 'domain_counts')!
    const domain = catalog.domains.find((d) => d.name === 'unit_count')!
    const names = [...Object.keys(expressions), 'domain_equal', 'domain_positive', 'domain']
    const group = prepareCheckRustGroup([
      ...table.constraints
        .filter((c) => c.type === 'check')
        .map((c) => ({
          expression: lowerTableCheck(table, c, [], catalog.domains)!.expression,
          identity: {
            schema: 'public',
            kind: 'table' as const,
            owner: table.name,
            constraint: c.name,
          },
        })),
      ...['matching', 'positive'].map((name) => ({
        expression: lowerTableCheck(
          domainTable,
          domainTable.constraints.find((c) => c.name === name)!,
          [],
          catalog.domains,
        )!.expression,
        identity: {
          schema: 'public',
          kind: 'table' as const,
          owner: domainTable.name,
          constraint: name,
        },
      })),
      {
        expression: lowerDomainCheck(domain, domain.checks[0]!)!.expression,
        identity: {
          schema: 'public',
          kind: 'domain' as const,
          owner: domain.name,
          constraint: domain.checks[0]!.name,
        },
      },
    ])
    const ordered = [
      ...table.constraints.filter((c) => c.type === 'check').map((c) => c.name),
      ...names.slice(-3),
    ]
    expect(group.checks.map((c) => c.kind)).toEqual(ordered.map(() => 'supported'))
    expect(group.evaluatorSource).toContain('Int2Value')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const fn of callables) {
      for (const left of samples(fn.args[0]!))
        for (const right of samples(fn.args[1]!)) {
          const row: Row = {
            a: value(0),
            b: value(0),
            i: value(0),
            big: value(0n),
            flag: value(true),
          }
          row[column(fn.args[0]!, 0)] = value(left)
          row[column(fn.args[1]!, 1)] = value(right)
          const result = (
            await pg.query<{ v: boolean | null }>(
              `SELECT pg_catalog.${fn.name}($1::${fn.args[0]}, $2::${fn.args[1]}) AS v`,
              [left === null ? null : String(left), right === null ? null : String(right)],
            )
          ).rows[0]!.v
          fixtures.push({ name: fn.name, row, expected: outcome(result) })
        }
      const leftName = column(fn.args[0]!, 0)
      const rightName = column(fn.args[1]!, 1)
      for (const [left, right, expected] of [
        [{ kind: 'Unknown' }, { kind: 'Null' }, { kind: 'Unknown' }],
        [{ kind: 'Null' }, { kind: 'Unknown' }, { kind: 'Unknown' }],
        [error, { kind: 'Unknown' }, error],
        [{ kind: 'Unknown' }, otherError, otherError],
        [error, otherError, error],
      ] as [Input, Input, Outcome][])
        fixtures.push({ name: fn.name, row: { [leftName]: left, [rightName]: right }, expected })
    }
    const branchNames = Object.keys(expressions).filter(
      (name) => !callables.some((fn) => fn.name === name),
    )
    for (const a of samples('pg_catalog.int2'))
      for (const b of samples('pg_catalog.int2'))
        for (const flag of [true, false, null]) {
          const result = (
            await pg.query<Record<string, boolean | null>>(
              `SELECT ${branchNames.map((name) => `(${expressions[name]}) AS "${name}"`).join(',')}
             FROM (SELECT $1::smallint a, $2::smallint b, $3::bool flag) candidate`,
              [a, b, flag],
            )
          ).rows[0]!
          for (const name of branchNames)
            fixtures.push({
              name,
              row: { a: value(a), b: value(b), flag: value(flag) },
              expected: outcome(result[name]!),
            })
        }
    for (const a of samples('pg_catalog.int2')) {
      fixtures.push({
        name: 'domain_equal',
        row: { a: value(a), b: value(a) },
        expected: outcome(a === null ? null : true),
      })
      fixtures.push({
        name: 'domain_positive',
        row: { a: value(a) },
        expected: outcome(a === null ? null : a > 0),
      })
      fixtures.push({
        name: 'domain',
        row: { value: value(a) },
        expected: outcome(a === null ? null : a >= 0),
      })
    }
    fixtures.push({
      name: 'scalar_case',
      row: { a: error, b: value(1), flag: value(false) },
      expected: { kind: 'True' },
    })
    for (const a of [-32769, 32768])
      fixtures.push({ name: 'positive', row: { a: value(a) }, expected: { kind: 'Unknown' } })
    await runCheckParity(directory, 'smallintchecks', group, ordered, fixtures)
  }, 120_000)

  it('exposes range checked smallint public inputs and defers runtime casts and arithmetic', async () => {
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
    const evaluate = (a: unknown) =>
      generated
        .evaluatePublicSmallintChecksChecks({ a, b: 0, i: 0, big: 0n, flag: true })
        .find((check: { constraint: string }) => check.constraint === 'positive').result
    expect(evaluate(-32768)).toEqual({ certain: true, value: false })
    expect(evaluate(32767)).toEqual({ certain: true, value: true })
    expect(evaluate(null)).toEqual({ certain: true, value: null })
    for (const a of [undefined, -32769, 32768, 1.5, '1', {}])
      expect(evaluate(a)).toEqual({ certain: false })
    for (const sql of ['a::smallint > 0', 'i::smallint > 0', '(a + b) > 0']) {
      const probe = lowerTableCheck(
        table,
        { name: 'probe', type: 'check', definition: `CHECK (${sql})` },
        [],
        catalog.domains,
      )!
      const group = prepareCheckRustGroup([
        {
          expression: probe.expression,
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: 'probe' },
        },
      ])
      if (sql === 'a::smallint > 0') expect(group.checks[0]!.kind).toBe('supported')
      else if (group.checks[0]!.kind === 'supported')
        expect(group.evaluatorSource).toContain('check_unknown()')
      else expect(group.checks[0]!.kind).toBe('unsupported')
    }
  })
})
