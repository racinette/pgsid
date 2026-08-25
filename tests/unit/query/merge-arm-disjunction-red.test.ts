import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import { createKillableEvaluator, type KillableEvaluator } from "./killable-evaluator.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The RED SUITE for a MERGE arm's OWN condition.
//
// A returned row was produced by exactly one ROW-PRODUCING arm, and an arm
// fires only when its match kind holds AND its condition is TRUE. So every
// returned row satisfies the DISJUNCTION of the row-producing arms'
// conditions — an or-fact the entailment kernel has held for a while, with
// no producer reading MERGE arms. This is that producer.
//
// It is a DISJUNCTION and not a conjunction, so it proves a column non-null
// only when EVERY arm's condition does — `predicateProvesNonNull`'s OR rule
// and `colKnownNonNull`'s intersection rule are the same argument twice.
//
// Two guards, both measured against PostgreSQL before the fact was written:
//
//   * An arm with NO condition fires unconditionally, so the disjunction
//     contains TRUE and carries nothing. Measured: the same statement with
//     one arm's `AND` removed returns a NULL.
//   * A MATCHED arm's condition tested the OLD row while RETURNING reports
//     the NEW one. Measured: `WHEN MATCHED AND t.a > 0 THEN UPDATE SET
//     a = NULL RETURNING t.a` returns NULL. The SET mask is not optional.
//
// PostgreSQL also enforces the separation this fact relies on: a NOT MATCHED
// condition cannot reference the target ("invalid reference to FROM-clause
// entry"), and a NOT MATCHED BY SOURCE condition cannot reference the source.
//
// Every target is adjudicated by RUNNING the MERGE. A nullable claim that no
// row witnesses is not a control, so each one below is paired with the rows
// that falsify its opposite.
// ---------------------------------------------------------------------------

const DDL = `
  CREATE TABLE atgt (id integer PRIMARY KEY, a integer, v text);
  CREATE TABLE asrc (id integer, tag text, n integer);`;

/** id 1/2/5 match; id 9 is a target orphan; source 3/4 are unmatched.
 *  Row 2 carries a NULL tag AND a NULL n on a MATCHED row, row 5 a NULL n
 *  under a target-side condition — the two shapes the controls need. */
const ROWS = `
  DELETE FROM atgt; DELETE FROM asrc;
  INSERT INTO atgt (id, a, v) VALUES (1, 10, 'old'), (2, NULL, 'old2'), (5, 3, 'old5'), (9, 5, 'orphan');
  INSERT INTO asrc (id, tag, n) VALUES (1, 'aa', 7), (2, NULL, NULL), (3, 'bb', 8), (4, NULL, NULL), (5, 'cc', NULL);`;

let pg: PGlite;
let catalog: NullabilityCatalog;
let evaluator: KillableEvaluator;

/** The engine's claims, by output column name. */
async function claims(sql: string): Promise<Record<string, boolean>> {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const cols = await inferNullability(stmt, catalog, { evaluate: evaluator.evaluate });
  return Object.fromEntries(cols.map(c => [c.name, c.notNull]));
}

/** What PostgreSQL actually returns, rolled back so the next case sees the
 *  same rows. The oracle for every claim below. */
async function rows(sql: string): Promise<Record<string, unknown>[]> {
  await pg.exec("BEGIN;");
  try {
    await pg.exec(ROWS);
    return (await pg.query<Record<string, unknown>>(sql)).rows;
  } finally {
    await pg.exec("ROLLBACK;");
  }
}

const anyNull = (rs: Record<string, unknown>[], col: string): boolean =>
  rs.some(r => r[col] === null);

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(DDL);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), { searchPath: ["public"] });
  evaluator = await createKillableEvaluator({ schema: DDL });
}, 120_000);

afterAll(async () => {
  await evaluator?.close();
  await pg?.close();
});

