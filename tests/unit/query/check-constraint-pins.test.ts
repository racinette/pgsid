import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import type { CatalogSnapshot } from "../../../src/catalog/types.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// Executable pins for the PostgreSQL behaviors the CHECK-entailment design
// rests on (docs/nullability-walk.md). Each names the design consequence a
// version bump would have, so a failure reads as "this assumption moved",
// not as a mystery.
// ---------------------------------------------------------------------------

let pg: PGlite;
let snapshot: CatalogSnapshot;
let catalog: NullabilityCatalog;

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`
    CREATE TABLE pinned (
      a integer,
      b integer,
      CONSTRAINT pinned_lt CHECK (a < b)
    );
    ALTER TABLE pinned ADD CONSTRAINT pinned_nv CHECK (a IS NOT NULL) NOT VALID;
    ALTER TABLE pinned ADD CONSTRAINT pinned_ne CHECK (b IS NOT NULL) NOT ENFORCED;
    CREATE TABLE rendering (
      status text NOT NULL,
      CONSTRAINT rendering_in CHECK (status IN ('a', 'b'))
    );
  `);
  snapshot = await snapshotCatalog(pg);
  catalog = await buildNullabilityCatalog(snapshot);
}, 60_000);

describe("CHECK-constraint pins", () => {
  it("a CHECK that evaluates NULL admits the row — constraints are notFALSE facts, never TRUE", async () => {
    // `a < b` is NULL for a NULL `b`, and PostgreSQL accepts the row. If a
    // version ever rejected it, CHECK constraints would become TRUE facts and
    // the entailment kernel's judgments could be strengthened; if the kernel
    // ever treats them as TRUE without this moving first, it is unsound.
    // The same insert exercises the other two negatives on their write path:
    // pinned_nv (NOT VALID) DOES gate new writes and a=1 satisfies it;
    // pinned_ne (NOT ENFORCED) never gates, so the NULL `b` sails through.
    await pg.exec(`INSERT INTO pinned (a, b) VALUES (1, NULL)`);
    const res = await pg.query<{ b: null }>(`SELECT b FROM pinned WHERE a = 1`);
    expect(res.rows).toEqual([{ b: null }]);
    await pg.exec(`DELETE FROM pinned WHERE a = 1`);
  });

  it("convalidated=false covers BOTH NOT VALID and NOT ENFORCED — the one flag the engine gates on", () => {
    // NOT VALID: existing rows were never scanned. NOT ENFORCED (PG18): rows
    // are never checked at all. Both must arrive as validated=false, because
    // resolveCheckConstraints excludes exactly !validated — if either
    // rendering ever reported validated=true, the engine would consume a
    // constraint stored rows can violate.
    const pinned = snapshot.tables.find(t => t.name === "pinned")!;
    const byName = new Map(pinned.constraints.map(c => [c.name, c]));
    expect(byName.get("pinned_lt")!.validated).toBe(true);
    expect(byName.get("pinned_nv")!.validated).toBe(false);
    expect(byName.get("pinned_ne")!.validated).toBe(false);
    expect(byName.get("pinned_nv")!.definition).toContain("NOT VALID");
    expect(byName.get("pinned_ne")!.definition).toContain("NOT ENFORCED");
  });

  it("the adapter exposes only the validated CHECK expressions", () => {
    // One validated CHECK on `pinned`; the NOT VALID and NOT ENFORCED ones
    // must not appear however goal-deriving their expressions are.
    expect(catalog.resolveCheckConstraints("public", "pinned")).toHaveLength(1);
  });

  it("PG18 'n' NOT NULL constraint rows masquerade as type 'check' and the parsed-contype filter drops them", () => {
    // mapConstraintType has no branch for contype 'n' (PG18 catalogs NOT NULL
    // as a real pg_constraint row), so the snapshot records it as "check"
    // with definition `NOT NULL status`. The adapter filters by the PARSED
    // node type (CONSTR_CHECK), which is what keeps these out of the
    // expression list — if this pin fails, either the snapshot mapping grew a
    // proper type (adjust the adapter's filter) or NOT NULL rows started
    // parsing as CHECK (they must not reach the kernel).
    const rendering = snapshot.tables.find(t => t.name === "rendering")!;
    const notNullRow = rendering.constraints.find(c => c.definition.startsWith("NOT NULL"));
    expect(notNullRow?.type).toBe("check");
    expect(notNullRow?.validated).toBe(true);
    expect(catalog.resolveCheckConstraints("public", "rendering")).toHaveLength(1);
  });

  it("the deparser annotates literals with casts and rewrites IN as = ANY — the shapes the kernel matches", () => {
    // The kernel's literal matching equates a bare WHERE literal with the
    // rendered `'lit'::type` only when the cast names the column's own type,
    // and decomposes `= ANY (ARRAY[...])` as an OR of equalities. Both rest
    // on these renderings staying put.
    const rendering = snapshot.tables.find(t => t.name === "rendering")!;
    const inCheck = rendering.constraints.find(c => c.name === "rendering_in")!;
    expect(inCheck.definition).toBe(
      "CHECK ((status = ANY (ARRAY['a'::text, 'b'::text])))",
    );
  });
});
