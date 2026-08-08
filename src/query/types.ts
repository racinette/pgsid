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
export type {
  BuiltinFunctionSignature,
  BuiltinOperatorSignature,
} from "../catalog/types.js";

// Import types needed for the NullabilityCatalog interface.
import type {
  BuiltinFunctionSignature,
  BuiltinOperatorSignature,
  FunctionInfo,
} from "../catalog/types.js";
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
   * EVERY function of this name the call could resolve to — name-level, no
   * arg types. If `schema` is undefined, all schemas of the search path
   * contribute (an identical signature in a later one is hidden). Empty
   * when the name is unknown.
   *
   * Plural because a dependency is not a resolution: an unqualified call
   * with candidates in two schemas depends on BOTH, since dropping,
   * replacing or retyping either changes what may be inferred. Reporting
   * one would leave the query unregistered against the other and silently
   * skip its recheck.
   */
  resolveFunctions(schema: string | undefined, name: string): ResolvedFunction[];
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
 * What the walk needs to know about a resolved custom operator name. With
 * several candidates, `strict` is their CONSENSUS — true only when every
 * candidate's backing function is declared strict, which holds whichever
 * overload PostgreSQL picks. The backing-function identity is present only
 * when the name resolves to exactly ONE candidate: output-side dispatch
 * analyses a specific body, and bodies differ across overloads.
 */
export interface OperatorMetadata {
  strict: boolean;
  functionSchema?: string;
  functionName?: string;
}

/**
 * Members of the adapter's product that belong to `DepCatalog` ALONE — the
 * walk cannot call them, so a coverage census must not expect them to be
 * exercised by queries. `satisfies` keeps every name a real DepCatalog key;
 * a new dep-only member that nobody adds here shows up as an unexercised
 * capability, which is the failure that asks for it.
 */
export const DEP_CATALOG_ONLY = ["resolveFunctions"] as const satisfies readonly (keyof DepCatalog)[];

/**
 * The catalog face of the type-aware overload refactor
 * (`docs/type-aware-overloads.md`) — candidate signatures and the
 * elimination rule's coercibility questions. A SEPARATE face, deliberately:
 * no walk branch consults these yet, so they must not sit on
 * `NullabilityCatalog`, whose census demands a fixture reaching every
 * member. When the walk starts threading argument types, each member it
 * consults MOVES onto `NullabilityCatalog` and off `OVERLOAD_CATALOG_ONLY`,
 * and the census then demands its coverage — the boundary is the
 * enforcement, exactly as with `DepCatalog`.
 */
export interface OverloadCatalog {
  /**
   * The pg_catalog signatures behind a claim-table function name — empty
   * for a qualified reference to any other schema, and for names outside
   * the claim tables (which have no verdict to narrow). Tier 1 resolves a
   * call to ONE of these rows; `docs/type-aware-overloads.md` has the rules.
   */
  resolveBuiltinFunctionSignatures(
    schema: string | undefined,
    name: string,
  ): BuiltinFunctionSignature[];

  /**
   * The pg_catalog rows behind a curated operator symbol — the builtin half
   * of the merged candidate set the answered shadowing question requires
   * (path-visible user operators are the other half).
   */
  resolveBuiltinOperatorSignatures(
    schema: string | undefined,
    name: string,
  ): BuiltinOperatorSignature[];

  /**
   * The rendered type name with domains recursively resolved to their bases
   * (`public.dint2` → `public.dint` → `integer`; array element domains
   * likewise). Measured caveat (overload-resolution-mechanism.test.ts):
   * this is the FALLBACK key — exact match tries the DECLARED name first,
   * because a candidate declared on the domain type wins.
   */
  resolveCanonicalTypeName(typeName: string): string;

  /**
   * Whether an argument of `fromType` could be accepted at a parameter of
   * `toType` by PostgreSQL's implicit coercion — FALSE only on certainty,
   * which is what licenses eliminating a candidate; any type this catalog
   * cannot fully explain answers true and keeps it (the governing
   * invariant of docs/type-aware-overloads.md). Implements the five-clause
   * elimination rule: identity, the polymorphic predicate, domain bases,
   * array element recursion, and the captured pg_cast implicit rows.
   */
  mayCoerceImplicitly(fromType: string, toType: string): boolean;

