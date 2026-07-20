import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  preprocess,
  parseSql,
  stripDml,
  stripDo,
  stripConcurrently,
  combine,
  mapStrippedToOriginal,
  mapOriginalToStripped,
  type StatementFilter,
  type Removal,
  type StatementContext,
} from "../../src/ast.js";

const fixtureDir = fileURLToPath(new URL("../fixtures/sql", import.meta.url));

function loadFixture(name: string): Buffer {
  return readFileSync(join(fixtureDir, name));
}

function loadFixtureText(name: string): string {
  return loadFixture(name).toString("utf8");
}

/**
 * Run `preprocess` against a fixture and compare byte-for-byte to an
 * expected-output fixture. Returns the PreprocessResult so callers can
 * also assert on `modified` if they want.
 */
async function expectFixtureEquals(
  inputFixture: string,
  expectedFixture: string,
  filter: StatementFilter,
) {
  const input = loadFixture(inputFixture);
  const parsed = await parseSql(input.toString("utf8"));
  const result = preprocess(input, parsed, filter);
  const expected = loadFixture(expectedFixture);
  expect(result.content.equals(expected)).toBe(true);
  return result;
}

describe("preprocess: core", () => {
  it("returns the same buffer reference when nothing is removed", async () => {
    const input = loadFixture("pure_ddl.sql");
    const parsed = await parseSql(input.toString("utf8"));
    const filter = combine(stripDml(), stripDo(), stripConcurrently());
    const result = preprocess(input, parsed, filter);
    expect(result.modified).toBe(false);
    // Same reference — important for skip-if-unchanged consumers.
    expect(result.content).toBe(input);
  });

  it("handles empty input", async () => {
    const parsed = await parseSql("");
    const result = preprocess(Buffer.alloc(0), parsed, stripDml());
    expect(result.modified).toBe(false);
    expect(result.content.length).toBe(0);
  });

  it("coalesces overlapping removals", async () => {
    // Two filters that return overlapping ranges; the merger must
    // produce a single contiguous removal, not a double-splice.
    const sql = Buffer.from("CREATE INDEX CONCURRENTLY u_idx ON t (id);");
    const parsed = await parseSql(sql.toString("utf8"));

    let calls = 0;
    const overlapA: StatementFilter = (ctx) => {
      if (ctx.kind !== "IndexStmt") return;
      calls++;
      // bytes [0, 13) = "CREATE INDEX "
      return [{ offset: 0, length: 13 }];
    };
    const overlapB: StatementFilter = (ctx) => {
      if (ctx.kind !== "IndexStmt") return;
      calls++;
      // bytes [10, 25) (overlaps A by 3 bytes)
      return [{ offset: 10, length: 15 }];
    };
    const result = preprocess(sql, parsed, combine(overlapA, overlapB));
    expect(calls).toBe(2);
    expect(result.modified).toBe(true);
    // Combined removal of [0, 25) → byte 25 (the space after CONCURRENTLY)
    // remains, then "u_idx ON t (id);".
    expect(result.content.toString("utf8")).toBe(" u_idx ON t (id);");
  });
});

describe("preprocess: stripDml", () => {
  it("drops all DML kinds from dml_mixed fixture", async () => {
    const result = await expectFixtureEquals(
      "dml_mixed.sql",
      "dml_mixed.expected.strip_dml.sql",
      stripDml(),
    );
    expect(result.modified).toBe(true);
  });

  it("leaves pure DDL untouched", async () => {
    const input = loadFixture("pure_ddl.sql");
    const parsed = await parseSql(input.toString("utf8"));
    const result = preprocess(input, parsed, stripDml());
    expect(result.modified).toBe(false);
    expect(result.content).toBe(input);
  });

  it("strips the LAST statement correctly (stmt_len backfill)", async () => {
    // Regression: libpg-query omits stmt_len for the last statement.
    // If the backfill breaks, the trailing TRUNCATE here survives.
    const sql = Buffer.from(
      "CREATE TABLE t (id int);\nTRUNCATE t;\n",
    );
    const parsed = await parseSql(sql.toString("utf8"));
    const result = preprocess(sql, parsed, stripDml());
    expect(result.content.toString("utf8")).toBe("CREATE TABLE t (id int);\n");
  });

  it("strips a single DML statement at offset 0 (stmt_location backfill)", async () => {
    // Regression: libpg-query omits stmt_location when it's 0.
    const sql = Buffer.from("SELECT 1;\nCREATE TABLE t (id int);\n");
    const parsed = await parseSql(sql.toString("utf8"));
    const result = preprocess(sql, parsed, stripDml());
    expect(result.content.toString("utf8")).toBe("CREATE TABLE t (id int);\n");
  });
});

