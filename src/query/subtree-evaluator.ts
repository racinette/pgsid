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

// --- Design B: the value-SHAPE gate over datetime literals -------------------
//
// docs/subtree-evaluation.md, "Settings-independent datetime literals": the
// datetime input functions read DateStyle/TimeZone, so their casts fail the
// immutable-I/O gate — but a spelling that fixes every FIELD'S ROLE parses
// identically under each of the finitely many DateStyle values, and that
// invariance is pinned EXHAUSTIVELY (param-mechanism, the order/style
// product), not assumed. Strict ISO: 4-digit year (two-digit-leading forms
// are order-dependent — measured), 1-2 digit month/day (the non-padded
// widening, 2026-08-16: a 4-digit leading year fixes every field's role,
// so '2020-1-2' and the mixed paddings are swept invariant too), 'T' or
// space separator, optional seconds/fraction, optional surrounding
// spaces; timestamptz REQUIRES an explicit numeric offset (the offset-less
// spelling reads TimeZone — measured). Everything else fails by shape:
// '1/2/2020' answers three ways across the sweep, and 'now', 'today',
// named zones, intervals (IntervalStyle) need no curated list to die.
// INPUT side only: `isImmutableIoRendering` is untouched, so a closed
// datetime never collects as a root — it composes as a member, where the
// claims live (anchors, groundings, guards).
const DATE_BODY = String.raw`\d{4}-\d{1,2}-\d{1,2}`;
const TIME_BODY = String.raw`[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?`;
const OFFSET_BODY = String.raw`[+-]\d{2}(?::\d{2})?`;
const DATETIME_SHAPES: Record<"date" | "timestamp" | "timestamptz", RegExp> = {
  date: new RegExp(`^ *${DATE_BODY} *$`),
  timestamp: new RegExp(`^ *${DATE_BODY}(?:${TIME_BODY})? *$`),
  timestamptz: new RegExp(`^ *${DATE_BODY}${TIME_BODY}${OFFSET_BODY} *$`),
};

/** Argument kinds `pgsql-deparser` renders with the parentheses a subscript
 *  needs — measured, not assumed (docs/deparser-limitations.md §4, and the
 *  table in the `A_Indirection` case below). */
