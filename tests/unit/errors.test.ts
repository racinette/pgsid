import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parse, SqlError } from "libpg-query";
import {
  extractParseDiagnostic,
  extractExecDiagnostic,
  extractPlpgsqlCheckDiagnostic,
  preparePrefixLength,
  type SqlDiagnostic,
  type PlpgsqlCheckRow,
} from "../../src/errors.js";
import {
  parseSql,
  preprocess,
  stripConcurrently,
  mapStrippedToOriginal,
} from "../../src/ast.js";

// ---------------------------------------------------------------------------
// Unit tests: extractParseDiagnostic (libpg-query parse errors)
// ---------------------------------------------------------------------------

describe("errors: extractParseDiagnostic", () => {
  it("extracts a syntax error with 0-based cursorPosition", async () => {
    const sql = "SELEC * FROM users;";
    try {
      await parse(sql);
      throw new Error("expected parse to fail");
    } catch (err) {
      if (err instanceof Error && err.message === "expected parse to fail") throw err;
      const d = extractParseDiagnostic(err, 0, Buffer.from(sql, "utf8"));
      expect(d.message).toContain('syntax error at or near "SELEC"');
      expect(d.code).toBeUndefined(); // parse errors have no SQLSTATE
      expect(d.severity).toBe("error");
      expect(d.range).not.toBeNull();
      // cursorPosition is 0-based → points at "S" of "SELEC".
      expect(d.range!.start).toBe(0);
      expect(d.original.source).toBe("libpg-query");
      expect(d.original.source === "libpg-query" && d.original.error instanceof SqlError).toBe(true);
    }
  });

  it("translates position by sqlOffset when parsing a substring of the file", async () => {
    // Simulate: the SQL starts at byte 100 in the file (e.g. after a comment).
    const sql = "SELECT * FROM WHERE";
    try {
      await parse(sql);
      throw new Error("expected parse to fail");
    } catch (err) {
      if (err instanceof Error && err.message === "expected parse to fail") throw err;
      const d = extractParseDiagnostic(err, 100, Buffer.from(sql, "utf8"));
      expect(d.range).not.toBeNull();
      // cursorPosition points at "WHERE" (byte 14 in the SQL). File offset = 100 + 14.
      expect(d.range!.start).toBe(100 + 14);
    }
  });

  it("handles a syntax error in the second statement of a multi-statement string", async () => {
    const sql = "SELECT 1; SELEC 2;";
    try {
      await parse(sql);
      throw new Error("expected parse to fail");
    } catch (err) {
      if (err instanceof Error && err.message === "expected parse to fail") throw err;
      const d = extractParseDiagnostic(err, 0, Buffer.from(sql, "utf8"));
      expect(d.range!.start).toBe(10); // 0-based, points at "S" of "SELEC"
    }
  });

  it("handles a non-SqlError thrown by the parser", () => {
    const d = extractParseDiagnostic(new Error("some JS failure"), 0);
    expect(d.message).toBe("some JS failure");
    expect(d.code).toBeUndefined();
    expect(d.range).toBeNull();
    expect(d.severity).toBe("error");
  });

  it("preserves the original SqlError in the `original` field", async () => {
    try {
      await parse("SELEC 1");
      throw new Error("expected parse to fail");
    } catch (err) {
      if (err instanceof Error && err.message === "expected parse to fail") throw err;
      const d = extractParseDiagnostic(err, 0, Buffer.from("SELEC 1", "utf8"));
      expect(d.original.source).toBe("libpg-query");
      if (d.original.source === "libpg-query") {
        expect(d.original.error).toBe(err); // same reference
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Unit tests: extractExecDiagnostic (PGlite DatabaseError)
// ---------------------------------------------------------------------------

describe("errors: extractExecDiagnostic", () => {
  // These tests use real PGlite to get real DatabaseError objects.
  let pg: PGlite;

  beforeAll(async () => {
    pg = await PGlite.create();
    await pg.exec("CREATE TABLE public.users (id bigint PRIMARY KEY, email text NOT NULL);");
  });

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  /** Run `PREPARE <name> AS <stmt>` and extract the diagnostic. */
  async function prepareAndExtract(
    name: string,
    stmt: string,
    ctx: { stmtStrippedOffset: number; removals: { offset: number; length: number }[] },
  ): Promise<SqlDiagnostic> {
    const prefix = `PREPARE ${name} AS `;
    const sql = prefix + stmt;
    try {
      await pg.query(sql);
      throw new Error("expected PREPARE to fail");
    } catch (err) {
      if (err instanceof Error && err.message === "expected PREPARE to fail") throw err;
      return extractExecDiagnostic(err, prefix.length, {
        ...ctx,
        mapStrippedToOriginal,
        source: Buffer.from(stmt, "utf8"),
      });
    } finally {
      try { await pg.query(`DEALLOCATE ${name}`); } catch { /* ignore */ }
    }
  }

  it("extracts a column-typo error with hint and position", async () => {
    const d = await prepareAndExtract("p1", "SELECT emial FROM public.users", {
      stmtStrippedOffset: 0,
      removals: [],
    });
    expect(d.code).toBe("42703");
    expect(d.severity).toBe("error");
    expect(d.message).toContain('column "emial" does not exist');
    expect(d.hint).toContain("users.email");
    // Position is 0-based into the statement body (after the PREPARE prefix).
    expect(d.range).not.toBeNull();
    const body = "SELECT emial FROM public.users";
    expect(body.charAt(d.range!.start)).toBe("e");
    expect(d.original.source).toBe("pglite");
  });

  it("extracts a syntax error (parse-level)", async () => {
    const d = await prepareAndExtract("p2", "SELEC * FROM public.users", {
      stmtStrippedOffset: 0,
      removals: [],
    });
    expect(d.code).toBe("42601");
    expect(d.message).toMatch(/syntax error at or near "SELEC"/);
    const body = "SELEC * FROM public.users";
    expect(body.charAt(d.range!.start)).toBe("S");
  });

  it("handles a no-position error (undefined table via PREPARE)", async () => {
    // Note: PREPARE of SELECT with a bad table DOES return a position
    // (analyze-time error, position into the RangeVar). This is different
    // from exec of CREATE INDEX with a bad table (catalog lookup, no position).
    // Here we verify the PREPARE case has a position.
    const d = await prepareAndExtract("p3", "SELECT * FROM nonexistent_table", {
      stmtStrippedOffset: 0,
      removals: [],
    });
    expect(d.code).toBe("42P01");
    expect(d.message).toContain("nonexistent_table");
    // PREPARE analyze-time errors DO have a position.
    expect(d.range).not.toBeNull();
  });

  it("maps position through CONCURRENTLY removals (via exec, not PREPARE)", async () => {
    // Can't PREPARE DDL — use exec instead. The CONCURRENTLY keyword is
    // stripped, and the error position in the stripped content is mapped
    // back to the original file.
    const original = Buffer.from(
      "CREATE INDEX CONCURRENTLY u_idx ON public.users (email) WHERE badcol = 1;",
      "utf8",
    );
    const parsed = await parseSql(original.toString("utf8"));
    const result = preprocess(original, parsed, stripConcurrently());
    expect(result.modified).toBe(true);

    await pg.query("BEGIN");
    try {
      try {
        await pg.exec(result.content.toString("utf8"));
        throw new Error("expected exec to fail");
      } catch (err) {
        if (err instanceof Error && err.message === "expected exec to fail") throw err;
        const d = extractExecDiagnostic(err, 0, {
          stmtStrippedOffset: 0,
          removals: result.removals,
          mapStrippedToOriginal,
          source: original,
        });
        expect(d.code).toBe("42703"); // undefined_column in WHERE predicate
        expect(d.message).toContain("badcol");
        expect(d.range).not.toBeNull();
        // The mapped position must point at "badcol" in the ORIGINAL file.
        expect(original.toString("utf8").slice(d.range!.start, d.range!.start + 6)).toBe("badcol");
      }
    } finally {
      await pg.query("ROLLBACK");
    }
  });

  it("translates position with stmtStrippedOffset (statement after a stripped keyword)", async () => {
    // When the statement is not at offset 0 in the stripped content
    // (e.g. it's the second statement), the stmtStrippedOffset is added.
    const d = await prepareAndExtract("p5", "SELECT emial FROM public.users", {
      stmtStrippedOffset: 42, // simulate the statement starting at byte 42
      removals: [],
    });
    expect(d.range).not.toBeNull();
    const body = "SELECT emial FROM public.users";
    const bodyPos = d.range!.start - 42; // remove the offset to get back into the body
    expect(body.charAt(bodyPos)).toBe("e");
  });

  it("handles a non-DatabaseError by surfacing the message with no position", () => {
    const d = extractExecDiagnostic(new Error("JS-side failure"), 0, {
      stmtStrippedOffset: 0,
      removals: [],
      mapStrippedToOriginal,
    });
    expect(d.message).toBe("JS-side failure");
    expect(d.range).toBeNull();
    expect(d.code).toBeUndefined();
    expect(d.severity).toBe("error");
  });

  it("preparePrefixLength computes the right byte length", () => {
    expect(preparePrefixLength("p1")).toBe("PREPARE p1 AS ".length);
    expect(preparePrefixLength("pgsid_stmt_42")).toBe("PREPARE pgsid_stmt_42 AS ".length);
    expect(preparePrefixLength("p1")).toBe(14);
    expect(preparePrefixLength("pgsid_stmt_42")).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// Integration tests: extractPlpgsqlCheckDiagnostic (plpgsql_check)
// ---------------------------------------------------------------------------

describe("errors: extractPlpgsqlCheckDiagnostic", () => {
  let pg: PGlite;

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(`
      CREATE TABLE public.users (
        id bigint PRIMARY KEY,
        email text NOT NULL,
        display_name text
      );
    `);
  });

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  /**
   * Create a function, run plpgsql_check_function_tb, and extract
   * diagnostics for each row.
   */
  async function checkFunction(
    createSql: string,
    functionName: string,
    bodyOffset: number,
    bodyText: string,
  ): Promise<SqlDiagnostic[]> {
    await pg.query("BEGIN");
    try {
      await pg.exec(createSql);
      const res = await pg.query<{
        functionid: string; lineno: number | null; statement: string | null;
        sqlstate: string; message: string; detail: string | null;
        hint: string | null; level: string; position: number | null;
        query: string | null; context: string | null;
      }>(`SELECT * FROM plpgsql_check_function_tb('${functionName}');`);
      return res.rows.map((row) => extractPlpgsqlCheckDiagnostic(row as PlpgsqlCheckRow, bodyOffset, bodyText));
    } finally {
      await pg.query("ROLLBACK");
    }
  }

  it("extracts a bad-column-reference error (position null, lineno fallback)", async () => {
    const bodyText = `
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM public.users LOOP
    RAISE NOTICE '%', r.missing_column;
  END LOOP;
END;
`;
    const diags = await checkFunction(`
      CREATE OR REPLACE FUNCTION public.test_bad_col()
      RETURNS void
      LANGUAGE plpgsql
      AS $$${bodyText}$$;
    `, "public.test_bad_col()", 0, bodyText);

    expect(diags.length).toBe(1);
    const d = diags[0]!;
    expect(d.code).toBe("42703");
    expect(d.severity).toBe("error");
    expect(d.message).toContain('record "r" has no field "missing_column"');
    // plpgsql_check didn't set `position`/`query` for this case (the error
    // is in a PL/pgSQL expression, not an internal SQL query). We fall back
    // to `lineno` (6 = the RAISE NOTICE line) to compute a byte offset.
    expect(d.range).not.toBeNull(); // line-start byte offset
    expect(d.original.source).toBe("plpgsql-check");
    if (d.original.source === "plpgsql-check") {
      expect(d.original.row.statement).toBe("RAISE");
      expect(d.original.row.context).toContain("r.missing_column");
    }
  });

  it("extracts a type-mismatch error (position into query field)", async () => {
    const bodyText = `
DECLARE
  v text := 'hello';
BEGIN
  RETURN v + 1;
END;
`;
    const diags = await checkFunction(`
      CREATE OR REPLACE FUNCTION public.test_type_mismatch()
      RETURNS integer
      LANGUAGE plpgsql
      AS $$${bodyText}$$;
    `, "public.test_type_mismatch()", 0, bodyText);

    expect(diags.length).toBe(1);
    const d = diags[0]!;
    expect(d.code).toBe("42883");
    expect(d.message).toContain("operator does not exist: text + integer");
    expect(d.hint).toContain("explicit type casts");
    // position is set, relative to `query` = "v + 1".
    // We find "v + 1" in the body and compute the file offset.
    expect(d.range).not.toBeNull();
    expect(d.original.source).toBe("plpgsql-check");
    if (d.original.source === "plpgsql-check") {
      expect(d.original.row.query).toBe("v + 1");
      expect(d.original.row.position).toBe(3); // 1-based into "v + 1"
    }
  });

  it("extracts a bad-table-reference error (query not found in body, lineno fallback)", async () => {
    // plpgsql_check transforms PERFORM → SELECT in the `query` field, so
    // the query string doesn't match the body text verbatim. The extractor
    // falls back to `lineno`-based position.
    const bodyText = `
BEGIN
  PERFORM * FROM nonexistent_table;
END;
`;
    const diags = await checkFunction(`
      CREATE OR REPLACE FUNCTION public.test_bad_table()
      RETURNS void
      LANGUAGE plpgsql
      AS $$${bodyText}$$;
    `, "public.test_bad_table()", 0, bodyText);

    expect(diags.length).toBe(1);
    const d = diags[0]!;
    expect(d.code).toBe("42P01");
    expect(d.message).toContain("nonexistent_table");
    // `query` was "SELECT * FROM nonexistent_table" but body has "PERFORM",
    // so indexOf fails → fall back to lineno (3 = the PERFORM line).
    expect(d.range).not.toBeNull(); // line-start byte offset
    expect(d.original.source).toBe("plpgsql-check");
    if (d.original.source === "plpgsql-check") {
      expect(d.original.row.query).toBe("SELECT * FROM nonexistent_table");
      expect(d.original.row.position).toBe(15); // 1-based into the query
    }
  });

  it("returns no diagnostics for a valid function", async () => {
    const bodyText = `
DECLARE
  v integer;
BEGIN
  SELECT id INTO v FROM public.users LIMIT 1;
  RETURN v;
END;
`;
    const diags = await checkFunction(`
      CREATE OR REPLACE FUNCTION public.test_good()
      RETURNS integer
      LANGUAGE plpgsql
      AS $$${bodyText}$$;
    `, "public.test_good()", 0, bodyText);

    expect(diags.length).toBe(0);
  });

  it("preserves the original plpgsql_check row in the `original` field", async () => {
    const bodyText = `
BEGIN
  PERFORM * FROM nonexistent_table;
END;
`;
    const diags = await checkFunction(`
      CREATE OR REPLACE FUNCTION public.test_original()
      RETURNS void
      LANGUAGE plpgsql
      AS $$${bodyText}$$;
    `, "public.test_original()", 0, bodyText);

    const d = diags[0]!;
    expect(d.original.source).toBe("plpgsql-check");
    if (d.original.source === "plpgsql-check") {
      expect(d.original.row.functionid).toBe("test_original");
      expect(d.original.row.statement).toBe("PERFORM");
      expect(d.original.row.level).toBe("error");
      expect(d.original.row.sqlstate).toBe("42P01");
    }
  });
});
