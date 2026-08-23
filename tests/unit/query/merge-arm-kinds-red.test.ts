import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import { createKillableEvaluator, type KillableEvaluator } from "./killable-evaluator.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The RED SUITE for a MERGE arm that WRITES NOTHING.
//
// `buildMergeScope` reads two facts off the arm list, and both were decided on
// `matchKind` alone while `commandType` sat on the same object:
//
//   * `hasBySource` — any NOT MATCHED BY SOURCE arm makes the SOURCE optional,
//     because such an arm returns a target row with every source column NULL.
//   * `allMatched`  — the join condition is row-implied evidence only if every
//     arm is MATCHED-kind, because a NOT MATCHED arm fires precisely when the
//     condition fails.
//
// Both arguments are about ROWS THAT COME BACK, and `DO NOTHING` produces
// none. An arm that writes nothing cannot carry a counterexample to either.
// `docs/deferred-tasks.md` recorded the gap as "per-arm reasoning judged not
// worth it" — but the engine already reasons per-arm in
// `returningRejectedParams`, which intersects over the paths that can produce
// a row and says of ON CONFLICT that "DO NOTHING returns no row for a
// conflict and stands alone". This is that same fact, one statement over.
//
// Every target is adjudicated against PostgreSQL by RUNNING the MERGE, with
// the row-producing spelling of the same arm as its control — the control is
// what makes each a discriminating claim rather than a blanket widening.
// ---------------------------------------------------------------------------

const DDL = `
  CREATE TABLE mtgt (id integer PRIMARY KEY, code text, v text);
  CREATE TABLE msrc (id integer, code text, k text NOT NULL, v text);`;

/** id 1 matches; id 9 is a target orphan (no source); source id 2 is an
 *  unmatched source row. One state exercises all three arm kinds. */
const ROWS = `
  DELETE FROM mtgt; DELETE FROM msrc;
  INSERT INTO mtgt (id, code, v) VALUES (1, 'c1', 'old'), (9, 'c9', 'orphan');
  INSERT INTO msrc (id, code, k, v) VALUES (1, 'c1', 'k1', 'new'), (2, NULL, 'k2', 'ins');`;

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

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(DDL);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), { searchPath: ["public"] });
  evaluator = await createKillableEvaluator({ schema: DDL });
}, 120_000);

afterAll(async () => {
  await evaluator?.close();
  if (pg && !pg.closed) await pg.close();
});

// --- The join-condition half. `t.code` is nullable in the catalog and the
// join condition is a strict comparison over it, so every MATCHED row has it
// non-null. An INSERT arm can return a row that never satisfied the
// condition; a DO NOTHING arm cannot return anything at all.

const NOTHING_JOIN = `MERGE INTO mtgt t USING msrc s ON t.code = s.code
  WHEN MATCHED THEN UPDATE SET v = s.v
  WHEN NOT MATCHED THEN DO NOTHING
RETURNING t.code AS tc`;

const INSERT_JOIN = `MERGE INTO mtgt t USING msrc s ON t.code = s.code
  WHEN MATCHED THEN UPDATE SET v = s.v
  WHEN NOT MATCHED THEN INSERT (id, code) VALUES (s.id, s.code)
RETURNING t.code AS tc`;

// --- The source half. `s.k` is NOT NULL in the catalog; only an arm that
// RETURNS a target row with no source match can make it NULL.

const NOTHING_SOURCE = `MERGE INTO mtgt t USING msrc s ON t.id = s.id
  WHEN MATCHED THEN UPDATE SET v = s.v
  WHEN NOT MATCHED BY SOURCE THEN DO NOTHING
RETURNING s.k AS sk`;

const DELETE_SOURCE = `MERGE INTO mtgt t USING msrc s ON t.id = s.id
  WHEN MATCHED THEN UPDATE SET v = s.v
  WHEN NOT MATCHED BY SOURCE THEN DELETE
RETURNING s.k AS sk`;

