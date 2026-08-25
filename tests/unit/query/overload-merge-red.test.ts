import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The RED SUITE for the function overload merge.
//
// Written RED: every case in the "targets" block was an `it.fails` asserting
// what the engine must claim once the merged candidate set reached the
// function side, and passed because the engine did not claim it. The merge
// landed 2026-08-20 and all four flipped to plain `it` in the same commit —
// which is what each of them is: the acceptance test of the change that
// caused the flip. They stay here rather than graduating into
// `fixtures/`, because each needs its own catalog (a shadowed schema, a
// name-only collision, a user `+`) and the fixture corpus runs one schema.
//
// Every target was adjudicated against PostgreSQL before shipping
// (2026-08-20): each query below was EXECUTED under the same catalog the walk
// was given, and the row is recorded beside the case. A target the oracle
// would falsify must never sit here.
//
// Two of the targets are UNSOUNDNESS, not imprecision: the engine claims
// notNull and PostgreSQL returns NULL. They are the reason this refactor is
// not a precision project.
//
// The plain `it` blocks are BOUNDARY GUARDS: behaviour that must stay exactly
// as it is, so the merge cannot pay for its precision by moving something it
// was not asked to move. The `noExecution` guard is the most important — it
// is what keeps the merge from quietly becoming permission to run user code
// during analysis.
// ---------------------------------------------------------------------------

interface Scenario {
  pg: PGlite;
  catalog: NullabilityCatalog;
}

const scenarios: Record<string, Scenario> = {};

/** The first output column's notNull claim, with the evaluator wired exactly
 *  as the fixture suites wire it. */
async function claim(s: Scenario, sql: string): Promise<boolean> {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const evaluate = async (q: string) =>
    (await s.pg.query<Record<string, unknown>>(q)).rows[0];
  const cols = await inferNullability(stmt, s.catalog, { evaluate });
  return cols[0]!.notNull;
}

/** What PostgreSQL actually returns for the first column — the oracle every
 *  target below was adjudicated against. */
async function oracle(s: Scenario, sql: string): Promise<unknown> {
  const r = await s.pg.query<Record<string, unknown>>(sql);
  return Object.values(r.rows[0] ?? {})[0] ?? null;
}

async function build(ddl: string, searchPath?: string): Promise<Scenario> {
  const pg = await PGlite.create();
  await pg.exec(`CREATE TABLE s (t text NOT NULL); INSERT INTO s VALUES ('abc');`);
  await pg.exec(ddl);
  if (searchPath) await pg.exec(`SET search_path = ${searchPath};`);
  const catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), {
    searchPath: ["public"],
  });
  return { pg, catalog };
}

