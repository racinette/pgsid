import type { Node } from "libpg-query";
import type { DepCatalog, EntityId, ResolvedTable } from "./types.js";

// ---------------------------------------------------------------------------
// extractDeps: pure function — AST + DepCatalog + searchPath → EntityId[]
//
// Walks the libpg-query AST to find all catalog entities the query references:
// - RangeVar → tables/views (and CTEs, resolved AST-internally)
// - ColumnRef → columns of resolved tables
// - FuncCall → functions (name-level, no overload resolution)
//
// Recurses into: CTE definitions, subqueries (RangeSubselect), JOIN trees,
// WHERE clauses, target lists, RETURNING lists, GROUP BY, HAVING, VALUES lists.
//
// Unqualified names (tables, columns, functions) are resolved via searchPath.
// ---------------------------------------------------------------------------

/**
 * Extract the set of catalog entity IDs a query depends on.
 *
 * @param stmt The top-level statement node (raw.stmt from a parsed query).
 *   Supported: SelectStmt, InsertStmt, UpdateStmt, DeleteStmt.
 * @param catalog Minimal catalog for name resolution.
 * @param searchPath Ordered list of schema names for unqualified resolution.
 * @returns Deduplicated, sorted array of EntityId strings.
 */
export function extractDeps(
  stmt: Node,
  catalog: DepCatalog,
  searchPath: string[],
): EntityId[] {
  const ctx = new ExtractContext(catalog, searchPath);
  ctx.walkStmt(stmt);
  return ctx.sortedDeps();
}

// ---------------------------------------------------------------------------
// Internal: the walk context
// ---------------------------------------------------------------------------

class ExtractContext {
  private deps = new Set<EntityId>();
  /** CTE name → column names. Populated by WITH clauses. */
  private ctes = new Map<string, string[]>();
  /** Table alias → ResolvedTable. Populated while walking the FROM clause. */
  private aliases = new Map<string, ResolvedTable>();
  /** Resolved tables in scope (no alias, or alias = table name). */
  private tables: ResolvedTable[] = [];
  /** Outer-scope aliases/tables for correlated subquery resolution. */
  private outerAliases: Map<string, ResolvedTable> | null = null;
  private outerTables: ResolvedTable[] = [];

  constructor(
    private catalog: DepCatalog,
    searchPath: string[],
  ) {
    void searchPath; // reserved for future use (qualified resolution)
  }

  /**
   * Run a callback in a subquery scope. Inner aliases take priority over
   * outer ones for unqualified column resolution (SQL scoping rule), but
   * outer aliases remain accessible for correlated references.
   */
  private withSubqueryScope(fn: () => void): void {
    const savedAliases = this.aliases;
    const savedTables = this.tables;
    // Don't copy outer aliases — start fresh. resolveUnqualifiedColumn
    // falls back to outer aliases if the inner scope doesn't have the column.
    this.aliases = new Map();
    this.tables = [];
    // Keep a reference to the outer scope for correlated refs.
    const prevOuter = this.outerAliases;
    const prevOuterTables = this.outerTables;
    this.outerAliases = savedAliases;
    this.outerTables = savedTables;
    try {
      fn();
    } finally {
      this.aliases = savedAliases;
      this.tables = savedTables;
      this.outerAliases = prevOuter;
      this.outerTables = prevOuterTables;
    }
  }

  sortedDeps(): EntityId[] {
    return [...this.deps].sort();
  }

  // -------------------------------------------------------------------------
  // Statement dispatch
  // -------------------------------------------------------------------------

  walkStmt(stmt: Node): void {
    const node = stmt as Record<string, unknown>;
    if ("SelectStmt" in node) {
      this.walkSelect(node["SelectStmt"] as SelectStmt);
    } else if ("InsertStmt" in node) {
      this.walkInsert(node["InsertStmt"] as InsertStmt);
    } else if ("UpdateStmt" in node) {
      this.walkUpdate(node["UpdateStmt"] as UpdateStmt);
    } else if ("DeleteStmt" in node) {
      this.walkDelete(node["DeleteStmt"] as DeleteStmt);
    } else if ("MergeStmt" in node) {
      this.walkMerge(node["MergeStmt"] as MergeStmt);
    }
  }

