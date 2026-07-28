import type { Node } from "libpg-query";
import type { AliasNullability } from "./types.js";

// ---------------------------------------------------------------------------
// applyWhereConstraints: pure function — AST + join nullability → WHERE
// constraint analysis (Layer 3 of the nullability model).
//
// Walks the WHERE clause of a SELECT statement and detects predicates that
// imply columns are non-null. Two outputs:
//
// 1. `promotedAliases` — optional-side aliases (from `joinNullability`) that
//    have at least one column tested non-null in an AND-conjunct. Promoting
//    such an alias to required makes ALL of its columns non-null, because the
//    WHERE predicate eliminates the NULL-extended rows the outer join would
//    otherwise produce (a LEFT JOIN effectively becomes INNER).
//
// 2. `guaranteedNonNull` — "alias.col" (or bare "col" for unqualified refs)
//    strings for columns directly tested by a non-null-implying predicate in
//    an AND-conjunct. The composition layer matches these against output
//    columns.
//
// Three-valued logic: in SQL, `NULL = anything` yields UNKNOWN, not TRUE. So
// any comparison predicate that evaluates to TRUE implies its operands are
// non-NULL. We exploit this syntactically: a ColumnRef that appears as a
// direct operand of a comparison/A_Expr/NullTest(IS_NOT_NULL) in an
// AND-conjunct is guaranteed non-null.
//
// What we conservatively skip:
// - `OR` branches — disjunctive predicates don't guarantee individual columns.
// - `NOT` branches — negation doesn't give a simple non-null guarantee.
// - Columns nested inside strict functions / math (`func(col) = x`) — strict
//   function detection needs the catalog; deferred. Only *direct* ColumnRef
//   operands of the leaf predicate are detected.
// - Subquery WHERE clauses — each scope has its own WHERE; this function only
//   analyzes the top-level SELECT's WHERE.
// ---------------------------------------------------------------------------

export interface WhereConstraints {
  /** Aliases promoted from optional to required (LEFT JOIN → INNER). */
  promotedAliases: Set<string>;
  /** "alias.col" (or "col") guaranteed non-null by a WHERE predicate. */
  guaranteedNonNull: Set<string>;
}

/**
 * Analyze the WHERE clause of a SELECT statement for non-null implications.
 *
 * @param stmt The top-level statement node (SelectStmt expected; other
 *   kinds simply yield empty constraints).
 * @param joinNullability Per-alias join nullability from `inferJoinNullability`.
 *   Used to decide whether a guaranteed column also promotes its alias.
 */
export function applyWhereConstraints(
  stmt: Node,
  joinNullability: AliasNullability[],
): WhereConstraints {
  const result: WhereConstraints = {
    promotedAliases: new Set<string>(),
    guaranteedNonNull: new Set<string>(),
  };

  const node = stmt as Record<string, unknown>;
  if (!("SelectStmt" in node)) return result;
  const select = node["SelectStmt"] as SelectStmt;
  if (!select.whereClause) return result;

  // Index optional aliases for O(1) promotion checks.
  const optionalAliases = new Set<string>();
  for (const a of joinNullability) {
    if (a.joinNullable) optionalAliases.add(a.alias);
  }

  walkWhere(select.whereClause, optionalAliases, result);
  return result;
}

// -------------------------------------------------------------------------
// Recursive WHERE walk
// -------------------------------------------------------------------------

function walkWhere(
  expr: Node,
  optionalAliases: Set<string>,
  result: WhereConstraints,
): void {
  const node = expr as Record<string, unknown>;

  if ("BoolExpr" in node) {
    const be = node["BoolExpr"] as BoolExpr;
    if (be.boolop === "AND_EXPR") {
      // Recurse into each conjunct — each one's guarantees apply.
      if (be.args) for (const a of be.args) walkWhere(a, optionalAliases, result);
    }
    // OR_EXPR and NOT_EXPR: conservative — no guarantees. Skip.
    return;
  }

  // Leaf predicate — try to detect non-null-implying patterns. A single
  // predicate may imply multiple columns (e.g. `a = b` implies both a and b).
  const colKeys = detectNonNullColumns(expr);
  for (const colKey of colKeys) {
    result.guaranteedNonNull.add(colKey);
    // If the ref is qualified (alias.col) and the alias is optional, promote.
    const dot = colKey.indexOf(".");
    if (dot > 0) {
      const alias = colKey.slice(0, dot);
      if (optionalAliases.has(alias)) {
        result.promotedAliases.add(alias);
      }
    }
  }
}

