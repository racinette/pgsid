import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import {
  NON_TOTAL_OPERATOR_SIGNATURES,
  NON_STRICT_OVERLOADS,
} from "../../../src/query/operators.js";
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
// So `+(integer, ?)` answers from the rows an integer left reaches, and
// `+(path, ?)` from the two rows a path left reaches. Both are one-sided
// narrowings; they differ because their subsets differ, not because one side
// is "enough" and the other is not. The second block asks the resolvers that
// question directly, with one side literally `null`, so the property is
// pinned independently of which query shapes happen to lose a type this
// month.
//
// WHICH SHAPES THOSE ARE MOVED THE SAME DAY. The first spelling of this file
// staged values through a set operation, because a set-op CTE column read
// untyped. `reExportedTypeSet` closed that (fourth block), so the durable
// source of an unreadable-but-non-null value is now a WINDOW call: the type
// reading refuses one by design, its semantics living in its own dispatch.
//
// Every claim below is adjudicated against PostgreSQL in the same assertion —
// `pgIsNull` is that adjudication, so a target can never drift away from what
// the database does.
// ---------------------------------------------------------------------------

const DDL = `
-- A path-typed table: the ONLY thing that can witness the \`+\` hole, and the
-- reason the corpus had none before (see the fixture's own header).
CREATE TABLE route (
  id  integer NOT NULL PRIMARY KEY,
  n   integer NOT NULL,
  seg path    NOT NULL,
  alt path    NOT NULL
);
INSERT INTO route VALUES (1, 10, '((0,0),(1,1),(2,0))', '((0,0),(3,3),(4,0))');

CREATE TABLE tagged (id integer NOT NULL PRIMARY KEY, tags text[], more text[]);
INSERT INTO tagged VALUES (1, NULL, '{x}'), (2, '{a}', '{b}');

CREATE TABLE txt (a text, b text);
INSERT INTO txt VALUES (NULL, 'y'), ('x', 'y');
`;

let pg: PGlite;
let catalog: NullabilityCatalog;

/** The engine's claim for the named output column, or the first one. */
async function claim(sql: string, column?: string): Promise<boolean> {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const evaluate = async (q: string) =>
    (await pg.query<Record<string, unknown>>(q)).rows[0];
  const cols = await inferNullability(stmt, catalog, { evaluate });
  const col = column ? cols.find(c => c.name === column) : cols[0];
  if (!col) throw new Error(`no output column ${column ?? "[0]"} in ${sql}`);
  return col.notNull;
}

/** Whether PostgreSQL puts a NULL in `column` (or the first column) of ANY
 *  returned row — the only thing that can falsify a `notNull`. An empty
 *  result witnesses nothing and says so rather than reading as agreement. */
async function pgIsNull(sql: string, column?: string): Promise<boolean | "no rows"> {
  const rows = (await pg.query<Record<string, unknown>>(sql)).rows;
  if (rows.length === 0) return "no rows";
  return rows.some(r => (column ? r[column] : Object.values(r)[0]) === null);
}

/** The walk's type reading for each column reference, as the audit records
 *  it: the type set joined, or null where the walk read no type. */
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

// An UNREADABLE but non-null value. `PARTITION BY` the primary key makes each
// window its own row, so the value IS the column — the query means exactly
// what the same expression without the window would mean, and only the
// TYPE READING is different.
const OPAQUE_PATHS = `SELECT first_value(r.seg) OVER (PARTITION BY r.id) AS a,
                             first_value(r.alt) OVER (PARTITION BY r.id) AS b
                        FROM route r`;
const OPAQUE_ARRAYS = `SELECT first_value(t.tags) OVER (PARTITION BY t.id) AS a,
                              first_value(t.more) OVER (PARTITION BY t.id) AS b
                         FROM tagged t`;
const OPAQUE_INTS = `SELECT first_value(r.n) OVER (PARTITION BY r.id) AS v,
                            first_value(r.id) OVER (PARTITION BY r.id) AS w
                       FROM route r`;
const OPAQUE_TEXT = `SELECT first_value(t.b) OVER (PARTITION BY t.a) AS v FROM txt t`;

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(DDL);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), {
    searchPath: ["public"],
  });
});

describe("the premise: a window call is unreadable AND non-null", () => {
  it("reads no type for it, and still claims the value itself notNull", async () => {
    const sql = `WITH s AS (${OPAQUE_PATHS}) SELECT s.a AS raw, s.a + s.b AS sum FROM s`;
    expect((await readings(sql)).get("s.a")).toBeNull();
    // The control that makes every `opaque` target below mean something: the
    // OPERANDS are non-null, so a nullable result is the operator's doing and
    // nothing else's.
    expect(await claim(sql, "raw")).toBe(true);
    expect(await pgIsNull(sql, "raw")).toBe(false);
  });
});

