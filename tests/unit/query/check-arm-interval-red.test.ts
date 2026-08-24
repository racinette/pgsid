import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// RED SUITE (graduated): selecting a CHECK's CASE arm by interval
// CONTAINMENT.
//
// The gap (found 2026-08-24, by a maintainer question): arm selection inside
// a CHECK's CASE was EQUALITY-shaped — `WHERE status = 'housed'` selects its
// arm (check-case-discriminator-notnull.sql) — while the ORDER theory the
// interval kernel already owned was wired to disjointness alone (the
// exclusivity rung), never to implication. So `WHERE a >= 4` did not select
// the `a >= 3` arm, though [4,∞) ⊆ [3,∞) is order bookkeeping over the
// same anchors the exclusivity rung already evaluates.
//
// Both targets graduated 2026-08-24, the same day they were captured:
// `intervalImplied` in the kernel (membership transport over
// `shapesContained`), corpus fixture check-arm-interval-containment.sql.
//
// Adjudicated against PostgreSQL before writing (the red-suite bar): every
// stored row with a >= 4 satisfied the CHECK's a >= 3 arm at write time, so
// `o IS NOT NULL` was enforced on it — no returned row can carry a NULL o.
// The guards below pin the boundaries the mechanism must NOT cross: an arm
// whose interval merely OVERLAPS the WHERE's proves nothing, and a text
// column under an explicit collation stays refused (the kernel's collation
// gate owns order there — ivstxc's own fixtures).
// ---------------------------------------------------------------------------

let pg: PGlite;
let catalog: NullabilityCatalog;

const SCHEMA = `
  CREATE TABLE cai (
    a integer NOT NULL,
    o text,
    CHECK (CASE WHEN a >= 3 THEN o IS NOT NULL ELSE o IS NULL END)
  );
  CREATE TABLE step (
    a integer NOT NULL,
    o text,
    CHECK (CASE WHEN a > 5 THEN o IS NULL ELSE o IS NOT NULL END)
  );
  CREATE TABLE cais (
    s text NOT NULL,
    o text,
    CHECK (CASE WHEN s >= 'm' THEN o IS NOT NULL ELSE o IS NULL END)
  );
  CREATE TABLE caic (
    s text COLLATE "C" NOT NULL,
    o text,
    CHECK (CASE WHEN s >= 'm' THEN o IS NOT NULL ELSE o IS NULL END)
  );
`;

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(SCHEMA);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
}, 60_000);

afterAll(async () => {
  if (!pg.closed) await pg.close();
});

async function verdict(sql: string): Promise<"notNull" | "nullable"> {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const evaluate = async (s: string) =>
    (await pg.query<Record<string, unknown>>(s)).rows[0];
  const cols = await inferNullability(stmt, catalog, { evaluate });
  return cols[0]!.notNull ? "notNull" : "nullable";
}

describe("CHECK-CASE arm selection by interval containment", () => {
  it("an integer WHERE interval contained in the arm's selects it", async () => {
    // PostgreSQL: every row with a >= 4 was CHECK-enforced through the
    // a >= 3 arm, so o IS NOT NULL on all of them.
    expect(await verdict("SELECT o FROM cai WHERE a >= 4")).toBe("notNull");
  });

  it("guard: the arm's IDENTICAL comparison already selects it", async () => {
    // The existing mechanism's edge, measured while writing this suite: a
    // WHERE conjunct that is the arm's guard ATOM-FOR-ATOM selects the arm
    // today. Selection works on identity and fails one step of order away —
    // which is what makes the two targets above a containment RUNG to add,
    // not a subsystem to build.
    expect(await verdict("SELECT o FROM cai WHERE a >= 3")).toBe("notNull");
  });

  it("default-collation text rides the same containment", async () => {
    // The kernel already anchors text order to the session's default
    // collation (check-interval-text-default.sql); the same identity is what
    // entitles arm selection here.
    expect(await verdict("SELECT o FROM cais WHERE s >= 'p'")).toBe("notNull");
  });

  it("guard: an OVERLAPPING interval proves nothing", async () => {
    // a >= 2 admits a = 2, whose row took the ELSE arm and carries o IS NULL.
    expect(await verdict("SELECT o FROM cai WHERE a >= 2")).toBe("nullable");
  });

  it("guard: the ELSE arm's complement is not licensed by this mechanism", async () => {
    // a < 3 selects the ELSE arm — o IS NULL there, a different (alwaysNull)
    // conclusion this suite deliberately does not target.
    expect(await verdict("SELECT o FROM cai WHERE a < 3")).toBe("nullable");
  });

  it("guard: an explicit collation stays refused, containment or not", async () => {
    // Order under COLLATE "C" is the kernel's standing refusal
    // (check-interval-refusals.sql); arm selection must inherit it.
    expect(await verdict("SELECT o FROM caic WHERE s >= 'p'")).toBe("nullable");
  });
});

// --- Adjacent rungs, found 2026-08-24 while graduating the containment
// suite; both graduated the same day (`orFactImpliesAtom`, and the
// harvest's notTRUE stepping; corpus: check-arm-interval-or-*.sql,
// check-arm-interval-step-*.sql). -------------------------------------------

describe("OR-fact containment", () => {
  it("every disjunct inside the arm selects it", async () => {
    // PostgreSQL: whichever disjunct held, its set sits inside [3,inf) —
    // the subset rule's shape with containment where it matches by
    // identity today.
    expect(await verdict("SELECT o FROM cai WHERE a >= 4 OR a >= 5")).toBe("notNull");
  });

  it("guard: one escaping disjunct forfeits the fact", async () => {
    // a >= 2 admits a = 2 — ELSE arm, o NULL (adjudicated).
    expect(await verdict("SELECT o FROM cai WHERE a >= 4 OR a >= 2")).toBe("nullable");
  });
});

describe("arm stepping by notTRUE", () => {
  it("a refuted first guard falls through to the ELSE", async () => {
    // PostgreSQL: a <= 3 rows fail `a > 5`, the CASE takes the ELSE, and
    // o IS NOT NULL is enforced. The harvest steps only on FALSE today,
    // and TRUE(a <= 3) proves `a > 5` notTRUE (interval exclusivity),
    // never FALSE — one judgment short.
    expect(await verdict("SELECT o FROM step WHERE a <= 3")).toBe("notNull");
  });

  it("guard: an overlapping WHERE keeps the first arm live", async () => {
    // a <= 6 admits a = 6, whose row fired `a > 5` — o NULL (adjudicated).
    expect(await verdict("SELECT o FROM step WHERE a <= 6")).toBe("nullable");
  });
});