const SUBSCRIPTABLE_ARG_TAGS = new Set(["TypeCast", "FuncCall", "SubLink"]);

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
      // The argument is either a LITERAL — whose input function the target
      // gate below governs — or COMPUTED, in which case its own type is what
      // decides. That distinction used to be syntactic (`A_Const` or refuse),
      // and the rule closed far more than the hole it was written for: the
      // hole is a stable OUTPUT function crossing an I/O coercion
      // (`to_timestamp(0)::text` moves with TimeZone), which is a statement
      // about TYPES, and the module decides every other closure question by
      // type already.
      //
      // So a computed argument closes when its whole type set lies inside the
      // BUILTIN immutable-I/O set — the same 48 the target gate uses. A cast
      // between two members runs one of: no function (binary coercible), the
      // source's typoutput plus the target's typinput (I/O conversion, and
      // the fallback an explicit cast takes with no pg_cast row), or a cast
      // function — and there is no non-immutable cast function between two
      // members (swept 2026-08-24, pinned in `computed-cast-closure-red`).
      // `date` and `timestamptz` are NOT in the set, which is exactly why the
      // pinned leak stays gated. An array rendering answers on its element,
      // because that is how PostgreSQL coerces one.
      //
      // The gate is the BUILTIN face, not the wire face: a domain over
      // integer and an enum both cross the wire session-independently, but a
      // cast OFF one runs whatever function the user attached, and the sweep
      // swept pg_catalog only.
      const argIsLiteral = nodeTag(f.arg) === "A_Const";
      if (!argIsLiteral) {
        const source = setOf(f.arg);
        if (source === null) return null;
        if (
          !source.every(
            s => s !== UNKNOWN_TYPE && catalog.isBuiltinImmutableIoRendering(s),
          )
        ) {
          return null;
        }
      }
      const t = (f.typeName ?? {}) as {
        names?: unknown;
        arrayBounds?: unknown[];
        typmods?: unknown[];
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
      if (rendered !== null) return [rendered];
      // Design B: the immutable-I/O gate refused the target, but a
      // date/timestamp/timestamptz cast over a STRING literal in a swept
      // shape carries no settings dependence (the regexes above; the
      // sweep is the pin). No typmod — the admitted spellings are exactly
      // the measured ones. A non-string literal, NULL included, keeps
      // today's refusal.
      //
      // LITERAL only, and it stays that way when the branch above widens:
      // this admission rests on the VALUE's shape, and a computed argument
      // has no shape to read at analysis time.
      if (!argIsLiteral) return null;
      const dt = catalog.closedDatetimeCastTarget(name);
      if (dt === null) return null;
      if (Array.isArray(t.typmods) && t.typmods.length > 0) return null;
      const sval = (fieldsOf(f.arg, "A_Const") as { sval?: { sval?: string } }).sval?.sval;
      if (typeof sval !== "string") return null;
      return DATETIME_SHAPES[dt.family].test(sval) ? [dt.rendered] : null;
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

    case "A_Indirection": {
      // Subscripting dispatches a TYPE'S OWN routine, not an I/O function:
      // `array_subscript_handler` and `jsonb_subscript_handler` are both
      // immutable (measured; `json` has no handler at all and is refused by
      // falling through). So the closure question is the ARGUMENT's, plus the
      // bounds', and the exclusion this replaces — "structural facts over
      // open trees are refused" — was right about `arr[i]` over a column and
      // silent about a subscript that is closed all the way down.
      //
      // A FIELD step is a String, and a composite's field type is not
      // derivable from the `record` rendering the type sets carry, so those
      // refuse. PostgreSQL's own rule decides the result: ANY slice in the
      // list makes it the ARRAY type, otherwise the ELEMENT type — arrays do
      // not nest, so `arr[1][2]` over a two-dimensional array is still one
      // element. jsonb subscripts yield jsonb and admit no slice (measured:
      // `('{"a":1}'::jsonb)['a':'b']` raises).
      //
      // THE ARGUMENT KIND IS GATED, and this one is a RENDERING constraint
      // rather than a closure one. Every collected subtree goes back out
      // through `deparseSelect`, and `pgsql-deparser` drops the parentheses a
      // subscripted expression needs for some argument kinds (measured
      // 2026-08-24, docs/deparser-limitations.md §4):
      //
      //     (array_remove(…))[1]  → (array_remove(…))[1]   accepted
      //     ('{…}'::jsonb)['a']   → ('{…}'::jsonb)['a']    accepted
      //     ((SELECT …))[1]       → ((SELECT …))[1]        accepted
      //     (ARRAY['a','b'])[1]   →  ARRAY['a', 'b'][1]    SYNTAX ERROR
      //     (CASE … END)[1]       →  CASE … END[1]         SYNTAX ERROR
      //     (COALESCE(…))[1]      →  COALESCE(…)[1]        SYNTAX ERROR
      //
      // It has to be gated HERE rather than tolerated: a batch whose render
      // is rejected returns NOTHING for the whole statement, so one
      // unrenderable subtree costs every other answer in the same query.
      if (!SUBSCRIPTABLE_ARG_TAGS.has(nodeTag(f.arg) ?? "")) return null;
      const base = setOf(f.arg);
      if (base === null || base.length === 0) return null;
      const steps = Array.isArray(f.indirection) ? f.indirection : [];
      if (steps.length === 0) return null;
      let anySlice = false;
      for (const step of steps) {
        if (nodeTag(step) !== "A_Indices") return null;
        const idx = fieldsOf(step, "A_Indices") as {
          is_slice?: boolean;
          lidx?: unknown;
          uidx?: unknown;
        };
        if (idx.is_slice === true) anySlice = true;
        for (const bound of [idx.lidx, idx.uidx]) {
          if (bound !== undefined && setOf(bound) === null) return null;
        }
      }
      const out: string[] = [];
      for (const t of base) {
        if (t.endsWith("[]")) out.push(anySlice ? t : t.slice(0, -2));
        else if (t === "jsonb" && !anySlice) out.push("jsonb");
        else return null;
      }
      return [...new Set(out)];
    }

    case "CollateClause": {
      // COLLATE names a CATALOG collation and changes no value — the datum
      // that crosses the wire is the argument's. What it changes is how
      // comparisons inside the subtree sort, and that is decided by the named
      // collation rather than by session state, so the probe and the
      // execution agree under the analysis-database ≡ execution-database
      // assumption this module already records. A collation the database does
      // not have makes the probe raise, which contributes nothing.
      return f.arg === undefined ? null : setOf(f.arg);
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

    case "SubLink": {
      // Closed sublinks (docs/subtree-evaluation.md, "Closed sublinks"): a
      // body referencing no tables, columns or parameters is a closed tree
      // wearing subquery syntax — it deparses as a scalar expression and
      // batches through the existing protocol unchanged. A multi-row EXPR
      // body raises ("more than one row"), which the raising-subtree
      // fallback absorbs — measured lazy, the raise fires at row two even
      // over a 10^10 series. Contextual bodies stay refused forever under
      // the no-query-context wall: an open member anywhere refuses here.
      const linkType = String(f.subLinkType ?? "");
      const body = closedSublinkBody(f.subselect, catalog, memo);
      if (body === null) return null;
      if (linkType === "EXPR_SUBLINK") {
        return body.targetSets.length === 1 ? body.targetSets[0]! : null;
      }
      if (linkType === "EXISTS_SUBLINK") return ["boolean"];
      if (linkType === "ANY_SUBLINK" || linkType === "ALL_SUBLINK") {
        // `x IN (...)` carries no operName and means `=`; a spelled
        // operator resolves through the same closed-operator gate as any
        // comparison, between the test expression and the body's column.
        if (f.testexpr === undefined || body.targetSets.length !== 1) return null;
        const testSet = setOf(f.testexpr);
        if (testSet === null) return null;
        let op = "=";
        if (f.operName !== undefined) {
          if (!qualifierIsBuiltin(f.operName)) return null;
          const named = lastName(f.operName);
          if (named === null) return null;
          op = named;
        }
        return catalog.closedOperatorTypes(op, testSet, body.targetSets[0]!) === null
          ? null
          : ["boolean"];
      }
      // ARRAY, MULTIEXPR, ROWCOMPARE, CTE sublinks — outside the first wave.
      return null;
    }

    default:
      // Open by default: ColumnRef, ParamRef, SQLValueFunction,
      // CollateClause, every node kind this gate has never met.
      return null;
  }
}

