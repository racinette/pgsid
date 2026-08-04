// ---------------------------------------------------------------------------
// Argument nullability: which of a statement's parameters ($1, $2, …) reject
// a NULL binding. See docs/argument-nullability.md for the design and the
// measured PostgreSQL behaviour it rests on; the executable version of those
// measurements is tests/unit/query/param-mechanism.test.ts.
//
// A parameter is `notNull` when binding NULL can make the statement raise:
//
//   A (bind-time)      — parse analysis resolves the parameter's TYPE to a
//                        NOT NULL domain: a cast whose operand is the
//                        parameter, a function argument declared as the
//                        domain, or assignment into a domain-typed column.
//                        Raises before execution; guard-immune, data-immune.
//   B (execution-time) — the parameter is assigned into a column with a
//                        plain NOT NULL constraint; the check fires per row
//                        actually written, so the claim is existential.
//   C (execution-time) — value flow: the parameter's VALUE, forced NULL
//                        through strict expressions, reaches a runtime
//                        rejection — a cast of an expression to a NOT NULL
//                        domain, a domain-typed function argument, or a
//                        rejecting column target. Raises when the expression
//                        is evaluated, so existential like B, and like B it
//                        never licenses output narrowing.
//
// Both mean the same thing to a caller — do not pass NULL — so the result
// does not distinguish them. Everything else is nullable: a comparison
// position never rejects (operators resolve on a domain's BASE type, so the
// constraint is never consulted).
//
// This is a dedicated traversal, not a hook on the output walk, for a
// structural reason: every rejecting site is recognisable LOCALLY (a
// TypeCast contains its operand; a FuncCall its arguments; a DML statement
// its target mapping) with only catalog lookups, while sites can occur in
// clauses the output walk has no reason to visit (deep in WHERE, in join
// quals, in ORDER BY). A generic recursion over the whole tree is complete
// by construction; hooking the output walk would be complete only for the
// clauses it happens to analyse.
//
// One boundary matters: `ParamRef` nodes inside `LANGUAGE sql` function
// bodies (catalog.fnBodyAsts) are the FUNCTION's parameters, not the
// statement's. This traversal walks the statement AST only, which cannot
// contain those bodies — the call-site coercion to the function's declared
// argument types is what constrains the statement's own parameters, and that
// is the FuncCall rule above.
//
// Everything unrecognised degrades to nullable, never to notNull: named
// argument notation, variadic positions, multi-assignment UPDATE SET
// ((a, b) = ROW($1, $2)), set operations under INSERT ... SELECT. The
// falsification oracle (bind NULL, observe) is what keeps those degradations
// honest — a missed rejecting site is a nullable claim the oracle can refute.
// ---------------------------------------------------------------------------

import type { Node } from "libpg-query";
import { TOTAL_STRICT_OPERATORS } from "./operators.js";
import type { NullabilityCatalog } from "./types.js";

/**
 * Per-parameter nullability. A **positional** array like `OutputNullability`:
 * entry `i` describes `$i+1`, and the array is dense `$1..$n` — PostgreSQL
 * rejects statements whose parameter numbers have gaps, so for any statement
 * it accepts, density is given. `notNull` means binding NULL can make the
 * statement raise; it never means "NULL would be useless here".
 */
export interface ParamNullability {
  /** 1-based parameter number. */
  number: number;
  /** Binding NULL to this parameter can make the statement raise. */
  notNull: boolean;
}

/** The `$n` of a node that is directly a ParamRef, else null. */
function paramNumberOf(node: unknown): number | null {
  const pr = (node as { ParamRef?: { number?: number } } | null)?.ParamRef;
  if (!pr) return null;
  return pr.number ?? 0;
}

function stringVal(node: unknown): string {
  return (node as { String?: { sval?: string } } | null)?.String?.sval ?? "";
}

interface Collector {
  catalog: NullabilityCatalog;
  seen: Set<number>;
  rejected: Set<number>;
  /**
   * Joint rejection sets from mechanism-C sites: parameter sets of size ≥ 2
   * whose members, ALL bound NULL together, force a NULL into a rejecting
   * site — no single member does alone, or it would be in `rejected`.
   * `COALESCE($1, $2)` into a NOT NULL column is the shape. Finalized in
   * collectParamFacts: minimized, and sets containing an individually
   * rejected parameter are absorbed (the singleton claim already forbids
   * the binding).
   */
  jointRejected: number[][];
  /**
   * The mechanism-A subset of `rejected`: parameters whose TYPE parse
   * analysis resolves to a NOT NULL domain, so a NULL binding raises at the
   * protocol's Bind step, before any execution. This is strictly stronger
   * than `rejected`: a mechanism-B site (plain NOT NULL column constraint)
   * raises per row written, and a statement can return rows without the
   * writing path ever seeing one — `WITH w AS (INSERT INTO plain SELECT $1
   * FROM empty_src RETURNING e) SELECT $1 FROM t` succeeds with NULL and
   * returns rows. Only bind-time rejection licenses the output walk's
   * narrowing (any returned row proves the parameter was non-NULL), which is
   * why the two are tracked separately.
   */
  bindRejected: Set<number>;
}

