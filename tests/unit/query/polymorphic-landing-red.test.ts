import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import { createKillableEvaluator, type KillableEvaluator } from "./killable-evaluator.js";
import type { NullabilityCatalog, SubtreeEvaluationCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The RED SUITE for a POLYMORPHIC LANDING, under typed operand tracking.
//
// Third time in three commits, and the same shape each time: a check applied
// at the DECLARED level when the fact it tests is about the RESOLVED one.
// `survivorConsensus` decides two things per candidate row —
//
//   - an UNKNOWN operand must land on a parameter with immutable I/O, because
//     the landing runs that type's input function;
//   - the RESULT must be base-kind, because a pseudo-typed result names no
//     concrete type to thread upward.
//
// — and both read the SIGNATURE's declared spelling. For a polymorphic row
// that spelling is `anycompatible` or `anycompatiblearray`, which is never a
// base type and can never be in a set of them. So every polymorphic signature
// refuses on contact with a string literal, and every polymorphic RESULT
// refuses outright:
//
//     array_position(ARRAY['a','b'], 'z')     open   — unknown lands `anycompatible`
//     array_position(ARRAY['a','b'], 'z'::text)  CLOSED
//     array_position(ARRAY[1,2], 3)              CLOSED — `3` types as integer
//     array_remove(ARRAY['a','b'], 'a')       open   — returns `anycompatiblearray`
//
// The middle two are the tell: the same call folds or does not by whether an
// argument was SPELLED with its type, which is not a fact about volatility.
//
// Both checks are doing real work, and the guard section proves it with a
// value that MOVES: `array_position(ARRAY['2020-01-02'::date], '01/02/2020')`
// is 1 under MDY and NULL under DMY, because the unknown lands on `date` and
// runs the stable `date_in`. The fix is not to drop the checks — it is to run
// them against the type the polymorphic family actually resolves to.
//
// Every target is adjudicated by PostgreSQL: the CHECK ones by asking it to
// store the NULL, the statement ones by running the query and reading rows.
// ---------------------------------------------------------------------------

const DDL = `
  CREATE TABLE rows_t (id integer PRIMARY KEY, v text);

  CREATE TABLE guarded (
    id integer PRIMARY KEY,
    c text,
    CONSTRAINT g_c CHECK ('z' = ANY (array_append(ARRAY['a'], 'b')) OR c IS NOT NULL)
  );
`;

let pg: PGlite;
let catalog: NullabilityCatalog;
let evaluator: KillableEvaluator;

type Claim = "notNull" | "alwaysNull" | "nullable";

async function claim(sql: string): Promise<Claim> {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const cols = await inferNullability(stmt, catalog, { evaluate: evaluator.evaluate });
  const c = cols[0]!;
  return c.notNull ? "notNull" : c.alwaysNull ? "alwaysNull" : "nullable";
}

async function witness(sql: string): Promise<{ rows: number; anyNull: boolean }> {
  const r = await pg.query<Record<string, unknown>>(sql);
  return { rows: r.rows.length, anyNull: r.rows.some(x => Object.values(x)[0] === null) };
}

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(DDL);
  await pg.exec(`INSERT INTO rows_t VALUES (1, 'a'), (2, NULL), (3, 'c')`);
  await pg.exec(`INSERT INTO guarded VALUES (1, 'x'), (2, 'y')`);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), { searchPath: ["public"] });
  evaluator = await createKillableEvaluator({ schema: DDL });
}, 120_000);

afterAll(async () => {
  await evaluator?.close();
  if (pg && !pg.closed) await pg.close();
});

