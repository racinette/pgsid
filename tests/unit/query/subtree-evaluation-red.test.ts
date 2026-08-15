import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferQueryContract, type QueryContract } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The RED SUITE for subtree evaluation (docs/subtree-evaluation.md; the
// CHECK-channel consumer is Mechanism E in docs/argument-nullability.md).
//
// Every `it.fails` case asserts the TARGET contract — what the engine must
// claim once the named consumer lands — and passes today exactly because the
// engine does not claim it yet. When a consumer is built, its cases start
// failing under `it.fails`, which forces the flip to a plain `it` in the
// same commit: the suite is green before, during and after, and each flip
// is the acceptance test of the consumer that caused it.
//
// Every target was adjudicated against PostgreSQL before shipping
// (2026-08-11): output targets by executing the query and finding no NULL
// with the reason understood, param targets by binding NULL and watching the
// raise (or the pass, for the must-not-claim controls). A target the oracle
// would falsify must never sit here — this file claims what PostgreSQL does,
// ahead of what the engine sees.
//
// The plain `it` blocks are the BOUNDARY GUARDS: behavior that must stay
// exactly as it is after the mechanism lands. A guard that starts failing
// means the mechanism crossed a line the design draws — most seriously the
// bp control, where a claim would be unsound, not just eager.
// ---------------------------------------------------------------------------

let pg: PGlite;
let catalog: NullabilityCatalog;

const SCHEMA = `
  CREATE TABLE t (id int NOT NULL, x int);
  CREATE TABLE orders (id int NOT NULL, qty int NOT NULL);
  CREATE TABLE subscription (plan text, seats int, overflow_contact text,
    CONSTRAINT subscription_check1 CHECK (seats <= 1 OR overflow_contact IS NOT NULL),
    CONSTRAINT subscription_check CHECK (
      CASE WHEN plan = 'team' THEN seats IS NOT NULL AND seats > 1 ELSE true END));
  CREATE TABLE priced (price int, discount int, note text,
    CHECK (price - discount >= 0 OR note IS NOT NULL));
  CREATE TABLE bpt_ne (c char(4), n text, CHECK (c <> 'a ' OR n IS NOT NULL));
  CREATE TABLE bpt_eq (c char(4), n text, CHECK (c = 'a ' OR n IS NOT NULL));
  CREATE TABLE nv (seats int, oc text);
  ALTER TABLE nv ADD CONSTRAINT nv_check
    CHECK (seats <= 1 OR oc IS NOT NULL) NOT VALID;
  CREATE TABLE ne (seats int, oc text);
  ALTER TABLE ne ADD CONSTRAINT ne_check
    CHECK (seats <= 1 OR oc IS NOT NULL) NOT ENFORCED;
  CREATE TABLE tri (a int, CHECK (a > 5));
  CREATE TABLE bcorr (a int, b boolean,
    CHECK (CASE WHEN b THEN a < 5 ELSE a >= 5 END));
  CREATE TABLE dt (d date, x text, CHECK (d <= '2019-12-31' OR x IS NOT NULL));
`;

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(SCHEMA);
  const snapshot = await snapshotCatalog(pg);
  catalog = await buildNullabilityCatalog(snapshot);
}, 60_000);

afterAll(async () => {
  if (!pg.closed) await pg.close();
});

async function contract(sql: string): Promise<QueryContract> {
  const parsed = await parseSql(sql);
  // The statement map is ON for the whole suite: red targets flip on the
  // consumer that answers them, and every boundary guard holds with the
  // evaluator live — which is the direction the guards exist to test.
  return inferQueryContract(parsed.stmts![0]!.stmt!, catalog, {
    evaluate: async s => (await pg.query<Record<string, unknown>>(s)).rows[0],
  });
}

// --- Consumer 1: the statement map. ----------------------------------------
// Closed subtrees of the statement evaluated through PostgreSQL; the walk
// consults a node-identity map. Targets flip when the map consumer lands.

