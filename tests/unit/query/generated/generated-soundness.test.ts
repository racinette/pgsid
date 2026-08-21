import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { deparseSync } from "pgsql-deparser";
import { parseSql } from "../../../../src/ast.js";
import { snapshotCatalog } from "../../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../../src/query/catalog-adapter.js";
import {
  inferNullability,
  inferPresenceGroups,
  UnsupportedNodeError,
} from "../../../../src/query/nullability-walk.js";
import {
  collectParamFacts,
  type ParamNullability,
} from "../../../../src/query/param-nullability.js";
import type { NullabilityCatalog, OutputNullability } from "../../../../src/query/types.js";
import { hasStatements, loadDataStates, type DataState } from "../fixture-data/states.js";
import {
  generateDeepJoinQueries,
  generateDmlQueries,
  generateParamPlacementQueries,
  generateQueries,
  type GeneratedQuery,
} from "./generator.js";

// ---------------------------------------------------------------------------
// Generated-query soundness: the engine vs PostgreSQL over the enumerated
// structural space. See docs/query-generator.md.
//
// Pipeline per query:  construct AST → deparse → parse the text → engine
//                                             ↘ same text       → PostgreSQL
//
// The engine analyses the RE-PARSED text, never the constructed AST, so both
// sides see one identical string and deparser fidelity is not a correctness
// requirement — a differently-rendered query is just a different valid test
// case. What deparser fidelity IS required for is the constructs each axis
// tuple requested, and that is checked explicitly: every query carries
// expected-node predicates, and a construct that vanished in deparsing is
// reported as a silent drop rather than assumed present.
//
// Two oracles, not equally strong (see the generator doc):
//   - column list: complete — any disagreement with PostgreSQL is a defect;
//   - nullability: one-sided — execution can only falsify `notNull` claims.
//     This suite finds unsoundness, not imprecision.
//
// A statement that raises is not a counterexample (it returned no rows), but
// for this corpus no statement may raise at all: every query is a pure SELECT
// over a total expression vocabulary, so any PostgreSQL error is a generator
// defect and fails the run rather than being discarded.
//
// Default states are `empty`, `sparse`, and a suite-local `unmatched`, each
// getting the full enumeration. `empty` is where zero-input aggregates bite.
// `sparse` gives every nullable base column a NULL at one-row volume — but
// its single t/u/v rows all match each other, so no outer join ever
// NULL-extends there, and the engine's join reasoning would go unfalsified.
// `unmatched` is `sparse` plus one row on each side that nothing matches,
// which is what actually produces the NULL-extended tuple — a NOT NULL base
// column coming back NULL — that a wrong "never NULL" claim needs. Set
// GENERATED_ALL_STATES=1 to also run the remaining data states, in the style
// of the FUZZ_SEED / WITNESS_REPORT knobs.
// ---------------------------------------------------------------------------

const SCHEMA_SQL = readFileSync(join(__dirname, "..", "fixtures", "schema.sql"), "utf8");
const DEFAULT_STATES = ["empty", "sparse"];

/** The two null-rejection messages, pinned in param-mechanism.test.ts. */
const NULL_REJECTION = /does not allow null values|violates not-null constraint/;

/**
 * Nullable output claims across the scanned corpus, and how many were
 * witnessed by an actual NULL. Rejected, refused, and shape-mismatched
 * queries contribute nothing — their rows were never scanned, so counting
 * their claims would dilute the ratio with claims nothing could witness.
 */
function nullableWitnessCounts(): { witnessed: number; total: number } {
  let witnessed = 0;
  let total = 0;
  for (const r of records) {
    if (!r.claimed || r.rejection || r.shapeMismatch) continue;
    r.claimed.forEach((claim, i) => {
      if (claim.notNull) return;
      total++;
      if (r.nullWitnessed[i]) witnessed++;
    });
  }
  return { witnessed, total };
}

/**
 * t.2 has no u; u.3 points at a t that does not exist and no v points at it;
 * v.3 points at a u that does not exist. Every join direction in the
 * generated structures — t→u, u→t, u→v, v→u, and the LATERAL subquery — has
 * an unmatched row on its outer side somewhere.
 */