// --- Closed sublink bodies ---------------------------------------------------

interface SublinkBody {
  /** One TypeSet per body target column. */
  targetSets: TypeSet[];
  /** A top-level set-returning call sits in the target list — tier 2,
   *  admitted only behind the runtime cardinality pre-probe (EXISTS
   *  excepted: it early-exits at the first row, measured at 10^10). */
  hasSrf: boolean;
}

/**
 * The non-contextual sublink body: a bare projection — `SELECT <closed
 * exprs>` — a VALUES list, or a SET OPERATION over two such bodies, each
 * free to carry the row-changing clauses (docs/subtree-evaluation.md,
 * "Body-clause widening"). Any FROM refuses (a relation is context; a
 * function scan is trap 1's materializing shape, refused whatever the
 * name), and GROUPING and WITH are refused permanently with their reasons
 * in that document's "Closed for good" section. An unknown field present
 * on the body refuses conservatively rather than by list.
 *
 * A field listed here is admitted only where a gate below inspects it. The
 * two must move together: `sortClause` entered this list while the branch
 * that reads a VALUES body still returned above `closedSortClause`, and an
 * uninspected key is no gate at all — `VALUES (1),…,(8) ORDER BY random()
 * LIMIT 1` folded a different constant on each analysis (measured, fixed
 * 2026-08-17, guarded below). The clause gates now sit ABOVE the branch.
 */
const SUBLINK_BODY_FIELDS = new Set([
  "targetList", "op", "limitOption", "location", "limitCount", "limitOffset", "valuesLists",
  "whereClause", "sortClause", "distinctClause",
]);

