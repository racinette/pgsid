import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { parseConfigString } from '../../src/config/loader.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { planCheckInputs } from '../../src/codegen/shared/check-inputs.js'
import { parseSql } from '../../src/ast.js'
import { emitCheckRustEvaluator } from '../../src/codegen/shared/check-rust-evaluator.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import {
  renderTypescriptSchemaCheckArtifacts,
  renderTypescriptSchemaChecks,
} from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { renderGoCheckTests, type GoCheckCase } from './check-codegen.js'

const run = promisify(execFile)
const fields = [
  { name: 'amount', type: 'numeric', literal: '12.50' },
  { name: 'day', type: 'date', literal: "'2026-01-02'" },
  { name: 'instant', type: 'timestamptz', literal: "'2026-01-02 03:04+00'" },
  { name: 'local_time', type: 'timestamp', literal: "'2026-01-02 03:04'" },
  { name: 'duration', type: 'interval', literal: "'1 hour'" },
  { name: 'state', type: 'public.null_state', literal: "'ready'" },
  { name: 'identifier', type: 'uuid', literal: "'00000000-0000-0000-0000-000000000001'" },
  { name: 'items', type: 'int4[]', literal: 'ARRAY[1,2]' },
  { name: 'price', type: 'public.null_price', literal: '1.25' },
  { name: 'nested_price', type: 'public.nested_null_price', literal: '2.50' },
  { name: 'small', type: 'int2', literal: '0' },
  { name: 'floating', type: 'float8', literal: '0.0' },
  { name: 'label', type: 'varchar(8)', literal: "''" },
  { name: 'amount_nullness', type: 'boolean', literal: 'false' },
]

