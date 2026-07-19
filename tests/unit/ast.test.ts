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
