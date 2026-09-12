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
      CHECK (CASE WHEN state IN ('empty', 'vacant')
                  THEN source_value IS NULL
                  ELSE source_value IS NOT NULL END)
    );
    INSERT INTO written_evidence (id, state, source_value) VALUES
      (1, 'ready', 'alpha'),
      (2, 'vacant', NULL),
      (3, 'ready', 'beta');

    CREATE TABLE triggered_evidence (
      id int PRIMARY KEY,
      state text NOT NULL,
      source_value text,
      display_value text GENERATED ALWAYS AS (
        CASE WHEN source_value IS NULL THEN NULL ELSE upper(source_value) END
      ) STORED,
      CHECK (CASE WHEN state = 'empty'
                  THEN source_value IS NULL
                  ELSE source_value IS NOT NULL END)
    );
    INSERT INTO triggered_evidence (id, state, source_value)
      VALUES (1, 'full', 'before');
    CREATE FUNCTION force_full_evidence() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        NEW.state := 'full';
        NEW.source_value := 'hook';
        RETURN NEW;
      END
      $$;
    CREATE TRIGGER force_full_evidence_before
      BEFORE UPDATE ON triggered_evidence
      FOR EACH ROW EXECUTE FUNCTION force_full_evidence();

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

async function execute(sql: string): Promise<Record<string, unknown>[]> {
  await pg.exec('BEGIN')
  try {
    return (await pg.query<Record<string, unknown>>(sql)).rows
  } finally {
    await pg.exec('ROLLBACK')
  }
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

  it('carries an UPDATE discriminator through a CHECK into an always-null generated column', async () => {
    const nullSql = `UPDATE written_evidence AS w
      SET state = 'empty'
      FROM (VALUES (2)) AS selected(id)
      WHERE w.id = selected.id
      RETURNING w.display_value`
    await expect(execute(nullSql)).resolves.toEqual([{ display_value: null }])
    expect((await contract(nullSql)).outputs).toEqual([
      expect.objectContaining({ notNull: false, alwaysNull: true }),
    ])
  })

  it('carries an UPDATE discriminator through a CHECK into a non-null generated column', async () => {
    const valueSql = `UPDATE written_evidence
      SET state = 'full'
      WHERE id = 1
      RETURNING display_value`
    await expect(execute(valueSql)).resolves.toEqual([{ display_value: 'ALPHA' }])
    expect((await contract(valueSql)).outputs).toEqual([expect.objectContaining({ notNull: true })])
  })

  it('keeps the OLD-row proof when the generated dependencies were not written', async () => {
    const sql = `UPDATE written_evidence
      SET state = CASE WHEN state = 'ready' THEN 'full' ELSE state END
      WHERE id = 1 AND state = 'ready'
      RETURNING display_value`
    await expect(execute(sql)).resolves.toEqual([{ display_value: 'ALPHA' }])
    expect((await contract(sql)).outputs).toEqual([expect.objectContaining({ notNull: true })])
  })

  it('intersects agreeing MERGE arms before feeding a generated column', async () => {
    const sql = `MERGE INTO written_evidence AS w
      USING (VALUES (1, true), (3, false)) AS incoming(id, first_arm)
      ON incoming.id = w.id
      WHEN MATCHED AND incoming.first_arm THEN UPDATE SET state = 'full'
      WHEN MATCHED THEN UPDATE SET state = 'full'
      RETURNING w.display_value`
    await expect(execute(sql)).resolves.toEqual([
      { display_value: 'ALPHA' },
      { display_value: 'BETA' },
    ])
    expect((await contract(sql)).outputs).toEqual([expect.objectContaining({ notNull: true })])
  })

  it('drops a written fact when MERGE arms disagree', async () => {
    const sql = `MERGE INTO written_evidence AS w
      USING (VALUES (1, true), (2, false)) AS incoming(id, has_value)
      ON incoming.id = w.id
      WHEN MATCHED AND incoming.has_value THEN UPDATE SET state = 'full'
      WHEN MATCHED THEN UPDATE SET state = 'empty'
      RETURNING w.display_value`
    await expect(execute(sql)).resolves.toEqual([
      { display_value: 'ALPHA' },
      { display_value: null },
    ])
    const output = (await contract(sql)).outputs[0]!
    expect(output.notNull).toBe(false)
    expect(output.alwaysNull ?? false).toBe(false)
  })

  it('ignores a MERGE DO NOTHING arm because it emits no row', async () => {
    const sql = `MERGE INTO written_evidence AS w
      USING (VALUES (1, true), (2, false)) AS incoming(id, do_update)
      ON incoming.id = w.id
      WHEN MATCHED AND incoming.do_update THEN UPDATE SET state = 'full'
      WHEN MATCHED THEN DO NOTHING
      RETURNING w.display_value`
    await expect(execute(sql)).resolves.toEqual([{ display_value: 'ALPHA' }])
    expect((await contract(sql)).outputs).toEqual([expect.objectContaining({ notNull: true })])
  })

  it('drops every NEW-row written fact when a MERGE DELETE arm can return OLD', async () => {
    const sql = `MERGE INTO written_evidence AS w
      USING (VALUES (1, true), (2, false)) AS incoming(id, do_update)
      ON incoming.id = w.id
      WHEN MATCHED AND incoming.do_update THEN UPDATE SET state = 'full'
      WHEN MATCHED THEN DELETE
      RETURNING w.display_value`
    await expect(execute(sql)).resolves.toEqual([
      { display_value: 'ALPHA' },
      { display_value: null },
    ])
    const output = (await contract(sql)).outputs[0]!
    expect(output.notNull).toBe(false)
    expect(output.alwaysNull ?? false).toBe(false)
  })

  it('withholds written evidence when a BEFORE trigger can replace NEW', async () => {
    const sql = `UPDATE triggered_evidence
      SET state = 'empty'
      WHERE id = 1
      RETURNING display_value`
    await expect(execute(sql)).resolves.toEqual([{ display_value: 'HOOK' }])
    const output = (await contract(sql)).outputs[0]!
    expect(output.notNull).toBe(false)
    expect(output.alwaysNull ?? false).toBe(false)
  })

  it('re-exports the generated claim through a modifying CTE', async () => {
    const sql = `WITH changed AS (
      UPDATE written_evidence
      SET state = 'empty'
      WHERE id = 2
      RETURNING display_value
    )
    SELECT display_value FROM changed`
    await expect(execute(sql)).resolves.toEqual([{ display_value: null }])
    expect((await contract(sql)).outputs).toEqual([
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