const UNMATCHED_TOPUP = `
-- A matched t–u pair whose u.val is NON-NULL: the refilter wrappers pin
-- a_tc (u.val), and without this row every surviving row under them has t
-- null-extended — the t-side unit's present arm would never execute.
INSERT INTO u (id, t_id, email, val, status) VALUES (6, 1, 'u6@b.c', 'vv', 'active');
-- An orphan gm row with a NON-NULL b: gives the gm structures' t-side unit
-- its absent arm (a=77 matches no t), and survives the refilter (label =
-- 'zz!' is non-null) so the arm is observable there too.
INSERT INTO gm (a, b) VALUES (77, 'zz');
-- The dual-purpose matched pair: t.4 has a NULL name, so a_ta's NULL
-- survives the refilter through gm.4's non-null label — and gm.4's b is
-- the NULLIF literal 'z', so safe_label = 'z' makes a_nif witnessable on
-- gm structures at all (the gm analogue of u.4's email).
INSERT INTO t (id, name, val, active) VALUES (4, NULL, 'q', true);
INSERT INTO gm (a, b) VALUES (4, 'z');
-- A v partner for the orphan u.3: under nested kinds like t RIGHT (u ⋈ v)
-- or (t RIGHT u) ⋈ v, the t-absent arm can only survive a refilter through
-- an orphan u whose val is non-null AND whose v partner exists — u.3
-- ('w', t_id 99) had no v row until this one.
INSERT INTO v (id, u_id, amount) VALUES (7, 3, 2.5);
-- The fully-matched refilter survivor: t.1 ⟵ u.6 ('vv') ⟵ this v with a
-- NULL amount. Inner-joined chains under the refilter admit no other row
-- that could witness a_amt's NULL — every other u either fails the pin or
-- lacks a v partner. (u.6/v.7/v.8 ids are chosen clear of the pre-existing
-- u.5/v.6 pair below.)
INSERT INTO v (id, u_id, amount) VALUES (8, 6, NULL);
INSERT INTO t (id, name, val, active) VALUES (2, 'Bea', 'y', false);
INSERT INTO u (id, t_id, email, val, status) VALUES (3, 99, 'u3@b.c', 'w', NULL);
INSERT INTO v (id, u_id, amount) VALUES (3, 98, 1.5);
-- An ACTIVE orphan: t.3 matches no u, so an outer join null-extends textB
-- while boolCol is true — the only way the case-nullif projection's
-- CASE WHEN active THEN email ELSE 'e' END goes NULL. t.2 above is the
-- INACTIVE orphan; both matter, and neither substitutes for the other.
INSERT INTO t (id, name, val, active) VALUES (3, NULL, NULL, true);
-- This email deliberately equals the generator's NULLIF literal 'z' (see the
-- case-nullif projection), so NULLIF(email, 'z') is witnessable at all; the
-- chain t.1 -> u.4 -> v.4 keeps the row alive through fully-inner
-- three-table nesting, so no outer join is needed to reach it.
INSERT INTO u (id, t_id, email, val, status) VALUES (4, 1, 'z', NULL, 'q');
INSERT INTO v (id, u_id, amount) VALUES (4, 4, NULL);
-- An orphan u WITH a v: in (t RIGHT/FULL u) INNER v, the null-extended t can
-- only be observed if its u partner survives the inner v join — u.3 cannot
-- (nothing points at it, deliberately: it is the "u without v" row above).
-- u.5 carries that combination without disturbing u.3's purpose.
INSERT INTO u (id, t_id, email, val, status) VALUES (5, 97, 'u5@b.c', NULL, NULL);
INSERT INTO v (id, u_id, amount) VALUES (6, 5, 3.5);
-- The EMPTY-STRING group, and the only thing that witnesses a_fa.
--
-- gfn_noinit's transition function folds '' to NULL (nullif over the
-- concatenation), so the aggregate is NULL over a NON-EMPTY group whose every
-- value is '' — which is a different NULL from the zero-row one GROUP BY makes
-- unreachable, and the one the claim actually rests on. a_fa groups by t.id, so
-- the witness needs a key whose whole group is empty strings: t.5 has exactly
-- one u partner and one gm partner, both empty.
--
-- Both partners are needed and neither substitutes: the u side carries textB
-- for single/only/nest/lateral-cross/srf-cross (gfn_urows returns SETOF u, so
-- it inherits the row), and gm.safe_label — coalesce(b,'anon'), so '' survives
-- as '' — carries it for gm(inner) and gm(right).
INSERT INTO t (id, name, val, active) VALUES (5, 'fa5', 'fa5', true);
INSERT INTO u (id, t_id, email, val, status) VALUES (7, 5, '', 'fa5', 'active');
INSERT INTO gm (a, b) VALUES (5, '');
-- and a v partner, or the group survives only the two-table structures: every
-- nest whose later join on v is INNER (or RIGHT, where v drives) drops a
-- u without one, taking the whole group with it. Measured: 300 unwitnessed
-- without this row, 120 with only the pair above, 0 with all four.
INSERT INTO v (id, u_id, amount) VALUES (9, 7, 4.5);
-- A ck row no MERGE source reaches (sources draw sids from t, whose ids stay
-- small): the NOT MATCHED BY SOURCE arm fires for it, null-extending the
-- source columns in RETURNING — the only way s.* is ever witnessed NULL.
INSERT INTO ck (id) VALUES (55);
-- Deep-chain presence patterns (the t—u—v—ck chain of the deep join axis,
-- edges u.t_id=t.id / v.u_id=u.id / ck.id=v.u_id). Existing rows already
-- give: t alone (t.2, t.3), the full chain (t.1—u.1—v.1—ck.1, seeded by
-- sparse), t+u+v without ck (t.1—u.4—v.4: no ck.4), and the right-side
-- orphans u.3, v.3, ck.55. The two rows below complete what the chain data
-- can express: u.6 is a u attached to t.1 with no v (t+u present, v and ck
-- null-extended together), and ck.5 closes the orphan chain u.5—v.6—ck.5
-- (t null-extended while u, v, AND ck are all present — without it, any
-- strict edge above the t-side null-extension discards the row).
INSERT INTO u (id, t_id, email, val, status) VALUES (6, 1, 'u6@b.c', NULL, NULL);
INSERT INTO ck (id) VALUES (5);
-- A v orphan whose u_id points at an EXISTING ck (ck.55) but no u: the only
-- row shape that lets a u-null-extended row SURVIVE a strict ck.id = v.u_id
-- INNER above it. Without it, every v row that completes the chain
-- to ck also has a u partner, and a_ue can never be witnessed NULL in
-- structures whose only u-null source is the v side.
INSERT INTO v (id, u_id, amount) VALUES (7, 55, 4.5);
`;

/**
 * Rule 6 in the workspace AGENTS.md: a long-lived PGlite instance leaks —
 * WASM linear memory only grows and ROLLBACK returns nothing. Thousands of
 * queries against one instance would climb toward the 2 GB ceiling, so each
 * data state's run recreates its instance every N queries.
 */
const QUERIES_PER_INSTANCE = 1000;

/**
 * Verification state for one argument claim, quantified per the design doc:
 * `notNull` needs a witnessed null-rejection somewhere; nullable is
 * falsified by any raise in a state where the all-valid control succeeded
 * (which is given here — a failed control marks the query rejected instead).
 */
interface ParamEvidence {
  number: number;
  notNull: boolean;
  witnessed: string[];
  falsified: { state: string; message: string }[];
}

/**
 * Per engine-claimed presence group: the per-row oracle's observations.
 * `sawAbsent`/`sawPresent` are the two arms of the union the group emits;
 * a group neither state reaches on some arm is unproven and fails below
 * unless a GROUP_UNWITNESSABLE rule records why.
 */
interface GroupEvidence {
  columns: number[];
  discriminants: number[];
  sawAbsent: boolean;
  sawPresent: boolean;
}

