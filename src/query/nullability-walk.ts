import type { Node } from "libpg-query";
import type { FunctionInfo } from "../catalog/types.js";
import type {
  NullabilityCatalog,
  OutputNullability,
  OutputNullabilityTraced,
  ResolvedTable,
  TraceNode,
} from "./types.js";

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
 * Traced variant of inferNullability. Returns the same per-column results,
 * but each result includes a `trace` tree explaining *why* the nullability
 * decision was reached — every fact considered, the decisive reason, and
 * sub-decisions for child expressions.
 */
export function inferNullabilityTraced(
  stmt: Node,
  catalog: NullabilityCatalog,
): OutputNullabilityTraced[] {
  const engine = new NullabilityEngine(catalog, true);
  return engine.runTraced(stmt);
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
  /** For VALUES: the rows (valuesLists from SelectStmt). */
  valuesRows?: Node[];
  /** For table functions: the RangeFunction node. */
  rangeFunction?: Node;
  /** Join nullability state. */
  joinState: JoinState;
}

// ---------------------------------------------------------------------------
// Scope: the address book for one SELECT level.
// ---------------------------------------------------------------------------

interface Scope {
  /** alias → entry */
  aliases: Map<string, RelationEntry>;
  /** Un-aliased tables (for unqualified column resolution). */
  tables: RelationEntry[];
  /** CTE name → (AST node, column names). */
  ctes: Map<string, { ast: Node; columns: string[] }>;
  /** WHERE clause node (consulted at ColumnRef leaves). */
  whereClause?: Node;
  /** Outer scope for correlated references. */
  outer: Scope | null;
  /** Memoized per-output-column results for this scope's AST node. */
  results: OutputNullability[] | null;
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
  /** Current function body context (null when analyzing query-level ASTs). */
  private fnCtx: FnBodyContext | null = null;
  /** Current function parameter names (for resolving named ColumnRefs in body). */
  private fnParamNames: string[] | null = null;
  /** Whether tracing is enabled. */
  private readonly tracing: boolean;
  /** The catalog. */
  private readonly catalog: NullabilityCatalog;

  constructor(catalog: NullabilityCatalog, tracing = false) {
    this.catalog = catalog;
    this.tracing = tracing;
  }

  run(stmt: Node): OutputNullability[] {
    return this.analyzeStatement(stmt, null, 0);
  }

  runTraced(stmt: Node): OutputNullabilityTraced[] {
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
    return [];
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
        return this.combineSetOperationTraced(left, right);
      }
      // For normal SELECT, build scope and trace each target.
      if (!sel.valuesLists || sel.valuesLists.length === 0) {
        const scope = this.buildScope(sel, outerScope);
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
      const scope = this.buildDmlScope(ins.relation, outerScope);
      this.registerCtes(ins.withClause, scope);
      return this.analyzeReturningTraced(ins.returningClause, scope, depth);
    }
    if ("UpdateStmt" in node) {
      const upd = node["UpdateStmt"] as UpdateStmt;
      if (!upd.returningClause) return [];
      const scope = this.buildDmlScope(upd.relation, outerScope);
      this.registerCtes(upd.withClause, scope);
      if (upd.fromClause) {
        for (const item of upd.fromClause) this.walkFromItem(item, OPTIONAL, scope);
      }
      return this.analyzeReturningTraced(upd.returningClause, scope, depth);
    }
    if ("DeleteStmt" in node) {
      const del = node["DeleteStmt"] as DeleteStmt;
      if (!del.returningClause) return [];
      const scope = this.buildDmlScope(del.relation, outerScope);
      this.registerCtes(del.withClause, scope);
      if (del.usingClause) {
        for (const item of del.usingClause) this.walkFromItem(item, OPTIONAL, scope);
      }
      return this.analyzeReturningTraced(del.returningClause, scope, depth);
    }

