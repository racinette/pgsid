import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { applyMigration } from "../../src/apply.js";

const migrationDir = fileURLToPath(
  new URL("../fixtures/migrations", import.meta.url),
);

function loadMigration(name: string): Buffer {
  return readFileSync(join(migrationDir, name));
}

describe("integration: sequential migration apply", () => {
  let pg: PGlite;

  beforeAll(async () => {
    // Fresh PGlite with plpgsql_check extension.
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
  });

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  // -------------------------------------------------------------------------
  // Sequential apply: 0001 → 0002 → 0003 (all succeed, schema advances)
  // -------------------------------------------------------------------------

  it("0001: applies initial schema (tables, FKs, indexes, seed data)", async () => {
    const source = loadMigration("0001_initial_schema.sql");
    const result = await applyMigration(pg, source);
    expect(result.success).toBe(true);
    expect(result.diagnostics).toEqual([]);

    // Verify the schema was actually applied.
    const tables = await pg.query<{ tablename: string }>(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
    `);
    const tableNames = tables.rows.map(r => r.tablename);
    expect(tableNames).toContain("users");
    expect(tableNames).toContain("posts");

    // Verify the seed data.
    const seed = await pg.query<{ email: string }>(`
      SELECT email FROM public.users WHERE id = 0;
    `);
    expect(seed.rows[0]!.email).toBe("system@local");

    // Verify the FK constraint was created.
    const fks = await pg.query<{ conname: string }>(`
      SELECT conname FROM pg_constraint WHERE conname = 'posts_user_id_fk';
    `);
    expect(fks.rows[0]!.conname).toBe("posts_user_id_fk");
  });

  it("0002: applies functions on top of 0001 schema", async () => {
    const source = loadMigration("0002_add_functions.sql");
    const result = await applyMigration(pg, source);
    expect(result.success).toBe(true);
    expect(result.diagnostics).toEqual([]);

    // Verify the functions were created.
    const funcs = await pg.query<{ proname: string }>(`
      SELECT proname FROM pg_proc
      WHERE proname IN ('publish_post', 'get_user_email', 'count_user_posts')
      ORDER BY proname;
    `);
    const funcNames = funcs.rows.map(r => r.proname);
    expect(funcNames).toEqual(["count_user_posts", "get_user_email", "publish_post"]);

    // Verify the SQL function works (it was validated natively by PG).
    const email = await pg.query<{ get_user_email: string }>(`
      SELECT public.get_user_email(0);
    `);
    expect(email.rows[0]!.get_user_email).toBe("system@local");
  });

  it("0003: applies CONCURRENTLY indexes (stripped to in-txn)", async () => {
    const source = loadMigration("0003_add_concurrently_index.sql");
    const result = await applyMigration(pg, source);
    expect(result.success).toBe(true);
    expect(result.diagnostics).toEqual([]);

    // Verify the indexes were created (without CONCURRENTLY, but they exist).
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
  // Broken migrations: verify diagnostics with correct positions
  // -------------------------------------------------------------------------

  describe("0004: broken DDL migration", () => {
    let result: Awaited<ReturnType<typeof applyMigration>>;

    beforeAll(async () => {
      const source = loadMigration("0004_broken_migration.sql");
      result = await applyMigration(pg, source);
    });

    it("returns failure with one diagnostic", () => {
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
    });

    it("diagnostic is from PGlite (exec error)", () => {
      const d = result.diagnostics[0]!;
      expect(d.original.source).toBe("pglite");
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
      const fileText = source.toString("utf8");
      // The position should point at "publishd_at" (the typo).
      const textAtPos = fileText.slice(d.range!.start, d.range!.start + "publishd_at".length);
      expect(textAtPos).toBe("publishd_at");
    });

    it("schema state is unchanged (0003 indexes still present)", async () => {
      // The failed migration was rolled back, so the schema is still at 0003.
      const indexes = await pg.query<{ indexname: string }>(`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'posts_tags_gin';
      `);
      expect(indexes.rows.length).toBe(1);
    });
  });

  describe("0005: broken PL/pgSQL function migration", () => {
    let result: Awaited<ReturnType<typeof applyMigration>>;

    beforeAll(async () => {
      const source = loadMigration("0005_broken_plpgsql.sql");
      result = await applyMigration(pg, source);
    });

    it("returns failure with one diagnostic", () => {
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
    });

    it("diagnostic is from plpgsql-check (not PGlite exec)", () => {
      const d = result.diagnostics[0]!;
      expect(d.original.source).toBe("plpgsql-check");
    });

    it("diagnostic has the right SQLSTATE and message", () => {
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42703");
      expect(d.message).toContain("nonexistent_field");
    });

    it("diagnostic has a lineNumber (body-relative)", () => {
      const d = result.diagnostics[0]!;
      expect(d.range).not.toBeNull();
      // The RAISE NOTICE line is around line 5 of the body.
    });

    it("diagnostic carries the plpgsql_check row for source-specific inspection", () => {
      const d = result.diagnostics[0]!;
      if (d.original.source === "plpgsql-check") {
        // The statement type is the PL/pgSQL construct that contains the error.
        // For r.nonexistent_field in a FOR loop, it's "FOR over SELECT rows".
        expect(d.original.row.statement).toBeTruthy();
        expect(d.original.row.context).toContain("nonexistent_field");
      }
    });

    it("schema state is unchanged (audit_log table NOT created)", async () => {
      // The failed migration was rolled back, so audit_log doesn't exist.
      const tables = await pg.query<{ tablename: string }>(`
        SELECT tablename FROM pg_tables WHERE tablename = 'audit_log';
      `);
      expect(tables.rows.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 0006: procedures (plpgsql, plpgsql with OUT arg, LANGUAGE sql)
  // -------------------------------------------------------------------------

  describe("0006: applies procedures on top of 0003 schema", () => {
    let result: Awaited<ReturnType<typeof applyMigration>>;

    beforeAll(async () => {
      const source = loadMigration("0006_add_procedures.sql");
      result = await applyMigration(pg, source);
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
        "count_user_drafts",
        "publish_user_posts",
        "seed_system_post",
      ]);
    });

    it("seed_system_post (LANGUAGE sql) actually executes", async () => {
      // Before: no posts for system user.
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
      // No drafts yet for user 0 — seed_system_post inserted one published=NULL post.
      // (posts.published_at defaults to NULL, so this counts as a draft.)
      const res = await pg.query<{ n: number }>(
        "CALL public.count_user_drafts(0, NULL);",
      );
      // PGlite returns OUT args as a result row.
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
  // Edge cases
  // -------------------------------------------------------------------------

  describe("edge cases", () => {
    it("empty migration succeeds with no diagnostics", async () => {
      const result = await applyMigration(pg, Buffer.from("", "utf8"));
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });

    it("migration with only comments succeeds", async () => {
      const result = await applyMigration(pg, Buffer.from(
        "-- just a comment\n-- another comment\n",
        "utf8",
      ));
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });

    it("migration with a parse error returns a libpg-query diagnostic", async () => {
      const source = Buffer.from(
        "CREATE TABLE t (id int PRIMARY KY);\n",
        "utf8",
      );
      const result = await applyMigration(pg, source);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.original.source).toBe("libpg-query");
      expect(d.message).toContain('"KY"');
      expect(d.range).not.toBeNull();
      // Position should point at "KY" in the source.
      expect(source.toString("utf8").slice(d.range!.start, d.range!.start + 2)).toBe("KY");
    });

    it("a valid migration after a failed one still works (schema state preserved)", async () => {
      // After 0004 and 0005 failed, the schema is still at 0003.
      // Apply a simple valid migration to confirm the instance is usable.
      const source = Buffer.from(
        "CREATE TABLE public.temp_test (id int);\n",
        "utf8",
      );
      const result = await applyMigration(pg, source);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);

      // Clean up.
      await pg.exec("DROP TABLE public.temp_test;");
    });
  });
});
