import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import type { Node } from 'libpg-query'
import { deparseSync } from 'pgsql-deparser'
import { PGlite } from '@electric-sql/pglite'
import { plpgsql_check } from '@electric-sql/pglite-plpgsql-check'
import { getStatements, parseSql } from '../../src/ast.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot } from '../../src/catalog/types.js'
import { catalogCheckGroups } from '../../src/sql-semantics/catalog-checks.js'
import {
  catalogDateType,
  catalogTemporalType,
  catalogNumericType,
} from '../../src/sql-semantics/catalog-check-binder.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { renderGoCheckTests, type GoCheckCase } from './check-codegen.js'
import { typeName } from '../../src/codegen/typescript/type-mapping.js'
import { parseConfigString } from '../../src/config/loader.js'
import { worldPurpose } from '../unit/query/world-purpose.js'

const run = promisify(execFile)
const worldsDirectory = fileURLToPath(new URL('../unit/query/worlds/', import.meta.url))
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"'
type Result = {
  constraint: string
  message?: string
  result: { certain: boolean; value?: boolean | null; error?: string }
}
type OracleOutcome = boolean | null | { error: string }
type Case = {
  name: string
  schema: string
  relation: string
  sql: string
  values: Map<string, Node>
}
const worlds = (await readdir(worldsDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({ name: entry.name, schema: 'world_' + entry.name }))
  .sort((left, right) => left.name.localeCompare(right.name))
const cases: Case[] = []
const checkWorlds = new Set<string>()
for (const world of worlds) {
  if (
    worldPurpose(await readFile(join(worldsDirectory, world.name, 'schema.sql'), 'utf8')) ===
    'checks'
  )
    checkWorlds.add(world.name)
  const source = await readFile(join(worldsDirectory, world.name, 'check-seed.sql'), 'utf8')
  const statements = getStatements(await parseSql(source), Buffer.from(source))
  const labels = [...source.matchAll(/^--\s*name:\s*(\S+)\s*$/gmu)].map((match) => match[1]!)
  if (labels.length !== statements.length || new Set(labels).size !== labels.length)
    throw new Error(`${world.name}: every CHECK case needs a unique name comment`)
  for (const [index, statement] of statements.entries()) {
    const insert = 'InsertStmt' in statement.stmt ? statement.stmt.InsertStmt : undefined
    const select = insert?.selectStmt
    const rows = select && 'SelectStmt' in select ? select.SelectStmt.valuesLists : undefined
    if (
      !insert?.relation?.relname ||
      !insert.cols?.length ||
      rows?.length !== 1 ||
      insert.withClause ||
      insert.onConflictClause
    )
      throw new Error(`${world.name}: CHECK case requires a single-row INSERT VALUES`)
    const first = rows[0]!
    const values = 'List' in first ? (first.List.items ?? []) : []
    if (values.length !== insert.cols.length)
      throw new Error(`${world.name}: INSERT arity mismatch`)
    const literal = (node: Node): boolean =>
      'A_Const' in node ||
      ('TypeCast' in node && Boolean(node.TypeCast.arg) && literal(node.TypeCast.arg!))
    if (!values.every(literal)) throw new Error(`${world.name}: CHECK case requires literal values`)
    const label = labels[index]!
    if (insert.relation.schemaname && insert.relation.schemaname !== world.schema)
      throw new Error(`${world.name}: CHECK case must address its own world`)
    cases.push({
      name: `${world.name}/${label}`,
      schema: world.schema,
      relation: insert.relation.relname,
      sql: statement.text,
      values: new Map(
        insert.cols.map((column, index) => {
          if (!('ResTarget' in column) || !column.ResTarget.name)
            throw new Error('Missing INSERT column name')
          return [column.ResTarget.name, values[index]!]
        }),
      ),
    })
  }
}

async function loadWorldSql(pg: PGlite, source: string, schema: string): Promise<void> {
  const parsed = await parseSql(source)
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    if (record['schemaname'] === 'public') record['schemaname'] = schema
    const setting = record['VariableSetStmt'] as { name?: string; args?: Node[] } | undefined
    if (setting?.name === 'search_path')
      for (const arg of setting.args ?? [])
        if ('A_Const' in arg && arg.A_Const.sval?.sval === 'public') arg.A_Const.sval.sval = schema
    for (const child of Object.values(record)) visit(child)
  }
  visit(parsed)
  await pg.exec(deparseSync(parsed))
}

