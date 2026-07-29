import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// Column SEQUENCE, not just arity.
//
// Nullability is delivered as a positional array zipped against PostgreSQL's
// RowDescription, so the order has to match, not merely the count. A
// permutation would misassign every flag past the divergence while passing any
// length check.
//
// Order is derived the same two ways PostgreSQL derives it — `attnum` for a
// relation's columns (the catalog snapshot selects `ORDER BY attrelid, attnum`
// and excludes dropped columns), and syntactic order for everything else — so
// this suite is guarding a structural property rather than a coincidence. It
// covers the cases where that could plausibly break: a dropped column leaving
// an attnum gap, a column appended after CREATE, reversed and interleaved
// stars, nesting, views and LATERAL.
//
// The fixture suites cover ordering for the fixture schema; this one exists
// for the schema shapes that schema cannot express.
// ---------------------------------------------------------------------------

const SETUP = `
  CREATE TABLE a (val1 int NOT NULL, val2 text);
  CREATE TABLE b (val3 int, val4 text NOT NULL);
  -- attnum gap: a dropped column leaves a hole in pg_attribute.
  CREATE TABLE gap (k int NOT NULL, junk text, z int NOT NULL);
  ALTER TABLE gap DROP COLUMN junk;
  -- attnum order differs from the original CREATE: appended later.
  CREATE TABLE later (m int NOT NULL);
  ALTER TABLE later ADD COLUMN aaa text;
  CREATE VIEW v_ab AS SELECT a.val1, b.val4 FROM a, b;
  -- USING join column deliberately NOT first on the left. PostgreSQL emits the
  -- merged column FIRST, so this distinguishes that rule from the plausible
  -- alternative of "keep left order, drop the right-hand duplicate" — which
  -- yields the same ARITY (x, id, y) and a different order. A fixture whose
  -- join column happens to be the left relation's first column cannot tell the
  -- two apart.
  CREATE TABLE l (x int NOT NULL, id int NOT NULL);
  CREATE TABLE r (id int NOT NULL, y int NOT NULL);
`;

const CASES = [
  "SELECT a.*, b.* FROM a, b",
  "SELECT b.*, a.* FROM a, b",
  "SELECT a.val2, a.*, b.val3, b.* FROM a, b",
  "SELECT * FROM a, b",
  "SELECT * FROM b, a",
  "SELECT * FROM gap",
  "SELECT g.*, l.* FROM gap g, later l",
  "SELECT * FROM later",
  "SELECT * FROM (SELECT b.*, a.* FROM a, b) s",
  "SELECT s.*, a.* FROM a, (SELECT b.* FROM b) s",
  "SELECT * FROM a LEFT JOIN b ON true RIGHT JOIN gap ON true",
  "SELECT * FROM v_ab",
  "SELECT * FROM a CROSS JOIN LATERAL (SELECT b.* FROM b) t",
  // Merged-first, where merged-first != left order. Expect id, x, y.
  "SELECT * FROM l JOIN r USING (id)",
  "SELECT * FROM l NATURAL JOIN r",
  "SELECT * FROM l FULL JOIN r USING (id)",
  "SELECT * FROM r JOIN l USING (id)",
];

describe("output column sequence matches PostgreSQL", () => {
  let pg: PGlite;
  let catalog: NullabilityCatalog;

  beforeAll(async () => {
    pg = await PGlite.create();
    await pg.exec(SETUP);
    catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
  });

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  for (const sql of CASES) {
    it(sql, async () => {
      const engine = inferNullability((await parseSql(sql)).stmts![0]!.stmt!, catalog).map(c => c.name);
      const postgres = (await pg.query(sql, [], { rowMode: "array" })).fields.map(f => f.name);
      expect(engine, `column sequence differs from PostgreSQL`).toEqual(postgres);
    });
  }
});
