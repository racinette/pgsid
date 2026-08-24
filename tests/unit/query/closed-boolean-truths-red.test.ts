import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import { createKillableEvaluator, type KillableEvaluator } from "./killable-evaluator.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The RED SUITE for CLOSED BOOLEAN SUBEXPRESSIONS
// (docs/deferred-tasks.md §4, "A CHECK literal that is not a truth value").
//
// The register carried this as a one-line cast refusal: `boolLiteral` reads a
// bare boolean A_Const and REFUSES `'t'::boolean`, because following the cast
// would mean reimplementing an input function. Measuring the refusal made it
// a much larger row than that, in two directions.
//
// FIRST, most of the cast spellings the row named do not exist. PostgreSQL's
// parse analysis coerces an UNKNOWN literal at analysis time, so `'t'::boolean`
// and `CAST('true' AS boolean)` are already `true` in `pg_constraint.conbin`
// (measured — `pg_get_constraintdef` reads `true` back). The kernel never sees
// them. What survives is a cast from a TYPED expression, `1::boolean` and
// `('f'::text)::boolean`.
//
// SECOND, and this is the row's real size: casts are one shape out of many.
// PostgreSQL does NO constant folding on the way into `conbin`, so an entire
// family of CLOSED boolean expressions arrives at the kernel unreadable —
// `1 > 2`, `'a' = 'b'`, `starts_with('abc','z')`, `ARRAY[1,2] @> ARRAY[3]`,
// a jsonb `?`, `false IS TRUE`, a closed CASE, `3 = ANY (ARRAY[1,2])`. Every
// one of them is a dead disjunct the OR harvest could drop, and the kernel
// reads none of them, because it matches TOKENS and these are computations.
//
// THIRD, the same blindness sits on the STATEMENT side, where it does not even
// need a cast to show up: `WHERE false OR v IS NOT NULL` proves nothing today.
// The walk's `predicateProvesNonNull` OR rule requires EVERY disjunct to prove,
// and a dead disjunct proves nothing — so a rule that is exactly right about
// live arms is defeated by an arm that cannot fire.
//
// The mechanism that answers all of it at once is the one already in the
// building: these are CLOSED trees, and the subtree evaluator's whole job is
// closed trees. So the fix is not to read the cast — it is to ASK POSTGRESQL,
// which is total where a token matcher can only ever be partial.
//
// Every CHECK target below is adjudicated by ASKING POSTGRESQL TO STORE THE
// NULL: the claim is precisely "no row exists with a NULL here", and a
// rejected INSERT is that. Every statement target is adjudicated by RUNNING
// the query and reading the rows back.
// ---------------------------------------------------------------------------

/**
 * Each entry guards its own column with `<expr> OR <col> IS NOT NULL`. When
 * `<expr>` is FALSE the guard is real and the column cannot be NULL; when it
 * is TRUE or NULL the constraint is vacuous and the column can. Both
 * directions are present on purpose — a rule that read closed expressions
 * without keeping their polarity straight would claim the vacuous ones.
 */
const GUARDS: { col: string; expr: string; dead: boolean; blocked?: string; why: string }[] = [
  // --- The row as written: a cast the analyser does NOT fold away. ---------
  { col: "g_cast_int", expr: "0::boolean", dead: true, why: "integer→boolean cast" },
  {
    col: "g_cast_txt",
    expr: "('f'::text)::boolean",
    dead: true,
    blocked: "subtree-evaluator.ts typeSetOf, TypeCast: literal arguments only",
    why: "nested typed cast",
  },
  // --- The family the row did not name. ------------------------------------
  { col: "g_cmp_num", expr: "1 > 2", dead: true, why: "closed numeric comparison" },
  { col: "g_cmp_txt", expr: "'a' = 'b'", dead: true, why: "closed text comparison" },
  { col: "g_func", expr: "starts_with('abc', 'z')", dead: true, why: "closed function call" },
  { col: "g_array", expr: "ARRAY[1,2] @> ARRAY[3]", dead: true, why: "closed array operator" },
  { col: "g_jsonb", expr: "'{\"k\":1}'::jsonb ? 'z'", dead: true, why: "closed jsonb operator" },
  { col: "g_test", expr: "'f'::boolean IS TRUE", dead: true, why: "closed BooleanTest" },
  {
    col: "g_case",
    expr: "CASE WHEN 1 > 2 THEN true ELSE false END",
    dead: true,
    why: "closed CASE",
  },
  { col: "g_any", expr: "3 = ANY (ARRAY[1,2])", dead: true, why: "closed = ANY" },
  { col: "g_in", expr: "'x' IN ('y','z')", dead: true, why: "closed IN" },
  // --- The boundary, in the other direction. -------------------------------
  { col: "b_cast_int", expr: "1::boolean", dead: false, why: "a LIVE integer cast" },
  { col: "b_cmp", expr: "1 < 2", dead: false, why: "a LIVE closed comparison" },
  { col: "b_func", expr: "starts_with('abc', 'a')", dead: false, why: "a LIVE function call" },
  { col: "b_null", expr: "NULL::boolean", dead: false, why: "a NULL arm is not a dead one" },
];

