import { deparseSync } from "pgsql-deparser";
import type { Node } from "libpg-query";
import type { ResolveColumnTypes, TypeSetAudit } from "./types.js";

// ---------------------------------------------------------------------------
// Type-resolution delegation, Route A (docs/type-resolution-delegation.md).
//
// `operandTypeSet` answers "what could this expression be" as a SET, because
// it does not implement PostgreSQL's preferred-type tiebreak — a declared
// non-goal (docs/type-aware-overloads.md). Where PostgreSQL has one answer,
// this asks for it instead of reimplementing the rule that produces it.
//
// The method: take an expression the walk could not pin, replace every column
// reference inside it with `$n::TYPE` at the type the walk ALREADY read for
// that column, deparse the result alone, and run it through parse analysis.
// The answer is the resolved type of the one output column.
//
// SUBSTITUTION, NOT EXTRACTION, is the whole point. A subexpression lifted
// out of its statement and asked about bare gives the WRONG answer whenever
// an operand's type comes from its neighbours: `'2020-01-01'` standalone is
// `text`, and in `t.d = '2020-01-01'` it is a date. Pinning the sibling
// rebuilds exactly as much context as the question needs, and the literal
// stays a literal so PostgreSQL resolves it the way it really would.
//
// This module reaches no database and holds no scope. It consumes the walk's
// OWN readings — so a substituted operand is never a second opinion about
// that operand — and returns answers as data, keyed by node identity.
// ---------------------------------------------------------------------------

/**
 * Node kinds whose type is determined from OUTSIDE them, and which therefore
 * may never be delegated no matter how confidently PostgreSQL answers.
 *
 * `A_Const`: an unknown literal IS `unknown` in PostgreSQL too, and typing it
 * `text` eliminates the operator its real context would have picked.
 * `A_ArrayExpr`: `ARRAY['a','b']` probes as `text[]` and `ARRAY[NULL,NULL]`
 * likewise; both are the same mistake one level up.
 * `ParamRef`: PostgreSQL GUESSES (a bare `$1` came back `text`, measured).
 * The engine's declared `paramTypes`, or a function body's `argTypes`, is the
 * contract and always wins.
 */
const NEVER_DELEGATED = new Set(["A_Const", "A_ArrayExpr", "ParamRef"]);

/**
 * Node kinds that carry their own NAME RESOLUTION, which a substitution must
 * never reach inside, and which nothing here can pin from the outside.
 *
 * A `SubLink` holds a whole SELECT with its own FROM. Rewriting the columns
 * in `(SELECT max(m2.i) FROM m AS m2)` to parameters yields
 * `(SELECT max($1::integer) FROM m AS m2)` — which PostgreSQL answers
 * happily, and which is a different expression. Measured 2026-08-24, a
 * collector that descended into them answered 5 of 10; all five were arrived
 * at by a route that cannot be defended, so this refuses instead and the
 * enclosing expression falls to the symbolic union.
 */
const OPAQUE = new Set(["SubLink"]);

/**
 * Node kinds a substitution may REPLACE, given a type the walk already read.
 *
 * `ParamRef` belongs here and not in the refusals, and the distinction is the
 * one `NEVER_DELEGATED` draws: this never ASKS PostgreSQL what a parameter
 * is — it uses the type the engine DECLARED for it. A declared `$1::numeric`
 * pins its neighbours exactly as a column's catalog type does, and a
 * parameter with no declared type has no singleton reading, so it refuses on
 * the ordinary path.
 */
const SUBSTITUTABLE = new Set(["ColumnRef", "ParamRef"]);

const kindOf = (node: unknown): string => Object.keys((node ?? {}) as object)[0] ?? "?";

