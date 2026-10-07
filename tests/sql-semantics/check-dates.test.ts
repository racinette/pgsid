import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, TableInfo } from '../../src/catalog/types.js'
import { lowerTableCheck, lowerDomainCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { builtinCallables } from '../../src/postgres/builtins/inventory.js'
import {
  runCheckParity,
  type Row,
  type Input,
  type Outcome,
} from '../../tools/check-rust/parity.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { parseConfigString } from '../../src/config/loader.js'
import { renderGoCheckTests, type GoCheckCase } from './check-codegen.js'

const run = promisify(execFile)
const supported: Record<string, string> = {
  equal: 'a = b',
  unequal: 'a <> b',
  less: 'a < b',
  less_equal: 'a <= b',
  greater: 'a > b',
  greater_equal: 'a >= b',
  literal: "a >= DATE '2000-01-01'",
  bc: "a >= DATE '4714-11-24 BC'",
  infinity: "a < DATE 'infinity'",
  negative_infinity: "a > DATE '-infinity'",
  membership: "a IN (DATE '2000-01-01', DATE 'infinity', NULL)",
  between: "a BETWEEN DATE '1999-12-31' AND DATE '2000-02-29'",
  simple_case: "CASE a WHEN NULL THEN false WHEN DATE '2000-01-01' THEN flag ELSE NULL END",
  scalar_case: "(CASE WHEN flag THEN a ELSE DATE '2000-01-01' END) = b",
  null_test: 'a IS NULL',
  scalar_null: '(CASE WHEN flag THEN a END) IS NULL',
  constructor: 'make_date(year, month, day) = a',
  lazy_constructor: 'CASE WHEN flag THEN true ELSE make_date(year, month, day) = a END',
}
for (const fn of builtinCallables())
  if (
    fn.kind === 'function' &&
    fn.args.length === 2 &&
    fn.args.every((type) => type === 'pg_catalog.date') &&
    fn.result === 'pg_catalog.bool'
  )
    supported['direct_' + fn.name] = `pg_catalog.${fn.name}(a,b)`
const dates = [
  null,
  '-infinity',
  '4714-11-24 BC',
  '0044-03-15 BC',
  '0001-01-01 BC',
  '0001-01-01',
  '1582-10-04',
  '1582-10-15',
  '1900-02-28',
  '1999-12-31',
  '2000-01-01',
  '2000-02-29',
  '2100-03-01',
  '5874897-12-31',
  'infinity',
]
const constructors = [
  [2000, 1, 1],
  [2000, 2, 29],
  [1900, 2, 29],
  [2100, 2, 29],
  [-1, 2, 29],
  [-44, 3, 15],
  [0, 1, 1],
  [-4714, 11, 24],
  [-4714, 11, 23],
  [5874897, 12, 31],
  [5874898, 1, 1],
  [-2147483648, 1, 1],
  [2147483647, 1, 1],
  [2000, 0, 1],
  [2000, 13, 1],
  [2000, 1, 0],
  [2000, 4, 31],
  [2000, 1, 2147483647],
]
const value = (value: number | boolean | null): Input =>
  value === null ? { kind: 'Null' } : { kind: 'Value', value }

describe('portable Rust CHECK dates', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let table: TableInfo
  const days = new Map<string | null, number | null>()
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-dates-'))
    await pg.exec(
      `CREATE DOMAIN valid_date AS date CHECK (VALUE >= DATE '2000-01-01'); CREATE TABLE date_checks (a date, b date, flag bool, year int4, month int4, day int4, ${Object.entries(
        supported,
      )
        .map(([name, sql]) => `CONSTRAINT "${name}" CHECK (${sql})`)
        .join(',')});`,
    )
    catalog = await snapshotCatalog(pg)
    table = catalog.tables.find((table) => table.name === 'date_checks')!
    for (const date of dates) {
      const hex = (
        await pg.query<{ binary: string | null }>(
          "SELECT encode(date_send($1::date), 'hex') AS binary",
          [date],
        )
      ).rows[0]!.binary
      days.set(date, hex === null ? null : Buffer.from(hex, 'hex').readInt32BE())
    }
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  const bind = (sql: string) =>
    lowerTableCheck(table, { name: 'probe', type: 'check', definition: `CHECK (${sql})` })!
      .expression
  it('binds date arithmetic and comparisons with local timestamps', () => {
    for (const sql of [
      "a > '2000-01-01'::timestamp",
      'a + 1 > b',
      'a::timestamp >= b::timestamp',
    ]) {
      const expression = bind(sql)
      expect(expression.kind, sql).not.toBe('uncertain')
      const group = prepareCheckRustGroup([
        {
          expression,
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: 'probe' },
        },
      ])
      expect(group.checks[0]!.kind, sql).toBe('supported')
    }
  })
  it('defers session-dependent timestamps and unrepresented interval arithmetic', () => {
    for (const sql of [
      "a > '2000-01-01+00'::timestamptz",
      'a::timestamptz IS NOT NULL',
      "a + interval '1 day' > b",
    ]) {
      const expression = bind(sql)
      const group = prepareCheckRustGroup([
        {
          expression,
          identity: { schema: 'public', kind: 'table', owner: table.name, constraint: 'probe' },
        },
      ])
      expect(group.checks[0]!.kind === 'unsupported' || expression.kind === 'uncertain', sql).toBe(
        true,
      )
    }
  })
  it('matches the PostgreSQL epoch, range, BC years, and infinity representation', () => {
    expect(days.get('2000-01-01')).toBe(0)
    expect(days.get('1999-12-31')).toBe(-1)
    expect(days.get('4714-11-24 BC')).toBe(-2451545)
    expect(days.get('5874897-12-31')).toBe(2145031948)
    expect(days.get('-infinity')).toBe(-2147483648)
    expect(days.get('infinity')).toBe(2147483647)
  })
  it('matches PGlite through bound CHECKs, native Rust, Go, and TypeScript', async () => {
    const names = Object.keys(supported)
    const domain = catalog.domains.find((domain) => domain.name === 'valid_date')!
    const group = prepareCheckRustGroup([
      ...names.map((name) => ({
        expression: lowerTableCheck(
          table,
          table.constraints.find((constraint) => constraint.name === name)!,
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
    for (const [index, item] of group.checks.entries())
      expect(item.kind, names[index]).toBe('supported')
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const date of dates) {
      const result = (
        await pg.query<{ value: boolean | null }>("SELECT $1::date >= DATE '2000-01-01' AS value", [
          date,
        ])
      ).rows[0]!.value
      fixtures.push({
        name: 'domain',
        row: { value: value(days.get(date)!) },
        expected: { kind: result === null ? 'Null' : result ? 'True' : 'False' },
      })
    }
    const oracle = async (name: string, input: unknown[], row: Row) => {
      let expected: Outcome
      try {
        const result = (
          await pg.query<{ value: boolean | null }>(
            `SELECT (${supported[name]}) AS value FROM (SELECT $1::date a, $2::date b, $3::bool flag, $4::int4 AS year, $5::int4 AS month, $6::int4 AS day) candidate`,
            input,
          )
        ).rows[0]!.value
        expected = { kind: result === null ? 'Null' : result ? 'True' : 'False' }
      } catch (error) {
        expected = {
          kind: 'Error',
          value: { state: Number.parseInt((error as { code: string }).code, 36) },
        }
      }
      fixtures.push({ name, row, expected })
    }
    for (const a of dates)
      for (const b of dates) {
        const input = [a, b, a !== null, 2000, 1, 1]
        const row: Row = {
          a: value(days.get(a)!),
          b: value(days.get(b)!),
          flag: value(a !== null),
          year: value(2000),
          month: value(1),
          day: value(1),
        }
        const result = (
          await pg.query<Record<string, boolean | null>>(
            `SELECT ${names.map((name) => `(${supported[name]}) AS "${name}"`).join(',')} FROM (SELECT $1::date a, $2::date b, $3::bool flag, $4::int4 AS year, $5::int4 AS month, $6::int4 AS day) candidate`,
            input,
          )
        ).rows[0]!
        for (const name of names)
          fixtures.push({
            name,
            row,
            expected: { kind: result[name] === null ? 'Null' : result[name] ? 'True' : 'False' },
          })
      }
    for (const [year, month, day] of constructors) {
      const row: Row = {
        a: value(0),
        b: value(0),
        flag: value(false),
        year: value(year!),
        month: value(month!),
        day: value(day!),
      }
      for (const name of ['constructor', 'lazy_constructor'])
        await oracle(name, ['2000-01-01', '2000-01-01', false, year, month, day], row)
      fixtures.push({
        name: 'lazy_constructor',
        row: { ...row, flag: value(true) },
        expected: { kind: 'True' },
      })
    }
    const unknown: Row = Object.fromEntries(
      table.columns.map((column) => [column.name, { kind: 'Unknown' }]),
    )
    const error: Input = { kind: 'Error', value: { state: Number.parseInt('22008', 36) } }
    for (const name of ['equal', 'unequal', 'less', 'less_equal', 'greater', 'greater_equal']) {
      fixtures.push({ name, row: unknown, expected: { kind: 'Unknown' } })
      fixtures.push({
        name,
        row: { ...unknown, a: { kind: 'Null' }, b: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      })
      fixtures.push({ name, row: { ...unknown, a: { kind: 'Null' }, b: error }, expected: error })
      fixtures.push({
        name,
        row: { ...unknown, a: error, b: { kind: 'Unknown' } },
        expected: error,
      })
    }
    fixtures.push({
      name: 'lazy_constructor',
      row: { ...unknown, flag: value(true), year: error },
      expected: { kind: 'True' },
    })
    fixtures.push({
      name: 'scalar_case',
      row: { ...unknown, flag: value(false), b: value(0) },
      expected: { kind: 'True' },
    })
    await runCheckParity(directory, 'datechecks', group, [...names, 'domain'], fixtures)
  }, 120_000)

  it('exposes portable wrappers through both public row APIs', async () => {
    const ts = renderTypescriptSchemaCheckArtifacts([table], catalog.domains)
    await writeFile(join(directory, 'package.json'), '{"type":"module"}')
    await writeFile(join(directory, 'checks.ts'), ts.checks)
    for (const artifact of checkTypescriptArtifacts(ts.rustFiles!)) {
      const path = join(directory, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await run('node_modules/.bin/tsc', [
      '--strict',
      '--skipLibCheck',
      '--target',
      'es2022',
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--outDir',
      join(directory, 'js'),
      join(directory, 'checks.ts'),
    ])
    const runtime = await import(
      pathToFileURL(join(directory, 'js/checks-rust/checkruntime/runtime.js')).href
    )
    const {
      evaluatePublicDateChecksChecks: evaluate,
      evaluatePublicValidDateDomainChecks: evaluateDomain,
    } = await import(pathToFileURL(join(directory, 'js/checks.js')).href)
    const cases: GoCheckCase[] = []
    for (const date of dates) {
      const row = { a: days.get(date), b: 0, flag: true, year: 2000, month: 1, day: 1 }
      const wrapped = {
        ...row,
        a: date === null ? runtime.dateNull() : runtime.makeDateValue(row.a),
        b: runtime.dateFromYmd(2000, 1, 1),
      }
      const results = evaluate(wrapped).map(
        ({ constraint, result }: GoCheckCase['results'][number]) => ({ constraint, result }),
      )
      cases.push({ name: date ?? 'NULL', table, row, results })
      const oracle = (
        await pg.query<{ value: boolean | null }>("SELECT $1::date >= DATE '2000-01-01' AS value", [
          date,
        ])
      ).rows[0]!.value
      expect(evaluateDomain({ value: wrapped.a })[0].result).toEqual({
        certain: true,
        value: oracle,
      })
      for (const [year, month, day] of constructors) {
        const result = runtime.dateFromYmd(year, month, day)
        if (result.kind === 'Value') {
          const hex = (
            await pg.query<{ binary: string }>(
              "SELECT encode(date_send(make_date($1,$2,$3)), 'hex') AS binary",
              [year, month, day],
            )
          ).rows[0]!.binary
          expect(result).toEqual({ kind: 'Value', value: Buffer.from(hex, 'hex').readInt32BE() })
        } else {
          await expect(
            pg.query('SELECT make_date($1,$2,$3)', [year, month, day]),
          ).rejects.toMatchObject({ code: '22008' })
          expect(result).toEqual({ kind: 'Error', value: { state: Number.parseInt('22008', 36) } })
        }
      }
    }
    cases.push({
      name: 'missing',
      table,
      row: {},
      results: evaluate({}).map(({ constraint, result }: GoCheckCase['results'][number]) => ({
        constraint,
        result,
      })),
    })
    expect(evaluate({ a: new Date('2000-01-01'), b: runtime.makeDateValue(0) })[0].result).toEqual({
      certain: false,
    })
    for (const payload of [-2451546, 2145031949])
      expect(runtime.makeDateValue(payload)).toEqual({
        kind: 'Error',
        value: { state: Number.parseInt('22008', 36) },
      })
    for (const nulls of ['pointers', 'structs']) {
      const root = join(directory, nulls)
      await mkdir(root)
      const config = parseConfigString(
        `schema: schema.sql\nsql:\n  codegen:\n    go:\n      nulls: ${nulls}\n      schema: { outDir: schema }\n`,
      )
      const generated = renderGoSchemaArtifacts(
        catalog,
        config,
        {},
        join(root, 'schema'),
        'datechecks/schema',
      )
      expect(generated.diagnostics).toEqual([])
      for (const artifact of generated.artifacts) {
        await mkdir(dirname(artifact.path), { recursive: true })
        await writeFile(artifact.path, artifact.content)
      }
      await writeFile(
        join(root, 'go.mod'),
        'module datechecks\n\ngo 1.25\n\nrequire github.com/jackc/pgx/v5 v5.10.0\n',
      )
      await writeFile(
        join(root, 'go.sum'),
        await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
      )
      await writeFile(
        join(root, 'schema/public/checks_test.go'),
        renderGoCheckTests('public', cases, {
          dateRuntime: 'datechecks/schema/public/checkrust/checkruntime',
        }),
      )
      await run('go', ['test', '-mod=mod', './...'], {
        cwd: root,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      }).catch((error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      })
    }
  }, 120_000)
})