  /**
   * Targets of implicit BINARY-coercible casts from this type — the images
   * a failed exact-match lookup retries under (`character varying` has zero
   * operators; the `text` image is where `varchar || varchar` resolves).
   */
  resolveBinaryCoercionTargets(typeName: string): string[];
}

/**
 * Members of the adapter's product that belong to `OverloadCatalog` ALONE —
 * same contract as `DEP_CATALOG_ONLY`: the walk cannot call them, the
 * censuses must not expect query coverage of them, and `satisfies` keeps
 * every name a real key. Moving a member into the walk's reach means
 * removing it here, which is what makes the move visible.
 */
export const OVERLOAD_CATALOG_ONLY = [
  "resolveBuiltinFunctionSignatures",
  "resolveBuiltinOperatorSignatures",
  "resolveCanonicalTypeName",
  "mayCoerceImplicitly",
  "resolveBinaryCoercionTargets",
] as const satisfies readonly (keyof OverloadCatalog)[];

/**
 * The richer catalog the nullability walk needs, and ONLY what it needs: name
 * resolution (`resolveTable`, shared with `DepCatalog`) plus intrinsic column
 * nullability, function metadata for FuncCall dispatch, and domain metadata
 * for NOT NULL domain returns. Built from a `CatalogSnapshot` (or mocked in
 * tests); the walk is a pure function over `(AST, catalog)` — no PGlite.
 *
 * `DepCatalog` is the other consumer's face and one adapter builds both from
 * one snapshot, but the two lists are not the same list. A member kept here
 * that only dependency extraction calls made the walk's surface unmeasurable:
 * `catalog-census.test.ts` records which members the corpus asks, and one no
 * nullability question can reach reads as an untested branch forever.
 */
export interface NullabilityCatalog {
  /**
   * Resolve a table/view by (schema, name) via search_path.
   * If `schema` is undefined, search each schema in the search path in order.
   * Returns null if not found.
   */
  resolveTable(schema: string | undefined, name: string): ResolvedTable | null;

  /**
   * Every candidate for this name, UNFILTERED by arity — empty when the
   * name is unknown to the catalog (or hidden by a pg_catalog function of
   * the same name; see `functionReturnsSet`).
   *
   * For a FROM item the question is the column LIST, and that question is
   * answerable without resolving the overload whenever every candidate
   * agrees: whichever one PostgreSQL picks, the shape is the same. Arity
   * filtering can only narrow the set, so it is worth trying only when the
   * full set disagrees — which is why this accessor exists beside
   * `resolveFunctionCandidates`, whose variadic refusal would otherwise
   * block a shape that needed no narrowing at all.
   *
   * The whole `FunctionInfo` rather than its rendered return type, because
   * the rendering is lossy: a function declared with OUT parameters renders
   * `SETOF record` and its column list lives in the argument array.
   */
  resolveFunctionShapes(schema: string | undefined, name: string): FunctionInfo[];

  /**
   * Whether a call of this name returns a SET, by CONSENSUS over every
   * candidate — null when the user catalog does not know the name.
   *
   * Asked of the whole candidate set, not of the single-candidate shortcut:
   * an OVERLOADED user SETOF function was invisible to the target-list
   * padding rule while staying perfectly visible to the notNull rule, which
   * reads the same overloads' return types by consensus (adversarial-3
   * finding 2). Set-returningness is a property every candidate normally
   * shares, and where they disagree the answer is `some` rather than
   * `every`: the padding rule only ever turns claims nullable, so
   * over-reporting costs precision and under-reporting is the bug.
   */
  functionReturnsSet(schema: string | undefined, name: string): boolean | null;

  /**
   * Whether `name` has a set-returning overload in pg_catalog — the
   * snapshot's measured replacement for a hand-curated name table that
   * missed 50 of PG18's 71 non-pg_stat/pg_ls SRFs (adversarial-3 finding 1).
   */
  isSetReturningBuiltin(name: string): boolean;

  /**
   * Whether `name` is a pg_catalog AGGREGATE (prokind 'a') — the snapshot's
   * measured replacement for a curated table that missed 12 of PG18's 54
   * aggregates while carrying two non-functions and five pure window
   * functions. Consulted only where the user catalog has no metadata for the
   * name, like every builtin question.
   */
  isAggregateBuiltin(name: string): boolean;

