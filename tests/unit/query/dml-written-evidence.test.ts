import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseSql } from '../../../src/ast.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { buildNullabilityCatalog } from '../../../src/query/catalog-adapter.js'
import { inferQueryContract } from '../../../src/query/nullability-walk.js'
import type { NullabilityCatalog } from '../../../src/query/types.js'

let pg: PGlite
let catalog: NullabilityCatalog

beforeAll(async () => {
  pg = await PGlite.create()
  await pg.exec(`
    CREATE TABLE written_evidence (
      id int PRIMARY KEY,
      state text NOT NULL,
      source_value text,
      display_value text GENERATED ALWAYS AS (
        CASE WHEN source_value IS NULL THEN NULL ELSE upper(source_value) END
      ) STORED,
      CHECK (state <> 'empty' OR source_value IS NULL)
    );
    CREATE TABLE constructed_names (
      name text NOT NULL,
      CHECK (name <> '')
    );
  `)
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg))
})

afterAll(async () => {
  if (!pg.closed) await pg.close()
})

async function contract(sql: string) {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!
  const evaluate = async (query: string) => (await pg.query<Record<string, unknown>>(query)).rows[0]
  return inferQueryContract(stmt, catalog, { evaluate })
}

describe('DML written-value evidence', () => {
  it('carries an INSERT discriminator through a CHECK into a generated RETURNING column', async () => {
    const inferred = await contract(
      "INSERT INTO written_evidence (id, state) VALUES (1, 'empty') RETURNING display_value",
    )
    expect(inferred.outputs).toEqual([
      expect.objectContaining({ notNull: false, alwaysNull: true }),
    ])
  })

  it('finds joint rejection through trim(concat_ws()) and an empty-name CHECK', async () => {
    const inferred = await contract(
      "INSERT INTO constructed_names VALUES (trim(concat_ws(' ', $1::text, $2::text))) RETURNING name",
    )
    expect(inferred.params).toEqual([
      { number: 1, notNull: false },
      { number: 2, notNull: false },
    ])
    expect(inferred.paramRejectionSets).toEqual([[1, 2]])
  })
})
