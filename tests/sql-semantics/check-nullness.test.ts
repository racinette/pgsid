import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { expectUndecidedOrRejected } from './check-public-inputs.js'
import { PGlite } from '@electric-sql/pglite'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import { parseConfigString } from '../../src/config/loader.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { planCheckInputs } from '../../src/codegen/shared/check-inputs.js'
import { parseSql } from '../../src/ast.js'
import { emitCheckRustEvaluator } from '../../src/codegen/shared/check-rust-evaluator.js'
import { assembleCheckRust } from '../../src/codegen/shared/check-rust-source.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { renderGoSchemaChecks } from '../../src/codegen/go/sql/catalog-checks.js'
import {
  renderTypescriptSchemaCheckArtifacts,
  renderTypescriptSchemaChecks,
} from '../../src/codegen/typescript/sql/catalog-checks.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { renderGoCheckTests, type GoCheckCase } from './check-codegen.js'
import { writeCheckRustSources } from '../../tools/check-rust/sources.js'
import { internalCheckRows, type InternalCheckRows } from '../support/check-entries.js'

const run = promisify(execFile)
const portableItems = (value: unknown) =>
  Array.isArray(value)
    ? {
        kind: 'Value',
        value: {
          elementType: 'pg_catalog.int4',
          elementKind: 2,
          dimensions: value.length ? [{ lower: 1, length: value.length }] : [],
          elements: value.map((value: number | null) =>
            value === null ? { kind: 'Null' } : { kind: 'Int4', value },
          ),
        },
      }
    : value
