import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { SchemaBuilder } from "../../src/schema-builder.js";

// ---------------------------------------------------------------------------
// %TYPE and %ROWTYPE: signature freeze vs dynamic body resolution
// ---------------------------------------------------------------------------

describe("SchemaBuilder: %TYPE and %ROWTYPE behavior", () => {
  let pg: PGlite;

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
  });
  afterAll(async () => { if (!pg.closed) await pg.close(); });

  it("%TYPE in signature freezes at CREATE time — ALTER doesn't update it", async () => {
    const builder = new SchemaBuilder();

    // Migration 0: create table + function using %TYPE in arg and return.
    const mig0 = Buffer.from(
      "CREATE TABLE public.typefreeze (id int, value text);\n" +
      "CREATE FUNCTION public.echo_value(v public.typefreeze.value%TYPE)\n" +
      "RETURNS public.typefreeze.value%TYPE\n" +
      "LANGUAGE plpgsql AS $$\n" +
      "DECLARE local public.typefreeze.value%TYPE;\n" +
      "BEGIN\n  local := v;\n  RETURN local;\nEND;\n$$;\n",
      "utf8",
    );
    await builder.applyMigration(pg, mig0, 0);

    // Verify signature at CREATE time: should be "text" (resolved from %TYPE).
    const sig0 = await pg.query(`
      SELECT pg_get_function_identity_arguments(p.oid) AS args,
             pg_get_function_result(p.oid) AS result
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'echo_value';
    `);
    expect(sig0.rows[0]!.args).toBe("v text");
    expect(sig0.rows[0]!.result).toBe("text");

    // Migration 1: ALTER the column type.
    const mig1 = Buffer.from(
      "ALTER TABLE public.typefreeze ALTER COLUMN value TYPE varchar(50) USING value::varchar(50);\n",
      "utf8",
    );
    await builder.applyMigration(pg, mig1, 1);

    // Signature should be UNCHANGED — still "text", not "varchar(50)".
    const sig1 = await pg.query(`
      SELECT pg_get_function_identity_arguments(p.oid) AS args,
             pg_get_function_result(p.oid) AS result
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'echo_value';
    `);
    expect(sig1.rows[0]!.args).toBe("v text");
    expect(sig1.rows[0]!.result).toBe("text");

    // plpgsql_check should NOT flag the mismatch — %TYPE in DECLARE resolves
    // dynamically to varchar(50), but text ↔ varchar(50) are assignment-
    // compatible, so no error.
    const diags = await builder.validate(pg);
    const echoDiags = diags.filter(d => d.message.includes("echo_value"));
    expect(echoDiags).toEqual([]);
  });

  it("%TYPE in DECLARE is frozen at CREATE time — ALTER doesn't affect it", async () => {
    // This test documents that %TYPE in DECLARE is resolved at CREATE time
    // and frozen — the variable's type doesn't change when the underlying
    // column's type changes. This was confirmed by spike testing: after
    // ALTER int→text, an int-only operator (r + 1) still works because
    // r is still int. (If r were dynamic/text, r + 1 would fail — text
    // has no + operator with int.)
    //
    // Contrast: %ROWTYPE IS dynamic — see the column-drop test below.
    const builder = new SchemaBuilder();

    // Migration 0: column is int.
    const mig0 = Buffer.from(
      "CREATE TABLE public.dynresolve (id int, amount int);\n" +
      "CREATE FUNCTION public.calc_amount(a public.dynresolve.amount%TYPE)\n" +
      "RETURNS public.dynresolve.amount%TYPE\n" +
      "LANGUAGE plpgsql AS $$\n" +
      "DECLARE r public.dynresolve.amount%TYPE;\n" +
      "BEGIN\n  r := a + 1;\n  RETURN r;\nEND;\n$$;\n",
      "utf8",
    );
    await builder.applyMigration(pg, mig0, 0);

    // Validate — no errors.
    let diags = await builder.validate(pg);
    let myDiags = diags.filter(d => d.message.includes("calc_amount"));
    expect(myDiags).toEqual([]);

    // Migration 1: ALTER amount to text.
    const mig1 = Buffer.from(
      "ALTER TABLE public.dynresolve ALTER COLUMN amount TYPE text USING amount::text;\n",
      "utf8",
    );
    await builder.applyMigration(pg, mig1, 1);

    // Validate — still NO error. r is frozen at int (from CREATE time),
    // so r := a + 1 is int+int=int, assigned to r (int). No mismatch.
    // The column is now text, but r doesn't know that — it's frozen.
    diags = await builder.validate(pg);
    myDiags = diags.filter(d => d.message.includes("calc_amount"));
    expect(myDiags).toEqual([]);
  });

  it("%ROWTYPE is local-only — cannot be used in RETURNS", async () => {
    const builder = new SchemaBuilder();
    // %ROWTYPE in RETURNS is a syntax error.
    const source = Buffer.from(
      "CREATE TABLE public.rowtypetest (a int, b int);\n" +
      "CREATE FUNCTION public.get_row() RETURNS public.rowtypetest%ROWTYPE\n" +
      "LANGUAGE plpgsql AS $$\nBEGIN\n  RETURN NULL;\nEND;\n$$;\n",
      "utf8",
    );
    const result = await builder.applyMigration(pg, source, 0);
    expect(result.success).toBe(false);
    // Parse error — %ROWTYPE is not valid in RETURNS.
    expect(result.diagnostics.length).toBe(1);
  });

  it("%ROWTYPE in DECLARE resolves dynamically — tracks column drops", async () => {
    const builder = new SchemaBuilder();

    // Migration 0: table with columns a, b, c. Function uses %ROWTYPE
    // and references all three columns.
    const mig0 = Buffer.from(
      "CREATE TABLE public.rowdrop (a int, b int, c int);\n" +
      "CREATE FUNCTION public.use_rowtype(a_id int)\n" +
      "RETURNS public.rowdrop\n" +
      "LANGUAGE plpgsql AS $$\n" +
      "DECLARE r public.rowdrop%ROWTYPE;\n" +
      "BEGIN\n" +
      "  SELECT * INTO r FROM public.rowdrop WHERE a = a_id;\n" +
      "  RAISE NOTICE '% % %', r.a, r.b, r.c;\n" +
      "  RETURN r;\n" +
      "END;\n$$;\n",
      "utf8",
    );
    await builder.applyMigration(pg, mig0, 0);

    // Validate — no errors (all columns exist).
    let diags = await builder.validate(pg);
    let myDiags = diags.filter(d => d.message.includes("rowdrop") || d.message.includes("r.c"));
    expect(myDiags).toEqual([]);

    // Migration 1: DROP column c.
    const mig1 = Buffer.from(
      "ALTER TABLE public.rowdrop DROP COLUMN c;\n",
      "utf8",
    );
    await builder.applyMigration(pg, mig1, 1);

    // Validate — plpgsql_check should catch `r.c` referencing a dropped column.
    diags = await builder.validate(pg);
    const cDiags = diags.filter(d =>
      d.message.includes("r.c") || d.message.includes("record \"r\" has no field \"c\""),
    );
    expect(cDiags.length).toBeGreaterThanOrEqual(1);
  });

  it("calling function with stale signature — PG implicit cast handles it", async () => {
    const builder = new SchemaBuilder();

    // Migration 0: column is float8.
    const mig0 = Buffer.from(
      "CREATE TABLE public.stale_sig (id int, amount float8);\n" +
      "CREATE FUNCTION public.process_amount(a public.stale_sig.amount%TYPE)\n" +
      "RETURNS public.stale_sig.amount%TYPE\n" +
      "LANGUAGE plpgsql AS $$\n" +
      "BEGIN\n  RETURN a * 2;\nEND;\n$$;\n",
      "utf8",
    );
    await builder.applyMigration(pg, mig0, 0);

    // Migration 1: ALTER amount to numeric.
    const mig1 = Buffer.from(
      "ALTER TABLE public.stale_sig ALTER COLUMN amount TYPE numeric;\n",
      "utf8",
    );
    await builder.applyMigration(pg, mig1, 1);

    // Signature is frozen: still expects float8.
    const sig = await pg.query(`
      SELECT pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'process_amount';
    `);
    expect(sig.rows[0]!.args).toBe("a double precision");

    // But calling with numeric works — PG implicitly casts numeric→float8.
    const callResult = await pg.query("SELECT public.process_amount(10.5::numeric);");
    expect(Number(callResult.rows[0]!.process_amount)).toBe(21);

    // plpgsql_check reports no error — assignment-compatible types.
    const diags = await builder.validate(pg);
    const myDiags = diags.filter(d => d.message.includes("process_amount"));
    expect(myDiags).toEqual([]);
  });
});