describe("the resolvers, asked with one side null", () => {
  // The property itself, independent of any query shape: this IS "we know x is
  // INTEGER but y is unknown".
  const totality = (l: string[] | null, r: string[] | null): string =>
    catalog.resolveOperatorTotality(undefined, "+", l, r).kind;

  it("`+` with ONE integer operand → total, whichever side it is on", () => {
    expect(totality(["integer"], null)).toBe("total");
    expect(totality(null, ["integer"])).toBe("total");
  });

  it("`+` with ONE path operand → nullable, whichever side it is on", () => {
    expect(totality(["path"], null)).toBe("nullable");
    expect(totality(null, ["path"])).toBe("nullable");
  });

  it("`+` with NEITHER side known → unknown, which is what cedes to the guard", () => {
    // The resolver does not answer here; the walk's name-level fallback does,
    // and since 2026-08-24 it refuses instead of claiming.
    expect(totality(null, null)).toBe("unknown");
  });

  it("`||` with ONE text operand → NOT strict, and with both → strict", () => {
    const strictness = (l: string[] | null, r: string[] | null): boolean | null =>
      catalog.resolveOperatorStrictness(undefined, "||", l, r);
    expect(strictness(["text"], ["text"])).toBe(true);
    expect(strictness(["text"], null)).toBe(false);
    expect(strictness(null, ["text"])).toBe(false);
  });

  it("records exactly one non-total `+` row, and PostgreSQL agrees it is the only one", async () => {
    expect([...NON_TOTAL_OPERATOR_SIGNATURES].filter(k => k.startsWith("+("))).toEqual([
      "+(path,path)",
    ]);
    // What the two answers above rest on, read from the database rather than
    // asserted: an INTEGER left cannot reach the hole and a PATH left cannot
    // avoid it. A future PostgreSQL that adds an integer-reachable non-total
    // row breaks this test rather than silently widening the claim.
    const fromInt = await plusRowsReachableFrom("integer");
    expect(fromInt.length).toBeGreaterThan(1);
    expect(fromInt).not.toContain("path,path");
    expect(await plusRowsReachableFrom("path")).toEqual(["path,path", "path,point"]);
  });
});

