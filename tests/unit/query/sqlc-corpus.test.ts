import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { ltree } from "@electric-sql/pglite/contrib/ltree";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability, UnsupportedNodeError } from "../../../src/query/nullability-walk.js";
import type { JoinAudit } from "../../../src/query/types.js";
import {
  classifyPlannerStronger,
  countPlanOuterJoins,
  survivingOuterJoins,
} from "./explain-instrument.js";
import { loadSqlcCases, sqlcExpectedNullability, SQLC_MACRO_RE } from "./sqlc-corpus.js";

// ---------------------------------------------------------------------------
// The sqlc borrowed corpus, judged by PostgreSQL. See
// sqlc-corpus/PROVENANCE.md for what is vendored; sqlc-corpus.ts for the
// enumeration and the expected-output miner.
//
// The JUDGE is PostgreSQL, exactly as for the generated corpus — foreign
// inputs, same answer key:
//
//   - validity: PREPARE gates every query; a failure lands in a counted
//     class (sqlc's own deliberately-invalid cases, CALL/NOTIFY utilities).
//   - shape: the engine's column COUNT must match a real execution's — the
//     complete oracle, and it works on the empty schema. Names are compared
//     only where the engine produces one (foreign queries lean on name
//     rules the engine deliberately does not implement — see the
//     deferred-tasks register on output names) and drift is pinned, not
//     fatal.
//   - EXPLAIN census: surviving outer joins vs the plan's; planner-stronger
//     must classify (explain-instrument.ts) or the suite fails naming the
//     query.
//   - refusals and crashes: pinned by exact key, both directions.
//
// sqlc's own expectations are NOT a judge. The miner decodes them into a
// three-way per-column census — agree / pgsid-stronger / sqlc-stronger —
// pinned here so drift surfaces, and emitted in full by
// tests/probe/sqlc-register.ts as the disagreement register the
// adjudicator walks: every sqlc-stronger entry is either sqlc unsoundness
// (ticket, with the counterexample as repro) or a pgsid defect
// (fixture + fix), and only a counterexample with data decides which.
// Soundness is deliberately NOT asserted on this corpus: sqlc ships no
// data, and a zero-row execution asserts nothing.
// ---------------------------------------------------------------------------

/**
 * The pinned census. Exact: the corpus is vendored (PROVENANCE.md pins the
 * upstream release) and the engine is deterministic. Re-pin deliberately —
 * a corpus refresh or an engine change must MOVE these to land.
 */
const PINS = {
  cases: 253,
  // ddl_create_table_invalid_inherits + ddl_create_table_unknown_type
  // (sqlc's own deliberately-invalid DDL cases), exec_lastid (not
  // PostgreSQL syntax), pg_vector (the one excluded extension —
  // PROVENANCE.md).
  schemaFailed: 4,
  queries: 494,
  macroSkipped: 84,
  // sqlc's deliberately-invalid query cases plus CALL/NOTIFY/DO utilities
  // PREPARE does not accept; PostgreSQL is the gate, so the count is the
  // pin and a corpus refresh moving it is a real event.
  prepareFailed: 31,
  analyzed: 379,
  refused: 0,
  crashed: 0,
  countMismatch: 0,
  nameMismatch: 0,
  // on_duplicate_key_update: ON CONFLICT arbiter matching is plan-time
  // validation, so EXPLAIN raises where PREPARE succeeded (key pinned
  // below).
  explainFailed: 1,
  plannerStronger: 0,
  // The miner census. sqlc agrees on 502 columns; claims it holds weaker
  // (walk proves notNull) on 14; claims it holds STRONGER on 25 — the
  // adjudicator's worklist (tests/probe/sqlc-register.ts), where each entry
  // is either sqlc unsoundness (ticket, counterexample as repro) or a pgsid
  // defect (fixture + fix), decided by data, never by priors.
  minerAgree: 502,
  minerPgsidStronger: 14,
  minerSqlcStronger: 25,
  // No row shape (:exec family), sqlc-refused cases, queries missing from
  // the IR.
  minerUndecodable: 117,
  // One query where the walk's column list matches PostgreSQL's but sqlc's
  // IR arity differs — a lead about sqlc's shape handling, visible in the
  // register.
  minerShapeSkew: 1,
};

const tally: Record<keyof typeof PINS, number> = Object.fromEntries(
  Object.keys(PINS).map(k => [k, 0]),
) as never;
const hardViolations: string[] = [];
const refusalKeys = new Map<string, number>();
const explainFailKeys = new Map<string, number>();

