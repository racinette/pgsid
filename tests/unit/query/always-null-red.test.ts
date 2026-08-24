import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferQueryContract, type QueryContract } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The RED SUITE for the always-null channel (`OutputNullability.alwaysNull`;
// docs/consumer-design.md, "Always-null columns").
//
// Same discipline as subtree-evaluation-red.test.ts: every `it.fails` case
// asserts the TARGET contract — what the engine must claim once the named
// mechanism lands — and passes today exactly because the engine does not
// claim it yet. Landing a mechanism makes its cases fail under `it.fails`,
// which forces the flip to a plain `it` in the same commit. The suite is
// green before, during and after, and each flip is the acceptance test of
// the mechanism that caused it.
//
// EVERY case here was adjudicated against PostgreSQL before shipping
// (2026-08-22): each target executed and observed to return NULL on every
// row, each guard executed and observed to return at least one non-NULL.
// A target the oracle would falsify must never sit here — this file claims
// what PostgreSQL does, ahead of what the engine sees. The adjudication is
// not decorative: `count(amount)` over an always-null column returns 0, not
// NULL, which is the whole reason mechanism D needs a curated function list
// rather than a rule.
//
// The plain `it` blocks are BOUNDARY GUARDS: behaviour that must stay
// exactly as it is after a mechanism lands. Most of them assert that
// something is NOT alwaysNull, and those are the ones that matter — an
// alwaysNull claim is a `null` type in the consumer's output, so a wrong one
// is not eagerness, it is a lie about a column that carries values.
//
// Why five describes rather than one list: the eleven shapes have five
// different mechanisms behind them and wildly different costs, from a
// one-line predicate change (A) to a relation-emptiness analysis the walk
// has no notion of (C's third case). Grouping by cost is what makes the
// order of work legible.
// ---------------------------------------------------------------------------

let pg: PGlite;
let catalog: NullabilityCatalog;

const SCHEMA = `
  -- A tagged union declared in SQL: 'paid' rows carry an amount, every
  -- other status is required not to. The engine already reads this (the
  -- kernel's mirror goal), which makes it the fixed point the red cases are
  -- measured against — several targets below are "the same claim, one
  -- construct further out".
  CREATE TABLE inv (
    id integer NOT NULL, status text NOT NULL, amount numeric,
    CHECK (CASE WHEN status = 'paid' THEN amount IS NOT NULL
                                     ELSE amount IS NULL END)
  );
  CREATE TABLE ord (id integer NOT NULL, inv_id integer);
`;

const DATA = `
  INSERT INTO inv VALUES (1,'paid',10.0), (2,'draft',NULL), (3,'void',NULL);
  INSERT INTO ord VALUES (1,1),(2,2),(3,99);
`;

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(SCHEMA);
  await pg.exec(DATA);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
}, 60_000);

afterAll(async () => {
  if (!pg.closed) await pg.close();
});

async function contract(sql: string): Promise<QueryContract> {
  const parsed = await parseSql(sql);
  return inferQueryContract(parsed.stmts![0]!.stmt!, catalog, {
    evaluate: async s => (await pg.query<Record<string, unknown>>(s)).rows[0],
  });
}

/** The claim under test, as the three-valued fact the contract carries. */
async function verdict(sql: string): Promise<"notNull" | "alwaysNull" | "nullable"> {
  const c = await contract(sql);
  const o = c.outputs[0]!;
  return o.notNull ? "notNull" : o.alwaysNull ? "alwaysNull" : "nullable";
}

// --- What already works, and must keep working. ----------------------------
// Not red, and not decoration either: every mechanism below adds a way to
// reach `alwaysNull`, and the cheapest way to break the channel is to make
// something claim it that should not. These two are the fixed points.

