// ---------------------------------------------------------------------------
// Subtree evaluator (docs/subtree-evaluation.md).
//
// Finds the MAXIMAL CLOSED subtrees of a statement's AST — topmost nodes an
// allowlist proves free of names and of session-state dependence — batches
// them into ONE SELECT, runs it through a caller-supplied `evaluate`
// callback, and returns the answers as data, keyed by node identity. The
// engine never computes a PostgreSQL expression itself: closed trees are
// answered BY PostgreSQL, so there is nothing to reimplement and nothing to
// drift.
//
// Closure is OPEN-BY-DEFAULT: any node kind the allowlist has not met is
// open, which is what makes the evaluator scope-blind — it never resolves a
// name, it only detects one. The gates on the allowlisted kinds all reduce
// to one question, "can any session state change this subtree's value?",
// and they answer it from three catalog captures (immutable-I/O types,
// immutable function arities, immutable operators — see
// `CatalogSnapshot.builtinImmutableIoTypes` and siblings for the measured
// reachability argument) plus three syntactic guards measured 2026-08-11:
//
// - a CAST's argument must be a literal: a computed argument can carry a
//   type whose OUTPUT function is stable through an I/O coercion
//   (`to_timestamp(0)::text` moves with TimeZone while both `to_timestamp`
//   and `text` look clean);
// - a bare unknown literal must not sit beside an array/row constructor in
//   any position PostgreSQL type-unifies (`ARRAY[1,2] = '{1,3}'` coerces
//   the literal through array_in, which is STABLE), nor be the sole
//   operand of a unary operator, nor be the array side of ANY/ALL;
// - set-returning, aggregate, window, VARIADIC-spread and OPERATOR()-
//   qualified-to-a-user-schema shapes are all open.
//
// An evaluator error makes the erring subtree contribute nothing: the
// batch's PREPARE already fixed every subtree's result type, so when the
// one value fetch raises (`5 / 0` is a closed subtree), each subtree
// retries in its own SELECT and only the raising ones drop out. Missing
// answers are always sound — a consumer that finds no map entry keeps
// today's symbolic reading.
// ---------------------------------------------------------------------------

import type { Node } from "libpg-query";
import { deparseSync } from "pgsql-deparser";
import type { SubtreeEvaluationCatalog } from "./types.js";

export type { SubtreeEvaluationCatalog } from "./types.js";

/** One closed subtree's answer. `type` is the regtype rendering PostgreSQL
 *  resolved for it (`pg_prepared_statements.result_types`). */
export interface EvalResult {
  isNull: boolean;
  value: unknown;
  type: string;
}

/** The single row of a single SELECT, as the driver returns it — or
 *  undefined where the statement returns no row (PREPARE, DEALLOCATE). */
export type EvaluateRow = Record<string, unknown>;

/**
 * The narrowest callback that works: run one SQL statement, return its
 * first row. `async sql => (await pg.query(sql)).rows[0]` for PGlite; the
 * same one-liner for node-postgres. This module imports no database type.
 */
export type Evaluate = (sql: string) => Promise<EvaluateRow | undefined>;

// --- Raw-AST field access (single-tag node objects) -------------------------

type Fields = Record<string, unknown>;

/** The tag of a libpg-query node object, or null for anything else. A Node
 *  is exactly an object with one key starting uppercase; inlined structs
 *  (TypeName's body, for one) have many lowercase keys and never match. */
function nodeTag(n: unknown): string | null {
  if (!n || typeof n !== "object" || Array.isArray(n)) return null;
  const keys = Object.keys(n);
  return keys.length === 1 && /^[A-Z]/.test(keys[0]!) ? keys[0]! : null;
}

function fieldsOf(n: unknown, tag: string): Fields {
  return ((n as Record<string, unknown>)[tag] ?? {}) as Fields;
}

/** Last `String` element of a qualified-name list (`[pg_catalog, int4]`). */
function lastName(names: unknown): string | null {
  if (!Array.isArray(names) || names.length === 0) return null;
  const last = names[names.length - 1] as { String?: { sval?: string } };
  return last?.String?.sval ?? null;
}

/** A multi-part name is closed only when the qualifier IS pg_catalog — the
 *  captures describe pg_catalog, and a user-schema qualifier names a user
 *  object the captures know nothing about. */
