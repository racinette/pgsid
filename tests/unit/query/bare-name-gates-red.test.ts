import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The RED SUITE for the two remaining BARE-NAME GATES —
// `evalUserOperatorNames` and `evalUserTypeNames`. Same idiom as
// `overload-merge-red.test.ts`:
// `it.fails` targets that flip to plain `it` in the commit that fixes them,
// plain `it` boundary guards that must never move.
//
// The two gates do NOT close the same way, and that is the finding. Operators
// have operands, so they answer by SURVIVAL like the function side. Types
// have nothing to eliminate with, so they answer by PATH: pg_catalog is
// searched first unless the search path names it explicitly, and the second
// block below adjudicates both sides of that against PostgreSQL.
//
// Found by MEASUREMENT (2026-08-20): appending name-only-colliding user
// operators to the shared fixture schema and running the corpus. Eight
// fixtures moved, and the two directions are not the same finding.
//
//   * TWO were UNSOUND — `extreme-jsonb-operators`.json_access and
//     `expression-node-coverage`.json_get went from nullable to NOTNULL
//     because the walk dispatched `jsonb -> unknown` through a user
//     `->(boolean, boolean)`. PostgreSQL answers NULL for a missing key.
//     That is defect 1 below, and it is why this file exists.
//
//   * SIX were the name-rule fallback's DELIBERATE conservatism —
//     `$1 || 'x'`, `a.total + b.total` and friends, where neither operand
//     types and a user `||`/`+` could genuinely be the resolution. The
//     retirement condition for those is recorded in `catalog-adapter.ts`
//     ("the fallback retires when those two sources type"), is unrelated to
//     the gate, and is NOT a target here. It is also why the colliding
//     operators are not added to the shared schema the way `scale(boolean)`
//     was: elimination rescues a typed function argument, and there is
//     nothing to rescue an untypeable operand with.
//
// Every target below was adjudicated against PostgreSQL under the same
// catalog the walk was given — `oracle()` is that adjudication, kept in the
// assertion so a target can never drift away from what the database does.
// ---------------------------------------------------------------------------

interface Scenario {
  pg: PGlite;
  catalog: NullabilityCatalog;
}

const scenarios: Record<string, Scenario> = {};

async function claim(s: Scenario, sql: string): Promise<boolean> {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const evaluate = async (q: string) =>
    (await s.pg.query<Record<string, unknown>>(q)).rows[0];
  const cols = await inferNullability(stmt, s.catalog, { evaluate });
  return cols[0]!.notNull;
}

async function oracle(s: Scenario, sql: string): Promise<unknown> {
  const r = await s.pg.query<Record<string, unknown>>(sql);
  return Object.values(r.rows[0] ?? {})[0] ?? null;
}

/** The error PostgreSQL raises for a query, or null if it answers. The
 *  adjudication a NULL/non-null oracle cannot express. */
async function raises(s: Scenario, sql: string): Promise<string | null> {
  try {
    await s.pg.query(sql);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

async function build(ddl: string, searchPath: string[] = ["public"]): Promise<Scenario> {
  const pg = await PGlite.create();
  await pg.exec(
    `CREATE TABLE s (t text NOT NULL, j jsonb NOT NULL);
     INSERT INTO s VALUES ('abc', '{}'::jsonb);
     CREATE TABLE dt (d date NOT NULL, CONSTRAINT dt_c CHECK (d > '2020-01-01'));`,
  );
  await pg.exec(ddl);
  if (searchPath.includes("pg_catalog")) {
    await pg.exec(`SET search_path = ${searchPath.join(", ")};`);
  }
  const catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), { searchPath });
  return { pg, catalog };
}

/** Relations named after pg_catalog types. Every one of these is an ordinary
 *  name for an ordinary table — `line` for order lines, `date` for a calendar
 *  — which is the whole point: nothing exotic is needed to trip the gate. */
const TYPE_SHADOW_DDL = `CREATE TABLE "date" (x integer);
   CREATE TABLE "jsonb" (x integer);
   CREATE TABLE "numeric" (x integer);
   CREATE TABLE "line" (x integer);`;