/**
 * How writing NULL into `schema.table.column` raises, if it does:
 * `"domain"` — the column's type is a NOT NULL domain, so a parameter
 * assigned to it is TYPED as that domain and rejected at Bind (mechanism A);
 * `"constraint"` — a plain NOT NULL constraint, checked per row written
 * (mechanism B). A domain-typed column reports `"domain"` even when a
 * redundant column constraint also exists — bind-time wins.
 *
 * `command` is the write the value travels through. A BEFORE ROW or
 * INSTEAD OF trigger, or a DO INSTEAD rule, on that command can rewrite the
 * row between the statement's value and the constraint check — a trigger
 * may replace the NULL, a rule may redirect the write to a table that
 * accepts it (both measured) — so mechanism B is no longer implied by the
 * statement text and reports nothing there. Mechanism A is untouched: the
 * parameter's type comes from parse analysis of the statement as written,
 * and Bind rejects the NULL before any rewrite runs.
 */
function columnRejection(
  c: Collector,
  schema: string,
  table: string,
  column: string,
  command: "insert" | "update",
): "domain" | "constraint" | null {
  const typeOid = c.catalog.resolveColumnTypeOid(schema, table, column);
  if (typeOid !== null && c.catalog.isNotNullDomain(typeOid)) return "domain";
  if (c.catalog.resolveColumnNotNull(schema, table, column)) {
    const wr = c.catalog.resolveWriteRewrites(schema, table);
    if (wr.beforeRow.has(command) || wr.insteadOf.has(command) || wr.insteadRules.has(command)) {
      return null;
    }
    return "constraint";
  }
  return null;
}

/** TypeCast target → is it a NOT NULL domain? Mirrors the output walk. */
function castTargetIsNotNullDomain(c: Collector, typeName: unknown): boolean {
  const names = (typeName as { names?: Node[] } | undefined)?.names;
  if (!names || names.length === 0) return false;
  const parts = names.map(stringVal);
  if (parts.length >= 2) {
    return c.catalog.isNotNullDomainByName(parts[parts.length - 2]!, parts[parts.length - 1]!);
  }
  return c.catalog.isNotNullDomainByName(undefined, parts[0]!);
}

/**
 * Record a rejecting site. Only mechanism A ("domain": the parameter itself
 * is typed as a NOT NULL domain, rejected at Bind) licenses output
 * narrowing. "constraint" (B) and "flow" (C) raise at execution time — per
 * row written, or when the expression is evaluated — so a statement can
 * return rows without them ever firing.
 */
function reject(c: Collector, num: number, mechanism: "domain" | "constraint" | "flow"): void {
  c.rejected.add(num);
  if (mechanism === "domain") c.bindRejected.add(num);
}

/**
 * Which parameters, when bound NULL, force this expression to evaluate NULL?
 * Only guaranteed propagation counts — strict operators and functions
 * propagate any NULL operand; NULLIF propagates its LEFT operand only (a
 * NULL right side just fails the equality); COALESCE is NULL only when every
 * branch is (intersection); a cast passes its operand's set through (a NOT
 * NULL domain cast in the middle raises even earlier, which serves the same
 * claim). Everything unrecognised contributes nothing — an unattributed
 * parameter stays nullable, and the falsification oracle keeps that honest.
 *
 * Two consumers with OPPOSITE row-quantifiers, hence the two exported faces
 * below. The propagation rules above are value semantics within a single
 * evaluation and are shared; only the reduction over a derived column's
 * defining rows differs.
 */
