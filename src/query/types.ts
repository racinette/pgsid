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
   * TOTAL_STRICT_OPERATORS set and its documented shadowing blind spot.
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
