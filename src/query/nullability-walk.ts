import type { Node } from "libpg-query";
import type { FunctionInfo } from "../catalog/types.js";
import { splitQualifiedName } from "../catalog/qualified-name.js";
import { TOTAL_STRICT_OPERATORS } from "./operators.js";
import {
  collectParamFacts,
  collectParamNullability,
  forcedNullParams,
  type ParamNullability,
} from "./param-nullability.js";
import type {
  NullabilityCatalog,
  OutputNullability,
  OutputNullabilityTraced,
  ResolvedTable,
  TraceNode,
} from "./types.js";

export type { ParamNullability } from "./param-nullability.js";

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
): OutputNullability[] {
  const engine = new NullabilityEngine(catalog);
  return engine.run(stmt);
}

/**
 * Both halves of a statement's contract: what comes out (per output column)
 * and what may go in (per parameter). See docs/argument-nullability.md.
 */
export interface QueryContract {
  outputs: OutputNullability[];
  params: ParamNullability[];
}

/**
 * The full contract of one statement, from one call over one AST — the two
 * arrays can never describe different statements. Throws
 * `UnsupportedNodeError` exactly when `inferNullability` does; the parameter
 * side alone is total, and available separately via
 * `collectParamNullability` for callers that handle refused statements.
 */
export function inferQueryContract(stmt: Node, catalog: NullabilityCatalog): QueryContract {
  return {
    outputs: inferNullability(stmt, catalog),
    params: collectParamNullability(stmt, catalog),
  };
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
): OutputNullabilityTraced[] {
  const engine = new NullabilityEngine(catalog, true, onUnhandled);
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
    readonly site: "from-item" | "statement",
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
  /** Nodes currently being analyzed (prevents infinite recursion in recursive CTEs). */
  private analyzing = new WeakSet<object>();
  /**
   * What a recursive CTE's self-reference is currently assumed to produce.
   * Read by `analyzeSelect` when it re-enters a node already under analysis —
   * which happens exactly at the self-reference. See `analyzeSetOperation`.
   */
  private recursiveAssumption = new WeakMap<object, OutputNullability[]>();
  /**
   * Nodes memoized while a recursive fixpoint is iterating, so their results
   * can be dropped when the assumption they were computed under is disproved.
   * Null when no fixpoint is in progress.
   */
  private fixpointJournal: object[] | null = null;
  /** Monotonic source of null-group ids (see RelationEntry.nullGroup). */
  private nullGroupCounter = 0;
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
  /** Whether tracing is enabled. */
  private readonly tracing: boolean;
  /** The catalog. */
  private readonly catalog: NullabilityCatalog;

  private readonly onUnhandled: UnhandledNodeObserver | undefined;

  constructor(
    catalog: NullabilityCatalog,
    tracing = false,
    onUnhandled?: UnhandledNodeObserver,
  ) {
    this.catalog = catalog;
    this.tracing = tracing;
    this.onUnhandled = onUnhandled;
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
        return this.combineSetOperationTraced(left, right, sel.op);
      }
      // For normal SELECT, build scope and trace each target.
      if (!sel.valuesLists || sel.valuesLists.length === 0) {
        const scope = this.buildScope(sel, outerScope, depth);
        const results: OutputNullabilityTraced[] = [];
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
            for (const e of expanded) results.push({ ...e });
            continue;
          }
          const trace = this.newTrace("Root");
          const notNull = this.walkExprTraced(val, scope, depth + 1, trace);
          results.push({ name: name ?? this.inferName(val), notNull, trace: trace.node });
        }
        return results;
      }
    }

    // For INSERT/UPDATE/DELETE RETURNING — trace each returning expression.
    if ("InsertStmt" in node) {
      const ins = node["InsertStmt"] as InsertStmt;
      if (!ins.returningClause) return [];
      const scope = this.buildDmlScope(ins.relation, outerScope, depth);
      this.registerCtes(ins.withClause, scope);
      return this.analyzeReturningTraced(ins.returningClause, scope, depth);
    }
    if ("UpdateStmt" in node) {
      const upd = node["UpdateStmt"] as UpdateStmt;
      if (!upd.returningClause) return [];
      const scope = this.buildDmlScope(upd.relation, outerScope, depth);
      this.registerCtes(upd.withClause, scope);
      if (upd.fromClause) {
        // Inner-join semantics — see analyzeUpdate.
        for (const item of upd.fromClause) {
          scope.visible.push(...this.walkFromItem(item, REQUIRED, scope, this.nextNullGroup(), depth));
        }
      }
      return this.analyzeReturningTraced(upd.returningClause, scope, depth);
    }
    if ("MergeStmt" in node) {
      const mrg = node["MergeStmt"] as MergeStmt;
      if (!mrg.returningClause) return [];
      const scope = this.buildMergeScope(mrg, outerScope, depth);
      return this.analyzeReturningTraced(mrg.returningClause, scope, depth);
    }
    if ("DeleteStmt" in node) {
      const del = node["DeleteStmt"] as DeleteStmt;
      if (!del.returningClause) return [];
      const scope = this.buildDmlScope(del.relation, outerScope, depth);
      this.registerCtes(del.withClause, scope);
      if (del.usingClause) {
        // Inner-join semantics — see analyzeDelete.
        for (const item of del.usingClause) {
          scope.visible.push(...this.walkFromItem(item, REQUIRED, scope, this.nextNullGroup(), depth));
        }
      }
      return this.analyzeReturningTraced(del.returningClause, scope, depth);
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
  ): OutputNullabilityTraced[] {
    const ret = returningClause as { exprs?: Node[] };
    const results: OutputNullabilityTraced[] = [];
    for (const target of ret.exprs ?? []) {
      const rt = this.unwrapResTarget(target);
      const val = rt.val;
      const name = rt.name;
      if (!val) {
        results.push({ name: name ?? "", notNull: false });
        continue;
      }
      if (this.isStarColumn(val)) {
        const expanded = this.expandStar(val, scope, depth);
        for (const e of expanded) results.push({ ...e });
        continue;
      }
      const trace = this.newTrace("Root (RETURNING)");
      const notNull = this.walkExprTraced(val, scope, depth + 1, trace);
      results.push({ name: name ?? this.inferName(val), notNull, trace: trace.node });
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

    // Process the target list.
    const results: OutputNullability[] = [];
    const targetList = stmt.targetList ?? [];
    for (const target of targetList) {
      const rt = this.unwrapResTarget(target);
      const val = rt.val;
      const name = rt.name;

      if (!val) {
        results.push({ name: name ?? "", notNull: false });
        continue;
      }

      // Handle SELECT * (A_Star in ColumnRef).
      if (this.isStarColumn(val)) {
        const expanded = this.expandStar(val, scope, depth);
        for (const e of expanded) {
          results.push(e);
        }
        continue;
      }

      const notNull = this.walkExpr(val, scope, depth + 1);
      results.push({ name: name ?? this.inferName(val), notNull });
    }

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
      visible: [],
      rowsImplyWhere: stmt.groupClause?.length
        ? this.groupingGuaranteesNonEmptyGroups(stmt)
        : !this.selectEmitsRowsWithoutInput(stmt),
      groupGuaranteesNonEmpty: this.groupingGuaranteesNonEmptyGroups(stmt),
      groupingSetColumns: this.collectGroupingSetColumns(stmt.groupClause),
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
          ...this.walkFromItem(item, REQUIRED, scope, this.nextNullGroup(), depth),
        );
      }
    }

    return scope;
  }

  private nextNullGroup(): number {
    return ++this.nullGroupCounter;
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
    depth: number,
  ): VisibleColumn[] {
    const node = item as Record<string, unknown>;
    if ("RangeVar" in node) {
      const rv = node["RangeVar"] as RangeVar;
      const entry = this.addRangeVar(rv, joinState, scope, nullGroup);
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
      };
      scope.aliases.set(aliasName, subEntry);
      return this.visibleColumnsOf(subEntry, scope, depth);
    } else if ("JoinExpr" in node) {
      const join = node["JoinExpr"] as JoinExpr;
      let leftState = joinState;
      let rightState = joinState;
      // The required side keeps the enclosing group; each side that this join
      // makes optional is NULL-extended as its own unit, so it starts a new one.
      let leftGroup = nullGroup;
      let rightGroup = nullGroup;
      switch (join.jointype) {
        case "JOIN_INNER":
          break; // both inherit current state and group
        case "JOIN_LEFT":
          rightState = OPTIONAL;
          rightGroup = this.nextNullGroup();
          break;
        case "JOIN_RIGHT":
          leftState = OPTIONAL;
          leftGroup = this.nextNullGroup();
          break;
        case "JOIN_FULL":
          leftState = OPTIONAL;
          leftGroup = this.nextNullGroup();
          rightState = OPTIONAL;
          rightGroup = this.nextNullGroup();
          break;
      }
      const left = join.larg ? this.walkFromItem(join.larg, leftState, scope, leftGroup, depth) : [];
      const right = join.rarg ? this.walkFromItem(join.rarg, rightState, scope, rightGroup, depth) : [];
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
      return this.addColumnListRelation(rtf.alias?.aliasname ?? "", cols, rtf.alias?.colnames, joinState, scope, nullGroup);
    } else if ("JsonTable" in node) {
      // JSON_TABLE(... COLUMNS (n FOR ORDINALITY, a int PATH '...', NESTED ...))
      const jt = node["JsonTable"] as JsonTable;
      const cols: { name: string; notNull: boolean }[] = [];
      this.collectJsonTableColumns(jt.columns, cols);
      return this.addColumnListRelation(jt.alias?.aliasname ?? "", cols, jt.alias?.colnames, joinState, scope, nullGroup);
    } else if ("RangeTableSample" in node) {
      const rts = node["RangeTableSample"] as { relation?: Node };
      if (rts.relation) return this.walkFromItem(rts.relation, joinState, scope, nullGroup, depth);
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
  ): VisibleColumn[] {
    const names = aliasColnames?.map(n => this.stringVal(n)) ?? [];
    const entry: RelationEntry = {
      alias: aliasName,
      kind: "function",
      functionColumns: columns.map((c, i) => ({ name: names[i] ?? c.name, notNull: c.notNull })),
      joinState,
      nullGroup,
    };
    scope.aliases.set(aliasName, entry);
    return entry.functionColumns!.map(c => ({ name: c.name, entry, merged: null }));
  }

  /**
   * Flatten a JSON_TABLE COLUMNS list. NESTED PATH columns are spliced into
   * the same output row, so they contribute alongside their siblings.
   *
   * Only FOR ORDINALITY is non-null. A regular column is NULL when its path
   * matches nothing, and an EXISTS column can still yield NULL under
   * `UNKNOWN ON ERROR`.
   */
  private collectJsonTableColumns(
    columns: Node[] | undefined,
    out: { name: string; notNull: boolean }[],
  ): void {
    for (const c of columns ?? []) {
      const col = (c as Record<string, unknown>)["JsonTableColumn"] as
        | { coltype?: string; name?: string; columns?: Node[] }
        | undefined;
      if (!col) continue;
      if (col.coltype === "JTC_NESTED") {
        this.collectJsonTableColumns(col.columns, out);
        continue;
      }
      if (!col.name) continue;
      out.push({ name: col.name, notNull: col.coltype === "JTC_FOR_ORDINALITY" });
    }
  }

  private addRangeVar(
    rv: RangeVar,
    joinState: JoinState,
    scope: Scope,
    nullGroup: number,
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
        ast: viewAst,
        joinState,
        nullGroup,
      };
      scope.aliases.set(aliasName, entry);
      return entry;
    }

    // Could be a VALUES alias or unresolved — register as table with empty columns.
    const fallback: RelationEntry = {
      alias: aliasName,
      kind: "table",
      table: { schema: "", name: rv.relname, columns: [] },
      joinState,
      nullGroup,
    };
    scope.aliases.set(aliasName, fallback);
    return fallback;
  }

  // -------------------------------------------------------------------------
  // INSERT / UPDATE / DELETE RETURNING
  // -------------------------------------------------------------------------

  private analyzeInsert(
    stmt: InsertStmt,
    outerScope: Scope | null,
    depth: number,
  ): OutputNullability[] {
    if (!stmt.returningClause) return [];
    const scope = this.buildDmlScope(stmt.relation, outerScope, depth);
    this.registerCtes(stmt.withClause, scope);
    return this.analyzeReturning(stmt.returningClause, scope, depth);
  }

  private analyzeUpdate(
    stmt: UpdateStmt,
    outerScope: Scope | null,
    depth: number,
  ): OutputNullability[] {
    if (!stmt.returningClause) return [];
    const scope = this.buildDmlScope(stmt.relation, outerScope, depth);
    this.registerCtes(stmt.withClause, scope);

    // UPDATE...FROM: add FROM clause relations too. The target is joined to
    // them with inner-join semantics — a target row with no match in the FROM
    // list is simply not updated, so it never appears NULL-extended in
    // RETURNING. The relations are therefore REQUIRED, not OPTIONAL. (Outer
    // joins *within* the FROM list are still handled by walkFromItem.)
    if (stmt.fromClause) {
      for (const item of stmt.fromClause) {
        scope.visible.push(...this.walkFromItem(item, REQUIRED, scope, this.nextNullGroup(), depth));
      }
    }

    return this.analyzeReturning(stmt.returningClause, scope, depth);
  }

  private analyzeDelete(
    stmt: DeleteStmt,
    outerScope: Scope | null,
    depth: number,
  ): OutputNullability[] {
    if (!stmt.returningClause) return [];
    const scope = this.buildDmlScope(stmt.relation, outerScope, depth);
    this.registerCtes(stmt.withClause, scope);

    // DELETE...USING: add USING clause relations. Same inner-join semantics as
    // UPDATE...FROM — an unmatched target row is not deleted, so USING columns
    // are never NULL-extended in RETURNING.
    if (stmt.usingClause) {
      for (const item of stmt.usingClause) {
        scope.visible.push(...this.walkFromItem(item, REQUIRED, scope, this.nextNullGroup(), depth));
      }
    }

    return this.analyzeReturning(stmt.returningClause, scope, depth);
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
    return this.analyzeReturning(stmt.returningClause, scope, depth);
  }

  private buildMergeScope(stmt: MergeStmt, outerScope: Scope | null, depth: number): Scope {
    const scope = this.buildDmlScope(stmt.relation, outerScope, depth);
    this.registerCtes(stmt.withClause, scope);
    if (stmt.sourceRelation) {
      scope.visible.push(
        ...this.walkFromItem(stmt.sourceRelation, OPTIONAL, scope, this.nextNullGroup(), depth),
      );
    }
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
  ): OutputNullability[] {
    const ret = returningClause as { exprs?: Node[] };
    const results: OutputNullability[] = [];
    for (const target of ret.exprs ?? []) {
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
      const notNull = this.walkExpr(val, scope, depth + 1);
      results.push({ name: name ?? this.inferName(val), notNull });
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
    // Each round that changes anything turns at least one column nullable, so
    // the column count bounds the rounds. The extra round is the one that
    // confirms a fixed point without changing anything.
    for (let round = 0; round <= left.length + 1; round++) {
      this.recursiveAssumption.set(stmt, assumption);
      const outerJournal = this.fixpointJournal;
      const journal: object[] = [];
      this.fixpointJournal = journal;
      let combined: OutputNullability[];
      try {
        const right = this.analyzeSelect(stmt.rarg!, cteScope, depth + 1);
        combined = this.combineSetOperation(left, right, stmt.op!);
      } finally {
        this.fixpointJournal = outerJournal;
      }
      if (sameNullability(combined, assumption)) {
        this.recursiveAssumption.delete(stmt);
        return combined;
      }
      for (const node of journal) this.scopeCache.delete(node);
      assumption = combined;
    }

    // Unreachable while the lattice is two-valued and the loop descends. If it
    // ever is reached, the assumption never settled, and the only answer that
    // cannot be wrong is that nothing is guaranteed.
    this.recursiveAssumption.delete(stmt);
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
      results.push({
        name: l?.name ?? r?.name ?? "",
        notNull: combineSetOpColumn(l?.notNull ?? false, r?.notNull ?? false, op),
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

  private expandStar(val: Node, scope: Scope, depth: number): OutputNullability[] {
    const node = val as Record<string, unknown>;
    const cr = node["ColumnRef"] as ColumnRef;
    const fields = cr.fields ?? [];

    // `alias.*` — just that relation's columns.
    if (fields.length === 2 && "String" in (fields[0] as Record<string, unknown>)) {
      const aliasName = this.stringVal(fields[0]!);
      const entry = this.resolveAlias(aliasName, scope);
      if (!entry) return [];
      return this.relationColumnsIntrinsic(entry, scope, depth).map(col => ({
        name: col.name,
        notNull: this.computeColumnNullability(entry, col.name, scope, depth),
      }));
    }

    // Unqualified `*` — the scope's visible columns, in order. Each is
    // resolved exactly as a named reference would be, so views, WHERE
    // promotion, null groups and branch guards all apply here too.
    return scope.visible.map(vc => ({
      name: vc.name,
      notNull: vc.merged
        ? this.mergedColumnNotNull(vc.name, vc.merged, scope, depth)
        : vc.entry
          ? this.computeColumnNullability(vc.entry, vc.name, scope, depth)
          : false,
    }));
  }

  /** Untraced form of computeColumnNullabilityTraced. */
  private computeColumnNullability(
    entry: RelationEntry,
    colName: string,
    scope: Scope,
    depth: number,
  ): boolean {
    return this.computeColumnNullabilityTraced(entry, colName, scope, depth, NOOP);
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
  private resolveTableFunctionColumns(entry: RelationEntry): { name: string; notNull: boolean }[] {
    // Precomputed for FROM items that spell out their own COLUMNS list, and
    // memoized for everything else.
    if (entry.functionColumns) return entry.functionColumns;

    const rf = entry.rangeFunction;
    const cols: { name: string; notNull: boolean }[] = [];
    // Only a lone function can take the alias as its column name.
    const single = (rf?.functions?.length ?? 0) === 1 && !rf?.is_rowsfrom;

    for (const fnItem of rf?.functions ?? []) {
      // Each entry is a List whose first item is the FuncCall.
      const list = (fnItem as Record<string, unknown>)["List"] as { items?: Node[] } | undefined;
      const callNode = list?.items?.[0] as Record<string, unknown> | undefined;
      const fc = callNode?.["FuncCall"] as FuncCall | undefined;
      if (!fc) continue;

      const name = this.funcName(fc);
      // A function returning a scalar contributes one column, and PostgreSQL
      // names it after the relation alias when there is one. Composite results
      // keep their own column names, so the alias applies only to the relation.
      const scalarName = single && entry.alias ? entry.alias : name;
      const meta = this.catalog.resolveFunctionMetadata(this.funcSchema(fc), name);
      if (!meta) {
        // Unknown function (e.g. a pg_catalog SRF like generate_series): a
        // single column, conservatively nullable.
        cols.push({ name: scalarName, notNull: false });
        continue;
      }
      cols.push(...this.columnsForReturnType(meta.returnType, scalarName));
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
        const trimmed = part.trim();
        const gap = trimmed.indexOf(" ");
        if (gap < 0) return [];
        const colName = trimmed.slice(0, gap).trim();
        const colType = trimmed.slice(gap + 1).trim();
        // A domain's NOT NULL is part of the type, so it IS enforced here.
        return [{ name: colName, notNull: this.isNotNullDomainType(colType) }];
      });
    }

    // The snapshot is taken with an empty search_path, so anything outside
    // pg_catalog arrives schema-qualified: `SETOF public.order_items`, not
    // `SETOF order_items`. Resolve against the schema PostgreSQL named rather
    // than re-deriving it from a search path this code cannot see.
    const { schema: typeSchema, name: typeBase } = splitQualifiedName(type);

    // RETURNS SETOF <table> / <composite>: the row type, constraints dropped.
    const table = this.catalog.resolveTable(typeSchema, typeBase);
    if (table) {
      return table.columns.map(col => {
        const oid = this.catalog.resolveColumnTypeOid(table.schema, table.name, col);
        return {
          name: col,
          // NOT the column's attnotnull — that constraint does not travel with
          // the row type. Only a domain's NOT NULL does.
          notNull: oid != null && this.catalog.isNotNullDomain(oid),
        };
      });
    }

    // RETURNS SETOF <composite>: expands to the type's fields. Like a table
    // row type, a composite carries types only — no NOT NULL constraints.
    const composite = this.catalog.resolveCompositeType(typeSchema, typeBase);
    if (composite) {
      return composite.fields.map(f => ({
        name: f.name,
        notNull: this.catalog.isNotNullDomain(f.typeOid),
      }));
    }

    // A scalar return type: one column named after the function.
    return [{ name: fnName, notNull: this.isNotNullDomainType(type) }];
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
      return this.resolveTableFunctionColumns(entry);
    }
    if (entry.kind === "subquery" || entry.kind === "cte") {
      return this.innerRelationColumns(entry, scope, depth);
    }
    // A view's catalog columns are all attnotnull=false, so its definition is
    // the only source of truth — the same path a named reference takes.
    if (entry.kind === "view" && entry.ast && entry.table) {
      const inner = this.analyzeStatement(entry.ast, scope, depth + 1);
      return entry.table.columns.map((col, i) => ({
        name: col,
        notNull: inner[i]?.notNull ?? false,
      }));
    }
    if (entry.table) {
      return entry.table.columns.map(col => ({
        name: col,
        notNull: this.catalog.resolveColumnNotNull(entry.table!.schema, entry.table!.name, col),
      }));
    }
    return [];
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
      // that cannot be TRUE with $num NULL. Gated on rowsImplyWhere — an
      // ungrouped aggregate emits its row over zero input rows, proving
      // nothing. Unlike mechanism A this narrows the output only; the
      // parameter remains a perfectly legal NULL binding that simply
      // returns no rows.
      if (
        scope.rowsImplyWhere &&
        scope.whereClause &&
        this.whereImpliesParamNotNull(scope.whereClause, num)
      ) {
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
      trace.conclude(false, "A_Indirection → conservative nullable");
      return false;
    }

    if ("XmlExpr" in node) {
      trace.conclude(false, "XmlExpr → conservative nullable");
      return false;
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
        // A schema-qualified operator may be user-defined and shadow a
        // built-in symbol, so only bare names are matched.
        if (qualified || !TOTAL_OPERATORS.has(op)) {
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
  ): boolean {
    let joinState = entry.joinState;

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
      const colIndex = entry.table.columns.indexOf(colName);
      const inner = colIndex >= 0 ? innerResults[colIndex] : undefined;
      if (inner) {
        const result = inner.notNull && joinState !== OPTIONAL;
        trace.addFact("viewDefinition", `${entry.table.schema}.${entry.table.name}`);
        trace.addFact("innerResult", `${inner.notNull ? "notNull" : "nullable"} (col[${colIndex}])`);
        trace.conclude(result, `view column[${colIndex}] ${inner.notNull ? "notNull" : "nullable"} + join ${joinStateName(joinState)}`);
        return result;
      }
      trace.conclude(false, `column '${colName}' not found in view definition output`);
      return false;
    }

    // Table functions: the resolved return-type columns.
    if (entry.kind === "function") {
      const col = this.resolveTableFunctionColumns(entry).find(c => c.name === colName);
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

        // For VALUES subqueries, the inner results have auto-generated names
        // (column1, column2, ...). Map the alias column names to positions.
        if (entry.cteColumns && entry.cteColumns.length > 0) {
          const colIndex = entry.cteColumns.indexOf(colName);
          if (colIndex >= 0 && colIndex < innerResults.length) {
            const innerNotNull = innerResults[colIndex]!.notNull;
            const result = innerNotNull && joinState !== OPTIONAL;
            trace.addFact("innerResult", `${innerNotNull ? "notNull" : "nullable"} (col[${colIndex}])`);
            trace.conclude(result, `CTE/subquery column[${colIndex}] ${innerNotNull ? "notNull" : "nullable"} + join ${joinStateName(joinState)}`);
            return result;
          }
          // Also try matching by name (for non-VALUES subqueries with alias colnames).
          const col = innerResults.find(r => r.name === colName);
          if (col) {
            const result = col.notNull && joinState !== OPTIONAL;
            trace.addFact("innerResult", `${col.notNull ? "notNull" : "nullable"} (by name '${colName}')`);
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
      const catalogNotNull = this.catalog.resolveColumnNotNull(
        entry.table.schema,
        entry.table.name,
        colName,
      );
      trace.addFact("catalog.notNull", String(catalogNotNull));
      trace.addFact("table", `${entry.table.schema}.${entry.table.name}`);
      const result = catalogNotNull && joinState !== OPTIONAL;
      trace.conclude(result, `catalog.notNull=${catalogNotNull} && join ${joinStateName(joinState)}${joinState === OPTIONAL ? " (OPTIONAL → nullable)" : ""}`);
      return result;
    }

    trace.conclude(false, "unresolved relation → nullable");
    return false;
  }

  // -------------------------------------------------------------------------
  // WHERE guarantee consultation
  // -------------------------------------------------------------------------

  private checkWhereGuarantee(
    alias: string,
    colName: string,
    scope: Scope,
  ): boolean {
    if (!scope.whereClause) return false;
    return this.whereImpliesNotNull(scope.whereClause, alias, colName);
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
        ? this.whereImpliesNotNull(g.predicate, alias, colName)
        : this.falsityImpliesNotNull(g.predicate, alias, colName);
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
  private falsityImpliesNotNull(predicate: Node, alias: string, colName: string): boolean {
    const node = predicate as Record<string, unknown>;

    if ("NullTest" in node) {
      const nt = node["NullTest"] as { arg?: Node; nulltesttype?: string };
      if (nt.nulltesttype === "IS_NULL" && nt.arg) {
        return this.columnMatches(nt.arg, alias, colName);
      }
      return false;
    }

    if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as { boolop?: string; args?: Node[] };
      if (be.boolop === "OR_EXPR") {
        for (const arg of be.args ?? []) {
          if (this.falsityImpliesNotNull(arg, alias, colName)) return true;
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
    const node = whereClause as Record<string, unknown>;

    if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as { boolop?: string; args?: Node[] };
      if (be.boolop === "AND_EXPR") {
        for (const arg of be.args ?? []) {
          if (this.whereImpliesAliasNotNull(arg, alias)) return true;
        }
      }
      return false;
    }

    if ("NullTest" in node) {
      const nt = node["NullTest"] as { arg: Node; nulltesttype: string };
      if (nt.nulltesttype === "IS_NOT_NULL") {
        return this.columnRefMatchesAlias(nt.arg, alias);
      }
      return false;
    }

    if ("A_Expr" in node) {
      const ae = node["A_Expr"] as {
        kind?: string;
        lexpr?: Node;
        rexpr?: Node;
      };
      if (
        ae.kind === "AEXPR_OP" ||
        ae.kind === "AEXPR_IN" ||
        ae.kind === "AEXPR_OP_ANY" ||
        ae.kind === "AEXPR_OP_ALL"
      ) {
        if (ae.lexpr && this.columnRefMatchesAlias(ae.lexpr, alias)) return true;
        if (ae.rexpr && this.columnRefMatchesAlias(ae.rexpr, alias)) return true;
      }
      return false;
    }

    return false;
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
    const node = clause as Record<string, unknown>;

    if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as { boolop?: string; args?: Node[] };
      if (be.boolop === "AND_EXPR") {
        return (be.args ?? []).some(arg => this.whereImpliesParamNotNull(arg, num));
      }
      return false;
    }

    if ("NullTest" in node) {
      const nt = node["NullTest"] as { arg: Node; nulltesttype?: string };
      return (
        nt.nulltesttype === "IS_NOT_NULL" && forcedNullParams(nt.arg, this.catalog).has(num)
      );
    }

    if ("A_Expr" in node) {
      const ae = node["A_Expr"] as {
        kind?: string;
        name?: Node[];
        lexpr?: Node;
        rexpr?: Node;
      };
      const op = ae.name?.length === 1 ? this.stringVal(ae.name[0]!) : "";
      const forced = (n: Node | undefined): boolean =>
        n !== undefined && forcedNullParams(n, this.catalog).has(num);

      switch (ae.kind) {
        case "AEXPR_OP":
        case "AEXPR_OP_ANY":
        case "AEXPR_OP_ALL":
          // `x = ANY(arr)` is NULL when either the tested value or the array
          // as a whole is NULL, so both operands count. The comparison must
          // be from the shared strict set.
          return TOTAL_STRICT_OPERATORS.has(op) && (forced(ae.lexpr) || forced(ae.rexpr));
        case "AEXPR_IN":
          // Only the tested value: `x IN ($1, 5)` is TRUE via 5 with $1 NULL.
          return forced(ae.lexpr);
        case "AEXPR_BETWEEN":
        case "AEXPR_BETWEEN_SYM": {
          // Strict in the tested value and both bounds. NOT BETWEEN is
          // excluded: it can be TRUE with a NULL bound.
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

  private whereImpliesNotNull(
    whereClause: Node,
    alias: string,
    colName: string,
  ): boolean {
    const node = whereClause as Record<string, unknown>;

    // AND: check each conjunct.
    if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as { boolop?: string; args?: Node[] };
      if (be.boolop === "AND_EXPR") {
        for (const arg of be.args ?? []) {
          if (this.whereImpliesNotNull(arg, alias, colName)) return true;
        }
        return false;
      }
      // OR, NOT — no guarantees.
      return false;
    }

    // IS NOT NULL on this column.
    if ("NullTest" in node) {
      const nt = node["NullTest"] as { arg: Node; nulltesttype: string };
      if (nt.nulltesttype === "IS_NOT_NULL") {
        return this.columnMatches(nt.arg, alias, colName);
      }
      return false;
    }

    // A_Expr comparison: `col OP expr` or `expr OP col`.
    if ("A_Expr" in node) {
      const ae = node["A_Expr"] as {
        kind?: string;
        lexpr?: Node;
        rexpr?: Node;
      };
      // IS NOT NULL, comparisons, IN — any predicate that has this column as
      // a direct operand implies the column is non-null.
      if (
        ae.kind === "AEXPR_OP" ||
        ae.kind === "AEXPR_IN" ||
        ae.kind === "AEXPR_OP_ANY" ||
        ae.kind === "AEXPR_OP_ALL"
      ) {
        if (ae.lexpr && this.columnMatches(ae.lexpr, alias, colName)) return true;
        if (ae.rexpr && this.columnMatches(ae.rexpr, alias, colName)) return true;
      }
      return false;
    }

    return false;
  }

  /**
   * Check whether an expression node is a ColumnRef matching `alias.colName`.
   * For unqualified column refs, match against the alias if it's the only
   * relation owning that column.
   */
  private columnMatches(expr: Node, alias: string, colName: string): boolean {
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
      // Unqualified — match by column name only. The caller already knows
      // this alias owns this column.
      return parts[0] === colName;
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

    if (!singleRow) {
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
      // count(*) is always an aggregate.
      if (fc.agg_star) return true;
      // Check by function name against common built-in aggregates.
      const name = this.funcName(fc);
      if (AGGREGATE_NAMES.has(name)) return true;
      // Also check catalog for isAggregate.
      const meta = this.catalog.resolveFunctionMetadata(this.funcSchema(fc), name);
      if (meta?.isAggregate) return true;
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

    // Look up function metadata.
    const meta = this.catalog.resolveFunctionMetadata(schema, name);
    trace.addFact("catalogMeta", meta ? `${meta.schema}.${meta.name} (lang=${meta.language}, strict=${meta.strict}, agg=${meta.isAggregate})` : "not found");

    // Reorder named arguments to match function definition order.
    const orderedArgs = this.maybeReorderNamedArgs(fc.args ?? [], argResults, meta);

    // Priority 1: NOT NULL domain return.
    if (meta && this.funcReturnsNotNullDomain(meta)) {
      trace.addFact("priority", "1 (NOT NULL domain return)");
      trace.conclude(true, "returns NOT NULL domain -> PG enforces at call boundary");
      return true;
    }

    // Priority 2b: window functions. Checked before the aggregate rule because
    // the ranking functions share names with entries in AGGREGATE_NAMES.
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
      // Everything else over a window — aggregates included — can see an empty
      // frame (e.g. ROWS BETWEEN 2 PRECEDING AND 1 PRECEDING on the first row)
      // and offset functions can address a row outside the partition.
      trace.addFact("priority", "2b (other window function)");
      trace.conclude(false, "window frame may be empty or the offset may fall outside the partition → nullable");
      return false;
    }

    // Priority 3: Aggregate (other than count).
    const isAggregate =
      !!meta?.isAggregate || (!meta && AGGREGATE_NAMES.has(name) && name !== "count");
    if (isAggregate) {
      trace.addFact("priority", meta ? "3 (aggregate)" : "3 (aggregate by name, not in catalog)");
      return this.resolveAggregateTraced(fc, name, meta, argResults, scope, trace);
    }

    // Priority 4: Strict scalar function.
    if (meta && meta.strict && !meta.isAggregate) {
      trace.addFact("priority", "4 (strict)");
      trace.addFact("argsNotNull", `[${orderedArgs.map(r => r ? "T" : "F").join(", ")}]`);
      const result = orderedArgs.every(r => r);
      trace.conclude(result, result ? "strict: all args non-null" : "strict: at least one arg nullable");
      return result;
    }

    // Priority 5: LANGUAGE sql user function — recurse into body.
    if (meta && meta.language === "sql" && !meta.isAggregate) {
      trace.addFact("priority", "5 (LANGUAGE sql body recursion)");
      return this.resolveSqlFunctionBodyTraced(meta, orderedArgs, scope, depth, trace);
    }

    // Priority 6b: pg_catalog built-in. Only reachable when the catalog has no
    // entry for this name, so a user function of the same name always wins.
    if (!meta && (schema === undefined || schema === "pg_catalog")) {
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
   * A user-defined aggregate with a non-null `INITCOND` is also non-null, even
   * over zero rows, since the initial state is the result.
   */
  private resolveAggregateTraced(
    fc: FuncCall,
    name: string,
    meta: FunctionInfo | null,
    argResults: boolean[],
    scope: Scope,
    trace: ITrace,
  ): boolean {
    // A non-null initial condition survives an empty input entirely.
    if (meta?.aggInitVal != null) {
      trace.addFact("agginitval", meta.aggInitVal);
      trace.conclude(true, "aggregate has a non-null INITCOND → non-null even over zero rows");
      return true;
    }

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
   */
  private maybeReorderNamedArgs(
    args: Node[],
    argResults: boolean[],
    meta: FunctionInfo | null,
  ): boolean[] {
    if (!meta) return argResults;
    const hasNamed = args.some(a => "NamedArgExpr" in (a as Record<string, unknown>));
    if (!hasNamed) return argResults;

    const paramNames = meta.args.map(a => a.name);
    const ordered = new Array<boolean>(Math.max(paramNames.length, argResults.length)).fill(false);
    let positionalIdx = 0;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i] as Record<string, unknown>;
      if ("NamedArgExpr" in arg) {
        const na = arg["NamedArgExpr"] as { name: string };
        const defIdx = paramNames.indexOf(na.name);
        if (defIdx >= 0) {
          ordered[defIdx] = argResults[i]!;
        }
      } else {
        ordered[positionalIdx] = argResults[i]!;
        positionalIdx++;
      }
    }
    return ordered;
  }

  private isAggregateByName(name: string, schema: string | undefined): boolean {
    const meta = this.catalog.resolveFunctionMetadata(schema, name);
    return meta?.isAggregate ?? AGGREGATE_NAMES.has(name);
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
      const dmlScope = this.buildDmlScope(ins.relation, fnScope, depth);
      this.registerCtes(ins.withClause, dmlScope);
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

  private analyzeSelectWithFnScope(
    sel: SelectStmt,
    fnScope: Scope,
    depth: number,
  ): OutputNullability[] {
    // Build a real scope from the SELECT's FROM clause, with fnScope as outer.
    const scope = this.buildScope(sel, fnScope, depth);
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
   * Only ColumnRefs nested inside a `GroupingSet` node (ROLLUP / CUBE /
   * GROUPING SETS) are collected. A plain grouping term at the top level of
   * the GROUP BY appears in every generated grouping set and is never
   * collapsed, so it is left alone.
   */
  private collectGroupingSetColumns(groupClause?: Node[]): ReadonlySet<string> {
    if (!groupClause || groupClause.length === 0) return EMPTY_STRING_SET;
    const out = new Set<string>();
    for (const term of groupClause) {
      if ("GroupingSet" in (term as Record<string, unknown>)) {
        this.collectColumnRefKeys(term, out);
      }
    }
    return out.size > 0 ? out : EMPTY_STRING_SET;
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

const NON_NULL_OVER_NONEMPTY_AGGREGATES = new Set([
  "sum", "avg", "min", "max",
  "bit_and", "bit_or", "bool_and", "bool_or", "every",
  "array_agg", "string_agg", "json_agg", "jsonb_agg",
]);

const NEVER_NULL_WINDOW_FNS = new Set([
  "row_number", "rank", "dense_rank", "percent_rank", "cume_dist",
]);

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
const ALWAYS_NOT_NULL_BUILTINS = new Set([
  // Clock / session. Zero-argument, always defined.
  "now", "clock_timestamp", "statement_timestamp", "transaction_timestamp",
  "current_database", "current_catalog", "current_user", "current_role",
  "session_user", "user", "version", "pi", "random", "gen_random_uuid",
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
const FIRST_ARG_BUILTINS = new Set(["concat_ws", "format"]);

/**
 * Built-ins that are total over non-null arguments: non-null in, non-null out.
 * Raising on bad input still counts — an error is not a NULL.
 */
const STRICT_TOTAL_BUILTINS = new Set([
  // Math
  "abs", "ceil", "ceiling", "floor", "round", "trunc", "sign", "sqrt", "cbrt",
  "exp", "ln", "log", "log10", "power", "mod", "div", "gcd", "lcm",
  "degrees", "radians", "sin", "cos", "tan", "asin", "acos", "atan", "atan2",
  "width_bucket",
  // String
  "lower", "upper", "initcap", "length", "char_length", "character_length",
  "octet_length", "bit_length", "md5", "ascii", "chr", "repeat", "reverse",
  "substr", "substring", "replace", "translate", "overlay",
  "ltrim", "rtrim", "btrim", "trim", "lpad", "rpad",
  "split_part", "strpos", "position", "left", "right", "starts_with",
  "quote_ident", "quote_literal", "quote_nullable",
  "to_char", "to_number", "to_date", "to_timestamp", "to_hex",
  "encode", "decode", "sha256",
  // Arrays / rows
  "array_to_string", "string_to_array", "cardinality", "array_append",
  "array_prepend", "array_cat", "array_remove", "array_position",
  // Date / time
  "date_part", "date_trunc", "age", "justify_days", "justify_hours",
  "justify_interval", "make_date", "make_time", "make_timestamp",
  "make_timestamptz", "make_interval", "isfinite",
  // JSON
  "to_json", "to_jsonb", "jsonb_typeof", "json_typeof", "jsonb_array_length",
  "json_array_length", "row_to_json", "jsonb_strip_nulls", "jsonb_pretty",
  // Misc
  "num_nulls", "num_nonnulls", "pg_typeof",
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
 * `numeric(10,2)` inside `TABLE(a numeric(10,2), b text)` stays intact.
 */
function splitTopLevel(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (ch === "," && depth === 0) {
      out.push(input.slice(start, i));
      start = i + 1;
    }
  }
  out.push(input.slice(start));
  return out;
}

/** Shared empty set — most scopes have no grouping-set columns. */
const EMPTY_STRING_SET: ReadonlySet<string> = new Set<string>();

// Moved to operators.ts so mechanism-C attribution can share it without an
// import cycle; see the comment there for the total/strict distinction.
const TOTAL_OPERATORS = TOTAL_STRICT_OPERATORS;

const AGGREGATE_NAMES = new Set([
  "array_agg", "avg", "bit_and", "bit_or", "bool_and", "bool_or",
  "cluster", "corr", "count", "covar_pop", "covar_samp", "cume_dist",
  "dense_rank", "every", "first_value", "lag", "last_value", "lead",
  "listagg", "max", "min", "mode", "percent_rank", "percentile_cont",
  "percentile_disc", "rank", "regr_avgx", "regr_avgy", "regr_count",
  "regr_intercept", "regr_r2", "regr_slope", "regr_sxx", "regr_sxy",
  "regr_syy", "row_number", "stddev", "stddev_pop", "stddev_samp",
  "string_agg", "sum", "variance", "var_pop", "var_samp", "xmlagg",
  "jsonb_agg", "jsonb_object_agg", "json_agg", "json_object_agg",
]);

// ---------------------------------------------------------------------------
// AST node types (minimal — only fields we access).
// ---------------------------------------------------------------------------

interface RangeVar {
  relname: string;
  schemaname?: string;
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
}

interface SubLink {
  subLinkType?: string;
  subselect?: Node;
  testexpr?: Node;
}