beforeAll(async () => {
  // No user object of any gated name — the controls.
  scenarios.plain = await build(`SELECT 1;`);

  // A user function SHADOWING a builtin at the SAME signature, in a schema the
  // path names before pg_catalog, returning NULL for a non-null input. This is
  // the state PostgreSQL resolves to the USER's function and the walk resolves
  // to pg_catalog's totality table.
  scenarios.shadowed = await build(
    `CREATE FUNCTION public.length(x text) RETURNS integer
       LANGUAGE sql IMMUTABLE AS $$ SELECT NULL::integer $$;
     CREATE FUNCTION public.upper(x text) RETURNS text
       LANGUAGE sql IMMUTABLE AS $$ SELECT NULL::text $$;`,
    "public, pg_catalog",
  );

  // User functions colliding by NAME ONLY — different argument types, so
  // PostgreSQL eliminates them and runs the builtin. Nothing about these calls
  // is ambiguous once argument types are read.
  scenarios.collide = await build(
    `CREATE FUNCTION public.scale(x boolean) RETURNS integer
       LANGUAGE sql IMMUTABLE AS $$ SELECT 1 $$;
     CREATE FUNCTION public.length(x boolean) RETURNS integer
       LANGUAGE sql IMMUTABLE AS $$ SELECT 1 $$;`,
  );

  // A user OPERATOR colliding by symbol only. Included as the WORKED
  // PRECEDENT: the operator side already merges path-visible user rows into
  // the candidate pool, eliminates by operand type, and reads the surviving
  // builtin's verdict. This is the shape the function side must reach.
  scenarios.opCollide = await build(
    `CREATE FUNCTION public.bplus(a boolean, b boolean) RETURNS boolean
       LANGUAGE sql IMMUTABLE AS $$ SELECT $1 AND $2 $$;
     CREATE OPERATOR public.+ (leftarg = boolean, rightarg = boolean, function = public.bplus);`,
  );

  // User functions carrying no builtin name at all. `clu` and `cat` differ
  // only in whether the body's expression is a CALL or an OPERATOR — the
  // measurement that located the body-scope hole. `opaque` is the boundary:
  // IMMUTABLE, literal arguments, and a body the walk cannot read.
  scenarios.userFns = await build(
    `CREATE FUNCTION clu(a text, b text) RETURNS text
       LANGUAGE sql IMMUTABLE STRICT AS $$ SELECT UPPER($1 || ' ' || $2) $$;
     CREATE FUNCTION cat(a text, b text) RETURNS text
       LANGUAGE sql IMMUTABLE STRICT AS $$ SELECT $1 || ' ' || $2 $$;
     CREATE FUNCTION opaque(a text) RETURNS text
       LANGUAGE plpgsql IMMUTABLE AS $$ BEGIN RETURN 'x'; END $$;
     CREATE FUNCTION stab(a text) RETURNS text
       LANGUAGE plpgsql STABLE AS $$ BEGIN RETURN 'x'; END $$;
     CREATE FUNCTION vol(a text) RETURNS text
       LANGUAGE plpgsql VOLATILE AS $$ BEGIN RETURN 'x'; END $$;`,
  );
}, 120_000);

afterAll(async () => {
  for (const s of Object.values(scenarios)) await s.pg.close();
});

describe("function overload merge — targets", () => {
  // --- Defect 1: UNSOUND. The user's function runs; the walk reads the
  // builtin's totality table, because `resolvableCandidates` drops every user
  // candidate for a name pg_catalog also carries.

  it("a shadowing user length() must make the call nullable", async () => {
    const s = scenarios.shadowed!;
    expect(await oracle(s, "SELECT length(s.t) AS v FROM s")).toBeNull();
    expect(await claim(s, "SELECT length(s.t) AS v FROM s")).toBe(false);
  });

  it("a shadowing user upper() must make the call nullable", async () => {
    const s = scenarios.shadowed!;
    expect(await oracle(s, "SELECT upper(s.t) AS v FROM s")).toBeNull();
    expect(await claim(s, "SELECT upper(s.t) AS v FROM s")).toBe(false);
  });

  // --- Defect 2: precision. An unrelated user name collapses the closed
  // subtree, because the evaluator's gate is a bare-name set.

  it("an unrelated user scale(boolean) must not stop scale(8.41) folding", async () => {
    const s = scenarios.collide!;
    expect(await oracle(s, "SELECT scale(8.41) AS v")).toBe(2);
    expect(await claim(s, "SELECT scale(8.41) AS v")).toBe(true);
  });

  // --- The body-scope hole: the same type threading, at a site it does not
  // reach. `cat` (operator body) already claims notNull; `clu` (call body)
  // does not, because `$1`'s declared `text` never reaches the signature
  // dispatch inside a body scope.

  it("a builtin call inside a LANGUAGE sql body must narrow by the parameter's declared type", async () => {
    const s = scenarios.userFns!;
    expect(await oracle(s, "SELECT clu('a','b') AS v")).toBe("A B");
    expect(await claim(s, "SELECT clu('a','b') AS v")).toBe(true);
  });
});

