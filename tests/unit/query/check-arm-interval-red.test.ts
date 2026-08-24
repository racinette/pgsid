import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// RED SUITE: selecting a CHECK's CASE arm by interval CONTAINMENT.
//
// Same discipline as the other *-red suites: every `it.fails` case asserts
// the TARGET contract — what the engine must claim once the mechanism lands —
// and passes today exactly because the engine does not claim it yet.
//
// The gap (found 2026-08-24, by a maintainer question): arm selection inside
// a CHECK's CASE is EQUALITY-shaped — `WHERE status = 'housed'` selects its
// arm (check-case-discriminator-notnull.sql) — while the ORDER theory the
// interval kernel already owns is wired to dead disjuncts and query-side
// CASE guards, not to arm selection. So `WHERE a >= 4` does not select the
// `a >= 3` arm, though [4,∞) ⊆ [3,∞) is exactly the containment the kernel
// computes elsewhere (check-interval-numeric-kinds.sql, one consumer over).
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
  it.fails("an integer WHERE interval contained in the arm's selects it", async () => {
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

  it.fails("default-collation text rides the same containment", async () => {
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
