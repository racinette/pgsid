// ---------------------------------------------------------------------------
// Comparison groundings — the entailment consumer's pre-walk step
// (docs/subtree-evaluation.md, "The recorded later"; built 2026-08-12).
//
// The kernel's atom oracle needs the truth of `litA OP litB` read at a
// column's declared type — a CLOSED tree, so the evaluator answers it. The
// question space is enumerable before any scope exists: every `col = lit`
// equality anywhere in the statement (the evidence side, over-collected —
// scope-blindness only wastes a question) crossed with every `col OP lit`
// atom of a referenced table's CHECK constraints, read at that table's
// declared column type. Keys are table-free on purpose: `5 <= 1` at
// `integer` is the same fact whichever table asked, so collisions are
// convergences.
//
// One evaluator-core call per statement, exactly like the CHECK grounder's;
// a question the closure gate refuses (a datetime column, a user type
// outside the widening) simply never enters the map, and a missing answer
// claims nothing. Every literal is CAST TO THE COLUMN'S DECLARED TYPE,
// typmods included — `'a' <> 'a '` is TRUE as text and FALSE as
// character(4), and the cast is what makes the evaluated answer the
// enforcement answer (the grounder's bp rule, third appearance).
// ---------------------------------------------------------------------------

import type { Node } from "libpg-query";
import { parseSql } from "../ast.js";
import { comparisonKey, scanLitComparisons, type Lit } from "./check-entailment.js";
import {
  evaluateClosedSubtrees,
  type Evaluate,
  type SubtreeEvaluationCatalog,
} from "./subtree-evaluator.js";
import type { NullabilityCatalog } from "./types.js";

type Fields = Record<string, unknown>;

/** Rebuild the A_Const a Lit was extracted from. */
function litNode(lit: Lit): Node {
  switch (lit.kind) {
    case "ival":
      return { A_Const: { ival: { ival: lit.value as number }, location: -1 } } as unknown as Node;
    case "fval":
      return { A_Const: { fval: { fval: lit.value as string }, location: -1 } } as unknown as Node;
    case "sval":
      return { A_Const: { sval: { sval: lit.value as string }, location: -1 } } as unknown as Node;
    case "boolval":
      return {
        A_Const: { boolval: { boolval: lit.value as boolean }, location: -1 },
      } as unknown as Node;
    case "bsval":
      return { A_Const: { bsval: { bsval: lit.value as string }, location: -1 } } as unknown as Node;
  }
}

/**
 * Every `col = lit` / `col OP lit` question the statement and its tables'
 * CHECK constraints can pair up, as evaluable trees keyed by
 * `comparisonKey`. Async only for the TypeName harvest (one parse per
 * distinct declared type, cached).
 */