function qualifierIsBuiltin(names: unknown): boolean {
  if (!Array.isArray(names)) return false;
  if (names.length <= 1) return true;
  const first = names[0] as { String?: { sval?: string } };
  return names.length === 2 && first?.String?.sval === "pg_catalog";
}

/** A bare unknown-typed string literal — the one literal kind whose type is
 *  decided by its CONTEXT, which is where the stable-input-function cracks
 *  live. A cast literal has tag TypeCast and never matches. */
function isBareUnknownLiteral(n: unknown): boolean {
  const tag = nodeTag(n);
  if (tag !== "A_Const") return false;
  const f = fieldsOf(n, tag);
  return f.sval !== undefined && f.isnull !== true;
}

/** Does the subtree contain an array/row constructor anywhere? Their types
 *  (arrays, record) are outside the immutable-I/O set, so a bare unknown
 *  literal unified against one coerces through a STABLE input function. */
function containsConstructor(n: unknown): boolean {
  if (Array.isArray(n)) return n.some(containsConstructor);
  if (!n || typeof n !== "object") return false;
  const tag = nodeTag(n);
  if (tag === "A_ArrayExpr" || tag === "RowExpr") return true;
  return Object.values(n as Fields).some(containsConstructor);
}

/** The unification guard, applied to every member list PostgreSQL resolves
 *  to a common type (operands, simple-CASE comparisons, CASE results,
 *  COALESCE/GREATEST/LEAST arguments, array elements, call arguments):
 *  refuse when a bare unknown literal sits beside a constructor-carrying
 *  member. Measured: `SELECT ARRAY[1,2] = '{1,3}'` answers — through
 *  array_in, provolatile 's'. */
function unifiableMembersClosed(members: unknown[]): boolean {
  const present = members.filter(m => m !== undefined && m !== null);
  const hasBareUnknown = present.some(isBareUnknownLiteral);
  if (!hasBareUnknown) return true;
  return !present.some(m => !isBareUnknownLiteral(m) && containsConstructor(m));
}

// --- The closure gate -------------------------------------------------------

/** A_Expr kinds the gate understands; each resolves through the operator
 *  name the AST carries (`~~` for LIKE, `=` for IN/NULLIF/DISTINCT).
 *  BETWEEN kinds carry the literal word "BETWEEN" instead of an operator
 *  and SIMILAR resolves through a helper function, so both stay open. */
const CLOSED_AEXPR_KINDS = new Set([
  "AEXPR_OP",
  "AEXPR_OP_ANY",
  "AEXPR_OP_ALL",
  "AEXPR_DISTINCT",
  "AEXPR_NOT_DISTINCT",
  "AEXPR_NULLIF",
  "AEXPR_IN",
  "AEXPR_LIKE",
  "AEXPR_ILIKE",
]);

/** IN-list rexpr arrives as a List node; ANY/ALL rexpr as a plain node. */
function rexprMembers(rexpr: unknown): unknown[] {
  if (nodeTag(rexpr) === "List") {
    const items = (fieldsOf(rexpr, "List") as { items?: unknown[] }).items;
    return Array.isArray(items) ? items : [];
  }
  return rexpr === undefined ? [] : [rexpr];
}

function isClosed(
  n: unknown,
  catalog: SubtreeEvaluationCatalog,
  memo: WeakMap<object, boolean>,
): boolean {
  const tag = nodeTag(n);
  if (!tag) return false;
  const cached = memo.get(n as object);
  if (cached !== undefined) return cached;
  const verdict = closedVerdict(tag, fieldsOf(n, tag), catalog, memo);
  memo.set(n as object, verdict);
  return verdict;
}

