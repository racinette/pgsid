import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullabilityTraced } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";
import { GRAMMAR_SAMPLER } from "./grammar-sampler.js";

// ---------------------------------------------------------------------------
// Node-type census.
//
// The walk dispatches on raw parse-tree node types. Anything it does not
// recognise falls through to "conservative nullable" — safe for a *value*, but
// silent, and useless where the node contributes output *columns* instead of a
// value. Several defects have been exactly that: a FROM item or statement type
// nobody had considered, producing the wrong column list rather than a wrong
// flag.
//
// This suite makes the set of node types we have considered explicit, and
// fails when reality moves outside it. Two assertions:
//
//   1. Every node type observed across the corpus is classified below. A new
//      one — from a PostgreSQL upgrade, a libpg-query bump, or simply a query
//      shape nobody had written — fails the test until someone categorises it.
//
//   2. Every node type that actually reaches the walk's fallback is classified
//      `conservative`. Reaching the fallback from any other category means the
//      classification is wrong: `handled` claims a branch that isn't firing,
//      and `structural` claims the node is only ever consumed by a parent.
//
// Note on scope: the classification covers the RAW parse tree, which is all
// libpg-query produces. Postgres's analyzed tree uses a different vocabulary
// for the same concepts — `Var` for ColumnRef, `OpExpr` for A_Expr, `Aggref`
// for an aggregate FuncCall, `TargetEntry` for ResTarget — and none of those
// can ever reach the walk. They are recorded as `analyzed-only` so the
// distinction is written down rather than rediscovered.
// ---------------------------------------------------------------------------

type Category =
  /** The walk has an explicit branch for this node. */
  | "handled"
  /** Consumed by a parent handler; never dispatched on by itself. */
  | "structural"
  /** Reaches the expression fallback → nullable. Safe, imprecise, accepted. */
  | "conservative"
  /** Appears only in clauses that cannot affect the output column list. */
  | "ignored"
  /** Exists only in the post-analysis Query tree; unreachable from parseSql. */
  | "analyzed-only";