describe("sqlc borrowed corpus (PostgreSQL-judged)", () => {
  beforeAll(async () => {
    const cases = loadSqlcCases();
    tally.cases = cases.length;
    const pg = await PGlite.create({
      extensions: { uuid_ossp, pgcrypto, ltree, pg_trgm, citext },
    });
    let stmtCounter = 0;

    for (const c of cases) {
      await pg.exec("BEGIN;");
      let catalog;
      try {
        await pg.exec(c.schema);
        catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
      } catch {
        tally.schemaFailed++;
        await pg.exec("ROLLBACK;");
        continue;
      }

      for (const q of c.queries) {
        tally.queries++;
        if (SQLC_MACRO_RE.test(q.sql)) {
          tally.macroSkipped++;
          continue;
        }
        const bare = q.sql.replace(/;\s*$/, "");

        await pg.exec("SAVEPOINT q;");
        let prepared = false;
        try {
          await pg.exec(`PREPARE sqlc_probe_${stmtCounter++} AS ${bare}`);
          prepared = true;
        } catch {
          tally.prepareFailed++;
          await pg.exec("ROLLBACK TO SAVEPOINT q;");
        }
        if (!prepared) continue;

        let stmt;
        try {
          stmt = (await parseSql(q.sql)).stmts?.[0]?.stmt;
          if (!stmt) throw new Error("no statement");
        } catch (e) {
          tally.crashed++;
          hardViolations.push(`${c.name}/${q.name}: parse: ${(e as Error).message}`);
          continue;
        }

        const joinAudit: JoinAudit[] = [];
        let claims;
        try {
          claims = await inferNullability(stmt, catalog, {
            joinAudit,
            collectUnitCrossings: true,
          });
          tally.analyzed++;
        } catch (e) {
          if (e instanceof UnsupportedNodeError) {
            tally.refused++;
            const key = `${e.site}:${e.nodeType}`;
            refusalKeys.set(key, (refusalKeys.get(key) ?? 0) + 1);
          } else {
            tally.crashed++;
            hardViolations.push(`${c.name}/${q.name}: ${(e as Error).message.slice(0, 140)}`);
          }
          await pg.exec("ROLLBACK TO SAVEPOINT q;");
          continue;
        }

        // Shape, against the empty schema; the binding cannot change the
        // column list, so NULL literals stand in for every parameter. Its
        // OWN savepoint: a tolerated execution failure must not poison the
        // transaction the EXPLAIN below still needs.
        await pg.exec("SAVEPOINT shape;");
        try {
          const fields = (await pg.query(bare.replace(/\$\d+/g, "NULL"))).fields;
          if (fields.length !== claims.length) {
            tally.countMismatch++;
            hardViolations.push(
              `${c.name}/${q.name}: shape: engine=${claims.length} pg=${fields.length}`,
            );
          } else {
            for (let i = 0; i < fields.length; i++) {
              const en = claims[i]!.name;
              if (en !== "" && en !== fields[i]!.name) tally.nameMismatch++;
            }
          }
        } catch {
          /* execution-only failure (a cast NULL cannot satisfy); PREPARE already gated */
        } finally {
          await pg.exec("ROLLBACK TO SAVEPOINT shape;");
        }

        // EXPLAIN census.
        try {
          const opts = /\$\d/.test(bare) ? "FORMAT JSON, GENERIC_PLAN" : "FORMAT JSON";
          const res = await pg.exec(`EXPLAIN (${opts}) ${bare}`);
          // A query with a trailing comment after its semicolon makes exec
          // see two statements; the plan sits on the last result WITH rows.
          const planRow = res
            .flatMap(r => r.rows as Record<string, unknown>[])
            .filter(r => r && "QUERY PLAN" in r)
            .pop();
          const tree = planRow?.["QUERY PLAN"];
          if (tree === undefined) throw new Error("no QUERY PLAN row");
          const plan = countPlanOuterJoins(tree);
          const surviving = survivingOuterJoins(joinAudit, claims);
          if (surviving > plan) {
            tally.plannerStronger++;
            const cause = classifyPlannerStronger(stmt, tree);
            if (cause === null) {
              hardViolations.push(
                `${c.name}/${q.name}: planner-stronger UNEXPLAINED (surviving=${surviving} plan=${plan})`,
              );
            }
          }
        } catch (e) {
          tally.explainFailed++;
          const key = `${c.name}/${q.name}: ${(e as Error).message.slice(0, 90)}`;
          explainFailKeys.set(key, (explainFailKeys.get(key) ?? 0) + 1);
        }
        await pg.exec("ROLLBACK TO SAVEPOINT q;");

        // The miner census (full register: tests/probe/sqlc-register.ts).
        const expected = sqlcExpectedNullability(c, q);
        if (typeof expected === "string") {
          tally.minerUndecodable++;
        } else if (expected.length !== claims.length) {
          tally.minerShapeSkew++;
        } else {
          for (let i = 0; i < expected.length; i++) {
            const s = expected[i]!.notNull;
            const p = claims[i]!.notNull;
            if (s === p) tally.minerAgree++;
            else if (p && !s) tally.minerPgsidStronger++;
            else tally.minerSqlcStronger++;
          }
        }
      }
      await pg.exec("ROLLBACK;");
    }
    await pg.close();
  }, 600_000);

  it("nothing crashes, shapes match, every planner divergence classifies", () => {
    expect(hardViolations).toEqual([]);
  });

  it("the census holds its pins", () => {
    expect(tally).toEqual(PINS);
  });

  it("refusals and explain failures are pinned by key", () => {
    expect([...refusalKeys.entries()].sort()).toEqual([]);
    expect([...explainFailKeys.keys()]).toEqual([
      "on_duplicate_key_update/UpsertAuthor: there is no unique or exclusion constraint matching the ON CONFLICT specification",
    ]);
  });

  it("corpus report", () => {
    // eslint-disable-next-line no-console
    console.log(
      `sqlc corpus: ${JSON.stringify(tally)}\n  refusals: ${JSON.stringify([...refusalKeys])}` +
        `\n  explain-fail: ${JSON.stringify([...explainFailKeys])}`,
    );
  });
});