  /**
   * The FROM-position shape of a pg_catalog function with named output
   * columns, as `TABLE(col type, …)`, or null. Consulted only where the
   * user catalog has no candidate for the name — a user function of the
   * same name wins, as with every builtin table.
   *
   * The walk's fallback for an unknown function in FROM is ONE column named
   * after the function, which is correct for `generate_series` and wrong
   * for every builtin with named output columns: `json_each` has `key` and
   * `value`, and `jsonb_array_elements` has one column named `value` — the
   * guess's own arity with a different name.
   */
  resolveBuiltinFunctionShape(schema: string | undefined, name: string): string | null;

  /**
   * Intrinsic column nullability: whether `schema.table.column` has a NOT NULL
   * constraint in the catalog (pg_attribute.attnotnull). This is the column's
   * nullability *before* join structure and WHERE guarantees are considered —
   * and it is the NAMED relation's flag, which is the right question only for
   * a scan that stays there (`FROM ONLY p`, an INSERT target).
   */
  resolveColumnNotNull(schema: string, table: string, column: string): boolean;

  /**
   * The relation-SET answer: attnotnull held across the relation's entire
   * inheritance subtree. `FROM p` scans the whole tree, and a child may lack
   * the parent's constraint (`ALTER TABLE ONLY p … SET NOT NULL` is legal —
   * measured), so a tree scan may rely only on this conjunction. Equal to
   * `resolveColumnNotNull` for a childless relation.
   */
  resolveColumnNotNullTree(schema: string, table: string, column: string): boolean;

  /**
   * The write-path rewriting hooks on `schema.table`, as command sets
   * ('insert' | 'update' | 'delete'). RETURNING reports the row AFTER the
   * rewrite stage — a BEFORE ROW trigger may replace NEW wholesale, an
   * INSTEAD OF trigger's NEW is reported verbatim with the view definition
   * never evaluated, and a DO INSTEAD rule replaces the statement outright
   * (all measured) — so the walk voids the corresponding reasoning where one
   * of these exists. Empty sets for an unknown relation.
   */
  resolveWriteRewrites(
    schema: string | undefined,
    table: string,
  ): { beforeRow: ReadonlySet<string>; insteadOf: ReadonlySet<string>; insteadRules: ReadonlySet<string> };

  /**
   * The relation-SET hooks: `beforeRow` unioned over the inheritance
   * subtree, because the trigger that rewrites a row is the trigger of the
   * relation the row LIVES in — an INSERT through a partitioned parent
   * fires the PARTITION's BEFORE ROW trigger, an UPDATE through an
   * inheritance parent fires the CHILD's for child rows (both measured).
   * Rules and INSTEAD OF triggers stay the relation's own (rules attach to
   * the named RTE — measured; INSTEAD OF lives on views, which have no
   * descendants). Equal to `resolveWriteRewrites` for a childless relation.
   */
  resolveWriteRewritesTree(
    schema: string | undefined,
    table: string,
  ): { beforeRow: ReadonlySet<string>; insteadOf: ReadonlySet<string>; insteadRules: ReadonlySet<string> };

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
   * The declared type of `schema.table.column` as `format_type` renders it
   * (e.g. "text", "character varying(20)", "timestamp with time zone").
   *
   * Consumed by the CHECK-constraint entailment kernel's literal matching:
   * `pg_get_constraintdef` annotates literals with an explicit cast to the
   * type the comparison resolved at (`'housed'::text`) while the user's WHERE
   * carries the bare literal, and equating the two is only sound when the
   * cast target IS the column's own type — an explicit cast to a different
   * type selects a different comparison operator (the citext/name collation
   * hazard), so it must refuse to match.
   */
  resolveColumnTypeName(schema: string, table: string, column: string): string | null;