describe("function overload merge — boundary guards", () => {
  it("the unshadowed builtins keep their claims", async () => {
    const s = scenarios.plain!;
    expect(await claim(s, "SELECT length(s.t) AS v FROM s")).toBe(true);
    expect(await claim(s, "SELECT upper(s.t) AS v FROM s")).toBe(true);
    expect(await claim(s, "SELECT scale(8.41) AS v")).toBe(true);
    expect(await claim(s, "SELECT length('abc') AS v")).toBe(true);
    expect(await claim(s, "SELECT 1 + 2 AS v")).toBe(true);
  });

  it("a QUALIFIED call is unaffected by a shadow — pg_catalog's really runs", async () => {
    const s = scenarios.shadowed!;
    expect(await oracle(s, "SELECT pg_catalog.length(s.t) AS v FROM s")).toBe(3);
    expect(await claim(s, "SELECT pg_catalog.length(s.t) AS v FROM s")).toBe(true);
  });

  it("a name-only collision must not cost the builtin its claim, where types are known", async () => {
    // The builtin genuinely wins these, and elimination by argument type is
    // the whole reason: `length(boolean)` cannot reach a `text` argument, so
    // the survivor is pg_catalog's row and its verdict answers.
    const s = scenarios.collide!;
    expect(await oracle(s, "SELECT length(s.t) AS v FROM s")).toBe(3);
    expect(await claim(s, "SELECT length(s.t) AS v FROM s")).toBe(true);
    expect(await oracle(s, "SELECT length('abc'::text) AS v")).toBe(3);
    expect(await claim(s, "SELECT length('abc'::text) AS v")).toBe(true);
  });

  it("a BARE literal costs nothing either — PostgreSQL resolves the overload", async () => {
    // This was the merge's one priced cost, and admitting IMMUTABLE user
    // functions to execution refunded it. `length('abc')` passes an `unknown`
    // literal, which reaches every candidate including the user's
    // `length(boolean)`, so the survivor set stays mixed and no symbolic
    // verdict is available — PostgreSQL resolves it by the PREFERRED-TYPE
    // rule, which the narrowing declares a non-goal.
    //
    // The subtree evaluator does not need that rule. It hands the whole
    // expression to PostgreSQL, which applies its own resolution and answers
    // with a value. Delegating beat reimplementing, and the non-goal stays a
    // non-goal.
    const s = scenarios.collide!;
    expect(await oracle(s, "SELECT length('abc') AS v")).toBe(3);
    expect(await claim(s, "SELECT length('abc') AS v")).toBe(true);
  });

  it("the OPERATOR side already does this, and must keep doing it", async () => {
    // The worked precedent: a user `+ (boolean, boolean)` is merged into the
    // pool, eliminated by operand type, and the surviving builtin answers. If
    // this ever regresses, the function-side merge has broken its own model.
    const s = scenarios.opCollide!;
    expect(await oracle(s, "SELECT 1 + 2 AS v")).toBe(3);
    expect(await claim(s, "SELECT 1 + 2 AS v")).toBe(true);
  });

  it("an operator body inside a LANGUAGE sql function keeps its claim", async () => {
    const s = scenarios.userFns!;
    expect(await claim(s, "SELECT cat('a','b') AS v")).toBe(true);
  });

  it("volatility is the line: IMMUTABLE folds, STABLE and VOLATILE do not", async () => {
    // Ruled 2026-08-20: `IMMUTABLE` is taken at its word. PostgreSQL does not
    // enforce the label either — its own planner constant-folds immutable
    // calls with constant arguments — so trusting it is the convention the
    // database already runs on rather than a new one this engine invents.
    // `opaque` has a body the walk cannot read, which is the point: nothing
    // about the ANSWER comes from analysis, it comes from execution.
    //
    // The other two are the boundary. `survivorConsensus` demands
    // `volatility === "i"`, so a STABLE or VOLATILE user row refuses the fold
    // — and it must, because their values are not properties of the arguments.
    // If either of these flips, the trust model moved and someone owes the
    // argument.
    const s = scenarios.userFns!;
    expect(await oracle(s, "SELECT opaque('a') AS v")).toBe("x");
    expect(await claim(s, "SELECT opaque('a') AS v")).toBe(true);
    expect(await claim(s, "SELECT stab('a') AS v")).toBe(false);
    expect(await claim(s, "SELECT vol('a') AS v")).toBe(false);
  });
});