function closedVerdict(
  tag: string,
  f: Fields,
  catalog: SubtreeEvaluationCatalog,
  memo: WeakMap<object, boolean>,
): boolean {
  const closed = (x: unknown) => isClosed(x, catalog, memo);
  const allClosed = (xs: unknown) => Array.isArray(xs) && xs.every(closed);

  switch (tag) {
    case "A_Const":
      return true;

    case "TypeCast": {
      // Literal casts only: a computed argument's type is invisible here,
      // and its OUTPUT function crossing an I/O coercion is the measured
      // hole the restriction closes. The target must be an unqualified (or
      // pg_catalog-qualified) immutable-I/O base type; arrayBounds makes
      // the real target the ARRAY type, whose input function is stable.
      if (nodeTag(f.arg) !== "A_Const") return false;
      const t = (f.typeName ?? {}) as {
        names?: unknown;
        arrayBounds?: unknown[];
        pct_type?: boolean;
        setof?: boolean;
      };
      if (t.pct_type === true || t.setof === true) return false;
      if (Array.isArray(t.arrayBounds) && t.arrayBounds.length > 0) return false;
      if (!qualifierIsBuiltin(t.names)) return false;
      const name = lastName(t.names);
      return name !== null && catalog.isImmutableIoType(name);
    }

    case "A_Expr": {
      if (!CLOSED_AEXPR_KINDS.has(String(f.kind))) return false;
      if (!qualifierIsBuiltin(f.name)) return false;
      const op = lastName(f.name);
      if (op === null || !catalog.isImmutableOperator(op)) return false;
      const right = rexprMembers(f.rexpr);
      if (f.lexpr === undefined) {
        // Unary: an unknown sole operand resolves by category preference
        // across the name's rows, which the captures do not model.
        if (right.length !== 1 || isBareUnknownLiteral(right[0])) return false;
      }
      if (
        (f.kind === "AEXPR_OP_ANY" || f.kind === "AEXPR_OP_ALL") &&
        isBareUnknownLiteral(f.rexpr)
      ) {
        // The ANY/ALL right side is an ARRAY position: an unknown literal
        // there always coerces through array_in (stable).
        return false;
      }
      const members = f.lexpr === undefined ? right : [f.lexpr, ...right];
      if (!unifiableMembersClosed(members)) return false;
      return (f.lexpr === undefined || closed(f.lexpr)) && right.every(closed);
    }

    case "BoolExpr":
      return allClosed(f.args);

    case "NullTest":
    case "BooleanTest":
      return closed(f.arg);

    case "CaseExpr": {
      const whens = Array.isArray(f.args) ? f.args : [];
      const parts: unknown[] = [];
      const results: unknown[] = [];
      for (const w of whens) {
        if (nodeTag(w) !== "CaseWhen") return false;
        const wf = fieldsOf(w, "CaseWhen");
        parts.push(wf.expr);
        results.push(wf.result);
      }
      if (f.arg !== undefined && !unifiableMembersClosed([f.arg, ...parts])) {
        return false; // simple CASE compares arg against each WHEN
      }
      if (!unifiableMembersClosed([...results, f.defresult])) return false;
      return (
        (f.arg === undefined || closed(f.arg)) &&
        parts.every(closed) &&
        results.every(closed) &&
        (f.defresult === undefined || closed(f.defresult))
      );
    }

    case "CoalesceExpr":
    case "MinMaxExpr": {
      const args = Array.isArray(f.args) ? f.args : [];
      return unifiableMembersClosed(args) && allClosed(f.args);
    }

    case "RowExpr":
      // Fields are independently typed — no unification list here.
      return Array.isArray(f.args) ? f.args.every(closed) : true;

    case "A_ArrayExpr": {
      const elements = Array.isArray(f.elements) ? f.elements : [];
      return unifiableMembersClosed(elements) && elements.every(closed);
    }

    case "FuncCall": {
      // Aggregates and window calls need rows; VARIADIC spread changes the
      // arity story the capture keyed on.
      if (
        f.over !== undefined ||
        f.agg_star === true ||
        f.agg_distinct === true ||
        f.agg_within_group === true ||
        f.agg_filter !== undefined ||
        f.func_variadic === true ||
        (Array.isArray(f.agg_order) && f.agg_order.length > 0)
      ) {
        return false;
      }
      if (!qualifierIsBuiltin(f.funcname)) return false;
      const name = lastName(f.funcname);
      const args = Array.isArray(f.args) ? f.args : [];
      if (name === null || !catalog.isImmutableFunction(name, args.length)) {
        return false;
      }
      // Polymorphic parameter pairs unify across arguments, so the same
      // constructor-beside-unknown guard applies.
      return unifiableMembersClosed(args) && args.every(closed);
    }

    default:
      // Open by default: ColumnRef, ParamRef, SubLink, SQLValueFunction,
      // CollateClause, every node kind this gate has never met.
      return false;
  }
}

// --- Collection -------------------------------------------------------------

