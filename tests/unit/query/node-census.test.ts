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

interface Classification {
  category: Category;
  why: string;
  /**
   * PostgreSQL declares this node as a concrete struct field rather than a
   * `Node *` — `Alias *alias`, `WithClause *withClause`, `TypeName *typeName` —
   * and libpg-query only tags a field it serialises through the generic Node
   * path. An inlined field is emitted as a bare object (`"alias": {"aliasname":
   * "p"}`), so the node type never appears as a key however the SQL is written.
   * The value leaves are the same story from the other direction: `Boolean`,
   * `Float` and `BitString` live inside `A_Const` as `boolval`/`fval`/`bsval`.
   *
   * Marking them is what separates "the corpus does not reach this yet" from
   * "no corpus can reach this", and both halves are asserted below.
   */
  inlined?: true;
}

const CLASSIFICATION: Record<string, Classification> = {
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
  RangeTableSample: { category: "handled", why: "TABLESAMPLE wraps its relation, and MARKS it sampled — the alias no longer stands for the whole table, so it is never a key's side and never preserved (sweep-4 finding 3)" },
  JoinExpr: { category: "handled", why: "drives join state and null groups" },
  RangeTableFunc: { category: "handled", why: "XMLTABLE contributes COLUMNS" },
  JsonTable: { category: "handled", why: "JSON_TABLE contributes COLUMNS; a NESTED PATH is an outer join against the level above it, so FOR ORDINALITY inside one is nullable (sweep-4 finding 5)" },
  RangeTableFuncCol: { category: "structural", why: "one XMLTABLE column, read via RangeTableFunc" },
  JsonTableColumn: { category: "structural", why: "one JSON_TABLE column, read via JsonTable" },
  ColumnDef: { category: "structural", why: "one coldeflist column, read via RangeFunction" },
  JsonTablePathSpec: { category: "structural", why: "path attached to a JSON_TABLE column", inlined: true },

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
  MergeSupportFunc: {
    category: "handled",
    why: "merge_action() names the arm a returned row came from — INSERT, UPDATE or DELETE, measured across all three including NOT MATCHED BY SOURCE — and PostgreSQL allows it only in a MERGE RETURNING list, so it always has an arm to name",
  },
  FuncCall: { category: "handled", why: "the seven-priority function dispatch" },
  SubLink: { category: "handled", why: "EXISTS/ANY/ALL/ARRAY/scalar subqueries" },
  RowExpr: { category: "handled", why: "row constructor is never NULL" },
  A_ArrayExpr: { category: "handled", why: "array constructor is never NULL" },
  TypeCast: {
    category: "handled",
    why: "NOT NULL domain target, else the CAST's own totality — resolved through pg_cast to the implementation function's verdict. It does NOT simply preserve its argument, which is what this entry said until the cast finding: `'infinity'::timestamp::time` and `'null'::jsonb::int4` are NULL from non-null input",
  },
  CollateClause: { category: "handled", why: "preserves its argument" },
  NamedArgExpr: { category: "handled", why: "unwrapped, with call-order reordering" },
  A_Indirection: { category: "handled", why: "subscript/field access is conservatively nullable" },
  XmlExpr: { category: "handled", why: "conservatively nullable" },
  SetToDefault: { category: "handled", why: "conservatively nullable" },

  // --- expression nodes deliberately left to the fallback ----------------
  XmlSerialize: {
    category: "handled",
    why: "strict: XMLSERIALIZE of a NULL is NULL and of a value is text — measured through CONTENT, DOCUMENT and INDENT alike",
  },
  JsonFuncExpr: {
    category: "handled",
    why: "JSON_EXISTS over a non-null context is a plain boolean (ON ERROR defaults FALSE); JSON_VALUE/QUERY map a found JSON null to SQL NULL through every handler, so they stay nullable",
  },
  JsonIsPredicate: {
    category: "handled",
    why: "strict, NOT an always-non-null boolean: `NULL IS JSON` is NULL rather than false (measured, IS NOT JSON and the type-qualified forms too), while a non-null operand always gives a boolean",
  },
  JsonObjectConstructor: {
    category: "handled",
    why: "always a container: a NULL member becomes a JSON null or is dropped — measured through ABSENT/NULL ON NULL, WITH UNIQUE KEYS and every RETURNING type — so the constructor itself is never NULL",
  },
  JsonArrayConstructor: {
    category: "handled",
    why: "always a container, for the same measured reasons as JSON_OBJECT: `JSON_ARRAY(NULL)` is `[]` and `JSON_ARRAY()` is `[]`",
  },
  JsonArrayQueryConstructor: {
    category: "conservative",
    why: "JSON_ARRAY over a SUBQUERY, which is NULL over zero rows rather than `[]` (measured) — the container guarantee the two value-list constructors carry does not extend to it",
  },
  JsonScalarExpr: {
    category: "handled",
    why: "strict in its argument: JSON_SCALAR(NULL) is NULL, a non-null argument is a value (measured)",
  },
  JsonParseExpr: {
    category: "handled",
    why: "strict in its argument: JSON(NULL) is NULL; a malformed non-null argument RAISES rather than yielding NULL",
  },
  JsonSerializeExpr: {
    category: "handled",
    why: "strict in its argument: JSON_SERIALIZE(NULL) is NULL, through RETURNING too (measured)",
  },
  JsonObjectAgg: {
    category: "conservative",
    why: "an aggregate: NULL over zero input rows (measured), and the non-empty-group rule is keyed on the curated aggregate NAME sets, which a syntactic JSON_OBJECTAGG never reaches",
  },
  JsonArrayAgg: {
    category: "conservative",
    why: "an aggregate: NULL over zero input rows (measured), same as JSON_OBJECTAGG",
  },
  MultiAssignRef: {
    category: "structural",
    why: "the source of `SET (a, b) = (SELECT …)`; the written-value map recognises and SKIPS it at all three DML sites, so those columns keep their catalog flag and it is never dispatched as an expression",
  },
  CurrentOfExpr: {
    category: "ignored",
    why: "WHERE CURRENT OF is a cursor predicate: it contributes no output value and promotes nothing, so no dispatch ever reaches it",
  },

  // --- structural: consumed by a parent handler --------------------------
  List: { category: "structural", why: "generic list wrapper" },
  String: { category: "structural", why: "identifier/string leaf inside other nodes" },
  Integer: { category: "structural", why: "integer leaf" },
  Float: { category: "structural", why: "float leaf, inlined into A_Const as fval", inlined: true },
  Boolean: { category: "structural", why: "boolean leaf, inlined into A_Const as boolval", inlined: true },
  BitString: { category: "structural", why: "bit-string leaf, inlined into A_Const as bsval", inlined: true },
  ResTarget: { category: "structural", why: "target-list entry; unwrapped for name + expression" },
  Alias: { category: "structural", why: "relation/column aliases", inlined: true },
  A_Star: { category: "structural", why: "`*`; handled by star expansion" },
  A_Indices: { category: "structural", why: "subscript bounds inside A_Indirection" },
  CaseWhen: { category: "structural", why: "one CASE branch, read via CaseExpr" },
  TypeName: { category: "structural", why: "cast/column type, read via TypeCast", inlined: true },
  CommonTableExpr: { category: "structural", why: "CTE definition, registered into the scope" },
  WithClause: { category: "structural", why: "CTE list", inlined: true },
  CTESearchClause: { category: "structural", why: "generates an ordering column", inlined: true },
  CTECycleClause: { category: "structural", why: "generates cycle-mark and path columns", inlined: true },
  MergeWhenClause: { category: "structural", why: "MERGE action; does not change the output list" },
  JsonKeyValue: { category: "structural", why: "JSON_OBJECT member" },
  JsonValueExpr: { category: "structural", why: "wraps a value inside a JSON constructor" },
  JsonOutput: { category: "structural", why: "RETURNING clause of a JSON function", inlined: true },
  JsonArgument: { category: "structural", why: "PASSING argument of a JSON function" },
  JsonFormat: { category: "structural", why: "FORMAT JSON annotation", inlined: true },
  JsonReturning: { category: "structural", why: "JSON return-type annotation", inlined: true },
  JsonAggConstructor: { category: "structural", why: "shared aggregate scaffolding", inlined: true },
  InferClause: { category: "structural", why: "ON CONFLICT inference target", inlined: true },
  OnConflictClause: { category: "structural", why: "ON CONFLICT action; consulted for row-count", inlined: true },
  ReturningClause: { category: "structural", why: "RETURNING list wrapper", inlined: true },
  ReturningOption: { category: "structural", why: "RETURNING OLD/NEW alias" },

  // --- present but unable to change the output column list ---------------
  SortBy: { category: "ignored", why: "ORDER BY does not change row shape" },
  WindowDef: { category: "ignored", why: "window frame; nullability comes from the function" },
  GroupingSet: { category: "ignored", why: "read directly for grouping-set columns" },
  LockingClause: { category: "ignored", why: "FOR UPDATE/SHARE" },
  IndexElem: { category: "ignored", why: "ON CONFLICT / index target" },
  DefElem: { category: "ignored", why: "generic option, utility statements", inlined: true },
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

  it("every `conservative` node type actually reaches a fallback", () => {
    // The converse of the assertion above, and the one whose absence let
    // eight entries drift: a node classified `conservative` that the walk in
    // fact HANDLES is a reason nobody can falsify. The label then reads as an
    // open imprecision — work that looks outstanding and is already done —
    // which is how the fixture suite treats a stale `@unwitnessable`: a
    // reason on a claim that IS witnessed fails as loudly as a missing one.
    const handledAfterAll = Object.entries(CLASSIFICATION)
      .filter(([t, v]) => v.category === "conservative" && observed.has(t) && !unhandled.has(t))
      .map(([t, v]) => `${t} — classified conservative, never reached a fallback (${v.why})`)
      .sort();
    expect(
      handledAfterAll,
      `These node types are classified 'conservative' but the walk answers ` +
        `for them — reclassify as 'handled' with what the branch concludes, ` +
        `or as 'ignored' if they cannot reach an output value at all:\n  ` +
        handledAfterAll.join("\n  "),
    ).toEqual([]);
  });

  it("every node type the corpus can reach is reached", () => {
    // The complement of the first assertion. That one catches a node type
    // nobody classified; this one catches a classification nobody tested —
    // an entry asserting a category for a construct the corpus never produces
    // is an untested claim, and `handled` in particular claims a walk branch
    // that may not exist.
    //
    // A name that is not a node type at all fails here too, since nothing can
    // ever observe it.
    const reachable = Object.entries(CLASSIFICATION)
      .filter(([, v]) => v.category !== "analyzed-only" && !v.inlined)
      .map(([k]) => k);
    const unreached = reachable.filter(t => !observed.has(t)).sort();
    expect(
      unreached,
      `Classified but never produced by the corpus. Either add SQL to ` +
        `grammar-sampler.ts that produces the node, or — if PostgreSQL declares ` +
        `it as a concrete struct field rather than a \`Node *\`, so libpg-query ` +
        `inlines it untagged — mark the entry \`inlined: true\`. A name that is ` +
        `not a node type at all belongs in neither category and should be ` +
        `deleted:\n  ${unreached.join(", ")}`,
    ).toEqual([]);
  });

  it("nothing marked `inlined` ever appears as a tagged node", () => {
    // The other side of that marker. `inlined` is a claim about how
    // libpg-query serialises the tree, and a libpg-query upgrade could change
    // it — at which point the node becomes observable and its classification
    // becomes testable, so the marker has to come off.
    const tagged = Object.entries(CLASSIFICATION)
      .filter(([k, v]) => v.inlined && observed.has(k))
      .map(([k]) => k)
      .sort();
    expect(
      tagged,
      `Marked \`inlined\` but observed as a tagged node. libpg-query now ` +
        `serialises these through the generic Node path; drop the marker so ` +
        `the corpus has to keep reaching them:\n  ${tagged.join(", ")}`,
    ).toEqual([]);
  });
});
