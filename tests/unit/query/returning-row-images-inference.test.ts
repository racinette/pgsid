import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { parseSql } from '../../../src/ast.js'
import { snapshotCatalog } from '../../../src/catalog/snapshot.js'
import { buildNullabilityCatalog } from '../../../src/query/catalog-adapter.js'
import { inferNullabilityTraced, inferQueryContract } from '../../../src/query/nullability-walk.js'
import type { NullabilityCatalog } from '../../../src/query/types.js'

describe('PG18 RETURNING old/new row images', () => {
  let pg: PGlite
  let catalog: NullabilityCatalog

  beforeAll(async () => {
    pg = new PGlite()
    await pg.exec(`
      CREATE TABLE image_rows (
        id int PRIMARY KEY,
        state text NOT NULL,
        note text,
        spare text,
        CHECK (state <> 'ready' OR note IS NOT NULL)
      );
      INSERT INTO image_rows VALUES
        (1, 'draft', NULL, NULL),
        (2, 'ready', 'stored', NULL);
      CREATE TABLE image_lots (
        id int PRIMARY KEY,
        state text NOT NULL,
        on_hand int NOT NULL,
        reserved int NOT NULL,
        depleted_at timestamptz,
        marker text GENERATED ALWAYS AS (
          CASE WHEN depleted_at IS NULL THEN state ELSE NULL END
        ) STORED,
        CHECK (CASE state
          WHEN 'available' THEN depleted_at IS NULL AND on_hand > reserved
          ELSE NULL
        END)
      );
      INSERT INTO image_lots VALUES (1, 'available', 5, 1, NULL);
      CREATE TABLE image_part (
        id int PRIMARY KEY,
        state text NOT NULL,
        note text
      ) PARTITION BY RANGE (id);
      CREATE TABLE image_part_low PARTITION OF image_part FOR VALUES FROM (0) TO (100);
      CREATE TABLE image_part_high PARTITION OF image_part FOR VALUES FROM (100) TO (200);
      INSERT INTO image_part VALUES (1, 'draft', NULL);
      CREATE TABLE image_names (id int PRIMARY KEY, old int, new int);
      INSERT INTO image_names VALUES (1, NULL, 7);
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

  async function execute(sql: string): Promise<unknown[][]> {
    await pg.exec('BEGIN')
    try {
      return (await pg.query(sql, [], { rowMode: 'array' })).rows as unknown[][]
    } finally {
      await pg.exec('ROLLBACK')
    }
  }

  it('keeps an INSERT old star in shape and resolves renamed new scalars', async () => {
    const sql = `INSERT INTO image_rows (id, state, note)
      VALUES (3, 'ready', 'inserted')
      RETURNING WITH (OLD AS absent, NEW AS placed)
        absent.*, placed.id, placed.note`
    const inferred = await contract(sql)
    expect(inferred.outputs.map((output) => [output.notNull, output.alwaysNull ?? false])).toEqual([
      [false, true],
      [false, true],
      [false, true],
      [false, true],
      [true, false],
      [true, false],
    ])
    await expect(execute(sql)).resolves.toEqual([[null, null, null, null, 3, 'inserted']])
  })

  it('treats an upsert old image as present only on the conflict path', async () => {
    const sql = `INSERT INTO image_rows (id, state, note)
      VALUES (1, 'ready', 'updated'), (3, 'ready', 'inserted')
      ON CONFLICT (id) DO UPDATE SET state = excluded.state, note = excluded.note
      RETURNING WITH (OLD AS before, NEW AS after)
        before.id, before.state, after.id, after.state`
    const inferred = await contract(sql)
    expect(inferred.outputs.map((output) => [output.notNull, output.alwaysNull ?? false])).toEqual([
      [false, false],
      [false, false],
      [true, false],
      [true, false],
    ])
    expect(inferred.outputPresenceGroups).toEqual([{ columns: [0, 1], discriminants: [0, 1] }])
    const stmt = (await parseSql(sql)).stmts![0]!.stmt!
    expect(
      (await inferNullabilityTraced(stmt, catalog)).map((output) => [
        output.notNull,
        output.alwaysNull ?? false,
      ]),
    ).toEqual(inferred.outputs.map((output) => [output.notNull, output.alwaysNull ?? false]))
    await expect(execute(sql)).resolves.toEqual([
      [1, 'draft', 1, 'ready'],
      [null, null, 3, 'ready'],
    ])
  })

  it('keeps UPDATE written-value facts directional', async () => {
    const sql = `UPDATE image_rows AS r
      SET state = 'ready', note = coalesce(r.note, 'filled')
      WHERE r.id = 1
      RETURNING WITH (OLD AS before, NEW AS after)
        before.id, before.note, after.note, before.spare, after.spare`
    expect((await contract(sql)).outputs.map((output) => output.notNull)).toEqual([
      true,
      false,
      true,
      false,
      false,
    ])
    await expect(execute(sql)).resolves.toEqual([[1, null, 'filled', null, null]])
  })

  it('does not carry an old-row predicate into a nullable new value', async () => {
    const sql = `UPDATE image_rows AS r
      SET state = 'draft', note = r.spare
      WHERE r.id = 2 AND r.note IS NOT NULL
      RETURNING WITH (OLD AS before, NEW AS after) before.note, after.note`
    expect((await contract(sql)).outputs.map((output) => output.notNull)).toEqual([true, false])
    await expect(execute(sql)).resolves.toEqual([['stored', null]])
  })

  it('carries unchanged CHECK facts into a recomputed new generated column', async () => {
    const sql = `UPDATE image_lots AS l
      SET on_hand = l.on_hand + 1
      WHERE l.state = 'available'
      RETURNING WITH (OLD AS before, NEW AS after) before.marker, after.marker`
    expect((await contract(sql)).outputs.map((output) => output.notNull)).toEqual([true, true])
    await expect(execute(sql)).resolves.toEqual([['available', 'available']])
  })

  it('keeps a DELETE new image in shape as always NULL', async () => {
    const sql = `DELETE FROM image_rows AS r WHERE r.id = 2
      RETURNING WITH (OLD AS removed, NEW AS absent)
        removed.id, removed.note, absent.*`
    const inferred = await contract(sql)
    expect(inferred.outputs.map((output) => [output.notNull, output.alwaysNull ?? false])).toEqual([
      [true, false],
      [false, false],
      [false, true],
      [false, true],
      [false, true],
      [false, true],
    ])
    await expect(execute(sql)).resolves.toEqual([[2, 'stored', null, null, null, null]])
  })

  it('models whole-row image values, including an absent composite', async () => {
    const sql = `INSERT INTO image_rows (id, state, note)
      VALUES (3, 'ready', 'inserted')
      RETURNING old AS before_row, new AS after_row`
    const inferred = await contract(sql)
    expect(inferred.outputs.map((output) => [output.notNull, output.alwaysNull ?? false])).toEqual([
      [false, true],
      [true, false],
    ])
    const rows = await execute(sql)
    expect(rows[0]![0]).toBeNull()
    expect(rows[0]![1]).not.toBeNull()
  })

  it('preserves row-image facts through an explicitly renamed CTE output list', async () => {
    const sql = `WITH changed (before_id, after_id) AS (
      INSERT INTO image_rows (id, state, note)
      VALUES (3, 'ready', 'inserted')
      RETURNING old.id, new.id
    )
    SELECT changed.* FROM changed`
    const inferred = await contract(sql)
    expect(inferred.outputs.map((output) => [output.notNull, output.alwaysNull ?? false])).toEqual([
      [false, true],
      [true, false],
    ])
    await expect(execute(sql)).resolves.toEqual([[null, 3]])
  })

  it('lets a real target alias shadow a default row-image name', async () => {
    const insert = `INSERT INTO image_rows AS old (id, state, note)
      VALUES (3, 'ready', 'inserted')
      RETURNING old.id, new.id`
    expect((await contract(insert)).outputs.map((output) => output.notNull)).toEqual([true, true])
    await expect(execute(insert)).resolves.toEqual([[3, 3]])

    const del = `DELETE FROM image_rows AS new WHERE new.id = 2
      RETURNING old.id, new.id`
    expect((await contract(del)).outputs.map((output) => output.notNull)).toEqual([true, true])
    await expect(execute(del)).resolves.toEqual([[2, 2]])
  })

  it('lets correlated columns shadow whole-row image names', async () => {
    const sql = `UPDATE image_names SET id = id WHERE id = 1
      RETURNING (SELECT old), (SELECT new)`
    const inferred = await contract(sql)
    expect(inferred.outputs.map((output) => [output.notNull, output.alwaysNull ?? false])).toEqual([
      [false, false],
      [false, false],
    ])
    await expect(execute(sql)).resolves.toEqual([[null, 7]])
  })

  it('keeps row-image semantics on routed partition INSERT and UPSERT', async () => {
    const insert = `INSERT INTO image_part (id, state, note)
      VALUES (2, 'ready', 'two'), (3, 'draft', NULL)
      RETURNING old.id, new.id`
    expect(
      (await contract(insert)).outputs.map((output) => [
        output.notNull,
        output.alwaysNull ?? false,
      ]),
    ).toEqual([
      [false, true],
      [true, false],
    ])
    await expect(execute(insert)).resolves.toEqual([
      [null, 2],
      [null, 3],
    ])

    const upsert = `INSERT INTO image_part (id, state, note)
      VALUES (1, 'ready', 'one'), (4, 'ready', 'four')
      ON CONFLICT (id) DO UPDATE SET state = excluded.state, note = excluded.note
      RETURNING old.id, new.id`
    expect((await contract(upsert)).outputs.map((output) => output.notNull)).toEqual([false, true])
    await expect(execute(upsert)).resolves.toEqual([
      [1, 1],
      [null, 4],
    ])
  })

  it('keeps row images across partition row movement and DELETE', async () => {
    const update = `UPDATE image_part SET id = id + 100, note = 'moved' WHERE id = 1
      RETURNING old.id, old.note, new.id, new.note`
    expect((await contract(update)).outputs.map((output) => output.notNull)).toEqual([
      true,
      false,
      true,
      true,
    ])
    await expect(execute(update)).resolves.toEqual([[1, null, 101, 'moved']])

    const del = `DELETE FROM image_part WHERE id = 1 RETURNING old.id, new.id`
    expect(
      (await contract(del)).outputs.map((output) => [output.notNull, output.alwaysNull ?? false]),
    ).toEqual([
      [true, false],
      [false, true],
    ])
    await expect(execute(del)).resolves.toEqual([[1, null]])
  })

  it('keeps optional MERGE images when a matched row moves partitions', async () => {
    const sql = `MERGE INTO image_part AS p
      USING (VALUES (1, 'one'::text), (4, 'four'::text)) AS s(id, note)
      ON p.id = s.id
      WHEN MATCHED THEN UPDATE SET id = p.id + 100, state = 'ready', note = s.note
      WHEN NOT MATCHED THEN INSERT (id, state, note) VALUES (s.id, 'ready', s.note)
      RETURNING merge_action(), old.id, new.id`
    const inferred = await contract(sql)
    expect(inferred.outputs.map((output) => output.notNull)).toEqual([true, false, true])
    expect(inferred.outputPresenceGroups).toEqual([])
    await expect(execute(sql)).resolves.toEqual([
      ['UPDATE', 1, 101],
      ['INSERT', null, 4],
    ])
  })

  it('separates MERGE old, new, and source presence units by action', async () => {
    const sql = `MERGE INTO image_rows AS r
      USING (VALUES (1, 'updated'::text), (3, 'inserted'::text)) AS s(id, note)
      ON r.id = s.id
      WHEN MATCHED THEN UPDATE SET state = 'ready', note = s.note
      WHEN NOT MATCHED BY TARGET THEN
        INSERT (id, state, note) VALUES (s.id, 'ready', s.note)
      WHEN NOT MATCHED BY SOURCE THEN DELETE
      RETURNING WITH (OLD AS before, NEW AS after)
        merge_action(), before.id, before.state, after.id, after.state, s.id, s.note`
    const inferred = await contract(sql)
    expect(inferred.outputs.map((output) => output.notNull)).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ])
    expect(inferred.outputPresenceGroups).toEqual([
      { columns: [1, 2], discriminants: [1, 2] },
      { columns: [3, 4], discriminants: [3, 4] },
      { columns: [5, 6], discriminants: [5, 6] },
    ])
    expect((await execute(sql)).sort((a, b) => String(a[0]).localeCompare(String(b[0])))).toEqual([
      ['DELETE', 2, 'ready', null, null, null, null],
      ['INSERT', null, null, 3, 'ready', 3, 'inserted'],
      ['UPDATE', 1, 'draft', 1, 'ready', 1, 'updated'],
    ])
  })

  it('treats an old/new rename as replacement rather than an extra alias', async () => {
    const sql = `UPDATE image_rows SET note = 'x' WHERE id = 1
      RETURNING WITH (OLD AS before) old.id`
    await expect(execute(sql)).rejects.toThrow(/missing FROM-clause entry|does not exist/i)
  })

  it('leaves colliding explicit row-image aliases to PostgreSQL rejection', async () => {
    const targetCollision = `UPDATE image_rows AS before SET note = 'x' WHERE id = 1
      RETURNING WITH (OLD AS before) before.id`
    await expect(execute(targetCollision)).rejects.toThrow(/specified more than once|duplicate/i)

    const imageCollision = `UPDATE image_rows SET note = 'x' WHERE id = 1
      RETURNING WITH (OLD AS same, NEW AS same) same.id`
    await expect(execute(imageCollision)).rejects.toThrow(/specified more than once|duplicate/i)
  })
})