/** One expression rendered as SQL the way the walk's own audit renders it. */
export function delegationSql(expr: unknown): string | null {
  try {
    return deparseSync({
      SelectStmt: { targetList: [{ ResTarget: { val: expr as never } }], op: "SETOP_NONE" },
    } as never)
      .replace(/^SELECT\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return null;
  }
}

/**
 * Every substitutable leaf in a subtree, plus whether the subtree holds a
 * node no substitution may cross. Does not descend into a leaf, nor into an
 * `OPAQUE` node — whose interior belongs to another scope.
 */
function scan(node: unknown, leaves: unknown[]): { blocked: boolean } {
  if (node === null || typeof node !== "object") return { blocked: false };
  if (Array.isArray(node)) {
    let blocked = false;
    for (const child of node) blocked = scan(child, leaves).blocked || blocked;
    return { blocked };
  }
  const rec = node as Record<string, unknown>;
  const kind = kindOf(node);
  if (SUBSTITUTABLE.has(kind)) {
    leaves.push(node);
    return { blocked: false };
  }
  if (OPAQUE.has(kind)) return { blocked: true };
  let blocked = false;
  for (const value of Object.values(rec)) blocked = scan(value, leaves).blocked || blocked;
  return { blocked };
}

/** Deep clone, swapping any node present in `swap` by IDENTITY. */
function rewrite(node: unknown, swap: Map<unknown, unknown>): unknown {
  if (swap.has(node)) return swap.get(node);
  if (node === null || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(child => rewrite(child, swap));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) out[k] = rewrite(v, swap);
  return out;
}

/**
 * The AST for `$n::type`, spelled by hand rather than parsed — this module is
 * synchronous up to the callback, and `parseSql` is not.
 */
function paramCast(n: number, type: string): Node {
  const array = type.endsWith("[]");
  const bare = array ? type.slice(0, -2) : type;
  return {
    TypeCast: {
      arg: { ParamRef: { number: n } },
      typeName: {
        names: bare.split(".").map(part => ({ String: { sval: part } })),
        ...(array ? { arrayBounds: [{ Integer: { ival: -1 } }] } : {}),
        typemod: -1,
      },
    },
  } as unknown as Node;
}

/**
 * Every name a FROM item binds in the statement, with how many times. Route B
 * probes at the TOP level, so an alias bound twice is one this cannot ask
 * about: the probe would resolve against whichever binding is visible there,
 * and nothing in the answer records which one the walk meant.
 */
function aliasBindings(node: unknown, out: Map<string, number>): void {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) aliasBindings(child, out);
    return;
  }
  const rec = node as Record<string, unknown>;
  const bind = (name: unknown): void => {
    if (typeof name === "string") out.set(name, (out.get(name) ?? 0) + 1);
  };
  const aliasOf = (n: unknown): unknown =>
    ((n as Record<string, unknown> | undefined)?.["alias"] as Record<string, unknown> | undefined)?.[
      "aliasname"
    ];
  const rv = rec["RangeVar"] as Record<string, unknown> | undefined;
  if (rv?.["relname"]) bind(aliasOf(rv) ?? rv["relname"]);
  for (const key of ["RangeSubselect", "RangeFunction", "RangeTableFunc", "RangeTableSample"]) {
    if (rec[key]) bind(aliasOf(rec[key]));
  }
  const cte = rec["CommonTableExpr"] as Record<string, unknown> | undefined;
  if (cte) bind(cte["ctename"]);
  for (const value of Object.values(rec)) aliasBindings(value, out);
}

/**
 * The statement's own output list and how to replace it, or null when there
 * is none a probe may join: a top-level set operation has no `targetList` of
 * its own (Stage 3's subject), and a DML statement without RETURNING returns
 * nothing to extend.
 */