  // -------------------------------------------------------------------------
  // SELECT
  // -------------------------------------------------------------------------

  private walkSelect(stmt: SelectStmt): void {
    // WITH clause — register CTEs first (they're in scope for the body).
    if (stmt.withClause) {
      this.walkWithClause(stmt.withClause);
    }

    // FROM clause — resolve tables, subqueries, joins.
    if (stmt.fromClause) {
      for (const item of stmt.fromClause) {
        this.walkFromItem(item);
      }
    }

    // Target list — extract ColumnRef/FuncCall deps.
    if (stmt.targetList) {
      for (const target of stmt.targetList) {
        this.walkResTarget(target);
      }
    }

    // WHERE, HAVING, GROUP BY, ORDER BY — walk for ColumnRefs/FuncCalls.
    if (stmt.whereClause) {
      this.walkExpr(stmt.whereClause);
    }
    if (stmt.groupClause) {
      for (const item of stmt.groupClause) {
        this.walkExpr(item);
      }
    }
    if (stmt.havingClause) {
      this.walkExpr(stmt.havingClause);
    }
    if (stmt.sortClause) {
      for (const item of stmt.sortClause) {
        this.walkSortBy(item);
      }
    }

    // DISTINCT ON (col, ...) — expressions to walk.
    if (stmt.distinctClause) {
      for (const item of stmt.distinctClause) {
        this.walkExpr(item);
      }
    }

    // WINDOW w AS (PARTITION BY col ORDER BY col) — walk partition/order exprs.
    if (stmt.windowClause) {
      for (const w of stmt.windowClause) {
        const wd = (w as Record<string, unknown>)["WindowDef"] as WindowDef | undefined;
        if (wd) {
          if (wd.partitionClause) for (const p of wd.partitionClause) this.walkExpr(p);
          if (wd.orderClause) for (const o of wd.orderClause) this.walkSortBy(o);
        }
      }
    }

    // FOR UPDATE / FOR SHARE — locked relations.
    if (stmt.lockingClause) {
      for (const lc of stmt.lockingClause) {
        const clause = (lc as Record<string, unknown>)["LockingClause"] as { lockedRels?: Node[] } | undefined;
        if (clause?.lockedRels) for (const r of clause.lockedRels) this.walkExpr(r);
      }
    }

    // Set operations (UNION, INTERSECT, EXCEPT) — recurse into larg/rarg.
    if (stmt.larg) this.walkSelect(stmt.larg);
    if (stmt.rarg) this.walkSelect(stmt.rarg);
  }

  // -------------------------------------------------------------------------
  // INSERT
  // -------------------------------------------------------------------------

  private walkInsert(stmt: InsertStmt): void {
    if (stmt.withClause) {
      this.walkWithClause(stmt.withClause);
    }

    // The target table.
    if (stmt.relation) {
      this.resolveAndAddTable(stmt.relation);
    }

    // Column list — these are columns of the target table.
    if (stmt.cols) {
      const table = stmt.relation ? this.resolveTable(stmt.relation) : null;
      for (const col of stmt.cols) {
        const rt = (col as Record<string, unknown>)["ResTarget"] as Record<string, unknown> | undefined;
        const name = rt?.["name"] as string | undefined;
        if (name && table) {
          this.deps.add(`${table.schema}.${table.name}.${name}`);
        }
      }
    }

    // The VALUES subquery or SELECT statement.
    if (stmt.selectStmt) {
      this.walkStmt(stmt.selectStmt);
    }

    // RETURNING.
    if (stmt.returningClause) {
      const ret = stmt.returningClause as { exprs?: Node[] };
      if (ret.exprs) for (const t of ret.exprs) this.walkResTarget(t);
    }
  }

  // -------------------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------------------