/** The set-operation body's own fields: the operator, its ALL flag and the
 *  two arms. `targetList` is absent on a set-operation node — the arms
 *  carry the projections. */
const SUBLINK_SETOP_FIELDS = new Set([
  "op", "all", "larg", "rarg", "limitOption", "location", "sortClause",
]);

const SET_OPERATIONS = new Set(["SETOP_UNION", "SETOP_INTERSECT", "SETOP_EXCEPT"]);

function closedSublinkBody(
  subselect: unknown,
  catalog: SubtreeEvaluationCatalog,
  memo: WeakMap<object, TypeSet | null>,
): SublinkBody | null {
  if (nodeTag(subselect) !== "SelectStmt") return null;
  return closedSelectBody(fieldsOf(subselect, "SelectStmt"), catalog, memo);
}

/**
 * One body node's fields. A set operation's ARMS arrive UNWRAPPED — the
 * parser stores a bare SelectStmt object in `larg`/`rarg`, not a tagged
 * node (measured) — so the recursion takes fields, not nodes.
 */
function closedSelectBody(
  s: Record<string, unknown>,
  catalog: SubtreeEvaluationCatalog,
  memo: WeakMap<object, TypeSet | null>,
): SublinkBody | null {
  if (typeof s.op === "string" && SET_OPERATIONS.has(s.op)) {
    // Both arms pass the same gate, arities must agree, and the result
    // columns unify through `closedCommonTypes` — measured to be exactly
    // how PostgreSQL types all three operations, the same rule CASE and
    // COALESCE already use here. ALL-vs-DISTINCT is a row-count question,
    // not a closure one, so `all` rides either way; DISTINCT's equality
    // requirement can raise, which the raising-subtree fallback absorbs.
    for (const [key, value] of Object.entries(s)) {
      if (SUBLINK_SETOP_FIELDS.has(key)) continue;
      if (value === undefined || value === null || value === false) continue;
      if (Array.isArray(value) && value.length === 0) continue;
      return null;
    }
    if (typeof s.larg !== "object" || s.larg === null) return null;
    if (typeof s.rarg !== "object" || s.rarg === null) return null;
    const left = closedSelectBody(s.larg as Record<string, unknown>, catalog, memo);
    const right = closedSelectBody(s.rarg as Record<string, unknown>, catalog, memo);
    if (left === null || right === null) return null;
    if (left.targetSets.length !== right.targetSets.length) return null;
    const targetSets: TypeSet[] = [];
    for (let i = 0; i < left.targetSets.length; i++) {
      const unified = catalog.closedCommonTypes([left.targetSets[i]!, right.targetSets[i]!]);
      if (unified === null) return null;
      targetSets.push(unified);
    }
    // A LIMIT on the set operation ITSELF is refused (its fields are absent
    // from SUBLINK_SETOP_FIELDS, so the loop above already declined it):
    // which row a LIMIT takes from a set operation is a PLAN choice, not a
    // value of the statement — the same body answers 42 under
    // HashAggregate and 3 under Sort+Unique (measured, pinned in
    // param-mechanism.test.ts). Folding it would bake one plan's answer
    // into a claim the next plan falsifies. An ARM's own LIMIT is fine and
    // rides the plain branch: one bare projection, one row.
    if (s.limitOption !== undefined && s.limitOption !== "LIMIT_OPTION_DEFAULT") return null;
    if (!closedSortClause(s, catalog, memo)) return null;
    return { targetSets, hasSrf: left.hasSrf || right.hasSrf };
  }
  for (const [key, value] of Object.entries(s)) {
    if (SUBLINK_BODY_FIELDS.has(key)) continue;
    if (value === undefined || value === null || value === false) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    return null;
  }
  if (s.op !== undefined && s.op !== "SETOP_NONE") return null;
  // The free clauses (docs/subtree-evaluation.md, "Body-clause widening",
  // fourth batch): each changes WHICH rows the body has, never which value
  // a given row carries. WHERE is a closed predicate over the same rows;
  // ORDER BY and DISTINCT are admitted but bar a limit from slicing what
  // they leave — DISTINCT's surviving order is a planner choice (measured,
  // the same 42-vs-3 as a set operation's) and a SORT orders the key's
  // EQUIVALENCE CLASS rather than the value, so it leaves the sliced row
  // undetermined too: `VALUES (1.0),(1.00) ORDER BY column1 LIMIT 1`
  // answers 1.0 where the same rows written the other way answer 1.00,
  // `1.0 = 1.00` holding under numeric's opclass while the renderings
  // differ. Both bars are permanent — docs/subtree-evaluation.md,
  // "Closed for good".
  //
  // They are gated HERE, above the branch, because every body shape can
  // carry them: a VALUES body takes an ORDER BY too (measured — WHERE and
  // DISTINCT are syntax errors there, a sort is not). The VALUES branch
  // once returned above these lines and admitted keys nothing had read:
  // `random()`, `now()`, `USING >`, even a key reading a TABLE.
  if (s.whereClause !== undefined && typeSetOf(s.whereClause, catalog, memo) === null) return null;
  if (!closedSortClause(s, catalog, memo)) return null;
  if (!plainDistinctClause(s)) return null;
  const sliced = s.sortClause !== undefined || s.distinctClause !== undefined;
  if (sliced && (s.limitCount !== undefined || s.limitOffset !== undefined)) return null;
  if (Array.isArray(s.valuesLists)) {
    // A VALUES body (the widening's third clause). PostgreSQL forbids
    // set-returning calls here, so the pre-probe never applies; row lengths
    // must agree and the columns unify by position through the same rule
    // COALESCE uses — all three measured and pinned. A Values Scan keeps
    // the written order with no deduplication to reorder it, so a LIMIT may
    // slice the written rows, unlike a set operation's. A sort makes the
    // body `sliced` like any other, so `ORDER BY … LIMIT` refuses above.
    const rows: TypeSet[][] = [];
    for (const row of s.valuesLists) {
      if (nodeTag(row) !== "List") return null;
      const items = fieldsOf(row, "List").items;
      if (!Array.isArray(items) || items.length === 0) return null;
      const sets: TypeSet[] = [];
      for (const item of items) {
        const set = typeSetOf(item, catalog, memo);
        if (set === null) return null;
        sets.push(set);
      }
      rows.push(sets);
    }
    if (rows.length === 0) return null;
    const width = rows[0]!.length;
    if (rows.some(r => r.length !== width)) return null;
    const targetSets: TypeSet[] = [];
    for (let i = 0; i < width; i++) {
      const unified = catalog.closedCommonTypes(rows.map(r => r[i]!));
      if (unified === null) return null;
      targetSets.push(unified);
    }
    if (!closedLimitClause(s, false, catalog, memo)) return null;
    return { targetSets, hasSrf: false };
  }
  const targets = Array.isArray(s.targetList) ? s.targetList : [];
  if (targets.length === 0) return null;
  const targetSets: TypeSet[] = [];
  let hasSrf = false;
  for (const t of targets) {
    if (nodeTag(t) !== "ResTarget") return null;
    const tf = fieldsOf(t, "ResTarget");
    if (Array.isArray(tf.indirection) && tf.indirection.length > 0) return null;
    if (tf.val === undefined) return null;
    // PostgreSQL admits set-returning calls only at the target list's TOP
    // level, so this position check covers every SRF a valid body holds.
    const srfSet = topLevelSrfTypes(tf.val, catalog, memo);
    if (srfSet !== null) {
      hasSrf = true;
      targetSets.push(srfSet);
      continue;
    }
    const set = typeSetOf(tf.val, catalog, memo);
    if (set === null) return null;
    targetSets.push(set);
  }
  if (!closedLimitClause(s, hasSrf, catalog, memo)) return null;
  return { targetSets, hasSrf };
}

