import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { catalogCache } from "./fixture-catalog.js";
import { inferNullability, inferPresenceGroups } from "../../../src/query/nullability-walk.js";
import type {
  OutputNullability,
  OutputPresenceGroup,
} from "../../../src/query/types.js";
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

const fixtureFiles = readdirSync(FIXTURES_DIR)
  .filter(f => f.endsWith(".sql") && f !== "schema.sql")
  .sort();

interface Fixture {
  name: string;
  sql: string;
  bindings: FixtureBinding[];
  noRowsReason: string | null;
  raisesPattern: string | null;
  alwaysRaises: boolean;
  unwitnessable: Map<number, string>;
  /** `-- @search-path`: analysed AND executed under this path (null = the
   *  corpus default). Both halves matter — a claim made under one path and
   *  adjudicated under another is adjudicating a different statement. */
  searchPath: string[] | null;
}

/** What execution observed about one presence group, across every run. */
interface GroupObservation {
  claimed: OutputPresenceGroup;
  /** Some row had every discriminant NULL — the unit's absent arm. */
  sawAbsent: boolean;
  /** Some row had the discriminants non-NULL — the present arm. */
  sawPresent: boolean;
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
  groups: GroupObservation[];
  violations: string[];
  /** Diagnostic only: statements that raised, by state and binding. */
  errors: string[];
  sawRows: boolean;
}

const fixtures: Fixture[] = fixtureFiles.map(file => {
  const sql = readFileSync(join(FIXTURES_DIR, file), "utf8");
  const name = basename(file, ".sql");
  try {
    const { bindings, noRowsReason, raisesPattern, alwaysRaises, unwitnessable, searchPath } =
      parseFixtureDirectives(sql);
    return {
      name, sql, bindings, noRowsReason, raisesPattern, alwaysRaises, unwitnessable, searchPath,
    };
  } catch (e) {
    throw new Error(`${file}: ${(e as Error).message}`);
  }
});

/** The fixture's path for the duration of its adjudication. Paired calls
 *  rather than a wrapper: the analysis phase spans a PREPARE, a shape probe
 *  and a rollback, and the data-state phase spans every binding. */
async function pushSearchPath(pg: PGlite, searchPath: string[] | null): Promise<void> {
  if (searchPath) await pg.exec(`SET search_path = ${searchPath.join(", ")};`);
}
async function popSearchPath(pg: PGlite, searchPath: string[] | null): Promise<void> {
  if (searchPath) await pg.exec("SET search_path = public;");
}

const results = new Map<string, FixtureResult>();
let dataStates: DataState[] = [];

