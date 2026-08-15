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
// name, it only detects one. The gates are TYPED (docs/subtree-evaluation.md,
// "Typed operand tracking"): every closed node carries a TYPE SET — the
// survivor return-type union of whatever produced it — threaded bottom-up
// the way the walk's operandTypeSet does, but scope-free, because the
// closed grammar holds no columns and no parameters. A bare literal is
// `unknown`, first-class; the landing rules pinned in
// param-mechanism.test.ts decide which INPUT function a landing runs, and
// the catalog face refuses any landing outside the immutable-I/O set. Each
// operator and call site resolves through the per-signature volatility
// captures: elimination may over-keep candidates but never over-drops, and
// the fold verdict is consensus over every survivor, so whichever row
// PostgreSQL actually picks is covered by it. Two gates stay syntactic:
// a CAST's argument must be a literal (a computed argument can carry a
// stable OUTPUT function through an I/O coercion — `to_timestamp(0)::text`
// moves with TimeZone while both halves look clean), and set-returning,
// aggregate, window, VARIADIC-spread and OPERATOR()-qualified-to-a-user-
// schema shapes are open.
//
// Closed and COLLECTABLE differ: a closed node composes into its parent
// inside PostgreSQL (`make_date(…)` under `date_part` crosses no I/O), but
// collecting it as a root hands its RENDERING to the consumer, and
// `date_out` reads DateStyle — so a root's result types must additionally
// be immutable-I/O renderings, a row constructor by its fields.
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

// --- The closure gate: typed operand tracking --------------------------------

/** The type-set member for a bare literal (a string literal or NULL): the
 *  pseudo-type PostgreSQL itself assigns before a consumption site lands
 *  it. Always a singleton set — landings resolve it before it can join a
 *  union. */
const UNKNOWN_TYPE = "unknown";

type TypeSet = string[];

const isUnknownSet = (s: TypeSet): boolean => s.length === 1 && s[0] === UNKNOWN_TYPE;

/** A_Expr kinds that resolve through the operator name the AST carries
 *  (`~~` for LIKE, `=` for IN/NULLIF/DISTINCT). SIMILAR resolves through a
 *  helper function and stays open. */