const normalized = (results: Result[]): Result[] =>
  results.map(({ constraint, result, message }) => ({
    constraint,
    ...(message ? { message } : {}),
    result: result.certain
      ? result.error
        ? { certain: true, error: result.error }
        : { certain: true, value: result.value }
      : { certain: false },
  }))

describe('world CHECK INSERT parity', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  let generated: Record<string, (row: Record<string, unknown>) => Result[]>
  const inputs = new Map<string, Record<string, unknown>>()
  const typescriptResults = new Map<string, Result[]>()
  const goCases = new Map<string, GoCheckCase[]>()
  const coverage = new Map<
    string,
    {
      constraint: string
      definition: string
      true: number
      false: number
      null: number
      error: number
      unknown: number
      postgres: { true: number; false: number; null: number; error: number }
    }
  >()
  const caseResults: {
    name: string
    database: { accepted: boolean; constraint?: string; sqlstate?: string }
    sql: string
    checks: (Result & { postgres: OracleOutcome })[]
  }[] = []
  let definite = 0
  let localRejections = 0
  let databaseRejections = 0
  let unknownComparisons = 0

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } })
    directory = await mkdtemp(join(tmpdir(), 'pgsid-world-checks-'))
    await pg.exec('CREATE EXTENSION plpgsql_check')
    for (const world of worlds) {
      await pg.exec(
        `CREATE SCHEMA ${quote(world.schema)}; SET search_path = ${quote(world.schema)}, public`,
      )
      for (const file of ['schema.sql', 'data.sql'])
        await loadWorldSql(
          pg,
          await readFile(join(worldsDirectory, world.name, file), 'utf8'),
          world.schema,
        )
    }
    catalog = await snapshotCatalog(pg)
    expect(catalog.tables.filter((table) => table.schema === 'public')).toEqual([])
    expect(
      catalog.tables
        .filter((table) => table.name === 'reservations')
        .map((table) => table.schema)
        .sort(),
    ).toEqual(['world_002_library', 'world_008_inventory_allocation'])
    const tables = catalog.tables.filter((table) =>
      cases.some((item) => item.schema === table.schema && item.relation === table.name),
    )
    for (const table of tables) {
      expect(table.writeRewritesTree.beforeRow).toEqual([])
      expect(catalogCheckGroups([table], catalog.domains, [], catalog.enums).length).toBe(1)
    }
    const ts = renderTypescriptSchemaCheckArtifacts(tables, catalog.domains, [], {
      enums: catalog.enums,
    })
    const go = renderGoSchemaArtifacts(
      { ...catalog, tables, views: [], materializedViews: [] },
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    go:\n      schema: { outDir: schema }\n',
      ),
      {},
      join(directory, 'schema'),
      'worldchecks/schema',
    )
    expect(go.diagnostics).toEqual([])
    expect(ts.rustFiles).not.toBeNull()
    await writeFile(join(directory, 'package.json'), '{"type":"module"}\n')
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
    ]).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
    generated = await import(pathToFileURL(join(directory, 'js/checks.js')).href)
    for (const artifact of go.artifacts) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
    }
    await writeFile(
      join(directory, 'go.mod'),
      'module worldchecks\n\ngo 1.25\n\nrequire github.com/jackc/pgx/v5 v5.10.0\n',
    )
    await writeFile(
      join(directory, 'go.sum'),
      await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
    )
    for (const item of cases) {
      const table = tables.find(
        (table) => table.schema === item.schema && table.name === item.relation,
      )!
      const expressions = table.columns
        .filter((column) => column.generated === 'none')
        .map((column) => {
          const value = item.values.get(column.name)
          if (!value && column.hasDefault)
            throw new Error(`${item.name}: omitted default needs row materialization`)
          return `CAST(${value ? deparseSync(value) : 'NULL'} AS ${column.typeName}) AS ${quote(column.name)}`
        })
      await pg.exec(`SET search_path = ${quote(item.schema)}, public`)
      const row = (await pg.query<Record<string, unknown>>(`SELECT ${expressions.join(',')}`))
        .rows[0]!
      inputs.set(item.name, row)
      const dateColumns = table.columns
        .filter((column) => catalogDateType(column.typeName, column.typeOid, catalog.domains))
        .map((column) => column.name)
      const timestampColumns = table.columns
        .filter(
          (column) =>
            catalogTemporalType(column.typeName, column.typeOid, catalog.domains) ===
            'pg_catalog."timestamp"',
        )
        .map((column) => column.name)
      const timestamptzColumns = table.columns
        .filter(
          (column) =>
            catalogTemporalType(column.typeName, column.typeOid, catalog.domains) ===
            'pg_catalog.timestamptz',
        )
        .map((column) => column.name)
      const numericColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogNumericType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const portableRow = { ...row }
      const goRow = { ...row }
      for (const name of numericColumns) {
        const value = (
          await pg.query<{ value: string | null }>(
            `SELECT ${quote(name)}::text AS value FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.value
        portableRow[name] = value
        goRow[name] = value
      }
      for (const name of dateColumns) {
        const date = row[name]
        const hex = (
          await pg.query<{ binary: string | null }>(
            "SELECT encode(date_send($1::date), 'hex') AS binary",
            [date],
          )
        ).rows[0]!.binary
        const days = hex === null ? null : Buffer.from(hex, 'hex').readInt32BE()
        portableRow[name] = days === null ? { kind: 'Null' } : { kind: 'Value', value: days }
        goRow[name] = days
      }
      for (const name of timestampColumns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(timestamp_send(${quote(name)}), 'hex') AS binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const micros = hex === null ? null : Buffer.from(hex, 'hex').readBigInt64BE()
        portableRow[name] = micros === null ? { kind: 'Null' } : { kind: 'Value', value: micros }
        goRow[name] = micros
      }
      for (const name of timestamptzColumns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(timestamptz_send(${quote(name)}), 'hex') AS binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const micros = hex === null ? null : Buffer.from(hex, 'hex').readBigInt64BE()
        portableRow[name] = micros === null ? { kind: 'Null' } : { kind: 'Value', value: micros }
        goRow[name] = micros
      }
      const results = normalized(
        generated[`evaluate${typeName(table.schema + '_' + table.name)}Checks`]!(portableRow),
      )
      typescriptResults.set(item.name, results)
      const schemaCases = goCases.get(item.schema) ?? []
      schemaCases.push({
        name: item.name,
        table,
        row: goRow,
        numericColumns,
        dateColumns,
        timestampColumns,
        timestamptzColumns,
        results,
      })
      goCases.set(item.schema, schemaCases)
    }
    for (const [schema, schemaCases] of goCases)
      await writeFile(
        join(directory, 'schema', schema, 'checks_test.go'),
        renderGoCheckTests(schema, schemaCases, {
          dateRuntime: `worldchecks/schema/${schema}/checkrust/checkruntime`,
        }),
      )
    await run('go', ['test', '-mod=mod', './...'], {
      cwd: directory,
      env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
    }).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
  }, 120_000)

  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it.each(cases)('$name', async (item) => {
    const table = catalog.tables.find(
      (table) => table.schema === item.schema && table.name === item.relation,
    )!
    await pg.exec(`SET search_path = ${quote(item.schema)}, public; BEGIN`)
    let rejected: { code: string; constraint?: string } | undefined
    try {
      await pg.query(item.sql)
    } catch (error) {
      const failure = error as { code: string; constraint?: string }
      expect(failure.code, `${item.name}: unrelated INSERT failure`).toMatch(
        /^(?:23514|22[A-Z0-9]{3})$/u,
      )
      rejected = failure
    } finally {
      await pg.exec('ROLLBACK')
    }
    const results = typescriptResults.get(item.name)!
    if (checkWorlds.has(item.name.split('/')[0]!))
      expect(
        results.every(({ result }) => result.certain),
        `${item.name}: CHECK worlds require definite validation`,
      ).toBe(true)
    const row = inputs.get(item.name)!
    const select = table.columns
      .filter((column) => Object.hasOwn(row, column.name))
      .map(
        (column) =>
          `CAST(${item.values.has(column.name) ? deparseSync(item.values.get(column.name)!) : 'NULL'} AS ${column.typeName}) AS ${quote(column.name)}`,
      )
      .join(',')
    const generatedColumns = table.columns
      .filter((column) => column.generated !== 'none')
      .map((column) => {
        if (!column.defaultExpr) throw new Error(`${item.name}: missing generated expression`)
        return `(${column.defaultExpr}) AS ${quote(column.name)}`
      })
    const candidate = generatedColumns.length
      ? `SELECT inputs.*, ${generatedColumns.join(',')} FROM (SELECT ${select}) AS inputs`
      : `SELECT ${select}`
    const oracleResults: (Result & { postgres: OracleOutcome })[] = []
    for (const { constraint, result, message } of results) {
      const identity = `${item.schema}.${table.name}.${constraint}`
      const counts = coverage.get(identity) ?? {
        constraint: identity,
        definition: table.constraints.find((candidate) => candidate.name === constraint)!
          .definition,
        true: 0,
        false: 0,
        null: 0,
        error: 0,
        unknown: 0,
        postgres: { true: 0, false: 0, null: 0, error: 0 },
      }
      counts[
        result.certain
          ? result.error
            ? 'error'
            : result.value === null
              ? 'null'
              : result.value
                ? 'true'
                : 'false'
          : 'unknown'
      ]++
      coverage.set(identity, counts)
      const definition = table.constraints.find(
        (candidate) => candidate.name === constraint,
      )!.definition
      const ast = await parseSql(`ALTER TABLE host ADD CONSTRAINT test ${definition}`)
      const statement = ast.stmts![0]!.stmt! as {
        AlterTableStmt: { cmds: { AlterTableCmd: { def: { Constraint: { raw_expr: Node } } } }[] }
      }
      const expression = statement.AlterTableStmt.cmds[0]!.AlterTableCmd.def.Constraint.raw_expr
      let expected: OracleOutcome
      try {
        expected = (
          await pg.query<{ value: boolean | null }>(
            `WITH candidate AS MATERIALIZED (${candidate})
              SELECT (${deparseSync(expression)}) AS value FROM candidate`,
          )
        ).rows[0]!.value
      } catch (error) {
        const code = (error as { code: string }).code
        expect(code, `${item.name}/${constraint}: unrelated oracle failure`).toMatch(
          /^22[A-Z0-9]{3}$/u,
        )
        expected = { error: code }
      }
      const oracleError =
        expected !== null && typeof expected === 'object' ? expected.error : undefined
      counts.postgres[
        oracleError ? 'error' : expected === null ? 'null' : expected ? 'true' : 'false'
      ]++
      oracleResults.push({ constraint, result, message, postgres: expected })
      if (!result.certain) {
        expect(message, `${item.name}/${constraint}: missing diagnostic`).toEqual(
          expect.any(String),
        )
        expect(message!.length).toBeGreaterThan(0)
        unknownComparisons++
        continue
      }
      expect(result, `${item.name}/${constraint}: generated CHECK differs from PostgreSQL`).toEqual(
        oracleError ? { certain: true, error: oracleError } : { certain: true, value: expected },
      )
      if (oracleError) {
        expect(
          rejected,
          `${item.name}/${constraint}: evaluation errors must reject the INSERT`,
        ).toBeDefined()
        expect(message, `${item.name}/${constraint}: missing error diagnostic`).toEqual(
          expect.any(String),
        )
        expect(message!.length).toBeGreaterThan(0)
      }
      definite++
      if (expected === false)
        expect(rejected, `${item.name}/${constraint}: INSERT must reject`).toBeDefined()
    }
    if (rejected?.code === '23514') {
      databaseRejections++
      const result = results.find((result) => result.constraint === rejected!.constraint)?.result
      expect(
        result,
        `${item.name}: database constraint absent from generated validator`,
      ).toBeDefined()
      if (result!.certain) {
        expect(result).toEqual({ certain: true, value: false })
        localRejections++
      }
    } else if (rejected) {
      databaseRejections++
      expect(
        oracleResults.some(
          ({ postgres }) =>
            postgres !== null && typeof postgres === 'object' && postgres.error === rejected!.code,
        ),
        `${item.name}: INSERT error must originate in a CHECK`,
      ).toBe(true)
      if (results.some(({ result }) => result.certain && result.error === rejected!.code))
        localRejections++
    } else
      expect(
        results.filter(({ result }) => result.certain && (result.error || result.value === false)),
      ).toEqual([])
    caseResults.push({
      name: item.name,
      database: rejected
        ? { accepted: false, constraint: rejected.constraint, sqlstate: rejected.code }
        : { accepted: true },
      sql: item.sql,
      checks: oracleResults,
    })
  })

  it('exercises definite evaluation and local rejection', async () => {
    expect(definite).toBeGreaterThan(0)
    expect(localRejections).toBeGreaterThan(0)
    expect(caseResults).toHaveLength(cases.length)
    for (const identity of [
      'world_011_flight_arrivals.flight_arrivals.arrival_interpretation',
      'world_011_flight_arrivals.arrival_displays.displayed_arrival',
      'world_012_package_capacity.package_capacity.area_limit',
      'world_012_package_capacity.package_capacity.slot_limit',
      'world_012_package_capacity.package_capacity.whole_batches',
      'world_012_package_capacity.package_capacity.adjustment_limit',
      'world_012_package_capacity.compact_stock_corrections.compact_correction',
      'world_012_package_capacity.compact_inventory_adjustments.compact_adjustment',
      'world_012_package_capacity.tiny_inventory_adjustments.tiny_adjustment',
      'world_012_package_capacity.bulk_package_products.bulk_package_product',
      'world_012_package_capacity.chosen_package_counts.chosen_double',
      'world_012_package_capacity.chosen_package_counts.chosen_ratio',
      'world_014_shipment_defaults.replenishment_picks.fallback_double',
      'world_014_shipment_defaults.replenishment_picks.fallback_ratio',
      'world_012_package_capacity.mixed_batch_remainders.small_integer_remainder',
      'world_012_package_capacity.mixed_batch_remainders.integer_small_remainder',
      'world_012_package_capacity.mixed_batch_remainders.small_big_remainder',
      'world_012_package_capacity.mixed_batch_remainders.big_small_remainder',
      'world_012_package_capacity.mixed_batch_remainders.integer_big_remainder',
      'world_012_package_capacity.mixed_batch_remainders.big_integer_remainder',
      'world_012_package_capacity.mixed_batch_remainders.widened_remainder_call',
      'world_012_package_capacity.bulk_package_divisions.bulk_package_quotient',
      'world_012_package_capacity.bulk_package_divisions.bulk_package_remainder',
      'world_012_package_capacity.mixed_bulk_packages.bulk_small_product',
      'world_012_package_capacity.mixed_bulk_packages.small_bulk_product',
      'world_012_package_capacity.mixed_bulk_packages.bulk_integer_product',
      'world_012_package_capacity.mixed_bulk_packages.integer_bulk_product',
      'world_012_package_capacity.mixed_bulk_packages.bulk_small_quotient',
      'world_012_package_capacity.mixed_bulk_packages.small_bulk_quotient',
      'world_012_package_capacity.mixed_bulk_packages.bulk_integer_quotient',
      'world_012_package_capacity.mixed_bulk_packages.integer_bulk_quotient',
      'world_012_package_capacity.bulk_stock_reconciliations.bulk_stock_balance',
      'world_012_package_capacity.bulk_warehouse_corrections.bulk_correction_reversal',
      'world_012_package_capacity.bulk_warehouse_corrections.bulk_correction_magnitude',
      'world_012_package_capacity.mixed_bulk_adjustments.bulk_small_total',
      'world_012_package_capacity.mixed_bulk_adjustments.small_bulk_total',
      'world_012_package_capacity.mixed_bulk_adjustments.bulk_integer_total',
      'world_012_package_capacity.mixed_bulk_adjustments.integer_bulk_total',
      'world_012_package_capacity.mixed_bulk_adjustments.bulk_small_residual',
      'world_012_package_capacity.mixed_bulk_adjustments.small_bulk_balance',
      'world_012_package_capacity.mixed_bulk_adjustments.bulk_integer_residual',
      'world_012_package_capacity.mixed_bulk_adjustments.integer_bulk_balance',
    ]) {
      const measured = coverage.get(identity)!
      expect(measured.error, identity).toBeGreaterThan(0)
      expect(measured.error, identity).toBe(measured.postgres.error)
      expect(measured.unknown, identity).toBe(0)
    }
    for (const name of [
      'chosen_pair',
      'chosen_stock',
      'chosen_baseline',
      'chosen_double',
      'chosen_ratio',
      'chosen_nested',
      'chosen_simple',
      'chosen_without_else',
    ]) {
      const identity = `world_012_package_capacity.chosen_package_counts.${name}`
      const measured = coverage.get(identity)!
      expect(measured.true, identity).toBeGreaterThan(0)
      expect(measured.false, identity).toBeGreaterThan(0)
      expect(measured.null, identity).toBeGreaterThan(0)
      expect(measured.unknown, identity).toBe(0)
    }
    for (const [table, names] of [
      [
        'replenishment_picks',
        ['fallback_units', 'fallback_baseline', 'fallback_double', 'fallback_ratio'],
      ],
      [
        'delivery_defaults',
        ['fallback_day', 'fallback_schedule', 'fallback_confirmation', 'fallback_enabled'],
      ],
      ['shipment_labels', ['fallback_label', 'fallback_code', 'fallback_fee', 'fallback_stage']],
    ] as const) {
      for (const name of names) {
        const identity = `world_014_shipment_defaults.${table}.${name}`
        const measured = coverage.get(identity)!
        expect(measured.true, identity).toBeGreaterThan(0)
        expect(measured.false, identity).toBeGreaterThan(0)
        expect(measured.null, identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(0)
      }
    }
    for (const [table, names] of [
      [
        'network_peers',
        [
          'peer_within_allowed',
          'peer_in_address_range',
          'peer_default_recorded',
          'peer_selected_recorded',
        ],
      ],
      ['network_subnets', ['subnet_strictly_inside_parent', 'subnet_avoids_forbidden']],
      ['network_imports', ['import_address_parsed', 'import_network_parsed']],
      [
        'network_allocations',
        [
          'allocation_shifted',
          'allocation_shifted_reverse',
          'allocation_restored',
          'allocation_distance',
        ],
      ],
      [
        'network_plans',
        [
          'plan_family',
          'plan_prefix',
          'plan_same_family',
          'plan_network',
          'plan_broadcast',
          'plan_netmask',
          'plan_hostmask',
          'plan_converted',
          'plan_combined',
        ],
      ],
      [
        'network_outputs',
        [
          'output_host',
          'output_text',
          'output_abbrev',
          'output_cidr_abbrev',
          'output_inet_send',
          'output_cidr_send',
          'output_hash',
          'output_hash_extended',
        ],
      ],
      [
        'hardware_devices',
        [
          'device_nonzero',
          'device_in_range',
          'device_allowed',
          'device_comparison',
          'device_selected',
          'device_default',
          'device_recognized',
        ],
      ],
      [
        'hardware_interfaces',
        [
          'interface_nonzero',
          'interface_in_range',
          'interface_allowed',
          'interface_comparison',
          'interface_selected',
          'interface_default',
          'interface_recognized',
        ],
      ],
      ['network_resizes', ['resize_address', 'resize_subnet']],
      ['network_filters', ['filter_complement', 'filter_intersection', 'filter_union']],
      [
        'network_priorities',
        ['priority_comparison', 'priority_larger', 'priority_smaller', 'priority_selected'],
      ],
    ] as const) {
      for (const name of names) {
        const identity = `world_015_network_access.${table}.${name}`
        const measured = coverage.get(identity)!
        expect(measured.true, identity).toBeGreaterThan(0)
        expect(measured.false, identity).toBeGreaterThan(0)
        expect(measured.null, identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(0)
      }
    }
    for (const name of [
      'import_address_parsed',
      'import_network_parsed',
      'allocation_shifted',
      'allocation_shifted_reverse',
      'allocation_restored',
      'allocation_distance',
    ]) {
      const table = name.startsWith('import_') ? 'network_imports' : 'network_allocations'
      const identity = `world_015_network_access.${table}.${name}`
      expect(coverage.get(identity)!.error, identity).toBeGreaterThan(0)
    }
    for (const [table, name] of [
      ['network_plans', 'plan_combined'],
      ['network_resizes', 'resize_address'],
      ['network_resizes', 'resize_subnet'],
      ['network_filters', 'filter_intersection'],
      ['network_filters', 'filter_union'],
    ]) {
      const identity = `world_015_network_access.${table}.${name}`
      expect(coverage.get(identity)!.error, identity).toBeGreaterThan(0)
    }
    const constraints = [...coverage.values()].sort((left, right) =>
      left.constraint.localeCompare(right.constraint),
    )
    for (const identity of [
      'world_001_shipping.carriers.carrier_weight_band',
      'world_001_shipping.shipments.shipment_billed_covers_declared',
      'world_001_shipping.shipment_legs.leg_distance_and_surcharge_sane',
      'world_006_marketplace_settlement.charges.charge_amounts_sane',
      'world_006_marketplace_settlement.ledger_entries.ledger_amount_direction',
      'world_006_marketplace_settlement.payout_batches.payout_amount_sane',
      'world_010_lab_calibration.observations.observation_sequence',
      'world_010_lab_calibration.observations.observation_reading_state',
      'world_010_lab_calibration.review_audits.audit_values',
      'world_012_package_capacity.warehouse_count_conversions.recorded_unit_count',
      'world_012_package_capacity.warehouse_count_conversions.archived_unit_count',
      'world_012_package_capacity.warehouse_count_conversions.archived_integer_count',
    ]) {
      const measured = coverage.get(identity)!
      expect(measured.unknown, identity).toBe(0)
      expect(measured.true, identity).toBeGreaterThan(0)
      expect(measured.false, identity).toBeGreaterThan(0)
    }
    const definiteConstraints = constraints.filter(
      (item) => item.true + item.false + item.null + item.error > 0,
    )
    const corpus = catalogCheckGroups(catalog.tables, catalog.domains, [], catalog.enums).flatMap(
      (group) =>
        group.checks.map(({ plan }) => ({
          constraint: `${group.source.schema}.${group.source.name}.${plan.name}`,
        })),
    )
    const unexercised = corpus
      .filter((item) => !coverage.has(item.constraint))
      .map((item) => item.constraint)
      .sort()
    const summary = {
      inserts: cases.length,
      corpusConstraints: corpus.length,
      exercisedConstraints: constraints.length,
      definiteConstraints: definiteConstraints.length,
      alwaysDefiniteInTestedRows: definiteConstraints.filter((item) => item.unknown === 0).length,
      partiallyDefiniteInTestedRows: definiteConstraints.filter((item) => item.unknown > 0).length,
      alwaysUnknownInTestedRows: constraints.length - definiteConstraints.length,
      unexercisedConstraints: unexercised.length,
      constraintsWithTrueAndFalse: constraints.filter((item) => item.true > 0 && item.false > 0)
        .length,
      true: constraints.reduce((sum, item) => sum + item.true, 0),
      false: constraints.reduce((sum, item) => sum + item.false, 0),
      null: constraints.reduce((sum, item) => sum + item.null, 0),
      error: constraints.reduce((sum, item) => sum + item.error, 0),
      unknown: unknownComparisons,
      postgres: {
        true: constraints.reduce((sum, item) => sum + item.postgres.true, 0),
        false: constraints.reduce((sum, item) => sum + item.postgres.false, 0),
        null: constraints.reduce((sum, item) => sum + item.postgres.null, 0),
        error: constraints.reduce((sum, item) => sum + item.postgres.error, 0),
      },
      databaseRejections,
      localRejections,
    }
    const worldStats = worlds.map((world) => {
      const checks = constraints.filter((item) => item.constraint.startsWith(world.schema + '.'))
      return {
        world: world.name,
        inserts: cases.filter((item) => item.schema === world.schema).length,
        exercised: checks.length,
        definite: checks.filter((item) => item.true + item.false + item.null + item.error > 0)
          .length,
        true: checks.reduce((sum, item) => sum + item.true, 0),
        false: checks.reduce((sum, item) => sum + item.false, 0),
        null: checks.reduce((sum, item) => sum + item.null, 0),
        error: checks.reduce((sum, item) => sum + item.error, 0),
        unknown: checks.reduce((sum, item) => sum + item.unknown, 0),
      }
    })
    for (const name of checkWorlds) {
      const outcomes = caseResults.filter((item) => item.name.startsWith(name + '/'))
      expect(
        outcomes.some((item) => item.database.accepted),
        `${name}: needs an accepted INSERT`,
      ).toBe(true)
      expect(
        outcomes.some((item) => !item.database.accepted),
        `${name}: needs a rejected INSERT`,
      ).toBe(true)
    }
    const reportDirectory = fileURLToPath(new URL('../../artifacts/check-worlds/', import.meta.url))
    await mkdir(reportDirectory, { recursive: true })
    await writeFile(
      join(reportDirectory, 'report.json'),
      JSON.stringify(
        { summary, worlds: worldStats, constraints, unexercised, cases: caseResults },
        null,
        2,
      ) + '\n',
    )
    console.table(worldStats)
    console.info('Detailed CHECK results: artifacts/check-worlds/report.json')
    console.info(
      `World CHECK parity: ${cases.length} INSERT cases, ${definiteConstraints.length} distinct constraints with definite results, ${definite} definite CHECK comparisons, ${unknownComparisons} Unknown CHECK results; ${localRejections} of ${databaseRejections} database rejections detected locally; Go and TypeScript agree.`,
    )
  })
})