// --- The two halves are INDEPENDENT, and this is what says so: a dead BY
// SOURCE arm beside a LIVE unmatched INSERT. The source may not be
// null-extended (nothing returns a source-less row), and the join condition
// is still not implied (the INSERT arm returns rows that failed it).

const MIXED = `MERGE INTO mtgt t USING msrc s ON t.code = s.code
  WHEN MATCHED THEN UPDATE SET v = s.v
  WHEN NOT MATCHED THEN INSERT (id, code) VALUES (s.id, s.code)
  WHEN NOT MATCHED BY SOURCE THEN DO NOTHING
RETURNING t.code AS tc, s.k AS sk`;

describe("MERGE arm kinds — the premise", () => {
  it("a DO NOTHING arm returns no row, and its live twin does", async () => {
    // The join half. The unmatched source row (code NULL) comes back only
    // when the arm actually inserts, and it brings the NULL with it.
    expect(await rows(NOTHING_JOIN)).toEqual([{ tc: "c1" }]);
    expect(await rows(INSERT_JOIN)).toEqual([{ tc: "c1" }, { tc: null }]);
  });

  it("and the same on the BY SOURCE side", async () => {
    // The orphan target row (id 9) is visited by both spellings; only the
    // DELETE returns it, and only then is a source column NULL.
    expect(await rows(NOTHING_SOURCE)).toEqual([{ sk: "k1" }]);
    expect(await rows(DELETE_SOURCE)).toEqual([{ sk: "k1" }, { sk: null }]);
  });

  it("the mixed statement returns the unmatched row and no orphan", async () => {
    expect(await rows(MIXED)).toEqual([
      { tc: "c1", sk: "k1" },
      { tc: null, sk: "k2" },
    ]);
  });
});

describe("MERGE arm kinds — targets", () => {
  // FLIPPED from `it.fails` by the `producing` filter in `buildMergeScope`.
  // These stay rather than moving wholesale into the corpus: each claim is
  // paired here with the ROW SHAPE PostgreSQL returns for the same statement,
  // and it is that pairing — not the claim — that says why the arm may be
  // ignored. `merge-arm-do-nothing.sql` carries the corpus half.
  it("a NOT MATCHED DO NOTHING arm leaves the join condition implied", async () => {
    expect((await claims(NOTHING_JOIN))["tc"]).toBe(true);
  });

  it("a BY SOURCE DO NOTHING arm cannot null-extend the source", async () => {
    // This claim is TRUE and does not isolate the reading that makes it true.
    // Mutating `hasBySource` back to `matchKind` alone leaves it GREEN,
    // because the only producing arm here is MATCHED-kind — so `allMatched`
    // fires, the join condition `t.id = s.id` becomes row-implied, and the
    // presence fixpoint promotes the source anyway. The discriminating case
    // is MIXED below, where a live INSERT arm denies `allMatched` and only
    // the source reading is left to answer.
    expect((await claims(NOTHING_SOURCE))["sk"]).toBe(true);
  });

  it("the two readings are independent", async () => {
    const c = await claims(MIXED);
    // The source survives its dead BY SOURCE arm...
    expect(c["sk"]).toBe(true);
    // ...while the live INSERT arm still denies the join condition.
    expect(c["tc"]).toBe(false);
  });
});

describe("MERGE arm kinds — boundary guards", () => {
  it("a live NOT MATCHED arm still denies the join condition", async () => {
    // PostgreSQL returns the NULL, so this is the database refusing the
    // widening rather than an annotation.
    expect((await claims(INSERT_JOIN))["tc"]).toBe(false);
  });

  it("a live BY SOURCE arm still makes the source optional", async () => {
    expect((await claims(DELETE_SOURCE))["sk"]).toBe(false);
  });

  it("no probe had to be killed", () => {
    expect(evaluator.killedSql).toEqual([]);
  });
});
