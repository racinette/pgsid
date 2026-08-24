import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// RED SUITE: predicate-aware GENERATED columns — "transitive nullability".
//
// Every `it.fails` case asserts the TARGET contract — what the engine must
// claim once the mechanisms land — and passes today exactly because the
// engine does not claim it yet (rule 1's shape; check-arm-interval-red is
// the nearest sibling).
//
// The gaps (found 2026-08-24, by a maintainer question; every verdict
// measured, every target adjudicated over real rows before writing):
//
// The forward INLINE already exists — a selected generated column's
// expression is walked in the READING scope and composes with WHERE
// promotion, which is why the ev-shaped CHECK half (`event_duration` under
// `WHERE has_duration`) claims notNull today (held green by the
// check-boolean-discriminator-or corpus fixtures). What is missing sits in
// the walk's CASE rule, three consumers deep:
//
//   1. No guard-TRUE consumer for the kernel. A `CASE ... ELSE NULL` can
//      claim notNull only when some guard is provably TRUE (that is what
//      makes the ELSE unreachable), and today only the statement map can
//      say TRUE — closed guards only. The kernel's `isTrue` — equality
//      substitution, identity, and the containment rungs — is consumed on
//      the CHECK-harvest side alone; `guardRefutedByChecks` has no TRUE
//      dual.
//   2. The kernel guard consumer skips CHECK-less tables outright
//      (`checkExprs.length === 0` → continue), so pure WHERE evidence
//      never reaches it — though evidence alone refutes and proves.
//   3. The generation inline concludes notNull only; there is no
//      alwaysNull channel through it, so an ELSE-only predicate cannot
//      conclude the column NULL.
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
  it.fails("an equality proves the arm's guard TRUE", async () => {
    // PostgreSQL: a = 7 refutes `a <= 3` and proves `a <= 10` — every
    // returned row is 'maybe' (adjudicated: 1 row, 0 NULLs). Both
    // judgments are the kernel's already; nothing consumes them for a
    // query-side CASE, and the CHECK-less gate would skip gp regardless.
    expect(await verdict("SELECT c FROM gp WHERE a = 7")).toBe("notNull");
  });

  it.fails("the guard's IDENTICAL atom proves it", async () => {
    // WHERE a <= 3 IS the first guard — TRUE by identity, ELSE
    // unreachable (adjudicated: 2 rows, 0 NULLs).
    expect(await verdict("SELECT c FROM gp WHERE a <= 3")).toBe("notNull");
  });

  it.fails("containment refutes one arm and selects the next", async () => {
    // a >= 5 refutes `a <= 3` (exclusivity); a <= 10 selects the second
    // arm (identity). Adjudicated: 3 rows, 0 NULLs.
    expect(await verdict("SELECT c FROM gp WHERE a >= 5 AND a <= 10")).toBe("notNull");
  });

  it.fails("an ELSE-only predicate concludes alwaysNull", async () => {
    // a >= 11 refutes both guards; only ELSE NULL remains (adjudicated:
    // 2 rows, 2 NULLs). Needs gap 3 beside gaps 1-2: the inline has no
    // alwaysNull channel.
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
  it.fails("WHERE + CHECK pin the selected arm's operands", async () => {
    // The full chain: status = 3 proves the `status >= 2` guard;
    // TRUE(has_duration) walks the CHECK's OR to `event_duration IS NOT
    // NULL`; started_at is declared NOT NULL — the arm's arithmetic is
    // non-null on every returned row (adjudicated: 0 NULLs). The CHECK
    // half already works in isolation (the corpus fixture); only the
    // guard-TRUE link is missing.
    expect(await verdict(
      "SELECT finished_at FROM ev WHERE status = 3 AND has_duration",
    )).toBe("notNull");
  });

  it.fails("the CHECK-less variant rides WHERE promotion alone", async () => {
    // Same chain with the operand pinned directly (adjudicated: 0 NULLs).
    expect(await verdict(
      "SELECT finished_at FROM ev WHERE status = 3 AND event_duration IS NOT NULL",
    )).toBe("notNull");
  });

  it.fails("a refuted guard concludes the generated column alwaysNull", async () => {
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
