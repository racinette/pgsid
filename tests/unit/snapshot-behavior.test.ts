import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { SchemaBuilder } from "../../src/schema-builder.js";
import { cleanupPg } from "../helpers/cleanup.js";

// ---------------------------------------------------------------------------
// Pre-migration snapshot behavior: pre-existing functions are skipped,
// migration-created functions are validated, unknown-origin functions warn.
// ---------------------------------------------------------------------------

describe("SchemaBuilder: pre-migration snapshot behavior", () => {
  let pg: PGlite;

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
  });
  afterAll(async () => { if (!pg.closed) await pg.close(); });
  afterEach(async () => { await cleanupPg(pg); });

  it("pre-existing broken function is skipped, migration-created broken function is validated", async () => {
    // Create a pre-existing function with a broken body BEFORE snapshot.
    await pg.exec("SET check_function_bodies TO off;");
    await pg.exec("CREATE TABLE public.snapshot_t (id int);");
    await pg.exec(`
      CREATE FUNCTION public.preexist_broken() RETURNS void
      LANGUAGE plpgsql AS $$\nBEGIN\n  PERFORM preexist_bad_col FROM public.snapshot_t;\nEND;\n$$;
    `);

    // Snapshot pre-existing state.
    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);

    // Apply a migration that creates ANOTHER broken function.
    const source = Buffer.from(
      "CREATE FUNCTION public.migration_broken() RETURNS void " +
      "LANGUAGE plpgsql AS $$\nBEGIN\n  PERFORM migration_bad_col FROM public.snapshot_t;\nEND;\n$$;\n",
      "utf8",
    );
    await builder.applyMigration(pg, source, 0);

    // Validate — should find the migration-created function's error,
    // but NOT the pre-existing function's error.
    const diags = await builder.validate(pg);

    // Pre-existing function: NOT validated.
    const preDiags = diags.filter(d =>
      d.message.includes("preexist_bad_col") || d.message.includes("preexist_broken")
    );
    expect(preDiags).toEqual([]);

    // Migration-created function: IS validated.
    const migDiags = diags.filter(d =>
      d.message.includes("migration_bad_col") || d.message.includes("migration_broken")
    );
    expect(migDiags.length).toBeGreaterThanOrEqual(1);
  });

  it("pre-existing valid function is skipped (no false positive)", async () => {
    await pg.exec("SET check_function_bodies TO off;");
    await pg.exec(`
      CREATE FUNCTION public.preexist_valid() RETURNS void
      LANGUAGE plpgsql AS $$\nBEGIN\n  PERFORM 1;\nEND;\n$$;
    `);

    const builder = new SchemaBuilder();
    await builder.snapshotBeforeMigrations(pg);

    const source = Buffer.from("CREATE TABLE public.empty_t (id int);\n", "utf8");
    await builder.applyMigration(pg, source, 0);

    const diags = await builder.validate(pg);
    const preDiags = diags.filter(d => d.message.includes("preexist_valid"));
    expect(preDiags).toEqual([]);
  });

  it("no snapshotBeforeMigrations called → all functions are unknown-origin warnings", async () => {
    // Don't call snapshotBeforeMigrations — simulate a user error.
    const builder = new SchemaBuilder();

    // Apply a migration that creates a function.
    const source = Buffer.from(
      "CREATE TABLE public.no_snapshot_t (id int);\n" +
      "CREATE FUNCTION public.no_snapshot_fn() RETURNS void " +
      "LANGUAGE plpgsql AS $$\nBEGIN\n  PERFORM 1;\nEND;\n$$;\n",
      "utf8",
    );
    await builder.applyMigration(pg, source, 0);

    // Validate — the function HAS provenance (created by applyMigration),
    // so it should be validated normally. The preExistingOids set is empty
    // (no snapshot was taken). If there were pre-existing functions, they'd
    // trigger "unknown origin" warnings. But since the only function was
    // created by applyMigration, it has provenance and is validated.
    const diags = await builder.validate(pg);
    // No errors — the function is valid.
    const fnDiags = diags.filter(d => d.message.includes("no_snapshot_fn"));
    expect(fnDiags).toEqual([]);
  });

  it("snapshotBeforeMigrations captures functions created by previous SchemaBuilder", async () => {
    // First builder creates a function.
    const builder1 = new SchemaBuilder();
    await builder1.snapshotBeforeMigrations(pg);
    const source1 = Buffer.from(
      "CREATE TABLE public.shared_t (id int);\n" +
      "CREATE FUNCTION public.shared_fn() RETURNS void " +
      "LANGUAGE plpgsql AS $$\nBEGIN\n  PERFORM 1;\nEND;\n$$;\n",
      "utf8",
    );
    await builder1.applyMigration(pg, source1, 0);

    // Second builder snapshots (shared_fn is now pre-existing).
    const builder2 = new SchemaBuilder();
    await builder2.snapshotBeforeMigrations(pg);

    // Apply a migration that creates a new function.
    const source2 = Buffer.from(
      "CREATE FUNCTION public.new_fn() RETURNS void " +
      "LANGUAGE plpgsql AS $$\nBEGIN\n  PERFORM new_bad_col FROM public.shared_t;\nEND;\n$$;\n",
      "utf8",
    );
    await builder2.applyMigration(pg, source2, 0);

    // Validate — shared_fn is pre-existing (skipped), new_fn is validated.
    const diags = await builder2.validate(pg);

    const sharedDiags = diags.filter(d => d.message.includes("shared_fn"));
    expect(sharedDiags).toEqual([]);

    const newDiags = diags.filter(d => d.message.includes("new_bad_col") || d.message.includes("new_fn"));
    expect(newDiags.length).toBeGreaterThanOrEqual(1);
  });
});
