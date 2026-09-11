import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseSql } from '../../../src/ast.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { buildNullabilityCatalog } from '../../../src/query/catalog-adapter.js'
import { inferQueryContract, type QueryContract } from '../../../src/query/nullability-walk.js'
import type { NullabilityCatalog } from '../../../src/query/types.js'

let pg: PGlite
let catalog: NullabilityCatalog

const SCHEMA = `
  CREATE TABLE measured (
    id int PRIMARY KEY,
    value numeric,
    verdict text GENERATED ALWAYS AS (
      CASE WHEN value IS NULL THEN NULL ELSE 'recorded' END
    ) STORED
  );
  CREATE TABLE devices (id int PRIMARY KEY, serial text NOT NULL UNIQUE);
  CREATE TABLE scheduled (id int PRIMARY KEY, device_id int NOT NULL REFERENCES devices (id));
  CREATE TABLE result_notes (id int PRIMARY KEY, result_key text NOT NULL UNIQUE, note text);
`

beforeAll(async () => {
  pg = new PGlite()
  await pg.exec(SCHEMA)
  await pg.exec(`
    INSERT INTO measured VALUES (1, NULL), (2, 5);
    INSERT INTO devices VALUES (1, 'MX-100');
    INSERT INTO result_notes VALUES (1, 'seeded', 'old');
  `)
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg))
}, 60_000)

afterAll(async () => {
  if (!pg.closed) await pg.close()
})

async function contract(sql: string): Promise<QueryContract> {
  const parsed = await parseSql(sql)
  return inferQueryContract(parsed.stmts![0]!.stmt!, catalog, {
    evaluate: async (statement) => (await pg.query<Record<string, unknown>>(statement)).rows[0],
  })
}

describe('alternative execution paths', () => {
  it('uses a WHERE guarantee to prune a generated CASE null arm', async () => {
    const sql = 'SELECT verdict FROM measured WHERE value BETWEEN $1 AND $2'
    expect((await contract(sql)).outputs[0]!.notNull).toBe(true)
    expect((await pg.query<{ verdict: string }>(sql, [0, 10])).rows).toEqual([
      { verdict: 'recorded' },
    ])

    const rollup = `SELECT CASE WHEN value IS NULL THEN NULL ELSE 'recorded' END
      FROM measured WHERE value IS NOT NULL GROUP BY ROLLUP(value)`
    expect((await contract(rollup)).outputs[0]!.notNull).toBe(false)
    expect((await pg.query<{ case: string | null }>(rollup)).rows).toContainEqual({ case: null })
  })

  it('finds the minimal rejection set of an alternative-key scalar lookup', async () => {
    const sql = `INSERT INTO scheduled (id, device_id)
      VALUES ($3, (SELECT id FROM devices WHERE id = $1 OR serial = $2))
      RETURNING id`
    const inferred = await contract(sql)
    expect(inferred.params).toEqual([
      { number: 1, notNull: false },
      { number: 2, notNull: false },
      { number: 3, notNull: true },
    ])
    expect(inferred.paramRejectionSets).toEqual([[1, 2]])

    await expect(pg.query(sql, [1, null, 10])).resolves.toMatchObject({ rows: [{ id: 10 }] })
    await expect(pg.query(sql, [null, 'MX-100', 11])).resolves.toMatchObject({ rows: [{ id: 11 }] })
    await expect(pg.query(sql, [null, null, 12])).rejects.toThrow(/null value|not-null constraint/i)

    const mixedRows = `INSERT INTO scheduled (id, device_id)
      VALUES ($2, (SELECT v FROM (VALUES ($1), (1)) AS keys(v) WHERE v = 1))
      RETURNING id`
    expect((await contract(mixedRows)).paramRejectionSets).toEqual([])
    await expect(pg.query(mixedRows, [null, 13])).resolves.toMatchObject({ rows: [{ id: 13 }] })
  })

  it('carries a proposed non-null value through both UPSERT return paths', async () => {
    const sql = `INSERT INTO result_notes (id, result_key, note)
      VALUES ($1, $2, coalesce($3::text, 'automatic'))
      ON CONFLICT (result_key) DO UPDATE SET note = EXCLUDED.note
      RETURNING note`
    expect((await contract(sql)).outputs[0]!.notNull).toBe(true)
    await expect(pg.query(sql, [2, 'inserted', null])).resolves.toMatchObject({
      rows: [{ note: 'automatic' }],
    })
    await expect(pg.query(sql, [3, 'seeded', null])).resolves.toMatchObject({
      rows: [{ note: 'automatic' }],
    })
  })
})