    // Fallback: untraced.
    return this.analyzeStatement(stmt, outerScope, depth);
  }

  private combineSetOperationTraced(
    left: OutputNullabilityTraced[],
    right: OutputNullabilityTraced[],
  ): OutputNullabilityTraced[] {
    const len = Math.max(left.length, right.length);
    const results: OutputNullabilityTraced[] = [];
    for (let i = 0; i < len; i++) {
      const l = left[i];
      const r = right[i];
      const notNull = (l?.notNull ?? false) && (r?.notNull ?? false);
      results.push({ name: l?.name ?? r?.name ?? "", notNull });
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
    if (this.analyzing.has(stmt)) return [];
    this.analyzing.add(stmt);
    try {

    // Set operations (UNION/INTERSECT/EXCEPT) — handle before scope building.
    if (stmt.op && stmt.op !== "SETOP_NONE" && stmt.larg && stmt.rarg) {
      // Register CTEs from the WITH clause so they're visible in larg/rarg.
      const cteScope = this.emptyScope(outerScope);
      this.registerCtes(stmt.withClause, cteScope);
      const leftResults = this.analyzeSelect(stmt.larg, cteScope, depth + 1);
      const rightResults = this.analyzeSelect(stmt.rarg, cteScope, depth + 1);
      const results = this.combineSetOperation(leftResults, rightResults);
      this.scopeCache.set(stmt, results);
      return results;
    }

    // VALUES — no FROM clause, valuesLists populated.
    if (stmt.valuesLists && stmt.valuesLists.length > 0) {
      const results = this.analyzeValuesSelect(stmt.valuesLists, outerScope, depth);
      this.scopeCache.set(stmt, results);
      return results;
    }

    // Build the scope (address book).
    const scope = this.buildScope(stmt, outerScope);

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

    this.scopeCache.set(stmt, results);
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
  ): Scope {
    const scope: Scope = {
      aliases: new Map(),
      tables: [],
      ctes: new Map(),
      whereClause: stmt.whereClause,
      outer: outerScope,
      results: null,
    };

    // WITH clause — register CTEs first (in scope for the body).
    this.registerCtes(stmt.withClause, scope);

    // FROM clause — walk each from item, building the address book.
    if (stmt.fromClause) {
      for (const item of stmt.fromClause) {
        this.walkFromItem(item, REQUIRED, scope);
      }
    }

    return scope;
  }

  private walkFromItem(
    item: Node,
    joinState: JoinState,
    scope: Scope,
  ): void {
    const node = item as Record<string, unknown>;
    if ("RangeVar" in node) {
      const rv = node["RangeVar"] as RangeVar;
      this.addRangeVar(rv, joinState, scope);
    } else if ("RangeSubselect" in node) {
      const sub = node["RangeSubselect"] as RangeSubselect;
      const aliasName = sub.alias?.aliasname ?? "";
      const colNames = sub.alias?.colnames
        ? sub.alias.colnames.map((n: Node) => this.stringVal(n))
        : [];
      scope.aliases.set(aliasName, {
        alias: aliasName,
        kind: "subquery",
        ast: sub.subquery,
        cteColumns: colNames,
        joinState,
      });
    } else if ("JoinExpr" in node) {
      const join = node["JoinExpr"] as JoinExpr;
      let leftState = joinState;
      let rightState = joinState;
      switch (join.jointype) {
        case "JOIN_INNER":
          break; // both inherit current state
        case "JOIN_LEFT":
          rightState = OPTIONAL;
          break;
        case "JOIN_RIGHT":
          leftState = OPTIONAL;
          break;
        case "JOIN_FULL":
          leftState = OPTIONAL;
          rightState = OPTIONAL;
          break;
      }
      if (join.larg) this.walkFromItem(join.larg, leftState, scope);
      if (join.rarg) this.walkFromItem(join.rarg, rightState, scope);
    } else if ("RangeFunction" in node) {
      const rf = node["RangeFunction"] as RangeFunction;
      const aliasName = rf.alias?.aliasname ?? "";
      scope.aliases.set(aliasName, {
        alias: aliasName,
        kind: "function",
        rangeFunction: rf.functions?.[0],
        joinState,
      });
    } else if ("RangeTableSample" in node) {
      const rts = node["RangeTableSample"] as { relation?: Node };
      if (rts.relation) this.walkFromItem(rts.relation, joinState, scope);
    }
  }

  private addRangeVar(rv: RangeVar, joinState: JoinState, scope: Scope): void {
    const aliasName = rv.alias?.aliasname ?? rv.relname;

    // Check if it's a CTE — search this scope and all outer scopes.
    // CTEs defined in a parent scope's WITH clause are visible to child
    // scopes (e.g., CTEs in the outer query are visible in subqueries).
    const cte = this.findCte(rv.relname, scope);
    if (cte) {
      scope.aliases.set(aliasName, {
        alias: aliasName,
        kind: "cte",
        ast: cte.ast,
        cteColumns: cte.columns,
        joinState,
      });
      return;
    }

    // Resolve from catalog.
    const table = this.catalog.resolveTable(rv.schemaname ?? undefined, rv.relname);
    if (table) {
      const entry: RelationEntry = {
        alias: aliasName,
        kind: table.schema === "" ? "cte" : "table",
        table,
        joinState,
      };
      scope.aliases.set(aliasName, entry);
      if (!rv.alias) {
        scope.tables.push(entry);
      }
      return;
    }

    // Could be a VALUES alias or unresolved — register as table with empty columns.
    scope.aliases.set(aliasName, {
      alias: aliasName,
      kind: "table",
      table: { schema: "", name: rv.relname, columns: [] },
      joinState,
    });
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
    const scope = this.buildDmlScope(stmt.relation, outerScope);
    this.registerCtes(stmt.withClause, scope);
    return this.analyzeReturning(stmt.returningClause, scope, depth);
  }

  private analyzeUpdate(
    stmt: UpdateStmt,
    outerScope: Scope | null,
    depth: number,
  ): OutputNullability[] {
    if (!stmt.returningClause) return [];
    const scope = this.buildDmlScope(stmt.relation, outerScope);
    this.registerCtes(stmt.withClause, scope);

    // UPDATE...FROM: add FROM clause relations too.
    if (stmt.fromClause) {
      for (const item of stmt.fromClause) {
        this.walkFromItem(item, OPTIONAL, scope);
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
    const scope = this.buildDmlScope(stmt.relation, outerScope);
    this.registerCtes(stmt.withClause, scope);

    // DELETE...USING: add USING clause relations.
    if (stmt.usingClause) {
      for (const item of stmt.usingClause) {
        this.walkFromItem(item, OPTIONAL, scope);
      }
    }

    return this.analyzeReturning(stmt.returningClause, scope, depth);
  }

  private buildDmlScope(
    relation: Node | undefined,
    outerScope: Scope | null,
  ): Scope {
    const scope: Scope = {
      aliases: new Map(),
      tables: [],
      ctes: new Map(),
      outer: outerScope,
      results: null,
    };
    if (relation) {
      const rv = relation as unknown as RangeVar;
      if (rv.relname) {
        this.addRangeVar(rv, REQUIRED, scope);
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
      });
    }
  }

  /**
   * Search for a CTE by name, walking the scope chain from inner to outer.
   * CTEs defined in an enclosing scope's WITH clause are visible to inner
   * scopes (SQL scoping rule).
   */
  private findCte(name: string, scope: Scope): { ast: Node; columns: string[] } | null {
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
      tables: [],
      ctes: new Map(),
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
  ): OutputNullability[] {
    // The output column's nullability is the AND of all operands' corresponding columns.
    const len = Math.max(left.length, right.length);
    const results: OutputNullability[] = [];
    for (let i = 0; i < len; i++) {
      const l = left[i];
      const r = right[i];
      const notNull = (l?.notNull ?? false) && (r?.notNull ?? false);
      results.push({ name: l?.name ?? r?.name ?? "", notNull });
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

    // Check if it's `alias.*` (qualified star).
    if (fields.length === 2 && "String" in (fields[0] as Record<string, unknown>)) {
      const aliasName = this.stringVal(fields[0]!);
      const entry = this.resolveAlias(aliasName, scope);
      if (entry) {
        return this.expandRelationColumns(entry, scope, depth);
      }
      return [];
    }

    // Unqualified `*` — expand all visible relations in FROM order.
    // `aliases` contains all relations (including un-aliased ones, which use
    // the table name as the alias key). `tables` only has un-aliased tables.
    // Skip `tables` entries already covered by `aliases` to avoid duplicates.
    const aliasKeys = new Set(scope.aliases.keys());
    const results: OutputNullability[] = [];
    for (const [, entry] of scope.aliases) {
      const expanded = this.expandRelationColumns(entry, scope, depth);
      for (const e of expanded) results.push(e);
    }
    for (const entry of scope.tables) {
      if (aliasKeys.has(entry.alias)) continue;
      const expanded = this.expandRelationColumns(entry, scope, depth);
      for (const e of expanded) results.push(e);
    }
    return results;
  }

  private expandRelationColumns(
    entry: RelationEntry,
    scope: Scope,
    depth: number,
  ): OutputNullability[] {
    const columns = this.getRelationColumns(entry, scope, depth);
    return columns.map(col => ({
      name: col.name,
      notNull: col.notNull,
    }));
  }

  private getRelationColumns(
    entry: RelationEntry,
    scope: Scope,
    depth: number,
  ): { name: string; notNull: boolean }[] {
    // For subqueries/CTEs: recurse into inner scope.
    if (entry.kind === "subquery" || entry.kind === "cte") {
      if (entry.ast) {
        const innerResults = this.analyzeStatement(entry.ast, scope, depth + 1);
        return innerResults.map(r => ({
          name: r.name,
          notNull: r.notNull && entry.joinState !== OPTIONAL,
        }));
      }
      return [];
    }

    // For tables/views: read from catalog.
    if (entry.table) {
      return entry.table.columns.map(col => ({
        name: col,
        notNull:
          this.catalog.resolveColumnNotNull(entry.table!.schema, entry.table!.name, col) &&
          entry.joinState !== OPTIONAL,
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
      trace.conclude(false, "CASE → conservative nullable (no path-sensitive analysis)");
      return false;
    }

    if ("A_Expr" in node) {
      trace.conclude(false, "A_Expr (comparison/math) → three-valued logic → nullable");
      return false;
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
      trace.addFact("boolop", be.boolop ?? "unknown");
      trace.conclude(false, "AND/OR → three-valued logic → nullable");
      return false;
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
      trace.conclude(false, "GREATEST/LEAST → conservative nullable");
      return false;
    }

    if ("ScalarArrayOp" in node) {
      trace.conclude(false, "ScalarArrayOp → conservative nullable");
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

    trace.conclude(false, "unknown node type → conservative nullable");
    return false;
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
    // Search inner-scope aliases first, then outer (correlated), then tables.
    for (const [, entry] of scope.aliases) {
      if (this.entryHasColumn(entry, colName, scope, depth)) {
        trace.addFact("resolved", `alias '${entry.alias}' (inner scope)`);
        return this.computeColumnNullabilityTraced(entry, colName, scope, depth, trace);
      }
    }
    // Outer scope (correlated references).
    if (scope.outer) {
      for (const [, entry] of scope.outer.aliases) {
        if (this.entryHasColumn(entry, colName, scope.outer, depth)) {
          trace.addFact("resolved", `alias '${entry.alias}' (outer/correlated scope)`);
          return this.computeColumnNullabilityTraced(entry, colName, scope.outer, depth, trace);
        }
      }
      for (const entry of scope.outer.tables) {
        if (this.entryHasColumn(entry, colName, scope.outer, depth)) {
          trace.addFact("resolved", `table '${entry.alias}' (outer/correlated scope)`);
          return this.computeColumnNullabilityTraced(entry, colName, scope.outer, depth, trace);
        }
      }
    }
    // Un-aliased tables.
    for (const entry of scope.tables) {
      if (this.entryHasColumn(entry, colName, scope, depth)) {
        trace.addFact("resolved", `table '${entry.alias}' (un-aliased)`);
        return this.computeColumnNullabilityTraced(entry, colName, scope, depth, trace);
      }
    }
    trace.addFact("resolved", "NOT_FOUND");
    trace.conclude(false, `column '${colName}' not found in any scope → nullable`);
    return false;
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

  private entryHasColumn(
    entry: RelationEntry,
    colName: string,
    scope: Scope,
    depth: number,
  ): boolean {
    if (entry.kind === "subquery" || entry.kind === "cte") {
      if (entry.ast) {
        // For VALUES subqueries with alias column names, check by position.
        if (entry.cteColumns && entry.cteColumns.length > 0) {
          if (entry.cteColumns.includes(colName)) return true;
        }
        const innerResults = this.analyzeStatement(entry.ast, scope, depth + 1);
        return innerResults.some(r => r.name === colName);
      }
      return false;
    }
    if (entry.table) {
      return entry.table.columns.includes(colName);
    }
    return false;
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

    // Per-alias promotion: if the WHERE has any predicate on any column of
    // this alias (in an AND-conjunct), the alias is promoted to REQUIRED.
    if (joinState === OPTIONAL && this.checkWhereAliasPromoted(entry.alias, scope)) {
      joinState = REQUIRED;
      trace.addFact("whereAliasPromoted", "true (predicate on alias → INNER JOIN)");
      trace.addFact("joinStateAfterPromotion", joinStateName(joinState));
    }

    // For subqueries/CTEs: recurse into the inner scope.
    if (entry.kind === "subquery" || entry.kind === "cte") {
      if (entry.ast) {
        const innerResults = this.analyzeStatement(entry.ast, scope, depth + 1);

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
        trace.conclude(true, "EXISTS returns bool, never NULL");
        return true;
      case "ANY_SUBLINK":
        trace.conclude(true, "ANY/IN returns bool, never NULL");
        return true;
      case "ALL_SUBLINK":
        trace.conclude(true, "ALL returns bool, never NULL");
        return true;
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

    const noFrom = !select.fromClause || select.fromClause.length === 0;
    const hasAggregate = this.targetListHasAggregate(select.targetList);
    const hasLimit = !!select.limitCount;
    const singleRow = noFrom || (hasAggregate && !select.groupClause);

    trace.addFact("noFrom", String(noFrom));
    trace.addFact("hasAggregate", String(hasAggregate));
    trace.addFact("hasGroupBy", String(!!select.groupClause));
    trace.addFact("hasLimit", String(hasLimit));
    trace.addFact("singleRow", String(singleRow));

    if (!singleRow) {
      trace.conclude(false, "can return zero rows -> nullable");
      return false;
    }
    if (hasLimit) {
      trace.conclude(false, "LIMIT -> zero-or-one -> still nullable");
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

    // Priority 3: Aggregate (other than count).
    if (meta?.isAggregate) {
      trace.addFact("priority", "3 (aggregate)");
      trace.conclude(false, "aggregate returns NULL over zero rows");
      return false;
    }
    if (!meta && AGGREGATE_NAMES.has(name) && name !== "count") {
      trace.addFact("priority", "3 (aggregate by name, not in catalog)");
      trace.conclude(false, "aggregate returns NULL over zero rows");
      return false;
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

    // Priority 6 & 7: Non-strict scalar / LANGUAGE plpgsql / unknown.
    trace.addFact("priority", meta ? "6 (non-strict/plpgsql)" : "7 (unknown function)");
    trace.conclude(false, "conservative nullable");
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
      const noFrom = !sel.fromClause || sel.fromClause.length === 0;
      const hasAggregate = this.targetListHasAggregate(sel.targetList);
      const singleRow = noFrom || (hasAggregate && !sel.groupClause);
      trace.addFact("noFrom", String(noFrom));
      trace.addFact("hasAggregate", String(hasAggregate));
      trace.addFact("singleRow", String(singleRow));
      if (!singleRow) {
        trace.conclude(false, "SELECT with FROM can return zero rows -> nullable");
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
      const singleRowValues =
        sel?.valuesLists && sel.valuesLists.length === 1;
      trace.addFact("singleRowValues", String(singleRowValues));
      if (!singleRowValues) {
        trace.conclude(false, "INSERT...SELECT can return zero rows -> nullable");
        return false;
      }
      const dmlScope = this.buildDmlScope(ins.relation, fnScope);
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
    const scope = this.buildScope(sel, fnScope);
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

  private unwrapCTE(cte: Node): { ctename: string; ctequery: Node; aliascolnames?: Node[] } | null {
    const node = cte as Record<string, unknown>;
    const c = node["CommonTableExpr"] as
      | { ctename: string; ctequery: Node; aliascolnames?: Node[] }
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
    if ("SubLink" in node) {
      const sl = node["SubLink"] as SubLink;
      return sl.subLinkType ?? "";
    }
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
}

// ---------------------------------------------------------------------------
// Common built-in aggregate function names (for detection without catalog).
// These are pg_catalog built-ins not captured in the user-schema snapshot.
// ---------------------------------------------------------------------------

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
  jointype: string;
  larg?: Node;
  rarg?: Node;
  quals?: Node;
}

interface RangeFunction {
  alias?: { aliasname: string };
  functions?: Node[];
}

interface SelectStmt {
  withClause?: WithClause;
  fromClause?: Node[];
  targetList?: Node[];
  whereClause?: Node;
  groupClause?: Node[];
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
  limitOption?: string;
}

interface InsertStmt {
  withClause?: WithClause;
  relation?: Node;
  cols?: Node[];
  selectStmt?: Node;
  returningClause?: Node;
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

interface WithClause {
  ctes: Node[];
}

interface ColumnRef {
  fields: Node[];
}

interface FuncCall {
  funcname: Node[];
  args?: Node[];
  agg_star?: boolean;
  agg_distinct?: boolean;
  over?: Node;
}

interface SubLink {
  subLinkType?: string;
  subselect?: Node;
  testexpr?: Node;
}
