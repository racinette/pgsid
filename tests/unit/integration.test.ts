import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { SchemaBuilder } from "../../src/schema-builder.js";
import type { SqlDiagnostic } from "../../src/errors.js";

const migrationDir = fileURLToPath(
  new URL("../fixtures/migrations", import.meta.url),
);

function loadMigration(name: string): Buffer {
  return readFileSync(join(migrationDir, name));
}

type ApplyResult = { success: boolean; diagnostics: SqlDiagnostic[] };

describe("integration: sequential migration apply + deferred validation", () => {
  let pg: PGlite;
  let builder: SchemaBuilder;
  let migrationIndex = 0;

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    builder = new SchemaBuilder();
  });

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  // -------------------------------------------------------------------------
  // Sequential apply: 0001 → 0002 → 0003 (all succeed, schema advances)
  // -------------------------------------------------------------------------

  it("0001: applies initial schema (tables, FKs, indexes, seed data)", async () => {
    const source = loadMigration("0001_initial_schema.sql");
    const result = await builder.applyMigration(pg, source, migrationIndex++);
    expect(result.success).toBe(true);
    expect(result.diagnostics).toEqual([]);

    const tables = await pg.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
    `);
    const tableNames = tables.rows.map(r => r.tablename);
    expect(tableNames).toContain("users");
    expect(tableNames).toContain("posts");

    const seed = await pg.query<{ email: string }>(`
      SELECT email FROM public.users WHERE id = 0;
    `);
    expect(seed.rows[0]!.email).toBe("system@local");

    const fks = await pg.query<{ conname: string }>(`
      SELECT conname FROM pg_constraint WHERE conname = 'posts_user_id_fk';
    `);
    expect(fks.rows[0]!.conname).toBe("posts_user_id_fk");
  });

  it("0002: applies functions on top of 0001 schema", async () => {
    const source = loadMigration("0002_add_functions.sql");
    const result = await builder.applyMigration(pg, source, migrationIndex++);
    expect(result.success).toBe(true);
    expect(result.diagnostics).toEqual([]);

    const funcs = await pg.query<{ proname: string }>(`
      SELECT proname FROM pg_proc
      WHERE proname IN ('publish_post', 'get_user_email', 'count_user_posts')
      ORDER BY proname;
    `);
    expect(funcs.rows.map(r => r.proname)).toEqual([
      "count_user_posts", "get_user_email", "publish_post",
    ]);
  });

  it("0003: applies CONCURRENTLY indexes (stripped to in-txn)", async () => {
    const source = loadMigration("0003_add_concurrently_index.sql");
    const result = await builder.applyMigration(pg, source, migrationIndex++);
    expect(result.success).toBe(true);
    expect(result.diagnostics).toEqual([]);

    const indexes = await pg.query<{ indexname: string }>(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'posts'
      ORDER BY indexname;
    `);
    const indexNames = indexes.rows.map(r => r.indexname);
    expect(indexNames).toContain("posts_tags_gin");
    expect(indexNames).toContain("posts_user_published_idx");
  });

  // -------------------------------------------------------------------------
  // 0004: broken DDL — fails during apply (exec error, halts + rolls back)
  // -------------------------------------------------------------------------

  describe("0004: broken DDL migration", () => {
    let result: ApplyResult;

    beforeAll(async () => {
      const source = loadMigration("0004_broken_migration.sql");
      result = await builder.applyMigration(pg, source, migrationIndex++);
    });

    it("returns failure with one diagnostic", () => {
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
    });

    it("diagnostic is from PGlite (exec error)", () => {
      expect(result.diagnostics[0]!.original.source).toBe("pglite");
    });

    it("diagnostic has the right SQLSTATE and message", () => {
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42703");
      expect(d.message).toContain("publishd_at");
    });

    it("diagnostic position points at the typo in the file", () => {
      const d = result.diagnostics[0]!;
      expect(d.range).not.toBeNull();
      const source = loadMigration("0004_broken_migration.sql");
      const textAtPos = source.toString("utf8").slice(
        d.range!.start, d.range!.start + "publishd_at".length,
      );
      expect(textAtPos).toBe("publishd_at");
    });

    it("schema state is unchanged (0003 indexes still present)", async () => {
      const indexes = await pg.query<{ indexname: string }>(`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'posts_tags_gin';
      `);
      expect(indexes.rows.length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // 0005: broken PL/pgSQL — now APPLIES (check_function_bodies=off),
  // deferred validation catches the error.
  // -------------------------------------------------------------------------

  describe("0005: broken PL/pgSQL function migration", () => {
    let applyResult: ApplyResult;

    beforeAll(async () => {
      const source = loadMigration("0005_broken_plpgsql.sql");
      applyResult = await builder.applyMigration(pg, source, migrationIndex++);
    });

    it("applies successfully (body not validated during apply)", () => {
      expect(applyResult.success).toBe(true);
      expect(applyResult.diagnostics).toEqual([]);
    });

    it("schema state IS changed (audit_log table created)", async () => {
      const tables = await pg.query<{ tablename: string }>(`
        SELECT tablename FROM pg_tables WHERE tablename = 'audit_log';
      `);
      expect(tables.rows.length).toBe(1);
    });

    // Deferred validation: validate() catches the broken function body.
    describe("deferred validation", () => {
      let validateDiags: SqlDiagnostic[];

      beforeAll(async () => {
        validateDiags = await builder.validate(pg);
      });

      it("reports one diagnostic for the broken function", () => {
        const fnDiags = validateDiags.filter(d =>
          d.message.includes("nonexistent_field"),
        );
        expect(fnDiags.length).toBe(1);
      });

      it("diagnostic is from plpgsql-check", () => {
        const d = validateDiags.find(d => d.message.includes("nonexistent_field"))!;
        expect(d.original.source).toBe("plpgsql-check");
      });

      it("diagnostic has the right SQLSTATE and message", () => {
        const d = validateDiags.find(d => d.message.includes("nonexistent_field"))!;
        expect(d.code).toBe("42703");
        expect(d.message).toContain("nonexistent_field");
      });

      it("diagnostic range points into the migration file", () => {
        const d = validateDiags.find(d => d.message.includes("nonexistent_field"))!;
        expect(d.range).not.toBeNull();
        const source = loadMigration("0005_broken_plpgsql.sql");
        const textAtRange = source.toString("utf8").slice(
          d.range!.start, d.range!.end,
        );
        expect(textAtRange).toContain("nonexistent_field");
      });

      it("diagnostic carries the plpgsql_check row", () => {
        const d = validateDiags.find(d => d.message.includes("nonexistent_field"))!;
        if (d.original.source === "plpgsql-check") {
          expect(d.original.row.statement).toBeTruthy();
          expect(d.original.row.context).toContain("nonexistent_field");
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // 0006: procedures (plpgsql, plpgsql with OUT arg, LANGUAGE sql)
  // -------------------------------------------------------------------------

  describe("0006: applies procedures on top of 0005 schema", () => {
    let result: ApplyResult;

    beforeAll(async () => {
      const source = loadMigration("0006_add_procedures.sql");
      result = await builder.applyMigration(pg, source, migrationIndex++);
    });

    it("succeeds with no diagnostics", () => {
      if (!result.success) console.log(JSON.stringify(result.diagnostics, null, 2));
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });

    it("creates all three procedures", async () => {
      const procs = await pg.query<{ proname: string }>(`
        SELECT proname FROM pg_proc
        WHERE proname IN ('publish_user_posts', 'count_user_drafts', 'seed_system_post')
        ORDER BY proname;
      `);
      expect(procs.rows.map(r => r.proname)).toEqual([
        "count_user_drafts", "publish_user_posts", "seed_system_post",
      ]);
    });

    it("seed_system_post (LANGUAGE sql) actually executes", async () => {
      const before = await pg.query<{ c: string }>(
        "SELECT count(*)::text AS c FROM public.posts WHERE user_id = 0;",
      );
      const n0 = Number(before.rows[0]!.c);

      await pg.query("CALL public.seed_system_post();");

      const after = await pg.query<{ c: string }>(
        "SELECT count(*)::text AS c FROM public.posts WHERE user_id = 0;",
      );
      expect(Number(after.rows[0]!.c)).toBe(n0 + 1);
    });

    it("count_user_drafts (OUT arg via plpgsql) returns the draft count", async () => {
      const res = await pg.query<{ n: number }>(
        "CALL public.count_user_drafts(0, NULL);",
      );
      expect(Number(res.rows[0]!.n)).toBeGreaterThanOrEqual(1);
    });

    it("publish_user_posts (plpgsql) publishes the drafts", async () => {
      await pg.query("CALL public.publish_user_posts(0);");
      const drafts = await pg.query<{ c: string }>(`
        SELECT count(*)::text AS c FROM public.posts
        WHERE user_id = 0 AND published_at IS NULL;
      `);
      expect(Number(drafts.rows[0]!.c)).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Full validation after all migrations
  // -------------------------------------------------------------------------

  describe("full validation after all migrations", () => {
    it("reports only the 0005 broken function", async () => {
      const diags = await builder.validate(pg);
      const brokenDiags = diags.filter(d =>
        d.message.includes("nonexistent_field"),
      );
      expect(brokenDiags.length).toBe(1);
      // All other functions are valid.
      expect(diags.length).toBe(brokenDiags.length);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe("edge cases", () => {
    it("empty migration succeeds with no diagnostics", async () => {
      const b = new SchemaBuilder();
      const result = await b.applyMigration(pg, Buffer.from("", "utf8"), 0);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });

    it("migration with only comments succeeds", async () => {
      const b = new SchemaBuilder();
      const result = await b.applyMigration(pg, Buffer.from(
        "-- just a comment\n-- another comment\n", "utf8",
      ), 0);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });

    it("migration with a parse error returns a libpg-query diagnostic", async () => {
      const b = new SchemaBuilder();
      const source = Buffer.from("CREATE TABLE t (id int PRIMARY KY);\n", "utf8");
      const result = await b.applyMigration(pg, source, 0);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.original.source).toBe("libpg-query");
      expect(d.message).toContain('"KY"');
      expect(d.range).not.toBeNull();
      expect(source.toString("utf8").slice(d.range!.start, d.range!.start + 2)).toBe("KY");
    });

    it("a valid migration after a failed one still works", async () => {
      const b = new SchemaBuilder();
      const source = Buffer.from("CREATE TABLE public.temp_test (id int);\n", "utf8");
      const result = await b.applyMigration(pg, source, 0);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
      await pg.exec("DROP TABLE public.temp_test;");
    });
  });
});