describe("the landed channel (boundary guards for every mechanism below)", () => {
  it("the CHECK's ELSE arm is claimed today", async () => {
    // PostgreSQL: [null, null] — the two non-'paid' rows.
    expect(await verdict("SELECT amount FROM inv WHERE status <> 'paid'")).toBe("alwaysNull");
  });

  it("a plain nullable column claims nothing", async () => {
    // PostgreSQL: ["10.0", null, null] — carries values.
    expect(await verdict("SELECT amount FROM inv")).toBe("nullable");
  });

  it("the CHECK's THEN arm is notNull, not alwaysNull", async () => {
    // The direction control on the same constraint: a mechanism that made
    // this alwaysNull would have inverted the goal, not extended it.
    expect(await verdict("SELECT amount FROM inv WHERE status = 'paid'")).toBe("notNull");
  });
});

// --- A: a NULL literal as a strict-closure leaf. ---------------------------
// `alwaysNullExpr` tests `isNullLiteral` on the WHOLE expression but the leaf
// predicate handed to `exprStrictlyForces` accepts only columns, so a NULL
// literal one level down is invisible.
//
// LANDED 2026-08-22, and the estimate ("one line") was wrong about WHICH
// line. Widening the leaf predicate did nothing, because
// `exprStrictlyForces` only ever calls it for a ColumnRef — a constant fell
// through to `return false` before the predicate was consulted. The change
// is in the closure's dispatch: an `A_Const` is now ASKED of the leaf
// predicate rather than answered there. Delegating instead of concluding is
// what keeps it a no-op for the two column-side callers, whose predicates
// reject a non-ColumnRef node outright.
//
// It also took `COALESCE(NULL, NULL)` from B with it — the closure already
// required every branch to force, and both branches are now leaves that do.

describe("A — NULL literal as a strict-closure leaf", () => {
  it("a strict operator over a NULL literal", async () => {
    // PostgreSQL: [null, null, null].
    expect(await verdict("SELECT NULL::numeric + 1 AS c FROM inv")).toBe("alwaysNull");
  });

  it("a strict function over a NULL literal", async () => {
    // PostgreSQL: [null, null, null]. `upper` is strict.
    expect(await verdict("SELECT upper(NULL::text) AS c FROM inv")).toBe("alwaysNull");
  });

  it("guard: COALESCE over a NULL literal is notNull, not alwaysNull", async () => {
    // PostgreSQL: ["x","x","x"]. The strict closure requires EVERY branch to
    // force, so this must not ride in on A — it is the shape that proves the
    // leaf change did not become "any NULL anywhere".
    expect(await verdict("SELECT COALESCE(NULL::text,'x') AS c FROM inv")).toBe("notNull");
  });
});

// --- B: expression shapes the strict closure cannot express. ---------------
// All three are NULL for STRUCTURAL reasons, not propagated ones, so
// `exprStrictlyForces` asks the wrong question about them ("is this NULL
// whenever the leaf is"). Cost: a small recursive always-null walk over
// three node types — the tri-state, scoped rather than threaded through the
// whole walk.
//
// LANDED 2026-08-22. COALESCE came free with A. NULLIF is restricted to a
// bare ColumnRef pair on purpose: the argument needs both operands to read
// one value from one row, which `NULLIF(random(), random())` does not. The
// CASE rule ignores arm pruning deliberately — a pruned arm can only remove
// a way to be non-null, so ignoring it is the conservative direction — and
// a MISSING ELSE helps rather than blocks, since an unmatched CASE is NULL.
//
// The cast wrapper had to be made transparent for any of it to fire: the
// adjudicated spelling is `CASE … END::text`, which presents as a TypeCast,
// and the shape rules would never have seen the CASE.