const COLS = GUARDS.map(g => g.col);

const DDL = `
  CREATE TABLE closed_guard (
    id integer PRIMARY KEY,
    ${GUARDS.map(g => `${g.col} text`).join(",\n    ")},
    ${GUARDS.map(g => `CONSTRAINT k_${g.col} CHECK (${g.expr} OR ${g.col} IS NOT NULL)`).join(",\n    ")}
  );

  CREATE TABLE plain_rows (id integer PRIMARY KEY, v text);
`;

let pg: PGlite;
let catalog: NullabilityCatalog;
let evaluator: KillableEvaluator;

/** What the engine claims for the first output column of `sql`. */
async function claim(sql: string): Promise<boolean> {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const cols = await inferNullability(stmt, catalog, { evaluate: evaluator.evaluate });
  return cols[0]!.notNull;
}

/** What the engine claims for `closed_guard.<column>` read plainly. */
const guardClaim = (column: string): Promise<boolean> =>
  claim(`SELECT c.${column} AS v FROM closed_guard c`);

/**
 * Whether PostgreSQL REFUSES to store a NULL in that column — the only
 * evidence that settles a CHECK claim. Every OTHER guarded column is given a
 * value, or a sibling constraint would reject the row and the error would name
 * the wrong one.
 */
async function rejectsNull(column: string, id: number): Promise<string | null> {
  const vals = COLS.map(c => (c === column ? "NULL" : `'v'`)).join(", ");
  try {
    await pg.exec(`INSERT INTO closed_guard (id, ${COLS.join(", ")}) VALUES (${id}, ${vals})`);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

/** PostgreSQL's own verdict on a statement: whether it returns rows at all,
 *  and whether any returned row has a NULL in the first column. */
async function witness(sql: string): Promise<{ rows: number; anyNull: boolean }> {
  const r = await pg.query<Record<string, unknown>>(sql);
  return {
    rows: r.rows.length,
    anyNull: r.rows.some(row => Object.values(row)[0] === null),
  };
}

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(DDL);
  await pg.exec(`INSERT INTO plain_rows VALUES (1, 'a'), (2, NULL), (3, 'c')`);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), { searchPath: ["public"] });
  evaluator = await createKillableEvaluator({ schema: DDL });
}, 120_000);

afterAll(async () => {
  await evaluator?.close();
  if (pg && !pg.closed) await pg.close();
});

describe("closed boolean subexpressions — the premise", () => {
  it("PostgreSQL folds an UNKNOWN-literal cast and nothing else", async () => {
    // The register's row named `'t'::boolean`, and this is why that spelling
    // is not the case to fix: parse analysis has already turned it into a
    // bare `true` before the kernel could refuse it. The cast that survives
    // is the one from a TYPED expression.
    await pg.exec(`
      CREATE TABLE fold_probe (a integer,
        CONSTRAINT f_unknown CHECK (a > 0 OR 't'::boolean),
        CONSTRAINT f_typed   CHECK (a > 0 OR 1::boolean),
        CONSTRAINT f_nested  CHECK (a > 0 OR ('f'::text)::boolean),
        CONSTRAINT f_compute CHECK (a > 0 OR 1 > 2))`);
    const defs = new Map(
      (
        await pg.query<{ conname: string; def: string }>(
          `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
             WHERE conrelid = 'fold_probe'::regclass ORDER BY conname`,
        )
      ).rows.map(r => [r.conname, r.def]),
    );
    expect(defs.get("f_unknown")).toContain("OR true");
    expect(defs.get("f_typed")).toContain("(1)::boolean");
    expect(defs.get("f_nested")).toContain("('f'::text)::boolean");
    expect(defs.get("f_compute")).toContain("(1 > 2)");
  });

  it("PostgreSQL refuses the NULL behind every DEAD guard, and allows it behind every live one", async () => {
    // Adjudication for the whole table at once. A CHECK rejects on FALSE and
    // passes on TRUE-or-NULL, and `IS NOT NULL` is total — so
    // `<dead> OR (c IS NOT NULL)` is FALSE exactly when c is NULL.
    let id = 0;
    for (const g of GUARDS) {
      const err = await rejectsNull(g.col, ++id);
      if (g.dead) {
        expect(err, `${g.col} (${g.why}) should reject the NULL`).toMatch(`k_${g.col}`);
      } else {
        expect(err, `${g.col} (${g.why}) should accept the NULL`).toBeNull();
      }
    }
  });
});

describe("closed boolean subexpressions in a CHECK — targets", () => {
  // FLIPPED from `it.fails` by the `closed-truths.ts` round. Each of these was
  // nullable before it, with PostgreSQL refusing the NULL beside it.
  for (const g of GUARDS.filter(x => x.dead && !x.blocked)) {
    it(`${g.why} — the dead disjunct drops and the guard beside it holds`, async () => {
      expect(await guardClaim(g.col)).toBe(true);
    });
  }
});

