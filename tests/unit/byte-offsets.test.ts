import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { extractPlpgsqlCheckDiagnostic, type PlpgsqlCheckRow } from "../../src/errors.js";
import { SchemaBuilder } from "../../src/schema-builder.js";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";

// ---------------------------------------------------------------------------
// Unit test: extractPlpgsqlCheckDiagnostic with multi-byte UTF-8
// ---------------------------------------------------------------------------

describe("byte-level offsets with multi-byte UTF-8", () => {
  // The nastiest body: multi-byte UTF-8 characters BEFORE the query that
  // plpgsql_check reports. With String.indexOf, the offset would be too
  // small (UTF-16 code units < UTF-8 bytes). With Buffer.indexOf, it's
  // byte-exact.
  //
  // Characters used:
  //   é (U+00E9) = 2 bytes in UTF-8 (0xC3 0xA9), 1 code unit in UTF-16
  //   ☕ (U+2615) = 3 bytes in UTF-8 (0xE2 0x98 0x95), 1 code unit in UTF-16
  //   日 (U+65E5) = 3 bytes in UTF-8, 1 code unit in UTF-16

  it("String.indexOf vs Buffer.indexOf differ for multi-byte UTF-8", () => {
    const body = "-- café ☕ 日本語\nSELECT badcol FROM t;";
    const query = "SELECT badcol FROM t;";

    const stringIdx = body.indexOf(query);
    const byteIdx = Buffer.from(body, "utf8").indexOf(query, 0, "utf8");

    // String index counts UTF-16 code units:
    //   "-- caf" = 6, "é" = 1, " ☕ " = 3, "日本語" = 3, "\n" = 1 → 14
    expect(stringIdx).toBe(14);

    // Byte offset counts UTF-8 bytes:
    //   "-- caf" = 6, "é" = 2, " ☕ " = 5, "日本語" = 9, "\n" = 1 → 23
    expect(byteIdx).toBe(23);

    // The difference: 9 extra bytes (é=1 extra, ☕=2 extra, 日=2, 本=2, 語=2)
    expect(byteIdx - stringIdx).toBe(9);
  });

  it("extractPlpgsqlCheckDiagnostic maps position through multi-byte UTF-8 body", () => {
    const bodyText = "-- café ☕ 日本語\nSELECT badcol FROM t;";
    const bodyOffset = 100;

    // plpgsql_check row: query is the SQL, position is 1-based byte offset
    // of "badcol" in "SELECT badcol FROM t;" (= 8).
    const row: PlpgsqlCheckRow = {
      functionid: "test",
      lineno: 2,
      statement: "SQL statement",
      sqlstate: "42703",
      message: 'column "badcol" does not exist',
      detail: null,
      hint: null,
      level: "error",
      position: 8,
      query: "SELECT badcol FROM t;",
      context: null,
    };

    // Source buffer: spaces + body text at bodyOffset.
    const source = Buffer.alloc(300, 0x20);
    Buffer.from(bodyText, "utf8").copy(source, bodyOffset);

    const diag = extractPlpgsqlCheckDiagnostic(row, bodyOffset, bodyText, source);

    expect(diag.range).not.toBeNull();

    // The highlighted text should be "badcol", not something before it.
    const highlighted = source.subarray(diag.range!.start, diag.range!.end).toString("utf8");
    expect(highlighted).toBe("badcol");

    // Byte offset: 23 (query start in body) + 7 (position of "badcol" in query)
    // = 30. Plus bodyOffset = 130.
    expect(diag.range!.start).toBe(bodyOffset + 23 + 7);
  });

  it("extractPlpgsqlCheckDiagnostic would be wrong with String.indexOf (documenting the old bug)", () => {
    const bodyText = "-- café ☕ 日本語\nSELECT badcol FROM t;";
    const bodyOffset = 100;

    // Simulate the OLD behavior: String.indexOf for the query search.
    const stringQueryOffset = bodyText.indexOf("SELECT badcol FROM t;");
    const fakePos0IntoBody = stringQueryOffset + 7; // position - 1 = 7
    const fakePos0IntoFile = bodyOffset + fakePos0IntoBody;

    // The old behavior would point at byte 121 (100 + 14 + 7)
    // instead of the correct byte 130 (100 + 23 + 7).
    // Byte 121 is inside the comment "café ☕ 日本語", not "badcol".
    const source = Buffer.from(bodyText, "utf8");
    const wrongText = source.subarray(fakePos0IntoFile - bodyOffset, fakePos0IntoFile - bodyOffset + 6).toString("utf8");
    expect(wrongText).not.toBe("badcol"); // would highlight garbage
  });
});

// ---------------------------------------------------------------------------
// Integration test: SchemaBuilder with multi-byte UTF-8 before body
// ---------------------------------------------------------------------------

