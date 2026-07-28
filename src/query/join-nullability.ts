import type { Node } from "libpg-query";
import type { AliasNullability } from "./types.js";

// ---------------------------------------------------------------------------
// inferJoinNullability: pure function — AST only → per-alias nullability.
//
// Walks the FROM/JOIN tree of a SELECT statement and marks each table alias
// as `joinNullable: true` if it's on the optional side of a LEFT/RIGHT/FULL
// outer join. This is purely structural analysis — no catalog, no types.
//
// The final per-column nullability is a merge at the codegen layer:
//   outputNotNull = !joinNullable(alias) && catalog.notNull(column)
//
// Join nullability overrides intrinsic nullability — a NOT NULL domain on
// the nullable side of a LEFT JOIN is nullable in the output (the NULL comes
// from the join, not the column).
//
// Algorithm (three-state recursive walk, per sqlc's `isTableRequired`):
// - INNER JOIN: both sides keep prior nullability.
// - LEFT JOIN:  right side → nullable; left side keeps prior.
// - RIGHT JOIN: left side → nullable; right side keeps prior.
// - FULL JOIN:  both sides → nullable.
// ---------------------------------------------------------------------------

const REQUIRED = 0;
const OPTIONAL = 1;
const NOT_FOUND = 2;

/**
 * Extract per-alias join nullability from a SELECT statement.
 *
 * @param stmt The top-level statement node. Only SelectStmt is supported
 *   (INSERT/UPDATE/DELETE don't have JOIN structures that affect output
 *   nullability — their RETURNING columns come from the target table, which
 *   is always required).
 * @returns Array of `{ alias, joinNullable }` for each table alias in the
 *   FROM clause. Sorted by alias name for determinism.
 */
export function inferJoinNullability(stmt: Node): AliasNullability[] {
  const node = stmt as Record<string, unknown>;
  if (!("SelectStmt" in node)) return [];
  const select = node["SelectStmt"] as SelectStmt;
  if (!select.fromClause) return [];

  const results = new Map<string, boolean>();

  for (const item of select.fromClause) {
    walkFromItem(item, REQUIRED, results);
  }

  return [...results.entries()]
    .map(([alias, joinNullable]) => ({ alias, joinNullable }))
    .sort((a, b) => a.alias < b.alias ? -1 : a.alias > b.alias ? 1 : 0);
}

/**
 * Recursive walk of a FROM clause item. `prior` is the nullability state
 * inherited from the parent join structure (REQUIRED = not on any optional
 * side yet; OPTIONAL = on the optional side of an outer join).
 */
function walkFromItem(
  item: Node,
  prior: number,
  results: Map<string, boolean>,
): number {
  const node = item as Record<string, unknown>;

  if ("RangeVar" in node) {
    const rv = node["RangeVar"] as RangeVar;
    const alias = rv.alias?.aliasname ?? rv.relname;
    // Only set if not already required (optional overrides required, but
    // required does not override optional — a table on the optional side
    // of any join is nullable).
    if (!results.has(alias) || prior === OPTIONAL) {
      results.set(alias, prior === OPTIONAL);
    }
    return prior === NOT_FOUND ? NOT_FOUND : (prior === OPTIONAL ? OPTIONAL : REQUIRED);
  }

  if ("RangeSubselect" in node) {
    const sub = node["RangeSubselect"] as RangeSubselect;
    const alias = sub.alias?.aliasname;
    if (alias) {
      if (!results.has(alias) || prior === OPTIONAL) {
        results.set(alias, prior === OPTIONAL);
      }
    }
    // Recurse into the subquery's FROM clause to mark its tables too.
    if (sub.subquery) {
      const subNode = sub.subquery as Record<string, unknown>;
      if ("SelectStmt" in subNode) {
        const subSelect = subNode["SelectStmt"] as SelectStmt;
        if (subSelect.fromClause) {
          for (const item of subSelect.fromClause) {
            walkFromItem(item, prior, results);
          }
        }
      }
    }
    return prior === NOT_FOUND ? NOT_FOUND : (prior === OPTIONAL ? OPTIONAL : REQUIRED);
  }

  if ("JoinExpr" in node) {
    const join = node["JoinExpr"] as JoinExpr;
    let leftResult = NOT_FOUND;
    let rightResult = NOT_FOUND;

    switch (join.jointype) {
      case "JOIN_INNER":
        // Both sides inherit the prior nullability. If this join is nested
        // inside an outer join (prior === OPTIONAL), both sides are optional.
        leftResult = walkFromItem(join.larg!, prior, results);
        rightResult = walkFromItem(join.rarg!, prior, results);
        break;
      case "JOIN_LEFT":
        leftResult = walkFromItem(join.larg!, prior, results);
        rightResult = walkFromItem(join.rarg!, OPTIONAL, results);
        break;
      case "JOIN_RIGHT":
        leftResult = walkFromItem(join.larg!, OPTIONAL, results);
        rightResult = walkFromItem(join.rarg!, prior, results);
        break;
      case "JOIN_FULL":
        leftResult = walkFromItem(join.larg!, OPTIONAL, results);
        rightResult = walkFromItem(join.rarg!, OPTIONAL, results);
        break;
      default:
        // CROSS JOIN etc. — treat as inner.
        leftResult = walkFromItem(join.larg!, prior, results);
        rightResult = walkFromItem(join.rarg!, prior, results);
        break;
    }

    // If either side was not found, propagate NOT_FOUND.
    if (leftResult === NOT_FOUND || rightResult === NOT_FOUND) return NOT_FOUND;
    // If either side is optional, the join as a whole is optional (for
    // nested joins that reference this one as a sub-expression).
    if (leftResult === OPTIONAL || rightResult === OPTIONAL) return OPTIONAL;
    return REQUIRED;
  }

  return NOT_FOUND;
}

// ---------------------------------------------------------------------------
// AST node types (minimal)
// ---------------------------------------------------------------------------

interface RangeVar {
  relname: string;
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
}

interface SelectStmt {
  fromClause?: Node[];
}
