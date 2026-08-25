import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { refuseSearchPathFixture } from "./fixture-catalog.js";
import { bindParams, parseFixtureDirectives, NULL_REJECTION, CONSTRAINT_REJECTION, DEDUCTION_FAILURE, type ParamClaim } from "./fixture-args.js";
import { hasStatements, loadDataStates, type DataState } from "./fixture-data/states.js";

// ---------------------------------------------------------------------------
// Executable verification of the argument contract.
//
// param-nullability.test.ts proves the engine and the fixture author agree
// about each `-- @param` claim. This suite checks the claims against
// PostgreSQL itself, with the quantifiers the design assigns them:
//
//   notNull  — existential: binding NULL must be OBSERVED to raise a
//              null-rejection in at least one data state. Mechanism A raises
//              everywhere including `empty`; mechanism B needs a state that
//              routes a row into the target column — the same
//              observe-the-refusal bar the output side sets for @no-rows
//              fixtures. An unwitnessed notNull is a hard failure here, not
//              a ratchet: every current claim is witnessable, and a future
//              fixture that legitimately cannot witness should force that
//              decision explicitly.
//
//   nullable — NOT a promise, and this is where the two documents used to
//              disagree (sweep-4 finding 7). The contract is one-directional:
//              a claim means "binding NULL can raise", and the ABSENCE of a
//              claim promises nothing. "NULL never raises anywhere" is not
//              achievable for arbitrary user functions and never was — a
//              plpgsql body that simply RAISEs on NULL rejects the binding
//              with nothing catalog-visible behind it, and no static analysis
//              can see that. The declared ARGUMENT type is the channel a
//              schema author uses to get a claim: declare the parameter as a
//              NOT NULL domain and mechanism A answers at Bind. A standard
//              type is nullable by design.
//
//              What this suite still does, because it is the strongest oracle
//              the input side has: over THIS corpus, a nullable claim whose
//              NULL binding raises must be ACCOUNTED FOR. Either the engine
//              is missing a catalog-visible channel — a real defect — or the
//              fixture records `-- @param-opaque N: <why>`, which is itself
//              checked: the raise must be observed, so a stale marker fails.
//              A raise only counts when the same statement with the all-valid
//              binding succeeded in that state — a failure the control shares
//              is not evidence about NULL.
//
// Bindings go through the real protocol Bind step wherever the statement can
// be typed — mechanism A lives at Bind, and a substituted NULL literal
// exercises constant coercion instead. Statements PostgreSQL cannot deduce
// parameter types for (a bare `SELECT $1 AS x` alongside a conflicting cast;
// see the deduction boundaries pinned in param-mechanism.test.ts) fall back
// to the `@args` literal-substitution machinery, which was measured to give
// the same raise/no-raise outcomes for every rejection channel.
//
// Each claim is verified in isolation: the target parameter is NULL, every
// other parameter holds a valid value drawn from the fixture's `@args`
// lines. That attribution is what the control run protects.
// ---------------------------------------------------------------------------

const FIXTURES_DIR = join(__dirname, "fixtures");
const SCHEMA_SQL = readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8");

// NULL_REJECTION and DEDUCTION_FAILURE live in fixture-args.ts — moved so the
// discovery instrument's binding oracle can import them without executing a
// test file. Their documentation and the builtin-null-rejection tie moved with
// them.

/**
 * Whether a raise witnesses "this NULL was rejected". A null-rejection
 * message says so by itself; a constraint-shaped one says so only where the
 * ALL-VALID control succeeded in the same state, since the identical text
 * arrives when another value in the row is what the constraint refused.
 */
function witnessesNull(error: string, controlOk: boolean): boolean {
  return NULL_REJECTION.test(error) || (controlOk && CONSTRAINT_REJECTION.test(error));
}

