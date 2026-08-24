import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import {
  inferNullability,
  UnsupportedNodeError,
} from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";
import { splitPsql } from "./pg-regress/split.js";
import { createReplaySession, type ReplaySession } from "./pg-regress/replay-session.js";

// ---------------------------------------------------------------------------
// The PostgreSQL regression suite as a borrowed corpus — deferred item 7,
// pulled by the harness-strengthening handoff (item 4).
//
// PROVENANCE: `pglite/postgres-pglite/src/test/regress/sql` — 232 stateful
// scripts, PostgreSQL License, the engine authors' own corpus. The prize is
// SYNTAX coverage: refusal-census and shape-oracle reach over every construct
// PostgreSQL has, which is exactly where sweep 4 found defects cluster (FROM
// items — the model of "what rows does this produce"). NO nullability
// assertions in this pass, deliberately: the corpus's data mostly never loads
// (the big COPYs read files through psql variables this replay does not
// emulate), so witnessing here would be witnessing against near-empty tables.
//
// The replay treats the corpus the way pg_regress does, minus psql: files run
// in parallel_schedule order in ONE accumulating session (later groups build
// on earlier groups' objects), each file cut into psql-style units
// (pg-regress/split.ts), each statement EXECUTED — execution is a stronger
// gate than the sqlc suite's PREPARE, and its field list is the shape
// oracle's other half for free. For every successfully-executed SELECT/DML
// the engine analyses the statement against the ACCUMULATED catalog
// (re-snapshotted lazily, only when DDL landed since the last one, under the
// session's live search_path), and the sqlc-corpus bars hold:
//
//   - no engine crash: a non-refusal throw is a finding, listed by statement;
//   - refusals counted and PINNED BY NAME (site:nodeType), both directions;
//   - the column list matches the execution's, by ordered name where the
//     engine names a column (the empty-name degradation is per position,
//     as in the contract gate).
//
// Expected breakage lives in the PLUMBING, not the engine, and is counted
// rather than hidden: psql metacommands are skipped as units, `\if` branches
// both replay, `:'var'` interpolation fails as ordinary statement failures,
// and a statement the WATCHDOG kills loses the instance — the file is
// abandoned (counted), the session reboots, test_setup re-runs, and the next
// file starts against a fresh database. PGlite is wedgeable by design here
// (AGENTS.md rule 8; tests/probe/poison-hunt.ts), which is why every
// statement runs in a killable worker and never on this thread.
//
// The census is pinned EXACTLY, like the sqlc suite's: the corpus is a
// vendored tree and the engine is deterministic, so a moved number is a real
// event. Pin by NAME wherever a name exists — a compensating swap must not
// hide behind a stable total.
//
// The replay is OPT-IN (REGRESS_REPLAY=1): a full pass executes ~47k
// statements and takes ~10 minutes of wall clock, which does not belong in
// the default suite the way the 27s sqlc pass does. The census pins hold
// whenever it runs:
//
//   REGRESS_REPLAY=1 pnpm exec vitest run tests/unit/query/pg-regress.test.ts
//
// REGRESS_REPORT=1 prints the full census. REGRESS_LIMIT=<n> replays only the
// first n scheduled files — a development knob; the pins only hold unlimited.
// ---------------------------------------------------------------------------

const REGRESS_DIR = join(
  __dirname, "..", "..", "..", "..",
  "pglite", "postgres-pglite", "src", "test", "regress",
);
const SQL_DIR = join(REGRESS_DIR, "sql");

/** Files not replayed, each with its measured reason. */
const SKIP_FILES: Record<string, string> = {};

const ANALYZABLE_ROOTS = new Set([
  "SelectStmt",
  "InsertStmt",
  "UpdateStmt",
  "DeleteStmt",
  "MergeStmt",
]);

/** Roots that cannot move the catalog, so they leave the snapshot clean. */
const CATALOG_INERT_ROOTS = new Set([
  ...ANALYZABLE_ROOTS,
  "TransactionStmt",
  "VariableShowStmt",
  "ExplainStmt",
  "PrepareStmt",
  "ExecuteStmt",
  "DeallocateStmt",
  "ListenStmt",
  "NotifyStmt",
  "UnlistenStmt",
  "CheckPointStmt",
  "LockStmt",
  "FetchStmt",
  "ClosePortalStmt",
  "DeclareCursorStmt",
  "CopyStmt",
  "VacuumStmt",
  "ClusterStmt",
  "ReindexStmt",
]);

