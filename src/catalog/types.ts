// ---------------------------------------------------------------------------
// Catalog snapshot + diff: shared types.
//
// The snapshot is a structured, JSON-serializable representation of every
// schema entity, captured from PG's system catalogs after migrations are
// applied. The diff is a pure function over two snapshots that reports
// added/removed/modified entities at column-level granularity.
//
// Design constraints:
// - JSON-serializable (no Buffers, no Maps, no circular refs) — enables
//   future cache persistence without redesign.
// - EntityId is schema-qualified and column-level, e.g.
//   "public.users.id", "public.users", "public.calculate_total(integer)".
// - Pure data + pure functions: the snapshot is a query result mapped to a
//   typed structure; the diff is a pure function on two snapshots.
// ---------------------------------------------------------------------------

/**
 * A schema-qualified, column-level entity identifier.
 *
 * Examples:
 * - `"public.users"` — a table/view/matview/sequence/composite type.
 * - `"public.users.id"` — a column of `public.users`.
 * - `"public.users_email_check"` — a constraint (named under its table's namespace).
 * - `"public.calculate_total(integer, text)"` — a function (identity arguments).
 * - `"public.active_status"` — an enum or domain.
 * - `"public.users_email_uniq"` — an index.
 * - `"uuid-ossp"` — an extension (globally unique name, no schema qualifier).
 * - `"public"` — a schema.
 */
export type EntityId = string;

// ---------------------------------------------------------------------------
// Tables / columns / constraints
// ---------------------------------------------------------------------------

export interface ColumnInfo {
  name: string;
  typeOid: number;
  /** Canonical type name from `format_type(oid, typmod)`, e.g. "bigint", "text". */
  typeName: string;
  /** Type modifier (`atttypmod`), e.g. length for varchar; -1/null when none. */
  typeMod: number | null;
  notNull: boolean;
  /**
   * `attnotnull` held across the relation's entire inheritance subtree —
   * equal to `notNull` for a childless relation. `FROM p` scans the whole
   * tree, and `ALTER TABLE ONLY p … ADD/SET NOT NULL` is legal (measured),
   * so a child may store the NULL the parent's own flag forbids. A
   * descendant the snapshot cannot see (e.g. a temp child) counts as not
   * carrying the constraint.
   */
  notNullTree: boolean;
  hasDefault: boolean;
  /** Human-readable default expression from `pg_get_expr(adbin, adrelid)`. */
  defaultExpr: string | null;
  /** Generated-column mode: `attgenerated` 's'→stored, 'v'→virtual (PG18), ''→none. */
  generated: "stored" | "virtual" | "none";
  /**
   * Whether any descendant computes this GENERATED column with a different
   * expression. A child may define its OWN generation expression for an
   * inherited column (measured — and it is the only accepted divergence
   * besides CHECK … NO INHERIT), so a tree scan evaluating the parent's
   * formula would describe rows never computed with it. Set when any
   * descendant's (generated, defaultExpr) differs from the parent's, or
   * when a descendant is uncaptured — the notNullTree conventions. Always
   * false for non-generated columns (DEFAULT divergence is legal, common,
   * and never read through a scan) and for childless relations.
   * Diff-comparable on the parent for the same reason notNullTree is.
   */
  generationDivergesInTree: boolean;
  /**
   * `pg_collation.collisdeterministic` of the column's collation; null for
   * non-collatable types. Gates literal DISTINCTNESS in the entailment
   * kernel: under a deterministic collation, differently-spelled text
   * values are provably unequal — under a nondeterministic one they are
   * not, which is why distinctness was banned before this was captured.
   */
  collationDeterministic: boolean | null;
  /** Identity column: `attidentity` 'a'→always, 'd'→byDefault, ''→null. */
  identity: "always" | "byDefault" | null;
}

export type ConstraintType =
  | "primaryKey"
  | "unique"
  | "foreign"
  | "check"
  | "exclusion";

