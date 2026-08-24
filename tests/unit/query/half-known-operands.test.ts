import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import { NON_TOTAL_OPERATOR_SIGNATURES, NON_STRICT_OVERLOADS } from "../../../src/query/operators.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// THE OVERLOAD SUBSET RULE, AND WHAT KNOWING ONE OPERAND BUYS
//
// `name-level-partial-overload.sql` and `non-strict-overload-promotion.sql`
// record the two unsoundnesses of 2026-08-24: a name kept on TOTAL_OPERATORS
// (`+`, hole `+(path,path)`) and one kept on STRICT_OPERATORS (`||`, hole
// `anycompatiblearray || anycompatible`) were both CLAIMED at the name-level
// fallback — which is reached exactly where the operand types are unreadable,
// which is exactly where the offending row cannot be eliminated.
//
// The fix refuses at that fallback. This file exists because the fallback is
// NOT the only place operand types are incomplete, and a refusal there must
// not be mistaken for a refusal whenever ANYTHING is unknown. The rule is:
//
//   the candidate set is the overload subset the KNOWN operands can reach,
//   and the verdict quantifies over that subset — never over the name.
//
// So `a(int, ?)` answers from the rows with an integer-reachable left, and
// `a(path, ?)` from the two rows with a path left. Both are one-sided
// narrowings; they differ because their subsets differ, not because one side
// is "enough" and the other is not. Every claim below is adjudicated against
// PostgreSQL in the same assertion — `pgIsNull` and `pgTypeOf` are that
// adjudication, so a target can never drift away from what the database does.
//
// The last block is the MEASURED COST of the refusal, kept red: two shapes
// that were claimed before the fix, are conservative after it, and are
// recoverable — the cause is located in the assertions.
// ---------------------------------------------------------------------------

const DDL = `
-- A path-typed table: the ONLY thing that can witness the `+` hole, and the
-- reason the corpus could not before (see the fixture's own header).
CREATE TABLE route (
  id  integer NOT NULL,
  n   integer NOT NULL,
  seg path    NOT NULL,
  alt path    NOT NULL
);
INSERT INTO route VALUES (1, 10, '((0,0),(1,1),(2,0))', '((0,0),(3,3),(4,0))');

CREATE TABLE tagged (id integer NOT NULL, tags text[], more text[]);
INSERT INTO tagged VALUES (1, NULL, '{x}'), (2, '{a}', '{b}');

CREATE TABLE txt (a text, b text);
INSERT INTO txt VALUES (NULL, 'y'), ('x', 'y');
`;

let pg: PGlite;
let catalog: NullabilityCatalog;

/** The engine's claim for the first output column. */
async function claim(sql: string): Promise<boolean> {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const evaluate = async (q: string) =>
    (await pg.query<Record<string, unknown>>(q)).rows[0];
  const cols = await inferNullability(stmt, catalog, { evaluate });
  return cols[0]!.notNull;
}

/** Whether PostgreSQL puts a NULL in the first column of ANY returned row —
 *  the only thing that can falsify a `notNull`. An empty result witnesses
 *  nothing and is reported as such rather than as agreement. */
async function pgIsNull(sql: string): Promise<boolean | "no rows"> {
  const rows = (await pg.query<Record<string, unknown>>(sql)).rows;
  if (rows.length === 0) return "no rows";
  return rows.some(r => Object.values(r)[0] === null);
}

/** The walk's type reading for an operand, as the audit records it. */
async function readings(sql: string): Promise<Map<string, string | null>> {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const audit: { expr: unknown; set: string[] | null }[] = [];
  await inferNullability(stmt, catalog, { typeSetAudit: audit });
  const out = new Map<string, string | null>();
  for (const rec of audit) {
    const cr = (rec.expr as Record<string, { fields?: unknown[] }>)["ColumnRef"];
    if (!cr) continue;
    const name = cr
      .fields!.map(f => (f as { String?: { sval?: string } }).String?.sval ?? "*")
      .join(".");
    out.set(name, rec.set === null ? null : rec.set.join("|"));
  }
  return out;
}

/** Every binary `+` row PostgreSQL carries whose LEFT operand `from` reaches
 *  by an implicit cast (or is exactly), rendered as `left,right`. */
async function plusRowsReachableFrom(from: string): Promise<string[]> {
  const rows = (
    await pg.query<{ l: string; r: string }>(
      `SELECT format_type(o.oprleft, null) AS l, format_type(o.oprright, null) AS r
         FROM pg_operator o
        WHERE o.oprname = '+' AND o.oprkind = 'b'
          AND (o.oprleft = $1::regtype
               OR EXISTS (SELECT 1 FROM pg_cast c
                           WHERE c.castsource = $1::regtype
                             AND c.casttarget = o.oprleft
                             AND c.castcontext = 'i'))
        ORDER BY 1, 2`,
      [from],
    )
  ).rows;
  return rows.map(x => `${x.l},${x.r}`);
}