/**
 * The maximal closed subtrees under `root`, in document order: topmost
 * closed nodes, disjoint by construction — collection never descends into
 * a collected subtree, and descends THROUGH every open node. `typeName`
 * fields are skipped whole: a cast target's typmods hold A_Consts that are
 * type syntax, not values. A BARE literal is never a root — it stays
 * closed as a member of larger trees, but alone its answer restates what
 * the AST already says syntactically, and an open parent would otherwise
 * shed every literal operand into the batch as noise.
 */
export function collectClosedSubtrees(
  root: Node,
  catalog: SubtreeEvaluationCatalog,
): Node[] {
  const memo = new WeakMap<object, boolean>();
  const out: Node[] = [];
  const visit = (n: unknown): void => {
    if (Array.isArray(n)) {
      for (const x of n) visit(x);
      return;
    }
    if (!n || typeof n !== "object") return;
    const tag = nodeTag(n);
    if (tag && tag !== "A_Const" && isClosed(n, catalog, memo)) {
      out.push(n as Node);
      return;
    }
    const fields = tag ? fieldsOf(n, tag) : (n as Fields);
    for (const [key, value] of Object.entries(fields)) {
      if (key === "typeName") continue;
      visit(value);
    }
  };
  visit(root);
  return out;
}

// --- Evaluation -------------------------------------------------------------

/** Render `SELECT (subtree) AS e0, … AS eN` through the deparser the query
 *  generator already trusts. */
function deparseSelect(subtrees: Node[]): string {
  return deparseSync({
    version: 0,
    stmts: [
      {
        stmt: {
          SelectStmt: {
            targetList: subtrees.map((val, i) => ({
              ResTarget: { name: `e${i}`, val, location: -1 },
            })),
            limitOption: "LIMIT_OPTION_DEFAULT",
            op: "SETOP_NONE",
          },
        },
        stmt_len: 0,
      },
    ],
  } as never);
}

let prepareCounter = 0;

/**
 * Evaluate every maximal closed subtree under `root` and return the answers
 * keyed by NODE IDENTITY over the caller's own AST. One PREPARE fixes the
 * batch's result types; one SELECT returns every value beside those types
 * (`pg_prepared_statements.result_types`, measured present, PG 18.3); a
 * raising batch falls back to one SELECT per subtree so only the raising
 * subtrees contribute nothing. An empty map — no closed subtrees, a failed
 * PREPARE — costs the caller nothing but today's symbolic answer.
 */
export async function evaluateClosedSubtrees(
  root: Node,
  catalog: SubtreeEvaluationCatalog,
  evaluate: Evaluate,
): Promise<Map<Node, EvalResult>> {
  const results = new Map<Node, EvalResult>();
  const subtrees = collectClosedSubtrees(root, catalog);
  if (subtrees.length === 0) return results;

  let sel: string;
  try {
    sel = deparseSelect(subtrees);
  } catch {
    return results;
  }
  const name = `pgsid_subtree_eval_${prepareCounter++}`;
  try {
    await evaluate(`PREPARE ${name} AS ${sel}`);
  } catch {
    return results;
  }
  try {
    let row: EvaluateRow | undefined;
    try {
      row = await evaluate(
        `SELECT (SELECT result_types::text[] FROM pg_prepared_statements` +
          ` WHERE name = '${name}') AS __types, __q.* FROM (${sel}) AS __q`,
      );
    } catch {
      row = undefined; // a subtree raised; types below, values one by one
    }
    if (row !== undefined) {
      const types = row.__types;
      if (!Array.isArray(types) || types.length !== subtrees.length) {
        return results;
      }
      subtrees.forEach((subtree, i) => {
        const value = row![`e${i}`] ?? null;
        results.set(subtree, { isNull: value === null, value, type: String(types[i]) });
      });
      return results;
    }

    const typesRow = await evaluate(
      `SELECT result_types::text[] AS t FROM pg_prepared_statements WHERE name = '${name}'`,
    ).catch(() => undefined);
    const types = typesRow?.t;
    if (!Array.isArray(types) || types.length !== subtrees.length) return results;
    for (let i = 0; i < subtrees.length; i++) {
      try {
        const single = await evaluate(deparseSelect([subtrees[i]!]));
        if (single === undefined) continue;
        const value = single.e0 ?? null;
        results.set(subtrees[i]!, { isNull: value === null, value, type: String(types[i]) });
      } catch {
        // This subtree raises (`5 / 0`); it contributes nothing.
      }
    }
    return results;
  } finally {
    await evaluate(`DEALLOCATE ${name}`).catch(() => undefined);
  }
}
