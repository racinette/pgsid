import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { JoinAudit, NullabilityCatalog } from "../../../src/query/types.js";
import { parseFixtureDirectives, DEDUCTION_FAILURE } from "./fixture-args.js";

// ---------------------------------------------------------------------------
// The EXPLAIN oracle.
//
// The planner's prep phase runs one static reasoner whose theory overlaps the
// walk's: reduce_outer_joins (optimizer/prep/prepjointree.c) converts an outer
// join to a plain join when a strict qual above it rejects NULL-extended rows
// — PostgreSQL's own implementation of WHERE promotion. It is logic-based, not
// cost-based, so the surviving outer joins are a deterministic property of the
// query, and they leak into public API: every plan node carries a "Join Type".
// EXPLAIN therefore corroborates the walk's join-state reasoning against the
// engine that defines correctness, with no extension and no internals.
//
// The comparison is COUNTS, not identities. Matching plan joins back to
// syntactic joins is not stable: the planner reorders joins, commutes a LEFT
// into a "Right" hash join for cost reasons, and pulls sublinks up into
// Semi/Anti joins that correspond to no FROM-clause join at all. So the
// instrument counts outer-join plan nodes ("Left", "Right", "Full" — exact
// match, which excludes "Right Anti" and friends) against the walk's own
// per-join verdicts (`WalkOptions.joinAudit`, the presence fixpoint's
// readout: one record per syntactic outer join, each extended side marked
// settled or surviving). The audit is scope-local while the planner is
// statement-global, so the oracle additionally subtracts units the engine's
// own claims refilter — a notNull column whose origin crosses a unit proves
// that unit's absent arm never reaches the output (see the survival comment
// in the loop below). The raw AST's outer JoinExpr count rides along as
// context. Classes:
//
//   agree            — the walk's surviving-outer-join count equals the
//                      plan's. Both provers concluded the same thing.
//   engine-stronger  — the walk reports fewer surviving joins than the plan.
//                      Expected where the evidence is CHECK or FK entailment
//                      (the planner makes neither inference), a cross-branch
//                      refilter, or MERGE's target/source join, which is no
//                      JoinExpr and invisible to the audit.
//   planner-stronger — the plan has fewer surviving outer joins than the
//                      walk: reduce_outer_joins acted where the fixpoint did
//                      not, or remove_useless_joins deleted a unique,
//                      unreferenced side. A precision lead, or worse.
//
// Interpretation discipline (the asymmetry matters): the planner acting is
// evidence; the planner declining proves nothing. The walk is deliberately
// stronger — CHECK entailment and FK entailment promote aliases
// reduce_outer_joins never will, because the planner does not make those
// inferences at all.
//
// Both directions are held, the @unwitnessable discipline: an
// engine-stronger fixture DECLARES its divergence — `-- @planner-keeps N:
// reason`, N = plan minus surviving, the reason naming the evidence the
// planner lacks — and the suite fails a divergence without an annotation
// (write the reasoning), an annotation whose N drifted (stale), and any
// planner-stronger fixture at all (the walk missed a reduction the planner
// makes from the same strict-qual theory: investigate before excusing).
//
// Plans are taken against the empty schema. Join reduction does not read
// statistics, so data states would only perturb join ORDER, which the counts
// are insensitive to. Parameterized fixtures use GENERIC_PLAN (PG16+), the
// same unbound-$n treatment the validity step's PREPARE gives them.
//
// Two failure classes are tolerated, mirroring the soundness runner: a
// parameter nothing constrains (DEDUCTION_FAILURE — PREPARE resolves it to
// text, and EXPLAIN goes the same way, but the class is kept for symmetry),
// and a fixture that declares @raises whose error arrives at plan time —
// planning runs eval_const_expressions, so a constant that folds to a domain
// violation raises under EXPLAIN where PREPARE alone succeeded. Anything else
// is a hard failure: an unexplainable fixture is new information.
// ---------------------------------------------------------------------------

const FIXTURES_DIR = join(__dirname, "fixtures");
const SCHEMA_SQL = readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8");

const fixtureFiles = readdirSync(FIXTURES_DIR)
  .filter(f => f.endsWith(".sql") && f !== "schema.sql")
  .sort();

interface Fixture {
  name: string;
  sql: string;
  raisesPattern: string | null;
  plannerKeeps: { count: number; reason: string } | null;
}