// A set operation is how a column arrives with NO readable type: the walk's
// re-export reading refuses a target list under `SETOP_*` outright. Every
// "unknown" operand below is produced this way, and the first test proves it
// rather than assuming it.
const SWAPPED_PATHS = `SELECT r.seg AS a, r.alt AS b, r.id AS n FROM route r
                       UNION ALL
                       SELECT r.alt, r.seg, r.id + 1 FROM route r`;
const SWAPPED_INTS = `SELECT r.n AS v, r.id AS w FROM route r
                      UNION ALL
                      SELECT r.id, r.n FROM route r`;
const SWAPPED_ARRAYS = `SELECT t.tags AS a, t.more AS b FROM tagged t
                        UNION ALL
                        SELECT t.more, t.tags FROM tagged t`;
const SWAPPED_TEXT = `SELECT t.a AS v FROM txt t UNION ALL SELECT t.b FROM txt t`;

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(DDL);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), {
    searchPath: ["public"],
  });
});

describe("the premise: a set operation loses the type", () => {
  it("reads NO type for a set-op column, whatever its branches are", async () => {
    const sets = await readings(
      `WITH s AS (${SWAPPED_PATHS}) SELECT s.a + s.b AS c, s.n + s.n AS d FROM s`,
    );
    // Not just the exotic one — the INTEGER column is equally unreadable, which
    // is why `s.n + 1` below is carried by the literal and not by the union.
    expect(sets.get("s.a")).toBeNull();
    expect(sets.get("s.n")).toBeNull();
    // The same columns read straight off the table DO type: the loss is the
    // set operation's, not the path type's.
    expect((await readings(`SELECT r.seg + r.alt AS c FROM route r`)).get("r.seg")).toBe("path");
  });
});

describe("`+`: the subset an integer operand reaches has no hole", () => {
  it("records exactly one non-total `+` row, and PostgreSQL agrees it is the only one", async () => {
    const recorded = [...NON_TOTAL_OPERATOR_SIGNATURES].filter(k => k.startsWith("+("));
    expect(recorded).toEqual(["+(path,path)"]);
    // The claim the whole block rests on: an INTEGER left cannot reach it, and
    // a PATH left cannot avoid it. Read from pg_operator/pg_cast so a future
    // PostgreSQL that adds an integer-reachable row breaks this rather than
    // silently widening the claim.
    const fromInt = await plusRowsReachableFrom("integer");
    expect(fromInt.length).toBeGreaterThan(1);
    expect(fromInt).not.toContain("path,path");
    expect(await plusRowsReachableFrom("path")).toEqual(["path,path", "path,point"]);
  });

  it("NEITHER operand known → the subset is every row, the hole among them → nullable", async () => {
    const sql = `WITH s AS (${SWAPPED_PATHS}) SELECT s.a + s.b AS combined FROM s`;
    expect(await claim(sql)).toBe(false);
    expect(await pgIsNull(sql)).toBe(true);
  });

  it("LEFT known integer, right unknown → subset has no hole → notNull", async () => {
    const sql = `WITH s AS (${SWAPPED_INTS}) SELECT r2.id + s.v AS combined FROM s, route r2`;
    expect(await claim(sql)).toBe(true);
    expect(await pgIsNull(sql)).toBe(false);
  });

  it("RIGHT known integer, left unknown → same subset, same answer → notNull", async () => {
    // The literal spelling, which is what keeps `id + 1` alive under the
    // refusal. `s.v` is unreadable (first block); `1` is the whole narrowing.
    const sql = `WITH s AS (${SWAPPED_INTS}) SELECT s.v + 1 AS combined FROM s`;
    expect(await claim(sql)).toBe(true);
    expect(await pgIsNull(sql)).toBe(false);
  });

  it("LEFT known PATH, right unknown → knowing an operand narrows, it does not license", async () => {
    // The one that says the rule is a SUBSET and not "one side known ⇒ trust
    // the name". `path` on the left leaves `+(path,path)` in the subset.
    const sql = `WITH s AS (${SWAPPED_PATHS}) SELECT r2.seg + s.a AS combined FROM s, route r2`;
    expect(await claim(sql)).toBe(false);
    expect(await pgIsNull(sql)).toBe(true);
  });

  it("BOTH known path → the hole is the exact match → nullable", async () => {
    const sql = `SELECT r.seg + r.alt AS combined FROM route r`;
    expect(await claim(sql)).toBe(false);
    expect(await pgIsNull(sql)).toBe(true);
  });

  it("BOTH known integer → notNull, the claim the name was kept for", async () => {
    const sql = `SELECT r.id + r.n AS combined FROM route r`;
    expect(await claim(sql)).toBe(true);
    expect(await pgIsNull(sql)).toBe(false);
  });
});