export interface ConstraintInfo {
  name: string;
  type: ConstraintType;
  /** Column names the constraint applies to (from `conkey` attnums, resolved). */
  columns: string[];
  /** For FK constraints: target schema/table/column names; null otherwise. */
  foreignSchema: string | null;
  foreignTable: string | null;
  foreignColumns: string[] | null;
  /** Full definition from `pg_get_constraintdef`. */
  definition: string;
  /**
   * `pg_constraint.convalidated`. False for NOT VALID constraints (existing
   * rows may violate them) and for PG18 NOT ENFORCED constraints (which are
   * never validated) — both measured. The nullability engine consumes only
   * validated CHECK constraints; a VALIDATE CONSTRAINT flips this and is a
   * real schema change, so it participates in the diff.
   */
  validated: boolean;
  /**
   * `pg_constraint.connoinherit`. A `CHECK … NO INHERIT` is never copied to
   * a child's pg_constraint (measured — every other CHECK divergence route
   * is refused by PostgreSQL), so it constrains the named relation's OWN
   * rows only, and a tree scan of a relation with descendants must not
   * read it. Partitioned parents cannot carry one (refused — measured), so
   * partition trees are unaffected. Diff-included via the constraint list:
   * dropping NO INHERIT changes what a tree scan may conclude.
   */
  noInherit: boolean;
  /**
   * `pg_constraint.condeferrable`. A DEFERRABLE constraint can be violated
   * mid-transaction and the violation OBSERVED there: `SET CONSTRAINTS ALL
   * DEFERRED` then an insert with no matching parent, and a LEFT JOIN in the
   * same transaction returns the NULL-extended row (measured, with
   * `INITIALLY IMMEDIATE` — so the gate is on condeferrable, not condeferred).
   * Foreign-key entailment therefore reasons only from non-deferrable keys.
   * Diff-included via the constraint list: `ALTER CONSTRAINT … DEFERRABLE`
   * changes what a join may conclude.
   */
  deferrable: boolean;
}

/**
 * The write-path rewriting hooks on a relation, per command
 * ('insert' | 'update' | 'delete'). RETURNING reports the row AFTER
 * PostgreSQL's rewrite stage: a BEFORE ROW trigger may replace NEW
 * wholesale, an INSTEAD OF trigger's NEW is reported verbatim (the view's
 * own definition expressions are never evaluated — measured, even a
 * literal view column comes back NULL), and a DO INSTEAD rule replaces the
 * statement outright. The nullability walk cannot analyse their bodies, so
 * knowing they EXIST is the fact that keeps its claims honest. DELETE is
 * captured but immune on the trigger side: a returned OLD row is reported
 * as stored, and modifications to it are ignored for both BEFORE and
 * INSTEAD OF triggers (measured).
 */
export interface WriteRewriteInfo {
  /** Commands with a BEFORE ROW trigger, sorted. */
  beforeRow: string[];
  /** Commands with an INSTEAD OF ROW trigger (views), sorted. */
  insteadOf: string[];
  /** Commands with a DO INSTEAD rewrite rule (non-SELECT, is_instead), sorted. */
  insteadRules: string[];
}

export interface TableInfo {
  schema: string;
  name: string;
  /**
   * `pg_class.relkind` within the captured set: 'r' plain, 'p' partitioned,
   * 'f' foreign. The nullability engine needs 'p' specifically: an UPDATE
   * through a partitioned parent can MOVE a row across partitions, which
   * PostgreSQL performs as DELETE + INSERT and which fires the DESTINATION
   * partition's BEFORE INSERT triggers on the new row (measured) — a
   * command crossing plain inheritance never makes, since it does not
   * route. Diff-comparable: the kind cannot change in place, so a flip is
   * a drop-and-recreate the diff should surface.
   */
  relkind: "r" | "p" | "f";
  columns: ColumnInfo[];
  constraints: ConstraintInfo[];
  /** Storage parameters from `reloptions`, parsed into a map (e.g. fillfactor). */
  storageParams: Record<string, string>;
  writeRewrites: WriteRewriteInfo;
  /**
   * The relation-SET answer for the hooks, like `notNullTree` is for the
   * flags: `beforeRow` is the union over the inheritance subtree, because
   * the trigger that rewrites a row is the trigger of the relation the row
   * LIVES in — an INSERT through a partitioned parent fires the PARTITION's
   * BEFORE ROW trigger, and an UPDATE through an inheritance parent fires
   * the CHILD's for child rows (both measured). `insteadOf` and
   * `insteadRules` stay the relation's own: rules attach to the named RTE
   * and do not fire through a parent (measured), and INSTEAD OF triggers
   * live on views, which have no descendants.
   */
  writeRewritesTree: WriteRewriteInfo;
  /**
   * Whether pg_inherits lists any child of this relation (inheritance or
   * partition). What gates the NO INHERIT CHECK reading: with no
   * descendants a tree scan returns the named relation's rows only and
   * every validated CHECK holds; the FIRST child changes that, so the bit
   * is diff-comparable on the parent — like `notNullTree`, which a first
   * child can also flip.
   */
  hasDescendants: boolean;
}