interface ClaimEvidence {
  claim: ParamClaim;
  /** States where the NULL binding raised a null-rejection. */
  witnessed: string[];
  /**
   * States witnessed through the constraint class rather than a
   * null-rejection message — kept apart so the census can report the
   * widened class separately and so the control condition stays checkable:
   * this list must be a subset of `controlOk`.
   */
  constraintWitnessed: string[];
  /** Raises in states where the control succeeded — evidence against `nullable`. */
  raises: { state: string; message: string }[];
}

interface FixtureRun {
  name: string;
  sql: string;
  claims: ParamClaim[];
  /** `-- @param-opaque N: reason` — a raise the contract does not claim. */
  opaque: Map<number, string>;
  /** `-- @always-raises`: the control is expected to RAISE, not succeed. */
  alwaysRaises: boolean;
  validArgs: unknown[];
  /** null until decided by the first control run. */
  mode: "protocol" | "literal" | null;
  /** States where the all-valid control succeeded. */
  controlOk: string[];
  controlErrors: { state: string; message: string }[];
  evidence: ClaimEvidence[];
  /**
   * Joint-set evidence, existential like notNull: binding NULL to EVERY
   * member together (others valid) must be observed to raise in at least
   * one state. Each member's individual nullable claim is verified by the
   * ordinary per-claim loop, which is what makes the set irreducible.
   */
  jointEvidence: { members: number[]; witnessed: string[] }[];
}

const runs: FixtureRun[] = [];
let stateNames: string[] = [];

/**
 * One valid value per parameter: the first non-null value any `@args` line
 * supplies. A parameter no line ever binds non-null stays null — it can still
 * be the target of its own claim, and a nullable claim's control covers it.
 */
function validArgsFor(claims: ParamClaim[], argLines: (readonly unknown[] | null)[]): unknown[] {
  const max = Math.max(...claims.map(c => c.number));
  const out: unknown[] = new Array<unknown>(max).fill(null);
  for (let i = 0; i < max; i++) {
    for (const line of argLines) {
      if (line && line[i] !== null && line[i] !== undefined) {
        out[i] = line[i];
        break;
      }
    }
  }
  return out;
}