/**
 * The full analysis computes minimal IMPLICANTS: sets of parameters whose
 * JOINT NULL binding forces the expression NULL (monotone — more NULLs never
 * un-force). The rules are the same value semantics as ever, lifted one
 * level: a strict operator's NULL needs ANY operand NULL (union of the
 * operands' implicant lists), COALESCE's needs EVERY branch NULL (pairwise
 * cross-unions — whose singleton projection IS the old intersection). Each
 * implicant is sorted ascending; lists are kept minimal (no supersets).
 *
 * Bounds: implicants larger than MAX_IMPLICANT_SIZE and joint implicants
 * beyond MAX_JOINT_IMPLICANTS are dropped — conservative (a dropped
 * implicant is a missing claim, exactly the pre-lift state) and recorded in
 * docs/argument-nullability.md. SINGLETONS are never dropped: the flat
 * contract's claims must not regress however wide an expression fans out.
 */
type Implicants = number[][];

const MAX_IMPLICANT_SIZE = 4;
const MAX_JOINT_IMPLICANTS = 8;

function minimizeImplicants(sets: number[][]): Implicants {
  const kept: number[][] = [];
  // The EMPTY implicant (a literal NULL somewhere in every branch) means
  // "unconditionally NULL" — it sorts first and absorbs everything else.
  const candidates = sets
    .filter(s => s.length <= MAX_IMPLICANT_SIZE)
    .map(s => [...new Set(s)].sort((a, b) => a - b))
    .sort((a, b) => a.length - b.length || a.join(",").localeCompare(b.join(",")));
  let joints = 0;
  for (const s of candidates) {
    if (kept.some(k => k.every(x => s.includes(x)))) continue; // superset (or dup)
    if (s.length === 1) {
      kept.push(s);
      continue;
    }
    if (joints >= MAX_JOINT_IMPLICANTS) continue;
    kept.push(s);
    joints++;
  }
  return kept;
}

/** Implicants of "every input NULL": pairwise unions across the lists. */
function crossUnion(lists: Implicants[]): Implicants {
  if (lists.length === 0) return [];
  return lists.reduce((acc, next) => {
    if (acc.length === 0 || next.length === 0) return [];
    const out: number[][] = [];
    for (const a of acc) for (const b of next) out.push([...a, ...b]);
    return minimizeImplicants(out);
  });
}

/** Implicants of "any input NULL": concatenation, minimized. */
function unionLists(lists: Implicants[]): Implicants {
  return minimizeImplicants(lists.flat());
}

function singletonsOf(implicants: Implicants): Set<number> {
  return new Set(implicants.filter(s => s.length === 1).map(s => s[0]!));
}

/**
 * The UNIVERSAL face: parameters whose NULL forces the expression NULL in
 * EVERY row context — a derived column reduces by intersection over its
 * defining rows. This is what WHERE-conjunct narrowing must consume: a row
 * whose definition the parameter does not force can survive the conjunct
 * with the parameter NULL and carry it into the output
 * (param-narrow-multirow.sql is the measured case). The singleton
 * projection of the implicant analysis — narrowing never consumes joint
 * facts (a jointly-forced conjunct proves no single parameter non-null).
 */
export function forcedNullParams(
  node: Node | undefined,
  catalog: NullabilityCatalog,
  ctx?: AliasContext,
): Set<number> {
  return singletonsOf(forcedNullBy(node, catalog, ctx, false));
}

/**
 * The EXISTENTIAL face, full implicants: sets whose joint NULL forces the
 * expression NULL in AT LEAST ONE row context — union over defining rows.
 * This is what the contract's rejecting sites consume: one forced row
 * reaching the site is enough to raise (param-merge-source-multirow.sql is
 * the trigger case). The two faces differ ONLY at that reduction;
 * COALESCE's cross-union and the strict operators' plain union are value
 * semantics within a single evaluation and belong to both.
 */
export function forcedNullImplicantsAnyRow(
  node: Node | undefined,
  catalog: NullabilityCatalog,
  ctx?: AliasContext,
): Implicants {
  return forcedNullBy(node, catalog, ctx, true);
}

/** The existential face's singleton projection (kept for the walk). */
export function forcedNullParamsAnyRow(
  node: Node | undefined,
  catalog: NullabilityCatalog,
  ctx?: AliasContext,
): Set<number> {
  return singletonsOf(forcedNullBy(node, catalog, ctx, true));
}

