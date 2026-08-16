// ---------------------------------------------------------------------------
// The CHECK grounder — Mechanism E (docs/argument-nullability.md; the
// evaluation capability is docs/subtree-evaluation.md, consumer 2).
//
// A write statement's ENFORCED CHECK constraints reject a NULL binding when
// the written values drive the predicate FALSE — not UNKNOWN, which CHECK
// passes (measured, pinned in param-mechanism.test.ts). The four chartered
// steps, in this module's terms:
//
//   1. GROUND — clone the catalog's parsed CHECK body and substitute each
//      written column's expression, CAST TO THE COLUMN'S DECLARED TYPE (the
//      bp control: 'a' = 'a ' is TRUE as char(4) and FALSE as text, so a
//      bare token would answer a different question than enforcement asks).
//      Unwritten columns — defaults on INSERT, OLD values on UPDATE — stay
//      as open ColumnRefs, which can never contribute a claim.
//   2. EVALUATE closed subtrees only, through the same evaluator core the
//      statement map uses (one batch per statement; grounded bodies are
//      synthesized trees, so they ride their own call, not the map).
//   3. REDUCE by three-valued algebra and 4. analyze the residue — fused
//      here into one recursion: FALSE-implicants of the grounded body,
//      computed with the evaluation answers consulted at every node. A
//      closed answer is TRUE/FALSE/NULL; `x IS NOT NULL` goes FALSE exactly
//      when x is NULL (the NULL-implicant algebra the param collector
//      already owns — strict flow, COALESCE, casts); AND is FALSE when any
//      conjunct is (union), OR needs every disjunct FALSE (cross-union).
//      Anything else — a comparison atom, a surviving column — contributes
//      nothing, which is how the charter's boundaries fall out instead of
//      being ruled: `$2 <= 1 OR $1 IS NOT NULL` claims nothing because the
//      $2 atom's UNKNOWN passes, and an unwritten column annihilates every
//      implicant that needs its disjunct.
//
// Claims are execution-time facts (`rejected`/`joint`, never
// `bindRejected`): a singleton implicant is a notNull parameter, a wider
// one a joint rejection set. An empty implicant means the write always
// raises — true, but not a parameter fact, so it is dropped.
//
// The same rewrite hazard gates here as gates mechanism B: a BEFORE ROW or
// INSTEAD OF trigger, or a DO INSTEAD rule, can rewrite the row between the
// statement's values and the constraint check, so a hooked (command, table)
// grounds nothing.
// ---------------------------------------------------------------------------

import type { Node } from "libpg-query";
import { parseSql } from "../ast.js";
import {
  evaluateClosedSubtrees,
  type EvalResult,
  type Evaluate,
  type SubtreeEvaluationCatalog,
} from "./subtree-evaluator.js";
import {
  crossUnion,
  forcedNullImplicantsAnyRow,
  minimizeImplicants,
  unionLists,
  type Implicants,
  type MechanismEClaims,
} from "./param-nullability.js";
import type { NullabilityCatalog } from "./types.js";

/** Both faces of the adapter product the grounder reads: write shapes and
 *  declared types from the walk's face, enforced CHECK trees and the
 *  evaluation gates from the evaluation face. */
export type GrounderCatalog = NullabilityCatalog & SubtreeEvaluationCatalog;

/** One enforced CHECK grounded with one written row's values. */
export interface GroundedCheck {
  body: Node;
  /** Whether the write event this came from happens on EVERY execution —
   *  see `Write.universal`. Read only by the always-raises fact. */
  universal: boolean;
}

// --- AST helpers (single-tag node objects, like the evaluator's) ------------

type Fields = Record<string, unknown>;

function nodeTag(n: unknown): string | null {
  if (!n || typeof n !== "object" || Array.isArray(n)) return null;
  const keys = Object.keys(n);
  return keys.length === 1 && /^[A-Z]/.test(keys[0]!) ? keys[0]! : null;
}

/** The bare column a CHECK body's ColumnRef names — one String field; a
 *  qualified reference stays unmatched (and therefore open, claiming
 *  nothing), which is the sound side of the ambiguity. */
function bareColumnOf(n: unknown): string | null {
  const tag = nodeTag(n);
  if (tag !== "ColumnRef") return null;
  const fields = ((n as Fields)["ColumnRef"] as { fields?: unknown[] })?.fields;
  if (!Array.isArray(fields) || fields.length !== 1) return null;
  return (fields[0] as { String?: { sval?: string } })?.String?.sval ?? null;
}