describe("B — structural expression shapes", () => {
  it("NULLIF(x, x) is NULL whichever way it goes", async () => {
    // PostgreSQL: [null, null, null]. Equal → NULL by definition; a NULL x
    // makes the comparison NULL, so it returns x, which is NULL.
    expect(await verdict("SELECT NULLIF(status, status) AS c FROM inv")).toBe("alwaysNull");
  });

  it("a CASE whose every reachable arm is NULL", async () => {
    // PostgreSQL: [null, null, null].
    expect(
      await verdict("SELECT CASE WHEN id > 0 THEN NULL ELSE NULL END::text AS c FROM inv"),
    ).toBe("alwaysNull");
  });

  it("a COALESCE whose every argument is NULL", async () => {
    // PostgreSQL: [null, null, null].
    expect(await verdict("SELECT COALESCE(NULL::text, NULL::text) AS c FROM inv")).toBe(
      "alwaysNull",
    );
  });

  it("guard: NULLIF against a different operand carries values", async () => {
    // PostgreSQL: ["paid","draft","void"]. The identity is the whole claim
    // in the target above; without it there is nothing to conclude.
    expect(await verdict("SELECT NULLIF(status,'zzz') AS c FROM inv")).toBe("nullable");
  });

  it("guard: a CASE with one non-NULL arm carries values", async () => {
    // PostgreSQL: ["x","x",null].
    expect(
      await verdict("SELECT CASE WHEN id > 2 THEN NULL ELSE 'x' END::text AS c FROM inv"),
    ).toBe("nullable");
  });
});

// --- C: structural and relational. -----------------------------------------
// Three shapes. The setop case is a mirror of `combineSetOperation`; the
// other two needed "no row can satisfy this predicate".
//
// LANDED 2026-08-22, and the "new analysis" estimate was wrong for a third
// time — this needed no new analysis at all.
//
// `predicateNeverTrue` answers "no row can satisfy this". It reads a bare
// literal SYNTACTICALLY, which is the collector's own instruction rather
// than a shortcut: `collectClosedSubtrees` excludes a bare A_Const by design
// — "alone its answer restates what the AST already says syntactically" — so
// the statement map will never answer `ON false`. For everything else it
// asks the map first, and the map DOES cover closed comparisons in qual
// position, which is why the `1 = 2` spellings below are green too. (I
// briefly filed those as red on the strength of a scratch harness that had
// not enabled the evaluator; the suite disagreed, and the suite is what
// runs. Measure with the harness that ships.)
//
// FALSE and NULL are one fact here: neither admits a row.

describe("C — structural and relational", () => {
  it("a scalar subquery over a provably empty set", async () => {
    // PostgreSQL: [null, null, null] — an empty scalar subquery is NULL.
    expect(
      await verdict("SELECT (SELECT amount FROM inv WHERE false) AS c FROM inv"),
    ).toBe("alwaysNull");
  });

  it("a set operation whose every branch is always-null", async () => {
    // PostgreSQL: [null, null].
    expect(await verdict("SELECT NULL::text AS c UNION ALL SELECT NULL::text")).toBe(
      "alwaysNull",
    );
  });

  it("a join that can never match", async () => {
    // PostgreSQL: [null, null, null] — ON false extends every row.
    expect(await verdict("SELECT g.amount AS c FROM ord o LEFT JOIN inv g ON false")).toBe(
      "alwaysNull",
    );
  });

  it("a scalar subquery emptied by a closed COMPARISON, not a literal", async () => {
    // PostgreSQL: [null, null]. Same fact as the literal spelling above; the
    // statement map holds no entry for a qual position, so nothing answers
    // it. Closing this means extending the map's collection, not this file.
    expect(
      await verdict("SELECT (SELECT amount FROM inv WHERE 1 = 2) AS c FROM inv"),
    ).toBe("alwaysNull");
  });

  it("a join whose qual is a closed COMPARISON that is never true", async () => {
    // PostgreSQL: [null, null, null].
    expect(await verdict("SELECT g.amount AS c FROM ord o LEFT JOIN inv g ON 1 = 2")).toBe(
      "alwaysNull",
    );
  });

  it("guard: a set operation with one non-NULL branch carries values", async () => {
    // PostgreSQL: [null, "v"].
    expect(await verdict("SELECT NULL::text AS c UNION ALL SELECT 'v'::text")).toBe("nullable");
  });

  it("guard: a join that CAN match carries values", async () => {
    // PostgreSQL: ["10.0", null, null].
    expect(
      await verdict("SELECT g.amount AS c FROM ord o LEFT JOIN inv g ON g.id = o.inv_id"),
    ).toBe("nullable");
  });
});