  /**
   * Whether unequal literal TOKENS provably denote unequal VALUES for
   * comparisons against `schema.table.column` — the collation-gated
   * relaxation of the distinctness ban. True only for builtin text-family
   * columns (by OID whitelist; citext's case-folding lives in its operator
   * and never qualifies) whose collation the snapshot proved deterministic.
   * Numerics never qualify: 75 and 75.0 are distinct tokens, equal values.
   */
  resolveLiteralDistinctnessSound(schema: string, table: string, column: string): boolean;

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
   * Overloaded names, the sound half: the candidates a call with `argCount`
   * arguments could resolve to (arity-filtered — PostgreSQL only picks one
   * that accepts that many). Consumers take CONSENSUS: a property every
   * candidate shares holds whichever one runs. Null for unknown names,
   * variadic candidates, or anything else that defeats positional
   * reasoning; empty for a known name no candidate matches at this arity.
   */
  resolveFunctionCandidates(
    schema: string | undefined,
    name: string,
    argCount: number,
  ): FunctionInfo[] | null;

  /**
   * Custom operator metadata (for A_Expr dispatch), by the proven
   * single-candidate policy: exactly one user operator with this name (and
   * schema, when the reference is qualified) or null — operand types are
   * not available to the walk, so with overloads guessing is never correct.
   * Builtin operator names are NOT here; they keep the curated
   * curated operator sets and their documented shadowing blind spot.
   */
  resolveOperatorMetadata(schema: string | undefined, name: string): OperatorMetadata | null;

  /**
   * Whether every pg_catalog plain-function overload of `name` is declared
   * STRICT — from the snapshot's environment capture, the source of truth
   * the strict-expression closures consult for builtin names the user
   * catalog does not carry.
   */
  isStrictBuiltin(name: string): boolean;

  /**
   * The pre-parsed generation expression of `schema.table.column` (GENERATED
   * ALWAYS AS ... STORED/VIRTUAL), or null. An expression over the table's
   * own columns — cycle-free and immutable by PostgreSQL's rules — walked at
   * the reading site to upgrade the catalog's (always-false) notNull flag.
   */
  resolveGenerationExpr(schema: string, table: string, column: string): Node | null;

  /**
   * The relation-SET reading of the generation expression: null whenever
   * any descendant computes the column with a DIFFERENT expression (a child
   * may redefine an inherited column's generation — measured, the only
   * accepted divergence besides CHECK … NO INHERIT), since a tree scan
   * would otherwise evaluate a formula the row it reads was never computed
   * with. Equal to `resolveGenerationExpr` for childless relations.
   */
  resolveGenerationExprTree(schema: string, table: string, column: string): Node | null;

  /**
   * Pre-parsed expressions of the VALIDATED table CHECK constraints on
   * `schema.table` (empty array when there are none). Every stored row of the
   * table satisfies each expression in the not-FALSE sense: PostgreSQL
   * accepts a row whose CHECK evaluates NULL — measured, and pinned in
   * `check-null-passes` — so these are notFALSE facts, never TRUE facts.
   * NOT VALID and NOT ENFORCED constraints (convalidated=false covers both)
   * are excluded at build time; inherited/partition copies carry their own
   * pg_constraint rows per relation, so the actual relation's list is
   * complete — for the relation's OWN rows. A `CHECK … NO INHERIT` is in
   * this list (a `FROM ONLY` scan may read it) but NOT in the tree
   * variant's. Domain CHECKs are a different mechanism and are not here.
   */
  resolveCheckConstraints(schema: string, table: string): Node[];

  /**
   * The relation-SET reading of the same list: the validated CHECKs every
   * row a TREE scan can return is known to satisfy. Differs from
   * `resolveCheckConstraints` exactly when the relation has descendants and
   * carries a `CHECK … NO INHERIT`, which is never copied to a child
   * (measured — and the only CHECK divergence route PostgreSQL permits), so
   * no child row ever satisfied it. Partitioned parents cannot carry one
   * (refused), so partition trees resolve identically through both.
   */
  resolveCheckConstraintsTree(schema: string, table: string): Node[];

  /**
   * The single-column FOREIGN KEY on `column`, as {schema, table, column} of
   * what it references — or null when there is none the engine may reason
   * from. "A join on a NOT NULL foreign key always matches" needs a key
   * PostgreSQL enforces over every row the scan reads, so the adapter drops
   * NOT VALID and NOT ENFORCED keys (both leave `convalidated` false),
   * DEFERRABLE ones (violable and observable mid-transaction), and composite
   * ones. The Tree variant additionally drops a key whose relation has
   * DESCENDANTS: a parent's FK is not copied to a child, so a tree scan reads
   * rows nothing checked. All measured; see the adapter for the probes.
   */
  resolveForeignKey(
    schema: string,
    table: string,
    column: string,
  ): { schema: string; table: string; column: string } | null;
  resolveForeignKeyTree(
    schema: string,
    table: string,
    column: string,
  ): { schema: string; table: string; column: string } | null;