function outputList(
  stmt: unknown,
): { list: unknown[]; replace: (list: unknown[]) => unknown } | null {
  const rec = stmt as Record<string, unknown>;
  const sel = rec["SelectStmt"] as Record<string, unknown> | undefined;
  if (sel) {
    const op = sel["op"] as string | undefined;
    if (!Array.isArray(sel["targetList"]) || (op && op !== "SETOP_NONE")) return null;
    return {
      list: sel["targetList"] as unknown[],
      replace: list => ({ SelectStmt: { ...sel, targetList: list } }),
    };
  }
  for (const key of ["InsertStmt", "UpdateStmt", "DeleteStmt", "MergeStmt"]) {
    const s = rec[key] as Record<string, unknown> | undefined;
    if (Array.isArray(s?.["returningList"])) {
      return {
        list: s!["returningList"] as unknown[],
        replace: list => ({ [key]: { ...s, returningList: list } }),
      };
    }
  }
  return null;
}

/** A whole statement rendered back to SQL, or null when it will not render. */
function statementSql(stmt: unknown): string | null {
  try {
    return deparseSync(stmt as never);
  } catch {
    return null;
  }
}

/**
 * Route B: ask about a derived column by making it an OUTPUT of the statement.
 *
 * `PREPARE` reports the type of every output column and nothing else, so an
 * expression buried in a FROM item is invisible to it. Splicing the reference
 * into the statement's own output list is what brings it into view, and
 * PostgreSQL then resolves it against the real scope — no reimplementation of
 * name resolution, and no need to know which scope owns it. A probe it
 * rejects is an ordinary refusal.
 *
 * Two things make the position mapping safe rather than assumed. The answers
 * are read from the END of the list, so a `SELECT *` ahead of them cannot
 * shift anything; and the UNPROBED statement is prepared first, so a batch
 * whose result count did not grow by exactly the number of probes is thrown
 * away rather than mapped. A batch that fails is retried one probe at a time.
 */
async function routeB(
  stmt: Node,
  residue: readonly { node: unknown; text: string }[],
  resolve: ResolveColumnTypes,
): Promise<Map<string, string>> {
  const answers = new Map<string, string>();
  const out = outputList(stmt);
  if (!out || residue.length === 0) return answers;

  const baseSql = statementSql(stmt);
  if (baseSql === null) return answers;
  let baseline: string[];
  try {
    baseline = await resolve(baseSql);
  } catch {
    return answers;
  }
  if (baseline.length === 0) return answers; // the statement itself will not prepare

  const ask = async (batch: readonly { node: unknown; text: string }[]): Promise<boolean> => {
    const probed = out.replace([...out.list, ...batch.map(p => ({ ResTarget: { val: p.node } }))]);
    const sql = statementSql(probed);
    if (sql === null) return false;
    let types: string[];
    try {
      types = await resolve(sql);
    } catch {
      return false;
    }
    if (types.length !== baseline.length + batch.length) return false;
    batch.forEach((p, i) => answers.set(p.text, types[baseline.length + i]!));
    return true;
  };

  if (!(await ask(residue))) {
    for (const one of residue) await ask([one]);
  }
  return answers;
}

/**
 * Ask PostgreSQL to resolve the expressions the walk could not pin.
 *
 * `readings` is the walk's own audit from a preliminary pass: every operand
 * it looked at, with the set it read. Singleton readings are what makes a
 * substitution possible, and residue readings (no claim, or a union wider
 * than one) are what the delegation is for.
 *
 * Returns the resolved type per node, keyed by IDENTITY — the same node
 * objects the walk will visit again on the real pass. Nodes absent from the
 * map keep the symbolic answer, which is every node this refuses.
 */