// ---------------------------------------------------------------------------
// Views + materialized views
// ---------------------------------------------------------------------------

export interface ViewInfo {
  schema: string;
  name: string;
  /** Columns resolved from `pg_attribute` (same shape as table columns). */
  columns: ColumnInfo[];
  /** Definition text from `pg_views.definition` / `pg_matviews.definition`. */
  definition: string;
  writeRewrites: WriteRewriteInfo;
}

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

export interface IndexInfo {
  schema: string;
  name: string;
  tableSchema: string;
  tableName: string;
  /** Key column names (from `indkey` attnums, resolved). Empty for pure
   *  expression indexes (indkey contains 0s for expressions). */
  columns: string[];
  unique: boolean;
  primary: boolean;
  /** Partial-index WHERE predicate from `pg_get_expr(indpred, indrelid)`, or null. */
  partial: string | null;
  /** Index access method: btree, gin, gist, brin, hash, spgist, ... */
  method: string;
  /** Full definition from `pg_get_indexdef`. */
  definition: string;
}

// ---------------------------------------------------------------------------
// Functions / procedures
// ---------------------------------------------------------------------------

export type ArgMode = "in" | "out" | "inout" | "variadic" | "table";

export interface FunctionArgInfo {
  name: string;
  typeOid: number;
  /** Canonical type name from `format_type(oid, null)` (loses typmod). */
  typeName: string;
  mode: ArgMode;
  hasDefault: boolean;
  /**
   * The default EXPRESSION as PostgreSQL renders it
   * (`pg_get_function_arg_default`), or null for a parameter without one.
   *
   * A call that omits the parameter is a call that passes this expression:
   * `f(a integer, b integer DEFAULT 7)` invoked as `f(x)` computes its body
   * with `b` = 7, and the walk binds it that way. The expression is arbitrary
   * — `nullif(1, 1)` is a legal default and yields NULL — so it is analysed
   * like any other expression rather than assumed non-null.
   */
  defaultExpr: string | null;
}

export type Volatility = "immutable" | "stable" | "volatile";

export interface FunctionInfo {
  schema: string;
  name: string;
  /** Identity argument types from `pg_get_function_identity_arguments`, e.g. "integer, text". */
  argTypes: string;
  args: FunctionArgInfo[];
  /** Return type from `pg_get_function_result`. */
  returnType: string;
  returnTypeOid: number;
  /**
   * `pg_proc.proretset` — whether a call returns a SET of the return type
   * rather than one value. The rendered `returnType` says the same thing by
   * its `SETOF `/`TABLE(` prefix, which is why the diff's comparable state
   * needs no entry for this; the flag exists so the walk can ask the catalog
   * instead of parsing that rendering (adversarial-3 finding 2).
   */
  returnsSet: boolean;
  language: string;
  isProcedure: boolean;
  isAggregate: boolean;
  /**
   * `pg_aggregate.agginitval` — the aggregate's initial state value, or null
   * for non-aggregates and for aggregates declared without an INITCOND.
   *
   * A non-null INITCOND is what makes an aggregate non-null over zero input
   * rows: with no rows to transition, the initial state *is* the result.
   */
  aggInitVal: string | null;
  isWindow: boolean;
  securityDefiner: boolean;
  strict: boolean;
  volatile: Volatility;
  cost: number;
  rows: number;
  /** Function body (`prosrc`) — for future dependency extraction. */
  body: string;
  /** Full definition from `pg_get_functiondef`. */
  definition: string;
}

// ---------------------------------------------------------------------------
// Enums / domains / composite types / sequences
// ---------------------------------------------------------------------------

export interface EnumInfo {
  schema: string;
  name: string;
  values: string[];
}

export interface DomainInfo {
  schema: string;
  name: string;
  /** The domain's own type OID (pg_type.oid). Used to match FunctionInfo.returnTypeOid. */
  oid: number;
  baseTypeOid: number;
  baseTypeName: string;
  notNull: boolean;
  /** Default expression from `pg_get_expr(typdefaultbin, oid)`, or null. */
  default: string | null;
  /** CHECK constraint expression, or null. */
  check: string | null;
}