// --- Write extraction --------------------------------------------------------

interface Write {
  schema: string;
  table: string;
  command: "insert" | "update";
  /**
   * Whether EVERY execution constructs this row: a VALUES row or a
   * FROM-less `INSERT ... SELECT`. An UPDATE, a MERGE arm and an ON
   * CONFLICT update arm write only when a row matches, and all three
   * succeed over an empty match (pinned in param-mechanism.test.ts,
   * "The always-raises statement fact"). An ON CONFLICT clause does NOT
   * demote the insert's own row: the proposed row's CHECK is evaluated
   * before the arbiter is consulted (pinned there too).
   *
   * Claims are unaffected either way — a claim is existential already, so
   * "raises when a row matches" is exactly what it means. Only the
   * always-raises fact reads this.
   */
  universal: boolean;
  /** column name → the expression the statement writes there, as written.
   *  DEFAULT (SetToDefault) never enters: it proves nothing. */
  written: Map<string, Node>;
}

function isSetToDefault(n: unknown): boolean {
  return nodeTag(n) === "SetToDefault";
}

/** The write events of one statement, wherever they sit — top level or a
 *  data-modifying CTE. Each VALUES row is its own event: the CHECK fires
 *  per row and one FALSE row rejects the whole statement (pinned). */
function collectWrites(stmt: Node, catalog: GrounderCatalog): Write[] {
  const writes: Write[] = [];

  const put = (
    relation: { schemaname?: string; relname?: string } | undefined,
    command: "insert" | "update",
    entries: Iterable<[string, Node | undefined]>,
    universal = false,
  ): void => {
    if (!relation?.relname) return;
    const table = catalog.resolveTable(relation.schemaname, relation.relname);
    if (!table) return;
    // The rewrite hazard, exactly as mechanism B gates it: TREE hooks (a
    // partition's trigger fires for rows routed through the parent), and an
    // UPDATE on a partitioned target can move the row into a partition
    // whose BEFORE INSERT trigger rewrites it (both measured there).
    const wr = catalog.resolveWriteRewritesTree(table.schema, table.name);
    const commands =
      command === "update" && catalog.resolveIsPartitioned(table.schema, table.name)
        ? ["update", "insert"]
        : [command];
    if (
      commands.some(cmd => wr.beforeRow.has(cmd)) ||
      wr.insteadOf.has(command) ||
      wr.insteadRules.has(command)
    ) {
      return;
    }
    const written = new Map<string, Node>();
    for (const [column, value] of entries) {
      if (!column || !value || isSetToDefault(value)) continue;
      written.set(column, value);
    }
    writes.push({ schema: table.schema, table: table.name, command, universal, written });
  };

  const insertColumns = (
    relation: { schemaname?: string; relname?: string } | undefined,
    cols: Node[] | undefined,
  ): string[] | null => {
    if (!relation?.relname) return null;
    const table = catalog.resolveTable(relation.schemaname, relation.relname);
    if (!table) return null;
    return cols
      ? cols.map(col => (col as { ResTarget?: { name?: string } }).ResTarget?.name ?? "")
      : table.columns;
  };

  const setEntries = (targetList: Node[] | undefined): [string, Node | undefined][] =>
    (targetList ?? []).map(item => {
      const rt = (item as { ResTarget?: { name?: string; val?: Node } }).ResTarget;
      // A MultiAssignRef routes a shared source by position; grounding it
      // whole would mis-type the value, so the column is treated as
      // unwritten — an open ColumnRef claims nothing either way.
      const val = rt?.val && nodeTag(rt.val) === "MultiAssignRef" ? undefined : rt?.val;
      return [rt?.name ?? "", val];
    });

  const visit = (n: unknown): void => {
    if (Array.isArray(n)) {
      for (const x of n) visit(x);
      return;
    }
    if (!n || typeof n !== "object") return;
    const rec = n as Fields;

    const ins = rec["InsertStmt"] as
      | {
          relation?: { schemaname?: string; relname?: string };
          cols?: Node[];
          selectStmt?: Node;
          onConflictClause?: { targetList?: Node[] };
        }
      | undefined;
    if (ins) {
      const columns = insertColumns(ins.relation, ins.cols);
      const select = (ins.selectStmt as { SelectStmt?: Fields } | undefined)?.SelectStmt;
      if (columns && select) {
        const valuesLists = select["valuesLists"] as Node[] | undefined;
        for (const row of valuesLists ?? []) {
          const items = (row as { List?: { items?: Node[] } }).List?.items ?? [];
          put(ins.relation, "insert", items.map((item, i) => [columns[i] ?? "", item]), true);
        }
        if (!valuesLists && select["op"] === "SETOP_NONE" && !select["fromClause"]) {
          // INSERT ... SELECT with no FROM constructs its one row exactly
          // like a VALUES row (the footing the mechanism-B measurement
          // gave); a sourced SELECT can write zero rows and stays out.
          const targetList = (select["targetList"] as Node[] | undefined) ?? [];
          put(
            ins.relation,
            "insert",
            targetList.map((item, i) => [
              columns[i] ?? "",
              (item as { ResTarget?: { val?: Node } }).ResTarget?.val,
            ]),
            true,
          );
        }
      }
      if (ins.onConflictClause?.targetList) {
        put(ins.relation, "update", setEntries(ins.onConflictClause.targetList));
      }
    }

    const upd = rec["UpdateStmt"] as
      | { relation?: { schemaname?: string; relname?: string }; targetList?: Node[] }
      | undefined;
    if (upd) put(upd.relation, "update", setEntries(upd.targetList));

    const merge = rec["MergeStmt"] as
      | { relation?: { schemaname?: string; relname?: string }; mergeWhenClauses?: Node[] }
      | undefined;
    if (merge) {
      for (const clause of merge.mergeWhenClauses ?? []) {
        const mwc = (clause as { MergeWhenClause?: { targetList?: Node[]; values?: Node[] } })
          .MergeWhenClause;
        if (!mwc) continue;
        if (mwc.values) {
          const columns = (mwc.targetList ?? []).map(
            t => (t as { ResTarget?: { name?: string } }).ResTarget?.name ?? "",
          );
          put(
            merge.relation,
            "insert",
            mwc.values.map((v, i) => [columns[i] ?? "", v]),
          );
        } else if (mwc.targetList) {
          put(merge.relation, "update", setEntries(mwc.targetList));
        }
      }
    }

    for (const value of Object.values(rec)) visit(value);
  };

  visit(stmt);
  return writes;
}