describe("preprocess: stripDo", () => {
  it("drops DO blocks", async () => {
    const result = await expectFixtureEquals(
      "do_block.sql",
      "do_block.expected.strip_do.sql",
      stripDo(),
    );
    expect(result.modified).toBe(true);
  });

  it("invokes the onStrip callback with context", async () => {
    const input = loadFixture("do_block.sql");
    const parsed = await parseSql(input.toString("utf8"));
    const stripped: string[] = [];
    const filter = stripDo((ctx) => {
      stripped.push(ctx.kind);
    });
    preprocess(input, parsed, filter);
    expect(stripped).toEqual(["DoStmt"]);
  });
});

describe("preprocess: stripConcurrently", () => {
  it("strips CONCURRENTLY from all three statement kinds", async () => {
    await expectFixtureEquals(
      "concurrently.sql",
      "concurrently.expected.strip_concurrently.sql",
      stripConcurrently(),
    );
  });

  it("leaves non-concurrent statements untouched", async () => {
    const input = loadFixture("concurrently.expected.strip_concurrently.sql");
    const parsed = await parseSql(input.toString("utf8"));
    const result = preprocess(input, parsed, stripConcurrently());
    expect(result.modified).toBe(false);
    expect(result.content).toBe(input);
  });

  it("uses AST location for ReindexStmt (no text scan)", async () => {
    // REINDEX is the only kind where the keyword location is in the AST.
    // Verify the offset comes back pointing exactly at "CONCURRENTLY".
    const sql = "REINDEX INDEX CONCURRENTLY public.users_email_idx;";
    const parsed = await parseSql(sql);
    const buf = Buffer.from(sql, "utf8");
    let captured: Removal[] | undefined;
    const probe: StatementFilter = (ctx) => {
      if (ctx.kind === "ReindexStmt") {
        // Reuse the production filter to extract the removal, then capture.
        const r = stripConcurrently()(ctx);
        captured = r;
        return r;
      }
    };
    preprocess(buf, parsed, probe);
    expect(captured).toBeDefined();
    expect(captured!.length).toBe(1);
    // The removal should start at the byte offset of "CONCURRENTLY" in the source.
    const expectedOffset = sql.indexOf("CONCURRENTLY");
    expect(captured![0]!.offset).toBe(expectedOffset);
    expect(captured![0]!.length).toBe("CONCURRENTLY".length + 1); // +1 trailing space
  });

  it("handles non-ASCII comments before the keyword (latin1 scan)", async () => {
    // Regression: a naïve toString("utf8") + regex approach would return
    // a char offset, not a byte offset, when multibyte chars precede the
    // keyword. latin1 scans are byte-stable.
    const sql = "-- café ☕\nCREATE INDEX CONCURRENTLY u_idx ON t (id);";
    const parsed = await parseSql(sql);
    const buf = Buffer.from(sql, "utf8");
    const result = preprocess(buf, parsed, stripConcurrently());
    expect(result.modified).toBe(true);
    expect(result.content.toString("utf8")).toBe(
      "-- café ☕\nCREATE INDEX u_idx ON t (id);",
    );
  });
});

describe("preprocess: combine", () => {
  it("applies all filters in order", async () => {
    // edge_cases fixture exercises all three concerns at once:
    //   - non-ASCII comment before CONCURRENTLY  (stripConcurrently)
    //   - CREATE INDEX CONCURRENTLY             (stripConcurrently)
    //   - trailing INSERT                       (stripDml, last-stmt backfill)
    await expectFixtureEquals(
      "edge_cases.sql",
      "edge_cases.expected.combined.sql",
      combine(stripDml(), stripConcurrently()),
    );
  });

  it("combine of no-op filters is a no-op", async () => {
    const input = loadFixture("pure_ddl.sql");
    const parsed = await parseSql(input.toString("utf8"));
    // stripDml/stripDo/stripConcurrently all find nothing in pure_ddl.
    const result = preprocess(
      input,
      parsed,
      combine(stripDml(), stripDo(), stripConcurrently()),
    );
    expect(result.modified).toBe(false);
    expect(result.content).toBe(input);
  });
});