describe("`+`: the subset an integer operand reaches has no hole", () => {
  it("NEITHER operand known → the subset is every row, the hole among them → nullable", async () => {
    const sql = `WITH s AS (${OPAQUE_PATHS}) SELECT s.a + s.b AS combined FROM s`;
    expect(await claim(sql)).toBe(false);
    expect(await pgIsNull(sql)).toBe(true);
  });

  it("LEFT known integer, right unknown → subset has no hole → notNull", async () => {
    const sql = `WITH s AS (${OPAQUE_INTS}) SELECT r2.id + s.v AS combined FROM s, route r2`;
    expect(await claim(sql)).toBe(true);
    expect(await pgIsNull(sql)).toBe(false);
  });

  it("RIGHT known integer, left unknown → same subset, same answer → notNull", async () => {
    // The literal spelling, which is what keeps `id + 1` alive under the
    // refusal: `s.v` is unreadable and `1` is the whole narrowing.
    const sql = `WITH s AS (${OPAQUE_INTS}) SELECT s.v + 1 AS combined FROM s`;
    expect(await claim(sql)).toBe(true);
    expect(await pgIsNull(sql)).toBe(false);
  });

  it("LEFT known PATH, right unknown → knowing an operand narrows, it does not license", async () => {
    // The one that says the rule is a SUBSET and not "one side known ⇒ trust
    // the name". `path` on the left leaves `+(path,path)` in the subset.
    const sql = `WITH s AS (${OPAQUE_PATHS}) SELECT r2.seg + s.a AS combined FROM s, route r2`;
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
  it("records the array row as the reason the name is kept", () => {
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
    const sql = `WITH s AS (${OPAQUE_ARRAYS})
                 SELECT s.a AS promoted FROM s WHERE (s.a || s.b) = ARRAY['x']`;
    expect(await claim(sql)).toBe(false);
    expect(await pgIsNull(sql)).toBe(true);
  });

  it("LEFT known text, right unknown → still nullable, and that is SOUND not shy", async () => {
    const sql = `WITH s AS (${OPAQUE_TEXT})
                 SELECT t2.a AS promoted FROM txt t2, s WHERE (t2.a || s.v) = 'xy'`;
    expect(await claim(sql)).toBe(false);
    // Why the subset still holds a non-strict row with `text` on the left:
    // `anycompatible || anycompatiblearray` accepts it, and PostgreSQL really
    // runs it — the concatenation ABSORBS the NULL instead of returning one.
    // So a TRUE comparison through `text || <unknown>` proves nothing about
    // the left operand, and the refusal is the correct answer rather than a
    // conservative one.
    const prepend = (
      await pg.query<{ t: string; v: string }>(
        `SELECT pg_typeof('x'::text || ARRAY['a'])::text AS t,
                (NULL::text || ARRAY['a'])::text AS v`,
      )
    ).rows[0];
    expect(prepend).toEqual({ t: "text[]", v: "{NULL,a}" });
  });
});

describe("the two typing gaps the refusal exposed, both closed", () => {
  // These were the whole measured precision cost of refusing the name-level
  // claims, and they were one function's two refusals: `reExportedBaseColumn`
  // answers "WHICH base column is this", which has no word for a value with
  // no base column. `reExportedTypeSet` asks it in TYPES instead.

  it("a SET-OP column types from the union of its branches", async () => {
    const sql = `WITH s AS (SELECT r.n AS v, r.id AS w FROM route r
                            UNION ALL
                            SELECT r.id, r.n FROM route r)
                 SELECT s.v + s.w AS combined FROM s`;
    expect((await readings(sql)).get("s.v")).toBe("integer");
    expect(await claim(sql)).toBe(true);
    expect(await pgIsNull(sql)).toBe(false);
  });

  it("a COMPUTED CTE column types from the expression, in the inner scope", async () => {
    const sql = `WITH s AS (SELECT r.n * 2 AS v, r.id * 3 AS w FROM route r)
                 SELECT s.v + s.w AS combined FROM s`;
    expect((await readings(sql)).get("s.v")).toBe("integer");
    expect(await claim(sql)).toBe(true);
    expect(await pgIsNull(sql)).toBe(false);
  });

  it("branches that DISAGREE give the union, which never over-eliminates", async () => {
    // The union is a superset of what PostgreSQL resolves, which is the
    // contract every type set in the walk runs on: eliminate only what NO
    // member can reach.
    const sql = `WITH s AS (SELECT r.n AS v FROM route r
                            UNION ALL
                            SELECT r.n::numeric FROM route r)
                 SELECT s.v + s.v AS combined FROM s`;
    expect((await readings(sql)).get("s.v")).toBe("integer|numeric");
    expect(await claim(sql)).toBe(true);
    expect(await pgIsNull(sql)).toBe(false);
  });

  it("a branch nothing can type refuses the whole union rather than answering from the rest", async () => {
    // Answering `integer` here would be a claim that the OTHER branch cannot
    // contribute a type outside it, which is exactly what is unknown.
    const sql = `WITH s AS (SELECT r.n AS v FROM route r
                            UNION ALL
                            SELECT first_value(r.n) OVER (PARTITION BY r.id) FROM route r)
                 SELECT s.v + s.v AS combined FROM s`;
    expect((await readings(sql)).get("s.v")).toBeNull();
  });

  it("nests: three branches, one of them computed", async () => {
    const sql = `WITH s AS (SELECT r.n AS v FROM route r
                            UNION ALL SELECT r.id FROM route r
                            UNION ALL SELECT r.n * 2 FROM route r)
                 SELECT s.v + s.v AS combined FROM s`;
    expect((await readings(sql)).get("s.v")).toBe("integer");
    expect(await claim(sql)).toBe(true);
  });

  it("WITH RECURSIVE does not loop: the branch that reads the column refuses", async () => {
    // The cycle guard, by AST identity. `s.v` in the recursive branch is the
    // column being typed, so it answers null there; `s.v + 1` then narrows on
    // the literal alone and the outer union contains `integer`, which is what
    // PostgreSQL resolves. Containment, which is all a type set promises.
    const sql = `WITH RECURSIVE s(v) AS (
                   SELECT 1 UNION ALL SELECT s.v + 1 FROM s WHERE s.v < 3
                 )
                 SELECT s.v + 0 AS raw FROM s`;
    const read = (await readings(sql)).get("s.v");
    expect(read).not.toBeNull();
    expect(read!.split("|")).toContain("integer");
    expect(await pgIsNull(sql)).toBe(false);
  });

  it("a PLAIN CTE column still types through the base column, unchanged", async () => {
    const sql = `WITH s AS (SELECT r.n AS v, r.id AS w FROM route r)
                 SELECT s.v + s.w AS combined FROM s`;
    expect((await readings(sql)).get("s.v")).toBe("integer");
    expect(await claim(sql)).toBe(true);
  });
});

describe("what is still unreadable, and why that is a different question", () => {
  // Not a residue of the re-export reading — these expression kinds are
  // refused by `operandTypeSetOf` itself, each because its semantics live in
  // its own dispatch. They are the shapes the name-level guard now covers,
  // which is why the two fixtures were moved onto one of them.
  it("window and aggregate calls read no type", async () => {
    expect(
      (
        await readings(`WITH s AS (${OPAQUE_INTS}) SELECT s.v + s.v AS c FROM s`)
      ).get("s.v"),
    ).toBeNull();
    expect(
      (
        await readings(
          `WITH s AS (SELECT max(r.n) AS v FROM route r) SELECT s.v + s.v AS c FROM s`,
        )
      ).get("s.v"),
    ).toBeNull();
  });
});