function scheduledOrder(): string[] {
  const schedule = readFileSync(join(REGRESS_DIR, "parallel_schedule"), "utf8");
  const ordered: string[] = [];
  for (const line of schedule.split("\n")) {
    const m = /^test:\s+(.*)$/.exec(line.trim());
    if (!m) continue;
    for (const name of m[1]!.split(/\s+/)) {
      if (name) ordered.push(`${name}.sql`);
    }
  }
  const all = readdirSync(SQL_DIR).filter(f => f.endsWith(".sql"));
  const scheduled = new Set(ordered);
  return [
    ...ordered.filter(f => all.includes(f)),
    ...all.filter(f => !scheduled.has(f)).sort(),
  ];
}

describe.runIf(existsSync(SQL_DIR) && !!process.env.REGRESS_REPLAY)("PostgreSQL regression corpus (shape and refusal replay)", () => {
  const tally = {
    files: 0,
    replayed: 0,
    skippedByName: 0,
    abortedFiles: 0,
    statements: 0,
    metacommands: 0,
    copyDataBlocks: 0,
    executedOk: 0,
    executedFailed: 0,
    analyzableOk: 0,
    parseFailedButExecuted: 0,
    analyzed: 0,
    refused: 0,
    engineErrors: 0,
    shapeMismatches: 0,
    nameMismatchColumns: 0,
    snapshots: 0,
    watchdogKills: 0,
    poisonedFiles: 0,
    copyStdinSkipped: 0,
  };
  const refusalKeys = new Map<string, number>();
  const engineErrors: string[] = [];
  const shapeMismatches: string[] = [];
  const nameMismatchKeys = new Map<string, number>();
  const abortedAt: string[] = [];
  const poisonedAt: string[] = [];
  let session: ReplaySession;

  beforeAll(async () => {
    session = await createReplaySession();
    const limit = process.env.REGRESS_LIMIT ? Number(process.env.REGRESS_LIMIT) : Infinity;

    const setupSql = readFileSync(join(SQL_DIR, "test_setup.sql"), "utf8");
    const runSetup = async (): Promise<void> => {
      for (const unit of splitPsql(setupSql)) {
        if (unit.kind !== "statement") continue;
        await session.query(unit.text);
      }
    };
    await runSetup();

    // The poison canary. PGlite backends can be POISONED (the workspace's
    // own bug report: convert_to over a real conversion, and the regress
    // corpus calls it) — after which the instance "answers plain SELECTs and
    // lies": empty field lists, ERRORDATA_STACK_SIZE errors, zero rows from
    // constants. A lying backend would feed the shape oracle fabricated
    // mismatches, so any anomaly is adjudicated by this probe before it is
    // allowed to mean anything.
    const healthy = async (): Promise<boolean> => {
      const r = await session.query("SELECT 641 AS canary");
      return (
        r.ok === true &&
        (r.fields ?? []).length === 1 &&
        r.fields![0] === "canary" &&
        (r.rows ?? []).length === 1
      );
    };

    const files = scheduledOrder().filter(f => f !== "test_setup.sql");
    tally.files = files.length;

    let catalog: NullabilityCatalog | null = null;
    let catalogDirty = true;

    const refreshCatalog = async (): Promise<NullabilityCatalog | null> => {
      if (catalog && !catalogDirty) return catalog;
      try {
        const shim = session.asPGlite();
        const snapshot = await snapshotCatalog(shim);
        const path = await session.query("SHOW search_path");
        const raw = String(
          (path.rows?.[0] as Record<string, unknown> | undefined)?.["search_path"] ?? "public",
        );
        const searchPath = raw
          .split(",")
          .map(s => s.trim().replace(/^"|"$/g, ""))
          .filter(s => s.length > 0 && s !== "$user");
        catalog = await buildNullabilityCatalog(snapshot, {
          searchPath: searchPath.length > 0 ? searchPath : ["public"],
        });
        tally.snapshots++;
        catalogDirty = false;
        if (process.env.REGRESS_TRACE_FILE) {
          console.error(
            `SNAP raw_path=${JSON.stringify(raw)} parsed=${JSON.stringify(searchPath)} ` +
              `ct(rngfunc2)=${JSON.stringify(catalog.resolveCompositeType(undefined, "rngfunc2"))} ` +
              `tbl(rngfunc2)=${JSON.stringify(catalog.resolveTable(undefined, "rngfunc2")?.columns)}`,
          );
        }
        return catalog;
      } catch {
        // A snapshot the session cannot serve (mid-wedge, exotic state) skips
        // analysis until the next clean boundary rather than failing the run.
        return null;
      }
    };

    let replayedCount = 0;
    for (const file of files) {
      if (replayedCount >= limit) break;
      if (SKIP_FILES[file]) {
        tally.skippedByName++;
        continue;
      }
      replayedCount++;
      tally.replayed++;
      const source = readFileSync(join(SQL_DIR, file), "utf8");
      const units = splitPsql(source);
      let aborted = false;

      for (const unit of units) {
        if (unit.kind === "metacommand") {
          tally.metacommands++;
          continue;
        }
        if (unit.kind === "copy-data") {
          tally.copyDataBlocks++;
          continue;
        }
        tally.statements++;

        // COPY ... FROM stdin CRASHES PGlite's extended protocol outright (a
        // WASM abort — measured: bit.sql, numeric.sql, enum.sql and
        // interval.sql all died at exactly this statement shape, the runtime
        // defect class beside the poison one). The splitter already consumed
        // the inline data; the statement is not sent, the table stays empty,
        // and the skip is counted rather than silent.
        if (/\bfrom\s+stdin\b/i.test(unit.text)) {
          tally.copyStdinSkipped++;
          continue;
        }

        const killsBefore = session.killedSql.length;
        const result = await session.query(unit.text);
        if (session.killedSql.length > killsBefore) {
          // The watchdog took the instance — and the accumulated database
          // with it. Abandon the file honestly.
          tally.watchdogKills++;
          tally.abortedFiles++;
          abortedAt.push(`${file}:${unit.line}`);
          aborted = true;
          await session.reboot();
          await runSetup();
          catalogDirty = true;
          break;
        }
        if (!result.ok) {
          if (result.error === "replay worker exited before answering") {
            // A WASM abort — the crash class poison-hunt records. Same
            // handling as a kill: the database is gone.
            tally.abortedFiles++;
            abortedAt.push(`${file}:${unit.line} (worker exit)`);
            aborted = true;
            await session.reboot();
            await runSetup();
            catalogDirty = true;
            break;
          }
          tally.executedFailed++;
          if (process.env.REGRESS_TRACE_FILE === file) {
            console.error(`TRACE ${file}:${unit.line} FAIL ${result.error?.slice(0, 60)} :: ${unit.text.replace(/\s+/g, " ").slice(0, 60)}`);
          }
          if (result.error?.includes("ERRORDATA_STACK_SIZE") && !(await healthy())) {
            tally.poisonedFiles++;
            poisonedAt.push(`${file}:${unit.line}`);
            aborted = true;
            await session.reboot();
            await runSetup();
            catalogDirty = true;
            break;
          }
          continue;
        }
        tally.executedOk++;
        if (process.env.REGRESS_TRACE_FILE === file) {
          console.error(`TRACE ${file}:${unit.line} ok fields=${JSON.stringify(result.fields)} :: ${unit.text.replace(/\s+/g, " ").slice(0, 60)}`);
        }

        let stmt;
        let root = "";
        try {
          const parsed = await parseSql(unit.text);
          stmt = parsed.stmts?.[0]?.stmt;
          root = stmt ? (Object.keys(stmt as object)[0] ?? "") : "";
        } catch {
          tally.parseFailedButExecuted++;
        }

        const intoSelect =
          root === "SelectStmt" &&
          !!(stmt as { SelectStmt?: { intoClause?: unknown } } | undefined)?.SelectStmt
            ?.intoClause;
        const setsSearchPath =
          root === "VariableSetStmt" &&
          (stmt as { VariableSetStmt?: { name?: string } } | undefined)?.VariableSetStmt
            ?.name === "search_path";
        if (!root || !CATALOG_INERT_ROOTS.has(root) || intoSelect || setsSearchPath) {
          catalogDirty = true;
        }

        if (!stmt || !ANALYZABLE_ROOTS.has(root) || intoSelect) continue;
        tally.analyzableOk++;

        const cat = await refreshCatalog();
        if (!cat) continue;

        let claims;
        try {
          claims = await inferNullability(stmt, cat);
          tally.analyzed++;
        } catch (e) {
          if (e instanceof UnsupportedNodeError) {
            tally.refused++;
            const key = `${e.site}:${e.nodeType}`;
            refusalKeys.set(key, (refusalKeys.get(key) ?? 0) + 1);
          } else {
            tally.engineErrors++;
            if (engineErrors.length < 40) {
              engineErrors.push(
                `${file}:${unit.line}: ${(e as Error).message.slice(0, 120)} :: ${unit.text
                  .replace(/\s+/g, " ")
                  .slice(0, 100)}`,
              );
            }
          }
          continue;
        }

        const fields = result.fields ?? [];
        if (fields.length === 0 && claims.length === 0) continue;
        if (fields.length === 0 && claims.length > 0 && !(await healthy())) {
          // The backend is lying, not disagreeing.
          tally.poisonedFiles++;
          poisonedAt.push(`${file}:${unit.line}`);
          aborted = true;
          await session.reboot();
          await runSetup();
          catalogDirty = true;
          break;
        }
        if (fields.length !== claims.length) {
          tally.shapeMismatches++;
          if (shapeMismatches.length < 40) {
            shapeMismatches.push(
              `${file}:${unit.line}: engine=${claims.length} pg=${fields.length} :: ` +
                unit.text.replace(/\s+/g, " ").slice(0, 110),
            );
          }
          continue;
        }
        for (let i = 0; i < fields.length; i++) {
          const en = claims[i]!.name;
          if (en !== "" && en !== fields[i]) {
            tally.nameMismatchColumns++;
            const key = `${file}:${unit.line}#${i} engine=${en} pg=${fields[i]}`;
            nameMismatchKeys.set(key, (nameMismatchKeys.get(key) ?? 0) + 1);
          }
        }
      }
      if (aborted) continue;
      // pg_regress runs every file on ITS OWN CONNECTION, and the replay runs
      // one session — so session state leaked across files until this reset:
      // temp.sql leaves `search_path = pg_temp`, after which every later
      // file's unqualified DDL lands in the TEMP schema, invisible to the
      // snapshot while PostgreSQL resolves it fine (measured: the rangefuncs
      // shape mismatches, and a large slice of the unresolvable-relation
      // refusals, were exactly this). ROLLBACK closes any transaction a file
      // left open (a fresh connection would have discarded it); DISCARD ALL
      // resets GUCs, temp objects and plans — the closest one session gets
      // to a new connection.
      await session.exec("ROLLBACK");
      await session.exec("DISCARD ALL");
      catalogDirty = true;
      if (!(await healthy())) {
        // Poison that never surfaced as an anomaly mid-file must not leak
        // into the next file's replay.
        tally.poisonedFiles++;
        poisonedAt.push(`${file} (end of file)`);
        await session.reboot();
        await runSetup();
        catalogDirty = true;
      }
    }
  }, 3_600_000);

  afterAll(async () => {
    await session.close();
    console.log(`\npg-regress replay: ${JSON.stringify(tally, null, 1)}`);
    if (process.env.REGRESS_REPORT) {
      console.log(`refusals:\n  ${[...refusalKeys.entries()].sort().map(([k, n]) => `${k} ×${n}`).join("\n  ")}`);
      console.log(`engine errors:\n  ${engineErrors.join("\n  ")}`);
      console.log(`shape mismatches:\n  ${shapeMismatches.join("\n  ")}`);
      console.log(`aborted at:\n  ${abortedAt.join("\n  ")}`);
      console.log(`poisoned at:\n  ${poisonedAt.join("\n  ")}`);
      console.log(
        `name mismatches:\n  ${[...nameMismatchKeys.keys()].slice(0, 60).join("\n  ")}`,
      );
    }
  });

  it("holds the census pins", () => {
    if (process.env.REGRESS_LIMIT) return; // development knob; pins need the full corpus
    expect(tally).toEqual(PINS);
  });

  it("no engine crash on any accepted statement", () => {
    expect(engineErrors).toEqual([]);
  });

  it("refusals are pinned by name", () => {
    if (process.env.REGRESS_LIMIT) return;
    expect(Object.fromEntries([...refusalKeys.entries()].sort())).toEqual(REFUSAL_PINS);
  });

  it("shape mismatches are triaged by name", () => {
    if (process.env.REGRESS_LIMIT) return;
    expect(shapeMismatches.sort()).toEqual(SHAPE_MISMATCH_PINS);
  });

  it("name mismatches are triaged by name", () => {
    if (process.env.REGRESS_LIMIT) return;
    expect([...nameMismatchKeys.keys()].sort()).toEqual(NAME_MISMATCH_PINS);
  });
});