function forcedNullBy(
  node: Node | undefined,
  catalog: NullabilityCatalog,
  ctx: AliasContext | undefined,
  anyRow: boolean,
): Implicants {
  const none: Implicants = [];
  if (!node || typeof node !== "object") return none;
  const n = node as Record<string, unknown>;

  const direct = paramNumberOf(n);
  if (direct !== null) return [[direct]];

  // The NULL literal is unconditionally NULL: the empty implicant, which
  // survives cross-unions untouched (it adds no members) and is skipped by
  // every consumer that attributes to parameters. A non-null constant has
  // NO implicants, which zeroes out any cross-union it joins — the branch
  // that can never be forced NULL protects the whole COALESCE/CASE.
  if (n["A_Const"]) {
    return (n["A_Const"] as { isnull?: boolean }).isnull ? [[]] : none;
  }

  // A derived-table column: attribute through its defining expressions,
  // reduced per the caller's quantifier — "every row forces" is a
  // cross-union (one implicant chosen per row, joined; its singleton
  // projection is the old intersection), "some row forces" a plain union.
  // The recursion drops the context: a defining expression cannot reference
  // its own alias, and deeper nesting stays conservative.
  if (n["ColumnRef"] && ctx) {
    const fields = ((n["ColumnRef"] as { fields?: Node[] }).fields ?? []).map(stringVal);
    let cols: Map<string, Node[]> | undefined;
    let colName: string | undefined;
    if (fields.length === 2) {
      cols = ctx.get(fields[0]!);
      colName = fields[1];
    } else if (fields.length === 1 && ctx.size === 1) {
      cols = [...ctx.values()][0];
      colName = fields[0];
    }
    const defs = colName ? cols?.get(colName) : undefined;
    if (defs?.length) {
      const perRow = defs.map(d => forcedNullBy(d, catalog, undefined, anyRow));
      return anyRow ? unionLists(perRow) : crossUnion(perRow);
    }
    return none;
  }

  if (n["TypeCast"]) {
    return forcedNullBy((n["TypeCast"] as { arg?: Node }).arg, catalog, ctx, anyRow);
  }

  if (n["A_Expr"]) {
    const ae = n["A_Expr"] as { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node };
    if (ae.kind === "AEXPR_NULLIF") return forcedNullBy(ae.lexpr, catalog, ctx, anyRow);
    const parts = (ae.name ?? []).map(stringVal);
    const op = parts[parts.length - 1] ?? "";
    const schema = parts.length >= 2 ? parts[parts.length - 2] : undefined;
    // Bare builtin names via the curated set; user operators via their
    // backing function's declared strictness (single candidate or refuse) —
    // strictness is the only property NULL-propagation needs.
    const strict =
      (parts.length === 1 && TOTAL_STRICT_OPERATORS.has(op)) ||
      (catalog.resolveOperatorMetadata(schema, op)?.strict ?? false);
    if (ae.kind === "AEXPR_OP" && strict) {
      return unionLists([ae.lexpr, ae.rexpr].map(o => forcedNullBy(o, catalog, ctx, anyRow)));
    }
    return none;
  }

  // NULL only when EVERY branch is — the joint-fact source: neither $1 nor
  // $2 alone forces COALESCE($1, $2), but together they do, and the
  // cross-union is where that set is born.
  if (n["CoalesceExpr"]) {
    const args = (n["CoalesceExpr"] as { args?: Node[] }).args ?? [];
    if (args.length === 0) return none;
    return crossUnion(args.map(a => forcedNullBy(a, catalog, ctx, anyRow)));
  }

  // CASE is NULL only when the SELECTED arm's result is — and covering
  // EVERY result (all THEN expressions plus the ELSE; an absent ELSE is
  // the NULL literal) makes the claim hold whichever arm runs, without
  // reasoning about the conditions at all. `CASE WHEN $1 IS NOT NULL THEN
  // $1 ELSE $2 END` is COALESCE($1, $2) in different clothes and yields
  // the same {1, 2}. Simple CASE (with arg) works identically.
  if (n["CaseExpr"]) {
    const ce = n["CaseExpr"] as { args?: Node[]; defresult?: Node };
    const results = (ce.args ?? []).map(w =>
      forcedNullBy(
        ((w as Record<string, unknown>)["CaseWhen"] as { result?: Node } | undefined)?.result,
        catalog,
        ctx,
        anyRow,
      ),
    );
    results.push(ce.defresult ? forcedNullBy(ce.defresult, catalog, ctx, anyRow) : [[]]);
    return crossUnion(results);
  }

  if (n["FuncCall"]) {
    const fc = n["FuncCall"] as {
      funcname?: Node[];
      args?: Node[];
      over?: unknown;
      agg_star?: boolean;
    };
    if (fc.over || fc.agg_star) return none;
    const parts = (fc.funcname ?? []).map(stringVal);
    const name = parts[parts.length - 1];
    const schema = parts.length >= 2 ? parts[parts.length - 2] : undefined;
    if (!name) return none;
    // A catalog entry gates on its own declared strictness (a user function
    // always wins over a builtin name); only a name the catalog does not
    // carry falls through to the measured strict-builtin set.
    const info = catalog.resolveFunctionMetadata(schema, name);
    let strict: boolean;
    if (info) {
      strict = info.strict && !info.isAggregate;
    } else {
      const candidates = catalog.resolveFunctionCandidates(schema, name, (fc.args ?? []).length);
      strict =
        candidates && candidates.length > 0
          ? candidates.every(c => c.strict && !c.isAggregate)
          : (schema === undefined || schema === "pg_catalog") && catalog.isStrictBuiltin(name);
    }
    if (!strict) return none;
    const perArg: Implicants[] = [];
    for (const arg of fc.args ?? []) {
      if ((arg as { NamedArgExpr?: unknown }).NamedArgExpr) return none;
      perArg.push(forcedNullBy(arg, catalog, ctx, anyRow));
    }
    return unionLists(perArg);
  }

  return none;
}

