import type { Node } from "libpg-query";
import type { FunctionInfo } from "../catalog/types.js";
import { splitQualifiedName } from "../catalog/qualified-name.js";
import { checkConstraintsProveNotNull } from "./check-entailment.js";
import { TOTAL_OPERATORS as TOTAL_OPERATOR_NAMES, STRICT_OPERATORS } from "./operators.js";
import {
  collectParamFacts,
  forcedNullParams,
  type ParamNullability,
} from "./param-nullability.js";
import type {
  ColumnOrigin,
  NullabilityCatalog,
  OutputNullability,
  OutputNullabilityTraced,
  OutputPresenceGroup,
  ResolvedTable,
  TraceNode,
} from "./types.js";

export type { ParamNullability } from "./param-nullability.js";
export type { OutputPresenceGroup } from "./types.js";

// ---------------------------------------------------------------------------
// inferNullability: pure function — AST + NullabilityCatalog → OutputNullability[]
//
// A single leaf-first recursive walk per output column. See
// docs/nullability-walk.md for the full design specification.
//
// The walk is fully synchronous. LANGUAGE sql function body ASTs are
// pre-parsed by the caller and supplied via NullabilityCatalog.fnBodyAsts.
//
// Recursion depth is bounded by the JS engine's call stack. The walk follows
// the natural shape of the AST and function bodies; pathological depth is
// prevented by cycle detection on CTE/subquery memoization and on LANGUAGE
// sql function body recursion.
// ---------------------------------------------------------------------------

const MAX_DEPTH = 200;

export function inferNullability(
  stmt: Node,
  catalog: NullabilityCatalog,
  options?: { paramTypes?: readonly string[] },
): OutputNullability[] {
  const engine = new NullabilityEngine(catalog, false, undefined, options?.paramTypes);
  return engine.run(stmt);
}

/**
 * Both halves of a statement's contract: what comes out (per output column)
 * and what may go in (per parameter). See docs/argument-nullability.md.
 */
export interface QueryContract {
  outputs: OutputNullability[];
  params: ParamNullability[];
  /**
   * Minimal joint rejection sets, each of size ≥ 2: binding NULL to EVERY
   * member raises — `COALESCE($1, $2)` into a NOT NULL column claims
   * `[[1, 2]]`. Singleton rejections are `params[i].notNull`, and by
   * minimality a notNull parameter never appears in a set, so each
   * parameter is in exactly one of three states: unconditionally required,
   * conditionally required (the condition spelled by its sets — at least
   * one other member of each must be bound non-NULL), or unconstrained. A
   * type emitter renders each set as one local union over its members,
   * intersected with the flat per-parameter types; consumers that ignore
   * this field get exactly the old (sound, incomplete) flat contract.
   */
  paramRejectionSets: number[][];
  /**
   * The output-side joint vocabulary, mirroring `paramRejectionSets`: sets
   * of output columns NULL-extended together by an outer join, with the
   * members whose NULL is equivalent to the unit's absence marked as
   * discriminants (see `OutputPresenceGroup`). Groups propagate: a
   * subquery/CTE/view reference lifts its inner analysis's groups through
   * the bare projection, and set operations combine their branches'
   * (INTERSECT/EXCEPT keep the left arm's, UNION keeps branch agreement)
   * — the walk doc's "Presence groups" section is the rule list. A type
   * emitter renders each group as one local union (present arm / all-NULL
   * arm) intersected with the flat row type; consumers that ignore this
   * field get exactly the flat per-column contract.
   */
  outputPresenceGroups: OutputPresenceGroup[];
}

/**
 * The full contract of one statement, from one call over one AST — the two
 * arrays can never describe different statements. Throws
 * `UnsupportedNodeError` exactly when `inferNullability` does; the parameter
 * side alone is total, and available separately via
 * `collectParamNullability` for callers that handle refused statements.
 */
export function inferQueryContract(
  stmt: Node,
  catalog: NullabilityCatalog,
  options?: { paramTypes?: readonly string[] },
): QueryContract {
  const facts = collectParamFacts(stmt, catalog);
  const engine = new NullabilityEngine(catalog, false, undefined, options?.paramTypes);
  return {
    outputs: engine.run(stmt),
    params: facts.params,
    paramRejectionSets: facts.rejectionSets,
    outputPresenceGroups: engine.presenceGroups(),
  };
}

/**
 * The presence groups alone, from either entry point. The traced and
 * untraced walks share the scope builders and the assembly recording, so
 * the two must agree — the parity test in nullability-walk-traced.test.ts
 * holds it, which is why the traced form exists at all.
 */
export function inferPresenceGroups(
  stmt: Node,
  catalog: NullabilityCatalog,
  traced = false,
): OutputPresenceGroup[] {
  const engine = new NullabilityEngine(catalog, traced);
  if (traced) engine.runTraced(stmt);
  else engine.run(stmt);
  return engine.presenceGroups();
}

/**
 * Traced variant of inferNullability. Returns the same per-column results,
 * but each result includes a `trace` tree explaining *why* the nullability
 * decision was reached — every fact considered, the decisive reason, and
 * sub-decisions for child expressions.
 */
export function inferNullabilityTraced(
  stmt: Node,
  catalog: NullabilityCatalog,
  onUnhandled?: UnhandledNodeObserver,
  options?: { paramTypes?: readonly string[] },
): OutputNullabilityTraced[] {
  const engine = new NullabilityEngine(catalog, true, onUnhandled, options?.paramTypes);
  return engine.runTraced(stmt);
}

/**
 * Notified whenever the walk meets a node type it has no branch for.
 *
 * There are three dispatch sites and they fail differently. An unrecognised
 * *expression* degrades to nullable — safe. An unrecognised *FROM item* or
 * *statement* silently contributes nothing, which produces the wrong output
 * column list. Reporting all three through one channel is what lets the
 * node-census test tell a considered fallback from an unconsidered one.
 */
export type UnhandledNodeObserver = (
  site: "expression" | "from-item" | "statement",
  nodeType: string,
) => void;

/**
 * Thrown when the walk meets a construct it has no branch for *and* silence
 * would corrupt the result rather than merely blunt it.
 *
 * The three dispatch sites fail differently, so only two of them raise:
 *
 * - An unrecognised **expression** is contained. Whatever it is, it occupies
 *   exactly one target-list entry, so the column list is still right and the
 *   column is reported nullable. Safe; no exception.
 * - An unrecognised **FROM item** contributes no columns, so `SELECT *`
 *   silently loses them.
 * - An unrecognised **statement** yields no columns at all.
 *
 * The last two shift every subsequent column, which makes a positional
 * nullability array actively wrong rather than pessimistic — and wrong in a
 * way that reads as authoritative. Since the caller holds PostgreSQL's own
 * RowDescription (it runs PREPARE for types), it always has a correct escape:
 * catch this and treat every column as nullable.
 */
export class UnsupportedNodeError extends Error {
  constructor(
    readonly site: "from-item" | "statement" | "composite-star",
    readonly nodeType: string,
  ) {
    super(
      `Nullability analysis does not support the ${site} node type '${nodeType}'. ` +
        `Unlike an unknown expression, this changes the output column list, so ` +
        `the result would be misaligned rather than merely conservative. ` +
        `Treat every column of this statement as nullable.`,
    );
    this.name = "UnsupportedNodeError";
  }
}

// ---------------------------------------------------------------------------
// TraceNode builder — a mutable helper that collects facts and children
// during the walk, then freezes into a TraceNode. When tracing is disabled,
// a NoopTrace is used that makes every method a no-op (zero cost).
// ---------------------------------------------------------------------------

interface ITrace {
  addFact(name: string, value: string): void;
  addChild(label: string): ITrace;
  conclude(decision: boolean, reason: string): void;
  readonly node: TraceNode | undefined;
}

class RealTrace implements ITrace {
  private readonly _node: TraceNode;
  constructor(label: string) {
    this._node = { label, facts: [], decision: false, reason: "", children: [] };
  }
  addFact(name: string, value: string): void {
    this._node.facts.push({ name, value });
  }
  addChild(label: string): ITrace {
    const child = new RealTrace(label);
    this._node.children.push(child.node!);
    return child;
  }
  conclude(decision: boolean, reason: string): void {
    this._node.decision = decision;
    this._node.reason = reason;
  }
  get node(): TraceNode | undefined { return this._node; }
}

class NoopTrace implements ITrace {
  addFact(): void {}
  addChild(): ITrace { return NOOP; }
  conclude(): void {}
  get node(): TraceNode | undefined { return undefined; }
}

const NOOP = new NoopTrace();

// ---------------------------------------------------------------------------
// Join nullability state (three-state per the design spec).
// ---------------------------------------------------------------------------

const REQUIRED = 0;
const OPTIONAL = 1;
const NOT_FOUND = 2;

type JoinState = typeof REQUIRED | typeof OPTIONAL | typeof NOT_FOUND;

function joinStateName(s: JoinState): string {
  return s === REQUIRED ? "REQUIRED" : s === OPTIONAL ? "OPTIONAL" : "NOT_FOUND";
}

// ---------------------------------------------------------------------------
// Address book entry for a relation in a scope.
// ---------------------------------------------------------------------------

type RelationKind = "table" | "view" | "subquery" | "cte" | "values" | "function";

interface RelationEntry {
  alias: string;
  kind: RelationKind;
  /** The AST node for subquery/CTE/VALUES, so we can recurse into it. */
  ast?: Node;
  /** For tables/views: the resolved table (schema + name + columns). */
  table?: ResolvedTable;
  /**
   * Whether this table reference scans the inheritance tree (`FROM p`) or
   * the named relation alone (`FROM ONLY p`, an INSERT target). Decides
   * which catalog flag a column read may rely on — see entryColumnNotNull.
   * Absent means tree, the conservative side.
   */
  scanInh?: boolean;
  /**
   * Whether this reference is a `TABLESAMPLE` of the relation rather than the
   * relation (sweep-4 finding 3). The walk unwraps `RangeTableSample` and
   * registers what is underneath, so without this flag the alias stands for a
   * table whose rows the statement is not actually reading — and every fact
   * keyed on "the STORED rows of this relation" over-reads. `BERNOULLI (0)`
   * keeps none of them.
   *
   * Where finding 2 is a row-dropper the walk cannot SEE, this is one it does
   * not MODEL, so the flag is the modelling: a sampled relation is never a
   * key's side and is never preserved.
   */
  sampled?: boolean;
  /**
   * A FROM item's alias COLUMN LIST — `FROM refunds_archive AS r(c0, c1, c2)`.
   *
   * The names the relation ANSWERS TO, positionally, which is not the same
   * question as what the catalog calls its columns. `table.columns` stays the
   * CATALOG names, because every catalog lookup behind this entry
   * (`entryColumnNotNull`, generation expressions, type OIDs, foreign keys,
   * check constraints) is keyed by them; this list is what a reference must
   * match and what star expansion must emit. PostgreSQL allows a PARTIAL list,
   * where the columns past its end keep their own names, so it is not
   * necessarily as long as `table.columns`.
   *
   * Absent when the item carries no list, which is the ordinary case and the
   * one where both questions have the same answer.
   */
  columnAliases?: string[];
  /** For CTEs: the column names (from aliascolnames or inferred). */
  cteColumns?: string[];
  /**
   * Columns a CTE's SEARCH / CYCLE clause appends to its output. They appear
   * in neither branch's target list, so they must be added after analyzing the
   * CTE query.
   */
  extraColumns?: OutputNullability[];
  /** For VALUES: the rows (valuesLists from SelectStmt). */
  valuesRows?: Node[];
  /** For table functions: the whole RangeFunction node (needs `ordinality`). */
  rangeFunction?: RangeFunction;
  /** Memoized column list for a table function — see resolveTableFunctionColumns. */
  functionColumns?: { name: string; notNull: boolean }[];
  /** Join nullability state. */
  joinState: JoinState;
  /**
   * Engine-unique id of this relation reference, the building block of
   * origin rowPaths (see ColumnOrigin in types.ts). Two references to the
   * same memoized CTE share its inner analysis — and its inner instance
   * ids — so row identity lives in the chain of REFERENCE instances, each
   * re-export prepending its own.
   */
  instance: number;
  /**
   * Identifier of the set of relations that are NULL-extended *together*.
   *
   * An outer join NULL-extends its optional side as a unit: in
   * `(a JOIN b) LEFT JOIN c`, either both `a` and `b` are present or the whole
   * composite row is absent — they can never be half-NULL. So proving one
   * member's row exists proves it for every member of the group.
   *
   * Relations joined by INNER JOIN inherit the enclosing group; each optional
   * side of an outer join starts a fresh one.
   */
  nullGroup: number;
  /**
   * The CHAIN of null-extension units enclosing this entry, outermost
   * first — every optional slice whose absence NULL-extends this entry's
   * columns. Empty for an entry no outer join can extend. `nullGroup` is
   * the innermost element when the entry is OPTIONAL. Origins carry this
   * chain out through re-exports (ColumnOrigin.units), which is what lets
   * a pinned column certify presence for a DIFFERENT table: extension is
   * atomic per unit, so any pinned member of a unit proves every member's
   * slice present, and a pinned child-unit column proves every enclosing
   * unit present.
   */
  unitChain: number[];
}

/**
 * One column visible in a scope.
 *
 * Either produced by a single relation, or merged from both sides of a
 * USING/NATURAL join — in which case it is a distinct column from either
 * constituent and has its own nullability rule.
 */
interface VisibleColumn {
  name: string;
  /** Producing relation; null for a merged column. */
  entry: RelationEntry | null;
  /** Set only for a USING/NATURAL merged column. */
  merged: MergedColumn | null;
}

/**
 * A column merged by USING or NATURAL. Every row of the join supplies it from
 * whichever side is present, so it is drawn from the left when the left is
 * there and the right otherwise — which makes it strictly less nullable than
 * either constituent in a FULL join.
 */
interface MergedColumn {
  left: RelationEntry;
  right: RelationEntry;
  jointype: string;
}

/** The shared shape of the unary SQL/JSON and XML conversion nodes. */
interface JsonUnaryShape {
  expr?: unknown;
}

/**
 * One JoinExpr of a scope's FROM tree, flattened for the presence fixpoint:
 * the qual plus the alias names registered while walking each side (the
 * whole subtree, not just immediate children — null-extension applies to a
 * side as a unit).
 */
interface JoinPredicate {
  jointype: string;
  /**
   * The join's qual, or NULL for a join that has none — a CROSS JOIN, a
   * comma join, a NATURAL join sharing no column name, a USING join whose
   * merged name has no concrete owning entry.
   *
   * A qual-less join used to be absent from `scope.joins` entirely, which was
   * right for the ONE reader this array was built for and wrong for the three
   * that arrived later (sweep-4 finding 2). The fixpoint wants the QUAL; the
   * subtree readings want the join's TYPE and its two alias sets, and those
   * exist with or without one — so a side containing a CROSS JOIN read as a
   * leaf that drops nothing, and a key was entailed across a side that had
   * been emptied. Everything structural is recorded now, and the fixpoint
   * skips the entries with nothing to imply.
   */
  quals: Node | null;
  leftAliases: string[];
  rightAliases: string[];
  /**
   * The joinState this JoinExpr was entered with. REQUIRED means no ancestor
   * join can null-extend this join's slice — for an INNER join that alone
   * proves its qual held for every emitted row, even when every relation
   * inside it is optional ((t FULL u) INNER (v FULL ck): nothing is present,
   * yet every row passed the inner qual).
   */
  incomingRequired: boolean;
  /**
   * The null-group THIS join assigned to each side it made optional, absent
   * for a side it did not. Foreign-key entailment needs to tell "optional
   * because of this join" from "optional because of a deeper one": the key
   * constrains the referencing relation's STORED rows, so a side already
   * NULL-extended when it arrives here carries rows the key never saw.
   */
  leftOptionalGroup?: number;
  rightOptionalGroup?: number;
}

/**
 * The shape the subtree readings need of a join: which relations lie on each
 * side, and which side its type NULL-extends. `JoinPredicate` satisfies it,
 * and so does the flattened form of a subquery's own FROM tree — the two
 * readings are about join structure and nothing else.
 */
interface JoinSides {
  jointype: string;
  leftAliases: string[];
  rightAliases: string[];
}

/**
 * A relation named directly enough to ask the catalog about its keys: the
 * table it resolves to, and whether the reference scans the inheritance TREE
 * or only the relation's own rows — the split every per-column catalog fact
 * takes.
 */
interface KeyedRelation {
  schema: string;
  name: string;
  scansTree: boolean;
}

/** One join of a scalar subquery's FROM, as `subqueryFromTree` reads it. */
interface SubqueryJoin extends JoinSides {
  quals: Node;
}

/** One relation of a scalar subquery's FROM, as `subqueryFromTree` reads it. */
interface SubqueryRelation extends KeyedRelation {
  alias: string;
  schemaname?: string;
  relname: string;
  /**
   * The relation's alias COLUMN LIST, if it carries one. The subquery paths
   * work on this reduced structure rather than on a `RelationEntry`, so
   * without the list here a rename inside a correlated subquery reaches
   * nothing — the key is recorded in `pg_constraint` under catalog names and
   * the WHERE is written in the query's.
   */
  columnAliases?: string[];
  /** The resolved catalog column order, for translating through that list. */
  catalogColumns?: readonly string[];
}

// ---------------------------------------------------------------------------
// Scope: the address book for one SELECT level.
// ---------------------------------------------------------------------------

interface Scope {
  /** alias → entry */
  aliases: Map<string, RelationEntry>;
  /**
   * The scope's output columns, in order — what `SELECT *` expands to and
   * what an unqualified column name resolves against.
   *
   * Separate from `aliases` because the two answer different questions.
   * `aliases` maps a qualifier to a relation, which is how `a.id` resolves.
   * This list is the flattened, ordered set of *visible* columns, which is
   * what PostgreSQL exposes: a USING join contributes one merged column plus
   * each side's remainder, and the constituents' own copies stop being
   * visible even though `a.id` still resolves through `aliases`.
   *
   * A name occurring more than once here is ambiguous — PostgreSQL rejects
   * such a reference outright, so the walk must not silently pick one.
   */
  visible: VisibleColumn[];
  /** CTE name → (AST node, column names, generated SEARCH/CYCLE columns). */
  ctes: Map<string, { ast: Node; columns: string[]; extraColumns: OutputNullability[] }>;
  /** WHERE clause node (consulted at ColumnRef and ParamRef leaves). */
  whereClause?: Node;
  /**
   * HAVING clause node — the same evidence as WHERE with one difference in
   * strength: every emitted row passed HAVING, INCLUDING the zero-input
   * ungrouped-aggregate row and super-aggregate rows, so HAVING guarantees
   * are consulted without the `rowsImplyWhere` gate. Aggregate calls are
   * opaque to the strict closure, so `max(col) = 'x'` proves nothing about
   * per-row `col` — only conjuncts over group keys or parameters land.
   */
  havingClause?: Node;
  /**
   * The scope's join tree, flattened: one record per JoinExpr with an ON
   * qual, carrying the aliases registered under each side. Input to the
   * presence fixpoint (`resolveJoinImplications`).
   */
  joins: JoinPredicate[];
  /**
   * ON quals proven to have HELD for every row this scope emits — an INNER
   * join whose slice appears genuinely in every row, or an outer join whose
   * null-extendable side is proven present (only matched rows exist).
   * Consulted exactly like WHERE conjuncts for column guarantees and (gated
   * on `rowsImplyWhere`, same hazard) parameter narrowing.
   */
  impliedQuals: Node[];
  /**
   * Whether every row this scope emits derives from at least one input row
   * that passed `whereClause`. TRUE for a plain SELECT and for a grouped
   * query whose groups cannot be empty; FALSE for an ungrouped aggregate
   * query or one with HAVING but no GROUP BY — those emit their row even
   * over ZERO input rows (`SELECT $1, count(*) FROM t WHERE val = $1` with
   * NULL bound returns `[NULL, 0]`), so a returned row proves nothing about
   * the WHERE. Gates the WHERE-conjunct narrowing of ParamRef.
   */
  rowsImplyWhere: boolean;
  /**
   * Whether this SELECT's GROUP BY guarantees every emitted group holds at
   * least one input row. True for a plain `GROUP BY a`; false when there is no
   * GROUP BY, or when it uses ROLLUP/CUBE/GROUPING SETS (which emit
   * super-aggregate rows over the empty grouping set).
   *
   * Consulted by the aggregate dispatch: an aggregate over a non-null
   * expression is non-null only when its group cannot be empty.
   */
  groupGuaranteesNonEmpty: boolean;
  /**
   * Columns that ROLLUP / CUBE / GROUPING SETS can NULL out in the output.
   *
   * A super-aggregate row reports NULL for the grouping columns it collapses:
   * `GROUP BY ROLLUP(id)` emits a grand-total row whose `id` is NULL even
   * though the column is NOT NULL in the catalog. Only columns *inside* a
   * grouping-set construct are affected — a plain term alongside one, as in
   * `GROUP BY a, ROLLUP(b)`, appears in every grouping set and survives.
   *
   * Keyed by both `alias.column` and bare `column` so qualified and
   * unqualified references both match.
   */
  groupingSetColumns: ReadonlySet<string>;
  /**
   * UPDATE only: the target alias and its SET columns. A DML WHERE tested
   * the OLD row while RETURNING reports the NEW one, so column guarantees
   * from WHERE/ON-qual evidence are suppressed for exactly these columns —
   * they are the only ones whose old and new values can differ. Non-SET
   * target columns and FROM/USING relation columns are unchanged by the
   * statement, and parameters are statement constants; both keep the full
   * guarantee machinery.
   */
  dmlSetColumns?: { alias: string; columns: ReadonlySet<string> };
  /**
   * DML RETURNING: target columns whose written value is provably non-null
   * on EVERY path that can produce a returned row — INSERT VALUES cells by
   * intersection over rows, INSERT…SELECT via the source's own analysis,
   * UPDATE SET expressions (RETURNING reports the NEW row, so they are
   * exactly the returned values), and ON CONFLICT DO UPDATE as the
   * intersection of the insert and update paths. Only `true` entries mean
   * anything; consulted as an upgrade alongside the catalog flag.
   */
  dmlWrittenColumns?: { alias: string; columns: ReadonlyMap<string, boolean> };
  /** Outer scope for correlated references. */
  outer: Scope | null;
  /** Memoized per-output-column results for this scope's AST node. */
  results: OutputNullability[] | null;
}

// ---------------------------------------------------------------------------
// Branch guards — path-sensitive nullability.
// ---------------------------------------------------------------------------

/**
 * A predicate known to have evaluated a particular way at the point an
 * expression is being walked.
 *
 * `CASE WHEN c.name IS NOT NULL THEN c.name ELSE 'anon' END` is non-null, but
 * only because the first branch runs solely when its condition held. A guard
 * records that knowledge so a ColumnRef inside the branch can consult it, the
 * same way a ColumnRef consults the scope's WHERE clause.
 *
 * `scope` pins the guard to the address book its aliases were written against.
 * A guard only applies to a column that resolved in that exact scope, so an
 * inner query re-using the alias name cannot pick up an outer guard.
 */
interface Guard {
  scope: Scope;
  predicate: Node;
  /**
   * How the predicate evaluated on the path being walked.
   *
   * `true` — the predicate was TRUE. A branch runs only when its condition is
   * TRUE, so every strict operand in it must be non-null. This is the same
   * inference WHERE promotion makes, and reuses the same analyzer.
   *
   * `false` — the predicate was NOT TRUE, i.e. FALSE *or NULL*. Three-valued
   * logic makes this much weaker: `WHEN a > 5` falls through to ELSE when `a`
   * is NULL, so falsity proves nothing about `a`. Only predicates that can
   * never evaluate to NULL (`IS NULL`, and OR-combinations of such) support an
   * inference here — see `falsityImpliesNotNull`.
   */
  taken: boolean;
}

// ---------------------------------------------------------------------------
// Function body analysis context — tracks arg nullabilities and cycle detection.
// ---------------------------------------------------------------------------

interface FnBodyContext {
  /** Resolved nullability of each positional arg ($1, $2, ...). */
  argResults: boolean[];
  /** Set of function keys currently being analyzed (cycle detection). */
  analyzing: Set<string>;
}

// ---------------------------------------------------------------------------
// The engine. Encapsulates the catalog and memoization caches.
// ---------------------------------------------------------------------------

class NullabilityEngine {
  /** Per-scope memoization: AST node → results (keyed by object identity). */
  private scopeCache = new WeakMap<object, OutputNullability[]>();
  /**
   * Per-analysis presence groups, keyed like `scopeCache` (the inner
   * statement object) and invalidated with it. Storing groups for EVERY
   * analyzed statement — not just the root — is what R1's re-export
   * lifting reads: a subquery/CTE/view entry's groups are looked up here
   * and translated through the outer bare projection, and because a
   * stored list already contains ITS lifted groups, nesting composes to
   * any depth with no extra machinery.
   */
  private groupCache = new WeakMap<object, OutputPresenceGroup[]>();
  /** Nodes currently being analyzed (prevents infinite recursion in recursive CTEs). */
  private analyzing = new WeakSet<object>();
  /**
   * What a recursive CTE's self-reference is currently assumed to produce.
   * Read by `analyzeSelect` when it re-enters a node already under analysis —
   * which happens exactly at the self-reference. See `analyzeSetOperation`.
   */
  private recursiveAssumption = new WeakMap<object, OutputNullability[]>();
  /**
   * The group counterpart of `recursiveAssumption`: what a recursive
   * CTE's self-reference is assumed to carry as presence groups while the
   * fixpoint iterates. Seeded from the left (base) branch — the most the
   * union could keep — and shrunk each round; `groupsOfStatement` falls
   * back to it when the in-flight statement has no cached groups yet.
   */
  private recursiveGroupAssumption = new WeakMap<object, OutputPresenceGroup[]>();
  /**
   * Nodes memoized while a recursive fixpoint is iterating, so their results
   * can be dropped when the assumption they were computed under is disproved.
   * Null when no fixpoint is in progress.
   */
  private fixpointJournal: object[] | null = null;
  /** Monotonic source of null-group ids (see RelationEntry.nullGroup). */
  private nullGroupCounter = 0;
  /** Monotonic source of relation-instance ids (see RelationEntry.instance). */
  private instanceCounter = 0;
  /** Branch guards currently in effect (see the Guard type). */
  private guards: Guard[] = [];
  /** Current function body context (null when analyzing query-level ASTs). */
  private fnCtx: FnBodyContext | null = null;
  /** Current function parameter names (for resolving named ColumnRefs in body). */
  private fnParamNames: string[] | null = null;

  /**
   * Statement-level parameters rejected at Bind (mechanism A, see
   * docs/argument-nullability.md): their resolved type is a NOT NULL domain,
   * so a NULL binding raises before any execution. Any row the statement
   * returns therefore proves these parameters were non-NULL, which makes a
   * projected `ParamRef` for them notNull — the same rows-exist reasoning
   * that lets a `@no-rows` refusal guard a claim. Computed once per `run`
   * from the root statement; `$n` inside subqueries and CTEs refers to the
   * same statement-level parameter, so one set serves the whole walk.
   * (Function-body `$n` is that function's own parameter and is handled by
   * `fnCtx` before this set is consulted.)
   */
  private bindRejectedParams: Set<number> = new Set();
  /**
   * Presence groups of the ROOT statement, set by whichever assembly ran
   * at depth 0 (SELECT target list, DML RETURNING, or a set operation —
   * traced and untraced alike, which is what keeps the two entry points
   * parity-by-construction) and read back through `presenceGroups()`.
   * Every nested analysis stores its own groups in `groupCache`; this
   * field is just the root's copy.
   */
  private rootPresenceGroups: OutputPresenceGroup[] = [];
  /**
   * Entries whose row is PRESUMED present for the duration of a
   * presence-group discriminant computation. `presumePresent` lifts the
   * gate at the call it is passed to; this set carries the same
   * presumption into the fresh walks that call spawns — a generation
   * expression's refs re-enter `computeColumnNullabilityTraced` for the
   * SAME entry, and "given this row present, is a*2 non-null?" must
   * resolve `a` under the presumption or the answer is not the
   * given-present one. Only ever populated inside
   * `computePresenceGroups`; statement analyses never read it (they are
   * memoized presumption-free — the cached-inner-results paths are what
   * keep a presumed walk from ever poisoning a memo).
   */
  private presumedPresent: Set<RelationEntry> = new Set();
  /** Generation expressions currently being walked (cycle insurance). */
  private generationInFlight: Set<string> = new Set();
  /**
   * Whether the expression being walked is a DML SET expression, which reads
   * the OLD row (RETURNING reads the NEW one). CHECK entailment picks its
   * derivation row by this flag: for an OLD-row read every fact source —
   * WHERE, implied quals, and the guards of this very expression — tested
   * the OLD row, so a single unmasked run against the OLD row's CHECKs is
   * both sound and complete, and the NEW-row channel would be the wrong row.
   */
  private dmlOldRowRead = false;
  /** Whether tracing is enabled. */
  private readonly tracing: boolean;
  /** The catalog. */
  private readonly catalog: NullabilityCatalog;

  private readonly onUnhandled: UnhandledNodeObserver | undefined;

  /**
   * Tier 0 (docs/type-aware-overloads.md): the statement's resolved
   * parameter types, as PREPARE reports them — `paramTypes[n-1]` types
   * `$n`. An INPUT, not an inference: the caller runs PREPARE against its
   * database (every harness holds one) and the walk stays pure and stays
   * correct without it, degrading to an untyped ParamRef.
   */
  private readonly paramTypes: readonly string[] | undefined;

  constructor(
    catalog: NullabilityCatalog,
    tracing = false,
    onUnhandled?: UnhandledNodeObserver,
    paramTypes?: readonly string[],
  ) {
    this.catalog = catalog;
    this.tracing = tracing;
    this.onUnhandled = onUnhandled;
    this.paramTypes = paramTypes;
  }

  /** First key of a node object — its type tag. */
  private nodeTag(node: Record<string, unknown>): string {
    return Object.keys(node).find(k => /^[A-Z]/.test(k)) ?? "?";
  }

  run(stmt: Node): OutputNullability[] {
    this.bindRejectedParams = collectParamFacts(stmt, this.catalog).bindRejected;
    return this.analyzeStatement(stmt, null, 0);
  }

  runTraced(stmt: Node): OutputNullabilityTraced[] {
    this.bindRejectedParams = collectParamFacts(stmt, this.catalog).bindRejected;
    return this.analyzeStatementTraced(stmt, null, 0);
  }

  /** The root statement's presence groups, valid after run()/runTraced(). */
  presenceGroups(): OutputPresenceGroup[] {
    return this.rootPresenceGroups;
  }

  /**
   * Origin production mode of a SELECT — one derivation shared by the
   * traced and untraced assemblies so the two cannot disagree about which
   * targets are bare.
   */
  private originModeOf(stmt: SelectStmt): "all" | "keys" | "none" {
    return stmt.groupClause?.length ? "keys" : stmt.havingClause ? "none" : "all";
  }

  /**
   * Which raw target entries are subject to SRF lockstep padding — shared
   * by the traced and untraced assemblies, like originModeOf. TWO OR MORE
   * set-returning calls in one target list expand in lockstep to the
   * LONGEST one's row count, and every shorter one is NULL-padded AFTER it
   * returned (adversarial-2 finding 7, measured: a SETOF <NOT NULL domain>
   * came back NULL through the padding, while a scalar call in the same
   * position repeats; `generate_series(1,3)` beside `generate_series(1,6)`
   * gives six rows with three NULLs, not the cycled LCM this comment used
   * to claim — adversarial-3 finding 1's aside). The padding is
   * manufactured by the projection, so
   * no per-call reasoning survives it: every SRF-carrying entry drops to
   * nullable. Null when fewer than two SRFs — a single SRF has nothing to
   * pad against and keeps its precision.
   */
  private srfPaddedTargets(targetList: Node[]): boolean[] | null {
    const counts = targetList.map(t => {
      const val = this.unwrapResTarget(t).val;
      return val ? this.countSetReturningCalls(val) : 0;
    });
    const total = counts.reduce((a, b) => a + b, 0);
    return total >= 2 ? counts.map(c => c > 0) : null;
  }

  /**
   * Set-returning FuncCalls under `node`, SubLink subtrees excluded — an
   * SRF inside a subquery expands in that query's own projection and takes
   * no part in this list's lockstep.
   */
  private countSetReturningCalls(node: Node): number {
    const rec = node as Record<string, unknown>;
    if ("SubLink" in rec) return 0;
    let count = 0;
    if ("FuncCall" in rec) {
      const fc = rec["FuncCall"] as FuncCall;
      if (!fc.over && this.isSetReturningCall(fc)) count++;
    }
    for (const value of Object.values(rec)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v && typeof v === "object") count += this.countSetReturningCalls(v as Node);
        }
      } else if (value && typeof value === "object") {
        count += this.countSetReturningCalls(value as Node);
      }
    }
    return count;
  }

  /**
   * Whether a call returns a set. Two catalog answers, both measured rather
   * than curated (adversarial-3 findings 1 and 2): `pg_proc.proretset` by
   * CONSENSUS over the name's candidates, and the snapshot's pg_catalog SRF
   * name set for a name the user catalog does not carry.
   *
   * Both replace a question asked of a smaller universe than it ranges
   * over. The single-candidate shortcut answered null for any OVERLOADED
   * name, so two overloads of one SETOF function were invisible here while
   * the notNull rule read both of their return types; and the hand-curated
   * builtin table held 21 of PG18's 71 non-pg_stat/pg_ls SRFs. Neither
   * under-report cost the unrecognised call anything it had — but
   * `srfPaddedTargets` needs a count of two, so one of them turned the
   * padding rule off for the ENTIRE target list and left the recognised
   * call carrying a notNull PostgreSQL pads away.
   */
  private isSetReturningCall(fc: FuncCall): boolean {
    const name = this.funcName(fc);
    const schema = this.funcSchema(fc);
    const known = this.catalog.functionReturnsSet(schema, name);
    if (known !== null) return known;
    return (
      (schema === undefined || schema === "pg_catalog") &&
      this.catalog.isSetReturningBuiltin(name)
    );
  }

  /**
   * Fold the root assembly's per-output producers into presence groups.
   *
   * A producer is the (entry, column) a bare target resolves to — bareness
   * is what makes "the unit's row was absent" mean "this output is NULL":
   * a transforming expression at THIS level (COALESCE, casts, operators)
   * could manufacture non-NULL from an extended row and never joins a
   * group. Expressions computed INSIDE an optional subquery need no such
   * care — the extension nulls the subquery's whole output row, computed
   * columns included, which is why membership keys on the producing
   * entry's nullGroup and not on base-table origins.
   *
   * `entry.joinState` is read after the presence fixpoint has written its
   * promotions back, so a statically-OPTIONAL entry here means the absent
   * arm survived every strict qual. The lazy promotions (WHERE guarantees,
   * alias predicates, null-group co-membership) surface per column as
   * `results[i].notNull === true` — and since a unit is extended
   * atomically, one promoted member means the whole unit's absent arm is
   * refiltered: the unit is dropped, not just the column.
   *
   * Discriminants re-run the column computation presuming presence, which
   * hands them the full given-present machinery (catalog NOT NULL,
   * generated expressions, CHECK entailment) with the extension lifted.
   *
   * A group earns its place only over the flat contract: ≥ 2 members and
   * ≥ 1 discriminant.
   */
  private computePresenceGroups(
    producers: ({ entry: RelationEntry; column: string; ordinal?: number } | null)[],
    results: { notNull: boolean }[],
    scope: Scope,
    depth: number,
  ): OutputPresenceGroup[] {
    const units = new Map<number, { columns: number[]; discriminants: number[]; dead: boolean }>();
    for (let i = 0; i < producers.length; i++) {
      const p = producers[i];
      if (!p || p.entry.joinState !== OPTIONAL) continue;
      let unit = units.get(p.entry.nullGroup);
      if (!unit) {
        unit = { columns: [], discriminants: [], dead: false };
        units.set(p.entry.nullGroup, unit);
      }
      if (results[i]!.notNull) {
        // A bare optional-entry column can only be notNull via promotion,
        // and promotion refilters the whole unit's absent arm.
        unit.dead = true;
        continue;
      }
      unit.columns.push(i);
      // The presumption must reach the fresh walks this call spawns (a
      // generation expression's same-entry refs), not just the top call.
      this.presumedPresent.add(p.entry);
      try {
        if (this.computeColumnNullability(p.entry, p.column, scope, depth, true, p.ordinal)) {
          unit.discriminants.push(i);
        }
      } finally {
        this.presumedPresent.delete(p.entry);
      }
    }
    const groups: OutputPresenceGroup[] = [];
    for (const unit of units.values()) {
      if (unit.dead || unit.columns.length < 2 || unit.discriminants.length === 0) continue;
      groups.push({ columns: unit.columns, discriminants: unit.discriminants });
    }

    // LIFTED groups (R1): a bare re-export preserves the inner analysis's
    // row facts, so each subquery/CTE/view entry's own groups translate
    // through the projection — inner output index → the outer indices that
    // re-export it bare. Partial projections keep the surviving subset (the
    // claim restricted to fewer columns still holds); floors re-apply after
    // translation. A translated member the OUTER analysis proved notNull
    // means the outer scope refilters the inner-absent arm (any such proof
    // — WHERE guarantee, promotion, origin entailment — holds on every
    // returned row, and the absent arm's rows have that member NULL), so
    // the lifted group is dropped, mirroring the dead-unit rule. Under an
    // OPTIONAL entry the lift stays valid with "absent" meaning the whole
    // chain: outer extension nulls every member together, and a
    // discriminant is NULL exactly when outer or inner absence broke the
    // chain — the emitted union arms compose with the entry's own unit
    // group by intersection. Two references to one memoized analysis lift
    // separately (per entry), which is the instance-distinctness rowPaths
    // provide for origins.
    const byEntry = new Map<RelationEntry, Map<number, number[]>>();
    for (let i = 0; i < producers.length; i++) {
      const p = producers[i];
      if (!p) continue;
      const e = p.entry;
      if ((e.kind !== "subquery" && e.kind !== "cte" && e.kind !== "view") || !e.ast) continue;
      const innerResults =
        e.kind === "view"
          ? this.analyzeStatement(e.ast, scope, depth + 1)
          : this.innerRelationColumns(e, scope, depth);
      // Star-expanded producers carry their position; a name lookup would
      // first-match the wrong column when the entry exports duplicates.
      const j = p.ordinal ?? this.innerIndexOf(e, p.column, innerResults);
      if (j < 0) continue;
      let m = byEntry.get(e);
      if (!m) {
        m = new Map();
        byEntry.set(e, m);
      }
      const outs = m.get(j) ?? [];
      outs.push(i);
      m.set(j, outs);
    }
    const seenKeys = new Set(groups.map(g => `${g.columns.join(",")}|${g.discriminants.join(",")}`));
    for (const [e, map] of byEntry) {
      for (const g of this.groupsOfStatement(e.ast!)) {
        const cols: number[] = [];
        const discs: number[] = [];
        for (const j of g.columns) for (const i of map.get(j) ?? []) cols.push(i);
        for (const j of g.discriminants) for (const i of map.get(j) ?? []) discs.push(i);
        cols.sort((a, b) => a - b);
        discs.sort((a, b) => a - b);
        if (cols.length < 2 || discs.length === 0) continue;
        if (cols.some(i => results[i]!.notNull)) continue;
        const key = `${cols.join(",")}|${discs.join(",")}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        groups.push({ columns: cols, discriminants: discs });
      }
    }

    return groups.sort(
      (a, b) =>
        a.columns[0]! - b.columns[0]! ||
        a.columns.length - b.columns.length ||
        (a.columns.join(",") < b.columns.join(",") ? -1 : 1),
    );
  }

  /**
   * Presence groups of a set operation, from its branches' stored groups
   * (R2). INTERSECT and EXCEPT rows ARE left-branch rows, so the left
   * groups pass through verbatim — the origins discipline. For UNION
   * [ALL], every output row comes from exactly one branch at the same
   * indices, and a group's restriction to any member subset is sound
   * WITHIN a branch — so each left×right group pair contributes its
   * member INTERSECTION, discriminants intersected likewise (a
   * discriminant must discriminate whichever branch a row came from),
   * floors re-applied, duplicates dropped. Exact-set agreement falls out
   * as the special case where the pair coincides. A recursive branch's
   * self-reference lifts from the group ASSUMPTION the fixpoint in
   * analyzeSetOperation iterates (seeded with the left branch's groups,
   * shrinking to convergence), which is what lets a recursive CTE keep
   * the groups its recursion preserves.
   */
  private computeSetOpGroups(
    sel: SelectStmt,
    results: { notNull: boolean }[],
  ): OutputPresenceGroup[] {
    if (!sel.larg || !sel.rarg) return [];
    const left = this.groupCache.get(sel.larg) ?? [];
    let combined: OutputPresenceGroup[];
    if (sel.op === "SETOP_INTERSECT" || sel.op === "SETOP_EXCEPT") {
      combined = left;
    } else {
      const right = this.groupCache.get(sel.rarg) ?? [];
      combined = [];
      const seen = new Set<string>();
      for (const lg of left) {
        for (const rg of right) {
          const columns = lg.columns.filter(c => rg.columns.includes(c));
          const discs = lg.discriminants.filter(
            d => rg.discriminants.includes(d) && columns.includes(d),
          );
          if (columns.length < 2 || discs.length === 0) continue;
          const key = `${columns.join(",")}|${discs.join(",")}`;
          if (seen.has(key)) continue;
          seen.add(key);
          combined.push({ columns, discriminants: discs });
        }
      }
    }
    // The dead rule at the SETOP level: INTERSECT strengthens a column's
    // flat claim from the right branch (`left || right`), and a group
    // member the combined analysis proves notNull means the absent arm
    // cannot survive the operation — an INTERSECT against an inner-joined
    // branch has no all-NULL row to pair with. Emitting the group anyway
    // would be sound (the arm is uninhabitable, and a type intersection
    // collapses it) but noisy, and its arm could never be witnessed —
    // found by the generated corpus's two-arm bar, 67 groups strong,
    // before any consumer saw one.
    return combined.filter(g => g.columns.every(i => !results[i]?.notNull));
  }

  /**
   * The stored groups of a statement NODE (wrapper unwrapped to the same
   * inner object `scopeCache`/`groupCache` key by). Empty for anything not
   * yet analyzed — a recursive CTE's in-flight self-reference stays
   * conservatively group-less.
   */
  private groupsOfStatement(ast: Node): OutputPresenceGroup[] {
    const node = ast as Record<string, unknown>;
    for (const tag of ["SelectStmt", "InsertStmt", "UpdateStmt", "DeleteStmt", "MergeStmt"]) {
      if (tag in node) {
        const inner = node[tag] as object;
        return this.groupCache.get(inner) ?? this.recursiveGroupAssumption.get(inner) ?? [];
      }
    }
    return [];
  }

  /**
   * The inner output index a re-exported column name resolves to —
   * the same resolution `computeColumnNullabilityTraced` and `originOf`
   * use: view columns positionally via the catalog list, alias column
   * lists positionally with a name fallback, plain name match otherwise.
   */
  private innerIndexOf(
    entry: RelationEntry,
    colName: string,
    innerResults: { name: string }[],
  ): number {
    if (entry.kind === "view" && entry.table) return this.entryColumnNames(entry).indexOf(colName);
    if (entry.cteColumns && entry.cteColumns.length > 0) {
      const idx = entry.cteColumns.indexOf(colName);
      if (idx >= 0 && idx < innerResults.length) return idx;
    }
    return innerResults.findIndex(r => r.name === colName);
  }

  private newTrace(label: string): ITrace {
    return this.tracing ? new RealTrace(label) : NOOP;
  }

  // -------------------------------------------------------------------------
  // Statement dispatch: SelectStmt, InsertStmt, UpdateStmt, DeleteStmt
  // -------------------------------------------------------------------------

  private analyzeStatement(
    stmt: Node,
    outerScope: Scope | null,
    depth: number,
  ): OutputNullability[] {
    this.checkDepth(depth);
    // Statement results are memoized by AST node identity, so they must not
    // depend on the branch guards active at the call site — a CTE analyzed
    // once inside a CASE branch is reused everywhere else. Guards therefore
    // stop at every statement boundary.
    const saved = this.guards;
    this.guards = [];
    try {
      const node = stmt as Record<string, unknown>;
      if ("SelectStmt" in node) {
        return this.analyzeSelect(node["SelectStmt"] as SelectStmt, outerScope, depth);
      }
      if ("InsertStmt" in node) {
        return this.analyzeInsert(node["InsertStmt"] as InsertStmt, outerScope, depth);
      }
      if ("UpdateStmt" in node) {
        return this.analyzeUpdate(node["UpdateStmt"] as UpdateStmt, outerScope, depth);
      }
      if ("DeleteStmt" in node) {
        return this.analyzeDelete(node["DeleteStmt"] as DeleteStmt, outerScope, depth);
      }
      if ("MergeStmt" in node) {
        return this.analyzeMerge(node["MergeStmt"] as MergeStmt, outerScope, depth);
      }
      // An unrecognised statement contributes no columns at all — a shape
      // defect, not a conservative flag. Refuse rather than return a column
      // list we know is wrong.
      const tag = this.nodeTag(node);
      this.onUnhandled?.("statement", tag);
      throw new UnsupportedNodeError("statement", tag);
    } finally {
      this.guards = saved;
    }
  }

  /**
   * Traced variant of analyzeStatement. Delegates to the untraced
   * analyzeStatement for scope building/memoization, but wraps each
   * target list expression with a TraceNode.
   */
  private analyzeStatementTraced(
    stmt: Node,
    outerScope: Scope | null,
    depth: number,
  ): OutputNullabilityTraced[] {
    this.checkDepth(depth);
    const node = stmt as Record<string, unknown>;

    // For set operations, trace each branch.
    if ("SelectStmt" in node) {
      const sel = node["SelectStmt"] as SelectStmt;
      if (sel.op && sel.op !== "SETOP_NONE" && sel.larg && sel.rarg) {
        // Register CTEs from the WITH clause so they're visible in larg/rarg.
        const cteScope = this.emptyScope(outerScope);
        this.registerCtes(sel.withClause, cteScope);
        const left = this.analyzeStatementTraced({ SelectStmt: sel.larg } as Node, cteScope, depth + 1);
        const right = this.analyzeStatementTraced({ SelectStmt: sel.rarg } as Node, cteScope, depth + 1);
        const combined = this.combineSetOperationTraced(left, right, sel.op);
        const groups = this.computeSetOpGroups(sel, combined);
        this.groupCache.set(sel, groups);
        if (depth === 0 && outerScope === null) this.rootPresenceGroups = groups;
        return combined;
      }
      // For normal SELECT, build scope and trace each target. Producer
      // recording mirrors the untraced assembly line by line — the parity
      // suite compares the two engines' presence groups.
      if (!sel.valuesLists || sel.valuesLists.length === 0) {
        const scope = this.buildScope(sel, outerScope, depth);
        const originMode = this.originModeOf(sel);
        const producers: ({ entry: RelationEntry; column: string; ordinal?: number } | null)[] = [];
        const results: OutputNullabilityTraced[] = [];
        const tracedTargets = sel.targetList ?? [];
        const srfPadded = this.srfPaddedTargets(tracedTargets);
        for (const [targetIndex, target] of tracedTargets.entries()) {
          const rt = this.unwrapResTarget(target);
          const val = rt.val;
          const name = rt.name;
          if (!val) {
            results.push({ name: name ?? "", notNull: false });
            producers.push(null);
            continue;
          }
          // Mirrors the untraced assembly — see srfPaddedTargets.
          if (srfPadded?.[targetIndex]) {
            const trace = this.newTrace("Root");
            trace.addFact("srfPadding", "two or more set-returning calls in this target list");
            trace.conclude(false, "lockstep SRF expansion NULL-pads the shorter call after it returned → nullable");
            results.push({ name: name ?? this.inferName(val), notNull: false, trace: trace.node });
            producers.push(null);
            continue;
          }
          if (this.isStarColumn(val)) {
            const expanded = this.expandStar(
              val,
              scope,
              depth,
              false,
              originMode === "all" ? producers : undefined,
            );
            if (originMode !== "all") for (const _ of expanded) producers.push(null);
            for (const e of expanded) results.push({ ...e });
            continue;
          }
          const compositeStar = this.expandCompositeStar(val, scope, depth);
          if (compositeStar) {
            for (const e of compositeStar) {
              results.push({ ...e });
              producers.push(null);
            }
            continue;
          }
          const trace = this.newTrace("Root");
          const notNull = this.walkExprTraced(val, scope, depth + 1, trace);
          producers.push(this.originTarget(val, sel, scope, originMode));
          results.push({ name: name ?? this.inferName(val), notNull, trace: trace.node });
        }
        const groups = this.computePresenceGroups(producers, results, scope, depth);
        this.groupCache.set(sel, groups);
        if (depth === 0 && outerScope === null) this.rootPresenceGroups = groups;
        return results;
      }
    }

    // For INSERT/UPDATE/DELETE/MERGE RETURNING — the SAME scope builders as
    // the untraced analyzers, then trace each returning expression. Parity
    // is by construction: this branch once rebuilt the scopes by hand and
    // drifted (no WHERE channel, no SET mask, no written-value map), so the
    // tracer explained decisions the engine did not make. The parity suite
    // in nullability-walk-traced.test.ts holds the property.
    if ("InsertStmt" in node) {
      const ins = node["InsertStmt"] as InsertStmt;
      if (!ins.returningClause) return [];
      const scope = this.buildInsertScope(ins, outerScope, depth);
      return this.analyzeReturningTraced(ins.returningClause, scope, depth, ins);
    }
    if ("UpdateStmt" in node) {
      const upd = node["UpdateStmt"] as UpdateStmt;
      if (!upd.returningClause) return [];
      const scope = this.buildUpdateScope(upd, outerScope, depth);
      return this.analyzeReturningTraced(upd.returningClause, scope, depth, upd);
    }
    if ("MergeStmt" in node) {
      const mrg = node["MergeStmt"] as MergeStmt;
      if (!mrg.returningClause) return [];
      const scope = this.buildMergeScope(mrg, outerScope, depth);
      return this.analyzeReturningTraced(mrg.returningClause, scope, depth, mrg);
    }
    if ("DeleteStmt" in node) {
      const del = node["DeleteStmt"] as DeleteStmt;
      if (!del.returningClause) return [];
      const scope = this.buildDeleteScope(del, outerScope, depth);
      return this.analyzeReturningTraced(del.returningClause, scope, depth, del);
    }

    // Fallback: untraced.
    return this.analyzeStatement(stmt, outerScope, depth);
  }

  private combineSetOperationTraced(
    left: OutputNullabilityTraced[],
    right: OutputNullabilityTraced[],
    op: string | undefined,
  ): OutputNullabilityTraced[] {
    const len = Math.max(left.length, right.length);
    const results: OutputNullabilityTraced[] = [];
    for (let i = 0; i < len; i++) {
      const l = left[i];
      const r = right[i];
      results.push({
        name: l?.name ?? r?.name ?? "",
        notNull: combineSetOpColumn(l?.notNull ?? false, r?.notNull ?? false, op),
      });
    }
    return results;
  }

  private analyzeReturningTraced(
    returningClause: Node,
    scope: Scope,
    depth: number,
    stmtKey?: object,
  ): OutputNullabilityTraced[] {
    const ret = returningClause as { exprs?: Node[] };
    const producers: ({ entry: RelationEntry; column: string; ordinal?: number } | null)[] = [];
    const results: OutputNullabilityTraced[] = [];
    for (const target of ret.exprs ?? []) {
      const rt = this.unwrapResTarget(target);
      const val = rt.val;
      const name = rt.name;
      if (!val) {
        results.push({ name: name ?? "", notNull: false });
        producers.push(null);
        continue;
      }
      if (this.isStarColumn(val)) {
        const expanded = this.expandStar(val, scope, depth, false, producers);
        for (const e of expanded) results.push({ ...e });
        continue;
      }
      const compositeStar = this.expandCompositeStar(val, scope, depth);
      if (compositeStar) {
        for (const e of compositeStar) {
          results.push({ ...e });
          producers.push(null);
        }
        continue;
      }
      const trace = this.newTrace("Root (RETURNING)");
      const notNull = this.walkExprTraced(val, scope, depth + 1, trace);
      producers.push(this.resolveBareColumnTarget(val, scope));
      results.push({ name: name ?? this.inferName(val), notNull, trace: trace.node });
    }
    if (stmtKey) {
      const groups = this.computePresenceGroups(producers, results, scope, depth);
      this.groupCache.set(stmtKey, groups);
      if (depth === 0) this.rootPresenceGroups = groups;
    }
    return results;
  }

  // -------------------------------------------------------------------------
  // SELECT analysis
  // -------------------------------------------------------------------------

  private analyzeSelect(
    stmt: SelectStmt,
    outerScope: Scope | null,
    depth: number,
  ): OutputNullability[] {
    // Check memoization cache.
    const cached = this.scopeCache.get(stmt);
    if (cached) return cached;

    // Prevent infinite recursion for recursive CTEs: if this node is
    // already being analyzed (somewhere up the call stack), return empty
    // results. Columns from the recursive reference resolve as nullable
    // (conservative), which is correct.
    // Re-entry means a recursive CTE's self-reference. During a fixpoint that
    // resolves to the current assumption; outside one there is nothing to say
    // and every column resolves nullable.
    if (this.analyzing.has(stmt)) return this.recursiveAssumption.get(stmt) ?? [];
    this.analyzing.add(stmt);
    try {

    // Set operations (UNION/INTERSECT/EXCEPT) — handle before scope building.
    if (stmt.op && stmt.op !== "SETOP_NONE" && stmt.larg && stmt.rarg) {
      // Register CTEs from the WITH clause so they're visible in larg/rarg.
      const cteScope = this.emptyScope(outerScope);
      this.registerCtes(stmt.withClause, cteScope);
      const results = this.analyzeSetOperation(stmt, cteScope, depth);
      const groups = this.computeSetOpGroups(stmt, results);
      this.groupCache.set(stmt, groups);
      if (depth === 0 && outerScope === null) this.rootPresenceGroups = groups;
      this.memoize(stmt, results);
      return results;
    }

    // VALUES — no FROM clause, valuesLists populated.
    if (stmt.valuesLists && stmt.valuesLists.length > 0) {
      const results = this.analyzeValuesSelect(stmt.valuesLists, outerScope, depth);
      this.memoize(stmt, results);
      return results;
    }

    // Build the scope (address book).
    const scope = this.buildScope(stmt, outerScope, depth);

    // Origins survive shapes where an output value IS some real row's
    // value. Ungrouped, un-aggregated targets: all bare pass-throughs.
    // Grouped: plain grouping KEYS only (Wave 12 — every row of a group
    // shares the key values, so sibling keys are same-row; ROLLUP/CUBE-
    // nulled columns and non-keys refuse). HAVING without GROUP BY is an
    // aggregate query — no row identity at all. DISTINCT keeps whole rows.
    const originMode = this.originModeOf(stmt);

    // Process the target list. Each output's bare producer is recorded
    // alongside — the input to presence-group folding, at every depth: a
    // nested analysis's groups are what re-export lifting reads.
    const producers: ({ entry: RelationEntry; column: string; ordinal?: number } | null)[] = [];
    const results: OutputNullability[] = [];
    const targetList = stmt.targetList ?? [];
    const srfPadded = this.srfPaddedTargets(targetList);
    for (const [targetIndex, target] of targetList.entries()) {
      const rt = this.unwrapResTarget(target);
      const val = rt.val;
      const name = rt.name;

      if (!val) {
        results.push({ name: name ?? "", notNull: false });
        producers.push(null);
        continue;
      }

      // Lockstep SRF padding voids per-call reasoning — see
      // srfPaddedTargets. No origins either: a padding row is nobody's.
      if (srfPadded?.[targetIndex]) {
        results.push({ name: name ?? this.inferName(val), notNull: false });
        producers.push(null);
        continue;
      }

      // Handle SELECT * (A_Star in ColumnRef).
      if (this.isStarColumn(val)) {
        const expanded = this.expandStar(
          val,
          scope,
          depth,
          originMode === "all",
          originMode === "all" ? producers : undefined,
        );
        if (originMode !== "all") for (const _ of expanded) producers.push(null);
        for (const e of expanded) {
          results.push(e);
        }
        continue;
      }

      // `(expr).*` — a composite expansion in target-list position, one
      // column per field. A transforming expression, so no origins and no
      // producers.
      const compositeStar = this.expandCompositeStar(val, scope, depth);
      if (compositeStar) {
        for (const e of compositeStar) {
          results.push(e);
          producers.push(null);
        }
        continue;
      }

      const notNull = this.walkExpr(val, scope, depth + 1);
      const bare = this.originTarget(val, stmt, scope, originMode);
      producers.push(bare);
      const og = bare ? this.originOf(bare.entry, bare.column, scope, depth) : undefined;
      results.push(
        og
          ? {
              name: name ?? this.inferName(val),
              notNull,
              origins: og.origins,
              ...(og.settled ? { originNotNull: og.settled } : {}),
            }
          : { name: name ?? this.inferName(val), notNull },
      );
    }

    const groups = this.computePresenceGroups(producers, results, scope, depth);
    this.groupCache.set(stmt, groups);
    if (depth === 0 && outerScope === null) this.rootPresenceGroups = groups;

    this.memoize(stmt, results);
    scope.results = results;
    return results;
    } finally {
      this.analyzing.delete(stmt);
    }
  }

  // -------------------------------------------------------------------------
  // Scope building: walk FROM clause + WITH clause
  // -------------------------------------------------------------------------

  private buildScope(
    stmt: SelectStmt,
    outerScope: Scope | null,
    depth: number,
  ): Scope {
    const scope: Scope = {
      aliases: new Map(),
      ctes: new Map(),
      whereClause: stmt.whereClause,
      havingClause: stmt.havingClause,
      joins: [],
      impliedQuals: [],
      visible: [],
      rowsImplyWhere: stmt.groupClause?.length
        ? this.groupingGuaranteesNonEmptyGroups(stmt)
        : !this.selectEmitsRowsWithoutInput(stmt),
      groupGuaranteesNonEmpty: this.groupingGuaranteesNonEmptyGroups(stmt),
      groupingSetColumns: EMPTY_STRING_SET,
      outer: outerScope,
      results: null,
    };

    // WITH clause — register CTEs first (in scope for the body).
    this.registerCtes(stmt.withClause, scope);

    // FROM clause — walk each from item, building the address book. Top-level
    // items are comma-joined, so each is its own null group.
    if (stmt.fromClause) {
      for (const item of stmt.fromClause) {
        scope.visible.push(
          ...this.walkFromItem(item, REQUIRED, scope, this.nextNullGroup(), [], depth),
        );
      }
    }

    this.resolveJoinImplications(scope);
    // After the FROM walk, deliberately: the recorder resolves output
    // ORDINALS against the EXPANDED target list (a star entry is ONE
    // ResTarget and N output columns — adversarial-2 finding 10), and
    // expanding a star needs the aliases just registered. Nothing consults
    // the field before the target list is analyzed.
    scope.groupingSetColumns = this.collectGroupingSetColumns(
      stmt.groupClause,
      stmt.targetList,
      scope,
      depth,
    );
    return scope;
  }

  /**
   * The presence fixpoint. Two mutually-reinforcing facts iterate to a
   * fixed point over the scope's join tree:
   *
   *   present(R) — relation R's row is genuinely present (never
   *     NULL-extended) in every row the scope emits. Initially: every
   *     relation whose joinState is REQUIRED.
   *
   *   implied(J) — join J's ON qual HELD for every emitted row. An INNER
   *     join's qual held for every row its slice genuinely appears in, so it
   *     is implied once ANY relation of its subtree is present (a side
   *     null-extends as a unit, so one present member pins the whole slice).
   *     An outer join's qual held exactly for its MATCHED rows, so it is
   *     implied once its null-extendable side is proven present — LEFT needs
   *     a right-side relation, RIGHT a left-side one, FULL one of each.
   *
   * An implied qual (or a WHERE conjunct — same evidence, eagerly here
   * rather than lazily) that strictly references a relation's column proves
   * that relation present, which can activate further joins — the chain
   * `((t LEFT u) LEFT v) INNER ck ON ck.id = v.u_id` proves v present, which
   * implies the middle LEFT's qual `v.u_id = u.id`, which proves u present.
   * Null-group co-membership propagates presence the same way it does for
   * lazy promotion: group members are NULL-extended atomically.
   *
   * Promotions are written back to entry.joinState (OPTIONAL → REQUIRED),
   * and the implied quals are stored for the column and parameter guarantee
   * checks — which is what makes a strict qual over a NULL-extended side
   * finally cancel the extension instead of being ignored.
   */
  private resolveJoinImplications(scope: Scope): void {
    if (scope.joins.length === 0 && scope.impliedQuals.length === 0) return;
    const present = new Set<string>();
    for (const [alias, entry] of scope.aliases) {
      if (entry.joinState === REQUIRED) present.add(alias);
    }
    const wherePreds: Node[] = [
      ...(scope.whereClause ? [scope.whereClause] : []),
      ...(scope.havingClause ? [scope.havingClause] : []),
    ];
    const pending = [...scope.joins];

    let changed = true;
    while (changed) {
      changed = false;

      for (let i = pending.length - 1; i >= 0; i--) {
        const j = pending[i]!;
        const leftPresent = j.leftAliases.some(a => present.has(a));
        const rightPresent = j.rightAliases.some(a => present.has(a));
        const active =
          j.jointype === "JOIN_INNER"
            ? j.incomingRequired || leftPresent || rightPresent
            : j.jointype === "JOIN_LEFT"
              ? rightPresent
              : j.jointype === "JOIN_RIGHT"
                ? leftPresent
                : j.jointype === "JOIN_FULL"
                  ? leftPresent && rightPresent
                  : false;
        if (active) {
          // A qual-less join implies nothing — an INNER join with no ON
          // clause constrains no column — so it leaves the pending list
          // without contributing. It is in `scope.joins` for the subtree
          // readings, which want its TYPE, not its qual.
          if (j.quals) scope.impliedQuals.push(j.quals);
          pending.splice(i, 1);
          changed = true;
        }
      }

      // The join-level fact, which is what the alias-level `present` set has
      // no way to say: a join that cannot extend one of its sides leaves the
      // joins INSIDE that side un-extendable too, provided its own slice is.
      // That is `incomingRequired` for them — the same property the walk
      // records when a side arrives REQUIRED — so the existing rules pick it
      // up unchanged, and the extendable side's own members stay optional,
      // which they must: in the FULL-FULL chain the fact recovers `customers`
      // while `orders` genuinely can be absent from the FIRST join.
      //
      // "Un-extendable from above" means by EVERYTHING above, and `j` is only
      // the top of that side. A join nested deeper inside the same side can
      // extend the aliases of one nested deeper still, and marking the inner
      // one required then asserts its qual over rows where it does not hold —
      // `incomingRequired` makes an INNER join's qual an IMPLIED QUAL of the
      // whole scope, which is a claim about every emitted row. Measured
      // counterexample, from the first run of the discovery generator:
      //
      //     tags r0
      //     JOIN product_tags r1 ON r0.id = r1.tag_id
      //     RIGHT JOIN products r2 ON r1.product_id = r2.id
      //     FULL JOIN product_tags r3 ON r2.id = r3.product_id
      //
      // The last join cannot extend its left side (`r3.product_id` is a NOT
      // NULL key onto `r2`), so this rule reached both joins inside it — but
      // the RIGHT JOIN is inside it too, and null-extends `r0` and `r1` for a
      // product with no tags. `r0.id = r1.tag_id` was then implied over rows
      // where both are NULL, claiming notNull for two columns PostgreSQL
      // returns NULL in. So an inner join is skipped when another join within
      // the SAME side has an optional group covering it.
      const extendedWithinSide = (inner: JoinPredicate, within: string[]): boolean =>
        scope.joins.some(other => {
          if (other === inner || !this.joinWithin(other, within)) return false;
          return (["left", "right"] as const).some(s => {
            const g = s === "left" ? other.leftOptionalGroup : other.rightOptionalGroup;
            if (g === undefined) return false;
            return this.joinWithin(inner, s === "left" ? other.leftAliases : other.rightAliases);
          });
        });
      for (const j of scope.joins) {
        if (!j.incomingRequired) continue;
        for (const side of ["left", "right"] as const) {
          const group = side === "left" ? j.leftOptionalGroup : j.rightOptionalGroup;
          if (group === undefined) continue;
          const aliases = side === "left" ? j.leftAliases : j.rightAliases;
          if (!scope.joins.some(inner =>
            !inner.incomingRequired &&
            this.joinWithin(inner, aliases) &&
            !extendedWithinSide(inner, aliases))
          ) {
            continue;
          }
          if (!this.joinCannotExtendSide(j, scope, side)) continue;
          for (const inner of scope.joins) {
            if (inner.incomingRequired || !this.joinWithin(inner, aliases)) continue;
            if (extendedWithinSide(inner, aliases)) continue;
            inner.incomingRequired = true;
            changed = true;
          }
        }
      }

      for (const j of scope.joins) {
        const referenced = this.foreignKeyEntailedAlias(j, scope, present);
        if (referenced && !present.has(referenced)) {
          present.add(referenced);
          const entry = scope.aliases.get(referenced);
          if (entry && entry.joinState === OPTIONAL) entry.joinState = REQUIRED;
          changed = true;
        }
      }

      for (const [alias, entry] of scope.aliases) {
        if (present.has(alias)) continue;
        const proven =
          [...wherePreds, ...scope.impliedQuals].some(p =>
            this.whereImpliesAliasNotNull(p, alias),
          ) ||
          [...scope.aliases.values()].some(
            other => other.alias !== alias && other.nullGroup === entry.nullGroup &&
              present.has(other.alias),
          );
        if (proven) {
          present.add(alias);
          if (entry.joinState === OPTIONAL) entry.joinState = REQUIRED;
          changed = true;
        }
      }
    }
  }

  /**
   * The alias an outer join's ON qual proves PRESENT through a foreign key, or
   * null.
   *
   * `orders o LEFT JOIN customers c ON c.id = o.customer_id` cannot
   * null-extend `c`: `orders.customer_id` is NOT NULL and REFERENCES
   * customers(id), so every row of orders has its match and the optional side
   * behaves as required. The same reading covers a FULL JOIN's referenced
   * side — `orders FULL JOIN shipments ON s.order_id = o.id` extends the
   * ORDERS side only for a shipment with no order, which the key forbids.
   *
   * What the key guarantees is a property of the referencing relation's STORED
   * rows, and everything below is about keeping the reasoning to those rows.
   * Every row on the OTHER side must carry one, which has two forms:
   *
   *   - The referencing alias is PROVEN PRESENT — by its join state, by WHERE
   *     promotion, or by an earlier round of this fixpoint. Then no row this
   *     scope emits comes from the other side being extended, so every emitted
   *     row is one this join MATCHED, and the matched row carries the
   *     referenced relation genuinely. This is what lets the products side of
   *     a five-way join promote once the WHERE has proven the orders side.
   *   - Nothing is present yet, and the referencing alias is never extended
   *     WITHIN the other side (`subtreeAlwaysPresent`) while this join's own
   *     slice is not extended from above (`incomingRequired`). This join then
   *     also emits rows from the referenced side alone — its own extension of
   *     the other side — so on this arm the referenced relation must be
   *     present within ITS side too, which a deeper join can deny.
   *
   * Both arms need the match to still be in the SLICE: the key says it exists
   * in the TABLE, and a join inside the referenced side can have dropped it
   * (`subtreePreserves`). Three more gates:
   *
   *   - The qual must be EXACTLY the key equality. Any further conjunct can
   *     only remove matches, and removing a match is what makes the extension
   *     the claim denies.
   *   - The referencing column must be NOT NULL — a NULL key matches nothing
   *     (which is also what closes MATCH SIMPLE's partial-NULL hole).
   *   - Both sides must be plain relation references. A subquery or CTE column
   *     may be an expression, and the key is a fact about tables.
   */
  private foreignKeyEntailedAlias(
    j: JoinPredicate,
    scope: Scope,
    present: Set<string>,
  ): string | null {
    const eq = this.equalityColumnRefs(j.quals);
    if (!eq) return null;

    const sides: { optionalAliases: string[]; group: number; otherAliases: string[] }[] = [];
    if (j.leftOptionalGroup !== undefined) {
      sides.push({
        optionalAliases: j.leftAliases,
        group: j.leftOptionalGroup,
        otherAliases: j.rightAliases,
      });
    }
    if (j.rightOptionalGroup !== undefined) {
      sides.push({
        optionalAliases: j.rightAliases,
        group: j.rightOptionalGroup,
        otherAliases: j.leftAliases,
      });
    }

    for (const side of sides) {
      for (const [refCol, targetCol] of [
        [eq[0], eq[1]],
        [eq[1], eq[0]],
      ] as const) {
        // The referencing side is the one carrying the key: it must be on the
        // OTHER side of this join, or be this join's own optional twin.
        const referencing = scope.aliases.get(refCol.alias);
        const referenced = scope.aliases.get(targetCol.alias);
        if (!referencing || !referenced) continue;
        if (!side.optionalAliases.includes(targetCol.alias)) continue;
        // The referencing side must be the other side of this very join —
        // the key relates these two relations, and a column from elsewhere in
        // the tree says nothing about whether THIS join matched.
        if (!side.otherAliases.includes(refCol.alias)) continue;

        const provenPresent = present.has(refCol.alias);
        const otherSideCarriesTheKey =
          j.incomingRequired &&
          this.subtreeAlwaysPresent(scope, side.otherAliases, refCol.alias);
        if (!provenPresent && !otherSideCarriesTheKey) continue;
        // The key says the match exists in the TABLE; the join finds it only
        // if it is still in the SLICE. `customers c INNER JOIN orders o ON
        // o.customer_id = c.id AND o.status = 'fulfilled' FULL JOIN
        // order_items oi ON oi.order_id = o.id` is the counterexample
        // (measured): the inner join keeps only fulfilled orders, and an item
        // whose order has another status has nothing to match, so the FULL
        // join emits a row with `o` AND `c` NULL. The same hole on the other
        // arm is `orders o LEFT JOIN (customers c INNER JOIN addresses a ON
        // a.customer_id = c.id) ON c.id = o.customer_id`, where an order's
        // customer is dropped for having no address. Presence of the
        // REFERENCING side does not help there: those rows carry a stored
        // referencing row and are exactly the extended ones.
        if (!this.subtreePreserves(scope.joins, side.optionalAliases, targetCol.alias, scope)) continue;
        // On the second arm this join also emits rows from the referenced
        // side ALONE, so the referenced relation must be present within that
        // side: in `t FULL JOIN u ON u.t_id = t.id FULL JOIN v ON v.u_id =
        // u.id` a `t` row with no `u` survives this join with both `u` and
        // `v` extended, and the key — every stored `v` has a matching `u` —
        // is silent about a row that has no `v` at all. Promoting `u` there
        // claimed notNull for a column PostgreSQL returns NULL in (schema
        // axis, fk-chain variant). `provenPresent` needs no such gate: every
        // emitted row is then a matched one.
        if (
          !provenPresent &&
          !this.subtreeAlwaysPresent(scope, side.optionalAliases, targetCol.alias)
        ) {
          continue;
        }

        const referencingKey = this.keyedRelation(referencing);
        const referencedKey = this.keyedRelation(referenced);
        if (!referencingKey || !referencedKey) continue;
        // The join qual names columns as the QUERY spells them; a key is
        // recorded in `pg_constraint` under the catalog's names. An alias
        // column list is exactly the case where those differ.
        const refCat = this.entryCatalogColumn(referencing, refCol.column);
        const tgtCat = this.entryCatalogColumn(referenced, targetCol.column);
        if (refCat === undefined || tgtCat === undefined) continue;
        if (!this.keyEntails(referencingKey, refCat, referencedKey, tgtCat)) {
          continue;
        }
        return targetCol.alias;
      }
    }
    return null;
  }

  /**
   * Whether `referencing.column` is a NOT NULL foreign key onto
   * `referenced.column` — "every stored row of the referencing relation has a
   * match", the one fact both readings of a key rest on.
   *
   * Tables only. A view's rows are a query's output, not the stored rows the
   * key constrains, and relations and views share one alias kind in the scope.
   * The catalog-visible gates — NOT VALID, NOT ENFORCED, DEFERRABLE,
   * inheritance — are the adapter's, in `resolveForeignKey[Tree]`; the NOT
   * NULL read takes the same `scanInh` split every other per-column fact does.
   */
  /**
   * A scope entry as a relation the catalog can be asked about keys, or null
   * for anything that is not a plain table. A view's rows are a query's
   * output, not the stored rows a key constrains, and relations and views
   * share one alias kind in the scope.
   */
  private keyedRelation(entry: RelationEntry): KeyedRelation | null {
    if (entry.kind !== "table" || !entry.table) return null;
    // A SAMPLE of a table is not the table. A key constrains the stored rows,
    // and neither side of one can be a relation the statement is reading a
    // fraction of: as the referenced side the match may have been sampled
    // away, and as the referencing side the rows that carry the key are not
    // the rows the join sees. Refusing both is what the flag buys — and it
    // costs nothing real, since no codegen query writes TABLESAMPLE.
    if (entry.sampled) return null;
    return {
      schema: entry.table.schema,
      name: entry.table.name,
      scansTree: entry.scanInh !== false,
    };
  }

  private keyEntails(
    referencing: KeyedRelation,
    referencingColumn: string,
    referenced: KeyedRelation,
    referencedColumn: string,
  ): boolean {
    // The scan mode of the REFERENCED relation, which nothing read until the
    // partition-clone capture was fixed and made it matter (sweep-4 finding 4).
    // A PARTITIONED table holds none of its own rows — they all live in the
    // partitions — so `ONLY <partitioned parent>` scans nothing, and a key
    // promising a match "in sw4_pp" is silent about the empty slice that
    // produces. Measured: every referencing row NULL-extends.
    //
    // INHERITANCE is the opposite way round and must keep its promotion: a
    // parent holds its OWN rows and the key's target index covers exactly
    // those, so `ONLY <inheritance parent>` is where the match lives. The gate
    // is therefore on being partitioned, not on `ONLY`.
    if (
      !referenced.scansTree &&
      this.catalog.resolveIsPartitioned(referenced.schema, referenced.name)
    ) {
      return false;
    }
    const fk = referencing.scansTree
      ? this.catalog.resolveForeignKeyTree(
          referencing.schema,
          referencing.name,
          referencingColumn,
        )
      : this.catalog.resolveForeignKey(
          referencing.schema,
          referencing.name,
          referencingColumn,
        );
    if (!fk) return false;
    if (
      fk.schema !== referenced.schema ||
      fk.table !== referenced.name ||
      fk.column !== referencedColumn
    ) {
      return false;
    }
    return referencing.scansTree
      ? this.catalog.resolveColumnNotNullTree(
          referencing.schema,
          referencing.name,
          referencingColumn,
        )
      : this.catalog.resolveColumnNotNull(
          referencing.schema,
          referencing.name,
          referencingColumn,
        );
  }

  /**
   * Whether every STORED row of `alias` reaches the output of the subtree
   * spanning `subtreeAliases`, genuinely present rather than NULL-extended.
   *
   * Read off the join types alone: a LEFT join preserves its left side and a
   * RIGHT join its right, a FULL join preserves both, and an INNER join
   * preserves neither — its qual can drop rows from either. A leaf side has no
   * join inside it and is preserved by definition, which is the shape almost
   * every foreign-key join takes. WHERE is not consulted: it filters the
   * scope's output AFTER the joins, so it can remove a row but never create
   * the NULL-extended one a claim here is about.
   */
  private subtreePreserves(
    joins: readonly JoinSides[],
    subtreeAliases: string[],
    alias: string,
    scope?: Scope,
  ): boolean {
    // A row-dropper that is not a join at all: `TABLESAMPLE` keeps a fraction
    // of the relation's stored rows, so "every stored row reaches the output"
    // is false before any join is consulted. The flag lives on the entry
    // rather than being re-derived here, because the walk has already unwrapped
    // the `RangeTableSample` node by the time this runs.
    if (scope?.aliases.get(alias)?.sampled) return false;
    for (const inner of joins) {
      if (!this.joinWithin(inner, subtreeAliases)) continue;
      if (inner.leftAliases.includes(alias)) {
        if (inner.jointype !== "JOIN_LEFT" && inner.jointype !== "JOIN_FULL") return false;
      } else if (inner.rightAliases.includes(alias)) {
        if (inner.jointype !== "JOIN_RIGHT" && inner.jointype !== "JOIN_FULL") return false;
      }
    }
    return true;
  }

  /**
   * Whether `alias` is genuinely present in EVERY row the subtree spanning
   * `subtreeAliases` emits — the dual of `subtreePreserves`, and about this
   * subtree only: an ancestor join may still extend the whole slice.
   *
   * A join NULL-extends the side it makes optional, which is its type: LEFT
   * extends its right, RIGHT its left, FULL both, INNER neither — unless that
   * join is itself one that cannot extend the side in question, which is where
   * the fact COMPOSES: in `order_items oi FULL JOIN orders o ON oi.order_id =
   * o.id FULL JOIN customers c ON o.customer_id = c.id` the inner join emits
   * no item-only row, so every row it emits carries a stored order, so every
   * row of the outer join's left side carries a customer key — and `customers`
   * is present throughout while `orders` is NULL wherever the outer join
   * extends that side (measured, both).
   *
   * The recursion is well-founded: each step descends to a strictly smaller
   * subtree.
   */
  private subtreeAlwaysPresent(
    scope: Scope,
    subtreeAliases: string[],
    alias: string,
  ): boolean {
    for (const inner of scope.joins) {
      if (!this.joinWithin(inner, subtreeAliases)) continue;
      if (inner.leftAliases.includes(alias)) {
        if (inner.jointype !== "JOIN_RIGHT" && inner.jointype !== "JOIN_FULL") continue;
        if (!this.joinCannotExtendSide(inner, scope, "left")) return false;
      } else if (inner.rightAliases.includes(alias)) {
        if (inner.jointype !== "JOIN_LEFT" && inner.jointype !== "JOIN_FULL") continue;
        if (!this.joinCannotExtendSide(inner, scope, "right")) return false;
      }
    }
    return true;
  }

  /** Whether a join lies entirely inside the subtree spanning these aliases. */
  private joinWithin(j: JoinSides, subtreeAliases: string[]): boolean {
    return (
      j.leftAliases.every(a => subtreeAliases.includes(a)) &&
      j.rightAliases.every(a => subtreeAliases.includes(a))
    );
  }

  /**
   * Whether this join provably never NULL-EXTENDS the given side — a fact
   * about the JOIN, which is what the presence fixpoint's alias vocabulary
   * cannot express.
   *
   * A join extends side S exactly for the rows of the OTHER side that find no
   * match in S. A foreign key rules those out when: every row of the other
   * side carries a stored referencing row (`subtreeAlwaysPresent`), that row's
   * key is NOT NULL and points at the referenced relation on S, and every
   * stored row of that relation is still in S's slice (`subtreePreserves`).
   * Then each other-side row has its match and none is left over to extend S.
   *
   * `SELECT c.id FROM customers c FULL JOIN orders o ON o.customer_id = c.id
   * FULL JOIN order_items oi ON oi.order_id = o.id` is the shape: every item
   * has an order, the left slice keeps every order because a FULL join drops
   * nothing, so the second join produces no item-only row. That says nothing
   * about `o`, which the FIRST join can still extend — the fact is the JOIN's,
   * not any alias's, and what it licenses is that the joins INSIDE S are not
   * extended from above.
   */
  private joinCannotExtendSide(
    j: JoinPredicate,
    scope: Scope,
    side: "left" | "right",
  ): boolean {
    const eq = this.equalityColumnRefs(j.quals);
    if (!eq) return false;
    const extendable = side === "left" ? j.leftAliases : j.rightAliases;
    const other = side === "left" ? j.rightAliases : j.leftAliases;

    for (const [refCol, targetCol] of [
      [eq[0], eq[1]],
      [eq[1], eq[0]],
    ] as const) {
      if (!extendable.includes(targetCol.alias)) continue;
      if (!other.includes(refCol.alias)) continue;
      const referencing = scope.aliases.get(refCol.alias);
      const referenced = scope.aliases.get(targetCol.alias);
      if (!referencing || !referenced) continue;
      if (!this.subtreeAlwaysPresent(scope, other, refCol.alias)) continue;
      if (!this.subtreePreserves(scope.joins, extendable, targetCol.alias, scope)) continue;
      const referencingKey = this.keyedRelation(referencing);
      const referencedKey = this.keyedRelation(referenced);
      if (!referencingKey || !referencedKey) continue;
      // Same translation as the join-level reading — the qual is in the
      // query's names and the key is in the catalog's.
      const refCat2 = this.entryCatalogColumn(referencing, refCol.column);
      const tgtCat2 = this.entryCatalogColumn(referenced, targetCol.column);
      if (refCat2 === undefined || tgtCat2 === undefined) continue;
      if (!this.keyEntails(referencingKey, refCat2, referencedKey, tgtCat2)) {
        continue;
      }
      return true;
    }
    return false;
  }

  /**
   * A qual that is EXACTLY `alias.col = alias.col`, as its two qualified
   * column references. Null for anything else — including a conjunction that
   * merely contains one, since the other conjuncts filter.
   */
  private equalityColumnRefs(
    qual: Node | null | undefined,
  ): [{ alias: string; column: string }, { alias: string; column: string }] | null {
    // A join with no qual answers null here, which is what every caller
    // already does with "this is not a key equality" — so recording qual-less
    // joins needed no new branch at the three reading sites.
    if (!qual) return null;
    const ae = (qual as Record<string, unknown>)["A_Expr"] as
      | { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node }
      | undefined;
    if (!ae || (ae.kind ?? "AEXPR_OP") !== "AEXPR_OP") return null;
    if ((ae.name ?? []).length !== 1 || this.stringVal(ae.name![0]!) !== "=") return null;
    const left = ae.lexpr ? this.qualifiedColumnRef(ae.lexpr) : null;
    const right = ae.rexpr ? this.qualifiedColumnRef(ae.rexpr) : null;
    return left && right ? [left, right] : null;
  }

  /** A two-part `alias.column` reference, or null. */
  private qualifiedColumnRef(node: Node): { alias: string; column: string } | null {
    const ref = (node as Record<string, unknown>)["ColumnRef"] as
      | { fields?: Node[] }
      | undefined;
    const fields = ref?.fields;
    if (!fields || fields.length !== 2) return null;
    const alias = this.stringVal(fields[0]!);
    const column = this.stringVal(fields[1]!);
    return alias && column ? { alias, column } : null;
  }

  private nextNullGroup(): number {
    return ++this.nullGroupCounter;
  }

  private nextInstance(): number {
    return ++this.instanceCounter;
  }

  /** The columns a single relation contributes, in declaration order. */
  private visibleColumnsOf(
    entry: RelationEntry,
    scope: Scope,
    depth: number,
  ): VisibleColumn[] {
    return this.relationColumnsIntrinsic(entry, scope, depth).map(c => ({
      name: c.name,
      entry,
      merged: null,
    }));
  }

  /**
   * Combine the two sides of a join into the columns it makes visible.
   *
   * Without USING or NATURAL that is simply left-then-right. With them,
   * PostgreSQL emits each merged column ONCE and FIRST, then the left's
   * remaining columns, then the right's — and the constituents' own copies
   * stop being visible, though `a.id` still resolves through the alias map.
   */
  /**
   * A clone of `expr` with every unqualified ColumnRef prefixed by `alias`.
   * Generation expressions render with bare column names of their own table;
   * walking them inside a multi-relation reading scope needs the refs pinned
   * to the entry being read, or an unrelated relation's same-named column
   * could capture them.
   */
  private qualifyColumnRefs(expr: Node, alias: string, entry?: RelationEntry): Node {
    // The expression comes from the CATALOG — a CHECK definition, a generation
    // expression — so its bare column refs are catalog names. The scope it is
    // about to be compared against speaks the names the FROM item ANSWERS TO,
    // and under an alias column list those differ. Renaming here is what keeps
    // the two sides comparable: the entailment kernel matches a goal against a
    // CHECK syntactically, and `st.weight_kg` resolves to nothing in a scope
    // that only knows `st.k5`.
    const shown = entry?.columnAliases
      ? new Map((entry.table?.columns ?? []).map((c, i) => [c, entry.columnAliases![i] ?? c]))
      : null;
    const clone = structuredClone(expr);
    const rewrite = (node: unknown): void => {
      if (Array.isArray(node)) {
        node.forEach(rewrite);
        return;
      }
      if (!node || typeof node !== "object") return;
      const obj = node as Record<string, unknown>;
      const cr = obj["ColumnRef"] as { fields?: Node[] } | undefined;
      if (cr?.fields?.length === 1) {
        const bare = this.stringVal(cr.fields[0]!);
        const name = shown?.get(bare) ?? bare;
        cr.fields = [
          { String: { sval: alias } } as unknown as Node,
          { String: { sval: name } } as unknown as Node,
        ];
        return;
      }
      Object.values(obj).forEach(rewrite);
    };
    rewrite(clone);
    return clone;
  }

  /** A synthesized `l.a = r.b` A_Expr for the USING/NATURAL conjuncts. */
  private syntheticEquality(
    leftAlias: string,
    leftCol: string,
    rightAlias: string,
    rightCol: string,
  ): Node {
    const col = (alias: string, name: string): unknown => ({
      ColumnRef: { fields: [{ String: { sval: alias } }, { String: { sval: name } }] },
    });
    return {
      A_Expr: {
        kind: "AEXPR_OP",
        name: [{ String: { sval: "=" } }],
        lexpr: col(leftAlias, leftCol),
        rexpr: col(rightAlias, rightCol),
      },
    } as unknown as Node;
  }

  private mergeJoinColumns(
    join: JoinExpr,
    left: VisibleColumn[],
    right: VisibleColumn[],
  ): VisibleColumn[] {
    let mergedNames: string[];
    if (join.usingClause && join.usingClause.length > 0) {
      mergedNames = join.usingClause.map(n => this.stringVal(n));
    } else if (join.isNatural) {
      // NATURAL is USING over every commonly-named column, in left order.
      const rightNames = new Set(right.map(c => c.name));
      mergedNames = left.filter(c => rightNames.has(c.name)).map(c => c.name);
    } else {
      return [...left, ...right];
    }
    if (mergedNames.length === 0) return [...left, ...right];

    const isMerged = new Set(mergedNames);
    const merged: VisibleColumn[] = [];
    for (const name of mergedNames) {
      const l = left.find(c => c.name === name);
      const r = right.find(c => c.name === name);
      // A USING name that does not exist on both sides is a query PostgreSQL
      // rejects; keep whatever we can rather than inventing a column.
      if (!l?.entry || !r?.entry) {
        if (l ?? r) merged.push((l ?? r)!);
        continue;
      }
      merged.push({
        name,
        entry: null,
        merged: { left: l.entry, right: r.entry, jointype: join.jointype ?? "JOIN_INNER" },
      });
    }
    return [
      ...merged,
      ...left.filter(c => !isMerged.has(c.name)),
      ...right.filter(c => !isMerged.has(c.name)),
    ];
  }

  /**
   * Nullability of a merged USING/NATURAL column.
   *
   * Every row of the join has at least one side present and the column is
   * drawn from whichever that is, so the rule follows from which sides are
   * guaranteed present — not from the join state of either constituent.
   * In a FULL join both sides' columns must be non-null, which makes the
   * merged column strictly less nullable than either of them.
   */
  private mergedColumnNotNull(
    name: string,
    m: MergedColumn,
    scope: Scope,
    depth: number,
  ): boolean {
    // A grouping-set construct blanks its grouping columns in super-aggregate
    // rows whatever the source rows guarantee — the same override the two
    // ordinary ColumnRef sites apply. The merged column is a third resolution
    // route and must not bypass it.
    if (scope.groupingSetColumns.has(name)) return false;
    const side = (entry: RelationEntry): boolean =>
      this.relationColumnsIntrinsic(entry, scope, depth)
        .find(c => c.name === name)?.notNull ?? false;
    const left = side(m.left);
    const right = side(m.right);
    switch (m.jointype) {
      case "JOIN_LEFT":
        return left;
      case "JOIN_RIGHT":
        return right;
      case "JOIN_FULL":
        return left && right;
      default:
        // INNER: both rows are present and the values are equal by
        // construction, so either side proving non-null is enough.
        return left || right;
    }
  }

  private walkFromItem(
    item: Node,
    joinState: JoinState,
    scope: Scope,
    nullGroup: number,
    unitChain: number[],
    depth: number,
  ): VisibleColumn[] {
    const node = item as Record<string, unknown>;
    if ("RangeVar" in node) {
      const rv = node["RangeVar"] as RangeVar;
      const entry = this.addRangeVar(rv, joinState, scope, nullGroup, unitChain);
      return entry ? this.visibleColumnsOf(entry, scope, depth) : [];
    } else if ("RangeSubselect" in node) {
      const sub = node["RangeSubselect"] as RangeSubselect;
      const aliasName = sub.alias?.aliasname ?? "";
      const colNames = sub.alias?.colnames
        ? sub.alias.colnames.map((n: Node) => this.stringVal(n))
        : [];
      const subEntry: RelationEntry = {
        alias: aliasName,
        kind: "subquery",
        ast: sub.subquery,
        cteColumns: colNames,
        joinState,
        nullGroup,
        unitChain,
        instance: this.nextInstance(),
      };
      scope.aliases.set(aliasName, subEntry);
      return this.visibleColumnsOf(subEntry, scope, depth);
    } else if ("JoinExpr" in node) {
      const join = node["JoinExpr"] as JoinExpr;
      let leftState = joinState;
      let rightState = joinState;
      // The required side keeps the enclosing group; each side that this join
      // makes optional is NULL-extended as its own unit, so it starts a new
      // one — and appends it to the side's unit CHAIN, the ancestry origins
      // carry out for cross-table presence certification.
      let leftGroup = nullGroup;
      let rightGroup = nullGroup;
      let leftChain = unitChain;
      let rightChain = unitChain;
      switch (join.jointype) {
        case "JOIN_INNER":
          break; // both inherit current state and group
        case "JOIN_LEFT":
          rightState = OPTIONAL;
          rightGroup = this.nextNullGroup();
          rightChain = [...unitChain, rightGroup];
          break;
        case "JOIN_RIGHT":
          leftState = OPTIONAL;
          leftGroup = this.nextNullGroup();
          leftChain = [...unitChain, leftGroup];
          break;
        case "JOIN_FULL":
          leftState = OPTIONAL;
          leftGroup = this.nextNullGroup();
          leftChain = [...unitChain, leftGroup];
          rightState = OPTIONAL;
          rightGroup = this.nextNullGroup();
          rightChain = [...unitChain, rightGroup];
          break;
      }
      const aliasesBefore = scope.aliases.size;
      const left = join.larg
        ? this.walkFromItem(join.larg, leftState, scope, leftGroup, leftChain, depth)
        : [];
      const aliasesAfterLeft = scope.aliases.size;
      const right = join.rarg
        ? this.walkFromItem(join.rarg, rightState, scope, rightGroup, rightChain, depth)
        : [];
      // Record the qual with its per-side alias sets (whole subtrees — the
      // Map appends in registration order, so slicing the key list recovers
      // exactly what each side's walk added) for the presence fixpoint.
      // USING / NATURAL joins carry no quals node, but the merge IS an
      // equality on each named column and both owning aliases are known, so
      // the equivalent conjuncts are synthesized — the fixpoint then treats
      // them exactly like ON quals (promotion, narrowing via the guarantee
      // checks, outer-qual implication). A merged name whose side has no
      // concrete owning entry (an already-merged column of a nested USING)
      // is skipped conservatively.
      // A join with NO qual to record is still a join: its type and its two
      // alias sets are what the subtree readings need, and a CROSS JOIN
      // dropping every row of a side is exactly what they exist to see. So
      // `record` runs once per JoinExpr whatever the qual — the structural
      // entry is unconditional and the qual is the optional part.
      const keys = [...scope.aliases.keys()];
      let recorded = false;
      const record = (quals: Node | null): void => {
        recorded = true;
        scope.joins.push({
          jointype: join.jointype ?? "JOIN_INNER",
          quals,
          leftAliases: keys.slice(aliasesBefore, aliasesAfterLeft),
          rightAliases: keys.slice(aliasesAfterLeft),
          incomingRequired: joinState === REQUIRED,
          // Which side THIS join makes optional is its type, not the state the
          // side ends up with: under an ancestor outer join both sides arrive
          // OPTIONAL already, and the FK reading still needs to know which of
          // them this join can extend.
          ...(join.jointype === "JOIN_RIGHT" || join.jointype === "JOIN_FULL"
            ? { leftOptionalGroup: leftGroup }
            : {}),
          ...(join.jointype === "JOIN_LEFT" || join.jointype === "JOIN_FULL"
            ? { rightOptionalGroup: rightGroup }
            : {}),
        });
      };
      if (join.quals) record(join.quals);
      const usingNames =
        join.usingClause && join.usingClause.length > 0
          ? join.usingClause.map(n => this.stringVal(n))
          : join.isNatural
            ? left
                .filter(c => right.some(r => r.name === c.name))
                .map(c => c.name)
            : [];
      if (usingNames.length > 0) {
        const eqs: Node[] = [];
        for (const name of usingNames) {
          const l = left.find(c => c.name === name);
          const r = right.find(c => c.name === name);
          if (!l?.entry || !r?.entry) continue;
          eqs.push(this.syntheticEquality(l.entry.alias, name, r.entry.alias, name));
        }
        if (eqs.length > 0) {
          record(
            eqs.length === 1
              ? eqs[0]!
              : ({ BoolExpr: { boolop: "AND_EXPR", args: eqs } } as unknown as Node),
          );
        }
      }
      // Neither an ON qual nor a synthesizable merge: the join is still
      // recorded, with nothing for the fixpoint to imply. PostgreSQL forbids
      // ON together with USING or NATURAL, so at most one of the two branches
      // above can have fired and this never double-records.
      if (!recorded) record(null);
      return this.mergeJoinColumns(join, left, right);
    } else if ("RangeFunction" in node) {
      const rf = node["RangeFunction"] as RangeFunction;
      const aliasName = rf.alias?.aliasname ?? "";
      const fnEntry: RelationEntry = {
        alias: aliasName,
        kind: "function",
        rangeFunction: rf,
        cteColumns: rf.alias?.colnames
          ? rf.alias.colnames.map((n: Node) => this.stringVal(n))
          : [],
        joinState,
        nullGroup,
        unitChain,
        instance: this.nextInstance(),
      };
      scope.aliases.set(aliasName, fnEntry);
      return this.visibleColumnsOf(fnEntry, scope, depth);
    } else if ("RangeTableFunc" in node) {
      // XMLTABLE(... COLUMNS a int PATH '...', n FOR ORDINALITY)
      const rtf = node["RangeTableFunc"] as RangeTableFunc;
      const cols: { name: string; notNull: boolean }[] = [];
      for (const c of rtf.columns ?? []) {
        const col = (c as Record<string, unknown>)["RangeTableFuncCol"] as
          | { colname?: string; for_ordinality?: boolean; is_not_null?: boolean }
          | undefined;
        if (!col?.colname) continue;
        // FOR ORDINALITY is a generated counter; a column declared NOT NULL is
        // enforced — PostgreSQL raises rather than emitting NULL.
        cols.push({ name: col.colname, notNull: !!col.for_ordinality || !!col.is_not_null });
      }
      return this.addColumnListRelation(rtf.alias?.aliasname ?? "", cols, rtf.alias?.colnames, joinState, scope, nullGroup, unitChain);
    } else if ("JsonTable" in node) {
      // JSON_TABLE(... COLUMNS (n FOR ORDINALITY, a int PATH '...', NESTED ...))
      const jt = node["JsonTable"] as JsonTable;
      const cols: { name: string; notNull: boolean }[] = [];
      this.collectJsonTableColumns(jt.columns, cols);
      return this.addColumnListRelation(jt.alias?.aliasname ?? "", cols, jt.alias?.colnames, joinState, scope, nullGroup, unitChain);
    } else if ("RangeTableSample" in node) {
      // The sampled relation is walked as itself — its COLUMNS are the
      // relation's, and the shape does not change. What changes is which ROWS
      // are there, and that has to be recorded or the alias silently keeps
      // standing for the whole table (sweep-4 finding 3).
      const rts = node["RangeTableSample"] as { relation?: Node };
      if (!rts.relation) return [];
      const before = new Set(scope.aliases.values());
      const cols = this.walkFromItem(rts.relation, joinState, scope, nullGroup, unitChain, depth);
      for (const entry of scope.aliases.values()) {
        if (!before.has(entry)) entry.sampled = true;
      }
      return cols;
    } else {
      // An unrecognised FROM item contributes no columns and no alias, so
      // `SELECT *` over it silently loses them. A shape defect, not a flag.
      const tag = this.nodeTag(node);
      this.onUnhandled?.("from-item", tag);
      throw new UnsupportedNodeError("from-item", tag);
    }
    return [];
  }

  /**
   * Register a FROM item whose columns are spelled out in the query itself
   * (XMLTABLE / JSON_TABLE COLUMNS lists) rather than resolved from a catalog
   * entry. Reuses the table-function entry kind with the column list
   * precomputed.
   */
  private addColumnListRelation(
    aliasName: string,
    columns: { name: string; notNull: boolean }[],
    aliasColnames: Node[] | undefined,
    joinState: JoinState,
    scope: Scope,
    nullGroup: number,
    unitChain: number[],
  ): VisibleColumn[] {
    const names = aliasColnames?.map(n => this.stringVal(n)) ?? [];
    const entry: RelationEntry = {
      alias: aliasName,
      kind: "function",
      functionColumns: columns.map((c, i) => ({ name: names[i] ?? c.name, notNull: c.notNull })),
      joinState,
      nullGroup,
      unitChain,
      instance: this.nextInstance(),
    };
    scope.aliases.set(aliasName, entry);
    return entry.functionColumns!.map(c => ({ name: c.name, entry, merged: null }));
  }

  /**
   * Flatten a JSON_TABLE COLUMNS list. NESTED PATH columns are spliced into
   * the same output row, so they contribute alongside their siblings.
   *
   * Only FOR ORDINALITY is non-null, and only OUTSIDE a NESTED PATH. A regular
   * column is NULL when its path matches nothing, and an EXISTS column can
   * still yield NULL under `UNKNOWN ON ERROR`.
   *
   * **A NESTED PATH is an OUTER JOIN against the level above it** (sweep-4
   * finding 5), which is what an ordinality counter inside one cannot survive:
   * the counter is generated for every row of its OWN path, and PostgreSQL
   * emits rows that path did not produce. Four ways in, all measured:
   *
   *   - a SIBLING nested path — the two are unioned, so a row from `$.a[*]`
   *     carries NULL in every column of `$.b[*]`, ordinality included;
   *   - the path matching NOTHING (an empty array, or a key absent from the
   *     document) — the parent row still comes back, with the counter NULL,
   *     and this needs no sibling at all;
   *   - the same one level down: a nested path INSIDE another whose inner
   *     array is empty for one outer element;
   *   - either of the above beside an ordinary root column.
   *
   * So the boundary is "inside a NESTED PATH", not "has a sibling" — the
   * sibling reading was the shape the sweep happened to falsify first, and it
   * is sound only over paths that always match. A ROOT-level counter is not
   * affected however many NESTED siblings it has: it counts the root's rows
   * and is present on every one of them (measured).
   */
  private collectJsonTableColumns(
    columns: Node[] | undefined,
    out: { name: string; notNull: boolean }[],
    nested = false,
  ): void {
    for (const c of columns ?? []) {
      const col = (c as Record<string, unknown>)["JsonTableColumn"] as
        | { coltype?: string; name?: string; columns?: Node[] }
        | undefined;
      if (!col) continue;
      if (col.coltype === "JTC_NESTED") {
        this.collectJsonTableColumns(col.columns, out, true);
        continue;
      }
      if (!col.name) continue;
      out.push({ name: col.name, notNull: !nested && col.coltype === "JTC_FOR_ORDINALITY" });
    }
  }

  private addRangeVar(
    rv: RangeVar,
    joinState: JoinState,
    scope: Scope,
    nullGroup: number,
    unitChain: number[] = [],
  ): RelationEntry | null {
    const aliasName = rv.alias?.aliasname ?? rv.relname;

    // Check if it's a CTE — search this scope and all outer scopes.
    // CTEs defined in a parent scope's WITH clause are visible to child
    // scopes (e.g., CTEs in the outer query are visible in subqueries).
    const cte = this.findCte(rv.relname, scope);
    if (cte) {
      const cteEntry: RelationEntry = {
        alias: aliasName,
        kind: "cte",
        ast: cte.ast,
        cteColumns: cte.columns,
        extraColumns: cte.extraColumns,
        joinState,
        nullGroup,
        unitChain,
        instance: this.nextInstance(),
      };
      scope.aliases.set(aliasName, cteEntry);
      return cteEntry;
    }

    // Resolve from catalog.
    const table = this.catalog.resolveTable(rv.schemaname ?? undefined, rv.relname);
    if (table) {
      // A view's own catalog columns are always attnotnull=false, so prefer
      // its parsed definition when we have one and analyze it as a subquery.
      const viewAst = this.catalog.viewAsts.get(`${table.schema}.${table.name}`);
      const entry: RelationEntry = {
        alias: aliasName,
        kind: table.schema === "" ? "cte" : viewAst ? "view" : "table",
        table,
        ...(rv.alias?.colnames && rv.alias.colnames.length > 0
          ? { columnAliases: rv.alias.colnames.map((n: Node) => this.stringVal(n)) }
          : {}),
        ast: viewAst,
        // libpg-query emits `inh: true` for a plain reference and omits the
        // field for ONLY (measured).
        scanInh: rv.inh === true,
        joinState,
        nullGroup,
        unitChain,
        instance: this.nextInstance(),
      };
      scope.aliases.set(aliasName, entry);
      return entry;
    }

    // A relation the snapshot does not capture: a temporary table,
    // pg_catalog, information_schema, or something that does not exist at
    // all. A zero-column entry here once let star expansion silently drop
    // its columns — measured silent in seven placements — which is exactly
    // what the dispatch-site rule forbids at a FROM item: contributing the
    // wrong columns is worse than refusing. The caller's documented escape
    // (it runs PREPARE anyway) is to treat every column as nullable.
    // Partitioned and foreign tables are captured (relkind 'p'/'f') and
    // resolve above rather than landing here.
    throw new UnsupportedNodeError(
      "from-item",
      `unresolvable relation ${rv.schemaname ? `${rv.schemaname}.` : ""}${rv.relname}`,
    );
  }

  // -------------------------------------------------------------------------
  // INSERT / UPDATE / DELETE RETURNING
  // -------------------------------------------------------------------------

  /**
   * The write-path rewriting hooks on a DML statement's target relation —
   * for the relation SET the write can land in. The trigger that rewrites
   * a row is the trigger of the relation the row LIVES in: an INSERT
   * through a partitioned parent fires the PARTITION's BEFORE ROW trigger,
   * and an UPDATE through an inheritance parent fires the CHILD's for
   * child rows (both measured), so a plain reference takes the subtree
   * union. `ONLY` pins the write to the named relation, whose own hooks
   * are then the right question. (An INSERT target carries `inh: true`,
   * which is exactly right here: routing is real for partitioned parents,
   * and for plain inheritance the childless-vs-tree distinction costs only
   * precision on trigger-bearing children an INSERT can never reach.)
   */
  private targetWriteRewrites(relation: Node | undefined): {
    beforeRow: ReadonlySet<string>;
    insteadOf: ReadonlySet<string>;
    insteadRules: ReadonlySet<string>;
  } {
    const rv = relation as unknown as RangeVar | undefined;
    return rv?.inh === true
      ? this.catalog.resolveWriteRewritesTree(rv?.schemaname ?? undefined, rv?.relname ?? "")
      : this.catalog.resolveWriteRewrites(rv?.schemaname ?? undefined, rv?.relname ?? "");
  }

  /**
   * Whether an UPDATE (or MERGE update arm) on this target can have its row
   * rewritten by a BEFORE ROW trigger. Per-command for ordinary targets —
   * but an UPDATE through a PARTITIONED parent can MOVE a row across
   * partitions, which PostgreSQL performs as DELETE + INSERT and which
   * fires the DESTINATION partition's BEFORE **INSERT** triggers on the new
   * row (measured: the routed row came back with its written value nulled
   * by a trigger declared BEFORE INSERT). The tree union collapses which
   * member contributed which command, but the question stays per-command —
   * so for a partitioned target it is `beforeRow ∩ {update, insert}`.
   * Plain inheritance never routes and keeps the single-command test.
   */
  private updateBeforeRowHazard(
    relation: Node | undefined,
    wr: { beforeRow: ReadonlySet<string> },
  ): boolean {
    if (wr.beforeRow.has("update")) return true;
    const rv = relation as unknown as RangeVar | undefined;
    return (
      wr.beforeRow.has("insert") &&
      this.catalog.resolveIsPartitioned(rv?.schemaname ?? undefined, rv?.relname ?? "")
    );
  }

  /**
   * A DO INSTEAD rule replaces the statement outright, and RETURNING then
   * reports the RULE's query — possibly against a different table, with
   * values the engine never saw (measured: the redirected INSERT returns the
   * other table's NULL). That is a statement the analysis was not given, so
   * the dispatch-site rule applies: refuse rather than answer for the wrong
   * statement. Without RETURNING there is nothing to misreport and the
   * caller gets its usual empty list.
   */
  private refuseInsteadRule(relation: Node | undefined, command: string): void {
    if (this.targetWriteRewrites(relation).insteadRules.has(command)) {
      const rv = relation as unknown as RangeVar | undefined;
      throw new UnsupportedNodeError(
        "statement",
        `DO INSTEAD rule (ON ${command.toUpperCase()}) on ${rv?.relname ?? "?"}`,
      );
    }
  }

  private analyzeInsert(
    stmt: InsertStmt,
    outerScope: Scope | null,
    depth: number,
  ): OutputNullability[] {
    if (!stmt.returningClause) return [];
    const scope = this.buildInsertScope(stmt, outerScope, depth);
    return this.analyzeReturning(stmt.returningClause, scope, depth, stmt);
  }

  /**
   * The complete RETURNING scope for an INSERT. One builder per DML
   * statement type, shared verbatim by the traced and untraced walks — the
   * traced path once rebuilt these scopes by hand and silently lost the
   * WHERE channel and both DML column maps, so sharing is the parity
   * mechanism, not a convenience.
   */
  private buildInsertScope(stmt: InsertStmt, outerScope: Scope | null, depth: number): Scope {
    // In the builder rather than the analyzer so the traced walk shares the
    // refusal by construction — it calls the builders directly, and both
    // entry points reach here only when a RETURNING clause exists.
    this.refuseInsteadRule(stmt.relation, "insert");
    const scope = this.buildDmlScope(stmt.relation, outerScope, depth);
    // The parser marks an INSERT target `inh: true`, but an INSERT stores
    // its rows in the named relation itself — inheritance never routes a
    // write (measured: INSERT INTO inh_p lands in ONLY inh_p, and the
    // parent's own NOT NULL rejects a NULL). So RETURNING reads the named
    // relation's flags, not the tree conjunction. Tuple routing is a
    // partitioned-table mechanism, where partitions provably carry the
    // parent's constraints and the two flags agree.
    for (const entry of scope.aliases.values()) entry.scanInh = false;
    this.registerCtes(stmt.withClause, scope);
    // A BEFORE ROW trigger may replace NEW wholesale after the statement's
    // values were chosen (measured: NEW.a := NULL comes back through
    // RETURNING), so the written-value map describes a row that may never be
    // stored — void it and drop to catalog flags, which the stored row still
    // satisfies. The conflict arm goes through the UPDATE path, so its
    // trigger counts exactly when that arm exists. An INSTEAD OF trigger
    // (view target) reports whatever NEW it builds, with the view's own
    // definition expressions never evaluated (measured: a literal view
    // column comes back NULL) — so the view analysis is void too, and the
    // catalog flags the entry falls back to are the view's own, all false.
    const wr = this.targetWriteRewrites(stmt.relation);
    const conflictUpdates = !!(stmt.onConflictClause as { targetList?: Node[] } | undefined)
      ?.targetList;
    const commands = ["insert", ...(conflictUpdates ? ["update"] : [])];
    if (commands.some(cmd => wr.insteadOf.has(cmd))) {
      for (const entry of scope.aliases.values()) entry.ast = undefined;
    }
    if (commands.some(cmd => wr.beforeRow.has(cmd) || wr.insteadOf.has(cmd))) {
      return scope;
    }
    this.attachInsertWrittenColumns(stmt, scope, depth);
    return scope;
  }

  /**
   * The written-value map for INSERT … RETURNING: per target column, whether
   * the value actually written is provably non-null on every path that can
   * produce a returned row. VALUES rows reduce by intersection; INSERT …
   * SELECT reads the source's own analysis positionally (plain shape only —
   * a set operation underneath contributes nothing); columns absent from
   * the column list take their DEFAULT and keep the catalog. ON CONFLICT DO
   * UPDATE adds a second producing path, so each column intersects with it:
   * a SET column contributes its expression (`excluded` references resolve
   * to nothing and stay conservative), a non-SET column is the EXISTING
   * row's value and contributes nothing. DO NOTHING returns only inserted
   * rows and changes nothing.
   */
  private attachInsertWrittenColumns(
    stmt: InsertStmt,
    scope: Scope,
    depth: number,
  ): void {
    const entry = [...scope.aliases.values()][0];
    if (!entry?.table) return;
    const columns = stmt.cols
      ? stmt.cols.map(c => (c as { ResTarget?: { name?: string } }).ResTarget?.name ?? "")
      : entry.table.columns;

    const select = (stmt.selectStmt as { SelectStmt?: Record<string, unknown> } | undefined)
      ?.SelectStmt;
    if (!select) return;
    const written = new Map<string, boolean>();

    // The source is walked with the DML scope as its outer, NOT the
    // statement's own outer: the WITH clause's CTEs are registered on the
    // DML scope, and `WITH w AS (…) INSERT … SELECT … FROM w` must resolve
    // `w` there. (The zero-column fallback used to absorb the miss
    // silently; the refusal made it visible.) A source that referenced the
    // target's alias would be invalid SQL, so the extra visibility is
    // unreachable.
    const valuesLists = select["valuesLists"] as Node[] | undefined;
    if (valuesLists?.length) {
      columns.forEach((col, i) => {
        if (!col) return;
        const cellsNotNull = valuesLists.every(row => {
          const cell = ((row as { List?: { items?: Node[] } }).List?.items ?? [])[i];
          return !!cell && this.walkExpr(cell, this.emptyScope(scope), depth + 1);
        });
        written.set(col, cellsNotNull);
      });
    } else if (select["op"] === "SETOP_NONE" && select["targetList"]) {
      const innerResults = this.analyzeStatement(stmt.selectStmt!, scope, depth + 1);
      columns.forEach((col, i) => {
        if (col) written.set(col, innerResults[i]?.notNull === true);
      });
    } else {
      return;
    }

    const conflict = stmt.onConflictClause as
      | { action?: string; targetList?: Node[] }
      | undefined;
    if (conflict?.action === "ONCONFLICT_UPDATE") {
      const setNotNull = new Map<string, boolean>();
      this.dmlOldRowRead = true;
      try {
        for (const item of conflict.targetList ?? []) {
          const rt = (item as { ResTarget?: { name?: string; val?: Node } }).ResTarget;
          if (!rt?.name || !rt.val) continue;
          if ("MultiAssignRef" in (rt.val as Record<string, unknown>)) continue;
          setNotNull.set(rt.name, this.walkExpr(rt.val, scope, depth + 1));
        }
      } finally {
        this.dmlOldRowRead = false;
      }
      for (const [col, insertPath] of written) {
        written.set(col, insertPath && (setNotNull.get(col) ?? false));
      }
    }

    scope.dmlWrittenColumns = { alias: entry.alias, columns: written };
  }

  private analyzeUpdate(
    stmt: UpdateStmt,
    outerScope: Scope | null,
    depth: number,
  ): OutputNullability[] {
    if (!stmt.returningClause) return [];
    const scope = this.buildUpdateScope(stmt, outerScope, depth);
    return this.analyzeReturning(stmt.returningClause, scope, depth, stmt);
  }

  /** The complete RETURNING scope for an UPDATE — see buildInsertScope. */
  private buildUpdateScope(stmt: UpdateStmt, outerScope: Scope | null, depth: number): Scope {
    this.refuseInsteadRule(stmt.relation, "update");
    const scope = this.buildDmlScope(stmt.relation, outerScope, depth);
    this.registerCtes(stmt.withClause, scope);

    // UPDATE...FROM: add FROM clause relations too. The target is joined to
    // them with inner-join semantics — a target row with no match in the FROM
    // list is simply not updated, so it never appears NULL-extended in
    // RETURNING. The relations are therefore REQUIRED, not OPTIONAL. (Outer
    // joins *within* the FROM list are still handled by walkFromItem.)
    if (stmt.fromClause) {
      for (const item of stmt.fromClause) {
        scope.visible.push(...this.walkFromItem(item, REQUIRED, scope, this.nextNullGroup(), [], depth));
      }
    }

    // Every RETURNING row is an affected row, which passed the WHERE — and
    // RETURNING cannot contain aggregates, so the zero-input hazard behind
    // rowsImplyWhere does not exist here. The SET columns are the one
    // exception (old row vs new row) and are masked via dmlSetColumns.
    scope.whereClause = stmt.whereClause;
    scope.rowsImplyWhere = true;
    // A BEFORE ROW / INSTEAD OF UPDATE trigger may replace ANY column of
    // NEW, not just the SET ones (measured), so the OLD-row evidence
    // transfer the SET mask licenses — "non-SET columns keep their WHERE-
    // tested values" — holds for no column at all: the mask becomes every
    // target column, the written-value map is void, and an INSTEAD OF view
    // target additionally loses its definition analysis (RETURNING reports
    // the trigger's NEW verbatim — measured, a literal view column comes
    // back NULL). Catalog flags survive for tables: the stored row still
    // passes its constraints.
    const wr = this.targetWriteRewrites(stmt.relation);
    const rewriting = this.updateBeforeRowHazard(stmt.relation, wr) || wr.insteadOf.has("update");
    if (wr.insteadOf.has("update")) {
      for (const entry of scope.aliases.values()) entry.ast = undefined;
    }
    const targetAlias = [...scope.aliases.keys()][0];
    const targetEntry = targetAlias !== undefined ? scope.aliases.get(targetAlias) : undefined;
    if (targetAlias !== undefined) {
      const setColumns = new Set<string>();
      if (rewriting) {
        for (const col of targetEntry?.table?.columns ?? []) setColumns.add(col);
      } else {
        for (const item of stmt.targetList ?? []) {
          const name = (item as { ResTarget?: { name?: string } }).ResTarget?.name;
          if (name) setColumns.add(name);
        }
      }
      scope.dmlSetColumns = { alias: targetAlias, columns: setColumns };
    }
    this.resolveJoinImplications(scope);

    // RETURNING reports the NEW row, so a SET column's returned value IS its
    // SET expression — walked with the predicate mask already in place (the
    // expression reads the OLD row, where the guarantees would in fact hold;
    // conservative, never wrong). Attached after the walk so the expressions
    // themselves cannot consult the map they are defining.
    if (targetAlias !== undefined && !rewriting) {
      const written = new Map<string, boolean>();
      this.dmlOldRowRead = true;
      try {
        for (const item of stmt.targetList ?? []) {
          const rt = (item as { ResTarget?: { name?: string; val?: Node } }).ResTarget;
          if (!rt?.name || !rt.val) continue;
          if ("MultiAssignRef" in (rt.val as Record<string, unknown>)) continue;
          written.set(rt.name, this.walkExpr(rt.val, scope, depth + 1));
        }
      } finally {
        this.dmlOldRowRead = false;
      }
      scope.dmlWrittenColumns = { alias: targetAlias, columns: written };
    }

    return scope;
  }

  private analyzeDelete(
    stmt: DeleteStmt,
    outerScope: Scope | null,
    depth: number,
  ): OutputNullability[] {
    if (!stmt.returningClause) return [];
    const scope = this.buildDeleteScope(stmt, outerScope, depth);
    return this.analyzeReturning(stmt.returningClause, scope, depth, stmt);
  }

  /** The complete RETURNING scope for a DELETE — see buildInsertScope. */
  private buildDeleteScope(stmt: DeleteStmt, outerScope: Scope | null, depth: number): Scope {
    // Triggers cannot rewrite a DELETE's RETURNING row: a modified OLD is
    // ignored for both BEFORE and INSTEAD OF triggers, and the reported row
    // is the row as read (measured — including the view-definition values
    // through an INSTEAD OF DELETE). Only the rule refusal applies.
    this.refuseInsteadRule(stmt.relation, "delete");
    const scope = this.buildDmlScope(stmt.relation, outerScope, depth);
    this.registerCtes(stmt.withClause, scope);

    // DELETE...USING: add USING clause relations. Same inner-join semantics as
    // UPDATE...FROM — an unmatched target row is not deleted, so USING columns
    // are never NULL-extended in RETURNING.
    if (stmt.usingClause) {
      for (const item of stmt.usingClause) {
        scope.visible.push(...this.walkFromItem(item, REQUIRED, scope, this.nextNullGroup(), [], depth));
      }
    }
    // Same reasoning as UPDATE: deleted rows all passed the WHERE, RETURNING
    // has no aggregates — and DELETE has no SET, so no column is masked.
    scope.whereClause = stmt.whereClause;
    scope.rowsImplyWhere = true;
    this.resolveJoinImplications(scope);
    return scope;
  }

  /**
   * MERGE ... RETURNING.
   *
   * The target is the row actually written, so it keeps the catalog's
   * nullability. The *source* is optional: `WHEN NOT MATCHED BY SOURCE`
   * fires for target rows with no source match, and RETURNING then reports
   * NULL for every source column — including a primary key or a NOT NULL
   * column. Treating the source as REQUIRED would be unsound.
   */
  private analyzeMerge(
    stmt: MergeStmt,
    outerScope: Scope | null,
    depth: number,
  ): OutputNullability[] {
    if (!stmt.returningClause) return [];
    const scope = this.buildMergeScope(stmt, outerScope, depth);
    return this.analyzeReturning(stmt.returningClause, scope, depth, stmt);
  }

  private buildMergeScope(stmt: MergeStmt, outerScope: Scope | null, depth: number): Scope {
    const scope = this.buildDmlScope(stmt.relation, outerScope, depth);
    this.registerCtes(stmt.withClause, scope);

    interface MergeArm {
      matchKind?: string;
      commandType?: string;
      targetList?: Node[];
      values?: Node[];
    }
    const arms = (stmt.mergeWhenClauses ?? [])
      .map(c => (c as { MergeWhenClause?: MergeArm }).MergeWhenClause)
      .filter((a): a is MergeArm => !!a);

    // The target's BEFORE ROW / INSTEAD OF triggers rewrite MERGE's insert
    // and update arms exactly as they do the standalone statements; a
    // DELETE arm returns the row as stored and is immune (measured). Rules
    // on a MERGE target are refused by PostgreSQL itself. At this point the
    // scope holds only the target entry, so the ast strip cannot touch the
    // source added below.
    const wrTarget = this.targetWriteRewrites(stmt.relation);
    const armCommands = new Set<string>(
      arms.map(a =>
        a.commandType === "CMD_INSERT" ? "insert" : a.commandType === "CMD_UPDATE" ? "update" : "",
      ),
    );
    const rewriteCmds = ["insert", "update"].filter(cmd => armCommands.has(cmd));
    // An update arm on a partitioned target carries the row-movement
    // INSERT hazard too — see updateBeforeRowHazard. (With an insert arm
    // present the insert triggers are already in the test.)
    const targetRewriting =
      rewriteCmds.some(cmd => wrTarget.beforeRow.has(cmd) || wrTarget.insteadOf.has(cmd)) ||
      (armCommands.has("update") && this.updateBeforeRowHazard(stmt.relation, wrTarget));
    if (rewriteCmds.some(cmd => wrTarget.insteadOf.has(cmd))) {
      for (const entry of scope.aliases.values()) entry.ast = undefined;
    }

    // Only a NOT MATCHED BY SOURCE arm can null-extend the source: every
    // other row-producing arm either matched it (MATCHED) or was driven by
    // it (NOT MATCHED BY TARGET's INSERT). Without such an arm the source is
    // REQUIRED and its columns keep base nullability.
    const hasBySource = arms.some(a => a.matchKind === "MERGE_WHEN_NOT_MATCHED_BY_SOURCE");
    if (stmt.sourceRelation) {
      const sourceGroup = this.nextNullGroup();
      // PostgreSQL expands MERGE's `RETURNING *` SOURCE FIRST, then the
      // target (measured) — the opposite of UPDATE … FROM and DELETE …
      // USING, which are target-first. The target's columns are already in
      // place from buildDmlScope, so the source's go in ahead of them.
      // Qualified stars (`RETURNING ck.*`) resolve through `aliases` and are
      // unaffected either way.
      scope.visible.unshift(
        ...this.walkFromItem(
          stmt.sourceRelation,
          hasBySource ? OPTIONAL : REQUIRED,
          scope,
          sourceGroup,
          hasBySource ? [sourceGroup] : [],
          depth,
        ),
      );
    }

    // When EVERY arm is MATCHED-kind, every returned row satisfied the join
    // condition — the NOT MATCHED arms that fire precisely on its failure do
    // not exist — so it is row-implied evidence like a DML WHERE: parameters
    // narrow (RETURNING has no aggregates), columns promote, with the SET
    // columns of the UPDATE arms masked (the condition tested the OLD row).
    const allMatched = arms.length > 0 && arms.every(a => a.matchKind === "MERGE_WHEN_MATCHED");
    if (allMatched && stmt.joinCondition) {
      scope.whereClause = stmt.joinCondition;
      scope.rowsImplyWhere = true;
      const targetAlias = [...scope.aliases.keys()][0];
      if (targetAlias !== undefined) {
        const setColumns = new Set<string>();
        if (targetRewriting) {
          // The trigger may replace ANY column of NEW, so the join-condition
          // evidence transfers through none of them — same as UPDATE.
          for (const col of scope.aliases.get(targetAlias)?.table?.columns ?? []) {
            setColumns.add(col);
          }
        } else {
          for (const a of arms) {
            for (const item of a.targetList ?? []) {
              const name = (item as { ResTarget?: { name?: string } }).ResTarget?.name;
              if (name) setColumns.add(name);
            }
          }
        }
        scope.dmlSetColumns = { alias: targetAlias, columns: setColumns };
      }
    }
    // Written values, per-arm intersection: a returned row can come from
    // any row-producing arm, so a target column's written value is provably
    // non-null only when EVERY such arm writes it non-null. UPDATE arms
    // contribute their SET expressions (walked with the source visible),
    // INSERT arms their positional values against their own column list; a
    // column an arm does not write is the existing/default value and
    // contributes nothing; a DELETE arm returns the OLD row, which voids
    // the whole map; DO NOTHING produces no row and is excluded.
    const producing = arms.filter(a => a.commandType !== "CMD_NOTHING");
    const targetAliasW = [...scope.aliases.keys()][0];
    if (
      targetAliasW !== undefined &&
      !targetRewriting &&
      producing.length > 0 &&
      producing.every(a => a.commandType === "CMD_UPDATE" || a.commandType === "CMD_INSERT")
    ) {
      const perArm: Map<string, boolean>[] = producing.map(a => {
        const armMap = new Map<string, boolean>();
        if (a.commandType === "CMD_UPDATE") {
          this.dmlOldRowRead = true;
          try {
            for (const item of a.targetList ?? []) {
              const rt = (item as { ResTarget?: { name?: string; val?: Node } }).ResTarget;
              if (!rt?.name || !rt.val) continue;
              if ("MultiAssignRef" in (rt.val as Record<string, unknown>)) continue;
              armMap.set(rt.name, this.walkExpr(rt.val, scope, depth + 1));
            }
          } finally {
            this.dmlOldRowRead = false;
          }
        } else {
          const columns = (a.targetList ?? []).map(
            t => (t as { ResTarget?: { name?: string } }).ResTarget?.name ?? "",
          );
          (a.values ?? []).forEach((val, i) => {
            const col = columns[i];
            if (col) armMap.set(col, this.walkExpr(val, scope, depth + 1));
          });
        }
        return armMap;
      });
      const written = new Map<string, boolean>();
      for (const [col] of perArm[0] ?? []) {
        written.set(col, perArm.every(m => m.get(col) === true));
      }
      scope.dmlWrittenColumns = { alias: targetAliasW, columns: written };
    }
    // A join written directly as the MERGE source with a BY SOURCE arm is
    // walked OPTIONAL, so the fixpoint's incoming-presence condition keeps
    // its quals un-implied — deliberate, not an oversight.
    this.resolveJoinImplications(scope);
    return scope;
  }

  private buildDmlScope(
    relation: Node | undefined,
    outerScope: Scope | null,
    depth: number,
  ): Scope {
    const scope: Scope = {
      aliases: new Map(),
      ctes: new Map(),
      joins: [],
      impliedQuals: [],
      visible: [],
      rowsImplyWhere: false,
      groupGuaranteesNonEmpty: false,
      groupingSetColumns: EMPTY_STRING_SET,
      outer: outerScope,
      results: null,
    };
    if (relation) {
      const rv = relation as unknown as RangeVar;
      if (rv.relname) {
        const entry = this.addRangeVar(rv, REQUIRED, scope, this.nextNullGroup());
        if (entry) scope.visible.push(...this.visibleColumnsOf(entry, scope, depth));
      }
    }
    return scope;
  }

  private analyzeReturning(
    returningClause: Node,
    scope: Scope,
    depth: number,
    stmtKey?: object,
  ): OutputNullability[] {
    const ret = returningClause as { exprs?: Node[] };
    // A DML statement's FROM/USING/source can outer-join (UPDATE … FROM a
    // LEFT JOIN b; MERGE's optional source), so RETURNING records producers
    // for presence groups exactly like a SELECT's target list. `stmtKey` is
    // the enclosing statement object — supplied by the four statement
    // analyzers so a data-modifying CTE's groups are liftable, and absent
    // for function-body DML analysis, which computes a value, not a
    // contract.
    const producers: ({ entry: RelationEntry; column: string; ordinal?: number } | null)[] = [];
    const results: OutputNullability[] = [];
    for (const target of ret.exprs ?? []) {
      const rt = this.unwrapResTarget(target);
      const val = rt.val;
      const name = rt.name;
      if (!val) {
        results.push({ name: name ?? "", notNull: false });
        producers.push(null);
        continue;
      }
      if (this.isStarColumn(val)) {
        const expanded = this.expandStar(val, scope, depth, true, producers);
        for (const e of expanded) results.push(e);
        continue;
      }
      const compositeStar = this.expandCompositeStar(val, scope, depth);
      if (compositeStar) {
        for (const e of compositeStar) {
          results.push(e);
          producers.push(null);
        }
        continue;
      }
      // RETURNING rows ARE stored rows (Wave 12): the NEW row an
      // INSERT/UPDATE wrote, the OLD row a DELETE removed — every one
      // CHECK-satisfying at the moment it was stored — so bare column
      // pass-throughs carry origins like any SELECT's. (PG18 OLD./NEW.
      // qualifications resolve to no scope entry and stay origin-free.)
      const notNull = this.walkExpr(val, scope, depth + 1);
      const bare = this.resolveBareColumnTarget(val, scope);
      producers.push(bare);
      const og = bare ? this.originOf(bare.entry, bare.column, scope, depth) : undefined;
      results.push(
        og
          ? {
              name: name ?? this.inferName(val),
              notNull,
              origins: og.origins,
              ...(og.settled ? { originNotNull: og.settled } : {}),
            }
          : { name: name ?? this.inferName(val), notNull },
      );
    }
    if (stmtKey) {
      const groups = this.computePresenceGroups(producers, results, scope, depth);
      this.groupCache.set(stmtKey, groups);
      if (depth === 0) this.rootPresenceGroups = groups;
    }
    return results;
  }

  /**
   * Register CTEs from a WITH clause into the scope. Each CTE's name, AST
   * node, and column names (from explicit aliascolnames) are stored.
   */
  /**
   * Memoize a statement's results, recording the node when a fixpoint is
   * iterating so the entry can be dropped if its assumption is disproved.
   */
  private memoize(stmt: object, results: OutputNullability[]): void {
    this.scopeCache.set(stmt, results);
    this.fixpointJournal?.push(stmt);
  }

  /**
   * A set operation — and, when the operands reference the statement itself,
   * the fixpoint that resolves a recursive CTE.
   *
   * `WITH RECURSIVE t AS (SELECT 0 AS depth ... UNION ALL SELECT t.depth + 1
   * FROM t ...)` cannot be read in one pass: the recursive term's `t` is the
   * very relation being defined. The resolution is an induction. Assume the
   * self-reference produces what the non-recursive term produces, analyze the
   * recursive term under that assumption, and combine. If the combination
   * agrees with the assumption, the assumption is a fixed point and the
   * induction holds: the base rows are non-null, and a step from non-null rows
   * produces non-null rows, so every row at every depth is non-null.
   *
   * Iterating matters, and one pass is not enough. In
   *
   *   SELECT 1 AS a, 1 AS b UNION ALL SELECT t.b, NULL FROM t
   *
   * the first pass assumes `b` non-null, so `a = t.b` reads non-null, while the
   * same pass concludes `b` is nullable — and at depth three `a` really is
   * NULL. Accepting the first pass would report `a` non-null and be unsound.
   * Each round therefore re-analyzes under the weakened assumption until
   * nothing changes; flags only ever move from non-null to nullable, so the
   * loop descends and terminates.
   *
   * Results memoized during a round were computed under an assumption that
   * round may disprove, so they are dropped before the next one.
   */
  private analyzeSetOperation(
    stmt: SelectStmt,
    cteScope: Scope,
    depth: number,
  ): OutputNullability[] {
    const left = this.analyzeSelect(stmt.larg!, cteScope, depth + 1);

    let assumption = left;
    // The group assumption iterates beside the flat one: seeded with the
    // base branch's groups (the most the union could keep), consumed by
    // the self-reference's lift, shrunk by each round's branch agreement.
    let groupAssumption = this.groupCache.get(stmt.larg!) ?? [];
    // Each round that changes anything turns at least one column nullable
    // or removes a group member from the assumption, so the column count
    // plus the seeded membership bounds the rounds. The extra round is the
    // one that confirms a fixed point without changing anything.
    const groupBudget = groupAssumption.reduce((n, g) => n + g.columns.length, 0);
    for (let round = 0; round <= left.length + groupBudget + 1; round++) {
      this.recursiveAssumption.set(stmt, assumption);
      this.recursiveGroupAssumption.set(stmt, groupAssumption);
      const outerJournal = this.fixpointJournal;
      const journal: object[] = [];
      this.fixpointJournal = journal;
      let combined: OutputNullability[];
      let combinedGroups: OutputPresenceGroup[];
      try {
        const right = this.analyzeSelect(stmt.rarg!, cteScope, depth + 1);
        combined = this.combineSetOperation(left, right, stmt.op!);
        combinedGroups = this.computeSetOpGroups(stmt, combined);
      } finally {
        this.fixpointJournal = outerJournal;
      }
      if (
        sameNullability(combined, assumption) &&
        JSON.stringify(combinedGroups) === JSON.stringify(groupAssumption)
      ) {
        this.recursiveAssumption.delete(stmt);
        this.recursiveGroupAssumption.delete(stmt);
        return combined;
      }
      for (const node of journal) {
        this.scopeCache.delete(node);
        this.groupCache.delete(node);
      }
      assumption = combined;
      groupAssumption = combinedGroups;
    }

    // Unreachable while the lattice is two-valued and the loop descends. If it
    // ever is reached, the assumption never settled, and the only answer that
    // cannot be wrong is that nothing is guaranteed.
    this.recursiveAssumption.delete(stmt);
    this.recursiveGroupAssumption.delete(stmt);
    return left.map(c => ({ name: c.name, notNull: false }));
  }

  private registerCtes(withClause: WithClause | undefined, scope: Scope): void {
    if (!withClause) return;
    for (const cte of withClause.ctes) {
      const cteNode = this.unwrapCTE(cte);
      if (!cteNode) continue;
      const colNames = cteNode.aliascolnames
        ? cteNode.aliascolnames.map((n: Node) => this.stringVal(n))
        : [];
      scope.ctes.set(cteNode.ctename, {
        ast: cteNode.ctequery,
        columns: colNames,
        extraColumns: this.cteGeneratedColumns(cteNode),
      });
    }
  }

  /**
   * Columns a CTE's SEARCH / CYCLE clauses append to its output.
   *
   * `SEARCH DEPTH FIRST BY id SET ord` adds one ordering column; `CYCLE id SET
   * is_cycle USING path` adds a cycle mark and a path array. None appear in
   * either branch's target list — the recursion machinery generates them, and
   * always populates them, so all are non-null.
   */
  private cteGeneratedColumns(cteNode: {
    search_clause?: { search_seq_column?: string };
    cycle_clause?: { cycle_mark_column?: string; cycle_path_column?: string };
  }): OutputNullability[] {
    const extras: OutputNullability[] = [];
    const seq = cteNode.search_clause?.search_seq_column;
    if (seq) extras.push({ name: seq, notNull: true });
    const mark = cteNode.cycle_clause?.cycle_mark_column;
    if (mark) extras.push({ name: mark, notNull: true });
    const path = cteNode.cycle_clause?.cycle_path_column;
    if (path) extras.push({ name: path, notNull: true });
    return extras;
  }

  /**
   * Search for a CTE by name, walking the scope chain from inner to outer.
   * CTEs defined in an enclosing scope's WITH clause are visible to inner
   * scopes (SQL scoping rule).
   */
  private findCte(
    name: string,
    scope: Scope,
  ): { ast: Node; columns: string[]; extraColumns: OutputNullability[] } | null {
    let s: Scope | null = scope;
    while (s) {
      if (s.ctes.has(name)) return s.ctes.get(name)!;
      s = s.outer;
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // VALUES as a SELECT (FROM (VALUES ...) AS alias or direct VALUES)
  // -------------------------------------------------------------------------

  private analyzeValuesSelect(
    valuesLists: Node[],
    outerScope: Scope | null,
    depth: number,
  ): OutputNullability[] {
    // Each row is a List of expressions. Column N's nullability is the AND
    // across all rows' expression at position N.
    if (valuesLists.length === 0) return [];

    // Parse rows into arrays of expression nodes.
    const rows: Node[][] = valuesLists.map(row => {
      const list = (row as Record<string, unknown>)["List"] as { items?: Node[] } | undefined;
      return list?.items ?? [];
    });

    // Determine column count from first row.
    const numCols = rows[0]?.length ?? 0;
    const results: OutputNullability[] = [];
    for (let col = 0; col < numCols; col++) {
      let notNull = true;
      for (const row of rows) {
        const expr = row[col];
        if (!expr) { notNull = false; break; }
        const cellNotNull = this.walkExpr(expr, this.emptyScope(outerScope), depth + 1);
        if (!cellNotNull) { notNull = false; break; }
      }
      results.push({ name: `column${col + 1}`, notNull });
    }
    return results;
  }

  private emptyScope(outer: Scope | null): Scope {
    return {
      aliases: new Map(),
      ctes: new Map(),
      joins: [],
      impliedQuals: [],
      visible: [],
      rowsImplyWhere: false,
      groupGuaranteesNonEmpty: false,
      groupingSetColumns: EMPTY_STRING_SET,
      outer,
      results: null,
    };
  }

  // -------------------------------------------------------------------------
  // Set operations (UNION / INTERSECT / EXCEPT)
  // -------------------------------------------------------------------------

  private combineSetOperation(
    left: OutputNullability[],
    right: OutputNullability[],
    op: string | undefined,
  ): OutputNullability[] {
    const len = Math.max(left.length, right.length);
    const results: OutputNullability[] = [];
    for (let i = 0; i < len; i++) {
      const l = left[i];
      const r = right[i];
      // Origins across a set operation (Wave 12, slot form since the rule
      // closure): every INTERSECT/EXCEPT output row IS a left-branch row
      // (dedup keeps whole rows), so the left slots pass through. A UNION
      // row comes from either branch — concatenate SLOT arrays, one slot
      // per branch always: a branch that cannot attribute the column
      // contributes an explicit NULL slot (alignment stays representable)
      // with its flat verdict recorded in originNotNull, which is what
      // lets a literal branch settle its alternative without provenance.
      // An all-null slot array says nothing and is dropped.
      let origins: (ColumnOrigin | null)[] | undefined;
      let originNotNull: boolean[] | undefined;
      if (op === "SETOP_INTERSECT" || op === "SETOP_EXCEPT") {
        origins = l?.origins;
        originNotNull = l?.originNotNull;
      } else {
        const lSlots = l?.origins ?? [null];
        const rSlots = r?.origins ?? [null];
        const slots = [...lSlots, ...rSlots];
        if (slots.some(s => s !== null)) {
          origins = slots;
          originNotNull = [
            ...(l?.originNotNull ?? lSlots.map(() => l?.notNull ?? false)),
            ...(r?.originNotNull ?? rSlots.map(() => r?.notNull ?? false)),
          ];
        }
      }
      results.push({
        name: l?.name ?? r?.name ?? "",
        notNull: combineSetOpColumn(l?.notNull ?? false, r?.notNull ?? false, op),
        ...(origins ? { origins } : {}),
        ...(originNotNull ? { originNotNull } : {}),
      });
    }
    return results;
  }

  // -------------------------------------------------------------------------
  // SELECT * expansion
  // -------------------------------------------------------------------------

  private isStarColumn(val: Node): boolean {
    const node = val as Record<string, unknown>;
    if ("ColumnRef" in node) {
      const cr = node["ColumnRef"] as ColumnRef;
      return (cr.fields ?? []).some(f => "A_Star" in (f as Record<string, unknown>));
    }
    return false;
  }

  /**
   * The relation a star names, or null for the unqualified `*`.
   *
   * `alias.*` is two fields, but it is not the only qualified spelling:
   * PostgreSQL accepts `schema.rel.*` and `db.schema.rel.*` too, so an
   * `fields.length === 2` test sent both to the unqualified branch, which
   * expands the WHOLE scope (adversarial-3 finding 5 — invisible with one
   * relation in scope, a wrong shape with two). Everything before the
   * A_Star is a qualified name: its LAST part is the relation, the one
   * before it the schema.
   *
   * A schema qualifier does not merely decorate, it SELECTS — two
   * same-named relations from different schemas can both be in scope and
   * PostgreSQL rejects the bare name as ambiguous there while accepting
   * either qualified spelling (measured). It also matches only a plain
   * relation reference carrying no explicit alias: `public.t.*` under
   * `FROM t AS t` is an error, not a match (measured, both spellings) —
   * a statement PostgreSQL rejects, so the miss below needs no better
   * answer than the unresolvable-alias one it shares.
   */
  private starQualifier(fields: Node[]): { name: string; schema?: string } | null {
    const names = fields
      .filter(f => "String" in (f as Record<string, unknown>))
      .map(f => this.stringVal(f));
    const name = names[names.length - 1];
    if (!name) return null;
    const schema = names.length >= 2 ? names[names.length - 2] : undefined;
    return schema === undefined ? { name } : { name, schema };
  }

  /**
   * The scope entry a `starQualifier` names. Unqualified goes through the
   * alias map; a schema-qualified name must find the RELATION itself, since
   * that is the whole point of writing the schema.
   */
  private resolveStarRelation(
    q: { name: string; schema?: string },
    scope: Scope,
  ): RelationEntry | null {
    if (q.schema === undefined) return this.resolveAlias(q.name, scope);
    // `scope.visible` rather than `scope.aliases`: the alias map is keyed by
    // NAME, so `FROM app_s.t, t` — legal, and the very case a schema
    // qualifier exists to disambiguate — keeps only one of the two entries
    // there while both are visible in FROM order. Scanning the visible list
    // finds either; scanning the map answered for whichever registered last
    // and an EMPTY column list for the other (measured).
    let s: Scope | null = scope;
    while (s) {
      for (const entry of [
        ...new Set(
          [...s.visible.map(v => v.entry), ...s.aliases.values()].filter(
            (e): e is RelationEntry => !!e,
          ),
        ),
      ]) {
        if (entry.table?.schema === q.schema && entry.table.name === q.name) return entry;
      }
      s = s.outer;
    }
    return null;
  }

  /**
   * `(expr).*` — an A_Indirection whose LAST field is A_Star — is a
   * target-list EXPANSION in disguise: PostgreSQL emits one column per
   * field of the expression's composite type, so treating it at the
   * expression site (one entry, one column) corrupts the list. Returns null
   * when `val` is not this shape. Two arg shapes resolve:
   *
   *   - `(t).*`, a bare reference to a relation in scope — the whole-row
   *     spelling of `t.*`, routed through expandStar (measured identical);
   *   - a FuncCall with single-candidate metadata — the declared return
   *     type's field list via columnsForReturnType, with EVERY field forced
   *     nullable: a NULL composite expands to a NULL in every field, domain
   *     types included (measured — `(NULL::ct).*` yields NULL in an nn_text
   *     field), so not even a domain's NOT NULL survives this position.
   *
   * Anything else refuses: the field count is unknowable, and a wrong
   * column list is worse than no answer — the dispatch-site rule.
   */
  private expandCompositeStar(
    val: Node,
    scope: Scope,
    depth: number,
  ): OutputNullability[] | null {
    const ai = (val as Record<string, unknown>)["A_Indirection"] as
      | { arg?: Node; indirection?: Node[] }
      | undefined;
    if (!ai) return null;
    const parts = ai.indirection ?? [];
    const last = parts[parts.length - 1];
    if (!last || !("A_Star" in (last as Record<string, unknown>))) return null;

    const argNode = ai.arg as Record<string, unknown> | undefined;
    // A known composite type's fields, all forced nullable — the rule every
    // value-reading arm shares: a NULL composite expands to a NULL in every
    // field, domains included (measured).
    const fieldsOf = (
      typeParts: (string | undefined)[],
    ): OutputNullability[] | null => {
      const cleaned = typeParts.filter((p): p is string => !!p && p !== "pg_catalog");
      if (!cleaned.length) return null;
      const schema = cleaned.length >= 2 ? cleaned[cleaned.length - 2] : undefined;
      const name = cleaned[cleaned.length - 1]!;
      const ct = this.catalog.resolveCompositeType(schema, name);
      if (ct) return ct.fields.map(f => ({ name: f.name, notNull: false }));
      // A TABLE's row type is a composite too, and `resolveCompositeType` is
      // backed by `CREATE TYPE … AS (…)` entries alone — so without this the
      // star REFUSED a statement PostgreSQL expands: `(NULL::trow).*` and
      // `(h.row1).*` over a `trow`-typed column both yield [a, b] (measured),
      // and the walk answered UnsupportedNodeError. It is the same two-step
      // `columnsForReturnType` has always taken for `SETOF <table>` versus
      // `SETOF <composite>`, and the same latent defect the post-fix audit
      // closed for the unnest ELEMENT-type resolver — this was its second
      // site, found by the composite-star axis (docs/generated-surface.md).
      // Every field is nullable, which is the expansion rule regardless.
      const rel = this.catalog.resolveTable(schema, name);
      return rel ? rel.columns.map(c => ({ name: c, notNull: false })) : null;
    };
    if (argNode && parts.length === 1) {
      const cr = argNode["ColumnRef"] as ColumnRef | undefined;
      if (cr) {
        const crParts = (cr.fields ?? []).map(f => this.stringVal(f));
        // The parentheses force the VALUE reading (adversarial-2 finding
        // 13, measured): a composite COLUMN named x beats a range-table
        // alias named x, so column resolution comes FIRST — the old
        // alias-first order expanded the RELATION's columns for the clash,
        // same arity, entirely different meaning. Qualified `(t.c).*` is
        // only ever the column.
        let colOwner: RelationEntry | undefined;
        let colName: string | undefined;
        if (crParts.length === 1) {
          for (const v of scope.visible) {
            if (v.name === crParts[0]) {
              // A merged (USING/NATURAL) column has no entry of its own, and
              // it still IS the value reading — so take the type from either
              // constituent: the merge requires a common type, and PostgreSQL
              // expands `(p).*` over one to the type's fields (measured, both
              // spellings). Reading it as untypable refused a statement
              // PostgreSQL answers.
              colOwner =
                v.entry ??
                (v.merged?.left.table ? v.merged.left : v.merged?.right) ??
                undefined;
              colName = crParts[0];
              break;
            }
          }
        } else if (crParts.length === 2) {
          const entry = this.resolveAlias(crParts[0]!, scope);
          if (entry) {
            colOwner = entry;
            colName = crParts[1];
          }
        }
        if (colOwner && colName) {
          const rendered = colOwner.table
            ? this.catalog.resolveColumnTypeName(colOwner.table.schema, colOwner.table.name, colName)
            : null;
          const expanded = rendered ? fieldsOf(rendered.split(".")) : null;
          if (expanded) return expanded;
          // The column exists and IS the value reading; a type the catalog
          // cannot expand (an uncaptured composite, a subquery's column —
          // or a scalar, which PostgreSQL itself rejects here) refuses
          // rather than falling back to the alias PostgreSQL would not
          // pick. The refusal is thrown below.
        }
        if (crParts.length === 1 && !colName && this.resolveAlias(crParts[0]!, scope)) {
          const synth = {
            ColumnRef: { fields: [{ String: { sval: crParts[0]! } }, { A_Star: {} }] },
          } as unknown as Node;
          return this.expandStar(synth, scope, depth);
        }
      }
      const fc = argNode["FuncCall"] as FuncCall | undefined;
      if (fc) {
        const name = this.funcName(fc);
        const meta = this.catalog.resolveFunctionMetadata(this.funcSchema(fc), name);
        if (meta) {
          return this.columnsForReturnType(meta.returnType, name).map(c => ({
            name: c.name,
            notNull: false,
          }));
        }
      }
      // `(ROW(a, b)).*` — the arity is countable at parse time and
      // PostgreSQL names the fields f1..fN (measured). All nullable, the
      // shared value-reading rule.
      const re = argNode["RowExpr"] as { args?: Node[] } | undefined;
      if (re) {
        return (re.args ?? []).map((_, i) => ({ name: `f${i + 1}`, notNull: false }));
      }
      // `(expr::sku_pair).*` — the cast TARGET names the composite, and the
      // expression may be NULL, so the fields come from the type, all
      // nullable. An array cast is not a composite; an unknown target
      // refuses below.
      const tc = argNode["TypeCast"] as
        | { typeName?: { names?: Node[]; arrayBounds?: unknown[] } }
        | undefined;
      if (tc && !tc.typeName?.arrayBounds?.length) {
        const expanded = fieldsOf((tc.typeName?.names ?? []).map(n => this.stringVal(n)));
        if (expanded) return expanded;
      }
    }
    throw new UnsupportedNodeError("composite-star", this.nodeTag(argNode ?? {}));
  }

  private expandStar(
    val: Node,
    scope: Scope,
    depth: number,
    withOrigins = false,
    producers?: ({ entry: RelationEntry; column: string; ordinal?: number } | null)[],
  ): OutputNullability[] {
    const node = val as Record<string, unknown>;
    const cr = node["ColumnRef"] as ColumnRef;
    const fields = cr.fields ?? [];

    // Star expansion is the ONE path that can re-export a subquery/CTE/view
    // column whose NAME is ambiguous inside its entry (`SELECT sh.id, g.a
    // AS id` — PostgreSQL rejects any explicit reference to it, but `s.*`
    // is legal). Name-based inner resolution first-matches there and
    // misattributes: the wrong flat claim, the wrong origin, the wrong
    // lifted-group member — all three measured before this fix. Expansion
    // therefore resolves POSITIONALLY: each expanded column carries its
    // ordinal within the entry's own output list, and every consumer
    // prefers it. In the unqualified branch the ordinal is recovered by
    // occurrence counting, which is exact: a USING merge cannot consume a
    // duplicate-named column (the merge itself would be ambiguous), so an
    // entry's k-th visible occurrence of a name IS its k-th inner one.
    const withOrigin = (
      entry: RelationEntry,
      colName: string,
      notNull: boolean,
      ordinal: number | undefined,
    ): OutputNullability => {
      const og = withOrigins ? this.originOf(entry, colName, scope, depth, ordinal) : undefined;
      return og
        ? {
            name: colName,
            notNull,
            origins: og.origins,
            ...(og.settled ? { originNotNull: og.settled } : {}),
          }
        : { name: colName, notNull };
    };

    // `alias.*` / `schema.rel.*` — just that relation's columns, so the list
    // index is the ordinal directly.
    const qualifier = this.starQualifier(fields);
    if (qualifier) {
      const entry = this.resolveStarRelation(qualifier, scope);
      if (!entry) return [];
      return this.relationColumnsIntrinsic(entry, scope, depth).map((col, ordinal) => {
        producers?.push({ entry, column: col.name, ordinal });
        return withOrigin(
          entry,
          col.name,
          this.computeColumnNullability(entry, col.name, scope, depth, false, ordinal),
          ordinal,
        );
      });
    }

    // Unqualified `*` — the scope's visible columns, in order. Each is
    // resolved exactly as a named reference would be, so views, WHERE
    // promotion, null groups and branch guards all apply here too. A merged
    // USING/NATURAL column is drawn from either side and carries no origin —
    // and no producer: it is present whenever EITHER side is, so it does not
    // extend with one unit.
    const nameLists = new Map<RelationEntry, string[]>();
    const seen = new Map<RelationEntry, Map<string, number>>();
    const ordinalOf = (entry: RelationEntry, colName: string): number | undefined => {
      if (entry.kind !== "view" && entry.kind !== "cte" && entry.kind !== "subquery") {
        return undefined;
      }
      let list = nameLists.get(entry);
      if (!list) {
        list = this.innerColumnNames(entry, scope, depth);
        nameLists.set(entry, list);
      }
      let counts = seen.get(entry);
      if (!counts) {
        counts = new Map();
        seen.set(entry, counts);
      }
      const n = counts.get(colName) ?? 0;
      counts.set(colName, n + 1);
      let hits = 0;
      for (let k = 0; k < list.length; k++) {
        if (list[k] === colName && hits++ === n) return k;
      }
      return undefined;
    };
    return scope.visible.map(vc => {
      if (vc.merged) {
        producers?.push(null);
        return { name: vc.name, notNull: this.mergedColumnNotNull(vc.name, vc.merged, scope, depth) };
      }
      if (vc.entry) {
        const ordinal = ordinalOf(vc.entry, vc.name);
        producers?.push({ entry: vc.entry, column: vc.name, ordinal });
        return withOrigin(
          vc.entry,
          vc.name,
          this.computeColumnNullability(vc.entry, vc.name, scope, depth, false, ordinal),
          ordinal,
        );
      }
      producers?.push(null);
      return { name: vc.name, notNull: false };
    });
  }

  /** The ordered output column names of a view/CTE/subquery entry. */
  private innerColumnNames(entry: RelationEntry, scope: Scope, depth: number): string[] {
    if (entry.kind === "view" && entry.table) return this.entryColumnNames(entry);
    if (entry.cteColumns && entry.cteColumns.length > 0) return entry.cteColumns;
    return this.innerRelationColumns(entry, scope, depth).map(r => r.name);
  }

  /**
   * Resolve a target-list expression that is a plain ColumnRef to its
   * owning relation IN THIS SCOPE — the producer side of origin tracking.
   * Anything else (stars, indirection, outer-scope refs, ambiguous or
   * merged names) yields no origin: a correlated reference's row identity
   * belongs to the outer scope's rows, not to this output.
   */
  private resolveBareColumnTarget(
    val: Node,
    scope: Scope,
  ): { entry: RelationEntry; column: string } | null {
    const node = val as Record<string, unknown>;
    if (!("ColumnRef" in node)) return null;
    const fields = (node["ColumnRef"] as ColumnRef).fields ?? [];
    const parts: string[] = [];
    for (const f of fields) {
      if (!("String" in (f as Record<string, unknown>))) return null;
      parts.push(this.stringVal(f));
    }
    if (parts.length === 1) {
      let found: { entry: RelationEntry; column: string } | null = null;
      for (const vc of scope.visible) {
        if (vc.name !== parts[0]) continue;
        if (!vc.entry || found) return null;
        found = { entry: vc.entry, column: parts[0]! };
      }
      return found;
    }
    const alias = parts.length === 2 ? parts[0] : parts.length === 3 ? parts[1] : undefined;
    if (alias === undefined) return null;
    const entry = scope.aliases.get(alias);
    return entry ? { entry, column: parts[parts.length - 1]! } : null;
  }

  /**
   * The origin-eligible (entry, column) of a target expression under the
   * scope's grouping mode. In "keys" mode the target must itself be a PLAIN
   * grouping-key column outside every ROLLUP/CUBE/GROUPING SETS construct —
   * a GroupingSet node never resolves as a bare column, so set-wrapped keys
   * refuse automatically.
   */
  private originTarget(
    val: Node,
    stmt: SelectStmt,
    scope: Scope,
    mode: "all" | "keys" | "none",
  ): { entry: RelationEntry; column: string } | null {
    if (mode === "none") return null;
    const bare = this.resolveBareColumnTarget(val, scope);
    if (!bare) return null;
    if (mode === "all") return bare;
    if (
      scope.groupingSetColumns.has(bare.column) ||
      scope.groupingSetColumns.has(`${bare.entry.alias}.${bare.column}`)
    ) {
      return null;
    }
    for (const g of stmt.groupClause ?? []) {
      const key = this.resolveBareColumnTarget(g, scope);
      if (key && key.entry === bare.entry && key.column === bare.column) return bare;
    }
    return null;
  }

  /**
   * The origin alternatives of `entry`'s column `colName`, or undefined.
   * A table contributes a fresh single-step rowPath; a CTE/subquery/view
   * PREPENDS its own reference instance to each inner alternative's path,
   * which is what keeps two references to one memoized analysis from
   * claiming the same row. An OPTIONAL instance produces origins MARKED
   * optional (Wave 12): consumption then demands an evidence-only presence
   * proof, and a NOT_FOUND entry produces nothing.
   */
  private originOf(
    entry: RelationEntry,
    colName: string,
    scope: Scope,
    depth: number,
    /** Positional resolution from star expansion — see computeColumnNullabilityTraced. */
    ordinal?: number,
  ): { origins: (ColumnOrigin | null)[]; settled?: boolean[] } | undefined {
    if (entry.joinState === NOT_FOUND) return undefined;
    const optionalHere = entry.joinState === OPTIONAL;
    // This reference's own null-extension crossings, all at depth 0 (the
    // rowPath step this entry contributes); a lift shifts the inner
    // origins' crossings one step deeper, exactly like rowPath itself.
    // NULL slots (a set-operation branch that could not attribute) pass
    // through as NULL, and the inner per-branch settledness rides along —
    // a bare re-export changes neither.
    const hereUnits = entry.unitChain.map(unit => ({ depth: 0, unit }));
    const lift = (
      inner: OutputNullability | undefined,
    ): { origins: (ColumnOrigin | null)[]; settled?: boolean[] } | undefined => {
      if (!inner?.origins) return undefined;
      const origins = inner.origins.map(o => {
        if (!o) return null;
        const units = [
          ...hereUnits,
          ...(o.units ?? []).map(c => ({ depth: c.depth + 1, unit: c.unit })),
        ];
        return {
          ...o,
          rowPath: [entry.instance, ...o.rowPath],
          ...(o.optional || optionalHere ? { optional: true } : {}),
          ...(units.length > 0 ? { units } : {}),
        };
      });
      return { origins, ...(inner.originNotNull ? { settled: inner.originNotNull } : {}) };
    };

    if (entry.kind === "table" && entry.table) {
      // An origin names the column the CATALOG carries — it is what a CHECK
      // constraint and a foreign key are stated over — while the lookup is by
      // the name the query used.
      const catalogCol = this.entryCatalogColumn(entry, colName);
      if (!entry.table.schema || catalogCol === undefined) return undefined;
      return {
        origins: [
          {
            rowPath: [entry.instance],
            schema: entry.table.schema,
            table: entry.table.name,
            column: catalogCol,
            ...(optionalHere ? { optional: true } : {}),
            ...(hereUnits.length > 0 ? { units: hereUnits } : {}),
          },
        ],
      };
    }

    if (entry.kind === "view" && entry.ast && entry.table) {
      const idx = ordinal ?? this.entryColumnNames(entry).indexOf(colName);
      if (idx < 0) return undefined;
      return lift(this.analyzeStatement(entry.ast, scope, depth + 1)[idx]);
    }

    if ((entry.kind === "cte" || entry.kind === "subquery") && entry.ast) {
      const innerResults = this.innerRelationColumns(entry, scope, depth);
      let inner: OutputNullability | undefined;
      if (ordinal !== undefined) {
        inner = innerResults[ordinal];
      } else if (entry.cteColumns && entry.cteColumns.length > 0) {
        const idx = entry.cteColumns.indexOf(colName);
        inner =
          idx >= 0 && idx < innerResults.length
            ? innerResults[idx]
            : innerResults.find(r => r.name === colName);
      } else {
        inner = innerResults.find(r => r.name === colName);
      }
      return lift(inner);
    }

    return undefined;
  }

  /** Untraced form of computeColumnNullabilityTraced. */
  private computeColumnNullability(
    entry: RelationEntry,
    colName: string,
    scope: Scope,
    depth: number,
    presumePresent = false,
    ordinal?: number,
  ): boolean {
    return this.computeColumnNullabilityTraced(
      entry,
      colName,
      scope,
      depth,
      NOOP,
      presumePresent,
      ordinal,
    );
  }

  // -------------------------------------------------------------------------
  // Table functions in FROM
  // -------------------------------------------------------------------------

  /**
   * Column list of a set-returning function in FROM, with intrinsic
   * nullability (join state is applied by the caller).
   *
   * **A `SETOF <table>` result does NOT carry the table's NOT NULL
   * constraints.** The return type is the table's *row type*, which describes
   * column types only — a function declared `RETURNS SETOF order_items` can
   * return a row of all NULLs without error. So every column of a composite
   * result is nullable, however the underlying table is declared.
   *
   * Two things do survive, because both are properties of the *type*:
   *   - a domain's NOT NULL, which is still enforced on function output;
   *   - `WITH ORDINALITY`, a generated bigint counter that is always present.
   *
   * Resolving the columns matters even where they are all nullable: without it
   * `SELECT * FROM f()` expands to nothing and the statement's output shape is
   * simply wrong.
   */
  private resolveTableFunctionColumns(
    entry: RelationEntry,
    scope: Scope | null,
    depth: number,
  ): { name: string; notNull: boolean }[] {
    // Precomputed for FROM items that spell out their own COLUMNS list, and
    // memoized for everything else.
    if (entry.functionColumns) return entry.functionColumns;

    const rf = entry.rangeFunction;
    const cols: { name: string; notNull: boolean }[] = [];
    // ONE predicate, asked by three rules that all mean "this FROM item has a
    // lone arm". It used to be two, and they disagreed: the naming rule
    // excluded `ROWS FROM` and the body rule did not (sweep-4 finding 6).
    //
    //   - NAMING. A lone function returning a SCALAR takes the relation alias
    //     as its column name, `ROWS FROM` or not — measured across the
    //     spelling space, including `WITH ORDINALITY`. Two arms take the
    //     function names whatever the alias says, and a composite arm keeps
    //     its own field names either way.
    //   - THE BODY READING and THE DECLARED READING. Two or more functions in
    //     one `ROWS FROM` expand in lockstep to the LONGEST one's row count,
    //     and every shorter one's columns are NULL-padded after it has
    //     returned (measured). The same shape as the target list's SRF padding
    //     rule. One function has no partner to be padded against.
    const loneArm = (rf?.functions?.length ?? 0) === 1;

    for (const fnItem of rf?.functions ?? []) {
      // Each entry is a List whose first item is the FuncCall and whose
      // second, when present, is the item's column definition list (the
      // ROWS FROM spelling; the lone-function spelling parks it on the
      // RangeFunction itself — both measured).
      const list = (fnItem as Record<string, unknown>)["List"] as { items?: Node[] } | undefined;
      const callNode = list?.items?.[0] as Record<string, unknown> | undefined;
      const fc = callNode?.["FuncCall"] as FuncCall | undefined;
      if (!fc) continue;

      // Every route that can contribute a CLAIM goes through here, and both
      // things that take a claim away apply at this ONE point rather than in
      // each rule. The two routes that push directly below have nothing to
      // clear — they carry no flags at all.
      //
      // THE PADDING (sweep-4 finding 1). Beside a longer arm this item's
      // columns are NULL on every row after it has returned, so no reading of
      // it survives: not the body reading, which `loneArm` already gated, and
      // not the DECLARED one — a NOT NULL domain return, or a NOT NULL domain
      // among the OUT/TABLE parameters — which was pushed unclipped on all
      // three arms. This is also why the clearance sits BEFORE the presence
      // groups are assembled: a surviving flag makes the column a group
      // DISCRIMINANT, and the group then says "the unit is absent" on rows
      // where a longer arm is still producing values.
      //
      // THE STRICT SHORT-CIRCUIT. A strict function handed a NULL argument
      // returns one row of all NULLs (measured), which is exactly the row this
      // item emits. `callCanShortCircuit` excludes set-returning functions,
      // on the true argument that a claim about rows that do not exist cannot
      // be contradicted — and `ROWS FROM` is where the rows come back anyway,
      // the long arm supplying them and the padding the NULLs. The exclusion
      // stays: the padding covers that shape for a reason of its own, and a
      // strict SRF can never BE the longest arm, since it returns no rows.
      const push = (itemCols: { name: string; notNull: boolean }[]): void => {
        const padded = loneArm ? itemCols : itemCols.map(c => ({ name: c.name, notNull: false }));
        cols.push(...this.clearShortCircuitedColumns(padded, fc, scope));
      };

      // A column definition list (`AS z(a integer, b text)`) is what makes a
      // record-returning call legal at all, and it fully determines the
      // item's shape: the ColumnDefs' names, one column each, every one
      // nullable — a record's fields carry no constraints.
      const coldeflist =
        (list?.items?.[1] as { List?: { items?: Node[] } } | undefined)?.List?.items ??
        (loneArm ? rf?.coldeflist : undefined);
      if (coldeflist?.length) {
        const declared: { name: string; notNull: boolean }[] = [];
        for (const cd of coldeflist) {
          const colname = (cd as { ColumnDef?: { colname?: string } }).ColumnDef?.colname;
          if (colname) declared.push({ name: colname, notNull: false });
        }
        // A record's FIELDS carry no constraints, and the column definition
        // list is types and names only — but the body that produced the record
        // is still readable, and PostgreSQL maps it to this list positionally
        // (measured: a coldeflist type that differs from the body's coerces in
        // place). A coercion of a non-null value cannot yield NULL.
        const recMeta = loneArm
          ? this.catalog.resolveFunctionMetadata(this.funcSchema(fc), this.funcName(fc))
          : null;
        push(recMeta ? this.refineColumnsFromBody(declared, recMeta, 0) : declared);
        continue;
      }

      const name = this.funcName(fc);
      // A function returning a scalar contributes one column, and PostgreSQL
      // names it after the relation alias when there is one. Composite results
      // keep their own column names, so the alias applies only to the relation.
      const scalarName = loneArm && entry.alias ? entry.alias : name;
      const meta = this.catalog.resolveFunctionMetadata(this.funcSchema(fc), name);
      if (!meta) {
        // `unnest` is a special form twice over. Per ARGUMENT (sweep-1
        // finding 12): one column each, zip-style with NULL padding, named
        // "unnest" in the multi-argument spelling. Per ELEMENT
        // (adversarial-2 finding 4): an argument whose element type is a
        // COMPOSITE expands to the element's FIELDS instead — one column
        // per field, named by the field, all nullable (measured through
        // five spellings, ROWS FROM and MERGE-source included). A
        // user-defined unnest arrives with metadata and takes the
        // declared-return-type path below instead.
        if (name === "unnest" && (fc.args?.length ?? 0) >= 1) {
          const multi = fc.args!.length > 1;
          for (const arg of fc.args!) {
            const fields = this.unnestCompositeElementFields(arg, scope, depth);
            if (fields) {
              for (const f of fields) cols.push({ name: f, notNull: false });
            } else {
              cols.push({ name: multi ? "unnest" : scalarName, notNull: false });
            }
          }
          continue;
        }
        // No single candidate means the name is OVERLOADED, and PostgreSQL
        // picks by argument types the walk cannot compute. The candidates'
        // SHAPES decide what is safe: when every arity-compatible candidate
        // yields the same column list, that list holds whichever one runs —
        // the consensus quantifier the flag rules already use. When they
        // disagree the shape is unknowable here, and a FROM item that
        // contributes the WRONG columns is worse than one that refuses
        // (the dispatch-site rule). Measured: `ov(text) RETURNS SETOF
        // sku_pair` beside `ov(integer) RETURNS TABLE(a,b,c)` had the
        // engine emitting ONE column named `ov` against PostgreSQL's three
        // — and that shape needs no search path, it is two overloads in one
        // schema.
        // The shape question is answerable WITHOUT resolving the overload
        // whenever every candidate agrees — whichever one PostgreSQL picks,
        // the column list is the same — so ask the full candidate set
        // first. Arity filtering can only narrow that set, so it is worth
        // trying only when the full set disagrees; asking it first would
        // let `resolveFunctionCandidates`' variadic refusal block a shape
        // that needed no narrowing at all (measured: `vp(VARIADIC text[])`
        // beside `vp(integer)`, both `SETOF sku_pair`, gave one column
        // named `vp` against PostgreSQL's two).
        const shapeOf = (candidate: FunctionInfo) =>
          this.functionOutputColumns(candidate, scalarName);
        const agree = (shapes: { name: string; notNull: boolean }[][]): boolean => {
          const first = shapes[0]!;
          return shapes.every(
            s =>
              s.length === first.length &&
              s.every((c, i) => c.name === first[i]!.name && c.notNull === first[i]!.notNull),
          );
        };
        const allCandidates = this.catalog.resolveFunctionShapes(this.funcSchema(fc), name);
        if (allCandidates.length > 0) {
          const shapes = allCandidates.map(shapeOf);
          if (agree(shapes)) {
            push(shapes[0]!);
            continue;
          }
          // Disagreement: narrow to the candidates that accept this
          // argument count, which is the one resolution step the engine
          // performs (no type simulation). Null means the narrowing itself
          // is unsound — a variadic candidate absorbs any count — so there
          // is nothing left to prove agreement with.
          const candidates = this.catalog.resolveFunctionCandidates(
            this.funcSchema(fc),
            name,
            (fc.args ?? []).length,
          );
          if (candidates && candidates.length > 0) {
            const narrowed = candidates.map(shapeOf);
            if (agree(narrowed)) {
              push(narrowed[0]!);
              continue;
            }
          }
          // A FROM item that contributes the WRONG columns is worse than
          // one that refuses — the dispatch-site rule.
          throw new UnsupportedNodeError(
            "from-item",
            `overloaded function ${name} whose candidates return different shapes`,
          );
        }
        // Unknown to the USER catalog — a pg_catalog function. Those with
        // named output columns are captured by the snapshot (their
        // `pg_get_function_result` says only `SETOF record`), so the shape
        // is known after all: json_each contributes `key` and `value`, not
        // one column called `json_each`. Everything else — generate_series
        // and the other scalar SRFs — keeps the single conservatively
        // nullable column, which is what PostgreSQL emits for them.
        const builtinShape = this.catalog.resolveBuiltinFunctionShape(this.funcSchema(fc), name);
        if (builtinShape) {
          push(this.columnsForReturnType(builtinShape, scalarName));
          continue;
        }
        cols.push({ name: scalarName, notNull: false });
        continue;
      }
      // The declared shape is the column list; the body is what can put a
      // constraint back on it. Only here, at the SINGLE-candidate site — the
      // consensus loop above runs over candidates that share one `fnBodyAsts`
      // key, so reading a body there would hand every overload the same one.
      const declared = this.functionOutputColumns(meta, scalarName);
      push(loneArm ? this.refineColumnsFromBody(declared, meta, 0) : declared);
    }

    if (rf?.ordinality) {
      cols.push({ name: "ordinality", notNull: true });
    }

    // Explicit column aliases rename positionally: `f() AS t(a, b)`.
    const aliases = entry.cteColumns ?? [];
    const named = cols.map((c, i) => ({ name: aliases[i] ?? c.name, notNull: c.notNull }));

    entry.functionColumns = named;
    return named;
  }

  /**
   * The field names of an `unnest` argument's COMPOSITE element type, or
   * null when the element is a SCALAR — the one-column, per-argument rule.
   *
   * REFUSES rather than guessing when the element type cannot be determined.
   * The first version enumerated three spellings that carry the type
   * statically and read every other one as a scalar's, which is a wrong
   * SHAPE whenever it was not: six further spellings were measured
   * contributing one column against PostgreSQL's two (adversarial-3
   * finding 3), and a FROM item's wrong shape shifts every column after it
   * — the engine's `notNull` at what it called `u.id` landed on
   * PostgreSQL's `qty`. A column list has no conservative value, so the
   * dispatch-site rule applies: refuse.
   *
   * What that costs is bounded by asking the catalog everywhere it can
   * answer, which is `unnestElementType`'s whole job — including the two
   * domain spellings and a function's declared return type. The residue is
   * where PostgreSQL's own answer needs type inference the walk does not
   * do: a polymorphic builtin (`array_cat` of two `sku_pair[]` yields
   * `sku_pair[]`), an aggregate, a sublink, an operator expression, a
   * derived-table column. Those refuse now; before, they were wrong
   * whenever the element was composite and right otherwise.
   */
  private unnestCompositeElementFields(
    arg: Node,
    scope: Scope | null,
    depth: number,
  ): string[] | null {
    const element = this.unnestElementType(arg, scope, depth);
    if (element.kind === "scalar") return null;
    if (element.kind === "unknown") {
      throw new UnsupportedNodeError(
        "from-item",
        `unnest of an argument whose element type is not derivable (${this.nodeTag(arg)})`,
      );
    }
    const parts = element.parts;
    const typeName = parts[parts.length - 1]!;
    const typeSchema = parts.length >= 2 ? parts[parts.length - 2] : undefined;
    const ct = this.catalog.resolveCompositeType(typeSchema, typeName);
    if (ct) return ct.fields.map(f => f.name);
    // A TABLE's ROW TYPE is a composite too, and it is not in
    // `compositeTypes` — the same two-step `columnsForReturnType` takes for
    // `SETOF <table>` versus `SETOF <composite>`. Types and relations share
    // one namespace, so a type name that resolves to a relation IS that
    // relation's row type: `unnest(h.rows)` over a `trow[]` column expands
    // to trow's columns (measured), where the composite lookup alone
    // answered one column and shifted every position after it.
    const table = this.catalog.resolveTable(typeSchema, typeName);
    if (table) return [...table.columns];
    if (element.provablyComposite) {
      throw new UnsupportedNodeError(
        "from-item",
        `unnest of a composite-element array with unresolvable element type ${typeName}`,
      );
    }
    // A named type the snapshot carries as neither is a scalar: user
    // composites and relations are all captured, so the residual here is the
    // general capture boundary rather than this site's.
    return null;
  }

  /**
   * The ELEMENT type of an `unnest` argument.
   *
   * `type` — the element type's name parts, with `provablyComposite` set
   * when the shape can be nothing else (a ROW constructor under the cast);
   * `scalar` — the element provably is not a user composite, so the call
   * contributes one column; `unknown` — the walk cannot tell, and its
   * caller refuses.
   */
  private unnestElementType(
    arg: Node,
    scope: Scope | null,
    depth: number,
  ):
    | { kind: "type"; parts: string[]; provablyComposite: boolean }
    | { kind: "scalar" }
    | { kind: "unknown" } {
    const rec = arg as Record<string, unknown>;
    const partsOf = (tn: { names?: Node[] } | undefined): string[] | null => {
      const parts = (tn?.names ?? [])
        .map(n => this.stringVal(n))
        .filter((p): p is string => !!p && p !== "pg_catalog");
      return parts.length ? parts : null;
    };
    const isRow = (n: Node | undefined): boolean =>
      !!n && "RowExpr" in (n as Record<string, unknown>);
    const typed = (parts: string[], provablyComposite = false) =>
      ({ kind: "type", parts, provablyComposite }) as const;

    /**
     * A rendered type name as an ELEMENT type. `T[]` strips its bounds; a
     * DOMAIN is followed to its base, because a domain over `sku_pair[]`
     * renders as its own name and hides the array-ness the `[]` test looks
     * for — two of finding 3's six spellings, the cast and the column.
     * Anything else is not an array, so the statement is one PostgreSQL
     * rejects and any answer is unobservable.
     */
    const fromRendered = (rendered: string, seen = new Set<string>()): ReturnType<
      typeof this.unnestElementType
    > => {
      const trimmed = rendered.replace(/^setof\s+/i, "").trim();
      const nameParts = (printed: string): string[] => {
        const { schema, name } = splitQualifiedName(printed);
        return schema ? [schema, name] : [name];
      };
      if (trimmed.endsWith("[]")) {
        return typed(nameParts(trimmed.replace(/(\[\])+$/, "")));
      }
      if (seen.has(trimmed)) return { kind: "unknown" };
      seen.add(trimmed);
      const { schema, name } = splitQualifiedName(trimmed);
      const base = this.catalog.resolveDomainBaseTypeName(schema, name);
      return base ? fromRendered(base, seen) : { kind: "scalar" };
    };

    if ("TypeCast" in rec) {
      const tc = rec["TypeCast"] as {
        arg?: Node;
        typeName?: { names?: Node[]; arrayBounds?: unknown[] };
      };
      const parts = partsOf(tc.typeName);
      if (!parts) return { kind: "unknown" };
      if (tc.typeName?.arrayBounds?.length) {
        const inner = tc.arg as Record<string, unknown> | undefined;
        const provablyComposite =
          !!inner &&
          "A_ArrayExpr" in inner &&
          ((inner["A_ArrayExpr"] as { elements?: Node[] }).elements ?? []).some(e => isRow(e));
        return typed(parts, provablyComposite);
      }
      // No array bounds: the target may still be a DOMAIN over an array.
      return fromRendered(parts.join("."));
    }

    if ("A_ArrayExpr" in rec) {
      const elements = (rec["A_ArrayExpr"] as { elements?: Node[] }).elements ?? [];
      for (const e of elements) {
        const er = e as Record<string, unknown>;
        if (!("TypeCast" in er)) continue;
        const tc = er["TypeCast"] as {
          arg?: Node;
          typeName?: { names?: Node[]; arrayBounds?: unknown[] };
        };
        // An array element cast to an array is not this shape.
        if (tc.typeName?.arrayBounds?.length) continue;
        const parts = partsOf(tc.typeName);
        if (parts) {
          const element = fromRendered(parts.join("."));
          return element.kind === "scalar" ? typed(parts, isRow(tc.arg)) : element;
        }
      }
      // No cast to read the element type from. An ARRAY constructor's
      // element type IS its members' type, so a member the catalog can type
      // answers directly — `ARRAY[c.p]` over a composite COLUMN expands to
      // that type's fields (measured). `unnest` flattens every dimension,
      // so a member that is itself an array contributes its own element
      // type.
      const memberTypes = elements.map(e => this.renderedTypeOfExpr(e, scope));
      const known = memberTypes.filter((t): t is string => t !== null);
      if (known.length === elements.length && elements.length > 0) {
        const first = known[0]!;
        if (known.every(t => t === first)) {
          const { schema, name } = splitQualifiedName(first.replace(/(\[\])+$/, ""));
          return typed(schema ? [schema, name] : [name]);
        }
      }
      // A literal cannot be a composite, so `ARRAY[1, 2]` is a scalar array
      // by construction; anything else needs the type of an expression the
      // walk does not compute.
      return elements.length > 0 && elements.every(e => "A_Const" in (e as Record<string, unknown>))
        ? { kind: "scalar" }
        : { kind: "unknown" };
    }

    if ("ColumnRef" in rec) {
      const rendered = this.renderedTypeOfExpr(arg, scope);
      if (rendered) return fromRendered(rendered);
      // No base column behind it: the CTE or subquery COMPUTES this column.
      // Its defining expression is an expression like any other, and this
      // same reading answers for it one level in — `(SELECT ARRAY[p] AS ps
      // FROM cc) s, unnest(s.ps)` types `ARRAY[p]` against `cc` and expands
      // to sku_pair's fields (measured). No new typing, one more place to
      // ask.
      return this.computedColumnElementType(arg, scope, depth);
    }

    // A scalar sublink contributes its single output column, and that column
    // is an expression this reading can be asked about inside the subquery's
    // own FROM — `unnest((SELECT h.rows FROM h))` is a column reference one
    // level down. The subquery's row COUNT does not matter: a scalar sublink
    // yielding several rows raises, and the shape question is about the type
    // either way.
    if ("SubLink" in rec) {
      const sl = rec["SubLink"] as SubLink;
      if (sl.subLinkType !== "EXPR_SUBLINK" || !sl.subselect) return { kind: "unknown" };
      const inner = (sl.subselect as Record<string, unknown>)["SelectStmt"] as
        | SelectStmt
        | undefined;
      const targets = inner?.targetList ?? [];
      if (!inner || targets.length !== 1) return { kind: "unknown" };
      const val = this.unwrapResTarget(targets[0]!).val;
      return val ? this.elementTypeInSelect(val, inner, scope, depth) : { kind: "unknown" };
    }

    // `pairs[1:1]` — a SLICE of an array is an array of the same element
    // type. A plain subscript is not: it yields the element itself, and
    // unnesting one is a statement PostgreSQL rejects.
    if ("A_Indirection" in rec) {
      const ai = rec["A_Indirection"] as { arg?: Node; indirection?: Node[] };
      const parts = ai.indirection ?? [];
      const allSlices =
        parts.length > 0 &&
        parts.every(p => !!(p as { A_Indices?: { is_slice?: boolean } }).A_Indices?.is_slice);
      return allSlices && ai.arg ? this.unnestElementType(ai.arg, scope, depth) : { kind: "unknown" };
    }

    // `a || b` and `COALESCE(a, b)` — every operand shares the result's
    // type, so any one of them that resolves to an array answers for all.
    // `||` also concatenates an ELEMENT onto an array, and an operand read
    // as a scalar cannot be told apart from that, so a scalar answer needs
    // EVERY operand to give one.
    const ae = rec["A_Expr"] as
      | { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node }
      | undefined;
    const aeName = (ae?.name ?? [])[0];
    const aeOp = ae?.kind === "AEXPR_OP" && aeName ? this.stringVal(aeName) : undefined;
    const operands: (Node | undefined)[] | null =
      aeOp === "||"
        ? [ae!.lexpr, ae!.rexpr]
        : "CoalesceExpr" in rec
          ? ((rec["CoalesceExpr"] as { args?: Node[] }).args ?? [])
          : null;
    if (operands) {
      const resolved = operands.map(o =>
        o ? this.unnestElementType(o, scope, depth) : { kind: "unknown" as const },
      );
      const array = resolved.find(r => r.kind === "type");
      if (array) return array;
      return resolved.length > 0 && resolved.every(r => r.kind === "scalar")
        ? { kind: "scalar" }
        : { kind: "unknown" };
    }

    if ("FuncCall" in rec) {
      const fc = rec["FuncCall"] as FuncCall;
      const name = this.funcName(fc);
      const returnTypes = this.catalog
        .resolveFunctionShapes(this.funcSchema(fc), name)
        .map(f => f.returnType);
      if (returnTypes.length > 0) {
        // Consensus, like every other overloaded question: one rendered
        // return type across the candidates answers whichever one runs.
        const first = returnTypes[0]!;
        return returnTypes.every(rt => rt === first) ? fromRendered(first) : { kind: "unknown" };
      }
      // A polymorphic builtin takes its type FROM ITS ARGUMENTS, and the
      // snapshot carries the signatures that say how.
      const poly = this.polymorphicArrayElementType(fc, scope, depth);
      if (poly) return poly;
      // A builtin with a CONCRETE return type cannot yield an array of a
      // USER composite, which is the only thing that turns one column into
      // several here. A polymorphic one whose signatures did not answer, and
      // an unrecognised name, are both unknown.
      return this.catalog.isBuiltinFunction(name) && !this.catalog.isPolymorphicBuiltin(name)
        ? { kind: "scalar" }
        : { kind: "unknown" };
    }

    return { kind: "unknown" };
  }

  /**
   * Whether an expression is ARRAY-typed on evidence rather than by
   * elimination — an ARRAY constructor, a cast with array bounds, or a
   * catalog type that renders with `[]`. `unnestElementType`'s `scalar`
   * verdict cannot be read this way: it means "not an array of a user
   * composite", which a non-array expression satisfies too.
   */
  private isProvablyArrayExpr(expr: Node, scope: Scope | null): boolean {
    const rec = expr as Record<string, unknown>;
    if ("A_ArrayExpr" in rec) return true;
    const tc = rec["TypeCast"] as { typeName?: { arrayBounds?: unknown[] } } | undefined;
    if (tc?.typeName?.arrayBounds?.length) return true;
    const rendered = this.renderedTypeOfExpr(expr, scope);
    return !!rendered && rendered.trim().endsWith("[]");
  }

  /**
   * The element type of a call to a pg_catalog function whose declared
   * return is a polymorphic ARRAY — `array_agg`, `array_remove`, `array_cat`
   * and the twenty-odd others — or null where the signatures do not answer.
   *
   * PostgreSQL resolves these from the arguments by one rule, uniform across
   * every captured signature: the result takes its type from the argument
   * declared with the matching ARRAY pseudo-type, and where a signature has
   * none, from the argument declared with the matching ELEMENT pseudo-type
   * plus one dimension. `unnest` then strips a dimension back off, so an
   * array-declared position answers with ITS element type and an
   * element-declared position answers with the argument's own type.
   *
   * Signatures that do not fit the call are DISCARDED rather than counted as
   * disagreement: `array_agg` declares both `(anynonarray)` and `(anyarray)`,
   * and a composite argument satisfies exactly one of them — the one
   * PostgreSQL picks. What remains must agree, the same consensus quantifier
   * every other overloaded question here takes.
   *
   * A call with `WITHIN GROUP`, `VARIADIC` or `*` is left alone: the
   * argument LIST no longer lines up with the signature's positions, and
   * `percentile_disc(double precision[], anyelement)` is exactly that shape.
   */
  private polymorphicArrayElementType(
    fc: FuncCall,
    scope: Scope | null,
    depth: number,
  ): { kind: "type"; parts: string[]; provablyComposite: boolean } | { kind: "scalar" } | null {
    // `WITHIN GROUP` is the only spelling whose argument list stops lining up
    // with the signature's — `percentile_disc(double precision[],
    // anyelement)` declares two while the call writes one and puts the other
    // after ORDER BY. A plain `agg(x ORDER BY y)` or `agg(DISTINCT x)` is an
    // ordinary call with a sort clause attached and its positions are
    // unaffected, so only the first is excluded.
    //
    // No fixture can tell this guard from its absence: the aggregated
    // argument never appears in `args`, so the arity test below rejects every
    // WITHIN GROUP call in PG18's catalog on its own. The guard states the
    // reason rather than relying on that coincidence holding.
    if (fc.agg_within_group || fc.agg_star || fc.func_variadic) return null;
    const sigs = this.catalog.resolvePolymorphicArraySignatures(
      this.funcSchema(fc),
      this.funcName(fc),
    );
    if (!sigs) return null;
    const args = fc.args ?? [];

    const answers: ({ kind: "type"; parts: string[] } | { kind: "scalar" })[] = [];
    for (const sig of sigs) {
      if (sig.args.length !== args.length) continue;
      const answer = this.elementTypeFromSignature(sig.args, args, scope, depth);
      if (answer) answers.push(answer);
    }
    if (answers.length === 0) return null;
    const first = answers[0]!;
    const agree = answers.every(a =>
      a.kind === "scalar" || first.kind === "scalar"
        ? a.kind === first.kind
        : a.parts.length === first.parts.length && a.parts.every((p, i) => p === first.parts[i]),
    );
    if (!agree) return null;
    return first.kind === "scalar"
      ? { kind: "scalar" }
      : { kind: "type", parts: first.parts, provablyComposite: false };
  }

  /**
   * The element type one signature yields for this argument list, or null
   * when the argument at its polymorphic position is not one the walk can
   * type — which is also how a signature the call does not fit drops out.
   */
  private elementTypeFromSignature(
    declared: string[],
    args: Node[],
    scope: Scope | null,
    depth: number,
  ): { kind: "type"; parts: string[] } | { kind: "scalar" } | null {
    const ARRAY_POLY = new Set(["anyarray", "anycompatiblearray"]);
    const ELEMENT_POLY = new Set([
      "anyelement",
      "anynonarray",
      "anycompatible",
      "anyenum",
    ]);

    for (let i = 0; i < declared.length; i++) {
      if (!ARRAY_POLY.has(declared[i]!)) continue;
      const element = this.unnestElementType(args[i]!, scope, depth);
      if (element.kind === "type") return { kind: "type", parts: element.parts };
      // A scalar array in, a scalar array out: `array_remove(ARRAY[1, 2],
      // NULL)` contributes one column, and the polymorphic name is no reason
      // to refuse what the argument already answered. But `scalar` is also
      // what a NON-array expression answers, and here that distinction
      // decides whether this SIGNATURE is the one PostgreSQL picked:
      // `array_agg` declares `(anyarray)` beside `(anynonarray)`, and a
      // composite argument fits only the second. So the scalar answer counts
      // only where the argument is provably an array.
      return element.kind === "scalar" && this.isProvablyArrayExpr(args[i]!, scope)
        ? { kind: "scalar" }
        : null;
    }
    for (let i = 0; i < declared.length; i++) {
      if (!ELEMENT_POLY.has(declared[i]!)) continue;
      const rendered = this.renderedTypeOfExpr(args[i]!, scope);
      if (!rendered) return null;
      // The result is this type with a dimension added and `unnest` takes it
      // straight back off, so an argument that is itself an array answers
      // with its own element type — `unnest` flattens every dimension.
      const { schema, name } = splitQualifiedName(rendered.replace(/(\[\])+$/, "").trim());
      return { kind: "type", parts: schema ? [schema, name] : [name] };
    }
    return null;
  }

  /**
   * The element type of a column a CTE or subquery COMPUTES rather than
   * re-exports, read from the expression that defines it.
   *
   * `reExportedBaseColumn` stops at "no base column", which is the right
   * answer to the question it asks and not to this one: `ARRAY[p]` has no
   * base column and a perfectly readable type. Unknown for anything that is
   * not a plain SELECT target — a star entry shifts positions, and a set
   * operation has two sides to disagree.
   */
  private computedColumnElementType(
    ref: Node,
    scope: Scope | null,
    depth: number,
  ): ReturnType<typeof this.unnestElementType> {
    if (!scope) return { kind: "unknown" };
    const parts = ((ref as Record<string, unknown>)["ColumnRef"] as ColumnRef).fields ?? [];
    const names = parts.map(f => this.stringVal(f));
    const colName = names[names.length - 1];
    if (!colName) return { kind: "unknown" };
    let owner: RelationEntry | undefined;
    if (names.length >= 2) {
      owner = this.resolveAlias(names[names.length - 2]!, scope) ?? undefined;
    } else {
      owner = scope.visible.find(v => v.name === colName && v.entry)?.entry ?? undefined;
    }
    if (!owner || (owner.kind !== "cte" && owner.kind !== "subquery")) return { kind: "unknown" };
    const select = (owner.ast as Record<string, unknown> | undefined)?.["SelectStmt"] as
      | SelectStmt
      | undefined;
    if (!select || (select.op && select.op !== "SETOP_NONE")) return { kind: "unknown" };

    const targets = select.targetList ?? [];
    const aliases = owner.cteColumns?.length ? owner.cteColumns : null;
    for (let i = 0; i < targets.length; i++) {
      const rt = this.unwrapResTarget(targets[i]!);
      if (!rt.val || this.isStarColumn(rt.val)) return { kind: "unknown" };
      const exported = aliases ? aliases[i] : (rt.name ?? this.inferName(rt.val));
      if (exported === colName) return this.elementTypeInSelect(rt.val, select, scope, depth);
    }
    return { kind: "unknown" };
  }

  /**
   * The same reading applied to an expression that lives inside `select` —
   * its column references resolve against that statement's own FROM, not the
   * caller's.
   *
   * The scope is built with the walk's own builder rather than a private
   * resolution: a derived table may join, alias or stage through a CTE, and
   * a second implementation of that would drift. A scope the builder refuses
   * leaves the type unknown, which is the caller's conservative path.
   */
  private elementTypeInSelect(
    expr: Node,
    select: SelectStmt,
    outerScope: Scope | null,
    depth: number,
  ): ReturnType<typeof this.unnestElementType> {
    this.checkDepth(depth);
    let innerScope: Scope;
    try {
      innerScope = this.buildScope(select, outerScope, depth + 1);
    } catch (e) {
      if (e instanceof UnsupportedNodeError) return { kind: "unknown" };
      throw e;
    }
    return this.unnestElementType(expr, innerScope, depth + 1);
  }

  /**
   * The rendered TYPE of an expression, wherever the walk can read it off
   * the catalog rather than infer it: a column reference — through the base
   * column a CTE or subquery re-exports, if that is what it is — and a
   * cast's target. Null for everything else, which is the caller's signal
   * to refuse; the walk simulates no types.
   */
  /**
   * An operand's type SET — the survivor return-type union of whatever
   * produced it (docs/type-aware-overloads.md, corrected 2026-08-09). Null
   * constrains nothing; a singleton is an exact type; a wider union
   * eliminates candidates no member can reach and collapses back to exact
   * wherever its members agree.
   *
   * Sources: the charter's literal table, measured — `ival` is always
   * integer, `boolval` always boolean, and `fval` is "numeric-ish digit
   * text" whose value must be READ to tell bigint from numeric (the lexer
   * spills every integer past int32 into fval — 2147483648 is bigint,
   * 9223372036854775808 and 1.5 are numeric); a string literal is
   * `unknown`, NOT text — PostgreSQL does not consider it typed either, and
   * assuming text would falsely eliminate the candidate PostgreSQL picks.
   * A nested BINARY operator recurses: its own candidate resolution's
   * return-type union is this operand's set, which is what makes
   * `(a + b) + (c + d)` compose — exactly, when each union is a singleton.
   * Everything else falls to `renderedTypeOfExpr` (columns, casts).
   */
  private operandTypeSet(expr: Node, scope: Scope | null, depth: number): string[] | null {
    this.checkDepth(depth);
    const rec = expr as Record<string, unknown>;
    const ac = rec["A_Const"] as
      | { ival?: unknown; boolval?: unknown; fval?: { fval?: string } }
      | undefined;
    if (ac) {
      if ("ival" in ac) return ["integer"];
      if ("boolval" in ac) return ["boolean"];
      if ("fval" in ac) {
        const digits = ac.fval?.fval ?? "";
        return /^[0-9]+$/.test(digits) &&
          (digits.length < 19 || (digits.length === 19 && digits <= "9223372036854775807"))
          ? ["bigint"]
          : ["numeric"];
      }
      return null;
    }
    const pr = rec["ParamRef"] as { number?: number } | undefined;
    if (pr) {
      const t = pr.number !== undefined ? this.paramTypes?.[pr.number - 1] : undefined;
      return t !== undefined ? [t] : null;
    }
    const ae = rec["A_Expr"] as AExpr | undefined;
    if (ae && (ae.kind === undefined || ae.kind === "AEXPR_OP") && ae.lexpr && ae.rexpr) {
      const opNames = (ae.name ?? []).map(n => this.stringVal(n));
      const op = opNames[opNames.length - 1] ?? "";
      const opSchema = opNames.length > 1 ? opNames[opNames.length - 2] : undefined;
      const narrowed = this.catalog.resolveOperatorTotality(
        opSchema,
        op,
        this.operandTypeSet(ae.lexpr, scope, depth + 1),
        this.operandTypeSet(ae.rexpr, scope, depth + 1),
      );
      return narrowed.kind === "unknown" ? null : narrowed.returns;
    }
    if (ae && (ae.kind === undefined || ae.kind === "AEXPR_OP") && !ae.lexpr && ae.rexpr) {
      const opNames = (ae.name ?? []).map(n => this.stringVal(n));
      const narrowed = this.catalog.resolveUnaryOperatorTotality(
        opNames.length > 1 ? opNames[opNames.length - 2] : undefined,
        opNames[opNames.length - 1] ?? "",
        this.operandTypeSet(ae.rexpr, scope, depth + 1),
      );
      return narrowed.kind === "unknown" ? null : narrowed.returns;
    }
    // A function result carries its union too — the resolved user
    // function's declared scalar return, or the builtin survivors' union.
    // Aggregate, window, set-returning, variadic-array and named-notation
    // shapes stay untyped; their semantics live in their own dispatches.
    const fcn = rec["FuncCall"] as FuncCall | undefined;
    if (
      fcn &&
      !fcn.over &&
      !(fcn as { agg_within_group?: boolean }).agg_within_group &&
      !fcn.agg_star &&
      !fcn.agg_distinct &&
      !fcn.agg_filter &&
      !fcn.func_variadic &&
      !(fcn.args ?? []).some(a => "NamedArgExpr" in (a as Record<string, unknown>))
    ) {
      const fname = this.funcName(fcn);
      const fschema = this.funcSchema(fcn);
      const argSets = (fcn.args ?? []).map(a => this.operandTypeSet(a, scope, depth + 1));
      const meta =
        this.catalog.resolveFunctionMetadata(fschema, fname) ??
        this.catalog.resolveUserFunctionTyped(fschema, fname, argSets);
      if (meta) {
        return !meta.isAggregate && !meta.returnsSet && meta.returnType !== ""
          ? [meta.returnType]
          : null;
      }
      const resolved = this.catalog.resolveBuiltinScalarTotality(fschema, fname, argSets);
      return resolved.kind === "unknown" ? null : resolved.returns;
    }
    const rendered = this.renderedTypeOfExpr(expr, scope);
    return rendered === null ? null : [rendered];
  }

  private renderedTypeOfExpr(expr: Node, scope: Scope | null): string | null {
    const rec = expr as Record<string, unknown>;
    const tc = rec["TypeCast"] as
      | { typeName?: { names?: Node[]; arrayBounds?: unknown[] } }
      | undefined;
    if (tc) {
      const parts = (tc.typeName?.names ?? [])
        .map(n => this.stringVal(n))
        .filter(p => !!p && p !== "pg_catalog");
      if (!parts.length) return null;
      return parts.join(".") + (tc.typeName?.arrayBounds?.length ? "[]" : "");
    }
    if (!("ColumnRef" in rec) || !scope) return null;
    const parts = ((rec["ColumnRef"] as ColumnRef).fields ?? []).map(f => this.stringVal(f));
    let owner: RelationEntry | undefined;
    let colName: string | undefined;
    if (parts.length >= 2) {
      owner = this.resolveAlias(parts[parts.length - 2]!, scope) ?? undefined;
      colName = parts[parts.length - 1];
    } else if (parts.length === 1) {
      colName = parts[0];
      for (const v of scope.visible) {
        if (v.name === colName && v.entry) {
          owner = v.entry;
          break;
        }
      }
    }
    if (!owner || !colName) return null;
    // A CTE or subquery entry has no catalog columns of its own; follow its
    // target list to the base column it re-exports. That is the shape any
    // query staging a value through a WITH takes, and it was one of
    // adversarial-3 finding 3's six spellings.
    const source = owner.table
      ? { table: owner.table, column: colName }
      : this.reExportedBaseColumn(owner, colName, scope);
    return source
      ? this.catalog.resolveColumnTypeName(source.table.schema, source.table.name, source.column)
      : null;
  }

  /**
   * The base-table column a CTE/subquery entry re-exports under `colName`,
   * or null. A deliberately shallow read of the entry's own target list: a
   * bare `col` or `alias.col` resolved against the inner statement's
   * relation references, joins descended into, and a re-export through
   * ANOTHER CTE followed one level further. Anything the inner query
   * computes rather than passes through has no base column, and the caller
   * refuses there.
   */
  private reExportedBaseColumn(
    entry: RelationEntry,
    colName: string,
    scope: Scope,
    seen: ReadonlySet<string> = new Set(),
  ): { table: ResolvedTable; column: string } | null {
    if (entry.kind !== "cte" && entry.kind !== "subquery") return null;
    const select = (entry.ast as Record<string, unknown> | undefined)?.["SelectStmt"] as
      | { targetList?: Node[]; fromClause?: Node[]; op?: string }
      | undefined;
    if (!select?.targetList || (select.op && select.op !== "SETOP_NONE")) return null;

    // Which target entry carries the name, by the entry's own column list so
    // an alias column list renames correctly.
    const names = entry.cteColumns?.length ? entry.cteColumns : null;
    let index = -1;
    for (let i = 0; i < select.targetList.length; i++) {
      const rt = (select.targetList[i] as { ResTarget?: { name?: string; val?: Node } }).ResTarget;
      if (!rt?.val) return null; // a star entry shifts every later position
      if (this.isStarColumn(rt.val)) return null;
      const exported = names ? names[i] : (rt.name ?? this.inferName(rt.val));
      if (exported === colName) {
        index = i;
        break;
      }
    }
    if (index < 0) return null;
    const val = (select.targetList[index] as { ResTarget?: { val?: Node } }).ResTarget!.val!;
    const cr = (val as Record<string, unknown>)["ColumnRef"] as ColumnRef | undefined;
    if (!cr) return null;
    const refParts = (cr.fields ?? []).map(f => this.stringVal(f));
    const innerName = refParts[refParts.length - 1];
    const innerQualifier = refParts.length >= 2 ? refParts[refParts.length - 2] : undefined;
    if (!innerName) return null;

    // Relation references anywhere in the inner FROM, joins descended into:
    // a CTE body that joins two tables and re-exports one's array column is
    // the same pass-through as one that selects from a single table.
    const relations: {
      schemaname?: string;
      relname?: string;
      alias?: { aliasname?: string };
    }[] = [];
    const collectRelations = (item: unknown): void => {
      const rec = item as Record<string, unknown> | null;
      if (!rec || typeof rec !== "object") return;
      const rv = rec["RangeVar"] as (typeof relations)[number] | undefined;
      if (rv?.relname) {
        relations.push(rv);
        return;
      }
      const je = rec["JoinExpr"] as { larg?: Node; rarg?: Node } | undefined;
      if (je) {
        collectRelations(je.larg);
        collectRelations(je.rarg);
      }
    };
    for (const item of select.fromClause ?? []) collectRelations(item);

    for (const rv of relations) {
      const alias = rv.alias?.aliasname ?? rv.relname!;
      if (innerQualifier !== undefined && innerQualifier !== alias) continue;
      const table = this.catalog.resolveTable(rv.schemaname, rv.relname!);
      if (table?.columns.includes(innerName)) return { table, column: innerName };
      // The reference may name ANOTHER CTE rather than a relation — a chain
      // of re-exports is still a re-export. `seen` stops a WITH RECURSIVE
      // self-reference from looping.
      const cte = rv.schemaname ? undefined : scope.ctes.get(rv.relname!);
      if (cte && !seen.has(rv.relname!)) {
        const inner = this.reExportedBaseColumn(
          {
            ...entry,
            ast: cte.ast,
            cteColumns: cte.columns,
          },
          innerName,
          scope,
          new Set([...seen, rv.relname!]),
        );
        if (inner) return inner;
      }
    }
    // An outer-scope reference (a LATERAL body reading its left side) is the
    // one remaining pass-through the inner FROM cannot explain.
    const outer = this.resolveAlias(innerQualifier ?? "", scope);
    return outer?.table?.columns.includes(innerName)
      ? { table: outer.table, column: innerName }
      : null;
  }

  /**
   * Expand a `pg_get_function_result` string into output columns.
   *
   * Handles `SETOF x`, `TABLE(a t1, b t2)`, a bare composite/table name, and
   * a bare scalar type. Anything unrecognised yields a single nullable column
   * named after the function.
   */
  private columnsForReturnType(
    returnType: string,
    fnName: string,
  ): { name: string; notNull: boolean }[] {
    const type = returnType.replace(/^setof\s+/i, "").trim();

    // RETURNS TABLE(a integer, b text)
    const tableMatch = /^table\s*\((.*)\)$/is.exec(type);
    if (tableMatch) {
      return splitTopLevel(tableMatch[1]!).flatMap(part => {
        const def = splitColumnDefinition(part);
        if (!def) return [];
        // A domain's NOT NULL is part of the type, so it IS enforced here.
        return [{ name: def.name, notNull: this.isNotNullDomainType(def.type) }];
      });
    }

    // RETURNS SETOF <table> / <composite>: the ROW type's columns.
    const row = this.rowTypeColumns(type);
    if (row) return row;

    // A scalar return type: one column named after the function.
    return [{ name: fnName, notNull: this.isNotNullDomainType(type) }];
  }

  /**
   * The columns of a rendered ROW type — a relation's or a composite's — or
   * null when the name is neither.
   *
   * Constraints do not travel with a row type: a `SETOF order_items` result
   * carries the column TYPES and none of the table's NOT NULLs. Only a
   * domain's NOT NULL survives, because that is part of the type.
   *
   * An ARRAY of either is not a row type — one column, not N.
   */
  private rowTypeColumns(rendered: string): { name: string; notNull: boolean }[] | null {
    const type = rendered.trim();
    if (type.endsWith("[]")) return null;
    // The snapshot is taken with an empty search_path, so anything outside
    // pg_catalog arrives schema-qualified: `SETOF public.order_items`, not
    // `SETOF order_items`. Resolve against the schema PostgreSQL named rather
    // than re-deriving it from a search path this code cannot see.
    const { schema: typeSchema, name: typeBase } = splitQualifiedName(type);

    const table = this.catalog.resolveTable(typeSchema, typeBase);
    if (table) {
      return table.columns.map(col => {
        const oid = this.catalog.resolveColumnTypeOid(table.schema, table.name, col);
        return { name: col, notNull: oid != null && this.catalog.isNotNullDomain(oid) };
      });
    }

    const composite = this.catalog.resolveCompositeType(typeSchema, typeBase);
    return composite
      ? composite.fields.map(f => ({
          name: f.name,
          notNull: this.catalog.isNotNullDomain(f.typeOid),
        }))
      : null;
  }

  /**
   * A function's FROM-position column list, read from its declared OUTPUT
   * PARAMETERS where it has them and from the rendered return type where it
   * does not.
   *
   * `pg_get_function_result` is a lossy rendering of what a function emits,
   * and the losses are not exotic:
   *
   *   - a function declared with OUT parameters renders `SETOF record` (or
   *     just the type, or nothing at all when there is no RETURNS clause),
   *     so `f(OUT a int, OUT b text)` looked like one column named `f`
   *     against PostgreSQL's `a, b` — measured, and the same defect
   *     `queryBuiltinTableFunctions` was built to fix for BUILTINS, left
   *     standing for user functions;
   *   - `RETURNS TABLE(x <composite>)` with ONE column is a function whose
   *     row type IS that composite, so PostgreSQL emits the composite's
   *     FIELDS where the rendering says one column named `x`.
   *
   * `proargmodes`/`proargnames`/`proallargtypes` say all of it, and the
   * snapshot has captured them all along. A single output column carries the
   * function's whole row type, which is why it expands rather than standing
   * on its own; two or more are the column list directly.
   *
   * A bare table alias does NOT rename a named output column (measured:
   * `SELECT * FROM f() z` keeps `a`) — only an explicit column alias list
   * does, which the caller applies positionally afterwards. `scalarName` is
   * therefore consulted only where the function has no named outputs at all.
   */
  private functionOutputColumns(
    meta: FunctionInfo,
    scalarName: string,
  ): { name: string; notNull: boolean }[] {
    const outs = meta.args.filter(
      a => a.mode === "out" || a.mode === "table" || a.mode === "inout",
    );
    if (outs.length === 0 || outs.some(a => !a.name)) {
      return this.columnsForReturnType(meta.returnType, scalarName);
    }
    if (outs.length === 1) {
      const only = outs[0]!;
      return (
        this.rowTypeColumns(only.typeName) ?? [
          { name: only.name, notNull: this.catalog.isNotNullDomain(only.typeOid) },
        ]
      );
    }
    return outs.map(a => ({
      name: a.name,
      notNull: this.catalog.isNotNullDomain(a.typeOid),
    }));
  }

  /**
   * A FROM item's column list with every flag cleared when the call behind it
   * can SHORT-CIRCUIT — see `callCanShortCircuit`. The row such a call emits
   * is all NULLs, whatever the declaration or the body says.
   *
   * The candidate set is quantified the conservative way: ANY candidate that
   * could short-circuit clears the list, because an overloaded name is
   * resolved by argument types the walk does not compute. Skipped outright
   * when the list claims nothing, which is the common case and keeps the
   * argument walk off the hot path.
   */
  private clearShortCircuitedColumns(
    cols: { name: string; notNull: boolean }[],
    fc: FuncCall,
    scope: Scope | null,
  ): { name: string; notNull: boolean }[] {
    if (!cols.some(c => c.notNull)) return cols;
    const candidates = this.catalog.resolveFunctionShapes(this.funcSchema(fc), this.funcName(fc));
    const shortCircuits = candidates.some(m =>
      this.callCanShortCircuit(m, this.callArgumentResults(m, fc, scope, 0)),
    );
    if (!shortCircuits) return cols;
    return cols.map(c => ({ name: c.name, notNull: false }));
  }

  /** Whether a type name as printed by PostgreSQL is a NOT NULL domain. */
  private isNotNullDomainType(typeName: string): boolean {
    const { schema, name } = splitQualifiedName(typeName.replace(/\[\]$/, "").trim());
    return this.catalog.isNotNullDomainByName(schema, name);
  }

  /**
   * Full output of a CTE or subquery relation: the analyzed query columns plus
   * any SEARCH/CYCLE columns the CTE clause generates.
   */
  private innerRelationColumns(
    entry: RelationEntry,
    scope: Scope,
    depth: number,
  ): OutputNullability[] {
    if (!entry.ast) return [];
    const results = this.analyzeStatement(entry.ast, scope, depth + 1);
    const all = entry.extraColumns?.length ? [...results, ...entry.extraColumns] : results;
    // An alias column list renames positionally, and PostgreSQL applies it
    // partially: naming fewer columns than exist leaves the rest alone, and
    // only naming more than exist is an error.
    const names = entry.cteColumns ?? [];
    if (names.length === 0) return all;
    return all.map((r, i) => ({ name: names[i] ?? r.name, notNull: r.notNull }));
  }

  /**
   * A relation's columns with their *intrinsic* nullability — before this
   * relation's join state, WHERE promotion or branch guards are applied.
   *
   * This is what a merged USING column needs (the merge accounts for presence
   * itself) and what scope building needs to know the column names.
   */
  private relationColumnsIntrinsic(
    entry: RelationEntry,
    scope: Scope,
    depth: number,
  ): { name: string; notNull: boolean }[] {
    if (entry.kind === "function") {
      return this.resolveTableFunctionColumns(entry, scope, depth);
    }
    if (entry.kind === "subquery" || entry.kind === "cte") {
      return this.innerRelationColumns(entry, scope, depth);
    }
    // A view's catalog columns are all attnotnull=false, so its definition is
    // the only source of truth — the same path a named reference takes.
    if (entry.kind === "view" && entry.ast && entry.table) {
      const inner = this.analyzeStatement(entry.ast, scope, depth + 1);
      return this.entryColumnNames(entry).map((col, i) => ({
        name: col,
        notNull: inner[i]?.notNull ?? false,
      }));
    }
    if (entry.table) {
      // The NAME is what the item answers to; the flag is a catalog question,
      // so the two lists are walked together rather than one standing for
      // both.
      const shown = this.entryColumnNames(entry);
      return entry.table.columns.map((col, i) => ({
        name: shown[i] ?? col,
        notNull: this.entryColumnNotNull(entry, col),
      }));
    }
    return [];
  }

  /**
   * The catalog flag a read through `entry` may rely on. A tree scan
   * (`FROM p`) returns rows of every descendant, and a child may lack the
   * parent's constraint (`ALTER TABLE ONLY p … SET NOT NULL` is legal —
   * measured), so it gets the subtree conjunction; only a scan that stays
   * in the named relation (`FROM ONLY p`, an INSERT target) may read the
   * relation's own flag. Entries with no explicit scan bit — synthetic
   * scopes, function results — take the conjunction, the conservative side.
   */
  /**
   * The names this entry ANSWERS TO — the catalog names with the alias column
   * list applied over them positionally. A partial list renames a prefix and
   * leaves the rest, which is PostgreSQL's rule.
   */
  private entryColumnNames(entry: RelationEntry): string[] {
    const cols = entry.table?.columns ?? [];
    const names = entry.columnAliases;
    return names ? cols.map((c, i) => names[i] ?? c) : cols;
  }

  /**
   * The CATALOG name behind a name the query used, or undefined when this
   * entry has no such column.
   *
   * The two directions are not symmetric and both matter: under
   * `AS r(c0, c1, c2)` the reference `r.c0` means the catalog's first column,
   * and the reference `r.id` means NOTHING — PostgreSQL rejects it, because
   * the rename hides the original name. Answering undefined for the second is
   * as much of the fix as translating the first.
   */
  private entryCatalogColumn(entry: RelationEntry, used: string): string | undefined {
    const cols = entry.table?.columns ?? [];
    if (!entry.columnAliases) return cols.includes(used) ? used : undefined;
    const i = this.entryColumnNames(entry).indexOf(used);
    return i >= 0 ? cols[i] : undefined;
  }

  private entryColumnNotNull(entry: RelationEntry, col: string): boolean {
    const t = entry.table!;
    return entry.scanInh === false
      ? this.catalog.resolveColumnNotNull(t.schema, t.name, col)
      : this.catalog.resolveColumnNotNullTree(t.schema, t.name, col);
  }

  /**
   * The generation expression a read through `entry` may evaluate — the
   * same scanInh split as the flags: a tree scan can return a child's rows,
   * and a child may compute an inherited column with its OWN expression
   * (measured), so the tree resolver refuses (null) on divergence and the
   * dispatch falls back to the (all-false) catalog flag.
   */
  private entryGenerationExpr(entry: RelationEntry, col: string): Node | null {
    const t = entry.table!;
    return entry.scanInh === false
      ? this.catalog.resolveGenerationExpr(t.schema, t.name, col)
      : this.catalog.resolveGenerationExprTree(t.schema, t.name, col);
  }

  // -------------------------------------------------------------------------
  // The core expression walker (leaf-first recursive)
  // -------------------------------------------------------------------------

  private walkExpr(expr: Node, scope: Scope, depth: number): boolean {
    return this.walkExprTraced(expr, scope, depth, NOOP);
  }

  private walkExprTraced(
    expr: Node,
    scope: Scope,
    depth: number,
    trace: ITrace,
  ): boolean {
    this.checkDepth(depth);
    const node = expr as Record<string, unknown>;

    // --- Leaves ---

    if ("A_Const" in node) {
      const ac = node["A_Const"] as { isnull?: boolean };
      const isnull = !!ac.isnull;
      trace.addFact("isnull", String(isnull));
      const result = !isnull;
      trace.conclude(result, result ? "literal is not NULL" : "NULL literal");
      return result;
    }

    if ("ColumnRef" in node) {
      const cr = node["ColumnRef"] as ColumnRef;
      const parts = (cr.fields ?? []).map(f => this.stringVal(f));
      trace.addFact("columnRef", parts.join("."));
      return this.resolveColumnRefTraced(cr, scope, depth, trace);
    }

    if ("ParamRef" in node) {
      const num = (node["ParamRef"] as { number?: number }).number ?? 0;
      if (this.fnCtx) {
        const argResult = this.fnCtx.argResults[num - 1] ?? false;
        trace.addFact("param", `$${num}`);
        trace.addFact("argResult", String(argResult));
        trace.conclude(argResult, `function arg $${num} → ${argResult ? "notNull" : "nullable"}`);
        return argResult;
      }
      if (this.bindRejectedParams.has(num)) {
        trace.addFact("param", `$${num}`);
        trace.addFact("bindRejected", "mechanism A: typed as a NOT NULL domain");
        trace.conclude(
          true,
          `$${num} rejects NULL at Bind, so any returned row proves it non-null`,
        );
        return true;
      }
      // WHERE-conjunct narrowing: this scope's rows each passed a conjunct
      // that cannot be TRUE with $num NULL. Implied ON quals are the same
      // evidence (resolveJoinImplications). Gated on rowsImplyWhere — an
      // ungrouped aggregate emits its row over zero input rows, proving
      // nothing about the WHERE or about any join qual. Unlike mechanism A
      // this narrows the output only; the parameter remains a perfectly
      // legal NULL binding that simply returns no rows.
      const narrowingPreds = [
        // WHERE and ON quals prove nothing when a row can be emitted over
        // zero input (the ungrouped-aggregate hazard); HAVING is exempt —
        // even that row had to pass it to be emitted.
        ...(scope.rowsImplyWhere && scope.whereClause ? [scope.whereClause] : []),
        ...(scope.rowsImplyWhere ? scope.impliedQuals : []),
        ...(scope.havingClause ? [scope.havingClause] : []),
      ];
      if (narrowingPreds.some(p => this.whereImpliesParamNotNull(p, num))) {
        trace.addFact("param", `$${num}`);
        trace.addFact("whereGuarantee", "a must-be-TRUE conjunct requires it non-null");
        trace.conclude(
          true,
          `every returned row passed a WHERE conjunct that is only TRUE with $${num} non-null`,
        );
        return true;
      }
      trace.addFact("param", `$${num}`);
      trace.addFact("context", "query-level (no PREPARE type info)");
      trace.conclude(false, "query-level param → conservative nullable");
      return false;
    }

    // --- SubLinks ---

    if ("SubLink" in node) {
      const sl = node["SubLink"] as SubLink;
      trace.addFact("subLinkType", sl.subLinkType ?? "unknown");
      return this.resolveSubLinkTraced(sl, scope, depth, trace);
    }

    // --- Internal nodes ---

    if ("NullTest" in node) {
      trace.conclude(true, "IS NULL / IS NOT NULL → always returns bool");
      return true;
    }

    if ("GroupingFunc" in node) {
      // GROUPING(...) reports a bitmask saying which of its arguments the
      // current grouping set collapsed. Always an integer, never NULL — even
      // in the super-aggregate rows where the arguments themselves are NULL.
      trace.conclude(true, "GROUPING() returns a bitmask, never NULL");
      return true;
    }

    if ("BooleanTest" in node) {
      // IS [NOT] TRUE / FALSE / UNKNOWN collapse three-valued logic to a plain
      // boolean — NULL in, FALSE or TRUE out, never NULL.
      trace.conclude(true, "IS [NOT] TRUE/FALSE/UNKNOWN → always returns bool");
      return true;
    }

    if ("SQLValueFunction" in node) {
      // CURRENT_DATE, CURRENT_TIMESTAMP, SESSION_USER and friends. All are
      // always defined except CURRENT_SCHEMA, which is NULL when the search
      // path names no existing schema.
      const svf = node["SQLValueFunction"] as { op?: string };
      const op = svf.op ?? "";
      trace.addFact("op", op);
      const canBeNull = op === "SVFOP_CURRENT_SCHEMA";
      trace.conclude(!canBeNull, canBeNull
        ? "CURRENT_SCHEMA is NULL when the search path resolves to nothing"
        : "SQL value function is always defined");
      return !canBeNull;
    }

    if ("TypeCast" in node) {
      const tc = node["TypeCast"] as { arg: Node; typeName?: { names?: Node[] } };
      if (tc.typeName?.names) {
        const typeNames = tc.typeName.names.map(n => this.stringVal(n));
        if (typeNames.length >= 2) {
          const schema = typeNames[typeNames.length - 2]!;
          const name = typeNames[typeNames.length - 1]!;
          const isNnDomain = this.catalog.isNotNullDomainByName(schema, name);
          trace.addFact("targetType", `${schema}.${name}`);
          trace.addFact("isNotNullDomain", String(isNnDomain));
          if (isNnDomain) {
            trace.conclude(true, "cast to NOT NULL domain → never NULL (throws instead)");
            return true;
          }
        } else if (typeNames.length === 1) {
          const name = typeNames[0]!;
          const isNnDomain = this.catalog.isNotNullDomainByName(undefined, name);
          trace.addFact("targetType", name);
          trace.addFact("isNotNullDomain", String(isNnDomain));
          if (isNnDomain) {
            trace.conclude(true, "cast to NOT NULL domain → never NULL (throws instead)");
            return true;
          }
        }
      }
      const childTrace = trace.addChild("TypeCast: arg");
      const result = this.walkExprTraced(tc.arg, scope, depth + 1, childTrace);
      trace.conclude(result, "cast preserves arg nullability");
      return result;
    }

    if ("CoalesceExpr" in node) {
      const ce = node["CoalesceExpr"] as { args?: Node[] };
      trace.addFact("argCount", String(ce.args?.length ?? 0));
      let i = 0;
      for (const arg of ce.args ?? []) {
        const childTrace = trace.addChild(`COALESCE arg[${i}]`);
        const argResult = this.walkExprTraced(arg, scope, depth + 1, childTrace);
        if (argResult) {
          trace.conclude(true, `arg[${i}] is non-null → COALESCE is non-null`);
          return true;
        }
        i++;
      }
      trace.conclude(false, "all args nullable → COALESCE nullable");
      return false;
    }

    if ("CaseExpr" in node) {
      const ce = node["CaseExpr"] as {
        /** Present for the simple form `CASE x WHEN v THEN ...`. */
        arg?: Node;
        args?: Node[];
        defresult?: Node;
      };
      // Without an ELSE branch, an unmatched CASE evaluates to NULL.
      if (!ce.defresult) {
        trace.addFact("hasElse", "false");
        trace.conclude(false, "CASE without ELSE → NULL when no branch matches");
        return false;
      }
      trace.addFact("hasElse", "true");
      // With an ELSE, exactly one branch always produces the value, so the
      // result is non-null iff every branch result is non-null.
      //
      // Each result is walked under the conditions that must hold for its
      // branch to run: branch i runs when every earlier condition was not TRUE
      // and its own condition was TRUE; the ELSE runs when no condition was
      // TRUE. Those guards let a nullable column read as non-null inside a
      // branch that tested it.
      //
      // The simple form `CASE x WHEN 1 THEN ...` compares values rather than
      // evaluating predicates, so its WHEN expressions are not conditions and
      // contribute no guards.
      const simpleForm = !!ce.arg;
      trace.addFact("caseForm", simpleForm ? "simple (CASE x WHEN v)" : "searched (CASE WHEN cond)");
      const earlierConditions: Node[] = [];

      let i = 0;
      for (const arg of ce.args ?? []) {
        const when = (arg as Record<string, unknown>)["CaseWhen"] as
          | { expr?: Node; result?: Node }
          | undefined;
        if (!when?.result) {
          trace.conclude(false, "CASE branch with no result → nullable");
          return false;
        }
        const childTrace = trace.addChild(`WHEN[${i}] result`);
        const branchNotNull = this.withGuards(
          scope,
          simpleForm ? [] : earlierConditions.map(p => ({ predicate: p, taken: false })),
          () =>
            this.withGuard(scope, simpleForm ? undefined : when.expr, true, () =>
              this.walkExprTraced(when.result!, scope, depth + 1, childTrace),
            ),
        );
        if (!branchNotNull) {
          trace.conclude(false, `WHEN[${i}] result is nullable → CASE nullable`);
          return false;
        }
        if (when.expr) earlierConditions.push(when.expr);
        i++;
      }

      const elseTrace = trace.addChild("ELSE result");
      const elseNotNull = this.withGuards(
        scope,
        simpleForm ? [] : earlierConditions.map(p => ({ predicate: p, taken: false })),
        () => this.walkExprTraced(ce.defresult!, scope, depth + 1, elseTrace),
      );
      trace.conclude(
        elseNotNull,
        elseNotNull
          ? "every branch and ELSE non-null → CASE non-null"
          : "ELSE result is nullable → CASE nullable",
      );
      return elseNotNull;
    }

    if ("A_Expr" in node) {
      return this.resolveAExprTraced(
        node["A_Expr"] as AExpr,
        scope,
        depth,
        trace,
      );
    }

    if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as { boolop?: string; args?: Node[] };
      if (be.boolop === "NOT_EXPR") {
        const arg = be.args?.[0];
        if (arg) {
          const childTrace = trace.addChild("NOT: arg");
          const result = this.walkExprTraced(arg, scope, depth + 1, childTrace);
          trace.conclude(result, "NOT → recurse into arg");
          return result;
        }
        trace.conclude(false, "NOT with no arg → nullable");
        return false;
      }
      // AND/OR are three-valued, but NULL can only enter through an operand.
      // With every operand non-null the result is a plain boolean.
      trace.addFact("boolop", be.boolop ?? "unknown");
      const allNotNull = this.operandsAllNotNull(be.args ?? [], scope, depth, trace, "operand");
      trace.conclude(
        allNotNull,
        allNotNull
          ? "all operands non-null → AND/OR yields a non-null boolean"
          : "an operand is nullable → three-valued logic → nullable",
      );
      return allNotNull;
    }

    if ("FuncCall" in node) {
      return this.resolveFuncCallTraced(node["FuncCall"] as FuncCall, scope, depth, trace);
    }

    if ("RowExpr" in node) {
      trace.conclude(true, "ROW constructor → never NULL");
      return true;
    }

    if ("A_ArrayExpr" in node) {
      trace.conclude(true, "ARRAY constructor → never NULL");
      return true;
    }

    if ("MinMaxExpr" in node) {
      // GREATEST/LEAST are the exception to NULL propagation: PostgreSQL
      // ignores NULL arguments and returns NULL only when *every* argument is
      // NULL. So one non-null argument makes the result non-null.
      const mm = node["MinMaxExpr"] as { op?: string; args?: Node[] };
      trace.addFact("op", mm.op ?? "unknown");
      let i = 0;
      for (const arg of mm.args ?? []) {
        const childTrace = trace.addChild(`arg[${i}]`);
        if (this.walkExprTraced(arg, scope, depth + 1, childTrace)) {
          trace.conclude(true, `arg[${i}] is non-null → GREATEST/LEAST skips NULLs → non-null`);
          return true;
        }
        i++;
      }
      trace.conclude(false, "all args nullable → GREATEST/LEAST nullable");
      return false;
    }

    if ("NamedArgExpr" in node) {
      const na = node["NamedArgExpr"] as { arg: Node };
      const childTrace = trace.addChild("NamedArgExpr: arg");
      const result = this.walkExprTraced(na.arg, scope, depth + 1, childTrace);
      trace.conclude(result, "NamedArgExpr → recurse into arg");
      return result;
    }

    if ("CollateClause" in node) {
      const cc = node["CollateClause"] as { arg: Node };
      const childTrace = trace.addChild("Collate: arg");
      const result = this.walkExprTraced(cc.arg, scope, depth + 1, childTrace);
      trace.conclude(result, "COLLATE preserves arg nullability");
      return result;
    }

    if ("A_Indirection" in node) {
      // Measured 2026-08-01: a SLICE never fails by range — it clamps, to an
      // empty array if need be — so it is NULL only when the array or a
      // bound is (strict + total). An ELEMENT subscript really is NULL out
      // of range, a composite FIELD inherits its unconstrained type, and a
      // jsonb subscript is NULL for a missing key: all correctly nullable.
      const ai = node["A_Indirection"] as { arg?: Node; indirection?: Node[] };
      const parts = ai.indirection ?? [];
      const allSlices =
        parts.length > 0 &&
        parts.every(p => {
          const idx = (p as { A_Indices?: { is_slice?: boolean } }).A_Indices;
          return idx?.is_slice === true;
        });
      if (allSlices && ai.arg) {
        const bounds = parts.flatMap(p => {
          const idx = (p as { A_Indices?: { lidx?: Node; uidx?: Node } }).A_Indices!;
          return [idx.lidx, idx.uidx].filter((b): b is Node => b !== undefined);
        });
        const argTrace = trace.addChild("slice: array");
        const argNotNull = this.walkExprTraced(ai.arg, scope, depth + 1, argTrace);
        const boundsNotNull = bounds.every((b, i) =>
          this.walkExprTraced(b, scope, depth + 1, trace.addChild(`slice: bound[${i}]`)),
        );
        const result = argNotNull && boundsNotNull;
        trace.conclude(
          result,
          result
            ? "slice of a non-null array with non-null bounds clamps, never NULLs → notNull"
            : "a NULL array or bound makes the slice NULL → nullable",
        );
        return result;
      }
      trace.conclude(false, "element/field/jsonb subscript → correctly nullable (out-of-range and missing-key are NULL)");
      return false;
    }

    if ("XmlExpr" in node) {
      // XMLELEMENT always constructs (measured: a NULL child yields `<e/>`,
      // not NULL). The other ops do return NULL — xmlconcat of NULLs and
      // xmlforest of a NULL field were both measured NULL — so only the
      // element constructor is upgraded.
      const xe = node["XmlExpr"] as { op?: string };
      if (xe.op === "IS_XMLELEMENT") {
        trace.conclude(true, "XMLELEMENT always constructs an element → notNull");
        return true;
      }
      trace.conclude(false, "XmlExpr → conservative nullable");
      return false;
    }

    // The SQL/JSON constructor and conversion family (PG16+ dedicated
    // nodes; json_build_object and friends stay FuncCalls). Measured
    // 2026-08-01: the value-list constructors always produce a container —
    // a NULL member is absorbed or serialized, never propagated — while
    // JSON() / JSON_SCALAR() / JSON_SERIALIZE() / XMLSERIALIZE are strict
    // (NULL in → NULL out; malformed input raises rather than returning
    // NULL), and `IS JSON` is NULL for NULL input — a predicate, but not a
    // total one, unlike NullTest. JSON_ARRAY(SELECT …) is NOT here: over an
    // empty subquery it returns NULL (measured), so JsonArrayQueryConstructor
    // stays on the conservative fallback, as do the path-query functions
    // (JsonFuncExpr — a missing path is NULL).
    // The SQL/JSON path-query family (measured 2026-08-01). JSON_EXISTS is
    // the ONE member that can be non-null: with a non-null context item it
    // returns true/false, and its default ON ERROR is FALSE — only UNKNOWN
    // ON ERROR reintroduces NULL. JSON_VALUE and JSON_QUERY are permanently
    // nullable: a FOUND JSON null maps to SQL NULL through every handler
    // combination (neither ON EMPTY nor ON ERROR fires on a successful
    // match), so no clause analysis can ever prove them — correctly
    // conservative, not imprecise.
    if ("JsonFuncExpr" in node) {
      const jf = node["JsonFuncExpr"] as {
        op?: string;
        context_item?: { raw_expr?: Node };
        on_error?: { btype?: string };
      };
      if (
        jf.op === "JSON_EXISTS_OP" &&
        (!jf.on_error || jf.on_error.btype !== "JSON_BEHAVIOR_UNKNOWN") &&
        jf.context_item?.raw_expr
      ) {
        const childTrace = trace.addChild("JSON_EXISTS: context item");
        const result = this.walkExprTraced(jf.context_item.raw_expr, scope, depth + 1, childTrace);
        trace.conclude(
          result,
          "JSON_EXISTS over a non-null context is a plain boolean (ON ERROR defaults FALSE)",
        );
        return result;
      }
      trace.conclude(
        false,
        "JSON_VALUE/JSON_QUERY map a found JSON null to SQL NULL through every handler; UNKNOWN ON ERROR does the same for JSON_EXISTS → nullable",
      );
      return false;
    }

    if ("JsonObjectConstructor" in node || "JsonArrayConstructor" in node) {
      trace.conclude(true, "SQL/JSON value-list constructor always produces a container → notNull");
      return true;
    }

    // `merge_action()` labels the arm that produced the row — 'INSERT',
    // 'UPDATE' or 'DELETE' — and every returned row came from one, including
    // the NOT MATCHED BY SOURCE arm (measured, all three). It is legal only
    // in a MERGE's RETURNING list, which PostgreSQL enforces, so there is no
    // context in which it has no arm to name.
    if ("MergeSupportFunc" in node) {
      trace.conclude(true, "merge_action() names the arm every returned row came from → notNull");
      return true;
    }
    {
      const strictJson =
        ("JsonParseExpr" in node && (node["JsonParseExpr"] as JsonUnaryShape)) ||
        ("JsonScalarExpr" in node && (node["JsonScalarExpr"] as JsonUnaryShape)) ||
        ("JsonSerializeExpr" in node && (node["JsonSerializeExpr"] as JsonUnaryShape)) ||
        ("JsonIsPredicate" in node && (node["JsonIsPredicate"] as JsonUnaryShape)) ||
        ("XmlSerialize" in node && (node["XmlSerialize"] as JsonUnaryShape));
      if (strictJson) {
        // The operand is either the raw node (JSON_SCALAR, IS JSON,
        // XMLSERIALIZE) or wrapped in an inlined JsonValueExpr (raw_expr).
        const operand =
          (strictJson.expr as { raw_expr?: Node } | undefined)?.raw_expr ??
          (strictJson.expr as Node | undefined);
        if (operand) {
          const childTrace = trace.addChild("strict JSON/XML conversion: arg");
          const result = this.walkExprTraced(operand, scope, depth + 1, childTrace);
          trace.conclude(result, "strict conversion: NULL in → NULL out, else a value");
          return result;
        }
        trace.conclude(false, "strict JSON/XML conversion with no operand → conservative");
        return false;
      }
    }

    if ("SetToDefault" in node) {
      trace.conclude(false, "SetToDefault → conservative nullable");
      return false;
    }

    // Name the node we gave up on. Without this the fallback is invisible:
    // the result is safe (nullable) but there is no way to tell an expression
    // we deliberately treat conservatively from one nobody has considered.
    // The node-census test consults this fact to flag the latter.
    const unknownTag = this.nodeTag(node);
    this.onUnhandled?.("expression", unknownTag);
    trace.addFact("unhandledNodeType", unknownTag);
    trace.conclude(false, `unhandled node type '${unknownTag}' → conservative nullable`);
    return false;
  }

  // -------------------------------------------------------------------------
  // A_Expr resolution (operators, IN, BETWEEN, LIKE, IS DISTINCT FROM, NULLIF)
  // -------------------------------------------------------------------------

  /**
   * Walk every node in `nodes` and report whether all of them are non-null.
   *
   * `List` nodes are flattened — the parser wraps BETWEEN bounds and IN
   * element lists in one.
   */
  private operandsAllNotNull(
    nodes: (Node | undefined)[],
    scope: Scope,
    depth: number,
    trace: ITrace,
    label: string,
  ): boolean {
    let allNotNull = true;
    let i = 0;
    for (const n of nodes) {
      if (!n) continue;
      const inner = (n as Record<string, unknown>)["List"] as { items?: Node[] } | undefined;
      if (inner) {
        if (!this.operandsAllNotNull(inner.items ?? [], scope, depth, trace, label)) {
          allNotNull = false;
        }
        continue;
      }
      const childTrace = trace.addChild(`${label}[${i}]`);
      if (!this.walkExprTraced(n, scope, depth + 1, childTrace)) allNotNull = false;
      i++;
    }
    return allNotNull;
  }

  private resolveAExprTraced(
    ae: AExpr,
    scope: Scope,
    depth: number,
    trace: ITrace,
  ): boolean {
    const kind = ae.kind ?? "AEXPR_OP";
    trace.addFact("kind", kind);

    switch (kind) {
      // `IS DISTINCT FROM` / `IS NOT DISTINCT FROM` are NULL-aware by
      // definition: they always yield a plain boolean, even for NULL inputs.
      case "AEXPR_DISTINCT":
      case "AEXPR_NOT_DISTINCT":
        trace.conclude(true, "IS [NOT] DISTINCT FROM → always a non-null boolean");
        return true;

      // NULLIF(a, b) returns NULL exactly when a = b — never provably non-null.
      case "AEXPR_NULLIF":
        trace.conclude(false, "NULLIF returns NULL when the operands are equal");
        return false;

      // `= ANY(...)` / `= ALL(...)` over an array is NULL when the left operand
      // is NULL, or when no element matches and some element is NULL. A literal
      // ARRAY[...] constructor lets us inspect the elements; anything else (a
      // column, a parameter) hides them, so we stay conservative.
      case "AEXPR_OP_ANY":
      case "AEXPR_OP_ALL": {
        const arrayExpr = (ae.rexpr as Record<string, unknown> | undefined)?.["A_ArrayExpr"] as
          | { elements?: Node[] }
          | undefined;
        if (!arrayExpr) {
          trace.conclude(false, "ANY/ALL over an opaque array — elements may be NULL → nullable");
          return false;
        }
        const allNotNull = this.operandsAllNotNull(
          [ae.lexpr, ...(arrayExpr.elements ?? [])], scope, depth, trace, "operand",
        );
        trace.conclude(
          allNotNull,
          allNotNull
            ? `${kind} over a literal array with no NULL elements → non-null boolean`
            : `${kind} with a nullable operand or array element → nullable`,
        );
        return allNotNull;
      }

      // These all reduce to strict boolean tests: non-null operands in,
      // non-null boolean out.
      case "AEXPR_IN":
      case "AEXPR_LIKE":
      case "AEXPR_ILIKE":
      case "AEXPR_SIMILAR":
      case "AEXPR_BETWEEN":
      case "AEXPR_NOT_BETWEEN":
      case "AEXPR_BETWEEN_SYM":
      case "AEXPR_NOT_BETWEEN_SYM": {
        const allNotNull = this.operandsAllNotNull(
          [ae.lexpr, ae.rexpr], scope, depth, trace, "operand",
        );
        trace.conclude(
          allNotNull,
          allNotNull
            ? `${kind} with all operands non-null → non-null boolean`
            : `${kind} with a nullable operand → nullable`,
        );
        return allNotNull;
      }

      case "AEXPR_OP":
      default: {
        // Only a known-total operator lets us propagate. Strictness is not
        // enough: `->` and `->>` are strict yet return NULL for a missing
        // key, so the operator must be on the allowlist of operators that
        // never produce NULL from non-null inputs.
        const opNames = (ae.name ?? []).map(n => this.stringVal(n));
        const qualified = opNames.length > 1;
        const op = opNames[opNames.length - 1] ?? "";
        trace.addFact("operator", opNames.join("."));

        // Type-aware narrowing first (docs/type-aware-overloads.md, the
        // operator slice): where the operand types are readable, the
        // candidate set — path-visible user operators MERGED with the
        // captured builtin signatures — replaces the bare-name allowlist,
        // which closed the shadowing blind spot and the `path + path`
        // hole. "unknown" falls through to the allowlist path below, whose
        // recorded holes then apply only to the untypeable residue.
        if (ae.lexpr && ae.rexpr) {
          const opSchema2 = qualified ? opNames[opNames.length - 2] : undefined;
          const lt = this.operandTypeSet(ae.lexpr, scope, depth + 1);
          const rt = this.operandTypeSet(ae.rexpr, scope, depth + 1);
          const narrowed = this.catalog.resolveOperatorTotality(opSchema2, op, lt, rt);
          if (narrowed.kind !== "unknown") {
            trace.addFact(
              "operandTypes",
              `${lt?.join("|") ?? "unknown"}, ${rt?.join("|") ?? "unknown"}`,
            );
            if (narrowed.kind === "user-exact") {
              trace.addFact(
                "customOperator",
                `${op} → ${narrowed.functionSchema}.${narrowed.functionName} (type-narrowed)`,
              );
              const synthetic = {
                funcname: [
                  { String: { sval: narrowed.functionSchema } },
                  { String: { sval: narrowed.functionName } },
                ],
                args: [ae.lexpr, ae.rexpr],
              } as unknown as FuncCall;
              const childTrace = trace.addChild(`operator '${op}' backing function`);
              const result = this.resolveFuncCallTraced(synthetic, scope, depth + 1, childTrace);
              trace.conclude(
                result,
                `type-narrowed operator dispatched through its backing function → ${result ? "notNull" : "nullable"}`,
              );
              return result;
            }
            if (narrowed.kind === "total") {
              trace.addFact("totalOperator", "true (signature-narrowed)");
              const allNotNull = this.operandsAllNotNull(
                [ae.lexpr, ae.rexpr], scope, depth, trace, "operand",
              );
              trace.conclude(
                allNotNull,
                allNotNull
                  ? `every surviving candidate of '${op}' is total and all operands non-null → non-null`
                  : `operand of '${op}' is nullable → nullable`,
              );
              return allNotNull;
            }
            trace.addFact("totalOperator", "false (signature-narrowed)");
            trace.conclude(
              false,
              `operator '${op}' keeps a non-total or unvouched candidate for these operand types → nullable`,
            );
            return false;
          }
        }

        // The PREFIX form, same machinery over the leftType-null rows.
        if (!ae.lexpr && ae.rexpr) {
          const opSchema2 = qualified ? opNames[opNames.length - 2] : undefined;
          const at = this.operandTypeSet(ae.rexpr, scope, depth + 1);
          const narrowed = this.catalog.resolveUnaryOperatorTotality(opSchema2, op, at);
          if (narrowed.kind !== "unknown") {
            trace.addFact("operandTypes", at?.join("|") ?? "unknown");
            if (narrowed.kind === "user-exact") {
              trace.addFact(
                "customOperator",
                `${op} → ${narrowed.functionSchema}.${narrowed.functionName} (type-narrowed)`,
              );
              const synthetic = {
                funcname: [
                  { String: { sval: narrowed.functionSchema } },
                  { String: { sval: narrowed.functionName } },
                ],
                args: [ae.rexpr],
              } as unknown as FuncCall;
              const childTrace = trace.addChild(`operator '${op}' backing function`);
              const result = this.resolveFuncCallTraced(synthetic, scope, depth + 1, childTrace);
              trace.conclude(
                result,
                `type-narrowed operator dispatched through its backing function → ${result ? "notNull" : "nullable"}`,
              );
              return result;
            }
            if (narrowed.kind === "total") {
              trace.addFact("totalOperator", "true (signature-narrowed)");
              const allNotNull = this.operandsAllNotNull(
                [ae.rexpr], scope, depth, trace, "operand",
              );
              trace.conclude(
                allNotNull,
                allNotNull
                  ? `every surviving candidate of '${op}' is total and the operand non-null → non-null`
                  : `operand of '${op}' is nullable → nullable`,
              );
              return allNotNull;
            }
            trace.addFact("totalOperator", "false (signature-narrowed)");
            trace.conclude(
              false,
              `operator '${op}' keeps a non-total or unvouched candidate for this operand type → nullable`,
            );
            return false;
          }
        }
        // A schema-qualified operator may be user-defined and shadow a
        // built-in symbol, so only bare names are matched.
        if (qualified || !TOTAL_OPERATORS.has(op)) {
          // A user operator has no totality flag, but it wraps a function
          // that has ALL the function machinery: dispatch the backing
          // function (single-candidate policy) through the FuncCall rules —
          // NOT NULL domain return, LANGUAGE sql body inlining, the strict
          // policy — with the operands as arguments. `x === y` resolves to
          // lenient_eq, whose body is analysed like any sql function's.
          const opSchema = qualified ? opNames[opNames.length - 2] : undefined;
          const custom = this.catalog.resolveOperatorMetadata(opSchema, op);
          if (custom?.functionSchema && custom.functionName) {
            trace.addFact(
              "customOperator",
              `${op} → ${custom.functionSchema}.${custom.functionName}`,
            );
            const synthetic = {
              funcname: [
                { String: { sval: custom.functionSchema } },
                { String: { sval: custom.functionName } },
              ],
              args: [ae.lexpr, ae.rexpr].filter((n): n is Node => n !== undefined),
            } as unknown as FuncCall;
            const childTrace = trace.addChild(`operator '${op}' backing function`);
            const result = this.resolveFuncCallTraced(synthetic, scope, depth + 1, childTrace);
            trace.conclude(
              result,
              `custom operator dispatched through its backing function → ${result ? "notNull" : "nullable"}`,
            );
            return result;
          }
          trace.addFact("totalOperator", "false");
          trace.conclude(false, `operator '${op}' may return NULL for non-null inputs → nullable`);
          return false;
        }
        trace.addFact("totalOperator", "true");
        const allNotNull = this.operandsAllNotNull(
          [ae.lexpr, ae.rexpr], scope, depth, trace, "operand",
        );
        trace.conclude(
          allNotNull,
          allNotNull
            ? `total operator '${op}' with non-null operands → non-null`
            : `operand of '${op}' is nullable → nullable`,
        );
        return allNotNull;
      }
    }
  }

  // -------------------------------------------------------------------------
  // ColumnRef resolution
  // -------------------------------------------------------------------------

  private resolveColumnRefTraced(
    ref: ColumnRef,
    scope: Scope,
    depth: number,
    trace: ITrace,
  ): boolean {
    const fields = (ref.fields ?? []) as Node[];
    const parts = fields.map(f => {
      const fNode = f as Record<string, unknown>;
      if ("String" in fNode) return (fNode["String"] as { sval?: string }).sval ?? "";
      return "";
    });
    if (parts.length === 0) return false;

    // Skip A_Star (shouldn't reach here — handled by expandStar).
    if (fields.some(f => "A_Star" in (f as Record<string, unknown>))) return false;

    // In a LANGUAGE sql function body context, an unqualified ColumnRef may
    // reference a named parameter (e.g. `SELECT x` where `x` is the param).
    // Check this before normal scope resolution.
    if (this.fnCtx && parts.length === 1) {
      const paramName = parts[0]!;
      const argIndex = this.fnParamNames?.indexOf(paramName) ?? -1;
      if (argIndex >= 0) {
        const result = this.fnCtx.argResults[argIndex] ?? false;
        trace.addFact("fnParam", paramName);
        trace.addFact("argIndex", String(argIndex));
        trace.addFact("argResult", String(result));
        trace.conclude(result, `function param '${paramName}' → ${result ? "notNull" : "nullable"}`);
        return result;
      }
      // Also try $N positional references inside the body.
      // (Old-style bodies use $1, $2 which are ParamRef nodes, not ColumnRef.)
    }

    // 1 part: unqualified `col`.
    if (parts.length === 1) {
      return this.resolveUnqualifiedColumnTraced(parts[0]!, scope, depth, trace);
    }

    // 2 parts: `alias.col`.
    if (parts.length === 2) {
      return this.resolveAliasedColumnTraced(parts[0]!, parts[1]!, scope, depth, trace);
    }

    // 3 parts: `schema.alias.col` — treat as alias.col.
    if (parts.length === 3) {
      return this.resolveAliasedColumnTraced(parts[1]!, parts[2]!, scope, depth, trace);
    }

    trace.conclude(false, `unresolvable ColumnRef (${parts.length} parts)`);
    return false;
  }


  private resolveUnqualifiedColumnTraced(
    colName: string,
    scope: Scope,
    depth: number,
    trace: ITrace,
  ): boolean {
    // An unqualified name resolves against the scope's visible columns — the
    // same set `SELECT *` expands to. A USING join's merged column is what is
    // visible under that name; the constituents are reachable only when
    // qualified.
    const here = this.resolveVisible(colName, scope, scope, depth, trace, "inner scope");
    if (here !== undefined) return here;

    // Correlated reference into the enclosing query.
    if (scope.outer) {
      const outer = this.resolveVisible(
        colName, scope.outer, scope.outer, depth, trace, "outer/correlated scope",
      );
      if (outer !== undefined) return outer;
    }

    trace.addFact("resolved", "NOT_FOUND");
    trace.conclude(false, `column '${colName}' not found in any scope → nullable`);
    return false;
  }

  /**
   * Look `colName` up among `lookupScope`'s visible columns.
   *
   * Returns undefined when the name is not visible there, so the caller can
   * continue searching outward. A name matching more than one visible column
   * is ambiguous: PostgreSQL rejects such a query outright, so rather than
   * picking one — which makes the answer depend on FROM-clause order — the
   * walk reports nullable, the same treatment it gives a name it cannot find.
   */
  private resolveVisible(
    colName: string,
    lookupScope: Scope,
    resolveScope: Scope,
    depth: number,
    trace: ITrace,
    where: string,
  ): boolean | undefined {
    const matches = lookupScope.visible.filter(vc => vc.name === colName);
    if (matches.length === 0) return undefined;

    if (matches.length > 1) {
      const owners = matches.map(m => m.entry?.alias ?? "<merged>").join(", ");
      trace.addFact("resolved", "AMBIGUOUS");
      trace.addFact("candidates", owners);
      trace.conclude(
        false,
        `column '${colName}' is ambiguous in the ${where} (${matches.length} visible columns: ${owners}) → nullable`,
      );
      return false;
    }

    const vc = matches[0]!;
    if (vc.merged) {
      const result = this.mergedColumnNotNull(colName, vc.merged, resolveScope, depth);
      trace.addFact("resolved", `merged join column (${where})`);
      trace.addFact("jointype", vc.merged.jointype);
      trace.conclude(result, `merged USING/NATURAL column '${colName}' → ${result ? "notNull" : "nullable"}`);
      return result;
    }
    if (!vc.entry) return undefined;
    trace.addFact("resolved", `alias '${vc.entry.alias}' (${where})`);
    return this.computeColumnNullabilityTraced(vc.entry, colName, resolveScope, depth, trace);
  }

  private resolveAliasedColumnTraced(
    aliasName: string,
    colName: string,
    scope: Scope,
    depth: number,
    trace: ITrace,
  ): boolean {
    const entry = this.resolveAlias(aliasName, scope);
    if (entry) {
      trace.addFact("resolved", `alias '${aliasName}'`);
      return this.computeColumnNullabilityTraced(entry, colName, scope, depth, trace);
    }
    trace.addFact("resolved", `alias '${aliasName}' NOT_FOUND`);
    trace.conclude(false, `alias '${aliasName}' not found → nullable`);
    return false;
  }

  private resolveAlias(aliasName: string, scope: Scope): RelationEntry | null {
    let s: Scope | null = scope;
    while (s) {
      if (s.aliases.has(aliasName)) return s.aliases.get(aliasName)!;
      s = s.outer;
    }
    return null;
  }

  private computeColumnNullabilityTraced(
    entry: RelationEntry,
    colName: string,
    scope: Scope,
    depth: number,
    trace: ITrace,
    /**
     * Answer the question "were this entry's row present, would the column
     * be non-null?" — the extension lifted, everything else (catalog,
     * generated expressions, CHECK entailment, the inner analysis) intact.
     * The presence-group discriminant condition; never used by the walk's
     * own claims.
     */
    presumePresent = false,
    /**
     * The column's POSITION in the entry's own output list, supplied by
     * star expansion — the one caller that can reach a duplicate-named
     * inner column. When present it replaces every name-based inner
     * lookup below; explicit references never need it (PostgreSQL rejects
     * them as ambiguous before any contract ships).
     */
    ordinal?: number,
  ): boolean {
    let joinState =
      presumePresent || this.presumedPresent.has(entry) ? REQUIRED : entry.joinState;

    trace.addFact("relation", `${entry.kind} '${entry.alias}'`);
    trace.addFact("colName", colName);
    trace.addFact("joinState", joinStateName(joinState));

    // ROLLUP / CUBE / GROUPING SETS report NULL for the grouping columns a
    // super-aggregate row collapses, overriding both the catalog flag and any
    // WHERE guarantee — the row exists, the column is simply blanked.
    if (
      scope.groupingSetColumns.has(colName) ||
      scope.groupingSetColumns.has(`${entry.alias}.${colName}`)
    ) {
      trace.addFact("groupingSetColumn", "true");
      trace.conclude(false, "column is collapsed by ROLLUP/CUBE/GROUPING SETS → NULL in super-aggregate rows");
      return false;
    }

    // Check WHERE promotion: if the WHERE clause guarantees this column
    // is non-null, promote OPTIONAL → REQUIRED.
    const whereGuarantees = this.checkWhereGuarantee(entry.alias, colName, scope);
    trace.addFact("whereGuarantee", String(whereGuarantees));

    if (whereGuarantees && joinState === OPTIONAL) {
      joinState = REQUIRED;
    }
    // A WHERE guarantee also overrides catalog nullability to non-null.
    if (whereGuarantees) {
      trace.addFact("joinStateAfterPromotion", joinStateName(joinState));
      trace.conclude(true, "WHERE guarantee on this column → notNull");
      return true;
    }

    // A branch guard is the same kind of evidence as a WHERE guarantee, just
    // scoped to the CASE branch being walked rather than the whole SELECT.
    if (this.guardsImplyNotNull(entry.alias, colName, scope)) {
      trace.addFact("branchGuarantee", "true");
      trace.conclude(true, "branch condition guarantees this column is non-null → notNull");
      return true;
    }

    // Per-alias promotion: if the WHERE has any predicate on any column of
    // this alias (in an AND-conjunct), the alias is promoted to REQUIRED.
    if (joinState === OPTIONAL && this.checkWhereAliasPromoted(entry.alias, scope)) {
      joinState = REQUIRED;
      trace.addFact("whereAliasPromoted", "true (predicate on alias → INNER JOIN)");
      trace.addFact("joinStateAfterPromotion", joinStateName(joinState));
    }

    // Likewise for a branch guard that proves the alias's row exists.
    if (joinState === OPTIONAL && this.guardsPromoteAlias(entry.alias, scope)) {
      joinState = REQUIRED;
      trace.addFact("branchAliasPromoted", "true (branch condition implies the row exists)");
      trace.addFact("joinStateAfterPromotion", joinStateName(joinState));
    }

    // Null-group promotion: relations NULL-extended as a unit stand or fall
    // together, so a predicate proving any member's row exists proves it for
    // this one too. In `(o JOIN oi) LEFT JOIN p`, `WHERE o.id IS NOT NULL`
    // promotes `oi` as well — `o` and `oi` can never be half-NULL-extended.
    if (joinState === OPTIONAL) {
      const promoter = this.findNullGroupPromoter(entry, scope);
      if (promoter) {
        joinState = REQUIRED;
        trace.addFact("nullGroupPromotedBy", `${promoter} (same null group ${entry.nullGroup})`);
        trace.addFact("joinStateAfterPromotion", joinStateName(joinState));
      }
    }

    // For views: analyze the stored definition and map its output columns onto
    // the view's column list by position. The catalog's attnotnull is useless
    // here — PostgreSQL reports false for every view column.
    if (entry.kind === "view" && entry.ast && entry.table) {
      const innerResults = this.analyzeStatement(entry.ast, scope, depth + 1);
      const colIndex = ordinal ?? this.entryColumnNames(entry).indexOf(colName);
      const inner = colIndex >= 0 ? innerResults[colIndex] : undefined;
      if (inner) {
        const result = inner.notNull && joinState !== OPTIONAL;
        trace.addFact("viewDefinition", `${entry.table.schema}.${entry.table.name}`);
        trace.addFact("innerResult", `${inner.notNull ? "notNull" : "nullable"} (col[${colIndex}])`);
        if (
          !result &&
          joinState !== OPTIONAL &&
          inner.origins &&
          this.originCheckEntailment(entry, inner.origins, inner.originNotNull, innerResults, this.entryColumnNames(entry), scope, trace)
        ) {
          trace.conclude(true, "origin CHECK entailment through the view → notNull");
          return true;
        }
        trace.conclude(result, `view column[${colIndex}] ${inner.notNull ? "notNull" : "nullable"} + join ${joinStateName(joinState)}`);
        return result;
      }
      trace.conclude(false, `column '${colName}' not found in view definition output`);
      return false;
    }

    // Table functions: the resolved return-type columns.
    if (entry.kind === "function") {
      const col = this.resolveTableFunctionColumns(entry, scope, depth).find(c => c.name === colName);
      if (!col) {
        trace.conclude(false, `column '${colName}' not found in the function's return type`);
        return false;
      }
      const result = col.notNull && joinState !== OPTIONAL;
      trace.addFact("tableFunction", entry.alias);
      trace.addFact("returnTypeNotNull", String(col.notNull));
      trace.conclude(result, `table-function column '${colName}' ${col.notNull ? "notNull (domain)" : "nullable (row type carries no constraints)"} + join ${joinStateName(joinState)}`);
      return result;
    }

    // For subqueries/CTEs: recurse into the inner scope.
    if (entry.kind === "subquery" || entry.kind === "cte") {
      if (entry.ast) {
        const innerResults = this.innerRelationColumns(entry, scope, depth);
        const outerNames = innerResults.map((r, i) => entry.cteColumns?.[i] ?? r.name);

        // The nullable-but-origin-carrying escape: the inner column is a
        // bare pass-through of a base table column, so the base table's
        // validated CHECKs can meet THIS scope's evidence — the one thing
        // the boolean interface alone cannot express.
        const tryOrigin = (inner: OutputNullability): boolean =>
          !inner.notNull &&
          joinState !== OPTIONAL &&
          !!inner.origins &&
          this.originCheckEntailment(entry, inner.origins, inner.originNotNull, innerResults, outerNames, scope, trace);

        // Star expansion resolves positionally — the only caller that can
        // reach a duplicate-named inner column, where a name lookup would
        // first-match the wrong one.
        if (ordinal !== undefined) {
          const inner = innerResults[ordinal];
          if (inner) {
            const result = inner.notNull && joinState !== OPTIONAL;
            trace.addFact("innerResult", `${inner.notNull ? "notNull" : "nullable"} (ordinal ${ordinal})`);
            if (!result && tryOrigin(inner)) {
              trace.conclude(true, "origin CHECK entailment through the CTE/subquery → notNull");
              return true;
            }
            trace.conclude(result, `CTE/subquery column[${ordinal}] ${inner.notNull ? "notNull" : "nullable"} + join ${joinStateName(joinState)}`);
            return result;
          }
          trace.conclude(false, `ordinal ${ordinal} out of range for CTE/subquery output`);
          return false;
        }

        // For VALUES subqueries, the inner results have auto-generated names
        // (column1, column2, ...). Map the alias column names to positions.
        if (entry.cteColumns && entry.cteColumns.length > 0) {
          const colIndex = entry.cteColumns.indexOf(colName);
          if (colIndex >= 0 && colIndex < innerResults.length) {
            const inner = innerResults[colIndex]!;
            const result = inner.notNull && joinState !== OPTIONAL;
            trace.addFact("innerResult", `${inner.notNull ? "notNull" : "nullable"} (col[${colIndex}])`);
            if (!result && tryOrigin(inner)) {
              trace.conclude(true, "origin CHECK entailment through the CTE/subquery → notNull");
              return true;
            }
            trace.conclude(result, `CTE/subquery column[${colIndex}] ${inner.notNull ? "notNull" : "nullable"} + join ${joinStateName(joinState)}`);
            return result;
          }
          // Also try matching by name (for non-VALUES subqueries with alias colnames).
          const col = innerResults.find(r => r.name === colName);
          if (col) {
            const result = col.notNull && joinState !== OPTIONAL;
            trace.addFact("innerResult", `${col.notNull ? "notNull" : "nullable"} (by name '${colName}')`);
            if (!result && tryOrigin(col)) {
              trace.conclude(true, "origin CHECK entailment through the CTE/subquery → notNull");
              return true;
            }
            trace.conclude(result, `CTE/subquery col '${colName}' ${col.notNull ? "notNull" : "nullable"} + join ${joinStateName(joinState)}`);
            return result;
          }
          trace.conclude(false, `column '${colName}' not found in CTE/subquery output`);
          return false;
        }

        const col = innerResults.find(r => r.name === colName);
        if (col) {
          const result = col.notNull && joinState !== OPTIONAL;
          trace.addFact("innerResult", `${col.notNull ? "notNull" : "nullable"} (by name '${colName}')`);
          if (!result && tryOrigin(col)) {
            trace.conclude(true, "origin CHECK entailment through the CTE/subquery → notNull");
            return true;
          }
          trace.conclude(result, `CTE/subquery col '${colName}' ${col.notNull ? "notNull" : "nullable"} + join ${joinStateName(joinState)}`);
          return result;
        }
        trace.conclude(false, `column '${colName}' not found in CTE/subquery output`);
        return false;
      }
      trace.conclude(false, "CTE/subquery has no AST → nullable");
      return false;
    }

    // For tables/views: read catalog notNull + join nullability.
    if (entry.table) {
      // Under an alias COLUMN LIST the name the query used is not the name
      // the catalog knows, and everything below this line asks the catalog or
      // a constraint definition — both of which speak catalog names. An
      // unknown name here is a column the relation does not answer to, which
      // PostgreSQL rejects outright; nullable is the safe answer to a question
      // that will never be asked.
      const catalogCol = this.entryCatalogColumn(entry, colName);
      if (catalogCol === undefined) {
        trace.conclude(false, `'${colName}' is not a column of ${entry.alias}`);
        return false;
      }
      const catalogNotNull = this.entryColumnNotNull(entry, catalogCol);
      trace.addFact("catalog.notNull", String(catalogNotNull));
      trace.addFact("table", `${entry.table.schema}.${entry.table.name}`);
      // DML RETURNING: a column whose WRITTEN value is provably non-null on
      // every path that can produce a returned row (see the analyzers'
      // dmlWrittenColumns construction). Written evidence only ever
      // upgrades — a nullable expression written into a NOT NULL column
      // raises rather than returning, so the catalog side stands on its own.
      if (
        scope.dmlWrittenColumns &&
        scope.dmlWrittenColumns.alias === entry.alias &&
        scope.dmlWrittenColumns.columns.get(catalogCol) === true
      ) {
        trace.addFact("writtenValue", "provably non-null on every returning path");
        trace.conclude(true, "the written value is non-null → notNull in RETURNING");
        return true;
      }
      // A GENERATED column is its expression over THIS row's other columns,
      // so walking the expression with its refs bound to this entry gives
      // the column's true nullability — and composes with everything the
      // reading site knows (WHERE promotion, guards, the written-value
      // map), because the stored row IS the read row. The joinState gate is
      // load-bearing: a NULL-extended row nulls a generated column exactly
      // like any other, however non-null its expression is per-row
      // (COALESCE(b,'anon') under LEFT JOIN is the pinned counterexample).
      // Cycle-free by PostgreSQL's rules; the in-flight set is insurance
      // against hand-built catalogs, not a reachable state.
      if (!catalogNotNull && joinState !== OPTIONAL) {
        const genKey = `${entry.table.schema}.${entry.table.name}.${catalogCol}`;
        const genExpr =
          this.generationInFlight.has(genKey)
            ? null
            : this.entryGenerationExpr(entry, catalogCol);
        if (genExpr) {
          this.generationInFlight.add(genKey);
          try {
            const genTrace = trace.addChild("generation expression");
            const result = this.walkExprTraced(
              this.qualifyColumnRefs(genExpr, entry.alias, entry),
              scope,
              depth + 1,
              genTrace,
            );
            if (result) {
              trace.addFact("generatedColumn", "expression provably non-null");
              trace.conclude(true, "generation expression over this row's columns → notNull");
              return true;
            }
            trace.addFact("generatedColumn", "expression not provably non-null");
          } finally {
            this.generationInFlight.delete(genKey);
          }
        }
        // CHECK-constraint entailment: every row of the table satisfies its
        // validated CHECKs in the not-FALSE sense, and the row-implied
        // predicates — the checkWhereGuarantee evidence list plus this
        // scope's taken branch guards — are TRUE. The kernel derives
        // `col IS NOT NULL` from the two by syntactic entailment. The
        // joinState gate is shared with the generation branch and equally
        // load-bearing: a NULL-extended row satisfies no CHECK.
        //
        // A DML statement has TWO stored rows per returned row (OLD and
        // NEW, both CHECK-satisfying), and soundness is row-consistency:
        // every fact must hold on the row the derivation runs against, and
        // the goal must equal its value there. WHERE-side facts tested the
        // OLD row and transfer to NEW only through non-SET columns; guard
        // facts describe the row the guarded expression reads — NEW in
        // RETURNING, OLD in a SET expression (dmlOldRowRead). Hence up to
        // two runs: the NEW row (core masked, guards free, any goal) and
        // the OLD row (core free, guards masked, goal restricted to
        // non-SET columns, whose OLD value IS the returned one).
        // See src/query/check-entailment.ts.
        // Which CHECK list depends on what the scan can return, exactly
        // like entryColumnNotNull's flag choice: a tree scan can return
        // child rows, which never satisfied a NO INHERIT constraint, so it
        // reads the tree list; only `FROM ONLY` (scanInh === false) stays
        // in the named relation and may read the full one.
        const checkExprs =
          entry.scanInh === false
            ? this.catalog.resolveCheckConstraints(entry.table.schema, entry.table.name)
            : this.catalog.resolveCheckConstraintsTree(entry.table.schema, entry.table.name);
        // Generated columns contribute EQUALITY facts (col = expr per stored
        // row, OLD and NEW alike) — the kernel's arm exclusion turns a
        // discriminator filter over a generated CASE back into its selected
        // arm's condition, which can pin the goal with no CHECK at all.
        const generatedEqualities: { column: string; expr: Node }[] = [];
        for (const col of entry.table.columns) {
          // Same scanInh split: the equality fact `col = expr` is FALSE for
          // a child row computed with a different expression.
          const colGenExpr = this.entryGenerationExpr(entry, col);
          if (colGenExpr) {
            generatedEqualities.push({
              column: `${entry.alias}.${this.entryColumnNames(entry)[entry.table.columns.indexOf(col)] ?? col}`,
              expr: this.qualifyColumnRefs(colGenExpr, entry.alias, entry),
            });
          }
        }
        if (checkExprs.length > 0 || generatedEqualities.length > 0) {
          const setCols =
            scope.dmlSetColumns?.alias === entry.alias ? scope.dmlSetColumns.columns : null;
          const core: Node[] = [
            ...(scope.whereClause ? [scope.whereClause] : []),
            ...(scope.havingClause ? [scope.havingClause] : []),
            ...scope.impliedQuals,
          ];
          const guardPreds = this.kernelGuardPreds(scope);
          const channels: { label: string; evidence: { pred: Node; applySetMask: boolean }[] }[] =
            [];
          if (!setCols || this.dmlOldRowRead) {
            // One row in play: no SET mask exists, or this is a SET
            // expression reading the OLD row, where core and guards alike
            // tested that same row.
            channels.push({
              label: this.dmlOldRowRead ? "OLD row (SET expression read)" : "row",
              evidence: [...core, ...guardPreds].map(pred => ({ pred, applySetMask: false })),
            });
          } else {
            channels.push({
              label: "NEW row",
              evidence: [
                ...core.map(pred => ({ pred, applySetMask: true })),
                ...guardPreds.map(pred => ({ pred, applySetMask: false })),
              ],
            });
            if (!setCols.has(catalogCol)) {
              channels.push({
                label: "OLD row",
                evidence: [
                  ...core.map(pred => ({ pred, applySetMask: false })),
                  ...guardPreds.map(pred => ({ pred, applySetMask: true })),
                ],
              });
            }
          }
          for (const channel of channels) {
            const ckTrace = trace.addChild(
              `CHECK entailment (${channel.label}): ${entry.table.schema}.${entry.table.name}`,
            );
            const proved = checkConstraintsProveNotNull({
              // The shown name, not the catalog one: the CHECKs above were
              // renamed into this scope's vocabulary, and a goal in the other
              // vocabulary matches none of them.
              goal: { alias: entry.alias, column: colName },
              checkExprs: checkExprs.map(c => this.qualifyColumnRefs(c, entry.alias, entry)),
              evidence: channel.evidence,
              generatedEqualities,
              isMasked: (alias, col) => !!setCols && alias === entry.alias && setCols.has(col),
              resolveUnqualified: col => {
                let owner: string | null = null;
                for (const v of scope.visible) {
                  if (v.name !== col) continue;
                  if (!v.entry || owner) return null; // merged or ambiguous
                  owner = v.entry.alias;
                }
                return owner;
              },
              // The kernel asks these with the names the CHECK expressions
              // carry, which are this scope's — so they translate back before
              // the catalog sees them. Only the CASE arm-exclusion path calls
              // them, which is why a plain `OR` CHECK survived a rename and
              // one written as a CASE did not.
              columnTypeName: (alias, col) => {
                const e = scope.aliases.get(alias);
                const cat = e ? this.entryCatalogColumn(e, col) : undefined;
                return e?.table && cat !== undefined
                  ? this.catalog.resolveColumnTypeName(e.table.schema, e.table.name, cat)
                  : null;
              },
              literalDistinctnessSound: (alias, col) => {
                const e = scope.aliases.get(alias);
                const cat = e ? this.entryCatalogColumn(e, col) : undefined;
                return e?.table && cat !== undefined
                  ? this.catalog.resolveLiteralDistinctnessSound(e.table.schema, e.table.name, cat)
                  : false;
              },
              trace: ckTrace,
            });
            ckTrace.conclude(
              proved,
              proved
                ? "a validated CHECK plus row-implied evidence entails `col IS NOT NULL`"
                : "no derivation reaches `col IS NOT NULL`",
            );
            if (proved) {
              trace.conclude(true, `CHECK-constraint entailment (${channel.label}) → notNull`);
              return true;
            }
          }
        }
      }
      const result = catalogNotNull && joinState !== OPTIONAL;
      trace.conclude(result, `catalog.notNull=${catalogNotNull} && join ${joinStateName(joinState)}${joinState === OPTIONAL ? " (OPTIONAL → nullable)" : ""}`);
      return result;
    }

    trace.conclude(false, "unresolved relation → nullable");
    return false;
  }

  // -------------------------------------------------------------------------
  // Origin tracking — CHECK entailment at a referencing scope
  // -------------------------------------------------------------------------

  /**
   * Run CHECK entailment for a column that crossed a scope boundary as a
   * bare pass-through (see ColumnOrigin). The CHECKs come from the ORIGIN
   * table; the evidence is THIS scope's, with every reference to `entry`
   * rewritten from its outer column names to the origin's base column names
   * — but only for sibling columns riding the SAME rowPath, which is what
   * keeps a self-join over one CTE from co-deriving across two different
   * base rows. References of `entry` with no same-row mapping are rewritten
   * to an unmatchable name rather than left in place: an outer name that
   * happens to collide with a base column name must not leak into the base
   * key space. A single unmasked run — a CTE/subquery/view is never a DML
   * target, so there is no OLD/NEW split at this boundary.
   */
  /**
   * Whether EVERY stored row of `schema.table` has `column` non-null — the
   * given-present question asked STRUCTURALLY, with no outer evidence: the
   * generation expression walked in a synthetic single-table scope, where
   * refs resolve to catalog flags, nested generation expressions, and the
   * table's validated CHECKs. Sound for any present row because every
   * fact consulted holds per stored row. Attempted only for generated
   * columns — the catalog flag answers everything else more cheaply — and
   * memoized per column (evidence-free, so the answer never varies).
   */
  private storedRowNotNullMemo = new Map<string, boolean>();

  private storedRowNotNull(schema: string, table: string, column: string): boolean {
    // The tree reading: this is an origin-side fact ("non-null on every
    // stored row"), and the origin row may be a child's — computed with a
    // DIFFERENT expression when the generation diverges, in which case no
    // formula stands for the whole tree.
    if (!this.catalog.resolveGenerationExprTree(schema, table, column)) return false;
    const key = `${schema}.${table}.${column}`;
    const memoized = this.storedRowNotNullMemo.get(key);
    if (memoized !== undefined) return memoized;
    const resolved = this.catalog.resolveTable(schema, table);
    if (!resolved) return false;
    const synth = this.emptyScope(null);
    const entry: RelationEntry = {
      alias: table,
      kind: "table",
      table: resolved,
      joinState: REQUIRED,
      nullGroup: this.nextNullGroup(),
      unitChain: [],
      instance: this.nextInstance(),
    };
    synth.aliases.set(table, entry);
    synth.visible.push(...resolved.columns.map(c => ({ name: c, entry, merged: null })));
    const result = this.computeColumnNullability(entry, column, synth, 0);
    this.storedRowNotNullMemo.set(key, result);
    return result;
  }

  private originCheckEntailment(
    entry: RelationEntry,
    goalOrigins: (ColumnOrigin | null)[],
    goalSettled: boolean[] | undefined,
    innerResults: OutputNullability[],
    outerNames: readonly string[],
    scope: Scope,
    trace: ITrace,
  ): boolean {
    // A UNION column's row came from exactly ONE alternative — and the same
    // one as every sibling's, which is why the per-alternative run matches
    // siblings index by index. Proof must cover every alternative: a slot
    // with an origin runs entailment; a NULL slot (a branch that could not
    // attribute — a literal, an expression) is proven exactly when that
    // branch's own flat analysis settled the column non-null, which is
    // what closes the literal-branch shape without inventing provenance.
    return (
      goalOrigins.length > 0 &&
      goalOrigins.every((o, k) =>
        o
          ? this.originAlternativeEntailment(entry, o, k, innerResults, outerNames, scope, trace)
          : goalSettled?.[k] === true,
      )
    );
  }

  /** One origin alternative's entailment run — see originCheckEntailment. */
  private originAlternativeEntailment(
    entry: RelationEntry,
    goalOrigin: ColumnOrigin,
    alternative: number,
    innerResults: OutputNullability[],
    outerNames: readonly string[],
    scope: Scope,
    trace: ITrace,
  ): boolean {
    // Origins carry no ONLY bit (see the notNullTree comment below), so the
    // tree list is the sound reading: a NO INHERIT constraint is dropped
    // whenever the origin relation has descendants, since the origin row may
    // be a child's.
    const checkExprs = this.catalog.resolveCheckConstraintsTree(
      goalOrigin.schema,
      goalOrigin.table,
    );
    const originTable = this.catalog.resolveTable(goalOrigin.schema, goalOrigin.table);
    const generatedEqualities: { column: string; expr: Node }[] = [];
    for (const col of originTable?.columns ?? []) {
      // Tree reading, like the CHECK list above: the equality fact is false
      // for a child row computed with a diverging expression.
      const genExpr = this.catalog.resolveGenerationExprTree(
        goalOrigin.schema,
        goalOrigin.table,
        col,
      );
      if (genExpr) {
        generatedEqualities.push({
          column: `${entry.alias}.${col}`,
          expr: this.qualifyColumnRefs(genExpr, entry.alias, entry),
        });
      }
    }
    // Origins do not carry the producing scan's ONLY bit, so the tree
    // conjunction is the sound reading here — an origin produced by
    // `FROM p` can carry a child-stored row. The cost is precision on a
    // `FROM ONLY parent` origin whose children diverge, a shape nothing
    // exercises.
    const catalogNotNull = this.catalog.resolveColumnNotNullTree(
      goalOrigin.schema,
      goalOrigin.table,
      goalOrigin.column,
    );
    // Non-null on EVERY stored row: the catalog flag, or — for generated
    // columns, which are never catalog-NOT NULL — the generation
    // expression proven by the walk in a synthetic single-table scope
    // (the kernel-boundary closure: the entailment atoms cannot say
    // COALESCE or arithmetic, but the walk already can).
    const givenPresent =
      catalogNotNull ||
      this.storedRowNotNull(goalOrigin.schema, goalOrigin.table, goalOrigin.column);
    // A REQUIRED alternative with such a goal is done outright: its row is
    // present by construction and the value is that row's stored value.
    // The flat boolean upstream cannot say this per-branch — a set
    // operation's combined notNull collapses over branches, so an INNER
    // branch's certainty must be recovered here, alternative by
    // alternative (found by the widened generated axis).
    if (!goalOrigin.optional && givenPresent) {
      trace.addChild(`origin ${goalOrigin.schema}.${goalOrigin.table}.${goalOrigin.column}`)
        .conclude(true, "required alternative + non-null per stored row");
      return true;
    }
    // An OPTIONAL chain with such a goal has a derivation even with no
    // CHECKs at all: evidence-proven presence settles it (the
    // presence-consumption closure — the kernel's short-circuit).
    const goalNotNullGivenPresent = goalOrigin.optional && givenPresent;
    if (checkExprs.length === 0 && generatedEqualities.length === 0 && !goalNotNullGivenPresent) {
      return false;
    }

    // outer column name → base column, for same-row siblings. A duplicated
    // outer name is dropped entirely — PostgreSQL rejects references to it,
    // but the walk must not guess.
    const rename = new Map<string, string>();
    const dropped = new Set<string>();
    for (let i = 0; i < innerResults.length; i++) {
      const name = outerNames[i] ?? innerResults[i]!.name;
      const o = innerResults[i]!.origins?.[alternative];
      if (!o || !this.sameRowPath(o.rowPath, goalOrigin.rowPath)) continue;
      if (dropped.has(name)) continue;
      if (rename.has(name)) {
        rename.delete(name);
        dropped.add(name);
        continue;
      }
      rename.set(name, o.column);
    }
    // Cross-table presence certifiers (the unit-chain closure, found by the
    // widened generated axis): a column whose origin COVERS the goal's
    // crossings — same unit at the same depth under an equal rowPath
    // prefix — certifies the goal's presence when pinned: extension is
    // atomic per unit, and a child unit's presence implies every
    // enclosing one's. Such columns join the rename map under
    // collision-proof sentinel names, so the kernel's presence gate sees
    // their pinned atoms while CHECK derivation never can (no CHECK
    // mentions a sentinel) — cross-row facts must not masquerade as
    // same-row evidence.
    const goalUnits = goalOrigin.units ?? [];
    if (goalOrigin.optional && goalUnits.length > 0) {
      for (let i = 0; i < innerResults.length; i++) {
        const name = outerNames[i] ?? innerResults[i]!.name;
        const o = innerResults[i]!.origins?.[alternative];
        if (!o || this.sameRowPath(o.rowPath, goalOrigin.rowPath)) continue;
        if (dropped.has(name) || rename.has(name)) continue;
        const covers = goalUnits.every(gc =>
          (o.units ?? []).some(
            oc =>
              oc.unit === gc.unit &&
              oc.depth === gc.depth &&
              this.sameRowPath(
                o.rowPath.slice(0, gc.depth),
                goalOrigin.rowPath.slice(0, gc.depth),
              ),
          ),
        );
        if (!covers) continue;
        // NUL cannot occur in a PostgreSQL identifier, so the sentinel
        // can never collide with a real column name in any CHECK.
        rename.set(name, `\u0000p${i}`);
      }
    }

    const evidence = [
      ...(scope.whereClause ? [scope.whereClause] : []),
      ...(scope.havingClause ? [scope.havingClause] : []),
      ...scope.impliedQuals,
      ...this.kernelGuardPreds(scope),
    ].map(pred => ({
      pred: this.rewriteRefsToOrigin(pred, entry.alias, rename, scope),
      applySetMask: false,
    }));

    const ckTrace = trace.addChild(
      `CHECK entailment (origin): ${goalOrigin.schema}.${goalOrigin.table} via '${entry.alias}'`,
    );
    ckTrace.addFact("rowPath", goalOrigin.rowPath.join("→"));
    ckTrace.addFact("sameRowColumns", [...rename.keys()].join(", ") || "(none)");
    if (goalOrigin.optional) {
      ckTrace.addFact("presence", "required — the chain crosses an OPTIONAL slice");
    }
    const proved = checkConstraintsProveNotNull({
      goal: { alias: entry.alias, column: goalOrigin.column },
      // NOT renamed through `entry`: these CHECKs belong to the BASE table the
      // origin points at, while `entry` is the view or CTE it was reached
      // through. This site resolves unqualified refs through its own
      // outer-name → origin-column map below, so the expressions stay in
      // catalog names and renaming here would apply a second, unrelated one.
      checkExprs: checkExprs.map(c => this.qualifyColumnRefs(c, entry.alias)),
      evidence,
      generatedEqualities,
      // Promotion-at-distance: an optional chain's base row exists only for
      // rows some EVIDENCE fact pins a same-row column of — checked in the
      // kernel before the harvest fixpoint, whose facts presuppose presence.
      presenceColumns: goalOrigin.optional
        ? [...rename.values()].map(c => `${entry.alias}.${c}`)
        : undefined,
      goalNotNullGivenPresent,
      isMasked: () => false,
      resolveUnqualified: col => {
        let owner: string | null = null;
        for (const v of scope.visible) {
          if (v.name !== col) continue;
          if (!v.entry || owner) return null;
          owner = v.entry.alias;
        }
        return owner;
      },
      columnTypeName: (alias, col) => {
        if (alias === entry.alias) {
          return this.catalog.resolveColumnTypeName(goalOrigin.schema, goalOrigin.table, col);
        }
        const e = scope.aliases.get(alias);
        return e?.table
          ? this.catalog.resolveColumnTypeName(e.table.schema, e.table.name, col)
          : null;
      },
      literalDistinctnessSound: (alias, col) => {
        if (alias === entry.alias) {
          return this.catalog.resolveLiteralDistinctnessSound(
            goalOrigin.schema,
            goalOrigin.table,
            col,
          );
        }
        const e = scope.aliases.get(alias);
        return e?.table
          ? this.catalog.resolveLiteralDistinctnessSound(e.table.schema, e.table.name, col)
          : false;
      },
      trace: ckTrace,
    });
    ckTrace.conclude(
      proved,
      proved
        ? "the origin table's validated CHECK plus this scope's evidence entails non-null"
        : "no derivation reaches the origin column",
    );
    return proved;
  }

  private sameRowPath(a: readonly number[], b: readonly number[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  /**
   * The scope's branch guards as kernel evidence. A TAKEN guard's predicate
   * was TRUE — WHERE-conjunct strength. A NOT-taken guard's predicate was
   * FALSE *or NULL* (3VL), which certifies FALSE only for predicates that
   * cannot evaluate NULL — the same totality rule `falsityImpliesNotNull`
   * lives by, here as a syntactic gate (IS [NOT] NULL atoms under any
   * AND/OR shape). Those enter NOT-wrapped; the kernel's NOT branch and
   * De Morgan turn them into FALSE facts.
   */
  private kernelGuardPreds(scope: Scope): Node[] {
    const preds: Node[] = [];
    for (const g of this.guards) {
      if (g.scope !== scope) continue;
      if (g.taken) {
        preds.push(g.predicate);
      } else if (this.predicateIsTotal(g.predicate, scope)) {
        preds.push({ BoolExpr: { boolop: "NOT_EXPR", args: [g.predicate] } } as unknown as Node);
      }
    }
    return preds;
  }

  /**
   * Whether a predicate can never evaluate NULL: NullTests, and — Wave 11c
   * — builtin total+strict comparisons whose every operand is provably
   * non-null (a bare column the CATALOG declares NOT NULL, or a non-NULL
   * literal), under any AND/OR shape. The resulting FALSE fact stays purely
   * propositional: it can only meet a CHECK atom by token identity or the
   * same-token negator pairing — `CASE WHEN qty > 0 …`'s ELSE discharges a
   * CHECK written around the literal `qty > 0`, and nothing is ever
   * concluded across DIFFERENT literals (qty > -20 implies qty's relation
   * to 0 only under order reasoning over literal VALUES — a theory solver,
   * refused; see the register's Decided-against entry).
   */
  private predicateIsTotal(pred: Node, scope: Scope): boolean {
    const node = pred as Record<string, unknown>;
    if ("NullTest" in node) return true;
    const be = node["BoolExpr"] as { boolop?: string; args?: Node[] } | undefined;
    if (be && (be.boolop === "AND_EXPR" || be.boolop === "OR_EXPR")) {
      const args = be.args ?? [];
      return args.length > 0 && args.every(a => this.predicateIsTotal(a, scope));
    }
    if ("A_Expr" in node) {
      const ae = node["A_Expr"] as { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node };
      if (ae.kind !== "AEXPR_OP" || !ae.lexpr || !ae.rexpr) return false;
      const parts = (ae.name ?? []).map(f => this.stringVal(f));
      if (parts.length !== 1 || !TOTAL_OPERATOR_NAMES.has(parts[0]!)) return false;
      return (
        this.operandNeverNull(ae.lexpr, scope) && this.operandNeverNull(ae.rexpr, scope)
      );
    }
    return false;
  }

  /** A bare catalog-NOT NULL column ref, or a non-NULL literal (cast or bare). */
  private operandNeverNull(expr: Node, scope: Scope): boolean {
    let node = expr as Record<string, unknown>;
    const tc = node["TypeCast"] as { arg?: Node } | undefined;
    if (tc?.arg) node = tc.arg as Record<string, unknown>;
    const ac = node["A_Const"] as { isnull?: boolean } | undefined;
    if (ac) return ac.isnull !== true;
    if ("ColumnRef" in node) {
      const bare = this.resolveBareColumnTarget({ ColumnRef: node["ColumnRef"] } as Node, scope);
      return !!bare?.entry.table && this.entryColumnNotNull(bare.entry, bare.column);
    }
    return false;
  }

  /**
   * A clone of `pred` with every ColumnRef owned by `alias` renamed to its
   * origin base column (or to an unmatchable name when it has no same-row
   * mapping). Refs of other relations are untouched.
   */
  private rewriteRefsToOrigin(
    pred: Node,
    alias: string,
    rename: ReadonlyMap<string, string>,
    scope: Scope,
  ): Node {
    const clone = structuredClone(pred);
    const rewrite = (node: unknown): void => {
      if (Array.isArray(node)) {
        node.forEach(rewrite);
        return;
      }
      if (!node || typeof node !== "object") return;
      const obj = node as Record<string, unknown>;
      const cr = obj["ColumnRef"] as { fields?: Node[] } | undefined;
      if (cr?.fields) {
        const parts: string[] = [];
        let plain = true;
        for (const f of cr.fields) {
          if (!("String" in (f as Record<string, unknown>))) {
            plain = false;
            break;
          }
          parts.push(this.stringVal(f));
        }
        if (plain && parts.length >= 1 && parts.length <= 3) {
          let owner: string | null = null;
          let col: string | null = null;
          if (parts.length === 1) {
            col = parts[0]!;
            for (const v of scope.visible) {
              if (v.name !== col) continue;
              if (!v.entry || owner) {
                owner = null;
                break;
              }
              owner = v.entry.alias;
            }
          } else {
            owner = parts.length === 2 ? parts[0]! : parts[1]!;
            col = parts[parts.length - 1]!;
          }
          if (owner === alias && col !== null) {
            const mapped = rename.get(col) ?? "\u0000unmapped";
            cr.fields = [
              { String: { sval: alias } } as unknown as Node,
              { String: { sval: mapped } } as unknown as Node,
            ];
          }
        }
        return;
      }
      Object.values(obj).forEach(rewrite);
    };
    rewrite(clone);
    return clone;
  }

  // -------------------------------------------------------------------------
  // WHERE guarantee consultation
  // -------------------------------------------------------------------------

  private checkWhereGuarantee(
    alias: string,
    colName: string,
    scope: Scope,
  ): boolean {
    // A SET column's WHERE-time value is the OLD row's; RETURNING reports
    // the NEW one, so predicate evidence proves nothing for it.
    if (
      scope.dmlSetColumns &&
      scope.dmlSetColumns.alias === alias &&
      scope.dmlSetColumns.columns.has(colName)
    ) {
      return false;
    }
    // Implied ON quals and HAVING are the same evidence as WHERE conjuncts:
    // every row this scope emits satisfied them (see resolveJoinImplications
    // and the havingClause field note).
    for (const pred of [
      ...(scope.whereClause ? [scope.whereClause] : []),
      ...(scope.havingClause ? [scope.havingClause] : []),
      ...scope.impliedQuals,
    ]) {
      if (this.whereImpliesNotNull(pred, alias, colName, scope)) return true;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Branch guard consultation
  // -------------------------------------------------------------------------

  /**
   * Run `walk` with `predicate` recorded as having evaluated to `taken`.
   */
  private withGuard<T>(scope: Scope, predicate: Node | undefined, taken: boolean, walk: () => T): T {
    if (!predicate) return walk();
    this.guards.push({ scope, predicate, taken });
    try {
      return walk();
    } finally {
      this.guards.pop();
    }
  }

  /** Run `walk` with several guards recorded at once. */
  private withGuards<T>(
    scope: Scope,
    guards: { predicate: Node; taken: boolean }[],
    walk: () => T,
  ): T {
    for (const g of guards) this.guards.push({ scope, predicate: g.predicate, taken: g.taken });
    try {
      return walk();
    } finally {
      this.guards.length -= guards.length;
    }
  }

  /** Whether any active guard proves `alias.colName` is non-null here. */
  private guardsImplyNotNull(alias: string, colName: string, scope: Scope): boolean {
    for (const g of this.guards) {
      if (g.scope !== scope) continue;
      const implies = g.taken
        ? this.whereImpliesNotNull(g.predicate, alias, colName, scope)
        : this.falsityImpliesNotNull(g.predicate, alias, colName, scope);
      if (implies) return true;
    }
    return false;
  }

  /**
   * Whether any active guard proves `alias`'s row exists here — which promotes
   * it from OPTIONAL, exactly as a WHERE predicate on the alias does.
   */
  private guardsPromoteAlias(alias: string, scope: Scope): boolean {
    for (const g of this.guards) {
      if (g.scope !== scope) continue;
      if (g.taken && this.whereImpliesAliasNotNull(g.predicate, alias)) return true;
      if (!g.taken && this.falsityPromotesAlias(g.predicate, alias)) return true;
    }
    return false;
  }

  /**
   * Whether `predicate` failing to be TRUE proves `alias.colName` is non-null.
   *
   * Sound only for predicates that cannot themselves evaluate to NULL, because
   * a branch is skipped when its condition is FALSE *or* NULL. `a > 5` is NULL
   * for a NULL `a`, so the ELSE branch sees NULL values and no inference is
   * available. `a IS NULL` is total — it is TRUE or FALSE, never NULL — so
   * reaching the ELSE proves it was FALSE, hence `a` is non-null.
   *
   * Handled:
   *   - `col IS NULL` → the column is non-null.
   *   - `A OR B` → an OR that is not TRUE has no TRUE disjunct, so *every*
   *     disjunct is not TRUE; if any of them yields an inference, it holds.
   *
   * `A AND B` is deliberately absent: an AND that is not TRUE tells us only
   * that *some* conjunct failed, not which.
   */
  private falsityImpliesNotNull(
    predicate: Node,
    alias: string,
    colName: string,
    scope: Scope,
  ): boolean {
    const node = predicate as Record<string, unknown>;

    if ("NullTest" in node) {
      const nt = node["NullTest"] as { arg?: Node; nulltesttype?: string };
      if (nt.nulltesttype === "IS_NULL" && nt.arg) {
        // `expr IS NULL` being FALSE means expr is non-null; if expr is NULL
        // whenever the column is, the contrapositive gives the column.
        return this.exprStrictlyForces(nt.arg, leaf =>
          this.columnMatches(leaf, alias, colName, scope),
        );
      }
      return false;
    }

    if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as { boolop?: string; args?: Node[] };
      if (be.boolop === "OR_EXPR") {
        for (const arg of be.args ?? []) {
          if (this.falsityImpliesNotNull(arg, alias, colName, scope)) return true;
        }
      }
      return false;
    }

    return false;
  }

  /**
   * Whether `predicate` failing to be TRUE proves some column of `alias` is
   * non-null — and therefore that the alias's row exists.
   */
  private falsityPromotesAlias(predicate: Node, alias: string): boolean {
    const node = predicate as Record<string, unknown>;

    if ("NullTest" in node) {
      const nt = node["NullTest"] as { arg?: Node; nulltesttype?: string };
      if (nt.nulltesttype === "IS_NULL" && nt.arg) {
        return this.columnRefMatchesAlias(nt.arg, alias);
      }
      return false;
    }

    if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as { boolop?: string; args?: Node[] };
      if (be.boolop === "OR_EXPR") {
        for (const arg of be.args ?? []) {
          if (this.falsityPromotesAlias(arg, alias)) return true;
        }
      }
      return false;
    }

    return false;
  }

  /**
   * Find another relation in `entry`'s null group whose WHERE predicate proves
   * the group's row exists, or null if there is none.
   *
   * Sound because a null group is NULL-extended atomically: every member is
   * present, or the whole composite row is absent.
   */
  private findNullGroupPromoter(entry: RelationEntry, scope: Scope): string | null {
    for (const other of scope.aliases.values()) {
      if (other === entry) continue;
      if (other.nullGroup !== entry.nullGroup) continue;
      if (this.checkWhereAliasPromoted(other.alias, scope)) return other.alias;
    }
    return null;
  }

  /**
   * Check if the WHERE clause has any predicate (in an AND-conjunct) that
   * references any qualified column from the given alias. If so, the alias
   * is promoted from OPTIONAL to REQUIRED (the outer join effectively
   * becomes INNER).
   */
  private checkWhereAliasPromoted(alias: string, scope: Scope): boolean {
    if (!scope.whereClause) return false;
    return this.whereImpliesAliasNotNull(scope.whereClause, alias);
  }

  /**
   * Walk the WHERE subtree looking for any predicate that references any
   * qualified column from `alias` (in AND-conjuncts only). Detected
   * patterns: IS NOT NULL, comparison (=, >, IN, ...). Only qualified
   * ColumnRefs (alias.col) are matched — unqualified columns can't be
   * attributed to an alias without knowing all columns.
   */
  private whereImpliesAliasNotNull(whereClause: Node, alias: string): boolean {
    return this.predicateProvesNonNull(whereClause, n =>
      this.exprStrictlyForces(n, leaf => this.columnRefMatchesAlias(leaf, alias)),
    );
  }

  /**
   * Check whether an expression node is a qualified ColumnRef whose alias
   * matches `alias` (e.g., `alias.col` or `schema.alias.col`).
   * Unqualified ColumnRefs return false (can't determine alias ownership).
   */
  private columnRefMatchesAlias(expr: Node, alias: string): boolean {
    const node = expr as Record<string, unknown>;
    if (!("ColumnRef" in node)) return false;
    const cr = node["ColumnRef"] as ColumnRef;
    const fields = (cr.fields ?? []) as Node[];
    const parts = fields.map(f => this.stringVal(f));
    if (parts.length === 2) return parts[0] === alias;
    if (parts.length === 3) return parts[1] === alias;
    return false;
  }

  /**
   * Walk the WHERE subtree looking for a predicate that implies the column
   * `alias.colName` is non-null. Detected patterns (in AND-conjuncts only):
   * - `col IS NOT NULL`
   * - `col = <expr>` (comparison, col is a direct operand)
   * - `col IN (...)` (AEXPR_IN)
   * - `col > <expr>`, `col < <expr>`, etc. (any comparison operator)
   *
   * Disjunctions (OR) and complex predicates are conservatively skipped.
   */
  /**
   * An ungrouped aggregate query (or HAVING without GROUP BY) emits its row
   * even over zero input rows, so its output rows do not imply the WHERE
   * ever evaluated TRUE. Syntactic scan of the target list; SubLinks are NOT
   * descended into — an aggregate inside a subquery belongs to the
   * subquery's scope, not this one. Window invocations (`over` present) are
   * per-row and do not make the query aggregate, but their arguments can
   * still contain a plain aggregate, so recursion continues through them.
   */
  private selectEmitsRowsWithoutInput(stmt: SelectStmt): boolean {
    if (stmt.havingClause) return true;
    const containsAggregate = (node: unknown): boolean => {
      if (Array.isArray(node)) return node.some(containsAggregate);
      if (!node || typeof node !== "object") return false;
      const obj = node as Record<string, unknown>;
      if ("SubLink" in obj) return false;
      if ("FuncCall" in obj) {
        const fc = obj["FuncCall"] as FuncCall & { agg_star?: boolean; agg_within_group?: boolean };
        if (!fc.over) {
          if (fc.agg_star || fc.agg_within_group || fc.agg_filter) return true;
          const parts = (fc.funcname ?? []).map(f => this.stringVal(f));
          const name = parts[parts.length - 1] ?? "";
          const schema = parts.length >= 2 ? parts[parts.length - 2] : undefined;
          if (name && this.isAggregateByName(name, schema)) return true;
        }
        return containsAggregate(fc.args);
      }
      return Object.values(obj).some(containsAggregate);
    };
    return containsAggregate(stmt.targetList);
  }

  /**
   * Whether this WHERE proves `$num` non-null for every row it lets through —
   * the parameter analogue of checkWhereGuarantee. Conjuncts only (AND
   * recursion; OR and NOT guarantee nothing — the optional-filter idiom
   * `val = $1 OR $1 IS NULL` returns rows with $1 NULL). A conjunct counts
   * when it cannot be TRUE while the parameter is NULL, established through
   * forcedNullParams: the conjunct's operand would evaluate NULL, and NULL
   * is not TRUE. Unlike the column path this accepts only the shared
   * strict-operator set — an arbitrary or qualified operator may be
   * non-strict and TRUE with a NULL operand.
   *
   * Consulted for the CURRENT scope only, never the outer chain: subquery,
   * view, and CTE analyses are memoized by node identity, and a guarantee
   * inherited from one referencing context must not leak into another — the
   * same rule that stops branch guards at statement boundaries.
   */
  private whereImpliesParamNotNull(clause: Node, num: number): boolean {
    return this.predicateProvesNonNull(clause, n =>
      forcedNullParams(n, this.catalog).has(num),
    );
  }

  private whereImpliesNotNull(
    whereClause: Node,
    alias: string,
    colName: string,
    scope: Scope,
  ): boolean {
    return this.predicateProvesNonNull(whereClause, n =>
      this.exprStrictlyForces(n, leaf => this.columnMatches(leaf, alias, colName, scope)),
    );
  }

  /**
   * Whether `pred` being TRUE proves the target non-null, where `forces`
   * answers the strict-dependence question for one operand: "is this
   * expression NULL whenever the target is NULL?" — the contrapositive of
   * what the caller concludes. Shared by the column and parameter analyses;
   * only the leaf differs (a ColumnRef match run through the strict closure,
   * or `forcedNullParams`).
   *
   * Shapes:
   *   - AND: any conjunct proves.
   *   - OR: EVERY disjunct proves — whichever arm made the predicate TRUE,
   *     it could not have been TRUE with the target NULL. The optional-filter
   *     idiom `col = $1 OR $1 IS NULL` proves nothing, because the IS NULL
   *     arm proves nothing — the intersection is what keeps it legal.
   *   - IS NOT NULL over a forcing expression.
   *   - Strict comparisons (the shared total+strict operator set — accepting
   *     ANY operator was the engine's first measured unsoundness): both
   *     operands for OP/ANY/ALL (`x = ANY(arr)` is NULL when either the
   *     tested value or the array is), the tested value only for IN
   *     (`x IN ($1, 5)` is TRUE via 5), tested value and bounds for BETWEEN
   *     (NOT BETWEEN is a different kind and deliberately absent — it can be
   *     TRUE with a NULL bound).
   */
  private predicateProvesNonNull(pred: Node, forces: (expr: Node) => boolean): boolean {
    const node = pred as Record<string, unknown>;

    if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as { boolop?: string; args?: Node[] };
      const args = be.args ?? [];
      if (be.boolop === "AND_EXPR") {
        return args.some(arg => this.predicateProvesNonNull(arg, forces));
      }
      if (be.boolop === "OR_EXPR") {
        return args.length > 0 && args.every(arg => this.predicateProvesNonNull(arg, forces));
      }
      return false;
    }

    if ("NullTest" in node) {
      const nt = node["NullTest"] as { arg?: Node; nulltesttype?: string };
      return nt.nulltesttype === "IS_NOT_NULL" && !!nt.arg && forces(nt.arg);
    }

    if ("A_Expr" in node) {
      const ae = node["A_Expr"] as {
        kind?: string;
        name?: Node[];
        lexpr?: Node;
        rexpr?: Node;
      };
      const forced = (n: Node | undefined): boolean => n !== undefined && forces(n);

      switch (ae.kind) {
        case "AEXPR_OP":
          return (
            this.promotionOperatorIsStrict(ae.name, ae.lexpr, ae.rexpr) &&
            (forced(ae.lexpr) || forced(ae.rexpr))
          );
        case "AEXPR_OP_ANY":
        case "AEXPR_OP_ALL":
          // The right operand is an ARRAY compared element-wise, so its
          // rendered type is NOT the comparison operator's parameter type —
          // no operands are passed, and the name rule answers as before.
          return this.promotionOperatorIsStrict(ae.name) && (forced(ae.lexpr) || forced(ae.rexpr));
        case "AEXPR_IN":
          return forced(ae.lexpr);
        case "AEXPR_BETWEEN":
        case "AEXPR_BETWEEN_SYM": {
          if (forced(ae.lexpr)) return true;
          const bounds = (ae.rexpr as { List?: { items?: Node[] } } | undefined)?.List?.items;
          return (bounds ?? []).some(b => forced(b));
        }
        default:
          return false;
      }
    }

    return false;
  }

  /**
   * Whether `expr` is NULL whenever the leaf the caller cares about is NULL —
   * the column-side strict closure, mirroring `forcedNullParams`: a NULL
   * propagates through strict operators, NULLIF's left operand, COALESCE only
   * when every branch forces (intersection), casts transparently, and strict
   * functions (catalog metadata for user functions, the measured
   * snapshot's pg_catalog strictness capture for names the user catalog
   * cannot answer for — which INCLUDES a name pg_catalog also carries, since
   * PostgreSQL searches it first: adversarial-3 finding 6, and the reason
   * this reads "cannot answer for" rather than the old "does not carry"). Aggregates and window invocations are opaque: an
   * aggregate's value does not depend on any single row's column, and a
   * window function reads OTHER rows. Anything unrecognised forces nothing,
   * keeping the conclusion conservative.
   */
  private exprStrictlyForces(expr: Node, leaf: (columnRef: Node) => boolean): boolean {
    const node = expr as Record<string, unknown>;

    if ("ColumnRef" in node) return leaf(expr);

    if ("TypeCast" in node) {
      const arg = (node["TypeCast"] as { arg?: Node }).arg;
      return !!arg && this.exprStrictlyForces(arg, leaf);
    }

    if ("A_Expr" in node) {
      const ae = node["A_Expr"] as { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node };
      if (ae.kind === "AEXPR_OP") {
        return (
          this.promotionOperatorIsStrict(ae.name, ae.lexpr, ae.rexpr) &&
          [ae.lexpr, ae.rexpr].some(o => !!o && this.exprStrictlyForces(o, leaf))
        );
      }
      if (ae.kind === "AEXPR_NULLIF") {
        return !!ae.lexpr && this.exprStrictlyForces(ae.lexpr, leaf);
      }
      return false;
    }

    if ("CoalesceExpr" in node) {
      const args = (node["CoalesceExpr"] as { args?: Node[] }).args ?? [];
      return args.length > 0 && args.every(a => this.exprStrictlyForces(a, leaf));
    }

    if ("FuncCall" in node) {
      const fc = node["FuncCall"] as FuncCall & {
        agg_star?: boolean;
        agg_within_group?: boolean;
        agg_distinct?: boolean;
      };
      if (fc.over || fc.agg_star || fc.agg_within_group || fc.agg_distinct || fc.agg_filter) {
        return false;
      }
      const args = fc.args ?? [];
      if (args.some(a => "NamedArgExpr" in (a as Record<string, unknown>))) return false;
      const parts = (fc.funcname ?? []).map(f => this.stringVal(f));
      const name = parts[parts.length - 1] ?? "";
      const schema = parts.length >= 2 ? parts[parts.length - 2] : undefined;
      if (!name || this.isAggregateByName(name, schema)) return false;
      const meta = this.catalog.resolveFunctionMetadata(schema, name);
      let strict: boolean;
      if (meta) {
        strict = meta.strict && !meta.isAggregate;
      } else {
        // Overload consensus first (every arity-compatible candidate
        // strict), then the pg_catalog strictness capture for names the
        // user catalog does not carry.
        const candidates = this.catalog.resolveFunctionCandidates(schema, name, args.length);
        strict =
          candidates && candidates.length > 0
            ? candidates.every(c => c.strict && !c.isAggregate)
            : (schema === undefined || schema === "pg_catalog") &&
              this.catalog.isStrictBuiltin(name);
      }
      return strict && args.some(a => this.exprStrictlyForces(a, leaf));
    }

    return false;
  }

  /**
   * Whether a WHERE predicate's operator guarantees non-null operands
   * whenever the predicate is TRUE — the gate on both column promotion and
   * parameter narrowing. Accepting ANY operator here was the engine's first
   * measured unsoundness: a user operator can be backed by a non-strict
   * function that returns TRUE with a NULL operand (`===` in the fixture
   * schema, kept as the regression case in
   * `where-promotion-non-strict-op.sql`), so the promoted column arrives
   * NULL. The check is by unqualified NAME against the shared total+strict
   * builtin set — the same trust level the expression-level total-operator
   * rule runs on; a user operator that shadows a builtin name over custom
   * types is out of reach there too, by the curated-list policy.
   */
  private promotionOperatorIsStrict(
    name: Node[] | undefined,
    lexpr?: Node,
    rexpr?: Node,
    scope: Scope | null = null,
  ): boolean {
    if (!name?.length) return false;
    const parts = name.map(n => this.stringVal(n));
    const op = parts[parts.length - 1] ?? "";
    // Type-aware first, EVERY-quantified — a wrong "strict" here is a
    // wrong notNull. Casts and literals type even without a scope; the
    // name rule below serves only what the narrowing cannot see, and its
    // shadowing hole is guarded inside the accessor (a user operator on a
    // curated name with nothing known answers false).
    if (lexpr && rexpr) {
      const schema2 = parts.length >= 2 ? parts[parts.length - 2] : undefined;
      const verdict = this.catalog.resolveOperatorStrictness(
        schema2,
        op,
        this.operandTypeSet(lexpr, scope, 0),
        this.operandTypeSet(rexpr, scope, 0),
      );
      if (verdict !== null) return verdict;
    }
    // Builtin names keep the curated set, and only BARE names match it —
    // the documented shadowing blind spot, now reached only when the
    // narrowing has no candidates at all.
    if (parts.length === 1 && STRICT_OPERATORS.has(op)) return true;
    // A user operator's backing function carries a declared strictness flag,
    // which is exactly the property this gate needs: a strict comparison
    // cannot be TRUE with a NULL operand. Totality is NOT required here —
    // the conclusion is about the operands, never the result. Single
    // candidate or refuse (the fixture `===` resolves and is non-strict,
    // which is precisely why blanket operator trust was removed).
    const schema = parts.length >= 2 ? parts[parts.length - 2] : undefined;
    return this.catalog.resolveOperatorMetadata(schema, op)?.strict ?? false;
  }

  /**
   * Check whether an expression node is a ColumnRef matching `alias.colName`.
   * An unqualified ref is resolved through the scope's visible list — the
   * resolution PostgreSQL applies — and matches only when the owning entry IS
   * `alias`. The caller knows `alias` owns a column of this NAME; only
   * resolution can say the reference DENOTES it. USING/NATURAL is the shape
   * that separates the two: the merged column is the only visible occurrence
   * of the name (which is what keeps the query legal) while both constituents
   * stay addressable through `aliases` — and a LEFT JOIN's merged value is
   * the left side's, saying nothing about the right. A merged column owns no
   * entry and matches nothing.
   */
  private columnMatches(expr: Node, alias: string, colName: string, scope: Scope): boolean {
    const node = expr as Record<string, unknown>;
    if (!("ColumnRef" in node)) return false;
    const cr = node["ColumnRef"] as ColumnRef;
    const fields = (cr.fields ?? []) as Node[];
    const parts = fields.map(f => this.stringVal(f));
    if (parts.length === 2) {
      return parts[0] === alias && parts[1] === colName;
    }
    if (parts.length === 3) {
      return parts[1] === alias && parts[2] === colName;
    }
    if (parts.length === 1) {
      if (parts[0] !== colName) return false;
      let owner: RelationEntry | null = null;
      let seen = false;
      for (const v of scope.visible) {
        if (v.name !== colName) continue;
        if (seen) return false; // ambiguous — PostgreSQL rejects the query
        seen = true;
        owner = v.entry;
      }
      return owner !== null && owner.alias === alias;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // SubLink resolution
  // -------------------------------------------------------------------------

  private resolveSubLinkTraced(
    sl: SubLink,
    scope: Scope,
    depth: number,
    trace: ITrace,
  ): boolean {
    switch (sl.subLinkType) {
      case "EXISTS_SUBLINK":
        // EXISTS only asks whether any row came back — it never inspects a
        // value, so NULLs inside the subquery cannot reach the result.
        trace.conclude(true, "EXISTS returns bool, never NULL");
        return true;
      case "ANY_SUBLINK":
      case "ALL_SUBLINK":
        return this.resolveQuantifiedSublinkTraced(sl, scope, depth, trace);
      case "ARRAY_SUBLINK":
        trace.conclude(true, "ARRAY subquery constructor, never NULL");
        return true;
      case "EXPR_SUBLINK":
        return this.resolveScalarSublinkTraced(sl, scope, depth, trace);
      default:
        trace.conclude(false, `unknown subLinkType '${sl.subLinkType}' -> nullable`);
        return false;
    }
  }

  /**
   * Nullability of `x op ANY (subquery)` / `x op ALL (subquery)` — which
   * includes `IN` and `NOT IN`, both of which the parser rewrites into this
   * form.
   *
   * These do NOT always return a boolean. The comparison is evaluated per row
   * under three-valued logic and the results are OR-ed (ANY) or AND-ed (ALL),
   * so a NULL row poisons the outcome whenever no row settles it:
   *
   *   1 IN (SELECT NULL)            -> NULL   (no TRUE, and a NULL comparison)
   *   1 NOT IN (SELECT NULL)        -> NULL
   *   NULL IN (SELECT 1)            -> NULL
   *
   * The result is therefore non-null only when both sides are: every compared
   * operand on the left, and every output column of the subquery.
   */
  private resolveQuantifiedSublinkTraced(
    sl: SubLink,
    scope: Scope,
    depth: number,
    trace: ITrace,
  ): boolean {
    const kind = sl.subLinkType === "ALL_SUBLINK" ? "ALL" : "ANY/IN";

    // Left-hand side. A row constructor compares element-wise, so its members
    // are what matter — not the RowExpr itself, which is never NULL as a value.
    const testOperands: Node[] = [];
    if (sl.testexpr) {
      const t = sl.testexpr as Record<string, unknown>;
      const row = t["RowExpr"] as { args?: Node[] } | undefined;
      if (row) testOperands.push(...(row.args ?? []));
      else testOperands.push(sl.testexpr);
    }
    let testNotNull = testOperands.length > 0;
    testOperands.forEach((operand, i) => {
      const childTrace = trace.addChild(`testexpr[${i}]`);
      if (!this.walkExprTraced(operand, scope, depth + 1, childTrace)) testNotNull = false;
    });
    trace.addFact("testexprNotNull", String(testNotNull));
    if (!testNotNull) {
      trace.conclude(false, `${kind} with a nullable left operand → nullable`);
      return false;
    }

    // Right-hand side: every column the subquery yields must be non-null.
    if (!sl.subselect) {
      trace.conclude(false, `${kind} with no subquery → nullable`);
      return false;
    }
    const innerResults = this.analyzeStatement(sl.subselect, scope, depth + 1);
    if (innerResults.length === 0) {
      trace.conclude(false, `${kind} subquery has no output columns → nullable`);
      return false;
    }
    const innerNotNull = innerResults.every(r => r.notNull);
    trace.addFact("subqueryNotNull", String(innerNotNull));
    trace.conclude(
      innerNotNull,
      innerNotNull
        ? `${kind}: both operands and every subquery column are non-null → non-null boolean`
        : `${kind}: a NULL from the subquery makes the result NULL when nothing matches`,
    );
    return innerNotNull;
  }


  private resolveScalarSublinkTraced(
    sl: SubLink,
    scope: Scope,
    depth: number,
    trace: ITrace,
  ): boolean {
    if (!sl.subselect) {
      trace.conclude(false, "no subselect -> nullable");
      return false;
    }
    const innerStmt = sl.subselect;

    const select = (innerStmt as Record<string, unknown>)["SelectStmt"] as SelectStmt | undefined;
    if (!select) {
      trace.conclude(false, "subselect is not a SelectStmt -> nullable");
      return false;
    }

    const singleRow = this.guaranteesSingleRow(select);

    trace.addFact("noFrom", String(!select.fromClause || select.fromClause.length === 0));
    trace.addFact("hasAggregate", String(this.targetListHasAggregate(select.targetList)));
    trace.addFact("hasGroupBy", String(!!select.groupClause));
    trace.addFact("hasHaving", String(!!select.havingClause));
    trace.addFact("hasLimit", String(!!select.limitCount));
    trace.addFact("hasOffset", String(!!select.limitOffset));
    trace.addFact("setOp", select.op && select.op !== "SETOP_NONE" ? select.op : "none");
    trace.addFact("singleRow", String(singleRow));

    const keyed = singleRow ? false : this.subqueryKeyEntailedNonEmpty(select, scope);
    trace.addFact("keyEntailedNonEmpty", String(keyed));
    if (!singleRow && !keyed) {
      trace.conclude(false, "can return zero rows -> nullable");
      return false;
    }

    const innerResults = this.analyzeStatement(innerStmt, scope, depth + 1);
    if (innerResults.length > 0) {
      const innerNotNull = innerResults[0]!.notNull;
      trace.addFact("innerResult", innerNotNull ? "notNull" : "nullable");
      trace.conclude(innerNotNull, `single-row subquery propagates inner result: ${innerNotNull ? "notNull" : "nullable"}`);
      return innerNotNull;
    }
    trace.conclude(false, "single-row subquery has no output columns -> nullable");
    return false;
  }

  /**
   * Whether a scalar subquery provably returns AT LEAST ONE ROW because its
   * WHERE keys into a relation a key guarantees a match in.
   *
   *   (SELECT p2.name FROM products p2 WHERE p2.id = p.id) FROM products p
   *   (SELECT o.customer_id FROM orders o WHERE o.id = s.order_id)
   *
   * At-least-one is the right predicate here, not exactly-one: a scalar
   * subquery returning several rows RAISES rather than evaluating to NULL
   * (measured, through an inheritance tree with duplicate keys), and a raise
   * returns no rows to contradict anything. That is why this sits BESIDE
   * `guaranteesSingleRow` rather than inside it — the two license the same
   * propagation for different reasons.
   *
   * Two ways to have the match, and the first needs no constraint at all:
   *
   *   - SELF-LOOKUP. The subquery scans the relation the OUTER query is
   *     scanning and keys on the same column, so the outer row itself is in
   *     the scanned set and matches. The only catalog fact needed is that the
   *     column is NOT NULL, since a NULL key matches nothing — not even
   *     itself. What does need care is the scan MODE: an `ONLY` subquery under
   *     a tree-scanning outer reads a SUBSET, and the outer row may be the
   *     child row it excludes.
   *   - FOREIGN KEY. The outer column is a NOT NULL key referencing exactly
   *     the subquery's relation and column, with the adapter's gates.
   *
   * Either way that settles ONE relation — the ANCHOR, the one the WHERE keys
   * into. A subquery whose FROM carries JOINs needs the anchor row to reach
   * the output through them as well, which is `anchorSurvivesJoins`.
   *
   * The outer relation must be PRESENT — a NULL-extended slice has a NULL key
   * — and both relations must be plain tables. The WHERE must be exactly the
   * equality: another conjunct can empty the result, which is the whole claim.
   * GROUP BY, HAVING, LIMIT, OFFSET and set operations are rejected for the
   * same reason `guaranteesSingleRow` rejects them.
   */
  private subqueryKeyEntailedNonEmpty(select: SelectStmt, scope: Scope): boolean {
    if (select.op && select.op !== "SETOP_NONE") return false;
    if (select.limitCount || select.limitOffset) return false;
    if (select.havingClause || select.groupClause?.length) return false;
    if ((select.fromClause?.length ?? 0) !== 1 || !select.whereClause) return false;

    const from = this.subqueryFromTree(select.fromClause![0]!);
    if (!from) return false;
    const rels: SubqueryRelation[] = [];
    for (const r of from.rels) {
      const resolved = this.catalog.resolveTable(r.schemaname, r.relname);
      if (!resolved) return false;
      rels.push({ ...r, schema: resolved.schema, name: resolved.name, catalogColumns: resolved.columns });
    }

    const eq = this.equalityColumnRefs(select.whereClause);
    if (!eq) return false;

    for (const [innerRef, outerRef] of [
      [eq[0], eq[1]],
      [eq[1], eq[0]],
    ] as const) {
      const anchor = rels.find(r => r.alias === innerRef.alias);
      if (!anchor) continue;
      const outer = scope.aliases.get(outerRef.alias);
      if (!outer || outer.kind !== "table" || !outer.table) continue;
      if (outer.joinState !== REQUIRED) continue;

      // Both sides of the correlation may be renamed by an alias column list,
      // and the outer and inner ones live in different structures — a
      // RelationEntry out here, the reduced SubqueryRelation in there. Every
      // catalog question below is keyed by the catalog's names.
      const outerCol = this.entryCatalogColumn(outer, outerRef.column);
      const innerCol = this.subqueryCatalogColumn(anchor, innerRef.column);
      if (outerCol === undefined || innerCol === undefined) continue;

      const outerScansTree = outer.scanInh !== false;
      const keyNotNull = outerScansTree
        ? this.catalog.resolveColumnNotNullTree(
            outer.table.schema,
            outer.table.name,
            outerCol,
          )
        : this.catalog.resolveColumnNotNull(
            outer.table.schema,
            outer.table.name,
            outerCol,
          );
      if (!keyNotNull) continue;

      const selfLookup =
        outer.table.schema === anchor.schema &&
        outer.table.name === anchor.name &&
        // Compared as CATALOG names: two sides renamed differently still key
        // on the same column, and two sides renamed to the SAME name need not.
        outerCol === innerCol &&
        // A tree-scanning outer may be reading a CHILD row that an `ONLY`
        // subquery cannot see.
        (anchor.scansTree || !outerScansTree);
      const keyed =
        selfLookup ||
        this.keyEntails(
          { schema: outer.table.schema, name: outer.table.name, scansTree: outerScansTree },
          outerCol,
          anchor,
          innerCol,
        );
      if (!keyed) continue;
      if (this.anchorSurvivesJoins(rels, from.joins, anchor)) return true;
    }
    return false;
  }

  /**
   * A subquery FROM item flattened into its relations and its joins, or null
   * for anything the reading cannot see through. Join TYPES are kept: which
   * side a join preserves is half of what `anchorSurvivesJoins` asks.
   *
   * Every leaf must be a plain relation and every join must carry an ON
   * clause: a subquery, a VALUES list or a function has rows this reasoning
   * knows nothing about, and a CROSS join (or a USING/NATURAL one, whose
   * equality is implied rather than written) ends the read rather than being
   * guessed at.
   */
  /**
   * The catalog name behind a column a correlated subquery's WHERE or ON
   * names, through that relation's alias column list. `undefined` when the
   * relation does not answer to the name at all — which PostgreSQL rejects,
   * and which must not silently read the catalog's column of the same name.
   */
  private subqueryCatalogColumn(r: SubqueryRelation, used: string): string | undefined {
    const cols = r.catalogColumns ?? [];
    if (!r.columnAliases) return cols.includes(used) ? used : undefined;
    const i = cols.map((c, k) => r.columnAliases![k] ?? c).indexOf(used);
    return i >= 0 ? cols[i] : undefined;
  }

  private subqueryFromTree(
    item: Node,
  ): { rels: Omit<SubqueryRelation, "schema" | "name">[]; joins: SubqueryJoin[] } | null {
    const node = item as Record<string, unknown>;
    if ("RangeVar" in node) {
      const rv = node["RangeVar"] as {
        schemaname?: string;
        relname?: string;
        inh?: boolean;
        alias?: { aliasname?: string; colnames?: Node[] };
      };
      if (!rv.relname) return null;
      return {
        rels: [
          {
            alias: rv.alias?.aliasname ?? rv.relname,
            schemaname: rv.schemaname,
            relname: rv.relname,
            scansTree: rv.inh === true,
            ...(rv.alias?.colnames && rv.alias.colnames.length > 0
              ? { columnAliases: rv.alias.colnames.map(n => this.stringVal(n)) }
              : {}),
          },
        ],
        joins: [],
      };
    }
    if ("JoinExpr" in node) {
      const j = node["JoinExpr"] as JoinExpr;
      if (!j.quals || j.usingClause?.length || j.isNatural) return null;
      const left = j.larg ? this.subqueryFromTree(j.larg) : null;
      const right = j.rarg ? this.subqueryFromTree(j.rarg) : null;
      if (!left || !right) return null;
      return {
        rels: [...left.rels, ...right.rels],
        joins: [
          ...left.joins,
          ...right.joins,
          {
            jointype: j.jointype ?? "JOIN_INNER",
            quals: j.quals,
            leftAliases: left.rels.map(r => r.alias),
            rightAliases: right.rels.map(r => r.alias),
          },
        ],
      };
    }
    return null;
  }

  /**
   * Whether the ANCHOR row is guaranteed to reach the subquery's output —
   * the composition step, and the whole of what a FROM with joins adds over
   * a FROM with one relation.
   *
   *   (SELECT c.email FROM customers c JOIN orders o ON o.customer_id = c.id
   *     WHERE o.id = s.order_id)
   *
   * The outer key settles `o`: the row exists. Every join between the anchor
   * and the output then has to answer one of two things.
   *
   *   - It PRESERVES the anchor's side, and nothing more is needed: a LEFT
   *     join keeps its left side whatever the qual does, a RIGHT join its
   *     right, a FULL join both. What sits on the other side, and whether
   *     anything inside that side filters it, cannot remove the anchor row.
   *   - It can DROP the anchor row — an INNER join, or an outer join with the
   *     anchor on the side it extends — and then the row must MATCH. A NOT
   *     NULL key carried by a relation already settled, pointing at a
   *     relation on the other side that no join inside that side has dropped,
   *     is what proves it does. That relation is then settled too, so the
   *     next join out can key from it.
   *
   * The direction is the entire content of the second arm and is not
   * symmetric: `o.customer_id = c.id` read from `c` says every order has a
   * customer, which is silent about a customer with no orders — anchoring on
   * `c` there and expecting a row is how the composition goes wrong
   * (measured: NULL).
   *
   * The key must be carried by a relation already SETTLED, not merely by one
   * standing on the anchor's side: a relation the anchor's side acquired
   * through a preserving join may have no row at all, and a NULL-extended one
   * carries a NULL key that points at nothing
   * (`fk-entail-subquery-join-unsettled-key.sql`).
   */
  private anchorSurvivesJoins(
    rels: SubqueryRelation[],
    joins: SubqueryJoin[],
    anchor: SubqueryRelation,
  ): boolean {
    const settled = new Set([anchor.alias]);
    // Innermost first: the flattening appends a join after both its sides, so
    // a settled relation is available to every join that encloses it.
    for (const j of joins) {
      const anchorOnLeft = j.leftAliases.includes(anchor.alias);
      const anchorOnRight = j.rightAliases.includes(anchor.alias);
      if (!anchorOnLeft && !anchorOnRight) continue;
      const preservesAnchor =
        j.jointype === "JOIN_FULL" ||
        (j.jointype === "JOIN_LEFT" && anchorOnLeft) ||
        (j.jointype === "JOIN_RIGHT" && anchorOnRight);
      if (preservesAnchor) continue;
      if (!this.joinMatchesAnchor(j, rels, joins, settled, anchorOnLeft)) return false;
    }
    return true;
  }

  /**
   * Whether this join provably matches the anchor row, adding the relation it
   * settles to `settled`. The anchor's side supplies the key; the other side
   * supplies the row it points at, which must still be there.
   */
  private joinMatchesAnchor(
    j: SubqueryJoin,
    rels: SubqueryRelation[],
    joins: SubqueryJoin[],
    settled: Set<string>,
    anchorOnLeft: boolean,
  ): boolean {
    const eq = this.equalityColumnRefs(j.quals);
    if (!eq) return false;
    const anchorSide = anchorOnLeft ? j.leftAliases : j.rightAliases;
    const otherSide = anchorOnLeft ? j.rightAliases : j.leftAliases;

    for (const [refCol, targetCol] of [
      [eq[0], eq[1]],
      [eq[1], eq[0]],
    ] as const) {
      if (!settled.has(refCol.alias) || !anchorSide.includes(refCol.alias)) continue;
      if (!otherSide.includes(targetCol.alias)) continue;
      const referencing = rels.find(r => r.alias === refCol.alias);
      const referenced = rels.find(r => r.alias === targetCol.alias);
      if (!referencing || !referenced) continue;
      // Both relations of the subquery's own join may carry an alias column
      // list, so the ON clause is in the query's names and the key is not.
      const refCat = this.subqueryCatalogColumn(referencing, refCol.column);
      const tgtCat = this.subqueryCatalogColumn(referenced, targetCol.column);
      if (refCat === undefined || tgtCat === undefined) continue;
      // The key says the row exists in the TABLE; this join finds it only if
      // no join inside the other side has dropped it.
      if (!this.subtreePreserves(joins, otherSide, targetCol.alias)) continue;
      if (!this.keyEntails(referencing, refCat, referenced, tgtCat)) continue;
      settled.add(targetCol.alias);
      return true;
    }
    return false;
  }

  /**
   * Check whether a target list contains an aggregate function call.
   * Aggregates are detected by name (count, max, sum, avg, min, and others
   * ending in common aggregate names) or by agg_star on FuncCall.
   */
  private targetListHasAggregate(targetList?: Node[]): boolean {
    if (!targetList) return false;
    for (const target of targetList) {
      const rt = this.unwrapResTarget(target);
      if (rt.val && this.exprHasAggregate(rt.val)) return true;
    }
    return false;
  }

  private exprHasAggregate(expr: Node): boolean {
    const node = expr as Record<string, unknown>;
    if ("FuncCall" in node) {
      const fc = node["FuncCall"] as FuncCall;
      // A call carrying OVER is a WINDOW call, and a window call collapses
      // NOTHING: `sum(x) OVER ()` yields one row per input row, so an empty
      // input yields no rows at all. The sole consumer is
      // `guaranteesSingleRow`, where a wrong TRUE is the unsound direction —
      // a scalar sublink over zero rows is NULL, and a `LANGUAGE sql` body
      // that returns no row returns NULL. Measured six ways against PGlite at
      // both call sites, including `count(*) OVER ()`, which reached the same
      // wrong answer through the `agg_star` short-circuit without consulting
      // a name table at all.
      //
      // The ARGUMENTS still count: `sum(count(*)) OVER ()` is a single-group
      // aggregate query producing exactly one row, which the window function
      // then ranges over. Recursing preserves that reading, which the old
      // code reached by accident, via `sum` being an aggregate name.
      //
      // The two sibling aggregate tests have always excluded `over` (the
      // origin rule's `containsAggregate`, and the strict-scalar gate). This
      // was the one site that did not.
      if (fc.over) {
        for (const a of fc.args ?? []) {
          if (this.exprHasAggregate(a)) return true;
        }
        return false;
      }
      // count(*) is always an aggregate.
      if (fc.agg_star) return true;
      // Check by function name against common built-in aggregates.
      const name = this.funcName(fc);
      // The user catalog first, then pg_catalog's own aggregate names.
      const meta = this.catalog.resolveFunctionMetadata(this.funcSchema(fc), name);
      if (meta?.isAggregate) return true;
      if (!meta && this.catalog.isAggregateBuiltin(name)) return true;
    }
    // Recurse into sub-expressions.
    if ("A_Expr" in node) {
      const ae = node["A_Expr"] as { lexpr?: Node; rexpr?: Node };
      if (ae.lexpr && this.exprHasAggregate(ae.lexpr)) return true;
      if (ae.rexpr && this.exprHasAggregate(ae.rexpr)) return true;
    }
    if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as { args?: Node[] };
      for (const a of be.args ?? []) {
        if (this.exprHasAggregate(a)) return true;
      }
    }
    if ("CoalesceExpr" in node) {
      const ce = node["CoalesceExpr"] as { args?: Node[] };
      for (const a of ce.args ?? []) {
        if (this.exprHasAggregate(a)) return true;
      }
    }
    if ("TypeCast" in node) {
      const tc = node["TypeCast"] as { arg: Node };
      if (this.exprHasAggregate(tc.arg)) return true;
    }
    if ("CaseExpr" in node) {
      const ce = node["CaseExpr"] as { args?: Node[]; defresult?: Node };
      for (const a of ce.args ?? []) {
        const wh = (a as Record<string, unknown>)["CaseWhen"] as { expr?: Node; result?: Node } | undefined;
        if (wh?.expr && this.exprHasAggregate(wh.expr)) return true;
        if (wh?.result && this.exprHasAggregate(wh.result)) return true;
      }
      if (ce.defresult && this.exprHasAggregate(ce.defresult)) return true;
    }
    if ("NamedArgExpr" in node) {
      const na = node["NamedArgExpr"] as { arg: Node };
      if (this.exprHasAggregate(na.arg)) return true;
    }
    if ("RowExpr" in node) {
      const re = node["RowExpr"] as { args?: Node[] };
      for (const a of re.args ?? []) {
        if (this.exprHasAggregate(a)) return true;
      }
    }
    if ("A_ArrayExpr" in node) {
      const ae = node["A_ArrayExpr"] as { elements?: Node[] };
      for (const e of ae.elements ?? []) {
        if (this.exprHasAggregate(e)) return true;
      }
    }
    if ("MinMaxExpr" in node) {
      const mm = node["MinMaxExpr"] as { args?: Node[] };
      for (const a of mm.args ?? []) {
        if (this.exprHasAggregate(a)) return true;
      }
    }
    if ("CollateClause" in node) {
      const cc = node["CollateClause"] as { arg: Node };
      if (this.exprHasAggregate(cc.arg)) return true;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // FuncCall resolution (7-priority dispatch from section 4)
  // -------------------------------------------------------------------------

  private resolveFuncCallTraced(
    fc: FuncCall,
    scope: Scope,
    depth: number,
    trace: ITrace,
  ): boolean {
    const name = this.funcName(fc);
    const schema = this.funcSchema(fc);

    trace.addFact("name", schema ? `${schema}.${name}` : name);
    trace.addFact("agg_star", String(!!fc.agg_star));

    // Resolve args first (leaf-first).
    const argResults: boolean[] = [];
    for (let i = 0; i < (fc.args ?? []).length; i++) {
      const argTrace = trace.addChild(`arg[${i}]`);
      argResults.push(this.walkExprTraced(fc.args![i]!, scope, depth + 1, argTrace));
    }

    // Priority 2 (checked early because it's by-name): count
    if (name === "count" && (fc.agg_star || this.isAggregateByName(name, schema))) {
      trace.addFact("priority", "2 (count)");
      trace.conclude(true, "count never returns NULL");
      return true;
    }

    // Look up function metadata. Where the builtin-name drop rule left it
    // null (adversarial-3 finding 6 — user candidates beside a pg_catalog
    // name are not the candidate set), the TYPED recovery may still name
    // the user function: for claim-table names the merged set is decidable,
    // and a user row that certainly wins gets its metadata — domain return,
    // body, strictness — back into play.
    let meta = this.catalog.resolveFunctionMetadata(schema, name);
    if (!meta && !(fc.args ?? []).some(a => "NamedArgExpr" in (a as Record<string, unknown>))) {
      meta = this.catalog.resolveUserFunctionTyped(
        schema,
        name,
        (fc.args ?? []).map(a => this.operandTypeSet(a, scope, depth + 1)),
      );
      if (meta) trace.addFact("typedResolution", `${meta.schema}.${meta.name} (user, type-narrowed)`);
    }
    trace.addFact("catalogMeta", meta ? `${meta.schema}.${meta.name} (lang=${meta.language}, strict=${meta.strict}, agg=${meta.isAggregate})` : "not found");

    // Reorder named arguments to match function definition order, then fill
    // the positions the call left to their DEFAULTS — what the function
    // actually receives, which is what every rule below reasons about.
    const reordered = this.maybeReorderNamedArgs(fc.args ?? [], argResults, meta);
    const orderedArgs = meta
      ? this.bindDefaultArguments(meta, reordered.ordered, reordered.supplied, depth, trace)
      : reordered.ordered;

    // Priority 1: NOT NULL domain return — for a call that RUNS. Two calls
    // never reach the domain at all, and each returns NULL past it:
    //
    //   - a STRICT function handed a NULL argument, which returns without
    //     entering the body, so there is no returned value for the domain to
    //     be enforced on (measured, `LANGUAGE sql` and plpgsql alike);
    //   - an AGGREGATE over zero input rows, which is NULL whatever its
    //     declared return type (measured) — they continue to the aggregate
    //     rule, which owns the empty-input question.
    //
    // The strict call falls through to priority 4, which concludes nullable
    // for it; the domain is the only rule that would have preempted that.
    const shortCircuits = !!meta && this.callCanShortCircuit(meta, orderedArgs);
    if (shortCircuits) trace.addFact("shortCircuits", "true");
    if (meta && !meta.isAggregate && !shortCircuits && this.funcReturnsNotNullDomain(meta)) {
      trace.addFact("priority", "1 (NOT NULL domain return)");
      trace.conclude(true, "returns NOT NULL domain -> PG enforces at call boundary");
      return true;
    }

    // Overload consensus: with no single resolution, a property EVERY
    // arity-compatible candidate shares holds for whichever overload
    // PostgreSQL picks — the same quantification the builtin strictness
    // capture rests on. Named notation reorders positions and defeats it;
    // body inlining needs the actual body and stays single-candidate.
    const consensus =
      !meta && !(fc.args ?? []).some(a => "NamedArgExpr" in (a as Record<string, unknown>))
        ? this.catalog.resolveFunctionCandidates(schema, name, (fc.args ?? []).length)
        : null;
    if (consensus && consensus.length > 0) {
      trace.addFact("overloadConsensus", `${consensus.length} arity-compatible candidates`);
      // The domain claim needs the same short-circuit clearance the resolved
      // case needs, and by consensus that means NO candidate may short-circuit
      // — whichever one PostgreSQL picks has to be one that runs.
      const suppliedPositions = argResults.map(() => true);
      const noneShortCircuits = consensus.every(
        c =>
          !this.callCanShortCircuit(
            c,
            this.bindDefaultArguments(c, argResults, suppliedPositions, depth, NOOP),
          ),
      );
      if (noneShortCircuits && consensus.every(c => !c.isAggregate && this.funcReturnsNotNullDomain(c))) {
        trace.addFact("priority", "1 (NOT NULL domain return, by consensus)");
        trace.conclude(true, "every candidate returns a NOT NULL domain → notNull whichever runs");
        return true;
      }
    }

    // Priority 2b: window functions. Checked before the aggregate rule because
    // the ranking functions are BOTH — prokind 'aw' — so they answer yes to
    // the aggregate question too.
    if (fc.over) {
      trace.addFact("windowFunction", "true");
      if (NEVER_NULL_WINDOW_FNS.has(name)) {
        trace.addFact("priority", "2b (ranking window function)");
        trace.conclude(true, `${name}() assigns a position to every row → never NULL`);
        return true;
      }
      // ntile(n) returns NULL when its bucket-count argument is NULL.
      if (name === "ntile") {
        trace.addFact("priority", "2b (ntile)");
        const result = argResults.length > 0 && argResults.every(r => r);
        trace.conclude(result, result ? "ntile with a non-null bucket count → never NULL" : "ntile with a nullable bucket count → nullable");
        return result;
      }
      // Aggregates over the DEFAULT frame: RANGE UNBOUNDED PRECEDING TO
      // CURRENT ROW always contains the current row (measured), so the frame
      // is never empty and an aggregate that is non-null over non-empty
      // non-null input is non-null here — the window analogue of the
      // GROUP-BY-non-empty gate. first_value/last_value pick a row of that
      // same frame. FILTER can empty the frame, an explicit or named frame
      // is not analysed, and offset functions (lag/lead/nth_value) can
      // address outside the partition — all fall through.
      const over = fc.over as { name?: string; refname?: string; frameOptions?: number };
      const defaultFrame =
        !over.name && !over.refname && over.frameOptions === FRAMEOPTION_DEFAULTS;
      const frameNonNull =
        NON_NULL_OVER_NONEMPTY_AGGREGATES.has(name) ||
        name === "first_value" ||
        name === "last_value";
      if (
        defaultFrame &&
        frameNonNull &&
        !fc.agg_filter &&
        !fc.agg_distinct &&
        argResults.length > 0 &&
        argResults.every(r => r)
      ) {
        trace.addFact("priority", "2b (aggregate over the default frame)");
        trace.conclude(true, `${name}() over the never-empty default frame with non-null input → notNull`);
        return true;
      }
      // Everything else over a window — aggregates included — can see an empty
      // frame (e.g. ROWS BETWEEN 2 PRECEDING AND 1 PRECEDING on the first row)
      // and offset functions can address a row outside the partition.
      trace.addFact("priority", "2b (other window function)");
      trace.conclude(false, "window frame may be empty or the offset may fall outside the partition → nullable");
      return false;
    }

    // Priority 2c: WITHIN GROUP — ordered-set and hypothetical-set
    // aggregates (measured 2026-08-01). The hypothetical-set family
    // (rank/dense_rank/percent_rank/cume_dist) is TOTAL: it returns the
    // hypothetical row's position even over zero input rows and for NULL
    // arguments, so it is notNull unconditionally. The ordered-set proper
    // (percentile_disc/percentile_cont/mode) returns NULL over an empty
    // group, an all-NULL sort column, or a NULL direct argument — so it
    // follows the plain-aggregate gates, with the WITHIN GROUP sort
    // expressions finally visible as arguments.
    if ((fc as { agg_within_group?: boolean }).agg_within_group) {
      trace.addFact("withinGroup", "true");
      // CLASS claims, keyed on the capture's aggkind rather than the two
      // name tables that mirrored it (retired — they were asserted
      // catalog-equal both ways, so the catalog answers directly). The
      // call SHAPE selects the class: WITHIN GROUP reaches only 'h'/'o'
      // rows, mutually exclusive with the window form (measured, Q2).
      const aggRows = this.catalog.resolveBuiltinAggregateRows(schema, name);
      if (aggRows?.hypothetical) {
        trace.addFact("priority", "2c (hypothetical-set aggregate)");
        trace.conclude(true, `${name}() WITHIN GROUP assigns the hypothetical row a position → never NULL`);
        return true;
      }
      if (aggRows?.orderedSet) {
        trace.addFact("priority", "2c (ordered-set aggregate)");
        const sortResults: boolean[] = [];
        const aggOrder = (fc as { agg_order?: Node[] }).agg_order ?? [];
        for (const [i, sb] of aggOrder.entries()) {
          const sortNode = (sb as { SortBy?: { node?: Node } }).SortBy?.node;
          if (!sortNode) {
            sortResults.push(false);
            continue;
          }
          const sortTrace = trace.addChild(`sort[${i}]`);
          sortResults.push(this.walkExprTraced(sortNode, scope, depth + 1, sortTrace));
        }
        const directNotNull = argResults.every(r => r); // mode() has none
        const sortNotNull = sortResults.length > 0 && sortResults.every(r => r);
        trace.addFact("sortArgsNotNull", `[${sortResults.map(r => (r ? "T" : "F")).join(", ")}]`);
        const result =
          scope.groupGuaranteesNonEmpty && !fc.agg_filter && directNotNull && sortNotNull;
        trace.conclude(
          result,
          result
            ? "non-empty group, non-null sort input and direct args → notNull"
            : "empty group, NULL sort input or NULL direct arg can yield NULL → nullable",
        );
        return result;
      }
      trace.addFact("priority", "2c (unknown WITHIN GROUP aggregate)");
      trace.conclude(false, "unknown ordered-set aggregate → conservative nullable");
      return false;
    }

    // Priority 3: Aggregate (other than count).
    const isAggregate =
      !!meta?.isAggregate ||
      (!meta && this.catalog.isAggregateBuiltin(name) && name !== "count");
    if (isAggregate) {
      trace.addFact("priority", meta ? "3 (aggregate)" : "3 (aggregate by name, not in catalog)");
      return this.resolveAggregateTraced(fc, name, argResults, scope, trace);
    }

    // Priority 4: Strict scalar function — the NULLABLE direction only.
    // Strictness says NULL in ⇒ NULL out and NOTHING about non-null input
    // (`lookup_name(id)` over a missing row returns NULL from a non-null
    // argument — measured), so a nullable argument concludes nullable
    // OUTRIGHT — before the body walk, whose analysis a strict function
    // with a NULL argument never even runs. The notNull direction needs
    // TOTALITY, which no catalog flag carries: with all arguments non-null
    // this falls THROUGH — to the body walk for LANGUAGE sql (whose
    // zero-row gate is what makes lookup_name honest), and to conservative
    // nullable otherwise. The same distinction TOTAL_OPERATORS and
    // STRICT_TOTAL_BUILTINS draw, now drawn here too.
    if (
      meta &&
      meta.strict &&
      !meta.isAggregate &&
      !this.allArgumentsNonNull(meta, orderedArgs)
    ) {
      trace.addFact("priority", "4 (strict)");
      trace.addFact("argsNotNull", `[${orderedArgs.map(r => r ? "T" : "F").join(", ")}]`);
      trace.conclude(false, "strict: at least one arg nullable");
      return false;
    }
    if (
      consensus &&
      consensus.length > 0 &&
      consensus.every(c => c.strict && !c.isAggregate) &&
      !(argResults.length > 0 && argResults.every(r => r))
    ) {
      trace.addFact("priority", "4 (strict, by consensus)");
      trace.conclude(false, "strict by consensus, and an arg is nullable");
      return false;
    }

    // Priority 5: LANGUAGE sql user function — recurse into body.
    if (meta && meta.language === "sql" && !meta.isAggregate) {
      trace.addFact("priority", "5 (LANGUAGE sql body recursion)");
      return this.resolveSqlFunctionBodyTraced(meta, orderedArgs, scope, depth, trace);
    }

    // Priority 6b: pg_catalog built-in. Reachable when the user catalog has
    // no candidate the walk may reason from — including a name pg_catalog
    // ALSO carries, which PostgreSQL searches first (adversarial-3 finding
    // 6): a same-signature user function is hidden, not preferred.
    if (!meta && (schema === undefined || schema === "pg_catalog")) {
      // The three tables reason about the ELEMENTS of an argument list —
      // "concat ignores NULL arguments", "concat_ws hinges on its first" —
      // and `VARIADIC <array>` changes what "the arguments" means: the
      // variadic parameter arrives as ONE array, and a NULL array yields
      // NULL (adversarial-2 finding 12, measured for concat, concat_ws with
      // a non-null first argument, the json/jsonb constructors, num_nulls
      // and num_nonnulls; `concat(VARIADIC ARRAY[NULL,NULL]::text[])` is ''
      // — the distinction is array-nullability, not element-nullability).
      // Every variadic-array call falls through to conservative nullable.
      if (fc.func_variadic) {
        trace.addFact("priority", "6b (built-in, VARIADIC array call)");
        trace.conclude(false, "VARIADIC passes the parameter as one array, and a NULL array yields NULL → nullable");
        return false;
      }
      // Typed dispatch first (docs/type-aware-overloads.md, the function
      // slice): resolve the call over the captured kind='f' rows and read
      // the verdict per SURVIVOR, which is what lets `lower(<text column>)`
      // claim notNull while `lower(<range>)` keeps reading nullable — the
      // name checks below serve only what the resolution cannot see. Named
      // notation breaks the positional lineup, so it skips to them.
      const args = fc.args ?? [];
      if (!args.some(a => "NamedArgExpr" in (a as Record<string, unknown>))) {
        const argTypeSets = args.map(a => this.operandTypeSet(a, scope, depth + 1));
        const resolved = this.catalog.resolveBuiltinScalarTotality(schema, name, argTypeSets);
        if (resolved.kind !== "unknown") {
          trace.addFact(
            "argTypes",
            argTypeSets.map(s => s?.join("|") ?? "unknown").join(", "),
          );
          if (resolved.kind === "always") {
            trace.addFact("priority", "6b (built-in, always non-null, signature-narrowed)");
            trace.conclude(true, `${name}() never returns NULL (every surviving signature)`);
            return true;
          }
          if (resolved.kind === "first-arg") {
            trace.addFact("priority", "6b (built-in, first arg decides, signature-narrowed)");
            const result = argResults.length > 0 && argResults[0] === true;
            trace.conclude(result, result
              ? `${name}() is non-null when its first argument is`
              : `${name}() with a nullable first argument → nullable`);
            return result;
          }
          if (resolved.kind === "strict-total") {
            trace.addFact("priority", "6b (built-in, total over non-null args, signature-narrowed)");
            trace.addFact("argsNotNull", `[${argResults.map(r => (r ? "T" : "F")).join(", ")}]`);
            const result = argResults.every(r => r);
            trace.conclude(result, result
              ? `every surviving signature of ${name}() is total: non-null arguments → non-null result`
              : `${name}() has a nullable argument → nullable`);
            return result;
          }
          trace.addFact("priority", "6b (built-in, signature-narrowed)");
          trace.conclude(false, `a surviving signature of ${name}() carries no totality claim → nullable`);
          return false;
        }
      }
      if (ALWAYS_NOT_NULL_BUILTINS.has(name)) {
        trace.addFact("priority", "6b (built-in, always non-null)");
        trace.conclude(true, `${name}() never returns NULL`);
        return true;
      }
      if (FIRST_ARG_BUILTINS.has(name)) {
        trace.addFact("priority", "6b (built-in, first arg decides)");
        const result = argResults.length > 0 && argResults[0] === true;
        trace.conclude(result, result
          ? `${name}() is non-null when its first argument is`
          : `${name}() with a nullable first argument → nullable`);
        return result;
      }
      if (STRICT_TOTAL_BUILTINS.has(name)) {
        trace.addFact("priority", "6b (built-in, total over non-null args)");
        trace.addFact("argsNotNull", `[${argResults.map(r => (r ? "T" : "F")).join(", ")}]`);
        const result = argResults.every(r => r);
        trace.conclude(result, result
          ? `${name}() is total: non-null arguments → non-null result`
          : `${name}() has a nullable argument → nullable`);
        return result;
      }
    }

    // Priority 6 & 7: Non-strict scalar / LANGUAGE plpgsql / unknown.
    trace.addFact("priority", meta ? "6 (non-strict/plpgsql)" : "7 (unknown function)");
    trace.conclude(false, "conservative nullable");
    return false;
  }

  /**
   * Nullability of a non-`count` aggregate call.
   *
   * The default is nullable: an aggregate over zero input rows returns NULL.
   * That default is escapable only when the group provably holds at least one
   * row *and* the aggregated value is provably non-null, which requires all of:
   *
   *   - a plain `GROUP BY` on the enclosing SELECT (see
   *     `groupGuaranteesNonEmpty`) — an ungrouped aggregate over an empty
   *     table still emits one NULL row;
   *   - no `FILTER (WHERE ...)` — the filter can exclude every row of the
   *     group, and `sum(x) FILTER (WHERE false)` is NULL;
   *   - an aggregate that maps "at least one non-null input" to a non-null
   *     result. `stddev`/`var_samp`/`corr` and friends are excluded: they are
   *     undefined (NULL) for a single row;
   *   - every argument non-null, so the aggregate sees no NULLs to skip.
   *
   * A non-null `INITCOND` proves NOTHING here: `agginitval` is the state
   * before any transition, so it fixes the EMPTY-input result only. Over a
   * non-empty group the result is whatever the transition and final
   * functions produced — either can return NULL from non-null state
   * (measured: agg_nullify, agg_finalnull) and neither is analysable. The
   * overall claim would need BOTH cases, so INITCOND alone concludes
   * nullable — which costs count_it its notNull, the honest price of not
   * analysing a transition function.
   */
  private resolveAggregateTraced(
    fc: FuncCall,
    name: string,
    argResults: boolean[],
    scope: Scope,
    trace: ITrace,
  ): boolean {
    const hasFilter = !!fc.agg_filter;
    const preserves = NON_NULL_OVER_NONEMPTY_AGGREGATES.has(name);
    const argsNotNull = argResults.length > 0 && argResults.every(r => r);

    trace.addFact("groupGuaranteesNonEmpty", String(scope.groupGuaranteesNonEmpty));
    trace.addFact("hasFilter", String(hasFilter));
    trace.addFact("preservesNonNull", String(preserves));
    trace.addFact("argsNotNull", `[${argResults.map(r => (r ? "T" : "F")).join(", ")}]`);

    if (scope.groupGuaranteesNonEmpty && !hasFilter && preserves && argsNotNull) {
      trace.conclude(true, `GROUP BY makes the group non-empty and ${name}() over non-null input is non-null`);
      return true;
    }
    trace.conclude(false, "aggregate returns NULL over zero rows");
    return false;
  }

  /**
   * Reorder arg nullability results to match function definition order.
   *
   * The raw parser keeps NamedArgExpr nodes in call order (e.g. `f(b => 1, a => 2)`
   * produces args[0] = NamedArgExpr("b"), args[1] = NamedArgExpr("a")). But
   * function bodies reference parameters by position ($1 = first param in
   * definition) or by name (BEGIN ATOMIC uses the definition param name). So
   * argResults must be reordered to definition order before being passed to
   * the body recursion.
   *
   * Positional args fill from the start; named args fill their specific
   * definition position. If no NamedArgExpr is present, no reordering is
   * needed.
   *
   * `supplied` marks the positions the CALL actually filled, which is what
   * separates "the caller passed something nullable" from "the caller passed
   * nothing at all" — the second is a defaulted parameter, and
   * `bindDefaultArguments` is what puts a value there.
   */
  private maybeReorderNamedArgs(
    args: Node[],
    argResults: boolean[],
    meta: FunctionInfo | null,
  ): { ordered: boolean[]; supplied: boolean[] } {
    const positional = (n: number): boolean[] => argResults.map((_, i) => i < n);
    if (!meta) return { ordered: argResults, supplied: positional(argResults.length) };
    const hasNamed = args.some(a => "NamedArgExpr" in (a as Record<string, unknown>));
    if (!hasNamed) return { ordered: argResults, supplied: positional(argResults.length) };

    const paramNames = meta.args.map(a => a.name);
    const width = Math.max(paramNames.length, argResults.length);
    const ordered = new Array<boolean>(width).fill(false);
    const supplied = new Array<boolean>(width).fill(false);
    let positionalIdx = 0;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i] as Record<string, unknown>;
      if ("NamedArgExpr" in arg) {
        const na = arg["NamedArgExpr"] as { name: string };
        const defIdx = paramNames.indexOf(na.name);
        if (defIdx >= 0) {
          ordered[defIdx] = argResults[i]!;
          supplied[defIdx] = true;
        }
      } else {
        ordered[positionalIdx] = argResults[i]!;
        supplied[positionalIdx] = true;
        positionalIdx++;
      }
    }
    return { ordered, supplied };
  }

  /**
   * What each PARAMETER of `meta` receives, with declared DEFAULTS filling the
   * positions the call left empty.
   *
   * A call that omits a defaulted parameter is a call that passes that
   * parameter's expression: `gfn_def(a integer, b integer DEFAULT 7)` invoked
   * as `gfn_def(x)` computes `a + b` with `b` = 7, and PostgreSQL's result is
   * total where the unbound reading called it nullable. The expression is
   * WALKED, never evaluated — `DEFAULT nullif(1, 1)` is NULL and
   * `DEFAULT now()` is not — and a default that did not parse leaves its
   * position alone, where the caller's conservative reading already sits.
   *
   * It is walked in an EMPTY scope with no enclosing function context: a
   * default cannot reference the caller's columns or the function's other
   * parameters (`column "a" does not exist` — measured), so it is closed over
   * nothing. The cycle-detection set is the one thing carried through, since
   * the default may itself be a call.
   *
   * Substitution stops at the first non-input parameter. Positions after an
   * OUT parameter no longer line up with the call's own argument list —
   * `(a int, OUT x int, b int DEFAULT 5)` is legal (measured) — and a
   * misaligned binding is worse than an unbound one.
   */
  private bindDefaultArguments(
    meta: FunctionInfo,
    ordered: boolean[],
    supplied: boolean[],
    depth: number,
    trace: ITrace,
  ): boolean[] {
    const defaults = this.catalog.fnArgDefaultAsts.get(
      `${meta.schema}.${meta.name}(${meta.argTypes})`,
    );
    if (!defaults) return ordered;

    let bound: boolean[] | null = null;
    for (let i = 0; i < meta.args.length; i++) {
      const arg = meta.args[i]!;
      if (arg.mode === "out" || arg.mode === "table") break;
      if (supplied[i]) continue;
      const expr = defaults[i];
      if (!expr) continue;
      bound ??= ordered.slice();
      bound[i] = this.walkDefaultExpr(expr, depth, trace.addChild(`default[${arg.name}]`));
    }
    return bound ?? ordered;
  }

  /** Walk one argument default in the context it is evaluated in: none. */
  private walkDefaultExpr(expr: Node, depth: number, trace: ITrace): boolean {
    const prevCtx = this.fnCtx;
    const prevParamNames = this.fnParamNames;
    this.fnCtx = prevCtx ? { argResults: [], analyzing: prevCtx.analyzing } : null;
    this.fnParamNames = null;
    try {
      return this.walkExprTraced(expr, this.emptyScope(null), depth + 1, trace);
    } catch (e) {
      // A default the walk refuses costs the CALL its precision, not the
      // statement its analysis — the rule the body inliner already follows.
      if (e instanceof UnsupportedNodeError) return false;
      throw e;
    } finally {
      this.fnCtx = prevCtx;
      this.fnParamNames = prevParamNames;
    }
  }

  /**
   * Whether every ARGUMENT this call passes is provably non-null — the
   * question strictness turns into "does the function run at all".
   *
   * Asked per INPUT parameter rather than over the array, because a position
   * the call never reached (an under-supplied argument, a default the walk
   * could not read, a position after an interleaved OUT parameter) is absent
   * from `bound` and must count as unproven. The extra pass over `bound`
   * itself catches a VARIADIC call's overflow arguments, which sit past the
   * end of the parameter list.
   */
  private allArgumentsNonNull(meta: FunctionInfo, bound: boolean[]): boolean {
    return (
      bound.every(r => r) &&
      meta.args.every(
        (a, i) => a.mode === "out" || a.mode === "table" || bound[i] === true,
      )
    );
  }

  /**
   * Whether a call to `meta` can SHORT-CIRCUIT: return without running its
   * body at all, because strictness saw a NULL argument.
   *
   * PostgreSQL answers a strict call with a NULL argument by returning NULL
   * and never entering the function — so nothing the body proves, and nothing
   * the DECLARED return type promises, describes that call. Measured in all
   * three shapes: a scalar returns NULL; a `RETURNS <composite>` yields one
   * row of all NULLs, its NOT NULL domain columns included; a set-returning
   * one yields no rows at all, which is why `returnsSet` is excluded here —
   * a claim about columns of rows that do not exist cannot be contradicted.
   *
   * Aggregates are excluded too: `proisstrict` on an aggregate is a property
   * of its transition function, not of the call.
   */
  private callCanShortCircuit(meta: FunctionInfo, bound: boolean[]): boolean {
    if (!meta.strict || meta.isAggregate || meta.returnsSet) return false;
    return !this.allArgumentsNonNull(meta, bound);
  }

  /**
   * The substituted argument vector for a call the walk is looking at from
   * OUTSIDE an expression walk — the FROM-position shape questions, which
   * have a `FuncCall` and a scope but no walked arguments yet.
   *
   * A refused argument counts as unproven rather than propagating: the shape
   * question must still be answered, and answering it conservatively is the
   * standing response to a sub-expression the walk cannot read.
   */
  private callArgumentResults(
    meta: FunctionInfo,
    fc: FuncCall,
    scope: Scope | null,
    depth: number,
  ): boolean[] {
    const argScope = scope ?? this.emptyScope(null);
    const args = fc.args ?? [];
    const walked = args.map(a => {
      try {
        return this.walkExpr(a, argScope, depth + 1);
      } catch (e) {
        if (e instanceof UnsupportedNodeError) return false;
        throw e;
      }
    });
    const { ordered, supplied } = this.maybeReorderNamedArgs(args, walked, meta);
    return this.bindDefaultArguments(meta, ordered, supplied, depth, NOOP);
  }

  private isAggregateByName(name: string, schema: string | undefined): boolean {
    const meta = this.catalog.resolveFunctionMetadata(schema, name);
    return meta?.isAggregate ?? this.catalog.isAggregateBuiltin(name);
  }

  private funcReturnsNotNullDomain(meta: FunctionInfo): boolean {
    return this.catalog.isNotNullDomain(meta.returnTypeOid);
  }

  // -------------------------------------------------------------------------
  // LANGUAGE sql function body recursion (synchronous — AST from fnBodyAsts)
  // -------------------------------------------------------------------------

  private resolveSqlFunctionBodyTraced(
    meta: FunctionInfo,
    argResults: boolean[],
    scope: Scope,
    depth: number,
    trace: ITrace,
  ): boolean {
    this.checkDepth(depth);

    const fnKey = `${meta.schema}.${meta.name}`;
    trace.addFact("fnKey", fnKey);

    // Cycle detection.
    if (this.fnCtx?.analyzing.has(fnKey)) {
      trace.addFact("cycle", "detected");
      trace.conclude(false, "cycle in function body recursion -> nullable");
      return false;
    }

    // Look up the pre-parsed body AST from the catalog.
    const bodyAst = this.catalog.fnBodyAsts.get(fnKey);
    trace.addFact("bodyAst", bodyAst ? "found" : "not found");
    if (!bodyAst) {
      trace.conclude(false, "no pre-parsed body -> nullable");
      return false;
    }

    // Set up function body context.
    const prevCtx = this.fnCtx;
    const prevParamNames = this.fnParamNames;
    this.fnCtx = {
      argResults,
      analyzing: new Set(prevCtx?.analyzing ?? []).add(fnKey),
    };
    this.fnParamNames = meta.args.map(a => a.name);
    try {
      return this.analyzeSqlFunctionReturnTraced(bodyAst, scope, depth, trace);
    } finally {
      this.fnCtx = prevCtx;
      this.fnParamNames = prevParamNames;
    }
  }


  private analyzeSqlFunctionReturnTraced(
    stmt: Node,
    scope: Scope,
    depth: number,
    trace: ITrace,
  ): boolean {
    const fnScope = this.emptyScope(scope.outer);

    const node = stmt as Record<string, unknown>;
    if ("SelectStmt" in node) {
      const sel = node["SelectStmt"] as SelectStmt;
      // VALUES in function body.
      if (sel.valuesLists && sel.valuesLists.length > 0) {
        trace.addFact("bodyType", "VALUES");
        const results = this.analyzeValuesSelect(sel.valuesLists, fnScope, depth + 1);
        const result = results[0]?.notNull ?? false;
        trace.conclude(result, `VALUES first column: ${result ? "notNull" : "nullable"}`);
        return result;
      }
      // Normal SELECT — check row-count before analyzing output.
      trace.addFact("bodyType", "SELECT");
      const singleRow = this.guaranteesSingleRow(sel);
      trace.addFact("noFrom", String(!sel.fromClause || sel.fromClause.length === 0));
      trace.addFact("hasAggregate", String(this.targetListHasAggregate(sel.targetList)));
      trace.addFact("singleRow", String(singleRow));
      if (!singleRow) {
        trace.conclude(false, "body can return zero rows -> nullable");
        return false;
      }

      const results = this.analyzeSelectWithFnScope(sel, fnScope, depth);
      const result = results[0]?.notNull ?? false;
      trace.conclude(result, `SELECT first column: ${result ? "notNull" : "nullable"}`);
      return result;
    }

    // DML with RETURNING (INSERT/UPDATE/DELETE in function bodies).
    if ("InsertStmt" in node) {
      const ins = node["InsertStmt"] as InsertStmt;
      trace.addFact("bodyType", "INSERT");
      if (!ins.returningClause) {
        trace.conclude(false, "INSERT without RETURNING -> nullable");
        return false;
      }
      const sel = ins.selectStmt
        ? (ins.selectStmt as Record<string, unknown>)["SelectStmt"] as SelectStmt | undefined
        : undefined;
      // ON CONFLICT DO NOTHING suppresses the row on a conflict, and
      // RETURNING reports only rows actually inserted or updated — so the
      // statement can yield nothing however many VALUES rows were supplied.
      if (ins.onConflictClause) {
        trace.addFact("onConflict", "true");
        trace.conclude(false, "INSERT ... ON CONFLICT can return zero rows -> nullable");
        return false;
      }
      const singleRowValues =
        sel?.valuesLists && sel.valuesLists.length === 1;
      trace.addFact("singleRowValues", String(singleRowValues));
      if (!singleRowValues) {
        trace.conclude(false, "INSERT...SELECT can return zero rows -> nullable");
        return false;
      }
      // Through the SHARED scope builder — the body inliner is the third
      // caller beside the top-level walk and the data-modifying-CTE path,
      // and calling buildDmlScope directly bypassed every rewrite-hook
      // response the builders carry (adversarial-2 finding 6): no INSTEAD
      // OF void, no BEFORE ROW void, no DO INSTEAD rule refusal. The
      // refusal is CAUGHT rather than propagated: an inlined body is an
      // optimization, and losing it should cost precision (the caller's
      // conservative nullable), not the statement.
      let dmlScope: Scope;
      try {
        dmlScope = this.buildInsertScope(ins, fnScope, depth);
      } catch (e) {
        if (e instanceof UnsupportedNodeError) {
          trace.conclude(false, "body's INSERT is refused (DO INSTEAD rule) -> nullable");
          return false;
        }
        throw e;
      }
      const retResults = this.analyzeReturning(ins.returningClause, dmlScope, depth);
      const result = retResults[0]?.notNull ?? false;
      trace.conclude(result, `INSERT RETURNING first column: ${result ? "notNull" : "nullable"}`);
      return result;
    }
    if ("UpdateStmt" in node) {
      trace.addFact("bodyType", "UPDATE");
      trace.conclude(false, "UPDATE can match zero rows -> nullable");
      return false;
    }
    if ("DeleteStmt" in node) {
      trace.addFact("bodyType", "DELETE");
      trace.conclude(false, "DELETE can match zero rows -> nullable");
      return false;
    }

    trace.conclude(false, "unknown body statement type -> nullable");
    return false;
  }

  /**
   * What a `LANGUAGE sql` function's BODY proves about each of its output
   * columns, or null where the body cannot answer.
   *
   * A ROW type carries column TYPES and no constraints: `RETURNS SETOF
   * order_items` genuinely permits NULL in every column, and PostgreSQL
   * re-imposes nothing — a body selecting NULL into a NOT NULL column is
   * accepted and comes back NULL (measured). So the declared shape is right to
   * erase, and the only sound source of a guarantee is the body, which for
   * these functions selects the very columns the constraint sits on.
   *
   * This is the row-return counterpart of `resolveSqlFunctionBodyTraced`
   * (priority 5), which reads the same bodies for SCALAR returns and takes
   * column 0. The bounds are that inliner's, plus the ones a row return adds:
   *
   *   - `LANGUAGE sql` only, single candidate only. `fnBodyAsts` is keyed by
   *     `schema.name` with no argument types, so an overloaded name's entries
   *     COLLIDE there; the caller reaches this only through
   *     `resolveFunctionMetadata`, whose single-candidate shortcut is what
   *     makes the key unambiguous.
   *   - A SELECT or VALUES body only. A set operation contributes an empty
   *     target list here and a DML body is not read at all, so both fall to
   *     no upgrade.
   *   - A body's PARAMETERS read nullable. Threading the call's argument
   *     nullability in the way the scalar path does would close one more claim
   *     (`out_pair`'s `lo` returns its own argument) and would have to be
   *     right about the argument's join state at the call site; the caller's
   *     NULL does reach the output (measured), so reading them nullable is the
   *     conservative half.
   *   - **Zero rows is a NULL ROW for a non-set-returning function.**
   *     `RETURNS <composite>` whose body filters everything away yields one
   *     row of all NULLs (measured), so a `!returnsSet` body must guarantee
   *     its single row — the same gate the scalar path applies for the same
   *     reason. A SETOF body needs no such gate: no rows means no output rows
   *     to be NULL.
   *
   * `rowFields` is the second reading a row return needs. A body may deliver
   * its row as ONE column of the composite type rather than as N field columns
   * — both spellings are accepted (measured) — and PostgreSQL then expands
   * that value's fields. Only a ROW constructor is read that way, because a
   * constructor is never itself NULL while any other expression of composite
   * type may be, and a NULL value nulls every field.
   */
  private sqlFunctionBodyShape(
    meta: FunctionInfo,
    depth: number,
  ): { columns: boolean[]; rowFields: boolean[] | null } | null {
    if (meta.language !== "sql" || meta.isAggregate) return null;
    this.checkDepth(depth);

    const fnKey = `${meta.schema}.${meta.name}`;
    if (this.fnCtx?.analyzing.has(fnKey)) return null;
    const bodyAst = this.catalog.fnBodyAsts.get(fnKey);
    if (!bodyAst) return null;

    const node = bodyAst as Record<string, unknown>;
    if (!("SelectStmt" in node)) return null;
    const sel = node["SelectStmt"] as SelectStmt;

    const prevCtx = this.fnCtx;
    const prevParamNames = this.fnParamNames;
    // No argResults: every parameter reference reads nullable. The names are
    // still needed — a BEGIN ATOMIC body spells its parameters by name.
    this.fnCtx = {
      argResults: [],
      analyzing: new Set(prevCtx?.analyzing ?? []).add(fnKey),
    };
    this.fnParamNames = meta.args.map(a => a.name);
    try {
      const fnScope = this.emptyScope(null);
      if (sel.valuesLists && sel.valuesLists.length > 0) {
        const results = this.analyzeValuesSelect(sel.valuesLists, fnScope, depth + 1);
        return { columns: results.map(r => r.notNull), rowFields: null };
      }
      if (!meta.returnsSet && !this.guaranteesSingleRow(sel)) return null;

      const scope = this.buildScope(sel, fnScope, depth);
      const results = this.analyzeSelectTargets(sel, scope, depth);
      return {
        columns: results.map(r => r.notNull),
        rowFields: this.rowConstructorFields(sel, scope, depth),
      };
    } catch (e) {
      // An inlined body is an optimization: a body the walk refuses costs the
      // CALL its precision, not the statement its analysis — the rule the
      // INSERT arm of the scalar inliner already follows.
      if (e instanceof UnsupportedNodeError) return null;
      throw e;
    } finally {
      this.fnCtx = prevCtx;
      this.fnParamNames = prevParamNames;
    }
  }

  /**
   * The per-element nullability of a body whose whole target list is one ROW
   * constructor — `SELECT ROW('s', NULL)::sku_pair`, the spelling that hands
   * back a composite VALUE where the function's output is that composite's
   * fields. Null for every other shape.
   */
  private rowConstructorFields(
    sel: SelectStmt,
    scope: Scope,
    depth: number,
  ): boolean[] | null {
    if ((sel.targetList?.length ?? 0) !== 1) return null;
    let val = this.unwrapResTarget(sel.targetList![0]!).val as Record<string, unknown> | undefined;
    // `ROW(…)::composite` is the shape a body needs to satisfy the declared
    // return type; the cast preserves the constructor's per-field values.
    while (val && "TypeCast" in val) {
      val = (val["TypeCast"] as { arg?: Node } | undefined)?.arg as
        | Record<string, unknown>
        | undefined;
    }
    const row = val?.["RowExpr"] as { args?: Node[] } | undefined;
    if (!row?.args) return null;
    return row.args.map(a => this.walkExpr(a, scope, depth + 1));
  }

  /**
   * Whether a function's output columns come from EXPANDING a row type, as
   * opposed to standing on their own. It decides whether a one-column body can
   * be read positionally: for a row-typed return with a single field, "the
   * body's one column" is the field under one reading and the whole row under
   * the other, and a ROW constructor is non-null while its field need not be.
   */
  private functionReturnIsRowType(meta: FunctionInfo): boolean {
    const outs = meta.args.filter(
      a => a.mode === "out" || a.mode === "table" || a.mode === "inout",
    );
    if (outs.length === 0 || outs.some(a => !a.name)) {
      const type = meta.returnType.replace(/^setof\s+/i, "").trim();
      if (/^table\s*\(/is.test(type)) return false;
      return this.rowTypeColumns(type) !== null;
    }
    if (outs.length === 1) return this.rowTypeColumns(outs[0]!.typeName) !== null;
    return false;
  }

  /**
   * A declared FROM-position column list, refined by what the function's body
   * proves. Upgrades only — a domain's NOT NULL is enforced on output and
   * keeps its claim whatever the body says.
   *
   * `declared` and the body agree column-for-column, or the body delivers the
   * whole row as one ROW constructor; anything else leaves the list alone. The
   * one-against-one case is refused for a row-typed return, where the two
   * readings are indistinguishable and disagree.
   */
  private refineColumnsFromBody(
    declared: { name: string; notNull: boolean }[],
    meta: FunctionInfo,
    depth: number,
  ): { name: string; notNull: boolean }[] {
    if (declared.length === 0) return declared;
    const shape = this.sqlFunctionBodyShape(meta, depth);
    if (!shape) return declared;

    let flags: boolean[] | null = null;
    if (shape.columns.length === declared.length) {
      flags =
        declared.length === 1 && this.functionReturnIsRowType(meta) ? null : shape.columns;
    } else if (shape.columns.length === 1 && shape.rowFields?.length === declared.length) {
      flags = shape.rowFields;
    }
    if (!flags) return declared;
    return declared.map((c, i) => ({ name: c.name, notNull: c.notNull || flags![i]! }));
  }

  private analyzeSelectWithFnScope(
    sel: SelectStmt,
    fnScope: Scope,
    depth: number,
  ): OutputNullability[] {
    // Build a real scope from the SELECT's FROM clause, with fnScope as outer.
    const scope = this.buildScope(sel, fnScope, depth);
    return this.analyzeSelectTargets(sel, scope, depth);
  }

  /**
   * A SELECT's output columns against a scope already built for it. Split out
   * so a caller that needs the SCOPE as well — the body-shape reading, which
   * walks a single ROW constructor's elements — does not build it twice.
   */
  private analyzeSelectTargets(
    sel: SelectStmt,
    scope: Scope,
    depth: number,
  ): OutputNullability[] {
    const results: OutputNullability[] = [];
    for (const target of sel.targetList ?? []) {
      const rt = this.unwrapResTarget(target);
      const val = rt.val;
      const name = rt.name;
      if (!val) {
        results.push({ name: name ?? "", notNull: false });
        continue;
      }
      if (this.isStarColumn(val)) {
        const expanded = this.expandStar(val, scope, depth);
        for (const e of expanded) results.push(e);
        continue;
      }
      const compositeStar = this.expandCompositeStar(val, scope, depth);
      if (compositeStar) {
        for (const e of compositeStar) results.push(e);
        continue;
      }
      const notNull = this.walkExpr(val, scope, depth + 1);
      results.push({ name: name ?? this.inferName(val), notNull });
    }
    return results;
  }

  // -------------------------------------------------------------------------
  // Utility: AST node unwrapping and field extraction
  // -------------------------------------------------------------------------

  private unwrapResTarget(target: Node): { val?: Node; name?: string } {
    const node = target as Record<string, unknown>;
    const rt = (node["ResTarget"] as Record<string, unknown> | undefined) ?? node;
    return {
      val: rt["val"] as Node | undefined,
      name: rt["name"] as string | undefined,
    };
  }

  private unwrapCTE(cte: Node): {
    ctename: string;
    ctequery: Node;
    aliascolnames?: Node[];
    search_clause?: { search_seq_column?: string };
    cycle_clause?: { cycle_mark_column?: string; cycle_path_column?: string };
  } | null {
    const node = cte as Record<string, unknown>;
    const c = node["CommonTableExpr"] as
      | {
          ctename: string;
          ctequery: Node;
          aliascolnames?: Node[];
          search_clause?: { search_seq_column?: string };
          cycle_clause?: { cycle_mark_column?: string; cycle_path_column?: string };
        }
      | undefined;
    return c ?? null;
  }

  private stringVal(node: Node): string {
    const n = node as Record<string, unknown>;
    if ("String" in n) return (n["String"] as { sval?: string }).sval ?? "";
    return "";
  }

  private funcName(fc: FuncCall): string {
    const names = fc.funcname ?? [];
    const last = names[names.length - 1];
    return last ? this.stringVal(last) : "";
  }

  private funcSchema(fc: FuncCall): string | undefined {
    const names = fc.funcname ?? [];
    if (names.length >= 2) {
      return this.stringVal(names[names.length - 2]!);
    }
    return undefined;
  }

  private inferName(val: Node): string {
    // Infer a column name from the expression node.
    const node = val as Record<string, unknown>;
    if ("ColumnRef" in node) {
      const cr = node["ColumnRef"] as ColumnRef;
      const fields = (cr.fields ?? []) as Node[];
      const last = fields[fields.length - 1];
      return last ? this.stringVal(last) : "";
    }
    if ("FuncCall" in node) {
      return this.funcName(node["FuncCall"] as FuncCall);
    }
    // No name inferred. PostgreSQL would label these "exists", "array",
    // "coalesce", "?column?" and so on (see FigureColname in
    // parse_target.c); we deliberately do not reimplement those rules —
    // see the note on OutputNullability.name. Returning the empty string
    // says "we did not infer one", which is honest. Returning the internal
    // subLinkType enum, as this used to, leaked a parser detail that looked
    // like a real column name to anything downstream.
    return "";
  }

  // -------------------------------------------------------------------------
  // Depth safeguard
  // -------------------------------------------------------------------------

  private checkDepth(depth: number): void {
    if (depth > MAX_DEPTH) {
      throw new Error(
        `Nullability walk exceeded maximum recursion depth (${MAX_DEPTH}). ` +
        `This may indicate a cycle in CTE/subquery references or function body recursion.`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Single-row guarantee
  // -------------------------------------------------------------------------

  /**
   * Whether `select` provably produces exactly one row.
   *
   * A scalar (EXPR_SUBLINK) subquery over zero rows evaluates to NULL, so this
   * predicate is what licenses propagating the inner column's nullability
   * outward. It must be conservative: every construct that can drop the row
   * count to zero has to be rejected.
   *
   * Two shapes qualify:
   *   - No FROM clause and no WHERE (`SELECT 1`) — always exactly one row.
   *     `SELECT 1 WHERE false` returns none, so the WHERE must be absent.
   *   - An ungrouped aggregate (`SELECT count(*) FROM t`) — the aggregate
   *     collapses any number of input rows, including zero, to one row.
   *
   * Rejected in both shapes:
   *   - `HAVING` — filters the single aggregate row away.
   *   - `LIMIT` / `OFFSET` — either can leave zero rows.
   *   - Set operations — `op` is set and the row count is unconstrained;
   *     a set-op node also carries no `fromClause`, so it would otherwise
   *     be mistaken for the FROM-less shape.
   */
  private guaranteesSingleRow(select: SelectStmt): boolean {
    // Set operations (UNION/INTERSECT/EXCEPT): row count unconstrained. Checked
    // first — these nodes have no fromClause/targetList of their own.
    if (select.op && select.op !== "SETOP_NONE") return false;
    // LIMIT / OFFSET can each strip the row away.
    if (select.limitCount || select.limitOffset) return false;
    // HAVING filters whole groups, including the single ungrouped-aggregate row.
    if (select.havingClause) return false;

    const noFrom = !select.fromClause || select.fromClause.length === 0;
    // A FROM-less SELECT is one row only when nothing can filter it out.
    if (noFrom) return !select.whereClause;

    // An aggregate with no GROUP BY collapses to exactly one row.
    return this.targetListHasAggregate(select.targetList) && !select.groupClause;
  }

  /**
   * Collect the columns a grouping-set construct can NULL out.
   *
   * Only terms nested inside a `GroupingSet` node (ROLLUP / CUBE / GROUPING
   * SETS) are collected. A plain grouping term at the top level of the
   * GROUP BY appears in every generated grouping set and is never collapsed,
   * so it is left alone.
   *
   * PostgreSQL accepts THREE spellings for a term, and all three must land:
   * a ColumnRef (recorded directly), an output-column ORDINAL (`ROLLUP(1)` —
   * an A_Const selecting the n-th target entry), and an output-column ALIAS
   * (`ROLLUP(k)` — a bare name matching a `ResTarget.name`). The latter two
   * resolve against the target list and record the selected entry's
   * underlying refs, which is what the ColumnRef consumers ask about. The
   * alias spelling also keeps its own name key (PostgreSQL prefers an input
   * column over an output alias when both exist, and this set only ever
   * turns claims nullable, so recording both is the conservative reading).
   */
  private collectGroupingSetColumns(
    groupClause: Node[] | undefined,
    targetList: Node[] | undefined,
    scope: Scope,
    depth: number,
  ): ReadonlySet<string> {
    if (!groupClause || groupClause.length === 0) return EMPTY_STRING_SET;
    if (!groupClause.some(term => "GroupingSet" in (term as Record<string, unknown>))) {
      return EMPTY_STRING_SET;
    }
    const positions = this.groupingOrdinalPositions(targetList ?? [], scope, depth);
    const out = new Set<string>();
    for (const term of groupClause) {
      if ("GroupingSet" in (term as Record<string, unknown>)) {
        this.collectGroupingSetTermKeys(term, out, targetList ?? [], positions);
      }
    }
    return out.size > 0 ? out : EMPTY_STRING_SET;
  }

  /**
   * The EXPANDED target list as ordinal-resolution positions. PostgreSQL
   * numbers a grouping-set output ordinal against the OUTPUT columns, and a
   * star entry is one ResTarget contributing N of them (adversarial-2
   * finding 10) — so `targetList[n-1]` is the wrong entry as soon as any
   * star precedes the ordinal, and for the star entry itself the raw
   * ColumnRef's fields are `[String, A_Star]`, which records nothing. A
   * star-derived position carries its (column, alias.column) keys directly,
   * mirroring expandStar's two branches; a composite-star position occupies
   * its width with no keys (its fields are forced nullable by the expansion
   * already, so there is no claim for the override to blank); a plain
   * position carries its ResTarget expression for collectColumnRefKeys.
   */
  private groupingOrdinalPositions(
    targetList: Node[],
    scope: Scope,
    depth: number,
  ): { keys: string[] | null; val: Node | null }[] {
    const positions: { keys: string[] | null; val: Node | null }[] = [];
    for (const t of targetList) {
      const rt = (t as { ResTarget?: { val?: Node } }).ResTarget;
      const val = rt?.val;
      if (!val) {
        positions.push({ keys: null, val: null });
        continue;
      }
      if (this.isStarColumn(val)) {
        const fields =
          (((val as Record<string, unknown>)["ColumnRef"] as ColumnRef).fields ?? []);
        const qualifier = this.starQualifier(fields);
        if (qualifier) {
          const entry = this.resolveStarRelation(qualifier, scope);
          for (const col of entry ? this.relationColumnsIntrinsic(entry, scope, depth) : []) {
            positions.push({ keys: [col.name, `${qualifier.name}.${col.name}`], val: null });
          }
        } else {
          for (const v of scope.visible) {
            const keys = [v.name];
            if (v.entry) keys.push(`${v.entry.alias}.${v.name}`);
            positions.push({ keys, val: null });
          }
        }
        continue;
      }
      const composite = this.expandCompositeStar(val, scope, depth);
      if (composite) {
        for (let i = 0; i < composite.length; i++) positions.push({ keys: [], val: null });
        continue;
      }
      positions.push({ keys: null, val });
    }
    return positions;
  }

  /**
   * Record the keys of one grouping-set term, resolving output-ordinal
   * spellings through the EXPANDED `positions` and output-alias spellings
   * through `targetList` (a star entry cannot be aliased, so the raw list
   * is exact there — see collectGroupingSetColumns).
   */
  private collectGroupingSetTermKeys(
    node: Node,
    out: Set<string>,
    targetList: Node[],
    positions: { keys: string[] | null; val: Node | null }[],
  ): void {
    const resTarget = (t: Node | undefined) =>
      (t as Record<string, unknown> | undefined)?.["ResTarget"] as
        | { name?: string; val?: Node }
        | undefined;
    const rec = node as Record<string, unknown>;
    if ("ColumnRef" in rec) {
      const parts = ((rec["ColumnRef"] as ColumnRef).fields ?? []).map(f => this.stringVal(f));
      const col = parts[parts.length - 1];
      if (col) {
        out.add(col);
        if (parts.length >= 2) out.add(`${parts[parts.length - 2]}.${col}`);
        if (parts.length === 1) {
          for (const t of targetList) {
            const rt = resTarget(t);
            if (rt?.name === col && rt.val) this.collectColumnRefKeys(rt.val, out);
          }
        }
      }
      return;
    }
    if ("A_Const" in rec) {
      const ival = (rec["A_Const"] as { ival?: { ival?: number } }).ival?.ival;
      if (typeof ival === "number" && ival >= 1) {
        const pos = positions[ival - 1];
        if (pos?.keys) for (const k of pos.keys) out.add(k);
        else if (pos?.val) this.collectColumnRefKeys(pos.val, out);
      }
      return;
    }
    for (const value of Object.values(rec)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v && typeof v === "object") {
            this.collectGroupingSetTermKeys(v as Node, out, targetList, positions);
          }
        }
      } else if (value && typeof value === "object") {
        this.collectGroupingSetTermKeys(value as Node, out, targetList, positions);
      }
    }
  }

  /** Recursively record every ColumnRef in `node` as `alias.col` and `col`. */
  private collectColumnRefKeys(node: Node, out: Set<string>): void {
    const rec = node as Record<string, unknown>;
    if ("ColumnRef" in rec) {
      const parts = ((rec["ColumnRef"] as ColumnRef).fields ?? []).map(f => this.stringVal(f));
      const col = parts[parts.length - 1];
      if (col) {
        out.add(col);
        if (parts.length >= 2) out.add(`${parts[parts.length - 2]}.${col}`);
      }
      return;
    }
    for (const value of Object.values(rec)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v && typeof v === "object") this.collectColumnRefKeys(v as Node, out);
        }
      } else if (value && typeof value === "object") {
        this.collectColumnRefKeys(value as Node, out);
      }
    }
  }

  /**
   * Whether `select`'s GROUP BY guarantees every emitted group is non-empty.
   *
   * A plain `GROUP BY a` only emits groups that have at least one input row.
   * ROLLUP / CUBE / GROUPING SETS are different: they add super-aggregate rows
   * computed over the empty grouping set, so an empty input still emits one
   * row whose aggregates are NULL. Those forms must not license the
   * "aggregate over non-null input is non-null" rule.
   */
  private groupingGuaranteesNonEmptyGroups(select: SelectStmt): boolean {
    if (!select.groupClause || select.groupClause.length === 0) return false;
    for (const g of select.groupClause) {
      if ("GroupingSet" in (g as Record<string, unknown>)) return false;
    }
    return true;
  }
}

// ---------------------------------------------------------------------------
// Common built-in aggregate function names (for detection without catalog).
// These are pg_catalog built-ins not captured in the user-schema snapshot.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Operators that never return NULL when all of their operands are non-null.
//
// Strictness is NOT the criterion. A strict operator returns NULL for NULL
// input, which says nothing about non-null input: `jsonb -> 'missing'` and
// `jsonb ->> 'missing'` are strict yet return NULL for two non-null operands.
// Only operators that are *total* over their non-null domain belong here.
// Operators that raise on bad input (division by zero, overflow) still
// qualify — an error is not a NULL.
//
// Deliberately excluded: `-> ->> #> #>> ? ?| ?& #- @> <@` (JSON/array probes
// that return NULL or depend on element nullability).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Window functions that assign a value to every row in the partition, so they
// never return NULL regardless of frame or ordering (a NULL ordering key still
// gets a rank). Excluded on purpose: lag/lead/first_value/last_value/nth_value
// (can address a row outside the frame) and every aggregate used as a window
// function (the frame can be empty).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Aggregates that return a non-null result whenever they see at least one
// non-null input value.
//
// Excluded on purpose: stddev / stddev_samp / variance / var_samp / corr /
// regr_* — all undefined (NULL) for a single input row, so a non-empty group
// is not enough. Ordered-set aggregates (percentile_*, mode) are excluded
// because their WITHIN GROUP argument is not modelled here.
// ---------------------------------------------------------------------------

export const NON_NULL_OVER_NONEMPTY_AGGREGATES = new Set([
  "sum", "avg", "min", "max",
  "bit_and", "bit_or", "bool_and", "bool_or", "every",
  "array_agg", "string_agg", "json_agg", "jsonb_agg",
]);

export const NEVER_NULL_WINDOW_FNS = new Set([
  "row_number", "rank", "dense_rank", "percent_rank", "cume_dist",
]);

/**
 * The parser's frameOptions for a window with no explicit frame clause:
 * RANGE UNBOUNDED PRECEDING TO CURRENT ROW, which always contains the
 * current row. Measured by parsing `OVER ()` / `OVER (ORDER BY x)`; an
 * explicit frame — even one spelling out the same bounds — sets the
 * NONDEFAULT bit and lands elsewhere, which is the conservative side.
 */
const FRAMEOPTION_DEFAULTS = 1058;

// Two name tables retired here 2026-08-09 — HYPOTHETICAL_SET_AGGREGATES
// and ORDERED_SET_AGGREGATES. Both were asserted catalog-equal to
// `pg_aggregate.aggkind` in both directions, which is the retirement
// criterion AGGREGATE_NAMES established: the WITHIN GROUP dispatch now
// reads the capture's aggkind directly (resolveBuiltinAggregateRows), and
// the CLASS claims those tables carried live at the dispatch site —
// hypothetical-set is total even over zero rows and for a NULL argument
// (measured; NULLs order like values), ordered-set proper is NULL over an
// empty group, an all-NULL sort column, or a NULL direct argument (all
// measured).

// ---------------------------------------------------------------------------
// pg_catalog built-ins.
//
// The catalog snapshot only covers user schemas, so built-ins arrive with no
// FunctionInfo and would otherwise fall through to "unknown function →
// nullable". That is safe but badly imprecise: `now()`, `upper(x)` and
// `length(x)` are everyday expressions.
//
// These tables are consulted ONLY when the catalog has no entry for the name,
// so a user-defined function shadowing a built-in still wins — its real
// metadata is used instead.
//
// Membership requires being *total*, not merely strict: a function must never
// return NULL for non-null arguments. Deliberately excluded on that basis:
//   - array_length / array_ndims — NULL for an empty array or bad dimension
//   - jsonb_extract_path(_text), jsonb_path_query_first — NULL for a missing path
//   - nullif — NULL is its entire purpose (and it parses as an A_Expr anyway)
// ---------------------------------------------------------------------------

/** Built-ins that never return NULL, whatever their arguments. */
export const ALWAYS_NOT_NULL_BUILTINS = new Set([
  // Clock / session. Zero-argument, always defined.
  "now", "clock_timestamp", "statement_timestamp", "transaction_timestamp",
  // `current_catalog`, `current_role` and `user` were here and are gone: they
  // are not pg_catalog FUNCTIONS at all, and the parser turns each into a
  // SQLValueFunction node that never reaches this dispatch. (`current_user`
  // and `session_user` parse that way too, but they ARE functions, so a
  // qualified call can still arrive and they stay.)
  // `random` was here and is gone: PG17 added `random(min, max)` overloads for
  // integer, bigint and numeric which are STRICT, so `random(NULL, NULL)` is
  // NULL while this table claims "never NULL whatever the arguments"
  // (measured). Name-level dispatch cannot separate them from the total
  // zero-argument form, which is the `lower`/`upper` shape once more; the cost
  // is that `random()` now reads nullable.
  "current_database", "current_user",
  "session_user", "version", "pi", "gen_random_uuid",
  "txid_current", "pg_backend_pid",
  // concat ignores NULL arguments; all-NULL input yields '' , not NULL.
  "concat",
  // JSON constructors always produce a container, even from NULL members.
  "jsonb_build_object", "json_build_object",
  "jsonb_build_array", "json_build_array",
]);

/**
 * Built-ins that are non-null exactly when their *first* argument is non-null;
 * later arguments may be NULL without making the result NULL.
 *
 * `concat_ws(NULL, 'a')` is NULL but `concat_ws(',', NULL)` is ''; likewise
 * `format(NULL)` is NULL but `format('%s', NULL)` is ''.
 */
export const FIRST_ARG_BUILTINS = new Set(["concat_ws", "format"]);

/**
 * Built-ins that are total over non-null arguments: non-null in, non-null out.
 * Raising on bad input still counts — an error is not a NULL.
 */
export const STRICT_TOTAL_BUILTINS = new Set([
  // Math
  "abs", "ceil", "ceiling", "floor", "round", "trunc", "sign", "sqrt", "cbrt",
  "exp", "ln", "log", "log10", "power", "mod", "div", "gcd", "lcm",
  "degrees", "radians", "sin", "cos", "tan", "asin", "acos", "atan", "atan2",
  "width_bucket",
  // String. Six former members failed the table's own admission criterion
  // and are out (adversarial finding 7, all measured 2026-08-04):
  // `substring` — the FROM-regex form is NULL on no match, and the total
  // positional form is indistinguishable at name level (`substr`, which is
  // positional-only, stays); `to_number('','')` and `to_char(<datetime>,'')`
  // are NULL (the numeric/int to_char forms return '' and are total, but
  // name-level dispatch cannot tell); `scale` and `min_scale` of NaN are
  // NULL; `array_position` is NULL when the element is absent.
  //
  // `lower` and `upper` left for the SAME reason, found by the curated-table
  // auditor rather than by hand: each has a total `(text)` form AND a
  // `(anyrange)`/`(anymultirange)` form that returns NULL for an EMPTY range
  // (measured — `lower('empty'::int4range)` is NULL, and the engine claimed
  // notNull). Name-level dispatch cannot tell the two apart, so the text
  // meaning loses its precision with the range one. Recovering it needs the
  // ARGUMENT's type, which this rule deliberately does not read; the register
  // records that as the recovery path.
  "initcap", "length", "char_length", "character_length",
  "octet_length", "bit_length", "md5", "ascii", "chr", "repeat", "reverse",
  "substr", "replace", "translate", "overlay",
  // `trim` was here and is gone: PostgreSQL's grammar rewrites every TRIM
  // spelling to `pg_catalog.btrim` before the walk sees it (measured), and
  // there is no pg_catalog.trim for a quoted call to reach either.
  "ltrim", "rtrim", "btrim", "lpad", "rpad",
  "split_part", "strpos", "position", "left", "right", "starts_with",
  "quote_ident", "quote_literal", "quote_nullable",
  "to_date", "to_timestamp", "to_hex",
  "encode", "decode", "sha256",
  // Arrays / rows
  "array_to_string", "string_to_array", "cardinality", "array_append",
  "array_prepend", "array_cat", "array_remove",
  // Date / time. `extract`/`date_part` (one function, two names) are OUT
  // (adversarial-2 finding 11, measured): for an infinite timestamp,
  // timestamptz, date or interval they return ±Infinity only for the
  // monotonically-increasing fields and NULL for every other one —
  // month/day/hour of 'infinity' are NULL, so the pair fails the table's
  // admission criterion on an input CLASS the first sweep's finite probes
  // never tried.
  "date_trunc", "age", "justify_days", "justify_hours",
  "justify_interval", "make_date", "make_time", "make_timestamp",
  "make_timestamptz", "make_interval", "isfinite",
  // JSON
  "to_json", "to_jsonb", "jsonb_typeof", "json_typeof", "jsonb_array_length",
  "json_array_length", "row_to_json", "jsonb_strip_nulls", "jsonb_pretty",
  // Misc
  "num_nulls", "num_nonnulls", "pg_typeof",
  // Wave-4 batch, each measured 2026-08-01 with adversarial non-null inputs
  // (no-match regexps, empty arrays, missing jsonb paths — jsonb_set on a
  // scalar target RAISES, which counts: an error is not a NULL).
  "pow", "factorial", "sinh", "cosh", "tanh", "asinh", "acosh", "atanh",
  "trim_scale", "bit_count", "normalize",
  "regexp_like", "regexp_count", "regexp_replace", "regexp_split_to_array",
  "array_fill", "array_positions", "trim_array",
  "jsonb_set", "jsonb_insert",
  // ---------------------------------------------------------------------
  // The work-list batch (2026-08-09, docs/builtin-surface-worklist.md). Each
  // name below had EVERY one of its pg_catalog rows in `no-null-found` —
  // claimed nullable with no witness across the corner corpus — and each was
  // then convicted individually on input classes the corpus does not carry.
  // A raise is not a NULL, and these raise freely: `gamma(0)` overflows,
  // `asind(2)` is out of range, `parse_ident('')` rejects the string,
  // `date_bin` rejects a zero stride, `inet_merge` rejects mixed families.
  // The totality probe holds every row of every name from here on.
  // ---------------------------------------------------------------------
  // Math: the degree-argument trig (PG14) and the special functions (PG18).
  "erf", "erfc", "gamma", "lgamma", "cot", "cotd",
  "sind", "cosd", "tand", "asind", "acosd", "atand", "atan2d",
  // String. `regexp_instr` answers 0 for no match and for a subexpression
  // that did not participate — the position where its `regexp_substr`
  // sibling answers NULL, which is why that one is witnessed and not here.
  "parse_ident", "unistr", "casefold", "to_bin", "to_oct", "regexp_instr",
  // Date/time. `timezone` is what `AT TIME ZONE` parses to, and `overlaps`
  // what the OVERLAPS grammar does, so both are ordinary application SQL
  // reaching this dispatch under a name nobody writes. Infinite timestamps
  // and infinite intervals are values through all of them (measured) — the
  // class that removed `extract`/`date_part` does not touch these.
  "timezone", "overlaps", "date_bin", "date_add", "date_subtract",
  // JSON. `json_strip_nulls` is the missing half of `jsonb_strip_nulls`
  // above; `jsonb_set_lax`'s NULL routes are all reached by a NULL
  // `new_value`, which is nullable input and not a totality question.
  "json_object", "jsonb_object", "json_strip_nulls", "jsonb_set_lax",
  // Arrays. An array holding NULL ELEMENTS is still a non-null array, and
  // each of these returns one (`array_to_json(ARRAY[NULL]::int[])` is
  // `[null]`, a JSON value).
  "array_replace", "array_reverse", "array_sort", "array_to_json",
  // Ranges: the predicates, over the empty range and the empty multirange
  // that removed `lower`/`upper`. These read the bound, they do not return
  // it, so the empty range is a `false` rather than a NULL.
  "isempty", "lower_inc", "upper_inc", "lower_inf", "upper_inf", "range_merge",
  // Ranges, constructing. A lower bound above the upper one raises; an
  // empty result is the EMPTY range, which is a value. The multirange
  // constructors are deliberately NOT here — their rows are VARIADIC over a
  // range-array the corpus has no generator for, so the claim would be
  // unprobed on the rows that matter.
  "int4range", "int8range", "numrange", "daterange", "tsrange", "tstzrange",
  "multirange",
  // Network.
  "abbrev", "broadcast", "family", "host", "hostmask", "inet_merge",
  "inet_same_family", "masklen", "netmask", "network", "set_masklen",
  // Bits and bytes — out-of-range indexes raise rather than answering NULL.
  "get_bit", "get_byte", "set_bit", "set_byte",
]);

/**
 * SIGNATURE-keyed strict-total verdicts for rows whose NAME cannot carry
 * the claim — the recovery half of the removals recorded above, and the
 * operator side's `NON_TOTAL_OPERATOR_SIGNATURES` in the other direction.
 * A key is `name(arg,arg)` in format_type renderings, matching the
 * signature capture; the typed dispatch reads it per SURVIVOR, so
 * `lower(<text column>)` claims notNull again while `lower(<range>)` keeps
 * reading nullable — the charter's founding case. Grows only with
 * per-signature evidence (the totality probe holds each entry to
 * execution); the other removed names (`substring`, `to_char`, `extract`,
 * …) wait for the witness corpus to earn theirs.
 */
export const STRICT_TOTAL_BUILTIN_SIGNATURES: ReadonlySet<string> = new Set([
  "lower(text)",
  "upper(text)",
  // The POSITIONAL substring forms (2026-08-09). `substring` left the name
  // table because the FROM-regex spellings — `substring(text,text)` and
  // `substring(text,text,text)` — are NULL on no match, and they are
  // witnessed. The offset/length forms are total for every operand type:
  // an offset past the end gives '', a negative length raises.
  "substring(text,integer)",
  "substring(text,integer,integer)",
  "substring(bytea,integer)",
  "substring(bytea,integer,integer)",
  "substring(bit,integer)",
  "substring(bit,integer,integer)",
  // The NUMERIC to_char forms (2026-08-09) — the recovery the removal note
  // above predicted. `to_char(<datetime>,'')` and `to_char(<interval>,'')`
  // are NULL and witnessed; the number forms answer '' for an empty format
  // and a value for every corner of their input (NaN, ±Infinity, 'RN',
  // 'EEEE'), raising on a malformed pattern rather than answering NULL.
  "to_char(numeric,text)",
  "to_char(integer,text)",
  "to_char(bigint,text)",
  "to_char(double precision,text)",
  "to_char(real,text)",
  // The TIME rows of extract/date_part (2026-08-09). The pair left the name
  // table over the infinities, and its date, timestamp, timestamptz and
  // interval rows are all witnessed — but `time` and `timetz` HAVE no
  // infinity, so every unit those two types accept answers a value and every
  // other unit raises ("unit \"month\" not supported for type time without
  // time zone"). `extract(hour FROM <time column>)` recovers its notNull.
  "date_part(text,time without time zone)",
  "date_part(text,time with time zone)",
  "extract(text,time without time zone)",
  "extract(text,time with time zone)",
]);

/**
 * Nullability of one output column of a set operation.
 *
 * UNION emits rows from both branches, so a column is non-null only if it is
 * non-null on both sides.
 *
 * EXCEPT and INTERSECT are different: every result row is drawn from the LEFT
 * branch (INTERSECT merely requires a match on the right), so the left branch
 * alone settles it. For INTERSECT the right branch can additionally rule NULLs
 * out — a value present in both cannot be NULL if either side says so — hence
 * the OR.
 */
function combineSetOpColumn(left: boolean, right: boolean, op: string | undefined): boolean {
  switch (op) {
    case "SETOP_EXCEPT":
      return left;
    case "SETOP_INTERSECT":
      return left || right;
    default:
      return left && right;
  }
}

/**
 * Whether two column lists carry the same flags. Names are not compared: the
 * two sides of a set operation take their names from the first branch, and a
 * fixpoint is looking for a change in what is guaranteed, not in what it is
 * called.
 */
function sameNullability(a: OutputNullability[], b: OutputNullability[]): boolean {
  return a.length === b.length && a.every((c, i) => c.notNull === b[i]!.notNull);
}

/**
 * Split a comma-separated type list on top-level commas only, so that
 * `numeric(10,2)` inside `TABLE(a numeric(10,2), b text)` stays intact —
 * and so that a QUOTED identifier does too. PostgreSQL renders these names
 * with `quote_ident`, and a quoted one may contain anything: `TABLE("a,b"
 * integer, "c)d" text, "e""f" text)` is a faithful rendering (measured), so
 * commas and brackets inside quotes are text, not structure.
 */
function splitTopLevel(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      // `""` is an escaped quote inside a quoted identifier; skipping the
      // pair leaves the state unchanged either way.
      if (quoted && input[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (quoted) continue;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (ch === "," && depth === 0) {
      out.push(input.slice(start, i));
      start = i + 1;
    }
  }
  out.push(input.slice(start));
  return out;
}

/**
 * Split one `TABLE(…)` part into its column NAME and its type text.
 *
 * The name is an identifier, not "everything up to the first space"
 * (adversarial-3 finding 7): `pg_get_function_result` quotes any name that
 * needs it, so `"my col" integer` split at the first space yielded `"my`,
 * and `"Upper" text` — quoted for its case, with no space inside — kept its
 * quote characters. Both are arity-preserving, which is why only an ordered
 * NAME comparison could see them. Returns null for a part with no type
 * text, which the caller drops as it always has.
 */
function splitColumnDefinition(part: string): { name: string; type: string } | null {
  const s = part.trim();
  if (!s.startsWith('"')) {
    const gap = s.indexOf(" ");
    return gap < 0 ? null : { name: s.slice(0, gap), type: s.slice(gap + 1).trim() };
  }
  let name = "";
  let i = 1;
  for (; i < s.length; i++) {
    if (s[i] !== '"') {
      name += s[i];
      continue;
    }
    if (s[i + 1] === '"') {
      name += '"';
      i++;
      continue;
    }
    i++;
    break;
  }
  const type = s.slice(i).trim();
  return type ? { name, type } : null;
}

/** Shared empty set — most scopes have no grouping-set columns. */
const EMPTY_STRING_SET: ReadonlySet<string> = new Set<string>();

// Moved to operators.ts so mechanism-C attribution can share the strict half
// without an import cycle; see the comment there for why the two properties
// are now two sets.
const TOTAL_OPERATORS = TOTAL_OPERATOR_NAMES;

// The curated AGGREGATE_NAMES table is gone. `pg_proc.prokind = 'a'` was in
// the catalog the whole time, and the table had drifted in three directions
// at once — 12 of PG18's 54 aggregates missing, two names PostgreSQL has no
// function for (`cluster`, `listagg`), and five pure WINDOW functions that no
// consumer can reach. The replacement is
// `CatalogSnapshot.builtinAggregateFunctions`, read through
// `catalog.isAggregateBuiltin`; see that field for why a MISSING name is the
// direction that bites.

// ---------------------------------------------------------------------------
// AST node types (minimal — only fields we access).
// ---------------------------------------------------------------------------

interface RangeVar {
  relname: string;
  schemaname?: string;
  /** true for a plain reference; libpg-query omits the field for ONLY. */
  inh?: boolean;
  alias?: { aliasname: string; colnames?: Node[] };
}

interface RangeSubselect {
  subquery?: Node;
  alias?: { aliasname: string; colnames?: Node[] };
}

interface JoinExpr {
  jointype?: string;
  larg?: Node;
  rarg?: Node;
  quals?: Node;
  /** `USING (a, b)` — the columns to merge. */
  usingClause?: Node[];
  /** `NATURAL` — merge every commonly-named column. */
  isNatural?: boolean;
}

interface RangeTableFunc {
  alias?: { aliasname: string; colnames?: Node[] };
  columns?: Node[];
}

interface JsonTable {
  alias?: { aliasname: string; colnames?: Node[] };
  columns?: Node[];
}

interface RangeFunction {
  alias?: { aliasname: string; colnames?: Node[] };
  functions?: Node[];
  /** `WITH ORDINALITY` — appends a bigint counter column. */
  ordinality?: boolean;
  /** `ROWS FROM (f(), g())` — several functions side by side. */
  is_rowsfrom?: boolean;
  /** Lone-function column definition list (`AS z(a integer, b text)`). */
  coldeflist?: Node[];
}

interface SelectStmt {
  withClause?: WithClause;
  fromClause?: Node[];
  targetList?: Node[];
  whereClause?: Node;
  groupClause?: Node[];
  groupDistinct?: boolean;
  havingClause?: Node;
  sortClause?: Node[];
  distinctClause?: Node[];
  windowClause?: Node[];
  lockingClause?: Node[];
  larg?: SelectStmt;
  rarg?: SelectStmt;
  valuesLists?: Node[];
  op?: string;
  limitCount?: Node;
  limitOffset?: Node;
  limitOption?: string;
}

interface InsertStmt {
  withClause?: WithClause;
  relation?: Node;
  cols?: Node[];
  selectStmt?: Node;
  returningClause?: Node;
  /** `ON CONFLICT ...` — DO NOTHING can suppress the row entirely. */
  onConflictClause?: Node;
}

interface UpdateStmt {
  withClause?: WithClause;
  relation?: Node;
  targetList?: Node[];
  fromClause?: Node[];
  whereClause?: Node;
  returningClause?: Node;
}

interface DeleteStmt {
  withClause?: WithClause;
  relation?: Node;
  relations?: Node[];
  usingClause?: Node[];
  whereClause?: Node;
  returningClause?: Node;
}

interface MergeStmt {
  withClause?: WithClause;
  relation?: Node;
  sourceRelation?: Node;
  joinCondition?: Node;
  mergeWhenClauses?: Node[];
  returningClause?: Node;
}

interface WithClause {
  ctes: Node[];
}

interface ColumnRef {
  fields: Node[];
}

interface AExpr {
  kind?: string;
  name?: Node[];
  lexpr?: Node;
  rexpr?: Node;
}

interface FuncCall {
  funcname: Node[];
  args?: Node[];
  agg_star?: boolean;
  agg_distinct?: boolean;
  /** `FILTER (WHERE ...)` — can exclude every row of a group. */
  agg_filter?: Node;
  over?: Node;
  /** `f(VARIADIC arr)` — the variadic parameter passed as ONE array. */
  func_variadic?: boolean;
  /** `agg(x) WITHIN GROUP (ORDER BY y)` — the ordered-set spelling, whose
   *  direct and aggregated arguments do not line up positionally with the
   *  signature's own list. */
  agg_within_group?: boolean;
  /** The ORDER BY inside an aggregate call, present for the same reason. */
  agg_order?: Node[];
}

interface SubLink {
  subLinkType?: string;
  subselect?: Node;
  testexpr?: Node;
}