interface QueryRecord {
  query: GeneratedQuery;
  sql: string;
  claimed: OutputNullability[] | null;
  /** Engine-claimed presence groups; per-row-verified below. */
  groupEvidence: GroupEvidence[];
  /** Presence-group falsifications — the joint oracle's own channel. */
  groupViolations: string[];
  /** Engine's argument contract; PostgreSQL is the oracle for it below. */
  paramClaims: ParamNullability[];
  /** Engine-claimed joint rejection sets — verified two-sided below. */
  rejectionSets: number[][];
  /** The all-valid control binding, positional $1..$n. */
  validArgs: unknown[];
  paramEvidence: ParamEvidence[];
  /** Per claimed set: states where the all-members-NULL binding raised. */
  jointEvidence: { members: number[]; witnessed: string[] }[];
  /**
   * Null-rejections under a binding the CONTRACT deems admissible (no
   * notNull parameter NULL, no rejection set fully NULL) — each one is a
   * claim the emitted types would mis-promise, and always a failure.
   */
  admissibleRaises: string[];
  /** UnsupportedNodeError, as `site:nodeType`. Counted and skipped, by design. */
  refusal: string | null;
  /** Any other engine throw. Always a defect. */
  crash: string | null;
  /** Expected constructs absent from the re-parsed AST: silent deparser drops. */
  drops: string[];
  /** PostgreSQL's error for this query, if any. Always a generator defect. */
  rejection: string | null;
  pgColumns: string[] | null;
  shapeMismatch: boolean;
  violations: string[];
  sawRows: boolean;
  /**
   * Per output column: a NULL was actually observed there, under some state
   * and binding. For nullable claims this is the witness — the only
   * precision signal an annotation-free corpus can have. Without it, an
   * engine drifting toward "everything nullable" would pass this suite
   * silently: soundness checks punish wrong `notNull` and reward nothing.
   */
  nullWitnessed: boolean[];
}

const records: QueryRecord[] = [];
let stateNames: string[] = [];

