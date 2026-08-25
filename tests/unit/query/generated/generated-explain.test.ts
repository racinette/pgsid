import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { deparseSync } from "pgsql-deparser";
import { parseSql } from "../../../../src/ast.js";
import { snapshotCatalog } from "../../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../../src/query/catalog-adapter.js";
import { inferNullability, UnsupportedNodeError } from "../../../../src/query/nullability-walk.js";
import type { JoinAudit, NullabilityCatalog } from "../../../../src/query/types.js";
import {
  classifyPlannerStronger,
  countPlanOuterJoins,
  survivingOuterJoins,
  type DivergenceCause,
} from "../explain-instrument.js";
import {
  generateDeepJoinQueries,
  generateDmlQueries,
  generateParamPlacementQueries,
  generateQueries,
} from "./generator.js";

// ---------------------------------------------------------------------------
// The EXPLAIN oracle over the GENERATED corpus — agreement measured, not
// declared. The hand-written fixtures hold the oracle with @planner-keeps
// annotations (explain-oracle.test.ts); the generated corpus has no
// annotation channel, so this suite measures agreement over the enumerated
// structural space and reports the divergence classes.
//
// What IS asserted, because it needs no annotations:
//
//   - every planner-stronger divergence CLASSIFIES: the instrument goes into
//     the query and attributes it to a known cause with a recorded verdict
//     (see the classifier's header in explain-instrument.ts — known
//     imprecision, out-of-scope uniqueness removal, or an instrument blind
//     spot). An unexplained divergence fails loudly, naming the query: it is
//     the one reading of "the planner did better" that must never sit
//     unexamined.
//   - the per-cause counts hold their PINS, both directions: growth means
//     the corpus reached more of a known class (re-pin deliberately), shrink
//     means an engine or instrument change closed some (re-pin, and consider
//     whether the cause is done).
//   - every query that the engine analyzes also EXPLAINs: this corpus's own
//     doctrine is that PostgreSQL rejecting a generated statement is a
//     generator defect, and planning is no exception.
//
// engine-stronger is REPORTED, not asserted: without an annotation channel a
// divergence here is expected wherever the walk holds evidence the planner
// lacks (keys, CHECKs, cross-branch refilters, MERGE's no-JoinExpr
// matching), and the report is the reconnaissance that would justify any
// future bar.
// ---------------------------------------------------------------------------

const SCHEMA_SQL = readFileSync(join(__dirname, "..", "fixtures", "schema.sql"), "utf8");

interface ExplainRecord {
  id: string;
  sql: string;
  audited: number;
  surviving: number;
  plan: number;
}

const compared: ExplainRecord[] = [];
const causeCounts = new Map<DivergenceCause, number>();
const unexplained: string[] = [];
const explainFailures: string[] = [];
let skipped = { rejected: 0, refused: 0, crashed: 0 };

/**
 * The pinned divergence census. Exact because the enumeration is
 * deterministic; each cause's verdict lives on the classifier. Re-pin
 * deliberately on any change, in either direction.
 */
const CAUSE_PINS: Record<DivergenceCause, number> = {
  // 436 before the participation closure landed in the fixpoint; the
  // classifier stays armed so a regression re-opens the class by name.
  "slice-local-strict-qual": 0,
  // 138 before the closure: those queries' walks now settle the same joins
  // the planner removes, so the divergence itself is gone. A PURE removal
  // (unique unreferenced side, no settling qual) would still classify here
  // and is pinned in the hand corpus (explain-join-removal.sql).
  "join-removal": 0,
  // 3 before the unitCrossings channel closed the instrument's gap
  // (claims now carry crossings for anchor-less pass-throughs — SRFs, and
  // through set-operation branches); the classifier stays armed.
  "srf-unit-blindspot": 0,
};