describe("statement map (flipped 2026-08-12 — rollout step 2 landed)", () => {
  it("nested closed guards prune at two depths", async () => {
    const c = await contract(
      "SELECT CASE WHEN length(trim('  x  ')) = 1" +
        " THEN CASE WHEN 2 + 2 = 4 THEN o.id ELSE NULL END" +
        " ELSE NULL END AS c FROM orders o",
    );
    // Both guards are closed and TRUE; both NULL arms prune; c is o.id,
    // which is NOT NULL.
    expect(c.outputs[0]!.notNull).toBe(true);
  });

  it("a COALESCE chain resolves through folded NULLIF arms", async () => {
    const c = await contract(
      "SELECT COALESCE(NULLIF('a', 'a'), NULLIF('b', 'c'), s.plan) AS c FROM subscription s",
    );
    // NULLIF('a','a') evaluates NULL (skipped), NULLIF('b','c') evaluates
    // 'b' (non-NULL): the chain lands on arm two whatever s.plan holds.
    expect(c.outputs[0]!.notNull).toBe(true);
  });

  it("a guard-FALSE arm folds inside a set operation", async () => {
    const c = await contract(
      "SELECT CASE WHEN 1 > 2 THEN NULL ELSE 'val' END AS c UNION ALL SELECT 'other'",
    );
    // The first branch folds to 'val'; both branches notNull; the union is.
    expect(c.outputs[0]!.notNull).toBe(true);
  });

  it("a folded claim propagates through a CTE reference", async () => {
    const c = await contract(
      "WITH flags AS (SELECT CASE WHEN 1 = 1 THEN 'on' ELSE NULL END AS flag)" +
        " SELECT f.flag FROM flags f",
    );
    // The map hit happens inside the CTE body; the CTE's memoized analysis
    // carries it to the outer reference. Exercises identity plumbing across
    // the walk's subquery memoization.
    expect(c.outputs[0]!.notNull).toBe(true);
  });

  it("control: sum over a NOT NULL column with GROUP BY claims notNull today", async () => {
    // The aggregate reasoning is already there; the red case below isolates
    // exactly the folding gap, not an aggregate gap.
    const c = await contract("SELECT sum(o.qty) AS s FROM orders o GROUP BY o.id");
    expect(c.outputs[0]!.notNull).toBe(true);
  });

  it("a folded CASE feeds an aggregate its notNull operand", async () => {
    const c = await contract(
      "SELECT sum(CASE WHEN 'a' = 'b' THEN NULL ELSE o.qty END) AS s" +
        " FROM orders o GROUP BY o.id",
    );
    // 'a' = 'b' evaluates FALSE; the operand folds to o.qty (NOT NULL); the
    // control above shows the aggregate machinery finishes the job.
    expect(c.outputs[0]!.notNull).toBe(true);
  });
});

// --- Consumer 2: the CHECK grounder (Mechanism E). --------------------------
// Written values ground enforced CHECK bodies; closed parts evaluate;
// residue analysis produces param claims. Targets flip when E lands.

describe("CHECK grounder (flipped 2026-08-12 — rollout step 3 landed)", () => {
  it("the standing finding: a written literal beside the tested NULL", async () => {
    const c = await contract(
      "INSERT INTO subscription (plan, seats, overflow_contact) VALUES ('team', 5, $1)",
    );
    // Grounds to (5 <= 1 OR $1 IS NOT NULL) → FALSE OR residue → $1 notNull.
    // This is subscription_check1, the discovery instrument's one standing
    // conviction (~9 per 20,000, both seeds); it closes when this flips.
    expect(c.params[0]!.notNull).toBe(true);
  });

  it("multi-row VALUES grounds per row and attributes per parameter", async () => {
    const c = await contract(
      "INSERT INTO subscription (plan, seats, overflow_contact)" +
        " VALUES ('solo', 1, $1), ('team', 9, $2)",
    );
    // Row 1: 1 <= 1 grounds TRUE — $1 unconstrained (bound NULL, it passes:
    // adjudicated). Row 2: 9 <= 1 grounds FALSE — $2 notNull.
    expect(c.params[0]!.notNull).toBe(false);
    expect(c.params[1]!.notNull).toBe(true);
  });

  it("UPDATE grounds SET values; the WHERE parameter stays free", async () => {
    const c = await contract(
      "UPDATE subscription SET seats = 7, overflow_contact = $1 WHERE plan = $2",
    );
    expect(c.params[0]!.notNull).toBe(true);
    expect(c.params[1]!.notNull).toBe(false);
  });

  it("an arithmetic CHECK body evaluates, not just comparisons", async () => {
    const c = await contract("INSERT INTO priced (price, discount, note) VALUES (5, 10, $1)");
    // Grounds to (5 - 10 >= 0 OR $1 IS NOT NULL): the closed subtree is a
    // computation — the shape the exact-atom trade could never cover.
    expect(c.params[0]!.notNull).toBe(true);
  });

  it("bp: blank-padded comparison claims where text reasoning would miss", async () => {
    const c = await contract("INSERT INTO bpt_ne (c, n) VALUES ('a', $1)");
    // As char(4), 'a' <> 'a ' grounds FALSE (padding equates them) →
    // residue → $1 notNull. Text-typed grounding would answer TRUE and miss
    // the claim. Adjudicated: binding NULL raises.
    expect(c.params[0]!.notNull).toBe(true);
  });

  it("a NOT VALID CHECK still claims — it gates new writes", async () => {
    const c = await contract("INSERT INTO nv (seats, oc) VALUES (5, $1)");
    // convalidated=false but conenforced=true (the snapshot's `enforced`):
    // stored rows may violate it, NEW writes cannot — binding NULL raises
    // (adjudicated). The grounder gates on enforcement, not validation.
    expect(c.params[0]!.notNull).toBe(true);
  });

  it("a CASE-shaped CHECK grounds through its evaluated-TRUE arm", async () => {
    // The instrument's first post-landing conviction (q1725, both seeds,
    // 2026-08-12): the guard grounds 'team' = 'team' → TRUE, selecting the
    // arm whose conjunct holds the tested NULL — `$1 IS NOT NULL AND $1 >
    // 1` goes FALSE AND UNKNOWN → FALSE. Adjudicated: binding NULL raises
    // subscription_check while subscription_check1 passes ('x' is written).
    const c = await contract(
      "INSERT INTO subscription (plan, seats, overflow_contact) VALUES ('team', $1, 'x')",
    );
    expect(c.params[0]!.notNull).toBe(true);
  });

  it("a NULLed discriminator routes to the arm the written value fails", async () => {
    // The instrument's conviction after the experiment tables landed
    // (2026-08-12, 6+2 instances): binding b NULL sends the CASE to its
    // ELSE arm, where the written a=1 grounds `1 >= 5` FALSE — so the
    // guard's null-implicants are arm-removal implicants. Adjudicated:
    // (NULL, 1) raises, (true, 1) inserts.
    const c = await contract("INSERT INTO bcorr (b, a) VALUES ($1, 1)");
    expect(c.params[0]!.notNull).toBe(true);
  });

  it("control: a written value satisfying the ELSE arm keeps the discriminator free", async () => {
    // With a=6 the ELSE arm grounds TRUE, so a NULL b passes (adjudicated);
    // a claim here would reject a binding PostgreSQL accepts.
    const c = await contract("INSERT INTO bcorr (b, a) VALUES ($1, 6)");
    expect(c.params[0]!.notNull).toBe(false);
  });

  it("a MERGE arm's INSERT grounds like any other write", async () => {
    const c = await contract(
      "MERGE INTO subscription s USING (VALUES (1)) v(k) ON s.seats = v.k" +
        " WHEN NOT MATCHED THEN INSERT (plan, seats, overflow_contact) VALUES ('m', 6, $1)",
    );
    expect(c.params[0]!.notNull).toBe(true);
  });
});