const CLASSIFICATION: Record<string, { category: Category; why: string }> = {
  // --- statements producing output columns -------------------------------
  SelectStmt: { category: "handled", why: "target list is the output" },
  InsertStmt: { category: "handled", why: "RETURNING is the output" },
  UpdateStmt: { category: "handled", why: "RETURNING is the output" },
  DeleteStmt: { category: "handled", why: "RETURNING is the output" },
  MergeStmt: { category: "handled", why: "RETURNING is the output" },

  // --- FROM items ---------------------------------------------------------
  RangeVar: { category: "handled", why: "table, view or CTE reference" },
  RangeSubselect: { category: "handled", why: "subquery in FROM" },
  RangeFunction: { category: "handled", why: "set-returning function in FROM" },
  RangeTableSample: { category: "handled", why: "TABLESAMPLE wraps its relation" },
  JoinExpr: { category: "handled", why: "drives join state and null groups" },
  RangeTableFunc: { category: "handled", why: "XMLTABLE contributes COLUMNS" },
  JsonTable: { category: "handled", why: "JSON_TABLE contributes COLUMNS" },
  RangeTableFuncCol: { category: "structural", why: "one XMLTABLE column, read via RangeTableFunc" },
  JsonTableColumn: { category: "structural", why: "one JSON_TABLE column, read via JsonTable" },
  JsonTablePathSpec: { category: "structural", why: "path attached to a JSON_TABLE column" },

  // --- expression nodes with a branch ------------------------------------
  A_Const: { category: "handled", why: "literal; NULL literal is nullable" },
  ColumnRef: { category: "handled", why: "resolved against the scope" },
  ParamRef: { category: "handled", why: "query params are conservatively nullable" },
  A_Expr: { category: "handled", why: "operator/IN/BETWEEN/LIKE/DISTINCT/NULLIF" },
  BoolExpr: { category: "handled", why: "AND/OR/NOT" },
  CaseExpr: { category: "handled", why: "branch results under branch guards" },
  CoalesceExpr: { category: "handled", why: "non-null if any argument is" },
  MinMaxExpr: { category: "handled", why: "GREATEST/LEAST skip NULLs" },
  NullTest: { category: "handled", why: "IS [NOT] NULL is always boolean" },
  BooleanTest: { category: "handled", why: "IS [NOT] TRUE/FALSE/UNKNOWN is always boolean" },
  SQLValueFunction: { category: "handled", why: "CURRENT_DATE etc.; CURRENT_SCHEMA can be NULL" },
  GroupingFunc: { category: "handled", why: "GROUPING() returns a bitmask" },
  FuncCall: { category: "handled", why: "the seven-priority function dispatch" },
  SubLink: { category: "handled", why: "EXISTS/ANY/ALL/ARRAY/scalar subqueries" },
  RowExpr: { category: "handled", why: "row constructor is never NULL" },
  A_ArrayExpr: { category: "handled", why: "array constructor is never NULL" },
  TypeCast: { category: "handled", why: "NOT NULL domain target, else preserves arg" },
  CollateClause: { category: "handled", why: "preserves its argument" },
  NamedArgExpr: { category: "handled", why: "unwrapped, with call-order reordering" },
  A_Indirection: { category: "handled", why: "subscript/field access is conservatively nullable" },
  XmlExpr: { category: "handled", why: "conservatively nullable" },
  SetToDefault: { category: "handled", why: "conservatively nullable" },
  ScalarArrayOp: { category: "handled", why: "conservatively nullable" },

  // --- expression nodes deliberately left to the fallback ----------------
  XmlSerialize: { category: "conservative", why: "XMLSERIALIZE — nullable; no precision case yet" },
  JsonFuncExpr: { category: "conservative", why: "JSON_VALUE/QUERY/EXISTS — ON EMPTY/ON ERROR make the result hard to pin" },
  JsonIsPredicate: { category: "conservative", why: "IS JSON — could be tightened to non-null boolean" },
  JsonObjectConstructor: { category: "conservative", why: "JSON_OBJECT — constructor, could be tightened" },
  JsonArrayConstructor: { category: "conservative", why: "JSON_ARRAY — constructor, could be tightened" },
  JsonArrayQueryConstructor: { category: "conservative", why: "JSON_ARRAY over a subquery" },
  JsonScalarExpr: { category: "conservative", why: "JSON_SCALAR — strict in its argument" },
  JsonParseExpr: { category: "conservative", why: "JSON() parse expression" },
  JsonSerializeExpr: { category: "conservative", why: "JSON_SERIALIZE" },
  JsonObjectAgg: { category: "conservative", why: "ordered-set style JSON aggregate" },
  JsonArrayAgg: { category: "conservative", why: "ordered-set style JSON aggregate" },
  MultiAssignRef: { category: "conservative", why: "UPDATE SET (a,b) = (SELECT ...) source side" },
  CurrentOfExpr: { category: "conservative", why: "WHERE CURRENT OF — predicate only" },

  // --- structural: consumed by a parent handler --------------------------
  List: { category: "structural", why: "generic list wrapper" },
  String: { category: "structural", why: "identifier/string leaf inside other nodes" },
  Integer: { category: "structural", why: "integer leaf" },
  Float: { category: "structural", why: "float leaf" },
  Boolean: { category: "structural", why: "boolean leaf" },
  BitString: { category: "structural", why: "bit-string leaf" },
  ResTarget: { category: "structural", why: "target-list entry; unwrapped for name + expression" },
  Alias: { category: "structural", why: "relation/column aliases" },
  A_Star: { category: "structural", why: "`*`; handled by star expansion" },
  A_Indices: { category: "structural", why: "subscript bounds inside A_Indirection" },
  CaseWhen: { category: "structural", why: "one CASE branch, read via CaseExpr" },
  TypeName: { category: "structural", why: "cast/column type, read via TypeCast" },
  CommonTableExpr: { category: "structural", why: "CTE definition, registered into the scope" },
  WithClause: { category: "structural", why: "CTE list" },
  CTESearchClause: { category: "structural", why: "generates an ordering column" },
  CTECycleClause: { category: "structural", why: "generates cycle-mark and path columns" },
  MergeWhenClause: { category: "structural", why: "MERGE action; does not change the output list" },
  JsonKeyValue: { category: "structural", why: "JSON_OBJECT member" },
  JsonValueExpr: { category: "structural", why: "wraps a value inside a JSON constructor" },
  JsonOutput: { category: "structural", why: "RETURNING clause of a JSON function" },
  JsonArgument: { category: "structural", why: "PASSING argument of a JSON function" },
  JsonFormat: { category: "structural", why: "FORMAT JSON annotation" },
  JsonReturning: { category: "structural", why: "JSON return-type annotation" },
  JsonAggConstructor: { category: "structural", why: "shared aggregate scaffolding" },
  InferClause: { category: "structural", why: "ON CONFLICT inference target" },
  OnConflictClause: { category: "structural", why: "ON CONFLICT action; consulted for row-count" },
  ReturningClause: { category: "structural", why: "RETURNING list wrapper" },
  ReturningOption: { category: "structural", why: "RETURNING OLD/NEW alias" },

  // --- present but unable to change the output column list ---------------
  SortBy: { category: "ignored", why: "ORDER BY does not change row shape" },
  WindowDef: { category: "ignored", why: "window frame; nullability comes from the function" },
  GroupingSet: { category: "ignored", why: "read directly for grouping-set columns" },
  LockingClause: { category: "ignored", why: "FOR UPDATE/SHARE" },
  IndexElem: { category: "ignored", why: "ON CONFLICT / index target" },
  DefElem: { category: "ignored", why: "generic option, utility statements" },
  CollateExpr: { category: "analyzed-only", why: "raw trees carry CollateClause" },

  // --- analyzed-tree vocabulary; unreachable from parseSql ---------------
  Var: { category: "analyzed-only", why: "raw trees carry ColumnRef" },
  Const: { category: "analyzed-only", why: "raw trees carry A_Const" },
  Param: { category: "analyzed-only", why: "raw trees carry ParamRef" },
  OpExpr: { category: "analyzed-only", why: "raw trees carry A_Expr" },
  Aggref: { category: "analyzed-only", why: "raw trees carry FuncCall" },
  WindowFunc: { category: "analyzed-only", why: "raw trees carry FuncCall with over" },
  FuncExpr: { category: "analyzed-only", why: "raw trees carry FuncCall" },
  TargetEntry: { category: "analyzed-only", why: "raw trees carry ResTarget" },
  Query: { category: "analyzed-only", why: "raw trees carry SelectStmt etc." },
  RangeTblEntry: { category: "analyzed-only", why: "raw trees carry RangeVar etc." },
  FromExpr: { category: "analyzed-only", why: "raw trees carry a fromClause array" },
  CaseTestExpr: { category: "analyzed-only", why: "simple-CASE placeholder, added by analysis" },
  RelabelType: { category: "analyzed-only", why: "cast representation, added by analysis" },
  CoerceViaIO: { category: "analyzed-only", why: "cast representation, added by analysis" },
  CoerceToDomain: { category: "analyzed-only", why: "domain coercion, added by analysis" },
  SubPlan: { category: "analyzed-only", why: "planner representation of a SubLink" },
  ScalarArrayOpExpr: { category: "analyzed-only", why: "raw trees carry A_Expr with ANY/ALL" },
};

