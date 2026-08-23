import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";
import { readingsFor } from "./type-unions.js";

// ---------------------------------------------------------------------------
// A FROM item's alias COLUMN LIST renames the relation's columns for the
// query — `FROM stock s(k0, k1)` — and every catalog lookup behind the entry
// is keyed by the CATALOG's names, never the query's. `RelationEntry`'s own
// doc comment names the lookups that must translate: `entryColumnNotNull`,
// generation expressions, TYPE OIDS, foreign keys, check constraints.
//
// `alias-column-list-carries-facts.sql` proves the rename survives into four
// of those five. Types were the one that did not: `renderedTypeOfExpr` handed
// the QUERY's name straight to a catalog keyed under the CATALOG's, got
// nothing, and reported no claim — 8 of the 60 residue `ColumnRef`s in the
// fixture corpus (measured 2026-08-24), none of which is the derived-relation
// problem the type-resolution charter was written for.
//
// The translation already existed: `entryCatalogColumn`, three lines from the
// site that skipped it.
//
// Every expectation below carries PostgreSQL's own answer, taken from
// `pg_prepared_statements.result_types` — a walk-only assertion here would
// pin the bug as readily as the fix.
// ---------------------------------------------------------------------------

const SCHEMA = `
CREATE TABLE t (x integer NOT NULL, y numeric NOT NULL);
CREATE TABLE u (p bigint NOT NULL, q text NOT NULL, r date NOT NULL);
`;

describe("alias column lists translate for TYPES, not only for facts", () => {
  let pg: PGlite;
  let catalog: NullabilityCatalog;

  beforeAll(async () => {
    pg = await PGlite.create();
    await pg.exec(SCHEMA);
    catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
  });

  afterAll(async () => {
    await pg.close();
  });

  /** What PostgreSQL resolves each output column of `sql` to. Parse analysis
   *  only — PREPARE never executes and never plans. */
  async function pgTypes(sql: string): Promise<string[]> {
    await pg.exec(`PREPARE probe AS ${sql}`);
    const r = await pg.query<{ rt: string[] }>(
      "SELECT result_types::text[] AS rt FROM pg_prepared_statements WHERE name = 'probe'",
    );
    await pg.exec("DEALLOCATE probe");
    return r.rows[0]?.rt ?? [];
  }

  /** The single set the walk read for `expr` while analysing `sql`. */
  async function walkSet(sql: string, expr: string): Promise<string[] | null | undefined> {
    const byExpr = await readingsFor(sql, catalog);
    const rec = byExpr.get(expr);
    // A probe matching nothing must fail loudly rather than pass vacuously.
    expect(rec, `the walk read no type set for \`${expr}\` in: ${sql}`).toBeDefined();
    return rec!.sets[0];
  }

  it("reads the renamed column's catalog type", async () => {
    const sql = "SELECT s.b + 1 AS v FROM t s(a, b) WHERE s.a > 0";
    expect(await pgTypes("SELECT s.a, s.b FROM t s(a, b)")).toEqual(["integer", "numeric"]);
    expect(await walkSet(sql, "s.b")).toEqual(["numeric"]);
    expect(await walkSet(sql, "s.a")).toEqual(["integer"]);
  });

  it("follows POSITION, not name, when the list swaps two catalog names", async () => {
    // The nastiest spelling: the alias list reuses the catalog's own names in
    // the wrong order. `s.y` is the FIRST column — `t.x`, an integer — and a
    // reader that skips the translation, or applies it backwards, answers
    // `numeric` here and looks right everywhere else.
    const sql = "SELECT s.y + 1 AS v FROM t s(y, x) WHERE s.x > 0";
    expect(await pgTypes("SELECT s.y, s.x FROM t s(y, x)")).toEqual(["integer", "numeric"]);
    expect(await walkSet(sql, "s.y")).toEqual(["integer"]);
    expect(await walkSet(sql, "s.x")).toEqual(["numeric"]);
  });

  it("handles a PARTIAL list, where columns past its end keep their own names", async () => {
    const sql = "SELECT s.a + 1 AS v FROM u s(a, b) WHERE s.r > CURRENT_DATE";
    expect(await pgTypes("SELECT s.a, s.b, s.r FROM u s(a, b)")).toEqual([
      "bigint",
      "text",
      "date",
    ]);
    expect(await walkSet(sql, "s.a")).toEqual(["bigint"]);
    expect(await walkSet(sql, "s.r")).toEqual(["date"]);
  });

  it("refuses a catalog name the rename has HIDDEN", async () => {
    // PostgreSQL rejects `s.x` once the list renamed that column, so the walk
    // must make no claim rather than answer from the catalog. Refusing this
    // is as much of the translation as resolving the other direction.
    await expect(pgTypes("SELECT s.x FROM t s(a, b)")).rejects.toThrow(/column s\.x does not exist/);
    const sql = "SELECT s.b + 1 AS v FROM t s(a, b)";
    expect(await walkSet(sql, "s.b")).toEqual(["numeric"]);
  });
});
