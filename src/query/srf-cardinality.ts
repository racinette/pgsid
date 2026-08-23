import { deparseSync } from "pgsql-deparser";
import type { Node } from "libpg-query";
import {
  isClosedSrfCall,
  SUBLINK_SRF_ROW_CAP,
  type Evaluate,
  type SubtreeEvaluationCatalog,
} from "./subtree-evaluator.js";

// ---------------------------------------------------------------------------
// The set-returning CARDINALITY round (AGENTS.md rule 1; the third pre-walk
// consumer, after comparison-groundings.ts and written-value-guards.ts).
//
// The lockstep padding rule expands `ROWS FROM` arms — and target-list SRFs —
// to the LONGEST one's row count and NULL-pads the rest, so an arm survives on
// its MINIMUM and pads the others on their MAXIMUM. `armRowBounds` can count
// two shapes on its own: a call returning one value, and `generate_series`
// over constant integer bounds. Everything else is UNBOUNDED, which both fails
// to survive and pads everyone else.
//
// A CLOSED call has a third answer available, and it is the same answer
// PostgreSQL would give: RUN IT. `jsonb_path_query('[1]'::jsonb, '$[*]')`
// emits exactly one row, and counting `'$[*]'` over a document is a jsonpath
// evaluation rather than arithmetic on constants — PostgreSQL's job, and the
// reason this cannot be folded into `armRowBounds` as a rule.
//
// CLOSURE is `isClosedSrfCall`, the evaluator's own gate, deliberately not
// restated here. Its volatility half is what makes the round sound: a STABLE
// call's row count at analysis time is not a promise about its row count at
// execution time, and the padding turns that count into a notNull claim.
// `jsonb_path_query` folds; its `_tz` sibling, which reads the session
// TimeZone through jsonpath datetime comparisons, does not.
// ---------------------------------------------------------------------------

/** One closed set-returning call and where its answer belongs. */
interface CardinalityQuestion {
  /** The `{FuncCall: …}` WRAPPER, which is what the probe AST embeds. */
  call: Node;
  /**
   * The wrapper's PAYLOAD — the object the walk holds. `armRowBounds` is
   * handed the inner value (`items[0].FuncCall`), never the wrapper, so the
   * answer map has to key on this or every lookup misses by one level.
   */
  key: object;
}

/**
 * Every closed set-returning call in the statement, in traversal order.
 *
 * Scope-blind like the evaluator: this never resolves a name, it only detects
 * one. A call whose arguments reach a column is not closed, so the FROM item's
 * laterality, the aliases in scope and the join tree are all somebody else's
 * problem by construction.
 */
export function collectSrfCardinalityQuestions(
  stmt: Node,
  catalog: SubtreeEvaluationCatalog,
): CardinalityQuestion[] {
  const out: CardinalityQuestion[] = [];
  const seen = new Set<object>();
  const visit = (n: unknown): void => {
    if (Array.isArray(n)) {
      for (const e of n) visit(e);
      return;
    }
    if (!n || typeof n !== "object") return;
    if (seen.has(n as object)) return;
    seen.add(n as object);
    const payload = (n as Record<string, unknown>)["FuncCall"];
    if (payload && typeof payload === "object" && isClosedSrfCall(n, catalog)) {
      out.push({ call: n as Node, key: payload as object });
      // Its arguments are constants by construction — nothing inside a closed
      // call can itself be a set-returning call worth asking about.
      return;
    }
    for (const v of Object.values(n as Record<string, unknown>)) visit(v);
  };
  visit(stmt);
  return out;
}

/**
 * Render `SELECT (SELECT count(*) FROM (SELECT <call> LIMIT cap+1) z) AS n0,
 * …` — one round trip.
 *
 * A scalar subquery per call, because two set-returning FROM items in one
 * SELECT would cross-join and count the product.
 *
 * **The LIMIT is not an optimisation, it is the safety bound.** Closure says
 * a call has no free variables; it says nothing about how much WORK it is.
 * `generate_series(1, 10000000000)` is perfectly closed and immutable, and
 * the corpus already contains it (`closed-sublink.sql`). That is why
 * `SUBLINK_SRF_ROW_CAP` exists and why this reuses it rather than inventing a
 * second number.
 *
 * **The call goes in the TARGET LIST, and that placement is load-bearing.**
 * This is TRAP 1 in docs/subtree-evaluation.md, already named and already
 * recorded: LIMIT does not bound a FROM-position function scan, and the guard
 * query itself hangs. Re-measured here the expensive way, 2026-08-23, over a
 * 10^10 series with an identical `LIMIT 1001`:
 *
 *     SELECT count(*) FROM (SELECT generate_series(…) LIMIT 1001) z   1 ms
 *     SELECT count(*) FROM (SELECT 1 FROM generate_series(…)
 *                           LIMIT 1001) z                            HANGS
 *
 * A target-list SRF is a `ProjectSet`, which LIMIT stops lazily. The same call
 * in the FROM clause is a `FunctionScan`, which MATERIALISES the whole result
 * before any LIMIT above it applies — so the bound reads as if it protects and
 * does not. The FROM shape was written here first, from the same instinct that
 * put the call in a FROM item because that is where the walk finds it, and it
 * wedged the suite until the charter was read.
 *
 * Reading `cap + 1` is what makes the answer usable rather than merely safe.
 * A result at or below the cap is the EXACT count; a result of cap+1 means
 * "more than the cap", which this round reports as no answer at all — and the
 * padding bound then falls back to UNBOUNDED, exactly what it did before this
 * round existed.
 */
