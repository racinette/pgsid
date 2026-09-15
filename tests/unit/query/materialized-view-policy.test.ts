import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseSql } from '../../../src/ast.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { buildNullabilityCatalog } from '../../../src/query/catalog-adapter.js'
import { inferNullability } from '../../../src/query/nullability-walk.js'

describe('materialized-view nullability policy', () => {
  let pg: PGlite
  let catalog: Awaited<ReturnType<typeof buildNullabilityCatalog>>

  beforeAll(async () => {
    pg = await PGlite.create()
    await pg.exec(`
      CREATE TABLE stale_source (payload jsonb);
      INSERT INTO stale_source VALUES (NULL);
      CREATE MATERIALIZED VIEW stale_one AS SELECT payload FROM stale_source;
      CREATE MATERIALIZED VIEW stale_two AS SELECT payload FROM stale_source;
      DELETE FROM stale_source;
      ALTER TABLE stale_source ALTER COLUMN payload SET NOT NULL;
      CREATE VIEW current_rows AS SELECT payload FROM stale_source;
    `)
    catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), {
      searchPath: ['public'],
    })
  })

  afterAll(async () => {
    if (!pg.closed) await pg.close()
  })

  const statement = async (sql: string) => (await parseSql(sql)).stmts![0]!.stmt!

  it('materialized views use their current definitions by default', async () => {
    expect(await pg.query('SELECT payload FROM stale_one')).toMatchObject({
      rows: [{ payload: null }],
    })
    const outputs = await inferNullability(
      await statement('SELECT payload FROM stale_one'),
      catalog,
    )
    expect(outputs.map((output) => output.notNull)).toEqual([true])
  })

  it('a relation override can stop nullability at one materialized view', async () => {
    const outputs = await inferNullability(
      await statement('SELECT a.payload, b.payload FROM stale_one a, stale_two b'),
      catalog,
      {
        materializedViews: {
          default: 'definition',
          overrides: { 'public.stale_one': 'conservative' },
        },
      },
    )
    expect(outputs.map((output) => output.notNull)).toEqual([false, true])
  })

  it('a relation override wins over a conservative global default', async () => {
    const outputs = await inferNullability(
      await statement('SELECT a.payload, b.payload FROM stale_one a, stale_two b'),
      catalog,
      {
        materializedViews: {
          default: 'conservative',
          overrides: { 'public.stale_two': 'definition' },
        },
      },
    )
    expect(outputs.map((output) => output.notNull)).toEqual([false, true])
  })

  it('a conservative materialized-view default does not affect ordinary views', async () => {
    const outputs = await inferNullability(
      await statement('SELECT payload FROM current_rows'),
      catalog,
      {
        materializedViews: { default: 'conservative' },
      },
    )
    expect(outputs.map((output) => output.notNull)).toEqual([true])
  })
})
