import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { collectParamNullability } from "../../../src/query/param-nullability.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The GATE for the per-property QUANTIFIER on operator strictness
// (docs/type-aware-overloads.md, "Tier 2's consensus quantifier is
// per-PROPERTY, not global").
//
// Totality takes `every` and strictness takes `some`, because the two fail in
// opposite directions: claiming total where a survivor is not is a wrong
// notNull, while FAILING to claim strict makes mechanism C miss a raise and
// emit a contract that admits a binding PostgreSQL rejects.
//
// The argument was sound and the choice was UNTESTED. Measured 2026-08-23 by
// instrumenting the adapter and running the whole suite — the survivor scan
// is reached 67 times (`+` n=14, `*` n=16, `||` n=3, `=` n=5) and **the two
// quantifiers never once disagree**, so swapping `some` for `every` changed
// no answer anywhere, generated corpus included. A choice nothing can
// distinguish is not yet a mechanism.
//
// Splitting the survivor set needs a schema nobody would write by accident: a
// NON-STRICT user operator on a curated name, whose operand types the typed
// operand can reach by implicit coercion so that elimination keeps it. That
// is why this lives here with its own DDL rather than in the shared fixture
// schema, where colliding user operators have cost nine fixtures before.
// ---------------------------------------------------------------------------

const DDL = `
  CREATE TABLE acc (id integer PRIMARY KEY, n integer NOT NULL, total integer NOT NULL);

  -- Non-strict on purpose: it returns a value for a NULL operand, so it
  -- ABSORBS the NULL instead of propagating it.
  CREATE FUNCTION num_or_zero(a numeric, b numeric) RETURNS numeric
    LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce($1, 0) + coalesce($2, 0) $$;

  -- Shares pg_catalog's name. Nothing eliminates it for an integer operand,
  -- because integer implicitly reaches numeric — which is exactly what makes
  -- the survivor set mixed.
  CREATE OPERATOR public.+ (leftarg = numeric, rightarg = numeric, function = num_or_zero);

  -- The BOUNDARY's operator, on a name pg_catalog does not carry, so the
  -- survivor set holds nothing strict for \`some\` to find.
  CREATE FUNCTION t_or_x(a text, b text) RETURNS text
    LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce($1, 'x') || coalesce($2, 'x') $$;
  CREATE OPERATOR public.~~~ (leftarg = text, rightarg = text, function = t_or_x);`;

/** `acc.n + $1` flows into a NOT NULL column: mechanism C's shape. The
 *  parameter is claimable only if the operator PROPAGATES the NULL. */
const FLOW = `INSERT INTO acc (id, n, total) VALUES (1, 5, acc_n() + $1)`;

/** The same flow without the helper, for PostgreSQL to adjudicate. */
const EXEC = `INSERT INTO acc (id, n, total) VALUES (1, 5, 5 + $1)`;

let pg: PGlite;
let catalog: NullabilityCatalog;

/** Run a statement against an EMPTY table. Every case here inserts id 1, so
 *  without the clear the second one fails on the primary key and reports a
 *  conflict as though it were the rejection under test. */
async function exec(sql: string, bind: unknown[]): Promise<unknown> {
  await pg.exec("DELETE FROM acc;");
  return pg.query(sql, bind);
}

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(DDL);
  await pg.exec(`CREATE FUNCTION acc_n() RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT 5 $$;`);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), { searchPath: ["public"] });
}, 120_000);

afterAll(async () => {
  if (pg && !pg.closed) await pg.close();
});

describe("operator strictness quantifier", () => {
  it("the survivor set genuinely SPLITS — without this the rest is vacuous", () => {
    // The discriminating fact, asserted directly rather than assumed. Three
    // tests in this session passed against a broken engine because the case
    // they described could not arise; this one says so in the assertion.
    const some = catalog.resolveOperatorStrictnessSome(undefined, "+", ["integer"], null);
    const every = catalog.resolveOperatorStrictness(undefined, "+", ["integer"], null);
    expect(some).toBe(true);
    expect(every).toBe(false);
  });

  it("PostgreSQL resolves the STRICT overload and rejects the NULL", async () => {
    // The adjudication. PostgreSQL prefers pg_catalog's exact integer match
    // over the user's numeric row, so the NULL propagates and the NOT NULL
    // column refuses it — which is what makes `some` the right answer and
    // `every` a contract that lies.
    await expect(exec(EXEC, [null])).rejects.toThrow(/null value in column "total"/);
    // The control: a bound value goes in, so the rejection is about the NULL
    // and not about the statement.
    await expect(exec(EXEC, [7])).resolves.toBeTruthy();
  });

  it("an operand that does not TYPE never reaches the quantifier at all", async () => {
    // Written as "so the parameter is claimed non-null", on the assumption
    // that this was the walk-level consequence of the split. It is not, and
    // the mutation said so: swapping `some` for `every` left this claim
    // standing. `contextFreeTypeSet` gives nothing for a user function call,
    // so both type sets are null, the typed reading declines on its first
    // line, and the claim comes from the bare-name rule instead.
    //
    // That fallback is the documented safe error for this consumer, and the
    // case is kept to mark the boundary of what the quantifier decides.
    expect(catalog.resolveOperatorStrictnessSome(undefined, "+", null, null)).toBeNull();
    const stmt = (await parseSql(FLOW)).stmts![0]!.stmt!;
    expect(collectParamNullability(stmt, catalog)[0]?.notNull).toBe(true);
  });

  it("a survivor set with NOTHING strict in it claims nothing", async () => {
    // The boundary, and it needs a name pg_catalog does not carry. `~~~` has
    // exactly one candidate and it absorbs the NULL, so the flow reaches the
    // NOT NULL column with a value and nothing is rejected.
    const sql = `INSERT INTO acc (id, n, total) VALUES (1, 5, length('a' ~~~ $1))`;
    const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
    expect(collectParamNullability(stmt, catalog)[0]?.notNull).toBe(false);
    // PostgreSQL agrees — the binding it says is legal, the contract admits.
    await expect(exec(sql, [null])).resolves.toBeTruthy();
  });

  it("pg_catalog wins a shared signature, so the user row never decides", async () => {
    // A user `+`(numeric, numeric) is an EXACT duplicate of pg_catalog's, and
    // PostgreSQL takes the builtin — measured. So `1.5 + $1` propagates the
    // NULL after all, and the engine's claim here is right for a reason the
    // survivor split does not supply. Written as a control for the case
    // above and kept as a claim once PostgreSQL contradicted the guess.
    const sql = `INSERT INTO acc (id, n, total) VALUES (1, 5, (1.5 + $1)::integer)`;
    await expect(exec(sql, [null])).rejects.toThrow(/null value in column "total"/);
    const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
    expect(collectParamNullability(stmt, catalog)[0]?.notNull).toBe(true);
  });
});
