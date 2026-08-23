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