describe("preprocess: StatementContext", () => {
  it("exposes correct byte view per statement", async () => {
    // Verify that ctx.bytes is a sub-view of the source at the right offset.
    // Note: ctx.bytes excludes the trailing `;` and whitespace per the
    // preprocess contract — so "SELECT 1" not "SELECT 1;".
    const sql = "CREATE TABLE t (id int);\nSELECT 1;\n";
    const parsed = await parseSql(sql);
    const buf = Buffer.from(sql, "utf8");
    const seen: { kind: string; bytesStartsWith: string }[] = [];
    const probe: StatementFilter = (ctx) => {
      seen.push({
        kind: ctx.kind,
        bytesStartsWith: ctx.bytes.toString("utf8").slice(0, 12),
      });
    };
    preprocess(buf, parsed, probe);
    expect(seen).toEqual([
      { kind: "CreateStmt", bytesStartsWith: "CREATE TABLE" },
      { kind: "SelectStmt", bytesStartsWith: "SELECT 1" },
    ]);
  });

  it("ctx.length excludes trailing ; and whitespace", async () => {
    const sql = "CREATE TABLE t (id int);\n\n\nSELECT 1;   ";
    const parsed = await parseSql(sql);
    const buf = Buffer.from(sql, "utf8");
    const seen: { sourceOffset: number; length: number }[] = [];
    const probe: StatementFilter = (ctx) => {
      seen.push({ sourceOffset: ctx.sourceOffset, length: ctx.length });
    };
    preprocess(buf, parsed, probe);

    // First stmt: "CREATE TABLE t (id int)" — no trailing ;/\n
    const first = seen[0]!;
    expect(buf.subarray(first.sourceOffset, first.sourceOffset + first.length).toString("utf8"))
      .toBe("CREATE TABLE t (id int)");

    // Last stmt: "SELECT 1" — no trailing ; or whitespace.
    const second = seen[1]!;
    expect(buf.subarray(second.sourceOffset, second.sourceOffset + second.length).toString("utf8"))
      .toBe("SELECT 1");
  });
});

// ---------------------------------------------------------------------------
// Table-driven fixture validator: walks tests/fixtures/sql/**, finds every
// `<stem>.sql` paired with a `<stem>.expected.<scenario>.sql`, and asserts
// that running the matching filter against the input produces byte-for-byte
// the expected output. New fixtures + expected files added to disk are
// automatically picked up; no need to register them here.
// ---------------------------------------------------------------------------

function filterForScenario(scenario: string): StatementFilter {
  switch (scenario) {
    case "strip_dml": return combine(stripDml());
    case "strip_do": return combine(stripDo());
    case "strip_dml_and_do": return combine(stripDml(), stripDo());
    case "strip_concurrently": return combine(stripConcurrently());
    case "combined": return combine(stripDml(), stripConcurrently());
    default: throw new Error(`unknown scenario: ${scenario}`);
  }
}

function discoverFixtureCases(): { name: string; input: Buffer; expected: Buffer; filter: StatementFilter }[] {
  const cases: ReturnType<typeof discoverFixtureCases> = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith(".sql")) continue;
      if (entry.name.includes(".expected.")) continue;
      const stem = entry.name.slice(0, -".sql".length);
      for (const sib of readdirSync(dir)) {
        const m = sib.match(/\.expected\.([a-z_]+)\.sql$/);
        if (!m) continue;
        if (!sib.startsWith(stem + ".expected.")) continue;
        cases.push({
          name: join(dir.replace(fixtureDir + "/", ""), stem) + ` [${m[1]}]`,
          input: readFileSync(full),
          expected: readFileSync(join(dir, sib)),
          filter: filterForScenario(m[1]!),
        });
      }
    }
  }
  walk(fixtureDir);
  return cases;
}

describe("preprocess: fixtures", () => {
  for (const c of discoverFixtureCases()) {
    it(c.name, async () => {
      const parsed = await parseSql(c.input.toString("utf8"));
      const result = preprocess(c.input, parsed, c.filter);
      expect(result.content.equals(c.expected)).toBe(true);
    });
  }
});