  /**
   * Whether `schema.table` is a partitioned table (relkind 'p'). What makes
   * an UPDATE's hook question two-command: row movement across partitions
   * is DELETE + INSERT and fires the DESTINATION partition's BEFORE INSERT
   * triggers (measured), so an UPDATE on a partitioned target must ask
   * `beforeRow ∩ {update, insert}`. Plain inheritance never routes and
   * keeps the per-command question. False for views and unknown relations.
   */
  resolveIsPartitioned(schema: string | undefined, table: string): boolean;

  /**
   * Domain metadata: whether the type identified by `typeOid` is a domain with
   * a NOT NULL constraint. Used for the priority-1 function dispatch rule
   * (a function returning a NOT NULL domain is guaranteed non-null).
   */
  isNotNullDomain(typeOid: number): boolean;

  /**
   * Domain metadata by name: whether `schema.typeName` is a domain with a
   * NOT NULL constraint. Used for TypeCast targets — the AST carries the
   * type name, not the OID. If `schema` is undefined, searches each schema
   * in the search path in order.
   */
  isNotNullDomainByName(schema: string | undefined, typeName: string): boolean;

  /**
   * The rendered BASE type of a domain (`format_type` of `typbasetype`), or
   * null when the name is not a domain. A domain over `sku_pair[]` renders
   * `public.sku_pair[]`, which is how the `unnest` element-type resolver
   * sees through a domain that hides its array-ness behind its own name
   * (adversarial-3 finding 3).
   */
  resolveDomainBaseTypeName(schema: string | undefined, typeName: string): string | null;

  /**
   * Whether `name` is a pg_catalog function name. PostgreSQL searches
   * pg_catalog implicitly and FIRST unless the path names it, so a builtin
   * of the same name HIDES a user function with the same signature
   * (adversarial-3 finding 6, measured both directions).
   */
  isBuiltinFunction(name: string): boolean;

  /**
   * Whether a pg_catalog function of this name has a POLYMORPHIC return
   * type, so what it actually yields depends on its arguments. The walk
   * simulates no types, so this is where "a builtin's return type cannot be
   * an array of a user composite" stops being true.
   */
  isPolymorphicBuiltin(name: string): boolean;

