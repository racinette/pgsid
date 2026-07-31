import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog, OutputNullability } from "../../../src/query/types.js";
import { bindParams, parseFixtureDirectives, type FixtureBinding } from "./fixture-args.js";
import { hasStatements, loadDataStates, type DataState } from "./fixture-data/states.js";

// ---------------------------------------------------------------------------
// Executable soundness check, and the coverage measurement that makes it mean
// something.
//
// nullability-walk.test.ts compares the engine against hand-written
// annotations — it proves the engine and the fixture author agree, not that
// either is right. This suite compares the engine against PostgreSQL itself.
//
// Five assertions per fixture:
//
//   1. Validity — PostgreSQL must accept the query. Checked with PREPARE,
//      which resolves tables, columns, operators, and aggregate/GROUP BY
//      rules without running anything. A query PostgreSQL rejects has no
//      output columns to be nullable, so its annotations assert nothing.
//
//   2. Shape — the engine's output columns must match PostgreSQL's, by count
//      and by name. This is the assertion the annotation-based suite cannot
//      make: there, the expected column count comes from the annotations a
//      human wrote, so a misjudged shape is encoded identically in both the
//      fixture and the engine and the test agrees with itself. A wrong column
//      list is also worse than a wrong flag for a codegen consumer.
//
//   3. Soundness — the query is executed under every data state and every
//      argument binding, and no column the engine calls `notNull` may come
//      back NULL. Soundness must hold for *every* binding: a claim
//      contradicted by any argument set is a bug. This step compares by
//      position, so it is only meaningful once step 2 has established that the
//      two column lists line up. Without that, a missing column silently
//      shifts every later comparison onto the wrong pair.
//
//   4. Liveness — the fixture must return at least one row somewhere. A query
//      that returns nothing under every state and binding cannot contradict
//      any `notNull` claim it makes, so its soundness check is inert and it
//      asserts nothing at all. That should be impossible to add by accident,
//      hence a hard failure rather than a report. A fixture whose statement
//      raises for every row it would produce says so with `@no-rows`, and is
//      then checked to actually behave that way.
//
//   5. Coverage — one test for the suite as a whole, ratcheting the number of
//      `nullable` claims some state actually witnesses with a real NULL. See
//      the block above that test for why it is a ratchet and not a target.
//
// A statement that raises is not a counterexample: it returned no rows, so
// the "never NULL" guarantee still holds for every row it did return. Errors
// are therefore skipped during step 3 — several fixtures raise on purpose,
// and DML fixtures hit key and FK constraints under some states.
//
// Execution is arranged state-major rather than fixture-major: one PGlite
// instance per data state, loaded once, with each fixture's own writes rolled
// back around it. The alternative — one instance, re-applying a state per
// fixture — churns the same rows through WASM linear memory hundreds of times,
// which is what rule 6 in the workspace `AGENTS.md` is about.
// ---------------------------------------------------------------------------

const FIXTURES_DIR = join(__dirname, "fixtures");
const SCHEMA_SQL = readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8");
const BASELINE_PATH = join(__dirname, "witness-coverage.json");

const fixtureFiles = readdirSync(FIXTURES_DIR)
  .filter(f => f.endsWith(".sql") && f !== "schema.sql")
  .sort();

interface Fixture {
  name: string;
  sql: string;
  bindings: FixtureBinding[];
  noRowsReason: string | null;
  raisesPattern: string | null;
}

/** What execution observed about one output column, across every run. */
interface ColumnObservation {
  /** The column was present in a result set that had at least one row. */
  sawRow: boolean;
  /** The column was actually NULL in some row. */
  sawNull: boolean;
}

interface FixtureResult {
  claimed: OutputNullability[];
  planError: string | null;
  shapeError: string | null;
  pgColumns: string[];
  columns: ColumnObservation[];
  violations: string[];
  /** Diagnostic only: statements that raised, by state and binding. */
  errors: string[];
  sawRows: boolean;
}

interface CoverageBaseline {
  witnessedNullableClaims: number;
  falsifiableNotNullClaims: number;
}