/**
 * Return the column keys ("alias.col" or "col") that `expr` — a leaf WHERE
 * predicate — syntactically implies are non-null. May return multiple (e.g.
 * `a = b` implies both `a` and `b`). Empty if the predicate implies nothing.
 *
 * Recognized patterns (see docs/nullability-design.md → Layer 3):
 * - `NullTest(IS_NOT_NULL)` on a `ColumnRef`.
 * - `A_Expr` (comparison/math/IN/ANY/ALL/LIKE) with a `ColumnRef` on either
 *   side. (libpg-query represents `IN`, `= ANY(...)`, `= ALL(...)` as A_Expr
 *   variants — AEXPR_IN, AEXPR_OP_ANY, AEXPR_OP_ALL — so a single check
 *   covers them.) Both operands are reported when both are ColumnRefs.
 * - `ScalarArrayOp` with a `ColumnRef` as `lexpr` (defensive — modern
 *   libpg-query emits A_Expr variants instead, but older builds may use this).
 */
function detectNonNullColumns(expr: Node): string[] {
  const node = expr as Record<string, unknown>;
  const out: string[] = [];

  if ("NullTest" in node) {
    const nt = node["NullTest"] as NullTest;
    if (nt.nulltesttype === "IS_NOT_NULL") {
      const k = columnKey(nt.arg);
      if (k) out.push(k);
    }
    return out;
  }

  if ("A_Expr" in node) {
    const ae = node["A_Expr"] as A_Expr;
    // Direct ColumnRef operands are guaranteed non-null. We do NOT recurse
    // into nested A_Expr/FuncCall operands — strict-function / math
    // propagation is deferred (needs catalog strictness).
    const left = columnKey(ae.lexpr);
    if (left) out.push(left);
    const right = columnKey(ae.rexpr);
    if (right) out.push(right);
    return out;
  }

  if ("ScalarArrayOp" in node) {
    const sa = node["ScalarArrayOp"] as ScalarArrayOp;
    const k = columnKey(sa.lexpr);
    if (k) out.push(k);
    return out;
  }

  return out;
}

/**
 * If `expr` is a `ColumnRef`, return its dotted key ("alias.col" or "col").
 * Otherwise null. A_Star (`*`) is not a column — return null.
 */
function columnKey(expr: Node | undefined): string | null {
  if (!expr) return null;
  const node = expr as Record<string, unknown>;
  if (!("ColumnRef" in node)) return null;
  const ref = node["ColumnRef"] as ColumnRef;
  const fields = (ref.fields ?? []) as Node[];
  const parts: string[] = [];
  for (const f of fields) {
    const fn = f as Record<string, unknown>;
    if ("String" in fn) {
      parts.push((fn["String"] as { sval?: string }).sval ?? "");
    } else {
      // A_Star or other node — not a plain column reference.
      return null;
    }
  }
  if (parts.length === 0) return null;
  return parts.join(".");
}

// ---------------------------------------------------------------------------
// AST node types (minimal — only the fields we access)
// ---------------------------------------------------------------------------

interface SelectStmt {
  whereClause?: Node;
}

interface BoolExpr {
  boolop?: string;
  args?: Node[];
}

interface NullTest {
  arg: Node;
  nulltesttype: string;
}

interface A_Expr {
  lexpr?: Node;
  rexpr?: Node;
  kind?: string;
  name?: Node[];
}

interface ScalarArrayOp {
  lexpr?: Node;
  rexpr?: Node;
}

interface ColumnRef {
  fields: Node[];
}
