import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullabilityTraced } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog, TraceNode } from "../../../src/query/types.js";

describe("nullability-walk-traced", () => {
  let pg: PGlite;
  let catalog: NullabilityCatalog;

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    const schemaSql = await import("node:fs").then(fs =>
      fs.readFileSync("tests/unit/query/fixtures/schema.sql", "utf8"),
    );
    await pg.exec(schemaSql);
    const snapshot = await snapshotCatalog(pg);
    catalog = await buildNullabilityCatalog(snapshot);
  });

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  it("produces a trace tree explaining a simple column", async () => {
    const sql = "SELECT id AS id FROM products p";
    const parsed = await parseSql(sql);
    const results = inferNullabilityTraced(parsed.stmts![0]!.stmt!, catalog);
    expect(results.length).toBe(1);
    expect(results[0]!.notNull).toBe(true);
    const trace = results[0]!.trace!;
    expect(trace.decision).toBe(true);
    expect(trace.facts.some(f => f.name === "catalog.notNull" && f.value === "true")).toBe(true);
    expect(trace.facts.some(f => f.name === "joinState" && f.value === "REQUIRED")).toBe(true);
  });

  it("traces WHERE promotion", async () => {
    const sql = `
      SELECT t.id AS c1, u.email AS c2
      FROM t LEFT JOIN u ON u.t_id = t.id
      WHERE u.email IS NOT NULL
    `;
    const parsed = await parseSql(sql);
    const results = inferNullabilityTraced(parsed.stmts![0]!.stmt!, catalog);
    // u.email promoted by WHERE guarantee
    const emailTrace = results[1]!.trace!;
    expect(emailTrace.decision).toBe(true);
    expect(emailTrace.facts.some(f => f.name === "whereGuarantee" && f.value === "true")).toBe(true);
  });

  it("traces COALESCE with multiple args", async () => {
    const sql = "SELECT COALESCE(deleted_at, 'x') AS c1 FROM products p";
    const parsed = await parseSql(sql);
    const results = inferNullabilityTraced(parsed.stmts![0]!.stmt!, catalog);
    const trace = results[0]!.trace!;
    expect(trace.decision).toBe(true);
    expect(trace.children.length).toBe(2); // arg[0] + arg[1]
    expect(trace.children[0]!.label).toContain("arg[0]");
    expect(trace.children[0]!.decision).toBe(false); // deleted_at nullable
    expect(trace.children[1]!.decision).toBe(true); // 'x' non-null
    expect(trace.reason).toContain("arg[1] is non-null");
  });

  it("traces strict function with nullable arg", async () => {
    const sql = "SELECT lower_strict(deleted_at) AS c1 FROM products p";
    const parsed = await parseSql(sql);
    const results = inferNullabilityTraced(parsed.stmts![0]!.stmt!, catalog);
    const trace = results[0]!.trace!;
    expect(trace.decision).toBe(false);
    expect(trace.facts.some(f => f.name === "priority" && f.value.includes("strict"))).toBe(true);
    expect(trace.facts.some(f => f.name === "argsNotNull")).toBe(true);
    expect(trace.reason).toContain("at least one arg nullable");
  });

  it("traces NOT NULL domain function return", async () => {
    const sql = "SELECT always_text(deleted_at) AS c1 FROM products p";
    const parsed = await parseSql(sql);
    const results = inferNullabilityTraced(parsed.stmts![0]!.stmt!, catalog);
    const trace = results[0]!.trace!;
    expect(trace.decision).toBe(true);
    expect(trace.facts.some(f => f.name === "priority" && f.value === "1 (NOT NULL domain return)")).toBe(true);
    expect(trace.reason).toContain("NOT NULL domain");
  });

  it("traces scalar subquery with count(*)", async () => {
    const sql = "SELECT (SELECT count(*) FROM order_items oi) AS c1 FROM orders o";
    const parsed = await parseSql(sql);
    const results = inferNullabilityTraced(parsed.stmts![0]!.stmt!, catalog);
    const trace = results[0]!.trace!;
    expect(trace.decision).toBe(true);
    expect(trace.facts.some(f => f.name === "subLinkType" && f.value === "EXPR_SUBLINK")).toBe(true);
    expect(trace.facts.some(f => f.name === "singleRow" && f.value === "true")).toBe(true);
  });

  it("traces ParamRef as conservative nullable", async () => {
    const sql = "SELECT $1 AS c1 FROM products p";
    const parsed = await parseSql(sql);
    const results = inferNullabilityTraced(parsed.stmts![0]!.stmt!, catalog);
    const trace = results[0]!.trace!;
    expect(trace.decision).toBe(false);
    expect(trace.facts.some(f => f.name === "param" && f.value === "$1")).toBe(true);
    expect(trace.reason).toContain("conservative nullable");
  });

  it("traces CTE column propagation", async () => {
    const sql = `
      WITH x AS (SELECT id, deleted_at FROM products)
      SELECT x.id AS c1 FROM x
    `;
    const parsed = await parseSql(sql);
    const results = inferNullabilityTraced(parsed.stmts![0]!.stmt!, catalog);
    expect(results.length).toBe(1);
    expect(results[0]!.notNull).toBe(true);
    const trace = results[0]!.trace!;
    // The trace should show the CTE relation was resolved
    expect(trace.facts.some(f => f.name === "relation")).toBe(true);
  });

  it("traces TypeCast to NOT NULL domain", async () => {
    const sql = "SELECT NULL::nn_text AS c1 FROM products p";
    const parsed = await parseSql(sql);
    const results = inferNullabilityTraced(parsed.stmts![0]!.stmt!, catalog);
    const trace = results[0]!.trace!;
    expect(trace.decision).toBe(true);
    expect(trace.facts.some(f => f.name === "isNotNullDomain" && f.value === "true")).toBe(true);
    expect(trace.reason).toContain("NOT NULL domain");
  });

  it("produces same results as untraced walk for set operations", async () => {
    const sql = `
      WITH cat_tree AS (
        SELECT id, name, 0 AS depth FROM categories WHERE parent_id IS NULL
        UNION ALL
        SELECT c.id, c.name, ct.depth + 1 FROM categories c JOIN cat_tree ct ON c.parent_id = ct.id
      )
      SELECT id, name, depth FROM cat_tree UNION SELECT 0, 'root', 0
    `;
    const parsed = await parseSql(sql);
    const results = inferNullabilityTraced(parsed.stmts![0]!.stmt!, catalog);
    expect(results.length).toBe(3);
    expect(results[0]!.notNull).toBe(true);
    expect(results[1]!.notNull).toBe(true);
    expect(results[2]!.notNull).toBe(false);
  });
});