const fixtures: Fixture[] = fixtureFiles.map(file => {
  const sql = readFileSync(join(FIXTURES_DIR, file), "utf8");
  const name = basename(file, ".sql");
  try {
    const { bindings, noRowsReason, raisesPattern } = parseFixtureDirectives(sql);
    return { name, sql, bindings, noRowsReason, raisesPattern };
  } catch (e) {
    throw new Error(`${file}: ${(e as Error).message}`);
  }
});

const results = new Map<string, FixtureResult>();
let dataStates: DataState[] = [];

describe("nullability soundness (engine vs PostgreSQL)", () => {
  beforeAll(async () => {
    // --- Catalog, claims, validity and shape, against an empty database. ---
    const pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(SCHEMA_SQL);
    const snapshot = await snapshotCatalog(pg);
    const catalog: NullabilityCatalog = await buildNullabilityCatalog(snapshot);
    dataStates = loadDataStates(snapshot);

    let prepareCounter = 0;
    for (const fixture of fixtures) {
      const parsed = await parseSql(fixture.sql);
      const claimed = inferNullability(parsed.stmts![0]!.stmt!, catalog);

      // Validity. PREPARE keeps `$n` as parameters — that is what they are —
      // and PostgreSQL resolves an otherwise unconstrained one to text.
      const stmtName = `nullability_probe_${prepareCounter++}`;
      await pg.exec("BEGIN;");
      let planError: string | null = null;
      try {
        await pg.exec(`PREPARE ${stmtName} AS ${fixture.sql}`);
      } catch (e) {
        planError = (e as Error).message;
      } finally {
        await pg.exec("ROLLBACK;");
      }

      // Shape, against an EMPTY database. With no rows, target-list
      // expressions are never evaluated, so a fixture that would otherwise
      // raise (a cast to a NOT NULL domain, a conflicting INSERT) still yields
      // a row description — which is all this step needs. The binding cannot
      // change the column list, so the first one stands for all of them.
      await pg.exec("BEGIN;");
      let pgColumns: string[] = [];
      let shapeError: string | null = null;
      try {
        const bound = bindParams(fixture.sql, fixture.bindings[0]!.args);
        pgColumns = (await pg.query(bound)).fields.map(f => f.name);
      } catch (e) {
        shapeError = (e as Error).message;
      } finally {
        await pg.exec("ROLLBACK;");
      }

      results.set(fixture.name, {
        claimed,
        planError,
        shapeError,
        pgColumns,
        columns: claimed.map(() => ({ sawRow: false, sawNull: false })),
        violations: [],
        errors: [],
        sawRows: false,
      });
    }
    await pg.close();

    // --- Soundness and witnesses, one instance per data state. ---
    for (const state of dataStates) {
      const statePg = await PGlite.create({ extensions: { plpgsql_check } });
      await statePg.exec("CREATE EXTENSION plpgsql_check;");
      await statePg.exec(SCHEMA_SQL);
      if (hasStatements(state.sql)) await statePg.exec(state.sql);

      for (const fixture of fixtures) {
        const result = results.get(fixture.name)!;
        for (const binding of fixture.bindings) {
          const where = `${state.name}/${binding.label}`;
          await statePg.exec("BEGIN;");
          try {
            const bound = bindParams(fixture.sql, binding.args);
            // rowMode 'array' is required, not a preference: column names are
            // not unique (`SELECT a.id, b.id` yields two "id" columns), so the
            // object form silently collapses them and would compare one column
            // against itself. Nullability is positional; read it positionally.
            const res = await statePg.query(bound, [], { rowMode: "array" });
            const rows = res.rows as unknown[][];
            if (rows.length > 0) result.sawRows = true;
            res.fields.forEach((f, i) => {
              const claim = result.claimed[i];
              const observation = result.columns[i];
              if (!claim || !observation) return;
              if (rows.length > 0) observation.sawRow = true;
              if (!rows.some(r => r[i] === null)) return;
              observation.sawNull = true;
              if (claim.notNull) {
                result.violations.push(
                  `[${where}] column ${i} "${f.name}": engine claims notNull, ` +
                    `PostgreSQL returned NULL`,
                );
              }
            });
          } catch (e) {
            // Raised instead of returning rows — no observation to make.
            result.errors.push(`[${where}] ${(e as Error).message}`);
          } finally {
            await statePg.exec("ROLLBACK;");
          }
        }
      }
      await statePg.close();
    }
  }, 900_000);

  for (const fixture of fixtures) {
    it(fixture.name, () => {
      const r = results.get(fixture.name)!;

      expect(r.planError, `PostgreSQL rejected this fixture: ${r.planError}`).toBeNull();
      expect(r.shapeError, `could not determine output shape: ${r.shapeError}`).toBeNull();
      expect(
        r.claimed.map(c => c.name),
        `output shape differs from PostgreSQL\n` +
          `  engine (${r.claimed.length}): ${r.claimed.map(c => c.name).join(", ")}\n` +
          `  pg     (${r.pgColumns.length}): ${r.pgColumns.join(", ")}`,
      ).toEqual(r.pgColumns);

      expect(r.violations, `\n${r.violations.join("\n")}\n`).toEqual([]);

      if (fixture.noRowsReason) {
        expect(
          r.sawRows,
          `fixture is marked @no-rows but did return rows — remove the marker:\n` +
            `  ${fixture.noRowsReason}`,
        ).toBe(false);

        // Returning nothing is not itself evidence. The claim these fixtures
        // make is that PostgreSQL *refuses* to produce the value, so the
        // refusal is what has to be observed — otherwise a fixture that
        // matches no rows for some dull reason would pass as if it had proved
        // something.
        expect(
          r.errors.length,
          `fixture is marked @no-rows but never raised. Returning no rows is ` +
            `not evidence on its own — if nothing here refuses, the marker is ` +
            `hiding a fixture that asserts nothing:\n  ${fixture.noRowsReason}`,
        ).toBeGreaterThan(0);

        const unexpected = r.errors.filter(e => !e.includes(fixture.raisesPattern!));
        expect(
          unexpected,
          `fixture raised something other than its declared @raises text ` +
            `(${fixture.raisesPattern}). An unrelated failure must not be ` +
            `accepted as the expected refusal:\n  ${unexpected.join("\n  ")}`,
        ).toEqual([]);
      } else {
        expect(
          r.sawRows,
          `fixture returned no rows under any data state or binding, so its ` +
            `soundness check asserts nothing.\n` +
            `Give it data it can match (a hand-written state in ` +
            `tests/unit/query/fixtures/data/, or a generator entry), or an ` +
            `\`-- @args [...]\` line if a NULL parameter is what makes its ` +
            `WHERE false. If the statement raises for every row it would ` +
            `produce, say so with \`-- @no-rows: <reason>\`.\n` +
            `Statements that raised:\n  ${r.errors.join("\n  ") || "(none)"}`,
        ).toBe(true);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Coverage.
  //
  // A `nullable` claim is *witnessed* when some state or binding yields a
  // genuine NULL in that column. Unwitnessed means one of two things and they
  // need separating: the column truly can never be NULL (real imprecision in
  // the engine, worth chasing), or the data is too weak to show that it can (a
  // hole in the suite). Neither is a failure on its own, which is why this is a
  // ratchet rather than a target — some claims are legitimately unwitnessable
  // (`CURRENT_SCHEMA` is NULL only when the search path resolves to nothing),
  // and demanding perfection would push authors toward contorted data rather
  // than honest tests.
  //
  // Set WITNESS_REPORT=1 to list what is still unwitnessed, which is the input
  // to triaging each one as engine imprecision or a data gap.
  // -------------------------------------------------------------------------
  it("witness coverage does not regress", () => {
    let notNullTotal = 0;
    let notNullFalsifiable = 0;
    let nullableTotal = 0;
    let nullableWitnessed = 0;
    const unwitnessed: string[] = [];
    const guarded: string[] = [];
    const unverified: string[] = [];

    for (const fixture of fixtures) {
      const r = results.get(fixture.name)!;
      r.claimed.forEach((claim, i) => {
        const seen = r.columns[i]!;
        const label = `${fixture.name}: column ${i} "${claim.name}"`;
        if (claim.notNull) {
          notNullTotal++;
          // Two ways a `notNull` claim can be checked. Either the query
          // returns rows, so a NULL would contradict it — or the statement
          // raises, and the refusal to produce a value at all is the claim.
          // The per-fixture test above asserts that refusal and its message,
          // so these are verified, not merely unfalsified.
          if (seen.sawRow) notNullFalsifiable++;
          else if (fixture.noRowsReason) guarded.push(label);
          else unverified.push(label);
        } else {
          nullableTotal++;
          if (seen.sawNull) nullableWitnessed++;
          else unwitnessed.push(label);
        }
      });
    }

    expect(
      unverified,
      `notNull claims that nothing checks: the query returned no rows, and the ` +
        `fixture is not marked @no-rows, so no NULL could contradict them and no ` +
        `refusal stands behind them.\n  ${unverified.join("\n  ")}`,
    ).toEqual([]);

    const measured: CoverageBaseline = {
      witnessedNullableClaims: nullableWitnessed,
      falsifiableNotNullClaims: notNullFalsifiable,
    };

    const pct = (n: number, total: number) =>
      total === 0 ? "n/a" : `${Math.round((n / total) * 100)}%`;
    console.log(
      `\nwitness coverage over ${fixtures.length} fixtures and ` +
        `${dataStates.length} data states (${dataStates.map(s => s.name).join(", ")}):\n` +
        `  notNull claims:  ${notNullTotal} — ${notNullFalsifiable} falsifiable ` +
        `(${pct(notNullFalsifiable, notNullTotal)}), ${guarded.length} guarded by a ` +
        `checked refusal, ${unverified.length} unverified\n` +
        `  nullable claims: ${nullableTotal} — ${nullableWitnessed} witnessed ` +
        `(${pct(nullableWitnessed, nullableTotal)}), ${nullableTotal - nullableWitnessed} unwitnessed`,
    );

    if (process.env.WITNESS_REPORT) {
      console.log(
        `\nunwitnessed nullable claims (${unwitnessed.length}):\n  ${unwitnessed.join("\n  ")}` +
          `\n\nnotNull claims guarded by a checked refusal (${guarded.length}):\n  ` +
          guarded.join("\n  "),
      );
    }

    if (process.env.UPDATE_WITNESS_BASELINE) {
      writeFileSync(BASELINE_PATH, `${JSON.stringify(measured, null, 2)}\n`);
    }

    // The baseline was measured at the default seed, so an exploratory run
    // with another one reports its number without being held to that bar.
    // Liveness still is: no seed may leave a fixture returning nothing.
    if (process.env.FUZZ_SEED) {
      console.log(
        `FUZZ_SEED is overridden, so the coverage ratchet is not applied — ` +
          `the baseline records the default seed's numbers.`,
      );
      return;
    }

    const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as CoverageBaseline;
    const explain = (what: string, now: number, was: number) =>
      `${what} fell from ${was} to ${now}. Either data or a binding stopped ` +
      `reaching a claim that it used to reach, or the engine now reports a ` +
      `different flag there. If the drop is deliberate — a fixture was removed, ` +
      `say — rerun with UPDATE_WITNESS_BASELINE=1 to lower ` +
      `tests/unit/query/witness-coverage.json, and say why in the commit.`;

    expect(
      measured.witnessedNullableClaims,
      explain("witnessed nullable claims", nullableWitnessed, baseline.witnessedNullableClaims),
    ).toBeGreaterThanOrEqual(baseline.witnessedNullableClaims);
    expect(
      measured.falsifiableNotNullClaims,
      explain(
        "falsifiable notNull claims",
        notNullFalsifiable,
        baseline.falsifiableNotNullClaims,
      ),
    ).toBeGreaterThanOrEqual(baseline.falsifiableNotNullClaims);

    if (
      measured.witnessedNullableClaims > baseline.witnessedNullableClaims ||
      measured.falsifiableNotNullClaims > baseline.falsifiableNotNullClaims
    ) {
      console.log(
        `coverage improved past the recorded baseline ` +
          `(${baseline.witnessedNullableClaims} witnessed, ` +
          `${baseline.falsifiableNotNullClaims} falsifiable). Raise it with ` +
          `UPDATE_WITNESS_BASELINE=1 so the gain is held.`,
      );
    }
  });
});
