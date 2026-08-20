import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { catalogCache, withSearchPath, type CatalogFor } from "./fixture-catalog.js";
import {
  inferNullability,
  inferNullabilityTraced,
  inferPresenceGroups,
} from "../../../src/query/nullability-walk.js";
import { formatColumnTrace } from "../../../src/query/trace-printer.js";
import { parseFixtureDirectives } from "./fixture-args.js";

// ---------------------------------------------------------------------------
// Test driver:
//   1. Starts PGlite, applies the base schema.sql migration, snapshots the
//      catalog, and builds a NullabilityCatalog from the snapshot.
//   2. For each fixture .sql file: parses the SQL, runs inferNullability with
//      the shared catalog, and asserts each output column matches its
//      inline `-- @notNull` / `-- @nullable` annotation.
//
// Fixtures are pure SQL + annotations — no mock catalog JSON needed.
//
// Tracing: set the TRACE_NULLABILITY environment variable to dump the full
// decision tree for every output column. Filter by test name with vitest's
// -t flag:
//
//   TRACE_NULLABILITY=1 pnpm vitest run tests/unit/query/nullability-walk.test.ts -t extreme-activity-feed
// ---------------------------------------------------------------------------

const TRACE = !!process.env.TRACE_NULLABILITY;

const FIXTURES_DIR = join(__dirname, "fixtures");
const SCHEMA_SQL = readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8");

// Collect fixture files (excludes schema.sql).
const fixtureFiles = readdirSync(FIXTURES_DIR)
  .filter(f => f.endsWith(".sql") && f !== "schema.sql")
  .sort();

// ---------------------------------------------------------------------------
// Parse fixture: extract expected annotations from `-- notNull` / `-- nullable`
// ---------------------------------------------------------------------------

function parseFixture(content: string): { sql: string; expectations: boolean[] } {
  const expectations: boolean[] = [];
  // Annotations use `@notNull` / `@nullable` markers to avoid collision
  // with descriptive comment text. The marker must appear after a `--`
  // comment prefix, optionally with leading whitespace.
  const notNullRe = /--\s*@notNull\b/;
  const nullableRe = /--\s*@nullable\b/;
  for (const line of content.split("\n")) {
    if (notNullRe.test(line)) {
      expectations.push(true);
    } else if (nullableRe.test(line)) {
      expectations.push(false);
    }
  }
  return { sql: content, expectations };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("nullability-walk", () => {
  let pg: PGlite;
  let catalogFor: CatalogFor;

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(SCHEMA_SQL);
    const snapshot = await snapshotCatalog(pg);
    catalogFor = catalogCache(snapshot);
  });

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  for (const file of fixtureFiles) {
    const testName = basename(file, ".sql");
    const filePath = join(FIXTURES_DIR, file);

    it(testName, async () => {
      const content = readFileSync(filePath, "utf8");
      const { sql, expectations } = parseFixture(content);
      // `-- @search-path` (fixture-args.ts): the catalog is built on the
      // fixture's own path, and the SESSION is put on it too — the statement
      // map executes closed subtrees, and those must resolve names the way
      // the analysis assumed.
      const { searchPath, nullGroupClaims } = parseFixtureDirectives(content);
      const catalog = await catalogFor(searchPath);

      const parsed = await parseSql(sql);
      expect(parsed.stmts?.length ?? 0).toBeGreaterThan(0);

      const stmt = parsed.stmts![0]!.stmt!;

      // The statement map runs live (docs/subtree-evaluation.md, consumer 1):
      // fixture claims pin the walk WITH its chartered consumers, and the
      // censuses keep exercising the symbolic paths evaluate short-circuits.
      const evaluate = async (s: string) =>
        (await pg.query<Record<string, unknown>>(s)).rows[0];

      // Everything below runs under the fixture's path, so an evaluated
      // subtree resolves names exactly as the claim assumed.
      return withSearchPath(pg, searchPath, async () => {

      if (TRACE) {
        const traced = await inferNullabilityTraced(stmt, catalog, undefined, { evaluate });
        expect(traced.length).toBe(expectations.length);
        const traces: string[] = [];
        for (let i = 0; i < expectations.length; i++) {
          const expected = expectations[i]!;
          const r = traced[i];
          const actual = r?.notNull ?? false;
          if (actual !== expected) {
            // Print trace on mismatch before failing
            console.log(formatColumnTrace(r?.name ?? "?", actual, r?.trace));
          }
          expect(
            actual,
            `Column ${i} (${r?.name ?? "?"}): expected ${expected ? "notNull" : "nullable"}, got ${actual ? "notNull" : "nullable"}\n${r?.trace ? formatColumnTrace(r.name ?? "?", actual, r.trace) : ""}`,
          ).toBe(expected);
        }
        // When tracing is on, always print all traces
        for (const r of traced) {
          traces.push(formatColumnTrace(r.name ?? "?", r.notNull, r.trace));
        }
        console.log(`\n${"═".repeat(70)}`);
        console.log(`Fixture: ${testName} (${traced.length} columns)`);
        console.log(`${"═".repeat(70)}`);
        for (const t of traces) console.log(t);
      } else {
        const results = await inferNullability(stmt, catalog, { evaluate });
        expect(results.length).toBe(expectations.length);
        for (let i = 0; i < expectations.length; i++) {
          const expected = expectations[i]!;
          const actual = results[i]?.notNull ?? false;
          expect(
            actual,
            `Column ${i} (${results[i]?.name ?? "?"}): expected ${expected ? "notNull" : "nullable"}, got ${actual ? "notNull" : "nullable"}`,
          ).toBe(expected);
        }
      }

      // Presence groups: compulsory bidirectional coverage, mirroring
      // @param-reject's. An engine-claimed group with no @null-group line is
      // an undocumented claim ("you improved — annotate it"); an annotated
      // group the engine no longer claims is stale and must come off.
      // Discriminant sets must match exactly — they are half the claim.
      const groups = inferPresenceGroups(stmt, catalog);
      const render = (g: { columns: number[]; discriminants: number[] }) =>
        g.columns.map(c => (g.discriminants.includes(c) ? `${c}*` : `${c}`)).join(",");
      const claimed = new Set(nullGroupClaims.map(render));
      const derived = new Set(groups.map(render));
      for (const g of groups) {
        expect(
          claimed.has(render(g)),
          `engine claims presence group {${render(g)}} with no @null-group annotation — ` +
            `add \`-- @null-group ${render(g)}\` (and witness it) or explain its absence`,
        ).toBe(true);
      }
      for (const g of nullGroupClaims) {
        expect(
          derived.has(render(g)),
          `stale @null-group {${render(g)}}: the engine no longer claims it`,
        ).toBe(true);
        // A group member has an absent arm, so its flat claim is nullable —
        // the two annotation layers must not drift.
        for (const member of g.columns) {
          expect(
            expectations[member],
            `@null-group member ${member} must carry a per-column @nullable marker`,
          ).toBe(false);
        }
      }
      });
    });
  }

  if (fixtureFiles.length === 0) {
    it("no fixtures found", () => {
      expect(fixtureFiles.length).toBe(0);
    });
  }
});