const publicResult = (outcome: unknown) => {
  const { kind, value } = outcome as { kind: string; value?: { state: number } }
  if (kind === 'True' || kind === 'False' || kind === 'Null')
    return { certain: true, value: kind === 'Null' ? null : kind === 'True' }
  if (kind === 'Unknown') return { certain: false }
  if (kind === 'Unimplemented') return { certain: false, unimplemented: true }
  return { certain: true, error: value!.state.toString(36).toUpperCase().padStart(5, '0') }
}
const fields = [
  { name: 'amount', type: 'numeric', literal: '12.50' },
  { name: 'day', type: 'date', literal: "'2026-01-02'" },
  { name: 'instant', type: 'timestamptz', literal: "'2026-01-02 03:04+00'" },
  { name: 'local_time', type: 'timestamp', literal: "'2026-01-02 03:04'" },
  { name: 'duration', type: 'interval', literal: "'1 hour'" },
  { name: 'clock', type: 'time', literal: "'12:00'" },
  { name: 'zoned_clock', type: 'timetz', literal: "'12:00+02'" },
  { name: 'domain_duration', type: 'public.nested_null_duration', literal: "'1 hour'" },
  { name: 'domain_clock', type: 'public.nested_null_clock', literal: "'12:00+02'" },
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
  let internal: InternalCheckRows
  let runtime: Record<string, (...inputs: unknown[]) => unknown>

  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-check-nullness-'))
    await symlink(resolve('node_modules'), join(directory, 'node_modules'), 'dir')
    await pg.exec(`
      CREATE TYPE public.null_state AS ENUM ('ready', 'done');
      CREATE TYPE public.null_pair AS (a integer, b integer);
      CREATE DOMAIN public.null_price AS numeric;
      CREATE DOMAIN public.nested_null_price AS public.null_price;
      CREATE DOMAIN public.null_pair_domain AS public.null_pair;
      CREATE DOMAIN public.null_duration AS interval;
      CREATE DOMAIN public.nested_null_duration AS public.null_duration;
      CREATE DOMAIN public.null_clock AS timetz;
      CREATE DOMAIN public.nested_null_clock AS public.null_clock;
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
        const plan = lowerTableCheck(table, constraint, [], catalog.domains)!
        const unsupported = ['pair_null', 'pair_present', 'pair_domain_null'].includes(
          constraint.name,
        )
        const parameters = plan.inputs.map((column) => row[column])
        const missing = parameters.some((value) => value === undefined)
        const shortCircuit =
          ['conditional_presence', 'nullness_name_collision'].includes(constraint.name) &&
          row['amount'] === null
        // Row nullness of a composite is not evaluated, while a missing input is unsupplied.
        if (unsupported) {
          results.push({
            constraint: constraint.name,
            result: { certain: false, unimplemented: true },
          })
          continue
        }
        if (missing && !shortCircuit) {
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

    const ts = renderTypescriptSchemaCheckArtifacts([table], catalog.domains)
    await writeFile(join(directory, 'package.json'), '{"type":"module"}\n')
    await writeFile(join(directory, 'checks.ts'), ts.checks)
    await writeFile(
      join(directory, 'fallback.ts'),
      renderTypescriptSchemaChecks([table], catalog.domains),
    )
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
    runtime = await import(pathToFileURL(join(directory, 'js/checks-rust/checks.js')).href)
    internal = internalCheckRows(ts.checks, runtime)

    const arrayFallback = join(directory, 'array-fallback')
    await mkdir(arrayFallback)
    const arrayTable = {
      ...table,
      columns: table.columns.filter((column) => column.name === 'items'),
      constraints: table.constraints.filter((constraint) => constraint.name.startsWith('items_')),
    }
    await writeFile(
      join(arrayFallback, 'checks.go'),
      renderGoSchemaChecks(
        [arrayTable],
        'arrayfallback',
        [],
        [],
        catalog,
        parseConfigString('schema: schema.sql\nsql:\n  codegen:\n    go:\n      nulls: pointers\n'),
      ),
    )
    await writeFile(join(arrayFallback, 'go.mod'), 'module arrayfallback\n\ngo 1.25\n')
    await writeFile(
      join(arrayFallback, 'checks_test.go'),
      renderGoCheckTests(
        'arrayfallback',
        cases.map((item) => ({
          ...item,
          table: arrayTable,
          row: Object.hasOwn(item.row, 'items') ? { items: item.row['items'] } : {},
          results: item.results.filter((result) => result.constraint.startsWith('items_')),
        })),
      ),
    )
    await run('go', ['test', './...'], {
      cwd: arrayFallback,
      env: process.env,
    })

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
        renderGoCheckTests(
          'public',
          cases.map((item) => ({
            ...item,
            row: {
              ...item.row,
              ...(Object.hasOwn(item.row, 'items')
                ? { items: portableItems(item.row['items']) }
                : {}),
              ...(item.row['day'] instanceof Date
                ? { day: item.row['day'].toISOString().slice(0, 10) }
                : {}),
              ...Object.fromEntries(
                ['instant', 'local_time'].flatMap((name) => {
                  const value = item.row[name]
                  return value instanceof Date
                    ? [[name, BigInt(value.getTime() - Date.UTC(2000, 0, 1)) * 1000n]]
                    : []
                }),
              ),
              ...Object.fromEntries(
                ['duration', 'domain_duration', 'clock', 'zoned_clock', 'domain_clock'].flatMap(
                  (name) => {
                    if (item.row[name] === undefined || item.row[name] === null) return []
                    const payload = name.includes('duration')
                      ? { months: 0, days: 0, time: 3_600_000_000n }
                      : name === 'clock'
                        ? 43_200_000_000n
                        : { time: 43_200_000_000n, zone: -7200 }
                    return [[name, payload]]
                  },
                ),
              ),
            },
            numericColumns: ['amount', 'price', 'nested_price'],
            arrayColumns: ['items'],
            intervalColumns: ['duration', 'domain_duration'],
            timeColumns: ['clock'],
            timetzColumns: ['zoned_clock', 'domain_clock'],
          })),
          { dateRuntime: 'nullchecks/schema/public/checkrust/checkruntime' },
        ),
      )
      await run('go', ['test', '-mod=mod', './...'], {
        cwd: root,
        env: process.env,
      }).catch((error: { stdout: string; stderr: string }) => {
        throw new Error(error.stdout + error.stderr, { cause: error })
      })
    }

    const native = join(directory, 'native')
    await mkdir(native)
    const constraint = table.constraints.find((constraint) => constraint.name === 'amount_present')!
    writeCheckRustSources(
      join(native, 'evaluator.rs'),
      assembleCheckRust(
        emitCheckRustEvaluator(lowerTableCheck(table, constraint, [], catalog.domains)!.expression),
      ),
    )
    await writeFile(
      join(native, 'test.rs'),
      `include!("evaluator.rs");
#[test]
fn nullness() {
    assert!(evaluate_check(NumericValue::Unknown) == CheckOutcome::Unknown);
    assert!(evaluate_check(NumericValue::Null) == CheckOutcome::False);
    assert!(evaluate_check(make_numeric_value("12.50")) == CheckOutcome::True);
    let error = SqlError { state: 1 };
    assert!(evaluate_check(NumericValue::Error(error)) == CheckOutcome::Error(error));
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
      const portable = { ...item.row }
      if (Object.hasOwn(portable, 'items'))
        portable['items'] =
          portable['items'] === null && item.nullViaValue
            ? { kind: 'Null' }
            : portableItems(portable['items'])
      // Public values: the shapes generated queries read and write.
      const day = portable['day']
      if (day instanceof Date) portable['day'] = day.toISOString().slice(0, 10)
      const instant = portable['instant']
      if (instant instanceof Date)
        portable['instant'] = { epochMicroseconds: BigInt(instant.getTime()) * 1000n }
      // The driver read the unzoned timestamp as local time; its wall clock is the public value.
      const local = portable['local_time']
      if (local instanceof Date)
        portable['local_time'] = {
          localMicroseconds: BigInt(local.getTime() - local.getTimezoneOffset() * 60_000) * 1000n,
        }
      for (const name of ['duration', 'domain_duration', 'clock', 'zoned_clock', 'domain_clock']) {
        if (portable[name] === undefined || portable[name] === null) continue
        portable[name] = name.includes('duration')
          ? { months: 0, days: 0, microseconds: 3_600_000_000n }
          : name === 'clock'
            ? { microseconds: 43_200_000_000 }
            : { microseconds: 43_200_000_000, offsetSeconds: 7200 }
      }
      if (item.nullViaValue) {
        // SQL NULL is the public null; the payload that used to carry it is no public value. The
        // evaluator entries take it directly and decide every check as the public null does.
        for (const name of [
          'amount',
          'day',
          'instant',
          'local_time',
          'duration',
          'domain_duration',
          'clock',
          'zoned_clock',
          'domain_clock',
          'price',
          'nested_price',
          'floating',
        ])
          expect(() => evaluate({ ...portable, [name]: { kind: 'Null' } }), name).toThrow(TypeError)
        const nulls: Record<string, unknown> = Object.fromEntries(
          fields.map((field) => [field.name, { kind: 'Null' }]),
        )
        // Nullness of these inputs reaches the entries already decided.
        nulls['identifier'] = runtime['makeBoolValue']!(true)
        nulls['state'] = runtime['makeBoolValue']!(true)
        nulls['items'] = runtime['arrayIsNull']!({ kind: 'Null' })
        const outcomes = internal('public.null_inputs', nulls)
        expect(
          item.results.map(({ constraint }) => ({
            constraint,
            result: publicResult(outcomes[constraint]),
          })),
        ).toEqual(item.results)
      }
      const results = evaluate(portable).map(({ constraint, result }) => ({ constraint, result }))
      expect(results).toEqual(item.results)
      const fallbackUnsupported = new Set([
        'amount_comparison',
        'amount_null',
        'amount_present',
        'conditional_presence',
        'identifier_null',
        'identifier_present',
        'nullness_name_collision',
        'dispatch_evidence',
        ...[
          'day',
          'instant',
          'local_time',
          'duration',
          'domain_duration',
          'clock',
          'zoned_clock',
          'domain_clock',
          'price',
          'nested_price',
        ].flatMap((name) => [name + '_null', name + '_present']),
      ])
      expect(fallback(item.row).map(({ constraint, result }) => ({ constraint, result }))).toEqual(
        item.results.map((item) =>
          // The fallback evaluator does not tell Unknown from Unimplemented.
          fallbackUnsupported.has(item.constraint) || item.result.unimplemented
            ? { constraint: item.constraint, result: { certain: false } }
            : item,
        ),
      )
    })

  it('preserves clock and interval payload states and rejects malformed known payloads', () => {
    const zone = [
      { microseconds: 0, offsetSeconds: 2147483648 },
      { kind: 'Value', value: { time: 0n, zone: 2147483648 } },
    ]
    const months = [
      { months: 2147483648, days: 0, microseconds: 0n },
      { kind: 'Value', value: { time: 0n, months: 2147483648, days: 0 } },
    ]
    const malformed: Record<string, object[]> = {
      clock: [{ microseconds: -1 }, { kind: 'Value', value: -1n }],
      zoned_clock: zone,
      domain_clock: zone,
      duration: months,
      domain_duration: months,
    }
    // Unknown and failed operands are no public values; the evaluator entries take them directly.
    const unknown = Object.fromEntries(fields.map((field) => [field.name, { kind: 'Unknown' }]))
    const failure = { kind: 'Error', value: { state: parseInt('22012', 36) } }
    for (const [name, invalid] of Object.entries(malformed)) {
      const pair = (input: unknown) =>
        evaluate({ [name]: input })
          .filter((item) => [name + '_null', name + '_present'].includes(item.constraint))
          .map((item) => item.result)
      const entries = (input: unknown) => {
        const outcomes = internal('public.null_inputs', { ...unknown, [name]: input })
        return [outcomes[name + '_null'], outcomes[name + '_present']]
      }
      expect(pair(null), name).toEqual([
        { certain: true, value: true },
        { certain: true, value: false },
      ])
      expect(entries({ kind: 'Null' }), name).toEqual([{ kind: 'True' }, { kind: 'False' }])
      expect(pair(undefined), name).toEqual([{ certain: false }, { certain: false }])
      expect(entries({ kind: 'Unknown' }), name).toEqual([{ kind: 'Unknown' }, { kind: 'Unknown' }])
      for (const input of invalid)
        expectUndecidedOrRejected(() => evaluate({ [name]: input }), name, [
          name + '_null',
          name + '_present',
        ])
      expect(entries(failure), name).toEqual([failure, failure])
      for (const payload of [{ kind: 'Null' }, { kind: 'Unknown' }, failure])
        expect(() => evaluate({ [name]: payload }), name).toThrow(TypeError)
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
