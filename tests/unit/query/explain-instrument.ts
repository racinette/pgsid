import type { JoinAudit, OutputNullability } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The EXPLAIN oracle's shared instrument, used by both corpora — the
// hand-written fixtures (explain-oracle.test.ts, agreement DECLARED per
// fixture via @planner-keeps) and the generated queries
// (generated/generated-explain.test.ts, agreement MEASURED — no annotation
// channel exists there). See docs/witness-coverage.md, "The EXPLAIN oracle",
// for what the comparison means and the asymmetry that governs reading it.
// ---------------------------------------------------------------------------

const RAW_OUTER = new Set(["JOIN_LEFT", "JOIN_RIGHT", "JOIN_FULL"]);
const PLAN_OUTER = new Set(["Left", "Right", "Full"]);

/** Outer JoinExpr nodes anywhere in a raw AST — subqueries and CTEs included. */
export function countRawOuterJoins(node: unknown): number {
  if (Array.isArray(node)) return node.reduce((n: number, c) => n + countRawOuterJoins(c), 0);
  if (node === null || typeof node !== "object") return 0;
  const rec = node as Record<string, unknown>;
  const join = rec["JoinExpr"] as Record<string, unknown> | undefined;
  let n = join && RAW_OUTER.has(join["jointype"] as string) ? 1 : 0;
  for (const v of Object.values(rec)) n += countRawOuterJoins(v);
  return n;
}

/**
 * Outer-join plan nodes anywhere in an EXPLAIN (FORMAT JSON) tree — subplans
 * and CTEs included. Exact "Join Type" match, which excludes the Semi/Anti
 * family the planner synthesizes from sublinks.
 */
export function countPlanOuterJoins(node: unknown): number {
  if (Array.isArray(node)) return node.reduce((n: number, c) => n + countPlanOuterJoins(c), 0);
  if (node === null || typeof node !== "object") return 0;
  const rec = node as Record<string, unknown>;
  let n = typeof rec["Join Type"] === "string" && PLAN_OUTER.has(rec["Join Type"] as string) ? 1 : 0;
  for (const v of Object.values(rec)) n += countPlanOuterJoins(v);
  return n;
}

/**
 * Statement-level surviving outer joins. The audit's settled flags are
 * scope-local; the planner's verdict is statement-global (it flattens
 * scopes, so an outer WHERE reduces an inner join). The engine states the
 * same global fact through its CLAIMS: a column proved notNull whose origin
 * crosses unit U means U's absent arm never reaches the output — a
 * NULL-extended slice has every pass-through NULL. So a side counts as
 * surviving only when it is locally unsettled AND no claim refilters its
 * unit.
 */
// --- Divergence classification ---------------------------------------------
//
// A planner-stronger divergence is never left as a bare count: the classifier
// goes into the query and attributes it to a KNOWN cause, each with a
// recorded verdict, so the report reads "N divergences, all explained" and an
// unexplained one fails loudly. The causes:
//
//   slice-local-strict-qual — KNOWN IMPRECISION (a closure candidate; see the
//     deferred-tasks register). An outer join's own strict qual references
//     the optional side of an outer join nested in an arm it governs:
//     `(t LEFT u) RIGHT v ON v.u_id = u.id` — a u-extended row fails the
//     strict qual and the RIGHT join drops it, so the LEFT's extension never
//     survives and reduce_outer_joins converts it to INNER. The fixpoint
//     implies a qual only from GLOBAL presence, and under the enclosing
//     extension nothing is globally present — but participation, not
//     presence, is the sufficient condition. Soundness is unaffected: the
//     columns stay nullable via the enclosing extension.
//
//   join-removal — OUT OF SCOPE, permanently. remove_useless_joins deletes a
//     LEFT join whose unique inner side nothing references: a row-count
//     fact, not a nullability fact, and the engine will never model it.
//     Detected from the plan itself — the relation's scan node is gone.
//
//   srf-unit-blindspot — CLOSED (was an instrument limitation). An
//     outer-joined set-returning function has no base table, so its unit
//     never appears in `ColumnOrigin.units`; the `unitCrossings` diagnostic
//     channel (WalkOptions.collectUnitCrossings) now carries the units of
//     anchor-less pass-throughs, and the subtraction sees them. The
//     classifier stays armed with a pinned count of 0 so a regression
//     re-opens the class by name.

export type DivergenceCause = "slice-local-strict-qual" | "join-removal" | "srf-unit-blindspot";

interface JoinInfo {
  jointype: string;
  larg: unknown;
  rarg: unknown;
  quals: unknown;
}

function walkNodes(node: unknown, visit: (rec: Record<string, unknown>) => void): void {
  if (Array.isArray(node)) {
    for (const c of node) walkNodes(c, visit);
    return;
  }
  if (node === null || typeof node !== "object") return;
  const rec = node as Record<string, unknown>;
  visit(rec);
  for (const v of Object.values(rec)) walkNodes(v, visit);
}