function countSelect(calls: readonly Node[]): string {
  return deparseSync({
    version: 0,
    stmts: [
      {
        stmt: {
          SelectStmt: {
            targetList: calls.map((call, i) => ({
              ResTarget: {
                name: `n${i}`,
                location: -1,
                val: {
                  SubLink: {
                    subLinkType: "EXPR_SUBLINK",
                    location: -1,
                    subselect: {
                      SelectStmt: {
                        targetList: [
                          {
                            ResTarget: {
                              location: -1,
                              val: {
                                FuncCall: {
                                  funcname: [{ String: { sval: "count" } }],
                                  agg_star: true,
                                  location: -1,
                                },
                              },
                            },
                          },
                        ],
                        fromClause: [
                          {
                            RangeSubselect: {
                              alias: { aliasname: "__pgsid_srf" },
                              subquery: {
                                SelectStmt: {
                                  // The call sits HERE, in the target list —
                                  // see the note above; the FROM position
                                  // materialises and the LIMIT cannot stop it.
                                  targetList: [
                                    { ResTarget: { location: -1, val: call } },
                                  ],
                                  limitCount: {
                                    A_Const: {
                                      ival: { ival: SUBLINK_SRF_ROW_CAP + 1 },
                                      location: -1,
                                    },
                                  },
                                  limitOption: "LIMIT_OPTION_COUNT",
                                  op: "SETOP_NONE",
                                },
                              },
                            },
                          },
                        ],
                        limitOption: "LIMIT_OPTION_DEFAULT",
                        op: "SETOP_NONE",
                      },
                    },
                  },
                },
              },
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

/**
 * A `count(*)` comes back as bigint, which the driver may hand over as a
 * string. Anything that is not a non-negative integer is no answer — and
 * neither is a count that REACHED the cap, which means "more than the cap"
 * rather than a number.
 */
function rowCount(v: unknown): number | null {
  const n = typeof v === "bigint" ? Number(v) : typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0) return null;
  return n > SUBLINK_SRF_ROW_CAP ? null : n;
}

/**
 * How many rows each closed set-returning call emits, keyed by node identity.
 *
 * One batched round trip, degrading to one query per call if the batch raises
 * — a closed call can raise on its own (`jsonb_path_query` over a malformed
 * path), and one raiser must not cost the others their answers. The same
 * degradation the evaluator core performs, for the same reason.
 */
export async function evaluateSrfCardinalities(
  questions: readonly CardinalityQuestion[],
  evaluate: Evaluate,
): Promise<ReadonlyMap<object, number>> {
  const out = new Map<object, number>();
  if (questions.length === 0) return out;

  const calls = questions.map(q => q.call);
  try {
    const row = await evaluate(countSelect(calls));
    if (row) {
      // The batch ANSWERED, so every reading in it is final. A null here is
      // "over the cap" or unreadable, and asking the same call again alone
      // returns the same null — only a RAISE is worth degrading for, and a
      // raise lands in the catch.
      for (const [i, q] of questions.entries()) {
        const n = rowCount(row[`n${i}`]);
        if (n !== null) out.set(q.key, n);
      }
      return out;
    }
  } catch {
    // Fall through to the per-call pass.
  }

  for (const q of questions) {
    if (out.has(q.key)) continue;
    try {
      const row = await evaluate(countSelect([q.call]));
      const n = row ? rowCount(row["n0"]) : null;
      if (n !== null) out.set(q.key, n);
    } catch {
      // A call that raises contributes nothing, and the walk keeps the
      // unbounded default — which is what it had before this round existed.
    }
  }
  return out;
}
