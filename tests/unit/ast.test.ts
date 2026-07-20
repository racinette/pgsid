import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  preprocess,
  parseSql,
  stripConcurrently,
  mapStrippedToOriginal,
  mapOriginalToStripped,
  type StatementFilter,
  type Removal,
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
    const result = preprocess(input, parsed, stripConcurrently());
    expect(result.modified).toBe(false);
    // Same reference — important for skip-if-unchanged consumers.
    expect(result.content).toBe(input);
  });

  it("handles empty input", async () => {
    const parsed = await parseSql("");
    const result = preprocess(Buffer.alloc(0), parsed, stripConcurrently());
    expect(result.modified).toBe(false);
    expect(result.content.length).toBe(0);
  });

  it("coalesces overlapping removals from a single filter", async () => {
    // A filter that returns two overlapping ranges on one statement; the
    // merger must produce a single contiguous removal, not a double-splice.
    const sql = Buffer.from("CREATE INDEX CONCURRENTLY u_idx ON t (id);");
    const parsed = await parseSql(sql.toString("utf8"));

    const overlap: StatementFilter = (ctx) => {
      if (ctx.kind !== "IndexStmt") return;
      // bytes [0, 13) = "CREATE INDEX " and [10, 25) (overlaps by 3)
      return [
        { offset: 0, length: 13 },
        { offset: 10, length: 15 },
      ];
    };
    const result = preprocess(sql, parsed, overlap);
    expect(result.modified).toBe(true);
    // Combined removal of [0, 25) → byte 25 (the space after CONCURRENTLY)
    // remains, then "u_idx ON t (id);".
    expect(result.content.toString("utf8")).toBe(" u_idx ON t (id);");
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
    case "strip_concurrently": return stripConcurrently();
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


// ---------------------------------------------------------------------------
// Index remapping: mapStrippedToOriginal / mapOriginalToStripped
//
// These tests exercise the offset-translation machinery that the apply
// pipeline needs: when PGlite reports an error at position P into the
// stripped content, we must map P back to a position in the original
// migration file so the diagnostic points at the right place in the
// user's editor.
//
// The CONCURRENTLY fixture gives us the realistic case: a small
// in-statement keyword removal that shifts all subsequent positions in
// the same statement.
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

  it("CONCURRENTLY removal: positions before the keyword are identity", async () => {
    // The keyword is in the middle of the statement; "CREATE INDEX " before
    // it must map identically (no shift, since the removal is after them).
    const input = loadFixture("concurrently.sql");
    const parsed = await parseSql(input.toString("utf8"));
    const result = preprocess(input, parsed, stripConcurrently());
    expect(result.modified).toBe(true);

    const strippedCreatePos = result.content.toString("utf8").indexOf("CREATE INDEX");
    expect(strippedCreatePos).toBe(0); // first statement starts at offset 0
    const originalCreatePos = mapStrippedToOriginal(result.removals, strippedCreatePos);
    expect(originalCreatePos).toBe(strippedCreatePos); // identity — before any removal
    expect(input.readUInt8(originalCreatePos)).toBe(0x43); // 'C'
  });
});