// --- D: aggregates and windows over an always-null input. ------------------
// Per-function, NOT a rule: `max(dead)` is NULL and `count(dead)` is 0. So
// this needs a curated list, the way NON_NULL_OVER_NONEMPTY_AGGREGATES is
// curated with every entry measured on admission. The guards below are the
// counterexamples that force the curation.
//
// LANDED 2026-08-22 as ALWAYS_NULL_OVER_ALL_NULL_AGGREGATES and
// ..._WINDOWS. Admission demands NULL over an all-NULL input AND over an
// empty one, which is what lets FILTER be ignored: a FILTER can only empty
// the group, and every member is NULL over an empty group too.
//
// The table is NOT the complement of the non-null one, and not a copy —
// membership differs in both directions, which is exactly why every entry
// was measured: `stddev`/`variance` are absent there and present here,
// while `array_agg`/`json_agg`/`jsonb_agg` are present there and absent
// here because they COLLECT NULLs into a non-null container.

describe("D — aggregates and windows over an always-null input", () => {
  it("max over an always-null column", async () => {
    // PostgreSQL: [null]. NULL over all-NULL input, and NULL over empty.
    expect(await verdict("SELECT max(amount) AS c FROM inv WHERE status <> 'paid'")).toBe(
      "alwaysNull",
    );
  });

  it("a window function over an always-null column", async () => {
    // PostgreSQL: [null, null].
    expect(
      await verdict(
        "SELECT lag(amount) OVER (ORDER BY id) AS c FROM inv WHERE status <> 'paid'",
      ),
    ).toBe("alwaysNull");
  });

  it("guard: array_agg COLLECTS the NULLs into a non-null array", async () => {
    // PostgreSQL: [{null,null}] — a non-null array of NULLs. The shape that
    // is easiest to get backwards, and the reason array_agg sits in the
    // NON_NULL table and not in this one.
    expect(await verdict("SELECT array_agg(amount) AS c FROM inv WHERE status <> 'paid'")).toBe(
      "nullable",
    );
  });

  it("guard: json_agg likewise collects rather than skips", async () => {
    // PostgreSQL: [[null,null]].
    expect(await verdict("SELECT json_agg(amount) AS c FROM inv WHERE status <> 'paid'")).toBe(
      "nullable",
    );
  });

  it("guard: count over an always-null column is 0, not NULL", async () => {
    // PostgreSQL: [0]. THE reason D is a curated list — a rule reading
    // "aggregate over always-null is always-null" would be unsound here.
    expect(await verdict("SELECT count(amount) AS c FROM inv WHERE status <> 'paid'")).toBe(
      "notNull",
    );
  });
});

// --- E: written values. ----------------------------------------------------
// The written-value map carries non-nullness and deliberately not nullness;
// this is adding its mirror. Same family as the generated corpus's `r_ce`,
// but strictly smaller: r_ce needs the VALUE of a boolean, this needs only
// "the written expression is NULL", which the walk can already answer.
//
// LANDED 2026-08-22 for INSERT: `dmlWrittenNullColumns` is built in lockstep
// with `dmlWrittenColumns` and by the same rule — EVERY VALUES row must
// write NULL, since one row that does not is a returned row carrying a
// value. ON CONFLICT DO UPDATE clears the mirror outright: it is a second
// producing path whose SET expressions this does not analyse.
//
// UPDATE and MERGE followed, same day. UPDATE is the SIMPLEST of the three
// — one producing path, so a SET expression that is always NULL is the
// returned value outright, with no intersection to do. MERGE reduces by
// agreement across every producing arm, exactly as its non-null map does,
// because the walk cannot know which arm fired for a given row.