export interface CompositeTypeAttrInfo {
  name: string;
  typeOid: number;
  typeName: string;
}

export interface CompositeTypeInfo {
  schema: string;
  name: string;
  attributes: CompositeTypeAttrInfo[];
}

export interface SequenceInfo {
  schema: string;
  name: string;
  typeOid: number;
  typeName: string;
  /** `int8` sequence bounds. PGlite returns these as a JS `number` when the
   *  value fits in `Number.MAX_SAFE_INTEGER` and as `bigint` otherwise (e.g.
   *  the default `seqmax` for a bigint sequence, 2^63-1). */
  start: number | bigint;
  increment: number | bigint;
  min: number | bigint;
  max: number | bigint;
  cache: number | bigint;
  cycle: boolean;
  /** Owned-by column info (for identity / OWNED BY sequences), or null. */
  ownedByTable: string | null;
  ownedByColumn: string | null;
}

// ---------------------------------------------------------------------------
// Extensions + schemas
// ---------------------------------------------------------------------------

export interface ExtensionInfo {
  name: string;
  version: string;
  /** Schema the extension is installed in. */
  schema: string;
}

export interface SchemaInfo {
  name: string;
  owner: string;
}

// ---------------------------------------------------------------------------
// Catalog snapshot
// ---------------------------------------------------------------------------

/**
 * The full schema state, captured from system catalogs. The single source of
 * truth for query typechecking, codegen, selective re-typecheck, and future
 * linting. JSON-serializable for cache persistence.
 */
/**
 * A user-defined operator, captured for the nullability analyses. The
 * load-bearing property is declared, not inferred: an operator wraps a
 * function (`pg_operator.oprcode`) whose strictness is a catalog flag —
 * strict + a TRUE comparison ⇒ non-null operands, which is what the
 * WHERE-side consumers (promotion, parameter narrowing, mechanism-C
 * attribution) need. Output-side totality has no catalog flag, so result
 * nullability goes through the backing function's own dispatch instead.
 */
export interface OperatorInfo {
  schema: string;
  /** The operator's name, e.g. `===`. */
  name: string;
  /** Operand type names (rendered), for the diff identity; null for unary. */
  leftType: string | null;
  rightType: string | null;
  /** The backing function (pg_operator.oprcode). */
  functionSchema: string;
  functionName: string;
  /** pg_proc.proisstrict of the backing function. */
  strict: boolean;
}

