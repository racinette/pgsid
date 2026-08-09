import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { parseSql } from "../../../src/ast.js";
import {
  inferNullability,
  inferNullabilityTraced,
  inferQueryContract,
} from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// Tier 0 (docs/type-aware-overloads.md): PREPARE's resolved parameter types
// as the walk's optional input. A parameter operand can never make an OUTPUT
// claim notNull — a parameter is nullable by design — so these pins
// discriminate on the RESOLUTION, not the claim: with the input, a ParamRef
// operand types and the operator narrows by signature; without it, the same
// expression falls to the bare-name rule. The input's claim-level consumers
// are mechanism C and the function half, which is where `ARRAY[1,2] || $1`
// stops over-reporting strictness.
//
// The types come from the database the caller already holds — every harness
// runs one — via pg_prepared_statements, whose regtype rendering matches the
// signature captures' format_type names; the last pin holds that seam.
// ---------------------------------------------------------------------------

let pg: PGlite;
let catalog: NullabilityCatalog;

async function tracedFor(
  sql: string,
  paramTypes?: readonly string[],
): Promise<{ notNull: boolean; trace: string }> {
  const parsed = await parseSql(sql);
  const cols = inferNullabilityTraced(
    parsed.stmts![0]!.stmt!,
    catalog,
    undefined,
    { paramTypes },
  );
  return { notNull: cols[0]!.notNull, trace: JSON.stringify(cols[0]) };
}

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(`
    CREATE TABLE t (id integer NOT NULL);
    CREATE TABLE ct (
      name text NOT NULL DEFAULT 'x',
      arr integer[] NOT NULL DEFAULT '{}'
    );
  `);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
});

afterAll(async () => {
  await pg.close();
});

describe("tier 0: parameter types as an input", () => {
  it("types a ParamRef operand, switching the operator onto the signature path", async () => {
    const typed = await tracedFor("SELECT $1 + $2 AS s", ["integer", "integer"]);
    const untyped = await tracedFor("SELECT $1 + $2 AS s");
    // The claim cannot move — a parameter operand is nullable — but the
    // resolution does: signature-narrowed with the input, bare-name rule
    // without it.
    expect(typed.notNull).toBe(false);
    expect(untyped.notNull).toBe(false);
    expect(typed.trace).toContain("signature-narrowed");
    expect(typed.trace).toContain("integer, integer");
    expect(untyped.trace).not.toContain("signature-narrowed");
  });

  it("degrades untouched when the input is absent, short, or out of range", async () => {
    const parsed = await parseSql("SELECT $1 + $2 AS s");
    for (const paramTypes of [undefined, [], ["integer"]] as const) {
      const cols = inferNullability(parsed.stmts![0]!.stmt!, catalog, { paramTypes });
      expect(cols.map(c => c.notNull)).toEqual([false]);
    }
  });

  it("closes the recorded || strictness over-report where the operand types", async () => {
    // NON_STRICT_OVERLOADS' entry, finally precise: array concatenation
    // ABSORBS a NULL operand, so a contract claiming $1 rejected there
    // called a binding rejected that PostgreSQL accepts. With ARRAY[1,2]
    // typed integer[], every surviving || row is non-strict and mechanism C
    // declines to attribute; the text shape keeps its strict reading
    // through the name rule, which is that consumer's safe over-report.
    const arr = await parseSql("INSERT INTO ct (arr) VALUES (ARRAY[1,2] || $1)");
    const arrContract = inferQueryContract(arr.stmts![0]!.stmt!, catalog);
    expect(arrContract.params.map(p => p.notNull)).toEqual([false]);
    // PostgreSQL agrees: binding NULL succeeds.
    await pg.query("INSERT INTO ct (arr) VALUES (ARRAY[1,2] || $1)", [null]);

    const text = await parseSql("INSERT INTO ct (name) VALUES ('a' || $1)");
    const textContract = inferQueryContract(text.stmts![0]!.stmt!, catalog);
    expect(textContract.params.map(p => p.notNull)).toEqual([true]);
    await expect(
      pg.query("INSERT INTO ct (name) VALUES ('a' || $1)", [null]),
    ).rejects.toThrow(/not-null constraint/);
  });

  it("reads pg_prepared_statements in the captures' own rendering", async () => {
    // The seam the harnesses rely on: regtype text is format_type's
    // spelling, so the types feed the signature lookups with no bridging.
    await pg.exec("PREPARE t0_pin AS SELECT $1::varchar || $2, $3 + 1");
    const r = await pg.query<{ t: string[] }>(
      `SELECT parameter_types::text[] AS t FROM pg_prepared_statements
       WHERE name = 't0_pin'`,
    );
    expect(r.rows[0]!.t).toEqual(["character varying", "text", "integer"]);
    await pg.exec("DEALLOCATE t0_pin");
  });
});