  private walkUpdate(stmt: UpdateStmt): void {
    if (stmt.withClause) {
      this.walkWithClause(stmt.withClause);
    }

    // The target table.
    if (stmt.relation) {
      this.resolveAndAddTable(stmt.relation);
    }

    // FROM clause (UPDATE...FROM syntax).
    if (stmt.fromClause) {
      for (const item of stmt.fromClause) {
        this.walkFromItem(item);
      }
    }

    // SET targets — columns of the target table.
    if (stmt.targetList) {
      const table = stmt.relation ? this.resolveTable(stmt.relation) : null;
      for (const target of stmt.targetList) {
        const rt = (target as Record<string, unknown>)["ResTarget"] as Record<string, unknown> | undefined;
        const name = rt?.["name"] as string | undefined;
        if (name && table) {
          this.deps.add(`${table.schema}.${table.name}.${name}`);
        }
        const val = rt?.["val"] as Node | undefined;
        if (val) this.walkExpr(val);
      }
    }

    // WHERE.
    if (stmt.whereClause) {
      this.walkExpr(stmt.whereClause);
    }

    // RETURNING.
    if (stmt.returningClause) {
      const ret = stmt.returningClause as { exprs?: Node[] };
      if (ret.exprs) for (const t of ret.exprs) this.walkResTarget(t);
    }
  }

  // -------------------------------------------------------------------------
  // DELETE
  // -------------------------------------------------------------------------

  private walkDelete(stmt: DeleteStmt): void {
    if (stmt.withClause) {
      this.walkWithClause(stmt.withClause);
    }

    // The target table (or relations for multi-table DELETE).
    if (stmt.relation) {
      this.resolveAndAddTable(stmt.relation);
    }
    if (stmt.relations) {
      for (const item of stmt.relations) {
        this.walkFromItem(item);
      }
    }
    if (stmt.usingClause) {
      for (const item of stmt.usingClause) {
        this.walkFromItem(item);
      }
    }

    // WHERE.
    if (stmt.whereClause) {
      this.walkExpr(stmt.whereClause);
    }

    // RETURNING.
    if (stmt.returningClause) {
      const ret = stmt.returningClause as { exprs?: Node[] };
      if (ret.exprs) for (const t of ret.exprs) this.walkResTarget(t);
    }
  }

  // -------------------------------------------------------------------------
  // MERGE
  // -------------------------------------------------------------------------