export interface CatalogSnapshot {
  tables: TableInfo[];
  views: ViewInfo[];
  materializedViews: ViewInfo[];
  indexes: IndexInfo[];
  functions: FunctionInfo[];
  operators: OperatorInfo[];
  enums: EnumInfo[];
  domains: DomainInfo[];
  compositeTypes: CompositeTypeInfo[];
  sequences: SequenceInfo[];
  extensions: ExtensionInfo[];
  schemas: SchemaInfo[];
  /**
   * pg_catalog function names whose every plain-function overload is STRICT
   * (bool_and over pg_proc.proisstrict, prokind 'f' only). ENVIRONMENT, not
   * schema: it describes the PostgreSQL version, never changes with
   * migrations, and is deliberately absent from the diff's comparable
   * states. Consumed by the strict-expression closures.
   */
  builtinStrictFunctions: string[];
  /**
   * pg_catalog functions with NAMED OUTPUT COLUMNS, keyed by name and
   * rendered as `TABLE(col type, …)` — the same shape a user function's
   * `pg_get_function_result` yields, so the walk's existing return-type
   * expansion consumes it unchanged.
   *
   * The snapshot captures no other pg_catalog function, and this one only
   * because `pg_get_function_result` cannot answer for them: a builtin
   * declared with OUT parameters renders as `SETOF record` (measured), so
   * the shape has to be reassembled from proargnames/proallargtypes. What
   * it buys is the FROM-clause column list — `json_each` has `key` and
   * `value` where the walk's unknown-function guess contributed one column
   * named `json_each`.
   *
   * ENVIRONMENT, not schema, exactly like `builtinStrictFunctions`: a
   * property of the PostgreSQL version, never changed by a migration, and
   * deliberately absent from the diff's comparable states.
   */
  builtinTableFunctions: Record<string, string>;
  /**
   * pg_catalog function names with at least one SET-RETURNING overload
   * (bool_or over pg_proc.proretset, prokind 'f' only).
   *
   * Replaces a hand-curated table of 21 names that missed 50 of PG18's 71
   * non-pg_stat/pg_ls set-returning builtins (adversarial-3 finding 1). The
   * damage a missing name does is not local: the target-list padding rule
   * needs TWO set-returning calls to apply at all, so one unrecognised SRF
   * turned the rule off for the whole list and left a KNOWN call carrying a
   * notNull that PostgreSQL pads away.
   *
   * `bool_or` rather than `bool_and` because the answer only ever adds
   * padding, and padding only ever turns a claim nullable: an overload set
   * that disagrees is safer read as set-returning.
   *
   * ENVIRONMENT, not schema, exactly like `builtinStrictFunctions`.
   */
  builtinSetReturningFunctions: string[];
  /**
   * pg_catalog AGGREGATE names (prokind 'a').
   *
   * Replaces a hand-curated table of 49 names that was wrong in three
   * directions at once, which is what a name table unfalsifiable by
   * construction looks like after enough time: it MISSED 12 of PG18's 54
   * aggregates (`any_value`, `bit_xor`, `range_agg`, the eight
   * `json*_agg_strict`/`_unique` forms), it carried two names PostgreSQL has
   * no function for at all (`cluster`, `listagg`), and it carried five pure
   * WINDOW functions (`row_number`, `lag`, `lead`, `first_value`,
   * `last_value` — prokind 'w'), which can only be called with OVER and are
   * therefore unreachable at every consumer.
   *
   * A missing name is the direction that bites. The strict-scalar gate
   * excludes aggregates by asking this question, so a name it does not
   * recognise proceeds to the strictness test — and an aggregate over zero
   * rows is NULL however strict it is. Nothing was reachable in PG18 only
   * because `builtinStrictFunctions` filters `prokind = 'f'`, so no aggregate
   * name currently reaches it: safety by coincidence of a DIFFERENT table's
   * filter, which is what this capture removes.
   *
   * ENVIRONMENT, not schema, exactly like `builtinStrictFunctions`.
   */
  builtinAggregateFunctions: string[];
  /**
   * Every pg_catalog function name (prokind 'f').
   *
   * The name SET, not their signatures: it answers "does PostgreSQL search
   * a builtin of this name before the user's?", which is the question the
   * engine got backwards (adversarial-3 finding 6 — pg_catalog is searched
   * implicitly and FIRST unless the path names it, so for an identical
   * signature the builtin HIDES a user function of the same name, while
   * every builtin table in the engine is documented the other way round).
   * It also tells the `unnest` element-type resolver that a call is a
   * builtin rather than an unknown symbol.
   *
   * ENVIRONMENT, not schema, exactly like `builtinStrictFunctions`.
   */
  builtinFunctionNames: string[];
  /**
   * pg_catalog function names whose return type is POLYMORPHIC — it
   * renders with `any…` (`anyarray`, `anycompatiblearray`, `anyelement`,
   * `anyrange`), so the actual type comes from the call's arguments.
   *
   * 65 of PG18's 2726 function names, keyed on the `any…` type NAMES. Not
   * `typtype = 'p'`, which is PSEUDO-type and admits `trigger`, `void`,
   * `cstring`, `record` and `internal` — that spelling made this set 572
   * names wide against a comment claiming 68, in the safe direction but
   * silently (found by the catalog-feature census).
   *
   * A builtin whose return type is
   * concrete can never yield an array of a USER composite type, which is
   * what makes the difference between one `unnest` column and the element
   * type's fields; a polymorphic one can (`array_cat` of two `sku_pair[]`
   * does), and the walk simulates no types, so it refuses there.
   *
   * ENVIRONMENT, not schema, exactly like `builtinStrictFunctions`.
   */
  builtinPolymorphicFunctions: string[];
}

// ---------------------------------------------------------------------------
// Schema diff
// ---------------------------------------------------------------------------

export interface SchemaDiffEntry {
  entityId: EntityId;
  /** Previous entity state (the comparable subset, JSON-serializable). */
  old: unknown;
  /** New entity state (the comparable subset, JSON-serializable). */
  new: unknown;
}

export interface SchemaDiff {
  added: EntityId[];
  removed: EntityId[];
  modified: SchemaDiffEntry[];
}
