import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { SchemaBuilder } from "../../src/schema-builder.js";
import { getBodyOffsetFromAst, parseSql } from "../../src/ast.js";

describe("spike: body offset strategy verification", () => {
  let pg: PGlite;
  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
  });
  afterAll(async () => { if (!pg.closed) await pg.close(); });

  // -------------------------------------------------------------------------
  // 1. getBodyOffsetFromAst with various delimiters
  // -------------------------------------------------------------------------

  it("AST body offset: $$ delimiter", async () => {
    const sql = "CREATE FUNCTION public.dollar_def(a int) RETURNS int LANGUAGE plpgsql AS $$\nBEGIN\n  RETURN a;\nEND;\n$$;";
    const buf = Buffer.from(sql, "utf8");
    const parsed = await parseSql(sql);
    const stmt = parsed.stmts![0]!.stmt!;
    const stmtStart = parsed.stmts![0]!.stmt_location ?? 0;
    const offset = getBodyOffsetFromAst(stmt, buf, stmtStart);
    expect(offset).toBeGreaterThanOrEqual(0);
    // The body should start right after "$$" — verify by checking the byte.
    const bodyText = buf.subarray(offset, offset + 1).toString("utf8");
    expect(bodyText).toBe("\n"); // body starts with \n
    // Full body text:
    const fullBody = buf.subarray(offset).toString("utf8").split("$$")[0];
    expect(fullBody).toBe("\nBEGIN\n  RETURN a;\nEND;\n");
  });

  it("AST body offset: $tag$ delimiter", async () => {
    const sql = "CREATE FUNCTION public.dollar_tag(a int) RETURNS int LANGUAGE plpgsql AS $tag$\nBEGIN\n  RETURN a;\nEND;\n$tag$;";
    const buf = Buffer.from(sql, "utf8");
    const parsed = await parseSql(sql);
    const stmt = parsed.stmts![0]!.stmt!;
    const stmtStart = parsed.stmts![0]!.stmt_location ?? 0;
    const offset = getBodyOffsetFromAst(stmt, buf, stmtStart);
    expect(offset).toBeGreaterThanOrEqual(0);
    const fullBody = buf.subarray(offset).toString("utf8").split("$tag$")[0];
    expect(fullBody).toBe("\nBEGIN\n  RETURN a;\nEND;\n");
  });

  it("AST body offset: $some_arbitrary_string$ delimiter", async () => {
    const sql = "CREATE FUNCTION public.dollar_arb(a int) RETURNS int LANGUAGE plpgsql AS $some_arbitrary_string$\nBEGIN\n  RETURN a;\nEND;\n$some_arbitrary_string$;";
    const buf = Buffer.from(sql, "utf8");
    const parsed = await parseSql(sql);
    const stmt = parsed.stmts![0]!.stmt!;
    const stmtStart = parsed.stmts![0]!.stmt_location ?? 0;
    const offset = getBodyOffsetFromAst(stmt, buf, stmtStart);
    expect(offset).toBeGreaterThanOrEqual(0);
    const fullBody = buf.subarray(offset).toString("utf8").split("$some_arbitrary_string$")[0];
    expect(fullBody).toBe("\nBEGIN\n  RETURN a;\nEND;\n");
  });

  it("AST body offset: single-quoted body", async () => {
    const sql = "CREATE FUNCTION public.single_q(a int) RETURNS int LANGUAGE sql AS 'SELECT a + 1';";
    const buf = Buffer.from(sql, "utf8");
    const parsed = await parseSql(sql);
    const stmt = parsed.stmts![0]!.stmt!;
    const stmtStart = parsed.stmts![0]!.stmt_location ?? 0;
    const offset = getBodyOffsetFromAst(stmt, buf, stmtStart);
    expect(offset).toBeGreaterThanOrEqual(0);
    const bodyText = buf.subarray(offset, offset + 12).toString("utf8");
    expect(bodyText).toBe("SELECT a + 1");
  });

  it("AST body offset: with comments before AS", async () => {
    const sql = "CREATE FUNCTION public.with_comments(a int) -- line\nRETURNS int /* block */ LANGUAGE plpgsql AS $$\nBEGIN\n  RETURN a;\nEND;\n$$;";
    const buf = Buffer.from(sql, "utf8");
    const parsed = await parseSql(sql);
    const stmt = parsed.stmts![0]!.stmt!;
    const stmtStart = parsed.stmts![0]!.stmt_location ?? 0;
    const offset = getBodyOffsetFromAst(stmt, buf, stmtStart);
    expect(offset).toBeGreaterThanOrEqual(0);
    const fullBody = buf.subarray(offset).toString("utf8").split("$$")[0];
    expect(fullBody).toBe("\nBEGIN\n  RETURN a;\nEND;\n");
  });

  it("AST body offset: multi-byte UTF-8 before body", async () => {
    const sql = "CREATE FUNCTION public.utf8_body(a int) RETURNS int -- café ☕ 日本語\nLANGUAGE plpgsql AS $$\nBEGIN\n  RETURN a;\nEND;\n$$;";
    const buf = Buffer.from(sql, "utf8");
    const parsed = await parseSql(sql);
    const stmt = parsed.stmts![0]!.stmt!;
    const stmtStart = parsed.stmts![0]!.stmt_location ?? 0;
    const offset = getBodyOffsetFromAst(stmt, buf, stmtStart);
    expect(offset).toBeGreaterThanOrEqual(0);
    const fullBody = buf.subarray(offset).toString("utf8").split("$$")[0];
    expect(fullBody).toBe("\nBEGIN\n  RETURN a;\nEND;\n");
  });

  it("AST body offset: DO block", async () => {
    const sql = "DO $$\nBEGIN\n  PERFORM 1;\nEND;\n$$;";
    const buf = Buffer.from(sql, "utf8");
    const parsed = await parseSql(sql);
    const stmt = parsed.stmts![0]!.stmt!;
    const stmtStart = parsed.stmts![0]!.stmt_location ?? 0;
    const offset = getBodyOffsetFromAst(stmt, buf, stmtStart);
    expect(offset).toBeGreaterThanOrEqual(0);
    const fullBody = buf.subarray(offset).toString("utf8").split("$$")[0];
    expect(fullBody).toBe("\nBEGIN\n  PERFORM 1;\nEND;\n");
  });

  it("AST body offset: DO block with $tag$ delimiter", async () => {
    const sql = "DO $body$\nBEGIN\n  PERFORM 1;\nEND;\n$body$;";
    const buf = Buffer.from(sql, "utf8");
    const parsed = await parseSql(sql);
    const stmt = parsed.stmts![0]!.stmt!;
    const stmtStart = parsed.stmts![0]!.stmt_location ?? 0;
    const offset = getBodyOffsetFromAst(stmt, buf, stmtStart);
    expect(offset).toBeGreaterThanOrEqual(0);
    const fullBody = buf.subarray(offset).toString("utf8").split("$body$")[0];
    expect(fullBody).toBe("\nBEGIN\n  PERFORM 1;\nEND;\n");
  });

  // -------------------------------------------------------------------------
  // 2. DO block dynamic body search (byte search fallback)
  // -------------------------------------------------------------------------

  it("DO block dynamic function: body search finds body inside EXECUTE string", async () => {
    const builder = new SchemaBuilder();
    const source = Buffer.from(
      "CREATE TABLE public.dyn_search_t (id int);\n" +
      "DO $$\n" +
      "BEGIN\n" +
      "  EXECUTE 'CREATE FUNCTION public.dyn_search_fn() RETURNS void " +
      "LANGUAGE plpgsql AS $func$ BEGIN PERFORM broken_search_col FROM public.dyn_search_t; END; $func$';\n" +
      "END;\n" +
      "$$;\n",
      "utf8",
    );

    await builder.applyMigration(pg, source, 0);
    const diags = await builder.validate(pg);
    const fnDiags = diags.filter(d => d.message.includes("broken_search_col"));
    expect(fnDiags.length).toBeGreaterThanOrEqual(1);

    // The body search should find the body text inside the DO block's
    // EXECUTE string. Verify the diagnostic range points into the DO block.
    const diag = fnDiags[0]!;
    const sourceText = source.toString("utf8");
    const textAtRange = sourceText.slice(diag.range!.start, diag.range!.end);
    // The range should contain the error column name (if the body search
    // found it inside the EXECUTE string, the lineno offset maps correctly).
    expect(textAtRange).toContain("broken_search_col");
  });

  it("DO block dynamic function with $tag$ body inside $outer$ DO block", async () => {
    const builder = new SchemaBuilder();
    const source = Buffer.from(
      "CREATE TABLE public.dyn_tag_t (id int);\n" +
      "DO $outer$\n" +
      "BEGIN\n" +
      "  EXECUTE 'CREATE FUNCTION public.dyn_tag_fn() RETURNS void " +
      "LANGUAGE plpgsql AS $inner$ BEGIN PERFORM tag_broken_col FROM public.dyn_tag_t; END; $inner$';\n" +
      "END;\n" +
      "$outer$;\n",
      "utf8",
    );

    await builder.applyMigration(pg, source, 0);
    const diags = await builder.validate(pg);
    const fnDiags = diags.filter(d => d.message.includes("tag_broken_col"));
    expect(fnDiags.length).toBeGreaterThanOrEqual(1);

    const diag = fnDiags[0]!;
    const sourceText = source.toString("utf8");
    const textAtRange = sourceText.slice(diag.range!.start, diag.range!.end);
    expect(textAtRange).toContain("tag_broken_col");
  });

  // -------------------------------------------------------------------------
  // 3. End-to-end: AST offset matches byte-search offset
  // -------------------------------------------------------------------------

  it("AST offset and byte-search offset agree for CreateFunctionStmt", async () => {
    const sql = "CREATE FUNCTION public.agree_test(a int) RETURNS int LANGUAGE plpgsql AS $$\nBEGIN\n  RETURN a;\nEND;\n$$;";
    const buf = Buffer.from(sql, "utf8");
    const parsed = await parseSql(sql);
    const stmt = parsed.stmts![0]!.stmt!;
    const stmtStart = parsed.stmts![0]!.stmt_location ?? 0;

    // AST method.
    const astOffset = getBodyOffsetFromAst(stmt, buf, stmtStart);

    // Byte-search method (Buffer.indexOf).
    const bodyText = "\nBEGIN\n  RETURN a;\nEND;\n";
    const byteSearchOffset = buf.indexOf(bodyText, 0, "utf8");

    // Both should find the body at the same byte offset.
    expect(astOffset).toBe(byteSearchOffset);
    console.log("AST offset:", astOffset, "byte-search offset:", byteSearchOffset);
  });

  it("AST offset and byte-search offset agree for single-quoted body", async () => {
    const sql = "CREATE FUNCTION public.agree_single(a int) RETURNS int LANGUAGE sql AS 'SELECT a + 1';";
    const buf = Buffer.from(sql, "utf8");
    const parsed = await parseSql(sql);
    const stmt = parsed.stmts![0]!.stmt!;
    const stmtStart = parsed.stmts![0]!.stmt_location ?? 0;

    const astOffset = getBodyOffsetFromAst(stmt, buf, stmtStart);
    const bodyText = "SELECT a + 1";
    const byteSearchOffset = buf.indexOf(bodyText, 0, "utf8");

    expect(astOffset).toBe(byteSearchOffset);
  });
});