describe("closed boolean subexpressions in a CHECK — a boundary that is NOT this module's", () => {
  // PostgreSQL refuses the NULL behind `('f'::text)::boolean` (asserted above
  // with the rest), so this is a real claim the engine does not make. The
  // refusal is not the kernel's and not this round's: the SUBTREE EVALUATOR
  // closes a cast only over a LITERAL argument, because a computed argument's
  // OUTPUT function crossing an I/O coercion is a measured settings leak
  // (`to_timestamp(0)::text` moves with TimeZone —
  // docs/subtree-evaluation.md). A cast over a cast is a computed argument, so
  // the position never becomes a question and no answer exists to read.
  //
  // Recorded rather than worked around. Reaching past the evaluator's gate
  // from here would mean this module deciding a closure question the evaluator
  // owns, which is how one gate becomes two that disagree.
  const g = GUARDS.find(x => x.blocked)!;
  it(`${g.why} — refused, and the refusal belongs to ${g.blocked}`, async () => {
    expect(await guardClaim(g.col)).toBe(false);
  });
});

describe("closed boolean subexpressions in a CHECK — boundary guards", () => {
  // The mutation guards. Reading closed expressions without their polarity —
  // treating any closed arm as droppable — claims these four, and PostgreSQL
  // has the NULL to contradict each one.
  for (const g of GUARDS.filter(x => !x.dead)) {
    it(`${g.why} — proves nothing, and must keep proving nothing`, async () => {
      expect(await guardClaim(g.col)).toBe(false);
    });
  }
});

describe("closed boolean subexpressions in a statement predicate", () => {
  // The walk's OR rule, not the kernel's. `predicateProvesNonNull` requires
  // EVERY disjunct to prove, and a dead disjunct proves nothing — so an arm
  // that cannot fire defeats the arm beside it that does all the work.
  const WINS = [
    ["a bare FALSE disjunct", "SELECT v FROM plain_rows WHERE false OR v IS NOT NULL"],
    ["a closed comparison", "SELECT v FROM plain_rows WHERE 1 > 2 OR v IS NOT NULL"],
    ["a closed text comparison", "SELECT v FROM plain_rows WHERE 'a' = 'b' OR v IS NOT NULL"],
    [
      "a closed function call",
      "SELECT v FROM plain_rows WHERE starts_with('abc','z') OR v IS NOT NULL",
    ],
    ["a negated TRUE", "SELECT v FROM plain_rows WHERE NOT true OR v IS NOT NULL"],
    [
      "a dead arm among three",
      "SELECT v FROM plain_rows WHERE 1 > 2 OR v IS NOT NULL OR v = 'a'",
    ],
    ["a dead arm in an ON clause", "SELECT p.v FROM plain_rows p JOIN plain_rows q ON q.id = p.id AND (1 > 2 OR p.v IS NOT NULL)"],
  ] as const;

  for (const [why, sql] of WINS) {
    it(`${why} is dropped from the OR rule`, async () => {
      const w = await witness(sql);
      // PostgreSQL's own answer first: the claim is only worth making if the
      // query returns rows and none of them has a NULL there.
      expect(w.rows, sql).toBeGreaterThan(0);
      expect(w.anyNull, sql).toBe(false);
      expect(await claim(sql)).toBe(true);
    });
  }

  const BOUNDS = [
    ["a LIVE disjunct", "SELECT v FROM plain_rows WHERE 1 < 2 OR v IS NOT NULL"],
    ["a bare TRUE disjunct", "SELECT v FROM plain_rows WHERE true OR v IS NOT NULL"],
    [
      "an unprovable open disjunct",
      "SELECT v FROM plain_rows WHERE v IS NOT NULL OR id > 0",
    ],
  ] as const;

  for (const [why, sql] of BOUNDS) {
    it(`${why} keeps proving nothing`, async () => {
      const w = await witness(sql);
      expect(w.anyNull, sql).toBe(true);
      expect(await claim(sql)).toBe(false);
    });
  }

  it("every disjunct dead claims nothing — the predicate cannot be TRUE at all", async () => {
    // Vacuously the rows satisfy any claim, because there are none. Claiming
    // from an empty result is sound and useless, and it is the one shape where
    // dropping arms could run out of arms — so it refuses rather than reaching
    // for a rule with nothing left to apply.
    const sql = "SELECT v FROM plain_rows WHERE 1 > 2 OR 'a' = 'b'";
    expect((await witness(sql)).rows).toBe(0);
    expect(await claim(sql)).toBe(false);
  });
});

describe("closed boolean subexpressions — the probe budget", () => {
  it("no probe had to be killed", () => {
    expect(evaluator.killedSql).toEqual([]);
  });
});