describe("a MERGE arm's own condition is row-implied as a disjunction", () => {
  it("proves a source column non-null when EVERY producing arm's condition does", async () => {
    const sql = `
      MERGE INTO atgt t USING asrc s ON t.id = s.id
      WHEN MATCHED AND s.tag > 'a' THEN UPDATE SET v = 'x'
      WHEN NOT MATCHED AND s.tag < 'z' THEN INSERT (id) VALUES (s.id)
      RETURNING s.tag AS tag`;
    const rs = await rows(sql);
    expect(rs.length, "the oracle must return rows for this to mean anything").toBeGreaterThan(0);
    expect(anyNull(rs, "tag"), "PostgreSQL returns no NULL tag").toBe(false);
    expect((await claims(sql))["tag"]).toBe(true);
  });

  it("CONTROL: one arm without a condition fires unconditionally and carries nothing", async () => {
    const sql = `
      MERGE INTO atgt t USING asrc s ON t.id = s.id
      WHEN MATCHED AND s.tag > 'a' THEN UPDATE SET v = 'x'
      WHEN NOT MATCHED THEN INSERT (id) VALUES (s.id)
      RETURNING s.tag AS tag`;
    const rs = await rows(sql);
    expect(anyNull(rs, "tag"), "the unconditioned arm returns a NULL tag").toBe(true);
    expect((await claims(sql))["tag"]).toBe(false);
  });

  it("a DO NOTHING arm produces no row, so its missing condition does not block", async () => {
    // Composes with the arm-KIND fix: the BY SOURCE arm writes nothing, so it
    // neither makes the source optional nor joins the disjunction.
    const sql = `
      MERGE INTO atgt t USING asrc s ON t.id = s.id
      WHEN MATCHED AND s.tag > 'a' THEN UPDATE SET v = 'x'
      WHEN NOT MATCHED AND s.tag < 'z' THEN INSERT (id) VALUES (s.id)
      WHEN NOT MATCHED BY SOURCE THEN DO NOTHING
      RETURNING s.tag AS tag`;
    const rs = await rows(sql);
    expect(anyNull(rs, "tag")).toBe(false);
    expect((await claims(sql))["tag"]).toBe(true);
  });

  it("a single producing arm's condition held outright", async () => {
    const sql = `
      MERGE INTO atgt t USING asrc s ON t.id = s.id
      WHEN MATCHED AND s.n > 0 THEN UPDATE SET v = 'x'
      RETURNING s.n AS n`;
    const rs = await rows(sql);
    expect(rs.length).toBeGreaterThan(0);
    expect(anyNull(rs, "n")).toBe(false);
    expect((await claims(sql))["n"]).toBe(true);
  });

  it("GUARD: the condition tested the OLD row, so a SET column is masked", async () => {
    const sql = `
      MERGE INTO atgt t USING asrc s ON t.id = s.id
      WHEN MATCHED AND t.a > 0 THEN UPDATE SET a = NULL
      RETURNING t.a AS a`;
    const rs = await rows(sql);
    expect(anyNull(rs, "a"), "every returned row has the NEW, nulled value").toBe(true);
    expect((await claims(sql))["a"]).toBe(false);
  });

  it("GUARD: arms constraining DIFFERENT columns prove neither", async () => {
    const sql = `
      MERGE INTO atgt t USING asrc s ON t.id = s.id
      WHEN MATCHED AND t.a > 0 THEN UPDATE SET v = 'x'
      WHEN NOT MATCHED AND s.n > 0 THEN INSERT (id) VALUES (s.id)
      RETURNING t.a AS a, s.n AS n`;
    const rs = await rows(sql);
    expect(anyNull(rs, "a"), "an inserted row has no a").toBe(true);
    expect(anyNull(rs, "n"), "a target-side condition admits a NULL n").toBe(true);
    const c = await claims(sql);
    expect(c["a"]).toBe(false);
    expect(c["n"]).toBe(false);
  });
});