  private walkMerge(stmt: MergeStmt): void {
    if (stmt.withClause) {
      this.walkWithClause(stmt.withClause);
    }

    // Target relation.
    if (stmt.relation) {
      this.resolveAndAddTable(stmt.relation as unknown as RangeVar);
    }

    // Source relation.
    if (stmt.sourceRelation) {
      this.walkFromItem(stmt.sourceRelation);
    }

    // Join condition.
    if (stmt.joinCondition) {
      this.walkExpr(stmt.joinCondition);
    }

    // WHEN clauses — each may have a targetList (UPDATE) or sourceList (INSERT).
    if (stmt.mergeWhenClauses) {
      for (const wc of stmt.mergeWhenClauses) {
        const mc = (wc as Record<string, unknown>)["MergeWhenClause"] as MergeWhenClause | undefined;
        if (!mc) continue;
        if (mc.condition) this.walkExpr(mc.condition);
        if (mc.targetList) {
          for (const target of mc.targetList) {
            const rt = (target as Record<string, unknown>)["ResTarget"] as Record<string, unknown> | undefined;
            const name = rt?.["name"] as string | undefined;
            const table = stmt.relation
              ? this.resolveTable(stmt.relation as unknown as RangeVar)
              : null;
            if (name && table) {
              this.deps.add(`${table.schema}.${table.name}.${name}`);
            }
            const val = rt?.["val"] as Node | undefined;
            if (val) this.walkExpr(val);
          }
        }
        if (mc.sourceList) {
          for (const target of mc.sourceList) {
            this.walkResTarget(target);
          }
        }
        // MERGE INSERT uses a `values` array (expression list).
        if (mc.values) {
          for (const v of mc.values) {
            this.walkExpr(v);
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // WITH clause (CTEs)
  // -------------------------------------------------------------------------

  private walkWithClause(clause: WithClause): void {
    for (const cte of clause.ctes) {
      const cteNode = (cte as Record<string, unknown>)["CommonTableExpr"] as unknown as CommonTableExpr;
      const name = cteNode.ctename;
      // Recursively walk the CTE body to extract its deps.
      // We save the current alias/table scope, walk the CTE body in a
      // fresh scope, then restore.
      const savedAliases = this.aliases;
      const savedTables = this.tables;
      this.aliases = new Map();
      this.tables = [];
      this.walkStmt(cteNode.ctequery);
      this.aliases = savedAliases;
      this.tables = savedTables;

      // Register the CTE's output columns for subsequent references.
      // If the CTE has explicit column names, use those; otherwise we'd need
      // to infer from the body (skip for now — rare in practice).
      const colNames = cteNode.aliascolnames
        ? cteNode.aliascolnames.map((n: Node) => (n as { String?: { sval?: string } }).String?.sval ?? "")
        : [];
      this.ctes.set(name, colNames);
    }
  }

  // -------------------------------------------------------------------------
  // FROM clause items
  // -------------------------------------------------------------------------

  private walkFromItem(item: Node): void {
    const node = item as Record<string, unknown>;
    if ("RangeVar" in node) {
      this.resolveAndAddTable(node["RangeVar"] as RangeVar);
    } else if ("RangeSubselect" in node) {
      const sub = node["RangeSubselect"] as RangeSubselect;
      if (sub.subquery) {
        // Walk the subquery in a fresh scope.
        const savedAliases = this.aliases;
        const savedTables = this.tables;
        this.aliases = new Map();
        this.tables = [];
        this.walkStmt(sub.subquery);
        // Register the subquery under its alias with empty column names
        // (we can't easily infer them; ColumnRefs to it will be skipped).
        if (sub.alias) {
          const aliasName = sub.alias.aliasname;
          this.aliases = new Map(savedAliases);
          this.tables = savedTables;
          this.aliases.set(aliasName, { schema: "", name: aliasName, columns: [] });
        } else {
          this.aliases = savedAliases;
          this.tables = savedTables;
        }
      }
    } else if ("JoinExpr" in node) {
      const join = node["JoinExpr"] as JoinExpr;
      if (join.larg) this.walkFromItem(join.larg);
      if (join.rarg) this.walkFromItem(join.rarg);
      if (join.quals) this.walkExpr(join.quals);
    } else if ("RangeFunction" in node) {
      // Function in FROM (e.g. unnest(...)) — walk the function call.
      const rf = node["RangeFunction"] as RangeFunction;
      if (rf.functions) {
        for (const f of rf.functions) {
          this.walkExpr(f);
        }
      }
    } else if ("RangeTableSample" in node) {
      // TABLESAMPLE — the relation inside is a RangeVar.
      const rts = node["RangeTableSample"] as RangeTableSample;
      if (rts.relation) this.walkFromItem(rts.relation);
    }
  }

  private resolveAndAddTable(rv: RangeVar): ResolvedTable | null {
    const table = this.resolveTable(rv);
    if (!table) return null;
    this.deps.add(`${table.schema}.${table.name}`);
    const alias = rv.alias?.aliasname ?? rv.relname;
    this.aliases.set(alias, table);
    // Also register without alias (for unqualified column refs).
    if (!rv.alias) {
      this.tables.push(table);
    }
    return table;
  }

  private resolveTable(rv: RangeVar): ResolvedTable | null {
    // CTEs take priority over catalog tables.
    if (this.ctes.has(rv.relname)) {
      return {
        schema: "",
        name: rv.relname,
        columns: this.ctes.get(rv.relname) ?? [],
      };
    }
    const schema = rv.schemaname ?? undefined;
    return this.catalog.resolveTable(schema, rv.relname);
  }

  // -------------------------------------------------------------------------
  // Expression walking
  // -------------------------------------------------------------------------

  private walkResTarget(target: Node): void {
    const node = target as Record<string, unknown>;
    // Target list items have shape { ResTarget: { val: ..., name: ..., location: ... } }.
    const rt = (node["ResTarget"] as Record<string, unknown> | undefined) ?? node;
    const val = rt["val"] as Node | undefined;
    if (val) this.walkExpr(val);
  }

  private walkSortBy(item: Node): void {
    // SortBy is wrapped: { SortBy: { node: ... } }
    const sb = (item as Record<string, unknown>)["SortBy"] as Record<string, unknown> | undefined;
    const node = (sb ?? item) as Record<string, unknown>;
    const inner = node["node"] as Node | undefined;
    if (inner) this.walkExpr(inner);
  }

  private walkExpr(expr: Node | undefined): void {
    if (!expr) return;
    const node = expr as Record<string, unknown>;

    if ("ColumnRef" in node) {
      this.walkColumnRef(node["ColumnRef"] as ColumnRef);
    } else if ("FuncCall" in node) {
      this.walkFuncCall(node["FuncCall"] as FuncCall);
    } else if ("A_Expr" in node) {
      const ae = node["A_Expr"] as A_Expr;
      this.walkExpr(ae.lexpr);
      this.walkExpr(ae.rexpr);
    } else if ("BoolExpr" in node) {
      const be = node["BoolExpr"] as BoolExpr;
      if (be.args) for (const a of be.args) this.walkExpr(a);
    } else if ("TypeCast" in node) {
      const tc = node["TypeCast"] as TypeCast;
      this.walkExpr(tc.arg);
    } else if ("CoalesceExpr" in node) {
      const ce = node["CoalesceExpr"] as CoalesceExpr;
      if (ce.args) for (const a of ce.args) this.walkExpr(a);
    } else if ("CaseExpr" in node) {
      const ce = node["CaseExpr"] as CaseExpr;
      this.walkExpr(ce.xpr);
      if (ce.args) for (const a of ce.args) {
        // CaseWhen is wrapped: { CaseWhen: { expr, result } }
        const wh = (a as Record<string, unknown>)["CaseWhen"] as CaseWhen | undefined;
        if (wh) {
          this.walkExpr(wh.expr);
          this.walkExpr(wh.result);
        } else {
          // Fallback: treat as direct CaseWhen
          this.walkExpr((a as CaseWhen).expr);
          this.walkExpr((a as CaseWhen).result);
        }
      }
      this.walkExpr(ce.defresult);
    } else if ("NullTest" in node) {
      // IS NULL / IS NOT NULL — the argument is a ColumnRef we want to track.
      const nt = node["NullTest"] as NullTest;
      this.walkExpr(nt.arg);
    } else if ("SubLink" in node) {
      const sl = node["SubLink"] as SubLink;
      this.walkExpr(sl.testexpr);
      if (sl.subselect) {
        // Subquery scope: inner aliases take priority, outer are fallback
        // (for correlated subqueries referencing outer columns).
        this.withSubqueryScope(() => this.walkStmt(sl.subselect!));
      }
    } else if ("ResTarget" in node) {
      const rt = node["ResTarget"] as Record<string, unknown>;
      this.walkExpr(rt["val"] as Node | undefined);
    } else if ("ParamRef" in node) {
      // Parameters don't reference catalog entities.
    } else if ("A_Const" in node) {
      // Constants don't reference catalog entities.
    } else if ("SelectStmt" in node) {
      // Subquery in expression context — fresh scope with outer fallback.
      this.withSubqueryScope(() => this.walkSelect(node["SelectStmt"] as SelectStmt));
    } else if ("MinMaxExpr" in node) {
      const mm = node["MinMaxExpr"] as MinMaxExpr;
      if (mm.args) for (const a of mm.args) this.walkExpr(a);
    } else if ("NamedArgExpr" in node) {
      const na = node["NamedArgExpr"] as NamedArgExpr;
      this.walkExpr(na.arg);
    } else if ("RowExpr" in node) {
      const re = node["RowExpr"] as RowExpr;
      if (re.args) for (const a of re.args) this.walkExpr(a);
    } else if ("A_ArrayExpr" in node) {
      const ae = node["A_ArrayExpr"] as AArrayExpr;
      if (ae.elements) for (const e of ae.elements) this.walkExpr(e);
    } else if ("CollateClause" in node) {
      const cc = node["CollateClause"] as CollateClause;
      this.walkExpr(cc.arg);
    } else if ("A_Indirection" in node) {
      const ai = node["A_Indirection"] as AIndirection;
      this.walkExpr(ai.arg);
    } else if ("SetToDefault" in node) {
      // SET col = DEFAULT — no expression to walk.
    } else if ("XmlExpr" in node) {
      const xe = node["XmlExpr"] as XmlExpr;
      if (xe.args) for (const a of xe.args) this.walkExpr(a);
      if (xe.named_args) for (const a of xe.named_args) this.walkExpr(a);
    } else if ("GroupingSet" in node) {
      const gs = node["GroupingSet"] as GroupingSet;
      if (gs.content) for (const c of gs.content) this.walkExpr(c);
    }
  }

  private walkColumnRef(ref: ColumnRef): void {
    const fields = (ref.fields ?? []) as Node[];
    const parts = fields.map(f => (f as { String?: { sval?: string } }).String?.sval ?? "");
    if (parts.length === 0) return;

    // `SELECT *` — A_Star node. Expand to all columns of all in-scope tables.
    if (fields.some(f => "A_Star" in (f as Record<string, unknown>))) {
      for (const [, table] of this.aliases) {
        if (table.columns.length > 0) {
          for (const col of table.columns) {
            this.deps.add(`${table.schema}.${table.name}.${col}`);
          }
        }
      }
      for (const table of this.tables) {
        if (table.columns.length > 0) {
          for (const col of table.columns) {
            this.deps.add(`${table.schema}.${table.name}.${col}`);
          }
        }
      }
      return;
    }

    // 1 part: `col` — resolve against in-scope tables.
    if (parts.length === 1) {
      const colName = parts[0]!;
      this.resolveUnqualifiedColumn(colName);
      return;
    }

    // 2 parts: `alias.col` — resolve via alias map.
    if (parts.length === 2) {
      const [alias, col] = parts;
      this.resolveAliasedColumn(alias!, col!);
      return;
    }

    // 3 parts: `schema.alias.col` — fully qualified.
    if (parts.length === 3) {
      const [, alias, col] = parts;
      const table = this.aliases.get(alias!);
      if (table && table.columns.includes(col!)) {
        this.deps.add(`${table.schema}.${table.name}.${col!}`);
      }
      return;
    }
  }

  private resolveUnqualifiedColumn(colName: string): void {
    // Search inner-scope aliases first, then outer-scope (correlated refs),
    // then un-aliased tables.
    for (const [, table] of this.aliases) {
      if (table.schema && table.columns.includes(colName)) {
        this.deps.add(`${table.schema}.${table.name}.${colName}`);
        return;
      }
    }
    if (this.outerAliases) {
      for (const [, table] of this.outerAliases) {
        if (table.schema && table.columns.includes(colName)) {
          this.deps.add(`${table.schema}.${table.name}.${colName}`);
          return;
        }
      }
    }
    for (const table of this.tables) {
      if (table.columns.includes(colName)) {
        this.deps.add(`${table.schema}.${table.name}.${colName}`);
        return;
      }
    }
    if (this.outerTables) {
      for (const table of this.outerTables) {
        if (table.columns.includes(colName)) {
          this.deps.add(`${table.schema}.${table.name}.${colName}`);
          return;
        }
      }
    }
  }

  private resolveAliasedColumn(alias: string, colName: string): void {
    const table = this.aliases.get(alias) ?? this.outerAliases?.get(alias);
    if (table) {
      if (table.schema && table.columns.includes(colName)) {
        this.deps.add(`${table.schema}.${table.name}.${colName}`);
      }
      // If it's a CTE (schema="") or subquery (columns=[]), skip.
      return;
    }
    // No alias match — could be `schema.table` (2-part table ref without column).
    // Try resolving as a table reference.
    const resolved = this.catalog.resolveTable(alias, colName);
    if (resolved) {
      this.deps.add(`${resolved.schema}.${resolved.name}`);
    }
  }

  private walkFuncCall(fc: FuncCall): void {
    // Resolve the function name.
    const nameParts = (fc.funcname ?? []).map(
      n => (n as { String?: { sval?: string } }).String?.sval ?? "",
    );
    if (nameParts.length === 0) return;

    let schema: string | undefined;
    let name: string;
    if (nameParts.length === 1) {
      name = nameParts[0]!;
    } else {
      schema = nameParts[nameParts.length - 2];
      name = nameParts[nameParts.length - 1]!;
    }

    // Skip built-in aggregates (count, sum, etc.) — they don't have catalog deps.
    // We only track user functions (in user schemas). The catalog.resolveFunction
    // will return null for pg_catalog functions.
    // Every candidate, not the one that would be picked: an unqualified
    // call with candidates in two schemas depends on both, because
    // dropping or retyping either changes what the overload-consensus rule
    // concludes. (What this still cannot express is a dependency on a
    // function that does NOT exist yet — a better-matching overload
    // appearing later in an earlier schema changes the answer with no
    // recorded entity to hang the invalidation on. That hole is shared with
    // unqualified RELATION references and belongs to the consumer's
    // search-path design, not here.)
    for (const fn of this.catalog.resolveFunctions(schema, name)) {
      this.deps.add(`${fn.schema}.${fn.name}`);
    }

    // Walk arguments for nested ColumnRefs/FuncCalls.
    if (fc.args) {
      for (const arg of fc.args) {
        this.walkExpr(arg);
      }
    }

    // OVER clause (window functions) — walk the partition/order expressions.
    if (fc.over) {
      const over = fc.over as WindowDef;
      if (over.partitionClause) {
        for (const p of over.partitionClause) this.walkExpr(p);
      }
      if (over.orderClause) {
        for (const o of over.orderClause) this.walkSortBy(o);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// AST node types (minimal — only the fields we access).
// These are loose interfaces over the libpg-query AST; we only declare the
// fields we read. Unknown fields are ignored.
// ---------------------------------------------------------------------------

interface RangeVar {
  relname: string;
  schemaname?: string;
  alias?: { aliasname: string };
}

interface RangeSubselect {
  subquery?: Node;
  alias?: { aliasname: string };
}

interface JoinExpr {
  jointype: string;
  larg?: Node;
  rarg?: Node;
  quals?: Node;
  alias?: { aliasname: string };
}

interface RangeFunction {
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
}

interface InsertStmt {
  withClause?: WithClause;
  relation?: RangeVar;
  cols?: Node[];
  selectStmt?: Node;
  returningClause?: Node[];
}

interface UpdateStmt {
  withClause?: WithClause;
  relation?: RangeVar;
  targetList?: Node[];
  fromClause?: Node[];
  whereClause?: Node;
  returningClause?: Node[];
}

interface DeleteStmt {
  withClause?: WithClause;
  relation?: RangeVar;
  relations?: Node[];
  usingClause?: Node[];
  whereClause?: Node;
  returningClause?: Node[];
}

interface WithClause {
  ctes: Node[];
}

interface CommonTableExpr {
  ctename: string;
  ctequery: Node;
  aliascolnames?: Node[];
}

interface ColumnRef {
  fields: Node[];
  location?: number;
}

interface FuncCall {
  funcname: Node[];
  args?: Node[];
  over?: WindowDef;
  agg_star?: boolean;
  location?: number;
}

interface WindowDef {
  partitionClause?: Node[];
  orderClause?: Node[];
}

interface A_Expr {
  lexpr?: Node;
  rexpr?: Node;
  name?: Node[];
  kind?: string;
}

interface BoolExpr {
  args?: Node[];
  boolop?: string;
}

interface TypeCast {
  arg: Node;
}

interface CoalesceExpr {
  args?: Node[];
}

interface CaseExpr {
  xpr?: Node;
  args?: Node[];
  defresult?: Node;
}

interface CaseWhen {
  expr?: Node;
  result?: Node;
}

interface SubLink {
  testexpr?: Node;
  subselect?: Node;
}

interface NullTest {
  arg: Node;
  nulltesttype: string;
}

interface MinMaxExpr {
  args?: Node[];
}

interface NamedArgExpr {
  arg: Node;
}

interface RowExpr {
  args?: Node[];
}

interface AArrayExpr {
  elements?: Node[];
}

interface CollateClause {
  arg: Node;
}

interface AIndirection {
  arg: Node;
}

interface RangeTableSample {
  relation?: Node;
}

interface MergeStmt {
  withClause?: WithClause;
  relation?: Node;
  sourceRelation?: Node;
  joinCondition?: Node;
  mergeWhenClauses?: Node[];
}

interface MergeWhenClause {
  condition?: Node;
  targetList?: Node[];
  sourceList?: Node[];
  values?: Node[];
}

interface XmlExpr {
  args?: Node[];
  named_args?: Node[];
}

interface GroupingSet {
  content?: Node[];
}