describe("preprocess: realistic migrations", () => {
  describe("0001_init — schema with FKs, indexes, and a trailing INSERT", () => {
    it("strips the trailing INSERT, preserves all DDL", async () => {
      const result = await expectFixtureEquals(
        "realistic/0001_init.sql",
        "realistic/0001_init.expected.strip_dml.sql",
        stripDml(),
      );
      expect(result.modified).toBe(true);
      // Sanity: the seed INSERT must be gone.
      expect(result.content.toString("utf8")).not.toContain("INSERT INTO public.users");
      // Sanity: the CHECK constraint and FK must survive.
      expect(result.content.toString("utf8")).toContain("CONSTRAINT users_email_check CHECK");
      expect(result.content.toString("utf8")).toContain("FOREIGN KEY (user_id)");
      // Sanity: the trailing comment that annotated the INSERT survives.
      expect(result.content.toString("utf8")).toContain("-- Defaults for convenience.");
    });

    it("preserves the partial index predicate", async () => {
      const input = loadFixture("realistic/0001_init.sql");
      const parsed = await parseSql(input.toString("utf8"));
      const result = preprocess(input, parsed, stripDml());
      expect(result.content.toString("utf8"))
        .toContain("WHERE published_at IS NOT NULL");
    });
  });

  describe("0002_backfill — expand-contract pattern with DML+DO interleaved", () => {
    it("strips DML and DO blocks, preserves ALTER statements", async () => {
      const result = await expectFixtureEquals(
        "realistic/0002_backfill.sql",
        "realistic/0002_backfill.expected.strip_dml_and_do.sql",
        combine(stripDml(), stripDo()),
      );
      expect(result.modified).toBe(true);
      const out = result.content.toString("utf8");
      // The two ALTER statements (ADD COLUMN, SET NOT NULL) survive.
      expect(out).toContain("ADD COLUMN full_name text");
      expect(out).toContain("ALTER COLUMN full_name SET NOT NULL");
      // Both UPDATE backfills are gone.
      expect(out).not.toContain("SET full_name = display_name");
      expect(out).not.toContain("split_part(email, '@', 1)");
      // The DO block (with its SELECT INTO and PERFORM) is gone.
      expect(out).not.toContain("DO $$");
      expect(out).not.toContain("RAISE NOTICE");
      // The standalone audit SELECT is gone.
      expect(out).not.toContain("LIMIT 10");
    });

    it("the trailing SELECT is correctly detected despite being the last statement (stmt_len backfill)", async () => {
      // Regression: the audit SELECT is the final statement. libpg-query
      // omits stmt_len for the last statement, so the backfill in preprocess
      // must derive its range from EOF. If broken, the SELECT survives.
      const input = loadFixture("realistic/0002_backfill.sql");
      const parsed = await parseSql(input.toString("utf8"));
      const result = preprocess(input, parsed, combine(stripDml(), stripDo()));
      expect(result.content.toString("utf8")).not.toMatch(/SELECT id, full_name FROM/);
    });
  });

  describe("0003_enums_funcs_views — function bodies that contain DML", () => {
    it("keeps CREATE FUNCTION bodies intact (does not strip inner SELECTs)", async () => {
      const result = await expectFixtureEquals(
        "realistic/0003_enums_funcs_views.sql",
        "realistic/0003_enums_funcs_views.expected.strip_dml.sql",
        stripDml(),
      );
      const out = result.content.toString("utf8");
      // The SQL function body's inner SELECT count(*) must survive.
      expect(out).toContain("SELECT count(*)::integer");
      // The plpgsql function body's inner SELECT INTO must survive.
      expect(out).toContain("SELECT status INTO v_current");
      // The plpgsql function body's inner UPDATE must survive.
      expect(out).toContain("SET status = 'published', published_at = now()");
      // The plpgsql function body's inner PERFORM must survive.
      expect(out).toContain("PERFORM pg_notify");
    });

    it("strips the top-level audit SELECT (not the function-body ones)", async () => {
      const out = loadFixture("realistic/0003_enums_funcs_views.expected.strip_dml.sql").toString("utf8");
      expect(out).not.toContain("now() AS cutover_time");
    });

    it("strips the trailing UPDATE (the bulk-publish DML)", async () => {
      const out = loadFixture("realistic/0003_enums_funcs_views.expected.strip_dml.sql").toString("utf8");
      expect(out).not.toMatch(/UPDATE public\.posts SET status = 'published' WHERE status = 'draft'/);
    });

    it("parse produces exactly 7 top-level statements (enum, alter, sql-func, plpgsql-func, view, select, update)", async () => {
      const input = loadFixture("realistic/0003_enums_funcs_views.sql");
      const parsed = await parseSql(input.toString("utf8"));
      const kinds = (parsed.stmts ?? []).map((s) => Object.keys(s.stmt ?? {})[0]);
      expect(kinds).toEqual([
        "CreateEnumStmt",
        "AlterTableStmt",
        "CreateFunctionStmt",
        "CreateFunctionStmt",
        "ViewStmt",
        "SelectStmt",
        "UpdateStmt",
      ]);
    });
  });
});

