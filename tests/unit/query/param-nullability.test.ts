import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { catalogCache, withSearchPath } from "./fixture-catalog.js";
import { collectParamNullability } from "../../../src/query/param-nullability.js";
import { inferQueryContract, inferNullability } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";
import { parseFixtureDirectives, type ParamClaim } from "./fixture-args.js";

// ---------------------------------------------------------------------------
// Argument-nullability annotation agreement: the engine's parameter contract
// vs the `-- @param N notNull|nullable` annotations on every fixture that
// takes parameters. See docs/argument-nullability.md.
//
// Same standing as nullability-walk.test.ts on the output side: this proves
// the engine and the fixture author agree, not that either is right. The
// executable check — bind NULL per parameter, require raise ⟺ notNull, both
// directions against PostgreSQL — is the next sequencing step and lands in
// the soundness machinery, not here.
//
// Coverage is compulsory, not opt-in: a fixture containing `$n` with no
// annotation for it fails, the same bar the output side sets by annotating
// every output column. Without that, the parameterized corpus would grow
// while the contract over it stayed unexamined.
// ---------------------------------------------------------------------------

const FIXTURES_DIR = join(__dirname, "fixtures");

const fixtureFiles = readdirSync(FIXTURES_DIR)
  .filter(f => f.endsWith(".sql") && f !== "schema.sql")
  .sort();

interface FixtureParams {
  name: string;
  claims: ParamClaim[];
  rejectClaims: number[][];
  inferred: { number: number; notNull: boolean }[];
  inferredSets: number[][];
  /** `-- @always-raises` present, and what the engine says. */
  alwaysRaisesClaimed: boolean;
  alwaysRaisesInferred: boolean;
}

const results: FixtureParams[] = [];
let catalog: NullabilityCatalog;