// ---------------------------------------------------------------------------
// The pinned census, measured over the full 231-file replay (2026-08-24).
// Exact and by name, like the sqlc suite's: the corpus is a vendored tree and
// the engine deterministic, so a moved number is a real event to read, never
// to re-pin blind.
//
// Standing triage the pins carry:
//
//   - REFUSAL_PINS is dominated by ONE class: `unresolvable relation <x>`
//     over system catalogs (pg_*), information_schema, and TEMP-schema
//     relations. All three sit OUTSIDE the snapshot's capture scope — the
//     catalog the engine analyses against holds application schemas — so
//     each is a refusal (the safe direction), counted here so the boundary
//     stays visible. The remaining keys are the unnest element-type refusals
//     over shapes the reader declines by design.
//   - SHAPE_MISMATCH_PINS is one derived mechanism, not five: rangefuncs
//     declares `create TEMP table users` and functions `RETURNS [SETOF]
//     users`, so the return type name resolves to nothing in the snapshot
//     and the shape falls to one column. The fallback is a REASONED residue:
//     an unresolvable type name cannot be told scalar from composite, and
//     refusing every unknown-typed function would refuse ordinary
//     extension-typed scalars. Closes if the snapshot ever captures temp
//     schemas (a catalog-scope decision, not this suite's).
//   - NAME_MISMATCH_PINS is the same temp-schema boundary one symptom over:
//     temp.sql's TEMP temptest(tcol) shadows the permanent temptest(col)
//     inside one file, and the engine resolves the only one its catalog has.
//   - abortedAt / poisonedAt / watchdog kills are the PGlite runtime classes
//     the harness routes around (see the header); their counts are pinned in
//     PINS so a runtime shift is loud.
// ---------------------------------------------------------------------------
const PINS = {
  "files": 231,
  "replayed": 231,
  "skippedByName": 0,
  "abortedFiles": 2,
  "statements": 46690,
  "metacommands": 1299,
  "copyDataBlocks": 128,
  "executedOk": 33893,
  "executedFailed": 12666,
  "analyzableOk": 17936,
  "parseFailedButExecuted": 5,
  "analyzed": 11404,
  "refused": 829,
  "engineErrors": 0,
  "shapeMismatches": 5,
  "nameMismatchColumns": 2,
  "snapshots": 1932,
  "watchdogKills": 1,
  "poisonedFiles": 9,
  "copyStdinSkipped": 129
};