describe("SchemaBuilder: byte-correct diagnostics with multi-byte UTF-8", () => {
  let pg: PGlite;

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec("CREATE TABLE public.users (id bigint, email text);");
  });

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  it("diagnostic points at the error inside the body, not into the multi-byte comment", async () => {
    const builder = new SchemaBuilder();
    const sql =
      "CREATE FUNCTION public.utf8_offset_test() RETURNS void\n" +
      "LANGUAGE plpgsql -- café ☕ 日本語\n" +
      "AS $$\n" +
      "BEGIN\n" +
      "  PERFORM nonexistent_column FROM public.users;\n" +
      "END;\n" +
      "$$;\n";
    const source = Buffer.from(sql, "utf8");

    const result = await builder.applyMigration(pg, source, 0);
    // Applies successfully (check_function_bodies=off).
    expect(result.success).toBe(true);

    // Deferred validation catches the error.
    const diags = await builder.validate(pg);
    expect(diags.length).toBeGreaterThanOrEqual(1);

    const diag = diags.find(d => d.message.includes("nonexistent_column"))!;
    expect(diag.original.source).toBe("plpgsql-check");
    expect(diag.range).not.toBeNull();

    // The range must be in the BODY (after $$), not in the COMMENT (before $$).
    const dollarQuotePos = source.indexOf("$$", 0, "utf8");
    expect(diag.range!.start).toBeGreaterThan(dollarQuotePos);

    const highlighted = source.subarray(diag.range!.start, diag.range!.end).toString("utf8");
    expect(highlighted).toContain("nonexistent_column");
  });

  it("works with multi-byte UTF-8 in a block comment before the body", async () => {
    const builder = new SchemaBuilder();
    const sql =
      "CREATE FUNCTION public.utf8_block_comment_test(/* café ☕ 日本語 */ )\n" +
      "RETURNS void LANGUAGE plpgsql AS $$\n" +
      "BEGIN\n" +
      "  PERFORM bad_column FROM public.users;\n" +
      "END;\n" +
      "$$;\n";
    const source = Buffer.from(sql, "utf8");

    await builder.applyMigration(pg, source, 0);

    const diags = await builder.validate(pg);
    expect(diags.length).toBeGreaterThanOrEqual(1);

    const diag = diags.find(d => d.message.includes("bad_column"))!;
    expect(diag.range).not.toBeNull();

    const dollarQuotePos = source.indexOf("$$", 0, "utf8");
    expect(diag.range!.start).toBeGreaterThan(dollarQuotePos);

    const highlighted = source.subarray(diag.range!.start, diag.range!.end).toString("utf8");
    expect(highlighted).toContain("bad_column");
  });

  it("valid function with multi-byte UTF-8 in comment applies successfully", async () => {
    const builder = new SchemaBuilder();
    const source = Buffer.from(
      "CREATE FUNCTION public.utf8_valid_test() RETURNS void\n" +
      "LANGUAGE plpgsql -- café ☕ 日本語\n" +
      "AS $$\n" +
      "BEGIN\n" +
      "  PERFORM 1;\n" +
      "END;\n" +
      "$$;\n",
      "utf8",
    );

    const result = await builder.applyMigration(pg, source, 0);
    expect(result.success).toBe(true);

    const diags = await builder.validate(pg);
    expect(diags).toEqual([]);
  });

  it("multi-byte UTF-8 comment INSIDE the body before the error line", async () => {
    const builder = new SchemaBuilder();
    const sql =
      "CREATE FUNCTION public.utf8inside_body_test() RETURNS void\n" +
      "LANGUAGE plpgsql AS $$\n" +
      "BEGIN\n" +
      "  -- café ☕ 日本語\n" +
      "  PERFORM missing_col FROM public.users;\n" +
      "END;\n" +
      "$$;\n";
    const source = Buffer.from(sql, "utf8");

    await builder.applyMigration(pg, source, 0);

    const diags = await builder.validate(pg);
    expect(diags.length).toBeGreaterThanOrEqual(1);

    const diag = diags.find(d => d.message.includes("missing_col"))!;
    expect(diag.original.source).toBe("plpgsql-check");
    expect(diag.range).not.toBeNull();

    // The range must point at the line with "missing_col", not at the
    // comment line with "café ☕ 日本語" (which is the line before).
    const highlighted = source.subarray(diag.range!.start, diag.range!.end).toString("utf8");
    expect(highlighted).toContain("missing_col");
    expect(highlighted).not.toContain("café");

    // The comment line has extra bytes: é=+1, ☕=+2, 日=+2, 本=+2, 語=+2 = +9 extra bytes.
    // If the offset were computed via string length, it would be 9 bytes too small,
    // and the range would point into the comment line instead of the PERFORM line.
    expect(diag.range!.start).toBeGreaterThan(source.indexOf("-- café", 0, "utf8"));
  });
});