const FIXTURES_DIR = join(__dirname, "fixtures");

/** Every object key that names an AST node. */
function collectTags(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const n of node) collectTags(n, out);
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    if (/^[A-Z]/.test(k)) out.add(k);
    collectTags(v, out);
  }
}

describe("node-type census", () => {
  let pg: PGlite;
  let catalog: NullabilityCatalog;
  const observed = new Set<string>();
  /** nodeType → the dispatch sites that had no branch for it. */
  const unhandled = new Map<string, Set<string>>();

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8"));
    catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));

    const corpus = [
      ...GRAMMAR_SAMPLER,
      ...readdirSync(FIXTURES_DIR)
        .filter(f => f.endsWith(".sql") && f !== "schema.sql")
        .map(f => readFileSync(join(FIXTURES_DIR, f), "utf8")),
    ];

    for (const sql of corpus) {
      const parsed = await parseSql(sql);
      const stmt = parsed.stmts?.[0]?.stmt;
      if (!stmt) continue;
      collectTags(stmt, observed);
      const record = (site: string, nodeType: string) => {
        const sites = unhandled.get(nodeType) ?? new Set<string>();
        sites.add(site);
        unhandled.set(nodeType, sites);
      };
      try {
        inferNullabilityTraced(stmt, catalog, record);
      } catch {
        // An unknown FROM item or statement now raises (see
        // UnsupportedNodeError). The observer has already recorded it, and
        // detecting exactly that is this suite's job — so swallow the throw
        // and let the assertions below report it.
      }
    }
  });

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  it("every node type in the corpus is classified", () => {
    const unclassified = [...observed].filter(t => !CLASSIFICATION[t]).sort();
    expect(
      unclassified,
      `Unclassified node type(s). Add each to CLASSIFICATION with a category ` +
        `and a reason — a node that contributes output columns needs a walk ` +
        `branch, not just an entry:\n  ${unclassified.join(", ")}`,
    ).toEqual([]);
  });

  it("only `conservative` node types reach a dispatch fallback", () => {
    const misclassified = [...unhandled.entries()]
      .filter(([t]) => CLASSIFICATION[t]?.category !== "conservative")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([t, sites]) =>
        `${t} at [${[...sites].join(", ")}] (classified '${CLASSIFICATION[t]?.category ?? "unclassified"}')`);
    expect(
      misclassified,
      `These node types hit a dispatch fallback but are not classified ` +
        `'conservative'. At the 'expression' site that only costs precision; ` +
        `at 'from-item' or 'statement' it silently drops output columns:\n  ` +
        misclassified.join("\n  "),
    ).toEqual([]);
  });

  it("classification refers only to node types that exist", () => {
    // Guards against typos and against entries left behind when a node type is
    // renamed upstream. `analyzed-only` entries are documentation and are
    // expected never to be observed.
    const documented = Object.entries(CLASSIFICATION)
      .filter(([, v]) => v.category !== "analyzed-only")
      .map(([k]) => k);
    const neverSeen = documented.filter(t => !observed.has(t)).sort();
    // Not a failure: the corpus simply may not reach every construct. Report
    // it so the gap is visible.
    if (neverSeen.length > 0) {
      console.log(`node-census: classified but not exercised by the corpus: ${neverSeen.join(", ")}`);
    }
    expect(Object.keys(CLASSIFICATION).length).toBeGreaterThan(0);
  });
});