/**
 * Derived-table columns visible at a rejecting site: alias → column name →
 * DEFINING EXPRESSIONS, one per source row (a subquery column has exactly
 * one; a VALUES column has one per row). Lets `forcedNullParams` attribute a
 * parameter THROUGH a source column — `$1 → s.sv → NOT NULL target` — which
 * is a real raise the local analysis cannot otherwise see (pinned in
 * param-mechanism.test.ts).
 */
type AliasContext = Map<string, Map<string, Node[]>>;

/**
 * Column map of one derived table (RangeSubselect over VALUES or a plain
 * SELECT). Unattributable shapes return null — star expansion shifts
 * positions, a set operation has two defining lists — and their parameters
 * stay conservatively nullable. Alias column names (`s(sid, snm)`) rename
 * positionally and win over target-list names, and everything compares
 * case-folded because the parser lower-cases unquoted identifiers before we
 * ever see them.
 */
function derivedTableCols(node: unknown): { alias: string; cols: Map<string, Node[]> } | null {
  const rs = (node as { RangeSubselect?: Record<string, unknown> } | null)?.RangeSubselect;
  if (!rs) return null;
  const alias = (rs["alias"] as { aliasname?: string; colnames?: Node[] } | undefined) ?? {};
  if (!alias.aliasname) return null;
  const select = (rs["subquery"] as { SelectStmt?: Record<string, unknown> } | undefined)
    ?.SelectStmt;
  if (!select) return null;

  const aliasNames = alias.colnames?.map(stringVal);
  const cols = new Map<string, Node[]>();
  const put = (name: string | undefined, index: number, expr: Node | undefined): void => {
    const finalName = aliasNames?.[index] ?? name;
    if (!finalName || !expr) return;
    const defs = cols.get(finalName) ?? [];
    defs.push(expr);
    cols.set(finalName, defs);
  };

  const valuesLists = select["valuesLists"] as Node[] | undefined;
  if (valuesLists?.length) {
    if (!aliasNames) return null; // VALUES columns have no names of their own
    for (const row of valuesLists) {
      const items = (row as { List?: { items?: Node[] } }).List?.items ?? [];
      items.forEach((item, i) => put(undefined, i, item));
    }
    return { alias: alias.aliasname, cols };
  }

  if (select["op"] !== "SETOP_NONE") return null;
  const targetList = (select["targetList"] as Node[] | undefined) ?? [];
  for (const [i, item] of targetList.entries()) {
    const rt = (item as { ResTarget?: { name?: string; val?: Node } }).ResTarget;
    if (rt?.val && (rt.val as { ColumnRef?: { fields?: Node[] } }).ColumnRef?.fields?.some(
      f => !!(f as { A_Star?: unknown }).A_Star,
    )) {
      return null; // star expansion shifts every later position
    }
    put(rt?.name, i, rt?.val);
  }
  return { alias: alias.aliasname, cols };
}

/** Every derived table among a list of from-items (including inside joins). */
function aliasContextOf(items: Node[] | undefined): AliasContext | undefined {
  if (!items?.length) return undefined;
  const ctx: AliasContext = new Map();
  const scan = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(scan);
    if (!node || typeof node !== "object") return;
    const derived = derivedTableCols(node);
    if (derived) {
      ctx.set(derived.alias, derived.cols);
      return; // one level: no nesting into the derived table itself
    }
    const je = (node as { JoinExpr?: { larg?: Node; rarg?: Node } }).JoinExpr;
    if (je) {
      scan(je.larg);
      scan(je.rarg);
    }
  };
  scan(items);
  return ctx.size ? ctx : undefined;
}