describe("nullability soundness (engine vs PostgreSQL)", () => {
  beforeAll(async () => {
    // --- Catalog, claims, validity and shape, against an empty database. ---
    const pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(SCHEMA_SQL);
    const snapshot = await snapshotCatalog(pg);
    const catalogFor = catalogCache(snapshot);
    dataStates = loadDataStates(snapshot);

    let prepareCounter = 0;
    for (const fixture of fixtures) {
      const parsed = await parseSql(fixture.sql);
      // `-- @search-path` (fixture-args.ts): the catalog is built on the
      // fixture's path and the SESSION is held on it for the whole
      // adjudication — analysis, PREPARE, shape and every data state. A
      // claim made under one path and witnessed under another is not a
      // witness, and type-name resolution is exactly what the axis moves.
      const catalog = await catalogFor(fixture.searchPath);
      await pushSearchPath(pg, fixture.searchPath);
      // Same analysis mode as the fixture suite: the statement map runs live,
      // so the claims the oracle adjudicates are the claims the pins assert.
      const claimed = await inferNullability(parsed.stmts![0]!.stmt!, catalog, {
        evaluate: async s => (await pg.query<Record<string, unknown>>(s)).rows[0],
      });
      const claimedGroups = inferPresenceGroups(parsed.stmts![0]!.stmt!, catalog);

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
        groups: claimedGroups.map(g => ({ claimed: g, sawAbsent: false, sawPresent: false })),
        violations: [],
        errors: [],
        sawRows: false,
      });
      await popSearchPath(pg, fixture.searchPath);
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
        await pushSearchPath(statePg, fixture.searchPath);
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
            // Presence groups are ROW-side claims — a per-column sweep cannot
            // see them. Per returned row: the discriminants agree (all NULL =
            // the unit's absent arm, all non-NULL = present); on the absent
            // arm EVERY member is NULL. One row disagreeing falsifies the
            // group.
            for (const g of result.groups) {
              for (const row of rows) {
                const nullDiscs = g.claimed.discriminants.filter(d => row[d] === null);
                if (nullDiscs.length === 0) {
                  g.sawPresent = true;
                  continue;
                }
                if (nullDiscs.length < g.claimed.discriminants.length) {
                  result.violations.push(
                    `[${where}] presence group {${g.claimed.columns.join(",")}}: ` +
                      `discriminants disagree in one row (NULL: ${nullDiscs.join(",")}) — ` +
                      `they are supposed to be NULL only together, as the unit's absence`,
                  );
                  continue;
                }
                g.sawAbsent = true;
                const survivors = g.claimed.columns.filter(c => row[c] !== null);
                if (survivors.length > 0) {
                  result.violations.push(
                    `[${where}] presence group {${g.claimed.columns.join(",")}}: ` +
                      `absent arm (discriminants NULL) but member column(s) ` +
                      `${survivors.join(",")} are non-NULL — the unit did not extend as one`,
                  );
                }
              }
            }
          } catch (e) {
            // Raised instead of returning rows — no observation to make.
            result.errors.push(`[${where}] ${(e as Error).message}`);
          } finally {
            await statePg.exec("ROLLBACK;");
          }
        }
        await popSearchPath(statePg, fixture.searchPath);
      }
      await statePg.close();
    }
  }, 900_000);

  for (const fixture of fixtures) {
    it(fixture.name, () => {
      const r = results.get(fixture.name)!;

      expect(r.planError, `PostgreSQL rejected this fixture: ${r.planError}`).toBeNull();
      if (fixture.alwaysRaises) {
        // The shape step EXECUTES against an empty database, which works for
        // every other @no-rows fixture because with no rows the raising
        // expression is never evaluated. An @always-raises statement writes a
        // row unconditionally, so it raises there too — a second observation
        // of the flag rather than a gap. Such a fixture therefore declares no
        // output columns: under the flag no row is ever returned, so an
        // output claim could never be checked against anything.
        expect(
          r.shapeError,
          `fixture is marked @always-raises but describing it succeeded — the ` +
            `statement does not always raise`,
        ).not.toBeNull();
        expect(
          r.claimed.map(c => c.name),
          `an @always-raises fixture must claim no output columns: it never ` +
            `returns a row, so nothing here could be adjudicated`,
        ).toEqual([]);
      } else {
        expect(r.shapeError, `could not determine output shape: ${r.shapeError}`).toBeNull();
        expect(
          r.claimed.map(c => c.name),
          `output shape differs from PostgreSQL\n` +
            `  engine (${r.claimed.length}): ${r.claimed.map(c => c.name).join(", ")}\n` +
            `  pg     (${r.pgColumns.length}): ${r.pgColumns.join(", ")}`,
        ).toEqual(r.pgColumns);
      }

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
  // Coverage — the witness invariant.
  //
  // A `nullable` claim is *witnessed* when some state or binding yields a
  // genuine NULL in that column. An unwitnessed claim means one of two things
  // and they must be separated EXPLICITLY: the column truly can never be NULL
  // here (engine imprecision or the fixture's own shape — record why with a
  // `-- @unwitnessable N: reason` annotation), or the data is too weak to
  // show that it can (a hole: fix the data). The invariant, in the node
  // census's shape:
  //
  //   unwitnessed  →  annotated with a reason   (else this test fails)
  //   witnessed    →  NOT annotated             (a stale reason must come off)
  //
  // An aggregate ratchet held this before and was replaced deliberately: a
  // ratchet compares sums, so a witnessing regression can hide behind an
  // unrelated improvement; the per-claim invariant cannot be compensated.
  // Claims inside `@no-rows` fixtures are exempt wholesale — a statement that
  // never returns a row can witness nothing, and annotating that would
  // restate the `@no-rows` marker.
  //
  // Both directions are enforced only at the default seed: witnessing is
  // data-dependent, and another FUZZ_SEED may legitimately witness more or
  // fewer. Annotation validity (the column exists and is claimed nullable)
  // is data-independent and always enforced.
  //
  // Set WITNESS_REPORT=1 to list every unwitnessed claim with its reason.
  // -------------------------------------------------------------------------
  it("every nullable claim is witnessed or its unwitnessability is recorded", () => {
    let notNullTotal = 0;
    let notNullFalsifiable = 0;
    let nullableTotal = 0;
    let nullableWitnessed = 0;
    const unwitnessed: string[] = [];
    const guarded: string[] = [];
    const unverified: string[] = [];
    const unclassified: string[] = [];
    const stale: string[] = [];
    const invalid: string[] = [];

    for (const fixture of fixtures) {
      const r = results.get(fixture.name)!;

      // Annotation validity is data-independent and always enforced.
      for (const [index, reason] of fixture.unwitnessable) {
        const claim = r.claimed[index];
        if (fixture.noRowsReason) {
          invalid.push(
            `${fixture.name}: column ${index} — @no-rows fixtures are exempt ` +
              `wholesale; drop the @unwitnessable annotation`,
          );
        } else if (!claim) {
          invalid.push(`${fixture.name}: column ${index} does not exist (${reason})`);
        } else if (claim.notNull) {
          invalid.push(
            `${fixture.name}: column ${index} "${claim.name}" is claimed notNull — ` +
              `@unwitnessable only applies to nullable claims`,
          );
        }
      }

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
          if (seen.sawNull) {
            nullableWitnessed++;
            if (fixture.unwitnessable.has(i)) stale.push(label);
          } else if (!fixture.noRowsReason) {
            unwitnessed.push(`${label} — ${fixture.unwitnessable.get(i) ?? "UNCLASSIFIED"}`);
            if (!fixture.unwitnessable.has(i)) unclassified.push(label);
          }
        }
      });
    }

    expect(
      unverified,
      `notNull claims that nothing checks: the query returned no rows, and the ` +
        `fixture is not marked @no-rows, so no NULL could contradict them and no ` +
        `refusal stands behind them.\n  ${unverified.join("\n  ")}`,
    ).toEqual([]);

    expect(
      invalid,
      `@unwitnessable annotations that name the wrong thing:\n  ${invalid.join("\n  ")}`,
    ).toEqual([]);

    const pct = (n: number, total: number) =>
      total === 0 ? "n/a" : `${Math.round((n / total) * 100)}%`;
    console.log(
      `\nwitness coverage over ${fixtures.length} fixtures and ` +
        `${dataStates.length} data states (${dataStates.map(s => s.name).join(", ")}):\n` +
        `  notNull claims:  ${notNullTotal} — ${notNullFalsifiable} falsifiable ` +
        `(${pct(notNullFalsifiable, notNullTotal)}), ${guarded.length} guarded by a ` +
        `checked refusal, ${unverified.length} unverified\n` +
        `  nullable claims: ${nullableTotal} — ${nullableWitnessed} witnessed ` +
        `(${pct(nullableWitnessed, nullableTotal)}), ${nullableTotal - nullableWitnessed} ` +
        `unwitnessed with the reason recorded`,
    );

    if (process.env.WITNESS_REPORT) {
      console.log(
        `\nunwitnessed nullable claims (${unwitnessed.length}):\n  ${unwitnessed.join("\n  ")}` +
          `\n\nnotNull claims guarded by a checked refusal (${guarded.length}):\n  ` +
          guarded.join("\n  "),
      );
    }

    // Witnessing is data-dependent: another seed may reach more or fewer
    // NULLs, so the two data-dependent directions of the invariant hold only
    // at the default seed. Liveness and annotation validity still apply.
    if (process.env.FUZZ_SEED) {
      console.log(`FUZZ_SEED is overridden, so the witness invariant is not enforced.`);
      return;
    }

    expect(
      unclassified,
      `Nullable claims that no state or binding witnessed with a NULL, and no ` +
        `\`-- @unwitnessable N: reason\` annotation covers. Each needs a ` +
        `decision: data that reaches the NULL, an engine precision fix, or the ` +
        `annotation with the reason recorded:\n  ${unclassified.join("\n  ")}\n`,
    ).toEqual([]);

    expect(
      stale,
      `@unwitnessable annotations on claims that ARE witnessed now — the data ` +
        `or the engine moved past the recorded reason; remove the annotation ` +
        `so the reason stays a current fact:\n  ${stale.join("\n  ")}\n`,
    ).toEqual([]);

    // Presence groups carry a two-arm claim, and each arm must execute: a
    // group whose absent arm no data reaches never exercised "all NULL
    // together", and one whose present arm never ran never exercised the
    // discriminants' given-present non-nullness. There is no group-level
    // annotation escape. The absent arm's exemption is DERIVED: it fires
    // exactly when a discriminant is NULL, so it is unwitnessable precisely
    // when every discriminant's own nullable claim is — each carrying its
    // `@unwitnessable N: reason`. The per-column staleness check removes
    // those the moment data witnesses a NULL, which re-arms this assertion
    // automatically; the two layers cannot drift.
    const groupUnwitnessed: string[] = [];
    for (const fixture of fixtures) {
      const r = results.get(fixture.name)!;
      for (const g of r.groups) {
        const label = `${fixture.name}: group {${g.claimed.columns.join(",")}}`;
        const absentExempt = g.claimed.discriminants.every(d => fixture.unwitnessable.has(d));
        if (!g.sawAbsent && !absentExempt) {
          groupUnwitnessed.push(`${label} — absent arm never observed`);
        }
        if (!g.sawPresent) groupUnwitnessed.push(`${label} — present arm never observed`);
      }
    }
    expect(
      groupUnwitnessed,
      `presence-group arms that no state or binding reached — give the fixture ` +
        `data that exercises both sides of the union:\n  ${groupUnwitnessed.join("\n  ")}\n`,
    ).toEqual([]);
  });
});