// --- Grounding ----------------------------------------------------------------

/** The parsed TypeName of a column's declared type, harvested by parsing
 *  `SELECT NULL::<type>` — `format_type` renders SQL-valid spellings
 *  (typmods included, `character(4)`), so the round trip is total in
 *  practice; a spelling that will not parse just leaves its column
 *  unsubstituted. */
async function typeNameAst(
  rendered: string,
  cache: Map<string, unknown | null>,
): Promise<unknown | null> {
  const hit = cache.get(rendered);
  if (hit !== undefined) return hit;
  let ast: unknown | null = null;
  try {
    const parsed = await parseSql(`SELECT NULL::${rendered}`);
    const target = (
      (parsed.stmts?.[0]?.stmt as Fields | undefined)?.["SelectStmt"] as
        | { targetList?: { ResTarget?: { val?: Fields } }[] }
        | undefined
    )?.targetList?.[0]?.ResTarget?.val;
    ast = (target?.["TypeCast"] as { typeName?: unknown } | undefined)?.typeName ?? null;
  } catch {
    ast = null;
  }
  cache.set(rendered, ast);
  return ast;
}

/** Clone `body` with every bare reference to a written column replaced by
 *  the written expression cast to the column's declared type. Mutates only
 *  the clone; written expressions are cloned per site so the synthesized
 *  tree shares no nodes with the statement. */
function substitute(
  body: Node,
  substitutions: Map<string, { value: Node; typeName: unknown }>,
): Node {
  const grounded = structuredClone(body) as Node;
  const replaced = (n: unknown): unknown => {
    const column = bareColumnOf(n);
    if (column === null) return null;
    const sub = substitutions.get(column);
    if (!sub) return null;
    return {
      TypeCast: {
        arg: structuredClone(sub.value),
        typeName: structuredClone(sub.typeName),
        location: -1,
      },
    };
  };
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) {
      n.forEach((child, i) => {
        const r = replaced(child);
        if (r !== null) n[i] = r;
        else walk(child);
      });
      return;
    }
    if (!n || typeof n !== "object") return;
    for (const [key, child] of Object.entries(n as Fields)) {
      const r = replaced(child);
      if (r !== null) (n as Fields)[key] = r;
      else walk(child);
    }
  };
  // A body that IS a lone written-column reference (CHECK (flag)) has no
  // parent field to rewrite through — replace it whole.
  const top = replaced(grounded);
  if (top !== null) return top as Node;
  walk(grounded);
  return grounded;
}

