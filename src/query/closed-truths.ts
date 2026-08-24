// ---------------------------------------------------------------------------
// Closed truths — the truth value of a CLOSED boolean expression, asked of
// PostgreSQL rather than matched as a token.
//
// PostgreSQL does NO constant folding on the way into `pg_constraint.conbin`.
// What it DOES do is coerce an UNKNOWN literal during parse analysis, and the
// difference between those two facts is the whole of this module's subject:
//
//     CHECK (a > 0 OR 't'::boolean)   →  stored as  ((a > 0) OR true)
//     CHECK (a > 0 OR 1::boolean)     →  stored as  ((a > 0) OR (1)::boolean)
//     CHECK (a > 0 OR 1 > 2)          →  stored as  ((a > 0) OR (1 > 2))
//
// The first the kernel already reads — it is a token. The second and third it
// cannot, and neither can any token matcher, because they are COMPUTATIONS: a
// cast through an input function, a comparison, a function call, an array
// containment, a jsonb existence test, a closed CASE. Reading one spelling
// while missing the next is a rule that looks total and is not, which is
// exactly why `boolLiteral` refused the cast rather than following it.
//
// Every one of them is a CLOSED tree, which is the subtree evaluator's whole
// subject, so the answer is to ask. That is total where matching is partial:
// the module never learns what `starts_with` means, it learns what PostgreSQL
// said about this call.
//
// TWO SOURCES, ONE KEY SPACE. The statement's own closed subtrees are already
// evaluated by the statement map (consumer 1), so its boolean answers come
// free and this module never re-asks them. What it collects are the CHECK
// constraints of the statement's tables, which the statement map cannot see —
// they are catalog trees, not statement trees.
//
// Keys are STRUCTURAL, not node identity, and they have to be: the walk hands
// the kernel `qualifyColumnRefs` output, which is a `structuredClone`, so
// every identity from the catalog side is destroyed before the kernel reads
// it. `location` is skipped so a statement's `1 > 2` and a CHECK's answer the
// same key — a convergence, since a closed tree's value does not depend on
// where it was written.
//
// COLLECTION IS GATED TO BOOLEAN POSITIONS. A CHECK's maximal closed subtrees
// include every `'x'::text` operand in it (measured: 28 across the fixture
// corpus's 49 CHECKs, none of them a truth value), and asking about those
// would spend probe columns on answers no consumer can read. Only positions
// where a TRUTH is what gets read are collected — the CHECK root, the arms of
// a BoolExpr, and a CASE's conditions and results.
// ---------------------------------------------------------------------------

import type { Node } from "libpg-query";
import {
  collectClosedSubtrees,
  evaluateClosedSubtrees,
  type Evaluate,
  type SubtreeEvaluationCatalog,
} from "./subtree-evaluator.js";
import type { NullabilityCatalog } from "./types.js";

type Fields = Record<string, unknown>;

/**
 * A structural key for a closed subtree: its shape and payloads, with
 * `location` skipped. Property order comes from the parser and survives
 * `structuredClone`, so two trees with the same key are the same tree.
 */
export function truthKey(node: Node): string {
  const out: string[] = [];
  const write = (n: unknown): void => {
    if (Array.isArray(n)) {
      out.push("[");
      for (const x of n) {
        write(x);
        out.push(",");
      }
      out.push("]");
      return;
    }
    if (n === null || typeof n !== "object") {
      out.push(JSON.stringify(n) ?? "undefined");
      return;
    }
    out.push("{");
    for (const [key, value] of Object.entries(n as Fields)) {
      if (key === "location") continue;
      out.push(JSON.stringify(key), ":");
      write(value);
      out.push(",");
    }
    out.push("}");
  };
  write(node);
  return out.join("");
}

/**
 * Every table the statement references, resolved through the catalog — the
 * set whose CHECK constraints the kernel may reason from. Shared with
 * `comparison-groundings.ts`, which asks the same question of the same tables
 * for a different reason; two definitions of "the statement's tables" would
 * only ever drift apart.
 */
export function referencedTables(
  stmt: Node,
  catalog: NullabilityCatalog,
): { schema: string; name: string }[] {
  const tables = new Map<string, { schema: string; name: string }>();
  const visit = (n: unknown): void => {
    if (Array.isArray(n)) {
      for (const x of n) visit(x);
      return;
    }
    if (!n || typeof n !== "object") return;
    const rv = (n as Fields)["RangeVar"] as { schemaname?: string; relname?: string } | undefined;
    if (rv?.relname) {
      const t = catalog.resolveTable(rv.schemaname, rv.relname);
      if (t) tables.set(`${t.schema}.${t.name}`, { schema: t.schema, name: t.name });
    }
    for (const v of Object.values(n as Fields)) visit(v);
  };
  visit(stmt);
  return [...tables.values()];
}