/**
 * Every ORDER BY key is a closed expression, and the ordering is one of
 * the built-in directions. `USING <op>` is refused: it names an operator
 * whose order semantics nothing here gates, and unlike the directions it
 * is not a property of the type's own default order.
 */
function closedSortClause(
  s: Record<string, unknown>,
  catalog: SubtreeEvaluationCatalog,
  memo: WeakMap<object, TypeSet | null>,
): boolean {
  if (s.sortClause === undefined) return true;
  if (!Array.isArray(s.sortClause) || s.sortClause.length === 0) return false;
  for (const key of s.sortClause) {
    if (nodeTag(key) !== "SortBy") return false;
    const sb = fieldsOf(key, "SortBy");
    if (sb.useOp !== undefined || sb.sortby_dir === "SORTBY_USING") return false;
    if (sb.node === undefined || typeSetOf(sb.node, catalog, memo) === null) return false;
  }
  return true;
}

/**
 * `DISTINCT` over the whole row, which the parser spells as a one-entry
 * list holding an empty node. `DISTINCT ON (...)` carries its expressions
 * there instead and is REFUSED: without an ORDER BY it returns an
 * unspecified row per group, which is a value the statement does not own.
 */
function plainDistinctClause(s: Record<string, unknown>): boolean {
  if (s.distinctClause === undefined) return true;
  if (!Array.isArray(s.distinctClause) || s.distinctClause.length !== 1) return false;
  const only = s.distinctClause[0];
  return typeof only === "object" && only !== null && Object.keys(only).length === 0;
}