/** Value-flow (mechanism C) into a rejecting site: everything but a direct
 *  ParamRef, which its caller has already handled as A or B. */
function rejectFlow(c: Collector, expr: Node | undefined, ctx?: AliasContext): void {
  if (!expr || paramNumberOf(expr) !== null) return;
  for (const implicant of forcedNullImplicantsAnyRow(expr, c.catalog, ctx)) {
    // The empty implicant (a literal NULL reaching a rejecting site) is a
    // static always-raise, not a parameter fact: no binding avoids it, so
    // there is nothing to claim about any parameter.
    if (implicant.length === 0) continue;
    if (implicant.length === 1) reject(c, implicant[0]!, "flow");
    else c.jointRejected.push(implicant);
  }
}

function checkTypeCast(c: Collector, tc: { arg?: Node; typeName?: unknown }): void {
  if (!castTargetIsNotNullDomain(c, tc.typeName)) return;
  const num = paramNumberOf(tc.arg);
  // A direct operand is TYPED as the domain (mechanism A); an expression
  // operand stays base-typed and only its VALUE hits the coercion (C).
  if (num !== null) reject(c, num, "domain");
  else rejectFlow(c, tc.arg);
}

function checkFuncCall(
  c: Collector,
  fc: { funcname?: Node[]; args?: Node[] },
): void {
  if (!fc.args?.length) return;

  const parts = (fc.funcname ?? []).map(stringVal);
  const name = parts[parts.length - 1];
  const schema = parts.length >= 2 ? parts[parts.length - 2] : undefined;
  if (!name) return;

  // Named notation shifts positions and degrades to nullable.
  if (fc.args.some(a => !!(a as { NamedArgExpr?: unknown }).NamedArgExpr)) return;

  // One candidate: its declared types are the ones that apply. Several:
  // arity-filtered CONSENSUS — a position every remaining candidate
  // declares as a NOT NULL domain rejects NULL whichever overload
  // PostgreSQL resolves (the filter guarantees each candidate has at least
  // argCount inputs). Variadic candidates defeat positional reasoning and
  // resolveFunctionCandidates refuses them wholesale.
  const info = c.catalog.resolveFunctionMetadata(schema, name);
  const candidates = info
    ? info.args.some(a => a.mode === "variadic")
      ? []
      : [info]
    : (c.catalog.resolveFunctionCandidates(schema, name, fc.args.length) ?? []);
  if (candidates.length === 0) return;

  const inputsOf = (f: (typeof candidates)[number]) =>
    f.args.filter(a => a.mode === "in" || a.mode === "inout");

  fc.args.forEach((arg, i) => {
    const allDomain = candidates.every(f => {
      const declared = inputsOf(f)[i];
      return !!declared && c.catalog.isNotNullDomain(declared.typeOid);
    });
    if (!allDomain) return;
    const num = paramNumberOf(arg);
    if (num !== null) reject(c, num, "domain");
    else rejectFlow(c, arg);
  });
}

/**
 * Column names an INSERT with no explicit column list targets: every column
 * of the relation, in catalog order.
 */
function insertTargetColumns(
  c: Collector,
  relation: { schemaname?: string; relname?: string } | undefined,
  cols: Node[] | undefined,
): { schema: string; table: string; columns: string[] } | null {
  if (!relation?.relname) return null;
  const table = c.catalog.resolveTable(relation.schemaname, relation.relname);
  if (!table) return null;
  const columns = cols
    ? cols.map(col => (col as { ResTarget?: { name?: string } }).ResTarget?.name ?? "")
    : table.columns;
  return { schema: table.schema, table: table.name, columns };
}

/** `SET col = $n` — UPDATE, ON CONFLICT DO UPDATE, and MERGE's update arm. */
function checkSetClause(
  c: Collector,
  targetList: Node[] | undefined,
  schema: string,
  table: string,
  ctx?: AliasContext,
): void {
  for (const item of targetList ?? []) {
    const rt = (item as { ResTarget?: { name?: string; val?: Node } }).ResTarget;
    if (!rt?.name || !rt.val) continue;
    const mechanism = columnRejection(c, schema, table, rt.name, "update");
    if (!mechanism) continue;
    const num = paramNumberOf(rt.val);
    if (num !== null) reject(c, num, mechanism);
    else rejectFlow(c, rt.val, ctx);
  }
}