beforeAll(async () => {
  // No user operator of any colliding symbol — the controls.
  scenarios.plain = await build(`SELECT 1;`);

  // User operators colliding with a pg_catalog symbol BY NAME ONLY. Nothing
  // here can accept a jsonb, a text or a numeric on either side, so
  // PostgreSQL eliminates every one of them by operand type.
  //
  // `->` is the load-bearing one: it is not a CURATED operator name, so
  // `builtinOperatorSignatures` holds no pg_catalog rows for it at all
  // (the capture is keyed on TOTAL_OPERATORS ∪ STRICT_OPERATORS). The
  // typed narrowing therefore eliminates the user row, finds no builtin row
  // to fall back on, and answers "unknown" — which is where the elimination
  // is DISCARDED and the bare-name path dispatches the row that was just
  // ruled out.
  scenarios.collide = await build(
    `CREATE FUNCTION public.bool_pair(a boolean, b boolean) RETURNS boolean
       LANGUAGE sql IMMUTABLE AS $$ SELECT $1 AND $2 $$;
     CREATE OPERATOR public.-> (leftarg = boolean, rightarg = boolean, function = public.bool_pair);
     CREATE OPERATOR public.->> (leftarg = boolean, rightarg = boolean, function = public.bool_pair);
     CREATE OPERATOR public.|| (leftarg = boolean, rightarg = boolean, function = public.bool_pair);
     CREATE OPERATOR public.+ (leftarg = boolean, rightarg = boolean, function = public.bool_pair);`,
  );

  // A user operator that GENUINELY resolves for the operands it is given —
  // the boundary the fix must not cross. `~~~` carries no builtin at all and
  // its operands are exactly the types the query passes.
  scenarios.genuine = await build(
    `CREATE FUNCTION public.tt(a text, b text) RETURNS text
       LANGUAGE sql IMMUTABLE STRICT AS $$ SELECT $1 || $2 $$;
     CREATE OPERATOR public.~~~ (leftarg = text, rightarg = text, function = public.tt);
     CREATE FUNCTION public.tnull(a text, b text) RETURNS text
       LANGUAGE sql IMMUTABLE AS $$ SELECT NULL::text $$;
     CREATE OPERATOR public.~~~~ (leftarg = text, rightarg = text, function = public.tnull);`,
  );

  // A user `=` and `<` over a COMPOSITE pair — the two most load-bearing
  // comparison symbols there are, polluted. Nothing here can accept an
  // integer, so PostgreSQL eliminates both and runs the builtin.
  //
  // These stay LOCAL rather than joining the shared schema, and the reason is
  // measured: adding them there cost NINE fixtures in the CHECK-interval
  // machinery, because `btreeStrategyOf` and `isEqualityComplement` are still
  // bare-name gates keyed on `evalUserOperatorNames`. Those two take an
  // operator NAME and no operand types, so they cannot eliminate — the next
  // gate to close, recorded in the register.
  scenarios.cmpCollide = await build(
    `CREATE TYPE cmp_pair AS (a integer, b integer);
     CREATE FUNCTION cmp_pair_eq(x cmp_pair, y cmp_pair) RETURNS boolean
       LANGUAGE sql IMMUTABLE AS $$ SELECT $1 IS NOT DISTINCT FROM $2 $$;
     CREATE OPERATOR public.= (leftarg = cmp_pair, rightarg = cmp_pair, function = cmp_pair_eq);
     CREATE OPERATOR public.< (leftarg = cmp_pair, rightarg = cmp_pair, function = cmp_pair_eq);
     CREATE TABLE lft (id integer NOT NULL, v integer NOT NULL);
     CREATE TABLE rgt (id integer NOT NULL, v integer NOT NULL);
     INSERT INTO lft VALUES (1, 10); INSERT INTO rgt VALUES (1, 10);`,
  );

  // Relations shadowing pg_catalog type names under the DEFAULT path, where
  // pg_catalog is implicitly searched first and the builtin type wins every
  // one of these spellings.
  scenarios.typeShadow = await build(TYPE_SHADOW_DDL);

  // The same schema with pg_catalog named EXPLICITLY and late. Now the user
  // rowtypes really do win the bare spellings, and the engine must cede.
  scenarios.typeShadowLate = await build(TYPE_SHADOW_DDL, ["public", "pg_catalog"]);
}, 120_000);

afterAll(async () => {
  for (const s of Object.values(scenarios)) await s.pg.close();
});

