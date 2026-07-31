import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
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
  inferred: { number: number; notNull: boolean }[];
}

const results: FixtureParams[] = [];
let catalog: NullabilityCatalog;

describe("argument nullability (engine vs @param annotations)", () => {
  beforeAll(async () => {
    const pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8"));
    catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
    await pg.close();

    for (const file of fixtureFiles) {
      const sql = readFileSync(join(FIXTURES_DIR, file), "utf8");
      const { paramClaims } = parseFixtureDirectives(sql);
      const stmt = (await parseSql(sql)).stmts?.[0]?.stmt;
      if (!stmt) continue;
      results.push({
        name: basename(file, ".sql"),
        claims: paramClaims,
        inferred: collectParamNullability(stmt, catalog),
      });
    }
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
    const contract = inferQueryContract(stmt, catalog);
    expect(contract.outputs).toEqual(inferNullability(stmt, catalog));
    expect(contract.params).toEqual(collectParamNullability(stmt, catalog));
    expect(contract.params).toEqual([{ number: 1, notNull: true }]);
  });
});