describe("generated-query soundness (engine vs PostgreSQL)", () => {
  beforeAll(async () => {
    // --- Catalog and data states, from an instance that then goes away. ----
    const catalogPg = await PGlite.create({ extensions: { plpgsql_check } });
    await catalogPg.exec("CREATE EXTENSION plpgsql_check;");
    await catalogPg.exec(SCHEMA_SQL);
    const snapshot = await snapshotCatalog(catalogPg);
    const catalog: NullabilityCatalog = await buildNullabilityCatalog(snapshot);
    await catalogPg.close();

    const allStates = loadDataStates(snapshot);
    const sparse = allStates.find(s => s.name === "sparse")!;
    const unmatched: DataState = { name: "unmatched", sql: sparse.sql + UNMATCHED_TOPUP };
    const states: DataState[] = process.env.GENERATED_ALL_STATES
      ? [...allStates, unmatched]
      : [...allStates.filter(s => DEFAULT_STATES.includes(s.name)), unmatched];
    stateNames = states.map(s => s.name);

    // --- Deparse, re-parse, expected-node checks, engine claims. -----------
    for (const query of [
      ...generateQueries(),
      ...generateDmlQueries(),
      ...generateParamPlacementQueries(),
      ...generateDeepJoinQueries(),
    ]) {
      const record: QueryRecord = {
        query,
        sql: "",
        claimed: null,
        groupEvidence: [],
        groupViolations: [],
        paramClaims: [],
        rejectionSets: [],
        validArgs: [],
        paramEvidence: [],
        jointEvidence: [],
        admissibleRaises: [],
        refusal: null,
        crash: null,
        drops: [],
        rejection: null,
        pgColumns: null,
        shapeMismatch: false,
        violations: [],
        sawRows: false,
        nullWitnessed: [],
      };
      records.push(record);

      try {
        // The constructed AST is structurally a Node; the generator types it
        // loosely because @pgsql/types' Node union rejects partial literals.
        record.sql = deparseSync(query.ast as Parameters<typeof deparseSync>[0]);
      } catch (e) {
        record.rejection = `deparser threw: ${(e as Error).message}`;
        continue;
      }

      let stmt;
      try {
        stmt = (await parseSql(record.sql)).stmts?.[0]?.stmt;
        if (!stmt) throw new Error("no statement");
      } catch (e) {
        record.rejection = `regenerated SQL did not parse: ${(e as Error).message}`;
        continue;
      }

      record.drops = query.expectations.filter(ex => !ex.present(stmt)).map(ex => ex.label);

      try {
        record.claimed = await inferNullability(stmt, catalog);
        record.groupEvidence = inferPresenceGroups(stmt, catalog).map(g => ({
          columns: g.columns,
          discriminants: g.discriminants,
          sawAbsent: false,
          sawPresent: false,
        }));
      } catch (e) {
        if (e instanceof UnsupportedNodeError) record.refusal = `${e.site}:${e.nodeType}`;
        else record.crash = (e as Error).message;
      }

      // The argument contract needs no annotations: the engine claims, the
      // execution below asks PostgreSQL. Valid control values come from the
      // generator, which knows what it put where.
      const paramFacts = collectParamFacts(stmt, catalog);
      record.paramClaims = paramFacts.params;
      record.rejectionSets = paramFacts.rejectionSets;
      record.jointEvidence = paramFacts.rejectionSets.map(members => ({
        members,
        witnessed: [],
      }));
      const valids = new Map(query.params.map(p => [p.number, p.valid]));
      const maxParam = Math.max(
        0,
        ...record.paramClaims.map(c => c.number),
        ...query.params.map(p => p.number),
      );
      record.validArgs = Array.from({ length: maxParam }, (_, i) => valids.get(i + 1) ?? null);
      record.paramEvidence = record.paramClaims.map(c => ({
        number: c.number,
        notNull: c.notNull,
        witnessed: [],
        falsified: [],
      }));
    }

    // --- Execution, state-major. Pure SELECTs, so no transaction wrapping. -
    for (const state of states) {
      let statePg: PGlite | null = null;
      let queriesOnInstance = 0;
      for (const record of records) {
        if (record.rejection) continue;
        const executions = 1 + record.paramEvidence.length;
        if (!statePg || queriesOnInstance + executions > QUERIES_PER_INSTANCE) {
          if (statePg) await statePg.close();
          statePg = await PGlite.create({ extensions: { plpgsql_check } });
          await statePg.exec("CREATE EXTENSION plpgsql_check;");
          await statePg.exec(SCHEMA_SQL);
          if (hasStatements(state.sql)) await statePg.exec(state.sql);
          queriesOnInstance = 0;
        }
        queriesOnInstance += executions;

        // Output claims must hold under every binding, so successful
        // NULL-variant executions feed the same row scan as the control.
        const scanRows = (rows: unknown[][], binding: string): void => {
          if (!record.claimed || record.shapeMismatch) return;
          if (rows.length > 0) record.sawRows = true;
          record.claimed.forEach((claim, i) => {
            if (!rows.some(r => r[i] === null)) return;
            if (!claim.notNull) {
              record.nullWitnessed[i] = true;
              return;
            }
            record.violations.push(
              `[${state.name}${binding}] column ${i} "${claim.name}": engine claims ` +
                `notNull, PostgreSQL returned NULL`,
            );
          });
          // Presence groups are ROW-side claims: per returned row the
          // discriminants must agree (all NULL = the unit's absent arm),
          // and on the absent arm every member must be NULL. One row
          // disagreeing falsifies the group — the same oracle the fixture
          // suite runs, here over every generated structure and binding.
          for (const gev of record.groupEvidence) {
            for (const row of rows) {
              const nullDiscs = gev.discriminants.filter(d => row[d] === null);
              if (nullDiscs.length === 0) {
                gev.sawPresent = true;
                continue;
              }
              if (nullDiscs.length < gev.discriminants.length) {
                record.groupViolations.push(
                  `[${state.name}${binding}] group {${gev.columns.join(",")}}: ` +
                    `discriminants disagree in one row (NULL: ${nullDiscs.join(",")})`,
                );
                continue;
              }
              gev.sawAbsent = true;
              const survivors = gev.columns.filter(c => row[c] !== null);
              if (survivors.length > 0) {
                record.groupViolations.push(
                  `[${state.name}${binding}] group {${gev.columns.join(",")}}: ` +
                    `absent arm but column(s) ${survivors.join(",")} non-NULL`,
                );
              }
            }
          }
        };

        // Generated DML rolls back its own writes; SELECTs skip the two
        // extra round-trips.
        const pgHere = statePg;
        const runQuery = async (args: unknown[]) => {
          if (!record.query.writes) return pgHere.query(record.sql, args, { rowMode: "array" });
          await pgHere.exec("BEGIN;");
          try {
            return await pgHere.query(record.sql, args, { rowMode: "array" });
          } finally {
            await pgHere.exec("ROLLBACK;");
          }
        };

        // The all-valid control. A failure here — including a parameter-type
        // deduction failure — is a generator defect: generated queries are
        // crafted to be protocol-typeable, so there is no literal fallback.
        let res;
        try {
          res = await runQuery(record.validArgs);
        } catch (e) {
          record.rejection = `[${state.name}] ${(e as Error).message}`;
          continue;
        }

        const pgColumns = res.fields.map(f => f.name);
        if (!record.pgColumns) {
          record.pgColumns = pgColumns;
          record.shapeMismatch =
            record.claimed !== null &&
            JSON.stringify(record.claimed.map(c => c.name)) !== JSON.stringify(pgColumns);
        }
        // Positional comparison is only meaningful when the column lists line
        // up; a mismatched shape is reported once, by the shape oracle.
        scanRows(res.rows as unknown[][], "");

        // Per-parameter NULL variants: the argument oracle, two-sided. The
        // control succeeded in this state, so any raise here is attributable
        // to the NULL.
        for (const ev of record.paramEvidence) {
          const args = [...record.validArgs];
          args[ev.number - 1] = null;
          try {
            const vres = await runQuery(args);
            scanRows(vres.rows as unknown[][], ` $${ev.number}=NULL`);
          } catch (e) {
            const message = (e as Error).message;
            if (NULL_REJECTION.test(message)) ev.witnessed.push(state.name);
            if (!ev.notNull) ev.falsified.push({ state: state.name, message });
          }
        }

        // Joint rejection sets, the claim side: bind every member NULL
        // together (others valid — the raise stays attributable, the control
        // succeeded) and record the observed null-rejection.
        for (const jev of record.jointEvidence) {
          const args = [...record.validArgs];
          for (const member of jev.members) args[member - 1] = null;
          try {
            const jres = await runQuery(args);
            scanRows(jres.rows as unknown[][], ` {${jev.members.map(m => `$${m}`)}}=NULL`);
          } catch (e) {
            if (NULL_REJECTION.test((e as Error).message)) jev.witnessed.push(state.name);
          }
        }

        // One all-params-NULL execution: row witnessing, and the joint
        // oracle's FALSIFICATION side. When the contract deems the all-NULL
        // binding admissible — no notNull parameter, and no rejection set
        // (all-NULL fully covers any set there is) — a null-rejection here
        // is a binding the emitted types would permit and PostgreSQL
        // refuses: the exact lie Wave 10 exists to make impossible.
        if (record.paramEvidence.length >= 2) {
          const admissible =
            record.paramEvidence.every(ev => !ev.notNull) && record.rejectionSets.length === 0;
          try {
            const allNull = record.validArgs.map(() => null);
            const nres = await runQuery(allNull);
            scanRows(nres.rows as unknown[][], " all-NULL");
          } catch (e) {
            const message = (e as Error).message;
            if (admissible && NULL_REJECTION.test(message)) {
              record.admissibleRaises.push(`[${state.name} all-NULL] ${message}`);
            }
            // Otherwise a rejecting parameter or a claimed set raised; the
            // loops above already recorded everything worth knowing.
          }
        }
      }
      if (statePg) await statePg.close();
    }
  }, 900_000);

  const describeFailure = (r: QueryRecord, detail: string): string =>
    `${r.query.id}\n  ${detail}\n  ${r.sql.replace(/\s+/g, " ").trim()}`;

  it("the deparser preserved every requested construct", () => {
    const dropped = records
      .filter(r => r.drops.length > 0)
      .map(r => describeFailure(r, `absent from the re-parsed AST: ${r.drops.join(", ")}`));
    expect(
      dropped,
      `Silent deparser drops — the axis tuple requested a construct the ` +
        `regenerated SQL no longer contains, so these queries test less than ` +
        `they claim to:\n${dropped.join("\n")}\n`,
    ).toEqual([]);
  });

  it("PostgreSQL accepts every generated query", () => {
    const rejected = records
      .filter(r => r.rejection)
      .map(r => describeFailure(r, r.rejection!));
    expect(
      rejected,
      `A generated query PostgreSQL rejects is a generator defect, not a ` +
        `finding (docs/query-generator.md):\n${rejected.join("\n")}\n`,
    ).toEqual([]);
  });

  it("the engine throws nothing but UnsupportedNodeError", () => {
    const crashed = records.filter(r => r.crash).map(r => describeFailure(r, r.crash!));
    expect(crashed, `\n${crashed.join("\n")}\n`).toEqual([]);
  });

  it("output column lists agree with PostgreSQL", () => {
    const mismatched = records
      .filter(r => r.shapeMismatch)
      .map(r =>
        describeFailure(
          r,
          `engine: [${r.claimed!.map(c => c.name).join(", ")}] ` +
            `pg: [${r.pgColumns!.join(", ")}]`,
        ),
      );
    expect(
      mismatched,
      `Column-list disagreements. Nullability is zipped positionally against ` +
        `RowDescription, so a wrong column list misassigns every flag past ` +
        `the divergence:\n${mismatched.join("\n")}\n`,
    ).toEqual([]);
  });

  it("no notNull claim is falsified by execution", () => {
    const violated = records
      .filter(r => r.violations.length > 0)
      .map(r => describeFailure(r, r.violations.join("\n  ")));
    expect(
      violated,
      `Unsoundness: the engine said "never NULL" and PostgreSQL returned ` +
        `NULL. Each of these should become a permanent fixture in ` +
        `tests/unit/query/fixtures/ once diagnosed:\n${violated.join("\n")}\n`,
    ).toEqual([]);
  });

  it("no presence group is falsified by execution", () => {
    const violated = records
      .filter(r => r.groupViolations.length > 0)
      .map(r => describeFailure(r, r.groupViolations.join("\n  ")));
    expect(
      violated,
      `Presence-group unsoundness: a returned row where the discriminants ` +
        `disagree, or an absent arm with a surviving member. Each of these ` +
        `should become a permanent fixture once diagnosed:\n${violated.join("\n")}\n`,
    ).toEqual([]);
  });

  it("every presence group's two arms are observed, or the reason is recorded", () => {
    // The group analogue of the nullable-claim witness bar: "0 group
    // violations" over arms that never executed would assert nothing. A
    // rule records a structural reason an arm cannot occur, and goes stale
    // the moment the corpus reaches it — same discipline as UNWITNESSABLE.
    interface GroupUnwitnessableRule {
      label: string;
      arm: "absent" | "present";
      matches(axes: GeneratedQuery["axes"], group: GroupEvidence): boolean;
    }
    // Empty since the unit-chain closure: the cross-unit-implication rule
    // that lived here went stale the day origins learned to carry their
    // crossing chains, and the staleness assertion forced its removal —
    // the discipline working as designed.
    const GROUP_UNWITNESSABLE: GroupUnwitnessableRule[] = [];
    const matchedRules = new Set<string>();
    const unproven: string[] = [];
    for (const r of records) {
      if (r.rejection) continue;
      for (const gev of r.groupEvidence) {
        for (const [arm, saw] of [
          ["absent", gev.sawAbsent],
          ["present", gev.sawPresent],
        ] as const) {
          if (saw) continue;
          const rules = GROUP_UNWITNESSABLE.filter(
            rule => rule.arm === arm && rule.matches(r.query.axes, gev),
          );
          if (rules.length > 0) {
            for (const rule of rules) matchedRules.add(rule.label);
            continue;
          }
          unproven.push(
            describeFailure(r, `group {${gev.columns.join(",")}}: ${arm} arm never observed`),
          );
        }
      }
    }
    expect(
      unproven,
      `Presence-group arms no state or binding reached, with no ` +
        `GROUP_UNWITNESSABLE rule recording why — an unexecuted arm proves ` +
        `nothing:\n${unproven.join("\n")}\n`,
    ).toEqual([]);
    const stale = GROUP_UNWITNESSABLE.map(r => r.label).filter(l => !matchedRules.has(l));
    expect(
      stale,
      `GROUP_UNWITNESSABLE rules that matched nothing — the corpus or the ` +
        `data moved past them; remove each so the reasons stay current:\n  ${stale.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every notNull argument claim is witnessed by a null-rejection", () => {
    const unwitnessed = records
      .filter(r => !r.rejection)
      .flatMap(r =>
        r.paramEvidence
          .filter(ev => ev.notNull && ev.witnessed.length === 0)
          .map(ev => describeFailure(r, `$${ev.number}: claimed notNull, never raised`)),
      );
    expect(
      unwitnessed,
      `notNull argument claims nothing observed: binding NULL raised no ` +
        `null-rejection under any state, so either the engine's claim is ` +
        `wrong or the corpus cannot reach the rejecting site:\n` +
        `${unwitnessed.join("\n")}\n`,
    ).toEqual([]);
  });

  it("no nullable argument claim raises under a passing control", () => {
    const falsified = records
      .filter(r => !r.rejection)
      .flatMap(r =>
        r.paramEvidence
          .filter(ev => !ev.notNull && ev.falsified.length > 0)
          .map(ev =>
            describeFailure(
              r,
              `$${ev.number} claimed nullable, but: ` +
                ev.falsified.map(f => `[${f.state}] ${f.message}`).join("; "),
            ),
          ),
      );
    expect(
      falsified,
      `Falsified nullable argument claims — the engine said NULL is a safe ` +
        `binding and PostgreSQL raised:\n${falsified.join("\n")}\n`,
    ).toEqual([]);
  });

  it("every claimed joint rejection set is witnessed by its all-members-NULL raise", () => {
    const unwitnessed = records
      .filter(r => !r.rejection)
      .flatMap(r =>
        r.jointEvidence
          .filter(jev => jev.witnessed.length === 0)
          .map(jev =>
            describeFailure(
              r,
              `{${jev.members.map(m => `$${m}`).join(", ")}} claimed a joint ` +
                `rejection set, but binding all members NULL raised no ` +
                `null-rejection under any state`,
            ),
          ),
      );
    expect(
      unwitnessed,
      `Joint rejection sets nothing checks — same bar as notNull claims:\n` +
        `${unwitnessed.join("\n")}\n`,
    ).toEqual([]);
  });

  it("no contract-admissible binding raises a null-rejection", () => {
    const raises = records
      .filter(r => !r.rejection)
      .flatMap(r =>
        r.admissibleRaises.map(m =>
          describeFailure(
            r,
            `the contract admits this binding (no notNull, no rejection set) ` +
              `and PostgreSQL null-rejected it — the emitted types would lie: ${m}`,
          ),
        ),
      );
    expect(raises, `\n${raises.join("\n")}\n`).toEqual([]);
  });

  it("execution is not vacuous", () => {
    // Soundness can only be falsified by rows. If some generator or data
    // regression left most of the corpus returning nothing anywhere, every
    // check above would pass while asserting almost nothing — the same trap
    // the fixture suite guards with per-fixture liveness. Generated queries
    // are not hand-tuned to their data, so demand rows from most of the
    // corpus rather than all of it.
    const live = records.filter(r => r.sawRows).length;
    expect(
      live / records.length,
      `only ${live} of ${records.length} generated queries returned a row ` +
        `under any data state (${stateNames.join(", ")})`,
    ).toBeGreaterThan(0.5);
  });

  // -------------------------------------------------------------------------
  // The witness invariant — the reward half of the oracle.
  //
  // Soundness alone punishes a wrong `notNull` and rewards nothing, which
  // over time pressures an engine toward claiming everything nullable: safe,
  // useless, and invisible to every check above. The counterweight, in the
  // node census's shape: every nullable claim must either be WITNESSED (some
  // state and binding actually produced its NULL) or match a CLASSIFIED
  // unwitnessability rule below, each with a reason. A claim that is neither
  // fails — a new axis, structure, or engine change that goes dark lands
  // outside every rule and forces a decision: fix the data, fix the engine,
  // or add a rule and say why. An aggregate ratchet cannot do this: it
  // compares sums, so a regression can hide behind an unrelated improvement.
  //
  // The implication runs one way — unwitnessed → classified — because
  // witnessing is data-dependent in a way node classification is not: a
  // richer state set may witness a claim a rule covers, and that is a bonus,
  // not a contradiction (the report notes it as possible staleness). Rules
  // that match NO unwitnessed claim at all are dead and must go — checked
  // under the default states only, since extended states legitimately
  // witness past them.
  // -------------------------------------------------------------------------

  interface UnwitnessableRule {
    label: string;
    /** Why no data can witness this claim — the triage result, recorded. */
    why: string;
    /**
     * Where `why` blames the CORPUS's row geometry rather than an engine
     * behaviour: the note saying so, and no blame file. A geometry reason has
     * no statement that isolates it — the fact it rests on is "these
     * structures produce no such row", which is not a thing one query can
     * exhibit.
     *
     * Every other rule blames a MECHANISM, and a mechanism can be executed:
     * see the blame-file gate below.
     */
    geometry?: string;
    matches: (axes: GeneratedQuery["axes"], column: string) => boolean;
  }

  // Exact structure sets, not predicates-by-pattern: each entry was verified
  // by hand (see the rule's `why`), and a pattern that quietly covered one
  // more structure would mask exactly the regression this test exists to
  // catch. A structure that becomes witnessable leaves its set via the
  // staleness check below.
  const CASE_DARK_STRUCTURES = new Set([
    "nest-left(inner,right)",
    "nest-right(inner,right)",
    "nest-left(inner,full)",
    "nest-right(inner,full)",
    "nest-left(left,inner)",
    "nest-left(left,right)",
    "nest-left(right,right)",
    "nest-right(right,right)",
    "nest-left(right,full)",
    "nest-right(right,full)",
    "nest-left(full,inner)",
    "nest-left(full,right)",
  ]);

  /**
   * Structures in which the `u` side is never absent from a returned row, so
   * a claim whose only witness is an ABSENT u cannot be witnessed there.
   *
   * Enumerated rather than computed, following CASE_DARK_STRUCTURES above and
   * for the same reason: the property is not one rule. Three different things
   * produce it — the join that attaches `u` is INNER (only matched rows
   * survive) or RIGHT (every u row survives and `t` extends instead); a LATER
   * join is INNER and its strict qual on `u`'s columns discards the extended
   * rows; or the extension is joint, so no row has `u` absent while the other
   * slots are present. A predicate broad enough to cover all three would also
   * excuse structures that SHOULD witness, and would do it silently.
   *
   * 24 of the axis's structures. Collected by measurement, not by reasoning.
   */
  const U_NEVER_ABSENT = new Set([
    "gm(inner)",
    "gm(right)",
    "lateral-cross",
    // The ONLY spelling of single(inner)/single(right). Neither `t` nor `u`
    // has children under the base schema, so these scan exactly the same rows
    // through the non-tree catalog accessors — which is the whole point of
    // the structure, and it means they inherit `single`'s witness geometry
    // exactly.
    "only(inner)",
    "only(right)",
    "nest-left(full,inner)",
    "nest-left(full,right)",
    "nest-left(inner,inner)",
    "nest-left(inner,left)",
    "nest-left(left,inner)",
    "nest-left(right,full)",
    "nest-left(right,inner)",
    "nest-left(right,left)",
    "nest-left(right,right)",
    "nest-right(inner,full)",
    "nest-right(inner,inner)",
    "nest-right(inner,left)",
    "nest-right(inner,right)",
    "nest-right(right,full)",
    "nest-right(right,inner)",
    "nest-right(right,left)",
    "nest-right(right,right)",
    "single(inner)",
    "single(right)",
    // A cross-joined table function does not NULL-extend: a call returning
    // no rows removes the row outright, so `g` is present wherever a row is.
    "srf-cross",
  ]);

  /**
   * The two unnest structures, enumerated rather than matched by prefix for
   * the reason the sets above are: a pattern would quietly cover a third one
   * nobody has measured.
   */
  const UNNEST_STRUCTURES = new Set(["unnest(left)", "unnest(full)"]);

  const UNWITNESSABLE: UnwitnessableRule[] = [
    {
      label: "case-needs-t-without-u",
      why:
        "a_case is NULL only on a row where t is present (active TRUE) and u " +
        "is NULL-extended. In these structures no such row exists: t and u " +
        "null-extend jointly ((t INNER u) RIGHT/FULL v), or the u-absent row " +
        "is discarded by a strict join qual referencing u's columns. Sound " +
        "engine conservatism about the CASE branch, unreachable by any data.",
      geometry:
        "the fact is 'no row in these structures has t present and u absent', " +
        "which no single statement exhibits — the witness geometry of a " +
        "structure set is not a query's property. The structure set itself is " +
        "the record, and CASE_DARK_STRUCTURES is enumerated rather than " +
        "matched by pattern for that reason.",
      matches: (axes, column) =>
        axes.projection === "case-nullif" &&
        column === "a_case" &&
        CASE_DARK_STRUCTURES.has(axes.structure),
    },
    {
      label: "srf-refilter-implies-the-function-row-is-present",
      why:
        "the refilter wrappers pin a_tc IS NOT NULL, and under srf-left a_tc " +
        "is g.val — non-null only on a row the table function actually " +
        "returned. So g is present there, and g.email is NOT NULL through the " +
        "body read-back that recovers what SETOF u erased. The LEFT JOIN's " +
        "extension is real and witnessed in every other wrapper; under the " +
        "refilter no surviving row can carry it.",
      matches: (axes, column) =>
        axes.structure === "srf-left" && column === "a_tb" && axes.wrapper.endsWith("refilter"),
    },
    {
      label: "unnest-refilter-implies-the-u-row-is-present",
      why:
        "the same shape as the srf rule above, one branch over. Under the " +
        "unnest structures a_tc is g.p, the composite field carrying u.val, " +
        "and the refilter wrappers pin it IS NOT NULL — so the u row is " +
        "present on every surviving row and its NOT NULL email is too, which " +
        "makes a_tb (g.q) non-null there. The walk calls EVERY unnest field " +
        "nullable whatever the element expression put in it, which is the " +
        "conservatism this structure exists to exercise rather than a claim " +
        "worth recovering: the array element is an arbitrary expression and " +
        "the field's own type carries no flag. Witnessed under every other " +
        "wrapper, where the LEFT/FULL extension is real.",
      matches: (axes, column) =>
        UNNEST_STRUCTURES.has(axes.structure) &&
        column === "a_tb" &&
        axes.wrapper.endsWith("refilter"),
    },
    {
      label: "variadic-body-inlines-to-a-nullif",
      why:
        "gfn_var resolves to a single catalog candidate, so the call takes " +
        "priority 5 — body recursion — and the body is " +
        "`nullif(array_to_string(xs, ','), '')`, nullable by construction. " +
        "VARIADIC costs nothing here: the candidate refusal this rule used to " +
        "blame lives on the consensus branch, which a resolved call never " +
        "enters (measured, and pinned by the blame file). What no data can " +
        "produce is the NULL itself — array_to_string ignores NULL arguments, " +
        "so the nullif fires only when EVERY argument is NULL, and in the " +
        "U_NEVER_ABSENT structures the u side is always present carrying a " +
        "NOT NULL email. Every other structure witnesses it.",
      matches: (axes, column) =>
        axes.projection === "fn-call" && column === "a_fv" && U_NEVER_ABSENT.has(axes.structure),
    },
    {
      label: "merge-source-row-carries-an-unbound-parameter",
      why:
        "not source optionality: with no NOT MATCHED BY SOURCE arm the " +
        "source's joinState is REQUIRED, and the blame file executes that " +
        "(a literal source column reads notNull there). r_snm is nullable " +
        "because it IS `$1`, and no data witnesses it because the source row " +
        "lands in ck.val's NOT NULL constraint — binding NULL raises instead " +
        "of returning a row, which the param suite counts as a rejection and " +
        "the witness channel cannot count as anything.",
      matches: (axes, column) =>
        axes.wrapper.startsWith("merge-") &&
        axes.wrapper !== "merge-bysource" &&
        (column === "r_sid" || column === "r_snm"),
    },
    {
      label: "dml-returning-case-value-dependence",
      why:
        "r_ce is CASE WHEN active THEN 'a' ELSE name END over a row whose " +
        "active was WRITTEN as the literal true, so the ELSE branch never " +
        "runs — but that is the boolean's VALUE, not its nullability, and " +
        "the written-value tracking (Wave 3) deliberately carries only " +
        "non-nullness. The former companion arm of this rule (dml-cte's " +
        "a_cv, a written literal) flipped notNull when the tracking landed.",
      matches: (axes, column) => axes.wrapper === "insert-values" && column === "r_ce",
    },
  ];

  // -------------------------------------------------------------------------
  // Blame files: the reasons above, executable.
  //
  // The gate below this one checks OUTCOMES — a claim is witnessed or a rule
  // covers it. That cannot see a rule whose REASON has expired, because an
  // expired reason leaves the outcome exactly where it was: the claim stays
  // unwitnessed, the rule keeps matching, the suite stays green, and the
  // recorded cause is a description of a world that ended. Three of the eight
  // rules here were in that state when the discipline was introduced (2026-08-22)
  // — two blaming mechanisms the walk had since grown past, one blaming a
  // behaviour measurement showed it never had.
  //
  // So a reason that blames a MECHANISM names one, and the mechanism is
  // pinned by an ordinary annotated fixture: `<label>.blame.sql`, which the
  // hand corpus's own suites run, execute against PGlite and hold to the
  // deparser — no runner of its own. The filename is DERIVED from the label
  // rather than declared, which is why two labels changed above: a label that
  // states a cause has to change when the cause does, and renaming it orphans
  // the old file loudly.
  //
  // A reason that blames the corpus's row GEOMETRY carries `geometry` instead
  // and no file, because no single statement exhibits "these structures
  // produce no such row".
  // -------------------------------------------------------------------------
  it("every unwitnessable reason is executable or declares itself geometric", () => {
    const missing: string[] = [];
    for (const rule of UNWITNESSABLE) {
      if (rule.geometry) continue;
      const file = join(__dirname, "..", "fixtures", `${rule.label}.blame.sql`);
      if (!existsSync(file)) missing.push(`${rule.label} → ${rule.label}.blame.sql`);
    }
    expect(
      missing,
      `Unwitnessable rules blaming a mechanism with no blame file. Write the ` +
        `fixture that pins the mechanism — or, if the reason rests on the ` +
        `corpus's row geometry rather than an engine behaviour, set ` +
        `\`geometry\` and say why no statement isolates it:\n  ${missing.join("\n  ")}\n`,
    ).toEqual([]);

    // The other direction: a blame file nobody blames. A rule that closes
    // takes its reason with it, and a file left behind goes on asserting a
    // mechanism no reason depends on — which reads as coverage and is not.
    const labels = new Set(UNWITNESSABLE.map(r => r.label));
    const orphans = readdirSync(join(__dirname, "..", "fixtures"))
      .filter(f => f.endsWith(".blame.sql"))
      .map(f => f.slice(0, -".blame.sql".length))
      .filter(l => !labels.has(l));
    expect(
      orphans,
      `Blame files no rule names. Delete them with the rule that closed, or ` +
        `restore the rule they belong to:\n  ${orphans.join("\n  ")}\n`,
    ).toEqual([]);
  });

  it("every unwitnessed nullable output claim is witnessed or classified", () => {
    const unclassified: string[] = [];
    const matchedRules = new Set<string>();
    for (const r of records) {
      if (!r.claimed || r.rejection || r.shapeMismatch) continue;
      r.claimed.forEach((claim, i) => {
        if (claim.notNull || r.nullWitnessed[i]) return;
        const rules = UNWITNESSABLE.filter(rule => rule.matches(r.query.axes, claim.name));
        rules.forEach(rule => matchedRules.add(rule.label));
        if (rules.length === 0) {
          unclassified.push(`${r.query.id} column "${claim.name}"`);
        }
      });
    }
    expect(
      unclassified,
      `Nullable claims that no state or binding witnessed with a NULL, and ` +
        `no UNWITNESSABLE rule covers. Each needs a decision: data that ` +
        `reaches the NULL, an engine precision fix, or a new rule with the ` +
        `reason recorded:\n  ${unclassified.slice(0, 40).join("\n  ")}` +
        `${unclassified.length > 40 ? `\n  … +${unclassified.length - 40} more` : ""}\n`,
    ).toEqual([]);

    if (!process.env.GENERATED_ALL_STATES) {
      const stale = UNWITNESSABLE.map(r => r.label).filter(l => !matchedRules.has(l));
      expect(
        stale,
        `UNWITNESSABLE rules that matched no unwitnessed claim — the corpus ` +
          `or engine moved past them; delete or tighten:\n  ${stale.join("\n  ")}`,
      ).toEqual([]);
    }
  });

  it("prints the report", () => {
    const refusals = new Map<string, number>();
    for (const r of records) {
      if (r.refusal) refusals.set(r.refusal, (refusals.get(r.refusal) ?? 0) + 1);
    }
    const count = (f: (r: QueryRecord) => boolean) => records.filter(f).length;
    // A `notNull` claim is falsifiable only if its query returned a row
    // somewhere — "0 violations" over unexposed claims would assert nothing.
    let notNullClaims = 0;
    let falsifiable = 0;
    for (const r of records) {
      const claims = r.claimed?.filter(c => c.notNull).length ?? 0;
      notNullClaims += claims;
      if (r.sawRows) falsifiable += claims;
    }
    console.log(
      `\ngenerated-query soundness over states: ${stateNames.join(", ")}` +
        `${process.env.GENERATED_ALL_STATES ? "" : " (GENERATED_ALL_STATES=1 for all)"}\n` +
        `  queries generated:          ${records.length}\n` +
        `  rejected by PostgreSQL:     ${count(r => r.rejection !== null)}\n` +
        `  refused by the engine:      ${count(r => r.refusal !== null)}` +
        `${refusals.size ? ` (${[...refusals].map(([k, n]) => `${k}×${n}`).join(", ")})` : ""}\n` +
        `  column-list disagreements:  ${count(r => r.shapeMismatch)}\n` +
        `  nullability violations:     ${count(r => r.violations.length > 0)}\n` +
        `  silent deparser drops:      ${count(r => r.drops.length > 0)}\n` +
        `  returned rows somewhere:    ${count(r => r.sawRows)}\n` +
        `  notNull claims:             ${notNullClaims} — ${falsifiable} falsifiable ` +
        `(${notNullClaims ? Math.round((falsifiable / notNullClaims) * 100) : 0}%)\n` +
        `  joint rejection sets:       ${records.reduce((n, r) => n + r.jointEvidence.length, 0)} — ` +
        `${records.reduce((n, r) => n + r.jointEvidence.filter(j => j.witnessed.length > 0).length, 0)} ` +
        `witnessed by the all-members-NULL raise\n` +
        `  presence groups:            ${records.reduce((n, r) => n + r.groupEvidence.length, 0)} — ` +
        `${records.reduce((n, r) => n + r.groupEvidence.filter(g => g.sawAbsent && g.sawPresent).length, 0)} ` +
        `both arms observed, ` +
        `${count(r => r.groupViolations.length > 0)} falsified\n` +
        `  deep-join axis bound:       5 shapes × 4³ kinds, plain projection only ` +
        `(setops/wrappers not crossed)\n` +
        `  widened-axis gates:         refilter wrappers skip tuples without a_tc and all ` +
        `INTERSECT tuples (the pin/match row is NULL by design); union-full-var skips ` +
        `laterals (no FULL form); gm structures skip INTERSECT (matchLiterals encode the ` +
        `t–u row)`,
    );
    const nw = nullableWitnessCounts();
    console.log(
      `  nullable output claims:     ${nw.total} — ${nw.witnessed} witnessed ` +
        `(${nw.total ? Math.round((nw.witnessed / nw.total) * 100) : 0}%)`,
    );

    // WITNESS_REPORT=1: where the unwitnessed claims live, bucketed by the
    // axes that could explain them. The input to triaging each bucket as
    // engine imprecision (the claim can flip to notNull) or a structural
    // property of the shape (an INTERSECT against a fixed literal row pins
    // every column to that row's values, say) — mirroring the fixture
    // suite's WITNESS_REPORT.
    if (process.env.WITNESS_REPORT) {
      const buckets = new Map<
        string,
        { unwitnessed: number; total: number; structures: Set<string> }
      >();
      for (const r of records) {
        if (!r.claimed || r.rejection || r.shapeMismatch) continue;
        r.claimed.forEach((claim, i) => {
          if (claim.notNull) return;
          const key = `proj=${r.query.axes.projection} | col=${claim.name || `#${i}`}`;
          const b = buckets.get(key) ?? { unwitnessed: 0, total: 0, structures: new Set() };
          b.total++;
          if (!r.nullWitnessed[i]) {
            b.unwitnessed++;
            b.structures.add(`${r.query.axes.structure}/${r.query.axes.setop}`);
          }
          buckets.set(key, b);
        });
      }
      const rows = [...buckets.entries()]
        .filter(([, b]) => b.unwitnessed > 0)
        .sort((a, b) => b[1].unwitnessed - a[1].unwitnessed);
      console.log(`\nunwitnessed nullable output claims by bucket (${rows.length} buckets):`);
      for (const [key, b] of rows) {
        // The setop suffix carries no information here — every residue is
        // uniform across none/union/union-all/except (INTERSECT columns are
        // claimed notNull) — so collapse to the structure list.
        const structures = [...new Set([...b.structures].map(s => s.replace(/\/[^/]+$/, "")))];
        console.log(`  ${b.unwitnessed}/${b.total}  ${key}\n      in: ${structures.join(", ")}`);
      }
    }
    const paramed = records.filter(r => r.paramEvidence.length > 0);
    const argClaims = paramed.flatMap(r => r.paramEvidence);
    const argNotNull = argClaims.filter(ev => ev.notNull);
    console.log(
      `  parameterized queries:      ${paramed.length}\n` +
        `  argument claims:            ${argClaims.length} — ` +
        `${argNotNull.length} notNull (${argNotNull.filter(ev => ev.witnessed.length > 0).length} witnessed), ` +
        `${argClaims.length - argNotNull.length} nullable ` +
        `(${argClaims.filter(ev => !ev.notNull && ev.falsified.length > 0).length} falsified)`,
    );
  });
});
