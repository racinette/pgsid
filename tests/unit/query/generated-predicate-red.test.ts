import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// GRADUATED 2026-08-25 — predicate-aware GENERATED columns, "transitive
// nullability". Captured RED 2026-08-24 (commit 2a75a10) by a maintainer
// question; every verdict measured, every target adjudicated over real rows
// before it was written down; flipped here by the commit that built the
// four mechanisms below. The cases live on as the acceptance test of that
// build, and in the corpus as check-generated-predicate-*.sql.
//
// The forward INLINE already existed — a selected generated column's
// expression is walked in the READING scope and composes with WHERE
// promotion, which is why the ev-shaped CHECK half (`event_duration` under
// `WHERE has_duration`) claimed notNull all along (held green by the
// check-boolean-discriminator-or fixtures). What was missing:
//
//   1. No guard-TRUE consumer for the kernel. A `CASE ... ELSE NULL` can
//      claim notNull only when some guard is provably TRUE (that is what
//      makes the ELSE unreachable), and only the statement map could say
//      TRUE — closed guards only. `checkConstraintsRefuteGuard` had no TRUE
//      dual; it is now `checkConstraintsGuardTruth`, three-valued over one
//      fact derivation.
//   2. The kernel guard consumer skipped CHECK-less tables outright
//      (`checkExprs.length === 0` → continue), so pure WHERE evidence never
//      reached it. The evidence-only run is now asked FIRST and once.
//   3. The generation inline concluded notNull only. `entryColumnAlwaysNull`
//      now inlines the same expression, and `alwaysNullExpr`'s CASE rule
//      consults arm pruning, so an ELSE-only predicate concludes NULL.
//   4. Found while flipping 1-2, and not visible from the consumer side at
//      all: the anchor-question synthesis drew its literal pool from CHECK
//      constraints ALONE. For a CHECK-less table it synthesized ZERO
//      questions (measured), so `7 <= 10` and `7 < 10` had no answers and
//      neither the substitution route nor the interval rung could fire
//      however the guards were wired. Generation expressions now sit in the
//      pool beside the CHECKs.
// ---------------------------------------------------------------------------

let pg: PGlite;
let catalog: NullabilityCatalog;

const SCHEMA = `
  CREATE TABLE gp (
    a integer NOT NULL,
    c text GENERATED ALWAYS AS (
      CASE WHEN a <= 3 THEN 'yes' WHEN a <= 10 THEN 'maybe' ELSE NULL END
    ) STORED
  );
  CREATE TABLE ev (
    status integer NOT NULL,
    has_duration boolean NOT NULL,
    started_at timestamp NOT NULL,
    event_duration interval,
    finished_at timestamp GENERATED ALWAYS AS (
      CASE WHEN status >= 2 THEN started_at + event_duration ELSE NULL END
    ) STORED,
    CHECK ((has_duration AND event_duration IS NOT NULL) OR NOT has_duration)
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

async function verdict(sql: string): Promise<"notNull" | "alwaysNull" | "nullable"> {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const evaluate = async (s: string) =>
    (await pg.query<Record<string, unknown>>(s)).rows[0];
  const cols = await inferNullability(stmt, catalog, { evaluate });
  const c = cols[0]!;
  return c.notNull ? "notNull" : c.alwaysNull ? "alwaysNull" : "nullable";
}

describe("generated CASE arms selected by WHERE evidence (no CHECK on the table)", () => {
  it("an equality proves the arm's guard TRUE", async () => {
    // PostgreSQL: a = 7 refutes `a <= 3` and proves `a <= 10` — every
    // returned row is 'maybe' (adjudicated: 1 row, 0 NULLs). The route runs
    // through all four mechanisms: gp has no CHECK, so the pool that
    // answers `7 <= 3` / `7 <= 10` is the generation expression's own, and
    // the evidence-only kernel run reads both.
    expect(await verdict("SELECT c FROM gp WHERE a = 7")).toBe("notNull");
  });

  it("the guard's IDENTICAL atom proves it", async () => {
    // WHERE a <= 3 IS the first guard — TRUE by identity, ELSE
    // unreachable (adjudicated: 2 rows, 0 NULLs).
    expect(await verdict("SELECT c FROM gp WHERE a <= 3")).toBe("notNull");
  });

  it("containment refutes one arm and selects the next", async () => {
    // a >= 5 refutes `a <= 3` (exclusivity); a <= 10 selects the second
    // arm (identity). Adjudicated: 3 rows, 0 NULLs.
    expect(await verdict("SELECT c FROM gp WHERE a >= 5 AND a <= 10")).toBe("notNull");
  });

  it("an ELSE-only predicate concludes alwaysNull", async () => {
    // a >= 11 refutes both guards; only ELSE NULL remains (adjudicated:
    // 2 rows, 2 NULLs). The alwaysNull channel (3) on top of the pruning
    // that gaps 1-2 and 4 supply.
    expect(await verdict("SELECT c FROM gp WHERE a >= 11")).toBe("alwaysNull");
  });

  it("guard: a predicate reaching the ELSE claims nothing", async () => {
    // a >= 5 admits a > 10 (adjudicated: 2 NULLs in 5 rows).
    expect(await verdict("SELECT c FROM gp WHERE a >= 5")).toBe("nullable");
  });

  it("guard: unfiltered stays nullable", async () => {
    expect(await verdict("SELECT c FROM gp")).toBe("nullable");
  });
});

describe("transitive nullability through a generated column", () => {
  it("WHERE + CHECK pin the selected arm's operands", async () => {
    // The full chain: status = 3 proves the `status >= 2` guard;
    // TRUE(has_duration) walks the CHECK's OR to `event_duration IS NOT
    // NULL`; started_at is declared NOT NULL — the arm's arithmetic is
    // non-null on every returned row (adjudicated: 0 NULLs). The CHECK
    // half already worked in isolation (the corpus fixture); the
    // guard-TRUE link is what joined the two halves.
    expect(await verdict(
      "SELECT finished_at FROM ev WHERE status = 3 AND has_duration",
    )).toBe("notNull");
  });

  it("the CHECK-less variant rides WHERE promotion alone", async () => {
    // Same chain with the operand pinned directly (adjudicated: 0 NULLs).
    expect(await verdict(
      "SELECT finished_at FROM ev WHERE status = 3 AND event_duration IS NOT NULL",
    )).toBe("notNull");
  });

  it("a refuted guard concludes the generated column alwaysNull", async () => {
    // status = 1 refutes `status >= 2` — the ELSE is the only producer
    // (adjudicated: 1 row, 1 NULL).
    expect(await verdict(
      "SELECT finished_at FROM ev WHERE status = 1 AND has_duration",
    )).toBe("alwaysNull");
  });

  it("guard: an unpinned operand keeps the arm nullable", async () => {
    // status = 3 selects the arm, but event_duration is free — the
    // (3, false, NULL) row's finished_at is NULL (adjudicated).
    expect(await verdict("SELECT finished_at FROM ev WHERE status = 3")).toBe("nullable");
  });

  it("guard: a pinned operand without the arm claims nothing", async () => {
    // has_duration pins event_duration, but status may take the ELSE
    // (adjudicated: 1 NULL in 3 rows).
    expect(await verdict("SELECT finished_at FROM ev WHERE has_duration")).toBe("nullable");
  });
});