describe("`||`: the same rule, and knowing one operand is NOT enough", () => {
  it("records the array row as the reason the name is kept", async () => {
    expect(NON_STRICT_OVERLOADS["||"]).toBeDefined();
  });

  it("BOTH known text → strict → the promotion survives the refusal", async () => {
    // The control that the strictness fix did not cost text concatenation its
    // meaning: `t.a` is a NULLABLE column promoted by the predicate.
    const sql = `SELECT t.a AS promoted FROM txt t WHERE (t.a || t.b) = 'xy'`;
    expect(await claim(sql)).toBe(true);
    expect(await pgIsNull(sql)).toBe(false);
    expect((await pg.query(`SELECT (NULL::text || 'a'::text) IS NULL AS r`)).rows[0]).toEqual({
      r: true,
    });
  });

  it("NEITHER operand known → nullable, and PostgreSQL returns the NULL row", async () => {
    const sql = `WITH s AS (${SWAPPED_ARRAYS})
                 SELECT s.a AS promoted FROM s WHERE (s.a || s.b) = ARRAY['x']`;
    expect(await claim(sql)).toBe(false);
    expect(await pgIsNull(sql)).toBe(true);
  });

  it("LEFT known text, right unknown → still nullable, and that is SOUND not shy", async () => {
    const sql = `WITH s AS (${SWAPPED_TEXT})
                 SELECT t2.a AS promoted FROM txt t2, s WHERE (t2.a || s.v) = 'xy'`;
    expect(await claim(sql)).toBe(false);
    // Why the subset still holds a non-strict row with `text` on the left:
    // `anycompatible || anycompatiblearray` accepts it, and PostgreSQL really
    // does run it — the concatenation ABSORBS the NULL instead of returning
    // one. So a TRUE comparison through `text || <unknown>` proves nothing
    // about the left operand, and the refusal is the correct answer rather
    // than a conservative one.
    const prepend = (
      await pg.query<{ t: string; v: string }>(
        `SELECT pg_typeof('x'::text || ARRAY['a'])::text AS t,
                (NULL::text || ARRAY['a'])::text AS v`,
      )
    ).rows[0];
    expect(prepend).toEqual({ t: "text[]", v: "{NULL,a}" });
  });
});

describe("the measured COST of the refusal — recoverable, and located", () => {
  // Both shapes were claimed notNull before 2026-08-24 and are conservative
  // after it. Neither is unsound now; both are precision the engine used to
  // have on no grounds and should get back on real ones. The grounds are the
  // same in both: type the CTE column, and the subset narrows to the integer
  // rows exactly as it does one line up.
  //
  // The cause is ONE function, `reExportedBaseColumn` in nullability-walk.ts,
  // which follows a CTE/subquery column to a BASE TABLE column and refuses
  // anything else — a set-op target list on its first line, a computed target
  // entry on its ColumnRef check. Recovering either needs the inner query's
  // own scope, which that reading does not build today.

  it.fails("both operands unknown but INTEGER through a set operation", async () => {
    const sql = `WITH s AS (${SWAPPED_INTS}) SELECT s.v + s.w AS combined FROM s`;
    expect(await pgIsNull(sql)).toBe(false);
    expect(await claim(sql)).toBe(true);
  });

  it.fails("a COMPUTED CTE column, no set operation involved", async () => {
    // The walk types `r.n * 2` as integer while analysing the CTE body — the
    // reading is made and then dropped at the re-export.
    const sql = `WITH s AS (SELECT r.n * 2 AS v, r.id * 3 AS w FROM route r)
                 SELECT s.v + s.w AS combined FROM s`;
    expect(await pgIsNull(sql)).toBe(false);
    expect(await claim(sql)).toBe(true);
  });

  it("a PLAIN CTE column still types, so the gap is those two shapes and not CTEs", async () => {
    const sql = `WITH s AS (SELECT r.n AS v, r.id AS w FROM route r)
                 SELECT s.v + s.w AS combined FROM s`;
    expect(await claim(sql)).toBe(true);
    expect(await pgIsNull(sql)).toBe(false);
  });
});