  /**
   * The pg_catalog signatures of `name` whose return type is a polymorphic
   * ARRAY, or null when the name has none (or is qualified to another
   * schema). Each carries the declared argument types in order and the
   * declared return type.
   *
   * `isPolymorphicBuiltin` says a call's type comes from its arguments, which
   * is enough to refuse. This says HOW: a result declared
   * `anyarray`/`anycompatiblearray` takes its type from the argument declared
   * with the matching array pseudo-type, or from the one declared with the
   * matching element pseudo-type plus a dimension.
   */
  resolvePolymorphicArraySignatures(
    schema: string | undefined,
    name: string,
  ): { args: string[]; returns: string }[] | null;

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
   * Pre-parsed ASTs of ARGUMENT DEFAULT expressions, keyed by the full
   * signature `"schema.name(argTypes)"` — one entry per argument position,
   * null where that parameter has no default. A name with no defaulted
   * parameter at all is absent.
   *
   * A call that omits a defaulted parameter passes this expression, and the
   * walk binds it in that parameter's place before descending into the body.
   * The expression is WALKED like any other: `DEFAULT 7` is non-null,
   * `DEFAULT nullif(1, 1)` is not, and a default the walk cannot read leaves
   * the parameter nullable.
   *
   * Keyed by signature rather than by `schema.name`: a default belongs to one
   * overload, and the sites that consult it (the strict rule and the body
   * inliner) hold a resolved `FunctionInfo` that names its own signature.
   */
  fnArgDefaultAsts: Map<string, (Node | null)[]>;

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
/**
 * Provenance of an output column that is a bare, untransformed pass-through
 * of a base table column — what lets CHECK entailment run at a *referencing*
 * scope (`WITH g AS (SELECT * FROM guest) SELECT … FROM g WHERE status =
 * 'housed'`): the outer filter and the base table's constraints meet again
 * after the scope boundary would otherwise have erased the connection.
 *
 * `rowPath` is the row-identity: the chain of relation-instance ids the
 * value passed through, outermost reference first. Two sibling columns are
 * facts about the SAME base row exactly when their rowPaths are equal —
 * a flat table id is not enough (`FROM g g1, g g2` pairs different rows of
 * the same memoized analysis; each re-export prepends its own instance, so
 * the paths diverge). Origin is produced only for REQUIRED instances and
 * dies at any transforming expression, USING/NATURAL merge, set operation,
 * grouping, VALUES, and DML RETURNING — the walk doc's origin section is
 * the rule list.
 */
export interface ColumnOrigin {
  rowPath: number[];
  schema: string;
  table: string;
  column: string;
  /**
   * The instance chain crosses an OPTIONAL (outer-joined) slice, so the
   * base row may be absent: entailment at a referencing scope must first
   * prove presence from EVIDENCE alone — some same-rowPath column pinned
   * non-null (a NULL-extended slice has every pass-through NULL, so any
   * pinned sibling certifies the row) — before any CHECK may speak.
   */
  optional?: boolean;
  /**
   * The null-extension units the chain crosses, one entry per optional
   * slice: `depth` locates the scope (index into `rowPath`, 0 = the
   * outermost reference; shared crossings sit at equal depths), `unit`
   * is that scope's null-group id. Present exactly when `optional` is.
   * Extension is ATOMIC per unit, so a column pinned non-null certifies
   * presence for every origin whose crossings it COVERS — same unit at
   * the same depth under an equal rowPath prefix — which is how a pinned
   * u.val proves a sibling t.id present across tables (same unit) and
   * across nesting (a child unit's presence implies every enclosing
   * unit's).
   */
  units?: { depth: number; unit: number }[];
}

export interface OutputNullability {
  name: string;
  notNull: boolean;
  /**
   * Provenance ALTERNATIVES, present only for pass-through columns. A
   * single-branch scope yields a singleton; a UNION concatenates each
   * branch's SLOTS positionally — one slot per branch, always, so an
   * output row's true origin is `origins[k]` for the one branch k it came
   * from, and that k is the SAME across sibling columns: co-derivation
   * matches siblings index by index and entailment must prove EVERY k. A
   * branch that cannot attribute the column (a literal, an expression)
   * contributes an explicit NULL slot rather than voiding the list — the
   * gap keeps sibling alignment representable while `originNotNull`
   * records whether that branch's own flat analysis already settles the
   * column. INTERSECT and EXCEPT rows are left-branch rows and keep the
   * left slots.
   */
  origins?: (ColumnOrigin | null)[];
  /**
   * Per-alternative branch settledness, aligned with `origins`:
   * `originNotNull[k]` is branch k's own FLAT notNull verdict for this
   * column. Consulted by goal-level entailment exactly where a slot is
   * NULL — a literal branch has no origin story, but its value being
   * provably non-null settles that alternative without one. Produced at
   * set-operation combines and carried through bare re-export.
   */
  originNotNull?: boolean[];
}

/**
 * A set of output columns NULL-extended *together* — the contract-surface
 * export of the walk's null-group model (`RelationEntry.nullGroup`): an
 * outer join extends its optional side as a unit, so on every emitted row
 * either the unit's row was present or every member column is NULL.
 *
 * `discriminants` are the members additionally proven non-null ON THE
 * PRESENT ARM (by the same machinery that would prove them notNull were
 * the join inner — catalog constraint, generated expression, CHECK
 * entailment), so for them NULL holds if and only if the unit was absent.
 * Members outside `discriminants` are nullable even when present and
 * assert only the one direction: absent ⇒ NULL.
 *
 * Both lists are ascending output-column indices, positional against
 * RowDescription like `OutputNullability` itself. A group is emitted only
 * when it says something a flat per-column list cannot: ≥ 2 members and
 * ≥ 1 discriminant. A unit whose extension is refiltered away (promotion,
 * strict quals — the presence fixpoint) emits no group: its absent arm
 * does not survive to the output.
 */
export interface OutputPresenceGroup {
  columns: number[];
  discriminants: number[];
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