const OPERATOR_AEXPR_KINDS = new Set([
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

/** BETWEEN carries the literal word "BETWEEN" instead of an operator name
 *  and desugars to its bound comparisons — `b >= lo AND b <= hi`, the
 *  SYMMETRIC forms both orders — so the gate asks `>=` and `<=` directly. */
const BETWEEN_AEXPR_KINDS: Record<string, "plain" | "sym"> = {
  AEXPR_BETWEEN: "plain",
  AEXPR_NOT_BETWEEN: "plain",
  AEXPR_BETWEEN_SYM: "sym",
  AEXPR_NOT_BETWEEN_SYM: "sym",
};

/** IN-list rexpr arrives as a List node; ANY/ALL rexpr as a plain node. */
function rexprMembers(rexpr: unknown): unknown[] {
  if (nodeTag(rexpr) === "List") {
    const items = (fieldsOf(rexpr, "List") as { items?: unknown[] }).items;
    return Array.isArray(items) ? items : [];
  }
  return rexpr === undefined ? [] : [rexpr];
}

/** The node's type set, or null where it is OPEN — an unmet kind, a name,
 *  a user-shadowed spelling, a failed survivor consensus. Null is always
 *  sound: the node just never folds. */
function typeSetOf(
  n: unknown,
  catalog: SubtreeEvaluationCatalog,
  memo: WeakMap<object, TypeSet | null>,
): TypeSet | null {
  const tag = nodeTag(n);
  if (!tag) return null;
  const cached = memo.get(n as object);
  if (cached !== undefined) return cached;
  const set = typeSetVerdict(tag, fieldsOf(n, tag), catalog, memo);
  memo.set(n as object, set);
  return set;
}

function typeSetVerdict(
  tag: string,
  f: Fields,
  catalog: SubtreeEvaluationCatalog,
  memo: WeakMap<object, TypeSet | null>,
): TypeSet | null {
  const setOf = (x: unknown) => typeSetOf(x, catalog, memo);
  /** All members' sets, or null when any member is open. */
  const setsOf = (xs: unknown[]): TypeSet[] | null => {
    const out: TypeSet[] = [];
    for (const x of xs) {
      const s = setOf(x);
      if (s === null) return null;
      out.push(s);
    }
    return out;
  };

  switch (tag) {
    case "A_Const": {
      // The walk's literal table, scope-free: ival is always integer,
      // boolval boolean, fval numeric-ish digit text whose value tells
      // bigint from numeric, a bit string is bit — and a string literal
      // or NULL is `unknown`, exactly as PostgreSQL holds it.
      if (f.isnull === true) return [UNKNOWN_TYPE];
      if ("ival" in f) return ["integer"];
      if ("boolval" in f) return ["boolean"];
      if ("fval" in f) {
        const digits = (f.fval as { fval?: string })?.fval ?? "";
        return /^[0-9]+$/.test(digits) &&
          (digits.length < 19 || (digits.length === 19 && digits <= "9223372036854775807"))
          ? ["bigint"]
          : ["numeric"];
      }
      if ("sval" in f) return [UNKNOWN_TYPE];
      if ("bsval" in f) return ["bit"];
      return null;
    }

    case "TypeCast": {
      // Literal casts only: a computed argument's type is invisible here,
      // and its OUTPUT function crossing an I/O coercion is the measured
      // hole the restriction closes. The target must be an unqualified (or
      // pg_catalog-qualified) immutable-I/O base type; arrayBounds makes
      // the real target the ARRAY type, whose input function is stable.
      if (nodeTag(f.arg) !== "A_Const") return null;
      const t = (f.typeName ?? {}) as {
        names?: unknown;
        arrayBounds?: unknown[];
        pct_type?: boolean;
        setof?: boolean;
      };
      if (t.pct_type === true || t.setof === true) return null;
      if (!qualifierIsBuiltin(t.names)) return null;
      const name = lastName(t.names);
      if (name === null) return null;
      if (Array.isArray(t.arrayBounds) && t.arrayBounds.length > 0) {
        // First-wave widening: an array-typed literal cast closes when the
        // ELEMENT type is a builtin with immutable I/O — array_in's blanket
        // stable flag means "elements could be datetime", a question the
        // element gate answers better than the flag does
        // (docs/subtree-evaluation.md, first-wave scope). User-typed
        // elements stay out with array_in's reason intact.
        if (!catalog.isImmutableIoType(name)) return null;
        const el = catalog.closedCastTargetType(name);
        return el === null ? null : [`${el}[]`];
      }
      const rendered = catalog.closedCastTargetType(name);
      return rendered === null ? null : [rendered];
    }

    case "A_Expr": {
      const kind = String(f.kind ?? "AEXPR_OP");

      const between = BETWEEN_AEXPR_KINDS[kind];
      if (between !== undefined) {
        const bounds = rexprMembers(f.rexpr);
        if (f.lexpr === undefined || bounds.length !== 2) return null;
        const b = setOf(f.lexpr);
        const lo = setOf(bounds[0]);
        const hi = setOf(bounds[1]);
        if (b === null || lo === null || hi === null) return null;
        const comparisons: [string, TypeSet][] =
          between === "sym"
            ? [[">=", lo], ["<=", hi], [">=", hi], ["<=", lo]]
            : [[">=", lo], ["<=", hi]];
        for (const [op, s] of comparisons) {
          if (catalog.closedOperatorTypes(op, b, s) === null) return null;
        }
        return ["boolean"];
      }

      if (!OPERATOR_AEXPR_KINDS.has(kind)) return null;
      if (!qualifierIsBuiltin(f.name)) return null;
      const op = lastName(f.name);
      if (op === null) return null;
      const right = rexprMembers(f.rexpr);
      const rightSets = setsOf(right);
      if (rightSets === null) return null;
      const leftSet = f.lexpr === undefined ? undefined : setOf(f.lexpr);
      if (leftSet === null) return null;

      if (kind === "AEXPR_OP_ANY" || kind === "AEXPR_OP_ALL") {
        if (leftSet === undefined || rightSets.length !== 1) return null;
        const arraySet = rightSets[0]!;
        // An unknown array side lands on `<known>[]` through array_in —
        // no array type has immutable I/O, so the landing always refuses.
        if (isUnknownSet(arraySet)) return null;
        if (!arraySet.every(t => t.endsWith("[]"))) return null;
        const elements = arraySet.map(t => t.slice(0, -2));
        return catalog.closedOperatorTypes(op, leftSet, elements) === null
          ? null
          : ["boolean"];
      }
      if (kind === "AEXPR_IN") {
        // PostgreSQL rewrites the list to `= ANY(ARRAY[...])` over the
        // members' common type; per-pair consensus covers whichever row
        // that resolution picks, because each member's routes are checked
        // in its own pair.
        if (leftSet === undefined || rightSets.length === 0) return null;
        for (const memberSet of rightSets) {
          if (catalog.closedOperatorTypes(op, leftSet, memberSet) === null) return null;
        }
        return ["boolean"];
      }
      if (kind === "AEXPR_NULLIF") {
        if (leftSet === undefined || rightSets.length !== 1) return null;
        if (catalog.closedOperatorTypes(op, leftSet, rightSets[0]!) === null) return null;
        // NULLIF returns its operands' common type, not the comparison's.
        return catalog.closedCommonTypes([leftSet, rightSets[0]!]);
      }
      if (kind === "AEXPR_DISTINCT" || kind === "AEXPR_NOT_DISTINCT") {
        if (leftSet === undefined || rightSets.length !== 1) return null;
        return catalog.closedOperatorTypes(op, leftSet, rightSets[0]!) === null
          ? null
          : ["boolean"];
      }
      // AEXPR_OP / LIKE / ILIKE — the survivors' union is the node's set.
      if (rightSets.length !== 1) return null;
      return catalog.closedOperatorTypes(
        op,
        leftSet === undefined ? null : leftSet,
        rightSets[0]!,
      );
    }

    case "BoolExpr":
      // Operands land on boolean (boolin is immutable-I/O); a non-boolean
      // member makes PREPARE raise, which contributes nothing.
      return Array.isArray(f.args) && setsOf(f.args) !== null ? ["boolean"] : null;

    case "NullTest":
    case "BooleanTest":
      return setOf(f.arg) === null ? null : ["boolean"];

    case "CaseExpr": {
      const whens = Array.isArray(f.args) ? f.args : [];
      const argSet = f.arg === undefined ? undefined : setOf(f.arg);
      if (argSet === null) return null;
      const resultSets: TypeSet[] = [];
      for (const w of whens) {
        if (nodeTag(w) !== "CaseWhen") return null;
        const wf = fieldsOf(w, "CaseWhen");
        const condSet = setOf(wf.expr);
        if (condSet === null) return null;
        // Simple CASE compares arg against each WHEN through `=`.
        if (argSet !== undefined && catalog.closedOperatorTypes("=", argSet, condSet) === null) {
          return null;
        }
        const resultSet = setOf(wf.result);
        if (resultSet === null) return null;
        resultSets.push(resultSet);
      }
      if (f.defresult !== undefined) {
        const d = setOf(f.defresult);
        if (d === null) return null;
        resultSets.push(d);
      }
      return catalog.closedCommonTypes(resultSets);
    }

    case "CoalesceExpr":
    case "MinMaxExpr": {
      if (!Array.isArray(f.args) || f.args.length === 0) return null;
      const sets = setsOf(f.args);
      return sets === null ? null : catalog.closedCommonTypes(sets);
    }

    case "RowExpr":
      // Fields are independently typed — no unification list here.
      return !Array.isArray(f.args) || setsOf(f.args) !== null ? ["record"] : null;

    case "A_ArrayExpr": {
      const elements = Array.isArray(f.elements) ? f.elements : [];
      const sets = setsOf(elements);
      if (sets === null) return null;
      const union = catalog.closedCommonTypes(sets);
      return union === null ? null : union.map(t => `${t}[]`);
    }

    case "FuncCall": {
      // Aggregates and window calls need rows; VARIADIC spread changes the
      // arity story the capture keyed on. (A plainly-spelled aggregate —
      // `max(1)` — carries none of these markers and is refused by the
      // survivor verdict instead, on its rows' prokind.)
      if (
        f.over !== undefined ||
        f.agg_star === true ||
        f.agg_distinct === true ||
        f.agg_within_group === true ||
        f.agg_filter !== undefined ||
        f.func_variadic === true ||
        (Array.isArray(f.agg_order) && f.agg_order.length > 0)
      ) {
        return null;
      }
      if (!qualifierIsBuiltin(f.funcname)) return null;
      const name = lastName(f.funcname);
      if (name === null) return null;
      const args = Array.isArray(f.args) ? f.args : [];
      const sets = setsOf(args);
      if (sets === null) return null;
      return catalog.closedFunctionTypes(name, sets);
    }

    default:
      // Open by default: ColumnRef, ParamRef, SubLink, SQLValueFunction,
      // CollateClause, every node kind this gate has never met.
      return null;
  }
}

/**
 * May this CLOSED node be collected as a root? Its value crosses the
 * driver's wire through typoutput, so every result type must be an
 * immutable-I/O rendering — a row constructor by its fields, since
 * `record` alone says nothing about what record_out will render. A node
 * failing here stays closed as a MEMBER: `make_date(…)` composes under
 * `date_part`, it just never answers alone.
 */
function isRootable(
  n: unknown,
  catalog: SubtreeEvaluationCatalog,
  typeMemo: WeakMap<object, TypeSet | null>,
  rootMemo: WeakMap<object, boolean>,
): boolean {
  const cached = rootMemo.get(n as object);
  if (cached !== undefined) return cached;
  const tag = nodeTag(n);
  let verdict: boolean;
  if (tag === "A_Const") {
    verdict = true; // never a root; rootable as a row constructor's field
  } else if (tag === "RowExpr") {
    const fields = (fieldsOf(n, tag) as { args?: unknown[] }).args;
    verdict = (Array.isArray(fields) ? fields : []).every(x =>
      isRootable(x, catalog, typeMemo, rootMemo),
    );
  } else {
    const set = typeSetOf(n, catalog, typeMemo);
    verdict = set !== null && set.every(t => catalog.isImmutableIoRendering(t));
  }
  rootMemo.set(n as object, verdict);
  return verdict;
}

// --- Collection -------------------------------------------------------------

/**
 * The maximal closed subtrees under `root`, in document order: topmost
 * closed COLLECTABLE nodes, disjoint by construction — collection never
 * descends into a collected subtree, and descends THROUGH every open or
 * unrootable node. `typeName` fields are skipped whole: a cast target's
 * typmods hold A_Consts that are type syntax, not values. A BARE literal
 * is never a root — it stays closed as a member of larger trees, but alone
 * its answer restates what the AST already says syntactically, and an open
 * parent would otherwise shed every literal operand into the batch as
 * noise.
 */
export function collectClosedSubtrees(
  root: Node,
  catalog: SubtreeEvaluationCatalog,
): Node[] {
  const typeMemo = new WeakMap<object, TypeSet | null>();
  const rootMemo = new WeakMap<object, boolean>();
  const out: Node[] = [];
  const visit = (n: unknown): void => {
    if (Array.isArray(n)) {
      for (const x of n) visit(x);
      return;
    }
    if (!n || typeof n !== "object") return;
    const tag = nodeTag(n);
    if (
      tag &&
      tag !== "A_Const" &&
      typeSetOf(n, catalog, typeMemo) !== null &&
      isRootable(n, catalog, typeMemo, rootMemo)
    ) {
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