describe("argument nullability (engine vs @param annotations)", () => {
  beforeAll(async () => {
    const pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8"));
    const catalogFor = catalogCache(await snapshotCatalog(pg));
    catalog = await catalogFor(null);

    // The evaluator runs LIVE here, the way the output-side fixture harnesses
    // run the statement map: without it the CHECK grounder makes no claims at
    // all ("no evaluator passed → no E claims"), so its fixtures and the
    // write-side partition-bound ones could not be annotated against the
    // engine. Measured before flipping it (2026-08-16): over the 42
    // parameterized fixtures that existed then, evaluator-on and
    // evaluator-off agree on every claim and every rejection set, so this
    // widens what the corpus can hold without moving anything in it.
    for (const file of fixtureFiles) {
      const sql = readFileSync(join(FIXTURES_DIR, file), "utf8");
      const { paramClaims, rejectClaims, alwaysRaises, searchPath } =
        parseFixtureDirectives(sql);
      const stmt = (await parseSql(sql)).stmts?.[0]?.stmt;
      if (!stmt) continue;
      // `-- @search-path`: the contract is read on the fixture's own catalog,
      // with the SESSION held on the same path — the evaluator runs live here.
      const fixtureCatalog = await catalogFor(searchPath);
      const contract = await withSearchPath(pg, searchPath, () =>
        inferQueryContract(stmt, fixtureCatalog, {
          evaluate: async s => (await pg.query<Record<string, unknown>>(s)).rows[0],
        }),
      );
      results.push({
        name: basename(file, ".sql"),
        claims: paramClaims,
        rejectClaims,
        inferred: contract.params,
        inferredSets: contract.paramRejectionSets.map(s => [...s]),
        alwaysRaisesClaimed: alwaysRaises,
        alwaysRaisesInferred: contract.alwaysRaises,
      });
    }
    await pg.close();
  }, 120_000);

  it("every parameter in the corpus is annotated, and no annotation is stale", () => {
    const missing: string[] = [];
    const stale: string[] = [];
    for (const r of results) {
      for (const p of r.inferred) {
        if (!r.claims.some(c => c.number === p.number)) {
          missing.push(`${r.name}: $${p.number}`);
        }
      }
      for (const c of r.claims) {
        if (!r.inferred.some(p => p.number === c.number)) {
          stale.push(`${r.name}: $${c.number}`);
        }
      }
    }
    expect(
      missing,
      `Parameters with no \`-- @param N notNull|nullable\` line. The input ` +
        `contract is part of what a fixture asserts — annotate it:\n  ` +
        missing.join("\n  "),
    ).toEqual([]);
    expect(
      stale,
      `@param annotations for parameters the statement does not contain:\n  ` +
        stale.join("\n  "),
    ).toEqual([]);
  });

  // The statement-level flag carries the same bar as everything else in the
  // contract, both directions: an engine claim nobody annotated is a claim
  // nobody reviewed, and an annotation the engine dropped is stale
  // bookkeeping. Its executable half — the control must actually raise —
  // lives in param-soundness.test.ts.
  it("every always-raises statement is annotated, and no @always-raises is stale", () => {
    const missing = results.filter(r => r.alwaysRaisesInferred && !r.alwaysRaisesClaimed);
    const stale = results.filter(r => r.alwaysRaisesClaimed && !r.alwaysRaisesInferred);
    expect(
      missing.map(r => r.name),
      `Statements the engine flags \`alwaysRaises\` with no \`-- @always-raises\` line`,
    ).toEqual([]);
    expect(
      stale.map(r => r.name),
      `@always-raises annotations the engine does not claim`,
    ).toEqual([]);
  });

  // Joint rejection sets carry the same compulsory-coverage bar as the flat
  // claims, in both directions: an engine-claimed set without its
  // `@param-reject` line means the corpus grew a claim nobody reviewed, and
  // an annotated set the engine no longer claims is stale bookkeeping.
  it("every joint rejection set is annotated, and no @param-reject is stale", () => {
    const key = (s: number[]): string => s.join(",");
    const missing: string[] = [];
    const stale: string[] = [];
    for (const r of results) {
      for (const s of r.inferredSets) {
        if (!r.rejectClaims.some(c => key(c) === key(s))) {
          missing.push(`${r.name}: {${key(s)}}`);
        }
      }
      for (const c of r.rejectClaims) {
        if (!r.inferredSets.some(s => key(s) === key(c))) {
          stale.push(`${r.name}: {${key(c)}}`);
        }
      }
    }
    expect(
      missing,
      `Engine-claimed joint rejection sets with no \`-- @param-reject\` line:\n  ` +
        missing.join("\n  "),
    ).toEqual([]);
    expect(
      stale,
      `@param-reject annotations the engine does not claim:\n  ` + stale.join("\n  "),
    ).toEqual([]);
  });

  for (const file of fixtureFiles) {
    const name = basename(file, ".sql");
    it(name, () => {
      const r = results.find(x => x.name === name);
      if (!r || (r.claims.length === 0 && r.inferred.length === 0)) return;
      const disagreements = r.claims
        .map(c => {
          const p = r.inferred.find(x => x.number === c.number);
          if (!p || p.notNull === c.notNull) return null;
          return (
            `$${c.number}: fixture says ${c.notNull ? "notNull" : "nullable"}, ` +
            `engine says ${p.notNull ? "notNull" : "nullable"}`
          );
        })
        .filter((d): d is string => d !== null);
      expect(disagreements, `\n  ${disagreements.join("\n  ")}\n`).toEqual([]);
    });
  }

  it("inferQueryContract returns both halves from one call", async () => {
    const sql = readFileSync(join(FIXTURES_DIR, "param-multi-use.sql"), "utf8");
    const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
    const contract = await inferQueryContract(stmt, catalog);
    expect(contract.outputs).toEqual(await inferNullability(stmt, catalog));
    expect(contract.params).toEqual(collectParamNullability(stmt, catalog));
    expect(contract.params).toEqual([{ number: 1, notNull: true }]);
  });
});