describe("operator gate — targets", () => {
  // --- Defect 1: UNSOUND. The walk dispatches an operator through a user
  // backing function whose operand types PostgreSQL already eliminated. The
  // body is then analysed with the WRONG arguments, and `bool_pair`'s
  // `$1 AND $2` over two non-null operands claims notNull for an expression
  // that answers NULL.

  it("an eliminated user -> must not be dispatched for a jsonb operand", async () => {
    const s = scenarios.collide!;
    expect(await oracle(s, "SELECT s.j -> 'id' AS v FROM s")).toBeNull();
    expect(await claim(s, "SELECT s.j -> 'id' AS v FROM s")).toBe(false);
  });

  it("an eliminated user ->> must not be dispatched for a jsonb operand", async () => {
    const s = scenarios.collide!;
    expect(await oracle(s, "SELECT s.j ->> 'id' AS v FROM s")).toBeNull();
    expect(await claim(s, "SELECT s.j ->> 'id' AS v FROM s")).toBe(false);
  });

  // --- Defect 2: precision. `closedOperatorTypes` refuses any subtree using
  // a symbol `evalUserOperatorNames` carries, whatever its operand types — so
  // the closed fold that would answer this exactly is never attempted, and
  // the symbolic path has nothing to say (neither operand types, so the
  // name-rule fallback sees a user `||` and cedes). This is the operator
  // twin of `length('abc')`, and it closes the same way: PostgreSQL resolves
  // the overload in the fold.

  it("an unrelated user || must not stop 'a' || 'b' folding", async () => {
    const s = scenarios.collide!;
    expect(await oracle(s, "SELECT 'a' || 'b' AS v")).toBe("ab");
    expect(await claim(s, "SELECT 'a' || 'b' AS v")).toBe(true);
  });
});

describe("predicate gate — targets", () => {
  // --- Defect 4: precision, on the PREDICATE side. `promotionOperatorIsStrict`
  // declared `scope: Scope | null = null` and neither call site passed it, so
  // `renderedTypeOfExpr` returned on its first line and every operand in a
  // WHERE or JOIN predicate read untyped. With nothing known the gate falls
  // back to the bare-name rule, which refuses a curated symbol any user
  // operator carries — so one `=` over an unrelated composite cost every
  // LEFT JOIN promotion in the schema.
  //
  // Green since the scope was threaded (2026-08-20). Verified against the
  // pre-threading engine, where both claims below read nullable.

  it("a LEFT JOIN promotion survives a polluted `=`", async () => {
    const s = scenarios.cmpCollide!;
    const sql = "SELECT r.v AS v FROM lft l LEFT JOIN rgt r ON l.id = r.id WHERE r.v = l.v";
    // PostgreSQL's own answer: the conjunct discards every NULL-extended row,
    // so nothing NULL can come back through `r.v`.
    expect(await oracle(s, sql)).not.toBeNull();
    expect(await claim(s, sql)).toBe(true);
  });

  it("and a polluted `<`", async () => {
    const s = scenarios.cmpCollide!;
    const sql = "SELECT r.v AS v FROM lft l LEFT JOIN rgt r ON l.id = r.id WHERE r.v < l.v + 1";
    expect(await claim(s, sql)).toBe(true);
  });
});

describe("type gate — targets", () => {
  // --- Defect 3: precision. `evalUserTypeNames` refuses a builtin type
  // SPELLING whenever any user relation, domain, enum or sequence carries
  // that name — so a table called `date` stopped every datetime fold, and a
  // table called `jsonb` every immutable-I/O one. Under the default path
  // PostgreSQL resolves all of these to pg_catalog and never looks at the
  // relation.

  it("a relation named jsonb must not stop a jsonb cast folding", async () => {
    const s = scenarios.typeShadow!;
    expect(await oracle(s, `SELECT nullif('{"a":1}'::jsonb, '{}'::jsonb) AS v`)).not.toBeNull();
    expect(await claim(s, `SELECT nullif('{"a":1}'::jsonb, '{}'::jsonb) AS v`)).toBe(true);
  });

  it("a relation named date must not stop the datetime interval reading", async () => {
    // The CHECK says `d > '2020-01-01'`, so the `<= '2019-06-01'` arm is
    // unreachable and the CASE cannot take its NULL branch — a claim that
    // needs the date literals to be DATES, which the gate denied.
    const s = scenarios.typeShadow!;
    const q = "SELECT CASE WHEN d.d <= '2019-06-01' THEN NULL ELSE 5 END AS v FROM dt d";
    expect(await claim(s, q)).toBe(true);
  });

  it("a relation named numeric must not stop a numeric cast folding", async () => {
    // `numeric` is the strongest of the three: its spelling is fixed by
    // PostgreSQL's GRAMMAR, so `1::numeric` is pg_catalog's type even under
    // the explicit-and-late path where `date` and `jsonb` are not.
    const s = scenarios.typeShadow!;
    expect(await oracle(s, "SELECT nullif(1::numeric, 2::numeric) AS v")).not.toBeNull();
    expect(await claim(s, "SELECT nullif(1::numeric, 2::numeric) AS v")).toBe(true);
  });
});

