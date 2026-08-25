// ---------------------------------------------------------------------------
// Written-value guards — the CASE-arm consumer's pre-walk step.
//
// The walk's written-value tracking carries NON-NULLNESS out of a DML
// statement's values and no further, which is exactly right for the question
// it was built for and blind to a second one. `INSERT INTO t (name, active)
// VALUES (NULL, true) RETURNING CASE WHEN active THEN 'a' ELSE name END`
// returns 'a' on every row PostgreSQL can produce, because `active` was
// WRITTEN true and the ELSE never runs — but the tracking knows only that
// `active` is not NULL, so the walk keeps the ELSE reachable and reads the
// column through the NULL `name`.
//
// The walk already prunes CASE arms, and it prunes them from exactly this
// kind of fact: `evaluatedGuardTruth` reads the statement evaluation map, a
// TRUE guard kills every later arm and the ELSE with them, and a missing
// answer keeps today's symbolic reading. What it cannot do is ASK, because
// the evaluator is scope-blind by construction — any node carrying a name is
// open, and `active` is a name.
//
// So this pass closes the tree instead of teaching the evaluator to resolve:
// substitute each written constant for its column, hand the result to the
// same evaluator core the other three passes use, and key the answers back to
// the ORIGINAL guard nodes. The consumer side is then already written — the
// map merges into the statement evaluation map and `evaluatedGuardTruth`
// finds it without knowing where it came from.
//
// Which is also why the answer is general rather than boolean-shaped. The
// walk never computes a PostgreSQL expression, so `WHEN status = 'paid'` over
// a written `'paid'`, `WHEN qty > 10` over a written `20`, and a bare boolean
// column are one question with one answer, and the closure gates that refuse
// a volatile or session-dependent tree are the evaluator's own.
//
// EVERY row-producing path must write the SAME constant, and that quantifier
// is the whole soundness argument: a returned row came from one of those
// paths, and the substituted tree is what it evaluated. A second VALUES row
// with a different literal, a MERGE arm that writes something else, an
// `ON CONFLICT DO UPDATE` that writes another value — each drops the column.
// A MERGE DELETE arm returns the row as it was BEFORE the statement, so it
// drops every column at once.
//
// Triggers are the hazard that would otherwise sink this, and the guard is
// the walk's own: a BEFORE ROW or INSTEAD OF hook may replace NEW after the
// statement's values were chosen, so a target carrying one contributes
// nothing. Same rule, same catalog face, stated once more here because this
// pass runs before the scope that enforces it exists.
// ---------------------------------------------------------------------------

import type { Node } from "libpg-query";
import {
  evaluateClosedSubtrees,
  type EvalResult,
  type Evaluate,
  type SubtreeEvaluationCatalog,
} from "./subtree-evaluator.js";
import type { NullabilityCatalog } from "./types.js";

type Fields = Record<string, unknown>;

/** The DML shapes that carry a RETURNING list, unwrapped. */
interface DmlShape {
  kind: "insert" | "update" | "merge";
  relation: { schemaname?: string; relname?: string; alias?: { aliasname?: string }; inh?: boolean };
  returningList: Node[];
  stmt: Fields;
  /** Whether a relation OTHER than the target can supply an unqualified name. */
  hasOtherRelations: boolean;
}

function shapeOf(stmt: Node): DmlShape | null {
  const node = stmt as Fields;
  for (const [kind, key] of [
    ["insert", "InsertStmt"],
    ["update", "UpdateStmt"],
    ["merge", "MergeStmt"],
  ] as const) {
    const s = node[key] as Fields | undefined;
    if (!s) continue;
    // PG18 wraps RETURNING in a ReturningClause carrying `exprs` (it also
    // carries OLD/NEW aliases, which is why the list is not the clause).
    const returningList =
      ((s["returningClause"] as { exprs?: Node[] } | undefined)?.exprs ?? []) as Node[];
    const relation = s["relation"] as DmlShape["relation"] | undefined;
    if (!returningList.length || !relation?.relname) return null;
    const hasOtherRelations =
      kind === "merge" ||
      ((s["fromClause"] as Node[] | undefined)?.length ?? 0) > 0 ||
      // `excluded` is always qualified, so it is not an unqualified hazard —
      // but an ON CONFLICT DO UPDATE is a second write path, which the
      // constant map handles rather than this flag.
      false;
    return { kind, relation, returningList, stmt: s, hasOtherRelations };
  }
  return null;
}