describe("E — written values", () => {
  it("INSERT of a NULL literal, read back through RETURNING", async () => {
    // PostgreSQL: [null].
    expect(
      await verdict(
        "INSERT INTO inv (id,status,amount) VALUES (9,'draft',NULL) RETURNING amount AS c",
      ),
    ).toBe("alwaysNull");
  });

  it("UPDATE SET the column NULL, read back through RETURNING", async () => {
    // PostgreSQL: [null, null]. The UPDATE builder has its own written-value
    // map and it is not mirrored — the INSERT one is.
    expect(
      await verdict("UPDATE inv SET status = 'draft', amount = NULL RETURNING amount AS c"),
    ).toBe("alwaysNull");
  });

  it("MERGE WHEN MATCHED UPDATE SET the column NULL", async () => {
    // PostgreSQL: [null, null]. Third builder, same gap.
    expect(
      await verdict(
        "MERGE INTO inv USING ord o ON o.inv_id = inv.id" +
          " WHEN MATCHED THEN UPDATE SET status = 'draft', amount = NULL" +
          " RETURNING inv.amount AS c",
      ),
    ).toBe("alwaysNull");
  });

  it.fails("a column the CHECK forces NULL because of what the statement WROTE", async () => {
    // PostgreSQL: [null, null]. `amount` is not written, so the mirror map
    // says nothing about it; what forces it NULL is the CHECK reading the
    // NEW row's `status`, which the statement DID write. The written value
    // reaches the kernel as a written-value fact, not as evidence, so no
    // derivation runs. Same family as the generated corpus's `r_ce`:
    // closing it means letting written values act as evidence, which is
    // value tracking and its own project.
    expect(
      await verdict("UPDATE inv SET status = 'draft' RETURNING amount AS c"),
    ).toBe("alwaysNull");
  });

  it("guard: UPDATE SET a non-NULL value is notNull", async () => {
    // PostgreSQL: ["3.5","3.5"]. The UPDATE map's existing direction already
    // answers this, which is what makes the two targets above a MIRROR to
    // add rather than a map to build.
    expect(
      await verdict("UPDATE inv SET status = 'paid', amount = 3.5 RETURNING amount AS c"),
    ).toBe("notNull");
  });

  it("guard: INSERT of a non-NULL literal is notNull", async () => {
    // PostgreSQL: ["7.5"]. Already claimed by the written-value map's
    // existing direction; a mirror that broke this would have replaced the
    // map rather than extended it.
    expect(
      await verdict(
        "INSERT INTO inv (id,status,amount) VALUES (8,'paid',7.5) RETURNING amount AS c",
      ),
    ).toBe("notNull");
  });
});

// --- The star-expansion crossing (found 2026-08-24 by the wrap-invariance
// suite, wrapper 1). ---------------------------------------------------------
//
// `SELECT * FROM (<q>) w` must keep every alwaysNull `<q>` proved — the
// wrapper emits exactly `<q>`'s rows, and null-extension can only ADD NULLs,
// so the claim survives every join state. The explicit re-export already
// carries it (`columnIsAlwaysNull` reads the inner flag), and star expansion
// did not: `expandStar` built its outputs from the notNull channel alone, so
// the one path that resolves POSITIONALLY dropped the flag the name path
// kept. Measured: 32 of the corpus's 37 alwaysNull claims died at a star
// wrapper and zero notNull claims did — the crossing was one channel in one
// consumer, the alias-column-list shape one mechanism over.