describe("type gate — boundary guards", () => {
  it("a SHADOWING path is the real thing, and the engine must cede to it", async () => {
    // Adjudicated: under `search_path = public, pg_catalog` these casts do
    // not merely resolve differently, they RAISE — PostgreSQL is parsing the
    // literal as a record for the table's rowtype. Nothing may be claimed
    // from a fold the database will not perform.
    const s = scenarios.typeShadowLate!;
    expect(await raises(s, "SELECT '2020-01-01'::date AS v")).toMatch(/malformed record literal/);
    expect(await raises(s, `SELECT '{"a":1}'::jsonb AS v`)).toMatch(/malformed record literal/);
    expect(await claim(s, `SELECT nullif('{"a":1}'::jsonb, '{}'::jsonb) AS v`)).toBe(false);
    const q = "SELECT CASE WHEN d.d <= '2019-06-01' THEN NULL ELSE 5 END AS v FROM dt d";
    expect(await claim(s, q)).toBe(false);
  });

  it("the grammar-fixed spelling survives even the shadowing path", async () => {
    // PostgreSQL still answers `numeric` there, so the engine may too. This
    // is the guard that keeps the path rule from becoming a blanket refusal.
    const s = scenarios.typeShadowLate!;
    expect(await oracle(s, "SELECT nullif(1::numeric, 2::numeric) AS v")).not.toBeNull();
  });

  it("a user type on a name pg_catalog does NOT carry is unaffected", async () => {
    const s = scenarios.typeShadow!;
    expect(await oracle(s, "SELECT s.t AS v FROM s")).toBe("abc");
    expect(await claim(s, "SELECT s.t AS v FROM s")).toBe(true);
  });
});

describe("operator gate — boundary guards", () => {
  it("without a colliding user operator the jsonb access is already right", async () => {
    const s = scenarios.plain!;
    expect(await oracle(s, "SELECT s.j -> 'id' AS v FROM s")).toBeNull();
    expect(await claim(s, "SELECT s.j -> 'id' AS v FROM s")).toBe(false);
  });

  it("a user operator that genuinely resolves is still dispatched through its body", async () => {
    // Both directions, so the guard is discriminating rather than a
    // one-sided "nothing broke": the STRICT total body claims notNull, the
    // NULL-returning body does not.
    const s = scenarios.genuine!;
    expect(await oracle(s, "SELECT s.t ~~~ s.t AS v FROM s")).toBe("abcabc");
    expect(await claim(s, "SELECT s.t ~~~ s.t AS v FROM s")).toBe(true);
    expect(await oracle(s, "SELECT s.t ~~~~ s.t AS v FROM s")).toBeNull();
    expect(await claim(s, "SELECT s.t ~~~~ s.t AS v FROM s")).toBe(false);
  });

  it("typed operands keep the builtin's claim past a name-only collision", async () => {
    const s = scenarios.collide!;
    expect(await oracle(s, "SELECT s.t || s.t AS v FROM s")).toBe("abcabc");
    expect(await claim(s, "SELECT s.t || s.t AS v FROM s")).toBe(true);
    expect(await oracle(s, "SELECT 1 + 2 AS v")).toBe(3);
    expect(await claim(s, "SELECT 1 + 2 AS v")).toBe(true);
  });

  it("the eliminated operator's own operand types still reach it", async () => {
    // The user `->` is not dead — it is simply not the resolution for a
    // jsonb left operand. Given two booleans PostgreSQL picks it, and the
    // walk must keep picking it too.
    const s = scenarios.collide!;
    expect(await oracle(s, "SELECT true -> false AS v")).toBe(false);
    expect(await claim(s, "SELECT true -> false AS v")).toBe(true);
  });
});
