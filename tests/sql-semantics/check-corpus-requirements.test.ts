import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { plpgsql_check } from '@electric-sql/pglite-plpgsql-check'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { CatalogSnapshot } from '../../src/catalog/types.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { checkTriggerWarning } from '../../src/codegen/shared/check-trigger-warning.js'
import { hasUncertain } from '../../scripts/check-measurements/probes.js'
import { loadWorldCatalog } from '../../scripts/check-measurements/worlds.js'
import { runCheckParity, type Row, type Outcome } from '../../tools/check-rust/parity.js'

describe('world CHECK context and materialized input requirements', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } })
    await pg.exec('CREATE EXTENSION plpgsql_check')
    directory = await mkdtemp(join(tmpdir(), 'pgsid-corpus-requirements-'))
    catalog = await loadWorldCatalog(pg)
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  const check = (schema: string, relation: string, name: string) => {
    const table = catalog.tables.find(
      (table) => table.schema === schema && table.name === relation,
    )!
    const constraint = table.constraints.find((constraint) => constraint.name === name)!
    expect(constraint.definition.startsWith('CHECK (')).toBe(true)
    const plan = lowerTableCheck(table, constraint, catalog.enums, catalog.domains)!
    return { table, plan, sql: constraint.definition.slice('CHECK ('.length, -1) }
  }

  it('requires TimeZone for timestamptz-to-date and TimeZone/DateStyle for timestamp text', async () => {
    const date = check('world_005_energy_grid', 'grid_nodes', 'node_energizing_follows_commission')
    const text = check('world_009_claim_routing', 'claim_assignments', 'assignment_note_state')
    expect(date.table.columns.find((column) => column.name === 'energized_at')!.typeName).toBe(
      'timestamp with time zone',
    )
    expect(text.table.columns.find((column) => column.name === 'released_at')!.typeName).toBe(
      'timestamp with time zone',
    )
    expect(hasUncertain(date.plan.expression)).toBe(true)
    expect(hasUncertain(text.plan.expression)).toBe(true)
    const observations = []
    try {
      for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
        await pg.query("SELECT set_config('TimeZone',$1,false)", [zone])
        await pg.exec("SET DateStyle = 'ISO, MDY'")
        const result = (
          await pg.query<{ day: string; date_check: boolean; text_check: boolean }>(
            `SELECT energized_at::date::text AS day, (${date.sql}) AS date_check,
              (${text.sql}) AS text_check FROM (SELECT
              '2026-08-02 00:30:00+00'::timestamptz AS energized_at,
              '2026-08-02'::date AS commissioned_on,
              '2026-08-02 00:30:00+00'::timestamptz AS released_at,
              '2026-08-02 00:30:00+00'::text AS assignment_note) AS candidate`,
          )
        ).rows[0]!
        observations.push({ zone, ...result })
      }
      expect(observations).toEqual([
        { zone: 'UTC', day: '2026-08-02', date_check: true, text_check: false },
        { zone: 'America/Los_Angeles', day: '2026-08-01', date_check: false, text_check: true },
        { zone: 'Asia/Tokyo', day: '2026-08-02', date_check: true, text_check: true },
      ])
      await pg.exec("SET TimeZone = 'UTC'")
      const formatted = []
      for (const style of ['ISO, MDY', 'SQL, DMY', 'Postgres, MDY', 'German, DMY']) {
        await pg.query("SELECT set_config('DateStyle',$1,false)", [style])
        formatted.push(
          (
            await pg.query<{ local: string; absolute: string; text_check: boolean }>(
              `SELECT '2026-08-02 11:32:05'::timestamp::text AS local,
                released_at::text AS absolute, (${text.sql}) AS text_check FROM (SELECT
                '2026-08-02 11:32:05+00'::timestamptz AS released_at,
                '2026-08-02 11:32:05+00'::text AS assignment_note) AS candidate`,
            )
          ).rows[0]!,
        )
      }
      expect(formatted.map((row) => row.local)).toEqual([
        '2026-08-02 11:32:05',
        '02/08/2026 11:32:05',
        'Sun Aug 02 11:32:05 2026',
        '02.08.2026 11:32:05',
      ])
      expect(new Set(formatted.map((row) => row.absolute)).size).toBe(4)
      expect(formatted.map((row) => row.text_check)).toEqual([false, true, true, true])
    } finally {
      await pg.exec('RESET TimeZone; RESET DateStyle')
    }
    const names = ['date_context', 'text_context']
    const group = prepareCheckRustGroup(
      [date, text].map(({ table, plan }, index) => ({
        expression: plan.expression,
        identity: {
          schema: table.schema,
          kind: 'table',
          owner: table.name,
          constraint: names[index]!,
        },
      })),
    )
    const fixtures: { name: string; row: Row; expected: Outcome }[] = [
      {
        name: names[0]!,
        row: { energized_at: { kind: 'Value', value: 0n } },
        expected: { kind: 'Unknown' },
      },
      { name: names[0]!, row: { energized_at: { kind: 'Null' } }, expected: { kind: 'True' } },
      {
        name: names[0]!,
        row: { energized_at: { kind: 'Unknown' } },
        expected: { kind: 'Unknown' },
      },
      {
        name: names[1]!,
        row: {
          released_at: { kind: 'Value', value: 0n },
          assignment_note: { kind: 'Value', value: 'note' },
        },
        expected: { kind: 'Unknown' },
      },
      {
        name: names[1]!,
        row: { released_at: { kind: 'Value', value: 0n }, assignment_note: { kind: 'Null' } },
        expected: { kind: 'True' },
      },
      {
        name: names[1]!,
        row: { released_at: { kind: 'Null' }, assignment_note: { kind: 'Value', value: 'note' } },
        expected: { kind: 'True' },
      },
      {
        name: names[1]!,
        row: {
          released_at: { kind: 'Unknown' },
          assignment_note: { kind: 'Value', value: 'note' },
        },
        expected: { kind: 'Unknown' },
      },
    ]
    const target = join(directory, 'context')
    await mkdir(target)
    await runCheckParity(target, 'corpuscontext', group, names, fixtures)
  })

  it('requires the generated movement_class value independently of its source columns', async () => {
    const { table, plan, sql } = check(
      'world_008_inventory_allocation',
      'movement_events',
      'movement_classification_inputs',
    )
    const column = table.columns.find((column) => column.name === 'movement_class')!
    expect(column.generated).toBe('stored')
    expect(column.defaultExpr).toBeTruthy()
    expect(hasUncertain(plan.expression)).toBe(false)
    const source = await readFile(
      new URL('../unit/query/worlds/008_inventory_allocation/check-seed.sql', import.meta.url),
      'utf8',
    )
    const insert = source.match(/-- name: movement_increases_quantity\s*\n([^;]+);/u)![1]!
    let materialized: { before_qty: number; after_qty: number; movement_class: string }
    await pg.exec('BEGIN; SET LOCAL search_path = world_008_inventory_allocation, public')
    try {
      materialized = (
        await pg.query<typeof materialized>(
          insert + ' RETURNING before_qty, after_qty, movement_class',
        )
      ).rows[0]!
    } finally {
      await pg.exec('ROLLBACK')
    }
    expect(materialized).toEqual({ before_qty: 10, after_qty: 11, movement_class: 'increase' })
    const names = ['generated_input']
    const group = prepareCheckRustGroup([
      {
        expression: plan.expression,
        identity: { schema: table.schema, kind: 'table', owner: table.name, constraint: names[0]! },
      },
    ])
    const prepared = group.checks[0]!
    expect(prepared.kind).toBe('supported')
    if (prepared.kind !== 'supported') throw new Error(prepared.reason)
    expect(prepared.inputs.map((input) => input.name).sort()).toEqual([
      'after_qty',
      'before_qty',
      'movement_class',
    ])
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    for (const [before, after] of [
      [10, 11],
      [11, 10],
      [10, 10],
    ]) {
      const result = (
        await pg.query<{ movement_class: string | null; value: boolean }>(
          `SELECT movement_class, (${sql}) AS value FROM (SELECT inputs.*,
            (${column.defaultExpr}) AS movement_class FROM
            (SELECT $1::integer AS before_qty, $2::integer AS after_qty) AS inputs) AS candidate`,
          [before, after],
        )
      ).rows[0]!
      const row: Row = {
        before_qty: { kind: 'Value', value: before! },
        after_qty: { kind: 'Value', value: after! },
        movement_class:
          result.movement_class === null
            ? { kind: 'Null' }
            : { kind: 'Value', value: result.movement_class },
      }
      fixtures.push(
        { name: names[0]!, row, expected: { kind: result.value ? 'True' : 'False' } },
        {
          name: names[0]!,
          row: { ...row, movement_class: { kind: 'Unknown' } },
          expected: { kind: before === after ? 'True' : 'Unknown' },
        },
        {
          name: names[0]!,
          row: { ...row, movement_class: { kind: 'Null' } },
          expected: { kind: before === after ? 'True' : 'False' },
        },
      )
    }
    const target = join(directory, 'generated')
    await mkdir(target)
    await runCheckParity(target, 'generatedinput', group, names, fixtures)
  })

  it('requires materialized open markers for active partition rows', async () => {
    const fixtures: { name: string; row: Row; expected: Outcome }[] = []
    const entries = []
    for (const region of ['na', 'eu']) {
      const { table, plan, sql } = check(
        'world_009_claim_routing',
        `routed_claims_${region}_active`,
        'routed_claim_open_marker',
      )
      const column = table.columns.find((column) => column.name === 'open_marker')!
      expect(column.generated).toBe('stored')
      expect(hasUncertain(plan.expression)).toBe(false)
      const result = (
        await pg.query<{ open_marker: string; value: boolean }>(
          `SELECT open_marker, (${sql}) AS value FROM (SELECT inputs.*,
            (${column.defaultExpr}) AS open_marker FROM (SELECT
            'active'::text AS stage, 'CHECK-INTAKE'::text AS intake_code,
            NULL::timestamptz AS closed_at) AS inputs) AS candidate`,
        )
      ).rows[0]!
      expect(result).toEqual({ open_marker: 'CHECK-INTAKE', value: true })
      const name = `${region}_open_marker`
      entries.push({
        expression: plan.expression,
        identity: {
          schema: table.schema,
          kind: 'table' as const,
          owner: table.name,
          constraint: name,
        },
      })
      const row: Row = {
        stage: { kind: 'Value', value: 'active' },
        open_marker: { kind: 'Value', value: result.open_marker },
      }
      fixtures.push(
        { name, row, expected: { kind: 'True' } },
        { name, row: { ...row, open_marker: { kind: 'Unknown' } }, expected: { kind: 'Unknown' } },
        { name, row: { ...row, open_marker: { kind: 'Null' } }, expected: { kind: 'False' } },
      )
    }
    const group = prepareCheckRustGroup(entries)
    const target = join(directory, 'partitions')
    await mkdir(target)
    await runCheckParity(
      target,
      'partitioninputs',
      group,
      ['na_open_marker', 'eu_open_marker'],
      fixtures,
    )
  })

  it('requires row values after BEFORE hooks for trigger-dependent partition CHECKs', async () => {
    const tables = catalog.tables.filter(
      (table) =>
        table.schema === 'world_009_claim_routing' && table.name.startsWith('routed_claims'),
    )
    expect(tables.map((table) => table.name).sort()).toEqual([
      'routed_claims',
      'routed_claims_eu',
      'routed_claims_eu_active',
      'routed_claims_eu_closed',
      'routed_claims_na',
      'routed_claims_na_active',
      'routed_claims_na_closed',
    ])
    for (const table of tables) {
      expect(table.writeRewritesTree.beforeRow, table.name).toEqual(['insert', 'update'])
      expect(checkTriggerWarning(table, 'insert')).toContain('BEFORE INSERT row trigger(s)')
    }
    const { table, plan, sql } = check(
      'world_009_claim_routing',
      'routed_claims_na_active',
      'routed_claim_lifecycle',
    )
    const before = (
      await pg.query<{ value: boolean }>(
        `SELECT (${sql}) AS value FROM (SELECT 'active'::text AS stage,
        '2026-08-02 10:00+00'::timestamptz AS closed_at,
        'premature close'::text AS resolution_note) AS candidate`,
      )
    ).rows[0]!.value
    expect(before).toBe(false)
    await pg.exec('BEGIN; SET LOCAL search_path = world_009_claim_routing, public')
    try {
      const row = (
        await pg.query<{
          stage: string
          closed_at: null
          resolution_note: null
          review_note: null
        }>(
          `INSERT INTO routed_claims_na_active
          (tenant_id,claim_id,jurisdiction,stage,policy_id,adjuster_id,loss_amount,
           incident_at,intake_code,resolution_note,closed_at,review_note)
          VALUES (1,112,'NA','active',11,11,100,'2026-08-01 08:00+00','CHECK-INTAKE',
           'premature close','2026-08-02 10:00+00','stale review')
          RETURNING stage,closed_at,resolution_note,review_note`,
        )
      ).rows[0]!
      expect(row).toEqual({
        stage: 'active',
        closed_at: null,
        resolution_note: null,
        review_note: null,
      })
      const after = (
        await pg.query<{ value: boolean }>(
          `SELECT (${sql}) AS value FROM routed_claims_na_active WHERE tenant_id=1 AND claim_id=112`,
        )
      ).rows[0]!.value
      expect(after).toBe(true)
      const name = 'trigger_lifecycle'
      const group = prepareCheckRustGroup([
        {
          expression: plan.expression,
          identity: { schema: table.schema, kind: 'table', owner: table.name, constraint: name },
        },
      ])
      const target = join(directory, 'triggers')
      await mkdir(target)
      await runCheckParity(
        target,
        'triggerinputs',
        group,
        [name],
        [
          {
            name,
            row: {
              stage: { kind: 'Value', value: 'active' },
              closed_at: { kind: 'Value', value: 0n },
              resolution_note: { kind: 'Value', value: 'premature close' },
            },
            expected: { kind: 'False' },
          },
          {
            name,
            row: {
              stage: { kind: 'Value', value: row.stage },
              closed_at: { kind: 'Null' },
              resolution_note: { kind: 'Null' },
            },
            expected: { kind: 'True' },
          },
        ],
      )
    } finally {
      await pg.exec('ROLLBACK')
    }
  })
})
