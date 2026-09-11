import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseSql } from '../../../src/ast.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { buildNullabilityCatalog } from '../../../src/query/catalog-adapter.js'
import { inferQueryContract } from '../../../src/query/nullability-walk.js'
import type { NullabilityCatalog } from '../../../src/query/types.js'

describe('UPDATE FROM source facts in RETURNING', () => {
  let pg: PGlite
  let catalog: NullabilityCatalog

  beforeAll(async () => {
    pg = new PGlite()
    await pg.exec(`
      CREATE TABLE principals (
        id int PRIMARY KEY,
        enabled boolean NOT NULL,
        disabled_at timestamptz,
        disabled_reason text
      );
      CREATE TABLE requests (id int PRIMARY KEY, approved_at timestamptz, reason text);
      INSERT INTO principals VALUES (1, true, NULL, NULL), (2, true, NULL, NULL);
      INSERT INTO requests VALUES
        (1, NULL, NULL),
        (2, '2026-08-01 10:00+00', 'approved');
    `)
    catalog = await buildNullabilityCatalog(await snapshotCatalog(pg))
  })

  afterAll(async () => {
    if (!pg.closed) await pg.close()
  })

  async function contract(sql: string) {
    const parsed = await parseSql(sql)
    return inferQueryContract(parsed.stmts![0]!.stmt!, catalog)
  }

  async function execute(sql: string, args: unknown[]): Promise<unknown[]> {
    await pg.exec('BEGIN')
    try {
      return (await pg.query(sql, args)).rows
    } finally {
      await pg.exec('ROLLBACK')
    }
  }

  it('carries a filtered source value through the written target column', async () => {
    const sql = `UPDATE principals AS p
      SET disabled_at = r.approved_at
      FROM requests AS r
      WHERE p.id = r.id
        AND r.id = $1
        AND r.approved_at IS NOT NULL
      RETURNING p.disabled_at`

    expect((await contract(sql)).outputs[0]!.notNull).toBe(true)
    await expect(execute(sql, [2])).resolves.toEqual([
      { disabled_at: new Date('2026-08-01T10:00:00.000Z') },
    ])
  })

  it('does not promote a source value from a non-conjunctive predicate', async () => {
    const sql = `UPDATE principals AS p
      SET disabled_at = r.approved_at
      FROM requests AS r
      WHERE p.id = r.id
        AND (r.approved_at IS NOT NULL OR r.id = $1)
      RETURNING p.disabled_at`

    expect((await contract(sql)).outputs[0]!.notNull).toBe(false)
    await expect(execute(sql, [1])).resolves.toEqual([
      { disabled_at: null },
      { disabled_at: new Date('2026-08-01T10:00:00.000Z') },
    ])
  })

  it('selects a stable CASE value for the affected old target row', async () => {
    const sql = `UPDATE principals AS p
      SET enabled = false,
          disabled_reason = CASE
            WHEN p.enabled THEN coalesce(r.reason, 'approved request')
            ELSE NULL
          END
      FROM requests AS r
      WHERE p.id = r.id
        AND r.id = $1
        AND p.enabled
      RETURNING p.disabled_reason`

    expect((await contract(sql)).outputs[0]!.notNull).toBe(true)
    await expect(execute(sql, [2])).resolves.toEqual([{ disabled_reason: 'approved' }])
  })

  it('does not select a CASE value through a repeated volatile predicate', async () => {
    const sql = `UPDATE principals AS p
      SET disabled_reason = CASE
        WHEN random() < 0.5 THEN 'selected'
        ELSE NULL
      END
      WHERE random() < 0.5
      RETURNING p.disabled_reason`

    expect((await contract(sql)).outputs[0]!.notNull).toBe(false)
  })

  it('uses the same selected-value rule on both UPSERT return paths', async () => {
    const sql = `INSERT INTO principals (id, enabled, disabled_reason)
      VALUES ($1, true, 'inserted')
      ON CONFLICT (id) DO UPDATE SET
        disabled_reason = CASE
          WHEN principals.enabled THEN 'updated'
          ELSE NULL
        END
      WHERE principals.enabled
      RETURNING disabled_reason`

    expect((await contract(sql)).outputs[0]!.notNull).toBe(true)
    await expect(execute(sql, [1])).resolves.toEqual([{ disabled_reason: 'updated' }])
    await expect(execute(sql, [3])).resolves.toEqual([{ disabled_reason: 'inserted' }])
  })

  it('uses the same selected-value rule across MERGE arms', async () => {
    const sql = `MERGE INTO principals AS p
      USING (VALUES (1)) AS incoming (id)
      ON p.id = incoming.id
      WHEN MATCHED AND p.enabled THEN
        UPDATE SET disabled_reason = CASE
          WHEN p.enabled THEN 'updated'
          ELSE NULL
        END
      WHEN NOT MATCHED THEN
        INSERT (id, enabled, disabled_reason)
        VALUES (incoming.id, true, 'inserted')
      RETURNING p.disabled_reason`

    expect((await contract(sql)).outputs[0]!.notNull).toBe(true)
    await expect(execute(sql, [])).resolves.toEqual([{ disabled_reason: 'updated' }])
  })
})
