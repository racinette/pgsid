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
import { createKillableEvaluator } from "./killable-evaluator.js";
import { inferNullability, UnsupportedNodeError } from "../../../src/query/nullability-walk.js";
import type { JoinAudit } from "../../../src/query/types.js";
import {
  classifyPlannerStronger,
  countPlanOuterJoins,
  survivingOuterJoins,
} from "./explain-instrument.js";
import { delegateTypesVia } from "./delegate-types.js";
import {
  loadSqlcCases,
  sqlcExpectedNullability,
  SQLC_MACRO_RE,
  SQLC_VERSION,
  DISAGREEMENTS,
  ADJUDICATED,
} from "./sqlc-corpus.js";

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
  // The miner census. sqlc agrees on 512 columns; claims it holds weaker
  // (walk proves notNull) on 14; claims it holds STRONGER on 15 — the
  // adjudicator's worklist, where each entry is either sqlc unsoundness
  // (ticket, counterexample as repro) or a pgsid defect (fixture + fix),
  // decided by data, never by priors.
  //
  // Moved twice on 2026-08-20, 502/25 → 508/19 → 512/15, and the arithmetic
  // is the check that nothing else moved with them:
  //
  //   -6  the function overload merge
  //       threaded a body parameter's declared type into the signature
  //       dispatch, so `concat_lower_or_upper(…)` narrows `UPPER($1)` — the
  //       six `sql_syntax_calling_funcs` entries;
  //   -2  `nextval`/`currval`/`setval`/`lastval` admitted to
  //       STRICT_TOTAL_BUILTINS: volatile, but a raise is not a NULL;
  //   -1  the strict-SRF `returnsSet` exclusion — a nullable argument to
  //       `generate_series` subtracts ROWS, not values;
  //   -1  the subtree evaluator wired into THIS harness. `builtins/Scale` was
  //       never an engine disagreement; the walk folded `scale(8.41)` all
  //       along and the harness was asking without `evaluate`.
  //
  // The register carries no `pgsid-imprecision` entries after this.
  minerAgree: 512,
  minerPgsidStronger: 14,
  minerSqlcStronger: 15,
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

/**
 * Every disagreeing column, BY NAME. The census above counts them; this says
 * WHICH — the identity `expect(tally).toEqual(PINS)` cannot carry, because two
 * compensating moves (one entry settled, one new one appearing) leave every
 * count where it was. Keyed `case/query#column (name)`, which is also how the
 * disagreement register heads its entries, so the pin and the register
 * are greppable to each other.
 */
const disagreements = new Map<string, string>();
/**
 * The same keys, re-derived FROM ROWS under each case's own `data.sql`:
 * `sqlc-convicted` when a column sqlc calls NOT NULL came back NULL,
 * `attempted` when the state built to produce that NULL did not, `no-rows`
 * when nothing executed. A NULL in a column the WALK calls notNull is not a
 * verdict at all — it is an unsoundness, and it lands in hardViolations where
 * no pin can absorb it.
 */
const adjudicated = new Map<string, string>();
/** Statements a data state made raise — never silently dropped. */
const adjudicationErrors: string[] = [];
/**
 * Structural problems in OUR half of a case directory: a conclusion drawn
 * against a different sqlc release, an entry key naming a column that no
 * longer disagrees, a disagreement with no conclusion. Each is a way the
 * per-case files and the corpus can part without any claim being wrong, which
 * is exactly the drift the layout exists to make loud.
 */
const adjudicationDrift: string[] = [];