/**
 * Every enforced CHECK of every write event in `stmt`, grounded per written
 * row. Async only for the TypeName round trip — one parse per distinct
 * declared type, cached.
 */
export async function groundEnforcedChecks(
  stmt: Node,
  catalog: GrounderCatalog,
): Promise<GroundedCheck[]> {
  const grounded: GroundedCheck[] = [];
  const typeCache = new Map<string, unknown | null>();
  for (const write of collectWrites(stmt, catalog)) {
    const checks = catalog.resolveEnforcedCheckConstraints(write.schema, write.table);
    if (checks.length === 0) continue;
    const substitutions = new Map<string, { value: Node; typeName: unknown }>();
    for (const [column, value] of write.written) {
      const rendered = catalog.resolveColumnTypeName(write.schema, write.table, column);
      if (rendered === null) continue;
      const typeName = await typeNameAst(rendered, typeCache);
      if (typeName === null) continue;
      substitutions.set(column, { value, typeName });
    }
    for (const check of checks) {
      grounded.push({ body: substitute(check, substitutions), universal: write.universal });
    }
  }
  return grounded;
}

// --- Evaluation ----------------------------------------------------------------

/** One evaluator-core call for the whole statement's grounded bodies: the
 *  List wrapper is open (unknown kind), so collection descends into every
 *  body and the batch protocol amortizes as usual. */
export async function evaluateGroundedChecks(
  checks: readonly GroundedCheck[],
  catalog: GrounderCatalog,
  evaluate: Evaluate,
): Promise<ReadonlyMap<Node, EvalResult>> {
  if (checks.length === 0) return new Map();
  const root = { List: { items: checks.map(c => c.body) } } as unknown as Node;
  return evaluateClosedSubtrees(root, catalog, evaluate);
}

// --- Reduction and residue ------------------------------------------------------

/** Implicants of "this grounded expression is NULL": a closed answer is
 *  exact; everything else is the collector's forced-NULL algebra (ParamRef,
 *  strict flow, COALESCE, casts), which over-keeps but never over-claims. */
function nullImplicants(
  n: Node,
  answers: ReadonlyMap<Node, EvalResult>,
  catalog: NullabilityCatalog,
): Implicants {
  const a = answers.get(n);
  if (a !== undefined) return a.isNull ? [[]] : [];
  return forcedNullImplicantsAnyRow(n, catalog);
}

/** The boolean truth of an evaluated guard: `true` fires the arm, `false`
 *  covers FALSE and NULL alike (CASE takes neither), undefined is an open
 *  guard the reduction must quantify over. */
function guardTruth(
  n: Node | undefined,
  answers: ReadonlyMap<Node, EvalResult>,
): boolean | undefined {
  if (!n) return undefined;
  const a = answers.get(n);
  if (a === undefined) return undefined;
  if (a.isNull) return false;
  if (a.value === true) return true;
  if (a.value === false) return false;
  return undefined;
}

/** Implicants of "this grounded boolean is FALSE" — the rejection
 *  condition. CHECK passes TRUE and UNKNOWN alike, so only shapes that
 *  convert a NULL binding to FALSE contribute; each recursion step
 *  consults the answers first, which IS the three-valued reduction. */