const fixtures: Fixture[] = fixtureFiles.map(file => {
  const sql = readFileSync(join(FIXTURES_DIR, file), "utf8");
  const name = basename(file, ".sql");
  const { raisesPattern, plannerKeeps } = parseFixtureDirectives(sql);
  return { name, sql, raisesPattern, plannerKeeps };
});

type OracleClass =
  | "agree"
  | "engine-stronger"
  | "planner-stronger"
  | "raises-at-plan"
  | "untypeable"
  | "unexplained";

interface OracleResult {
  name: string;
  /** Outer JoinExpr nodes in the fixture's own text (context only). */
  syntactic: number;
  /** Outer joins the walk analyzed (audit records, all scopes). */
  audited: number;
  /** Audited joins with at least one side still able to NULL-extend. */
  surviving: number;
  plan: number | null;
  cls: OracleClass;
  error: string | null;
}

const RAW_OUTER = new Set(["JOIN_LEFT", "JOIN_RIGHT", "JOIN_FULL"]);
const PLAN_OUTER = new Set(["Left", "Right", "Full"]);

/** Outer JoinExpr nodes anywhere in the raw AST — subqueries and CTEs included. */
function countRawOuterJoins(node: unknown): number {
  if (Array.isArray(node)) return node.reduce((n: number, c) => n + countRawOuterJoins(c), 0);
  if (node === null || typeof node !== "object") return 0;
  const rec = node as Record<string, unknown>;
  const join = rec["JoinExpr"] as Record<string, unknown> | undefined;
  let n = join && RAW_OUTER.has(join["jointype"] as string) ? 1 : 0;
  for (const v of Object.values(rec)) n += countRawOuterJoins(v);
  return n;
}

/** Outer-join plan nodes anywhere in the EXPLAIN JSON — subplans and CTEs included. */
function countPlanOuterJoins(node: unknown): number {
  if (Array.isArray(node)) return node.reduce((n: number, c) => n + countPlanOuterJoins(c), 0);
  if (node === null || typeof node !== "object") return 0;
  const rec = node as Record<string, unknown>;
  let n = typeof rec["Join Type"] === "string" && PLAN_OUTER.has(rec["Join Type"]) ? 1 : 0;
  for (const v of Object.values(rec)) n += countPlanOuterJoins(v);
  return n;
}

const results: OracleResult[] = [];
const violations: string[] = [];
const keepViolations: string[] = [];

