import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { SchemaBuilder } from "../../src/schema-builder.js";
import type { SqlDiagnostic } from "../../src/errors.js";

type ApplyResult = { success: boolean; diagnostics: SqlDiagnostic[] };

describe("apply: migration pipeline", () => {
  let pg: PGlite;

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
  });

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  /**
   * Apply a migration via SchemaBuilder, run deferred validation, clean up.
   * Returns both apply and validate diagnostics.
   */
  async function applyAndValidate(sql: string) {
    const builder = new SchemaBuilder();
    const source = Buffer.from(sql, "utf8");
    const result = await builder.applyMigration(pg, source, 0);
    const validateDiags: SqlDiagnostic[] = result.success
      ? await builder.validate(pg)
      : [];
    try { await pg.exec("DROP SCHEMA IF EXISTS test_apply CASCADE;"); } catch { /* ignore */ }
    return { result, validateDiags };
  }

  // -------------------------------------------------------------------------
  // Success cases
  // -------------------------------------------------------------------------

  describe("success cases", () => {
    it("applies a simple CREATE TABLE", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
      `);
      expect(result.success).toBe(true);
      expect(validateDiags).toEqual([]);
    });

    it("applies multiple DDL statements in order", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t1 (id int PRIMARY KEY);
        CREATE TABLE test_apply.t2 (id int REFERENCES test_apply.t1(id));
      `);
      expect(result.success).toBe(true);
      expect(validateDiags).toEqual([]);
    });

    it("applies DML (INSERT) alongside DDL", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        INSERT INTO test_apply.t VALUES (1), (2), (3);
      `);
      expect(result.success).toBe(true);
      expect(validateDiags).toEqual([]);
    });

    it("applies a CREATE INDEX CONCURRENTLY (stripped to in-txn)", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        CREATE INDEX CONCURRENTLY idx_concurrent ON test_apply.t (id);
      `);
      expect(result.success).toBe(true);
      expect(validateDiags).toEqual([]);
    });

    it("applies a valid PL/pgSQL function (validate passes)", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        CREATE FUNCTION test_apply.fn(x int) RETURNS int
        LANGUAGE plpgsql AS $$
        BEGIN
          RETURN x + 1;
        END;
        $$;
      `);
      expect(result.success).toBe(true);
      expect(validateDiags).toEqual([]);
    });

    it("applies a valid LANGUAGE sql function (validate passes)", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        CREATE FUNCTION test_apply.fn(x int) RETURNS int
        LANGUAGE sql AS $$
          SELECT x + 1;
        $$;
      `);
      expect(result.success).toBe(true);
      expect(validateDiags).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // DDL/DML failures (still halt during apply — exec error)
  // -------------------------------------------------------------------------

  describe("DDL/DML failures", () => {
    it("reports a syntax error from libpg-query (parse failure)", async () => {
      const { result } = await applyAndValidate("CREATE TABLE t (id int PRIMARY KY);");
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.original.source).toBe("libpg-query");
      expect(result.diagnostics[0]!.message).toContain('"KY"');
    });

    it("reports an undefined-column error with position (PGlite exec)", async () => {
      const sql = "CREATE SCHEMA test_apply;\nCREATE TABLE test_apply.t (id int);\nINSERT INTO test_apply.t (badcol) VALUES (1);\n";
      const builder = new SchemaBuilder();
      const result = await builder.applyMigration(pg, Buffer.from(sql, "utf8"), 0);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.code).toBe("42703");
      expect(result.diagnostics[0]!.message).toContain("badcol");
      expect(result.diagnostics[0]!.range).not.toBeNull();
      const source = Buffer.from(sql, "utf8");
      const textAtRange = source.subarray(
        result.diagnostics[0]!.range!.start,
        result.diagnostics[0]!.range!.end,
      ).toString("utf8");
      expect(textAtRange).toBe("badcol");
    });

    it("reports an undefined-table error with statement range (no position)", async () => {
      const { result } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        INSERT INTO test_apply.nonexistent VALUES (1);
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0]!.message).toContain("nonexistent");
    });

    it("halts on first failure (subsequent statements not applied)", async () => {
      const { result } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        INSERT INTO test_apply.t (badcol) VALUES (1);
        CREATE TABLE test_apply.t2 (id int);
      `);
      expect(result.success).toBe(false);
      // t2 should not exist because the migration halted at the INSERT.
      const tables = await pg.query<{ tablename: string }>(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'test_apply';
      `);
      expect(tables.rows.map(r => r.tablename)).not.toContain("t2");
    });

    it("maps position through CONCURRENTLY removal", async () => {
      const { result } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int, data text);
        CREATE INDEX CONCURRENTLY idx_test ON test_apply.t (badcol);
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics[0]!.message).toContain("badcol");
      expect(result.diagnostics[0]!.range).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // PL/pgSQL function failures (deferred validation catches them)
  // -------------------------------------------------------------------------

  describe("PL/pgSQL function failures (deferred validation)", () => {
    it("reports a bad column reference in a PL/pgSQL function body", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        CREATE FUNCTION test_apply.fn() RETURNS void
        LANGUAGE plpgsql AS $$
        BEGIN
          PERFORM badcol FROM test_apply.t;
        END;
        $$;
      `);
      expect(result.success).toBe(true);
      const diag = validateDiags.find(d => d.message.includes("badcol"))!;
      expect(diag).toBeDefined();
      expect(diag.original.source).toBe("plpgsql-check");
      expect(diag.code).toBe("42703");
    });

    it("reports a type mismatch in a PL/pgSQL function body", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        CREATE FUNCTION test_apply.fn() RETURNS text
        LANGUAGE plpgsql AS $$
        DECLARE
          v text;
        BEGIN
          v := 1 + 2;
        END;
        $$;
      `);
      expect(result.success).toBe(true);
      expect(validateDiags.length).toBeGreaterThanOrEqual(1);
    });

    it("reports a bad table reference in a PL/pgSQL function body", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE FUNCTION test_apply.fn() RETURNS void
        LANGUAGE plpgsql AS $$
        BEGIN
          PERFORM 1 FROM test_apply.nonexistent;
        END;
        $$;
      `);
      expect(result.success).toBe(true);
      const diag = validateDiags.find(d => d.message.includes("nonexistent"))!;
      expect(diag).toBeDefined();
      expect(diag.original.source).toBe("plpgsql-check");
    });

    it("reports a syntax error in a PL/pgSQL function body", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE FUNCTION test_apply.fn() RETURNS void
        LANGUAGE plpgsql AS $$
        BEGIN
          RASIE NOTICE 'hello';
        END;
        $$;
      `);
      expect(result.success).toBe(true);
      // The function applies (check_function_bodies=off), but validate catches it.
      // plpgsql_check reports the syntax error.
      expect(validateDiags.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // DO blocks (validated inline — pre-check in onBeforeStatementApplied)
  // -------------------------------------------------------------------------

  describe("DO blocks (inline pre-check)", () => {
    it("applies a valid DO block (PERFORM 1)", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        DO $$ BEGIN PERFORM 1; END; $$;
      `);
      expect(result.success).toBe(true);
      expect(validateDiags).toEqual([]);
    });

    it("applies a DO block with DML side effects", async () => {
      const { result } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        DO $$ BEGIN INSERT INTO test_apply.t VALUES (42); END; $$;
      `);
      expect(result.success).toBe(true);
    });

    it("applies a DO block with a DECLARE section", async () => {
      const { result } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        DO $$ DECLARE x int; BEGIN x := 1; PERFORM x; END; $$;
      `);
      expect(result.success).toBe(true);
    });

    it("reports a bad column reference in a DO block via plpgsql_check", async () => {
      const { result } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        DO $$ BEGIN PERFORM badcol FROM test_apply.t; END; $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics[0]!.original.source).toBe("plpgsql-check");
      expect(result.diagnostics[0]!.message).toContain("badcol");
    });

    it("reports a nonexistent table in a DO block via plpgsql_check", async () => {
      const { result } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        DO $$ BEGIN PERFORM 1 FROM test_apply.nonexistent; END; $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics[0]!.original.source).toBe("plpgsql-check");
      expect(result.diagnostics[0]!.message).toContain("nonexistent");
    });

    it("reports a syntax error in a DO block (RASIE typo)", async () => {
      const { result } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        DO $$ BEGIN RASIE NOTICE 'hello'; END; $$;
      `);
      expect(result.success).toBe(false);
    });

    it("handles multiple DO blocks in one migration", async () => {
      const { result } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        DO $$ BEGIN INSERT INTO test_apply.t VALUES (1); END; $$;
        DO $$ BEGIN INSERT INTO test_apply.t VALUES (2); END; $$;
      `);
      expect(result.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // LANGUAGE sql functions (deferred validation via re-CREATE)
  // -------------------------------------------------------------------------

  describe("LANGUAGE sql functions (deferred validation)", () => {
    it("reports a bad table reference in a SQL function body", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE FUNCTION test_apply.fn() RETURNS int
        LANGUAGE sql AS $$ SELECT id FROM test_apply.nonexistent; $$;
      `);
      expect(result.success).toBe(true);
      const diag = validateDiags.find(d => d.message.includes("nonexistent"))!;
      expect(diag).toBeDefined();
    });

    it("reports a type mismatch in a SQL function body", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        CREATE FUNCTION test_apply.fn() RETURNS int[]
        LANGUAGE sql AS $$ SELECT id FROM test_apply.t; $$;
      `);
      expect(result.success).toBe(true);
      expect(validateDiags.length).toBeGreaterThanOrEqual(1);
    });

    it("reports a syntax error in a SQL function body", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE FUNCTION test_apply.fn() RETURNS int
        LANGUAGE sql AS $$ SELCT 1; $$;
      `);
      expect(result.success).toBe(true);
      expect(validateDiags.length).toBeGreaterThanOrEqual(1);
    });

    it("applies a valid SQL function with parameters ($1, $2)", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (a int, b text);
        CREATE FUNCTION test_apply.fn(a int, b text) RETURNS text
        LANGUAGE sql AS $$ SELECT b FROM test_apply.t WHERE a = $1; $$;
      `);
      expect(result.success).toBe(true);
      expect(validateDiags).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // PL/pgSQL functions (comprehensive, deferred validation)
  // -------------------------------------------------------------------------

  describe("PL/pgSQL functions (comprehensive, deferred validation)", () => {
    it("reports a type mismatch (operator does not exist)", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        CREATE FUNCTION test_apply.fn() RETURNS int
        LANGUAGE plpgsql AS $$
        DECLARE
          v int;
        BEGIN
          v := 'hello' + 1;
        END;
        $$;
      `);
      expect(result.success).toBe(true);
      expect(validateDiags.length).toBeGreaterThanOrEqual(1);
    });

    it("reports a syntax error (RASIE instead of RAISE)", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE FUNCTION test_apply.fn() RETURNS void
        LANGUAGE plpgsql AS $$
        BEGIN
          RASIE NOTICE 'hello';
        END;
        $$;
      `);
      expect(result.success).toBe(true);
      expect(validateDiags.length).toBeGreaterThanOrEqual(1);
    });

    it("applies a valid PL/pgSQL function with SELECT INTO and IF logic", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int, val text);
        CREATE FUNCTION test_apply.fn(x int) RETURNS boolean
        LANGUAGE plpgsql AS $$
        DECLARE
          v text;
        BEGIN
          SELECT val INTO v FROM test_apply.t WHERE id = x;
          IF v IS NOT NULL THEN
            RETURN true;
          END IF;
          RETURN false;
        END;
        $$;
      `);
      expect(result.success).toBe(true);
      expect(validateDiags).toEqual([]);
    });

    it("applies a PL/pgSQL function that uses PERFORM and pg_notify", async () => {
      const { result, validateDiags } = await applyAndValidate(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        CREATE FUNCTION test_apply.fn(x int) RETURNS void
        LANGUAGE plpgsql AS $$
        BEGIN
          PERFORM 1 FROM test_apply.t WHERE id = x;
          PERFORM pg_notify('test', x::text);
        END;
        $$;
      `);
      expect(result.success).toBe(true);
      expect(validateDiags).toEqual([]);
    });
  });
});
