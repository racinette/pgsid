import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { applyMigration } from "../../src/apply.js";

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
   * Apply a migration, then ROLLBACK so the test doesn't pollute state.
   * Returns the ApplyResult.
   */
  async function applyAndRollback(sql: string) {
    const source = Buffer.from(sql, "utf8");
    // We need to apply inside a txn so we can rollback. But applyMigration
    // does its own BEGIN/COMMIT/ROLLBACK. So we wrap: applyMigration will
    // BEGIN, and if it succeeds, COMMIT — then we ROLLBACK after.
    // Wait — applyMigration commits on success. We can't rollback after
    // commit. So we need to drop the created objects manually, or accept
    // that successful applies leave state.
    //
    // Better: for tests, we use unique names per test to avoid conflicts,
    // and DROP at the end if needed. For failure tests, applyMigration
    // already rolls back.
    const result = await applyMigration(pg, source);
    if (result.success) {
      // Clean up: drop the schema we created. We use a test schema
      // to make cleanup easy.
      try { await pg.exec("DROP SCHEMA IF EXISTS test_apply CASCADE;"); } catch { /* ignore */ }
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Success cases
  // -------------------------------------------------------------------------

  describe("success cases", () => {
    it("applies a simple CREATE TABLE", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.users (id bigint PRIMARY KEY, email text NOT NULL);
      `);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });

    it("applies multiple DDL statements in order", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.users (id bigint PRIMARY KEY, email text NOT NULL);
        CREATE TABLE test_apply.posts (
          id bigint PRIMARY KEY,
          user_id bigint NOT NULL REFERENCES test_apply.users(id)
        );
        CREATE INDEX posts_user_idx ON test_apply.posts (user_id);
      `);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });

    it("applies DML (INSERT) alongside DDL", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        INSERT INTO test_apply.t VALUES (1), (2), (3);
      `);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });

    it("applies a CREATE INDEX CONCURRENTLY (stripped to in-txn)", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        CREATE INDEX CONCURRENTLY t_idx ON test_apply.t (id);
      `);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });

    it("applies a valid PL/pgSQL function (plpgsql_check passes)", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.users (id bigint PRIMARY KEY, email text NOT NULL);
        CREATE FUNCTION test_apply.get_email(uid bigint)
        RETURNS text
        LANGUAGE plpgsql
        AS $$
        DECLARE
          v text;
        BEGIN
          SELECT email INTO v FROM test_apply.users WHERE id = uid;
          RETURN v;
        END;
        $$;
      `);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });

    it("applies a valid LANGUAGE sql function (PG native validation passes)", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.users (id bigint PRIMARY KEY, email text NOT NULL);
        CREATE FUNCTION test_apply.get_email_sql(uid bigint)
        RETURNS text
        LANGUAGE sql
        AS $$
          SELECT email FROM test_apply.users WHERE id = $1;
        $$;
      `);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // DDL/DML failure cases
  // -------------------------------------------------------------------------

  describe("DDL/DML failures", () => {
    it("reports a syntax error from libpg-query (parse failure)", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int PRIMARY KY);
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.message).toContain('"KY"');
      expect(d.range).not.toBeNull();
      expect(d.original.source).toBe("libpg-query");
    });

    it("reports an undefined-column error with position (PGlite exec)", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.users (id bigint PRIMARY KEY);
        CREATE INDEX u_idx ON test_apply.users (id) WHERE badcol = 1;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42703");
      expect(d.message).toContain("badcol");
      expect(d.range).not.toBeNull();
      expect(d.original.source).toBe("pglite");
    });

    it("reports an undefined-table error with statement range (no position)", async () => {
      // CREATE INDEX on a nonexistent table → 42P01 with no position.
      // The diagnostic should have `range` set to the whole statement.
      const sql = `
        CREATE SCHEMA test_apply;
        CREATE INDEX bad_idx ON test_apply.nonexistent_table (id);
      `;
      const source = Buffer.from(sql, "utf8");
      const result = await applyMigration(pg, source);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42P01");
      expect(d.message).toContain("nonexistent_table");
      expect(d.range).not.toBeNull();  // fallback: whole statement range
      // The range should point at the CREATE INDEX statement in the file.
      const rangeText = source.subarray(d.range!.start, d.range!.end).toString("utf8");
      expect(rangeText).toContain("CREATE INDEX");
      expect(rangeText).toContain("nonexistent_table");
    });

    it("halts on first failure (subsequent statements not applied)", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        CREATE TABLE test_apply.t (id int);
        CREATE TABLE test_apply.after_failure (id int);
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      // The error is "relation already exists" for the second CREATE TABLE.
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42P07");
      expect(d.message).toContain("already exists");
      // The third table should NOT exist (halted).
      const res = await pg.query(
        "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'after_failure') AS exists",
      );
      expect(res.rows[0]!.exists).toBe(false);
    });

    it("maps position through CONCURRENTLY removal", async () => {
      // CREATE INDEX CONCURRENTLY ... WHERE badcol = 1
      // Stripped: CREATE INDEX ... WHERE badcol = 1
      // PGlite error at "badcol" in stripped content → mapped to original.
      const sql = `
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.users (id bigint PRIMARY KEY);
        CREATE INDEX CONCURRENTLY u_idx ON test_apply.users (id) WHERE badcol = 1;
      `;
      const source = Buffer.from(sql, "utf8");
      const result = await applyMigration(pg, source);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42703");
      expect(d.message).toContain("badcol");
      expect(d.range).not.toBeNull();
      // The mapped position must point at "badcol" in the ORIGINAL file.
      expect(source.toString("utf8").slice(d.range!.start, d.range!.start + 6)).toBe("badcol");
    });
  });

  // -------------------------------------------------------------------------
  // PL/pgSQL function failure cases
  // -------------------------------------------------------------------------

  describe("PL/pgSQL function failures (plpgsql_check)", () => {
    it("reports a bad column reference in a PL/pgSQL function body", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.users (id bigint PRIMARY KEY, email text NOT NULL);
        CREATE FUNCTION test_apply.bad_col()
        RETURNS void
        LANGUAGE plpgsql
        AS $$
        DECLARE
          r record;
        BEGIN
          FOR r IN SELECT * FROM test_apply.users LOOP
            RAISE NOTICE '%', r.missing_column;
          END LOOP;
        END;
        $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42703");
      expect(d.message).toContain("missing_column");
      expect(d.original.source).toBe("plpgsql-check");
      // plpgsql_check provides lineno and/or position for body-relative info.
      expect(d.range).not.toBeNull();
    });

    it("reports a type mismatch in a PL/pgSQL function body", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE FUNCTION test_apply.bad_type()
        RETURNS integer
        LANGUAGE plpgsql
        AS $$
        DECLARE
          v text := 'hello';
        BEGIN
          RETURN v + 1;
        END;
        $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42883");
      expect(d.message).toContain("operator does not exist: text + integer");
      expect(d.hint).toContain("explicit type casts");
      expect(d.original.source).toBe("plpgsql-check");
    });

    it("reports a bad table reference in a PL/pgSQL function body", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE FUNCTION test_apply.bad_table()
        RETURNS void
        LANGUAGE plpgsql
        AS $$
        BEGIN
          PERFORM * FROM test_apply.nonexistent_table;
        END;
        $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42P01");
      expect(d.message).toContain("nonexistent_table");
      expect(d.original.source).toBe("plpgsql-check");
    });

    it("reports a syntax error in a PL/pgSQL function body (check_function_bodies=off)", async () => {
      // With check_function_bodies=off, the CREATE succeeds even with a
      // syntax error in the body. plpgsql_check catches it instead.
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE FUNCTION test_apply.bad_syntax()
        RETURNS void
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RASIE NOTICE 'hello';
        END;
        $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42601");
      expect(d.message).toContain("RASIE");
      expect(d.original.source).toBe("plpgsql-check");
    });

    it("does NOT halt the txn when a PL/pgSQL function has body errors", async () => {
      // Key property of check_function_bodies=off: the function is created
      // despite body errors, so the txn isn't poisoned. But applyMigration
      // still returns failure (the plpgsql_check diagnostics are errors).
      // The function IS created in the catalog — but applyMigration rolled
      // back the txn on failure, so it shouldn't persist.
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.users (id bigint PRIMARY KEY);
        CREATE FUNCTION test_apply.bad_col()
        RETURNS void
        LANGUAGE plpgsql
        AS $$
        BEGIN
          PERFORM badcol FROM test_apply.users;
        END;
        $$;
      `);
      expect(result.success).toBe(false);
      // The txn was rolled back, so the schema and table should not persist.
      const res = await pg.query(
        "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND schemaname = 'test_apply') AS exists",
      );
      expect(res.rows[0]!.exists).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // LANGUAGE sql function failure cases
  // -------------------------------------------------------------------------

  describe("LANGUAGE sql function failures (PG native validation)", () => {
    it("reports a bad column in a LANGUAGE sql function body", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.users (id bigint PRIMARY KEY, email text NOT NULL);
        CREATE FUNCTION test_apply.bad_sql_func(uid bigint)
        RETURNS text
        LANGUAGE sql
        AS $$
          SELECT emial FROM test_apply.users WHERE id = $1;
        $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42703");
      expect(d.message).toContain("emial");
      expect(d.hint).toContain("email"); // "Perhaps you meant..."
      expect(d.original.source).toBe("pglite");
      expect(d.range).not.toBeNull();
    });

    it("check_function_bodies is restored to on after a PL/pgSQL function", async () => {
      // Create a valid PL/pgSQL function, then a bad SQL function.
      // The SQL function should be validated natively (check_function_bodies
      // restored to on after the PL/pgSQL function).
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.users (id bigint PRIMARY KEY, email text NOT NULL);
        CREATE FUNCTION test_apply.good_plpgsql(uid bigint)
        RETURNS text
        LANGUAGE plpgsql
        AS $$
        DECLARE v text;
        BEGIN
          SELECT email INTO v FROM test_apply.users WHERE id = uid;
          RETURN v;
        END;
        $$;
        CREATE FUNCTION test_apply.bad_sql(uid bigint)
        RETURNS text
        LANGUAGE sql
        AS $$
          SELECT emial FROM test_apply.users WHERE id = $1;
        $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42703");
      expect(d.message).toContain("emial");
      expect(d.original.source).toBe("pglite"); // PG native validation, not plpgsql_check
    });
  });

  // -------------------------------------------------------------------------
  // DO block cases
  // -------------------------------------------------------------------------

  describe("DO blocks (temp-function + plpgsql_check)", () => {
    it("applies a valid DO block (PERFORM 1)", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        DO $$ BEGIN PERFORM 1; END $$;
      `);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });

    it("applies a DO block with DML side effects", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int, email text);
        DO $$
        BEGIN
          INSERT INTO test_apply.t VALUES (1, 'a@b.com');
          INSERT INTO test_apply.t VALUES (2, 'c@d.com');
        END
        $$;
      `);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });

    it("applies a DO block with a DECLARE section", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        DO $$
        DECLARE
          v_count integer;
        BEGIN
          SELECT count(*) INTO v_count FROM test_apply.t;
          IF v_count = 0 THEN
            INSERT INTO test_apply.t VALUES (1);
          END IF;
        END
        $$;
      `);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });

    it("reports a bad column reference in a DO block via plpgsql_check", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.users (id bigint PRIMARY KEY, email text NOT NULL);
        DO $$
        BEGIN
          PERFORM badcol FROM test_apply.users;
        END
        $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42703");
      expect(d.message).toContain("badcol");
      expect(d.original.source).toBe("plpgsql-check");
      // plpgsql_check gives us lineno and/or position for the body.
      expect(d.range).not.toBeNull();
    });

    it("reports a nonexistent table in a DO block via plpgsql_check", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        DO $$
        BEGIN
          PERFORM * FROM test_apply.nonexistent_table;
        END
        $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42P01");
      expect(d.message).toContain("nonexistent_table");
      expect(d.original.source).toBe("plpgsql-check");
    });

    it("reports a syntax error in a DO block (RASIE typo)", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        DO $$ BEGIN RASIE NOTICE 'hello'; END $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.message).toContain("RASIE");
      // Syntax errors in DO block bodies may come from either plpgsql_check
      // (via temp function) or PGlite exec (fallback). Either way, the
      // message should mention the typo.
    });

    it("handles multiple DO blocks in one migration", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.t (id int);
        DO $$ BEGIN INSERT INTO test_apply.t VALUES (1); END $$;
        DO $$ BEGIN INSERT INTO test_apply.t VALUES (2); END $$;
        DO $$ BEGIN INSERT INTO test_apply.t VALUES (3); END $$;
      `);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // LANGUAGE sql function cases (comprehensive)
  // -------------------------------------------------------------------------

  describe("LANGUAGE sql functions (PG native validation)", () => {
    it("reports a bad table reference in a SQL function body", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE FUNCTION test_apply.bad_table_ref()
        RETURNS void
        LANGUAGE sql
        AS $$ SELECT * FROM test_apply.nonexistent_table; $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42P01");
      expect(d.message).toContain("nonexistent_table");
      expect(d.original.source).toBe("pglite");
      // PG native validation gives a position into the CREATE FUNCTION string.
      expect(d.range).not.toBeNull();
    });

    it("reports a type mismatch in a SQL function body", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.users (id bigint PRIMARY KEY);
        CREATE FUNCTION test_apply.bad_type(uid bigint)
        RETURNS void
        LANGUAGE sql
        AS $$ SELECT * FROM test_apply.users WHERE id = 'not-a-number'; $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("22P02");
      expect(d.message).toContain("invalid input syntax for type bigint");
      expect(d.original.source).toBe("pglite");
      expect(d.range).not.toBeNull();
    });

    it("reports a syntax error in a SQL function body", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE FUNCTION test_apply.bad_syntax()
        RETURNS void
        LANGUAGE sql
        AS $$ SELEC 1; $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42601");
      expect(d.message).toContain("SELEC");
      expect(d.original.source).toBe("pglite");
    });

    it("applies a valid SQL function with parameters ($1, $2)", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.users (id bigint PRIMARY KEY, email text NOT NULL);
        CREATE FUNCTION test_apply.get_email(uid bigint)
        RETURNS text
        LANGUAGE sql
        IMMUTABLE
        STRICT
        AS $$ SELECT email FROM test_apply.users WHERE id = $1; $$;
      `);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // PL/pgSQL function cases (comprehensive, beyond what's in integration.test.ts)
  // -------------------------------------------------------------------------

  describe("PL/pgSQL functions (plpgsql_check, comprehensive)", () => {
    it("reports a type mismatch (operator does not exist)", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE FUNCTION test_apply.bad_op()
        RETURNS integer
        LANGUAGE plpgsql
        AS $$
        DECLARE
          v text := 'hello';
        BEGIN
          RETURN v + 1;
        END;
        $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42883");
      expect(d.message).toContain("operator does not exist: text + integer");
      expect(d.hint).toContain("explicit type casts");
      expect(d.original.source).toBe("plpgsql-check");
    });

    it("reports a syntax error (RASIE instead of RAISE)", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE FUNCTION test_apply.bad_keyword()
        RETURNS void
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RASIE NOTICE 'hello';
        END;
        $$;
      `);
      expect(result.success).toBe(false);
      expect(result.diagnostics.length).toBe(1);
      const d = result.diagnostics[0]!;
      expect(d.code).toBe("42601");
      expect(d.message).toContain("RASIE");
      expect(d.original.source).toBe("plpgsql-check");
    });

    it("applies a valid PL/pgSQL function with SELECT INTO and IF logic", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.users (id bigint PRIMARY KEY, email text NOT NULL);
        CREATE FUNCTION test_apply.get_or_default(uid bigint)
        RETURNS text
        LANGUAGE plpgsql
        AS $$
        DECLARE
          v text;
        BEGIN
          SELECT email INTO v FROM test_apply.users WHERE id = uid;
          IF v IS NULL THEN
            RETURN 'unknown';
          ELSE
            RETURN v;
          END IF;
        END;
        $$;
      `);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });

    it("applies a PL/pgSQL function that uses PERFORM and pg_notify", async () => {
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.posts (id bigint PRIMARY KEY, published_at timestamptz);
        CREATE FUNCTION test_apply.publish(post_id bigint)
        RETURNS boolean
        LANGUAGE plpgsql
        AS $$
        BEGIN
          UPDATE test_apply.posts SET published_at = now() WHERE id = post_id;
          PERFORM pg_notify('post_published', post_id::text);
          RETURN true;
        END;
        $$;
      `);
      expect(result.success).toBe(true);
      expect(result.diagnostics).toEqual([]);
    });

    it("does not halt the txn when a PL/pgSQL function has body errors", async () => {
      // Key property of check_function_bodies=off: the function is created
      // despite body errors, so the txn isn't poisoned. But applyMigration
      // still returns failure (the plpgsql_check diagnostics are errors).
      // The txn was rolled back, so nothing persists.
      const result = await applyAndRollback(`
        CREATE SCHEMA test_apply;
        CREATE TABLE test_apply.users (id bigint PRIMARY KEY);
        CREATE FUNCTION test_apply.bad_col()
        RETURNS void
        LANGUAGE plpgsql
        AS $$
        BEGIN
          PERFORM badcol FROM test_apply.users;
        END;
        $$;
      `);
      expect(result.success).toBe(false);
      // The txn was rolled back, so the schema and table should not persist.
      const res = await pg.query(
        "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND schemaname = 'test_apply') AS exists",
      );
      expect(res.rows[0]!.exists).toBe(false);
    });
  });
});