describe("preprocess: peculiar cases", () => {
  describe("DML-looking text inside comments and string literals", () => {
    it("does not strip DML-looking comments", async () => {
      const result = await expectFixtureEquals(
        "peculiar/dml_in_comments_and_strings.sql",
        "peculiar/dml_in_comments_and_strings.expected.strip_dml.sql",
        stripDml(),
      );
      const out = result.content.toString("utf8");
      // All three DML-looking comment lines must survive.
      expect(out).toContain("-- INSERT INTO users (id) VALUES (1)");
      expect(out).toContain("-- UPDATE users SET email='x@y.com'");
      expect(out).toContain("-- DELETE FROM users WHERE 1=1");
      // The DROP-in-comment must also survive (it's a comment, not a statement).
      expect(out).toContain("-- DROP TABLE audit_log;");
    });

    it("does not strip DML-looking string literals inside CHECK constraints", async () => {
      const out = loadFixture("peculiar/dml_in_comments_and_strings.expected.strip_dml.sql").toString("utf8");
      expect(out).toContain("'INSERT INTO audit_log VALUES (1)'");
      expect(out).toContain("'UPDATE audit_log SET note=''");
    });

    it("strips only the real top-level INSERT", async () => {
      const result = await expectFixtureEquals(
        "peculiar/dml_in_comments_and_strings.sql",
        "peculiar/dml_in_comments_and_strings.expected.strip_dml.sql",
        stripDml(),
      );
      // The real seed INSERT must be gone; all the comment/literal ones survived.
      expect(result.content.toString("utf8")).not.toMatch(/^INSERT INTO audit_log/m);
    });
  });

  describe("large multi-line DDL mixed with complex DML", () => {
    it("strips all top-level DML, preserves all DDL", async () => {
      const result = await expectFixtureEquals(
        "peculiar/large_multiline_mixed.sql",
        "peculiar/large_multiline_mixed.expected.strip_dml.sql",
        stripDml(),
      );
      const out = result.content.toString("utf8");
      // The INSERT...SELECT backfill (with the correlated subquery) is gone.
      expect(out).not.toContain("INSERT INTO public.event_summaries");
      // The correlated subquery inside the INSERT is gone too.
      expect(out).not.toContain("SELECT e2.event_type");
      // The trailing audit SELECT is gone.
      expect(out).not.toContain("'migration complete'");
      // All CREATE TABLE / CREATE INDEX / CREATE VIEW survive.
      expect(out).toContain("CREATE TABLE public.events");
      expect(out).toContain("CREATE TABLE public.event_summaries");
      expect(out).toContain("CREATE TABLE public.audit_log");
      expect(out).toContain("CREATE INDEX events_user_id_idx");
      expect(out).toContain("CREATE INDEX events_type_idx");
      expect(out).toContain("CREATE INDEX events_payload_gin");
      expect(out).toContain("CREATE OR REPLACE VIEW public.user_event_stats");
    });

    it("preserves the deeply-nested correlated subquery in the view body", async () => {
      // The view body contains a CTE with a window function and a LEFT JOIN.
      // Verify the body is preserved verbatim (it's part of a CREATE VIEW
      // statement, not a standalone SELECT).
      const out = loadFixture("peculiar/large_multiline_mixed.expected.strip_dml.sql").toString("utf8");
      expect(out).toContain("WITH ranked AS");
      expect(out).toContain("rank() OVER (ORDER BY s.total_events DESC)");
      expect(out).toContain("LEFT JOIN public.event_summaries s ON s.user_id = u.id");
    });
  });

  describe("CRLF line endings and trailing whitespace", () => {
    it("preserves CRLF on kept statements, strips the trailing DML", async () => {
      const input = loadFixture("peculiar/crlf_and_trailing_whitespace.sql");
      const expected = loadFixture("peculiar/crlf_and_trailing_whitespace.expected.strip_dml.sql");
      const parsed = await parseSql(input.toString("utf8"));
      const result = preprocess(input, parsed, stripDml());
      expect(result.content.equals(expected)).toBe(true);
      // Explicit CRLF check: the kept statement's line ending must stay \r\n.
      expect(result.content.toString("utf8")).toContain("CREATE TABLE t1 (id int);   \r\n");
      // The stripped INSERT line (and its CRLF) must be gone.
      expect(result.content.toString("utf8")).not.toContain("INSERT INTO t1");
    });

    it("handles trailing whitespace on kept lines (not just DML lines)", async () => {
      // The DDL line has trailing "   " before its \r\n. We must NOT eat
      // leading whitespace from the kept statement (only trailing ;/\s of
      // the REMOVED statement), so the DDL's trailing spaces survive.
      const input = loadFixture("peculiar/crlf_and_trailing_whitespace.sql");
      const parsed = await parseSql(input.toString("utf8"));
      const result = preprocess(input, parsed, stripDml());
      expect(result.content.toString("utf8")).toContain("(id int);   \r\n");
    });
  });
});

