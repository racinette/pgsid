import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseSql } from '../../../src/ast.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { buildNullabilityCatalog } from '../../../src/query/catalog-adapter.js'
import { inferQueryContract } from '../../../src/query/nullability-walk.js'
import type { NullabilityCatalog } from '../../../src/query/types.js'

describe('conditional write-path inference', () => {
  let pg: PGlite
  let catalog: NullabilityCatalog

  beforeAll(async () => {
    pg = new PGlite()
    await pg.exec(`
      CREATE TABLE accounts (
        merchant_id int NOT NULL,
        account_code text NOT NULL,
        activated_at timestamptz NOT NULL,
        PRIMARY KEY (merchant_id, account_code)
      );
      CREATE TABLE charges (
        id int PRIMARY KEY,
        merchant_id int NOT NULL,
        account_code text NOT NULL,
        provider_key text NOT NULL UNIQUE,
        state text NOT NULL,
        gross_amount numeric NOT NULL,
        settled_amount numeric,
        provider_event_at timestamptz NOT NULL,
        settled_at timestamptz,
        note text,
        net_amount numeric GENERATED ALWAYS AS (
          CASE WHEN settled_amount IS NULL THEN NULL ELSE settled_amount END
        ) STORED,
        settlement_marker text GENERATED ALWAYS AS (
          CASE WHEN settled_at IS NULL THEN NULL ELSE provider_key END
        ) STORED,
        FOREIGN KEY (merchant_id, account_code)
          REFERENCES accounts (merchant_id, account_code)
      );
      CREATE TABLE optional_charges (
        id int PRIMARY KEY,
        merchant_id int,
        account_code text,
        FOREIGN KEY (merchant_id, account_code)
          REFERENCES accounts (merchant_id, account_code)
      );
      CREATE TABLE staged_lots (
        id int PRIMARY KEY,
        note text
      );
      CREATE TABLE staged_movements (
        id int PRIMARY KEY,
        note text NOT NULL
      );
      INSERT INTO accounts VALUES
        (1, 'main', '2026-01-01 00:00+00'),
        (1, 'reserve', '2026-01-02 00:00+00');
      INSERT INTO charges
        (id, merchant_id, account_code, provider_key, state, gross_amount,
         settled_amount, provider_event_at, settled_at, note)
      VALUES
        (1, 1, 'main', 'disputed', 'disputed', 10, 10,
         '2026-01-03 00:00+00', '2026-01-03 00:00+00', NULL);
      INSERT INTO optional_charges VALUES (1, NULL, NULL);
      INSERT INTO staged_lots VALUES (1, NULL);
    `)
    catalog = await buildNullabilityCatalog(await snapshotCatalog(pg))
  })

  afterAll(async () => {
    if (!pg.closed) await pg.close()
  })

  async function contract(sql: string) {
    const parsed = await parseSql(sql)
    return inferQueryContract(parsed.stmts![0]!.stmt!, catalog, {
      evaluate: async (statement) => (await pg.query<Record<string, unknown>>(statement)).rows[0],
    })
  }

  async function execute(sql: string, args: unknown[]): Promise<unknown[]> {
    await pg.exec('BEGIN')
    try {
      return (await pg.query(sql, args)).rows
    } finally {
      await pg.exec('ROLLBACK')
    }
  }

  it('proves a scalar row through every column of a required composite foreign key', async () => {
    const exact = `SELECT (
      SELECT a.activated_at FROM accounts a
      WHERE a.merchant_id = c.merchant_id
        AND a.account_code = c.account_code
    ) AS activated_at FROM charges c`
    expect((await contract(exact)).outputs[0]!.notNull).toBe(true)
    await expect(pg.query(exact)).resolves.toMatchObject({
      rows: [{ activated_at: new Date('2026-01-01T00:00:00.000Z') }],
    })

    const incomplete = `SELECT (
      SELECT a.activated_at FROM accounts a
      WHERE a.merchant_id = c.merchant_id
        AND a.account_code = 'missing'
    ) AS activated_at FROM charges c`
    expect((await contract(incomplete)).outputs[0]!.notNull).toBe(false)
    await expect(pg.query(incomplete)).resolves.toMatchObject({ rows: [{ activated_at: null }] })

    const nullableKey = `SELECT (
      SELECT a.activated_at FROM accounts a
      WHERE a.merchant_id = c.merchant_id
        AND a.account_code = c.account_code
    ) AS activated_at FROM optional_charges c`
    expect((await contract(nullableKey)).outputs[0]!.notNull).toBe(false)
    await expect(pg.query(nullableKey)).resolves.toMatchObject({ rows: [{ activated_at: null }] })
  })

  it('carries common UPSERT inputs through generated RETURNING columns', async () => {
    const sql = `INSERT INTO charges
      (id, merchant_id, account_code, provider_key, state, gross_amount,
       settled_amount, provider_event_at, settled_at, note)
      VALUES ($1, 1, 'main', $2, 'captured', $3, $3, $4, $4, coalesce($7, 'new'))
      ON CONFLICT (provider_key) DO UPDATE SET
        state = CASE WHEN charges.state = 'disputed'
          THEN coalesce($5, $6) ELSE charges.state END,
        gross_amount = EXCLUDED.gross_amount,
        settled_amount = EXCLUDED.settled_amount,
        provider_event_at = EXCLUDED.provider_event_at,
        settled_at = EXCLUDED.settled_at,
        note = charges.note
      WHERE charges.state = 'disputed'
      RETURNING net_amount, settlement_marker, note`
    const inferred = await contract(sql)
    expect(inferred.outputs.map((output) => output.notNull)).toEqual([true, true, false])
    expect(inferred.paramRejectionSets).toEqual([[5, 6]])

    await expect(
      execute(sql, [10, 'disputed', 12, '2026-02-01T00:00:00Z', 'captured', null, null]),
    ).resolves.toEqual([{ net_amount: '12', settlement_marker: 'disputed', note: null }])
    await expect(
      execute(sql, [11, 'disputed', 12, '2026-02-01T00:00:00Z', null, 'captured', null]),
    ).resolves.toHaveLength(1)
    await expect(
      execute(sql, [12, 'disputed', 12, '2026-02-01T00:00:00Z', null, null, null]),
    ).rejects.toThrow(/null value|not-null constraint/i)
    await expect(
      execute(sql, [13, 'inserted', 12, '2026-02-01T00:00:00Z', null, null, null]),
    ).resolves.toHaveLength(1)
  })

  it('does not select a conflict CASE through a repeated function predicate', async () => {
    const sql = `INSERT INTO charges
      (id, merchant_id, account_code, provider_key, state, gross_amount,
       settled_amount, provider_event_at, settled_at)
      VALUES ($1, 1, 'main', $2, 'captured', 10, 10,
              '2026-02-01T00:00:00Z', '2026-02-01T00:00:00Z')
      ON CONFLICT (provider_key) DO UPDATE SET
        state = CASE WHEN lower(charges.state) = 'disputed'
          THEN coalesce($3, $4) ELSE charges.state END
      WHERE lower(charges.state) = 'disputed'
      RETURNING state`
    expect((await contract(sql)).paramRejectionSets).toEqual([])
  })

  it('attributes joint rejection through an UPDATE new image and its CTE consumer', async () => {
    const sql = `WITH changed AS (
      UPDATE staged_lots AS l
      SET note = coalesce($1::text, $2::text)
      WHERE l.id = $3
      RETURNING WITH (NEW AS after) after.id, after.note
    )
    INSERT INTO staged_movements (id, note)
    SELECT 10 + c.id, c.note FROM changed AS c
    RETURNING note`

    const inferred = await contract(sql)
    expect(inferred.paramRejectionSets).toEqual([[1, 2]])
    await expect(execute(sql, ['counted', null, 1])).resolves.toEqual([{ note: 'counted' }])
    await expect(execute(sql, [null, 'fallback', 1])).resolves.toEqual([{ note: 'fallback' }])
    await expect(execute(sql, [null, null, 1])).rejects.toThrow(/null value|not-null constraint/i)
    await expect(execute(sql, [null, null, 999])).resolves.toEqual([])
  })
})