describe("argument soundness (@param claims vs PostgreSQL)", () => {
  beforeAll(async () => {
    const catalogPg = await PGlite.create({ extensions: { plpgsql_check } });
    await catalogPg.exec("CREATE EXTENSION plpgsql_check;");
    await catalogPg.exec(SCHEMA_SQL);
    const snapshot = await snapshotCatalog(catalogPg);
    await catalogPg.close();
    const states: DataState[] = loadDataStates(snapshot);
    stateNames = states.map(s => s.name);

    for (const file of readdirSync(FIXTURES_DIR)
      .filter(f => f.endsWith(".sql") && f !== "schema.sql")
      .sort()) {
      const sql = readFileSync(join(FIXTURES_DIR, file), "utf8");
      const { bindings, paramClaims, paramOpaque, rejectClaims, alwaysRaises, searchPath } =
        parseFixtureDirectives(sql);
      if (paramClaims.length === 0) continue;
      refuseSearchPathFixture(file, searchPath, "param-soundness");
      runs.push({
        name: basename(file, ".sql"),
        sql,
        claims: paramClaims,
        opaque: paramOpaque,
        alwaysRaises,
        validArgs: validArgsFor(paramClaims, bindings.map(b => b.args)),
        mode: null,
        controlOk: [],
        controlErrors: [],
        evidence: paramClaims.map(claim => ({
          claim,
          witnessed: [],
          constraintWitnessed: [],
          raises: [],
        })),
        jointEvidence: rejectClaims.map(members => ({ members, witnessed: [] })),
      });
    }

    for (const state of states) {
      const pg = await PGlite.create({ extensions: { plpgsql_check } });
      await pg.exec("CREATE EXTENSION plpgsql_check;");
      await pg.exec(SCHEMA_SQL);
      if (hasStatements(state.sql)) await pg.exec(state.sql);

      const exec = async (
        run: FixtureRun,
        args: unknown[],
      ): Promise<{ error: string | null }> => {
        await pg.exec("BEGIN;");
        try {
          if (run.mode === "literal") {
            await pg.query(bindParams(run.sql, args));
          } else {
            await pg.query(run.sql, args);
          }
          return { error: null };
        } catch (e) {
          return { error: (e as Error).message };
        } finally {
          await pg.exec("ROLLBACK;");
        }
      };

      for (const run of runs) {
        // Control: all-valid binding. On the first state this also decides
        // the mode — a deduction failure is a property of the statement, not
        // of the data, so it is checked once.
        if (run.mode === null) {
          const probe = await exec(run, run.validArgs);
          run.mode =
            probe.error !== null && DEDUCTION_FAILURE.test(probe.error) ? "literal" : "protocol";
        }
        const control = await exec(run, run.validArgs);
        if (control.error === null) run.controlOk.push(state.name);
        else run.controlErrors.push({ state: state.name, message: control.error });

        for (const ev of run.evidence) {
          const args = [...run.validArgs];
          args[ev.claim.number - 1] = null;
          const { error } = await exec(run, args);
          if (error === null) continue;
          if (witnessesNull(error, control.error === null)) {
            ev.witnessed.push(state.name);
            if (!NULL_REJECTION.test(error)) ev.constraintWitnessed.push(state.name);
          }
          if (control.error === null) ev.raises.push({ state: state.name, message: error });
        }

        for (const jev of run.jointEvidence) {
          const args = [...run.validArgs];
          for (const member of jev.members) args[member - 1] = null;
          const { error } = await exec(run, args);
          if (error !== null && witnessesNull(error, control.error === null)) {
            jev.witnessed.push(state.name);
          }
        }
      }
      await pg.close();
    }
  }, 900_000);

  for (const file of readdirSync(FIXTURES_DIR)
    .filter(f => f.endsWith(".sql") && f !== "schema.sql")
    .sort()) {
    const name = basename(file, ".sql");
    it(name, () => {
      const run = runs.find(r => r.name === name);
      if (!run) return; // no parameters, nothing claimed

      if (run.alwaysRaises) {
        // The inversion of the always-raises statement fact: this statement
        // is claimed to reject on every
        // execution, so a SUCCEEDING control would falsify the flag. The
        // raise still has to be observed — an unraised @always-raises is a
        // stale marker, the same bar @param-opaque and @no-rows set.
        expect(
          run.controlOk,
          `fixture is marked @always-raises but the all-valid control ` +
            `SUCCEEDED — the statement does not always raise, so the flag is ` +
            `wrong`,
        ).toEqual([]);
        expect(
          run.controlErrors.length,
          `fixture is marked @always-raises but the control never raised ` +
            `under any state (${stateNames.join(", ")}) — the flag has to be ` +
            `observed, not asserted`,
        ).toBeGreaterThan(0);
      } else {
        // A claim over a statement that never executes checks nothing.
        expect(
          run.controlOk.length,
          `the all-valid control binding never succeeded, so no claim here is ` +
            `checked against anything:\n  ` +
            run.controlErrors.map(e => `[${e.state}] ${e.message}`).join("\n  "),
        ).toBeGreaterThan(0);
      }

      for (const ev of run.evidence) {
        if (ev.claim.notNull) {
          expect(
            ev.witnessed.length,
            `$${ev.claim.number} is claimed notNull but binding NULL raised no ` +
              `null-rejection under any state (${stateNames.join(", ")}). ` +
              `Either the claim is wrong, or no data state routes a row into ` +
              `the rejecting site — give it one, the way @no-rows fixtures ` +
              `must observe their refusal.`,
          ).toBeGreaterThan(0);
        } else if (run.opaque.has(ev.claim.number)) {
          // Declared opaque: the raise is EXPECTED and must be OBSERVED, the
          // same bar `@no-rows` sets for its refusal. A marker whose raise
          // never happens is a stale excuse, and this is what takes it off.
          expect(
            ev.raises.length,
            `$${ev.claim.number} is marked @param-opaque but binding NULL never ` +
              `raised under any state (${stateNames.join(", ")}) — the contract ` +
              `already covers it, so remove the marker:\n  ` +
              `${run.opaque.get(ev.claim.number)!}`,
          ).toBeGreaterThan(0);
        } else {
          expect(
            ev.raises,
            `$${ev.claim.number} is claimed nullable but binding NULL raised ` +
              `where the control succeeded. A claim means "binding NULL can ` +
              `raise" and its ABSENCE promises nothing, so this is not ` +
              `automatically a defect — but it IS outside what the engine can ` +
              `see, and this suite holds that explicit. Either the engine ` +
              `should claim it (a catalog-visible channel it is missing), or ` +
              `record it with \`-- @param-opaque ${ev.claim.number}: <why no ` +
              `analysis can see it>\`:\n  ` +
              ev.raises.map(r => `[${r.state}] ${r.message}`).join("\n  "),
          ).toEqual([]);
        }
      }

      // The widened class's own guard: a constraint-shaped raise counts only
      // where the control succeeded in THAT state. Without it the class
      // would witness a claim in a state where the row was refused for a
      // reason the binding has nothing to do with.
      for (const ev of run.evidence) {
        expect(
          ev.constraintWitnessed.filter(s => !run.controlOk.includes(s)),
          `$${ev.claim.number} was witnessed by a constraint-shaped raise in a ` +
            `state whose all-valid control ALSO raised — that raise is not ` +
            `evidence about the NULL`,
        ).toEqual([]);
      }

      for (const jev of run.jointEvidence) {
        expect(
          jev.witnessed.length,
          `{$${jev.members.join(", $")}} is claimed a joint rejection set but ` +
            `binding them all NULL raised no null-rejection under any state ` +
            `(${stateNames.join(", ")}). Either the claim is wrong, or no data ` +
            `state routes a row into the rejecting site.`,
        ).toBeGreaterThan(0);
      }
    });
  }

  it("prints the report", () => {
    const literal = runs.filter(r => r.mode === "literal").map(r => r.name);
    const claims = runs.flatMap(r => r.evidence);
    const notNull = claims.filter(e => e.claim.notNull);
    const witnessed = notNull.filter(e => e.witnessed.length > 0);
    // A DECLARED-opaque raise is not a falsification and must not be counted
    // as one: the suite passes on it by design, so a report saying "1
    // falsified" beside a green run reads as a defect nobody is acting on —
    // which is the misleading-green this suite exists to prevent. The two are
    // separated, and `falsified` stays at zero or the run has already failed.
    const opaqueRaises = runs.flatMap(r =>
      r.evidence.filter(e => r.opaque.has(e.claim.number) && e.raises.length > 0),
    );
    const falsified = runs.flatMap(r =>
      r.evidence.filter(
        e => !e.claim.notNull && !r.opaque.has(e.claim.number) && e.raises.length > 0,
      ),
    );
    const joints = runs.flatMap(r => r.jointEvidence);
    console.log(
      `\nargument soundness over ${runs.length} parameterized fixtures and ` +
        `${stateNames.length} data states (${stateNames.join(", ")}):\n` +
        `  notNull claims:  ${notNull.length} — ${witnessed.length} witnessed by an observed rejection, ` +
        `${notNull.filter(e => e.constraintWitnessed.length > 0).length} of them through the constraint class (beside a passing control)\n` +
        `  nullable claims: ${claims.length - notNull.length} — ${falsified.length} falsified by a raise under a passing control\n` +
        `  of those, opaque: ${opaqueRaises.length} — raises OUTSIDE the contract, each with `+
        `\`@param-opaque\` and its raise observed\n` +
        `  joint sets:      ${joints.length} — ${joints.filter(j => j.witnessed.length > 0).length} witnessed by the all-members-NULL raise\n` +
        `  literal-substitution fallback (protocol could not type the statement): ` +
        `${literal.length ? literal.join(", ") : "none"}`,
    );
  });
});