// ---------------------------------------------------------------------------
// Index remapping: mapStrippedToOriginal / mapOriginalToStripped
//
// These tests exercise the offset-translation machinery that the apply
// pipeline needs: when PGlite reports an error at position P into the
// stripped content, we must map P back to a position in the original
// migration file so the diagnostic points at the right place in the
// user's editor.
//
// The DML/DO/CONCURRENTLY fixtures below give us adversarial cases:
// large removals, multiple removals, removals at various positions,
// and the small in-statement CONCURRENTLY removal.
// ---------------------------------------------------------------------------

describe("remapping: unit cases", () => {
  it("identity when no removals", () => {
    const removals: Removal[] = [];
    for (let p = 0; p < 100; p++) {
      expect(mapStrippedToOriginal(removals, p)).toBe(p);
      expect(mapOriginalToStripped(removals, p)).toBe(p);
    }
  });

  it("single removal at start shifts everything", () => {
    // Original: [0, 10) removed, [10, 20) kept.
    // Stripped: [0, 10) = original [10, 20).
    const removals: Removal[] = [{ offset: 0, length: 10 }];
    // Stripped pos 0 → original 10
    expect(mapStrippedToOriginal(removals, 0)).toBe(10);
    // Stripped pos 9 → original 19
    expect(mapStrippedToOriginal(removals, 9)).toBe(19);
    // Inverse: original 10 → stripped 0
    expect(mapOriginalToStripped(removals, 10)).toBe(0);
    // Original 19 → stripped 9
    expect(mapOriginalToStripped(removals, 19)).toBe(9);
  });

  it("single removal in middle splits the range", () => {
    // Original: [0, 10) kept, [10, 25) removed, [25, 35) kept.
    // Stripped: [0, 10) = original [0, 10), [10, 20) = original [25, 35).
    const removals: Removal[] = [{ offset: 10, length: 15 }];
    // Before removal: identity.
    expect(mapStrippedToOriginal(removals, 0)).toBe(0);
    expect(mapStrippedToOriginal(removals, 9)).toBe(9);
    // At the boundary: stripped 10 → original 25 (first byte after removal).
    expect(mapStrippedToOriginal(removals, 10)).toBe(25);
    expect(mapStrippedToOriginal(removals, 19)).toBe(34);
    // Inverse.
    expect(mapOriginalToStripped(removals, 9)).toBe(9);
    expect(mapOriginalToStripped(removals, 25)).toBe(10);
    expect(mapOriginalToStripped(removals, 34)).toBe(19);
  });

  it("single removal at end: preceding bytes are identity", () => {
    const removals: Removal[] = [{ offset: 90, length: 10 }];
    for (let p = 0; p < 90; p++) {
      expect(mapStrippedToOriginal(removals, p)).toBe(p);
      expect(mapOriginalToStripped(removals, p)).toBe(p);
    }
  });

  it("multiple removals accumulate shifts", () => {
    // Original: [0, 5) kept, [5, 10) removed, [10, 20) kept,
    //           [20, 30) removed, [30, 40) kept.
    const removals: Removal[] = [
      { offset: 5, length: 5 },
      { offset: 20, length: 10 },
    ];
    // Stripped layout: [0, 5) = orig [0, 5), [5, 15) = orig [10, 20),
    //                  [15, 25) = orig [30, 40).
    expect(mapStrippedToOriginal(removals, 0)).toBe(0);
    expect(mapStrippedToOriginal(removals, 4)).toBe(4);
    // After first removal: stripped 5 → original 10
    expect(mapStrippedToOriginal(removals, 5)).toBe(10);
    expect(mapStrippedToOriginal(removals, 14)).toBe(19);
    // After second removal: stripped 15 → original 30
    expect(mapStrippedToOriginal(removals, 15)).toBe(30);
    expect(mapStrippedToOriginal(removals, 24)).toBe(39);
    // Inverse.
    expect(mapOriginalToStripped(removals, 4)).toBe(4);
    expect(mapOriginalToStripped(removals, 10)).toBe(5);
    expect(mapOriginalToStripped(removals, 19)).toBe(14);
    expect(mapOriginalToStripped(removals, 30)).toBe(15);
    expect(mapOriginalToStripped(removals, 39)).toBe(24);
  });

  it("position inside a removed range snaps to the byte after it", () => {
    // Defensive: original pos 12 is inside [10, 25). Should map to the
    // first kept byte after the removal, i.e. stripped pos 10.
    const removals: Removal[] = [{ offset: 10, length: 15 }];
    expect(mapOriginalToStripped(removals, 12)).toBe(10);
    expect(mapOriginalToStripped(removals, 24)).toBe(10);
    // Exactly at the end of the removal → first byte after.
    expect(mapOriginalToStripped(removals, 25)).toBe(10);
  });

  it("empty removals list is identity for all positions", () => {
    expect(mapStrippedToOriginal([], 0)).toBe(0);
    expect(mapStrippedToOriginal([], 1000)).toBe(1000);
    expect(mapOriginalToStripped([], 0)).toBe(0);
    expect(mapOriginalToStripped([], 1000)).toBe(1000);
  });
});

