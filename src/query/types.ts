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
