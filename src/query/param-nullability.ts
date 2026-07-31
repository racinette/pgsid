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
 */
function columnRejection(
  c: Collector,
  schema: string,
  table: string,
  column: string,
): "domain" | "constraint" | null {
  const typeOid = c.catalog.resolveColumnTypeOid(schema, table, column);
  if (typeOid !== null && c.catalog.isNotNullDomain(typeOid)) return "domain";
  if (c.catalog.resolveColumnNotNull(schema, table, column)) return "constraint";
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
 * Mechanism-C attribution: which parameters, when bound NULL, force this
 * expression to evaluate NULL? Only guaranteed propagation counts — strict
 * operators and functions propagate any NULL operand; NULLIF propagates its
 * LEFT operand only (a NULL right side just fails the equality); COALESCE is
 * NULL only when every branch is (intersection); a cast passes its operand's
 * set through (a NOT NULL domain cast in the middle raises even earlier,
 * which serves the same claim). Everything unrecognised contributes nothing —
 * an unattributed parameter stays nullable, and the falsification oracle is
 * what keeps that honest.
 */
function forcedNullParams(c: Collector, node: Node | undefined): Set<number> {
  const empty = new Set<number>();
  if (!node || typeof node !== "object") return empty;
  const n = node as Record<string, unknown>;

  const direct = paramNumberOf(n);
  if (direct !== null) return new Set([direct]);

  if (n["TypeCast"]) {
    return forcedNullParams(c, (n["TypeCast"] as { arg?: Node }).arg);
  }

  if (n["A_Expr"]) {
    const ae = n["A_Expr"] as { kind?: string; name?: Node[]; lexpr?: Node; rexpr?: Node };
    if (ae.kind === "AEXPR_NULLIF") return forcedNullParams(c, ae.lexpr);
    const op = ae.name?.length === 1 ? stringVal(ae.name[0]) : "";
    if (ae.kind === "AEXPR_OP" && TOTAL_STRICT_OPERATORS.has(op)) {
      const out = new Set<number>();
      for (const operand of [ae.lexpr, ae.rexpr]) {
        for (const num of forcedNullParams(c, operand)) out.add(num);
      }
      return out;
    }
    return empty;
  }

  if (n["CoalesceExpr"]) {
    const args = (n["CoalesceExpr"] as { args?: Node[] }).args ?? [];
    if (args.length === 0) return empty;
    return args
      .map(a => forcedNullParams(c, a))
      .reduce((acc, s) => new Set([...acc].filter(x => s.has(x))));
  }

  if (n["FuncCall"]) {
    const fc = n["FuncCall"] as { funcname?: Node[]; args?: Node[] };
    const parts = (fc.funcname ?? []).map(stringVal);
    const name = parts[parts.length - 1];
    const schema = parts.length >= 2 ? parts[parts.length - 2] : undefined;
    if (!name) return empty;
    const info = c.catalog.resolveFunctionMetadata(schema, name);
    if (!info?.strict || info.isAggregate) return empty;
    const out = new Set<number>();
    for (const arg of fc.args ?? []) {
      if ((arg as { NamedArgExpr?: unknown }).NamedArgExpr) return empty;
      for (const num of forcedNullParams(c, arg)) out.add(num);
    }
    return out;
  }

  return empty;
}

/** Value-flow (mechanism C) into a rejecting site: everything but a direct
 *  ParamRef, which its caller has already handled as A or B. */
function rejectFlow(c: Collector, expr: Node | undefined): void {
  if (!expr || paramNumberOf(expr) !== null) return;
  for (const num of forcedNullParams(c, expr)) reject(c, num, "flow");
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
  // Single-overload-only, like the output walk: with one candidate,
  // PostgreSQL either executes it or rejects the call, so the declared types
  // consulted here are the ones that apply. Ambiguous names return null and
  // every argument stays nullable.
  const info = c.catalog.resolveFunctionMetadata(schema, name);
  if (!info) return;

  // Positional mapping onto declared input arguments. Named notation shifts
  // positions, and a variadic parameter absorbs arbitrarily many call
  // arguments — both degrade to nullable.
  if (fc.args.some(a => !!(a as { NamedArgExpr?: unknown }).NamedArgExpr)) return;
  const inputs = info.args.filter(a => a.mode === "in" || a.mode === "inout");
  if (info.args.some(a => a.mode === "variadic")) return;

  fc.args.forEach((arg, i) => {
    const declared = inputs[i];
    if (!declared || !c.catalog.isNotNullDomain(declared.typeOid)) return;
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
): void {
  for (const item of targetList ?? []) {
    const rt = (item as { ResTarget?: { name?: string; val?: Node } }).ResTarget;
    if (!rt?.name || !rt.val) continue;
    const mechanism = columnRejection(c, schema, table, rt.name);
    if (!mechanism) continue;
    const num = paramNumberOf(rt.val);
    if (num !== null) reject(c, num, mechanism);
    else rejectFlow(c, rt.val);
  }
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

  const rejectAt = (position: number, val: Node | undefined): void => {
    const column = target.columns[position];
    if (!column || !val) return;
    const mechanism = columnRejection(c, target.schema, target.table, column);
    if (!mechanism) return;
    const num = paramNumberOf(val);
    if (num !== null) reject(c, num, mechanism);
    else rejectFlow(c, val);
  };

  const select = (stmt.selectStmt as { SelectStmt?: Record<string, unknown> } | undefined)
    ?.SelectStmt;
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
    checkSetClause(c, stmt.onConflictClause.targetList, target.schema, target.table);
  }
}

function checkUpdate(
  c: Collector,
  stmt: { relation?: { schemaname?: string; relname?: string }; targetList?: Node[] },
): void {
  if (!stmt.relation?.relname) return;
  const table = c.catalog.resolveTable(stmt.relation.schemaname, stmt.relation.relname);
  if (!table) return;
  checkSetClause(c, stmt.targetList, table.schema, table.name);
}

function checkMerge(
  c: Collector,
  stmt: { relation?: { schemaname?: string; relname?: string }; mergeWhenClauses?: Node[] },
): void {
  if (!stmt.relation?.relname) return;
  const table = c.catalog.resolveTable(stmt.relation.schemaname, stmt.relation.relname);
  if (!table) return;
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
        const mechanism = columnRejection(c, table.schema, table.name, column);
        if (!mechanism) return;
        const num = paramNumberOf(val);
        if (num !== null) reject(c, num, mechanism);
        else rejectFlow(c, val);
      });
    } else {
      // The update arm: SET col = value pairs.
      checkSetClause(c, mwc.targetList, table.schema, table.name);
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
    bindRejected: new Set(),
  };
  visit(c, stmt);
  const max = Math.max(0, ...c.seen, ...c.rejected);
  const params: ParamNullability[] = [];
  for (let number = 1; number <= max; number++) {
    params.push({ number, notNull: c.rejected.has(number) });
  }
  return { params, bindRejected: c.bindRejected };
}

/** The consumer-facing contract alone. */
export function collectParamNullability(
  stmt: Node,
  catalog: NullabilityCatalog,
): ParamNullability[] {
  return collectParamFacts(stmt, catalog).params;
}