/**
 * The positions under a boolean-valued root where a TRUTH is what gets read:
 * the root itself, the arms of a BoolExpr (recursively — `NOT`'s single arm
 * included), and a CASE's conditions and results. A CASE with a test
 * expression (`CASE x WHEN 1 …`) has VALUES in its WHEN slots, not truths,
 * so those are not positions; its results still are, because a boolean CASE
 * returns one of them.
 *
 * The CASE node itself is a position too, and stays one even though its parts
 * are collected beside it: when the whole thing is closed it answers in one
 * probe, and when only an arm is, the arm answers alone.
 */
function booleanPositions(root: Node): Node[] {
  const out: Node[] = [];
  const visit = (n: unknown): void => {
    if (!n || typeof n !== "object" || Array.isArray(n)) return;
    const rec = n as Fields;

    const be = rec["BoolExpr"] as { args?: unknown[] } | undefined;
    if (be) {
      for (const arg of be.args ?? []) visit(arg);
      return;
    }

    const ce = rec["CaseExpr"] as
      | { arg?: unknown; args?: unknown[]; defresult?: unknown }
      | undefined;
    if (ce) {
      out.push(n as Node);
      for (const w of ce.args ?? []) {
        const when = (w as Fields)["CaseWhen"] as { expr?: unknown; result?: unknown } | undefined;
        if (!ce.arg && when?.expr) visit(when.expr);
        if (when?.result) visit(when.result);
      }
      if (ce.defresult) visit(ce.defresult);
      return;
    }

    out.push(n as Node);
  };
  visit(root);
  return out;
}

/**
 * A cast of the NULL constant — `NULL::boolean`, which is what
 * `pg_get_constraintdef` renders for the implicit ELSE of a CASE that has
 * none. Its truth is NULL by construction, so asking is a probe column that
 * cannot answer: it was the ONLY question four of the corpus's fixtures
 * produced (measured 2026-08-24), and skipping it is exact rather than
 * conservative — nothing evaluates a NULL constant to a truth.
 */
function isNullConstant(node: Node): boolean {
  const tc = (node as Fields)["TypeCast"] as { arg?: unknown } | undefined;
  const ac = ((tc?.arg ?? node) as Fields)["A_Const"] as { isnull?: boolean } | undefined;
  return ac?.isnull === true;
}

/**
 * The closed boolean positions of the statement's tables' CHECK constraints,
 * deduplicated by structural key. A position is kept only when it is closed
 * AND rootable on its own — which is exactly `collectClosedSubtrees` handing
 * the position back rather than descending past it.
 */
export function collectClosedTruthQuestions(
  stmt: Node,
  catalog: NullabilityCatalog & SubtreeEvaluationCatalog,
): Node[] {
  const questions: Node[] = [];
  const seen = new Set<string>();
  for (const t of referencedTables(stmt, catalog)) {
    const checks = [
      ...catalog.resolveCheckConstraints(t.schema, t.name),
      ...catalog.resolveCheckConstraintsTree(t.schema, t.name),
    ];
    for (const check of checks) {
      for (const position of booleanPositions(check)) {
        if (isNullConstant(position)) continue;
        const collected = collectClosedSubtrees(position, catalog);
        if (collected.length !== 1 || collected[0] !== position) continue;
        const key = truthKey(position);
        if (seen.has(key)) continue;
        seen.add(key);
        questions.push(position);
      }
    }
  }
  return questions;
}

/**
 * One evaluator-core call for the whole question set. Only PLAIN BOOLEAN
 * answers enter the map: an evaluated NULL is a `NULL::boolean` arm, which is
 * notFALSE and therefore not droppable, and anything non-boolean was never a
 * truth to begin with. A missing answer claims nothing.
 */
export async function evaluateClosedTruths(
  questions: readonly Node[],
  catalog: NullabilityCatalog & SubtreeEvaluationCatalog,
  evaluate: Evaluate,
): Promise<ReadonlyMap<string, boolean>> {
  const out = new Map<string, boolean>();
  if (questions.length === 0) return out;
  const root = { List: { items: [...questions] } } as unknown as Node;
  const answers = await evaluateClosedSubtrees(root, catalog, evaluate);
  for (const question of questions) {
    const answer = answers.get(question);
    if (answer && !answer.isNull && typeof answer.value === "boolean") {
      out.set(truthKey(question), answer.value);
    }
  }
  return out;
}