function falseImplicants(
  n: Node,
  answers: ReadonlyMap<Node, EvalResult>,
  catalog: NullabilityCatalog,
): Implicants {
  const a = answers.get(n);
  if (a !== undefined) {
    return !a.isNull && a.value === false ? [[]] : [];
  }
  const tag = nodeTag(n);
  if (tag === "CaseExpr") {
    // A CASE-shaped CHECK body (the instrument's first post-landing
    // conviction): the CASE is FALSE exactly when the arm that fires
    // yields FALSE, so an implicant must handle EVERY possibly-firing arm
    // — by forcing its RESULT FALSE, or by forcing its GUARD not-TRUE so
    // the arm never fires (the instrument's second conviction, 2026-08-12:
    // `(2787, $1, 1)` into bcorr — binding the discriminator NULL routes
    // to the ELSE arm the written value makes FALSE, so nullImplicants of
    // the guard are arm-removal implicants). An evaluated-not-TRUE guard
    // removes its arm outright, everything after an evaluated-TRUE guard
    // (the ELSE included) never fires, and a missing ELSE is the implicit
    // NULL arm, which is never FALSE and so annihilates. The simple form's
    // comparisons are not AST nodes; nothing to consult, no claim.
    const f = (n as Fields)["CaseExpr"] as { arg?: Node; args?: Node[]; defresult?: Node };
    if (f.arg !== undefined) return [];
    const reachable: Implicants[] = [];
    for (const w of f.args ?? []) {
      const when = (w as Fields)["CaseWhen"] as { expr?: Node; result?: Node } | undefined;
      if (!when?.result) return [];
      const t = guardTruth(when.expr, answers);
      if (t === false) continue;
      // Not-TRUE by forcing: a guard driven NULL or FALSE by a NULL
      // binding cannot select its arm — either route neutralizes it.
      const notTrue = when.expr
        ? unionLists([
            nullImplicants(when.expr, answers, catalog),
            falseImplicants(when.expr, answers, catalog),
          ])
        : [];
      reachable.push(
        unionLists([notTrue, falseImplicants(when.result, answers, catalog)]),
      );
      if (t === true) return crossUnion(reachable);
    }
    reachable.push(f.defresult ? falseImplicants(f.defresult, answers, catalog) : []);
    return crossUnion(reachable);
  }
  if (tag === "BoolExpr") {
    const f = (n as Fields)["BoolExpr"] as { boolop?: string; args?: Node[] };
    const args = f.args ?? [];
    if (f.boolop === "AND_EXPR") {
      return unionLists(args.map(x => falseImplicants(x, answers, catalog)));
    }
    if (f.boolop === "OR_EXPR") {
      return crossUnion(args.map(x => falseImplicants(x, answers, catalog)));
    }
    if (f.boolop === "NOT_EXPR" && args.length === 1) {
      // NOT x is FALSE exactly when x is TRUE — a NULL binding makes atoms
      // UNKNOWN, never TRUE, so only an evaluated TRUE answers.
      const inner = answers.get(args[0]!);
      return inner !== undefined && !inner.isNull && inner.value === true ? [[]] : [];
    }
    return [];
  }
  if (tag === "NullTest") {
    const f = (n as Fields)["NullTest"] as { arg?: Node; nulltesttype?: string };
    if (f.arg && f.nulltesttype === "IS_NOT_NULL") {
      return nullImplicants(f.arg, answers, catalog);
    }
    // IS NULL goes FALSE on a NON-null value; a NULL binding cannot force
    // one, and a closed argument was answered at the parent already.
    return [];
  }
  // Comparison atoms, surviving columns, anything unrecognised: a NULL
  // binding makes them UNKNOWN at worst, which CHECK passes.
  return [];
}

/**
 * The claims of one statement's grounded CHECKs, from the evaluation
 * answers: singleton FALSE-implicants are notNull parameters, wider ones
 * joint rejection sets; the empty implicant (this body is FALSE whatever
 * is bound) is not a fact about any parameter and drops out of both — it
 * surfaces instead as `alwaysRaises`, and only from a UNIVERSAL write
 * event, since the same implicant off an UPDATE or a MERGE arm means
 * "raises when a row matches" (docs/argument-nullability.md, "The
 * always-raises statement fact").
 */
export function groundedCheckClaims(
  checks: readonly GroundedCheck[],
  answers: ReadonlyMap<Node, EvalResult>,
  catalog: NullabilityCatalog,
): MechanismEClaims {
  const all: Implicants = [];
  let alwaysRaises = false;
  for (const check of checks) {
    const implicants = falseImplicants(check.body, answers, catalog);
    if (check.universal && implicants.some(s => s.length === 0)) alwaysRaises = true;
    all.push(...implicants);
  }
  const minimized = minimizeImplicants(all);
  return {
    rejected: new Set(minimized.filter(s => s.length === 1).map(s => s[0]!)),
    joint: minimized.filter(s => s.length >= 2),
    alwaysRaises,
  };
}