describe("sqlc borrowed corpus (PostgreSQL-judged)", () => {
  beforeAll(async () => {
    const cases = loadSqlcCases();
    tally.cases = cases.length;
    for (const c of cases) {
      // A conclusion is only about the release it was drawn against.
      if (c.adjudication && c.adjudication.adjudicatedAgainst !== SQLC_VERSION) {
        adjudicationDrift.push(
          `${c.name}: adjudicated against ${c.adjudication.adjudicatedAgainst}, ` +
            `corpus is ${SQLC_VERSION} — re-run the state and re-read the conclusion`,
        );
      }
      // data.sql without a conclusion is a state nobody drew anything from.
      if (c.data && !c.adjudication) {
        adjudicationDrift.push(`${c.name}: data.sql with no adjudication.json`);
      }
    }
    const pg = await PGlite.create({
      extensions: { uuid_ossp, pgcrypto, ltree, pg_trgm, citext },
    });
    let stmtCounter = 0;
    // Probes run on a KILLABLE instance (killable-evaluator.ts). This corpus
    // is EXTERNAL SQL, so it is the most likely place for a probe PGlite
    // will not finish — and on the shared `pg` such a probe blocks the
    // thread and hangs the suite rather than failing it. Each case opens a
    // SCOPE holding its own schema: rebuilding an instance per case would
    // cost ~500ms across 253 of them against a 27s suite, and the scope is
    // one round trip. It is re-opened after a kill, so a case never
    // silently continues against an empty database.
    const evaluator = await createKillableEvaluator({
      extensions: ["uuid_ossp", "pgcrypto", "ltree", "pg_trgm", "citext"],
    });

    for (const c of cases) {
      await pg.exec("BEGIN;");
      let catalog;
      try {
        await pg.exec(c.schema);
        catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
        await evaluator.beginScope(c.schema);
      } catch {
        tally.schemaFailed++;
        await pg.exec("ROLLBACK;");
        continue;
      }

      // The half sqlc does not ship: `data.sql` beside the vendored files.
      // Applied once per case, inside the case's own transaction, so every
      // query below sees it and the ROLLBACK at the end takes it away again.
      const caseData = c.adjudication;
      /** Entry keys this run actually reached, for the stale-conclusion check. */
      const usedEntries = new Set<string>();
      if (c.data) {
        try {
          await pg.exec(c.data);
        } catch (e) {
          hardViolations.push(`${c.name}: data.sql failed: ${(e as Error).message}`);
        }
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
            // The subtree evaluator, wired as both fixture suites wire it.
            // Without it no closed subtree is ever folded, and the register
            // then records a DISAGREEMENT that is an artefact of how this
            // harness asks — `builtins/Scale` was exactly that, and asking the
            // walk the question with one hand tied is not a measurement of the
            // walk. A raising subtree is ordinary (`5 / 0` is closed), and
            // the evaluator savepoints each probe inside the case's scope so
            // one raise cannot abort the scope and take every later probe
            // with it.
            evaluate: evaluator.evaluate,
            // Type-resolution delegation, ON since 2026-08-24. Foreign input
            // is where a delegated type is most likely to be asked a question
            // the fixture corpus never poses, and the judge here is
            // PostgreSQL — the same one the delegation asks.
            resolveColumnTypes: delegateTypesVia(evaluator.evaluate),
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
        const disagreeing: number[] = [];
        if (typeof expected === "string") {
          tally.minerUndecodable++;
        } else if (expected.length !== claims.length) {
          tally.minerShapeSkew++;
          disagreements.set(
            `${c.name}/${q.name}`,
            `shape-skew: sqlc ${expected.length}, walk ${claims.length}`,
          );
          // An arity skew is settled by the shape oracle above, which already
          // compared the walk's column list to a real execution's — there is
          // no column to look for a NULL in, so the conclusion stands alone.
          usedEntries.add(q.name);
          const skew = c.adjudication?.entries[q.name];
          if (!skew) {
            adjudicationDrift.push(`${c.name}: no adjudication.json entry for "${q.name}"`);
          }
          adjudicated.set(
            `${c.name}/${q.name}`,
            `shape-skew · ${skew?.disposition ?? "UNADJUDICATED"}` +
              (skew?.ticket ? ` (${skew.ticket})` : ""),
          );
        } else {
          for (let i = 0; i < expected.length; i++) {
            const s = expected[i]!.notNull;
            const p = claims[i]!.notNull;
            if (s === p) {
              tally.minerAgree++;
              continue;
            }
            if (p && !s) tally.minerPgsidStronger++;
            else tally.minerSqlcStronger++;
            disagreeing.push(i);
            disagreements.set(
              `${c.name}/${q.name}#${i} (${expected[i]!.column})`,
              p && !s ? "pgsid-stronger" : "sqlc-stronger",
            );
          }
        }

        // --- adjudication, from rows -------------------------------------
        //
        // Only cases carrying a data state execute. The corpus holds 379
        // analyzed queries and inventing a binding for one nobody reasoned
        // about would manufacture rows with no argument behind them — the
        // opposite of what this layer is for.
        if (!caseData || typeof expected === "string") continue;
        const bindings = caseData.args?.[q.name] ?? (/\$\d/.test(bare) ? null : [[]]);
        if (!bindings) continue;

        const sawNull = new Set<number>();
        let rowsSeen = 0;
        for (const args of bindings) {
          await pg.exec("SAVEPOINT adj;");
          try {
            const res = await pg.query(bare, args as unknown[], { rowMode: "array" });
            rowsSeen += res.rows.length;
            for (const row of res.rows as unknown[][]) {
              row.forEach((v, i) => {
                if (v === null) sawNull.add(i);
              });
            }
          } catch (e) {
            adjudicationErrors.push(
              `${c.name}/${q.name} [${JSON.stringify(args)}]: ${(e as Error).message}`,
            );
          } finally {
            await pg.exec("ROLLBACK TO SAVEPOINT adj;");
          }
        }

        // The soundness assertion this suite could not make before: over
        // EVERY column, not only the disputed ones. A claim the walk makes and
        // PostgreSQL contradicts is a bug wherever it appears.
        for (let i = 0; i < claims.length; i++) {
          if (claims[i]!.notNull && sawNull.has(i)) {
            hardViolations.push(
              `PGSID UNSOUNDNESS ${c.name}/${q.name}#${i} (${claims[i]!.name}): ` +
                `claimed notNull, a row under the recorded state has NULL`,
            );
          }
        }

        for (const i of disagreeing) {
          const local = `${q.name}#${i} (${expected[i]!.column})`;
          const verdict = sawNull.has(i)
            ? claims[i]!.notNull
              ? "pgsid-convicted"
              : "sqlc-convicted"
            : rowsSeen === 0
              ? "no-rows"
              : "attempted";
          // The verdict is what the rows say; the disposition is what it MEANT,
          // and the pair is what the register prints. A disagreement with no
          // conclusion beside it is unfinished work, not a passing test.
          usedEntries.add(local);
          const entry = caseData.entries[local];
          if (!entry) {
            adjudicationDrift.push(
              `${c.name}: no adjudication.json entry for "${local}"`,
            );
          }
          adjudicated.set(
            `${c.name}/${local}`,
            `${verdict} · ${entry?.disposition ?? "UNADJUDICATED"}` +
              (entry?.ticket ? ` (${entry.ticket})` : ""),
          );
        }
      }

      // The reverse orphan, and the one that matters most on a sqlc bump: a
      // conclusion whose disagreement no longer exists. Silence here would
      // read as "still true" when what actually happened is that sqlc changed
      // its mind and nobody re-read the entry.
      for (const key of Object.keys(caseData?.entries ?? {})) {
        if (!usedEntries.has(key)) {
          adjudicationDrift.push(
            `${c.name}: adjudication.json entry "${key}" no longer disagrees — re-read it`,
          );
        }
      }
      await pg.exec("ROLLBACK;");
      await evaluator.endScope();
    }
    await evaluator.close();
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

  it("every disagreement is pinned by name", () => {
    expect(Object.fromEntries([...disagreements].sort())).toEqual(DISAGREEMENTS);
  });

  it("every disagreement's verdict and disposition are pinned by name", () => {
    expect(Object.fromEntries([...adjudicated].sort())).toEqual(ADJUDICATED);
  });

  it("our half of every case is current", () => {
    // Four ways the per-case files and the corpus can part without any claim
    // being wrong: a conclusion drawn against another sqlc release, a state
    // with no conclusion, a disagreement with no entry, an entry whose
    // disagreement is gone. Each is the drift a count-only pin absorbed.
    expect(adjudicationDrift).toEqual([]);
  });

  it("no data state raises", () => {
    expect(adjudicationErrors).toEqual([]);
  });

  it("corpus report", () => {
    console.log(
      `sqlc corpus: ${JSON.stringify(tally)}\n  refusals: ${JSON.stringify([...refusalKeys])}` +
        `\n  explain-fail: ${JSON.stringify([...explainFailKeys])}` +
        `\n  disagreements: ${JSON.stringify(Object.fromEntries([...disagreements].sort()), null, 1)}` +
        `\n  adjudicated: ${JSON.stringify(Object.fromEntries([...adjudicated].sort()), null, 1)}`,
    );
  });
});