const REFUSAL_PINS: Record<string, number> = {
  "from-item:unnest of an argument whose element type is not derivable (A_ArrayExpr)": 2,
  "from-item:unnest of an argument whose element type is not derivable (A_Indirection)": 2,
  "from-item:unnest of an argument whose element type is not derivable (ColumnRef)": 1,
  "from-item:unnest of an argument whose element type is not derivable (JsonFuncExpr)": 1,
  "from-item:unresolvable relation a": 1,
  "from-item:unresolvable relation arr_pk_tbl": 2,
  "from-item:unresolvable relation arr_tbl": 2,
  "from-item:unresolvable relation arraggtest": 5,
  "from-item:unresolvable relation arrtest1": 15,
  "from-item:unresolvable relation arrtest_s": 7,
  "from-item:unresolvable relation attmp_new": 2,
  "from-item:unresolvable relation b": 2,
  "from-item:unresolvable relation bitwise_test": 2,
  "from-item:unresolvable relation bool_test": 6,
  "from-item:unresolvable relation box_temp": 12,
  "from-item:unresolvable relation btree_bpchar": 4,
  "from-item:unresolvable relation c": 1,
  "from-item:unresolvable relation clstr_temp": 1,
  "from-item:unresolvable relation copy_default": 6,
  "from-item:unresolvable relation copytest": 2,
  "from-item:unresolvable relation copytest2": 2,
  "from-item:unresolvable relation defc": 3,
  "from-item:unresolvable relation dest": 3,
  "from-item:unresolvable relation disttable": 4,
  "from-item:unresolvable relation exists_tbl": 1,
  "from-item:unresolvable relation float_table": 1,
  "from-item:unresolvable relation foo": 12,
  "from-item:unresolvable relation forc_test": 2,
  "from-item:unresolvable relation forcetest": 5,
  "from-item:unresolvable relation gcircle_tbl": 4,
  "from-item:unresolvable relation gpolygon_tbl": 4,
  "from-item:unresolvable relation i_table": 3,
  "from-item:unresolvable relation information_schema.check_constraints": 2,
  "from-item:unresolvable relation information_schema.column_column_usage": 1,
  "from-item:unresolvable relation information_schema.column_domain_usage": 1,
  "from-item:unresolvable relation information_schema.columns": 15,
  "from-item:unresolvable relation information_schema.domain_constraints": 1,
  "from-item:unresolvable relation information_schema.domains": 1,
  "from-item:unresolvable relation information_schema.parameters": 1,
  "from-item:unresolvable relation information_schema.tables": 13,
  "from-item:unresolvable relation information_schema.views": 21,
  "from-item:unresolvable relation interval_tbl_of": 3,
  "from-item:unresolvable relation json_tab": 1,
  "from-item:unresolvable relation json_table_test": 4,
  "from-item:unresolvable relation jsonb_table_test": 1,
  "from-item:unresolvable relation jsonpaths": 1,
  "from-item:unresolvable relation log": 1,
  "from-item:unresolvable relation notinouter": 1,
  "from-item:unresolvable relation nt3": 1,
  "from-item:unresolvable relation numeric_table": 1,
  "from-item:unresolvable relation old_cluster_info": 1,
  "from-item:unresolvable relation op": 1,
  "from-item:unresolvable relation outer_7597": 1,
  "from-item:unresolvable relation outer_text": 1,
  "from-item:unresolvable relation p": 1,
  "from-item:unresolvable relation parent": 4,
  "from-item:unresolvable relation pg_aggregate": 3,
  "from-item:unresolvable relation pg_am": 1,
  "from-item:unresolvable relation pg_attrdef": 1,
  "from-item:unresolvable relation pg_attribute": 12,
  "from-item:unresolvable relation pg_auth_members": 4,
  "from-item:unresolvable relation pg_available_extension_versions": 1,
  "from-item:unresolvable relation pg_available_extensions": 1,
  "from-item:unresolvable relation pg_cast": 6,
  "from-item:unresolvable relation pg_catalog.pg_class": 1,
  "from-item:unresolvable relation pg_catalog.pg_proc": 1,
  "from-item:unresolvable relation pg_catalog.pg_tablespace": 5,
  "from-item:unresolvable relation pg_class": 86,
  "from-item:unresolvable relation pg_collation": 3,
  "from-item:unresolvable relation pg_constraint": 47,
  "from-item:unresolvable relation pg_conversion": 2,
  "from-item:unresolvable relation pg_cursors": 10,
  "from-item:unresolvable relation pg_depend": 16,
  "from-item:unresolvable relation pg_enum": 9,
  "from-item:unresolvable relation pg_event_trigger": 1,
  "from-item:unresolvable relation pg_index": 17,
  "from-item:unresolvable relation pg_indexes": 16,
  "from-item:unresolvable relation pg_largeobject_metadata": 1,
  "from-item:unresolvable relation pg_locks": 27,
  "from-item:unresolvable relation pg_operator": 11,
  "from-item:unresolvable relation pg_prepared_statements": 14,
  "from-item:unresolvable relation pg_prepared_xacts": 11,
  "from-item:unresolvable relation pg_proc": 62,
  "from-item:unresolvable relation pg_publication": 2,
  "from-item:unresolvable relation pg_publication_tables": 7,
  "from-item:unresolvable relation pg_range": 6,
  "from-item:unresolvable relation pg_roles": 6,
  "from-item:unresolvable relation pg_settings": 1,
  "from-item:unresolvable relation pg_shdepend": 1,
  "from-item:unresolvable relation pg_stat_slru": 1,
  "from-item:unresolvable relation pg_stat_subscription_stats": 2,
  "from-item:unresolvable relation pg_stat_wal": 1,
  "from-item:unresolvable relation pg_stat_wal_receiver": 1,
  "from-item:unresolvable relation pg_statistic": 2,
  "from-item:unresolvable relation pg_subscription": 2,
  "from-item:unresolvable relation pg_tablespace": 3,
  "from-item:unresolvable relation pg_timezone_abbrevs": 4,
  "from-item:unresolvable relation pg_timezone_names": 1,
  "from-item:unresolvable relation pg_trigger": 5,
  "from-item:unresolvable relation pg_type": 56,
  "from-item:unresolvable relation pg_views": 5,
  "from-item:unresolvable relation pg_wait_events": 1,
  "from-item:unresolvable relation point_gist_tbl": 6,
  "from-item:unresolvable relation pxtest3": 1,
  "from-item:unresolvable relation q5_prep_nodata": 1,
  "from-item:unresolvable relation q5_prep_results": 1,
  "from-item:unresolvable relation quad_box_tbl_ord_idx1": 1,
  "from-item:unresolvable relation quad_box_tbl_ord_idx2": 1,
  "from-item:unresolvable relation quad_point_tbl_ord_seq1": 3,
  "from-item:unresolvable relation quad_point_tbl_ord_seq2": 2,
  "from-item:unresolvable relation quad_point_tbl_ord_seq3": 2,
  "from-item:unresolvable relation quad_poly_tbl_ord_seq2": 1,
  "from-item:unresolvable relation reindex_temp_before": 1,
  "from-item:unresolvable relation rescan_bhs": 1,
  "from-item:unresolvable relation selfref": 2,
  "from-item:unresolvable relation shipped_view": 2,
  "from-item:unresolvable relation skip_fetch": 1,
  "from-item:unresolvable relation snapshot_test": 8,
  "from-item:unresolvable relation sometable": 1,
  "from-item:unresolvable relation t": 4,
  "from-item:unresolvable relation t1": 13,
  "from-item:unresolvable relation t3": 3,
  "from-item:unresolvable relation t_append": 1,
  "from-item:unresolvable relation t_gin_test_tbl": 9,
  "from-item:unresolvable relation tasks": 5,
  "from-item:unresolvable relation tbl_ra": 1,
  "from-item:unresolvable relation tbl_rs": 1,
  "from-item:unresolvable relation tc": 1,
  "from-item:unresolvable relation temp_inh_oncommit_test": 1,
  "from-item:unresolvable relation temp_parted_oncommit": 1,
  "from-item:unresolvable relation temp_parted_oncommit_test": 1,
  "from-item:unresolvable relation temptest": 9,
  "from-item:unresolvable relation temptest1": 1,
  "from-item:unresolvable relation temptest2": 1,
  "from-item:unresolvable relation test_temp": 4,
  "from-item:unresolvable relation testnull": 1,
  "from-item:unresolvable relation text_support_test": 1,
  "from-item:unresolvable relation tmptz": 1,
  "from-item:unresolvable relation tt": 6,
  "from-item:unresolvable relation tt1": 1,
  "from-item:unresolvable relation tt2": 1,
  "from-item:unresolvable relation tt4": 1,
  "from-item:unresolvable relation tt5": 1,
  "from-item:unresolvable relation tt_log": 1,
  "from-item:unresolvable relation twophase_tab": 1,
  "from-item:unresolvable relation uctest": 21,
  "from-item:unresolvable relation upsert": 1,
  "from-item:unresolvable relation usersview": 2,
  "from-item:unresolvable relation view_a": 4,
  "from-item:unresolvable relation vw_ord": 5,
  "from-item:unresolvable relation vw_rngfunc": 1,
  "from-item:unresolvable relation x": 10,
  "from-item:unresolvable relation y": 1,
  "from-item:unresolvable relation yy": 1,
  "from-item:unresolvable relation zt2": 2,
};

const SHAPE_MISMATCH_PINS: string[] = [
  "rangefuncs.sql:664: engine=1 pg=5 :: SELECT * FROM get_first_user();",
  "rangefuncs.sql:671: engine=1 pg=5 :: SELECT * FROM get_users();",
  "rangefuncs.sql:672: engine=2 pg=6 :: SELECT * FROM get_users() WITH ORDINALITY;",
  "rangefuncs.sql:675: engine=3 pg=7 :: SELECT * FROM ROWS FROM(generate_series(10,11), get_users()) WITH ORDINALITY;",
  "rangefuncs.sql:676: engine=3 pg=7 :: SELECT * FROM ROWS FROM(get_users(), generate_series(10,11)) WITH ORDINALITY;",
];

const NAME_MISMATCH_PINS: string[] = [
  "temp.sql:16#0 engine=col pg=tcol",
  "temp.sql:38#0 engine=col pg=tcol",
];