describe("a polymorphic landing — the premise", () => {
  it("the signatures really are polymorphic, immutable, and shaped as claimed", async () => {
    const rows = await pg.query<{ sig: string; ret: string; vol: string }>(`
      SELECT pg_get_function_arguments(p.oid) AS sig,
             pg_get_function_result(p.oid) AS ret,
             p.provolatile AS vol
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'pg_catalog' AND p.proname = 'array_position'
         AND p.pronargs = 2`);
    expect(rows.rows).toEqual([
      { sig: "anycompatiblearray, anycompatible", ret: "integer", vol: "i" },
    ]);
    const rem = await pg.query<{ ret: string; vol: string }>(`
      SELECT pg_get_function_result(p.oid) AS ret, p.provolatile AS vol
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'pg_catalog' AND p.proname = 'array_remove'`);
    expect(rem.rows).toEqual([{ ret: "anycompatiblearray", vol: "i" }]);
    // ...and the declared spellings are PSEUDO-types, which is the whole
    // reason a base-type set can never contain one.
    const kinds = await pg.query<{ n: string; k: string }>(
      `SELECT typname n, typtype k FROM pg_type
        WHERE typname IN ('anycompatible','anycompatiblearray') ORDER BY 1`,
    );
    expect(kinds.rows).toEqual([
      { n: "anycompatible", k: "p" },
      { n: "anycompatiblearray", k: "p" },
    ]);
  });

  it("the closure face folds or refuses by whether an argument was SPELLED", () => {
    const face = catalog as NullabilityCatalog & SubtreeEvaluationCatalog;
    // FLIPPED: the first was null until the landing learned to resolve.
    expect(face.closedFunctionTypes("array_position", [["text[]"], ["unknown"]])).toEqual([
      "integer",
    ]);
    // The control that was never in doubt, and must not move.
    expect(face.closedFunctionTypes("array_position", [["text[]"], ["text"]])).toEqual([
      "integer",
    ]);
    // A polymorphic RESULT threads as the resolved type, not as the pseudo
    // spelling — `anycompatiblearray` over `text[]` inputs is `text[]`.
    expect(face.closedFunctionTypes("array_remove", [["text[]"], ["text"]])).toEqual(["text[]"]);
    expect(face.closedFunctionTypes("array_append", [["text[]"], ["unknown"]])).toEqual([
      "text[]",
    ]);
  });
});

describe("a polymorphic landing — targets", () => {
  it("a value the call makes reachable", async () => {
    const sql = "SELECT array_position(ARRAY['a','b'], 'a') AS v FROM rows_t";
    expect((await witness(sql)).anyNull).toBe(false);
    expect(await claim(sql)).toBe("notNull");
  });

  it("and the same call with no match, in the other direction", async () => {
    const sql = "SELECT array_position(ARRAY['a','b'], 'z') AS v FROM rows_t";
    expect((await witness(sql)).anyNull).toBe(true);
    expect(await claim(sql)).toBe("alwaysNull");
  });

  it("a polymorphic RESULT, threaded into the call above it", async () => {
    // `array_remove` returns `anycompatiblearray`, so nothing ABOVE it could
    // close either — a pseudo-typed result names no concrete type to thread,
    // and the refusal propagates up the whole expression.
    const sql = "SELECT array_length(array_remove(ARRAY['a','b'], 'a'), 1) AS v FROM rows_t";
    expect((await witness(sql)).anyNull).toBe(false);
    expect(await claim(sql)).toBe("notNull");
  });

  it("and the same nesting where the answer is NULL", async () => {
    // Removing the only element leaves an empty array, which has no
    // dimension — `array_length` is NULL, on every row.
    const sql = "SELECT array_length(array_remove(ARRAY['a'], 'a'), 1) AS v FROM rows_t";
    expect((await witness(sql)).anyNull).toBe(true);
    expect(await claim(sql)).toBe("alwaysNull");
  });

  it("a SUBSCRIPT over the same call — the boundary this commit filed", async () => {
    // Shipped REFUSED: `array_remove`'s result closed, but `A_Indirection`
    // was not in the evaluator's closed grammar at all, so the subscript
    // around it stayed open whatever its argument did. Filed rather than
    // reached past, and the grammar census that closed it one commit later
    // found it was one of twenty-six kinds nobody had considered
    // (`closed-grammar-red.test.ts`).
    const sql = "SELECT (array_remove(ARRAY['a','b'], 'a'))[1] AS v FROM rows_t";
    expect((await witness(sql)).anyNull).toBe(false);
    expect(await claim(sql)).toBe("notNull");
  });

  it("a dead disjunct in a WHERE clause", async () => {
    const sql =
      "SELECT v FROM rows_t WHERE array_position(ARRAY['a','b'], 'z') IS NOT NULL OR v IS NOT NULL";
    const w = await witness(sql);
    expect(w.rows).toBeGreaterThan(0);
    expect(w.anyNull).toBe(false);
    expect(await claim(sql)).toBe("notNull");
  });

  it("a dead disjunct that needs the polymorphic RESULT threaded", async () => {
    const sql =
      "SELECT v FROM rows_t WHERE 'z' = ANY (array_append(ARRAY['a'], 'b')) OR v IS NOT NULL";
    const w = await witness(sql);
    expect(w.rows).toBeGreaterThan(0);
    expect(w.anyNull).toBe(false);
    expect(await claim(sql)).toBe("notNull");
  });

  it("and one nested two polymorphic calls deep", async () => {
    const sql =
      "SELECT v FROM rows_t WHERE array_length(array_remove(ARRAY['a'], 'a'), 1) IS NOT NULL " +
      "OR v IS NOT NULL";
    const w = await witness(sql);
    expect(w.rows).toBeGreaterThan(0);
    expect(w.anyNull).toBe(false);
    expect(await claim(sql)).toBe("notNull");
  });

  it("the CHECK side — PostgreSQL refuses the NULL behind the dead disjunct", async () => {
    await expect(pg.exec(`INSERT INTO guarded VALUES (9, NULL)`)).rejects.toThrow(/g_c/);
    expect(await claim("SELECT c FROM guarded")).toBe("notNull");
  });
});

