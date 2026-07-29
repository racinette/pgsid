import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// Test driver:
//   1. Starts PGlite, applies the base schema.sql migration, snapshots the
//      catalog, and builds a NullabilityCatalog from the snapshot.
//   2. For each fixture .sql file: parses the SQL, runs inferNullability with
//      the shared catalog, and asserts each output column matches its
//      inline `-- notNull` / `-- nullable` annotation.
//
// Fixtures are pure SQL + annotations — no mock catalog JSON needed.
// ---------------------------------------------------------------------------

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
  let catalog: NullabilityCatalog;

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(SCHEMA_SQL);
    const snapshot = await snapshotCatalog(pg);
    catalog = await buildNullabilityCatalog(snapshot);
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

      const parsed = await parseSql(sql);
      expect(parsed.stmts?.length ?? 0).toBeGreaterThan(0);

      const stmt = parsed.stmts![0]!.stmt!;
      const results = inferNullability(stmt, catalog);

      expect(results.length).toBe(expectations.length);

      for (let i = 0; i < expectations.length; i++) {
        const expected = expectations[i]!;
        const actual = results[i]?.notNull ?? false;
        expect(
          actual,
          `Column ${i} (${results[i]?.name ?? "?"}): expected ${expected ? "notNull" : "nullable"}, got ${actual ? "notNull" : "nullable"}`,
        ).toBe(expected);
      }
    });
  }

  if (fixtureFiles.length === 0) {
    it("no fixtures found", () => {
      expect(fixtureFiles.length).toBe(0);
    });
  }
});
