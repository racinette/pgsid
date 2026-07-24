import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { SchemaBuilder } from "../../src/schema-builder.js";
import { cleanupPg } from "../helpers/cleanup.js";

// ---------------------------------------------------------------------------
// Views and materialized views: PG validates at CREATE time (no deferral).
// Our pipeline catches CREATE-time errors via onStatementApplicationFailed.
// ---------------------------------------------------------------------------

describe("SchemaBuilder: views and materialized views", () => {
  let pg: PGlite;

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
  });
  afterAll(async () => { if (!pg.closed) await pg.close(); });
  afterEach(async () => { await cleanupPg(pg); });

  it("valid view — applies successfully", async () => {
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);
    const source = Buffer.from(
      "CREATE TABLE public.view_t (id int, name text);\n" +
      "CREATE VIEW public.simple_v AS SELECT id, name FROM public.view_t;\n",
      "utf8",
    );
    const result = await builder.applyMigration(pg, source, 0);
    expect(result.success).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it("view referencing non-existent table — fails at apply time", async () => {
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);
    const source = Buffer.from(
      "CREATE VIEW public.bad_v AS SELECT * FROM public.nonexistent_table;\n",
      "utf8",
    );
    const result = await builder.applyMigration(pg, source, 0);
    expect(result.success).toBe(false);
    expect(result.diagnostics.length).toBe(1);
    expect(result.diagnostics[0]!.message).toContain("nonexistent_table");
  });

  it("view referencing non-existent column — fails at apply time", async () => {
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);
    const source = Buffer.from(
      "CREATE TABLE public.view_col_t (id int, name text);\n" +
      "CREATE VIEW public.bad_col_v AS SELECT bad_column FROM public.view_col_t;\n",
      "utf8",
    );
    const result = await builder.applyMigration(pg, source, 0);
    expect(result.success).toBe(false);
    expect(result.diagnostics.length).toBe(1);
    expect(result.diagnostics[0]!.message).toContain("bad_column");
  });

  it("view cannot forward-reference a table created in a later migration", async () => {
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);

    // Migration 0: view references a table that doesn't exist yet.
    const mig0 = Buffer.from(
      "CREATE VIEW public.fwd_ref_v AS SELECT * FROM public.future_view_t;\n",
      "utf8",
    );
    const r0 = await builder.applyMigration(pg, mig0, 0);
    // PG validates views at CREATE time — no deferral possible.
    expect(r0.success).toBe(false);
    expect(r0.diagnostics[0]!.message).toContain("future_view_t");
  });

  it("view referencing a function — function body deferred, view created fine", async () => {
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);
    const source = Buffer.from(
      "CREATE TABLE public.view_fn_t (id int);\n" +
      "CREATE FUNCTION public.view_fn(x int) RETURNS int " +
      "LANGUAGE plpgsql AS $$\nBEGIN\n  PERFORM bad_col_fn FROM public.view_fn_t;\nRETURN x;\nEND;\n$$;\n" +
      // View references the function — PG validates the signature (not the body).
      "CREATE VIEW public.fn_v AS SELECT public.view_fn(id) FROM public.view_fn_t;\n",
      "utf8",
    );
    const result = await builder.applyMigration(pg, source, 0);
    // View creation succeeds — PG checks the function signature, not the body.
    expect(result.success).toBe(true);

    // Validate — the function body error is caught (deferred).
    const diags = await builder.validate(pg);
    const fnDiags = diags.filter(d => d.message.includes("bad_col_fn"));
    expect(fnDiags.length).toBeGreaterThanOrEqual(1);
  });

  it("materialized view — valid, applies successfully", async () => {
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);
    const source = Buffer.from(
      "CREATE TABLE public.mat_t (id int, val text);\n" +
      "CREATE MATERIALIZED VIEW public.mat_v AS SELECT id, val FROM public.mat_t;\n",
      "utf8",
    );
    const result = await builder.applyMigration(pg, source, 0);
    expect(result.success).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it("materialized view referencing non-existent table — fails at apply time", async () => {
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);
    const source = Buffer.from(
      "CREATE MATERIALIZED VIEW public.bad_mat_v AS SELECT * FROM public.no_such_mat_t;\n",
      "utf8",
    );
    const result = await builder.applyMigration(pg, source, 0);
    expect(result.success).toBe(false);
    expect(result.diagnostics[0]!.message).toContain("no_such_mat_t");
  });

  it("DROP TABLE CASCADE drops dependent view — view gone, no diagnostics", async () => {
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);

    const mig0 = Buffer.from(
      "CREATE TABLE public.drop_v_t (id int, name text);\n" +
      "CREATE VIEW public.drop_v AS SELECT id FROM public.drop_v_t;\n",
      "utf8",
    );
    await builder.applyMigration(pg, mig0, 0);

    // Verify the view exists.
    const before = await pg.query<{ viewname: string }>(`
      SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname = 'drop_v';
    `);
    expect(before.rows.length).toBe(1);

    // Drop the table CASCADE — drops the view too.
    const mig1 = Buffer.from("DROP TABLE public.drop_v_t CASCADE;\n", "utf8");
    await builder.applyMigration(pg, mig1, 1);

    // Verify the view is gone.
    const after = await pg.query<{ viewname: string }>(`
      SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname = 'drop_v';
    `);
    expect(after.rows.length).toBe(0);
  });

  it("ALTER TABLE DROP COLUMN CASCADE drops dependent view", async () => {
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);

    const mig0 = Buffer.from(
      "CREATE TABLE public.col_drop_t (id int, name text);\n" +
      "CREATE VIEW public.col_drop_v AS SELECT name FROM public.col_drop_t;\n",
      "utf8",
    );
    await builder.applyMigration(pg, mig0, 0);

    // Drop the column CASCADE — drops the view (which depends on 'name').
    const mig1 = Buffer.from("ALTER TABLE public.col_drop_t DROP COLUMN name CASCADE;\n", "utf8");
    await builder.applyMigration(pg, mig1, 1);

    // Verify the view is gone.
    const after = await pg.query<{ viewname: string }>(`
      SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname = 'col_drop_v';
    `);
    expect(after.rows.length).toBe(0);
  });

  it("ALTER TABLE RENAME COLUMN — view still works (PG resolves by OID, not name)", async () => {
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);

    const mig0 = Buffer.from(
      "CREATE TABLE public.rename_col_t (id int, old_name text);\n" +
      "CREATE VIEW public.rename_v AS SELECT old_name FROM public.rename_col_t;\n",
      "utf8",
    );
    await builder.applyMigration(pg, mig0, 0);

    // Rename the column — PG updates the view's internal dependencies.
    const mig1 = Buffer.from(
      "ALTER TABLE public.rename_col_t RENAME COLUMN old_name TO new_name;\n",
      "utf8",
    );
    await builder.applyMigration(pg, mig1, 1);

    // The view should still be queryable (PG resolves by OID, not by name).
    // The stored definition text in pg_views.definition may still show the
    // old name — that's a display artifact, not a functional issue.
    const result = await pg.query("SELECT * FROM public.rename_v LIMIT 0;");
    expect(result.rows).toEqual([]);

    // Verify the view's columns are still accessible.
    const cols = await pg.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'rename_v';
    `);
    expect(cols.rows.length).toBe(1);
  });

  it("view with SELECT * — column list frozen at CREATE time", async () => {
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);

    const mig0 = Buffer.from(
      "CREATE TABLE public.star_t (a int, b text);\n" +
      "CREATE VIEW public.star_v AS SELECT * FROM public.star_t;\n",
      "utf8",
    );
    await builder.applyMigration(pg, mig0, 0);

    // Add a column to the table — the view should NOT pick it up.
    const mig1 = Buffer.from("ALTER TABLE public.star_t ADD COLUMN c int;\n", "utf8");
    await builder.applyMigration(pg, mig1, 1);

    // Verify the view still has only 2 columns (a, b).
    const cols = await pg.query<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'star_v'
      ORDER BY column_name;
    `);
    expect(cols.rows.map(r => r.column_name)).toEqual(["a", "b"]);
  });
});