describe("remapping: round-trip property on all fixtures", () => {
  // For every fixture case, for every byte index in the STRIPPED content:
  //   1. mapStrippedToOriginal(removals, strippedPos) → originalPos
  //   2. mapOriginalToStripped(removals, originalPos) → strippedPos'
  //   3. assert strippedPos === strippedPos'  (round-trip invariant)
  //   4. assert source[originalPos] === stripped[strippedPos]  (content match)
  //
  // This is the strongest test we can write: it proves the remapping is
  // correct for every single byte in every fixture, including the DML/DO
  // fixtures with large and multiple removals, and the CONCURRENTLY fixture
  // with a small in-statement removal.
  for (const c of discoverFixtureCases()) {
    it(`round-trip: ${c.name}`, async () => {
      const parsed = await parseSql(c.input.toString("utf8"));
      const result = preprocess(c.input, parsed, c.filter);
      if (!result.modified) {
        // No removals → both functions are identity; trivially correct.
        expect(result.removals).toEqual([]);
        return;
      }
      const stripped = result.content;
      // For every byte in the stripped content, round-trip must be stable.
      for (let sp = 0; sp < stripped.length; sp++) {
        const op = mapStrippedToOriginal(result.removals, sp);
        const sp2 = mapOriginalToStripped(result.removals, op);
        expect(sp2).toBe(sp);
        // Content at the mapped original position must match the stripped byte.
        expect(c.input.readUInt8(op)).toBe(stripped.readUInt8(sp));
      }
    });
  }
});

