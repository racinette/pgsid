// ---------------------------------------------------------------------------
// Query resolver: types for dependency extraction and join nullability.
//
// Three separable concerns (see DESIGN.md "Query type inference"):
// 1. extractDeps — pure function, AST + DepCatalog → EntityId[]
// 2. inferJoinNullability — pure function, AST only → per-alias nullability
// 3. PREPARE — runtime, PGlite → output column types + param types
//
// This file defines the types for #1 and #2. #3 is runtime (SchemaBuilder).
// ---------------------------------------------------------------------------

// Re-export EntityId from catalog types for convenience.
export type { EntityId } from "../catalog/types.js";

// Re-export FunctionInfo for the NullabilityCatalog interface.
export type { FunctionInfo } from "../catalog/types.js";

// Import types needed for the NullabilityCatalog interface.
import type { FunctionInfo } from "../catalog/types.js";
import type { Node } from "libpg-query";

/**
 * A table/view resolved by the catalog — the minimal information needed for
 * dependency extraction. No types, no nullability — just identity + column
 * names (for ColumnRef resolution and SELECT * expansion).
 */
export interface ResolvedTable {
  schema: string;
  name: string;
  /** Column names of the table/view. Used to resolve unqualified ColumnRefs
   *  (which table owns this column?) and to expand `SELECT *`. */
  columns: string[];
}

/**
 * A function resolved by the catalog — name-level only. No overload
 * resolution: if multiple overloads exist, any one is returned (the caller
 * depends on the name, not the specific overload).
 */
export interface ResolvedFunction {
  schema: string;
  name: string;
}

/**
 * Minimal catalog interface for dependency extraction. Name resolution only —
 * no types, no nullability, no constraints. Built from a `CatalogSnapshot`
 * (or mocked in tests).
 *
 * `searchPath` is passed separately to `extractDeps`, not stored here —
 * the same catalog can serve queries with different search_path settings.
 */
export interface DepCatalog {
  /**
   * Resolve a table/view by (schema, name) via search_path.
   * If `schema` is undefined, search each schema in `searchPath` in order.
   * Returns null if not found.
   */
  resolveTable(schema: string | undefined, name: string): ResolvedTable | null;

  /**
   * Resolve a function by (schema, name). Name-level only — no arg types.
   * If `schema` is undefined, search `searchPath`.
   * Returns null if not found by that name in any schema.
   */
  resolveFunction(schema: string | undefined, name: string): ResolvedFunction | null;
}

/**
 * Per-table-alias join nullability result. For each alias in the FROM clause,
 * whether it's on the optional side of a LEFT/RIGHT/FULL outer join (structurally
 * nullable). The codegen layer merges this with the catalog's intrinsic
 * column nullability:
 *
 *   outputNotNull = !joinNullable(alias) && catalog.notNull(column)
 */
export interface AliasNullability {
  alias: string;
  joinNullable: boolean;
}

// ---------------------------------------------------------------------------
// Nullability walk types
// ---------------------------------------------------------------------------

/**
 * The richer catalog the nullability walk needs: name resolution (same as
 * `DepCatalog`) plus intrinsic column nullability, function metadata (for
 * FuncCall dispatch), and domain metadata (for NOT NULL domain returns).
 *
 * Built from a `CatalogSnapshot` (or mocked in tests). The walk is a pure
 * function over `(AST, catalog)` — no PGlite needed.
 */
export interface NullabilityCatalog {
  /**
   * Resolve a table/view by (schema, name) via search_path.
   * If `schema` is undefined, search each schema in the search path in order.
   * Returns null if not found.
   */
  resolveTable(schema: string | undefined, name: string): ResolvedTable | null;

  /**
   * Resolve a function by (schema, name). Name-level only — no arg types.
   */
  resolveFunction(schema: string | undefined, name: string): ResolvedFunction | null;

  /**
   * Intrinsic column nullability: whether `schema.table.column` has a NOT NULL
   * constraint in the catalog (pg_attribute.attnotnull). This is the column's
   * nullability *before* join structure and WHERE guarantees are considered.
   */
  resolveColumnNotNull(schema: string, table: string, column: string): boolean;

  /**
   * The declared type OID of `schema.table.column`, or null if unknown.
   *
   * Needed where a column's NOT NULL *constraint* does not travel but its
   * *type* does — notably a `SETOF <table>` function result, which carries the
   * table's row type without any of its constraints. A domain's NOT NULL is
   * part of the type and is still enforced there, so the type OID is the only
   * thing left to ask about.
   */
  resolveColumnTypeOid(schema: string, table: string, column: string): number | null;

  /**
   * Fields of a standalone composite type (`CREATE TYPE ... AS (...)`), or
   * null if the name is not one.
   *
   * A composite is the element type of `RETURNS SETOF <composite>`, where it
   * expands to its fields exactly as a table row type does. Composites are not
   * relations, so they are deliberately absent from `resolveTable` — a
   * separate lookup keeps `FROM some_type` from resolving as a table.
   */
  resolveCompositeType(
    schema: string | undefined,
    name: string,
  ): { fields: { name: string; typeOid: number }[] } | null;