/**
 * The LIMIT/OFFSET clause (docs/subtree-evaluation.md, "Body-clause
 * widening", second clause): both counts are ordinary closed expressions —
 * `LIMIT ALL` is a NULL literal, which closes like any other — and
 * `WITH TIES` is refused, since the count then bounds nothing (it needs an
 * ORDER BY, itself outside the wave, so the shape is unreachable today and
 * the refusal is the standing one).
 *
 * It reaches only the PLAIN branch. A body whose rows come from a bare
 * projection has one row, and a target-list SRF yields in the function's
 * own order through ProjectSet, which no plan reorders; a SET OPERATION
 * has no such guarantee and is refused above.
 *
 * OFFSET on an SRF-carrying body is REFUSED. LIMIT bounds what the runtime
 * cardinality pre-probe RETURNS, so the probe still answers a LIMITed
 * series immediately (measured); OFFSET bounds nothing it must WALK, and
 * the probe pays for every skipped row — linear, measured across three
 * orders of magnitude in param-mechanism.test.ts. Nothing bounds an offset
 * statically without interpreting the SRF's arguments, the banned
 * category, so the shape stays out.
 */
function closedLimitClause(
  s: Record<string, unknown>,
  hasSrf: boolean,
  catalog: SubtreeEvaluationCatalog,
  memo: WeakMap<object, TypeSet | null>,
): boolean {
  const option = s.limitOption;
  if (option !== undefined && option !== "LIMIT_OPTION_DEFAULT" && option !== "LIMIT_OPTION_COUNT") {
    return false;
  }
  if (s.limitOffset !== undefined && s.limitOffset !== null && hasSrf) return false;
  for (const bound of [s.limitCount, s.limitOffset]) {
    if (bound === undefined || bound === null) continue;
    if (typeSetOf(bound, catalog, memo) === null) return false;
  }
  return true;
}

/**
 * Whether a `FuncCall` node is a CLOSED set-returning call — every argument
 * closed, every surviving signature immutable, no aggregate/window markers.
 *
 * Exported for the cardinality round (`srf-cardinality.ts`), which asks a
 * different QUESTION of the same closure judgment: not "what does this
 * evaluate to" but "how many rows does it emit". Sharing the gate is what
 * keeps the volatility rule in one place — a STABLE call is refused here and
 * there for the same reason, that its analysis-time answer binds nothing at
 * execution time.
 */
export function isClosedSrfCall(val: unknown, catalog: SubtreeEvaluationCatalog): boolean {
  return topLevelSrfTypes(val, catalog, new WeakMap()) !== null;
}

/** The element-type set of a closed top-level set-returning call, null for
 *  anything else — the same markers, collision rule and survivor consensus
 *  as the scalar FuncCall gate, through `closedSetFunctionTypes`. */