/**
 * The `excluded` pseudo-alias of ON CONFLICT DO UPDATE is itself a derived
 * row: `excluded.col` IS the value the INSERT proposed for `col`, so a
 * parameter there flows exactly like a source column — `SET val =
 * excluded.name` with `name` bound to `$2` rejects `$2` when `val` refuses
 * NULL. Column names arrive case-folded from the parser like every other
 * identifier, so unquoted EXCLUDED/Excluded/excluded all land here. A column
 * absent from the INSERT list takes its default and defines nothing.
 */
function excludedContext(
  target: { columns: string[] },
  select: Record<string, unknown> | undefined,
): AliasContext | undefined {
  if (!select) return undefined;
  const cols = new Map<string, Node[]>();
  const put = (index: number, expr: Node | undefined): void => {
    const column = target.columns[index];
    if (!column || !expr) return;
    const defs = cols.get(column) ?? [];
    defs.push(expr);
    cols.set(column, defs);
  };
  const valuesLists = select["valuesLists"] as Node[] | undefined;
  if (valuesLists?.length) {
    for (const row of valuesLists) {
      const items = (row as { List?: { items?: Node[] } }).List?.items ?? [];
      items.forEach((item, i) => put(i, item));
    }
  } else if (select["op"] === "SETOP_NONE") {
    const targetList = (select["targetList"] as Node[] | undefined) ?? [];
    targetList.forEach((item, i) =>
      put(i, (item as { ResTarget?: { val?: Node } }).ResTarget?.val),
    );
  }
  return cols.size ? new Map([["excluded", cols]]) : undefined;
}

function checkInsert(
  c: Collector,
  stmt: {
    relation?: { schemaname?: string; relname?: string };
    cols?: Node[];
    selectStmt?: Node;
    onConflictClause?: { targetList?: Node[] };
  },
): void {
  const target = insertTargetColumns(c, stmt.relation, stmt.cols);
  if (!target) return;

  const select = (stmt.selectStmt as { SelectStmt?: Record<string, unknown> } | undefined)
    ?.SelectStmt;
  // INSERT ... SELECT: source columns from derived tables in the select's
  // FROM attribute through to the target positions.
  const sourceCtx = aliasContextOf(select?.["fromClause"] as Node[] | undefined);

  const rejectAt = (position: number, val: Node | undefined): void => {
    const column = target.columns[position];
    if (!column || !val) return;
    const mechanism = columnRejection(c, target.schema, target.table, column, "insert");
    if (!mechanism) return;
    const num = paramNumberOf(val);
    if (num !== null) reject(c, num, mechanism);
    else rejectFlow(c, val, sourceCtx);
  };

  if (select) {
    const valuesLists = select["valuesLists"] as Node[] | undefined;
    for (const row of valuesLists ?? []) {
      const items = (row as { List?: { items?: Node[] } }).List?.items ?? [];
      items.forEach((item, i) => rejectAt(i, item));
    }
    // INSERT ... SELECT: the select list maps positionally onto the target
    // columns. Only the plain shape — a set operation underneath keeps its
    // parameters nullable.
    if (!valuesLists && select["op"] === "SETOP_NONE") {
      const targetList = (select["targetList"] as Node[] | undefined) ?? [];
      targetList.forEach((item, i) =>
        rejectAt(i, (item as { ResTarget?: { val?: Node } }).ResTarget?.val),
      );
    }
  }

  if (stmt.onConflictClause?.targetList) {
    checkSetClause(
      c,
      stmt.onConflictClause.targetList,
      target.schema,
      target.table,
      excludedContext(target, select),
    );
  }
}

function checkUpdate(
  c: Collector,
  stmt: {
    relation?: { schemaname?: string; relname?: string };
    targetList?: Node[];
    fromClause?: Node[];
  },
): void {
  if (!stmt.relation?.relname) return;
  const table = c.catalog.resolveTable(stmt.relation.schemaname, stmt.relation.relname);
  if (!table) return;
  checkSetClause(c, stmt.targetList, table.schema, table.name, aliasContextOf(stmt.fromClause));
}