  /**
   * Function metadata (for FuncCall dispatch).
   *
   * Resolves by (schema, name) only — arg types are NOT available to the walk
   * (they come from PREPARE, which the walk does not run). If the catalog has
   * exactly one FunctionInfo for this (schema, name), return it. If multiple
   * overloads exist, return null — the walk treats it as an unknown function
   * (conservative nullable, with `count` as the hardcoded exception). This is
   * correct because we cannot determine which overload is being called without
   * arg types, and guessing is never correct.
   */
  resolveFunctionMetadata(schema: string | undefined, name: string): FunctionInfo | null;

  /**
   * Domain metadata: whether the type identified by `typeOid` is a domain with
   * a NOT NULL constraint. Used for the priority-1 function dispatch rule
   * (a function returning a NOT NULL domain is guaranteed non-null).
   */
  isNotNullDomain(typeOid: number): boolean;

  /**
   * Domain metadata by name: whether `schema.typeName` is a domain with a
   * NOT NULL constraint. Used for TypeCast targets — the AST carries the
   * type name, not the OID. If `schema` is undefined, searches the search
   * path (currently just `public`).
   */
  isNotNullDomainByName(schema: string | undefined, typeName: string): boolean;

  /**
   * Pre-parsed ASTs of `LANGUAGE sql` function bodies, keyed by
   * `"schema.name"`. The value is the last statement's AST node (the
   * statement whose output expression is the function's return value).
   *
   * The walk uses this to recurse into `LANGUAGE sql` function bodies
   * synchronously. The caller (pipeline) pre-parses bodies when building
   * the catalog. If a function's body isn't in this map, the walk treats
   * it as conservative nullable.
   *
   * For `BEGIN ATOMIC ... END` style bodies (PG 14+), the caller extracts
   * the last statement from the sql_body before storing it here.
   */
  fnBodyAsts: Map<string, Node>;

  /**
   * Pre-parsed ASTs of view and materialized-view definitions, keyed by
   * `"schema.name"`.
   *
   * PostgreSQL does not propagate `attnotnull` to view columns — every column
   * of a view reads as nullable in `pg_attribute`, regardless of the base
   * columns behind it. Reading the catalog flag alone would therefore make
   * every view column nullable. Instead the walk analyzes the stored
   * definition like a subquery and maps its output columns positionally onto
   * the view's column list.
   *
   * A view whose definition isn't in this map falls back to the catalog flag
   * (conservative nullable).
   */
  viewAsts: Map<string, Node>;
}

/**
 * Per-output-column nullability result. `notNull` is true when the column is
 * provably non-null; false when it could be null (conservative).
 *
 * The result is a **positional** array: entry `i` describes output column `i`,
 * matching the order of PostgreSQL's RowDescription. Column names are not keys
 * — PostgreSQL permits duplicates (`SELECT a.id, b.id` yields two columns named
 * "id") and rejects any *reference* to an ambiguous name, so a name-keyed map
 * would silently lose columns.
 *
 * `name` is therefore best-effort **diagnostic** metadata, not authoritative.
 * It is empty for expressions whose name we do not infer; PostgreSQL's own
 * labelling rules (`FigureColname`) are not reimplemented here. A consumer that
 * needs names should take them from PREPARE's RowDescription, which it must
 * consult anyway for types — and should verify the two lists agree in length
 * before zipping them.
 */
export interface OutputNullability {
  name: string;
  notNull: boolean;
}

// ---------------------------------------------------------------------------
// Nullability trace tree — explains why a column is nullable or non-null.
// ---------------------------------------------------------------------------

/**
 * A single fact that contributed to a nullability decision.
 * Example: `{ name: "catalog.notNull", value: "true" }`
 */
export interface TraceFact {
  name: string;
  value: string;
}

/**
 * A node in the nullability decision tree. Each node represents one
 * expression or column resolution, recording the facts considered, the
 * final decision, and the reason (which fact was decisive). Children
 * represent sub-decisions (e.g. args of a COALESCE, inner scope of a CTE).
 */
export interface TraceNode {
  /** Human-readable label (e.g. "ColumnRef: o.id", "CoalesceExpr", "FuncCall: lower_strict"). */
  label: string;
  /** The facts considered at this decision point. */
  facts: TraceFact[];
  /** The final nullability decision: true = non-null, false = nullable. */
  decision: boolean;
  /** Why this decision was reached (the decisive factor). */
  reason: string;
  /** Sub-decisions that fed into this one. */
  children: TraceNode[];
}

/**
 * Per-output-column result with an optional trace tree explaining the
 * decision. The trace is present when `inferNullabilityTraced` is used;
 * absent (or `trace` is undefined) for the plain `inferNullability` call.
 */
export interface OutputNullabilityTraced {
  name: string;
  notNull: boolean;
  trace?: TraceNode;
}
