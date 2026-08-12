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
   * PG18 `pg_constraint.conenforced` — whether the constraint gates NEW
   * writes, which `validated` alone cannot say: NOT VALID arrives as
   * enforced=true/validated=false and REJECTS a violating insert, NOT
   * ENFORCED as enforced=false and admits it (both measured, pinned in
   * check-constraint-pins). Stored-row reasoning keeps gating on
   * `validated`; mechanism E's input channel gates on this bit. Diff-
   * included via the constraint list, like `validated`.
   */
  enforced: boolean;
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
  /**
   * `pg_constraint.conparentid <> 0` — this row is a CLONE that PostgreSQL
   * created, not a constraint the schema author wrote.
   *
   * A foreign key REFERENCING a partitioned table is recorded once per
   * partition on top of the declared constraint: `sw4_pref.p_id REFERENCES
   * sw4_pp(id)` over two partitions gives three rows, whose `confrelid` is
   * `sw4_pp`, `sw4_pp1` and `sw4_pp2`. The clones exist so a delete on one
   * partition fires the right referential trigger; NONE of them means "every
   * referencing row matches THIS partition" (sweep-4 finding 4).
   *
   * Reading them as declared keys is wrong twice over: the map kept whichever
   * clone came last, which is a claim about one partition that no referencing
   * row need satisfy, and the DECLARED key — the shape anyone actually writes
   * — was overwritten and lost.
   *
   * The wider lesson this is the first instance of: a catalog READ has to ask
   * which rows PostgreSQL added that nobody wrote. Partition clones are one
   * kind; inherited constraints and index-backing rows are the same class.
   */
  inheritedClone: boolean;
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

/**
 * One pg_catalog signature: the declared argument types in order and the
 * declared return type, both as `format_type` renders them.
 */
export interface BuiltinSignature {
  name: string;
  args: string[];
  returns: string;
}

/**
 * One pg_catalog signature for a name the curated claim tables cover,
 * carrying the resolution keys `docs/type-aware-overloads.md` measured
 * ("The three pre-refactor questions, ANSWERED"): per-signature strictness,
 * the call-shape kind, the ordered-set direct/aggregated split, and the
 * variadic parameter type.
 */
export interface BuiltinFunctionSignature extends BuiltinSignature {
  /** `pg_proc.proisstrict` — strictness of THIS signature, not a name consensus. */
  strict: boolean;
  /** `pg_proc.prokind`: 'f' scalar, 'a' aggregate, 'w' window. */
  kind: "f" | "a" | "w";
  /**
   * `pg_aggregate.aggkind` for kind 'a' — 'n' normal, 'o' ordered-set, 'h'
   * hypothetical-set; null otherwise. An ordered-set row's `args` INCLUDE
   * the ORDER BY types, which is what keys `percentile_cont`'s four rows.
   */
  aggKind: "n" | "o" | "h" | null;
  /**
   * `pg_aggregate.aggnumdirectargs` for kind 'a', null otherwise: `args`
   * positions before this index are the WITHIN GROUP call's direct
   * arguments; the rest line up against the ORDER BY expressions.
   */
  numDirectArgs: number | null;
  /**
   * The declared VARIADIC parameter's type as `format_type` renders it —
   * `"any"` (with quotes) for `rank`/`concat`/`format` — or null when the
   * signature is not variadic. A `"any"` variadic admits every argument
   * untouched (measured), so such a candidate is never eliminable by
   * argument type and never an exact match.
   */
  variadic: string | null;
  /**
   * `pg_proc.pronargdefaults` — how many trailing parameters carry
   * defaults. Five claim-table names have them (measured: `jsonb_set`,
   * `jsonb_insert`, `jsonb_strip_nulls`, `normalize`, `make_interval`), so
   * arity elimination without this count would falsely eliminate a row a
   * shorter call still resolves to.
   */
  numArgDefaults: number;
}

/**
 * One implicit cast edge from `pg_cast` (`castcontext = 'i'`) — the fifth
 * clause of the elimination rule in `docs/type-aware-overloads.md`. IMPLICIT
 * only, deliberately: function arguments do not use assignment casts, and
 * PostgreSQL does not chain casts, so this is a direct lookup, never a
 * reachability search.
 */
/** One `pg_cast` row: the pair, and the function that implements it. */
export interface BuiltinCast {
  source: string;
  target: string;
  /** `name(argtype,…)` in format_type spelling, or null for castfunc = 0. */
  func: string | null;
}

export interface ImplicitCastInfo {
  /** Source and target as `format_type` renders them. */
  source: string;
  target: string;
  /**
   * `castmethod = 'b'` — binary-coercible. These 49 edges are ALSO the
   * canonicalisation images tier 1 retries a failed exact-match lookup
   * under (`character varying` has zero operators; `varchar || varchar`
   * resolves through this edge to `text || text`, measured). The graph has
   * two-way edges (`text ↔ varchar`), so canonicalisation tries images —
   * there is no single canonical target.
   */
  binary: boolean;
}