export async function collectComparisonQuestions(
  stmt: Node,
  catalog: NullabilityCatalog & SubtreeEvaluationCatalog,
): Promise<{ key: string; tree: Node }[]> {
  // Evidence side: every column-vs-literal comparison anywhere in the
  // statement — equalities feed the substitution questions, and EVERY
  // anchor feeds the interval rung's order questions.
  const equalities = new Map<string, Lit[]>();
  const statementLits = new Map<string, Lit[]>();
  for (const c of scanLitComparisons(stmt)) {
    if (c.op === "=") {
      const list = equalities.get(c.column) ?? [];
      list.push(c.lit);
      equalities.set(c.column, list);
    }
    const all = statementLits.get(c.column) ?? [];
    all.push(c.lit);
    statementLits.set(c.column, all);
  }
  if (statementLits.size === 0) return [];

  // Referenced tables: every RangeVar, resolved through the catalog.
  const tables = new Map<string, { schema: string; name: string }>();
  const visit = (n: unknown): void => {
    if (Array.isArray(n)) {
      for (const x of n) visit(x);
      return;
    }
    if (!n || typeof n !== "object") return;
    const rv = (n as Fields)["RangeVar"] as
      | { schemaname?: string; relname?: string }
      | undefined;
    if (rv?.relname) {
      const t = catalog.resolveTable(rv.schemaname, rv.relname);
      if (t) tables.set(`${t.schema}.${t.name}`, { schema: t.schema, name: t.name });
    }
    for (const v of Object.values(n as Fields)) visit(v);
  };
  visit(stmt);

  const typeNameCache = new Map<string, unknown | null>();
  const typeNameAstOf = async (rendered: string): Promise<unknown | null> => {
    const hit = typeNameCache.get(rendered);
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
    typeNameCache.set(rendered, ast);
    return ast;
  };

  const questions = new Map<string, Node>();
  const put = (colType: string, typeName: unknown, a: Lit, op: string, b: Lit): void => {
    const key = comparisonKey(colType, a, op, b);
    if (questions.has(key)) return;
    questions.set(key, {
      A_Expr: {
        kind: "AEXPR_OP",
        name: [{ String: { sval: op } }],
        lexpr: {
          TypeCast: { arg: litNode(a), typeName: structuredClone(typeName), location: -1 },
        },
        rexpr: {
          TypeCast: { arg: litNode(b), typeName: structuredClone(typeName), location: -1 },
        },
        location: -1,
      },
    } as unknown as Node);
  };

  for (const t of tables.values()) {
    const checks = [
      ...catalog.resolveCheckConstraints(t.schema, t.name),
      ...catalog.resolveCheckConstraintsTree(t.schema, t.name),
    ];
    // The interval rung's ANCHOR-ORDER questions: per column, every pair
    // drawn from the CHECKs' literals and the statement's, both directed
    // `<`s and the `=` — the kernel derives lt/eq/gt/ne from whichever
    // answer. Order questions only over non-collatable columns, equality
    // wherever the trichotomy's equality arm allows.
    const anchorsByColumn = new Map<string, Lit[]>();
    for (const check of checks) {
      for (const atom of scanLitComparisons(check)) {
        const list = anchorsByColumn.get(atom.column) ?? [];
        list.push(atom.lit);
        anchorsByColumn.set(atom.column, list);
      }
    }
    for (const [column, checkLits] of anchorsByColumn) {
      const det = catalog.resolveColumnCollationDeterministic(t.schema, t.name, column);
      const isDefault =
        catalog.resolveColumnCollationIsDefault(t.schema, t.name, column) === true;
      // Order questions on the identity arm too: a default-collated
      // column's order evaluates under the session's own collation.
      const orderOk = det === null || isDefault;
      if (det === false && !isDefault) continue;
      const colType = catalog.resolveColumnTypeName(t.schema, t.name, column);
      if (colType === null) continue;
      const typeName = await typeNameAstOf(colType);
      if (typeName === null) continue;
      const anchors = [...checkLits, ...(statementLits.get(column) ?? [])];
      for (let i = 0; i < anchors.length; i++) {
        for (let j = i + 1; j < anchors.length; j++) {
          const p = anchors[i]!;
          const q = anchors[j]!;
          if (orderOk) {
            put(colType, typeName, p, "<", q);
            put(colType, typeName, q, "<", p);
          }
          put(colType, typeName, p, "=", q);
        }
      }
    }
    for (const check of checks) {
      for (const atom of scanLitComparisons(check)) {
        const evidenceLits = equalities.get(atom.column);
        if (!evidenceLits) continue;
        // The collation lattice, mirrored from the kernel's gate (which
        // remains the sound one — this mirror only saves evaluations):
        // non-collatable or DEFAULT-collated → all ops; explicit
        // deterministic → equality only; nondeterministic or unknown →
        // nothing.
        const det = catalog.resolveColumnCollationDeterministic(t.schema, t.name, atom.column);
        const isDefault =
          catalog.resolveColumnCollationIsDefault(t.schema, t.name, atom.column) === true;
        if (
          !(
            det === null ||
            isDefault ||
            (det === true && (atom.op === "=" || atom.op === "<>"))
          )
        ) {
          continue;
        }
        const colType = catalog.resolveColumnTypeName(t.schema, t.name, atom.column);
        if (colType === null) continue;
        const typeName = await typeNameAstOf(colType);
        if (typeName === null) continue;
        for (const evidenceLit of evidenceLits) {
          put(colType, typeName, evidenceLit, atom.op, atom.lit);
        }
      }
    }
  }
  return [...questions.entries()].map(([key, tree]) => ({ key, tree }));
}

/**
 * One evaluator-core call for the whole statement's questions: closure
 * gates apply per tree, the answers come back keyed by node identity, and
 * only plain boolean answers enter the map — an evaluated NULL is a
 * comparison over a NULL-adjacent literal the extraction already refused,
 * so it never arises, and anything else is not a truth.
 */
export async function evaluateComparisonQuestions(
  questions: readonly { key: string; tree: Node }[],
  catalog: NullabilityCatalog & SubtreeEvaluationCatalog,
  evaluate: Evaluate,
): Promise<ReadonlyMap<string, boolean>> {
  const out = new Map<string, boolean>();
  if (questions.length === 0) return out;
  const root = { List: { items: questions.map(q => q.tree) } } as unknown as Node;
  const answers = await evaluateClosedSubtrees(root, catalog, evaluate);
  for (const q of questions) {
    const a = answers.get(q.tree);
    if (a !== undefined && !a.isNull && typeof a.value === "boolean") {
      out.set(q.key, a.value);
    }
  }
  return out;
}
