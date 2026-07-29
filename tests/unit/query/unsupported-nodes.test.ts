import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import {
  inferNullability,
  UnsupportedNodeError,
} from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// Refusing rather than guessing.
//
// Nullability is delivered as a positional array zipped against PostgreSQL's
// RowDescription. That makes the *column list* load-bearing: getting it wrong
// misassigns every flag past the divergence, and does so while looking
// authoritative. Arity alone is a weak guard — a construct can preserve the
// count and change the order (PostgreSQL emits a USING join's merged column
// FIRST, not in left-to-right position).
//
// So the walk refuses where silence would corrupt, and degrades where it would
// merely blunt. The distinction is the dispatch site, not the node:
//
//   expression   one target-list entry is one output column whatever the
//                expression turns out to be, so an unknown one is contained.
//                Report nullable.
//   from-item    contributes columns; an unknown one silently removes them.
//                Refuse.
//   statement    an unknown one yields no columns at all. Refuse.
//
// A function body is an expression site in disguise: it decides one value's
// nullability, not a column list, so DDL inside a SQL function stays nullable
// rather than raising — `SELECT f()` is a perfectly good query whatever f's
// body does.
//
// The caller always has a correct escape, because it runs PREPARE for types
// anyway: catch this and treat every column as nullable.
// ---------------------------------------------------------------------------

describe("unsupported nodes are refused, not guessed", () => {
  let pg: PGlite;
  let catalog: NullabilityCatalog;

  beforeAll(async () => {
    pg = await PGlite.create();
    await pg.exec(`
      CREATE TABLE t (id int NOT NULL, val text);
      CREATE TABLE events (id int NOT NULL, data jsonb NOT NULL);
      -- Legal: a SQL function whose body is DDL. RETURNS void, so calling it
      -- from a SELECT yields one NULL column.
      CREATE FUNCTION f_ddl() RETURNS void LANGUAGE sql
        AS $$ CREATE TEMP TABLE tmp_x (i int) $$;
      -- DDL first, SELECT last: the body's final statement decides the return.
      CREATE FUNCTION f_mixed() RETURNS int LANGUAGE sql
        AS $$ CREATE TEMP TABLE tmp_y (i int); SELECT 1 $$;
    `);
    catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
  });

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  const infer = async (sql: string) => {
    const parsed = await parseSql(sql);
    return inferNullability(parsed.stmts![0]!.stmt!, catalog);
  };

  // --- statements ---------------------------------------------------------

  // DDL has no output columns and no parameters — there is nothing to be
  // nullable. Asking for its nullability is a caller mistake, so say so
  // rather than return an empty list that looks like an answer.
  for (const sql of [
    "CREATE TABLE z (i int)",
    "ALTER TABLE t ADD COLUMN extra text",
    "DROP TABLE t",
    "SET search_path TO public",
    "CREATE INDEX ON t (id)",
  ]) {
    it(`refuses DDL: ${sql}`, async () => {
      await expect(infer(sql)).rejects.toThrow(UnsupportedNodeError);
    });
  }

  // These DO return columns, which is exactly why silence would be a bug:
  // EXPLAIN yields "QUERY PLAN" and SHOW yields the setting name.
  for (const sql of ["EXPLAIN SELECT 1", "SHOW search_path"]) {
    it(`refuses an unmodelled column-producing statement: ${sql}`, async () => {
      await expect(infer(sql)).rejects.toThrow(UnsupportedNodeError);
    });
  }

  it("names the site and the node type", async () => {
    await expect(infer("CREATE TABLE z2 (i int)")).rejects.toMatchObject({
      name: "UnsupportedNodeError",
      site: "statement",
      nodeType: "CreateStmt",
    });
  });

  // --- FROM items ---------------------------------------------------------

  it("refuses an unknown FROM item", async () => {
    // Every FROM-item kind PostgreSQL currently has is handled, so this uses a
    // synthetic node to stand in for whatever a future version adds.
    const stmt = {
      SelectStmt: {
        targetList: [
          { ResTarget: { name: "a", val: { A_Const: { ival: { ival: 1 } } } } },
        ],
        fromClause: [{ SomeFutureRangeKind: {} }],
      },
    } as never;
    expect(() => inferNullability(stmt, catalog)).toThrow(UnsupportedNodeError);
    try {
      inferNullability(stmt, catalog);
    } catch (e) {
      expect((e as UnsupportedNodeError).site).toBe("from-item");
      expect((e as UnsupportedNodeError).nodeType).toBe("SomeFutureRangeKind");
    }
  });

  // --- expressions: contained, so they degrade instead ---------------------

  it("does not refuse an unknown expression — one entry is one column", async () => {
    // JSON_VALUE is classified `conservative`: no branch, reported nullable.
    const r = await infer("SELECT JSON_VALUE(e.data, '$.a' RETURNING text) AS a FROM events e");
    expect(r).toEqual([{ name: "a", notNull: false }]);
  });

  it("keeps the column list right when an expression is unknown", async () => {
    const r = await infer(
      "SELECT t.id AS a, JSON_VALUE(e.data, '$.x' RETURNING text) AS b, t.id AS c FROM t, events e",
    );
    expect(r.map(c => c.name)).toEqual(["a", "b", "c"]);
    expect(r.map(c => c.notNull)).toEqual([true, false, true]);
  });

  // --- function bodies are expression sites -------------------------------

  it("does not refuse DDL inside a SQL function body", async () => {
    // `SELECT f_ddl()` is a valid query PostgreSQL runs happily. Only the
    // function's return value is unknowable, and that is one value — so it is
    // nullable, and the outer statement's shape is unaffected.
    const r = await infer("SELECT f_ddl() AS a FROM t");
    expect(r).toEqual([{ name: "a", notNull: false }]);
  });

  it("still reads a function body whose last statement is analysable", async () => {
    const r = await infer("SELECT f_mixed() AS a FROM t");
    expect(r).toEqual([{ name: "a", notNull: true }]);
  });
});