function collectJoins(node: unknown): JoinInfo[] {
  const joins: JoinInfo[] = [];
  walkNodes(node, rec => {
    const j = rec["JoinExpr"] as Record<string, unknown> | undefined;
    if (j) {
      joins.push({
        jointype: (j["jointype"] as string) ?? "JOIN_INNER",
        larg: j["larg"],
        rarg: j["rarg"],
        quals: j["quals"],
      });
    }
  });
  return joins;
}

/** FROM-item alias names in a subtree: relations, subselects, functions. */
function subtreeAliases(node: unknown): Set<string> {
  const out = new Set<string>();
  walkNodes(node, rec => {
    for (const kind of ["RangeVar", "RangeSubselect", "RangeFunction"]) {
      const item = rec[kind] as Record<string, unknown> | undefined;
      if (!item) continue;
      const alias = (item["alias"] as { aliasname?: string } | undefined)?.aliasname;
      const name = alias ?? (kind === "RangeVar" ? (item["relname"] as string) : undefined);
      if (name) out.add(name);
    }
  });
  return out;
}

/** Base-relation aliases only — the set a plan's scan nodes must cover. */
function relationAliases(node: unknown): Set<string> {
  const out = new Set<string>();
  walkNodes(node, rec => {
    const rv = rec["RangeVar"] as Record<string, unknown> | undefined;
    if (!rv) return;
    const alias = (rv["alias"] as { aliasname?: string } | undefined)?.aliasname;
    out.add(alias ?? (rv["relname"] as string));
  });
  return out;
}

/** Qualifier parts of qualified ColumnRefs in a qual expression. */
function qualifierRefs(node: unknown): Set<string> {
  const out = new Set<string>();
  walkNodes(node, rec => {
    const cr = rec["ColumnRef"] as { fields?: unknown[] } | undefined;
    if (!cr?.fields || cr.fields.length < 2) return;
    const first = cr.fields[0] as { String?: { sval?: string } } | undefined;
    if (first?.String?.sval) out.add(first.String.sval);
  });
  return out;
}

function extendedSides(j: JoinInfo): unknown[] {
  if (j.jointype === "JOIN_LEFT") return [j.rarg];
  if (j.jointype === "JOIN_RIGHT") return [j.larg];
  if (j.jointype === "JOIN_FULL") return [j.larg, j.rarg];
  return [];
}

function containsRangeFunction(node: unknown): boolean {
  let found = false;
  walkNodes(node, rec => {
    if (rec["RangeFunction"]) found = true;
  });
  return found;
}

/**
 * Attribute a planner-stronger divergence to a known cause, or return null
 * (unexplained — the caller should fail loudly). Checked in order of
 * decisiveness: removal is read off the plan, the SRF blind spot off the
 * join shape, slice-local reduction off the qual/extension geometry.
 */
export function classifyPlannerStronger(stmt: unknown, plan: unknown): DivergenceCause | null {
  const planAliases = new Set<string>();
  walkNodes(plan, rec => {
    if (typeof rec["Alias"] === "string") planAliases.add(rec["Alias"] as string);
  });
  for (const alias of relationAliases(stmt)) {
    if (!planAliases.has(alias) && !planAliases.has(`${alias}_1`)) return "join-removal";
  }

  const joins = collectJoins(stmt);
  const outer = joins.filter(j => extendedSides(j).length > 0);
  for (const j of outer) {
    if (extendedSides(j).some(containsRangeFunction)) return "srf-unit-blindspot";
  }

  // The qual-bearing join may be ANY type, not only outer: `(t LEFT u) JOIN
  // v ON v.u_id = u.id RIGHT ck` reduces the LEFT through the INNER join's
  // strict qual. What makes these divergent is the same either way — the
  // fixpoint implies a qual only from global presence, and inside an
  // enclosing extension there is none, while participation would suffice.
  // A top-level inner qual IS implied globally, so those queries agree and
  // never reach this classifier.
  for (const j of joins) {
    const refs = qualifierRefs(j.quals);
    if (refs.size === 0) continue;
    for (const arm of [j.larg, j.rarg]) {
      for (const nested of collectJoins(arm)) {
        for (const side of extendedSides(nested)) {
          for (const alias of subtreeAliases(side)) {
            if (refs.has(alias)) return "slice-local-strict-qual";
          }
        }
      }
    }
  }
  return null;
}

export function survivingOuterJoins(
  joinAudit: readonly JoinAudit[],
  claims: readonly OutputNullability[],
): number {
  // Attribution reads the diagnostic crossings channel first (present when
  // the analysis ran with `collectUnitCrossings`, and the only channel that
  // covers a set-returning function's pass-through), with origins' units as
  // the anchor-carrying subset behind it.
  const refiltered = new Set<number>();
  for (const c of claims) {
    if (!c.notNull) continue;
    for (const u of c.unitCrossings ?? []) refiltered.add(u.unit);
    for (const o of c.origins ?? []) {
      for (const u of o?.units ?? []) refiltered.add(u.unit);
    }
  }
  return joinAudit.filter(
    a =>
      (a.leftSettled === false && !refiltered.has(a.leftGroup!)) ||
      (a.rightSettled === false && !refiltered.has(a.rightGroup!)),
  ).length;
}