describe("generated-query EXPLAIN oracle (planner vs the walk)", () => {
  beforeAll(async () => {
    const pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(SCHEMA_SQL);
    const snapshot = await snapshotCatalog(pg);
    const catalog: NullabilityCatalog = await buildNullabilityCatalog(snapshot);

    for (const query of [
      ...generateQueries(),
      ...generateDmlQueries(),
      ...generateParamPlacementQueries(),
      ...generateDeepJoinQueries(),
    ]) {
      let sql: string;
      let stmt;
      try {
        sql = deparseSync(query.ast as Parameters<typeof deparseSync>[0]);
        stmt = (await parseSql(sql)).stmts?.[0]?.stmt;
        if (!stmt) throw new Error("no statement");
      } catch {
        skipped.rejected++;
        continue;
      }

      const joinAudit: JoinAudit[] = [];
      let surviving: number;
      let audited: number;
      try {
        const claims = await inferNullability(stmt, catalog, {
          joinAudit,
          collectUnitCrossings: true,
        });
        audited = joinAudit.length;
        surviving = survivingOuterJoins(joinAudit, claims);
      } catch (e) {
        if (e instanceof UnsupportedNodeError) skipped.refused++;
        else skipped.crashed++;
        continue;
      }

      const options = /\$\d/.test(sql) ? "FORMAT JSON, GENERIC_PLAN" : "FORMAT JSON";
      await pg.exec("BEGIN;");
      let plan: number | null = null;
      let tree: unknown = null;
      try {
        const res = await pg.exec(`EXPLAIN (${options}) ${sql}`);
        const row = res[res.length - 1]!.rows[0] as Record<string, unknown>;
        tree = typeof row["QUERY PLAN"] === "string"
          ? JSON.parse(row["QUERY PLAN"] as string)
          : row["QUERY PLAN"];
        plan = countPlanOuterJoins(tree);
      } catch (e) {
        explainFailures.push(`${query.id}: ${(e as Error).message}  [${sql}]`);
      } finally {
        await pg.exec("ROLLBACK;");
      }
      if (plan === null) continue;

      compared.push({ id: query.id, sql, audited, surviving, plan });
      if (surviving > plan) {
        const cause = classifyPlannerStronger(stmt, tree);
        if (cause === null) {
          unexplained.push(`${query.id}: surviving=${surviving} plan=${plan}  [${sql}]`);
        } else {
          causeCounts.set(cause, (causeCounts.get(cause) ?? 0) + 1);
        }
      }
    }
    await pg.close();
  }, 300_000);

  it("every analyzed query EXPLAINs", () => {
    expect(explainFailures).toEqual([]);
  });

  it("every planner-stronger divergence is explained", () => {
    expect(unexplained).toEqual([]);
  });

  it("the divergence census holds its pins", () => {
    const census = Object.fromEntries(
      Object.keys(CAUSE_PINS).map(c => [c, causeCounts.get(c as DivergenceCause) ?? 0]),
    );
    expect(census).toEqual(CAUSE_PINS);
  });

  it("corpus report", () => {
    const agree = compared.filter(r => r.surviving === r.plan).length;
    const engineStronger = compared.filter(r => r.surviving < r.plan);
    const plannerStrongerTotal =
      [...causeCounts.values()].reduce((a, b) => a + b, 0) + unexplained.length;
    const lines: string[] = [];
    lines.push(
      `generated EXPLAIN oracle over ${compared.length} queries ` +
        `(skipped: rejected=${skipped.rejected} refused=${skipped.refused} crashed=${skipped.crashed}):`,
    );
    lines.push(
      `  agree=${agree}  engine-stronger=${engineStronger.length}  planner-stronger=${plannerStrongerTotal}`,
    );
    for (const [cause, n] of [...causeCounts].sort((a, b) => b[1] - a[1])) {
      lines.push(`  planner-stronger  ${cause}  n=${n}`);
    }
    for (const u of unexplained.slice(0, 6)) {
      lines.push(`  UNEXPLAINED  ${u.replace(/\s+/g, " ")}`);
    }
    for (const r of engineStronger.slice(0, 6)) {
      lines.push(`  engine-stronger  ${r.id}  surviving=${r.surviving} plan=${r.plan}`);
    }
    if (engineStronger.length > 6) {
      lines.push(`  … ${engineStronger.length - 6} more engine-stronger (report truncated, not the data)`);
    }
    console.log(lines.join("\n"));
    expect(agree + engineStronger.length + plannerStrongerTotal).toBe(compared.length);
  });
});
