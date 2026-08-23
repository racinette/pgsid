import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import { createKillableEvaluator, type KillableEvaluator } from "./killable-evaluator.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The RED SUITE for BOOLEAN LITERALS inside a CHECK expression
// (docs/deferred-tasks.md §4, "Boolean literals in CHECK expressions" — the
// last row there with a live route).
//
// PostgreSQL stores a CHECK expression VERBATIM. There is no constant folding
// on the way into `pg_constraint.conbin`, so `CHECK (false OR v IS NOT NULL)`
// arrives at the kernel with its `false` disjunct intact — measured below by
// reading `pg_get_constraintdef` back.
//
// The kernel's OR harvest already knows what to do with a dead disjunct:
// `harvestCheckFacts` filters the arms through `isFalse` and descends into
// the single survivor. What it cannot do is READ a bare boolean literal —
// `isTrue`/`isFalse` enumerate BoolExpr, A_Expr and NullTest and then fall
// through to the atom matchers, and a literal atomizes to nothing. So the
// filter keeps both arms, the disjunction stays a two-armed notFALSE fact,
// and a column PostgreSQL will not let you write NULL into reads nullable.
//
// Every target below is adjudicated by ASKING POSTGRESQL TO STORE THE NULL,
// which is the only evidence that settles a CHECK: the claim is precisely
// "no row exists with a NULL here", and a rejected INSERT is that.
// ---------------------------------------------------------------------------

const DDL = `
  CREATE TABLE lit_check (
    id integer PRIMARY KEY,
    -- The targets: a dead disjunct beside a real guard, on both sides, and
    -- nested one level so the descent has to recurse rather than peek.
    v text, CONSTRAINT lc_v CHECK (false OR v IS NOT NULL),
    w text, CONSTRAINT lc_w CHECK (w IS NOT NULL OR false),
    x text, CONSTRAINT lc_x CHECK ((false OR false) OR x IS NOT NULL),
    -- The only column that reaches the TRUE half of the reading: FALSE(NOT p)
    -- is TRUE(p), so dropping this arm needs the literal read as TRUE. With
    -- only the FALSE half the column stays nullable — measured.
    u text, CONSTRAINT lc_u CHECK (NOT true OR u IS NOT NULL),
    -- Already handled, and the control that says so: the AND harvest visits
    -- every conjunct and a literal simply contributes no atom, so this needs
    -- nothing from the fix.
    y text, CONSTRAINT lc_y CHECK (true AND y IS NOT NULL),
    -- The BOUNDARY. A live TRUE disjunct makes the constraint vacuous, and a
    -- rule that read literals without keeping their polarity straight would
    -- claim this one too.
    z text, CONSTRAINT lc_z CHECK (true OR z IS NOT NULL)
  );`;

let pg: PGlite;
let catalog: NullabilityCatalog;
let evaluator: KillableEvaluator;

/** What the engine claims for the named column of `lit_check`. */
async function claim(column: string): Promise<boolean> {
  const sql = `SELECT c.${column} AS v FROM lit_check c`;
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const cols = await inferNullability(stmt, catalog, { evaluate: evaluator.evaluate });
  return cols[0]!.notNull;
}

const GUARDED = ["v", "w", "x", "u", "y", "z"] as const;

/** Whether PostgreSQL REFUSES to store a NULL in that column — the only
 *  evidence that settles a CHECK claim. Returns the error, or null if the
 *  write went in (in which case the column is genuinely nullable).
 *
 *  Every OTHER guarded column is given a value, or the row would be rejected
 *  by a sibling constraint and the error would name the wrong one — which is
 *  exactly how the first draft of this read: `lc_v` firing for `w`'s row. */
async function rejectsNull(column: string, id: number): Promise<string | null> {
  const cols = GUARDED.map(c => (c === column ? "NULL" : `'${c}'`)).join(", ");
  try {
    await pg.exec(
      `INSERT INTO lit_check (id, ${GUARDED.join(", ")}) VALUES (${id}, ${cols})`,
    );
    return null;
  } catch (e) {
    return (e as Error).message;
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

describe("boolean literals in CHECK — the premise", () => {
  it("PostgreSQL stores the dead disjunct verbatim", async () => {
    // The whole route depends on this. If PostgreSQL folded `false OR p` to
    // `p` on the way in, the kernel would never see a literal and there
    // would be nothing to fix.
    const r = await pg.query<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'lc_v'`,
    );
    expect(r.rows[0]!.def).toMatch(/false/);
  });

  it("PostgreSQL refuses the NULL under every dead-disjunct spelling", async () => {
    // Adjudication for all four notNull targets, and for the boundary in the
    // other direction. A CHECK rejects on FALSE and passes on TRUE-or-NULL,
    // and `IS NOT NULL` is total — so `false OR (v IS NOT NULL)` is FALSE
    // exactly when v is NULL.
    expect(await rejectsNull("v", 1)).toMatch(/lc_v/);
    expect(await rejectsNull("w", 2)).toMatch(/lc_w/);
    expect(await rejectsNull("x", 3)).toMatch(/lc_x/);
    expect(await rejectsNull("u", 4)).toMatch(/lc_u/);
    expect(await rejectsNull("y", 5)).toMatch(/lc_y/);
    // ...and accepts it where the constraint is vacuous.
    expect(await rejectsNull("z", 6)).toBeNull();
  });
});

describe("boolean literals in CHECK — targets", () => {
  // FLIPPED from `it.fails` by `boolLiteral` in check-entailment.ts. The
  // graduated form lives in the corpus as `check-literal-disjunct.sql`; these
  // stay because they carry the INSERT adjudication above, which a fixture
  // cannot express — a fixture asserts about rows that exist, and the claim
  // here is about a row PostgreSQL will not let you create.
  it("a dead LEFT disjunct is dropped, and the guard beside it holds", async () => {
    expect(await claim("v")).toBe(true);
  });

  it("a dead RIGHT disjunct too", async () => {
    expect(await claim("w")).toBe(true);
  });

  it("and a nested one, so the reading recurses", async () => {
    expect(await claim("x")).toBe(true);
  });

  it("a negated TRUE is dead too — the half the corpus does not reach", async () => {
    // This is the ONLY case that exercises `boolLiteral` from `isTrue`.
    // Measured: with that call removed and the `isFalse` one kept, the whole
    // suite stays green except this column. Without it the reading would be
    // half a rule with nothing to say so.
    expect(await claim("u")).toBe(true);
  });
});

describe("boolean literals in CHECK — boundary guards", () => {
  it("a TRUE conjunct never needed the fix", async () => {
    // Green today. It is here so the flip above cannot be credited with work
    // the AND harvest was already doing.
    expect(await claim("y")).toBe(true);
  });

  it("a LIVE true disjunct proves nothing, and must keep proving nothing", async () => {
    // The mutation guard. Reading a literal without its polarity — treating
    // any literal arm as droppable — claims this column, and PostgreSQL has
    // the NULL to contradict it.
    expect(await claim("z")).toBe(false);
  });

  it("no probe had to be killed", () => {
    expect(evaluator.killedSql).toEqual([]);
  });
});
