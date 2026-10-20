import { readMultirangeFixture } from './check-multirange-fixtures.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import type { Node } from 'libpg-query'
import { PGlite } from '@electric-sql/pglite'
import { plpgsql_check } from '@electric-sql/pglite-plpgsql-check'
import { getStatements, parseSql } from '../../src/ast.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot, ColumnInfo } from '../../src/catalog/types.js'
import { catalogCheckGroups } from '../../src/sql-semantics/catalog-checks.js'
import {
  enumType,
  arrayElementBaseType,
  isRangeType,
  isMultirangeType,
} from '../../src/sql-semantics/expressions.js'
import { builtinRangeType, builtinMultirangeType } from '../../src/postgres/builtins/inventory.js'
import { arrayElementFamily } from '../../src/codegen/shared/check-array-types.js'
import type { RangeInputPayload } from '../../tools/check-rust/range-input.js'
import {
  catalogDateType,
  catalogArrayType,
  catalogRangeType,
  catalogMultirangeType,
  catalogTemporalType,
  catalogNumericType,
  catalogFloatType,
  catalogPointType,
  catalogLineType,
  catalogLsegType,
  catalogXidType,
  catalogCidType,
  catalogTidType,
  catalogInternalCharType,
  catalogPgLsnType,
  catalogXid8Type,
  catalogSnapshotType,
  catalogJsonType,
  catalogJsonbType,
  catalogJsonpathType,
  catalogOidType,
  catalogMoneyType,
  catalogPolygonType,
  catalogPathType,
  catalogCircleType,
  catalogBoxType,
} from '../../src/sql-semantics/catalog-check-binder.js'
import { renderTypescriptSchemaCheckArtifacts } from '../../src/codegen/typescript/sql/catalog-checks.js'
import { renderGoSchemaArtifacts } from '../../src/codegen/go/schema.js'
import { checkTypescriptArtifacts } from '../../src/codegen/shared/check-rust-transpile.js'
import { renderGoCheckTests, type GoCheckCase } from './check-codegen.js'
import { typeName } from '../../src/codegen/typescript/type-mapping.js'
import { parseConfigString } from '../../src/config/loader.js'
import { worldPurpose } from '../unit/query/world-purpose.js'
import { deparseWorldSql, worldSourceDigest } from '../../scripts/check-measurements/worlds.js'
import { readRangeFixture, rangeBoundProjection, rangeBoundCell } from './check-range-fixtures.js'
// @ts-expect-error -- Espalier input policy is a runtime JavaScript rule.
import { constantInput } from '../unit/query/espalier/worlds/[world]/check-seed.sql.mjs'

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
const availableWorlds = (await readdir(worldsDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({ name: entry.name, schema: 'world_' + entry.name }))
  .sort((left, right) => left.name.localeCompare(right.name))
const selectedWorldNames = process.env['PGSID_CHECK_WORLDS']?.split(',')
if (
  selectedWorldNames &&
  (selectedWorldNames.some((name) => !availableWorlds.some((world) => world.name === name)) ||
    new Set(selectedWorldNames).size !== selectedWorldNames.length)
)
  throw new Error(
    'PGSID_CHECK_WORLDS must name distinct existing world directories, separated by commas',
  )
const worlds = selectedWorldNames
  ? availableWorlds.filter((world) => selectedWorldNames.includes(world.name))
  : availableWorlds
const reportDirectory = fileURLToPath(
  new URL(
    selectedWorldNames
      ? '../../artifacts/check-worlds/scoped/' + worlds.map((world) => world.name).join('+') + '/'
      : '../../artifacts/check-worlds/',
    import.meta.url,
  ),
)

const cases: Case[] = []
const checkWorlds = new Set<string>()
const catalogDependentChecks = new Set([
  'world_014_shipment_defaults.shipment_stage_decisions.stage_selected_hash',
  'world_014_shipment_defaults.shipment_stage_decisions.stage_selected_seeded_hash',
])
const platformDependentCases = new Map<string, string>([
  [
    '025_sensor_measurements/magnitude_nan_root/calibrated_magnitude_wire',
    'world_025_sensor_measurements.calibrated_magnitudes.calibrated_magnitude_wire',
  ],
  [
    '027_survey_positions/import_nan_coordinate/import_wire',
    'world_027_survey_positions.survey_imports.import_wire',
  ],
  [
    '027_survey_positions/measurement_nan_coordinates/measurement_distance',
    'world_027_survey_positions.survey_measurements.measurement_distance',
  ],
  [
    '028_axis_guides/import_nan_coefficients/import_wire',
    'world_028_axis_guides.guide_imports.import_wire',
  ],
  [
    '028_axis_guides/projection_nan_point/projection_distance',
    'world_028_axis_guides.guide_projections.projection_distance',
  ],
  [
    '028_axis_guides/projection_nan_axis/projection_distance',
    'world_028_axis_guides.guide_projections.projection_distance',
  ],
  [
    '028_axis_guides/projection_infinite_point/projection_distance',
    'world_028_axis_guides.guide_projections.projection_distance',
  ],
])
const sessionDependentCases = new Map<string, string>([
  [
    '036_identifier_names/identifier_utf8/identifier_wire',
    'world_036_identifier_names.registry_names.identifier_wire',
  ],
  [
    '039_report_cursors/label_unicode_wire/cursor_wire',
    'world_039_report_cursors.cursor_labels.cursor_wire',
  ],
])
const catalogBinaryCases = new Map<string, string>(
  ['empty', 'null_cells', 'values'].map((name) => [
    `043_lane_allocations/binary_exports_${name}/binary_array_context`,
    'world_043_lane_allocations.lane_binary_exports.binary_array_context',
  ]),
)
const binaryContextCases = new Map([
  ...platformDependentCases,
  ...sessionDependentCases,
  ...catalogBinaryCases,
])
const arraySortContextCases = new Map<string, string>([
  [
    '043_lane_allocations/sorted_precision_ambiguous_ties/sorted_precision_text',
    'world_043_lane_allocations.lane_sorted_precision.sorted_precision_text',
  ],
])
const jsonValueContextCases = new Map<string, string>([
  [
    '043_lane_allocations/hash_slots_nan/readings_hash',
    'world_043_lane_allocations.lane_hashes.readings_hash',
  ],
  ...['stage_hash', 'stage_seeded_hash'].map(
    (name) =>
      [
        `043_lane_allocations/hash_stages_requires_catalog/${name}`,
        `world_043_lane_allocations.lane_stage_hashes.${name}`,
      ] as const,
  ),
  ...['reading_hash', 'reading_seeded', 'precise_hash', 'precise_seeded', 'reading_widened'].map(
    (name) =>
      [
        `025_sensor_measurements/hash_nan/${name}`,
        `world_025_sensor_measurements.hashed_readings.${name}`,
      ] as const,
  ),
  ...arraySortContextCases,
  ...['clock_exists', 'clock_match', 'clock_results', 'clock_first'].map(
    (name) =>
      [
        `042_query_paths/clock_zone_context/${name}`,
        `world_042_query_paths.query_clock_rules.${name}`,
      ] as const,
  ),
  ...['field_source', 'field_text', 'field_presence'].map(
    (name) =>
      [
        `041_json_documents/field_encoding_context/${name}`,
        `world_041_json_documents.document_fields.${name}`,
      ] as const,
  ),
  ...[
    'bytea',
    'money',
    'interval',
    'point',
    'line',
    'lseg',
    'box',
    'circle',
    'path',
    'polygon',
    'float4',
    'float8',
    'regclass',
    'regcollation',
    'regconfig',
    'regdictionary',
    'regnamespace',
    'regoper',
    'regoperator',
    'regproc',
    'regprocedure',
    'regrole',
    'regtype',
    'enum',
  ].map(
    (name) =>
      [
        `041_json_documents/context_requires_data/context_${name}`,
        `world_041_json_documents.document_context_conversions.context_${name}`,
      ] as const,
  ),
])
if (
  binaryContextCases.size !==
  platformDependentCases.size + sessionDependentCases.size + catalogBinaryCases.size
)
  throw new Error('Duplicate binary context case declarations')
const binaryDeferrals = (identity: string): number =>
  [...binaryContextCases.values()].filter((name) => name === identity).length
const sourceDigest = await worldSourceDigest()
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
    if (!values.every(constantInput))
      throw new Error(`${world.name}: CHECK case requires constant scalar inputs`)
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

const declaredCheckExpressions = new Map<string, string>()

async function loadWorldSql(pg: PGlite, source: string, schema: string): Promise<void> {
  const parsed = await parseSql(source)
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    const capture = (
      relation: { relname?: string; schemaname?: string },
      nodes: readonly Node[],
    ): void => {
      for (const node of nodes) {
        if ('ColumnDef' in node) capture(relation, node.ColumnDef.constraints ?? [])
        if (
          'Constraint' in node &&
          node.Constraint.contype === 'CONSTR_CHECK' &&
          node.Constraint.conname &&
          node.Constraint.raw_expr
        ) {
          const owner =
            relation.schemaname === undefined || relation.schemaname === 'public'
              ? schema
              : relation.schemaname
          declaredCheckExpressions.set(
            `${owner}.${relation.relname}.${node.Constraint.conname}`,
            deparseWorldSql(node.Constraint.raw_expr),
          )
        }
      }
    }
    const create = record['CreateStmt'] as
      { relation?: { relname?: string; schemaname?: string }; tableElts?: Node[] } | undefined
    if (create?.relation) capture(create.relation, create.tableElts ?? [])
    const alter = record['AlterTableStmt'] as
      { relation?: { relname?: string; schemaname?: string }; cmds?: Node[] } | undefined
    if (alter?.relation)
      for (const command of alter.cmds ?? [])
        if ('AlterTableCmd' in command && command.AlterTableCmd.def)
          capture(alter.relation, [command.AlterTableCmd.def])
    if (record['schemaname'] === 'public') record['schemaname'] = schema
    const setting = record['VariableSetStmt'] as { name?: string; args?: Node[] } | undefined
    if (setting?.name === 'search_path')
      for (const arg of setting.args ?? [])
        if ('A_Const' in arg && arg.A_Const.sval?.sval === 'public') arg.A_Const.sval.sval = schema
    for (const child of Object.values(record)) visit(child)
  }
  visit(parsed)
  await pg.exec(deparseWorldSql(parsed))
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
  const collationNames = new Map<number, string>()
  const oracleCollation = (column: Pick<ColumnInfo, 'collationOid'>): string => {
    if (!column.collationOid) return ''
    const name = collationNames.get(column.collationOid)
    if (!name) throw new Error(`missing oracle collation ${column.collationOid}`)
    return ` COLLATE ${name}`
  }
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
    schema: string
    relation: string
    database: { accepted: boolean; constraint?: string; sqlstate?: string }
    sql: string
    checks: (Result & { postgres: OracleOutcome })[]
  }[] = []
  let definite = 0
  let localRejections = 0
  let databaseRejections = 0
  let unknownComparisons = 0

  beforeAll(async () => {
    const started = performance.now()
    const phases: { phase: string; elapsedMs: number; rssBytes: number }[] = []
    await mkdir(reportDirectory, { recursive: true })
    const progress = async (phase: string) => {
      const step = {
        phase,
        elapsedMs: Math.round(performance.now() - started),
        rssBytes: process.memoryUsage().rss,
      }
      phases.push(step)
      console.info('CHECK world setup', step)
      await writeFile(
        join(reportDirectory, 'setup.json'),
        JSON.stringify({ directory, phases }, null, 2) + '\n',
      )
    }
    await progress('database-start')
    pg = await PGlite.create({ extensions: { plpgsql_check } })
    expect(
      (
        await pg.query(
          'SELECT datcollate,datctype FROM pg_database WHERE datname=current_database()',
        )
      ).rows,
    ).toEqual([{ datcollate: 'C', datctype: 'C.UTF-8' }])
    expect((await pg.query('SHOW server_encoding')).rows).toEqual([{ server_encoding: 'UTF8' }])
    await pg.exec("SET TimeZone='UTC'; SET array_nulls=on")
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
    await progress('catalog-snapshot')
    catalog = await snapshotCatalog(pg)
    const collations = await pg.query<{ oid: number; schema: string; name: string }>(`
      SELECT c.oid::int AS oid, n.nspname AS schema, c.collname AS name
      FROM pg_catalog.pg_collation c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.collnamespace
    `)
    for (const collation of collations.rows)
      collationNames.set(collation.oid, `${quote(collation.schema)}.${quote(collation.name)}`)
    expect(catalog.tables.filter((table) => table.schema === 'public')).toEqual([])
    expect(
      catalog.tables
        .filter((table) => table.name === 'reservations')
        .map((table) => table.schema)
        .sort(),
    ).toEqual(
      ['world_002_library', 'world_008_inventory_allocation'].filter((schema) =>
        worlds.some((world) => world.schema === schema),
      ),
    )
    const tables = catalog.tables.filter((table) =>
      cases.some((item) => item.schema === table.schema && item.relation === table.name),
    )
    for (const table of tables) {
      expect(table.writeRewritesTree.beforeRow).toEqual([])
      expect(
        catalogCheckGroups([table], catalog.domains, [], catalog.enums, catalog.rangeTypes).length,
      ).toBe(1)
    }
    await progress('typescript-generation')
    const ts = renderTypescriptSchemaCheckArtifacts(tables, catalog.domains, [], {
      executionContext: {
        defaultCollation: 'C',
        defaultCtype: 'C.UTF-8',
        serverEncoding: 'UTF8',
        arrayNulls: true,
        nativeByteOrder: 'little',
      },
      enums: catalog.enums,
      rangeTypes: catalog.rangeTypes,
    })
    await progress('go-generation')
    const go = renderGoSchemaArtifacts(
      { ...catalog, tables, views: [], materializedViews: [] },
      parseConfigString(
        'schema: schema.sql\nsql:\n  codegen:\n    checks: { defaultCollation: C, defaultCtype: C.UTF-8, serverEncoding: UTF8, arrayNulls: true, nativeByteOrder: little }\n    go:\n      schema: { outDir: schema }\n',
      ),
      {},
      join(directory, 'schema'),
      'worldchecks/schema',
    )
    await progress('typescript-source-write')
    expect(go.diagnostics).toEqual([])
    expect(ts.rustFiles).not.toBeNull()
    await writeFile(join(directory, 'package.json'), '{"type":"module"}\n')
    await symlink(
      fileURLToPath(new URL('../../node_modules/', import.meta.url)),
      join(directory, 'node_modules'),
      'dir',
    )
    await writeFile(join(directory, 'checks.ts'), ts.checks)
    for (const artifact of checkTypescriptArtifacts(ts.rustFiles!)) {
      const path = join(directory, 'checks-rust', artifact.path)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, artifact.content)
    }
    await progress('typescript-compile')
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
    await progress('typescript-load')
    generated = await import(pathToFileURL(join(directory, 'js/checks.js')).href)
    const jsonbRuntime = await import(
      pathToFileURL(join(directory, 'js/checks-rust/checkruntime/runtime.js')).href
    )
    const jsonpathOperations = await import(
      pathToFileURL(join(directory, 'js/checks-rust/pg_catalog/operations.js')).href
    )
    for (const artifact of go.artifacts) {
      await mkdir(dirname(artifact.path), { recursive: true })
      await writeFile(artifact.path, artifact.content)
    }
    await writeFile(
      join(directory, 'go.mod'),
      'module worldchecks\n\ngo 1.25\n\nrequire (\n github.com/jackc/pgx/v5 v5.10.0\n github.com/shopspring/decimal v1.4.0\n)\n',
    )
    await writeFile(
      join(directory, 'go.sum'),
      await readFile('tests/fixtures/codegen/project/go.sum', 'utf8'),
    )
    let inputWorld: string | undefined
    for (const item of cases) {
      if (item.schema !== inputWorld) {
        inputWorld = item.schema
        await progress('row-inputs:' + inputWorld)
      }
      const table = tables.find(
        (table) => table.schema === item.schema && table.name === item.relation,
      )!
      const expressions = table.columns
        .filter((column) => column.generated === 'none')
        .map((column) => {
          const value = item.values.get(column.name)
          if (!value && column.hasDefault)
            throw new Error(`${item.name}: omitted default needs row materialization`)
          return `CAST(${value ? deparseWorldSql(value) : 'NULL'} AS ${column.typeName})${oracleCollation(column)} AS ${quote(column.name)}`
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
      const floatColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogFloatType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const clockColumns = (type: string) =>
        table.columns
          .filter(
            (column) =>
              column.generated === 'none' &&
              catalogTemporalType(column.typeName, column.typeOid, catalog.domains) === type,
          )
          .map((column) => column.name)
      const timeColumns = clockColumns('pg_catalog."time"')
      const timetzColumns = clockColumns('pg_catalog.timetz')
      const intervalColumns = clockColumns('pg_catalog."interval"')
      const pointColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogPointType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const portableRow = { ...row }
      const lineColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogLineType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const lsegColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogLsegType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const xidColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogXidType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const cidColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogCidType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const internalCharColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogInternalCharType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const tidColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogTidType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const pgLsnColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogPgLsnType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const xid8Columns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogXid8Type(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const arrayColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogArrayType(column.typeName, column.typeOid, catalog.domains, catalog.enums) !==
              null,
        )
        .map((column) => column.name)
      const multirangeColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogMultirangeType(
              column.typeName,
              column.typeOid,
              catalog.domains,
              catalog.rangeTypes,
            ) !== null,
        )
        .map((column) => column.name)
      const rangeColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogRangeType(
              column.typeName,
              column.typeOid,
              catalog.domains,
              catalog.rangeTypes,
            ) !== null,
        )
        .map((column) => column.name)
      const jsonpathColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogJsonpathType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const jsonbColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogJsonbType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const jsonColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogJsonType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const snapshotColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogSnapshotType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const oidColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogOidType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const moneyColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogMoneyType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const polygonColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogPolygonType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const pathColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogPathType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const circleColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogCircleType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const boxColumns = table.columns
        .filter(
          (column) =>
            column.generated === 'none' &&
            catalogBoxType(column.typeName, column.typeOid, catalog.domains),
        )
        .map((column) => column.name)
      const goRow = { ...row }
      for (const [family, names] of [
        ['time', timeColumns],
        ['timetz', timetzColumns],
        ['interval', intervalColumns],
      ] as const) {
        for (const name of names) {
          const hex = (
            await pg.query<{ binary: string | null }>(
              `SELECT encode(${family}_send(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
            )
          ).rows[0]!.binary
          let payload:
            | bigint
            | { time: bigint; zone: number }
            | { time: bigint; months: number; days: number }
            | null = null
          if (hex !== null) {
            const bytes = Buffer.from(hex, 'hex')
            const time = bytes.readBigInt64BE()
            payload =
              family === 'time'
                ? time
                : family === 'timetz'
                  ? { time, zone: bytes.readInt32BE(8) }
                  : { time, days: bytes.readInt32BE(8), months: bytes.readInt32BE(12) }
          }
          portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
          goRow[name] = payload
        }
      }
      for (const name of xidColumns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(xidsend(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const bytes = hex === null ? null : Buffer.from(hex, 'hex')
        const payload = bytes === null ? null : BigInt(bytes.readUInt32BE())
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of cidColumns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(cidsend(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const bytes = hex === null ? null : Buffer.from(hex, 'hex')
        const payload = bytes === null ? null : BigInt(bytes.readUInt32BE())
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of internalCharColumns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(charsend(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const bytes = hex === null ? null : Buffer.from(hex, 'hex')
        const payload = bytes === null ? null : bytes.readUInt8(0)
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of tidColumns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(tidsend(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const bytes = hex === null ? null : Buffer.from(hex, 'hex')
        const payload = bytes === null ? null : bytes.readUIntBE(0, 6)
        portableRow[name] = payload === null ? null : { kind: 'Value', value: BigInt(payload) }
        goRow[name] = payload === null ? null : BigInt(payload)
      }
      for (const name of pgLsnColumns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(pg_lsn_send(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const bytes = hex === null ? null : Buffer.from(hex, 'hex')
        const payload = bytes === null ? null : bytes.readBigInt64BE()
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of xid8Columns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(xid8send(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const bytes = hex === null ? null : Buffer.from(hex, 'hex')
        const payload = bytes === null ? null : bytes.readBigInt64BE()
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of arrayColumns) {
        const column = table.columns.find((column) => column.name === name)!
        const type = catalogArrayType(
          column.typeName,
          column.typeOid,
          catalog.domains,
          catalog.enums,
        )!
        const profiles: Record<string, { kind: string; family: number }> = {
          'pg_catalog.int2': { kind: 'Int2', family: 1 },
          'pg_catalog.int4': { kind: 'Int4', family: 2 },
          'pg_catalog.int8': { kind: 'Int8', family: 3 },
          'pg_catalog.text': { kind: 'Text', family: 8 },
          'pg_catalog."varchar"': { kind: 'Text', family: 8 },
          'pg_catalog.bool': { kind: 'Bool', family: 9 },
          'pg_catalog."numeric"': { kind: 'Numeric', family: 10 },
          'pg_catalog."json"': { kind: 'Json', family: 11 },
          'pg_catalog.jsonb': { kind: 'Jsonb', family: 12 },
          'pg_catalog.float4': { kind: 'Float4', family: 19 },
          'pg_catalog.float8': { kind: 'Float8', family: 20 },
        }

        type CapturedArray = {
          dimensions: string | null
          elements: (string | null | CapturedArray | CapturedRange | CapturedMultirange)[]
        }
        type CapturedRange = Omit<RangeInputPayload, 'bounds'> & { bounds: (string | null)[] }
        type CapturedMultirange = {
          typeName: string
          rangeType: string
          elementType: string
          elementKind: number
          ranges: CapturedRange[]
        }
        const profileFor = (arrayType: string) => {
          const elementType = arrayType.slice(6)
          const baseElementType = arrayElementBaseType(elementType)
          const definition = catalog.enums.find((item) => enumType(item) === baseElementType)
          const profile = baseElementType.startsWith('array:')
            ? { kind: 'Array', family: 41 }
            : definition
              ? { kind: 'Enum', family: 6 }
              : isMultirangeType(baseElementType)
                ? { kind: 'Multirange', family: 43 }
                : isRangeType(baseElementType)
                  ? { kind: 'Range', family: 42 }
                  : profiles[baseElementType]
          if (!profile) throw new Error('Missing array INSERT fixture conversion: ' + elementType)
          return { elementType, baseElementType, definition, profile }
        }
        const captureSql = (value: string, arrayType: string, depth: number): string => {
          const { baseElementType, profile } = profileFor(arrayType)
          const alias = 'array_cell_' + depth
          const multirange = builtinMultirangeType(baseElementType)
          const range = builtinRangeType(baseElementType) ?? multirange
          const rangeCell = multirange ? alias + '_member' : alias
          const rangeValue = range
            ? `json_build_object('typeName','${range.identity}','elementType','${range.subtype}','elementKind',${arrayElementFamily(range.subtype)},'empty',isempty(${rangeCell}),'lowerInclusive',lower_inc(${rangeCell}),'upperInclusive',upper_inc(${rangeCell}),'bounds',CASE WHEN isempty(${rangeCell}) THEN '[]'::json ELSE json_build_array(${rangeBoundProjection(`lower(${rangeCell})`, range.subtype)},${rangeBoundProjection(`upper(${rangeCell})`, range.subtype)}) END)`
            : ''
          const multirangeValue = multirange
            ? `json_build_object('typeName','${multirange.multirange}','rangeType','${multirange.identity}','elementType','${multirange.subtype}','elementKind',${arrayElementFamily(multirange.subtype)},'ranges',COALESCE((SELECT json_agg(${rangeValue} ORDER BY position) FROM unnest(${alias}) WITH ORDINALITY AS members(${rangeCell},position)),'[]'::json))`
            : ''
          const scalar =
            profile.kind === 'Array'
              ? captureSql(alias, baseElementType, depth + 1)
              : profile.kind === 'Multirange'
                ? `CASE WHEN ${alias} IS NULL THEN NULL ELSE ${multirangeValue} END`
                : profile.kind === 'Range'
                  ? `CASE WHEN ${alias} IS NULL THEN NULL ELSE ${rangeValue} END`
                  : profile.kind === 'Float4' || profile.kind === 'Float8'
                    ? `encode(float${profile.kind === 'Float4' ? 4 : 8}send(${alias}),'hex')`
                    : `${alias}::text`
          return `CASE WHEN (${value}) IS NULL THEN NULL ELSE json_build_object('dimensions',array_dims(${value}),'elements',COALESCE((SELECT json_agg(${scalar}) FROM unnest(${value}) ${alias}),'[]'::json)) END`
        }
        const captured = (
          await pg.query<{ value: CapturedArray | null }>(
            `SELECT ${captureSql(quote(name), type, 0)} AS value FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.value
        if (captured === null) {
          portableRow[name] = null
          goRow[name] = null
          continue
        }
        const convert = (
          raw: CapturedArray,
          arrayType: string,
          portable: boolean,
        ): {
          kind: 'Value'
          value: {
            elementType: string
            elementKind: number
            dimensions: { lower: number; length: number }[]
            elements: unknown[]
          }
        } => {
          const { elementType, baseElementType, definition, profile } = profileFor(arrayType)
          const dimensions = Array.from(
            (raw.dimensions ?? '').matchAll(/\[(-?\d+):(-?\d+)\]/gu),
          ).map((match) => ({
            lower: Number(match[1]),
            length: Number(match[2]) - Number(match[1]) + 1,
          }))
          const elements = raw.elements.map((value) => {
            if (value === null) return { kind: 'Null' }
            if (profile.kind === 'Array')
              return {
                kind: 'Array',
                value: convert(value as CapturedArray, baseElementType, portable).value,
              }
            if (profile.kind === 'Multirange') {
              const payload = value as CapturedMultirange
              return {
                kind: 'Multirange',
                value: {
                  ...payload,
                  ranges: payload.ranges.map((span) => ({
                    kind: 'Value',
                    value: {
                      ...span,
                      bounds: span.bounds.map((bound) => rangeBoundCell(span.elementType, bound)),
                    },
                  })),
                },
              }
            }
            if (profile.kind === 'Range') {
              const payload = value as CapturedRange
              return {
                kind: 'Range',
                value: {
                  ...payload,
                  bounds: payload.bounds.map((bound) => rangeBoundCell(payload.elementType, bound)),
                },
              }
            }
            const text = value as string
            const payload =
              profile.kind === 'Int4' || profile.kind === 'Int2'
                ? Number(text)
                : profile.kind === 'Int8'
                  ? BigInt(text)
                  : profile.kind === 'Float4'
                    ? Buffer.from(text, 'hex').readInt32BE()
                    : profile.kind === 'Float8'
                      ? Buffer.from(text, 'hex').readBigInt64BE()
                      : profile.kind === 'Enum'
                        ? definition!.values.indexOf(text)
                        : profile.kind === 'Bool'
                          ? text === 'true'
                          : text
            if (portable && profile.kind === 'Enum')
              return jsonbRuntime.arrayElementFromEnum(
                jsonbRuntime.makeEnumValue(payload as number),
              )
            if (portable && profile.kind === 'Json')
              return jsonbRuntime.arrayElementFromJson(
                jsonbRuntime.makeJsonValue(payload as string),
              )
            if (portable && profile.kind === 'Jsonb')
              return jsonbRuntime.arrayElementFromJsonb(
                jsonbRuntime.makeJsonbValue(payload as string),
              )
            return { kind: profile.kind, value: payload }
          })
          return {
            kind: 'Value',
            value: { elementType, elementKind: profile.family, dimensions, elements },
          }
        }
        portableRow[name] = convert(captured, type, true)
        goRow[name] = convert(captured, type, false)
      }
      for (const name of jsonpathColumns) {
        const source = (
          await pg.query<{ source: string | null }>(
            `SELECT ${quote(name)}::text AS source FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.source
        portableRow[name] =
          source === null
            ? null
            : jsonpathOperations.jsonpathFromStoredText(jsonbRuntime.makeTextValue(source))
        goRow[name] = source
      }
      for (const name of jsonbColumns) {
        const source = (
          await pg.query<{ source: string | null }>(
            `SELECT ${quote(name)}::text AS source FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.source
        portableRow[name] = source === null ? null : jsonbRuntime.makeJsonbValue(source)
        goRow[name] = source
      }
      for (const name of jsonColumns) {
        const source = (
          await pg.query<{ source: string | null }>(
            `SELECT ${quote(name)}::text AS source FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.source
        portableRow[name] = source === null ? null : { kind: 'Value', value: { source } }
        goRow[name] = source
      }
      for (const name of snapshotColumns) {
        const column = table.columns.find((column) => column.name === name)!
        const type = catalogSnapshotType(column.typeName, column.typeOid, catalog.domains)!
        const send = type.slice('pg_catalog.'.length) + '_send'
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(pg_catalog.${send}(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const bytes = hex === null ? null : Buffer.from(hex, 'hex')
        let payload: { xmin: bigint; xmax: bigint; xip: { bits: bigint }[] } | null = null
        if (bytes) {
          expect(bytes.length).toBeGreaterThanOrEqual(20)
          const count = bytes.readUInt32BE(0)
          expect(count).toBeLessThanOrEqual(134217724)
          expect(bytes.length).toBe(20 + count * 8)
          payload = {
            xmin: bytes.readBigInt64BE(4),
            xmax: bytes.readBigInt64BE(12),
            xip: Array.from({ length: count }, (_, i) => ({
              bits: bytes.readBigInt64BE(20 + i * 8),
            })),
          }
        }
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of oidColumns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(oidsend(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const bytes = hex === null ? null : Buffer.from(hex, 'hex')
        const payload = bytes === null ? null : BigInt(bytes.readUInt32BE())
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of moneyColumns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(cash_send(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const bytes = hex === null ? null : Buffer.from(hex, 'hex')
        const payload = bytes === null ? null : bytes.readBigInt64BE()
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of polygonColumns) {
        const selected = (
          await pg.query<{ binary: string | null; bounds: string | null }>(
            `SELECT encode(poly_send(${quote(name)}),'hex') binary,encode(box_send(box(${quote(name)})),'hex') bounds FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!
        let payload: {
          points: { x: bigint; y: bigint }[]
          bounds: { highX: bigint; highY: bigint; lowX: bigint; lowY: bigint }
        } | null = null
        if (selected.binary !== null) {
          const bytes = Buffer.from(selected.binary, 'hex'),
            bounds = Buffer.from(selected.bounds!, 'hex'),
            points: { x: bigint; y: bigint }[] = []
          expect(bytes.length).toBe(4 + bytes.readInt32BE() * 16)
          expect(bounds.length).toBe(32)
          for (let offset = 4; offset < bytes.length; offset += 16)
            points.push({ x: bytes.readBigInt64BE(offset), y: bytes.readBigInt64BE(offset + 8) })
          payload = {
            points,
            bounds: {
              highX: bounds.readBigInt64BE(),
              highY: bounds.readBigInt64BE(8),
              lowX: bounds.readBigInt64BE(16),
              lowY: bounds.readBigInt64BE(24),
            },
          }
        }
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of multirangeColumns) {
        const column = table.columns.find((column) => column.name === name)!
        const type = catalogMultirangeType(
          column.typeName,
          column.typeOid,
          catalog.domains,
          catalog.rangeTypes,
        )!
        const text = (
          await pg.query<{ value: string | null }>(
            `SELECT ${quote(name)}::text value FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.value
        const payload = await readMultirangeFixture(pg, type, text)
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of rangeColumns) {
        const column = table.columns.find((column) => column.name === name)!
        const type = catalogRangeType(
          column.typeName,
          column.typeOid,
          catalog.domains,
          catalog.rangeTypes,
        )!
        const payload = await readRangeFixture(pg, `SELECT ${expressions.join(',')}`, name, type)
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of pathColumns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(path_send(${quote(name)}),'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        let payload: { closed: boolean; points: { x: bigint; y: bigint }[] } | null = null
        if (hex !== null) {
          const bytes = Buffer.from(hex, 'hex'),
            points: { x: bigint; y: bigint }[] = []
          for (let offset = 5; offset < bytes.length; offset += 16)
            points.push({ x: bytes.readBigInt64BE(offset), y: bytes.readBigInt64BE(offset + 8) })
          payload = { closed: bytes[0] === 1, points }
        }
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of circleColumns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(circle_send(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const bytes = hex === null ? null : Buffer.from(hex, 'hex')
        const payload =
          bytes === null
            ? null
            : {
                x: bytes.readBigInt64BE(),
                y: bytes.readBigInt64BE(8),
                radius: bytes.readBigInt64BE(16),
              }
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of boxColumns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(box_send(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const bytes = hex === null ? null : Buffer.from(hex, 'hex')
        const payload =
          bytes === null
            ? null
            : {
                highX: bytes.readBigInt64BE(),
                highY: bytes.readBigInt64BE(8),
                lowX: bytes.readBigInt64BE(16),
                lowY: bytes.readBigInt64BE(24),
              }
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of lsegColumns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(lseg_send(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const bytes = hex === null ? null : Buffer.from(hex, 'hex')
        const payload =
          bytes === null
            ? null
            : {
                x1: bytes.readBigInt64BE(),
                y1: bytes.readBigInt64BE(8),
                x2: bytes.readBigInt64BE(16),
                y2: bytes.readBigInt64BE(24),
              }
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of lineColumns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(line_send(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const bytes = hex === null ? null : Buffer.from(hex, 'hex')
        const payload =
          bytes === null
            ? null
            : { a: bytes.readBigInt64BE(), b: bytes.readBigInt64BE(8), c: bytes.readBigInt64BE(16) }
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of pointColumns) {
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(point_send(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const bytes = hex === null ? null : Buffer.from(hex, 'hex')
        const payload =
          bytes === null ? null : { x: bytes.readBigInt64BE(), y: bytes.readBigInt64BE(8) }
        portableRow[name] = payload === null ? null : { kind: 'Value', value: payload }
        goRow[name] = payload
      }
      for (const name of floatColumns) {
        const column = table.columns.find((column) => column.name === name)!
        const single =
          catalogFloatType(column.typeName, column.typeOid, catalog.domains) === 'pg_catalog.float4'
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(float${single ? 4 : 8}send(${quote(name)}), 'hex') binary FROM (SELECT ${expressions.join(',')}) candidate`,
          )
        ).rows[0]!.binary
        const bits =
          hex === null
            ? null
            : single
              ? Buffer.from(hex, 'hex').readInt32BE()
              : Buffer.from(hex, 'hex').readBigInt64BE()
        portableRow[name] = bits === null ? null : { kind: 'Value', value: bits }
        goRow[name] = bits === null ? null : { bits, single }
      }
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
        const hex = (
          await pg.query<{ binary: string | null }>(
            `SELECT encode(date_send(${quote(name)}), 'hex') AS binary FROM (SELECT ${expressions.join(',')}) candidate`,
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
        floatColumns,
        pointColumns,
        lineColumns,
        lsegColumns,
        xidColumns,
        cidColumns,
        tidColumns,
        internalCharColumns,
        pgLsnColumns,
        xid8Columns,
        snapshotColumns,
        jsonColumns,
        jsonbColumns,
        jsonpathColumns,
        arrayColumns,
        rangeColumns,
        multirangeColumns,
        oidColumns,
        moneyColumns,
        polygonColumns,
        pathColumns,
        circleColumns,
        boxColumns,
        timeColumns,
        timetzColumns,
        intervalColumns,
        dateColumns,
        timestampColumns,
        timestamptzColumns,
        results,
      })
      goCases.set(item.schema, schemaCases)
    }
    await progress('go-test-source-write')
    for (const [schema, schemaCases] of goCases)
      await writeFile(
        join(directory, 'schema', schema, 'checks_test.go'),
        renderGoCheckTests(schema, schemaCases, {
          dateRuntime: `worldchecks/schema/${schema}/checkrust/checkruntime`,
        }),
      )
    await progress('go-test')
    await run('go', ['test', '-mod=mod', './...'], {
      cwd: directory,
      env: { ...process.env, GOCACHE: '/tmp/pgsid-check-rust-go-cache' },
    }).catch((error: { stdout: string; stderr: string }) => {
      throw new Error(error.stdout + error.stderr, { cause: error })
    })
    await progress('complete')
  }, 1_800_000)

  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })

  it.runIf(worlds.some((world) => world.name === '027_survey_positions'))(
    'defers malformed and oversized portable point payloads without throwing',
    () => {
      const table = catalog.tables.find(
        (table) => table.schema === 'world_027_survey_positions' && table.name === 'survey_matches',
      )!
      const evaluate = generated[`evaluate${typeName(table.schema + '_' + table.name)}Checks`]!
      const valid = { kind: 'Value', value: { x: 0n, y: 0n } }
      const baseline = {
        candidate_point: valid,
        reference_point: valid,
        recorded_match: true,
        choose_candidate: true,
        recorded_selection: new Uint8Array(16),
        recorded_coalesced: new Uint8Array(16),
        skip_validation: false,
      }
      for (const candidate of [
        undefined,
        '(0,0)',
        {},
        { kind: 'Invalid' },
        { kind: 'Value', value: null },
        { kind: 'Value', value: { x: 0, y: 0 } },
        { kind: 'Value', value: { x: 0n } },
        { kind: 'Value', value: { x: 0n, y: 0 } },
        { kind: 'Value', value: { x: 9223372036854775808n, y: 0n } },
        { kind: 'Value', value: { x: -9223372036854775809n, y: 0n } },
        { kind: 'Value', value: { x: 0n, y: 9223372036854775808n } },
        { kind: 'Value', value: { x: 0n, y: -9223372036854775809n } },
        { kind: 'Value', value: { x: 0n, y: 0n, wireKnown: 'yes' } },
      ]) {
        const results = evaluate({ ...baseline, candidate_point: candidate })
        expect(results).toHaveLength(3)
        for (const result of results) {
          expect(result.result.certain, result.constraint).toBe(false)
          expect(result.message, result.constraint).toBeTruthy()
        }
      }
      const missing: Record<string, unknown> = { ...baseline }
      delete missing.candidate_point
      expect(evaluate(missing).every(({ result }) => !result.certain)).toBe(true)
      expect(normalized(evaluate(baseline)).map(({ result }) => result)).toEqual([
        { certain: true, value: true },
        { certain: true, value: true },
        { certain: true, value: true },
      ])
      const nullResults = Object.fromEntries(
        normalized(evaluate({ ...baseline, candidate_point: null })).map(
          ({ constraint, result }) => [constraint, result],
        ),
      )
      expect(nullResults).toEqual({
        survey_coalesced: { certain: true, value: true },
        survey_same_position: { certain: true, value: null },
        survey_selection: { certain: true, value: null },
      })
    },
  )

  it.runIf(worlds.some((world) => world.name === '027_survey_positions'))(
    'retains point semantics when computed NaN wire bits are unavailable',
    () => {
      const table = catalog.tables.find(
        (table) => table.schema === 'world_027_survey_positions' && table.name === 'survey_matches',
      )!
      const evaluate = generated[`evaluate${typeName(table.schema + '_' + table.name)}Checks`]!
      const point = { kind: 'Value', value: { x: 0x7ff8000000000000n, y: 0n, wireKnown: false } }
      const results = Object.fromEntries(
        normalized(
          evaluate({
            candidate_point: point,
            reference_point: point,
            recorded_match: true,
            choose_candidate: true,
            recorded_selection: new Uint8Array(16),
            recorded_coalesced: new Uint8Array(16),
            skip_validation: false,
          }),
        ).map(({ constraint, result }) => [constraint, result]),
      )
      expect(results).toEqual({
        survey_same_position: { certain: true, value: true },
        survey_selection: { certain: false },
        survey_coalesced: { certain: false },
      })
    },
  )

  it.runIf(worlds.some((world) => world.name === '014_shipment_defaults'))(
    'defers enum hashes without deployment OIDs while retaining label comparisons and lazy states',
    () => {
      const table = catalog.tables.find(
        (table) =>
          table.schema === 'world_014_shipment_defaults' &&
          table.name === 'shipment_stage_decisions',
      )!
      const evaluate = generated[`evaluate${typeName(table.schema + '_' + table.name)}Checks`]!
      const row = {
        stage: 'ready',
        peer: 'held',
        larger_stage: 'held',
        smaller_stage: 'ready',
        comparison_record: -1,
        less_record: true,
        not_after_record: true,
        greater_record: false,
        not_before_record: false,
        seed: 0n,
        skip: false,
      }
      const results = Object.fromEntries(
        normalized(evaluate(row)).map(({ constraint, result }) => [constraint, result]),
      )
      expect(results.stage_larger).toEqual({ certain: true, value: true })
      expect(results.stage_smaller).toEqual({ certain: true, value: true })
      for (const constraint of ['stage_selected_hash', 'stage_selected_seeded_hash']) {
        expect(results[constraint]).toEqual({ certain: false })
        const skipped = normalized(evaluate({ ...row, skip: true })).find(
          (c) => c.constraint === constraint,
        )!
        expect(skipped.result).toEqual({ certain: true, value: true })
        const nulls = normalized(
          evaluate({ ...row, stage: null, peer: null, larger_stage: null, smaller_stage: null }),
        ).find((c) => c.constraint === constraint)!
        expect(nulls.result).toEqual({ certain: true, value: null })
      }
    },
  )

  it.each(cases)('$name', async (item) => {
    const table = catalog.tables.find(
      (table) => table.schema === item.schema && table.name === item.relation,
    )!
    await pg.exec(`SET search_path = ${quote(item.schema)}, public`)
    await pg.exec('BEGIN')
    let rejected:
      { code: string; constraint?: string; schema?: string; dataType?: string } | undefined
    try {
      await pg.query(item.sql)
    } catch (error) {
      const failure = error as { code: string; constraint?: string }
      expect(failure.code, `${item.name}: malformed INSERT SQLSTATE`).toMatch(/^[A-Z0-9]{5}$/u)
      rejected = failure
    } finally {
      await pg.exec('ROLLBACK')
    }
    expect((await pg.query<{ schema: string }>('SELECT current_schema() AS schema')).rows).toEqual([
      { schema: item.schema },
    ])
    const results = typescriptResults.get(item.name)!
    if (checkWorlds.has(item.name.split('/')[0]!))
      for (const check of results)
        expect(
          check.result.certain ||
            catalogDependentChecks.has(`${item.schema}.${table.name}.${check.constraint}`) ||
            binaryContextCases.has(`${item.name}/${check.constraint}`) ||
            jsonValueContextCases.has(`${item.name}/${check.constraint}`),
          `${item.name}/${check.constraint}: unexpected deferral in CHECK world`,
        ).toBe(true)
    const row = inputs.get(item.name)!
    const select = table.columns
      .filter((column) => Object.hasOwn(row, column.name))
      .map(
        (column) =>
          `CAST(${item.values.has(column.name) ? deparseWorldSql(item.values.get(column.name)!) : 'NULL'} AS ${column.typeName})${oracleCollation(column)} AS ${quote(column.name)}`,
      )
      .join(',')
    const generatedColumns = table.columns
      .filter((column) => column.generated !== 'none')
      .map((column) => {
        if (!column.defaultExpr) throw new Error(`${item.name}: missing generated expression`)
        return `(${column.defaultExpr})${oracleCollation(column)} AS ${quote(column.name)}`
      })
    const candidate = generatedColumns.length
      ? `SELECT inputs.*, ${generatedColumns.join(',')} FROM (SELECT ${select}) AS inputs`
      : `SELECT ${select}`
    const oracleResults: (Result & { postgres: OracleOutcome })[] = []
    const domainErrors = new Set<string>()
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
      expect(definition).toMatch(/^CHECK \(/u)
      const expression =
        declaredCheckExpressions.get(identity) ??
        definition.slice('CHECK '.length).replace(/(?:\s+(?:NOT VALID|NO INHERIT))+$/u, '')
      let expected: OracleOutcome
      try {
        expected = (
          await pg.query<{ value: boolean | null }>(
            `WITH candidate AS MATERIALIZED (${candidate})
              SELECT (${expression}) AS value FROM candidate`,
          )
        ).rows[0]!.value
      } catch (error) {
        const code = (error as { code: string }).code
        const failure = error as { schema?: string; dataType?: string; constraint?: string }
        if (code === '23514' && failure.dataType)
          domainErrors.add(JSON.stringify([failure.schema, failure.dataType, failure.constraint]))
        expect(code, `${item.name}/${constraint}: malformed CHECK SQLSTATE`).toMatch(
          /^[A-Z0-9]{5}$/u,
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
    const domainViolation = rejected?.code === '23514' && rejected.dataType !== undefined
    if (domainViolation) {
      let domain = catalog.domains.find(
        (item) => item.schema === rejected!.schema && item.name === rejected!.dataType,
      )
      expect(
        domain,
        `${item.name}: domain CHECK diagnostic must identify a captured domain`,
      ).toBeDefined()
      const seen = new Set<number>()
      let declared = false
      while (domain && !seen.has(domain.oid)) {
        seen.add(domain.oid)
        declared ||= domain.checks.some((check) => check.name === rejected!.constraint)
        domain = catalog.domains.find((item) => item.oid === domain!.baseTypeOid)
      }
      expect(
        declared,
        `${item.name}: domain CHECK diagnostic must identify a declared constraint`,
      ).toBe(true)
      expect(
        domainErrors.has(
          JSON.stringify([rejected!.schema, rejected!.dataType, rejected!.constraint]),
        ),
        `${item.name}: domain CHECK failure must occur in a CHECK expression oracle`,
      ).toBe(true)
    }
    if (rejected?.code === '23514' && !domainViolation) {
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
      schema: item.schema,
      relation: item.relation,
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
    for (const [identity, constraint] of [...jsonValueContextCases, ...catalogBinaryCases]) {
      const slash = identity.lastIndexOf('/')
      const item = caseResults.find((row) => row.name === identity.slice(0, slash))
      if (selectedWorldNames && !worlds.some((world) => identity.startsWith(world.name + '/')))
        continue
      expect(item, identity).toBeDefined()
      const check = item!.checks.find((row) => row.constraint === identity.slice(slash + 1))!
      expect(check.result.certain, identity).toBe(false)
      expect(`${item!.schema}.${item!.relation}.${check.constraint}`, identity).toBe(constraint)
      expect(item!.database.accepted, identity).toBe(true)
      expect(check.postgres, identity).toBe(true)
    }
    if (!selectedWorldNames) {
      for (const [identity, constraint] of binaryContextCases) {
        const slash = identity.lastIndexOf('/')
        const item = caseResults.find((row) => row.name === identity.slice(0, slash))!
        const check = item.checks.find((row) => row.constraint === identity.slice(slash + 1))!
        expect(check.result.certain, identity).toBe(false)
        expect(`${item.schema}.${item.relation}.${check.constraint}`, identity).toBe(constraint)
        expect(item.database.accepted, identity).toBe(true)
        expect(check.postgres, identity).toBe(true)
      }
      for (const identity of sessionDependentCases.values()) {
        const measured = coverage.get(identity)!
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
        for (const state of ['true', 'false', 'null'] as const)
          expect(measured[state], identity).toBeGreaterThan(0)
      }
      for (const identity of catalogDependentChecks) {
        const measured = coverage.get(identity)!
        expect(measured.unknown, identity).toBeGreaterThan(0)
        expect(measured.null, identity).toBeGreaterThan(0)
        expect(measured.true, identity).toBeGreaterThan(0)
      }
      for (const [table, names] of [
        [
          'shift_presence_reports',
          ['presence_local', 'presence_zoned', 'presence_duration', 'presence_pair'],
        ],
        ['shift_templates', ['shift_clock_order', 'shift_duration']],
        ['service_windows', ['service_duration_bounds', 'service_duration_span']],
        ['zoned_dispatches', ['dispatch_local_clock', 'dispatch_adjustment']],
        [
          'duration_imports',
          [
            'duration_import_match',
            'duration_import_precision',
            'duration_import_justify',
            'duration_import_scale',
          ],
        ],
        ['clock_imports', ['clock_import_local', 'clock_import_zoned', 'clock_import_label']],
        [
          'maintenance_adjustments',
          [
            'maintenance_parts',
            'maintenance_precision',
            'maintenance_day',
            'maintenance_clock',
            'maintenance_elapsed',
          ],
        ],
        [
          'departure_plans',
          ['departure_calendar_clock', 'departure_calendar_instant', 'departure_clock_precision'],
        ],
        [
          'shift_audit_fields',
          [
            'audit_local_field',
            'audit_zoned_field',
            'audit_local_legacy',
            'audit_zoned_legacy',
            'audit_local_digest',
            'audit_zoned_digest',
            'audit_local_seeded_digest',
            'audit_zoned_seeded_digest',
            'audit_local_adjustment',
            'audit_zoned_adjustment',
          ],
        ],
        [
          'duration_audit_fields',
          [
            'audit_duration_field',
            'audit_duration_legacy',
            'audit_duration_truncation',
            'audit_duration_digest',
            'audit_duration_seeded_digest',
          ],
        ],
        [
          'event_bucket_records',
          ['event_local_bucket', 'event_instant_bucket', 'event_calendar_age'],
        ],
        [
          'zoned_calendar_adjustments',
          ['zoned_calendar_add', 'zoned_calendar_subtract', 'zoned_calendar_return'],
        ],
        [
          'local_shift_conflicts',
          [
            'local_conflict_endpoints',
            'local_conflict_first_duration',
            'local_conflict_second_duration',
            'local_conflict_both_durations',
          ],
        ],
        [
          'calendar_shift_conflicts',
          [
            'calendar_conflict_endpoints',
            'calendar_conflict_first_duration',
            'calendar_conflict_second_duration',
            'calendar_conflict_both_durations',
          ],
        ],
        ['zoned_shift_conflicts', ['zoned_conflict_forward', 'zoned_conflict_reverse']],
        ['instant_shift_conflicts', ['instant_conflict_forward', 'instant_conflict_reverse']],
        ['calendar_field_records', ['calendar_field_value', 'calendar_field_wire']],
        ['clock_tolerances', ['tolerance_local', 'tolerance_zoned']],
        [
          'calendar_tolerances',
          ['tolerance_calendar_day', 'tolerance_calendar_clock', 'tolerance_duration'],
        ],
        [
          'fixed_zone_records',
          [
            'fixed_zone_instant',
            'fixed_zone_local',
            'fixed_zone_clock',
            'fixed_zone_label',
            'fixed_zone_offset',
          ],
        ],
      ] as const) {
        for (const name of names) {
          const identity = `world_026_shift_schedules.${table}.${name}`
          const measured = coverage.get(identity)!
          expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
          expect(measured.true, identity).toBeGreaterThan(0)
          expect(measured.false, identity).toBeGreaterThan(0)
        }
      }
      for (const [world, table, names] of [
        [
          '028_axis_guides',
          'guide_axes',
          ['guide_wire', 'guide_presence', 'guide_horizontal', 'guide_vertical'],
        ],
        ['028_axis_guides', 'guide_matches', ['guide_same', 'guide_selected', 'guide_default']],
        ['028_axis_guides', 'guide_imports', ['import_equation', 'import_wire', 'import_present']],
        [
          '028_axis_guides',
          'guide_constructions',
          ['construction_equation', 'construction_horizontal', 'construction_vertical'],
        ],
        [
          '028_axis_guides',
          'guide_relations',
          [
            'relation_parallel',
            'relation_perpendicular',
            'relation_crossing',
            'relation_point',
            'relation_distance',
          ],
        ],
        [
          '028_axis_guides',
          'guide_projections',
          ['projection_on_axis', 'projection_closest', 'projection_distance'],
        ],
        [
          '028_axis_guides',
          'guide_segment_imports',
          [
            'segment_import_wire',
            'segment_import_length',
            'segment_import_center',
            'segment_import_horizontal',
            'segment_import_vertical',
            'segment_import_present',
          ],
        ],
        [
          '028_axis_guides',
          'guide_segment_relations',
          [
            'segment_relation_same',
            'segment_relation_length',
            'segment_relation_parallel',
            'segment_relation_perpendicular',
            'segment_relation_selected',
          ],
        ],
        [
          '028_axis_guides',
          'guide_segment_constructions',
          ['segment_construct_same', 'segment_construct_wire'],
        ],
        [
          '028_axis_guides',
          'guide_segment_crossings',
          [
            'segment_cross_intersects',
            'segment_cross_point',
            'segment_cross_distance',
            'segment_cross_closest',
            'segment_cross_line_intersects',
            'segment_cross_on_line',
            'segment_cross_line_distance',
            'segment_cross_line_closest',
          ],
        ],
        [
          '028_axis_guides',
          'guide_segment_projections',
          ['segment_project_on', 'segment_project_closest', 'segment_project_distance'],
        ],
        [
          '028_axis_guides',
          'guide_regions',
          [
            'region_wire',
            'region_area',
            'region_width',
            'region_height',
            'region_center',
            'region_diagonal',
            'region_present',
          ],
        ],
        ['028_axis_guides', 'guide_region_imports', ['region_import_same', 'region_import_wire']],
        [
          '028_axis_guides',
          'guide_region_relations',
          ['region_relation_same', 'region_relation_area', 'region_relation_distance'],
        ],
        [
          '028_axis_guides',
          'guide_region_spatial',
          [
            'region_space_horizontal',
            'region_space_vertical',
            'region_space_topology',
            'region_space_intersection',
            'region_space_container',
          ],
        ],
        [
          '028_axis_guides',
          'guide_region_contacts',
          [
            'region_contact_point_inside',
            'region_contact_segment_inside',
            'region_contact_crossings',
            'region_contact_point_closest',
            'region_contact_point_distance',
            'region_contact_segment_closest',
            'region_contact_segment_distance',
          ],
        ],
        [
          '028_axis_guides',
          'guide_region_transforms',
          [
            'region_transform_addition',
            'region_transform_subtraction',
            'region_transform_scale',
            'region_transform_division',
          ],
        ],

        [
          '025_sensor_measurements',
          'calibrated_magnitudes',
          ['calibrated_magnitude_value', 'calibrated_magnitude_wire'],
        ],
        ['027_survey_positions', 'survey_locations', ['location_wire', 'location_presence']],
        [
          '027_survey_positions',
          'coordinate_constructions',
          ['construction_position', 'construction_wire'],
        ],
        [
          '027_survey_positions',
          'survey_matches',
          ['survey_same_position', 'survey_selection', 'survey_coalesced'],
        ],
        ['027_survey_positions', 'survey_offsets', ['offset_sum', 'offset_difference']],
        ['027_survey_positions', 'survey_transforms', ['transform_product', 'transform_quotient']],
        [
          '027_survey_positions',
          'survey_measurements',
          [
            'measurement_distance',
            'measurement_slope',
            'measurement_left',
            'measurement_right',
            'measurement_above',
            'measurement_below',
            'measurement_horizontal',
            'measurement_vertical',
          ],
        ],
        [
          '027_survey_positions',
          'survey_imports',
          ['import_position', 'import_wire', 'import_origin'],
        ],
        [
          '027_survey_positions',
          'survey_slope_reports',
          ['slope_nan', 'slope_present', 'slope_scalar_cast'],
        ],
      ] as const) {
        for (const name of names) {
          const identity = `world_${world}.${table}.${name}`
          const measured = coverage.get(identity)!
          expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
          expect(measured.true, identity).toBeGreaterThan(0)
          expect(measured.false, identity).toBeGreaterThan(0)
        }
      }
      let numericFunctionConstraints = 0
      for (const table of [
        'shipment_fee_sign',
        'shipment_fee_scale',
        'shipment_fee_whole',
        'shipment_fee_precision',
      ]) {
        const checks = [...coverage].filter(([identity]) =>
          identity.startsWith(`world_014_shipment_defaults.${table}.`),
        )
        expect(checks.length, table).toBeGreaterThan(0)
        for (const [identity, measured] of checks) {
          for (const kind of ['true', 'false', 'null'] as const)
            expect(measured[kind], identity).toBeGreaterThan(0)
          expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
          numericFunctionConstraints++
        }
      }
      expect(numericFunctionConstraints).toBe(18)
      for (const [world, table, count] of [
        ['013_label_registry', 'unicode_labels', 3],
        ['011_flight_arrivals', 'arrival_calendar_buckets', 1],
        ['011_flight_arrivals', 'arrival_calendar_fields', 1],
        ['011_flight_arrivals', 'arrival_calendar_zone_buckets', 1],
        ['011_flight_arrivals', 'arrival_calendar_clock_fields', 3],
        ['014_shipment_defaults', 'shipment_fee_small_units', 2],
        ['014_shipment_defaults', 'shipment_fee_regular_units', 2],
        ['014_shipment_defaults', 'shipment_fee_bulk_units', 2],
      ] as const) {
        const checks = [...coverage].filter(([identity]) =>
          identity.startsWith(`world_${world}.${table}.`),
        )
        expect(checks).toHaveLength(count)
        for (const [identity, measured] of checks) {
          for (const kind of ['true', 'false', 'null'] as const)
            expect(measured[kind], identity).toBeGreaterThan(0)
          expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
        }
      }
      for (const identity of [
        'world_014_shipment_defaults.shipment_fee_small_units.fee_small_rounded',
        'world_014_shipment_defaults.shipment_fee_regular_units.fee_regular_rounded',
        'world_014_shipment_defaults.shipment_fee_bulk_units.fee_bulk_rounded',
        'world_011_flight_arrivals.arrival_calendar_fields.arrival_calendar_field',
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
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
      }
      let integerFunctionConstraints = 0
      for (const table of [
        'stock_count_comparisons',
        'stock_integer_masks',
        'stock_count_math',
        'stock_window_bounds',
        'stock_boolean_records',
        'stock_radix_records',
        'stock_hash_records',
      ]) {
        const prefix = `world_012_package_capacity.${table}.`
        const checks = [...coverage].filter(([identity]) => identity.startsWith(prefix))
        expect(checks.length, table).toBeGreaterThan(0)
        for (const [identity, measured] of checks) {
          for (const kind of ['true', 'false', 'null'] as const)
            expect(measured[kind], identity).toBeGreaterThan(0)
          expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
          integerFunctionConstraints++
        }
      }
      expect(integerFunctionConstraints).toBe(74)
      let temporalFunctionConstraints = 0
      for (const table of [
        'flight_date_order',
        'flight_timestamp_order',
        'flight_instant_order',
        'flight_mixed_order',
        'flight_calendar_shift',
        'flight_precision',
      ]) {
        const prefix = `world_011_flight_arrivals.${table}.`
        const checks = [...coverage].filter(([identity]) => identity.startsWith(prefix))
        expect(checks.length, table).toBeGreaterThan(0)
        for (const [identity, measured] of checks) {
          for (const kind of ['true', 'false', 'null'] as const)
            expect(measured[kind], identity).toBeGreaterThan(0)
          expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
          temporalFunctionConstraints++
        }
      }
      expect(temporalFunctionConstraints).toBe(40)
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
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
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
          expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
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
        [
          'hardware_masks',
          [
            'hardware_invert6',
            'hardware_intersect6',
            'hardware_union6',
            'hardware_manufacturer6',
            'hardware_invert8',
            'hardware_intersect8',
            'hardware_union8',
            'hardware_manufacturer8',
            'hardware_modified8',
          ],
        ],
        [
          'hardware_conversions',
          [
            'hardware_extend',
            'hardware_shorten',
            'hardware_case_short',
            'hardware_case_extended',
            'hardware_default_short',
            'hardware_default_extended',
          ],
        ],
        [
          'hardware_imports',
          [
            'hardware_parse_short',
            'hardware_parse_extended',
            'hardware_parse_varchar_short',
            'hardware_parse_varchar_extended',
          ],
        ],
        [
          'hardware_outputs',
          [
            'hardware_text6',
            'hardware_text8',
            'hardware_wire6',
            'hardware_wire8',
            'hardware_hash6',
            'hardware_hash8',
            'hardware_seed6',
            'hardware_seed8',
            'hardware_zero6',
            'hardware_zero8',
            'hardware_output_case',
            'hardware_output_default',
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
          expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
        }
      }
      for (const [table, names] of [
        [
          'hardware_conversions',
          ['hardware_shorten', 'hardware_case_short', 'hardware_default_short'],
        ],
        [
          'hardware_imports',
          [
            'hardware_parse_short',
            'hardware_parse_extended',
            'hardware_parse_varchar_short',
            'hardware_parse_varchar_extended',
          ],
        ],
      ] as const)
        for (const name of names) {
          const identity = `world_015_network_access.${table}.${name}`
          expect(coverage.get(identity)!.error, identity).toBeGreaterThan(0)
          expect(coverage.get(identity)!.true, identity).toBeGreaterThan(0)
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
      for (const name of [
        'identifier_nonzero',
        'identifier_range',
        'identifier_default',
        'identifier_selected',
        'identifier_allowed',
        'identifier_text',
        'identifier_comparison',
      ]) {
        const identity = `world_016_device_identifiers.device_identifiers.${name}`
        const measured = coverage.get(identity)!
        expect(measured.true, identity).toBeGreaterThan(0)
        expect(measured.false, identity).toBeGreaterThan(0)
        expect(measured.null, identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
      }
      for (const name of [
        'import_parsed',
        'import_legacy',
        'import_lazy',
        'import_selected',
        'import_default',
      ]) {
        const identity = `world_016_device_identifiers.identifier_imports.${name}`
        const measured = coverage.get(identity)!
        expect(measured.true, identity).toBeGreaterThan(0)
        expect(measured.error, identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
      }
      for (const name of [
        'fingerprint_wire',
        'fingerprint_hash',
        'fingerprint_seeded',
        'fingerprint_zero',
        'fingerprint_version',
        'fingerprint_parsed_hash',
        'fingerprint_parsed_wire',
        'fingerprint_parsed_version',
        'fingerprint_lazy_parse',
      ]) {
        const identity = `world_016_device_identifiers.identifier_fingerprints.${name}`
        const measured = coverage.get(identity)!
        expect(measured.true, identity).toBeGreaterThan(0)
        expect(measured.false, identity).toBeGreaterThan(0)
        expect(measured.null, identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
      }
      for (const name of ['fingerprint_version_null', 'fingerprint_version_default']) {
        const identity = `world_016_device_identifiers.identifier_fingerprints.${name}`
        const measured = coverage.get(identity)!
        expect(measured.true, identity).toBeGreaterThan(0)
        expect(measured.false, identity).toBeGreaterThan(0)
        expect(measured.null, identity).toBe(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
      }
      for (const name of [
        'fingerprint_parsed_hash',
        'fingerprint_parsed_wire',
        'fingerprint_parsed_version',
        'fingerprint_lazy_parse',
      ]) {
        const identity = `world_016_device_identifiers.identifier_fingerprints.${name}`
        expect(coverage.get(identity)!.error, identity).toBeGreaterThan(0)
      }
      for (const name of [
        'event_recorded',
        'event_window',
        'event_selected',
        'event_parsed',
        'event_lazy_parse',
      ]) {
        const identity = `world_016_device_identifiers.identifier_events.${name}`
        const measured = coverage.get(identity)!
        expect(measured.true, identity).toBeGreaterThan(0)
        expect(measured.false, identity).toBeGreaterThan(0)
        expect(measured.null, identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
      }
      for (const name of ['event_timestamp_null', 'event_timestamp_default']) {
        const identity = `world_016_device_identifiers.identifier_events.${name}`
        const measured = coverage.get(identity)!
        expect(measured.true, identity).toBeGreaterThan(0)
        expect(measured.false, identity).toBeGreaterThan(0)
        expect(measured.null, identity).toBe(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
      }
      for (const name of ['event_parsed', 'event_lazy_parse']) {
        const identity = `world_016_device_identifiers.identifier_events.${name}`
        expect(coverage.get(identity)!.error, identity).toBeGreaterThan(0)
      }
      for (const [table, names] of [
        [
          'mask_profiles',
          [
            'profile_width',
            'profile_length',
            'profile_octets',
            'profile_recorded',
            'profile_range',
            'profile_comparison',
          ],
        ],
        [
          'device_mask_rules',
          [
            'rule_default',
            'rule_selected',
            'rule_membership',
            'rule_window',
            'rule_comparison',
            'rule_width',
            'rule_length',
            'rule_octets',
          ],
        ],
        [
          'mask_snapshots',
          [
            'snapshot_equal',
            'snapshot_case',
            'snapshot_reverse_case',
            'snapshot_default',
            'snapshot_recognized',
            'snapshot_allowed',
            'snapshot_empty',
          ],
        ],
      ] as const) {
        for (const name of names) {
          const identity = `world_017_feature_masks.${table}.${name}`
          const measured = coverage.get(identity)!
          expect(measured.true, identity).toBeGreaterThan(0)
          expect(measured.false, identity).toBeGreaterThan(0)
          expect(measured.null, identity).toBeGreaterThan(0)
          expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
        }
      }
      for (const name of [
        'patch_combination',
        'patch_direct_combination',
        'patch_read',
        'patch_write',
        'patch_flexible_read',
        'patch_flexible_write',
        'patch_selected',
        'patch_default',
      ]) {
        const identity = `world_017_feature_masks.mask_patches.${name}`
        const measured = coverage.get(identity)!
        for (const kind of ['true', 'false', 'null'] as const)
          expect(measured[kind], identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
        if (!name.includes('combination')) expect(measured.error, identity).toBeGreaterThan(0)
      }
      for (const name of [
        'window_fixed',
        'window_flexible',
        'window_direct',
        'window_suffix',
        'window_flexible_suffix',
        'window_selected',
        'window_default',
      ]) {
        const identity = `world_017_feature_masks.mask_windows.${name}`
        const measured = coverage.get(identity)!
        for (const kind of ['true', 'false', 'null'] as const)
          expect(measured[kind], identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
        if (!name.includes('suffix')) expect(measured.error, identity).toBeGreaterThan(0)
      }
      for (const name of [
        'overlay_fixed',
        'overlay_flexible',
        'overlay_direct',
        'overlay_omitted',
        'overlay_flexible_omitted',
        'overlay_selected',
        'overlay_default',
      ]) {
        const identity = `world_017_feature_masks.mask_overlays.${name}`
        const measured = coverage.get(identity)!
        for (const kind of ['true', 'false', 'null', 'error'] as const)
          expect(measured[kind], identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
      }
      const skippedOverlay = caseResults.find(
        (row) => row.name === '017_feature_masks/mask_overlay_skips_invalid_start',
      )!
      for (const check of skippedOverlay.checks)
        expect(check.result).toEqual({ certain: true, value: true })
      const defaultedOverlay = caseResults.find(
        (row) => row.name === '017_feature_masks/mask_overlay_known_default_skips_overflow',
      )!
      expect(
        defaultedOverlay.checks.find((check) => check.constraint === 'overlay_default')!.result,
      ).toEqual({ certain: true, value: true })
      expect(
        defaultedOverlay.checks.find((check) => check.constraint === 'overlay_fixed')!.result.error,
      ).toBe('22003')
      for (const name of [
        'search_fixed',
        'search_flexible',
        'search_direct',
        'search_present',
        'search_selected',
        'search_default',
        'search_flexible_default',
      ]) {
        const identity = `world_017_feature_masks.mask_searches.${name}`
        const measured = coverage.get(identity)!
        for (const kind of ['true', 'false', 'null'] as const)
          expect(measured[kind], identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
        expect(measured.error, identity).toBe(0)
      }
      const defaultedSearch = caseResults.find(
        (row) => row.name === '017_feature_masks/mask_search_default_skips_null_search',
      )!
      for (const check of defaultedSearch.checks)
        expect(check.result).toEqual({ certain: true, value: true })
      for (const name of [
        'count_fixed',
        'count_flexible',
        'count_direct',
        'count_small',
        'count_selected',
        'count_default',
        'count_flexible_default',
      ]) {
        const identity = `world_017_feature_masks.mask_counts.${name}`
        const measured = coverage.get(identity)!
        for (const kind of ['true', 'false', 'null'] as const)
          expect(measured[kind], identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
        expect(measured.error, identity).toBe(0)
      }
      const defaultedCount = caseResults.find(
        (row) => row.name === '017_feature_masks/mask_count_default_skips_null_count',
      )!
      for (const check of defaultedCount.checks)
        expect(check.result).toEqual({ certain: true, value: true })
      for (const name of [
        'packet_fixed',
        'packet_flexible',
        'packet_relabel',
        'packet_selected',
        'packet_default',
        'packet_flexible_default',
      ]) {
        const identity = `world_017_feature_masks.mask_packets.${name}`
        const measured = coverage.get(identity)!
        for (const kind of ['true', 'false', 'null'] as const)
          expect(measured[kind], identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
        expect(measured.error, identity).toBe(0)
      }
      const defaultedPacket = caseResults.find(
        (row) => row.name === '017_feature_masks/mask_packet_default_skips_null_mask',
      )!
      for (const check of defaultedPacket.checks)
        expect(check.result).toEqual({ certain: true, value: true })
      for (const name of [
        'payload_compare',
        'payload_less',
        'payload_less_equal',
        'payload_greater',
        'payload_greater_equal',
        'payload_larger',
        'payload_smaller',
        'payload_length',
        'payload_octets',
        'payload_bits',
        'payload_count',
        'payload_reversed',
        'payload_sent',
      ]) {
        const identity = `world_017_feature_masks.mask_payloads.${name}`
        const measured = coverage.get(identity)!
        for (const kind of ['true', 'false', 'null'] as const)
          expect(measured[kind], identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
        expect(measured.error, identity).toBe(0)
      }
      for (const name of [
        'patch_byte_value',
        'patch_bit_value',
        'patch_byte_result',
        'patch_bit_result',
        'patch_preserves_byte',
        'patch_preserves_bit',
      ]) {
        const identity = `world_017_feature_masks.payload_patches.${name}`
        const measured = coverage.get(identity)!
        for (const kind of ['true', 'null', 'error'] as const)
          expect(measured[kind], identity).toBeGreaterThan(0)
        if (!name.startsWith('patch_preserves_'))
          expect(measured.false, identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
      }
      const invalidBit = caseResults.find(
        (row) => row.name === '017_feature_masks/payload_patch_rejects_invalid_bit',
      )!
      expect(
        invalidBit.checks.find((check) => check.constraint === 'patch_bit_result')!.result.error,
      ).toBe('22023')
      const negativePosition = caseResults.find(
        (row) => row.name === '017_feature_masks/payload_patch_rejects_negative_positions',
      )!
      expect(
        negativePosition.checks.find((check) => check.constraint === 'patch_bit_result')!.result
          .error,
      ).toBe('2202E')
      for (const [table, names] of [
        [
          'payload_ranges',
          [
            'range_combination',
            'range_window',
            'range_window_alias',
            'range_suffix',
            'range_suffix_alias',
            'range_overlay',
            'range_default_overlay',
            'range_position',
            'range_trim',
            'range_left_trim',
            'range_right_trim',
          ],
        ],
        [
          'payload_scalar_wires',
          [
            'scalar_small_read',
            'scalar_integer_read',
            'scalar_bigint_read',
            'scalar_small_cast',
            'scalar_small_send',
            'scalar_integer_cast',
            'scalar_integer_send',
            'scalar_bigint_cast',
            'scalar_bigint_send',
            'scalar_boolean_send',
            'scalar_date_send',
            'scalar_timestamp_send',
            'scalar_instant_send',
          ],
        ],
        ['payload_hashes', ['digest_hash', 'digest_seeded', 'digest_crc', 'digest_crc_c']],
        [
          'payload_labels',
          ['label_code', 'label_varchar_code', 'label_fixed_code', 'label_trimmed'],
        ],
        [
          'payload_encodings',
          [
            'encoding_text',
            'encoding_bytes',
            'encoding_roundtrip',
            'encoding_selected',
            'encoding_default',
          ],
        ],
        [
          'payload_crypto',
          [
            'crypto_md5',
            'crypto_text_md5',
            'crypto_sha224',
            'crypto_sha256',
            'crypto_sha384',
            'crypto_sha512',
          ],
        ],
        [
          'payload_patterns',
          [
            'pattern_match',
            'pattern_not_match',
            'pattern_escaped_match',
            'pattern_escape_record',
            'pattern_selected',
            'pattern_default',
          ],
        ],
        [
          'payload_decimal_records',
          ['decimal_wire_record', 'decimal_wire_selected', 'decimal_wire_default'],
        ],
        [
          'payload_text_inputs',
          [
            'input_text_bytes',
            'input_direct_bytes',
            'input_varying_bytes',
            'input_fixed_bytes',
            'input_selected',
            'input_default',
          ],
        ],
      ] as const) {
        for (const name of names) {
          const identity = `world_017_feature_masks.${table}.${name}`
          const measured = coverage.get(identity)!
          for (const kind of ['true', 'false', 'null'] as const)
            expect(measured[kind], identity).toBeGreaterThan(0)
          expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
        }
      }
      for (const name of [
        'range_window',
        'range_window_alias',
        'range_overlay',
        'range_default_overlay',
      ])
        expect(
          coverage.get(`world_017_feature_masks.payload_ranges.${name}`)!.error,
          name,
        ).toBeGreaterThan(0)
      for (const name of ['scalar_small_read', 'scalar_integer_read', 'scalar_bigint_read'])
        expect(
          coverage.get(`world_017_feature_masks.payload_scalar_wires.${name}`)!.error,
          name,
        ).toBeGreaterThan(0)
      const signedSmall = caseResults.find(
        (row) => row.name === '017_feature_masks/payload_scalar_signed_small_unsigned_larger',
      )!
      for (const check of signedSmall.checks)
        expect(check.result).toEqual({ certain: true, value: true })
      const substringErrors = caseResults.flatMap((row) =>
        row.name.startsWith('017_feature_masks/')
          ? row.checks.filter((check) => check.result.error === '22011')
          : [],
      )
      expect(substringErrors.length).toBeGreaterThan(0)
      for (const check of substringErrors) expect(check.message).toContain('substring error')
      const escapeErrors = caseResults.flatMap((row) =>
        row.name.startsWith('017_feature_masks/')
          ? row.checks.filter((check) => check.result.error === '22025')
          : [],
      )
      expect(escapeErrors.length).toBeGreaterThan(0)
      for (const check of escapeErrors) expect(check.message).toContain('invalid escape sequence')
      const skippedInput = caseResults.find(
        (row) => row.name === '017_feature_masks/binary_text_input_skips_invalid_default',
      )!
      for (const name of ['input_selected', 'input_default'])
        expect(skippedInput.checks.find((check) => check.constraint === name)!.result).toEqual({
          certain: true,
          value: true,
        })
      const skippedSubstring = caseResults.find(
        (row) => row.name === '017_feature_masks/mask_window_skips_negative_length',
      )!
      for (const check of skippedSubstring.checks)
        expect(check.result).toEqual({ certain: true, value: true })
      const defaultedSubstring = caseResults.find(
        (row) => row.name === '017_feature_masks/mask_window_known_default_skips_negative_length',
      )!
      expect(
        defaultedSubstring.checks.find((check) => check.constraint === 'window_default')!.result,
      ).toEqual({ certain: true, value: true })
      expect(
        defaultedSubstring.checks.find((check) => check.constraint === 'window_fixed')!.result
          .error,
      ).toBe('22011')
      const indexErrors = caseResults.flatMap((row) =>
        row.name.startsWith('017_feature_masks/')
          ? row.checks.filter((check) => check.result.error === '2202E')
          : [],
      )
      expect(indexErrors.length).toBeGreaterThan(0)
      for (const check of indexErrors) expect(check.message).toContain('array subscript error')
      const orderedErrors = caseResults.find(
        (row) => row.name === '017_feature_masks/mask_patch_checks_index_before_replacement',
      )!
      for (const name of ['patch_write', 'patch_selected', 'patch_default'])
        expect(orderedErrors.checks.find((check) => check.constraint === name)!.result.error).toBe(
          '2202E',
        )
      for (const name of [
        'encoding_integer',
        'encoding_bigint',
        'encoding_decode_integer',
        'encoding_decode_bigint',
        'encoding_low_bit',
        'encoding_selected',
        'encoding_default',
        'encoding_direct',
      ]) {
        const identity = `world_017_feature_masks.mask_encodings.${name}`
        const measured = coverage.get(identity)!
        for (const kind of ['true', 'false', 'null'] as const)
          expect(measured[kind], identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
        if (
          [
            'encoding_decode_integer',
            'encoding_decode_bigint',
            'encoding_selected',
            'encoding_default',
          ].includes(name)
        ) {
          expect(measured.error, identity).toBeGreaterThan(0)
          const errors = caseResults.flatMap((row) =>
            row.name.startsWith('017_feature_masks/')
              ? row.checks.filter(
                  (check) => check.constraint === name && check.result.error === '22003',
                )
              : [],
          )
          expect(errors.length, identity).toBeGreaterThan(0)
          for (const check of errors) expect(check.message).toContain('numeric value out of range')
        }
      }
      for (const name of [
        'import_fixed',
        'import_varying',
        'import_varchar',
        'import_resize',
        'import_maximum',
        'import_output',
        'import_selected',
        'import_default',
        'import_fixed_assignment',
        'import_varying_assignment',
      ]) {
        const identity = `world_017_feature_masks.mask_imports.${name}`
        const measured = coverage.get(identity)!
        for (const kind of ['true', 'false', 'null'] as const)
          expect(measured[kind], identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
        if (
          [
            'import_fixed',
            'import_varying',
            'import_varchar',
            'import_selected',
            'import_default',
            'import_fixed_assignment',
            'import_varying_assignment',
          ].includes(name)
        )
          expect(measured.error, identity).toBeGreaterThan(0)
      }
      const truncationErrors = caseResults.flatMap((row) =>
        row.name.startsWith('017_feature_masks/')
          ? row.checks.filter(
              (check) =>
                check.constraint === 'import_varying_assignment' && check.result.error === '22001',
            )
          : [],
      )
      expect(truncationErrors.length).toBeGreaterThan(0)
      for (const check of truncationErrors)
        expect(check.message).toContain('string data right truncation')
      for (const name of [
        'transform_intersection',
        'transform_union',
        'transform_exclusive',
        'transform_complement',
        'transform_left',
        'transform_right',
        'transform_selected',
        'transform_default',
        'transform_direct',
      ]) {
        const identity = `world_017_feature_masks.mask_transforms.${name}`
        const measured = coverage.get(identity)!
        expect(measured.true, identity).toBeGreaterThan(0)
        expect(measured.false, identity).toBeGreaterThan(0)
        expect(measured.null, identity).toBeGreaterThan(0)
        expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
        if (['transform_selected', 'transform_default', 'transform_direct'].includes(name)) {
          expect(measured.error, identity).toBeGreaterThan(0)
          let describedErrors = 0
          for (const row of caseResults) {
            if (!row.name.startsWith('017_feature_masks/')) continue
            for (const check of row.checks) {
              if (check.constraint !== name || check.result.error !== '22026') continue
              expect(check.message).toContain('string data length mismatch')
              describedErrors++
            }
          }
          expect(describedErrors, identity).toBeGreaterThan(0)
        }
      }
      const recognizedMask = coverage.get(
        'world_017_feature_masks.device_mask_rules.rule_recognized',
      )!
      expect(recognizedMask.true).toBeGreaterThan(0)
      expect(recognizedMask.false).toBeGreaterThan(0)
      expect(recognizedMask.null).toBe(0)
      expect(recognizedMask.unknown).toBe(0)
      for (const [table, count] of [
        ['label_character_sizes', 9],
        ['label_binary_order', 18],
        ['cleaned_label_records', 6],
        ['label_casing_records', 4],
        ['label_fingerprints', 6],
        ['label_previews', 8],
        ['label_builder_records', 12],
        ['label_edit_records', 13],
        ['label_format_records', 12],
        ['label_literal_records', 2],
        ['label_storage_records', 2],
        ['label_pattern_records', 14],
        ['label_regex_records', 19],
        ['label_count_records', 3],
        ['label_position_records', 6],
        ['label_extract_records', 5],
        ['label_replacement_records', 5],
        ['label_pattern_conversions', 2],
      ] as const) {
        const prefix = `world_013_label_registry.${table}.`
        const constraints = [...coverage.values()].filter((item) =>
          item.constraint.startsWith(prefix),
        )
        expect(constraints, table).toHaveLength(count)
        for (const measured of constraints) {
          for (const kind of ['true', 'false', 'null'] as const)
            expect(measured[kind], measured.constraint).toBeGreaterThan(0)
          expect(measured.unknown, measured.constraint).toBe(0)
        }
      }
      for (const name of ['label_size_bytes', 'label_size_limit']) {
        const identity = `world_013_label_registry.label_storage_records.${name}`
        expect(coverage.get(identity)!.error, identity).toBeGreaterThan(0)
        const states = new Set(
          caseResults.flatMap((row) =>
            row.name.startsWith('013_label_registry/')
              ? row.checks
                  .filter(
                    (check) => check.constraint === name && typeof check.result.error === 'string',
                  )
                  .map((check) => check.result.error)
              : [],
          ),
        )
        expect(states, identity).toEqual(new Set(['22003', '22023', '22P02']))
      }
      for (const name of ['lpad_2', 'lpad_3', 'rpad_2', 'rpad_3', 'repeat_2']) {
        for (const output of ['value', 'octets']) {
          const identity = `world_013_label_registry.label_builder_records.${name}_${output}`
          expect(coverage.get(identity)!.error, identity).toBeGreaterThan(0)
        }
      }
      for (const [table, count] of [
        ['shipment_fee_totals', 7],
        ['shipment_fee_fingerprints', 2],
        ['shipment_fee_window', 1],
        ['shipment_fee_bounds', 3],
        ['shipment_fee_quotients', 10],
        ['shipment_fee_common_units', 4],
        ['shipment_storage_sizes', 2],
        ['shipment_fee_histograms', 1],
        ['shipment_package_permutations', 3],
        ['shipment_package_dimensions', 4],
        ['shipment_fee_logarithms', 4],
        ['shipment_fee_log_bases', 4],
        ['shipment_fee_decimal_logs', 4],
        ['shipment_fee_exponentials', 4],
        ['shipment_fee_powers', 6],
      ] as const) {
        const checks = [...coverage].filter(([identity]) =>
          identity.startsWith(`world_014_shipment_defaults.${table}.`),
        )
        expect(checks).toHaveLength(count)
        for (const [identity, measured] of checks) {
          for (const state of ['true', 'false', 'null'] as const)
            expect(measured[state], identity).toBeGreaterThan(0)
          expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
          if (
            table === 'shipment_fee_window' ||
            table === 'shipment_fee_bounds' ||
            table === 'shipment_fee_quotients' ||
            table === 'shipment_fee_histograms' ||
            table === 'shipment_package_permutations' ||
            table === 'shipment_package_dimensions' ||
            table === 'shipment_fee_logarithms' ||
            table === 'shipment_fee_log_bases' ||
            table === 'shipment_fee_decimal_logs' ||
            table === 'shipment_fee_exponentials' ||
            table === 'shipment_fee_powers' ||
            [
              'fee_sum',
              'fee_product',
              'fee_sum_scale',
              'fee_product_scale',
              'fee_product_wire',
              'fee_multiple',
              'fee_multiple_wire',
            ].includes(identity.split('.').at(-1)!)
          )
            expect(measured.error, identity).toBeGreaterThan(0)
        }
      }
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
      if (selectedWorldNames && !coverage.has(identity)) continue
      const measured = coverage.get(identity)!
      expect(measured.unknown, identity).toBe(binaryDeferrals(identity))
      expect(measured.true, identity).toBeGreaterThan(0)
      expect(measured.false, identity).toBeGreaterThan(0)
    }
    const definiteConstraints = constraints.filter(
      (item) => item.true + item.false + item.null + item.error > 0,
    )
    const corpus = catalogCheckGroups(
      catalog.tables,
      catalog.domains,
      [],
      catalog.enums,
      catalog.rangeTypes,
    ).flatMap((group) =>
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
    if (selectedWorldNames)
      for (const measured of constraints) {
        if (
          !worlds.some(
            (world) =>
              checkWorlds.has(world.name) && measured.constraint.startsWith(world.schema + '.'),
          )
        )
          continue
        if (catalogDependentChecks.has(measured.constraint)) continue
        expect(measured.unknown, measured.constraint).toBe(
          binaryDeferrals(measured.constraint) +
            [...jsonValueContextCases.values()].filter((name) => name === measured.constraint)
              .length,
        )
      }
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
    expect(await worldSourceDigest(), 'World inputs changed during evaluation').toBe(sourceDigest)
    await mkdir(reportDirectory, { recursive: true })
    await writeFile(
      join(reportDirectory, 'report.json'),
      JSON.stringify(
        {
          sourceDigest,
          scope: selectedWorldNames
            ? { kind: 'selected-worlds', worlds: worlds.map((world) => world.name) }
            : { kind: 'full-corpus' },
          summary,
          worlds: worldStats,
          constraints,
          unexercised,
          cases: caseResults,
        },
        null,
        2,
      ) + '\n',
    )
    console.table(worldStats)
    console.info('Detailed CHECK results:', join(reportDirectory, 'report.json'))
    console.info(
      `World CHECK parity: ${cases.length} INSERT cases, ${definiteConstraints.length} distinct constraints with definite results, ${definite} definite CHECK comparisons, ${unknownComparisons} Unknown CHECK results; ${localRejections} of ${databaseRejections} database rejections detected locally; Go and TypeScript agree.`,
    )
  })
})