describe('CHECK input nullness', () => {
  let pg: PGlite
  let directory: string
  let cases: GoCheckCase[]
  let evaluate: (row: object) => GoCheckCase['results']
  let fallback: typeof evaluate

  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-nullness-'))
    await pg.exec(`
      CREATE TYPE public.null_state AS ENUM ('ready', 'done');
      CREATE TYPE public.null_pair AS (a integer, b integer);
      CREATE DOMAIN public.null_price AS numeric;
      CREATE DOMAIN public.nested_null_price AS public.null_price;
      CREATE DOMAIN public.null_pair_domain AS public.null_pair;
      CREATE TABLE public.null_inputs (
        ${fields.map((field) => `${field.name} ${field.type}`).join(',')},
        pair public.null_pair,
        pair_domain public.null_pair_domain,
        ${fields
          .flatMap((field) => [
            `CONSTRAINT ${field.name}_null CHECK (${field.name} IS NULL)`,
            `CONSTRAINT ${field.name}_present CHECK (${field.name} IS NOT NULL)`,
          ])
          .join(',')},
        CONSTRAINT pair_null CHECK (pair IS NULL),
        CONSTRAINT pair_present CHECK (pair IS NOT NULL),
        CONSTRAINT pair_domain_null CHECK (pair_domain IS NULL),
        CONSTRAINT dispatch_evidence CHECK (instant IS NULL OR local_time IS NOT NULL),
        CONSTRAINT amount_comparison CHECK (amount > 0),
        CONSTRAINT nullness_name_collision CHECK (amount IS NULL OR amount_nullness),
        CONSTRAINT conditional_presence CHECK (CASE WHEN amount IS NULL THEN true ELSE day IS NOT NULL END)
      )
    `)
    const catalog = await snapshotCatalog(pg)
    const table = catalog.tables.find((table) => table.name === 'null_inputs')!
    for (const column of table.columns)
      expect(column.isRowType, column.name).toBe(['pair', 'pair_domain'].includes(column.name))
    expect(catalog.domains.find((domain) => domain.name === 'nested_null_price')?.isRowType).toBe(
      false,
    )
    expect(catalog.domains.find((domain) => domain.name === 'null_pair_domain')?.isRowType).toBe(
      true,
    )

    const present = (
      await pg.query<Record<string, unknown>>(
        `SELECT ${fields.map((field) => `(${field.literal})::${field.type} AS ${field.name}`).join(',')}`,
      )
    ).rows[0]!
    const rows: { name: string; row: Record<string, unknown>; nullViaValue?: boolean }[] = [
      { name: 'absent', row: {} },
      {
        name: 'undefined',
        row: Object.fromEntries(fields.map((field) => [field.name, undefined])),
      },
      { name: 'NULL', row: Object.fromEntries(fields.map((field) => [field.name, null])) },
      {
        name: 'NULL via value',
        row: Object.fromEntries(fields.map((field) => [field.name, null])),
        nullViaValue: true,
      },
      { name: 'present', row: present },
      { name: 'dispatch_without_local_time', row: { ...present, local_time: null } },
      { name: 'missing_unused_branch', row: { amount: null } },
      { name: 'missing_selected_branch', row: { amount: present['amount'] } },
    ]
    cases = []
    for (const { name, row, nullViaValue } of rows) {
      const results: GoCheckCase['results'] = []
      for (const constraint of table.constraints.filter(
        (constraint) => constraint.type === 'check',
      )) {
        const plan = lowerTableCheck(table, constraint)!
        const unsupported = [
          'pair_null',
          'pair_present',
          'pair_domain_null',
          'amount_comparison',
        ].includes(constraint.name)
        const parameters = plan.inputs.map((column) => row[column])
        const missing = parameters.some((value) => value === undefined)
        const shortCircuit =
          ['conditional_presence', 'nullness_name_collision'].includes(constraint.name) &&
          row['amount'] === null
        if (unsupported || (missing && !shortCircuit)) {
          results.push({ constraint: constraint.name, result: { certain: false } })
          continue
        }
        const projection = table.columns.map((column) => {
          const index = plan.inputs.indexOf(column.name)
          return `${index < 0 ? 'NULL' : '$' + (index + 1)}::${column.typeName} AS ${column.name}`
        })
        const sql = `SELECT ${constraint.definition.slice(6)} AS result FROM (SELECT ${projection.join(',')}) candidate`
        const oracle = (
          await pg.query<{ result: boolean }>(
            sql,
            parameters.map((value) => value ?? null),
          )
        ).rows[0]!
        results.push({
          constraint: constraint.name,
          result: { certain: true, value: oracle.result },
        })
      }
      cases.push({ name, table, row, nullViaValue, results })
    }

    const ts = renderTypescriptSchemaCheckArtifacts([table])
    await writeFile(join(directory, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(directory, 'checks.ts'), ts.checks)
    await writeFile(join(directory, 'fallback.ts'), renderTypescriptSchemaChecks([table]))
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
      join(directory, 'fallback.ts'),
    ]).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
    evaluate = (await import(pathToFileURL(join(directory, 'js/checks.js')).href))
      .evaluatePublicNullInputsChecks
    fallback = (await import(pathToFileURL(join(directory, 'js/fallback.js')).href))
      .evaluatePublicNullInputsChecks

    for (const nulls of ['pointers', 'structs']) {
      const root = join(directory, nulls)
      await mkdir(root)
      const config = parseConfigString(
        `schema: schema.sql\nsql:\n  codegen:\n    go:\n      nulls: ${nulls}\n      schema: { outDir: schema }\n`,
      )
      const go = renderGoSchemaArtifacts(
        catalog,
        config,
        {},
        join(root, 'schema'),
        'nullchecks/schema',
      )
      expect(go.diagnostics).toEqual([])
      for (const artifact of go.artifacts) {
        await mkdir(dirname(artifact.path), { recursive: true })
        await writeFile(artifact.path, artifact.content)
      }
      await writeFile(
        join(root, 'go.mod'),
        'module nullchecks\n\ngo 1.25\n\nrequire github.com/jackc/pgx/v5 v5.10.0\n',
      )
      await writeFile(
        join(root, 'go.sum'),
        await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
      )
      await writeFile(
        join(root, 'schema/public/checks_test.go'),
        renderGoCheckTests('public', cases),
      )
      await run('go', ['test', '-mod=mod', './...'], {
        cwd: root,
        env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
      })
    }

    const native = join(directory, 'native')
    await mkdir(native)
    for (const file of ['values.rs', 'logic.rs'])
      await writeFile(join(native, file), await readFile('crates/check-evaluator/src/' + file))
    const constraint = table.constraints.find((constraint) => constraint.name === 'amount_present')!
    await writeFile(
      join(native, 'evaluator.rs'),
      emitCheckRustEvaluator(lowerTableCheck(table, constraint)!.expression).source,
    )
    await writeFile(
      join(native, 'test.rs'),
      `include!("values.rs");
include!("logic.rs");
include!("evaluator.rs");
#[test]
fn nullness() {
    assert!(evaluate_check(BoolValue::Unknown) == CheckOutcome::Unknown);
    assert!(evaluate_check(BoolValue::Value(true)) == CheckOutcome::False);
    assert!(evaluate_check(BoolValue::Value(false)) == CheckOutcome::True);
    let error = SqlError { state: 1 };
    assert!(evaluate_check(BoolValue::Error(error)) == CheckOutcome::Error(error));
}
`,
    )
    await run('rustc', [
      '--edition=2021',
      '--test',
      join(native, 'test.rs'),
      '-o',
      join(native, 'test'),
    ])
    await run(join(native, 'test'))

    const statement = (await parseSql('INSERT INTO public.null_inputs (amount) VALUES ($1)'))
      .stmts![0]!.stmt!
    const writes = [
      {
        target: { schema: 'public', relation: 'null_inputs', column: 'amount' },
        source: 'insert' as const,
        partial: false,
        value: { kind: 'parameter' as const, number: 1, resolvedType: 'numeric' },
      },
    ]
    expect(planCheckInputs(statement, writes, catalog, ['numeric'])[0]!.columns).toEqual([
      { name: 'amount', parameter: 1 },
    ])
    expect(planCheckInputs(statement, writes, catalog, ['date'])).toEqual([])
  }, 120_000)

  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  for (const name of [
    'absent',
    'undefined',
    'NULL',
    'NULL via value',
    'present',
    'dispatch_without_local_time',
    'missing_unused_branch',
    'missing_selected_branch',
  ])
    it(name, () => {
      const item = cases.find((item) => item.name === name)!
      for (const target of [evaluate, fallback]) {
        const results = target(item.row).map(({ constraint, result }) => ({ constraint, result }))
        expect(results).toEqual(item.results)
      }
    })

  it('keeps composite row NULL semantics distinct from scalar nullness', async () => {
    expect(
      (
        await pg.query(
          'SELECT ROW(NULL, 1)::public.null_pair IS NULL AS is_null, ROW(NULL, 1)::public.null_pair IS NOT NULL AS is_present',
        )
      ).rows,
    ).toEqual([{ is_null: false, is_present: false }])
  })
})