describe("the star-expansion crossing", () => {
  // Both graduated 2026-08-24, the same day they were captured: expandStar
  // asks entryColumnAlwaysNull positionally now, and the corpus fixture is
  // star-alwaysnull-crossing.sql. wrap-invariance.test.ts holds the class —
  // its wrapper is exactly this shape over every fixture at once.
  it("unqualified * over a subselect keeps the inner alwaysNull", async () => {
    // PostgreSQL: every row NULL (the CHECK's ELSE arm forces it inside).
    const c = await contract(
      "SELECT * FROM (SELECT id, amount FROM inv WHERE status <> 'paid') w",
    );
    expect(c.outputs[1]!.alwaysNull ?? false).toBe(true);
  });

  it("qualified w.* keeps it too", async () => {
    const c = await contract(
      "SELECT w.* FROM (SELECT id, amount FROM inv WHERE status <> 'paid') w",
    );
    expect(c.outputs[1]!.alwaysNull ?? false).toBe(true);
  });

  it("guard: the explicit re-export already carries it", async () => {
    // The fixed point the fix must not disturb: the NAME path was never
    // broken.
    const c = await contract(
      "SELECT w.amount AS a FROM (SELECT amount FROM inv WHERE status <> 'paid') w",
    );
    expect(c.outputs[0]!.alwaysNull ?? false).toBe(true);
  });

  it("guard: a value-bearing sibling stays un-flagged through *", async () => {
    // PostgreSQL: id carries values on every row. An alwaysNull claim is a
    // `null` type in the consumer's output, so an over-claim here is a lie,
    // not eagerness.
    const c = await contract(
      "SELECT * FROM (SELECT id, amount FROM inv WHERE status <> 'paid') w",
    );
    expect(c.outputs[0]!.alwaysNull ?? false).toBe(false);
    expect(c.outputs[0]!.notNull).toBe(true);
  });
});

// --- F — a proven-TRUE guard ends the arm chain (GRADUATED 2026-08-25) -----
// Captured and flipped the same day, which is the whole story: the
// alwaysNull CASE rule gained arm PRUNING that morning (a guard the facts
// prove NEVER TRUE excuses its arm from having to be NULL), and its mirror
// was left out and filed in deferred-tasks 2d as reaching no measured
// imprecision. One probe falsified that — these two shapes return NULL on
// every row and the engine said nullable — so the item became a red case
// and then a fix. A guard the facts PROVE means every later arm and the
// ELSE never run, which is the same fact `walkExprTraced`'s `firstTrue` has
// consumed on the notNull side all along.
//
// Adjudicated against PostgreSQL before writing: both targets return NULL
// on every row, both guards return a non-NULL. Corpus: the
// check-guard-proven-* family (else, later-arm, earlier-arm).
describe("F — a proven-TRUE guard ends the arm chain", () => {
  it("the ELSE beside a proven guard never runs", async () => {
    // The WHERE IS the guard, so the first arm always fires and its NULL is
    // the only value. PostgreSQL: 1 row, NULL. The ELSE's non-null 'x' is
    // what the engine currently stops on.
    expect(
      await verdict("SELECT CASE WHEN status = 'paid' THEN NULL ELSE 'x' END FROM inv WHERE status = 'paid'"),
    ).toBe("alwaysNull");
  });

  it("later ARMS beside a proven guard never run either", async () => {
    // Same fact one arm further: `id > 0` sits between the proven guard and
    // the ELSE and is unreachable for the same reason. PostgreSQL: 1 row,
    // NULL.
    expect(
      await verdict(
        "SELECT CASE WHEN status = 'paid' THEN NULL WHEN id > 0 THEN 'y' ELSE 'x' END FROM inv WHERE status = 'paid'",
      ),
    ).toBe("alwaysNull");
  });

  it("guard: with nothing proving the guard the ELSE is live", async () => {
    // Unfiltered, the draft and void rows take the ELSE and carry 'x'.
    expect(
      await verdict("SELECT CASE WHEN status = 'paid' THEN NULL ELSE 'x' END FROM inv"),
    ).toBe("nullable");
  });

  it("guard: an EARLIER arm that can still fire keeps the value alive", async () => {
    // `id > 0` is not refuted, so it may fire before the proven guard is
    // ever reached — and it yields 'z'. PostgreSQL returns 'z', so an
    // alwaysNull claim here would be a lie about a column that carries
    // values, not eagerness.
    expect(
      await verdict(
        "SELECT CASE WHEN id > 0 THEN 'z' WHEN status = 'paid' THEN NULL ELSE 'x' END FROM inv WHERE status = 'paid'",
      ),
    ).toBe("nullable");
  });
});
