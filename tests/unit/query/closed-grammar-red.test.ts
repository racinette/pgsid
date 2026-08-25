import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { deparseSync } from "pgsql-deparser";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import { collectClosedSubtrees } from "../../../src/query/subtree-evaluator.js";
import { createKillableEvaluator, type KillableEvaluator } from "./killable-evaluator.js";
import type { NullabilityCatalog, SubtreeEvaluationCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The RED SUITE for the CLOSED GRAMMAR's missing node kinds.
//
// The allowlist census in `subtree-evaluator.test.ts` ran two directions and
// needed a third. It caught OVER-ADMISSION (an unclassified kind inside a
// collected subtree) and DEAD GATES (a kind classified `closed` that nothing
// collects). Neither can see ABSENCE: a kind the gate has never heard of is
// never inside a collected subtree and is never classified `closed`, so both
// assertions pass while the gate does not exist.
//
// Twenty-six expression kinds were sitting in that blind spot. Most are
// genuinely open — a relation is context, an aggregate needs rows, `xml_in` is
// stable — but three were closed all the way down and refused anyway, and the
// reason one of them carried was TRUE OF A DIFFERENT SHAPE: `A_Indirection`
// was excluded as "structural facts over open trees are refused", which is
// right about `arr[i]` over a column and silent about
// `(array_remove(ARRAY['a','b'], 'a'))[1]`.
//
// Every target is adjudicated by running the query and reading the rows back.
// ---------------------------------------------------------------------------

const DDL = `
  CREATE TABLE rows_t (id integer PRIMARY KEY, v text);
  -- A named-argument call needs a function with named parameters.
  CREATE FUNCTION two(a text, b text) RETURNS text
    LANGUAGE sql IMMUTABLE AS $$ SELECT a || '/' || b $$;
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

/** Whether the first target-list expression collects as ONE closed subtree. */
async function closesWhole(expr: string): Promise<boolean> {
  const stmt = (await parseSql(`SELECT ${expr} AS v`)).stmts![0]!.stmt!;
  const face = catalog as NullabilityCatalog & SubtreeEvaluationCatalog;
  const roots = collectClosedSubtrees(stmt, face);
  if (roots.length !== 1) return false;
  const val = (
    (stmt as Record<string, unknown>)["SelectStmt"] as {
      targetList?: { ResTarget?: { val?: unknown } }[];
    }
  ).targetList?.[0]?.ResTarget?.val;
  return roots[0] === val;
}

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(DDL);
  await pg.exec(`INSERT INTO rows_t VALUES (1, 'a'), (2, NULL), (3, 'c')`);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), { searchPath: ["public"] });
  evaluator = await createKillableEvaluator({ schema: DDL });
}, 120_000);

afterAll(async () => {
  await evaluator?.close();
  if (pg && !pg.closed) await pg.close();
});

describe("A_Indirection — a subscript over a CLOSED argument", () => {
  it("the handlers it runs are immutable, which is what makes it closable", async () => {
    // Subscripting dispatches a TYPE's own routine, not an I/O function.
    const r = await pg.query<{ t: string; h: string; v: string }>(`
      SELECT t.typname AS t, coalesce(p.proname, '-') AS h, coalesce(p.provolatile, '-') AS v
        FROM pg_type t LEFT JOIN pg_proc p ON p.oid = t.typsubscript
       WHERE t.typname IN ('_text', 'jsonb', 'json') ORDER BY 1`);
    expect(r.rows).toEqual([
      { t: "_text", h: "array_subscript_handler", v: "i" },
      { t: "json", h: "-", v: "-" },
      { t: "jsonb", h: "jsonb_subscript_handler", v: "i" },
    ]);
  });

  it("the row the register carried — a subscript over a polymorphic call", async () => {
    const sql = "SELECT (array_remove(ARRAY['a','b'], 'a'))[1] AS v FROM rows_t";
    expect((await witness(sql)).anyNull).toBe(false);
    expect(await claim(sql)).toBe("notNull");
  });

  it("an out-of-range element is NULL on every row", async () => {
    const sql = "SELECT (array_remove(ARRAY['a','b'], 'a'))[5] AS v FROM rows_t";
    expect((await witness(sql)).anyNull).toBe(true);
    expect(await claim(sql)).toBe("alwaysNull");
  });

  it("a SLICE keeps the array type and clamps rather than NULLing", async () => {
    const sql = "SELECT (array_remove(ARRAY['a','b'], 'z'))[1:1] AS v FROM rows_t";
    expect((await witness(sql)).anyNull).toBe(false);
    expect(await claim(sql)).toBe("notNull");
    expect(await closesWhole("(array_remove(ARRAY['a','b'], 'z'))[1:1]")).toBe(true);
  });

  it("a jsonb key subscript, both directions", async () => {
    const present = `SELECT ('{"a":1}'::jsonb)['a'] AS v FROM rows_t`;
    expect((await witness(present)).anyNull).toBe(false);
    expect(await claim(present)).toBe("notNull");
    const absent = `SELECT ('{"a":1}'::jsonb)['zz'] AS v FROM rows_t`;
    expect((await witness(absent)).anyNull).toBe(true);
    expect(await claim(absent)).toBe("alwaysNull");
  });

  it("a dead disjunct behind one", async () => {
    const sql =
      "SELECT v FROM rows_t WHERE (array_remove(ARRAY['a','b'], 'z'))[1] = 'q' OR v IS NOT NULL";
    const w = await witness(sql);
    expect(w.rows).toBeGreaterThan(0);
    expect(w.anyNull).toBe(false);
    expect(await claim(sql)).toBe("notNull");
  });

  it("the ARGUMENT KIND is gated by what the DEPARSER renders, not by closure", async () => {
    // `(ARRAY['a','b'])[1]` is closed by every argument this module makes,
    // and it is refused anyway: the collected subtree goes back out through
    // `deparseSelect`, and pgsql-deparser drops the parentheses a subscripted
    // ARRAY constructor needs. Measured below rather than assumed, and the
    // cost of tolerating it is not local — a batch whose render is rejected
    // returns NOTHING for the whole statement, so one unrenderable subtree
    // would cost every other answer in the same query.
    const renders = async (expr: string): Promise<boolean> => {
      const parsed = await parseSql(`SELECT ${expr} AS e0`);
      let sql: string;
      try {
        sql = deparseSync(parsed as never);
      } catch {
        return false;
      }
      try {
        await pg.query(sql);
        return true;
      } catch {
        return false;
      }
    };
    for (const ok of [
      "(array_remove(ARRAY['a','b'], 'a'))[1]",
      `('{"a":1}'::jsonb)['a']`,
      "((SELECT ARRAY['a']))[1]",
    ]) {
      expect(await renders(ok), ok).toBe(true);
      expect(await closesWhole(ok), ok).toBe(true);
    }
    for (const broken of [
      "(ARRAY['a','b'])[1]",
      "(CASE WHEN true THEN ARRAY['a'] ELSE ARRAY['b'] END)[1]",
      "(COALESCE(ARRAY['a'], ARRAY['b']))[1]",
    ]) {
      expect(await renders(broken), broken).toBe(false);
      expect(await closesWhole(broken), broken).toBe(false);
    }
  });

  it("a FIELD name is refused — `record` names no type to thread", async () => {
    // PostgreSQL answers 1, so this is a real refusal rather than an absent
    // case: the indirection step is a String, and a composite's field type is
    // not derivable from the `record` rendering the type sets carry.
    expect((await witness("SELECT (ROW(1,'x')).f1 AS v FROM rows_t")).anyNull).toBe(false);
    expect(await closesWhole("(ROW(1,'x')).f1")).toBe(false);
  });

  it("a jsonb SLICE is refused, and PostgreSQL raises on it", async () => {
    await expect(pg.query(`SELECT ('{"a":1}'::jsonb)['a':'b']`)).rejects.toThrow(
      /does not support slices/,
    );
    expect(await closesWhole(`('{"a":1}'::jsonb)['a':'b']`)).toBe(false);
  });

  it("an OPEN argument stays open — the reason the old entry gave", async () => {
    // The exclusion said "structural facts over open trees are refused", and
    // for an open tree it is still exactly right.
    expect(await closesWhole("(ARRAY[v, v])[1]")).toBe(false);
    expect(await claim("SELECT (ARRAY[v, v])[1] AS x FROM rows_t")).toBe("nullable");
  });
});

describe("CollateClause — a collation names no session state", () => {
  it("a dead disjunct behind an explicit collation", async () => {
    const sql = `SELECT v FROM rows_t WHERE ('a' COLLATE "C") > 'b' OR v IS NOT NULL`;
    const w = await witness(sql);
    expect(w.rows).toBeGreaterThan(0);
    expect(w.anyNull).toBe(false);
    expect(await claim(sql)).toBe("notNull");
  });

  it("it threads its argument's type unchanged", async () => {
    expect(await closesWhole(`('a' COLLATE "C") || 'b'`)).toBe(true);
  });
});

describe("JsonIsPredicate — closable by every argument except one", () => {
  it("PostgreSQL answers it, and the DEPARSER cannot write it down", async () => {
    // `IS JSON` is a strict boolean over `json_in`/`jsonb_in`, both immutable,
    // and it would close on those grounds alone. It is refused because
    // `pgsql-deparser` has no case for the node at all — so a collected one
    // would throw during render and zero the whole statement's map. This is
    // the same defect class as the drafted upstream deparser issue, and
    // closing that report is what unblocks this entry.
    const r = await pg.query<{ v: boolean }>(`SELECT 'nope' IS JSON AS v`);
    expect(r.rows[0]!.v).toBe(false);
    const parsed = await parseSql(`SELECT 'nope' IS JSON AS e0`);
    expect(() => deparseSync(parsed as never)).toThrow(/JsonIsPredicate/);
    expect(await closesWhole(`'nope' IS JSON`)).toBe(false);
    expect(await claim("SELECT v FROM rows_t WHERE ('nope' IS JSON) OR v IS NOT NULL")).toBe(
      "nullable",
    );
  });
});

describe("the kinds that stay open, each for a MEASURED reason", () => {
  it("xml: `xml_in` is STABLE, so xml is outside the immutable-I/O set", async () => {
    const r = await pg.query<{ i: string; o: string }>(`
      SELECT pi.provolatile AS i, po.provolatile AS o
        FROM pg_type t JOIN pg_proc pi ON pi.oid = t.typinput
        JOIN pg_proc po ON po.oid = t.typoutput
       WHERE t.typname = 'xml'`);
    expect(r.rows[0]).toEqual({ i: "s", o: "i" });
    expect(await closesWhole("xmlelement(name foo, 'bar')")).toBe(false);
    expect(await closesWhole("xmlserialize(content xmlelement(name foo) AS text)")).toBe(false);
  });

  it("NamedArgExpr: the AST carries the WRITTEN order and `argnumber` is unresolved", async () => {
    // The survivor consensus matches parameters POSITIONALLY, so admitting a
    // named call would type operand i against parameter i when PostgreSQL
    // will not. Measured: the two spellings below give the same VALUE and
    // opposite AST orders.
    const written = await pg.query<{ v: string }>(`SELECT two(b => 'B', a => 'A') AS v`);
    const positional = await pg.query<{ v: string }>(`SELECT two('A', 'B') AS v`);
    expect(written.rows[0]!.v).toBe("A/B");
    expect(positional.rows[0]!.v).toBe("A/B");
    const ast = JSON.stringify((await parseSql(`SELECT two(b => 'B', a => 'A')`)).stmts![0]!.stmt!);
    expect(ast).toContain(`"name":"b","argnumber":-1`);
    expect(ast.indexOf(`"name":"b"`)).toBeLessThan(ast.indexOf(`"name":"a"`));
    expect(await closesWhole(`two(b => 'B', a => 'A')`)).toBe(false);
  });

  it("the JSON constructors and JSON_VALUE are DEFERRED, not refused", async () => {
    // Each answers a definite value from all-literal arguments (below), and
    // each needs the same RETURNING/FORMAT sub-grammar — one coherent piece
    // of work rather than six, recorded in the register rather than dressed
    // up as a design refusal here.
    for (const [expr, expected] of [
      [`JSON_OBJECT('b': 2, 'a': 1)`, { b: 2, a: 1 }],
      [`JSON_ARRAY(1, 'x')`, [1, "x"]],
      [`JSON_SCALAR(1)`, 1],
      [`JSON('{"a":1}')`, { a: 1 }],
      [`JSON_SERIALIZE('{"a":1}'::json)`, `{"a":1}`],
      [`JSON_VALUE('{"a":1}'::jsonb, '$.a')`, "1"],
    ] as const) {
      const r = await pg.query<Record<string, unknown>>(`SELECT ${expr} AS v`);
      expect(Object.values(r.rows[0]!)[0], expr).toEqual(expected);
      expect(await closesWhole(expr), expr).toBe(false);
    }
  });
});

describe("the closed grammar — the probe budget", () => {
  it("no probe had to be killed", () => {
    expect(evaluator.killedSql).toEqual([]);
  });
});