// --- The recorded later: output-side CHECK entailment. -----------------------
// Same core, different soundness argument (validated CHECKs are notFALSE
// over stored rows; WHERE equalities supply groundings). Charted as a later
// in docs/subtree-evaluation.md — this case may stay red past the first two
// consumers, and that is expected.

describe("entailment (flipped 2026-08-12 — the recorded later landed)", () => {
  it("a WHERE equality grounds a validated CHECK for returned rows", async () => {
    const c = await contract("SELECT overflow_contact AS c FROM subscription WHERE seats = 5");
    // Returned rows satisfy seats = 5; the validated CHECK is notFALSE, so
    // (FALSE OR overflow_contact IS NOT NULL) forces the null-test TRUE.
    // The ordering shape the kernel's exact-atom trade cannot reach.
    expect(c.outputs[0]!.notNull).toBe(true);
  });

  it("GUARD: an equality satisfying the comparison disjunct claims nothing", async () => {
    // seats = 1 makes `seats <= 1` TRUE — the CHECK is satisfied without
    // the null-test, so overflow_contact stays free (adjudicated: a
    // (1, NULL) row inserts).
    const c = await contract("SELECT overflow_contact AS c FROM subscription WHERE seats = 1");
    expect(c.outputs[0]!.notNull).toBe(false);
  });

  it("the bp direction: both literals read at character(4)", async () => {
    // 'a' and 'a ' are EQUAL as char(4), so `c <> 'a '` is FALSE for the
    // returned rows and n is forced — a text-typed reading would answer
    // TRUE and miss the claim. Adjudicated: ('a', NULL) is refused, so no
    // stored row can witness a NULL here.
    const c = await contract("SELECT n AS c FROM bpt_ne WHERE c = 'a'");
    expect(c.outputs[0]!.notNull).toBe(true);
  });

  it("GUARD: a datetime column's comparison is never evaluated", async () => {
    // The claim would be TRUE for stored rows, but date_in reads DateStyle
    // — the closure gate refuses the question, and the engine stays at
    // today's word rather than answer from session state.
    const c = await contract("SELECT x AS c FROM dt WHERE d = '2020-01-01'");
    expect(c.outputs[0]!.notNull).toBe(false);
  });
});

