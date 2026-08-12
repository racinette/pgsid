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
//   D (execution-time) — a BUILTIN argument position that rejects NULL in its
//                        own C implementation, with nothing in pg_catalog
//                        saying so: `array_fill`'s dimension array, a range
//                        constructor's flags. See
//                        BUILTIN_NULL_REJECTING_ARGS below.
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
import { STRICT_OPERATORS } from "./operators.js";
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
  /**
   * Set while walking a subtree PostgreSQL provably never EXECUTES — an
   * unreferenced non-data-modifying CTE. Execution-time mechanisms (B, C,
   * the frame-offset site) contribute nothing from there, and mechanism A
   * contributes everything: it is decided by parse analysis and enforced at
   * Bind, so the binding is rejected whether or not the subtree runs
   * (measured, three shapes — see visitBindOnly).
   */
  bindOnly?: boolean;
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
  // UPDATE (and MERGE's update arm) targets the relation TREE, and the row
  // being written is checked against the flags of the relation it LIVES in
  // — a child left unconstrained by `ALTER TABLE ONLY … SET NOT NULL`
  // accepts the NULL the parent's own flag would reject (measured, both
  // states). The tree conjunction is what makes the claim witnessable in
  // EVERY data state rather than only parent-row ones; the cost is a
  // dropped claim, never a wrong one, and it closes the asymmetry with the
  // output side, which has read notNullTree since RC-3. INSERT stores its
  // rows in the named relation itself and keeps the relation's own flag
  // (routing is partitioned-only, where the flags provably agree). The
  // domain check above is untouched: a child cannot change an inherited
  // column's TYPE, so mechanism A is per-column everywhere in the tree.
  const rejects =
    command === "update"
      ? c.catalog.resolveColumnNotNullTree(schema, table, column)
      : c.catalog.resolveColumnNotNull(schema, table, column);
  if (rejects) {
    // The TREE hooks: a partition's or child's BEFORE ROW trigger rewrites
    // rows written through the parent (measured — a partition trigger
    // rescued a NULL binding routed through the parent), so the gate must
    // see the whole subtree. Conservative for an ONLY target, whose child
    // triggers cannot fire — the cost is a dropped claim there, never a
    // wrong one.
    const wr = c.catalog.resolveWriteRewritesTree(schema, table);
    // The same command crossing as the output side (updateBeforeRowHazard):
    // an UPDATE through a partitioned parent can move the row, and the
    // DESTINATION partition's BEFORE INSERT trigger was measured RESCUING a
    // NULL binding the stationary control raises on — so a partitioned
    // target's update gate asks about the insert triggers too.
    const commands =
      command === "update" && c.catalog.resolveIsPartitioned(schema, table)
        ? ["update", "insert"]
        : [command];
    if (
      commands.some(cmd => wr.beforeRow.has(cmd)) ||
      wr.insteadOf.has(command) ||
      wr.insteadRules.has(command)
    ) {
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
function reject(
  c: Collector,
  num: number,
  // `builtin-arg` is mechanism D: execution-time like `constraint` and `flow`,
  // so a never-executed subtree drops it the same way.
  mechanism: "domain" | "constraint" | "flow" | "builtin-arg",
): void {
  // In a never-executed subtree only the bind-time mechanism survives.
  if (c.bindOnly && mechanism !== "domain") return;
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
export type Implicants = number[][];

const MAX_IMPLICANT_SIZE = 4;
const MAX_JOINT_IMPLICANTS = 8;

/** Exported for the CHECK grounder (src/query/check-grounder.ts), whose
 *  FALSE-implicant algebra is this NULL-implicant algebra one level up:
 *  same minimization, same bounds, same singleton guarantee. */
export function minimizeImplicants(sets: number[][]): Implicants {
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
export function crossUnion(lists: Implicants[]): Implicants {
  if (lists.length === 0) return [];
  return lists.reduce((acc, next) => {
    if (acc.length === 0 || next.length === 0) return [];
    const out: number[][] = [];
    for (const a of acc) for (const b of next) out.push([...a, ...b]);
    return minimizeImplicants(out);
  });
}

/** Implicants of "any input NULL": concatenation, minimized. */
export function unionLists(lists: Implicants[]): Implicants {
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

/**
 * Context-free operand typing for the strictness question — the literal
 * table, cast targets, uniform ARRAY constructors and nested operators.
 * Column references need a scope this walker does not carry, and a bare
 * ParamRef needs the tier-0 input nothing threads here yet; both read
 * null, which keeps the name rule. Mirrors the walk's `operandTypeSet`
 * where context allows; drift between the two costs precision only.
 */
function contextFreeTypeSet(
  node: Node | undefined,
  catalog: NullabilityCatalog,
): string[] | null {
  if (!node || typeof node !== "object") return null;
  const n = node as Record<string, unknown>;
  const ac = n["A_Const"] as
    | { ival?: unknown; boolval?: unknown; fval?: { fval?: string } }
    | undefined;
  if (ac) {
    if ("ival" in ac) return ["integer"];
    if ("boolval" in ac) return ["boolean"];
    if ("fval" in ac) {
      const digits = ac.fval?.fval ?? "";
      return /^[0-9]+$/.test(digits) &&
        (digits.length < 19 || (digits.length === 19 && digits <= "9223372036854775807"))
        ? ["bigint"]
        : ["numeric"];
    }
    return null;
  }
  const tc = n["TypeCast"] as
    | { typeName?: { names?: Node[]; arrayBounds?: unknown[] } }
    | undefined;
  if (tc) {
    const parts = (tc.typeName?.names ?? [])
      .map(stringVal)
      .filter(p => !!p && p !== "pg_catalog");
    if (!parts.length) return null;
    return [parts.join(".") + (tc.typeName?.arrayBounds?.length ? "[]" : "")];
  }
  const arr = n["A_ArrayExpr"] as { elements?: Node[] } | undefined;
  if (arr) {
    // The trivial common type only: every element the SAME singleton. The
    // full promotion rules stay a declined non-goal.
    const els = (arr.elements ?? []).map(e => contextFreeTypeSet(e, catalog));
    if (els.length > 0 && els.every(e => e !== null && e.length === 1 && e[0] === els[0]![0])) {
      return [`${els[0]![0]}[]`];
    }
    return null;
  }
  const ae = n["A_Expr"] as
    | { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node }
    | undefined;
  if (ae && (ae.kind === undefined || ae.kind === "AEXPR_OP")) {
    const parts = (ae.name ?? []).map(stringVal);
    const op = parts[parts.length - 1] ?? "";
    const schema = parts.length >= 2 ? parts[parts.length - 2] : undefined;
    if (ae.lexpr && ae.rexpr) {
      const r = catalog.resolveOperatorTotality(
        schema, op,
        contextFreeTypeSet(ae.lexpr, catalog),
        contextFreeTypeSet(ae.rexpr, catalog),
      );
      return r.kind === "unknown" ? null : r.returns;
    }
    if (!ae.lexpr && ae.rexpr) {
      const r = catalog.resolveUnaryOperatorTotality(
        schema, op, contextFreeTypeSet(ae.rexpr, catalog),
      );
      return r.kind === "unknown" ? null : r.returns;
    }
  }
  return null;
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
    // Typed first: SOME-quantified strictness over the merged candidate
    // set — over-reporting only over-tightens a parameter, so falling back
    // to the bare-name rule (with its recorded `||` over-report) stays this
    // consumer's safe error where nothing types. The array `||` rows are
    // non-strict, so `ARRAY[1,2] || $1` now correctly declines to
    // attribute.
    const typedStrict = catalog.resolveOperatorStrictnessSome(
      schema, op,
      contextFreeTypeSet(ae.lexpr, catalog),
      contextFreeTypeSet(ae.rexpr, catalog),
    );
    const strict =
      typedStrict !== null
        ? typedStrict
        : (parts.length === 1 && STRICT_OPERATORS.has(op)) ||
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
  // Value flow is evaluated, so a never-executed subtree flows nothing.
  if (c.bindOnly) return;
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

/**
 * Mechanism D: BUILTIN argument positions that reject NULL, by name → arity →
 * 1-based positions.
 *
 * **Why this is a table, and why the table is safe.** The rejection lives in
 * the function's C implementation and pg_catalog records nothing about it.
 * Strictness cannot express it — a strict function returns NULL rather than
 * raising, so the entire class sits inside the NON-strict set — which is the
 * same shape as totality, and totality's tables are the ones that drifted
 * three times in this project's history. What makes this one different is that
 * it is cheaply DECIDABLE BY EXECUTION: call the function with NULL in one
 * position and again with a value, and the pair answers exactly.
 *
 * So `builtin-null-rejection.test.ts` does not check this table, it DERIVES
 * the class — probing every non-strict pg_catalog function, every position,
 * each with its own control — and asserts the derived set EQUALS what is
 * written here. A PostgreSQL upgrade that adds, removes or moves a rejection
 * fails that test with the diff. The table is a cache of a measurement, not a
 * hand-curated list, and the thing `docs/generated-surface.md` warns about
 * cannot happen to it silently.
 *
 * Arity is part of the key because the signatures differ: `array_fill` rejects
 * NULL at position 2 in its two-argument form and at 2 and 3 in its
 * three-argument one.
 *
 * The contract reason this exists at all: a user function's body is not its
 * interface and the engine claims nothing about it, but a BUILTIN's behaviour
 * is documented and knowable, so a rejection it performs is one the engine
 * owes a claim for (`docs/argument-nullability.md`, "What a nullable parameter
 * does not promise"). Sweep-4 finding 8.
 */
export const BUILTIN_NULL_REJECTING_ARGS: ReadonlyMap<
  string,
  ReadonlyMap<number, readonly number[]>
> = new Map([
  // "dimension array or low bound array cannot be null"
  ["array_fill", new Map([[2, [2]], [3, [2, 3]]])],
  // "initial position must not be null" — the three-argument form only; the
  // two-argument one has no such position.
  ["array_position", new Map([[3, [3]]])],
  // "range constructor flags argument must not be null" — the same third
  // argument across every range type's three-argument constructor.
  ["daterange", new Map([[3, [3]]])],
  ["int4range", new Map([[3, [3]]])],
  ["int8range", new Map([[3, [3]]])],
  ["numrange", new Map([[3, [3]]])],
  ["tsrange", new Map([[3, [3]]])],
  ["tstzrange", new Map([[3, [3]]])],
  // "null_value_treatment must be \"delete_key\", \"return_target\",
  // \"use_json_null\", or \"raise_exception\"" — NULL is not one of them.
  ["jsonb_set_lax", new Map([[5, [5]]])],
]);

/**
 * The same mechanism one level IN: array-typed builtin positions that reject a
 * NULL ELEMENT, which is a DIFFERENT rejection from a NULL argument and does
 * not follow from it either way.
 *
 * `array_fill(1, ARRAY[NULL])` raises "dimension values cannot be null" where
 * `array_fill(1, NULL)` raises "dimension array or low bound array cannot be
 * null" — two messages, two checks. And the two sets only overlap: a NULL path
 * ARRAY is fine for `jsonb_set_lax` while a NULL path ELEMENT is not ("path
 * element at position 1 is null"), so neither table implies the other.
 *
 * Derived by the same execution probe over the array-typed positions of every
 * non-strict pg_catalog function, and asserted equal to it, so this is a cache
 * of a measurement like its sibling above.
 *
 * The rule reaches only an ARRAY CONSTRUCTOR at such a position, because that
 * is where elements are visible as expressions. `$1::integer[]` bound to an
 * array containing NULL is the same rejection and cannot be claimed — the
 * parameter is the whole array, and its being non-null says nothing about what
 * is inside it.
 */
export const BUILTIN_NULL_REJECTING_ARRAY_ELEMENTS: ReadonlyMap<
  string,
  ReadonlyMap<number, readonly number[]>
> = new Map([
  // "dimension values cannot be null"
  ["array_fill", new Map([[2, [2]], [3, [2, 3]]])],
  // "path element at position N is null" — and note the whole-argument table
  // does NOT carry this position, which is the point of having two.
  ["jsonb_set_lax", new Map([[5, [2]]])],
]);

/**
 * Mechanism D's rejecting positions for this call, or null when the name is
 * not a builtin in the table at this arity.
 *
 * A USER function of the same name is not one of these, whatever it does: the
 * table describes pg_catalog's implementations, and the engine makes no claim
 * about a user body. An explicit schema qualifier other than `pg_catalog`
 * says so outright; otherwise the catalog is asked whether it carries the
 * name.
 */
function builtinRejectingPositions(
  c: Collector,
  table: ReadonlyMap<string, ReadonlyMap<number, readonly number[]>>,
  schema: string | undefined,
  name: string,
  argCount: number,
): readonly number[] | null {
  if (schema !== undefined && schema !== "pg_catalog") return null;
  const byArity = table.get(name);
  if (!byArity) return null;
  if (c.catalog.resolveFunctionMetadata(schema, name)) return null;
  if ((c.catalog.resolveFunctionCandidates(schema, name, argCount) ?? []).length > 0) return null;
  return byArity.get(argCount) ?? null;
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

  // Mechanism D, before the declared-type reading below: these positions are
  // rejected by the implementation rather than by a domain, so nothing in the
  // candidates' declared types would show it.
  const argCount = fc.args.length;
  const rejecting = builtinRejectingPositions(
    c, BUILTIN_NULL_REJECTING_ARGS, schema, name, argCount,
  );
  for (const position of rejecting ?? []) {
    const arg = fc.args[position - 1];
    if (!arg) continue;
    const num = paramNumberOf(arg);
    if (num !== null) reject(c, num, "builtin-arg");
    else rejectFlow(c, arg);
  }

  // The same one level in. Only an ARRAY CONSTRUCTOR exposes its elements as
  // expressions; any other spelling hands over an array whose contents the
  // walk cannot see, and a claim there would be about the binding's VALUE
  // rather than its nullness.
  const rejectingElements = builtinRejectingPositions(
    c, BUILTIN_NULL_REJECTING_ARRAY_ELEMENTS, schema, name, argCount,
  );
  for (const position of rejectingElements ?? []) {
    const arg = fc.args[position - 1] as { A_ArrayExpr?: { elements?: Node[] } } | undefined;
    for (const element of arg?.A_ArrayExpr?.elements ?? []) {
      const num = paramNumberOf(element);
      if (num !== null) reject(c, num, "builtin-arg");
      else rejectFlow(c, element);
    }
  }

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

/**
 * The expression a multi-assignment routes into ONE target column: `SET
 * (a, b) = (SELECT e1, e2)` and `SET (a, b) = ROW(e1, e2)` both parse as a
 * MultiAssignRef per target, pointing into a shared source by position.
 *
 * Only the ALWAYS-EVALUATED shapes attribute — a row constructor, or a
 * subselect with no FROM and no set operation, whose single row is
 * constructed exactly once (the same footing the VALUES-row measurement
 * gave mechanism B). A sourced subselect can return zero rows, and
 * PostgreSQL then assigns NULLs the CONTROL binding also produces — nothing
 * there is evidence about a parameter, so nothing is claimed.
 */
function multiAssignDefinition(val: Node): Node | null {
  const mar = (val as { MultiAssignRef?: { source?: Node; colno?: number } }).MultiAssignRef;
  if (!mar?.source || !mar.colno) return null;
  const sub = (mar.source as { SubLink?: { subLinkType?: string; subselect?: Node } }).SubLink;
  if (sub) {
    if (sub.subLinkType !== "EXPR_SUBLINK" || !sub.subselect) return null;
    const sel = (sub.subselect as { SelectStmt?: Record<string, unknown> }).SelectStmt;
    if (!sel || sel["op"] !== "SETOP_NONE" || sel["fromClause"] || sel["valuesLists"]) return null;
    const tl = (sel["targetList"] as Node[] | undefined) ?? [];
    return (tl[mar.colno - 1] as { ResTarget?: { val?: Node } } | undefined)?.ResTarget?.val ?? null;
  }
  const row = (mar.source as { RowExpr?: { args?: Node[] } }).RowExpr;
  return row?.args?.[mar.colno - 1] ?? null;
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
    const def = multiAssignDefinition(rt.val);
    if (def) {
      // Through a multi-assignment the parameter is typed by its own use
      // inside the source (a cast, usually), NOT by the target column — so
      // even a NOT NULL domain column rejects at the runtime coercion of
      // the assignment, never at Bind, and the verdict is downgraded to the
      // execution-time mechanism that licenses no narrowing. This was the
      // discovery instrument's first parameter conviction: the collector
      // previously attributed nothing through MultiAssignRef, and binding
      // NULL to a claimed-nullable parameter raised.
      const m = mechanism === "domain" ? "constraint" : mechanism;
      const num = paramNumberOf(def);
      if (num !== null) reject(c, num, m);
      else rejectFlow(c, def, ctx);
      continue;
    }
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

/**
 * A window frame OFFSET is a rejection site of its own (mechanism B's
 * fourth sibling): PostgreSQL raises `frame starting/ending offset must
 * not be null` for a NULL bound — for ROWS, RANGE and GROUPS, in both
 * directions, and even over empty input (all measured). Still
 * execution-time like mechanism B — a subquery that never runs never
 * evaluates its frame — so it rejects without licensing output narrowing.
 * The sibling placement, LIMIT/OFFSET, takes NULL legally and is pinned in
 * the register; a frame bound reads like the same shape and behaves
 * oppositely. WindowDef appears both as FuncCall.over and in the
 * windowClause (named windows), and the generic recursion reaches both.
 */
function checkWindowDef(
  c: Collector,
  wd: { startOffset?: Node; endOffset?: Node },
): void {
  for (const offset of [wd.startOffset, wd.endOffset]) {
    if (!offset) continue;
    const num = paramNumberOf(offset);
    if (num !== null) reject(c, num, "constraint");
    else rejectFlow(c, offset);
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
  if (obj["FuncCall"]) {
    checkFuncCall(c, obj["FuncCall"] as Parameters<typeof checkFuncCall>[1]);
    // `over` is a concrete struct field (`WindowDef *over`), so libpg-query
    // emits it UNWRAPPED — the discriminator branch below never sees it.
    // Named windows in the windowClause DO arrive wrapped.
    const over = (obj["FuncCall"] as { over?: Parameters<typeof checkWindowDef>[1] }).over;
    if (over) checkWindowDef(c, over);
  }
  if (obj["InsertStmt"]) checkInsert(c, obj["InsertStmt"] as Parameters<typeof checkInsert>[1]);
  if (obj["UpdateStmt"]) checkUpdate(c, obj["UpdateStmt"] as Parameters<typeof checkUpdate>[1]);
  if (obj["MergeStmt"]) checkMerge(c, obj["MergeStmt"] as Parameters<typeof checkMerge>[1]);
  if (obj["WindowDef"]) checkWindowDef(c, obj["WindowDef"] as Parameters<typeof checkWindowDef>[1]);

  // A non-data-modifying CTE nobody references is never executed — in any
  // data state (measured: the frame-offset site inside one accepts the NULL
  // binding its referenced control raises on) — so its EXECUTION-TIME
  // rejection sites contribute nothing, while its bind-time ones contribute
  // as they always did and its ParamRefs still count for numbering (see
  // visitBindOnly). This is the NARROW reading of reachability; the general
  // question (any provably-dead subtree falsifies an execution-time claim)
  // is recorded in docs/argument-nullability.md beside the claim semantics.
  for (const key of ["SelectStmt", "InsertStmt", "UpdateStmt", "DeleteStmt", "MergeStmt"]) {
    const stmtNode = obj[key] as { withClause?: { ctes?: unknown[] } } | undefined;
    if (stmtNode?.withClause?.ctes?.length) {
      visitStatementWithCtes(c, stmtNode);
      return;
    }
  }

  for (const v of Object.values(obj)) visit(c, v);
}

/**
 * Custom recursion for a statement carrying a WITH clause: the statement
 * body and every REFERENCED or DATA-MODIFYING CTE walk normally, while an
 * unreferenced SELECT CTE contributes only its parameter NUMBERS and its
 * bind-time facts.
 * References are name-level RangeVar matches, closed transitively (a
 * referenced CTE's body can reference an earlier one) — over-approximation
 * (a same-named table, WITH-in-branch shadowing) merely keeps the old
 * behaviour for that CTE, which only ever ADDS a claim the oracle checks.
 */
function visitStatementWithCtes(
  c: Collector,
  stmt: { withClause?: { ctes?: unknown[] } },
): void {
  interface CteItem {
    name: string;
    node: unknown;
    body: unknown;
    dml: boolean;
  }
  const list: CteItem[] = (stmt.withClause?.ctes ?? []).map(n => {
    const cte = (n as { CommonTableExpr?: { ctename?: string; ctequery?: unknown } })
      .CommonTableExpr;
    const body = cte?.ctequery as Record<string, unknown> | undefined;
    return {
      name: cte?.ctename ?? "",
      node: n,
      body,
      dml:
        !!body &&
        ("InsertStmt" in body || "UpdateStmt" in body || "DeleteStmt" in body ||
          "MergeStmt" in body),
    };
  });

  const { withClause: _withClause, ...rest } = stmt as Record<string, unknown>;
  const referenced = new Set<string>();
  collectRangeVarNames(rest, referenced);
  let grew = true;
  while (grew) {
    grew = false;
    for (const cte of list) {
      if (!cte.dml && !referenced.has(cte.name)) continue;
      const before = referenced.size;
      collectRangeVarNames(cte.body, referenced);
      if (referenced.size > before) grew = true;
    }
  }

  for (const cte of list) {
    if (cte.dml || referenced.has(cte.name)) visit(c, cte.node);
    else visitBindOnly(c, cte.node);
  }
  visit(c, rest);
}

/** Every RangeVar relname under `node` — the reference set for the CTE gate. */
function collectRangeVarNames(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const n of node) collectRangeVarNames(n, out);
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const rv = obj["RangeVar"] as { relname?: string } | undefined;
  if (rv?.relname) out.add(rv.relname);
  for (const v of Object.values(obj)) collectRangeVarNames(v, out);
}

/**
 * The walk for a subtree that is never executed: parameter NUMBERS — an
 * unexecuted subtree still owns its `$n`s — and BIND-TIME facts, nothing
 * else.
 *
 * The gate this serves rests on "a non-data-modifying CTE nobody references
 * is never executed in ANY state", which is true (re-measured, including for
 * MATERIALIZED). It licenses dropping the EXECUTION-TIME mechanisms, and the
 * first version dropped all four by gating the WALK rather than the
 * MECHANISMS (adversarial-3 finding 8). Mechanism A is not execution-time:
 * parse analysis types the parameter from the cast or the argument position
 * it sits in, and Bind rejects a NULL before anything runs — measured inside
 * an unreferenced CTE for both A sites, plain and `NOT MATERIALIZED` and one
 * referenced only from another unreferenced CTE, while the frame-offset site
 * (B) and a value-flow cast (C) in the same position both accept the NULL.
 * So the walk runs in full and `reject`/`rejectFlow` do the gating.
 */
function visitBindOnly(c: Collector, node: unknown): void {
  const saved = c.bindOnly;
  c.bindOnly = true;
  try {
    visit(c, node);
  } finally {
    c.bindOnly = saved;
  }
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
 * Mechanism E's claims, computed by the CHECK grounder and consumed here as
 * DATA — the same one-async-step-then-sync shape as the statement map
 * (docs/subtree-evaluation.md). Execution-time by construction: members
 * land in `rejected`/`jointRejected` and NEVER in `bindRejected`, so an
 * E-claim can never license output narrowing.
 */
export interface MechanismEClaims {
  rejected: ReadonlySet<number>;
  joint: readonly (readonly number[])[];
}

/**
 * Collect the parameter facts of one statement. Pure over `(AST, catalog)`
 * like the output walk, and total: statements the output walk refuses still
 * have a well-defined parameter contract.
 */
export function collectParamFacts(
  stmt: Node,
  catalog: NullabilityCatalog,
  mechanismE?: MechanismEClaims,
): ParamFacts {
  const c: Collector = {
    catalog,
    seen: new Set(),
    rejected: new Set(),
    jointRejected: [],
    bindRejected: new Set(),
  };
  visit(c, stmt);
  if (mechanismE) {
    for (const num of mechanismE.rejected) c.rejected.add(num);
    for (const set of mechanismE.joint) c.jointRejected.push([...set]);
  }
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
