import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { collectParamNullability } from "../../../src/query/param-nullability.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The GATE for the per-property QUANTIFIER on operator strictness: tier 2's
// consensus quantifier is per-PROPERTY, not global.
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

/**
 * A second schema, for the case where the user operator OUTRANKS the builtin
 * instead of losing to it. `mynum` is a domain over numeric, so the builtin
 * `+`(numeric, numeric) reaches it by coercion while `+`(mynum, mynum)
 * matches it exactly — and nothing in pg_catalog shares that signature.
 */
const EXOTIC_DDL = `
  CREATE DOMAIN mynum AS numeric;
  CREATE TABLE d (id integer PRIMARY KEY, v mynum NOT NULL, total numeric NOT NULL);
  CREATE FUNCTION mn_or_zero(a mynum, b mynum) RETURNS numeric
    LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce($1, 0) + coalesce($2, 0) $$;
  CREATE OPERATOR public.+ (leftarg = mynum, rightarg = mynum, function = mn_or_zero);
  INSERT INTO d VALUES (1, 3, 0);
  -- The boundary's join partner. \`v\` is deliberately the SAME NAME as the
  -- target's and a DIFFERENT TYPE: plain numeric, not the mynum domain. A
  -- qualified reference resolved against the wrong relation therefore gets a
  -- wrong TYPE rather than a miss, which is the only way the alias guard can
  -- be caught doing work.
  CREATE TABLE other (id integer PRIMARY KEY, q numeric NOT NULL, v numeric NOT NULL);
  INSERT INTO other VALUES (1, 4, 4);`;

/** The typed operand reaches the resolver, so the forced candidate decides. */
const ONE_SIDED = `UPDATE d SET total = v::public.mynum + $1 WHERE id = 1`;

/** The same statement with a BARE COLUMN operand, which types as nothing. */
const ONE_SIDED_COLUMN = `UPDATE d SET total = v + $1 WHERE id = 1`;

let pg: PGlite;
let catalog: NullabilityCatalog;
let exoticPg: PGlite;
let exotic: NullabilityCatalog;

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

  exoticPg = await PGlite.create();
  await exoticPg.exec(EXOTIC_DDL);
  exotic = await buildNullabilityCatalog(await snapshotCatalog(exoticPg), {
    searchPath: ["public"],
  });
}, 120_000);

afterAll(async () => {
  if (pg && !pg.closed) await pg.close();
  if (exoticPg && !exoticPg.closed) await exoticPg.close();
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

  it("a ONE-SIDED exact match decides the operator, quantifier or not", async () => {
    // The case where `some` is not merely over-tight in principle but WRONG
    // in fact, measured: PostgreSQL accepts the NULL binding and the contract
    // says it must not be bound.
    //
    // `+`(mynum, mynum) is non-strict and is the exact match for a `mynum`
    // operand; no builtin carries that signature, so nothing takes the tie
    // away from it. The builtin numeric rows reach `mynum` only by coercion.
    // Operator resolution keeps the candidates with the MOST exact matches on
    // the known positions (step 4.a), so this one is chosen outright — and
    // then there is one candidate, whose own flag is the answer with no
    // quantifier involved at all.
    //
    // The adapter's exact-match branch is gated on BOTH operands typing, so
    // an untyped `$1` sends it to the survivor scan instead.
    const stmt = (await parseSql(ONE_SIDED)).stmts![0]!.stmt!;
    expect(collectParamNullability(stmt, exotic)[0]?.notNull).toBe(false);
  });

  it("...and PostgreSQL is the one saying so", async () => {
    // The adjudication: the binding the old contract forbade is one the
    // database takes, because it runs the user operator and the operator
    // absorbs the NULL.
    await exoticPg.exec("UPDATE d SET total = 0 WHERE id = 1;");
    await expect(exoticPg.query(ONE_SIDED, [null])).resolves.toBeTruthy();
    const r = await exoticPg.query<{ total: string }>(`SELECT total FROM d WHERE id = 1`);
    expect(Number(r.rows[0]!.total)).toBe(3);
  });

  it("a BARE COLUMN operand types against the statement's own target", async () => {
    // The same statement with one cast removed. The cause is NOT the
    // quantifier: `contextFreeTypeSet` handles A_Const, TypeCast, A_ArrayExpr
    // and A_Expr and not ColumnRef, so both type sets are null, the typed
    // reading declines on its first line, and the claim comes from the
    // bare-name rule (`+` is in STRICT_OPERATORS).
    //
    // An UPDATE's SET value is the one place a column needs no scope walk:
    // `checkUpdate` has already resolved the target relation to reach
    // `columnRejection` at all, so the type is one catalog call away.
    const stmt = (await parseSql(ONE_SIDED_COLUMN)).stmts![0]!.stmt!;
    expect(collectParamNullability(stmt, exotic)[0]?.notNull).toBe(false);
  });

  it("...and PostgreSQL accepts that binding", async () => {
    // The adjudication, separate so it is green either side of the fix.
    await exoticPg.exec("UPDATE d SET total = 0 WHERE id = 1;");
    await expect(exoticPg.query(ONE_SIDED_COLUMN, [null])).resolves.toBeTruthy();
    const r = await exoticPg.query<{ total: string }>(`SELECT total FROM d WHERE id = 1`);
    expect(Number(r.rows[0]!.total)).toBe(3);
  });

  it("a column the target does NOT carry stays conservative", async () => {
    // The boundary. `UPDATE … FROM other o` puts columns in scope that the
    // target does not own, and typing one of those against the target would
    // be a wrong type — the direction that makes a contract admit a raising
    // binding. `resolveColumnTypeName` answers null for a non-column, so the
    // reading declines and the name rule stands.
    const sql = `UPDATE d SET total = o.q + $1 FROM other o WHERE d.id = o.id`;
    const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
    expect(collectParamNullability(stmt, exotic)[0]?.notNull).toBe(true);
  });

  it("a qualified reference is resolved against the RIGHT relation", async () => {
    // `other.v` and `d.v` share a name and differ in type. Resolving this one
    // against the target would type it `mynum`, pick the non-strict user
    // operator, and report the parameter nullable — while PostgreSQL runs
    // `numeric + numeric`, propagates the NULL and RAISES. That is the
    // direction that makes a contract admit a binding which fails, so the
    // adjudication is the assertion here, not the claim.
    const sql = `UPDATE d SET total = o.v + $1 FROM other o WHERE d.id = o.id`;
    await exoticPg.exec("UPDATE d SET total = 0 WHERE id = 1;");
    await expect(exoticPg.query(sql, [null])).rejects.toThrow(/null value in column "total"/);
    const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
    expect(collectParamNullability(stmt, exotic)[0]?.notNull).toBe(true);
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