function topLevelSrfTypes(
  val: unknown,
  catalog: SubtreeEvaluationCatalog,
  memo: WeakMap<object, TypeSet | null>,
): TypeSet | null {
  if (nodeTag(val) !== "FuncCall") return null;
  const f = fieldsOf(val, "FuncCall");
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
  const sets: TypeSet[] = [];
  for (const a of args) {
    const s = typeSetOf(a, catalog, memo);
    if (s === null) return null;
    sets.push(s);
  }
  return catalog.closedSetFunctionTypes(name, sets);
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
 * The closed-sublinks rung's explicit recorded bound: a body whose
 * top-level set-returning call yields more rows than this is refused — no
 * claim. A static bound would need SRF argument semantics (the banned
 * category); the runtime pre-probe asks PostgreSQL instead, and LIMIT
 * keeps ProjectSet lazy (pinned: cap+1 over a 10^10 series answers in
 * milliseconds).
 */
export const SUBLINK_SRF_ROW_CAP = 1000;

/** Whether every non-EXISTS SRF-carrying sublink body under `subtree`
 *  passes the cardinality pre-probe. EXISTS is exempt: the first row
 *  answers it, measured at 10^10. A raising or unrenderable probe admits
 *  nothing — the conservative direction. */
async function srfBodiesWithinCap(
  subtree: Node,
  catalog: SubtreeEvaluationCatalog,
  evaluate: Evaluate,
): Promise<boolean> {
  const memo = new WeakMap<object, TypeSet | null>();
  const bodies: unknown[] = [];
  const visit = (n: unknown): void => {
    if (Array.isArray(n)) {
      for (const x of n) visit(x);
      return;
    }
    if (!n || typeof n !== "object") return;
    const tag = nodeTag(n);
    if (tag === "SubLink") {
      const f = fieldsOf(n, tag);
      if (String(f.subLinkType ?? "") !== "EXISTS_SUBLINK") {
        const body = closedSublinkBody(f.subselect, catalog, memo);
        if (body?.hasSrf) bodies.push(f.subselect);
      }
    }
    const fields = tag ? fieldsOf(n, tag) : (n as Fields);
    for (const [key, value] of Object.entries(fields)) {
      if (key === "typeName") continue;
      visit(value);
    }
  };
  visit(subtree);
  for (const body of bodies) {
    const capped = structuredClone(fieldsOf(body, "SelectStmt")) as Fields;
    capped["limitCount"] = {
      A_Const: { ival: { ival: SUBLINK_SRF_ROW_CAP + 1 }, location: -1 },
    };
    capped["limitOption"] = "LIMIT_OPTION_COUNT";
    let sql: string;
    try {
      sql = deparseSync({
        version: 0,
        stmts: [{ stmt: { SelectStmt: capped }, stmt_len: 0 }],
      } as never);
    } catch {
      return false;
    }
    try {
      const row = await evaluate(`SELECT count(*) AS e0 FROM (${sql}) AS __pgsid_probe`);
      const count = Number(row?.["e0"]);
      if (!Number.isFinite(count) || count > SUBLINK_SRF_ROW_CAP) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Evaluate every maximal closed subtree under `root` and return the answers
 * keyed by NODE IDENTITY over the caller's own AST. One PREPARE fixes the
 * batch's result types; one SELECT returns every value beside those types
 * (`pg_prepared_statements.result_types`, measured present, PG 18.3); a
 * raising batch falls back to one SELECT per subtree so only the raising
 * subtrees contribute nothing. An empty map — no closed subtrees, a failed
 * PREPARE — costs the caller nothing but today's symbolic answer. A subtree
 * holding an SRF-carrying sublink body joins the batch only after the
 * cardinality pre-probe (tier 2 of the closed-sublinks rung).
 */
export async function evaluateClosedSubtrees(
  root: Node,
  catalog: SubtreeEvaluationCatalog,
  evaluate: Evaluate,
): Promise<Map<Node, EvalResult>> {
  const results = new Map<Node, EvalResult>();
  const collected = collectClosedSubtrees(root, catalog);
  if (collected.length === 0) return results;
  const subtrees: Node[] = [];
  for (const subtree of collected) {
    if (await srfBodiesWithinCap(subtree, catalog, evaluate)) subtrees.push(subtree);
  }
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