describe("remapping: realistic position-mapping scenarios", () => {
  it("maps a fake error in a DDL statement AFTER a stripped DML back to the original", async () => {
    // 0003_enums_funcs_views: the VIEW comes after the stripped top-level SELECT.
    // A PGlite error pointing at the VIEW in the stripped content must map
    // back to the VIEW's position in the original file.
    const input = loadFixture("realistic/0003_enums_funcs_views.sql");
    const parsed = await parseSql(input.toString("utf8"));
    const result = preprocess(input, parsed, stripDml());
    expect(result.modified).toBe(true);

    const strippedViewPos = result.content.toString("utf8").indexOf("CREATE OR REPLACE VIEW");
    expect(strippedViewPos).toBeGreaterThan(0); // must actually be in the stripped output
    const originalViewPos = mapStrippedToOriginal(result.removals, strippedViewPos);
    // The original file must have "CREATE OR REPLACE VIEW" at the mapped position.
    expect(input.toString("utf8").slice(originalViewPos, originalViewPos + "CREATE OR REPLACE VIEW".length))
      .toBe("CREATE OR REPLACE VIEW");
    // And the inverse must get us back.
    expect(mapOriginalToStripped(result.removals, originalViewPos)).toBe(strippedViewPos);
  });

  it("maps a position BEFORE any removal identically (prefix is untouched)", async () => {
    // dml_mixed: the CREATE TABLE is before any DML, so positions in it
    // must map identically (no shift).
    const input = loadFixture("dml_mixed.sql");
    const parsed = await parseSql(input.toString("utf8"));
    const result = preprocess(input, parsed, stripDml());
    expect(result.modified).toBe(true);

    const strippedTablePos = result.content.toString("utf8").indexOf("CREATE TABLE");
    const originalTablePos = mapStrippedToOriginal(result.removals, strippedTablePos);
    expect(originalTablePos).toBe(strippedTablePos); // identity — before any removal
    expect(input.readUInt8(originalTablePos)).toBe(0x43); // 'C'
  });

  it("CONCURRENTLY removal: maps a position after the keyword correctly", async () => {
    // concurrently.sql: "CREATE INDEX CONCURRENTLY u_idx ..." → "CREATE INDEX u_idx ..."
    // A PGlite error at "u_idx" in the stripped content must map back to
    // "u_idx" in the original — which is 13 bytes later (after "CONCURRENTLY ").
    const input = loadFixture("concurrently.sql");
    const parsed = await parseSql(input.toString("utf8"));
    const result = preprocess(input, parsed, stripConcurrently());
    expect(result.modified).toBe(true);
    expect(result.removals.length).toBe(5); // one per statement

    // First statement: "CREATE INDEX CONCURRENTLY users_email_idx ..."
    const strippedIdxPos = result.content.toString("utf8").indexOf("users_email_idx");
    expect(strippedIdxPos).toBeGreaterThan(0);
    const originalIdxPos = mapStrippedToOriginal(result.removals, strippedIdxPos);
    expect(input.toString("utf8").slice(originalIdxPos, originalIdxPos + "users_email_idx".length))
      .toBe("users_email_idx");
    // The original position must be AFTER "CONCURRENTLY " in the original.
    const originalConcurrentlyPos = input.toString("utf8").indexOf("CONCURRENTLY");
    expect(originalIdxPos).toBeGreaterThan(originalConcurrentlyPos + "CONCURRENTLY".length);
  });

  it("multiple DML removals: positions between removals accumulate shifts correctly", async () => {
    // large_multiline_mixed: has INSERT...SELECT and trailing SELECT stripped.
    // Layout in the original:
    //   ... INSERT...SELECT (removal 1) | CREATE VIEW | CREATE TABLE audit_log | -- comment | SELECT (removal 2)
    //
    // The CREATE VIEW sits AFTER removal 1 but BEFORE removal 2.
    // The audit_log CREATE TABLE also sits AFTER removal 1 but BEFORE removal 2.
    // Both must be shifted by exactly removal 1's length (not the sum),
    // because removal 2 comes AFTER them in the original.
    const input = loadFixture("peculiar/large_multiline_mixed.sql");
    const parsed = await parseSql(input.toString("utf8"));
    const result = preprocess(input, parsed, stripDml());
    expect(result.modified).toBe(true);
    expect(result.removals.length).toBeGreaterThanOrEqual(2);

    // The CREATE OR REPLACE VIEW sits after the first removed INSERT...SELECT.
    const strippedViewPos = result.content.toString("utf8").indexOf("CREATE OR REPLACE VIEW");
    expect(strippedViewPos).toBeGreaterThan(0);
    const originalViewPos = mapStrippedToOriginal(result.removals, strippedViewPos);
    expect(input.toString("utf8").slice(originalViewPos, originalViewPos + "CREATE OR REPLACE VIEW".length))
      .toBe("CREATE OR REPLACE VIEW");

    // The audit_log CREATE TABLE also sits between the two removals.
    const strippedAuditPos = result.content.toString("utf8").indexOf("CREATE TABLE public.audit_log");
    expect(strippedAuditPos).toBeGreaterThan(0);
    const originalAuditPos = mapStrippedToOriginal(result.removals, strippedAuditPos);
    expect(input.toString("utf8").slice(originalAuditPos, originalAuditPos + "CREATE TABLE public.audit_log".length))
      .toBe("CREATE TABLE public.audit_log");

    // Both positions are between removal 1 and removal 2, so their shift
    // is exactly removal 1's length (removal 2 comes after them and
    // doesn't affect their mapping).
    const firstRemovalLen = result.removals[0]!.length;
    expect(originalViewPos - strippedViewPos).toBe(firstRemovalLen);
    expect(originalAuditPos - strippedAuditPos).toBe(firstRemovalLen);

    // Sanity: removal 2 starts AFTER the audit table in the original.
    const secondRemoval = result.removals[1]!;
    expect(secondRemoval.offset).toBeGreaterThan(originalAuditPos);
  });
});