// --- Kernel atom-oracle rungs (BUILT 2026-08-12). ----------------------------
// docs/subtree-evaluation.md, "The kernel's atom oracle". Nothing here is
// closed — these are KERNEL derivations (evidence shaping, notFALSE
// harvest, same-token trichotomy, notTRUE consumed as guard refutation),
// and both targets flip with NO evaluator passed. Convicted by crafted
// fixtures under the amended demand discipline; the corpus counterparts
// are check-guard-trichotomy.sql and check-guard-arm-selection.sql.

describe("kernel atom oracle (flipped 2026-08-12 — convicted by crafted fixtures)", () => {
  it("a CHECK refutes a CASE guard through same-operand trichotomy", async () => {
    const c = await contract(
      "SELECT CASE WHEN a <= 5 THEN NULL ELSE 5 END AS a2 FROM tri",
    );
    // CHECK (a > 5) is notFALSE per stored row, so a <= 5 is never TRUE
    // and the NULL arm never fires. Oracle: 5 on every row — a NULL `a`
    // included (guard UNKNOWN → ELSE), so this survives null-extension too.
    expect(c.outputs[0]!.notNull).toBe(true);
  });

  it("WHERE evidence selects a CASE-shaped CHECK's arm", async () => {
    const c = await contract(
      "SELECT CASE WHEN a > 5 THEN NULL ELSE 5 END AS a1 FROM bcorr WHERE b IS TRUE",
    );
    // TRUE(b IS TRUE) selects the CHECK's THEN arm: notFALSE(a < 5), and
    // trichotomy refutes a > 5 — the NULL arm never fires. Oracle: 5 on
    // every emitted row.
    expect(c.outputs[0]!.notNull).toBe(true);
  });
});

// --- Boundary guards: green today, green after. ------------------------------

describe("GUARD: lines the mechanism must not cross", () => {
  it("bp control: the = direction must NOT claim — a claim here is unsound", async () => {
    const c = await contract("INSERT INTO bpt_eq (c, n) VALUES ('a', $1)");
    // As char(4), 'a' = 'a ' grounds TRUE: the CHECK passes and binding
    // NULL passes (adjudicated). Text-typed grounding would answer FALSE
    // and manufacture a rejection that never happens. If this guard fails,
    // the grounder is comparing without the declared-type casts.
    expect(c.params[0]!.notNull).toBe(false);
  });

  it("arm selection must not overreach — the unconstrained guard stays nullable", async () => {
    const c = await contract(
      "SELECT CASE WHEN a <= 5 THEN NULL ELSE 5 END AS a2 FROM bcorr WHERE b IS TRUE",
    );
    // Under b IS TRUE the CHECK constrains a < 5, which leaves a <= 5
    // freely TRUE: the oracle witnesses NULL at (a=3, b=true). A claim
    // here would reject what PostgreSQL returns.
    expect(c.outputs[0]!.notNull).toBe(false);
  });

  it("a NOT ENFORCED CHECK must NOT claim — it never gates", async () => {
    const c = await contract("INSERT INTO ne (seats, oc) VALUES (5, $1)");
    // Same body as the NOT VALID red case, conenforced=false: binding NULL
    // sails through (adjudicated). A claim here would reject bindings
    // PostgreSQL accepts.
    expect(c.params[0]!.notNull).toBe(false);
  });

  it("a volatile guard is open — no claim from evaluating it", async () => {
    const c = await contract(
      "SELECT CASE WHEN random() < 2 THEN o.id ELSE NULL END AS c FROM orders o",
    );
    // random() < 2 is TRUE every time, and evaluating it proves nothing
    // about the next execution: volatile → open → nullable stays.
    expect(c.outputs[0]!.notNull).toBe(false);
  });

  it("a stable input function keeps a literal cast open ('now')", async () => {
    const c = await contract(
      "SELECT CASE WHEN 'now'::timestamptz > '2000-01-01 00:00:00+00'::timestamptz" +
        " THEN o.id ELSE NULL END AS c FROM orders o",
    );
    // timestamptz_in is STABLE (measured): 'now' re-evaluates per call, so
    // the guard is open however constant it looks. Nullable stays.
    expect(c.outputs[0]!.notNull).toBe(false);
  });

  it("structural facts about open trees are refused", async () => {
    const c = await contract("SELECT (ARRAY[t.id, t.id])[1] AS c FROM t");
    // The in-range-ness of the subscript is structural, but the tree holds
    // column refs: open. Structural reasoning is the walk's possible future
    // business, never the evaluator's.
    expect(c.outputs[0]!.notNull).toBe(false);
  });

  it("a closed ON condition does not touch join semantics", async () => {
    const c = await contract(
      "SELECT o2.qty AS q FROM orders o LEFT JOIN orders o2 ON TRUE",
    );
    // ON TRUE folds, but whether a left-joined row NULL-extends depends on
    // the right side having rows — data, not expression. Nullable stays.
    expect(c.outputs[0]!.notNull).toBe(false);
  });
});
