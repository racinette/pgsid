import type { Node } from "libpg-query";
import type { FunctionInfo } from "../catalog/types.js";
import { splitQualifiedName } from "../catalog/qualified-name.js";
import {
  checkConstraintsProveNotNull,
  checkConstraintsProveNull,
  checkConstraintsRefuteGuard,
  comparisonKey,
  type Lit,
} from "./check-entailment.js";
import {
  collectComparisonQuestions,
  evaluateComparisonQuestions,
} from "./comparison-groundings.js";
import {
  evaluateClosedSubtrees,
  type Evaluate,
  type EvalResult,
  type SubtreeEvaluationCatalog,
} from "./subtree-evaluator.js";
import { writtenGuardTruths } from "./written-value-guards.js";
import { TOTAL_OPERATORS as TOTAL_OPERATOR_NAMES, STRICT_OPERATORS } from "./operators.js";
import {
  collectParamFacts,
  forcedNullParams,
  returningRejectedParams,
  type MechanismEClaims,
  type ParamNullability,
} from "./param-nullability.js";
import {
  evaluateGroundedChecks,
  groundEnforcedChecks,
  groundedCheckClaims,
} from "./check-grounder.js";
import type {
  ColumnOrigin,
  NullabilityCatalog,
  OutputNullability,
  OutputNullabilityTraced,
  OutputPresenceGroup,
  JoinAudit,
  TypeSetAudit,
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

/**
 * The walk's optional inputs. `paramTypes` is tier 0 (see the engine field's
 * doc); `evaluate` switches on the STATEMENT MAP consumer
 * (docs/subtree-evaluation.md, consumer 1): the statement's maximal closed
 * subtrees run through PostgreSQL before the walk starts, and the walk
 * consults the answers as data — the engine itself stays synchronous. No
 * `evaluate` → no evaluation claims, everything else identical. Passing it
 * requires a catalog built by the adapter, which carries the
 * `SubtreeEvaluationCatalog` face beside the walk's own.
 */
export interface WalkOptions {
  paramTypes?: readonly string[];
  evaluate?: Evaluate;
  /**
   * Test-side sink for the presence fixpoint's per-join verdicts (see
   * `JoinAudit` in types.ts). When present, every analyzed scope appends one
   * record per outer join as `resolveJoinImplications` concludes. Read by the
   * EXPLAIN oracle; absent in production use, and never affects the walk.
   */
  joinAudit?: JoinAudit[];
  /**
   * Test-side flag: attach `unitCrossings` to bare pass-through claims (see
   * `OutputNullability.unitCrossings`). Read by the EXPLAIN oracle; off in
   * production, where claims never carry the field.
   */
  collectUnitCrossings?: boolean;
  /**
   * Test-side sink for every operand TYPE SET the walk reads (see
   * `TypeSetAudit` in types.ts). Read by the type-union oracle, which asks
   * PostgreSQL what each recorded expression really resolves to and holds
   * the containment invariant. Absent in production, and never affects the
   * walk.
   */
  typeSetAudit?: TypeSetAudit[];
}

/** The pre-walk evaluation round: one async step, answers in, sync walk. */
async function statementEvaluation(
  stmt: Node,
  catalog: NullabilityCatalog,
  evaluate: Evaluate | undefined,
): Promise<Map<Node, EvalResult> | undefined> {
  if (!evaluate) return undefined;
  // Every adapter product carries the face (WalkOptions documents the
  // requirement); a catalog without it belongs to a caller that never
  // passes `evaluate`.
  const face = catalog as NullabilityCatalog & SubtreeEvaluationCatalog;
  const map = await evaluateClosedSubtrees(stmt, face, evaluate);
  // Written-value guards (written-value-guards.ts) answer the same question
  // for trees the scope-blind collector must call open — a RETURNING CASE
  // guard over a column the statement WROTE as a constant. Keyed by the
  // original guard node, so they merge here and `evaluatedGuardTruth` reads
  // one map without knowing which pass filled the entry.
  for (const [node, result] of await writtenGuardTruths(stmt, face, evaluate)) {
    if (!map.has(node)) map.set(node, result);
  }
  return map;
}

/** The entailment consumer's pre-walk round (comparison-groundings.ts):
 *  same shape as `statementEvaluation`, one async step, answers as data. */
async function comparisonGroundings(
  stmt: Node,
  catalog: NullabilityCatalog,
  evaluate: Evaluate | undefined,
): Promise<ReadonlyMap<string, boolean> | undefined> {
  if (!evaluate) return undefined;
  const face = catalog as NullabilityCatalog & SubtreeEvaluationCatalog;
  const questions = await collectComparisonQuestions(stmt, face);
  if (questions.length === 0) return undefined;
  return evaluateComparisonQuestions(questions, face, evaluate);
}

export async function inferNullability(
  stmt: Node,
  catalog: NullabilityCatalog,
  options?: WalkOptions,
): Promise<OutputNullability[]> {
  const evaluation = await statementEvaluation(stmt, catalog, options?.evaluate);
  const comparisons = await comparisonGroundings(stmt, catalog, options?.evaluate);
  const engine = new NullabilityEngine(
    catalog,
    false,
    undefined,
    options?.paramTypes,
    evaluation,
    comparisons,
  );
  if (options?.joinAudit) engine.joinAuditSink = options.joinAudit;
  if (options?.collectUnitCrossings) engine.collectUnitCrossings = true;
  if (options?.typeSetAudit) engine.typeSetAuditSink = options.typeSetAudit;
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
  /**
   * The statement rejects on EVERY execution: an enforced CHECK grounds
   * FALSE over values the statement writes unconditionally, with nothing
   * left in the predicate that a binding could change
   * (docs/argument-nullability.md, "The always-raises statement fact").
   * Claimed only for UNIVERSAL write events — a VALUES row or a FROM-less
   * `INSERT ... SELECT`, which every execution constructs; an UPDATE, a
   * MERGE arm and an ON CONFLICT update arm raise only when a row matches,
   * which is a weaker fact this flag does not carry. False is the
   * no-information answer, as everywhere else in the contract: it does not
   * promise the statement succeeds.
   *
   * Parameter claims under the flag are vacuous and stay absorbed — the
   * flag is what explains a contract that would otherwise just be blank.
   */
  alwaysRaises: boolean;
}

/**
 * The full contract of one statement, from one call over one AST — the two
 * arrays can never describe different statements. Throws
 * `UnsupportedNodeError` exactly when `inferNullability` does; the parameter
 * side alone is total, and available separately via
 * `collectParamNullability` for callers that handle refused statements.
 */
export async function inferQueryContract(
  stmt: Node,
  catalog: NullabilityCatalog,
  options?: WalkOptions,
): Promise<QueryContract> {
  const evaluation = await statementEvaluation(stmt, catalog, options?.evaluate);
  // The CHECK grounder (Mechanism E, docs/argument-nullability.md): the
  // same pre-walk async step over synthesized trees, answers consumed by
  // the collector as data. Same catalog-face requirement as `evaluate`
  // documents; no evaluator → no E claims, everything else identical.
  let mechanismE: MechanismEClaims | undefined;
  if (options?.evaluate) {
    const grounderCatalog = catalog as NullabilityCatalog & SubtreeEvaluationCatalog;
    const grounded = await groundEnforcedChecks(stmt, grounderCatalog);
    if (grounded.length > 0) {
      const answers = await evaluateGroundedChecks(grounded, grounderCatalog, options.evaluate);
      mechanismE = groundedCheckClaims(grounded, answers, catalog);
    }
  }
  const facts = collectParamFacts(stmt, catalog, mechanismE);
  const comparisons = await comparisonGroundings(stmt, catalog, options?.evaluate);
  const engine = new NullabilityEngine(
    catalog,
    false,
    undefined,
    options?.paramTypes,
    evaluation,
    comparisons,
  );
  return {
    outputs: engine.run(stmt),
    params: facts.params,
    paramRejectionSets: facts.rejectionSets,
    outputPresenceGroups: engine.presenceGroups(),
    alwaysRaises: mechanismE?.alwaysRaises ?? false,
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
export async function inferNullabilityTraced(
  stmt: Node,
  catalog: NullabilityCatalog,
  onUnhandled?: UnhandledNodeObserver,
  options?: WalkOptions,
): Promise<OutputNullabilityTraced[]> {
  const evaluation = await statementEvaluation(stmt, catalog, options?.evaluate);
  const comparisons = await comparisonGroundings(stmt, catalog, options?.evaluate);
  const engine = new NullabilityEngine(
    catalog,
    true,
    onUnhandled,
    options?.paramTypes,
    evaluation,
    comparisons,
  );
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
// How many rows a lockstep participant emits — `ROWS FROM` arms and
// target-list SRFs, which expand together and NULL-pad the shorter ones. Only
// what is proved: `UNBOUNDED_ROWS` is the answer for everything the walk
// cannot count, and it both fails to survive and pads everyone else.
// ---------------------------------------------------------------------------

interface RowBounds {
  min: number;
  max: number;
}

const UNBOUNDED_ROWS: RowBounds = { min: 0, max: Infinity };

/**
 * A relation proven to hold a row for a key — see `Scope.rowWitnesses`.
 *
 * The relation is identified AS WRITTEN, by the schema qualifier and name a
 * `RangeVar` carries, and a consumer must match both. That is deliberately
 * syntactic: the same spelling in one statement resolves to the same relation
 * whether it names a CTE or a table, and resolving it further would mean
 * deciding which, at a point where being wrong is unsound rather than
 * conservative.
 */
interface RowWitness {
  schema: string | undefined;
  relation: string;
  /** The witnessed relation's own column that the restriction keys on. */
  column: string;
  /** The outer column the restriction equates it to. */
  outerAlias: string;
  outerColumn: string;
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
  /**
   * Output positions belonging to a `ROWS FROM` arm the lockstep padding
   * reaches. Filled beside `functionColumns`, and read by the presence
   * grouping: a padded arm's columns go NULL while the ITEM is present, so
   * they are not members of the item's presence unit.
   */
  paddedFunctionColumns?: Set<number>;
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
 * What resolving a bare pass-through's provenance yields: the entailment
 * origins (table-anchored; absent where the chain crosses something no
 * catalog names), per-branch settledness, and the diagnostic `crossings`
 * channel (`OutputNullability.unitCrossings`) — units without the anchor,
 * present only under `WalkOptions.collectUnitCrossings`.
 */
interface OriginResolution {
  origins?: (ColumnOrigin | null)[];
  settled?: boolean[];
  crossings?: { depth: number; unit: number }[];
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
  /**
   * The JoinExpr AST node this predicate was built from — the join's stable
   * identity across fixpoint re-runs and scope rebuilds (DML channels,
   * set-operation branch re-analysis allocate fresh JoinPredicates and fresh
   * group ids for the same syntactic join). Only the joinAudit readout keys
   * on it; the walk itself never reads it.
   */
  node?: object;
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
   * Relations proven to HOLD A ROW for a key, on every row this scope emits.
   *
   * The sibling of `impliedQuals`, and separate from it because the fact has a
   * different shape: `impliedQuals` carries PREDICATES, which eight consumers
   * read as WHERE conjuncts, and this carries an EXISTENCE claim about a
   * relation, which is not a predicate over any output column and would mean
   * nothing to those readers.
   *
   * A FROM item whose emptiness removes the outer row is what produces one: if
   * the item scans `S WHERE S.k = X.c` and the row survived, then `S` has a
   * row with that key. What a consumer does with it is its own business —
   * today one reads it, to prove that a LEFT JOIN onto a relation GROUPED by
   * `k` cannot have been extended.
   *
   * Written by the FROM walk, never by the presence fixpoint, which is why
   * `withSpeculativeScope` does not restore it: it has no speculative part.
   */
  rowWitnesses: RowWitness[];
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
  /**
   * The mirror of `dmlWrittenColumns`: per target column, whether the value
   * actually written is provably NULL on every path that can produce a
   * returned row. Kept as a second map rather than a third state in the
   * first, because the two are read by different questions and a column is
   * in neither map far more often than it is in either.
   */
  dmlWrittenNullColumns?: { alias: string; columns: ReadonlyMap<string, boolean> };
  /**
   * Parameters whose NULL binding raises on every path that can return a row
   * of THIS statement (`returningRejectedParams`), so a projected `$n` here
   * is non-null on every row that comes back.
   *
   * Scoped rather than engine-global, and that is what makes it sound where
   * a flat `rejected` set is not: in `WITH w AS (INSERT … RETURNING e)
   * SELECT $1 FROM t` the outer `$1` sits in the SELECT's scope, which has
   * no such set, and the INSERT's rejection says nothing about it. The
   * engine-global `bindRejectedParams` needs no scoping because Bind rejects
   * before any execution, everywhere in the statement.
   */
  dmlReturningRejectedParams?: ReadonlySet<number>;
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
  /**
   * The DECLARED type of each positional parameter, from the function's own
   * signature. Inside a body, `$n` names the function's parameter and not the
   * statement's, so this is the only correct source for its type — and it is
   * what lets a builtin CALL in the body narrow its signature, which is the
   * difference between `SELECT $1 || ' ' || $2` (the operator path decides
   * without types) and `SELECT UPPER($1)` (the dispatch needs one).
   * docs/function-overload-merge.md, "The second site the types never reach".
   */
  argTypes: (string | undefined)[];
  /**
   * The NAMES of those same positional parameters, so a body that references
   * one by name reaches `argTypes` the way `$n` does. Input parameters only,
   * and that is the whole point of keeping it here rather than reusing
   * `fnParamNames`: that list spans every mode, so an interleaved OUT
   * parameter shifts its indices out of line with `argTypes` and
   * `argResults`, both of which are input-positional.
   */
  argNames: (string | undefined)[];
}

// ---------------------------------------------------------------------------
// The engine. Encapsulates the catalog and memoization caches.
// ---------------------------------------------------------------------------

class NullabilityEngine {
  /**
   * Test-side sink for per-join fixpoint verdicts (`WalkOptions.joinAudit`).
   * Written once per analyzed scope at the end of `resolveJoinImplications`;
   * null in production use. Never read by the walk itself.
   */
  joinAuditSink: JoinAudit[] | null = null;
  /** Test-side flag (`WalkOptions.collectUnitCrossings`); see types.ts. */
  collectUnitCrossings = false;
  /**
   * Test-side sink for operand type-set readings (`WalkOptions.typeSetAudit`).
   * Appended by `operandTypeSet` at every nesting level; null in production
   * use. Never read by the walk itself.
   */
  typeSetAuditSink: TypeSetAudit[] | null = null;
  /** Audit dedup: one record per syntactic join, keyed on its JoinExpr node. */
  private joinAuditSeen = new WeakMap<object, JoinAudit>();
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
  /**
   * Whether a speculative presence fixpoint is running right now
   * (`withSpeculativeScope`). Two readers: the join audit skips recording a
   * branch-local verdict, and `guardedPresence` refuses to nest — the
   * fixpoint's own helpers can reach back into the walk, and a second
   * speculation layered on the first would restore into already-widened
   * state rather than the real one.
   */
  private speculating = false;
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

  /**
   * The statement map (docs/subtree-evaluation.md, consumer 1): each maximal
   * closed subtree's PostgreSQL answer, keyed by node identity over the
   * statement's own AST — computed by the async entry point, consumed here
   * as data. The consumption rule allows exactly two readings: `isNull`
   * (a non-null answer claims the subtree notNull) and boolean truth (a
   * guard's answer prunes CASE arms). Values never cross into typed
   * contexts — that path belongs to the CHECK grounder's declared-type
   * casts. Undefined when no `evaluate` was passed: no evaluation claims,
   * everything else identical.
   */
  private readonly evaluation: ReadonlyMap<Node, EvalResult> | undefined;

  /**
   * The entailment consumer's answers (comparison-groundings.ts): the
   * truth of `litA OP litB` at a declared column type, keyed by
   * `comparisonKey`. Consumed only through the kernel's atom oracle;
   * undefined without `evaluate`, and the kernel then answers exactly as
   * before.
   */
  private readonly comparisons: ReadonlyMap<string, boolean> | undefined;

  constructor(
    catalog: NullabilityCatalog,
    tracing = false,
    onUnhandled?: UnhandledNodeObserver,
    paramTypes?: readonly string[],
    evaluation?: ReadonlyMap<Node, EvalResult>,
    comparisons?: ReadonlyMap<string, boolean>,
  ) {
    this.catalog = catalog;
    this.tracing = tracing;
    this.onUnhandled = onUnhandled;
    this.paramTypes = paramTypes;
    this.evaluation = evaluation;
    this.comparisons = comparisons;
  }

  /** The kernel-facing reading of `comparisons`, or undefined without it. */
  private comparisonOracle():
    | ((colType: string, a: Lit, op: string, b: Lit) => boolean | null)
    | undefined {
    const map = this.comparisons;
    if (!map) return undefined;
    return (colType, a, op, b) => map.get(comparisonKey(colType, a, op, b)) ?? null;
  }

  /**
   * The oracle's collation trichotomy over a catalog column: non-collatable
   * transfers every canonical op, a deterministic collation transfers
   * equality only (byte-equality semantics shared with the analysis
   * session's default), nondeterministic transfers nothing. Consults the
   * evaluation face; a catalog without it answers false for everything.
   */
  private comparisonOpEvaluable(
    schema: string,
    table: string,
    column: string,
    op: string,
  ): boolean {
    const face = this.catalog as NullabilityCatalog & Partial<SubtreeEvaluationCatalog>;
    if (typeof face.resolveColumnCollationDeterministic !== "function") return false;
    const det = face.resolveColumnCollationDeterministic(schema, table, column);
    if (det === null) return true;
    // The IDENTITY arm: a default-collated column's comparisons run under
    // the very collation the analysis session evaluates with, so every
    // canonical op transfers — determinism regardless. Explicit COLLATE
    // keeps the deterministic-equality-only arm.
    if (face.resolveColumnCollationIsDefault?.(schema, table, column) === true) return true;
    return det === true && (op === "=" || op === "<>");
  }

  /** The interval rung's shape supplies, absent on a face-less catalog. */
  private btreeStrategySupply(): ((op: string) => number | null) | undefined {
    const face = this.catalog as NullabilityCatalog & Partial<SubtreeEvaluationCatalog>;
    const fn = face.btreeStrategyOf;
    return typeof fn === "function" ? op => fn(op) : undefined;
  }

  private equalityComplementSupply(): ((op: string) => boolean) | undefined {
    const face = this.catalog as NullabilityCatalog & Partial<SubtreeEvaluationCatalog>;
    const fn = face.isEqualityComplement;
    return typeof fn === "function" ? op => fn(op) : undefined;
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
   * no per-call reasoning survives it — EXCEPT on an entry the padding cannot
   * reach, which is one whose own row count covers every other entry's
   * maximum (`unpaddedParticipants`). Null when fewer than two SRFs — a
   * single SRF has nothing to pad against and keeps its precision.
   *
   * An entry carrying NO set-returning call REPEATS rather than pads
   * (measured) and takes no part in the comparison at all: it is neither
   * padded nor a source of rows anyone else is padded against.
   */
  private srfPaddedTargets(targetList: Node[], depth: number): boolean[] | null {
    const calls = targetList.map(t => {
      const val = this.unwrapResTarget(t).val;
      return val ? this.setReturningCallsIn(val) : [];
    });
    const total = calls.reduce((a, c) => a + c.length, 0);
    if (total < 2) return null;
    // Two SRFs in ONE entry (`f(generate_series(...))`) expand against each
    // other inside it, and no bound here describes the result — unknown, which
    // pads the entry and every other entry alike, the answer this rule gave
    // everywhere before there were bounds at all.
    const bounds = calls.map(c =>
      c.length === 0 ? null : c.length === 1 ? this.armRowBounds(c[0]!, depth) : UNBOUNDED_ROWS,
    );
    const unpadded = this.unpaddedParticipants(bounds);
    return calls.map((c, i) => c.length > 0 && !unpadded[i]);
  }

  /**
   * Set-returning FuncCalls under `node`, SubLink subtrees excluded — an
   * SRF inside a subquery expands in that query's own projection and takes
   * no part in this list's lockstep.
   */
  private setReturningCallsIn(node: Node): FuncCall[] {
    const rec = node as Record<string, unknown>;
    if ("SubLink" in rec) return [];
    const found: FuncCall[] = [];
    if ("FuncCall" in rec) {
      const fc = rec["FuncCall"] as FuncCall;
      if (!fc.over && this.isSetReturningCall(fc)) found.push(fc);
    }
    for (const value of Object.values(rec)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v && typeof v === "object") found.push(...this.setReturningCallsIn(v as Node));
        }
      } else if (value && typeof value === "object") {
        found.push(...this.setReturningCallsIn(value as Node));
      }
    }
    return found;
  }

  /**
   * Which lockstep participants the padding CANNOT reach.
   *
   * The expansion runs to the LONGEST participant's row count and pads every
   * shorter one after it has returned, so a participant is never padded when
   * its own row count is at least every other one's maximum. `null` marks a
   * non-participant — it neither pads nor is padded, and is left out of the
   * comparison in both directions.
   *
   * A lone participant falls out of the same arithmetic rather than needing
   * its own rule: with no others, the maximum to cover is zero.
   */
  private unpaddedParticipants(bounds: (RowBounds | null)[]): boolean[] {
    return bounds.map((b, i) => {
      if (!b) return true;
      let othersMax = 0;
      for (let j = 0; j < bounds.length; j++) {
        const other = bounds[j];
        if (j !== i && other) othersMax = Math.max(othersMax, other.max);
      }
      return b.min >= othersMax;
    });
  }

  /**
   * How many rows one lockstep participant emits — a `ROWS FROM` arm, or a
   * target-list entry's set-returning call. Only what can be PROVED: the
   * default is "none guaranteed, no ceiling", which pads everything, as the
   * rule did uniformly before.
   *
   * Three readings, and the asymmetry between them is the whole point — a
   * participant survives on its MINIMUM and pads others on their MAXIMUM.
   *
   *   - A call that returns ONE VALUE contributes exactly ONE ROW. That
   *     includes a strict function handed NULL, which still emits its row,
   *     of NULLs (measured — it is why the strict short-circuit exists).
   *   - `generate_series` over constant integer bounds emits exactly
   *     `hi - lo + 1` rows, and NONE when the range runs backwards. Both
   *     halves are needed: the count is this rule's only source of a minimum
   *     above one.
   *   - A SETOF function whose body provably yields a single row emits AT
   *     MOST one — and possibly none, because a STRICT one handed NULL never
   *     runs its body at all. `guaranteesSingleRow` is the same predicate the
   *     scalar-sublink path uses, asked of the body rather than the subquery.
   */
  private armRowBounds(fc: FuncCall, depth: number): RowBounds {
    if (!this.isSetReturningCall(fc)) return { min: 1, max: 1 };

    const name = this.funcName(fc);
    const schema = this.funcSchema(fc);
    const meta = this.catalog.resolveFunctionMetadata(schema, name);
    if (meta) {
      if (!this.sqlBodyGuaranteesSingleRow(meta, depth)) return UNBOUNDED_ROWS;
      // The body runs on every call unless STRICTNESS can stop it, and it can
      // only stop it through an argument — so a strict call with arguments is
      // the one shape whose minimum stays zero. Nothing here reads the
      // arguments themselves; a strict call whose arguments are all provably
      // non-null does run, and would raise the minimum to one, but no bound in
      // this rule needs it yet.
      const canBeSkipped = meta.strict && meta.args.length > 0;
      return { min: canBeSkipped ? 0 : 1, max: 1 };
    }
    // No user metadata: an OVERLOADED user name, or a builtin.
    //
    // An overloaded name is answered by CONSENSUS over its candidates — the
    // same quantifier the shape and flag rules take, and for the same reason:
    // whichever overload PostgreSQL picks, a bound every candidate satisfies
    // holds. It is a question the body map could not be asked until it was
    // keyed by SIGNATURE (2026-08-22); under the name key an overloaded name's
    // bodies collided, and one candidate's body would have answered for all of
    // them. srf-padding-overloaded-user-fn.sql is the claim, and
    // body-shape-overload-collision.sql the neighbouring shape that must not
    // move — consensus over the candidates is not the same permission as
    // reading ONE candidate's body for its flags.
    const candidates = this.catalog.resolveFunctionShapes(schema, name);
    if (candidates.length > 0) {
      if (!candidates.every(c => this.sqlBodyGuaranteesSingleRow(c, depth))) return UNBOUNDED_ROWS;
      const canBeSkipped = candidates.some(c => c.strict && c.args.length > 0);
      return { min: canBeSkipped ? 0 : 1, max: 1 };
    }
    // The series count is a pg_catalog fact and must not be read off a name
    // the user catalog claims — the same precedence
    // `resolveBuiltinFunctionShape` sits behind one branch over, which the
    // empty candidate list above has already established.
    const series = this.constantSeriesLength(fc, name, schema);
    return series === null ? UNBOUNDED_ROWS : { min: series, max: series };
  }

  /**
   * `generate_series(lo, hi)` over constant integers — the two-argument form
   * only, whose step is 1. A three-argument call carries its own step and a
   * backwards one is legal, so the count is not this expression; the other
   * overloads (numeric, timestamp) are not integer arithmetic at all.
   */
  private constantSeriesLength(
    fc: FuncCall,
    name: string,
    schema: string | undefined,
  ): number | null {
    if (name !== "generate_series") return null;
    if (schema !== undefined && schema !== "pg_catalog") return null;
    const args = fc.args ?? [];
    if (args.length !== 2) return null;
    const lo = this.constantIntegerValue(args[0]!);
    const hi = this.constantIntegerValue(args[1]!);
    if (lo === null || hi === null) return null;
    return Math.max(0, hi - lo + 1);
  }

  /**
   * An `A_Const` integer literal's value. Zero renders as an EMPTY `ival`
   * object rather than `{ival: 0}` (the parser's own encoding), so presence of
   * the key is the test and the value defaults to zero.
   */
  private constantIntegerValue(node: Node): number | null {
    const ac = (node as Record<string, unknown>)["A_Const"] as
      | { ival?: { ival?: number }; isnull?: boolean }
      | undefined;
    if (!ac || ac.isnull || !("ival" in ac)) return null;
    return ac.ival?.ival ?? 0;
  }

  /**
   * Whether a `LANGUAGE sql` function's body provably yields exactly one row.
   * Shape only — no target analysis, so no recursion into the body's own
   * expressions and no `fnCtx` to establish.
   */
  private sqlBodyGuaranteesSingleRow(meta: FunctionInfo, depth: number): boolean {
    if (meta.language !== "sql" || meta.isAggregate) return false;
    this.checkDepth(depth);
    const bodyAst = this.catalog.fnBodyAsts.get(`${meta.schema}.${meta.name}(${meta.argTypes})`);
    const node = bodyAst as Record<string, unknown> | undefined;
    if (!node || !("SelectStmt" in node)) return false;
    return this.guaranteesSingleRow(node["SelectStmt"] as SelectStmt);
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
  /**
   * The relation whose PRESENCE decides a producer's column — the producer
   * itself for everything except an `unnest` of an array constructor, whose
   * field is the element expression and is therefore NULL exactly when that
   * expression's relation is absent.
   *
   * A separate reading from the producer's own, and deliberately so. The
   * producer list has two consumers with different semantics: origins claim
   * "this column IS that table column of that row", which a CAST breaks,
   * and groups claim "these columns are NULL together", which a cast
   * preserves exactly — a cast of NULL is NULL and a cast of a value is a
   * value. So this redirect peels casts and `resolveBareColumnTarget`, which
   * origins go through, must not.
   *
   * That difference is the whole reason the generated corpus's unnest
   * structures stayed dark. `unnest(ARRAY[ROW(u.val::text, u.email)::pair])`
   * beside a LEFT-joined `u` puts `p` and `q` in u's null group — an absent
   * `u` makes the ROW `(NULL, NULL)`, which unnest emits as one row with
   * both fields NULL — but `p` carries a cast, so no origin could tie the
   * two fields together and the refilter's pin on `p` said nothing about
   * `q`. As a presence producer the cast is simply not there.
   *
   * Three conditions, each load-bearing:
   *
   *   - The item must not itself be OPTIONAL. A null-extended unnest makes
   *     its fields NULL while the source relation is present, which breaks
   *     the group's "a discriminant is NULL exactly when the unit is absent"
   *     in the direction that matters.
   *   - Every element must name the SAME (relation, column). With elements
   *     drawn from different relations the field alternates between them row
   *     by row, and no single relation's absence explains its NULLs.
   *   - The element must be a bare column under casts. An arithmetic
   *     expression can be NULL with its relation present.
   */
  private presenceProducer(
    p: { entry: RelationEntry; column: string; ordinal?: number } | null,
    scope: Scope,
    depth: number,
  ): { entry: RelationEntry; column: string; ordinal?: number } | null {
    if (!p || p.entry.kind !== "function") return p;
    const index =
      p.ordinal ??
      this.resolveTableFunctionColumns(p.entry, scope, depth).findIndex(c => c.name === p.column);
    // A PADDED `ROWS FROM` arm's columns go NULL while the ITEM is present, so
    // they are no part of the item's presence unit — the same break the
    // OPTIONAL condition below guards against, arriving one clause in rather
    // than through the join. rowsfrom-pad-presence-group.sql is where it
    // showed: once a longer arm keeps its flags the arm becomes a
    // DISCRIMINANT, and a unit spanning both arms then reads "present" on the
    // very rows the padding has emptied.
    if (index >= 0 && p.entry.paddedFunctionColumns?.has(index)) return null;
    if (p.entry.joinState === OPTIONAL) return p;
    if (index < 0) return p;
    const exprs = this.unnestColumnExpressions(p.entry, index, scope, depth);
    if (!exprs || exprs.length === 0) return p;
    let target: { entry: RelationEntry; column: string } | null = null;
    for (const e of exprs) {
      const bare = this.resolveBareColumnTarget(this.stripCasts(e), scope);
      if (!bare) return p;
      if (!target) target = bare;
      else if (target.entry !== bare.entry || target.column !== bare.column) return p;
    }
    return target ?? p;
  }

  /**
   * Whether `$num` is rejected on every row-producing path of the DML
   * statement this scope sits INSIDE — its own, or any scope enclosing it.
   *
   * The chain walk is what reaches a MERGE source. `RETURNING s.snm` is not
   * a ParamRef at all: `s` is a derived relation, and `$1` is walked in the
   * source subquery's own scope, whose outer is the MERGE's. The same is
   * true of a scalar subquery written into a RETURNING list.
   *
   * Sound in that direction and not the other, which is the whole reason the
   * fact is scoped rather than engine-global. Every expression evaluated
   * inside a DML statement's scope contributes to a RETURNING column, and a
   * RETURNING column exists only on a row that came back — so the row is the
   * proof. A statement ENCLOSING the DML is the opposite arrangement:
   * `WITH w AS (INSERT … RETURNING e) SELECT $1 FROM t` puts the SELECT
   * outside, its rows do not depend on the insert's, and the chain from its
   * `$1` never reaches the INSERT's scope. Measured, both directions.
   */
  private returningRejectsParam(num: number, scope: Scope): boolean {
    for (let s: Scope | null = scope; s; s = s.outer) {
      if (s.dmlReturningRejectedParams?.has(num)) return true;
    }
    return false;
  }

  /**
   * A STRICT set-returning function in FROM filters its own arguments: a
   * NULL argument means PostgreSQL never calls it, the call yields ZERO
   * ROWS, and an inner join drops the row that supplied the NULL. So every
   * row the scope emits had every argument non-null — the same shape as a
   * WHERE conjunct, and recorded as one so every existing consumer picks it
   * up unchanged (column guarantees, alias promotion, the presence fixpoint,
   * parameter narrowing, and their `rowsImplyWhere` gating with them).
   *
   * `FROM h, unnest(h.pairs) p` is the shape this closes, and the projected
   * `h.pairs` is what it settles: the walk called it nullable from the
   * catalog while no returned row could carry the NULL. Seven fixtures
   * recorded that as unwitnessable.
   *
   * Four gates, three of them measured counterexamples rather than caution:
   *
   *   NOT OPTIONAL — `h LEFT JOIN LATERAL unnest(h.pairs) p ON true` keeps
   *     the row with `pairs` NULL and the function's columns extended.
   *   ONE ARM — `ROWS FROM (unnest(h.a), unnest(h.b))` pads the arm that
   *     returned nothing, so the other arm's rows survive with `a` NULL.
   *   NOT THE ZIP FORM — `unnest(h.a, h.b)` is one call over several arrays
   *     and pads the same way, for the same reason.
   *   STRICT and SET-RETURNING — a strict SCALAR function in FROM returns
   *     ONE row of NULL rather than none (`FROM h, upper(h.x) s` keeps
   *     every h), and a non-strict SRF is called with the NULL and may
   *     return whatever it likes (measured: a `LANGUAGE sql` SETOF function
   *     without STRICT returns its row). Strictness is enforced by the
   *     executor, so `sql` and `plpgsql` bodies behave alike — both
   *     measured.
   */
  private recordStrictSrfImplications(
    rf: RangeFunction,
    joinState: JoinState,
    scope: Scope,
  ): void {
    if (joinState === OPTIONAL) return;
    const arms = rf.functions ?? [];
    if (arms.length !== 1) return;
    const list = (arms[0] as Record<string, unknown>)["List"] as { items?: Node[] } | undefined;
    const fc = (list?.items?.[0] as Record<string, unknown> | undefined)?.["FuncCall"] as
      | FuncCall
      | undefined;
    const args = fc?.args ?? [];
    if (!fc || args.length === 0) return;
    const name = this.funcName(fc);
    if (name === "unnest" && args.length > 1) return;
    const meta = this.catalog.resolveFunctionMetadata(this.funcSchema(fc), name);
    const strictSrf = meta
      ? meta.strict && meta.returnsSet && !meta.isAggregate
      : // A pg_catalog name the user catalog does not carry. Both faces
        // quantify over the name's overloads, so neither can be satisfied by
        // an overload PostgreSQL would not pick — `isStrictBuiltin` demands
        // every overload strict, and no pg_catalog name mixes set-returning
        // with scalar overloads (measured, and gated in builtin-surface).
        this.catalog.isStrictBuiltin(name) && this.catalog.isSetReturningBuiltin(name);
    if (!strictSrf) return;

    for (const arg of args) {
      scope.impliedQuals.push({
        NullTest: { arg, nulltesttype: "IS_NOT_NULL" },
      } as unknown as Node);
    }
  }

  /**
   * Record that a subquery FROM item's survival proves its source relation
   * holds a row for a key — see `Scope.rowWitnesses`.
   *
   * The premise is the join, not the subquery: an item joined so that its
   * EMPTINESS REMOVES THE OUTER ROW turns "this row exists" into "the scan
   * found something". A LEFT JOIN LATERAL keeps the outer row with the item
   * NULL-extended and proves nothing, which is why an OPTIONAL item is
   * refused first and is the gate with a control of its own.
   *
   * What is needed of the subquery is ONE-DIRECTIONAL, and getting the
   * direction right removes most of the gates a first reading wants. The claim
   * is only `item non-empty ⟹ S holds a matching row`. Everything that merely
   * REMOVES rows — LIMIT, OFFSET, HAVING, GROUP BY, DISTINCT, a join inside
   * the item, an additional conjunct — can turn a non-empty item empty, which
   * drops the outer row and makes the witness vacuous rather than wrong. None
   * of them is gated, and gating them would be caution rather than soundness.
   *
   * Two things do break the direction, because they let the item be non-empty
   * for a reason that is not the restriction, and only ONE of them needs a
   * gate of its own:
   *   - a WITH clause, which can bind the very name being witnessed to
   *     something else — the witness identifies its relation by SPELLING —
   *     and is refused here;
   *   - a SET OPERATION, whose other arm can supply the row alone. That
   *     carries no gate because it cannot reach one: a set-operation node
   *     holds no `fromClause` or `whereClause` of its own (the parser puts
   *     both on the arms), so requiring exactly one FROM item and a WHERE
   *     already excludes it. An explicit `sel.op` check was written, measured
   *     to catch nothing, and removed. `setop_n` in
   *     `row-witness-setop-item.sql` pins the outcome either way.
   *
   * The WHERE is required to BE the equality rather than to CONTAIN it, which
   * is the one deliberate over-refusal: a conjunction carrying it would be
   * sound (a stronger filter still proves the row), and reading that needs a
   * conjunct walk with nothing yet asking for it. A DISJUNCTION must never be
   * accepted, and refusing everything that is not the bare equality refuses
   * that for free.
   */
  private recordRowWitness(sub: RangeSubselect, joinState: JoinState, scope: Scope): void {
    if (joinState === OPTIONAL || !sub.subquery) return;
    const sel = (sub.subquery as Record<string, unknown>)["SelectStmt"] as SelectStmt | undefined;
    if (!sel) return;
    if (sel.withClause) return;
    if (!sel.whereClause || (sel.fromClause ?? []).length !== 1) return;
    const rv = (sel.fromClause![0] as Record<string, unknown>)["RangeVar"] as RangeVar | undefined;
    if (!rv?.relname) return;
    const inner = rv.alias?.aliasname ?? rv.relname;
    const eq = this.equalityColumnRefs(sel.whereClause);
    if (!eq) return;
    // One side names the scanned relation, the other must name something
    // OUTSIDE the item — a correlated reference is the whole point, and an
    // equality between two of the item's own columns witnesses nothing.
    for (const [self, outer] of [
      [eq[0], eq[1]],
      [eq[1], eq[0]],
    ] as const) {
      if (self.alias !== inner || outer.alias === inner) continue;
      scope.rowWitnesses.push({
        schema: rv.schemaname,
        relation: rv.relname,
        column: self.column,
        outerAlias: outer.alias,
        outerColumn: outer.column,
      });
      return;
    }
  }

  /**
   * An expression with its CASTS removed. Sound wherever the question is
   * presence rather than value: a cast of NULL is NULL and a cast of a
   * non-null value is non-null, whatever the conversion does to it.
   */
  private stripCasts(expr: Node): Node {
    const rec = expr as Record<string, unknown>;
    const inner = "TypeCast" in rec ? (rec["TypeCast"] as { arg?: Node }).arg : undefined;
    return inner ? this.stripCasts(inner) : expr;
  }

  private computePresenceGroups(
    producers: ({ entry: RelationEntry; column: string; ordinal?: number } | null)[],
    results: { notNull: boolean }[],
    scope: Scope,
    depth: number,
  ): OutputPresenceGroup[] {
    const units = new Map<number, { columns: number[]; discriminants: number[]; dead: boolean }>();
    for (let i = 0; i < producers.length; i++) {
      const p = this.presenceProducer(producers[i] ?? null, scope, depth);
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
   * as the special case where the pair coincides.
   *
   * Branch agreement asks the other branch for a MATCHING group, which a
   * branch that cannot be absent — a row of literals: no outer join, so no
   * unit, so no group — can never supply, though it also cannot break one.
   * So a left group also survives when every discriminant is notNull on the
   * right: every row that branch contributes lands in the present arm, and
   * neither half of the contract ("absent ⇒ every member NULL", "a
   * discriminant is NULL iff absent") has a case to fail on there. This is
   * the vacuous arm, and it is what lets `SELECT … FROM t LEFT JOIN … UNION
   * ALL SELECT 'z', 'z'` keep the union type its left branch earned.
   *
   * Not in tension with the dead rule below, which is about the opposite
   * shape: that one drops a group whose ABSENT arm cannot occur, because a
   * type with an unreachable arm is noise. Here the absent arm is exactly
   * what survives — measured, 896 groups admitted corpus-wide and both arms
   * observed on every one. A recursive branch's
   * self-reference lifts from the group ASSUMPTION the fixpoint in
   * analyzeSetOperation iterates (seeded with the left branch's groups,
   * shrinking to convergence), which is what lets a recursive CTE keep
   * the groups its recursion preserves.
   */
  private computeSetOpGroups(
    sel: SelectStmt,
    results: { notNull: boolean }[],
    rightResults?: { notNull: boolean }[],
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
      const admit = (columns: number[], discriminants: number[]): void => {
        if (columns.length < 2 || discriminants.length === 0) return;
        const key = `${columns.join(",")}|${discriminants.join(",")}`;
        if (seen.has(key)) return;
        seen.add(key);
        combined.push({ columns, discriminants });
      };
      for (const lg of left) {
        for (const rg of right) {
          admit(
            lg.columns.filter(c => rg.columns.includes(c)),
            lg.discriminants.filter(
              d => rg.discriminants.includes(d) && lg.columns.includes(d) && rg.columns.includes(d),
            ),
          );
        }
        // The vacuous arm — a branch with no absence cannot break the group.
        if (rightResults && lg.discriminants.every(d => rightResults[d]?.notNull)) {
          admit(lg.columns, lg.discriminants);
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

  /**
   * Whether the inner analysis's presence groups make output `index` of
   * `entry` non-null HERE, because a sibling member of its group is pinned
   * in this scope.
   *
   * The group's contract does both halves of the step: the unit is absent
   * only with EVERY member NULL, so a member proven non-null proves the row
   * present; and a DISCRIMINANT is non-null on the present arm. So a pinned
   * member and a discriminant goal give "non-null on every row this query
   * returns".
   *
   * The presence-group twin of `originCheckEntailment`, and it reaches what
   * that cannot: origins are TABLE-anchored, and `originOf` returns none for
   * a table function ("table functions above all"). So `WITH q AS (SELECT
   * g.email, g.val FROM t LEFT JOIN LATERAL gfn_urows(t.id) g ON true)
   * SELECT q.email FROM q WHERE q.val IS NOT NULL` had no channel at all —
   * the same query over a plain LEFT JOINed table read notNull through
   * origins, and only the pairing of a function with a boundary was dark.
   * Groups need no anchor, so this arm is uniform over both.
   *
   * The evidence channels are the two the caller's own level consults, and
   * the same soundness argument carries: a WHERE guarantee holds on every
   * returned row, a branch guard holds wherever this read happens. An outer
   * name exported twice is skipped rather than guessed at — PostgreSQL
   * rejects the reference, mirroring `originCheckEntailment`'s dropped set.
   *
   * `joinState !== OPTIONAL` is the caller's precondition and is not
   * re-checked: an outer extension of the entry itself is a SECOND absence
   * this says nothing about.
   */
  private presenceGroupPins(
    entry: RelationEntry,
    index: number,
    outerNames: (string | undefined)[],
    scope: Scope,
  ): string | null {
    if (!entry.ast || index < 0) return null;
    const duplicated = new Set(
      outerNames.filter((n, i) => n !== undefined && outerNames.indexOf(n) !== i),
    );
    for (const group of this.groupsOfStatement(entry.ast)) {
      if (!group.discriminants.includes(index)) continue;
      for (const j of group.columns) {
        if (j === index) continue;
        const name = outerNames[j];
        if (name === undefined || duplicated.has(name)) continue;
        if (
          this.checkWhereGuarantee(entry.alias, name, scope) ||
          this.guardsImplyNotNull(entry.alias, name, scope)
        ) {
          return `${entry.alias}.${name}`;
        }
      }
    }
    return null;
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
        const groups = this.computeSetOpGroups(sel, combined, right);
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
        const srfPadded = this.srfPaddedTargets(tracedTargets, depth);
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
          const alwaysNull = notNull ? false : this.alwaysNullExpr(val, scope, depth + 1);
          producers.push(this.originTarget(val, sel, scope, originMode));
          results.push({
            name: name ?? this.inferName(val),
            notNull,
            ...(alwaysNull ? { alwaysNull: true } : {}),
            trace: trace.node,
          });
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
      const alwaysNull = notNull ? false : this.alwaysNullExpr(val, scope, depth + 1);
      producers.push(this.resolveBareColumnTarget(val, scope));
      results.push({
        name: name ?? this.inferName(val),
        notNull,
        ...(alwaysNull ? { alwaysNull: true } : {}),
        trace: trace.node,
      });
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
      const { results, groups } = this.analyzeSetOperation(stmt, cteScope, depth);
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
    const srfPadded = this.srfPaddedTargets(targetList, depth);
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
      // Only ever asked of a column the walk left nullable: the two are
      // mutually exclusive, and a proven non-null needs no mirror.
      const alwaysNull = notNull ? false : this.alwaysNullExpr(val, scope, depth + 1);
      const bare = this.originTarget(val, stmt, scope, originMode);
      producers.push(bare);
      const og = bare ? this.originOf(bare.entry, bare.column, scope, depth) : undefined;
      results.push(
        og
          ? {
              name: name ?? this.inferName(val),
              notNull,
              ...(alwaysNull ? { alwaysNull: true } : {}),
              ...(og.origins ? { origins: og.origins } : {}),
              ...(og.settled ? { originNotNull: og.settled } : {}),
              ...(og.crossings ? { unitCrossings: og.crossings } : {}),
            }
          : { name: name ?? this.inferName(val), notNull, ...(alwaysNull ? { alwaysNull: true } : {}) },
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
      rowWitnesses: [],
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
   *
   * `extraPreds` are conjuncts that hold somewhere NARROWER than the whole
   * scope — a CASE branch's guard, whose promotions are valid only inside
   * that branch. They enter exactly where a WHERE conjunct does, and the
   * caller (`guardedPresence`) is what keeps the resulting state from
   * escaping the branch: it runs this under `withSpeculativeScope`, which
   * restores every mutation once the answer is read.
   */
  private resolveJoinImplications(scope: Scope, extraPreds: Node[] = []): void {
    if (scope.joins.length === 0 && scope.impliedQuals.length === 0) return;
    const present = new Set<string>();
    for (const [alias, entry] of scope.aliases) {
      if (entry.joinState === REQUIRED) present.add(alias);
    }
    const wherePreds: Node[] = [
      ...(scope.whereClause ? [scope.whereClause] : []),
      ...(scope.havingClause ? [scope.havingClause] : []),
      ...extraPreds,
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

      for (const j of scope.joins) {
        const grouped = this.rowWitnessEntailedAlias(j, scope);
        if (grouped && !present.has(grouped)) {
          present.add(grouped);
          const entry = scope.aliases.get(grouped);
          if (entry && entry.joinState === OPTIONAL) entry.joinState = REQUIRED;
          changed = true;
        }
      }

      for (const [alias, entry] of scope.aliases) {
        if (present.has(alias)) continue;
        const proven =
          [...wherePreds, ...scope.impliedQuals].some(p =>
            this.whereImpliesAliasNotNull(p, alias, scope),
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

      // The participation closure. A join's qual holds on every row where
      // its arm PARTICIPATES — global presence is not required for that,
      // and demanding it was the walk's one measured divergence from
      // reduce_outer_joins (436 generated cases, one cause; the pinned
      // fixtures are explain-slice-local-flat.sql and
      // explain-slice-local-inner-qual.sql).
      //
      // Let J be a join with qual Q, and A an arm J does NOT preserve — an
      // INNER join drops both arms' rows on qual failure, a LEFT its
      // right's, a RIGHT its left's. A FULL join preserves both, so on its
      // own it contributes nothing — but a FULL join whose OTHER side is
      // proven present behaves as LEFT/RIGHT: the failing arm row's only
      // emission path is extending that other side, and "present" means
      // exactly that no emitted row has it extended (a WHERE that filters
      // the extension away, a key that forbids it). The planner's
      // two-step — FULL→LEFT from the strict WHERE, then the arm's nested
      // join reduced by the qual — falls out of the same reading. Let N be
      // an outer join wholly inside A with optional unit G. If Q is strict
      // for some alias that G's extension nulls (G is in the alias's unit
      // chain), then a G-extended row makes Q not TRUE and J drops it:
      // G's own extension NEVER reaches the output. Rows where A is
      // absent altogether are J's (or an ancestor's) extension — a
      // different unit, tracked by its own group.
      //
      // So G DISSOLVES into its enclosing unit: every member's chain drops
      // G, members whose innermost unit was G inherit the next one out,
      // and a member whose chain empties is genuinely present — at top
      // level the closure degenerates to the ordinary promotion the
      // fixpoint already made through the implied-qual route. Dissolution
      // is what keeps every reader coherent at once: co-membership
      // promotion, presence groups (a settled inner join merges its side
      // into the arm's unit), origins (ColumnOrigin.units), and the join
      // audit's settledOf all read the same chains.
      //
      // The measured counterexample that shaped the incomingRequired rule
      // (tags/product_tags RIGHT products FULL product_tags) stays out by
      // construction: its INNER join's single-alias arms nest no outer
      // join, and its RIGHT join's left arm contains only an INNER one —
      // nothing dissolves, and no qual is implied that today is not.
      for (const j of scope.joins) {
        if (!j.quals) continue;
        // An arm is non-preserved exactly when a row of it failing Q has no
        // way into the output. Two paths exist: the join DROPS it (an
        // INNER drops both arms' failures, a LEFT its right's, a RIGHT its
        // left's), or the join EMITS it by extending the other side — and
        // that path is gone once the other side's extension unit is DEAD:
        // dissolved by an enclosing qual (no chain carries it), or a
        // member proven present (never extended in any emitted row). A
        // join type that cannot extend the other side at all is the
        // trivial case of dead, covered by the jointype disjuncts. Chains
        // persist across fixpoint iterations, so one round's dissolution
        // arms the next: t LEFT (u RIGHT (v RIGHT ck)) settles outside-in,
        // each join behaving as INNER once its own extension dies.
        const unitDead = (g: number | undefined): boolean =>
          g !== undefined &&
          ![...scope.aliases.values()].some(e => e.unitChain.includes(g));
        const leftExtDead =
          unitDead(j.leftOptionalGroup) || j.leftAliases.some(a => present.has(a));
        const rightExtDead =
          unitDead(j.rightOptionalGroup) || j.rightAliases.some(a => present.has(a));
        const arms: string[][] = [];
        if (j.jointype === "JOIN_INNER" || j.jointype === "JOIN_RIGHT" || rightExtDead)
          arms.push(j.leftAliases);
        if (j.jointype === "JOIN_INNER" || j.jointype === "JOIN_LEFT" || leftExtDead)
          arms.push(j.rightAliases);
        for (const arm of arms) {
          for (const n of scope.joins) {
            if (n === j || !this.joinWithin(n, arm)) continue;
            for (const side of ["left", "right"] as const) {
              const g = side === "left" ? n.leftOptionalGroup : n.rightOptionalGroup;
              if (g === undefined) continue;
              const killed = [...scope.aliases.values()].some(
                e => e.unitChain.includes(g) && this.whereImpliesAliasNotNull(j.quals!, e.alias, scope),
              );
              if (!killed) continue;
              this.dissolveUnit(scope, g, present);
              changed = true;
            }
          }
        }
      }
    }

    // Test-side readout (WalkOptions.joinAudit): the fixpoint's verdict per
    // outer join, exactly as it concludes. A side is settled when every
    // direct member of the null group this join assigned was promoted to
    // REQUIRED — deeper-nested groups keep their own joins' records. Pure
    // observation; nothing below reads it.
    //
    // One record per SYNTACTIC join: the fixpoint re-runs (DML channels) and
    // scope rebuilds (set-operation branch re-analysis) revisit the same
    // JoinExpr, so records dedup on it. A repeat only refreshes settledness
    // — promotion is monotone, OPTIONAL → REQUIRED — while the group ids
    // stay the FIRST analysis's, the ones the memoized results' origins
    // reference.
    //
    // A SPECULATIVE run is not a verdict — its promotions hold inside one
    // CASE branch, and settledness means "for every emitted row". Recording
    // it would leak the branch's reading into a global claim, and the
    // dedup's monotone refresh would make the leak permanent.
    if (this.joinAuditSink && !this.speculating) {
      const settledOf = (group: number): boolean => {
        for (const entry of scope.aliases.values()) {
          if (entry.nullGroup === group && entry.joinState === OPTIONAL) return false;
        }
        return true;
      };
      for (const j of scope.joins) {
        if (j.leftOptionalGroup === undefined && j.rightOptionalGroup === undefined) continue;
        const prior = j.node ? this.joinAuditSeen.get(j.node) : undefined;
        if (prior) {
          if (prior.leftSettled === false && j.leftOptionalGroup !== undefined)
            prior.leftSettled = settledOf(j.leftOptionalGroup);
          if (prior.rightSettled === false && j.rightOptionalGroup !== undefined)
            prior.rightSettled = settledOf(j.rightOptionalGroup);
          continue;
        }
        const audit: JoinAudit = { jointype: j.jointype };
        if (j.leftOptionalGroup !== undefined) {
          audit.leftSettled = settledOf(j.leftOptionalGroup);
          audit.leftGroup = j.leftOptionalGroup;
        }
        if (j.rightOptionalGroup !== undefined) {
          audit.rightSettled = settledOf(j.rightOptionalGroup);
          audit.rightGroup = j.rightOptionalGroup;
        }
        if (j.node) this.joinAuditSeen.set(j.node, audit);
        this.joinAuditSink.push(audit);
      }
    }
  }

  /**
   * Dissolve one null-extension unit: its extension is proven to never
   * reach the output (the participation closure), so every member's chain
   * drops it, an innermost membership falls back to the next enclosing
   * unit, and a member left with no enclosing unit is genuinely present.
   * Idempotent — a second call finds no chain carrying the group.
   */
  private dissolveUnit(scope: Scope, group: number, present: Set<string>): void {
    for (const entry of scope.aliases.values()) {
      if (!entry.unitChain.includes(group)) continue;
      // REASSIGN, never splice: sibling entries of one join side share the
      // chain ARRAY (walkFromItem threads it through), and an in-place
      // mutation dissolves the unit for whichever entry the loop visits
      // first while stranding the rest with a stale nullGroup.
      entry.unitChain = entry.unitChain.filter(g => g !== group);
      if (entry.nullGroup !== group) continue;
      if (entry.unitChain.length > 0) {
        entry.nullGroup = entry.unitChain[entry.unitChain.length - 1]!;
      } else if (entry.joinState === OPTIONAL) {
        entry.joinState = REQUIRED;
        present.add(entry.alias);
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
  /**
   * The alias this join cannot have extended, because a `Scope.rowWitness`
   * proves the row it was looking for exists.
   *
   * Foreign-key entailment reads the two relations THIS join relates, and says
   * so: "a column from elsewhere in the tree says nothing about whether this
   * join matched". That is right for a key, and it is exactly the restriction
   * a row witness lifts — the evidence deliberately comes from a THIRD FROM
   * item, and is sound because of what the witness already asserts, that the
   * relation holds a row for the key on every row this scope emits.
   *
   * The optional side must be a relation GROUPED BY the key the join uses:
   *
   *     LEFT JOIN (SELECT s.k, count(*) FROM S s GROUP BY s.k) t ON t.k = o.c
   *
   * A grouped relation holds a row for exactly the keys its source holds, so
   * "S has a row with k = o.c" and "the group for o.c exists" are the same
   * statement.
   *
   * This side is gated where the producer is not, and the asymmetry is the
   * point rather than an inconsistency. The producer needs `non-empty ⟹ the
   * row exists`, which anything that only REMOVES rows preserves. This needs
   * `the row exists ⟹ the group is here`, which those same operations destroy:
   * a WHERE inside the item can remove precisely the witnessed row, HAVING can
   * drop the group after forming it, LIMIT/OFFSET and a set operation can
   * remove it afterwards, and a join inside can drop it on the way.
   *
   * Two more refusals are conservative rather than load-bearing, and are
   * marked as such so neither reads as a soundness fact: more than one
   * grouping term is still sound (a group for the tuple exists exactly when a
   * row with that first key does, so the join still matches — it may match
   * SEVERAL times, which is a row-count question this rule does not own), and
   * a WITH clause could only rebind the name in ways the spelling match would
   * have to reason about.
   *
   * The grouping term must also be the column the join reads, which is two
   * hops: the join names an OUTPUT column of the item, and that output has to
   * resolve through the target list to the grouped column itself.
   */
  private rowWitnessEntailedAlias(j: JoinPredicate, scope: Scope): string | null {
    if (scope.rowWitnesses.length === 0) return null;
    const eq = this.equalityColumnRefs(j.quals);
    if (!eq) return null;

    for (const side of ["left", "right"] as const) {
      const group = side === "left" ? j.leftOptionalGroup : j.rightOptionalGroup;
      if (group === undefined) continue;
      const optional = side === "left" ? j.leftAliases : j.rightAliases;
      const other = side === "left" ? j.rightAliases : j.leftAliases;

      for (const [mine, outer] of [
        [eq[0], eq[1]],
        [eq[1], eq[0]],
      ] as const) {
        if (!optional.includes(mine.alias) || !other.includes(outer.alias)) continue;
        const entry = scope.aliases.get(mine.alias);
        if (!entry) continue;
        const src = this.groupedRelationKey(entry, mine.column);
        if (!src) continue;
        const witnessed = scope.rowWitnesses.some(
          w =>
            w.schema === src.schema &&
            w.relation === src.relation &&
            w.column === src.column &&
            w.outerAlias === outer.alias &&
            w.outerColumn === outer.column,
        );
        if (witnessed) return mine.alias;
      }
    }
    return null;
  }

  /**
   * For a CTE or subquery alias that is nothing but `SELECT … FROM S GROUP BY
   * S.k`, the source relation and the column `k` — provided `outputColumn` is
   * the output that resolves to `k`. Null whenever anything could make the
   * item's rows differ from its source's distinct keys.
   */
  private groupedRelationKey(
    entry: RelationEntry,
    outputColumn: string,
  ): { schema: string | undefined; relation: string; column: string } | null {
    if (entry.kind !== "cte" && entry.kind !== "subquery") return null;
    const sel = (entry.ast as Record<string, unknown> | undefined)?.["SelectStmt"] as
      | SelectStmt
      | undefined;
    if (!sel) return null;
    if (sel.op && sel.op !== "SETOP_NONE") return null;
    if (sel.whereClause || sel.havingClause || sel.withClause) return null;
    if (sel.limitCount || sel.limitOffset) return null;
    if ((sel.groupClause ?? []).length !== 1) return null;
    if ((sel.fromClause ?? []).length !== 1) return null;
    const rv = (sel.fromClause![0] as Record<string, unknown>)["RangeVar"] as RangeVar | undefined;
    if (!rv?.relname) return null;
    const inner = rv.alias?.aliasname ?? rv.relname;

    const grouped = this.qualifiedColumnRef(sel.groupClause![0]!);
    if (!grouped || grouped.alias !== inner) return null;

    // An alias column list renames positionally and would put `outputColumn`
    // on a different target entry; refuse rather than reason about it.
    if (entry.cteColumns && entry.cteColumns.length > 0) return null;

    // The output the join reads must BE the grouped column, resolved through
    // the target list rather than assumed from the spelling.
    const target = (sel.targetList ?? []).find(t => {
      const rt = (t as Record<string, unknown>)["ResTarget"] as
        | { name?: string; val?: Node }
        | undefined;
      if (!rt?.val) return false;
      const ref = this.qualifiedColumnRef(rt.val);
      return (rt.name ?? ref?.column) === outputColumn;
    });
    const rt = (target as Record<string, unknown> | undefined)?.["ResTarget"] as
      | { val?: Node }
      | undefined;
    const underlying = rt?.val ? this.qualifiedColumnRef(rt.val) : null;
    if (!underlying || underlying.alias !== inner || underlying.column !== grouped.column) {
      return null;
    }
    return { schema: rv.schemaname, relation: rv.relname, column: grouped.column };
  }

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
      this.recordRowWitness(sub, joinState, scope);
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
          node: join,
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
      this.recordStrictSrfImplications(rf, joinState, scope);
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
    // Set here rather than beside the written-value maps below: those are
    // voided wholesale by a BEFORE ROW trigger, and this one need not be —
    // `columnRejection` applies the same guard per site, and a mechanism-A
    // rejection survives a trigger anyway (Bind runs first).
    scope.dmlReturningRejectedParams = returningRejectedParams(
      { InsertStmt: stmt } as unknown as Node,
      this.catalog,
    );
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
    // The mirror map, built in lockstep and by the same rule: EVERY VALUES
    // row must write NULL, because any one row that does not is a returned
    // row that carries a value.
    const writtenNull = new Map<string, boolean>();
    const valuesLists = select["valuesLists"] as Node[] | undefined;
    if (valuesLists?.length) {
      columns.forEach((col, i) => {
        if (!col) return;
        const cells = valuesLists.map(
          row => ((row as { List?: { items?: Node[] } }).List?.items ?? [])[i],
        );
        written.set(
          col,
          cells.every(cell => !!cell && this.walkExpr(cell, this.emptyScope(scope), depth + 1)),
        );
        writtenNull.set(
          col,
          cells.every(
            cell => !!cell && this.alwaysNullExpr(cell, this.emptyScope(scope), depth + 1),
          ),
        );
      });
    } else if (select["op"] === "SETOP_NONE" && select["targetList"]) {
      const innerResults = this.analyzeStatement(stmt.selectStmt!, scope, depth + 1);
      columns.forEach((col, i) => {
        if (!col) return;
        written.set(col, innerResults[i]?.notNull === true);
        writtenNull.set(col, innerResults[i]?.alwaysNull === true);
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
      // The conflict path is a SECOND way to produce a returned row, and
      // its SET expressions are not analysed for always-null here — so the
      // mirror map cannot speak for any column once that path exists.
      writtenNull.clear();
    }

    scope.dmlWrittenColumns = { alias: entry.alias, columns: written };
    scope.dmlWrittenNullColumns = { alias: entry.alias, columns: writtenNull };
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
    scope.dmlReturningRejectedParams = returningRejectedParams(
      { UpdateStmt: stmt } as unknown as Node,
      this.catalog,
    );
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
      const writtenNull = new Map<string, boolean>();
      this.dmlOldRowRead = true;
      try {
        for (const item of stmt.targetList ?? []) {
          const rt = (item as { ResTarget?: { name?: string; val?: Node } }).ResTarget;
          if (!rt?.name || !rt.val) continue;
          if ("MultiAssignRef" in (rt.val as Record<string, unknown>)) continue;
          written.set(rt.name, this.walkExpr(rt.val, scope, depth + 1));
          // The mirror: an UPDATE has ONE producing path, so a SET
          // expression that is always NULL is the returned value outright —
          // simpler than the INSERT case, which has to intersect over VALUES
          // rows and give up entirely on an ON CONFLICT second path.
          writtenNull.set(rt.name, this.alwaysNullExpr(rt.val, scope, depth + 1));
        }
      } finally {
        this.dmlOldRowRead = false;
      }
      scope.dmlWrittenColumns = { alias: targetAlias, columns: written };
      scope.dmlWrittenNullColumns = { alias: targetAlias, columns: writtenNull };
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
    scope.dmlReturningRejectedParams = returningRejectedParams(
      { MergeStmt: stmt } as unknown as Node,
      this.catalog,
    );
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
      // Two maps per arm, built together: what the arm writes non-null and
      // what it writes NULL. A MERGE has one producing arm per matched row
      // and the walk cannot know which fired, so BOTH maps reduce the same
      // way below — by agreement across every producing arm.
      const perArm: { nn: Map<string, boolean>; an: Map<string, boolean> }[] = producing.map(a => {
        const nn = new Map<string, boolean>();
        const an = new Map<string, boolean>();
        if (a.commandType === "CMD_UPDATE") {
          this.dmlOldRowRead = true;
          try {
            for (const item of a.targetList ?? []) {
              const rt = (item as { ResTarget?: { name?: string; val?: Node } }).ResTarget;
              if (!rt?.name || !rt.val) continue;
              if ("MultiAssignRef" in (rt.val as Record<string, unknown>)) continue;
              nn.set(rt.name, this.walkExpr(rt.val, scope, depth + 1));
              an.set(rt.name, this.alwaysNullExpr(rt.val, scope, depth + 1));
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
            if (!col) return;
            nn.set(col, this.walkExpr(val, scope, depth + 1));
            an.set(col, this.alwaysNullExpr(val, scope, depth + 1));
          });
        }
        return { nn, an };
      });
      const written = new Map<string, boolean>();
      const writtenNull = new Map<string, boolean>();
      for (const [col] of perArm[0]?.nn ?? []) {
        written.set(col, perArm.every(m => m.nn.get(col) === true));
        writtenNull.set(col, perArm.every(m => m.an.get(col) === true));
      }
      scope.dmlWrittenColumns = { alias: targetAliasW, columns: written };
      scope.dmlWrittenNullColumns = { alias: targetAliasW, columns: writtenNull };
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
      rowWitnesses: [],
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
      const alwaysNull = notNull ? false : this.alwaysNullExpr(val, scope, depth + 1);
      const bare = this.resolveBareColumnTarget(val, scope);
      producers.push(bare);
      const og = bare ? this.originOf(bare.entry, bare.column, scope, depth) : undefined;
      results.push(
        og
          ? {
              name: name ?? this.inferName(val),
              notNull,
              ...(alwaysNull ? { alwaysNull: true } : {}),
              ...(og.origins ? { origins: og.origins } : {}),
              ...(og.settled ? { originNotNull: og.settled } : {}),
              ...(og.crossings ? { unitCrossings: og.crossings } : {}),
            }
          : {
              name: name ?? this.inferName(val),
              notNull,
              ...(alwaysNull ? { alwaysNull: true } : {}),
            },
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
  ): { results: OutputNullability[]; groups: OutputPresenceGroup[] } {
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
        combinedGroups = this.computeSetOpGroups(stmt, combined, right);
      } finally {
        this.fixpointJournal = outerJournal;
      }
      if (
        sameNullability(combined, assumption) &&
        JSON.stringify(combinedGroups) === JSON.stringify(groupAssumption)
      ) {
        this.recursiveAssumption.delete(stmt);
        this.recursiveGroupAssumption.delete(stmt);
        // The settled groups travel WITH the settled results. The caller
        // used to recompute them from the combined verdicts alone, which
        // gave the same answer only while nothing here knew more than a
        // second pass could — and the vacuous arm reads the RIGHT branch's
        // own per-column verdicts, which exist only inside this loop.
        return { results: combined, groups: combinedGroups };
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
    return { results: left.map(c => ({ name: c.name, notNull: false })), groups: [] };
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
      rowWitnesses: [],
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
      // The diagnostic crossings channel: INTERSECT/EXCEPT rows are left
      // rows (left crossings pass through); a UNION claim proven notNull
      // held on EVERY branch's rows, so each branch's crossings are killed
      // within that branch's rows — the concatenation is the sound combine,
      // no slot alignment needed (the consumer collects unit ids).
      const crossings =
        op === "SETOP_INTERSECT" || op === "SETOP_EXCEPT"
          ? l?.unitCrossings
          : [...(l?.unitCrossings ?? []), ...(r?.unitCrossings ?? [])];
      // Always-null across a set operation, the mirror of `notNull` above:
      // INTERSECT and EXCEPT rows ARE left-branch rows, so the left claim
      // passes through verbatim; a UNION row came from one branch or the
      // other, so the claim survives only when BOTH make it. Same shape as
      // the origins rule directly above, and the same reason.
      const alwaysNull =
        op === "SETOP_INTERSECT" || op === "SETOP_EXCEPT"
          ? l?.alwaysNull === true
          : l?.alwaysNull === true && r?.alwaysNull === true;
      results.push({
        name: l?.name ?? r?.name ?? "",
        notNull: combineSetOpColumn(l?.notNull ?? false, r?.notNull ?? false, op),
        ...(alwaysNull ? { alwaysNull: true } : {}),
        ...(origins ? { origins } : {}),
        ...(originNotNull ? { originNotNull } : {}),
        ...(crossings && crossings.length > 0 ? { unitCrossings: crossings } : {}),
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
          const declared = this.columnsForReturnType(meta.returnType, name).map(c => ({
            name: c.name,
            notNull: false,
          }));
          // The BODY is what can put a constraint back, exactly as it does
          // for the same call in FROM position — `(get_order_items(1)).*`
          // and `SELECT * FROM get_order_items(1)` expand the same rows, and
          // only the second read the body. Five claims in
          // composite-star-shape.sql recorded that as "a row type carries no
          // constraints, but the fields are real order_items rows", which is
          // the body reading described and then not asked for.
          //
          // SET-RETURNING only, and the distinction is the soundness
          // argument: a set-returning call contributes ONE OUTPUT ROW PER
          // BODY ROW, so an empty body contributes no row at all and there is
          // nothing to expand. A SCALAR composite call yields exactly one
          // value, and a body returning ZERO rows makes it NULL — measured,
          // `RETURNS oi AS $$ SELECT id, q FROM oi LIMIT 1 $$` over an empty
          // table comes back as one row of NULLs.
          //
          // A scalar call whose body GUARANTEES its row is sound too, and
          // `guaranteesSingleRow` is the gate for it — the same one the
          // scalar body inliner applies, with the schema's `one_pair` on one
          // side and `first_item` on the other. It was written, measured, and
          // REMOVED: no scalar function in the corpus both yields a readable
          // body shape and lacks the guarantee, so the permissive direction
          // of that gate has no counterexample and nothing can catch it going
          // wrong. An ungated widening reads as coverage and is not. The gap
          // is recorded in the register, with the shape a future control
          // would need.
          //
          // The declared flags stay stripped either way. A NULL composite
          // expands to a NULL in every field, NOT NULL domain fields
          // included (measured), so the return TYPE can never speak here —
          // only the body, which refuses whenever it cannot match the shape
          // column for column.
          return meta.returnsSet ? this.refineColumnsFromBody(declared, meta, depth) : declared;
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
            ...(og.origins ? { origins: og.origins } : {}),
            ...(og.settled ? { originNotNull: og.settled } : {}),
            ...(og.crossings ? { unitCrossings: og.crossings } : {}),
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
  ): OriginResolution | undefined {
    if (entry.joinState === NOT_FOUND) return undefined;
    const optionalHere = entry.joinState === OPTIONAL;
    // This reference's own null-extension crossings, all at depth 0 (the
    // rowPath step this entry contributes); a lift shifts the inner
    // origins' crossings one step deeper, exactly like rowPath itself.
    // NULL slots (a set-operation branch that could not attribute) pass
    // through as NULL, and the inner per-branch settledness rides along —
    // a bare re-export changes neither.
    const hereUnits = entry.unitChain.map(unit => ({ depth: 0, unit }));
    const lift = (inner: OutputNullability | undefined): OriginResolution | undefined => {
      // The diagnostic crossings channel composes like origins' units but
      // needs no table anchor, so it survives where origins die — a
      // set-returning function's pass-through (the flag's whole purpose).
      const crossings = this.collectUnitCrossings
        ? [
            ...hereUnits,
            ...(inner?.unitCrossings ?? []).map(c => ({ depth: c.depth + 1, unit: c.unit })),
          ]
        : [];
      if (!inner?.origins) {
        return crossings.length > 0 ? { crossings } : undefined;
      }
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
      return {
        origins,
        ...(inner.originNotNull ? { settled: inner.originNotNull } : {}),
        ...(crossings.length > 0 ? { crossings } : {}),
      };
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
        ...(this.collectUnitCrossings && hereUnits.length > 0 ? { crossings: hereUnits } : {}),
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

    // An `unnest` of an array CONSTRUCTOR is the one table function whose
    // values the query wrote down, so its fields name rows this scope can
    // already see — see `unnestFieldOrigins` for why the result is not
    // lifted the way a CTE's is.
    if (entry.kind === "function") {
      const index =
        ordinal ??
        this.resolveTableFunctionColumns(entry, scope, depth).findIndex(c => c.name === colName);
      const un = index >= 0 ? this.unnestFieldOrigins(entry, index, scope, depth) : undefined;
      if (un) {
        return this.collectUnitCrossings && hereUnits.length > 0
          ? { ...un, crossings: hereUnits }
          : un;
      }
    }

    // Every remaining kind — table functions above all — still CROSSES its
    // units: the entry's own chain is the whole story, and the diagnostic
    // channel is precisely for the kinds origins cannot anchor.
    if (this.collectUnitCrossings && hereUnits.length > 0) return { crossings: hereUnits };
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
    // NAMING. A lone function returning a SCALAR takes the relation alias as
    // its column name, `ROWS FROM` or not — measured across the spelling
    // space, including `WITH ORDINALITY`. Two arms take the function names
    // whatever the alias says, and a composite arm keeps its own field names
    // either way. This predicate once served the PADDING rules too, and the
    // two have come apart: arm count is what names a column, and row count is
    // what pads one.
    const loneArm = (rf?.functions?.length ?? 0) === 1;

    // THE BODY READING and THE DECLARED READING. Two or more functions in one
    // `ROWS FROM` expand in lockstep to the LONGEST one's row count, and every
    // shorter one's columns are NULL-padded after it has returned (measured).
    // The same shape as the target list's SRF padding rule — and asked through
    // the same bounds, so "the longest arm is never padded" is a claim the two
    // clauses now share rather than a fact only their comments knew. A lone
    // arm falls out of it with no others to cover.
    const armCalls = (rf?.functions ?? []).map(fnItem => {
      const items = (fnItem as Record<string, unknown>)["List"] as { items?: Node[] } | undefined;
      return (items?.items?.[0] as Record<string, unknown> | undefined)?.["FuncCall"] as
        | FuncCall
        | undefined;
    });
    const unpadded = this.unpaddedParticipants(
      armCalls.map(c => (c ? this.armRowBounds(c, depth) : null)),
    );

    // Which OUTPUT positions the padding reaches. Recorded by closing each arm
    // out at the start of the next — the arm body has too many early exits for
    // a tail, and every route that appends columns has to be covered, the two
    // that push straight past the clearance included.
    const paddedColumns = new Set<number>();
    let armStart = 0;
    let armSurvives = true;
    const closeArm = (): void => {
      if (!armSurvives) for (let k = armStart; k < cols.length; k++) paddedColumns.add(k);
      armStart = cols.length;
      armSurvives = true;
    };

    for (const [armIndex, fnItem] of (rf?.functions ?? []).entries()) {
      closeArm();
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
      // THE PADDING (sweep-4 finding 1). Beside a LONGER arm this item's
      // columns are NULL on every row after it has returned, so no reading of
      // it survives: not the body reading, and not the DECLARED one — a NOT
      // NULL domain return, or a NOT NULL domain among the OUT/TABLE
      // parameters — which was pushed unclipped on all three arms. This is
      // also why the clearance sits BEFORE the presence groups are assembled:
      // a surviving flag makes the column a group DISCRIMINANT, and the group
      // then says "the unit is absent" on rows where a longer arm is still
      // producing values.
      //
      // "Longer" was read as "not alone" until 2026-08-22, which is the same
      // answer only when nothing can be counted. `unpadded` counts what it can
      // (`armRowBounds`), and an arm that covers every other arm's maximum
      // keeps its flags — rowsfrom-pad-longest-arm.sql.
      //
      // THE STRICT SHORT-CIRCUIT. A strict function handed a NULL argument
      // returns one row of all NULLs (measured), which is exactly the row this
      // item emits. `callCanShortCircuit` excludes set-returning functions,
      // on the true argument that a claim about rows that do not exist cannot
      // be contradicted — and `ROWS FROM` is where the rows come back anyway,
      // the long arm supplying them and the padding the NULLs. The exclusion
      // stays: the padding covers that shape for a reason of its own, and a
      // strict SRF can never BE the longest arm, since it returns no rows.
      const survives = unpadded[armIndex] ?? false;
      armSurvives = survives;
      const push = (itemCols: { name: string; notNull: boolean }[]): void => {
        const padded = survives ? itemCols : itemCols.map(c => ({ name: c.name, notNull: false }));
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
        // one column called `json_each`.
        const builtinShape = this.catalog.resolveBuiltinFunctionShape(this.funcSchema(fc), name);
        if (builtinShape) {
          // The shape is environment, captured; which of its columns can be
          // SQL NULL is not — no catalog flag says so, and it is curated
          // (NON_NULL_BUILTIN_TABLE_COLUMNS), each entry measured.
          const nonNull = NON_NULL_BUILTIN_TABLE_COLUMNS.get(name);
          const shaped = this.columnsForReturnType(builtinShape, scalarName);
          push(nonNull ? shaped.map(c => ({ ...c, notNull: c.notNull || nonNull.has(c.name) })) : shaped);
          continue;
        }
        // Everything else — generate_series and the other scalar SRFs —
        // contributes ONE column, and its values are the CALL's values:
        // `SELECT generate_series(1, 2)` and `SELECT z FROM generate_series(1,
        // 2) z` emit the same rows. So the expression reading applies here
        // verbatim, and until 2026-08-22 this site did not ask for it — the
        // same call read notNull in the target list
        // (srf-strict-nullable-argument-target-list.sql: a strict SRF's
        // nullable argument subtracts ROWS, not values) and nullable one
        // clause over, off nothing but position.
        //
        // The reading DISCRIMINATES, which is what makes it more than a
        // widening: builtin-from-position-value.sql puts the two answers on
        // one line, `string_to_table('a,b,c', ',', 'b')` beside
        // generate_series — non-strict, and its null_string argument makes row
        // two a real SQL NULL, witnessed rather than argued.
        //
        // Arguments are walked in `scope` because a LATERAL item's may name
        // outer aliases; a non-LATERAL item cannot reference anything at all,
        // so the scope is immaterial there. A null scope keeps the old answer.
        // Through `push`, because this is a claim like any other and the
        // padding has to be able to clear it.
        push([
          { name: scalarName, notNull: scope ? this.walkExpr(callNode as Node, scope, depth) : false },
        ]);
        continue;
      }
      // The declared shape is the column list; the body is what can put a
      // constraint back on it. Only here, at the SINGLE-candidate site: the
      // consensus loop above must hold whichever overload runs, and one
      // candidate's body proves nothing about the others. (The bodies are
      // individually READABLE now — the map is keyed by signature — which is
      // what lets the padding bound ask them ALL and take the weakest answer.
      // A flag is not a question consensus can answer that way.)
      const declared = this.functionOutputColumns(meta, scalarName);
      push(loneArm ? this.refineColumnsFromBody(declared, meta, 0) : declared);
    }
    closeArm();

    // The counter belongs to the `ROWS FROM` as a whole, not to any one arm,
    // so the padding does not reach it — rowsfrom-pad-with-ordinality.sql.
    if (rf?.ordinality) {
      cols.push({ name: "ordinality", notNull: true });
    }

    // Explicit column aliases rename positionally: `f() AS t(a, b)`.
    const aliases = entry.cteColumns ?? [];
    const named = cols.map((c, i) => ({ name: aliases[i] ?? c.name, notNull: c.notNull }));

    entry.functionColumns = named;
    entry.paddedFunctionColumns = paddedColumns;
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
   * Whether column `ordinal` of an `unnest` over an ARRAY CONSTRUCTOR is
   * non-null, read from the constructor's own elements.
   *
   * `resolveTableFunctionColumns` calls every unnest column nullable, which
   * is right for an array that arrives as a value — a column, a function
   * result, an aggregate — and needlessly weak for one written out in the
   * query. `unnest(ARRAY[…])` emits exactly the constructor's elements, so
   * the column IS those expressions and the walk can read them:
   *
   *   unnest(ARRAY['a', 'b'])                    → one column, notNull
   *   unnest(ARRAY[ROW(u.val, u.email)::pair])   → `p` follows u.val,
   *                                                `q` follows u.email
   *
   * Two shapes and one refusal:
   *
   *   SCALAR element — the single column is every element, so it is non-null
   *     when every element is.
   *   COMPOSITE element — the item expands to the type's fields, and field k
   *     is each element's k-th. Readable only from a ROW CONSTRUCTOR: a
   *     RowExpr is never itself NULL, so its args are the whole story. Any
   *     other element (a composite-typed column, a bare NULL, a call) can be
   *     NULL as a WHOLE, which makes every field NULL on that row — nothing
   *     about the fields is derivable and the answer is nullable.
   *   NESTED constructors flatten: `unnest(ARRAY[ARRAY[1,2],ARRAY[3,NULL]])`
   *     emits four rows, so the leaves are the elements.
   *
   * Zero elements is vacuously non-null and sound for the reason the empty
   * case always is: `unnest(ARRAY[]::pair[])` emits no row, and a claim about
   * rows that do not exist cannot be contradicted.
   *
   * Asked at the LEAF rather than folded into the memoized column list, and
   * that is the point: the element expressions reference the query's other
   * relations (a table function in FROM is implicitly LATERAL), so `u.email`
   * is non-null only once `u` is proven present — which the presence fixpoint
   * decides long after the column NAMES have to exist. The generated corpus's
   * refilter wrappers are exactly that case: they pin `g.p IS NOT NULL`,
   * which proves the u row present, which is what makes its NOT NULL email
   * non-null in `g.q`.
   */
  private unnestArrayColumnNotNull(
    entry: RelationEntry,
    ordinal: number,
    scope: Scope,
    depth: number,
  ): boolean {
    const exprs = this.unnestColumnExpressions(entry, ordinal, scope, depth);
    return !!exprs && exprs.every(e => this.walkExpr(e, scope, depth));
  }

  /**
   * The expressions column `ordinal` of an `unnest` over an ARRAY
   * CONSTRUCTOR takes its value from — one per element, in element order —
   * or null when the item is not that shape.
   *
   * The list is INDEX-ALIGNED with the constructor's elements, and every
   * column of the item aligns the same way: output row *i* is element *i*,
   * so field `p` and field `q` of that row are element *i*'s first and
   * second arguments. That is the same correspondence origin alternatives
   * already carry across UNION branches, which is what lets the origins
   * built from this list ride the existing entailment machinery unchanged.
   *
   * Refusals, each for its own reason:
   *
   *   ROWS FROM and the multi-argument spelling — both pad with NULLs (the
   *     shorter arms after they have returned, the shorter arguments while
   *     a longer one still has elements), so the column's values are not
   *     the constructor's elements at all.
   *   A USER-DEFINED `unnest` — it arrives with metadata and never reaches
   *     the special form, so its columns are its declared return type's.
   *   A composite element that is not a ROW CONSTRUCTOR — a
   *     composite-typed column, a bare NULL, a call: each can be NULL as a
   *     WHOLE, which makes every field NULL on that row, and nothing about
   *     the fields is derivable.
   *   An arity mismatch between the ROW and the composite type — a
   *     statement PostgreSQL rejects, so any answer is unobservable.
   *
   * NESTED constructors flatten, because unnest does:
   * `unnest(ARRAY[ARRAY[1,2],ARRAY[3,NULL]])` emits four rows.
   *
   * An empty constructor yields an empty list, and every caller's `every`
   * is vacuously true — sound for the reason the empty case always is:
   * `unnest(ARRAY[]::pair[])` emits no row, and a claim about rows that do
   * not exist cannot be contradicted.
   */
  private unnestColumnExpressions(
    entry: RelationEntry,
    ordinal: number,
    scope: Scope | null,
    depth: number,
  ): Node[] | null {
    const arms = entry.rangeFunction?.functions ?? [];
    if (arms.length !== 1) return null;
    const list = (arms[0] as Record<string, unknown>)["List"] as { items?: Node[] } | undefined;
    const fc = (list?.items?.[0] as Record<string, unknown> | undefined)?.["FuncCall"] as
      | FuncCall
      | undefined;
    if (!fc || this.funcName(fc) !== "unnest" || (fc.args?.length ?? 0) !== 1) return null;
    if (this.catalog.resolveFunctionMetadata(this.funcSchema(fc), "unnest")) return null;
    // A column definition list retypes the item's columns wholesale; the
    // constructor's own shape is no longer what the caller sees. Read the
    // same two ways `resolveTableFunctionColumns` does — the `ROWS FROM`
    // spelling parks it on the List, the lone-function spelling on the
    // RangeFunction. (The List's second slot is `{}` when there is none,
    // which is truthy; only its `items` say anything.)
    const coldeflist =
      (list?.items?.[1] as { List?: { items?: Node[] } } | undefined)?.List?.items ??
      entry.rangeFunction?.coldeflist;
    if (coldeflist?.length) return null;

    const arg = fc.args![0]!;
    // `ARRAY[…]::pair[]` and `ROW(…)::pair` both wrap the shape this reads
    // in a cast, and a coercion of a non-null value cannot yield NULL — the
    // same reading the coldeflist path takes.
    const flatten = (n: Node): Node[] | null => {
      const rec = this.stripCasts(n) as Record<string, unknown>;
      if (!("A_ArrayExpr" in rec)) return null;
      const out: Node[] = [];
      for (const e of (rec["A_ArrayExpr"] as { elements?: Node[] }).elements ?? []) {
        const nested = flatten(e);
        if (nested) out.push(...nested);
        else out.push(e);
      }
      return out;
    };
    const items = flatten(arg);
    if (!items) return null;

    const fields = this.unnestCompositeElementFields(arg, scope, depth);
    if (!fields) return ordinal === 0 ? items : null;
    if (ordinal < 0 || ordinal >= fields.length) return null;

    const out: Node[] = [];
    for (const e of items) {
      const rec = this.stripCasts(e) as Record<string, unknown>;
      if (!("RowExpr" in rec)) return null;
      const args = (rec["RowExpr"] as { args?: Node[] }).args ?? [];
      if (args.length !== fields.length) return null;
      out.push(args[ordinal]!);
    }
    return out;
  }

  /**
   * The origin alternatives of an `unnest` field, read from the array
   * CONSTRUCTOR the item unnests — or undefined.
   *
   * This is the half that matters for the generated corpus's refilter
   * wrappers, and it is not the nullability half. Inside the CTE
   * `unnest(ARRAY[ROW(u.val, u.email)::gfn_pair]) g` sits beside a
   * LEFT-joined `u`, so both fields ARE nullable there and reading the
   * elements changes nothing. What the outer query needs is that `g.p` and
   * `g.q` are the SAME ROW's columns as each other: pinning `a_tc IS NOT
   * NULL` then proves that row present, and the u row's NOT NULL email
   * settles `a_tb`. Without an origin the two fields are unrelated nullable
   * values and the pin says nothing about its sibling.
   *
   * `originOf` refuses for every table function and is right to: a function
   * result is not a table row. An unnest of a constructor is the exception
   * that proves it — the value is written out in the query, so the row it
   * names is a row the walk can already see, in THIS scope.
   *
   * Which is also why the origin is taken unlifted. A CTE or view origin is
   * lifted (its rowPath prefixed with the reference's instance) because the
   * inner row identity is a different scope's; `u` here is a sibling FROM
   * item, so its rowPath already speaks this scope's instances and
   * prefixing would name a row that does not exist. What DOES compose is
   * presence: the field is present only if `u`'s row is AND this item is
   * not itself null-extended, so the entry's own unit chain and optionality
   * are merged in at the same depth.
   *
   * One alternative per element, and an element whose expression is not
   * origin-eligible (a literal, an arithmetic expression) contributes a
   * NULL slot with its own flat verdict as `settled` — the same shape a
   * literal UNION branch takes.
   */
  private unnestFieldOrigins(
    entry: RelationEntry,
    ordinal: number,
    scope: Scope,
    depth: number,
  ): OriginResolution | undefined {
    const exprs = this.unnestColumnExpressions(entry, ordinal, scope, depth);
    if (!exprs || exprs.length === 0) return undefined;
    const hereUnits = entry.unitChain.map(unit => ({ depth: 0, unit }));
    const optionalHere = entry.joinState === OPTIONAL;
    const origins: (ColumnOrigin | null)[] = [];
    const settled: boolean[] = [];
    for (const expr of exprs) {
      settled.push(this.walkExpr(expr, scope, depth));
      const bare = this.resolveBareColumnTarget(expr, scope);
      const inner = bare ? this.originOf(bare.entry, bare.column, scope, depth) : undefined;
      // Exactly one alternative, or the element-to-alternative alignment
      // this whole construction rests on stops holding: a source that is
      // itself a union contributes several, and there is no index left to
      // pair them against the sibling fields with.
      const o = inner?.origins?.length === 1 ? inner.origins[0] : undefined;
      if (!o) {
        origins.push(null);
        continue;
      }
      const units = [...hereUnits, ...(o.units ?? [])];
      origins.push({
        ...o,
        ...(o.optional || optionalHere ? { optional: true } : {}),
        ...(units.length > 0 ? { units } : {}),
      });
    }
    if (origins.every(o => !o)) return undefined;
    return { origins, settled };
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
  /** The reading, plus the audit tap. Wrapping rather than threading a
   *  record into every return keeps the readings and what the audit sees
   *  the same thing by construction. */
  private operandTypeSet(expr: Node, scope: Scope | null, depth: number): string[] | null {
    const set = this.operandTypeSetOf(expr, scope, depth);
    if (this.typeSetAuditSink) this.typeSetAuditSink.push({ expr, set });
    return set;
  }

  private operandTypeSetOf(expr: Node, scope: Scope | null, depth: number): string[] | null {
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
      if (pr.number === undefined) return null;
      // Inside a LANGUAGE sql body `$n` is the FUNCTION's parameter. Reading
      // `paramTypes` there would type it from an unrelated statement binding
      // that happens to share the position, so the body context shadows it
      // outright rather than falling back to it.
      const t = this.fnCtx
        ? this.fnCtx.argTypes[pr.number - 1]
        : this.paramTypes?.[pr.number - 1];
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
    // MEMBER-LIST nodes — a CASE's branches, COALESCE/GREATEST/LEAST's
    // arguments, an array's elements. PostgreSQL unifies them to ONE common
    // type by its resolution rules; this answers the union of the known
    // members, which contains that type without reimplementing the rules —
    // `CASE … THEN int ELSE numeric END` is `numeric` there and
    // `[integer, numeric]` here, and the elimination downstream is the same
    // superset question it always was.
    //
    // `closedCommonTypes` is the neighbouring rule and is NOT reusable here.
    // It lands an all-unknown list on `text` and demands immutable-I/O of
    // the known members when an unknown one is present — both correct for
    // the evaluator, which must RUN the input function, and both wrong for
    // typing: `COALESCE(m.ts, 'x')` is plainly `timestamptz` however
    // DateStyle-dependent its output is.
    const memberLists: (Node[] | undefined)[] = [
      (() => {
        const ce = rec["CaseExpr"] as
          | { args?: { CaseWhen?: { result?: Node } }[]; defresult?: Node }
          | undefined;
        if (!ce) return undefined;
        const branches = (ce.args ?? [])
          .map(a => a.CaseWhen?.result)
          .filter((n): n is Node => n !== undefined);
        return ce.defresult ? [...branches, ce.defresult] : branches;
      })(),
      (rec["CoalesceExpr"] as { args?: Node[] } | undefined)?.args,
      (rec["MinMaxExpr"] as { args?: Node[] } | undefined)?.args,
    ];
    for (const members of memberLists) {
      if (members === undefined) continue;
      const known = members
        .map(mem => this.operandTypeSet(mem, scope, depth + 1))
        .filter((s): s is string[] => s !== null);
      // ALL members unknown means the type comes from OUTSIDE this node —
      // `m.d = COALESCE('a','b')` makes it a date — and a node typed from
      // outside cannot be typed from inside. `text` would be a guess, and
      // guessing here eliminates the overload PostgreSQL actually picks.
      if (known.length === 0) return null;
      return [...new Set(known.flat())].sort();
    }

    // An array literal carries its ELEMENT union, one dimension up. Arrays
    // do NOT nest in PostgreSQL: `ARRAY[text[], text[]]` is `text[]`, so an
    // element that is already an array contributes itself (measured).
    const arr = rec["A_ArrayExpr"] as { elements?: Node[] } | undefined;
    if (arr) {
      const known = (arr.elements ?? [])
        .map(el => this.operandTypeSet(el, scope, depth + 1))
        .filter((s): s is string[] => s !== null);
      if (known.length === 0) return null;
      return [
        ...new Set(known.flat().map(t => (t.endsWith("[]") ? t : `${t}[]`))),
      ].sort();
    }

    // A ROW is an anonymous composite whatever its members are, so it types
    // without unifying anything.
    if ("RowExpr" in rec) return ["record"];

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
    if (rendered !== null) return [rendered];
    return this.bodyParameterTypeByName(expr, scope);
  }

  /**
   * A LANGUAGE sql body's parameter referenced by NAME, typed from the
   * function's own signature — the counterpart of the `ParamRef` reading
   * above, and the last resort rather than the first.
   *
   * `SELECT upper(a)` and `SELECT upper($1)` are one body written two ways,
   * and until 2026-08-22 only the second narrowed. `renderedTypeOfExpr` reads
   * a ColumnRef's type through SCOPE RELATIONS, and a body with no FROM has an
   * empty scope, so the name came back untyped and every builtin call over it
   * fell through to the name-level tables — which is what cost `gfn_io`'s
   * `upper(a)` the totality `upper(text)` has (measured under generation as
   * 240 unwitnessed claims before this closed).
   *
   * Reached only where the scope reading found nothing, and that ordering is
   * the precedence rule, not an implementation detail: a visible column WINS
   * over a parameter of the same name — measured against PostgreSQL, both
   * qualified and unqualified. Nullability's own reading
   * (`resolveColumnRefTraced`) takes the parameter FIRST, which is the
   * opposite order; two probes failed to turn that into an unsound claim, but
   * it is not this site's job to add a second way to be wrong about it.
   */
  private bodyParameterTypeByName(expr: Node, scope: Scope | null): string[] | null {
    if (!this.fnCtx) return null;
    const cr = (expr as Record<string, unknown>)["ColumnRef"] as ColumnRef | undefined;
    if (!cr) return null;
    const parts = (cr.fields ?? []).map(f => this.stringVal(f));
    if (parts.length !== 1) return null;
    const name = parts[0]!;
    // Belt to the ordering's braces: a scope entry that IS visible under this
    // name but whose type the reading could not follow (a subquery re-export
    // it refuses, say) also arrives here, and typing THAT from the parameter
    // would be the shadowing mistake by another route.
    if (scope?.visible.some(v => v.name === name)) return null;
    const i = this.fnCtx.argNames.indexOf(name);
    const t = i >= 0 ? this.fnCtx.argTypes[i] : undefined;
    return t !== undefined ? [t] : null;
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

  /**
   * The atom-oracle rungs' consumption (docs/subtree-evaluation.md, "The
   * kernel's atom oracle"): can the scope's validated CHECKs plus the
   * row-implied evidence prove this searched-CASE guard NEVER fires? Tried
   * per base-table entry — the kernel matches facts by alias, so a wrong
   * entry simply proves nothing. Refused wholesale for a DML scope (the
   * OLD/NEW channel split is not built for guards) and per-entry for
   * NULL-extendable entries, whose extended rows satisfy no CHECK — and on
   * those rows a guard like `a IS NULL` IS true, so the refusal is
   * load-bearing, not caution.
   */
  private guardRefutedByChecks(guard: Node, scope: Scope): boolean {
    if (scope.dmlSetColumns) return false;
    const core: Node[] = [
      ...(scope.whereClause ? [scope.whereClause] : []),
      ...(scope.havingClause ? [scope.havingClause] : []),
      ...scope.impliedQuals,
    ];
    const evidence = [...core, ...this.kernelGuardPreds(scope)].map(pred => ({
      pred,
      applySetMask: false,
    }));
    for (const [alias, entry] of scope.aliases) {
      if (!entry.table || entry.joinState === OPTIONAL) continue;
      const checkExprs =
        entry.scanInh === false
          ? this.catalog.resolveCheckConstraints(entry.table.schema, entry.table.name)
          : this.catalog.resolveCheckConstraintsTree(entry.table.schema, entry.table.name);
      if (checkExprs.length === 0) continue;
      const refuted = checkConstraintsRefuteGuard(
        {
          goal: { alias, column: "" },
          checkExprs: checkExprs.map(c => this.qualifyColumnRefs(c, alias, entry)),
          evidence,
          isMasked: () => false,
          resolveUnqualified: col => {
            let owner: string | null = null;
            for (const v of scope.visible) {
              if (v.name !== col) continue;
              if (!v.entry || owner) return null; // merged or ambiguous
              owner = v.entry.alias;
            }
            return owner;
          },
          columnTypeName: (a, col) => {
            const e = scope.aliases.get(a);
            const cat = e ? this.entryCatalogColumn(e, col) : undefined;
            return e?.table && cat !== undefined
              ? this.catalog.resolveColumnTypeName(e.table.schema, e.table.name, cat)
              : null;
          },
          comparisonEvaluable: (a, col, op) => {
            const e = scope.aliases.get(a);
            const cat = e ? this.entryCatalogColumn(e, col) : undefined;
            return e?.table && cat !== undefined
              ? this.comparisonOpEvaluable(e.table.schema, e.table.name, cat, op)
              : false;
          },
          evaluatedComparison: this.comparisonOracle(),
          btreeStrategy: this.btreeStrategySupply(),
          equalityComplement: this.equalityComplementSupply(),
          literalDistinctnessSound: (a, col) => {
            const e = scope.aliases.get(a);
            const cat = e ? this.entryCatalogColumn(e, col) : undefined;
            return e?.table && cat !== undefined
              ? this.catalog.resolveLiteralDistinctnessSound(e.table.schema, e.table.name, cat)
              : false;
          },
        },
        guard,
      );
      if (refuted) return true;
    }
    return false;
  }

  /**
   * The statement map's boolean-truth reading of a searched-CASE guard:
   * `true` when the guard evaluated TRUE, `false` when it can never fire
   * the arm (evaluated FALSE or NULL — CASE treats both alike), undefined
   * when the map has no answer or the answer is not a plain boolean. The
   * only map reading besides `isNull`, per the consumption rule.
   */
  private evaluatedGuardTruth(expr: Node | undefined): boolean | undefined {
    if (!expr) return undefined;
    const answered = this.evaluation?.get(expr);
    if (answered === undefined) return undefined;
    if (answered.isNull) return false;
    if (answered.value === true) return true;
    if (answered.value === false) return false;
    return undefined;
  }

  // -------------------------------------------------------------------------
  // The core expression walker (leaf-first recursive)
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // The mirror question: proving an output NULL on every row
  // -------------------------------------------------------------------------

  /**
   * Whether EVERY row this scope emits has `expr` NULL.
   *
   * Deliberately NOT a third value threaded through `walkExpr`. The walk is
   * two-valued end to end and rewriting it would touch every branch, for a
   * fact far shallower than non-nullness — always-null has a handful of
   * sources where not-null has dozens. So this is one conservative question
   * asked beside the walk, defaulting to false: a shape it does not
   * recognise costs nothing but the answer that was already being given.
   *
   * Two sources, the second subsuming more than it looks:
   *   - a NULL literal, through any cast chain;
   *   - anything STRICT over a column the evidence pins NULL. That is
   *     `exprStrictlyForces` — "expr is NULL whenever this leaf is" — run
   *     against leaves that are ALWAYS NULL, which makes the conclusion
   *     unconditional. The bare column ref is its own degenerate case, and
   *     the closure's existing care comes along: COALESCE requires EVERY
   *     branch to force, so `COALESCE(dead, 'x')` is correctly not
   *     always-null, while NULLIF's left operand is.
   *
   * The verification story is the inverse of the nullable side's, and much
   * stronger: a wrong `alwaysNull` is falsified by ANY non-NULL value, so
   * every returned row tests it. No witness has to be constructed.
   */
  private alwaysNullExpr(expr: Node, scope: Scope, depth: number): boolean {
    if (this.isNullLiteral(expr)) return true;

    const node = expr as Record<string, unknown>;

    // A cast of NULL is NULL for every target type, so the wrapper is
    // transparent here. Needed for real spellings rather than tidiness:
    // `CASE … END::text` presents as a TypeCast, and the shape rules below
    // would never see the CASE at all.
    if ("TypeCast" in node) {
      const arg = (node["TypeCast"] as { arg?: Node }).arg;
      if (arg && this.alwaysNullExpr(arg, scope, depth)) return true;
    }

    // `NULLIF(c, c)` over the SAME column is NULL whichever way it goes:
    // equal values give NULL by definition, and a NULL c makes the
    // comparison NULL, so the expression returns c — also NULL. Restricted
    // to a bare ColumnRef pair because the argument needs the two operands
    // to hold the same value within the row, which `NULLIF(random(),
    // random())` does not.
    if ("A_Expr" in node) {
      const ae = node["A_Expr"] as { kind?: string; lexpr?: Node; rexpr?: Node };
      if (
        ae.kind === "AEXPR_NULLIF" &&
        ae.lexpr &&
        ae.rexpr &&
        this.sameColumnRef(ae.lexpr, ae.rexpr)
      ) {
        return true;
      }
    }

    // A CASE is always NULL when every arm that can still fire is, the ELSE
    // included — and a MISSING ELSE is itself NULL, which is why its absence
    // helps rather than blocks. Deliberately not consulting arm pruning: a
    // pruned arm can only remove a way to be non-null, so ignoring the
    // pruning is the conservative direction here.
    if ("CaseExpr" in node) {
      const ce = node["CaseExpr"] as { args?: Node[]; defresult?: Node };
      const arms = (ce.args ?? []).map(
        a => (a as Record<string, unknown>)["CaseWhen"] as { result?: Node } | undefined,
      );
      const everyArmNull = arms.every(
        w => !!w?.result && this.alwaysNullExpr(w.result, scope, depth),
      );
      const elseNull = !ce.defresult || this.alwaysNullExpr(ce.defresult, scope, depth);
      if (arms.length > 0 && everyArmNull && elseNull) return true;
    }

    // A scalar subquery that provably returns NO ROWS is NULL. The "no rows"
    // half needs nothing new: the statement map already evaluates closed
    // subtrees, and `evaluatedGuardTruth` reports not-TRUE for a WHERE that
    // is FALSE *or* NULL — both of which admit no row, so the conflation
    // that would be wrong elsewhere is exactly right here.
    //
    // Restricted to a plain ColumnRef target on purpose. A BARE AGGREGATE
    // returns one row over an empty input — `(SELECT count(*) FROM t WHERE
    // false)` is 0, not NULL — so "no rows" does not imply "NULL result"
    // for every target shape, and the column form is the one that cannot
    // manufacture a row.
    if ("SubLink" in node) {
      const sl = node["SubLink"] as { subLinkType?: string; subselect?: Node };
      const sub = (sl.subselect as { SelectStmt?: SelectStmt } | undefined)?.SelectStmt;
      if (sl.subLinkType === "EXPR_SUBLINK" && sub && !sub.groupClause?.length) {
        const targets = sub.targetList ?? [];
        const soleTarget = targets.length === 1 ? this.unwrapResTarget(targets[0]!).val : undefined;
        const plainColumn = !!soleTarget && "ColumnRef" in (soleTarget as Record<string, unknown>);
        if (plainColumn && this.predicateNeverTrue(sub.whereClause)) return true;
      }
    }

    // An aggregate or window function whose FIRST argument is always null.
    // First rather than all: every admitted aggregate is single-argument
    // except `string_agg(value, delim)`, whose delimiter says nothing about
    // the result once every value is NULL.
    //
    // The name must be unqualified or pg_catalog's AND unknown to the user
    // catalog — the same guard the builtin dispatch draws at priority 6b. A
    // user aggregate called `max` is somebody else's function.
    if ("FuncCall" in node) {
      const fc = node["FuncCall"] as FuncCall & {
        agg_star?: boolean;
        agg_within_group?: boolean;
      };
      const parts = (fc.funcname ?? []).map(f => this.stringVal(f));
      const name = parts[parts.length - 1] ?? "";
      const schema = parts.length > 1 ? parts[parts.length - 2] : undefined;
      const args = fc.args ?? [];
      const table = fc.over
        ? ALWAYS_NULL_OVER_ALL_NULL_WINDOWS.has(name) ||
          ALWAYS_NULL_OVER_ALL_NULL_AGGREGATES.has(name)
        : ALWAYS_NULL_OVER_ALL_NULL_AGGREGATES.has(name);
      if (
        table &&
        !fc.agg_star &&
        !fc.agg_within_group &&
        (schema === undefined || schema === "pg_catalog") &&
        (this.catalog.resolveFunctionCandidates(schema, name, args.length) ?? []).length === 0 &&
        args.length > 0 &&
        this.alwaysNullExpr(args[0]!, scope, depth)
      ) {
        return true;
      }
    }

    // The leaf predicate accepts a NULL LITERAL as well as an always-null
    // column, which is what carries `NULL::numeric + 1` and `upper(NULL)`.
    // The top-level test above is not enough: it only sees a literal that IS
    // the whole expression, and a literal one level down was invisible.
    // Widening the leaf rather than adding a case keeps the closure's care —
    // `COALESCE(NULL, 'x')` still needs EVERY branch to force, so it stays
    // notNull rather than riding in on this.
    return this.exprStrictlyForces(
      expr,
      leaf => this.isNullLiteral(leaf) || this.columnIsAlwaysNull(leaf, scope, depth),
      scope,
    );
  }

  /**
   * `format_type` of an alias-qualified column, in THIS scope's vocabulary.
   * The same body two older kernel call sites inline; factored here rather
   * than reached across to, so no existing behaviour moves.
   */
  private kernelColumnTypeName(alias: string, col: string, scope: Scope): string | null {
    const e = scope.aliases.get(alias);
    const cat = e ? this.entryCatalogColumn(e, col) : undefined;
    return e?.table && cat !== undefined
      ? this.catalog.resolveColumnTypeName(e.table.schema, e.table.name, cat)
      : null;
  }

  /** Companion to `kernelColumnTypeName` — the collation-gated relaxation. */
  private kernelLiteralDistinctnessSound(alias: string, col: string, scope: Scope): boolean {
    const e = scope.aliases.get(alias);
    const cat = e ? this.entryCatalogColumn(e, col) : undefined;
    return e?.table && cat !== undefined
      ? this.catalog.resolveLiteralDistinctnessSound(e.table.schema, e.table.name, cat)
      : false;
  }

  /**
   * The ON quals that hold on every row where `entry`'s own row is PRESENT —
   * evidence a null goal may use and a non-null goal may not.
   *
   * `scope.impliedQuals` carries the quals of joins whose extension the
   * fixpoint refiltered away, because only those hold on every emitted row.
   * A LEFT JOIN that still extends is deliberately left out: on an extended
   * row its qual was not TRUE, so nothing may be concluded from it.
   *
   * For a NULL goal that exclusion is too strong, and the case-split says
   * why. Take `ord o LEFT JOIN inv g ON g.id = o.inv_id AND g.status <>
   * 'paid'`, goal `g.amount`. Every emitted row is one of:
   *   - matched: the ON qual was TRUE, and g's stored row exists, so the
   *     CHECKs apply and the derivation runs on solid ground;
   *   - extended: every column of g is NULL, `g.amount` among them.
   * Both arms end at NULL, so the conclusion is unconditional even though
   * the evidence is not. The same one-directional asymmetry as the kernel's
   * presence gate: the rows where the facts fail to apply are the rows that
   * hand you the answer for free.
   *
   * FULL joins are excluded and the reason is not symmetry-for-its-own-sake:
   * a FULL join emits rows where THIS side is present and the qual was
   * false, so "present ⇒ qual held" is simply untrue there. LEFT with the
   * entry on the right, and RIGHT with it on the left, are the two shapes
   * where presence really does imply the match.
   */
  private qualsHoldingWhenPresent(entry: RelationEntry, scope: Scope): Node[] {
    if (entry.joinState !== OPTIONAL) return [];
    const out: Node[] = [];
    for (const j of scope.joins) {
      if (!j.quals) continue;
      const extendsEntry =
        (j.jointype === "JOIN_LEFT" && j.rightAliases.includes(entry.alias)) ||
        (j.jointype === "JOIN_RIGHT" && j.leftAliases.includes(entry.alias));
      if (extendsEntry) out.push(j.quals);
    }
    return out;
  }

  /**
   * Whether an outer join that extends `entry` can NEVER match, which makes
   * the entry absent on every emitted row and every column of it NULL.
   *
   * The same two shapes `qualsHoldingWhenPresent` accepts, asked one step
   * harder: there the qual holds WHERE the row is present, here it holds
   * NOWHERE, so presence never happens. `evaluatedGuardTruth` reports
   * not-TRUE for a qual that is FALSE or NULL, and neither ever matches a
   * row — so `ON false` and `ON NULL` are the same fact for this question.
   */
  private extendingJoinNeverMatches(entry: RelationEntry, scope: Scope): boolean {
    if (entry.joinState !== OPTIONAL) return false;
    return scope.joins.some(j => {
      const extendsEntry =
        (j.jointype === "JOIN_LEFT" && j.rightAliases.includes(entry.alias)) ||
        (j.jointype === "JOIN_RIGHT" && j.leftAliases.includes(entry.alias));
      return extendsEntry && this.predicateNeverTrue(j.quals ?? undefined);
    });
  }

  /** The written-NULL map when it describes THIS entry, else undefined. */
  private dmlWrittenNullColumnsFor(
    entry: RelationEntry,
    scope: Scope,
  ): ReadonlyMap<string, boolean> | undefined {
    const w = scope.dmlWrittenNullColumns;
    return w && w.alias === entry.alias ? w.columns : undefined;
  }

  /**
   * Whether two expressions are the SAME bare column reference, spelled
   * identically. Not general structural equality: the only caller needs
   * "these two operands read one value from one row", and a conservative
   * `false` for anything else is the right answer for it.
   */
  private sameColumnRef(a: Node, b: Node): boolean {
    const an = a as Record<string, unknown>;
    const bn = b as Record<string, unknown>;
    if (!("ColumnRef" in an) || !("ColumnRef" in bn)) return false;
    const parts = (n: Record<string, unknown>): string[] =>
      ((n["ColumnRef"] as ColumnRef).fields ?? []).map(f => this.stringVal(f) ?? " ");
    const ap = parts(an);
    const bp = parts(bn);
    return ap.length > 0 && ap.length === bp.length && ap.every((p, i) => p === bp[i]);
  }

  /**
   * Whether a predicate is CONSTANTLY not-TRUE, so no row can satisfy it.
   *
   * Read syntactically for a bare literal, and that is the collector's own
   * instruction rather than a shortcut: `collectClosedSubtrees` excludes a
   * bare A_Const on purpose — "alone its answer restates what the AST
   * already says syntactically" — so the statement map will never answer
   * `ON false`, by design. Measured 2026-08-22: the map has no entry for a
   * qual position in EITHER spelling, so `ON 1 = 2` is not covered here and
   * sits in the red suite rather than in a comment.
   *
   * FALSE and NULL are the same fact for this question: neither admits a
   * row. The map is still consulted first, so anything it does answer wins.
   */
  private predicateNeverTrue(expr: Node | undefined): boolean {
    if (!expr) return false;
    if (this.evaluatedGuardTruth(expr) === false) return true;
    const node = expr as Record<string, unknown>;
    if ("TypeCast" in node) {
      return this.predicateNeverTrue((node["TypeCast"] as { arg?: Node }).arg);
    }
    if (!("A_Const" in node)) return false;
    const ac = node["A_Const"] as { isnull?: boolean; boolval?: { boolval?: boolean } };
    if (ac.isnull === true) return true;
    return "boolval" in ac && ac.boolval?.boolval !== true;
  }

  /** A bare NULL constant, through any number of casts. */
  private isNullLiteral(expr: Node): boolean {
    const node = expr as Record<string, unknown>;
    if ("A_Const" in node) return (node["A_Const"] as { isnull?: boolean }).isnull === true;
    if ("TypeCast" in node) {
      const arg = (node["TypeCast"] as { arg?: Node }).arg;
      return arg !== undefined && this.isNullLiteral(arg);
    }
    return false;
  }

  /**
   * Whether the CHECK constraints and row-implied evidence prove this leaf
   * column NULL on every emitted row — `checkConstraintsProveNull`, the
   * kernel's mirror goal over the same fact set.
   *
   * `WHERE col IS NULL` needs no separate rung: evidence NullTests are
   * harvested as facts, so the syntactic case and the derived one
   * (`CHECK (CASE WHEN status = 'paid' THEN amount IS NOT NULL ELSE amount
   * IS NULL END)` under `WHERE status <> 'paid'`) come out of the same call.
   *
   * OPTIONAL entries are IN, and the case-split is why: an absent row nulls
   * the column outright, a present row is bound by the CHECKs. So the two
   * ways of being null compose to the same answer, and the fact that CHECK
   * facts are invalid on a null-extended row — the thing `presenceColumns`
   * exists to guard for a non-null goal — is harmless here, because the
   * rows where the facts do not apply are exactly the rows that give the
   * answer for free. That gate is load-bearing in one direction only.
   */
  private columnIsAlwaysNull(leaf: Node, scope: Scope, depth: number): boolean {
    const target = this.resolveBareColumnTarget(leaf, scope);
    if (!target) return false;
    const { entry, column } = target;

    // A bare re-export carries the claim across the boundary, and unlike
    // every notNull rung this needs no join-state gate at all: if the inner
    // column is NULL on every inner row, a matched row re-exports NULL and
    // an extended row is NULL by extension. Both arms agree, so an OPTIONAL
    // entry weakens nothing. (`LEFT JOIN (SELECT amount FROM inv WHERE
    // status <> 'paid') q ON true` — measured, all NULL.)
    if (entry.kind === "cte" || entry.kind === "subquery" || entry.kind === "view") {
      if (!entry.ast) return false;
      const inner = this.innerRelationColumns(entry, scope, depth);
      const idx = this.innerIndexOf(entry, column, inner);
      if (idx < 0) return false;
      if (inner[idx]?.alwaysNull) return true;
      // The other half: the evidence is OUT here and the CHECK is IN there.
      // `originCheckEntailment` is what reaches a base table through a
      // rowPath, and it takes the mirror goal now — the same call the
      // notNull side makes, one flag over.
      const origins = inner[idx]?.origins;
      if (!origins) return false;
      const outerNames = inner.map((r, i) => entry.cteColumns?.[i] ?? r.name);
      return this.originCheckEntailment(
        entry,
        origins,
        inner[idx]?.originNotNull,
        inner,
        outerNames,
        scope,
        NOOP,
        true,
      );
    }

    // An entry whose extending join can never match is absent on every
    // emitted row, which nulls EVERY column of it — no CHECK, no evidence,
    // and no dependence on what kind of relation it is, so this sits before
    // the table gate below.
    if (this.extendingJoinNeverMatches(entry, scope)) return true;

    if (entry.kind !== "table" || !entry.table) return false;

    // A RETURNING row reports the row the statement WROTE, so a column
    // written NULL on every producing path is NULL on every returned row —
    // no CHECK and no evidence required. The catalog name is the map's key,
    // matching `dmlWrittenColumns`' own consumer.
    const writtenCol = this.entryCatalogColumn(entry, column);
    if (
      writtenCol !== undefined &&
      this.dmlWrittenNullColumnsFor(entry, scope)?.get(writtenCol) === true
    ) {
      return true;
    }

    const checkExprs =
      entry.scanInh === false
        ? this.catalog.resolveCheckConstraints(entry.table.schema, entry.table.name)
        : this.catalog.resolveCheckConstraintsTree(entry.table.schema, entry.table.name);
    const core = [
      ...(scope.whereClause ? [scope.whereClause] : []),
      ...(scope.havingClause ? [scope.havingClause] : []),
      ...scope.impliedQuals,
      ...this.qualsHoldingWhenPresent(entry, scope),
    ];
    const guards = this.kernelGuardPreds(scope);
    // A DML statement has two stored rows per returned row, and RETURNING
    // reads the NEW one. So this is the non-null path's NEW-row channel and
    // only that: core facts tested the OLD row and transfer through non-SET
    // columns (hence the mask), guard facts describe the row the guarded
    // expression reads, which here is NEW (hence not). The OLD-row channel
    // is a second derivation of the same value for non-SET columns; a first
    // cut needs one, and the unmasked one would be unsound.
    const setCols =
      scope.dmlSetColumns?.alias === entry.alias ? scope.dmlSetColumns.columns : null;
    const evidence =
      !setCols || this.dmlOldRowRead
        ? [...core, ...guards].map(pred => ({ pred, applySetMask: false }))
        : [
            ...core.map(pred => ({ pred, applySetMask: true })),
            ...guards.map(pred => ({ pred, applySetMask: false })),
          ];
    if (evidence.length === 0) return false;
    return checkConstraintsProveNull({
      evaluatedComparison: this.comparisonOracle(),
      btreeStrategy: this.btreeStrategySupply(),
      equalityComplement: this.equalityComplementSupply(),
      goal: { alias: entry.alias, column },
      checkExprs: checkExprs.map(c => this.qualifyColumnRefs(c, entry.alias, entry)),
      evidence,
      isMasked: (alias, col) => !!setCols && alias === entry.alias && setCols.has(col),
      resolveUnqualified: col => {
        let owner: string | null = null;
        for (const v of scope.visible) {
          if (v.name !== col) continue;
          if (!v.entry || owner) return null;
          owner = v.entry.alias;
        }
        return owner;
      },
      columnTypeName: (alias, col) => this.kernelColumnTypeName(alias, col, scope),
      literalDistinctnessSound: (alias, col) =>
        this.kernelLiteralDistinctnessSound(alias, col, scope),
    });
  }

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

    // --- The statement map: a closed subtree's answer decides it whole ---
    // Closure means no row, guard, parameter or session state can move the
    // value, so the map hit is exact wherever the walk meets the node. Only
    // `isNull` is read: non-null claims notNull, an evaluated NULL keeps
    // today's word (nullable — now exactly true) without walking children.
    const answered = this.evaluation?.get(expr);
    if (answered !== undefined) {
      trace.addFact("statementMap", answered.isNull ? "NULL" : "non-null");
      trace.conclude(
        !answered.isNull,
        answered.isNull
          ? "closed subtree evaluated to NULL"
          : "closed subtree evaluated non-null",
      );
      return !answered.isNull;
    }

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
      // The execution-time twin: the parameter lands in a rejecting site on
      // EVERY path of this DML statement that can produce a returned row, so
      // the row in hand is itself the proof the binding was not NULL. Scoped
      // to the statement, unlike the Bind fact — see the Scope field.
      if (this.returningRejectsParam(num, scope)) {
        trace.addFact("param", `$${num}`);
        trace.addFact("returningRejected", "every row-producing path writes it into a NOT NULL site");
        trace.conclude(
          true,
          `$${num} rejects NULL on every path that returns a row, so this row proves it non-null`,
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
      if (narrowingPreds.some(p => this.whereImpliesParamNotNull(p, num, scope))) {
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
      // "The search path resolves to nothing" was recorded as a state no
      // fixture could arrange, and it is one the ENGINE OPTION decides: the
      // walk resolves every unqualified name through that path already, so
      // asking whether any schema on it exists is a question it is entitled to
      // (2026-08-22). PostgreSQL returns the first EXISTING schema and NULL
      // when none of them exists — measured, `SET search_path TO nosuch` gives
      // NULL and `nosuch, public` gives `public`, which is why the test is
      // "some schema exists" and not "the first one does".
      const svf = node["SQLValueFunction"] as { op?: string };
      const op = svf.op ?? "";
      trace.addFact("op", op);
      const notNull =
        op !== "SVFOP_CURRENT_SCHEMA" || this.catalog.searchPathResolves();
      trace.conclude(notNull, op !== "SVFOP_CURRENT_SCHEMA"
        ? "SQL value function is always defined"
        : notNull
          ? "a schema on the analysis search path exists → CURRENT_SCHEMA has an answer"
          : "no schema on the analysis search path exists → CURRENT_SCHEMA is NULL");
      return notNull;
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
      // A cast does NOT simply preserve its argument's nullability, and the
      // counterexamples are ordinary values rather than exotica:
      // `'infinity'::timestamp::time` and `'null'::jsonb::int4` are both
      // NULL from wholly non-null input. The cast's IMPLEMENTATION function
      // is what decides, so this asks the same verdict tables the function
      // dispatch asks — via pg_cast, so every NULL-capable cast is answered
      // rather than a curated list of the ones somebody noticed.
      //
      // `unknown` (a pair pg_cast does not carry — a user-defined cast, or a
      // source type the walk cannot name) keeps the old reading: this
      // narrows a wrong claim, it does not withdraw every cast's claim.
      const childTrace = trace.addChild("TypeCast: arg");
      const result = this.walkExprTraced(tc.arg, scope, depth + 1, childTrace);
      if (result && tc.typeName?.names) {
        const target = this.stringVal(tc.typeName.names[tc.typeName.names.length - 1]!);
        const sources = this.operandTypeSet(tc.arg, scope, depth + 1);
        const cast = this.catalog.resolveCastTotality(sources, target);
        trace.addFact("castSource", sources?.join("|") ?? "unknown");
        trace.addFact("castTotality", cast);
        if (cast === "nullable") {
          trace.conclude(false, `the cast to ${target} can return NULL for non-null input`);
          return false;
        }
      }
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
      // The simple form `CASE x WHEN 1 THEN ...` compares values rather than
      // evaluating predicates, so its WHEN expressions are not conditions and
      // contribute no guards — and the statement map cannot prune its arms
      // either (the comparisons are implicit, not AST nodes the map keys).
      const simpleForm = !!ce.arg;
      const whens = (ce.args ?? []).map(
        arg =>
          (arg as Record<string, unknown>)["CaseWhen"] as
            | { expr?: Node; result?: Node }
            | undefined,
      );

      // Arm pruning from two sources. Statement map (consumer 1): boolean
      // truth of an evaluated guard — FALSE or NULL never fires its arm,
      // everything after a TRUE guard (the ELSE included) never runs, which
      // also rescues a missing ELSE. Atom oracle (the kernel rungs): a
      // guard the CHECK facts refute — notFALSE(a > 5) forbids `a <= 5`
      // ever being TRUE — prunes the same way, though it can only ever say
      // "never fires", so it rescues nothing.
      const truths = whens.map(w => {
        if (simpleForm) return undefined;
        const evaluated = this.evaluatedGuardTruth(w?.expr);
        if (evaluated !== undefined) return evaluated;
        return w?.expr && this.guardRefutedByChecks(w.expr, scope) ? false : undefined;
      });
      const firstTrue = truths.indexOf(true);

      // Without an ELSE branch, an unmatched CASE evaluates to NULL — unless
      // an evaluated guard proves some arm always matches.
      if (!ce.defresult && firstTrue === -1) {
        trace.addFact("hasElse", "false");
        trace.conclude(false, "CASE without ELSE → NULL when no branch matches");
        return false;
      }
      trace.addFact("hasElse", String(!!ce.defresult));
      // With an ELSE, exactly one branch always produces the value, so the
      // result is non-null iff every branch result is non-null — every branch
      // that can still fire, once the map has spoken.
      //
      // Each result is walked under the conditions that must hold for its
      // branch to run: branch i runs when every earlier condition was not TRUE
      // and its own condition was TRUE; the ELSE runs when no condition was
      // TRUE. Those guards let a nullable column read as non-null inside a
      // branch that tested it.
      trace.addFact("caseForm", simpleForm ? "simple (CASE x WHEN v)" : "searched (CASE WHEN cond)");
      const earlierConditions: Node[] = [];

      let i = 0;
      for (const when of whens) {
        if (!when?.result) {
          trace.conclude(false, "CASE branch with no result → nullable");
          return false;
        }
        if (truths[i] === false) {
          // Never fires; its condition still "was not TRUE" for later arms.
          trace.addFact(`WHEN[${i}]`, "guard evaluated not-TRUE → arm pruned");
          if (when.expr) earlierConditions.push(when.expr);
          i++;
          continue;
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
        if (i === firstTrue) {
          trace.conclude(
            true,
            `WHEN[${i}] guard evaluated TRUE → later arms and ELSE never run; ` +
              "every reachable branch non-null → CASE non-null",
          );
          return true;
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
      // An ELEMENT subscript is NULL out of range, and "out of range" is a
      // SHAPE question that a literal `ARRAY[...]` answers: a constructor's
      // lower bound is 1 and its length is what it lists. A constant index
      // inside that range therefore selects a KNOWN element, and the subscript
      // is non-null exactly when that element is — which is why the element is
      // walked rather than assumed. Measured 2026-08-22: `(ARRAY[1,2])[1]` is
      // 1, `(ARRAY[1])[99]` is NULL.
      //
      // ONE index part, no lower bound, not a slice — `(ARRAY[…])[1][2]` steps
      // into a second dimension the constructor's own length says nothing
      // about. Casts are stripped: an array cast is element-wise, so element
      // `k` stays element `k`.
      const lone =
        parts.length === 1
          ? (parts[0] as { A_Indices?: { is_slice?: boolean; lidx?: Node; uidx?: Node } }).A_Indices
          : undefined;
      if (lone && lone.is_slice !== true && lone.uidx && !lone.lidx && ai.arg) {
        const elems = (
          (this.stripCasts(ai.arg) as Record<string, unknown>)["A_ArrayExpr"] as
            | { elements?: Node[] }
            | undefined
        )?.elements;
        const k = this.constantIntegerValue(lone.uidx);
        if (elems && k !== null && k >= 1 && k <= elems.length) {
          const result = this.walkExprTraced(
            elems[k - 1]!, scope, depth + 1, trace.addChild(`subscript: element[${k}]`),
          );
          trace.conclude(
            result,
            result
              ? `a constant index inside a literal ARRAY[...] selects element ${k}, which is non-null`
              : `element ${k} of the literal array is itself nullable`,
          );
          return result;
        }
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
      // is NULL, or when no element matches and some element is NULL. So the
      // elements have to be seen, and there are two ways to see them.
      //
      // A literal `ARRAY[...]` constructor exposes them as AST children. A
      // CLOSED array expression exposes them as a VALUE: the statement map
      // already holds `string_to_array('1,2', ',')::int[]` evaluated, and its
      // `isNull` — the only field the walk read until 2026-08-22 — answers
      // whether the ARRAY is NULL, which is not the question here. The
      // elements were in hand and thrown away. Anything else (a column, a
      // parameter) hides them and stays conservative.
      case "AEXPR_OP_ANY":
      case "AEXPR_OP_ALL": {
        const arrayExpr = (ae.rexpr as Record<string, unknown> | undefined)?.["A_ArrayExpr"] as
          | { elements?: Node[] }
          | undefined;
        const operands = arrayExpr
          ? [ae.lexpr, ...(arrayExpr.elements ?? [])]
          : this.evaluatedArrayHasNoNullElement(ae.rexpr)
            ? [ae.lexpr]
            : null;
        if (!operands) {
          trace.conclude(false, "ANY/ALL over an opaque array — elements may be NULL → nullable");
          return false;
        }
        const allNotNull = this.operandsAllNotNull(operands, scope, depth, trace, "operand");
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

        // Read ONCE, per side. Three branches below want these — the typed
        // narrowing, the prefix form, and the bare-name fallback that now
        // eliminates with them — and each operand is a subtree, so reading
        // per branch would walk `a || b || c` twice at every level.
        const lset = ae.lexpr ? this.operandTypeSet(ae.lexpr, scope, depth + 1) : null;
        const rset = ae.rexpr ? this.operandTypeSet(ae.rexpr, scope, depth + 1) : null;

        // Type-aware narrowing first (docs/type-aware-overloads.md, the
        // operator slice): where the operand types are readable, the
        // candidate set — path-visible user operators MERGED with the
        // captured builtin signatures — replaces the bare-name allowlist,
        // which closed the shadowing blind spot and the `path + path`
        // hole. "unknown" falls through to the allowlist path below, whose
        // recorded holes then apply only to the untypeable residue.
        if (ae.lexpr && ae.rexpr) {
          const opSchema2 = qualified ? opNames[opNames.length - 2] : undefined;
          const [lt, rt] = [lset, rset];
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
          const at = rset;
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
          //
          // The operand sets go WITH the name (2026-08-20): reaching here
          // means the typed narrowing found nothing to answer with, not that
          // nothing was known. A readable operand still eliminates — a user
          // `->(boolean, boolean)` cannot be what `jsonb -> 'id'` resolves
          // to — and dispatching an eliminated row analyses the wrong body
          // and claims notNull for an expression that answers NULL
          // (`bare-name-gates-red.test.ts`).
          const opSchema = qualified ? opNames[opNames.length - 2] : undefined;
          const custom = this.catalog.resolveOperatorMetadata(opSchema, op, lset, rset);
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

    // The guard channel's last rung, and the only one that is not a copy of a
    // fixpoint rule: run the fixpoint itself with the branch guards as extra
    // conjuncts, speculatively. The three rungs above stay because they are
    // cheap and answer most cases without building a snapshot.
    if (joinState === OPTIONAL && this.guardedPresence(scope).has(entry.alias)) {
      joinState = REQUIRED;
      trace.addFact("guardedFixpointPromoted", "true (branch guards prove the row exists)");
      trace.addFact("joinStateAfterPromotion", joinStateName(joinState));
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
      const fnCols = this.resolveTableFunctionColumns(entry, scope, depth);
      const index = fnCols.findIndex(c => c.name === colName);
      const col = index >= 0 ? fnCols[index]! : undefined;
      if (!col) {
        trace.conclude(false, `column '${colName}' not found in the function's return type`);
        return false;
      }
      // An `unnest` over an array CONSTRUCTOR is its elements, and they are
      // expressions this scope can read. Asked here rather than in the
      // memoized column list because the answer depends on the presence
      // fixpoint, which runs after the names have to exist.
      if (!col.notNull && this.unnestArrayColumnNotNull(entry, index, scope, depth)) {
        const result = joinState !== OPTIONAL;
        trace.addFact("unnestArrayElements", "true (every element non-null)");
        trace.conclude(result, `unnest column '${colName}' follows its array constructor's elements + join ${joinStateName(joinState)}`);
        return result;
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

        // Two escapes from a nullable inner verdict, both saying the same
        // kind of thing — the inner analysis exported a fact the boolean
        // interface cannot carry, and THIS scope's evidence meets it.
        //
        //   origins: the inner column is a bare pass-through of a base table
        //     column, so the base table's validated CHECKs are in play.
        //   presence groups: the inner column is a discriminant of a group
        //     whose member is pinned here, so the row is present.
        //
        // Ordered origins-first only because that path is older and its
        // trace line is the one existing expectations read; they are
        // independent, and the group arm is the only one a table function
        // can reach (see `presenceGroupPins`).
        const escape = (inner: OutputNullability, index: number): string | null => {
          if (inner.notNull || joinState === OPTIONAL) return null;
          if (
            inner.origins &&
            this.originCheckEntailment(entry, inner.origins, inner.originNotNull, innerResults, outerNames, scope, trace)
          ) {
            return "origin CHECK entailment through the CTE/subquery → notNull";
          }
          const pin = this.presenceGroupPins(entry, index, outerNames, scope);
          return pin === null
            ? null
            : `${pin} is pinned here and shares this column's presence group, ` +
              `so the inner row is present on every returned row → notNull`;
        };

        // Star expansion resolves positionally — the only caller that can
        // reach a duplicate-named inner column, where a name lookup would
        // first-match the wrong one.
        if (ordinal !== undefined) {
          const inner = innerResults[ordinal];
          if (inner) {
            const result = inner.notNull && joinState !== OPTIONAL;
            trace.addFact("innerResult", `${inner.notNull ? "notNull" : "nullable"} (ordinal ${ordinal})`);
            const why = result ? null : escape(inner, ordinal);
            if (why) {
              trace.conclude(true, why);
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
            const why = result ? null : escape(inner, colIndex);
            if (why) {
              trace.conclude(true, why);
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
            const why = result ? null : escape(col, innerResults.indexOf(col));
            if (why) {
              trace.conclude(true, why);
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
          const why = result ? null : escape(col, innerResults.indexOf(col));
          if (why) {
            trace.conclude(true, why);
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
              evaluatedComparison: this.comparisonOracle(),
              btreeStrategy: this.btreeStrategySupply(),
              equalityComplement: this.equalityComplementSupply(),
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
              comparisonEvaluable: (alias, col, op) => {
                const e = scope.aliases.get(alias);
                const cat = e ? this.entryCatalogColumn(e, col) : undefined;
                return e?.table && cat !== undefined
                  ? this.comparisonOpEvaluable(e.table.schema, e.table.name, cat, op)
                  : false;
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
    goalIsNull = false,
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
          ? this.originAlternativeEntailment(
              entry, o, k, innerResults, outerNames, scope, trace, goalIsNull,
            )
          : // A slot with no origin is a literal or an expression branch.
            // For a non-null goal its own flat verdict settles it; there is
            // no `originAlwaysNull` channel to answer the mirror, so a null
            // goal declines rather than guesses.
            !goalIsNull && goalSettled?.[k] === true,
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
    goalIsNull = false,
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
    //
    // Both shortcuts below conclude NON-NULL, so both are gated on the goal.
    // Reading their boolean as "proved the goal" while the goal was NULL was
    // a real unsoundness for the half-day it existed: `agg.order_id` under
    // `LEFT JOIN (SELECT order_id, count(*) …) agg` came back alwaysNull
    // because order_items.order_id is catalog NOT NULL and the origin — read
    // straight off the inner analysis, before the entry's own optionality is
    // lifted in — looked REQUIRED. Caught by the `@alwaysNull` annotation
    // gate on its first run, which is the case for making that gate
    // bidirectional.
    if (!goalIsNull && !goalOrigin.optional && givenPresent) {
      trace.addChild(`origin ${goalOrigin.schema}.${goalOrigin.table}.${goalOrigin.column}`)
        .conclude(true, "required alternative + non-null per stored row");
      return true;
    }
    // An OPTIONAL chain with such a goal has a derivation even with no
    // CHECKs at all: evidence-proven presence settles it (the
    // presence-consumption closure — the kernel's short-circuit).
    const goalNotNullGivenPresent = !goalIsNull && goalOrigin.optional && givenPresent;
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
    const ask = goalIsNull ? checkConstraintsProveNull : checkConstraintsProveNotNull;
    const proved = ask({
      evaluatedComparison: this.comparisonOracle(),
      btreeStrategy: this.btreeStrategySupply(),
      equalityComplement: this.equalityComplementSupply(),
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
      //
      // A NULL goal does not want the gate, and the case-split is the same
      // one the outer-join quals rest on: where presence is UNPROVEN the row
      // may be absent, and an absent row nulls the column outright. So the
      // rows the CHECK facts cannot speak for are the rows that answer
      // themselves. Passing it would refuse exactly those.
      presenceColumns:
        goalOrigin.optional && !goalIsNull
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
      comparisonEvaluable: (alias, col, op) => {
        if (alias === entry.alias) {
          return this.comparisonOpEvaluable(goalOrigin.schema, goalOrigin.table, col, op);
        }
        const e = scope.aliases.get(alias);
        return e?.table
          ? this.comparisonOpEvaluable(e.table.schema, e.table.name, col, op)
          : false;
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
      if (g.taken && this.whereImpliesAliasNotNull(g.predicate, alias, scope)) return true;
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
        return this.exprStrictlyForces(
          nt.arg,
          leaf => this.columnMatches(leaf, alias, colName, scope),
          scope,
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
   * Find another relation in `entry`'s null group whose WHERE predicate or
   * branch guard proves the group's row exists, or null if there is none.
   *
   * Sound because a null group is NULL-extended atomically: every member is
   * present, or the whole composite row is absent.
   *
   * The guard arm is the same evidence one branch narrower — it holds where
   * the guard holds, which is exactly where this call is made (the guard
   * stack is live only inside the branch being walked). Its absence was the
   * second half of what kept `CASE WHEN t.active THEN u.email` nullable under
   * `(t INNER u) RIGHT v`: the per-alias rung above consults both channels,
   * this one consulted only the WHERE, so a guard could promote `t` and the
   * promotion had no way to reach `u`.
   */
  private findNullGroupPromoter(entry: RelationEntry, scope: Scope): string | null {
    for (const other of scope.aliases.values()) {
      if (other === entry) continue;
      if (other.nullGroup !== entry.nullGroup) continue;
      if (this.checkWhereAliasPromoted(other.alias, scope)) return other.alias;
      if (this.guardsPromoteAlias(other.alias, scope)) return other.alias;
    }
    return null;
  }

  /**
   * The aliases the live branch guards prove PRESENT — the guard channel's
   * answer to the question the presence fixpoint answers for the WHERE.
   *
   * The three rungs above this one (`guardsImplyNotNull`,
   * `guardsPromoteAlias`, `findNullGroupPromoter`) are hand-copies of three
   * of the fixpoint's rules, one rule each. What no copy of that kind could
   * reach is the rule that is not a predicate test at all but the fixpoint's
   * own loop: presence ACTIVATES a join, the join's qual becomes an implied
   * qual of the scope, that qual proves another relation present, and that
   * activates the next join. In `(t k u) k v` with the guard `t.active`, it
   * is what carries `t` present to `u.t_id = t.id` to `u` present to
   * `u.email` notNull.
   *
   * Measured on the generated corpus's `CASE WHEN t.active THEN u.email ELSE
   * 'e' END`: `WHERE t.active` reads notNull on every one of the twelve
   * structures that once left it nullable, and the identical predicate as a
   * branch guard read nullable on five. Same predicate, same aliases; only
   * the position differed.
   *
   * Copying THAT is not a fourth rung — it is the activation table for four
   * join types, its interaction with `incomingRequired`, and the iteration
   * to a fixed point. And it would still leave foreign-key entailment,
   * `incomingRequired` propagation and the participation closure reachable
   * from a WHERE and not from a branch. So the guard runs the fixpoint
   * rather than paraphrasing it.
   *
   * An earlier draft of this comment claimed those five split into TWO
   * routes, the `t k (u k v)` half reached by the participation closure's
   * `dissolveUnit` instead of by activation. That was a misread of a trace:
   * dissolution does fire first there, so it is what the log shows, but
   * suppressing it under speculation changes no verdict in any of the 32
   * nestings — activation reaches the same aliases a beat later. The claim
   * is recorded because it was measurable and wrong, and because the
   * mutation that disproved it (`if (this.speculating) continue` at the
   * `dissolveUnit` call, with the loop's `changed = true` skipped too, or
   * the fixpoint never converges) is the one to repeat before believing any
   * future route story.
   *
   * Sound for the same reason the rungs above are: a taken guard holds on
   * every row that reaches the branch, and the promotion is consulted only
   * while that branch is being walked — the guard stack is live exactly
   * there. What makes it safe is `withSpeculativeScope`: the fixpoint
   * mutates the scope, and every mutation is undone before the answer is
   * returned, so nothing outside the branch ever sees the widened state.
   */
  private guardedPresence(scope: Scope): Set<string> {
    // No nesting: the fixpoint's helpers can reach back into the walk, and a
    // speculation started inside one would restore into widened state.
    if (this.speculating) return new Set();
    const preds = this.guardPredicates(scope);
    if (preds.length === 0) return new Set();
    return this.withSpeculativeScope(scope, () => {
      this.resolveJoinImplications(scope, preds);
      const promoted = new Set<string>();
      for (const [alias, entry] of scope.aliases) {
        if (entry.joinState === REQUIRED) promoted.add(alias);
      }
      return promoted;
    });
  }

  /**
   * The live guards for `scope`, as conjuncts the fixpoint can consume.
   *
   * A TAKEN guard's predicate held, so it goes in unchanged — same evidence
   * as a WHERE conjunct, one branch narrower.
   *
   * A NOT-TAKEN guard is "not TRUE", which is not a predicate at all: a
   * branch is skipped when its condition is FALSE *or* NULL, so `a > 5`
   * failing says nothing (see `falsityImpliesNotNull`). The one shape that
   * does say something is the one that cannot be NULL — `X IS NULL` is TRUE
   * or FALSE and never NULL, so reaching the ELSE proves it was FALSE, i.e.
   * `X IS NOT NULL`. Flipping the polarity turns that into a real conjunct
   * and gives the ELSE channel the fixpoint's full reach rather than the
   * narrow reading `falsityPromotesAlias` has. An OR of such tests is
   * likewise total, and an OR that is not TRUE has NO true disjunct, so
   * every disjunct's flip holds — they are conjuncts, not a disjunction.
   */
  private guardPredicates(scope: Scope): Node[] {
    const preds: Node[] = [];
    const addFalsified = (predicate: Node): void => {
      const node = predicate as Record<string, unknown>;
      if ("NullTest" in node) {
        const nt = node["NullTest"] as { arg?: Node; nulltesttype?: string };
        if (nt.nulltesttype === "IS_NULL" && nt.arg) {
          preds.push({ NullTest: { arg: nt.arg, nulltesttype: "IS_NOT_NULL" } } as Node);
        }
        return;
      }
      if ("BoolExpr" in node) {
        const be = node["BoolExpr"] as { boolop?: string; args?: Node[] };
        if (be.boolop === "OR_EXPR") for (const arg of be.args ?? []) addFalsified(arg);
      }
    };
    for (const g of this.guards) {
      if (g.scope !== scope) continue;
      if (g.taken) preds.push(g.predicate);
      else addFalsified(g.predicate);
    }
    return preds;
  }

  /**
   * Run `fn` with the scope's presence state restorable, and restore it.
   *
   * The presence fixpoint writes to four places, and all four are undone
   * here: `joinState`, `nullGroup` and `unitChain` per entry,
   * `incomingRequired` per join, and the append-only `scope.impliedQuals`.
   *
   * `unitChain` is snapshotted BY REFERENCE deliberately. Sibling entries of
   * one join side share the chain ARRAY (`walkFromItem` threads it through),
   * and `dissolveUnit` reassigns rather than splices precisely so that a
   * dissolution for one member does not strand the rest — the same property
   * makes restoring the reference exact. If dissolution is ever changed to
   * mutate in place, this restore silently stops working and the corpus's
   * no-guards canary (identical counts with the rung present) is what would
   * catch it.
   */
  private withSpeculativeScope<T>(scope: Scope, fn: () => T): T {
    const entries = [...scope.aliases.values()].map(e => ({
      entry: e,
      joinState: e.joinState,
      nullGroup: e.nullGroup,
      unitChain: e.unitChain,
    }));
    const joins = scope.joins.map(j => ({ join: j, incomingRequired: j.incomingRequired }));
    const impliedCount = scope.impliedQuals.length;
    const wasSpeculating = this.speculating;
    this.speculating = true;
    try {
      return fn();
    } finally {
      this.speculating = wasSpeculating;
      for (const s of entries) {
        s.entry.joinState = s.joinState;
        s.entry.nullGroup = s.nullGroup;
        s.entry.unitChain = s.unitChain;
      }
      for (const s of joins) s.join.incomingRequired = s.incomingRequired;
      scope.impliedQuals.length = impliedCount;
    }
  }

  /**
   * Check if the WHERE clause has any predicate (in an AND-conjunct) that
   * references any qualified column from the given alias. If so, the alias
   * is promoted from OPTIONAL to REQUIRED (the outer join effectively
   * becomes INNER).
   */
  private checkWhereAliasPromoted(alias: string, scope: Scope): boolean {
    if (!scope.whereClause) return false;
    return this.whereImpliesAliasNotNull(scope.whereClause, alias, scope);
  }

  /**
   * Walk the WHERE subtree looking for any predicate that references any
   * qualified column from `alias` (in AND-conjuncts only). Detected
   * patterns: IS NOT NULL, comparison (=, >, IN, ...). Only qualified
   * ColumnRefs (alias.col) are matched — unqualified columns can't be
   * attributed to an alias without knowing all columns.
   */
  private whereImpliesAliasNotNull(
    whereClause: Node,
    alias: string,
    scope: Scope | null = null,
  ): boolean {
    return this.predicateProvesNonNull(
      whereClause,
      n => this.exprStrictlyForces(n, leaf => this.columnRefMatchesAlias(leaf, alias), scope),
      scope,
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
  private whereImpliesParamNotNull(
    clause: Node,
    num: number,
    scope: Scope | null = null,
  ): boolean {
    return this.predicateProvesNonNull(
      clause,
      n => forcedNullParams(n, this.catalog).has(num),
      scope,
    );
  }

  private whereImpliesNotNull(
    whereClause: Node,
    alias: string,
    colName: string,
    scope: Scope,
  ): boolean {
    return this.predicateProvesNonNull(
      whereClause,
      n =>
        this.exprStrictlyForces(n, leaf => this.columnMatches(leaf, alias, colName, scope), scope),
      scope,
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
   *   - A bare boolean predicate (`WHERE t.active`, `CASE WHEN t.active`):
   *     the strict-comparison case without the comparison. A predicate steers
   *     its row or branch only by being TRUE, and TRUE is not NULL, so
   *     whatever the predicate strictly depends on is non-null.
   */
  private predicateProvesNonNull(
    pred: Node,
    forces: (expr: Node) => boolean,
    scope: Scope | null = null,
  ): boolean {
    const node = pred as Record<string, unknown>;

    if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as { boolop?: string; args?: Node[] };
      const args = be.args ?? [];
      if (be.boolop === "AND_EXPR") {
        return args.some(arg => this.predicateProvesNonNull(arg, forces, scope));
      }
      if (be.boolop === "OR_EXPR") {
        return args.length > 0 && args.every(arg => this.predicateProvesNonNull(arg, forces, scope));
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
            this.promotionOperatorIsStrict(ae.name, ae.lexpr, ae.rexpr, scope) &&
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

    // A predicate that IS a column, no operator around it. Restricted to a
    // ColumnRef rather than delegating every unrecognised shape to `forces`:
    // the enumeration above is what keeps a node the closure misreads from
    // silently proving something, and a boolean column is the one bare shape
    // measured to cost claims (`CASE WHEN t.active THEN u.email`, 2026-08-22).
    if ("ColumnRef" in node) return forces(pred);

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
  private exprStrictlyForces(
    expr: Node,
    leaf: (columnRef: Node) => boolean,
    scope: Scope | null = null,
  ): boolean {
    const node = expr as Record<string, unknown>;

    if ("ColumnRef" in node) return leaf(expr);

    // A CONSTANT is asked of `leaf` rather than answered here. A NULL
    // constant does satisfy the contract outright — it is NULL whenever
    // anything is — but concluding that unilaterally would widen every
    // caller, and "vacuously sound" is not a reason to move a helper the
    // promotion machinery rests on. Delegating changes nothing for the two
    // column-side callers, whose predicates (`columnMatches`,
    // `columnRefMatchesAlias`) reject a non-ColumnRef node outright; the
    // always-null caller is the one that says yes.
    if ("A_Const" in node) return leaf(expr);

    if ("TypeCast" in node) {
      const arg = (node["TypeCast"] as { arg?: Node }).arg;
      return !!arg && this.exprStrictlyForces(arg, leaf, scope);
    }

    if ("A_Expr" in node) {
      const ae = node["A_Expr"] as { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node };
      if (ae.kind === "AEXPR_OP") {
        return (
          this.promotionOperatorIsStrict(ae.name, ae.lexpr, ae.rexpr, scope) &&
          [ae.lexpr, ae.rexpr].some(o => !!o && this.exprStrictlyForces(o, leaf, scope))
        );
      }
      if (ae.kind === "AEXPR_NULLIF") {
        return !!ae.lexpr && this.exprStrictlyForces(ae.lexpr, leaf, scope);
      }
      return false;
    }

    if ("CoalesceExpr" in node) {
      const args = (node["CoalesceExpr"] as { args?: Node[] }).args ?? [];
      return args.length > 0 && args.every(a => this.exprStrictlyForces(a, leaf, scope));
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
      return strict && args.some(a => this.exprStrictlyForces(a, leaf, scope));
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
    const unionArm = singleRow || keyed ? false : this.unionArmEntailsNonEmpty(select);
    trace.addFact("keyEntailedNonEmpty", String(keyed));
    trace.addFact("unionArmNonEmpty", String(unionArm));
    if (!singleRow && !keyed && !unionArm) {
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
   * Whether a scalar subquery provably returns AT LEAST ONE ROW because a
   * UNION branch does.
   *
   *   (SELECT count(*) FROM reviews r WHERE r.product_id = p.id UNION SELECT 7)
   *
   * A UNION is non-empty as soon as ONE branch is: deduplication removes
   * duplicates, never the last row. So a branch that is itself exactly-one — a
   * bare `SELECT 7` — settles the whole node whatever the other branch scans,
   * and no fact about the scanned relation is needed. INTERSECT and EXCEPT are
   * rejected because either can delete every row the left branch produced,
   * which is what `except_empties` and `intersect_empties` witness.
   *
   * At-least-one is the right predicate here for the same reason it is in
   * `subqueryKeyEntailedNonEmpty` below: several rows RAISE rather than
   * evaluating to NULL, and a raise returns nothing to contradict anything.
   *
   * This settles the ROW COUNT only. What that row CONTAINS is
   * `combineSetOperation`'s answer, and it takes the AND across branches — so
   * `SELECT NULL UNION SELECT NULL` is guaranteed its row and still nullable,
   * decided by the branches rather than by the count.
   *
   * LIMIT and OFFSET sit on the set-operation node itself and can strip the
   * row back off after the union produced it, so they are rejected here rather
   * than inside a branch.
   */
  private unionArmEntailsNonEmpty(select: SelectStmt): boolean {
    if (select.op !== "SETOP_UNION") return false;
    if (select.limitCount || select.limitOffset) return false;
    // `A UNION B UNION C` nests to the left, so a branch may be a set
    // operation in its own right and answers for itself.
    return [select.larg, select.rarg].some(
      arm => !!arm && (this.guaranteesSingleRow(arm) || this.unionArmEntailsNonEmpty(arm)),
    );
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
      // Typed dispatch over the kind='w' rows, keyed by SIGNATURE — the
      // re-key that lets `lag(x, 1, 0)` claim what `lag(x)` may not.
      // Named notation breaks the positional lineup and skips it, exactly
      // as on the scalar side.
      const winArgs = fc.args ?? [];
      if (!winArgs.some(a => "NamedArgExpr" in (a as Record<string, unknown>))) {
        const winTypes = winArgs.map(a => this.operandTypeSet(a, scope, depth + 1));
        const win = this.catalog.resolveBuiltinWindowTotality(schema, name, winTypes);
        if (win.kind === "always") {
          trace.addFact("priority", "2b (window row, never NULL, signature-narrowed)");
          trace.conclude(true, `${name}() assigns a value to every row → never NULL`);
          return true;
        }
        if (win.kind === "strict-total") {
          trace.addFact("priority", "2b (window row, total over non-null args, signature-narrowed)");
          trace.addFact("argsNotNull", `[${argResults.map(r => (r ? "T" : "F")).join(", ")}]`);
          const result = argResults.length > 0 && argResults.every(r => r);
          trace.conclude(result, result
            ? `every surviving signature of ${name}() over is total: non-null arguments → non-null result`
            : `${name}() over has a nullable argument → nullable`);
          return result;
        }
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
      return this.resolveAggregateTraced(fc, name, argResults, meta, scope, depth, trace);
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
      // `array_length` is excluded from the totality tables because it is NULL
      // for an EMPTY array or a dimension the array does not have. Both causes
      // are SHAPE rather than value, and a literal `ARRAY[...]` constructor
      // settles both: it has exactly the elements it lists, so a non-empty one
      // has a dimension 1 of that length. Measured 2026-08-22 —
      // `array_length(ARRAY[1,2], 1)` is 2, `array_length(ARRAY[]::int[], 1)`
      // is NULL, and `array_length(ARRAY[NULL::int], 1)` is 1, which is the
      // half worth pinning: the ELEMENTS' nullness is not this function's
      // question, so no operand walk enters the rule.
      //
      // Casts are stripped because an array cast changes neither length nor
      // dimension. Dimension 1 only, and a literal one: `array_length(x, 2)`
      // of a flat array is NULL, so a non-constant dimension proves nothing.
      // `array_ndims` is the obvious sibling and is deliberately absent — it
      // has no claim in the corpus, and a rule nothing can falsify is not
      // coverage.
      if (name === "array_length" && (fc.args?.length ?? 0) === 2) {
        const elems = (
          (this.stripCasts(fc.args![0]!) as Record<string, unknown>)["A_ArrayExpr"] as
            | { elements?: Node[] }
            | undefined
        )?.elements;
        if (elems && elems.length > 0 && this.constantIntegerValue(fc.args![1]!) === 1) {
          trace.addFact("priority", "6b (built-in, array_length of a literal array)");
          trace.conclude(true, "a non-empty ARRAY[...] has a dimension 1 → array_length is non-null");
          return true;
        }
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
            const srf = this.strictSrfIgnoresArgumentNullness(schema, name);
            const result = argResults.every(r => r) || srf;
            trace.conclude(result, !result
              ? `${name}() has a nullable argument → nullable`
              : srf && !argResults.every(r => r)
                ? `${name}() is a strict SRF: a nullable argument subtracts ROWS, not values`
                : `every surviving signature of ${name}() is total: non-null arguments → non-null result`);
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
        const srf = this.strictSrfIgnoresArgumentNullness(schema, name);
        const result = argResults.every(r => r) || srf;
        trace.conclude(result, !result
          ? `${name}() has a nullable argument → nullable`
          : srf && !argResults.every(r => r)
            ? `${name}() is a strict SRF: a nullable argument subtracts ROWS, not values`
            : `${name}() is total: non-null arguments → non-null result`);
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
  /**
   * Whether `expr` is a CLOSED array expression the statement map evaluated to
   * an array holding no NULL anywhere in it.
   *
   * CASTS are stripped before the lookup, and have to be: the collector takes
   * MAXIMAL closed subtrees and `string_to_array('1,2', ',')::int[]` collects
   * as the FuncCall inside, not as the cast around it, so the map holds the
   * pre-cast value. That is the right value to read anyway — an array cast is
   * element-wise, so it turns no NULL into a value and no value into a NULL.
   *
   * The recursion is the point rather than tidiness: a multidimensional array
   * arrives as nested JS arrays, `= ANY` compares against every leaf, and a
   * one-level check would call `{{1,2},{3,NULL}}` clean. Anything the driver
   * did not parse into an array (a raw `'{1,2}'` string, a scalar) is not an
   * answer and claims nothing.
   */
  private evaluatedArrayHasNoNullElement(expr: Node | undefined): boolean {
    if (!expr) return false;
    const answered = this.evaluation?.get(this.stripCasts(expr));
    if (!answered || answered.isNull) return false;
    const clean = (v: unknown): boolean =>
      Array.isArray(v) ? v.every(clean) : v !== null && v !== undefined;
    return Array.isArray(answered.value) && clean(answered.value);
  }

  private resolveAggregateTraced(
    fc: FuncCall,
    name: string,
    argResults: boolean[],
    meta: FunctionInfo | null,
    scope: Scope,
    depth: number,
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

    // A user-defined aggregate has no name to curate, and a body to read
    // instead. FILTER and the non-empty group are the same gates as above:
    // both decide whether anything transitions at all, which is upstream of
    // what the transition does.
    if (
      scope.groupGuaranteesNonEmpty &&
      !hasFilter &&
      meta &&
      this.aggregateFoldKeepsStateNonNull(meta, scope, depth, trace)
    ) {
      trace.conclude(true, `${name}()'s INITCOND is non-null and its fold preserves that`);
      return true;
    }

    trace.conclude(false, "aggregate returns NULL over zero rows");
    return false;
  }

  /**
   * Whether a USER-DEFINED aggregate's result is non-null over a NON-EMPTY
   * group, read from the bodies it folds through.
   *
   * `NON_NULL_OVER_NONEMPTY_AGGREGATES` answers for builtins by name, one
   * curated entry measured on admission. A user aggregate has no name worth
   * curating — but it does have an analysable SQL body, and `fnBodyAsts` has
   * held that body all along, because a transition function is an ordinary
   * function and gets parsed like one. What was missing was the LINK: nothing
   * recorded WHICH function an aggregate transitions through, so the walk had
   * a fact it could not ask for. `aggTransFn` is that link and nothing more.
   *
   * The induction, one gate per step, each with its own control in schema.sql:
   *
   *   - THE STATE STARTS NON-NULL. `agginitval` is the initial state, so a
   *     non-null INITCOND settles it — `gfn_noinit` and `nn_agg` declare none
   *     and stop here. PostgreSQL has a second route (no INITCOND plus a
   *     strict transition makes the first input value the initial state) and
   *     it is deliberately NOT taken: it turns on whether every input in the
   *     group is NULL, which is a different question from this one and would
   *     need its own gate. Left unbuilt rather than assumed.
   *   - THE TRANSITION PRESERVES IT. Walk the body with the state argument
   *     assumed non-null and every value argument assumed NULL — the WEAKEST
   *     hypothesis the induction can close under, so a body that leans on its
   *     input rather than on its state does not qualify. `nullify_sfunc`
   *     returns NULL outright and stops here.
   *   - THE FINAL FUNCTION PRESERVES IT, when there is one. Same walk, same
   *     hypothesis. `final_null` stops here; `count_it` has no FINALFUNC at
   *     all, where the accumulated state IS the result.
   *
   * Then every step of the fold takes a non-null state to a non-null state,
   * and the fold's output is the result. That the group is non-empty stays
   * the CALLER's gate: over zero rows nothing transitions and the INITCOND
   * answers alone, which is a different claim with a different proof.
   */
  private aggregateFoldKeepsStateNonNull(
    meta: FunctionInfo,
    scope: Scope,
    depth: number,
    trace: ITrace,
  ): boolean {
    if (!meta.isAggregate) return false;
    trace.addFact("aggInitVal", meta.aggInitVal ?? "none");
    if (meta.aggInitVal === null) return false;

    if (!meta.aggTransFn) return false;
    if (!this.aggregateStepKeepsNonNull(meta.aggTransFn, scope, depth, trace)) return false;

    // No FINALFUNC means the state is returned as it stands.
    if (!meta.aggFinalFn) return true;
    return this.aggregateStepKeepsNonNull(meta.aggFinalFn, scope, depth, trace);
  }

  /**
   * Walk one fold step's body under the induction hypothesis: its FIRST input
   * parameter is the state and is assumed non-null, every other parameter is
   * assumed NULL.
   *
   * The catalog recorded an exact SIGNATURE and this resolves it by NAME,
   * which is a real narrowing and the reason it is written down here.
   * `resolveFunctionMetadata` cannot pick among overloads — it takes no
   * argument types — so it answers null for any overloaded name, and an
   * aggregate whose transition name is overloaded is REFUSED whichever
   * overload it actually declares. Conservative, never unsound, and it costs
   * nothing in practice: a transition function shares its name with another
   * function only by accident.
   *
   * The signature comparison below is therefore UNREACHABLE, measured rather
   * than assumed — with both of the adapter's body-map guards lifted the
   * resolver still answers null, so nothing gets past it to compare. It stays
   * as the assertion of the invariant the caller depends on: that the body
   * being walked is the body the catalog named. Lifting it is what a
   * signature-keyed metadata lookup would need to be checked against, and
   * that lookup is the thing that would make overloaded transitions readable.
   *
   * `agg_ambiguous` in `aggregate-transition-fold.sql` pins the OUTCOME
   * independently of which layer produces it: its two overloads disagree, the
   * declared one returns NULL, and reaching for the other would claim notNull
   * where PostgreSQL answers NULL.
   */
  private aggregateStepKeepsNonNull(
    key: string,
    scope: Scope,
    depth: number,
    trace: ITrace,
  ): boolean {
    const parts = /^([^.()]+)\.([^.()]+)\((.*)\)$/.exec(key);
    if (!parts) return false;
    const meta = this.catalog.resolveFunctionMetadata(parts[1]!, parts[2]!);
    if (!meta || `${meta.schema}.${meta.name}(${meta.argTypes})` !== key) {
      trace.addFact("aggStepUnresolved", key);
      return false;
    }
    const hypothesis = meta.args
      .filter(a => a.mode === "in" || a.mode === "inout")
      .map((_, i) => i === 0);
    trace.addFact("aggStep", `${key} [${hypothesis.map(h => (h ? "T" : "F")).join(", ")}]`);
    return this.resolveSqlFunctionBodyTraced(meta, hypothesis, scope, depth + 1, trace);
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
    this.fnCtx = prevCtx
      ? // No names: a default expression is evaluated in no function context,
        // which is why `fnParamNames` goes null just below. `argTypes` stays
        // only because `$n` there is already refused by the empty argResults.
        { argResults: [], analyzing: prevCtx.analyzing, argTypes: prevCtx.argTypes, argNames: [] }
      : null;
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
  /**
   * A STRICT SET-RETURNING builtin's totality does not depend on its arguments
   * being non-null, because a NULL argument makes it produce NO ROWS rather
   * than a row holding NULL — so there is nothing left to carry a NULL, and
   * the totality verdict stands whatever the arguments are.
   *
   * `callCanShortCircuit` below already records exactly this and excludes
   * `returnsSet` for it ("a claim about columns of rows that do not exist
   * cannot be contradicted"). The totality branches did not consult it, and
   * applied the SCALAR premise — every argument non-null — to a call where
   * argument nullness cannot reach the output. That is the imprecision
   * docs/sqlc-disagreements.md records for `pg_generate_series/GenerateSeries`.
   *
   * Strictness is the load-bearing half: a NON-strict SRF handed NULL runs its
   * body and may emit rows with NULLs in them.
   *
   * `ROWS FROM` is the neighbouring shape that must NOT move — there a longer
   * arm supplies rows the strict SRF did not and the PADDING makes its columns
   * nullable, which is a different rule applied elsewhere
   * (rowsfrom-pad-strict-srf.sql pins it).
   */
  private strictSrfIgnoresArgumentNullness(
    schema: string | undefined,
    name: string,
  ): boolean {
    return (
      (schema === undefined || schema === "pg_catalog") &&
      this.catalog.isSetReturningBuiltin(name) &&
      this.catalog.isStrictBuiltin(name)
    );
  }

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

    const fnKey = `${meta.schema}.${meta.name}(${meta.argTypes})`;
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
      // Input parameters only: a SQL body numbers `$n` over the INPUTS,
      // so an interleaved OUT parameter must not shift the positions.
      argTypes: meta.args
        .filter(a => a.mode === "in" || a.mode === "inout")
        .map(a => a.typeName),
      argNames: meta.args
        .filter(a => a.mode === "in" || a.mode === "inout")
        .map(a => a.name),
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
   *   - `LANGUAGE sql` only, single candidate only. The caller reaches this
   *     only through `resolveFunctionMetadata`, whose single-candidate
   *     shortcut refuses any overloaded name. That shortcut used to be what
   *     made the body map's key unambiguous as well — the key was
   *     `schema.name` and an overloaded name's entries collided; since
   *     2026-08-22 the key is the full signature, so the single-candidate
   *     bound here is about which BODY may speak for a call, not about which
   *     body the map can find.
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

    const fnKey = `${meta.schema}.${meta.name}(${meta.argTypes})`;
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
      // Input parameters only: a SQL body numbers `$n` over the INPUTS,
      // so an interleaved OUT parameter must not shift the positions.
      argTypes: meta.args
        .filter(a => a.mode === "in" || a.mode === "inout")
        .map(a => a.typeName),
      argNames: meta.args
        .filter(a => a.mode === "in" || a.mode === "inout")
        .map(a => a.name),
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
    // A GroupingSet term does not disqualify the clause — the EMPTY generated
    // set does, and that is what emits a row with no input rows behind it
    // (measured: `GROUP BY GROUPING SETS (())` over zero rows gives one row,
    // sum NULL). A PLAIN top-level term appears in every generated set, so one
    // of those makes every generated set non-empty whatever the ROLLUP beside
    // it expands to — the same fact `collectGroupingSetColumns` already reads
    // to decide which columns a super-aggregate row blanks, asked here for the
    // first time (2026-08-22). Sufficient rather than exact: `GROUPING SETS
    // ((a), (b))` generates no empty set either and is refused.
    return select.groupClause.some(g => !("GroupingSet" in (g as Record<string, unknown>)));
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
// The excluded set is SAMPLE statistics, and the line is where the estimator
// divides by `n - 1`: stddev / stddev_samp / variance / var_samp /
// covar_samp / corr / regr_slope / regr_intercept / regr_r2 are NULL for a
// single input row, so a non-empty group is not enough for them. The
// POPULATION variants divide by `n` and are defined at n = 1 — measured
// 2026-08-22, one row each, and the whole family measured at once rather than
// one name at a time, because this comment previously said "regr_* — all
// undefined" and six of the twelve are not.
//
// Ordered-set aggregates (percentile_*, mode) are excluded because their
// WITHIN GROUP argument is not modelled here.
// ---------------------------------------------------------------------------

/**
 * Aggregates that are NULL over an ALL-NULL input AND over an EMPTY one —
 * the two conditions together, which is what makes the claim independent of
 * whether the group or window frame has rows. Consumed by `alwaysNullExpr`:
 * an aggregate from this set over an always-null argument is always null,
 * as an aggregate and as a window function alike.
 *
 * NOT the complement of NON_NULL_OVER_NONEMPTY_AGGREGATES, and not a copy —
 * membership differs in BOTH directions, which is why every entry was
 * measured on admission (2026-08-22) rather than derived:
 *
 *   - `stddev` / `variance` are absent from that table (undefined for a
 *     single row) and present here (NULL over all-NULL, NULL over empty).
 *   - `array_agg` / `json_agg` / `jsonb_agg` are present there and absent
 *     here: they COLLECT NULLs rather than skipping them, so all-NULL input
 *     gives `{NULL,NULL,NULL}` / `[null,null,null]` — a non-null container.
 *     Measured, not assumed; the shape is easy to get backwards.
 *   - `count` and `regr_count` return 0 for both, so they are in neither.
 *
 * FILTER needs no gate here, and that is the point of demanding both
 * conditions: a FILTER can only empty the group, and every member is NULL
 * over an empty group too.
 */
export const ALWAYS_NULL_OVER_ALL_NULL_AGGREGATES: ReadonlySet<string> = new Set([
  "sum", "avg", "min", "max",
  "bit_and", "bit_or", "bool_and", "bool_or", "every",
  "string_agg",
  "stddev", "stddev_samp", "stddev_pop", "variance", "var_samp", "var_pop",
]);

/**
 * Window functions that report ANOTHER ROW's value of their argument, so an
 * always-null argument makes every output row NULL whatever the frame or
 * offset does — including addressing outside the partition, which yields
 * NULL as well. Measured 2026-08-22 alongside the aggregate table.
 *
 * `row_number` and the other rankings are absent because they take no
 * argument at all; `count` as a window is absent for the reason it is absent
 * above.
 */
export const ALWAYS_NULL_OVER_ALL_NULL_WINDOWS: ReadonlySet<string> = new Set([
  "lag", "lead", "first_value", "last_value", "nth_value",
]);

export const NON_NULL_OVER_NONEMPTY_AGGREGATES = new Set([
  // `regr_count` counts non-null PAIRS and has a zero INITCOND, so it is
  // total even over an empty group — a stronger claim than this table
  // makes, and sound under the weaker one it gets here.
  "regr_count",
  "sum", "avg", "min", "max",
  "bit_and", "bit_or", "bool_and", "bool_or", "every",
  "array_agg", "string_agg", "json_agg", "jsonb_agg",
  // The POPULATION statistics, admitted 2026-08-22 with the whole family
  // measured over a single row. Their sample twins stay out, one line apart
  // in the same table so the pairing is visible: stddev_pop / var_pop against
  // stddev_samp / var_samp, covar_pop against covar_samp. The regr_ moments
  // are population quantities too — sums and means over the non-null pairs —
  // while the three that FIT a line (slope, intercept, r2) need two points
  // and stay out with `corr`.
  "stddev_pop", "var_pop", "covar_pop",
  "regr_avgx", "regr_avgy", "regr_sxx", "regr_syy", "regr_sxy",
]);

/**
 * Window rows that assign a value to EVERY row of the partition, so no frame
 * or ordering can make them NULL. Keyed by SIGNATURE (2026-08-09), completing
 * the re-key the type-aware charter decided for all nine claim tables: the
 * five ranking functions take no arguments, so their keys are bare, but
 * `lag` and `lead` below are exactly the case a name cannot express.
 */
/**
 * Output columns of pg_catalog TABLE FUNCTIONS that can never be SQL NULL,
 * by function name and column name.
 *
 * The SHAPE of these functions is environment and is captured
 * (`builtinTableFunctions`); which columns can be NULL has no catalog flag at
 * all — `attnotnull` describes table columns, not function outputs — so this
 * is curated, and every entry was measured on admission (2026-08-22) against
 * a document holding a JSON null, which is the only thing that could put one
 * there.
 *
 * Only `key`, and the reason the `value` columns are absent is the whole
 * lesson of this table. It looked like the easier admission: a JSON null is a
 * json DATUM, so `json_each('{"a": null}')` yields a `value` PostgreSQL's own
 * `IS NULL` calls non-null — measured, and true. It was admitted on that, and
 * PostgreSQL falsified it in five data states, because the claim is not about
 * SQL's notion of NULL. It is about what reaches the consumer, and the driver
 * parses a `json` datum: the JSON null arrives as `null`, indistinguishable
 * from the SQL one. `json_each_text` renders the same document to a real SQL
 * NULL, and the two are the SAME value at the type boundary these claims
 * describe. A `Json` that can be `null` is `Json | null`.
 *
 * `key` survives that test for a reason no rendering can touch: a JSON
 * object's field names are strings by the grammar, so no document produces a
 * NULL key, and none produces a json `null` in that position either.
 *
 * Keyed by NAME rather than signature, matching `builtinTableFunctions`, which
 * is the map whose shape these flags overlay. `snapshot.test.ts` asserts each
 * admitted name has exactly one set-returning pg_catalog row and that `key` is
 * among its output columns — so a PG release that adds an overload or renames
 * a column fails rather than drifts.
 */
export const NON_NULL_BUILTIN_TABLE_COLUMNS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["json_each", new Set(["key"])],
  ["jsonb_each", new Set(["key"])],
  ["json_each_text", new Set(["key"])],
  ["jsonb_each_text", new Set(["key"])],
]);

export const NEVER_NULL_WINDOW_SIGNATURES: ReadonlySet<string> = new Set([
  "row_number()", "rank()", "dense_rank()", "percent_rank()", "cume_dist()",
]);

/**
 * Window rows that are non-null for non-null arguments — the window analogue
 * of STRICT_TOTAL_BUILTINS, and the reason the window table had to be
 * re-keyed at all.
 *
 * `lag`/`lead` address a row outside the partition and answer NULL for it —
 * that is what `tests/unit/functions/lag/first-row.sql` witnesses, and it is
 * true of the one- and two-argument rows. The THREE-argument row takes a
 * DEFAULT, which is what PostgreSQL returns instead of that NULL, so
 * `lag(price, 1, 0)` over a NOT NULL column cannot be NULL (measured). Name
 * keying could not tell the two apart and the whole name stayed out.
 *
 * `ntile` was a hard-coded special case in the walk and is now an ordinary
 * row here: its claim was always "non-null when the bucket count is", which
 * is precisely what this table means.
 */
export const STRICT_TOTAL_WINDOW_SIGNATURES: ReadonlySet<string> = new Set([
  "lag(anycompatible,integer,anycompatible)",
  "lead(anycompatible,integer,anycompatible)",
  "ntile(integer)",
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
  // Sequences (2026-08-20, docs/sqlc-disagreements.md `nextval/GetNextID`).
  // VOLATILE by nature — the side effect is the point — which is why they are
  // outside the immutable-only totality capture and had no verdict at all.
  // Volatility is not totality: each either RAISES (a sequence that does not
  // exist, `currval` before `nextval` in the session, a value past the type's
  // range) or returns a bigint, and a raise is not a NULL — the same admission
  // criterion the rest of this table is held to. STRICT and measured NULL on a
  // NULL argument (`nextval(NULL::regclass)`), so strict-total is the correct
  // set and `ALWAYS_NOT_NULL_BUILTINS` would be wrong. `lastval` takes no
  // arguments, so the strict premise is vacuous and it belongs here too.
  "nextval", "currval", "setval", "lastval",
  // Wave-4 batch, each measured 2026-08-01 with adversarial non-null inputs
  // (no-match regexps, empty arrays, missing jsonb paths — jsonb_set on a
  // scalar target RAISES, which counts: an error is not a NULL).
  "pow", "factorial", "sinh", "cosh", "tanh", "asinh", "acosh", "atanh",
  "trim_scale", "bit_count", "normalize",
  "regexp_like", "regexp_count", "regexp_replace", "regexp_split_to_array",
  "array_fill", "array_positions", "trim_array",
  "jsonb_set", "jsonb_insert",
  // ---------------------------------------------------------------------
  // The work-list batch (2026-08-09, docs/builtin-surface-classification.md). Each
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
  // ---------------------------------------------------------------------
  // CAST implementation functions (2026-08-09, from the `cast` role sweep).
  // These are what `x::type` runs, and the walk now resolves a TypeCast
  // through pg_cast to the verdict tables — so an unclaimed cast function
  // costs `n::integer` its notNull, and claiming the total ones is what
  // keeps the soundness fix from being a precision regression. Every row of
  // every name here was probed by tests/probe/cluster-sweep.ts; the names
  // whose rows DISAGREE are signature-keyed below instead, which is most of
  // the numeric family — `int4(numeric)` is total and `int4(jsonb)` is NULL.
  // ---------------------------------------------------------------------
  "bit", "box", "bpchar", "bytea", "char", "cidr", "circle", "date", "interval", "lseg", "macaddr8", "money", "name", "oid", "path", "point", "polygon", "regclass", "timestamp", "timestamptz", "varbit", "varchar", "xid", "xml",
  // Bits and bytes — out-of-range indexes raise rather than answering NULL.
  "get_bit", "get_byte", "set_bit", "set_byte",
  // ---------------------------------------------------------------------
  // The no-generator triage's harvest (2026-08-09, same day): full-text
  // search was unprobed for want of a `regconfig` value, not for want of a
  // verdict. Empty input is the class to beat here and every one of these
  // survives it — `to_tsvector('english','')` is the empty tsvector,
  // `plainto_tsquery('  ')` the empty tsquery, `ts_rank` over an empty
  // tsvector is 0 — while a malformed tsquery raises (`to_tsquery('')`).
  // ---------------------------------------------------------------------
  "to_tsvector", "to_tsquery", "plainto_tsquery", "phraseto_tsquery",
  "websearch_to_tsquery", "json_to_tsvector", "jsonb_to_tsvector",
  "ts_headline", "ts_rank", "ts_rank_cd",
  "setweight", "strip", "numnode", "querytree",
  "tsvector_to_array", "array_to_tsvector",
  // jsonpath, the ARRAY-returning half only. Its siblings are witnessed and
  // stay out: under `silent => true` a STRICT path error is suppressed into
  // a NULL, which takes `jsonb_path_exists`, `jsonb_path_match` and
  // `jsonb_path_query_first` out permanently. These two answer `[]` for the
  // same input, which is a value.
  "jsonb_path_query_array", "jsonb_path_query_array_tz",
  // ---------------------------------------------------------------------
  // The third batch (2026-08-09): what the first two skipped that is still
  // reachable from an application query. `sha256` was already here and its
  // three siblings were not, which is the shape of most of this group —
  // a claimed name with unclaimed relatives.
  // ---------------------------------------------------------------------
  "sha224", "sha384", "sha512", "crc32", "crc32c",
  // `is_normalized` is the predicate half of the claimed `normalize`.
  "is_normalized", "unicode_assigned", "unicode_version", "icu_unicode_version",
  // XML: the constructors escape their input rather than rejecting it, and
  // the three well-formedness predicates answer false rather than NULL.
  "xmlcomment", "xmltext",
  "xml_is_well_formed", "xml_is_well_formed_content", "xml_is_well_formed_document",
  // What `LIKE … ESCAPE` and `SIMILAR TO` rewrite to. Grammar, like `btrim`
  // and `position` above, so the name is reached by SQL nobody wrote.
  "like_escape", "similar_escape", "similar_to_escape",
  // ---------------------------------------------------------------------
  // SET-RETURNING names (2026-08-09). Their claim is about every EMITTED
  // row — zero rows is no row at all rather than a NULL — and both probes
  // now ask exactly that, through `srfprobe`: any row, any output column.
  // The construction is the whole story and probe-values.ts carries it
  // (target list, not FROM; PGlite materialises a function scan and the
  // corpus's own bigint bound exhausts memory in that position).
  //
  // The `_text` json expanders are the sharp exclusion: they turn a JSON
  // null into a SQL NULL where their non-`_text` twins return it as a
  // value, so `json_each` is here and `json_each_text` is witnessed.
  // `unnest` stays out entirely — an array holding a NULL element, and a
  // tsvector lexeme with no positions, are both witnessed.
  // ---------------------------------------------------------------------
  "generate_series", "generate_subscripts",
  "regexp_split_to_table", "regexp_matches",
  "json_object_keys", "jsonb_object_keys",
  "json_each", "jsonb_each",
  "json_array_elements", "jsonb_array_elements",
  "jsonb_path_query", "jsonb_path_query_tz",
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
  // The cast functions whose NAME cannot carry the claim (2026-08-09):
  // the numeric conversions are total from every source but `jsonb`, where
  // a JSON null becomes a SQL NULL, and the time conversions are total from
  // every source but a timestamp, where an infinite one has no time of day.
  "bool(integer)",
  "datemultirange(daterange)",
  "float4(bigint)",
  "float4(double precision)",
  "float4(integer)",
  "float4(numeric)",
  "float4(smallint)",
  "float8(bigint)",
  "float8(integer)",
  "float8(numeric)",
  "float8(real)",
  "float8(smallint)",
  "int2(bigint)",
  "int2(bytea)",
  "int2(double precision)",
  "int2(integer)",
  "int2(numeric)",
  "int2(real)",
  'int4("char")',
  "int4(bigint)",
  "int4(bit)",
  "int4(boolean)",
  "int4(bytea)",
  "int4(double precision)",
  "int4(numeric)",
  "int4(real)",
  "int4(smallint)",
  "int4multirange(int4range)",
  "int8(bit)",
  "int8(bytea)",
  "int8(double precision)",
  "int8(integer)",
  "int8(numeric)",
  "int8(oid)",
  "int8(real)",
  "int8(smallint)",
  "int8multirange(int8range)",
  "numeric(bigint)",
  "numeric(double precision)",
  "numeric(integer)",
  "numeric(money)",
  "numeric(numeric,integer)",
  "numeric(real)",
  "numeric(smallint)",
  "nummultirange(numrange)",
  'text("char")',
  "text(boolean)",
  "text(character)",
  "text(inet)",
  "text(name)",
  "time(interval)",
  "time(time with time zone)",
  "time(time without time zone,integer)",
  "timetz(time with time zone,integer)",
  "timetz(time without time zone)",
  "tsmultirange(tsrange)",
  "tstzmultirange(tstzrange)",
  // The two-argument `string_to_table` (2026-08-09). Its three-argument row
  // takes a null_string and emits SQL NULL for every field equal to it —
  // `string_to_table('a,,b', ',', 'a')` — which is witnessed and bars the
  // NAME. Splitting without one yields the empty string where the input was
  // empty, never a NULL.
  "string_to_table(text,text)",
]);


/**
 * Signatures convicted by `tests/probe/cluster-sweep.ts`, role by role — the
 * machine-swept half of the totality surface, kept SEPARATE from the curated
 * tables above on purpose.
 *
 * Those tables are an argument: each name is there because somebody reasoned
 * about it, and the comments carry why `lower` left and why `substring` is
 * signature-keyed. Merging a thousand rows nobody argued about individually
 * would bury that. These were established the other way — every ROW of a
 * catalog ROLE probed against the corner corpus plus the sweep's degenerate
 * staging values, with the roles (`pg_amproc.amproc`, `pg_operator.oprcode`,
 * `pg_cast.castfunc`, `pg_type.typoutput`, `pg_aggregate.aggtransfn`,
 * `pg_range.rngcanonical`, and what none of those claim) partitioning the
 * surface so "every row swept" means something.
 *
 * SIGNATURE-keyed without exception, even where every row of a name qualifies:
 * a name-level claim would re-import the family-resemblance reasoning the
 * sweep exists to refute — `json_each` is total and `json_each_text` is NULL,
 * `int4(numeric)` is total and `int4(jsonb)` is NULL.
 *
 * The totality probe holds every row here by execution, exactly as it holds
 * the curated ones; a row that starts answering NULL fails the run.
 */
export const SWEPT_TOTAL_SIGNATURES: ReadonlySet<string> = new Set([
  // The privilege rows COHERENT_CALLS unblocked (2026-08-09): a role, an
  // object of the right kind and a privilege that kind accepts, which no
  // per-type choice can produce past the combination cap. Their
  // OID-taking siblings answer NULL for an object that does not exist and
  // are witnessed; these name objects that do.
  "has_column_privilege(name,text,smallint,text)",
  "has_column_privilege(name,text,text,text)",
  "has_column_privilege(oid,text,smallint,text)",
  "has_column_privilege(oid,text,text,text)",
  "has_column_privilege(text,smallint,text)",
  "has_column_privilege(text,text,text)",
  "has_database_privilege(name,text,text)",
  "has_database_privilege(oid,text,text)",
  "has_database_privilege(text,text)",
  "has_function_privilege(oid,text,text)",
  "has_language_privilege(name,text,text)",
  "has_language_privilege(oid,text,text)",
  "has_language_privilege(text,text)",
  "has_schema_privilege(name,text,text)",
  "has_schema_privilege(oid,text,text)",
  "has_schema_privilege(text,text)",
  // The SEQUENCE rows joined them 2026-08-21. They were pinned unprobeable
  // because a fresh PGlite has no sequence, and `PROBE_OBJECTS_SQL` — which
  // creates one — did not reach the classifying suite until the volatile
  // sweep took it there.
  "has_sequence_privilege(name,text,text)",
  "has_sequence_privilege(oid,text,text)",
  "has_sequence_privilege(text,text)",
  "has_tablespace_privilege(name,text,text)",
  "has_tablespace_privilege(oid,text,text)",
  "has_tablespace_privilege(text,text)",
  // The type I/O entry points, reachable once `cstring` had a generator
  // (2026-08-09). An input function RAISES on text it cannot read and
  // returns a value on text it can; neither is a NULL.
  "bit_in(cstring,oid,integer)",
  "bpcharin(cstring,oid,integer)",
  "byteain(cstring)",
  "cash_in(cstring)",
  "charin(cstring)",
  "cidin(cstring)",
  "cidr_in(cstring)",
  "cstring_in(cstring)",
  "cstring_out(cstring)",
  "cstring_send(cstring)",
  "float4in(cstring)",
  "float8in(cstring)",
  "int2in(cstring)",
  "int2vectorin(cstring)",
  "int4in(cstring)",
  "int8in(cstring)",
  "interval_in(cstring,oid,integer)",
  "json_in(cstring)",
  "jsonb_in(cstring)",
  "jsonpath_in(cstring)",
  "namein(cstring)",
  "numeric_in(cstring,oid,integer)",
  "oidin(cstring)",
  "oidvectorin(cstring)",
  "regclassin(cstring)",
  "regcollationin(cstring)",
  "regconfigin(cstring)",
  "regdictionaryin(cstring)",
  "regnamespacein(cstring)",
  "regoperatorin(cstring)",
  "regoperin(cstring)",
  "regprocedurein(cstring)",
  "regprocin(cstring)",
  "regrolein(cstring)",
  "regtypein(cstring)",
  "textin(cstring)",
  "tsqueryin(cstring)",
  "tsvectorin(cstring)",
  "unknownin(cstring)",
  "varbit_in(cstring,oid,integer)",
  "varcharin(cstring,oid,integer)",
  "void_in(cstring)",
  "xid8in(cstring)",
  "xidin(cstring)",
  "xml_in(cstring)",
  // Unblocked by the generators the no-generator pin forced a decision
  // about (2026-08-09) — reg* object references, xml, the snapshot
  // types, cstring and float8/int8 arrays. Their unprobeability had no
  // reason anybody could state, which is what the pin asks for.
  "anycompatiblemultirange_out(anycompatiblemultirange)",
  // `int8_avg(bigint[])` and `int2int4_sum(bigint[])` were HERE and are gone
  // (2026-08-21). Both take an aggregate TRANSITION STATE of (count, sum)
  // and answer NULL when the count is zero — an average over nothing. The
  // sweep that claimed them ran against an arbitrary bigint[], which is not
  // a state at all; a zeroed accumulator joined probe-values.ts with the
  // aggstate group and falsified them the same run.
  "int2_avg_accum(bigint[],smallint)",
  "int2_avg_accum_inv(bigint[],smallint)",
  "int2vectorout(int2vector)",
  "int2vectorsend(int2vector)",
  "int4_avg_accum(bigint[],integer)",
  "int4_avg_accum_inv(bigint[],integer)",
  "pg_basetype(regtype)",
  "pg_column_is_updatable(regclass,smallint,boolean)",
  // `pg_relation_filenode`, `pg_relation_filepath` and
  // `pg_relation_is_publishable` were HERE and are gone (2026-08-21). They
  // answer NULL for a regclass whose relation does not exist — `try_relation_open`
  // returns nothing and each has a `PG_RETURN_NULL` for it — and the sweep
  // that convicted them ran against a regclass vocabulary in which every
  // object existed. A missing-relation regclass joined probe-values.ts with
  // the volatile bucket and the totality probe falsified all three the same
  // run. The two rows left below survive it: they answer `false` and `0`
  // where these answer NULL.
  "pg_relation_is_updatable(regclass,boolean)",
  "pg_snapshot_out(pg_snapshot)",
  "pg_snapshot_send(pg_snapshot)",
  "pg_snapshot_xmax(pg_snapshot)",
  "pg_snapshot_xmin(pg_snapshot)",
  "pg_visible_in_snapshot(xid8,pg_snapshot)",
  "regclassout(regclass)",
  "regclasssend(regclass)",
  "regcollationout(regcollation)",
  "regcollationsend(regcollation)",
  "regdictionaryout(regdictionary)",
  "regdictionarysend(regdictionary)",
  "regnamespaceout(regnamespace)",
  "regnamespacesend(regnamespace)",
  "regoperatorout(regoperator)",
  "regoperatorsend(regoperator)",
  "regoperout(regoper)",
  "regopersend(regoper)",
  "regprocedureout(regprocedure)",
  "regproceduresend(regprocedure)",
  "regprocout(regproc)",
  "regprocsend(regproc)",
  "regroleout(regrole)",
  "regrolesend(regrole)",
  "regtypeout(regtype)",
  "regtypesend(regtype)",
  "table_to_xml(regclass,boolean,boolean,text)",
  "table_to_xml_and_xmlschema(regclass,boolean,boolean,text)",
  "table_to_xmlschema(regclass,boolean,boolean,text)",
  "text(xml)",
  "ts_filter(tsvector,\"char\"[])",
  "ts_lexize(regdictionary,text)",
  "txid_snapshot_out(txid_snapshot)",
  "txid_snapshot_send(txid_snapshot)",
  "txid_snapshot_xmax(txid_snapshot)",
  "txid_snapshot_xmin(txid_snapshot)",
  "txid_visible_in_snapshot(bigint,txid_snapshot)",
  "xml_out(xml)",
  "xml_send(xml)",
  "xmlconcat2(xml,xml)",
  "xmlexists(text,xml)",
  "xpath(text,xml)",
  "xpath(text,xml,text[])",
  "xpath_exists(text,xml)",
  "xpath_exists(text,xml,text[])",
  // Reached once the corpus carried a real GUC name, a real text-search
  // parser and a macaddr8 with FF:FE in the middle (2026-08-09).
  // `current_setting(text)` raises for a setting that does not exist —
  // its two-argument form with `missing_ok` is the one that answers
  // NULL, and that row is witnessed.
  "current_setting(text)", "macaddr(macaddr8)",
  "ts_parse(text,text)", "ts_token_type(text)",
  // The VARIADIC rows, reachable once the surface probe passed ELEMENTS
  // rather than an array (2026-08-09). A multirange constructor always
  // builds a multirange — the empty range makes an empty one, not a
  // NULL — and `jsonb_delete` returns the object minus the keys, or
  // RAISES on a scalar target. Their neighbours in the same fix went the
  // other way: all four `*_extract_path*` rows are NULL for a missing
  // path and are now witnessed by the machine.
  "int4multirange(int4range[])", "int8multirange(int8range[])",
  "nummultirange(numrange[])", "datemultirange(daterange[])",
  "tsmultirange(tsrange[])", "tstzmultirange(tstzrange[])",
  "jsonb_delete(jsonb,text[])",
  // The eight `has_*_privilege(name, oid, text)` rows were HERE and are gone
  // (2026-08-21). They answer NULL for an object that does not exist, and
  // every probe that ever ran them asked as the role PGlite runs as — a
  // SUPERUSER, whose privilege check short-circuits to true before the
  // object is looked up at all. The probe database has a non-superuser
  // `probe_role` now and the corpus an OID naming nothing; with either
  // grantee all eight are falsified, and the sibling spellings survive
  // because a missing object named by TEXT raises instead.
  "has_any_column_privilege(name,text,text)",
  "has_any_column_privilege(oid,text,text)",
  "has_any_column_privilege(text,text)",
  "has_function_privilege(name,text,text)",
  "has_parameter_privilege(name,text,text)",
  "has_table_privilege(name,text,text)",
  "has_table_privilege(oid,text,text)",
  "has_table_privilege(text,text)",
  "has_type_privilege(name,text,text)",
  "has_type_privilege(oid,text,text)",
  "pg_has_role(name,name,text)",
  "pg_has_role(name,oid,text)",
  "pg_has_role(name,text)",
  "pg_has_role(oid,name,text)",
  // `pg_input_is_valid` answers a plain boolean; `row_security_active`
  // answers one for a relation that exists and for one that does not.
  // `pg_input_error_info` joins them, and the reason it nearly did not is
  // worth the line: for VALID input it returns a record whose fields are
  // all NULL, and `(record) IS NULL` is ROW-is-null, so it reads as a
  // witness. The driver receives `(,,,)` — a value. The surface probe now
  // casts a composite result to text before the NULL test for exactly
  // this reason.
  "pg_input_error_info(text,text)",
  // The same composite trap as its neighbour above: a record of NULLs for
  // a backend that does not exist, which `IS NULL` calls NULL and the
  // driver receives as `(,)`.
  "pg_stat_get_backend_subxact(integer)",
  "pg_input_is_valid(text,text)",
  "row_security_active(oid)",
  "row_security_active(text)",
  // The privilege predicates that answer a VALUE for an object that does
  // not exist (2026-08-09). Their siblings answer NULL for the same input
  // and are witnessed — `has_table_privilege(oid, …)` against
  // `has_database_privilege(oid, …)` — which is why this family is keyed
  // row by row and not by any rule about its names.
  "has_database_privilege(oid,text)",
  "has_foreign_data_wrapper_privilege(oid,text)",
  "has_function_privilege(oid,text)",
  "has_function_privilege(text,text)",
  "has_language_privilege(oid,text)",
  "has_parameter_privilege(oid,text,text)",
  "has_parameter_privilege(text,text)",
  "has_schema_privilege(oid,text)",
  "has_server_privilege(oid,text)",
  "has_tablespace_privilege(oid,text)",
  "has_type_privilege(oid,text)",
  "has_type_privilege(text,text)",
  "makeaclitem(oid,oid,text,boolean)",
  "pg_has_role(oid,oid,text)",
  "pg_has_role(oid,text)",
  // The money-division rows are here on the CORNER CORPUS's evidence, not
  // the sweep's: the sweep stages a money value at the type's negative
  // extreme, and every combination of it overflows, so the row came back
  // all-raised — a staged value can HIDE a row as well as convict one. A
  // zero divisor raises; every other divisor is a value (measured).
  "cash_div_int2(money,smallint)", "cash_div_int4(money,integer)",
  "cash_div_int8(money,bigint)",
  "aclcontains(aclitem[],aclitem)", 'acldefault("char",oid)', "aclexplode(aclitem[])",
  "aclitemeq(aclitem,aclitem)", "aclitemout(aclitem)",
  "any_value_transfn(anyelement,anyelement)", "anyarray_out(anyarray)",
  "anyarray_send(anyarray)", "anycompatiblearray_out(anycompatiblearray)",
  "anycompatiblearray_send(anycompatiblearray)", "anycompatiblerange_out(anycompatiblerange)",
  "anyenum_out(anyenum)", "anymultirange_out(anymultirange)", "anyrange_out(anyrange)",
  "anytextcat(anynonarray,text)", "area(box)", "area(circle)", "array_eq(anyarray,anyarray)",
  "array_ge(anyarray,anyarray)", "array_gt(anyarray,anyarray)",
  "array_larger(anyarray,anyarray)", "array_le(anyarray,anyarray)",
  "array_lt(anyarray,anyarray)", "array_ne(anyarray,anyarray)", "array_out(anyarray)",
  "array_send(anyarray)", "array_smaller(anyarray,anyarray)",
  "arraycontained(anyarray,anyarray)", "arraycontains(anyarray,anyarray)",
  "arrayoverlap(anyarray,anyarray)", "bit_out(bit)", "bit_send(bit)", "bitand(bit,bit)",
  "bitcat(bit varying,bit varying)", "bitcmp(bit,bit)", "biteq(bit,bit)", "bitge(bit,bit)",
  "bitgt(bit,bit)", "bitle(bit,bit)", "bitlt(bit,bit)", "bitne(bit,bit)", "bitnot(bit)",
  "bitor(bit,bit)", "bitshiftleft(bit,integer)", "bitshiftright(bit,integer)",
  "bittypmodout(integer)", "bitxor(bit,bit)", "booland_statefunc(boolean,boolean)",
  "booleq(boolean,boolean)", "boolge(boolean,boolean)", "boolgt(boolean,boolean)",
  "boolle(boolean,boolean)", "boollt(boolean,boolean)", "boolne(boolean,boolean)",
  "boolor_statefunc(boolean,boolean)", "boolout(boolean)", "boolsend(boolean)",
  "bound_box(box,box)", "box_above(box,box)", "box_above_eq(box,box)", "box_add(box,point)",
  "box_below(box,box)", "box_below_eq(box,box)", "box_center(box)", "box_contain(box,box)",
  "box_contain_pt(box,point)", "box_contained(box,box)", "box_distance(box,box)",
  "box_div(box,point)", "box_eq(box,box)", "box_ge(box,box)", "box_gt(box,box)",
  "box_intersect(box,box)", "box_le(box,box)", "box_left(box,box)", "box_lt(box,box)",
  "box_mul(box,point)", "box_out(box)", "box_overabove(box,box)", "box_overbelow(box,box)",
  "box_overlap(box,box)", "box_overleft(box,box)", "box_overright(box,box)",
  "box_right(box,box)", "box_same(box,box)", "box_send(box)", "box_sub(box,point)",
  "bpchar_larger(character,character)", "bpchar_pattern_ge(character,character)",
  "bpchar_pattern_gt(character,character)", "bpchar_pattern_le(character,character)",
  "bpchar_pattern_lt(character,character)", "bpchar_smaller(character,character)",
  "bpcharcmp(character,character)", "bpchareq(character,character)",
  "bpcharge(character,character)", "bpchargt(character,character)",
  "bpchariclike(character,text)", "bpcharicnlike(character,text)",
  "bpcharicregexeq(character,text)", "bpcharicregexne(character,text)",
  "bpcharle(character,character)", "bpcharlike(character,text)",
  "bpcharlt(character,character)", "bpcharne(character,character)",
  "bpcharnlike(character,text)", "bpcharout(character)", "bpcharregexeq(character,text)",
  "bpcharregexne(character,text)", "bpcharsend(character)", "bpchartypmodout(integer)",
  "btarraycmp(anyarray,anyarray)", "btboolcmp(boolean,boolean)",
  "btbpchar_pattern_cmp(character,character)", 'btcharcmp("char","char")', "btequalimage(oid)",
  "btfloat48cmp(real,double precision)", "btfloat4cmp(real,real)",
  "btfloat84cmp(double precision,real)", "btfloat8cmp(double precision,double precision)",
  "btint24cmp(smallint,integer)", "btint28cmp(smallint,bigint)",
  "btint2cmp(smallint,smallint)", "btint42cmp(integer,smallint)", "btint48cmp(integer,bigint)",
  "btint4cmp(integer,integer)", "btint82cmp(bigint,smallint)", "btint84cmp(bigint,integer)",
  "btint8cmp(bigint,bigint)", "btnamecmp(name,name)", "btnametextcmp(name,text)",
  "btoidcmp(oid,oid)", "btoidvectorcmp(oidvector,oidvector)", "btrecordcmp(record,record)",
  "btrecordimagecmp(record,record)", "bttext_pattern_cmp(text,text)", "bttextcmp(text,text)",
  "bttextnamecmp(text,name)", "bttidcmp(tid,tid)", "bytea_larger(bytea,bytea)",
  "bytea_smaller(bytea,bytea)", "byteacat(bytea,bytea)", "byteacmp(bytea,bytea)",
  "byteaeq(bytea,bytea)", "byteage(bytea,bytea)", "byteagt(bytea,bytea)",
  "byteale(bytea,bytea)", "bytealike(bytea,bytea)", "bytealt(bytea,bytea)",
  "byteane(bytea,bytea)", "byteanlike(bytea,bytea)", "byteaout(bytea)", "byteasend(bytea)",
  "cash_cmp(money,money)", "cash_div_cash(money,money)", "cash_div_flt4(money,real)",
  "cash_div_flt8(money,double precision)", "cash_eq(money,money)", "cash_ge(money,money)",
  "cash_gt(money,money)", "cash_le(money,money)", "cash_lt(money,money)",
  "cash_mi(money,money)", "cash_mul_flt4(money,real)", "cash_mul_flt8(money,double precision)",
  "cash_mul_int2(money,smallint)", "cash_mul_int4(money,integer)",
  "cash_mul_int8(money,bigint)", "cash_ne(money,money)", "cash_out(money)",
  "cash_pl(money,money)", "cash_send(money)", "cash_words(money)", "cashlarger(money,money)",
  "cashsmaller(money,money)", "center(box)", "center(circle)", 'chareq("char","char")',
  'charge("char","char")', 'chargt("char","char")', 'charle("char","char")',
  'charlt("char","char")', 'charne("char","char")', 'charout("char")', 'charsend("char")',
  "cideq(cid,cid)", "cidout(cid)", "cidr_out(cidr)", "cidr_send(cidr)", "cidsend(cid)",
  "circle_above(circle,circle)", "circle_add_pt(circle,point)", "circle_below(circle,circle)",
  "circle_center(circle)", "circle_contain(circle,circle)", "circle_contain_pt(circle,point)",
  "circle_contained(circle,circle)", "circle_distance(circle,circle)",
  "circle_div_pt(circle,point)", "circle_eq(circle,circle)", "circle_ge(circle,circle)",
  "circle_gt(circle,circle)", "circle_le(circle,circle)", "circle_left(circle,circle)",
  "circle_lt(circle,circle)", "circle_mul_pt(circle,point)", "circle_ne(circle,circle)",
  "circle_out(circle)", "circle_overabove(circle,circle)", "circle_overbelow(circle,circle)",
  "circle_overlap(circle,circle)", "circle_overleft(circle,circle)",
  "circle_overright(circle,circle)", "circle_right(circle,circle)",
  "circle_same(circle,circle)", "circle_send(circle)", "circle_sub_pt(circle,point)",
  "close_pb(point,box)", "close_pl(point,line)", "close_ps(point,lseg)", "close_sb(lseg,box)",
  "convert(bytea,name,name)", "current_schemas(boolean)",
  "database_to_xml(boolean,boolean,text)",
  "database_to_xml_and_xmlschema(boolean,boolean,text)",
  "database_to_xmlschema(boolean,boolean,text)", "date_cmp(date,date)",
  "date_cmp_timestamp(date,timestamp without time zone)",
  "date_cmp_timestamptz(date,timestamp with time zone)", "date_eq(date,date)",
  "date_eq_timestamp(date,timestamp without time zone)",
  "date_eq_timestamptz(date,timestamp with time zone)", "date_ge(date,date)",
  "date_ge_timestamp(date,timestamp without time zone)",
  "date_ge_timestamptz(date,timestamp with time zone)", "date_gt(date,date)",
  "date_gt_timestamp(date,timestamp without time zone)",
  "date_gt_timestamptz(date,timestamp with time zone)", "date_larger(date,date)",
  "date_le(date,date)", "date_le_timestamp(date,timestamp without time zone)",
  "date_le_timestamptz(date,timestamp with time zone)", "date_lt(date,date)",
  "date_lt_timestamp(date,timestamp without time zone)",
  "date_lt_timestamptz(date,timestamp with time zone)", "date_mi(date,date)",
  "date_mi_interval(date,interval)", "date_mii(date,integer)", "date_ne(date,date)",
  "date_ne_timestamp(date,timestamp without time zone)",
  "date_ne_timestamptz(date,timestamp with time zone)", "date_out(date)",
  "date_pl_interval(date,interval)", "date_pli(date,integer)", "date_send(date)",
  "date_smaller(date,date)", "datemultirange()", "daterange_canonical(daterange)",
  "daterange_subdiff(date,date)", "datetime_pl(date,time without time zone)",
  "datetimetz_pl(date,time with time zone)", "dcbrt(double precision)",
  "dexp(double precision)", "diagonal(box)", "diameter(circle)", "dist_bp(box,point)",
  "dist_bs(box,lseg)", "dist_cpoint(circle,point)", "dist_cpoly(circle,polygon)",
  "dist_lp(line,point)", "dist_ls(line,lseg)", "dist_pathp(path,point)", "dist_pb(point,box)",
  "dist_pc(point,circle)", "dist_pl(point,line)", "dist_polyc(polygon,circle)",
  "dist_polyp(polygon,point)", "dist_ppath(point,path)", "dist_ppoly(point,polygon)",
  "dist_ps(point,lseg)", "dist_sb(lseg,box)", "dist_sl(lseg,line)", "dist_sp(lseg,point)",
  "dlog1(double precision)", "dlog10(double precision)",
  "dpow(double precision,double precision)", "dround(double precision)",
  "dsqrt(double precision)", "dtrunc(double precision)",
  "elem_contained_by_multirange(anyelement,anymultirange)",
  "elem_contained_by_range(anyelement,anyrange)", "enum_cmp(anyenum,anyenum)",
  "enum_eq(anyenum,anyenum)", "enum_first(anyenum)", "enum_ge(anyenum,anyenum)",
  "enum_gt(anyenum,anyenum)", "enum_larger(anyenum,anyenum)", "enum_last(anyenum)",
  "enum_le(anyenum,anyenum)", "enum_lt(anyenum,anyenum)", "enum_ne(anyenum,anyenum)",
  "enum_out(anyenum)", "enum_range(anyenum)", "enum_range(anyenum,anyenum)",
  "enum_send(anyenum)", "enum_smaller(anyenum,anyenum)", "float48div(real,double precision)",
  "float48eq(real,double precision)", "float48ge(real,double precision)",
  "float48gt(real,double precision)", "float48le(real,double precision)",
  "float48lt(real,double precision)", "float48mi(real,double precision)",
  "float48mul(real,double precision)", "float48ne(real,double precision)",
  "float48pl(real,double precision)", "float4abs(real)", "float4div(real,real)",
  "float4eq(real,real)", "float4ge(real,real)", "float4gt(real,real)",
  "float4larger(real,real)", "float4le(real,real)", "float4lt(real,real)",
  "float4mi(real,real)", "float4mul(real,real)", "float4ne(real,real)", "float4out(real)",
  "float4pl(real,real)", "float4send(real)", "float4smaller(real,real)", "float4um(real)",
  "float4up(real)", "float84div(double precision,real)", "float84eq(double precision,real)",
  "float84ge(double precision,real)", "float84gt(double precision,real)",
  "float84le(double precision,real)", "float84lt(double precision,real)",
  "float84mi(double precision,real)", "float84mul(double precision,real)",
  "float84ne(double precision,real)", "float84pl(double precision,real)",
  "float8abs(double precision)", "float8div(double precision,double precision)",
  "float8eq(double precision,double precision)", "float8ge(double precision,double precision)",
  "float8gt(double precision,double precision)",
  "float8larger(double precision,double precision)",
  "float8le(double precision,double precision)", "float8lt(double precision,double precision)",
  "float8mi(double precision,double precision)",
  "float8mul(double precision,double precision)",
  "float8ne(double precision,double precision)", "float8out(double precision)",
  "float8pl(double precision,double precision)", "float8send(double precision)",
  "float8smaller(double precision,double precision)", "float8um(double precision)",
  "float8up(double precision)", "flt4_mul_cash(real,money)",
  "flt8_mul_cash(double precision,money)", "format_type(oid,integer)",
  "get_current_ts_config()", "getdatabaseencoding()", "getpgusername()",
  "gin_cmp_tslexeme(text,text)", "gin_compare_jsonb(text,text)",
  "gist_translate_cmptype_common(integer)", "hash_aclitem(aclitem)",
  "hash_aclitem_extended(aclitem,bigint)", "hash_array(anyarray)",
  "hash_array_extended(anyarray,bigint)", "hash_multirange(anymultirange)",
  "hash_multirange_extended(anymultirange,bigint)", "hash_numeric(numeric)",
  "hash_numeric_extended(numeric,bigint)", "hash_range(anyrange)",
  "hash_range_extended(anyrange,bigint)", "hash_record(record)",
  "hash_record_extended(record,bigint)", "hashbool(boolean)",
  "hashboolextended(boolean,bigint)", "hashbpchar(character)",
  "hashbpcharextended(character,bigint)", "hashbytea(bytea)",
  "hashbyteaextended(bytea,bigint)", 'hashchar("char")', 'hashcharextended("char",bigint)',
  "hashcid(cid)", "hashcidextended(cid,bigint)", "hashdate(date)",
  "hashdateextended(date,bigint)", "hashenum(anyenum)", "hashenumextended(anyenum,bigint)",
  "hashfloat4(real)", "hashfloat4extended(real,bigint)", "hashfloat8(double precision)",
  "hashfloat8extended(double precision,bigint)", "hashinet(inet)",
  "hashinetextended(inet,bigint)", "hashint2(smallint)", "hashint2extended(smallint,bigint)",
  "hashint4(integer)", "hashint4extended(integer,bigint)", "hashint8(bigint)",
  "hashint8extended(bigint,bigint)", "hashmacaddr(macaddr)", "hashmacaddr8(macaddr8)",
  "hashmacaddr8extended(macaddr8,bigint)", "hashmacaddrextended(macaddr,bigint)",
  "hashname(name)", "hashnameextended(name,bigint)", "hashoid(oid)",
  "hashoidextended(oid,bigint)", "hashoidvector(oidvector)",
  "hashoidvectorextended(oidvector,bigint)", "hashtext(text)", "hashtextextended(text,bigint)",
  "hashtid(tid)", "hashtidextended(tid,bigint)", "hashxid(xid)", "hashxid8(xid8)",
  "hashxid8extended(xid8,bigint)", "hashxidextended(xid,bigint)", "height(box)",
  "in_range(bigint,bigint,bigint,boolean,boolean)",
  "in_range(date,date,interval,boolean,boolean)",
  "in_range(double precision,double precision,double precision,boolean,boolean)",
  "in_range(integer,integer,bigint,boolean,boolean)",
  "in_range(integer,integer,integer,boolean,boolean)",
  "in_range(integer,integer,smallint,boolean,boolean)",
  "in_range(interval,interval,interval,boolean,boolean)",
  "in_range(numeric,numeric,numeric,boolean,boolean)",
  "in_range(real,real,double precision,boolean,boolean)",
  "in_range(smallint,smallint,bigint,boolean,boolean)",
  "in_range(smallint,smallint,integer,boolean,boolean)",
  "in_range(smallint,smallint,smallint,boolean,boolean)",
  "in_range(time with time zone,time with time zone,interval,boolean,boolean)",
  "in_range(time without time zone,time without time zone,interval,boolean,boolean)",
  "in_range(timestamp with time zone,timestamp with time zone,interval,boolean,boolean)",
  "in_range(timestamp without time zone,timestamp without time zone,interval,boolean,boolean)",
  "inet_client_addr()", "inet_client_port()", "inet_out(inet)", "inet_send(inet)",
  "inetand(inet,inet)", "inetmi(inet,inet)", "inetmi_int8(inet,bigint)", "inetnot(inet)",
  "inetor(inet,inet)", "inetpl(inet,bigint)", "int24div(smallint,integer)",
  "int24eq(smallint,integer)", "int24ge(smallint,integer)", "int24gt(smallint,integer)",
  "int24le(smallint,integer)", "int24lt(smallint,integer)", "int24mi(smallint,integer)",
  "int24mul(smallint,integer)", "int24ne(smallint,integer)", "int24pl(smallint,integer)",
  "int28div(smallint,bigint)", "int28eq(smallint,bigint)", "int28ge(smallint,bigint)",
  "int28gt(smallint,bigint)", "int28le(smallint,bigint)", "int28lt(smallint,bigint)",
  "int28mi(smallint,bigint)", "int28mul(smallint,bigint)", "int28ne(smallint,bigint)",
  "int28pl(smallint,bigint)", "int2_mul_cash(smallint,money)", "int2_sum(bigint,smallint)",
  "int2abs(smallint)", "int2and(smallint,smallint)", "int2div(smallint,smallint)",
  "int2eq(smallint,smallint)", "int2ge(smallint,smallint)", "int2gt(smallint,smallint)",
  "int2larger(smallint,smallint)", "int2le(smallint,smallint)", "int2lt(smallint,smallint)",
  "int2mi(smallint,smallint)", "int2mod(smallint,smallint)", "int2mul(smallint,smallint)",
  "int2ne(smallint,smallint)", "int2not(smallint)", "int2or(smallint,smallint)",
  "int2out(smallint)", "int2pl(smallint,smallint)", "int2send(smallint)",
  "int2shl(smallint,integer)", "int2shr(smallint,integer)", "int2smaller(smallint,smallint)",
  "int2um(smallint)", "int2up(smallint)", "int2xor(smallint,smallint)",
  "int42div(integer,smallint)", "int42eq(integer,smallint)", "int42ge(integer,smallint)",
  "int42gt(integer,smallint)", "int42le(integer,smallint)", "int42lt(integer,smallint)",
  "int42mi(integer,smallint)", "int42mul(integer,smallint)", "int42ne(integer,smallint)",
  "int42pl(integer,smallint)", "int48div(integer,bigint)", "int48eq(integer,bigint)",
  "int48ge(integer,bigint)", "int48gt(integer,bigint)", "int48le(integer,bigint)",
  "int48lt(integer,bigint)", "int48mi(integer,bigint)", "int48mul(integer,bigint)",
  "int48ne(integer,bigint)", "int48pl(integer,bigint)", "int4_mul_cash(integer,money)",
  "int4_sum(bigint,integer)", "int4abs(integer)", "int4and(integer,integer)",
  "int4div(integer,integer)", "int4eq(integer,integer)", "int4ge(integer,integer)",
  "int4gt(integer,integer)", "int4inc(integer)", "int4larger(integer,integer)",
  "int4le(integer,integer)", "int4lt(integer,integer)", "int4mi(integer,integer)",
  "int4mod(integer,integer)", "int4mul(integer,integer)", "int4multirange()",
  "int4ne(integer,integer)", "int4not(integer)", "int4or(integer,integer)", "int4out(integer)",
  "int4pl(integer,integer)", "int4range_canonical(int4range)",
  "int4range_subdiff(integer,integer)", "int4send(integer)", "int4shl(integer,integer)",
  "int4shr(integer,integer)", "int4smaller(integer,integer)", "int4um(integer)",
  "int4up(integer)", "int4xor(integer,integer)", "int82div(bigint,smallint)",
  "int82eq(bigint,smallint)", "int82ge(bigint,smallint)", "int82gt(bigint,smallint)",
  "int82le(bigint,smallint)", "int82lt(bigint,smallint)", "int82mi(bigint,smallint)",
  "int82mul(bigint,smallint)", "int82ne(bigint,smallint)", "int82pl(bigint,smallint)",
  "int84div(bigint,integer)", "int84eq(bigint,integer)", "int84ge(bigint,integer)",
  "int84gt(bigint,integer)", "int84le(bigint,integer)", "int84lt(bigint,integer)",
  "int84mi(bigint,integer)", "int84mul(bigint,integer)", "int84ne(bigint,integer)",
  "int84pl(bigint,integer)", "int8_mul_cash(bigint,money)", "int8_sum(numeric,bigint)",
  "int8abs(bigint)", "int8and(bigint,bigint)", "int8dec(bigint)", 'int8dec_any(bigint,"any")',
  "int8div(bigint,bigint)", "int8eq(bigint,bigint)", "int8ge(bigint,bigint)",
  "int8gt(bigint,bigint)", "int8inc(bigint)", 'int8inc_any(bigint,"any")',
  "int8inc_float8_float8(bigint,double precision,double precision)",
  "int8larger(bigint,bigint)", "int8le(bigint,bigint)", "int8lt(bigint,bigint)",
  "int8mi(bigint,bigint)", "int8mod(bigint,bigint)", "int8mul(bigint,bigint)",
  "int8multirange()", "int8ne(bigint,bigint)", "int8not(bigint)", "int8or(bigint,bigint)",
  "int8out(bigint)", "int8pl(bigint,bigint)", "int8pl_inet(bigint,inet)",
  "int8range_canonical(int8range)", "int8range_subdiff(bigint,bigint)", "int8send(bigint)",
  "int8shl(bigint,integer)", "int8shr(bigint,integer)", "int8smaller(bigint,bigint)",
  "int8um(bigint)", "int8up(bigint)", "int8xor(bigint,bigint)",
  "integer_pl_date(integer,date)", "inter_lb(line,box)", "inter_sb(lseg,box)",
  "inter_sl(lseg,line)", "interval_cmp(interval,interval)",
  "interval_div(interval,double precision)", "interval_eq(interval,interval)",
  "interval_ge(interval,interval)", "interval_gt(interval,interval)",
  "interval_hash(interval)", "interval_hash_extended(interval,bigint)",
  "interval_larger(interval,interval)", "interval_le(interval,interval)",
  "interval_lt(interval,interval)", "interval_mi(interval,interval)",
  "interval_mul(interval,double precision)", "interval_ne(interval,interval)",
  "interval_out(interval)", "interval_pl(interval,interval)",
  "interval_pl_date(interval,date)", "interval_pl_time(interval,time without time zone)",
  "interval_pl_timestamp(interval,timestamp without time zone)",
  "interval_pl_timestamptz(interval,timestamp with time zone)",
  "interval_pl_timetz(interval,time with time zone)", "interval_send(interval)",
  "interval_smaller(interval,interval)", "interval_um(interval)", "intervaltypmodout(integer)",
  "isclosed(path)", "ishorizontal(line)", "ishorizontal(lseg)", "ishorizontal(point,point)",
  "isopen(path)", "isparallel(line,line)", "isparallel(lseg,lseg)", "isperp(line,line)",
  "isperp(lseg,lseg)", "isvertical(line)", "isvertical(lseg)", "isvertical(point,point)",
  "json_out(json)", "json_send(json)", "jsonb_cmp(jsonb,jsonb)", "jsonb_concat(jsonb,jsonb)",
  "jsonb_contained(jsonb,jsonb)", "jsonb_contains(jsonb,jsonb)", "jsonb_delete(jsonb,integer)",
  "jsonb_delete(jsonb,text)", "jsonb_delete_path(jsonb,text[])", "jsonb_eq(jsonb,jsonb)",
  "jsonb_exists(jsonb,text)", "jsonb_exists_all(jsonb,text[])",
  "jsonb_exists_any(jsonb,text[])", "jsonb_ge(jsonb,jsonb)", "jsonb_gt(jsonb,jsonb)",
  "jsonb_hash(jsonb)", "jsonb_hash_extended(jsonb,bigint)", "jsonb_le(jsonb,jsonb)",
  "jsonb_lt(jsonb,jsonb)", "jsonb_ne(jsonb,jsonb)", "jsonb_out(jsonb)", "jsonb_send(jsonb)",
  "jsonpath_out(jsonpath)", "jsonpath_send(jsonpath)", "like(bytea,bytea)", "like(name,text)",
  "like(text,text)", "line(point,point)", "line_distance(line,line)", "line_eq(line,line)",
  "line_horizontal(line)", "line_intersect(line,line)", "line_out(line)",
  "line_parallel(line,line)", "line_perp(line,line)", "line_send(line)", "line_vertical(line)",
  "lseg_center(lseg)", "lseg_distance(lseg,lseg)", "lseg_eq(lseg,lseg)", "lseg_ge(lseg,lseg)",
  "lseg_gt(lseg,lseg)", "lseg_horizontal(lseg)", "lseg_intersect(lseg,lseg)",
  "lseg_le(lseg,lseg)", "lseg_length(lseg)", "lseg_lt(lseg,lseg)", "lseg_ne(lseg,lseg)",
  "lseg_out(lseg)", "lseg_parallel(lseg,lseg)", "lseg_perp(lseg,lseg)", "lseg_send(lseg)",
  "lseg_vertical(lseg)", "macaddr8_and(macaddr8,macaddr8)", "macaddr8_cmp(macaddr8,macaddr8)",
  "macaddr8_eq(macaddr8,macaddr8)", "macaddr8_ge(macaddr8,macaddr8)",
  "macaddr8_gt(macaddr8,macaddr8)", "macaddr8_le(macaddr8,macaddr8)",
  "macaddr8_lt(macaddr8,macaddr8)", "macaddr8_ne(macaddr8,macaddr8)", "macaddr8_not(macaddr8)",
  "macaddr8_or(macaddr8,macaddr8)", "macaddr8_out(macaddr8)", "macaddr8_send(macaddr8)",
  "macaddr8_set7bit(macaddr8)", "macaddr_and(macaddr,macaddr)", "macaddr_cmp(macaddr,macaddr)",
  "macaddr_eq(macaddr,macaddr)", "macaddr_ge(macaddr,macaddr)", "macaddr_gt(macaddr,macaddr)",
  "macaddr_le(macaddr,macaddr)", "macaddr_lt(macaddr,macaddr)", "macaddr_ne(macaddr,macaddr)",
  "macaddr_not(macaddr)", "macaddr_or(macaddr,macaddr)", "macaddr_out(macaddr)",
  "macaddr_send(macaddr)", "mul_d_interval(double precision,interval)",
  "multirange_adjacent_multirange(anymultirange,anymultirange)",
  "multirange_adjacent_range(anymultirange,anyrange)",
  "multirange_after_multirange(anymultirange,anymultirange)",
  "multirange_after_range(anymultirange,anyrange)",
  "multirange_before_multirange(anymultirange,anymultirange)",
  "multirange_before_range(anymultirange,anyrange)",
  "multirange_cmp(anymultirange,anymultirange)",
  "multirange_contained_by_multirange(anymultirange,anymultirange)",
  "multirange_contained_by_range(anymultirange,anyrange)",
  "multirange_contains_elem(anymultirange,anyelement)",
  "multirange_contains_multirange(anymultirange,anymultirange)",
  "multirange_contains_range(anymultirange,anyrange)",
  "multirange_eq(anymultirange,anymultirange)", "multirange_ge(anymultirange,anymultirange)",
  "multirange_gt(anymultirange,anymultirange)",
  "multirange_intersect(anymultirange,anymultirange)",
  "multirange_le(anymultirange,anymultirange)", "multirange_lt(anymultirange,anymultirange)",
  "multirange_minus(anymultirange,anymultirange)",
  "multirange_ne(anymultirange,anymultirange)", "multirange_out(anymultirange)",
  "multirange_overlaps_multirange(anymultirange,anymultirange)",
  "multirange_overlaps_range(anymultirange,anyrange)",
  "multirange_overleft_multirange(anymultirange,anymultirange)",
  "multirange_overleft_range(anymultirange,anyrange)",
  "multirange_overright_multirange(anymultirange,anymultirange)",
  "multirange_overright_range(anymultirange,anyrange)", "multirange_send(anymultirange)",
  "multirange_union(anymultirange,anymultirange)", "mxid_age(xid)", "nameconcatoid(name,oid)",
  "nameeq(name,name)", "nameeqtext(name,text)", "namege(name,name)", "namegetext(name,text)",
  "namegt(name,name)", "namegttext(name,text)", "nameiclike(name,text)",
  "nameicnlike(name,text)", "nameicregexeq(name,text)", "nameicregexne(name,text)",
  "namele(name,name)", "nameletext(name,text)", "namelike(name,text)", "namelt(name,name)",
  "namelttext(name,text)", "namene(name,name)", "namenetext(name,text)",
  "namenlike(name,text)", "nameout(name)", "nameregexeq(name,text)", "nameregexne(name,text)",
  "namesend(name)", "network_cmp(inet,inet)", "network_eq(inet,inet)", "network_ge(inet,inet)",
  "network_gt(inet,inet)", "network_larger(inet,inet)", "network_le(inet,inet)",
  "network_lt(inet,inet)", "network_ne(inet,inet)", "network_overlap(inet,inet)",
  "network_smaller(inet,inet)", "network_sub(inet,inet)", "network_subeq(inet,inet)",
  "network_sup(inet,inet)", "network_supeq(inet,inet)", "notlike(bytea,bytea)",
  "notlike(name,text)", "notlike(text,text)", "npoints(path)", "npoints(polygon)",
  "numeric_abs(numeric)", "numeric_add(numeric,numeric)", "numeric_cmp(numeric,numeric)",
  "numeric_div(numeric,numeric)", "numeric_div_trunc(numeric,numeric)",
  "numeric_eq(numeric,numeric)", "numeric_exp(numeric)", "numeric_ge(numeric,numeric)",
  "numeric_gt(numeric,numeric)", "numeric_inc(numeric)", "numeric_larger(numeric,numeric)",
  "numeric_le(numeric,numeric)", "numeric_ln(numeric)", "numeric_log(numeric,numeric)",
  "numeric_lt(numeric,numeric)", "numeric_mod(numeric,numeric)",
  "numeric_mul(numeric,numeric)", "numeric_ne(numeric,numeric)", "numeric_out(numeric)",
  "numeric_pl_pg_lsn(numeric,pg_lsn)", "numeric_power(numeric,numeric)",
  "numeric_send(numeric)", "numeric_smaller(numeric,numeric)", "numeric_sqrt(numeric)",
  "numeric_sub(numeric,numeric)", "numeric_uminus(numeric)", "numeric_uplus(numeric)",
  "numerictypmodout(integer)", "nummultirange()", "numrange_subdiff(numeric,numeric)",
  "oideq(oid,oid)", "oidge(oid,oid)", "oidgt(oid,oid)", "oidlarger(oid,oid)", "oidle(oid,oid)",
  "oidlt(oid,oid)", "oidne(oid,oid)", "oidout(oid)", "oidsend(oid)", "oidsmaller(oid,oid)",
  "oidvectoreq(oidvector,oidvector)", "oidvectorge(oidvector,oidvector)",
  "oidvectorgt(oidvector,oidvector)", "oidvectorle(oidvector,oidvector)",
  "oidvectorlt(oidvector,oidvector)", "oidvectorne(oidvector,oidvector)",
  "oidvectorout(oidvector)", "oidvectorsend(oidvector)", "oidvectortypes(oidvector)",
  "on_pb(point,box)", "on_pl(point,line)", "on_ppath(point,path)", "on_ps(point,lseg)",
  "on_sb(lseg,box)", "on_sl(lseg,line)", "path_add_pt(path,point)",
  "path_contain_pt(path,point)", "path_div_pt(path,point)", "path_inter(path,path)",
  "path_length(path)", "path_mul_pt(path,point)", "path_n_eq(path,path)",
  "path_n_ge(path,path)", "path_n_gt(path,path)", "path_n_le(path,path)",
  "path_n_lt(path,path)", "path_npoints(path)", "path_out(path)", "path_send(path)",
  "path_sub_pt(path,point)", "pclose(path)", "pg_available_extensions()",
  "pg_char_to_encoding(name)", "pg_client_encoding()", 'pg_column_size("any")',
  "pg_conf_load_time()", "pg_config()", "pg_current_snapshot()", "pg_current_xact_id()",
  "pg_cursor()", "pg_encoding_to_char(integer)", "pg_get_catalog_foreign_keys()",
  "pg_get_keywords()", "pg_get_userbyid(oid)", "pg_is_other_temp_schema(oid)",
  "pg_lsn(numeric)", "pg_lsn_cmp(pg_lsn,pg_lsn)", "pg_lsn_eq(pg_lsn,pg_lsn)",
  "pg_lsn_ge(pg_lsn,pg_lsn)", "pg_lsn_gt(pg_lsn,pg_lsn)", "pg_lsn_hash(pg_lsn)",
  "pg_lsn_hash_extended(pg_lsn,bigint)", "pg_lsn_larger(pg_lsn,pg_lsn)",
  "pg_lsn_le(pg_lsn,pg_lsn)", "pg_lsn_lt(pg_lsn,pg_lsn)", "pg_lsn_mi(pg_lsn,pg_lsn)",
  "pg_lsn_mii(pg_lsn,numeric)", "pg_lsn_ne(pg_lsn,pg_lsn)", "pg_lsn_out(pg_lsn)",
  "pg_lsn_pli(pg_lsn,numeric)", "pg_lsn_send(pg_lsn)", "pg_lsn_smaller(pg_lsn,pg_lsn)",
  "pg_my_temp_schema()", "pg_numa_available()", "pg_postmaster_start_time()",
  "pg_size_bytes(text)", "pg_size_pretty(bigint)", "pg_size_pretty(numeric)",
  "pg_stat_get_analyze_count(oid)", "pg_stat_get_archiver()",
  "pg_stat_get_autoanalyze_count(oid)", "pg_stat_get_autovacuum_count(oid)",
  "pg_stat_get_backend_activity(integer)", "pg_stat_get_backend_idset()",
  "pg_stat_get_bgwriter_buf_written_clean()", "pg_stat_get_bgwriter_maxwritten_clean()",
  "pg_stat_get_bgwriter_stat_reset_time()", "pg_stat_get_blocks_fetched(oid)",
  "pg_stat_get_blocks_hit(oid)", "pg_stat_get_buf_alloc()",
  "pg_stat_get_checkpointer_buffers_written()", "pg_stat_get_checkpointer_num_performed()",
  "pg_stat_get_checkpointer_num_requested()", "pg_stat_get_checkpointer_num_timed()",
  "pg_stat_get_checkpointer_restartpoints_performed()",
  "pg_stat_get_checkpointer_restartpoints_requested()",
  "pg_stat_get_checkpointer_restartpoints_timed()", "pg_stat_get_checkpointer_slru_written()",
  "pg_stat_get_checkpointer_stat_reset_time()", "pg_stat_get_checkpointer_sync_time()",
  "pg_stat_get_checkpointer_write_time()", "pg_stat_get_db_active_time(oid)",
  "pg_stat_get_db_blk_read_time(oid)", "pg_stat_get_db_blk_write_time(oid)",
  "pg_stat_get_db_blocks_fetched(oid)", "pg_stat_get_db_blocks_hit(oid)",
  "pg_stat_get_db_checksum_failures(oid)", "pg_stat_get_db_conflict_all(oid)",
  "pg_stat_get_db_conflict_bufferpin(oid)", "pg_stat_get_db_conflict_lock(oid)",
  "pg_stat_get_db_conflict_logicalslot(oid)", "pg_stat_get_db_conflict_snapshot(oid)",
  "pg_stat_get_db_conflict_startup_deadlock(oid)", "pg_stat_get_db_conflict_tablespace(oid)",
  "pg_stat_get_db_deadlocks(oid)", "pg_stat_get_db_idle_in_transaction_time(oid)",
  "pg_stat_get_db_numbackends(oid)", "pg_stat_get_db_parallel_workers_launched(oid)",
  "pg_stat_get_db_parallel_workers_to_launch(oid)", "pg_stat_get_db_session_time(oid)",
  "pg_stat_get_db_sessions(oid)", "pg_stat_get_db_sessions_abandoned(oid)",
  "pg_stat_get_db_sessions_fatal(oid)", "pg_stat_get_db_sessions_killed(oid)",
  "pg_stat_get_db_temp_bytes(oid)", "pg_stat_get_db_temp_files(oid)",
  "pg_stat_get_db_tuples_deleted(oid)", "pg_stat_get_db_tuples_fetched(oid)",
  "pg_stat_get_db_tuples_inserted(oid)", "pg_stat_get_db_tuples_returned(oid)",
  "pg_stat_get_db_tuples_updated(oid)", "pg_stat_get_db_xact_commit(oid)",
  "pg_stat_get_db_xact_rollback(oid)", "pg_stat_get_dead_tuples(oid)",
  "pg_stat_get_ins_since_vacuum(oid)", "pg_stat_get_live_tuples(oid)",
  "pg_stat_get_mod_since_analyze(oid)", "pg_stat_get_numscans(oid)",
  "pg_stat_get_replication_slot(text)", "pg_stat_get_slru()",
  "pg_stat_get_subscription_stats(oid)", "pg_stat_get_total_analyze_time(oid)",
  "pg_stat_get_total_autoanalyze_time(oid)", "pg_stat_get_total_autovacuum_time(oid)",
  "pg_stat_get_total_vacuum_time(oid)", "pg_stat_get_tuples_deleted(oid)",
  "pg_stat_get_tuples_fetched(oid)", "pg_stat_get_tuples_hot_updated(oid)",
  "pg_stat_get_tuples_inserted(oid)", "pg_stat_get_tuples_newpage_updated(oid)",
  "pg_stat_get_tuples_returned(oid)", "pg_stat_get_tuples_updated(oid)",
  "pg_stat_get_vacuum_count(oid)", "pg_stat_get_wal()", "pg_tablespace_location(oid)",
  "pg_timezone_abbrevs_abbrevs()", "pg_timezone_names()", "pg_trigger_depth()",
  "pg_wal_lsn_diff(pg_lsn,pg_lsn)", "pg_walfile_name(pg_lsn)",
  "pg_walfile_name_offset(pg_lsn)", "point_above(point,point)", "point_add(point,point)",
  "point_below(point,point)", "point_distance(point,point)", "point_div(point,point)",
  "point_eq(point,point)", "point_horiz(point,point)", "point_left(point,point)",
  "point_mul(point,point)", "point_ne(point,point)", "point_out(point)",
  "point_right(point,point)", "point_send(point)", "point_sub(point,point)",
  "point_vert(point,point)", "poly_above(polygon,polygon)", "poly_below(polygon,polygon)",
  "poly_center(polygon)", "poly_contain(polygon,polygon)", "poly_contain_pt(polygon,point)",
  "poly_contained(polygon,polygon)", "poly_distance(polygon,polygon)",
  "poly_left(polygon,polygon)", "poly_npoints(polygon)", "poly_out(polygon)",
  "poly_overabove(polygon,polygon)", "poly_overbelow(polygon,polygon)",
  "poly_overlap(polygon,polygon)", "poly_overleft(polygon,polygon)",
  "poly_overright(polygon,polygon)", "poly_right(polygon,polygon)",
  "poly_same(polygon,polygon)", "poly_send(polygon)", "popen(path)",
  "postgresql_fdw_validator(text[],oid)", "pt_contained_circle(point,circle)",
  "pt_contained_poly(point,polygon)", "radius(circle)", "range_adjacent(anyrange,anyrange)",
  "range_adjacent_multirange(anyrange,anymultirange)", "range_after(anyrange,anyrange)",
  "range_after_multirange(anyrange,anymultirange)", "range_before(anyrange,anyrange)",
  "range_before_multirange(anyrange,anymultirange)", "range_cmp(anyrange,anyrange)",
  "range_contained_by(anyrange,anyrange)",
  "range_contained_by_multirange(anyrange,anymultirange)", "range_contains(anyrange,anyrange)",
  "range_contains_elem(anyrange,anyelement)",
  "range_contains_multirange(anyrange,anymultirange)", "range_eq(anyrange,anyrange)",
  "range_ge(anyrange,anyrange)", "range_gt(anyrange,anyrange)",
  "range_intersect(anyrange,anyrange)", "range_le(anyrange,anyrange)",
  "range_lt(anyrange,anyrange)", "range_minus(anyrange,anyrange)",
  "range_ne(anyrange,anyrange)", "range_out(anyrange)", "range_overlaps(anyrange,anyrange)",
  "range_overlaps_multirange(anyrange,anymultirange)", "range_overleft(anyrange,anyrange)",
  "range_overleft_multirange(anyrange,anymultirange)", "range_overright(anyrange,anyrange)",
  "range_overright_multirange(anyrange,anymultirange)", "range_send(anyrange)",
  "range_union(anyrange,anyrange)", "record_eq(record,record)", "record_ge(record,record)",
  "record_gt(record,record)", "record_image_eq(record,record)",
  "record_image_ge(record,record)", "record_image_gt(record,record)",
  "record_image_le(record,record)", "record_image_lt(record,record)",
  "record_image_ne(record,record)", "record_larger(record,record)", "record_le(record,record)",
  "record_lt(record,record)", "record_ne(record,record)", "record_out(record)",
  "record_send(record)", "record_smaller(record,record)", "regconfigout(regconfig)",
  "regconfigsend(regconfig)", "row_security_active(oid)", "slope(point,point)",
  "spg_poly_quad_compress(polygon)", "text_ge(text,text)", "text_gt(text,text)",
  "text_larger(text,text)", "text_le(text,text)", "text_lt(text,text)",
  "text_pattern_ge(text,text)", "text_pattern_gt(text,text)", "text_pattern_le(text,text)",
  "text_pattern_lt(text,text)", "text_smaller(text,text)", "textanycat(text,anynonarray)",
  "textcat(text,text)", "texteq(text,text)", "texteqname(text,name)", "textgename(text,name)",
  "textgtname(text,name)", "texticlike(text,text)", "texticnlike(text,text)",
  "texticregexeq(text,text)", "texticregexne(text,text)", "textlen(text)",
  "textlename(text,name)", "textlike(text,text)", "textltname(text,name)", "textne(text,text)",
  "textnename(text,name)", "textnlike(text,text)", "textout(text)", "textregexeq(text,text)",
  "textregexne(text,text)", "textsend(text)", "tideq(tid,tid)", "tidge(tid,tid)",
  "tidgt(tid,tid)", "tidlarger(tid,tid)", "tidle(tid,tid)", "tidlt(tid,tid)", "tidne(tid,tid)",
  "tidout(tid)", "tidsend(tid)", "tidsmaller(tid,tid)",
  "time_cmp(time without time zone,time without time zone)",
  "time_eq(time without time zone,time without time zone)",
  "time_ge(time without time zone,time without time zone)",
  "time_gt(time without time zone,time without time zone)",
  "time_hash(time without time zone)", "time_hash_extended(time without time zone,bigint)",
  "time_larger(time without time zone,time without time zone)",
  "time_le(time without time zone,time without time zone)",
  "time_lt(time without time zone,time without time zone)",
  "time_mi_interval(time without time zone,interval)",
  "time_mi_time(time without time zone,time without time zone)",
  "time_ne(time without time zone,time without time zone)", "time_out(time without time zone)",
  "time_pl_interval(time without time zone,interval)", "time_send(time without time zone)",
  "time_smaller(time without time zone,time without time zone)",
  "timedate_pl(time without time zone,date)",
  "timestamp_cmp(timestamp without time zone,timestamp without time zone)",
  "timestamp_cmp_date(timestamp without time zone,date)",
  "timestamp_cmp_timestamptz(timestamp without time zone,timestamp with time zone)",
  "timestamp_eq(timestamp without time zone,timestamp without time zone)",
  "timestamp_eq_date(timestamp without time zone,date)",
  "timestamp_eq_timestamptz(timestamp without time zone,timestamp with time zone)",
  "timestamp_ge(timestamp without time zone,timestamp without time zone)",
  "timestamp_ge_date(timestamp without time zone,date)",
  "timestamp_ge_timestamptz(timestamp without time zone,timestamp with time zone)",
  "timestamp_gt(timestamp without time zone,timestamp without time zone)",
  "timestamp_gt_date(timestamp without time zone,date)",
  "timestamp_gt_timestamptz(timestamp without time zone,timestamp with time zone)",
  "timestamp_hash(timestamp without time zone)",
  "timestamp_hash_extended(timestamp without time zone,bigint)",
  "timestamp_larger(timestamp without time zone,timestamp without time zone)",
  "timestamp_le(timestamp without time zone,timestamp without time zone)",
  "timestamp_le_date(timestamp without time zone,date)",
  "timestamp_le_timestamptz(timestamp without time zone,timestamp with time zone)",
  "timestamp_lt(timestamp without time zone,timestamp without time zone)",
  "timestamp_lt_date(timestamp without time zone,date)",
  "timestamp_lt_timestamptz(timestamp without time zone,timestamp with time zone)",
  "timestamp_mi(timestamp without time zone,timestamp without time zone)",
  "timestamp_mi_interval(timestamp without time zone,interval)",
  "timestamp_ne(timestamp without time zone,timestamp without time zone)",
  "timestamp_ne_date(timestamp without time zone,date)",
  "timestamp_ne_timestamptz(timestamp without time zone,timestamp with time zone)",
  "timestamp_out(timestamp without time zone)",
  "timestamp_pl_interval(timestamp without time zone,interval)",
  "timestamp_send(timestamp without time zone)",
  "timestamp_smaller(timestamp without time zone,timestamp without time zone)",
  "timestamptypmodout(integer)",
  "timestamptz_cmp(timestamp with time zone,timestamp with time zone)",
  "timestamptz_cmp_date(timestamp with time zone,date)",
  "timestamptz_cmp_timestamp(timestamp with time zone,timestamp without time zone)",
  "timestamptz_eq(timestamp with time zone,timestamp with time zone)",
  "timestamptz_eq_date(timestamp with time zone,date)",
  "timestamptz_eq_timestamp(timestamp with time zone,timestamp without time zone)",
  "timestamptz_ge(timestamp with time zone,timestamp with time zone)",
  "timestamptz_ge_date(timestamp with time zone,date)",
  "timestamptz_ge_timestamp(timestamp with time zone,timestamp without time zone)",
  "timestamptz_gt(timestamp with time zone,timestamp with time zone)",
  "timestamptz_gt_date(timestamp with time zone,date)",
  "timestamptz_gt_timestamp(timestamp with time zone,timestamp without time zone)",
  "timestamptz_hash(timestamp with time zone)",
  "timestamptz_hash_extended(timestamp with time zone,bigint)",
  "timestamptz_larger(timestamp with time zone,timestamp with time zone)",
  "timestamptz_le(timestamp with time zone,timestamp with time zone)",
  "timestamptz_le_date(timestamp with time zone,date)",
  "timestamptz_le_timestamp(timestamp with time zone,timestamp without time zone)",
  "timestamptz_lt(timestamp with time zone,timestamp with time zone)",
  "timestamptz_lt_date(timestamp with time zone,date)",
  "timestamptz_lt_timestamp(timestamp with time zone,timestamp without time zone)",
  "timestamptz_mi(timestamp with time zone,timestamp with time zone)",
  "timestamptz_mi_interval(timestamp with time zone,interval)",
  "timestamptz_ne(timestamp with time zone,timestamp with time zone)",
  "timestamptz_ne_date(timestamp with time zone,date)",
  "timestamptz_ne_timestamp(timestamp with time zone,timestamp without time zone)",
  "timestamptz_out(timestamp with time zone)",
  "timestamptz_pl_interval(timestamp with time zone,interval)",
  "timestamptz_send(timestamp with time zone)",
  "timestamptz_smaller(timestamp with time zone,timestamp with time zone)",
  "timestamptztypmodout(integer)", "timetypmodout(integer)",
  "timetz_cmp(time with time zone,time with time zone)",
  "timetz_eq(time with time zone,time with time zone)",
  "timetz_ge(time with time zone,time with time zone)",
  "timetz_gt(time with time zone,time with time zone)", "timetz_hash(time with time zone)",
  "timetz_hash_extended(time with time zone,bigint)",
  "timetz_larger(time with time zone,time with time zone)",
  "timetz_le(time with time zone,time with time zone)",
  "timetz_lt(time with time zone,time with time zone)",
  "timetz_mi_interval(time with time zone,interval)",
  "timetz_ne(time with time zone,time with time zone)", "timetz_out(time with time zone)",
  "timetz_pl_interval(time with time zone,interval)", "timetz_send(time with time zone)",
  "timetz_smaller(time with time zone,time with time zone)",
  "timetzdate_pl(time with time zone,date)", "timetztypmodout(integer)",
  "ts_delete(tsvector,text)", "ts_delete(tsvector,text[])", "ts_match_qv(tsquery,tsvector)",
  "ts_match_tq(text,tsquery)", "ts_match_tt(text,text)", "ts_match_vq(tsvector,tsquery)",
  "ts_rewrite(tsquery,tsquery,tsquery)", "tsmultirange()", "tsq_mcontained(tsquery,tsquery)",
  "tsq_mcontains(tsquery,tsquery)", "tsquery_and(tsquery,tsquery)",
  "tsquery_cmp(tsquery,tsquery)", "tsquery_eq(tsquery,tsquery)", "tsquery_ge(tsquery,tsquery)",
  "tsquery_gt(tsquery,tsquery)", "tsquery_le(tsquery,tsquery)", "tsquery_lt(tsquery,tsquery)",
  "tsquery_ne(tsquery,tsquery)", "tsquery_not(tsquery)", "tsquery_or(tsquery,tsquery)",
  "tsquery_phrase(tsquery,tsquery)", "tsquery_phrase(tsquery,tsquery,integer)",
  "tsqueryout(tsquery)", "tsquerysend(tsquery)",
  "tsrange_subdiff(timestamp without time zone,timestamp without time zone)",
  "tstzmultirange()", "tstzrange_subdiff(timestamp with time zone,timestamp with time zone)",
  "tsvector_cmp(tsvector,tsvector)", "tsvector_concat(tsvector,tsvector)",
  "tsvector_eq(tsvector,tsvector)", "tsvector_ge(tsvector,tsvector)",
  "tsvector_gt(tsvector,tsvector)", "tsvector_le(tsvector,tsvector)",
  "tsvector_lt(tsvector,tsvector)", "tsvector_ne(tsvector,tsvector)", "tsvectorout(tsvector)",
  "tsvectorsend(tsvector)", "txid_current_snapshot()", "unnest(anymultirange)",
  "uuid_cmp(uuid,uuid)", "uuid_eq(uuid,uuid)", "uuid_ge(uuid,uuid)", "uuid_gt(uuid,uuid)",
  "uuid_hash(uuid)", "uuid_hash_extended(uuid,bigint)", "uuid_le(uuid,uuid)",
  "uuid_lt(uuid,uuid)", "uuid_ne(uuid,uuid)", "uuid_out(uuid)", "uuid_send(uuid)",
  "varbit_out(bit varying)", "varbit_send(bit varying)", "varbitcmp(bit varying,bit varying)",
  "varbiteq(bit varying,bit varying)", "varbitge(bit varying,bit varying)",
  "varbitgt(bit varying,bit varying)", "varbitle(bit varying,bit varying)",
  "varbitlt(bit varying,bit varying)", "varbitne(bit varying,bit varying)",
  "varbittypmodout(integer)", "varcharout(character varying)",
  "varcharsend(character varying)", "varchartypmodout(integer)", "width(box)",
  "xid8_larger(xid8,xid8)", "xid8_smaller(xid8,xid8)", "xid8cmp(xid8,xid8)",
  "xid8eq(xid8,xid8)", "xid8ge(xid8,xid8)", "xid8gt(xid8,xid8)", "xid8le(xid8,xid8)",
  "xid8lt(xid8,xid8)", "xid8ne(xid8,xid8)", "xid8out(xid8)", "xid8send(xid8)",
  "xideq(xid,xid)", "xideqint4(xid,integer)", "xidneq(xid,xid)", "xidneqint4(xid,integer)",
  "xidout(xid)", "xidsend(xid)",
  // -----------------------------------------------------------------------
  // THE VOLATILE BUCKET (2026-08-21). 276 pg_catalog signatures were excluded
  // from execution on `provolatile = 'v'` and had no verdict from anything —
  // not claimed, not witnessed, just skipped. Volatility says a repeat call
  // may answer differently; it says nothing about whether a result exists,
  // and `nextval` proved the difference by being strict, volatile and total
  // while reading nullable. The gate is gone from all three probes and these
  // rows classify by execution like the rest of the surface.
  //
  // Every row here was convicted by tests/probe/cluster-sweep.ts --volatile
  // and then by builtin-surface.test.ts, and each was read against the
  // PostgreSQL source PGlite builds from, because a probe that finds no NULL
  // in one server state is not the same as a function with no NULL to find.
  // That reading is what kept eight rows out: four whose `PG_RETURN_NULL` is
  // live in a state no query can reach (recorded in the surface suite's
  // SETTLED_ELSEWHERE) and four whose NULL the probe DATABASE was hiding — a
  // regclass naming a dropped relation and an un-called sequence joined
  // probe-values.ts, and six signatures moved to witnessed instead.
  //
  // A COMPOSITE row's claim is about the row VALUE. `pg_control_system()`
  // never returns a NULL record; its FIELDS stay nullable either way, since
  // a function's composite result carries no constraints
  // (`resolveTableFunctionColumns`).
  // -----------------------------------------------------------------------
  // Randomness and generated identifiers. `random` is why the sweep was
  // needed at all: the NAME left ALWAYS_NOT_NULL_BUILTINS because PG17's
  // two-argument overloads are strict, so `random(NULL, NULL)` is NULL —
  // and the rows themselves are total for non-null arguments, which is what
  // signature keying can say and a name cannot.
  "array_sample(anyarray,integer)", "array_shuffle(anyarray)", "random()",
  "random(bigint,bigint)", "random(integer,integer)", "random(numeric,numeric)",
  "random_normal(double precision,double precision)", "setseed(double precision)",
  "timeofday()", "uuidv4()", "uuidv7()", "uuidv7(interval)",
  // Large objects. Every one raises on a descriptor or OID that is not
  // there — "large object 0 does not exist", "invalid large-object
  // descriptor" — and a raise is not a NULL. The nine that take a
  // DESCRIPTOR are probed through a `COHERENT_CALLS` entry that opens one
  // inline, because a descriptor lives only inside the transaction that
  // opened it and no integer the corpus carries is ever a valid one.
  "lo_close(integer)", "lo_creat(integer)", "lo_create(oid)", "lo_export(oid,text)",
  "lo_from_bytea(oid,bytea)", "lo_get(oid)", "lo_get(oid,bigint,integer)",
  "lo_import(text)", "lo_import(text,oid)", "lo_lseek(integer,integer,integer)",
  "lo_lseek64(integer,bigint,integer)", "lo_open(oid,integer)",
  "lo_put(oid,bigint,bytea)", "lo_tell(integer)", "lo_tell64(integer)",
  "lo_truncate(integer,integer)", "lo_truncate64(integer,bigint)", "lo_unlink(oid)",
  "loread(integer,integer)", "lowrite(integer,bytea)",
  // Advisory locks: void for the waiting spellings, boolean for the `try`
  // and `unlock` ones. An unlock that held nothing warns and answers false.
  "pg_advisory_lock(bigint)", "pg_advisory_lock(integer,integer)",
  "pg_advisory_lock_shared(bigint)", "pg_advisory_lock_shared(integer,integer)",
  "pg_advisory_unlock(bigint)", "pg_advisory_unlock(integer,integer)",
  "pg_advisory_unlock_all()", "pg_advisory_unlock_shared(bigint)",
  "pg_advisory_unlock_shared(integer,integer)", "pg_advisory_xact_lock(bigint)",
  "pg_advisory_xact_lock(integer,integer)", "pg_advisory_xact_lock_shared(bigint)",
  "pg_advisory_xact_lock_shared(integer,integer)", "pg_try_advisory_lock(bigint)",
  "pg_try_advisory_lock(integer,integer)", "pg_try_advisory_lock_shared(bigint)",
  "pg_try_advisory_lock_shared(integer,integer)", "pg_try_advisory_xact_lock(bigint)",
  "pg_try_advisory_xact_lock(integer,integer)",
  "pg_try_advisory_xact_lock_shared(bigint)",
  "pg_try_advisory_xact_lock_shared(integer,integer)",
  // Statistics. The per-transaction table counters answer 0 for a relation
  // with no entry rather than NULL — their macro says `result = 0` where
  // `find_tabstat_entry` returns nothing. Their FUNCTION-stat siblings do
  // the opposite and are witnessed, which is why the name carries no claim.
  "pg_stat_clear_snapshot()", "pg_stat_force_next_flush()",
  "pg_stat_get_xact_blocks_fetched(oid)", "pg_stat_get_xact_blocks_hit(oid)",
  "pg_stat_get_xact_numscans(oid)", "pg_stat_get_xact_tuples_deleted(oid)",
  "pg_stat_get_xact_tuples_fetched(oid)", "pg_stat_get_xact_tuples_hot_updated(oid)",
  "pg_stat_get_xact_tuples_inserted(oid)",
  "pg_stat_get_xact_tuples_newpage_updated(oid)",
  "pg_stat_get_xact_tuples_returned(oid)", "pg_stat_get_xact_tuples_updated(oid)",
  "pg_stat_have_stats(text,oid,bigint)",
  "pg_stat_reset()", "pg_stat_reset_backend_stats(integer)",
  "pg_stat_reset_shared(text)",
  "pg_stat_reset_single_function_counters(oid)",
  "pg_stat_reset_single_table_counters(oid)", "pg_stat_reset_slru(text)",
  "pg_stat_reset_subscription_stats(oid)",
  // WAL, backup and replication. Each answers an LSN, a void or a composite,
  // and refuses out of context by raising — `pg_switch_wal()` and the
  // `pg_current_wal_*` trio raise during recovery, `pg_wal_replay_pause()`
  // raises outside it and is unprobed for exactly that reason.
  "pg_backup_start(text,boolean)", "pg_backup_stop(boolean)",
  "pg_create_physical_replication_slot(name,boolean,boolean)",
  "pg_create_restore_point(text)", "pg_current_wal_flush_lsn()",
  "pg_current_wal_insert_lsn()", "pg_current_wal_lsn()",
  "pg_drop_replication_slot(name)", "pg_get_wal_resource_managers()",
  "pg_get_wal_summarizer_state()", "pg_is_in_recovery()", "pg_log_standby_snapshot()",
  "pg_logical_emit_message(boolean,text,bytea,boolean)",
  "pg_logical_emit_message(boolean,text,text,boolean)", "pg_ls_waldir()",
  "pg_replication_origin_create(text)", "pg_replication_origin_drop(text)",
  "pg_replication_origin_session_is_setup()", "pg_replication_origin_xact_reset()",
  "pg_switch_wal()",
  // Signals, notifications and settings. `set_config` is the one that is
  // ordinary application SQL: it is NON-STRICT and raises rather than
  // answering NULL for a NULL name, and returns the new value as text.
  "pg_cancel_backend(integer)", "pg_log_backend_memory_contexts(integer)",
  "pg_notify(text,text)", "pg_reload_conf()", "pg_rotate_logfile()",
  "pg_terminate_backend(integer,bigint)", "set_config(text,text,boolean)",
  // Server-side files, the spellings WITHOUT `missing_ok`. Their
  // `missing_ok` twins return NULL for a file that is not there and are
  // witnessed; these pass the flag as false and raise instead.
  "pg_clear_attribute_stats(text,text,text,boolean)",
  "pg_clear_relation_stats(text,text)",
  "pg_ls_dir(text)", "pg_ls_dir(text,boolean,boolean)", "pg_read_binary_file(text)",
  "pg_read_binary_file(text,bigint,bigint)",
  "pg_read_file(text)", "pg_read_file(text,bigint,bigint)", "pg_stat_file(text)",
  // The sleeps, whose claim is a `void` and whose probed universe is the
  // BOUNDED call in COHERENT_CALLS. `REFUSED_CALLS` drops their generated
  // combinations: the corner corpus carries the infinities, and
  // `pg_sleep('Infinity')` does not come back.
  "pg_sleep(double precision)", "pg_sleep_for(interval)",
  "pg_sleep_until(timestamp with time zone)",
  // What none of those groups claims. `pg_get_sequence_data` is the pair to
  // the witness one line down in the corpus: for a missing sequence it
  // returns a record whose FIELDS are both null, which is a value and not a
  // NULL, while `pg_sequence_last_value` returns the NULL itself.
  "cursor_to_xml(refcursor,integer,boolean,boolean,text)",
  "cursor_to_xmlschema(refcursor,boolean,boolean,text)",
  "currtid2(text,tid)", "pg_blocking_pids(integer)", "pg_control_checkpoint()",
  "pg_control_init()", "pg_control_recovery()", "pg_control_system()",
  "pg_get_sequence_data(regclass)", "pg_get_wait_events()",
  "pg_import_system_collations(regnamespace)",
  "pg_isolation_test_session_is_blocked(integer,integer[])", "pg_jit_available()",
  "pg_notification_queue_usage()", "pg_safe_snapshot_blocking_pids(integer)",
  "pg_stat_get_recovery_prefetch()", "query_to_xml(text,boolean,boolean,text)",
  "query_to_xml_and_xmlschema(text,boolean,boolean,text)",
  "query_to_xmlschema(text,boolean,boolean,text)",
  // The three that take a QUERY rather than a string, and were unprobed
  // because the corpus's texts are names — `ts_stat` wants a query yielding
  // one tsvector column and `ts_rewrite` one yielding two tsqueries.
  "ts_rewrite(tsquery,text)", "ts_stat(text)", "ts_stat(text,text)",
  // -----------------------------------------------------------------------
  // REACHING THE UNPROBED SURFACE (2026-08-21). The volatile sweep left 246
  // rows that PostgreSQL had declined for every call the corpus could build,
  // and "the corpus cannot build one" turned out to be the reason for most
  // of them rather than a fact about the function. The probe database grew a
  // schema — indexes of each kind, a partitioned pair, a publication, a
  // collation, a foreign-data wrapper and server, a non-superuser role, a
  // domain, a composite type, replication slots and origins, a prepared
  // statement and a prepared transaction — and PGlite's `postgresqlconf`
  // option turned on the four settings whole families refuse without.
  // Unprobed went 246 to 124; these are what convicted.
  //
  // Audited against the PostgreSQL source PGlite builds from, as before, and
  // that audit is what separates two groups the probe cannot tell apart: a
  // `PG_RETURN_NULL` guarded by an `escontext` is the PG16 SOFT-ERROR path,
  // reachable only through `pg_input_is_valid`, and a direct call raises
  // there instead. Every input function below is in that class.
  // -----------------------------------------------------------------------
  // Type INPUT and TYPMOD entry points, reachable once the cstring corpus
  // carried one literal per type's syntax and the probe database had a
  // domain and a composite for the two that take a target type.
  "aclitemin(cstring)", "array_in(cstring,oid,integer)", "bittypmodin(cstring[])",
  "boolin(cstring)", "box_in(cstring)", "bpchartypmodin(cstring[])",
  "circle_in(cstring)", "date_in(cstring)", "domain_in(cstring,oid,integer)",
  "enum_in(cstring,oid)", "inet_in(cstring)", "intervaltypmodin(cstring[])",
  "line_in(cstring)", "lseg_in(cstring)", "macaddr8_in(cstring)",
  "macaddr_in(cstring)", "multirange_in(cstring,oid,integer)",
  "numerictypmodin(cstring[])", "path_in(cstring)", "pg_lsn_in(cstring)",
  "pg_snapshot_in(cstring)", "point_in(cstring)", "poly_in(cstring)",
  "range_in(cstring,oid,integer)", "record_in(cstring,oid,integer)", "tidin(cstring)",
  "time_in(cstring,oid,integer)", "timestamp_in(cstring,oid,integer)",
  "timestamptypmodin(cstring[])", "timestamptz_in(cstring,oid,integer)",
  "timestamptztypmodin(cstring[])", "timetypmodin(cstring[])",
  "timetz_in(cstring,oid,integer)", "timetztypmodin(cstring[])",
  "txid_snapshot_in(cstring)", "uuid_in(cstring)", "varbittypmodin(cstring[])",
  "varchartypmodin(cstring[])",
  // Aggregate TRANSITION functions, over a correctly shaped accumulator.
  // Their `avg`/`sum` finalisers are NOT here: a zero count is NULL, which
  // the same corpus value falsified two standing claims with.
  "float4_accum(double precision[],real)",
  "float8_accum(double precision[],double precision)",
  "float8_combine(double precision[],double precision[])",
  "float8_regr_accum(double precision[],double precision,double precision)",
  "float8_regr_combine(double precision[],double precision[])",
  // What the probe database's own objects unblocked, and the four settings.
  "amvalidate(oid)", "brin_desummarize_range(regclass,bigint)",
  "brin_summarize_new_values(regclass)", "brin_summarize_range(regclass,bigint)",
  "fmgr_c_validator(oid)", "fmgr_internal_validator(oid)", "fmgr_sql_validator(oid)",
  "gin_clean_pending_list(regclass)",
  "has_foreign_data_wrapper_privilege(name,text,text)",
  "has_foreign_data_wrapper_privilege(oid,text,text)",
  "has_foreign_data_wrapper_privilege(text,text)",
  "has_server_privilege(name,text,text)", "has_server_privilege(oid,text,text)",
  "has_server_privilege(text,text)", "json_populate_record(anyelement,json,boolean)",
  "json_populate_recordset(anyelement,json,boolean)",
  "jsonb_populate_record(anyelement,jsonb)",
  "jsonb_populate_record_valid(anyelement,jsonb)",
  "jsonb_populate_recordset(anyelement,jsonb)",
  "pg_copy_physical_replication_slot(name,name)",
  "pg_copy_physical_replication_slot(name,name,boolean)",
  "pg_get_object_address(text,text[],text[])", "pg_identify_object(oid,oid,integer)",
  "pg_identify_object_as_address(oid,oid,integer)", "pg_last_committed_xact()",
  "pg_listening_channels()", "pg_ls_replslotdir(text)",
  "pg_nextoid(regclass,name,regclass)", "pg_partition_ancestors(regclass)",
  "pg_prepared_xact()", "pg_replication_origin_advance(text,pg_lsn)",
  "pg_replication_origin_xact_setup(pg_lsn,timestamp with time zone)",
  "pg_replication_slot_advance(name,pg_lsn)", "pg_restore_attribute_stats(\"any\")",
  "pg_restore_relation_stats(\"any\")", "pg_sequence_parameters(oid)",
  "pg_snapshot_xip(pg_snapshot)", "pg_split_walfile_name(text)",
  "pg_stat_reset_replication_slot(text)", "pg_tablespace_databases(oid)",
  "pg_timezone_abbrevs_zone()", "pg_xact_commit_timestamp_origin(xid)",
  "plpgsql_validator(oid)", "satisfies_hash_partition(oid,integer,integer,\"any\")",
  "schema_to_xml(name,boolean,boolean,text)",
  "schema_to_xml_and_xmlschema(name,boolean,boolean,text)",
  "schema_to_xmlschema(name,boolean,boolean,text)", "to_ascii(text,integer)",
  "to_ascii(text,name)", "ts_parse(oid,text)", "ts_token_type(oid)",
  "txid_snapshot_xip(txid_snapshot)",
  // -----------------------------------------------------------------------
  // PAST THE SELECT (2026-08-21). Nine rows that no expression in an ordinary
  // probe statement can reach at all — not because the corpus lacks a value,
  // but because the CALL needs a context a batched `SELECT` does not have: a
  // statement with no subtransaction around it, an instance holding neither a
  // prepared transaction nor a session origin, or an event trigger firing.
  // `runOutOfBandProbes()` in tests/unit/query/probe-values.ts is the three
  // mechanisms, and BOTH probes use it — the classifying suite to categorise
  // these rows and totality-probe.test.ts to hold them, which is what makes
  // them claimable rather than merely measured.
  //
  // Audited in the source as the rest were. Every one returns unconditionally
  // and every other exit from its body is an `ereport(ERROR)`:
  // `PG_RETURN_VOID` for the two origin rows, `PG_RETURN_OID` and
  // `PG_RETURN_INT32` for the table-rewrite pair, `pstrdup` for the snapshot
  // export, and `memset(nulls, 0, sizeof(nulls))` before `heap_form_tuple`
  // for the slot rows. The slot claim is about the RECORD, which is the
  // granularity these tables work at — `copy_replication_slot` does leave the
  // lsn FIELD null for an unset confirmed_flush, and a field of a composite
  // result is nullable in the walk regardless.
  //
  // Their two set-returning siblings are NOT here and are witnessed instead:
  // `pg_event_trigger_ddl_commands()` nulls five columns on the `SCT_Grant`
  // branch, and `pg_event_trigger_dropped_objects()` nulls `schema_name` for
  // an object that has no schema. The source is what said which four of the
  // six were promotable, after the probe said all six returned a value.
  "pg_copy_logical_replication_slot(name,name)",
  "pg_copy_logical_replication_slot(name,name,boolean)",
  "pg_copy_logical_replication_slot(name,name,boolean,name)",
  "pg_create_logical_replication_slot(name,name,boolean,boolean,boolean)",
  "pg_event_trigger_table_rewrite_oid()",
  "pg_event_trigger_table_rewrite_reason()",
  "pg_export_snapshot()",
  "pg_replication_origin_session_reset()",
  "pg_replication_origin_session_setup(text)",
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