describe("EXPLAIN oracle (planner join reduction vs the corpus)", () => {
  beforeAll(async () => {
    const pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(SCHEMA_SQL);
    const snapshot = await snapshotCatalog(pg);
    const catalog: NullabilityCatalog = await buildNullabilityCatalog(snapshot);

    for (const fixture of fixtures) {
      const parsed = await parseSql(fixture.sql);
      const syntactic = countRawOuterJoins(parsed.stmts);

      // The walk's verdicts, same analysis mode as the soundness suite.
      const joinAudit: JoinAudit[] = [];
      const claims = await inferNullability(parsed.stmts![0]!.stmt!, catalog, {
        evaluate: async s => (await pg.query<Record<string, unknown>>(s)).rows[0],
        joinAudit,
      });
      const audited = joinAudit.length;

      // Statement-level survival. The audit's settled flags are scope-local;
      // the planner's verdict is statement-global (it flattens scopes, so an
      // outer WHERE reduces an inner join). The engine states the same
      // global fact through its CLAIMS: a column proved notNull whose origin
      // crosses unit U means U's absent arm never reaches the output — a
      // NULL-extended slice has every pass-through NULL. So a side counts as
      // surviving only when it is locally unsettled AND no claim refilters
      // its unit.
      const refiltered = new Set<number>();
      for (const c of claims) {
        if (!c.notNull || !c.origins) continue;
        for (const o of c.origins) {
          for (const u of o?.units ?? []) refiltered.add(u.unit);
        }
      }
      const surviving = joinAudit.filter(
        a =>
          (a.leftSettled === false && !refiltered.has(a.leftGroup!)) ||
          (a.rightSettled === false && !refiltered.has(a.rightGroup!)),
      ).length;

      const options = /\$\d/.test(fixture.sql) ? "FORMAT JSON, GENERIC_PLAN" : "FORMAT JSON";
      await pg.exec("BEGIN;");
      let plan: number | null = null;
      let error: string | null = null;
      try {
        const res = await pg.exec(`EXPLAIN (${options}) ${fixture.sql}`);
        const row = res[res.length - 1]!.rows[0] as Record<string, unknown>;
        const tree = typeof row["QUERY PLAN"] === "string"
          ? JSON.parse(row["QUERY PLAN"] as string)
          : row["QUERY PLAN"];
        plan = countPlanOuterJoins(tree);
      } catch (e) {
        error = (e as Error).message;
      } finally {
        await pg.exec("ROLLBACK;");
      }

      let cls: OracleClass;
      if (error !== null) {
        if (fixture.raisesPattern !== null && error.includes(fixture.raisesPattern)) {
          cls = "raises-at-plan";
        } else if (DEDUCTION_FAILURE.test(error)) {
          cls = "untypeable";
        } else {
          cls = "unexplained";
          violations.push(`${fixture.name}: EXPLAIN failed outside every tolerated class: ${error}`);
        }
      } else if (surviving < plan!) {
        cls = "engine-stronger";
      } else if (surviving > plan!) {
        cls = "planner-stronger";
      } else {
        cls = "agree";
      }

      // The both-directions bar. `delta` is what EXPLAIN keeps beyond the
      // walk; the fixture's @planner-keeps must state exactly that, with the
      // reasoning, or exactly nothing.
      const declared = fixture.plannerKeeps?.count ?? 0;
      if (plan === null) {
        if (fixture.plannerKeeps) {
          keepViolations.push(
            `${fixture.name}: @planner-keeps declared but the statement does not plan — stale`,
          );
        }
      } else {
        const delta = plan - surviving;
        if (delta < 0) {
          keepViolations.push(
            `${fixture.name}: planner-stronger (surviving=${surviving} plan=${plan}) — the ` +
              `planner settled or removed a join the walk still counts; investigate before excusing`,
          );
        } else if (delta !== declared) {
          keepViolations.push(
            fixture.plannerKeeps
              ? `${fixture.name}: @planner-keeps ${declared} is stale — plan=${plan} ` +
                  `surviving=${surviving} keeps ${delta}`
              : `${fixture.name}: EXPLAIN keeps ${delta} outer join(s) the walk settles ` +
                  `(plan=${plan} surviving=${surviving}) with no @planner-keeps — write the reasoning`,
          );
        }
      }
      results.push({ name: fixture.name, syntactic, audited, surviving, plan, cls, error });
    }
    await pg.close();
  }, 180_000);

  it("every fixture EXPLAINs, or raises exactly what it declares", () => {
    expect(violations).toEqual([]);
  });

  it("the planner keeps exactly what each fixture declares", () => {
    expect(keepViolations).toEqual([]);
  });

  it("corpus report", () => {
    const by = (cls: OracleClass) => results.filter(r => r.cls === cls);
    const lines: string[] = [];
    lines.push(`EXPLAIN oracle over ${results.length} fixtures:`);
    lines.push(
      `  agree=${by("agree").length}` +
        `  engine-stronger=${by("engine-stronger").length}` +
        `  planner-stronger=${by("planner-stronger").length}` +
        `  raises-at-plan=${by("raises-at-plan").length}` +
        `  untypeable=${by("untypeable").length}` +
        `  unexplained=${by("unexplained").length}`,
    );
    const detail = (r: OracleResult) =>
      `syntactic=${r.syntactic} audited=${r.audited} surviving=${r.surviving} plan=${r.plan}`;
    for (const r of by("planner-stronger")) {
      lines.push(`  planner-stronger  ${r.name}  ${detail(r)}`);
    }
    for (const r of by("engine-stronger")) {
      lines.push(`  engine-stronger   ${r.name}  ${detail(r)}`);
    }
    // eslint-disable-next-line no-console
    console.log(lines.join("\n"));

    // The report holds only its own bookkeeping — every fixture lands in
    // exactly one class; the two tests above are the bar.
    const total =
      by("agree").length +
      by("engine-stronger").length +
      by("planner-stronger").length +
      by("raises-at-plan").length +
      by("untypeable").length +
      by("unexplained").length;
    expect(total).toBe(results.length);
  });
});