/** A literal, through any chain of casts. Casts are kept in the substituted
 *  tree — the value written is the coerced one, and the evaluator resolves
 *  the coercion the same way PostgreSQL did. */
function constantOf(expr: Node | undefined): Node | null {
  if (!expr) return null;
  const rec = expr as Fields;
  if ("A_Const" in rec) return expr;
  if ("TypeCast" in rec) {
    const inner = (rec["TypeCast"] as { arg?: Node }).arg;
    return inner && constantOf(inner) ? expr : null;
  }
  return null;
}

/** Structural equality ignoring parser positions. Two VALUES rows writing the
 *  same literal must agree as VALUES, not as source text. */
function sameConstant(a: Node, b: Node): boolean {
  const strip = (n: unknown): unknown => {
    if (Array.isArray(n)) return n.map(strip);
    if (!n || typeof n !== "object") return n;
    const out: Fields = {};
    for (const [k, v] of Object.entries(n as Fields)) {
      if (k === "location") continue;
      out[k] = strip(v);
    }
    return out;
  };
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

/** Intersect two path maps: a column survives with the constant both wrote. */
function agree(a: Map<string, Node>, b: Map<string, Node>): Map<string, Node> {
  const out = new Map<string, Node>();
  for (const [col, node] of a) {
    const other = b.get(col);
    if (other && sameConstant(node, other)) out.set(col, node);
  }
  return out;
}

/** What ONE write path writes as a constant, over its (column, value) pairs. */
function pathConstants(
  pairs: readonly (readonly [string | undefined, Node | undefined])[],
): Map<string, Node> {
  const out = new Map<string, Node>();
  for (const [column, val] of pairs) {
    if (!column || !val) continue;
    const c = constantOf(val);
    if (!c) {
      // Written, but not as a constant: the column must not survive as one
      // some OTHER pair in this path did set.
      out.delete(column);
      continue;
    }
    const prior = out.get(column);
    if (prior && !sameConstant(prior, c)) out.delete(column);
    else out.set(column, c);
  }
  return out;
}

function setPairs(targetList: Node[] | undefined): (readonly [string | undefined, Node | undefined])[] {
  return (targetList ?? []).map(item => {
    const rt = (item as { ResTarget?: { name?: string; val?: Node } }).ResTarget;
    // A multi-assignment routes a shared source into one column; nothing
    // there is a bare constant this pass can read.
    const val =
      rt?.val && "MultiAssignRef" in (rt.val as Fields) ? undefined : rt?.val;
    return [rt?.name, val] as const;
  });
}

/**
 * Target columns written as the SAME constant on every path that can return
 * a row, or an empty map.
 */
function writtenConstants(
  shape: DmlShape,
  catalog: NullabilityCatalog,
  targetColumns: readonly string[],
): Map<string, Node> {
  const empty = new Map<string, Node>();

  if (shape.kind === "insert") {
    const select = (shape.stmt["selectStmt"] as { SelectStmt?: Fields } | undefined)?.SelectStmt;
    const valuesLists = select?.["valuesLists"] as Node[] | undefined;
    // Only the VALUES spelling carries constants; an INSERT … SELECT's values
    // are the select's business and its rows can differ.
    if (!valuesLists?.length) return empty;
    const cols = (shape.stmt["cols"] as Node[] | undefined)
      ? (shape.stmt["cols"] as Node[]).map(
          c => (c as { ResTarget?: { name?: string } }).ResTarget?.name,
        )
      : [...targetColumns];
    let acc: Map<string, Node> | null = null;
    for (const row of valuesLists) {
      const items = (row as { List?: { items?: Node[] } }).List?.items ?? [];
      const here = pathConstants(items.map((val, i) => [cols[i], val] as const));
      acc = acc === null ? here : agree(acc, here);
    }
    const insertPath = acc ?? empty;
    const conflict = shape.stmt["onConflictClause"] as
      | { action?: string; targetList?: Node[] }
      | undefined;
    // DO NOTHING returns no row for a conflicting tuple, so the insert path
    // stands alone; DO UPDATE is a second way to produce one.
    if (conflict?.action === "ONCONFLICT_UPDATE") {
      return agree(insertPath, pathConstants(setPairs(conflict.targetList)));
    }
    return insertPath;
  }

  if (shape.kind === "update") {
    return pathConstants(setPairs(shape.stmt["targetList"] as Node[] | undefined));
  }

  let acc: Map<string, Node> | null = null;
  for (const clause of (shape.stmt["mergeWhenClauses"] as Node[] | undefined) ?? []) {
    const mwc = (
      clause as {
        MergeWhenClause?: { commandType?: string; targetList?: Node[]; values?: Node[] };
      }
    ).MergeWhenClause;
    if (!mwc) continue;
    // DO NOTHING emits no row. DELETE emits the row as it was BEFORE the
    // statement, so nothing this statement wrote describes it — an empty
    // path, which collapses the agreement.
    if (mwc.commandType === "CMD_NOTHING") continue;
    if (mwc.commandType === "CMD_DELETE") return empty;
    const here = mwc.values
      ? pathConstants(
          mwc.values.map((val, i) => {
            const name = (mwc.targetList?.[i] as { ResTarget?: { name?: string } } | undefined)
              ?.ResTarget?.name;
            return [name, val] as const;
          }),
        )
      : pathConstants(setPairs(mwc.targetList));
    acc = acc === null ? here : agree(acc, here);
  }
  void catalog;
  return acc ?? empty;
}

/** Every searched-CASE guard anywhere in the RETURNING list. The simple form
 *  (`CASE x WHEN v`) compares values rather than evaluating predicates, so it
 *  has no guard node to answer. */
function guardsIn(returningList: readonly Node[]): Node[] {
  const out: Node[] = [];
  const visit = (n: unknown): void => {
    if (Array.isArray(n)) {
      for (const x of n) visit(x);
      return;
    }
    if (!n || typeof n !== "object") return;
    const ce = (n as Fields)["CaseExpr"] as
      | { arg?: Node; args?: Node[] }
      | undefined;
    if (ce && !ce.arg) {
      for (const arg of ce.args ?? []) {
        const expr = ((arg as Fields)["CaseWhen"] as { expr?: Node } | undefined)?.expr;
        if (expr) out.push(expr);
      }
    }
    for (const v of Object.values(n as Fields)) visit(v);
  };
  visit(returningList as Node[]);
  return out;
}

/**
 * `expr` with every reference to a written-constant target column replaced by
 * its constant, or null when nothing was replaced.
 *
 * References left standing are not an error here — the evaluator's own
 * closure gate refuses any tree still carrying a name, which is a better
 * judge of openness than a second implementation of it would be.
 */
function substitute(
  expr: Node,
  constants: ReadonlyMap<string, Node>,
  targetNames: ReadonlySet<string>,
  allowUnqualified: boolean,
): Node | null {
  let replaced = false;
  const walk = (n: unknown): unknown => {
    if (Array.isArray(n)) return n.map(walk);
    if (!n || typeof n !== "object") return n;
    const cr = (n as Fields)["ColumnRef"] as { fields?: Node[] } | undefined;
    if (cr) {
      const parts = (cr.fields ?? []).map(
        f => ((f as Fields)["String"] as { sval?: string } | undefined)?.sval,
      );
      if (parts.some(p => p === undefined)) return n;
      const column = parts[parts.length - 1]!;
      const qualifier = parts.length >= 2 ? parts[parts.length - 2]! : null;
      const addressed =
        qualifier === null ? allowUnqualified : targetNames.has(qualifier);
      const c = addressed ? constants.get(column) : undefined;
      if (!c) return n;
      replaced = true;
      return structuredClone(c);
    }
    const out: Fields = {};
    for (const [k, v] of Object.entries(n as Fields)) out[k] = walk(v);
    return out;
  };
  const result = walk(expr) as Node;
  return replaced ? result : null;
}

/**
 * The truth of each RETURNING CASE guard the written constants close, keyed
 * by the ORIGINAL guard node so the answers merge into the statement
 * evaluation map.
 */
export async function writtenGuardTruths(
  stmt: Node,
  catalog: NullabilityCatalog & SubtreeEvaluationCatalog,
  evaluate: Evaluate | undefined,
): Promise<Map<Node, EvalResult>> {
  const out = new Map<Node, EvalResult>();
  if (!evaluate) return out;
  const shape = shapeOf(stmt);
  if (!shape) return out;

  const table = catalog.resolveTable(shape.relation.schemaname, shape.relation.relname ?? "");
  if (!table) return out;

  // The walk's own trigger rule, one pass earlier: a BEFORE ROW or INSTEAD OF
  // hook may replace NEW after the values were chosen, so the written map
  // describes a row that may never be stored.
  const rewrites =
    shape.relation.inh === true
      ? catalog.resolveWriteRewritesTree(table.schema, table.name)
      : catalog.resolveWriteRewrites(table.schema, table.name);
  const commands =
    shape.kind === "insert"
      ? ["insert", "update"]
      : shape.kind === "update"
        ? ["update"]
        : ["insert", "update", "delete"];
  for (const cmd of commands) {
    if (rewrites.beforeRow.has(cmd) || rewrites.insteadOf.has(cmd)) return out;
  }

  const constants = writtenConstants(shape, catalog, table.columns);
  if (constants.size === 0) return out;

  const targetNames = new Set<string>([table.name]);
  const alias = shape.relation.alias?.aliasname;
  // An alias REPLACES the relation name as a reference: `UPDATE t AS x` makes
  // `t.col` invalid, so the set is one or the other, never both.
  if (alias) {
    targetNames.clear();
    targetNames.add(alias);
  }

  const questions: { original: Node; tree: Node }[] = [];
  for (const guard of guardsIn(shape.returningList)) {
    const tree = substitute(guard, constants, targetNames, !shape.hasOtherRelations);
    if (!tree) continue;
    // A guard that IS the written constant — `CASE WHEN active` over a
    // written `true` — reduces to a bare A_Const, and the evaluator collects
    // nothing from one: a literal is closed but there is nothing to compute,
    // so it is not a collectable ROOT. Reading the parser's own decoded
    // payload is not evaluating an expression, and it is the shape the
    // original bucket was made of.
    const bare = (tree as Fields)["A_Const"] as
      | { boolval?: { boolval?: boolean }; isnull?: boolean }
      | undefined;
    if (bare) {
      if (bare.isnull) out.set(guard, { isNull: true, value: null, type: "boolean" });
      else if (bare.boolval)
        out.set(guard, {
          isNull: false,
          // `{ boolval: {} }` is how the parser spells FALSE — the key is
          // present and its payload omitted, exactly as `ival: {}` is 0.
          value: bare.boolval.boolval === true,
          type: "boolean",
        });
      continue;
    }
    questions.push({ original: guard, tree });
  }
  if (questions.length === 0) return out;

  const root = { List: { items: questions.map(q => q.tree) } } as unknown as Node;
  const answers = await evaluateClosedSubtrees(root, catalog, evaluate);
  for (const q of questions) {
    const a = answers.get(q.tree);
    if (a !== undefined) out.set(q.original, a);
  }
  return out;
}
