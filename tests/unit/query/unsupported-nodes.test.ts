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
      -- A DO INSTEAD rule replaces the statement outright: RETURNING reports
      -- the rule's query against a different table (measured — the redirect
      -- returns rule_dst's NULL where the statement wrote a literal into a
      -- NOT NULL column). A DO ALSO rule leaves the original statement and
      -- its RETURNING in place.
      CREATE TABLE rule_src (id int NOT NULL, a text NOT NULL);
      CREATE TABLE rule_dst (id int, a text);
      CREATE RULE r_ins AS ON INSERT TO rule_src DO INSTEAD
        INSERT INTO rule_dst VALUES (NEW.id, NULL) RETURNING id, a;
      CREATE TABLE rule_also (id int NOT NULL, a text NOT NULL);
      CREATE TABLE rule_log (id int);
      CREATE RULE r_also AS ON INSERT TO rule_also DO ALSO
        INSERT INTO rule_log VALUES (NEW.id);
      -- An OVERLOADED table function whose candidates return different
      -- SHAPES. PostgreSQL picks by argument type; the walk cannot type
      -- 42 versus 'x', so neither candidate's column list can be assumed.
      -- Measured: the engine emitted one column named ov_shape against
      -- PostgreSQL's three.
      CREATE TYPE sku_pair AS (sku text, qty integer);
      -- A composite COLUMN, for the unnest element-type cases below.
      CREATE TABLE cc (id int NOT NULL, p sku_pair);
      -- An array of that composite, for the spellings that reach the element
      -- type through a column rather than through a constructor.
      CREATE TABLE ch (id int NOT NULL, pairs sku_pair[]);
      CREATE FUNCTION ov_shape(x text) RETURNS SETOF sku_pair
        LANGUAGE sql AS $$ SELECT ROW('a', 1)::sku_pair $$;
      CREATE FUNCTION ov_shape(x integer) RETURNS TABLE(a int, b int, c int)
        LANGUAGE sql AS $$ SELECT 1, 2, 3 $$;
      -- The positive arm: overloaded, but every candidate yields the SAME
      -- column list, which therefore holds whichever one runs.
      CREATE FUNCTION ov_agree(x text) RETURNS SETOF sku_pair
        LANGUAGE sql AS $$ SELECT ROW('a', 1)::sku_pair $$;
      CREATE FUNCTION ov_agree(x integer) RETURNS SETOF sku_pair
        LANGUAGE sql AS $$ SELECT ROW('b', 2)::sku_pair $$;
      -- Overloaded WITH a variadic candidate: the arity filter is unsound
      -- here (a variadic absorbs any count), but the candidates agree on
      -- the shape, so no narrowing is needed to answer.
      CREATE FUNCTION ov_variadic(VARIADIC xs text[]) RETURNS SETOF sku_pair
        LANGUAGE sql AS $$ SELECT ROW(x, 1)::sku_pair FROM unnest(xs) AS x $$;
      CREATE FUNCTION ov_variadic(n integer) RETURNS SETOF sku_pair
        LANGUAGE sql AS $$ SELECT ROW('b', n)::sku_pair $$;
      -- …and the same with the shapes DISAGREEING, where nothing can be
      -- proved and the refusal stands.
      CREATE FUNCTION ov_var_clash(VARIADIC xs text[]) RETURNS SETOF sku_pair
        LANGUAGE sql AS $$ SELECT ROW(x, 1)::sku_pair FROM unnest(xs) AS x $$;
      CREATE FUNCTION ov_var_clash(n integer) RETURNS TABLE(a int, b int, c int)
        LANGUAGE sql AS $$ SELECT 1, 2, n $$;
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

  // --- DO INSTEAD rules ----------------------------------------------------

  // The returned rows come from a statement the engine never saw, so this is
  // the dispatch-site rule for statements: refuse rather than answer for the
  // wrong one (adversarial finding 2).
  it("refuses RETURNING through a DO INSTEAD rule", async () => {
    await expect(
      infer("INSERT INTO rule_src VALUES (1, 'x') RETURNING id, a"),
    ).rejects.toMatchObject({
      name: "UnsupportedNodeError",
      site: "statement",
    });
  });

  it("does not refuse the same statement without RETURNING — nothing to misreport", async () => {
    const r = await infer("INSERT INTO rule_src VALUES (1, 'x')");
    expect(r).toEqual([]);
  });

  it("does not refuse a command the rule is not on", async () => {
    // The rule rewrites INSERT only; an UPDATE's RETURNING is the real row.
    const r = await infer("UPDATE rule_src SET a = 'y' RETURNING a");
    expect(r.map(c => ({ name: c.name, notNull: c.notNull }))).toEqual([
      { name: "a", notNull: true },
    ]);
  });

  it("does not refuse a DO ALSO rule — the original RETURNING stands", async () => {
    const r = await infer("INSERT INTO rule_also VALUES (1, 'x') RETURNING a");
    expect(r.map(c => ({ name: c.name, notNull: c.notNull }))).toEqual([
      { name: "a", notNull: true },
    ]);
  });

  // --- unresolvable relations ----------------------------------------------

  // The snapshot's capture set (relkind 'r'/'p'/'f' in user namespaces, plus
  // views) is the resolution set. Anything else once fell back to a
  // zero-column entry, and star expansion silently dropped its columns —
  // measured silent in seven placements by the adversarial sweep. A FROM
  // item that contributes the wrong columns is worse than one that refuses.
  for (const sql of [
    "SELECT * FROM pg_catalog.pg_namespace",
    "SELECT * FROM information_schema.schemata",
    "SELECT * FROM no_such_table",
  ]) {
    it(`refuses an unresolvable relation: ${sql}`, async () => {
      await expect(infer(sql)).rejects.toMatchObject({
        name: "UnsupportedNodeError",
        site: "from-item",
      });
    });
  }

  // --- overloaded table functions in FROM ----------------------------------

  // A FROM item's column list is load-bearing, and an overloaded name does
  // not determine one: PostgreSQL resolves by argument types, which the walk
  // has no type system to compute. The old fall-through contributed ONE
  // column named after the function — measured wrong against PostgreSQL's
  // three, and reachable with two overloads in a SINGLE schema, no
  // search_path involved. Refusing is the dispatch-site rule; the caller's
  // escape is PREPARE plus all-nullable.
  it("refuses an overloaded table function whose candidates disagree on shape", async () => {
    for (const sql of ["SELECT * FROM ov_shape(42)", "SELECT * FROM ov_shape('x')"]) {
      await expect(infer(sql)).rejects.toMatchObject({
        name: "UnsupportedNodeError",
        site: "from-item",
      });
    }
  });

  // …and does NOT refuse when the candidates agree: that shared list holds
  // for whichever overload runs, the same consensus quantifier the flag
  // rules use. A blanket refusal on overloading would be the easy answer
  // and a needless consumer cost.
  it("accepts an overloaded table function whose candidates agree on shape", async () => {
    const results = await infer("SELECT * FROM ov_agree(42)");
    expect(results.map(r => r.name)).toEqual(["sku", "qty"]);
    expect(results.every(r => !r.notNull)).toBe(true);
  });

  // The shape question is asked over the FULL candidate set before any
  // arity narrowing, so a variadic candidate — which makes narrowing
  // unsound and once sent the whole item to a single wrong column — costs
  // nothing when the candidates already agree.
  it("resolves an overloaded VARIADIC table function when the shapes agree", async () => {
    for (const sql of ["SELECT * FROM ov_variadic(3)", "SELECT * FROM ov_variadic('a', 'b')"]) {
      const results = await infer(sql);
      expect(results.map(r => r.name), sql).toEqual(["sku", "qty"]);
    }
  });

  it("…and still refuses when a variadic overload's shapes disagree", async () => {
    await expect(infer("SELECT * FROM ov_var_clash(3)")).rejects.toMatchObject({
      name: "UnsupportedNodeError",
      site: "from-item",
    });
  });

  // --- (expr).* over an unresolvable composite -----------------------------

  // A target-list expansion whose field count is unknowable: emitting one
  // column (or a guess) would corrupt the list, so it refuses like a FROM
  // item. The resolvable arms — a relation reference, a composite column, a
  // function with single-candidate metadata, a ROW constructor, a cast to a
  // known composite — expand instead (fixture-covered; the last three
  // closed with adversarial-2 finding 13). What remains unresolvable is a
  // cast to a type the snapshot does not know, and a subquery's composite
  // column, whose type never reaches the catalog.
  it("refuses (expr).* when the composite cannot be resolved", async () => {
    await expect(
      infer("SELECT (ROW(1, 2)::no_such_type).* FROM t"),
    ).rejects.toMatchObject({
      name: "UnsupportedNodeError",
      site: "composite-star",
    });
    await expect(
      infer("SELECT (s.c).* FROM (SELECT ROW(1, 2) AS c) s"),
    ).rejects.toMatchObject({
      name: "UnsupportedNodeError",
      site: "composite-star",
    });
  });

  // --- unnest's element type ----------------------------------------------

  // `unnest` contributes one column per ARGUMENT unless the element type is
  // a composite, in which case it contributes one per FIELD — so the shape
  // depends on a type, and reading "I could not tell" as "scalar" was a
  // wrong shape in six measured spellings (adversarial-3 finding 3). It
  // refuses when it cannot tell.
  //
  // What remains is ONE cause, and it is the one the type charter names as
  // its own residue: an expression whose type needs COMMON-TYPE resolution
  // across several branches. A CASE arm and a set operation each declare
  // their type by agreement between arms, which is a rule the walk does not
  // implement — every other source here is read, not inferred.
  it("refuses unnest of an expression needing common-type resolution", async () => {
    for (const sql of [
      "SELECT * FROM unnest(CASE WHEN true THEN ARRAY[ROW('a', 1)::sku_pair] END)",
      "WITH w AS (SELECT ARRAY[p] AS ps FROM cc UNION ALL SELECT ARRAY[p] FROM cc)" +
        " SELECT * FROM w, unnest(w.ps)",
      "SELECT * FROM unnest((SELECT ARRAY[p] FROM cc UNION ALL SELECT ARRAY[p] FROM cc LIMIT 1))",
    ]) {
      await expect(infer(sql), sql).rejects.toMatchObject({
        name: "UnsupportedNodeError",
        site: "from-item",
      });
    }
  });

  // The other direction: the spellings the catalog CAN answer must not have
  // been swept into the refusal. Scalar arrays keep their single column.
  it("does not refuse unnest whose element type the catalog answers", async () => {
    const cases: [string, string[]][] = [
      ["SELECT * FROM unnest(ARRAY[1, 2])", ["unnest"]],
      ["SELECT * FROM unnest(string_to_array('a,b', ','))", ["unnest"]],
      ["SELECT * FROM unnest(ARRAY['x'] || ARRAY['y'])", ["unnest"]],
      ["SELECT * FROM unnest(coalesce(ARRAY['x'], ARRAY['y']))", ["unnest"]],
      ["SELECT * FROM unnest(ARRAY[ROW('a', 1)::sku_pair] || ARRAY[ROW('b', 2)::sku_pair])",
        ["sku", "qty"]],
      ["SELECT * FROM unnest((ARRAY[ROW('a', 1)::sku_pair])[1:1])", ["sku", "qty"]],
      // An ARRAY constructor over an EXPRESSION rather than a cast: the
      // element type IS the member's type, which the catalog answers for a
      // column reference.
      ["SELECT * FROM cc c, unnest(ARRAY[c.p])", ["id", "p", "sku", "qty"]],
      // A column a derived table COMPUTES has no base column and a readable
      // type all the same: the defining expression is typed one level in,
      // against that statement's own FROM. The CTE spelling is the same
      // reading, and a scalar array stays one column.
      ["SELECT * FROM (SELECT ARRAY[p] AS ps FROM cc) s, unnest(s.ps)", ["ps", "sku", "qty"]],
      ["WITH w AS (SELECT ARRAY[p] AS ps FROM cc) SELECT * FROM w, unnest(w.ps)",
        ["ps", "sku", "qty"]],
      ["SELECT * FROM (SELECT ARRAY[1, 2] AS ns FROM cc) s, unnest(s.ns)", ["ns", "unnest"]],
      // A scalar sublink is its single output column, typed the same way.
      ["SELECT * FROM unnest((SELECT h.pairs FROM ch h LIMIT 1))", ["sku", "qty"]],
      ["SELECT * FROM unnest((SELECT ARRAY[c.p] FROM cc c LIMIT 1))", ["sku", "qty"]],
      ["SELECT * FROM unnest((SELECT ARRAY[1, 2] LIMIT 1))", ["unnest"]],
      // A POLYMORPHIC builtin takes its type from its arguments, and the
      // captured pg_catalog signatures say from WHICH argument: an
      // array-declared position answers with its own element type, an
      // element-declared one with the argument's type. `array_agg` declares
      // both and a composite argument fits exactly one.
      ["SELECT * FROM unnest((SELECT array_agg(c.p) FROM cc c))", ["sku", "qty"]],
      ["SELECT * FROM unnest((SELECT array_agg(c.p ORDER BY c.id) FROM cc c))", ["sku", "qty"]],
      ["SELECT * FROM unnest((SELECT array_agg(c.id) FROM cc c))", ["unnest"]],
      ["SELECT * FROM unnest(array_remove(ARRAY[ROW('a', 1)::sku_pair], NULL))",
        ["sku", "qty"]],
      ["SELECT * FROM unnest(array_cat(ARRAY[ROW('a', 1)::sku_pair], ARRAY[ROW('b', 2)::sku_pair]))",
        ["sku", "qty"]],
      ["SELECT * FROM unnest(trim_array(ARRAY[ROW('a', 1)::sku_pair], 0))", ["sku", "qty"]],
      ["SELECT * FROM unnest(array_fill(ROW('a', 1)::sku_pair, ARRAY[1]))", ["sku", "qty"]],
      // The composition: the argument of one polymorphic call is another.
      ["SELECT * FROM unnest(array_remove((SELECT array_agg(c.p) FROM cc c), NULL))",
        ["sku", "qty"]],
      // A scalar array through the same names keeps its single column.
      ["SELECT * FROM unnest(array_remove(ARRAY[1, 2], NULL))", ["unnest"]],
      ["SELECT * FROM unnest((SELECT array_agg(h.pairs) FROM ch h))", ["sku", "qty"]],
    ];
    for (const [sql, names] of cases) {
      expect((await infer(sql)).map(r => r.name), sql).toEqual(names);
    }
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
