import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseSql } from '../../src/ast.js'
import { snapshotCatalog } from '../../src/catalog/snapshot.js'
import type { CatalogSnapshot } from '../../src/catalog/types.js'
import type { WriteValueLineage } from '../../src/query/value-lineage.js'
import { planCheckInputs } from '../../src/codegen/shared/check-inputs.js'
import { lowerTableCheck } from '../../src/sql-semantics/catalog-checks.js'
import { prepareCheckRustGroup } from '../../src/codegen/shared/check-rust-source.js'
import { runCheckParity } from '../../tools/check-rust/parity.js'

describe('SQL-coerced CHECK inputs and raw query parameters', () => {
  let pg: PGlite
  let directory: string
  let catalog: CatalogSnapshot
  beforeAll(async () => {
    pg = await PGlite.create()
    directory = await mkdtemp(join(tmpdir(), 'pgsid-input-contract-'))
    await pg.exec(`CREATE DOMAIN rounded_amount AS numeric(6,2);
      CREATE DOMAIN nested_amount AS rounded_amount;
      CREATE DOMAIN limited_label AS varchar(4);
      CREATE DOMAIN nested_label AS limited_label;
      CREATE DOMAIN exact_amount AS numeric;
      CREATE TABLE parameter_coercions (
        amount numeric(6,2) CHECK (amount < 1.233),
        domain_amount nested_amount CHECK (domain_amount < 1.233),
        variable_label varchar(4) CHECK (variable_label = 'abc '),
        domain_label nested_label CHECK (domain_label = 'abc '),
        fixed_label char(4) CHECK (fixed_label::text = 'abc'),
        event_day date CHECK (event_day >= DATE '2000-01-01'),
        local_time timestamp(3) CHECK (local_time >= TIMESTAMP '2000-01-01 00:00:00.001'),
        bit_mask bit(4) CHECK (bit_length(bit_mask) = 4),
        variable_mask varbit(4) CHECK (bit_length(variable_mask) = 4),
        plain_amount numeric CHECK (plain_amount < 1.233),
        plain_domain exact_amount CHECK (plain_domain < 1.233),
        plain_label text CHECK (plain_label <> ''))`)
    catalog = await snapshotCatalog(pg)
  })
  afterAll(async () => {
    if (pg && !pg.closed) await pg.close()
    if (directory) await rm(directory, { recursive: true, force: true })
  })
  const table = () => catalog.tables.find((table) => table.name === 'parameter_coercions')!
  const inputs = async (name: string, parameterType: string, snapshot = catalog) => {
    const sql = `INSERT INTO public.parameter_coercions (${name}) VALUES ($1)`
    const statement = (await parseSql(sql)).stmts?.[0]?.stmt
    if (!statement) throw new Error('Expected INSERT statement')
    const writes: WriteValueLineage[] = [
      {
        target: { schema: 'public', relation: table().name, column: name },
        source: 'insert',
        partial: false,
        value: { kind: 'parameter', number: 1, resolvedType: parameterType },
      },
    ]
    return planCheckInputs(statement, writes, snapshot, [parameterType]).flatMap(
      (plan) => plan.columns,
    )
  }

  it('excludes parameters that still require assignment or domain coercion', async () => {
    for (const [name, parameterType] of [
      ['amount', 'numeric'],
      ['domain_amount', 'public.nested_amount'],
      ['variable_label', 'character varying'],
      ['domain_label', 'public.nested_label'],
      ['fixed_label', 'character'],
      ['event_day', 'date'],
      ['local_time', 'timestamp without time zone'],
      ['bit_mask', 'bit'],
      ['variable_mask', 'bit varying'],
    ])
      expect(await inputs(name!, parameterType!), name).toEqual([])
    expect(await inputs('plain_amount', 'numeric')).toEqual([
      { name: 'plain_amount', parameter: 1 },
    ])
    expect(await inputs('plain_label', 'text')).toEqual([{ name: 'plain_label', parameter: 1 }])
    expect(await inputs('plain_domain', 'public.exact_amount')).toEqual([
      { name: 'plain_domain', parameter: 1 },
    ])
  })

  it('requires domain modifier metadata before treating numeric parameters as SQL-coerced', async () => {
    const rows = (
      await pg.query<{ name: string; modifier: number }>(
        `SELECT typname AS name,typtypmod AS modifier FROM pg_type
       WHERE typnamespace='public'::regnamespace AND typtype='d'`,
      )
    ).rows
    for (const row of rows) {
      const domain = catalog.domains.find((domain) => domain.name === row.name)!
      expect(domain.baseTypeMod, row.name).toBe(row.modifier)
    }
    expect(
      catalog.domains.find((domain) => domain.name === 'rounded_amount')!.baseTypeMod,
    ).toBeGreaterThan(0)
    expect(catalog.domains.find((domain) => domain.name === 'limited_label')!.baseTypeMod).toBe(8)
    expect(catalog.domains.find((domain) => domain.name === 'exact_amount')!.baseTypeMod).toBe(-1)
    const legacy = {
      ...catalog,
      domains: catalog.domains.map(({ baseTypeMod: _modifier, ...domain }) => domain),
    }
    expect(await inputs('plain_domain', 'public.exact_amount', legacy)).toEqual([])
    expect(await inputs('domain_amount', 'public.nested_amount', legacy)).toEqual([])
    expect(await inputs('domain_label', 'public.nested_label', legacy)).toEqual([])
  })

  it('distinguishes raw values from PostgreSQL-rounded row values in every evaluator target', async () => {
    for (const column of ['amount', 'domain_amount']) {
      await pg.exec('BEGIN')
      try {
        const stored = (
          await pg.query<{ value: string }>(
            `INSERT INTO parameter_coercions (${column}) VALUES ($1) RETURNING ${column}::text AS value`,
            ['1.234'],
          )
        ).rows[0]!.value
        expect(stored).toBe('1.23')
      } finally {
        await pg.exec('ROLLBACK')
      }
    }
    const raw = (
      await pg.query<{ value: boolean }>('SELECT $1::numeric < 1.233 AS value', ['1.234'])
    ).rows[0]!.value
    expect(raw).toBe(false)
    const definition = table().constraints.find((constraint) =>
      constraint.columns.includes('amount'),
    )!
    const expression = lowerTableCheck(
      table(),
      definition,
      catalog.enums,
      catalog.domains,
    )!.expression
    const group = prepareCheckRustGroup([
      {
        expression,
        identity: {
          schema: 'public',
          kind: 'table',
          owner: table().name,
          constraint: 'rounded_row',
        },
      },
    ])
    await runCheckParity(
      directory,
      'inputcontract',
      group,
      ['rounded_row'],
      [
        {
          name: 'rounded_row',
          row: { amount: { kind: 'Value', value: '1.234' } },
          expected: { kind: 'False' },
        },
        {
          name: 'rounded_row',
          row: { amount: { kind: 'Value', value: '1.23' } },
          expected: { kind: 'True' },
        },
        {
          name: 'rounded_row',
          row: { amount: { kind: 'Unknown' } },
          expected: { kind: 'Unknown' },
        },
      ],
    )
  })

  it('observes assignment padding, trailing-space truncation and timestamp precision in PostgreSQL', async () => {
    for (const [column, raw, expected] of [
      ['variable_label', 'abc  ', 'abc '],
      ['domain_label', 'abc  ', 'abc '],
      ['fixed_label', 'abc  ', 'abc'],
      ['local_time', '2000-01-01 00:00:00.0005', '2000-01-01 00:00:00.001'],
    ]) {
      await pg.exec('BEGIN')
      try {
        const stored = (
          await pg.query<{ value: string }>(
            `INSERT INTO parameter_coercions (${column}) VALUES ($1) RETURNING ${column}::text AS value`,
            [raw],
          )
        ).rows[0]!.value
        expect(stored, column).toBe(expected)
      } finally {
        await pg.exec('ROLLBACK')
      }
    }
  })
})