describe("a polymorphic landing — the leak the check is for", () => {
  it("an unknown landing on `date` MOVES with DateStyle, and PostgreSQL shows it", async () => {
    const read = async (style: string): Promise<unknown> => {
      await pg.exec(`SET DateStyle = '${style}'`);
      const r = await pg.query<{ a: unknown }>(
        `SELECT array_position(ARRAY['2020-01-02'::date], '01/02/2020') AS a`,
      );
      return r.rows[0]!.a;
    };
    expect(await read("ISO, MDY")).toBe(1);
    expect(await read("ISO, DMY")).toBeNull();
    await pg.exec(`SET DateStyle = 'ISO, MDY'`);
  });

  it("so the landing is refused, and the refusal is necessary rather than shy", async () => {
    const sql =
      "SELECT v FROM rows_t WHERE array_position(ARRAY['2020-01-02'::date], '01/02/2020') IS NULL " +
      "OR v IS NOT NULL";
    expect(await claim(sql)).toBe("nullable");

    // Under MDY the disjunct is FALSE and the claim would have held; under
    // DMY it is TRUE, every row is admitted, and a NULL comes back.
    await pg.exec(`SET DateStyle = 'ISO, MDY'`);
    expect((await witness(sql)).anyNull).toBe(false);
    await pg.exec(`SET DateStyle = 'ISO, DMY'`);
    expect((await witness(sql)).anyNull).toBe(true);
    await pg.exec(`SET DateStyle = 'ISO, MDY'`);
  });

  it("the face refuses it at the type level too", () => {
    const face = catalog as NullabilityCatalog & SubtreeEvaluationCatalog;
    // `date` is not in the immutable-I/O set — `date_in` is stable — so the
    // resolved landing fails the same check the declared one used to.
    expect(face.closedFunctionTypes("array_position", [["date[]"], ["unknown"]])).toBeNull();
    // A KNOWN date operand still folds: nothing is landed, nothing is parsed.
    expect(face.closedFunctionTypes("array_position", [["date[]"], ["date"]])).toEqual([
      "integer",
    ]);
  });
});

describe("a polymorphic landing — boundary guards", () => {
  it("a STABLE function through a polymorphic parameter stays refused", () => {
    // `array_to_string(anyarray, text)` is provolatile 's'. Resolving the
    // family says nothing about the function's own volatility, and this is
    // the row that keeps the two questions apart.
    const face = catalog as NullabilityCatalog & SubtreeEvaluationCatalog;
    expect(face.closedFunctionTypes("array_to_string", [["text[]"], ["text"]])).toBeNull();
    expect(face.closedFunctionTypes("array_to_string", [["text[]"], ["unknown"]])).toBeNull();
  });

  it("operands that do NOT agree keep exactly today's answer", async () => {
    // `integer[]` beside `bigint` resolves through select_common_type, which
    // this landing deliberately does not model — it requires agreement. The
    // fallback is the pre-existing path, so nothing that folded stops folding.
    const face = catalog as NullabilityCatalog & SubtreeEvaluationCatalog;
    expect(face.closedFunctionTypes("array_position", [["integer[]"], ["bigint"]])).toEqual([
      "integer",
    ]);
    const sql = "SELECT array_position(ARRAY[1,2], 3::bigint) AS v FROM rows_t";
    expect((await witness(sql)).anyNull).toBe(true);
    expect(await claim(sql)).toBe("alwaysNull");
  });

  it("a polymorphic array operand that is not an array rendering resolves nothing", () => {
    // Defensive: `anycompatiblearray` fed a scalar set cannot contribute an
    // element type, and a landing with no contribution must refuse rather
    // than invent one.
    const face = catalog as NullabilityCatalog & SubtreeEvaluationCatalog;
    expect(face.closedFunctionTypes("array_position", [["text"], ["unknown"]])).toBeNull();
  });
});

describe("a polymorphic landing — the probe budget", () => {
  it("no probe had to be killed", () => {
    expect(evaluator.killedSql).toEqual([]);
  });
});
