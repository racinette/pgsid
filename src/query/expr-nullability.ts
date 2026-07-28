import type { Node } from "libpg-query";

// ---------------------------------------------------------------------------
// inferExprNotNull: pure function — AST only → boolean (Layer 4 of the
// nullability model).
//
// Determines whether an expression's *structure itself* guarantees a non-null
// result, independent of the intrinsic nullability of any column inputs.
// `ColumnRef` returns `false` (conservatively nullable); the composition layer
// overrides this for plain `SELECT col` outputs using catalog nullability +
// join nullability + WHERE guarantees.
//
// Design principle: never say non-null when the result could be null (correct
// > precise). Imprecision only affects non-ColumnRef expressions whose inputs
// are NOT NULL columns — a narrow case handled at the composition layer for
// the common `SELECT col` path.
//
// See docs/nullability-design.md → Layer 4 for the full rules table.
// ---------------------------------------------------------------------------

/** Built-in aggregates that return NULL over zero rows (besides `count`). */
const NULL_AGGREGATES = new Set([
  "max",
  "min",
  "sum",
  "avg",
  "stddev",
  "stddev_pop",
  "stddev_samp",
  "variance",
  "var_pop",
  "var_samp",
  "bool_or",
  "string_agg",
  "xmlagg",
  "array_agg",
  "json_agg",
  "jsonb_agg",
  "json_object_agg",
  "jsonb_object_agg",
  "percentile_disc",
  "percentile_cont",
  "mode",
  "first_value",
  "last_value",
  "nth_value",
  "cume_dist",
  "percent_rank",
  "regr_avgx",
  "regr_avgy",
  "regr_count",
  "regr_intercept",
  "regr_r2",
  "regr_slope",
  "regr_sxx",
  "regr_sxy",
  "regr_syy",
  "corr",
  "covar_pop",
  "covar_samp",
  "every",
]);

/**
 * Infer whether an expression is structurally guaranteed to be non-null.
 *
 * @param expr The AST expression node (e.g. a target list `val`).
 * @returns `true` if the expression structure guarantees non-null;
 *   `false` if it is or may be nullable (conservative).
 */
export function inferExprNotNull(expr: Node): boolean {
  const node = expr as Record<string, unknown>;

  if ("A_Const" in node) {
    // NULL literal is tagged `isnull: true`; all other literals are non-null.
    const c = node["A_Const"] as A_Const;
    return c.isnull !== true;
  }

  if ("ColumnRef" in node) {
    // Conservative — intrinsic nullability is applied at the composition layer.
    return false;
  }

  if ("NullTest" in node) {
    // IS NULL / IS NOT NULL always returns bool, never NULL.
    return true;
  }

  if ("SubLink" in node) {
    const sl = node["SubLink"] as SubLink;
    // EXISTS / NOT EXISTS always return bool. Scalar/array/ANY/ALL sublinks
    // are conservatively nullable.
    return sl.subLinkType === "EXISTS_SUBLINK";
  }

  if ("TypeCast" in node) {
    // Cast preserves nullability of its argument.
    const tc = node["TypeCast"] as TypeCast;
    return inferExprNotNull(tc.arg);
  }

  if ("CoalesceExpr" in node) {
    // Non-null if any argument is provably non-null.
    const ce = node["CoalesceExpr"] as CoalesceExpr;
    if (!ce.args) return false;
    return ce.args.some((a) => inferExprNotNull(a));
  }

  if ("CaseExpr" in node) {
    // Conservative — path-sensitive analysis (which branch constrains which
    // value) is skipped. Nullable if any branch is nullable, so conservative
    // nullable.
    return false;
  }

  if ("A_Expr" in node) {
    // Comparison AND math: three-valued logic → NULL propagates to UNKNOWN,
    // not TRUE. Conservative nullable.
    return false;
  }

  if ("BoolExpr" in node) {
    const be = node["BoolExpr"] as BoolExpr;
    if (be.boolop === "NOT_EXPR") {
      // NOT of a provably non-null (boolean) value is non-null. In practice
      // the only common non-null arg is EXISTS → `NOT EXISTS` is non-null.
      // NOT of a nullable predicate can itself be NULL (NOT UNKNOWN = UNKNOWN).
      const args = be.args ?? [];
      if (args.length === 1) {
        return inferExprNotNull(args[0]!);
      }
      return false;
    }
    // AND / OR: three-valued logic can produce NULL. Conservative nullable.
    return false;
  }

  if ("FuncCall" in node) {
    const fc = node["FuncCall"] as FuncCall;
    return funcCallNotNull(fc);
  }

  if ("RowExpr" in node) {
    // Row constructor is never NULL (even with NULL elements).
    return true;
  }

  if ("A_ArrayExpr" in node) {
    // ARRAY constructor is never NULL.
    return true;
  }

  if ("NamedArgExpr" in node) {
    const na = node["NamedArgExpr"] as NamedArgExpr;
    return inferExprNotNull(na.arg);
  }

  if ("CollateClause" in node) {
    // Collation preserves nullability.
    const cc = node["CollateClause"] as CollateClause;
    return inferExprNotNull(cc.arg);
  }

  // MinMaxExpr (GREATEST/LEAST), ScalarArrayOp, A_Indirection, and any
  // unrecognized node → conservative nullable.
  return false;
}

/**
 * Nullability rule for a `FuncCall`:
 * - `count(*)` (and `count(col)`) → `true` (count never returns NULL).
 * - other known aggregates (max/sum/avg/...) → `false` (NULL over zero rows).
 * - everything else (strict scalar, non-strict, unknown) → `false` (conservative
 *   — strictness is in the catalog, which we don't have here; and even strict
 *   functions with ColumnRef args reduce to `false` since ColumnRef → false).
 */
function funcCallNotNull(fc: FuncCall): boolean {
  // count(*) is tagged agg_star; count(col) is by name. count never returns NULL.
  if (fc.agg_star === true) return true;
  const name = lastName(fc.funcname);
  if (name === "count") return true;
  if (NULL_AGGREGATES.has(name)) return false;
  // Non-aggregate scalar / unknown: conservative nullable. We can't tell
  // strictness from the AST, and strict-with-ColumnRef-args still yields false.
  return false;
}

/** Extract the last component of a `funcname` path (the function name). */
function lastName(funcname: Node[] | undefined): string {
  if (!funcname || funcname.length === 0) return "";
  const last = funcname[funcname.length - 1] as Record<string, unknown> | undefined;
  if (last && "String" in last) {
    return (last["String"] as { sval?: string }).sval ?? "";
  }
  return "";
}

// ---------------------------------------------------------------------------
// AST node types (minimal — only the fields we access)
// ---------------------------------------------------------------------------

interface A_Const {
  isnull?: boolean;
}

interface SubLink {
  subLinkType?: string;
  subselect?: Node;
}

interface TypeCast {
  arg: Node;
}

interface CoalesceExpr {
  args?: Node[];
}

interface BoolExpr {
  boolop?: string;
  args?: Node[];
}

interface FuncCall {
  funcname?: Node[];
  args?: Node[];
  agg_star?: boolean;
}

interface NamedArgExpr {
  arg: Node;
}

interface CollateClause {
  arg: Node;
}