export async function resolveDelegatedTypes(
  stmt: Node,
  readings: readonly TypeSetAudit[],
  resolve: ResolveColumnTypes,
): Promise<Map<unknown, string>> {
  // What the walk pinned exactly, by rendered SQL. Keyed by text rather than
  // identity on purpose: the same column reference appears as many distinct
  // nodes across a statement, and they are the same question.
  const pinned = new Map<string, string>();
  for (const { expr, set } of readings) {
    if (set?.length !== 1) continue;
    const key = delegationSql(expr);
    if (key !== null) pinned.set(key, set[0]!);
  }

  const answers = new Map<unknown, string>();
  const asked = new Map<string, string | null>();

  // ROUTE B FIRST, and the order is the point: a derived column it types
  // becomes a typed LEAF, which is what lets Route A resolve the operators
  // above it. `a.c + b.c` over two `count(*)` subqueries is unreachable to
  // either route alone and falls out of the two in sequence.
  const bindings = new Map<string, number>();
  aliasBindings(stmt, bindings);
  const spliceable: { node: unknown; text: string }[] = [];
  const seenText = new Set<string>();
  for (const { expr, set } of readings) {
    if (set !== null || kindOf(expr) !== "ColumnRef") continue;
    const fields = ((expr as Record<string, unknown>)["ColumnRef"] as Record<string, unknown>)[
      "fields"
    ] as unknown[] | undefined;
    const parts = (fields ?? [])
      .map(f => ((f as Record<string, unknown>)["String"] as Record<string, unknown> | undefined)?.["sval"])
      .filter((p): p is string => typeof p === "string");
    // An unqualified name is whatever the scope says it is, and this has no
    // scope; a qualifier bound twice cannot be asked about from the top.
    if (parts.length < 2) continue;
    if (bindings.get(parts[parts.length - 2]!) !== 1) continue;
    const text = delegationSql(expr);
    if (text === null || seenText.has(text)) continue;
    seenText.add(text);
    spliceable.push({ node: expr, text });
  }
  for (const [text, type] of await routeB(stmt, spliceable, resolve)) {
    pinned.set(text, type);
    asked.set(text, type);
  }
  for (const { expr, set } of readings) {
    if (set !== null) continue;
    const text = delegationSql(expr);
    const answer = text === null ? undefined : asked.get(text);
    if (answer) answers.set(expr, answer);
  }

  for (const { expr, set } of readings) {
    if (set !== null && set.length === 1) continue; // already exact
    if (NEVER_DELEGATED.has(kindOf(expr))) continue;
    if (answers.has(expr)) continue;

    const text = delegationSql(expr);
    if (text === null) continue;

    const cached = asked.get(text);
    if (cached !== undefined) {
      if (cached !== null) answers.set(expr, cached);
      continue;
    }

    const leaves: unknown[] = [];
    if (scan(expr, leaves).blocked || leaves.length === 0) {
      // No typed leaf, or a scope we may not enter. The safety rule refuses
      // both: an expression with nothing pinned inside it is exactly the one
      // whose type comes from its context.
      asked.set(text, null);
      continue;
    }

    const swap = new Map<unknown, unknown>();
    let n = 0;
    let refused = false;
    for (const leaf of leaves) {
      const key = delegationSql(leaf);
      const type = key === null ? undefined : pinned.get(key);
      if (type === undefined) {
        refused = true;
        break;
      }
      swap.set(leaf, paramCast(++n, type));
    }
    if (refused) {
      asked.set(text, null);
      continue;
    }

    const probe = delegationSql(rewrite(expr, swap));
    if (probe === null) {
      asked.set(text, null);
      continue;
    }

    let resolved: string[];
    try {
      resolved = await resolve(`SELECT ${probe}`);
    } catch {
      // A refusal is an ordinary outcome, not a failure of the statement.
      asked.set(text, null);
      continue;
    }
    const answer = resolved.length === 1 ? resolved[0]! : null;
    asked.set(text, answer);
    if (answer !== null) answers.set(expr, answer);
  }

  // A second pass binds every OTHER node carrying the same text, so one
  // question answers every occurrence — the walk reads a node, not a string.
  for (const { expr, set } of readings) {
    if (set !== null && set.length === 1) continue;
    if (NEVER_DELEGATED.has(kindOf(expr)) || answers.has(expr)) continue;
    const text = delegationSql(expr);
    const answer = text === null ? undefined : asked.get(text);
    if (answer !== undefined && answer !== null) answers.set(expr, answer);
  }

  return answers;
}