function checkMerge(
  c: Collector,
  stmt: {
    relation?: { schemaname?: string; relname?: string };
    sourceRelation?: Node;
    mergeWhenClauses?: Node[];
  },
): void {
  if (!stmt.relation?.relname) return;
  const table = c.catalog.resolveTable(stmt.relation.schemaname, stmt.relation.relname);
  if (!table) return;
  const ctx = aliasContextOf(stmt.sourceRelation ? [stmt.sourceRelation] : undefined);
  for (const clause of stmt.mergeWhenClauses ?? []) {
    const mwc = (clause as { MergeWhenClause?: { targetList?: Node[]; values?: Node[] } })
      .MergeWhenClause;
    if (!mwc) continue;
    if (mwc.values) {
      // The insert arm: targetList names columns, values maps positionally.
      const columns = (mwc.targetList ?? []).map(
        t => (t as { ResTarget?: { name?: string } }).ResTarget?.name ?? "",
      );
      mwc.values.forEach((val, i) => {
        const column = columns[i];
        if (!column) return;
        const mechanism = columnRejection(c, table.schema, table.name, column, "insert");
        if (!mechanism) return;
        const num = paramNumberOf(val);
        if (num !== null) reject(c, num, mechanism);
        else rejectFlow(c, val, ctx);
      });
    } else {
      // The update arm: SET col = value pairs.
      checkSetClause(c, mwc.targetList, table.schema, table.name, ctx);
    }
  }
}

function visit(c: Collector, node: unknown): void {
  if (Array.isArray(node)) {
    for (const n of node) visit(c, n);
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;

  const num = paramNumberOf(obj);
  if (num !== null) c.seen.add(num);

  if (obj["TypeCast"]) checkTypeCast(c, obj["TypeCast"] as Parameters<typeof checkTypeCast>[1]);
  if (obj["FuncCall"]) checkFuncCall(c, obj["FuncCall"] as Parameters<typeof checkFuncCall>[1]);
  if (obj["InsertStmt"]) checkInsert(c, obj["InsertStmt"] as Parameters<typeof checkInsert>[1]);
  if (obj["UpdateStmt"]) checkUpdate(c, obj["UpdateStmt"] as Parameters<typeof checkUpdate>[1]);
  if (obj["MergeStmt"]) checkMerge(c, obj["MergeStmt"] as Parameters<typeof checkMerge>[1]);

  for (const v of Object.values(obj)) visit(c, v);
}

export interface ParamFacts {
  /** The consumer-facing contract, positional $1..$n. */
  params: ParamNullability[];
  /**
   * Minimal JOINT rejection sets, each of size ≥ 2, sorted: binding NULL to
   * EVERY member provably raises, while `params` records only the singleton
   * facts. The trichotomy per parameter: `notNull: true` — unconditionally
   * required (and by minimality NEVER a member of any set here);
   * `notNull: false` + member of a set — conditionally required, the
   * condition spelled entirely by the sets; `notNull: false` + no set —
   * unconstrained. A binding is claimed-rejected iff it violates a notNull
   * flag or fully-NULLs a set; the engine's promise stays one-directional
   * (claims mean raises; absence of a claim promises nothing).
   */
  rejectionSets: number[][];
  /**
   * Parameters rejected at Bind (mechanism A): their resolved type is a NOT
   * NULL domain, so a NULL binding raises before any execution — meaning any
   * row a statement returns proves these were non-NULL. Consumed by the
   * output walk to narrow a projected `ParamRef` to notNull. Deliberately
   * NOT the whole of `rejected`: see the field comment on `Collector`.
   */
  bindRejected: Set<number>;
}

/**
 * Collect the parameter facts of one statement. Pure over `(AST, catalog)`
 * like the output walk, and total: statements the output walk refuses still
 * have a well-defined parameter contract.
 */
export function collectParamFacts(stmt: Node, catalog: NullabilityCatalog): ParamFacts {
  const c: Collector = {
    catalog,
    seen: new Set(),
    rejected: new Set(),
    jointRejected: [],
    bindRejected: new Set(),
  };
  visit(c, stmt);
  const max = Math.max(0, ...c.seen, ...c.rejected);
  const params: ParamNullability[] = [];
  for (let number = 1; number <= max; number++) {
    params.push({ number, notNull: c.rejected.has(number) });
  }
  // A set containing an individually rejected parameter is absorbed: the
  // singleton claim already forbids every binding the set would. What
  // remains is minimized across sites (several sites can contribute the
  // same or overlapping sets).
  const rejectionSets = minimizeImplicants(
    c.jointRejected.filter(s => !s.some(p => c.rejected.has(p))),
  ).filter(s => s.length >= 2);
  return { params, rejectionSets, bindRejected: c.bindRejected };
}

/** The consumer-facing contract alone. */
export function collectParamNullability(
  stmt: Node,
  catalog: NullabilityCatalog,
): ParamNullability[] {
  return collectParamFacts(stmt, catalog).params;
}
