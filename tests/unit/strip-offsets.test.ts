import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { SchemaBuilder } from "../../src/schema-builder.js";

// ---------------------------------------------------------------------------
// Body offset mapping through CONCURRENTLY stripping
// ---------------------------------------------------------------------------

describe("SchemaBuilder: body offsets through CONCURRENTLY stripping", () => {
  let pg: PGlite;

  beforeAll(async () => {
    pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
  });
  afterAll(async () => { if (!pg.closed) await pg.close(); });

  it("CREATE INDEX CONCURRENTLY before CREATE FUNCTION — diagnostic maps correctly", async () => {
    // The CONCURRENTLY keyword (12 bytes) is stripped from the CREATE INDEX
    // statement. This shifts the CREATE FUNCTION's byte offsets in stripped
    // space. At validation time, mapStrippedToOriginal must correctly remap
    // the body offset through the removal.
    const builder = new SchemaBuilder();
    const source = Buffer.from(
      "CREATE TABLE public.strip_test (id int, val text);\n" +
      "CREATE INDEX CONCURRENTLY idx_strip ON public.strip_test (val);\n" +
      "CREATE FUNCTION public.strip_fn() RETURNS void\n" +
      "LANGUAGE plpgsql AS $$\n" +
      "BEGIN\n" +
      "  PERFORM broken_col FROM public.strip_test;\n" +
      "END;\n" +
      "$$;\n",
      "utf8",
    );

    const result = await builder.applyMigration(pg, source, 0);
    expect(result.success).toBe(true);

    const diags = await builder.validate(pg);
    const fnDiags = diags.filter(d => d.message.includes("broken_col"));
    expect(fnDiags.length).toBeGreaterThanOrEqual(1);

    // The diagnostic range must point at "broken_col" in the ORIGINAL file,
    // not the stripped one. The CONCURRENTLY removal shifted offsets by 12
    // bytes — if the remapping is wrong, the range would point 12 bytes too
    // early (into the CREATE INDEX statement).
    const diag = fnDiags[0]!;
    const sourceText = source.toString("utf8");
    const textAtRange = sourceText.slice(diag.range!.start, diag.range!.end);
    expect(textAtRange).toContain("broken_col");

    // Verify the range is after the $$ (in the function body, not in the
    // CREATE INDEX statement that precedes it).
    const dollarPos = source.indexOf("$$", 0, "utf8");
    expect(diag.range!.start).toBeGreaterThan(dollarPos);
  });

  it("multiple CONCURRENTLY statements before CREATE FUNCTION", async () => {
    const builder = new SchemaBuilder();
    const source = Buffer.from(
      "CREATE TABLE public.multi_strip (id int, a text, b text);\n" +
      "CREATE INDEX CONCURRENTLY idx_a ON public.multi_strip (a);\n" +
      "CREATE INDEX CONCURRENTLY idx_b ON public.multi_strip (b);\n" +
      "CREATE FUNCTION public.multi_strip_fn() RETURNS void\n" +
      "LANGUAGE plpgsql AS $$\n" +
      "BEGIN\n" +
      "  PERFORM missing_from_multi FROM public.multi_strip;\n" +
      "END;\n" +
      "$$;\n",
      "utf8",
    );

    const result = await builder.applyMigration(pg, source, 0);
    expect(result.success).toBe(true);

    const diags = await builder.validate(pg);
    const fnDiags = diags.filter(d => d.message.includes("missing_from_multi"));
    expect(fnDiags.length).toBeGreaterThanOrEqual(1);

    // Two CONCURRENTLY removals (2 × 12 = 24 bytes) must be correctly
    // remapped. If the offset is wrong by 24 bytes, the range would point
    // into one of the CREATE INDEX statements.
    const diag = fnDiags[0]!;
    const sourceText = source.toString("utf8");
    const textAtRange = sourceText.slice(diag.range!.start, diag.range!.end);
    expect(textAtRange).toContain("missing_from_multi");
  });

  it("CONCURRENTLY between two CREATE FUNCTION statements", async () => {
    const builder = new SchemaBuilder();
    const source = Buffer.from(
      "CREATE TABLE public.between_strip (id int);\n" +
      // First function — before any stripping.
      "CREATE FUNCTION public.before_strip_fn() RETURNS void\n" +
      "LANGUAGE plpgsql AS $$\nBEGIN\n  PERFORM id FROM public.between_strip;\nEND;\n$$;\n" +
      // CONCURRENTLY index in between — stripping shifts the second function.
      "CREATE INDEX CONCURRENTLY idx_between ON public.between_strip (id);\n" +
      // Second function — after the stripping. Its offsets must remap.
      "CREATE FUNCTION public.after_strip_fn() RETURNS void\n" +
      "LANGUAGE plpgsql AS $$\n" +
      "BEGIN\n" +
      "  PERFORM bad_after_col FROM public.between_strip;\n" +
      "END;\n" +
      "$$;\n",
      "utf8",
    );

    const result = await builder.applyMigration(pg, source, 0);
    expect(result.success).toBe(true);

    const diags = await builder.validate(pg);

    // First function should be valid.
    const beforeDiags = diags.filter(d => d.message.includes("before_strip_fn"));
    expect(beforeDiags).toEqual([]);

    // Second function should have the error, mapped correctly through the
    // CONCURRENTLY removal.
    const afterDiags = diags.filter(d => d.message.includes("bad_after_col"));
    expect(afterDiags.length).toBeGreaterThanOrEqual(1);

    const diag = afterDiags[0]!;
    const sourceText = source.toString("utf8");
    const textAtRange = sourceText.slice(diag.range!.start, diag.range!.end);
    expect(textAtRange).toContain("bad_after_col");

    // Verify the range is in the second function's body (after the second $$).
    const secondDollarPos = source.indexOf("$$", source.indexOf("after_strip_fn"), "utf8");
    expect(diag.range!.start).toBeGreaterThan(secondDollarPos);
  });

  it("CONCURRENTLY + multi-byte UTF-8 in function body comment", async () => {
    // Combined: CONCURRENTLY stripping (shifts offsets) + multi-byte UTF-8
    // before the body (String.indexOf vs Buffer.indexOf). Both must be
    // handled correctly.
    const builder = new SchemaBuilder();
    const source = Buffer.from(
      "CREATE TABLE public.combined_test (id int);\n" +
      "CREATE INDEX CONCURRENTLY idx_combined ON public.combined_test (id);\n" +
      "CREATE FUNCTION public.combined_fn() RETURNS void -- café ☕ 日本語\n" +
      "LANGUAGE plpgsql AS $$\n" +
      "BEGIN\n" +
      "  PERFORM combined_broken FROM public.combined_test;\n" +
      "END;\n" +
      "$$;\n",
      "utf8",
    );

    const result = await builder.applyMigration(pg, source, 0);
    expect(result.success).toBe(true);

    const diags = await builder.validate(pg);
    const fnDiags = diags.filter(d => d.message.includes("combined_broken"));
    expect(fnDiags.length).toBeGreaterThanOrEqual(1);

    const diag = fnDiags[0]!;
    const sourceText = source.toString("utf8");
    const textAtRange = sourceText.slice(diag.range!.start, diag.range!.end);
    expect(textAtRange).toContain("combined_broken");

    // Range must be in the body (after $$), not in the comment or the index.
    const dollarPos = source.indexOf("$$", 0, "utf8");
    expect(diag.range!.start).toBeGreaterThan(dollarPos);
  });

  it("valid function after CONCURRENTLY — no false positives", async () => {
    const builder = new SchemaBuilder();
    const source = Buffer.from(
      "CREATE TABLE public.valid_after_strip (id int);\n" +
      "CREATE INDEX CONCURRENTLY idx_valid ON public.valid_after_strip (id);\n" +
      "CREATE FUNCTION public.valid_strip_fn() RETURNS void\n" +
      "LANGUAGE plpgsql AS $$\nBEGIN\n  PERFORM id FROM public.valid_after_strip;\nEND;\n$$;\n",
      "utf8",
    );

    const result = await builder.applyMigration(pg, source, 0);
    expect(result.success).toBe(true);

    const diags = await builder.validate(pg);
    const myDiags = diags.filter(d => d.message.includes("valid_strip_fn"));
    expect(myDiags).toEqual([]);
  });
});