/**
 * One pg_catalog operator row for a symbol the curated operator sets cover —
 * `OperatorInfo`'s shape minus the user-schema fields, plus the result type
 * an exact match threads upward.
 */
export interface BuiltinOperatorSignature {
  name: string;
  /** Operand type names (`format_type`); leftType null for prefix operators. */
  leftType: string | null;
  rightType: string | null;
  returns: string;
  /** `pg_proc.proisstrict` of the backing function. */
  strict: boolean;
}

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
  /**
   * Every CHECK constraint on the domain, rendered by `pg_get_constraintdef`
   * and ordered by constraint name. A domain may carry any number of them
   * (`CREATE DOMAIN twochk AS int CONSTRAINT lo CHECK (VALUE > 0) CONSTRAINT
   * hi CHECK (VALUE < 10)`), so a single entry is a reader assuming one row
   * per declaration — this held one, picked without an ORDER BY, which both
   * hid the others from the diff and made the state depend on catalog row
   * order across a replay.
   */
  checks: string[];
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
  /**
   * `pg_operator.oprresult` rendered — what a resolved call to this
   * operator carries upward as its return-type union member.
   */
  resultType: string;
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

  /**
   * The pg_catalog signatures whose RETURN type is a polymorphic ARRAY, with
   * their declared argument types — the one thing needed to answer what a
   * call to one of them actually yields.
   *
   * `builtinPolymorphicFunctions` says a name is polymorphic, which is enough
   * to REFUSE and not enough to answer. PostgreSQL resolves these from the
   * arguments by a rule that is uniform across all 26 signatures: a result
   * declared `anyarray`/`anycompatiblearray` takes its type from the argument
   * declared with the matching ARRAY pseudo-type, or, where there is none,
   * from the argument declared with the matching ELEMENT pseudo-type plus one
   * array dimension. So `array_agg(anynonarray) → anyarray` over a
   * `sku_pair` column yields `sku_pair[]`, and `array_remove(anycompatiblearray,
   * anycompatible)` over a `sku_pair[]` yields `sku_pair[]` (both measured).
   *
   * Only signatures carrying at least one polymorphic ARGUMENT are captured:
   * the rest — `anyarray_in(cstring)` and friends — declare a polymorphic
   * result the walk could never resolve and are not callable from a query
   * anyway.
   *
   * ENVIRONMENT, not schema, exactly like `builtinStrictFunctions`: it changes
   * with the PostgreSQL version, never with a migration, and stays out of the
   * diff for the same reason.
   */
  builtinPolymorphicArraySignatures: BuiltinSignature[];

  /**
   * Every pg_catalog signature behind a name the engine's curated claim
   * tables cover — the prerequisite capture of
   * `docs/type-aware-overloads.md`. The claim tables key on NAMES while
   * PostgreSQL keys on SIGNATURES, and this is what lets the overload
   * refactor re-key: an exact match finds the row a call resolves to, and
   * each row can carry its own verdict.
   *
   * Scope is deliberately the claim tables, not all of pg_catalog: every
   * other builtin has no totality or strictness verdict to narrow, so its
   * overloads are never consulted. CAPTURED BUT NOT YET READ — nothing in
   * the walk or adapter consults this until that refactor starts.
   *
   * ENVIRONMENT, not schema, exactly like `builtinStrictFunctions`.
   */
  builtinFunctionSignatures: BuiltinFunctionSignature[];
  /**
   * Every pg_catalog row for an operator symbol in `TOTAL_OPERATORS` or
   * `STRICT_OPERATORS` — the 21-names-over-558-rows spread the charter
   * measures, materialised. Same scope rule and same not-yet-read status as
   * `builtinFunctionSignatures`; ENVIRONMENT like it.
   */
  builtinOperatorSignatures: BuiltinOperatorSignature[];
  /**
   * The `pg_cast` implicit rows (117 in PG18), with the binary-coercible
   * flag that marks the canonicalisation edges. See `ImplicitCastInfo`.
   *
   * ENVIRONMENT, not schema, exactly like `builtinStrictFunctions`.
   */
  builtinImplicitCasts: ImplicitCastInfo[];
  /**
   * EVERY `pg_cast` row with the signature of its implementation function,
   * so a `TypeCast` can be answered by the same totality verdicts the
   * function dispatch uses. `func` is null when `castfunc` is 0 — a
   * binary-coercible or I/O-conversion cast, which computes nothing and so
   * cannot invent a NULL.
   *
   * Captured because "a cast preserves its argument's nullability" is
   * FALSE and the walk assumed it: `'infinity'::timestamp::time` and
   * `'null'::jsonb::int4` are both NULL from non-null input, and a cast is
   * a `TypeCast` node that never reaches the builtin function dispatch
   * where every other totality question is answered.
   *
   * ENVIRONMENT, not schema, exactly like `builtinImplicitCasts`.
   */
  builtinCasts: BuiltinCast[];
  /**
   * Every pg_catalog type name → its `pg_type.typtype` ('b' base, 'c'
   * composite, 'p' pseudo, 'r' range, 'm' multirange — pg_catalog holds no
   * enums or domains). The polymorphic predicate of the elimination rule
   * reads it in BOTH directions: `anyrange` admits a type whose kind is
   * 'r', and a type the record KNOWS to be something else is certainly
   * refused — while a name absent here (a user type the user-schema
   * captures do not explain either) keeps the candidate, per the governing
   * invariant.
   *
   * ENVIRONMENT, not schema, exactly like `builtinStrictFunctions`.
   */
  builtinTypeKinds: Record<string, string>;
  /**
   * `pg_type.typname` → the `format_type` rendering, for the 15 pg_catalog
   * types where they differ (`int4` → `integer`, `varchar` → `character
   * varying`, …). The GRAMMAR canonicalises a cast's spelling to the
   * typname — `x::integer` parses with names `[pg_catalog, int4]` — while
   * every signature capture renders `format_type` names, so an exact-match
   * key built from a cast must pass through this map or it matches nothing.
   * Captured rather than curated, for the reason every curated table in
   * this project has eventually demonstrated.
   *
   * ENVIRONMENT, not schema, exactly like `builtinStrictFunctions`.
   */
  builtinTypeNameAliases: Record<string, string>;
  /**
   * pg_catalog base types whose typinput AND typoutput are both IMMUTABLE,
   * by `typname` (the spelling the grammar canonicalises a cast to). The
   * subtree evaluator's closure gates all rest on this set: a value of any
   * other type is session-state-dependent somewhere in its I/O — date_in
   * reads DateStyle, timestamptz_in reads TimeZone, array_in is stable
   * because its elements might (all pinned in param-mechanism.test.ts) —
   * so nothing outside the set may be a closed cast's target, a closed
   * call's argument or return, or a closed operator's operand. Array types
   * are excluded wholesale (array_in), as are domains and enums
   * (domain_in/enum_in are stable, and they are user types anyway).
   *
   * Note that those last exclusions inherit PostgreSQL's reason, which is
   * not this engine's: provolatile also covers CATALOG-state dependence,
   * which the snapshot contract neutralizes. docs/subtree-evaluation.md,
   * "The dependence model, corrected", sorts principled exclusions from
   * first-wave scope and records the widening path.
   *
   * ENVIRONMENT, not schema, exactly like `builtinStrictFunctions`.
   */
  builtinImmutableIoTypes: string[];
  /**
   * `name → argument counts` for pg_catalog functions a closed subtree may
   * invoke: at a listed arity, EVERY row the call could resolve to is a
   * plain scalar function (prokind 'f', no proretset), IMMUTABLE, with
   * immutable-I/O return and parameter types — measured 2026-08-11, the
   * arity axis included because `length` is immutable at one argument and
   * STABLE at two (`length(bytea, name)`).
   *
   * Rows are exempted from the verdict only when unreachable from a closed
   * tree: a parameter whose type is a concrete non-array type outside the
   * immutable-I/O set (no closed subtree produces such a value, and an
   * unknown literal resolves to a string-category candidate or fails —
   * PostgreSQL's resolution never silently crosses type categories), or a
   * range-family polymorphic (`anyrange` and friends: no range type has
   * immutable I/O — range_in is stable — and unknown cannot instantiate a
   * polymorphic range, measured "could not determine polymorphic type").
   * `isfinite`/`date_part` fall out via the first rule, `+`/`-`/`lower`
   * survive the operator/function captures via the second.
   *
   * ENVIRONMENT, not schema, exactly like `builtinStrictFunctions`.
   */
  builtinImmutableFunctionArities: Record<string, number[]>;
  /**
   * pg_catalog operator names a closed subtree may invoke: every REACHABLE
   * row of the name has an immutable backing function and an immutable-I/O
   * result type, under the same two unreachability exemptions as
   * `builtinImmutableFunctionArities` (which is what lets `=` keep its
   * verdict while carrying the STABLE `date = timestamptz` row: no closed
   * subtree can present a date). Names failing on a reachable row stay out
   * whole — `||` really is stable over reachable operands (`textanycat`),
   * and there is no arity axis to save it by.
   *
   * ENVIRONMENT, not schema, exactly like `builtinStrictFunctions`.
   */
  builtinImmutableOperators: string[];
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
