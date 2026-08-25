import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { deparseSync } from "pgsql-deparser";
import { parseSql } from "../../../src/ast.js";

// ---------------------------------------------------------------------------
// Deparser round-trip: parse → deparse → parse over every fixture.
//
// The query generator constructs ASTs,
// deparses them with `pgsql-deparser`, and re-parses the text so the engine
// and PostgreSQL analyse one identical string. That pipeline is only as
// trustworthy as the deparser, and the failure mode that matters is the
// silent one: SQL that parses cleanly but no longer contains what the AST
// asked for. This suite measures the deparser against the whole fixture
// corpus and pins the result per fixture, so a `pgsql-deparser` bump that
// changes behaviour — fixing a drop, or introducing one — fails loudly with
// the exact fixture names rather than shifting a summary count.
//
// Comparing ASTs requires stripping source byte offsets first: `location`,
// and also `list_start` / `list_end` / `rexpr_list_start` / `rexpr_list_end`,
// which are offsets under names that do not say so. Without that nothing
// matches and the deparser looks broken when it is not.
// ---------------------------------------------------------------------------

const FIXTURES_DIR = join(__dirname, "fixtures");

type Outcome =
  /** parse → deparse → parse reproduces the stripped AST exactly. */
  | "identical"
  /** The deparser threw on a node type it does not handle. */
  | "deparse-threw"
  /** The deparser emitted text PostgreSQL's parser rejects. */
  | "reparse-failed"
  /**
   * The text parsed, but to a different AST — the silent category. Anything
   * here must never be produced by the generator without a corresponding
   * expected-node check (the generator's silent-drop report).
   */
  | "ast-differed";

/**
 * Fixtures known to deviate, measured with pgsql-deparser 18.1.1. Everything
 * absent from this map is expected to round-trip identically.
 *
 * This map is keyed by
 * FIXTURE, which is the wrong key for remembering what the deparser does: the
 * same exploration was performed twice from scratch and reached the same
 * conclusions both times, because the conclusions were only ever recorded
 * here. Read that file before testing whether some construct renders, and add
 * to it rather than restarting.
 *
 * A fixture pinned at a LOUDER outcome also hides every quieter defect in the
 * same file — `xmltable-jsontable` sat at `deparse-threw` for its JSON_TABLE,
 * which masked four separate XMLTABLE defects until 2026-08-23.
 */
const KNOWN_DEVIATIONS: Record<string, Outcome> = {
  // An unhandled node type inside the join tree.
  "xmltable-jsontable": "deparse-threw",
  // The same unhandled `JsonTable` node, in the sweep-4 nested-ordinality
  // fixtures — the whole family deparses no better than the one above.
  "jsontable-sibling-nested-ordinality": "deparse-threw",
  "jsontable-sibling-nested-group": "deparse-threw",
  "jsontable-lone-nested-empty-path": "deparse-threw",
  "jsontable-nested-in-nested-ordinality": "deparse-threw",
  // The same JsonTable node again — the pg-regress ordering pin.
  "jsontable-plain-after-nested": "deparse-threw",
  "jsontable-root-ordinality-with-siblings": "deparse-threw",
  // Emits a stray `[` the parser rejects.
  "expression-node-coverage": "reparse-failed",
  // Same subscripting emission defect, on the slice fixture.
  "array-slices": "reparse-failed",
  // Same defect, and this fixture is where it was MEASURED down to the
  // argument kind: the
  // parentheses survive around a FuncCall, a TypeCast and a SubLink and are
  // dropped around an ARRAY constructor, a CASE and a COALESCE. The closed
  // grammar gates on exactly that, so the fixture carries both sides — and
  // the one unrenderable column is what makes this whole file deviate.
  "closed-grammar-subscript": "reparse-failed",
  // The deparser drops SEARCH / CYCLE clauses; the SQL still parses. These
  // are the silent drops the generator's expected-node checks exist for.
  "recursive-cte-search-clause": "ast-differed",
  "recursive-cte-cycle-clause": "ast-differed",
  // The SQL/JSON dedicated constructor nodes (PG16+) are unhandled.
  "json-constructors": "deparse-threw",
  // Same family: the path-query JsonFuncExpr node is unhandled too.
  "json-exists": "deparse-threw",
  // The explicit window frame `ROWS BETWEEN 2 PRECEDING AND 1 PRECEDING`
  // is re-emitted with its bounds mangled, which PostgreSQL rejects
  // ("frame starting from following row cannot have preceding rows") — a
  // loud failure, not a silent drop, so no expected-node check is owed.
  "window-default-frame": "reparse-failed",
  // The same defect, WIDER than the loud case above and mostly SILENT: a
  // frame survives only
  // when its START bound is not an offset, or its end is CURRENT ROW or an
  // offset FOLLOWING. Three of the four failures produce VALID SQL naming a
  // DIFFERENT frame — so the generator must not request an offset frame bound
  // without an expected-node check. This fixture lands on the loud one.
  "param-window-frame-offset": "reparse-failed",
};

/** Byte offsets that vary with formatting and mean nothing structurally. */
const OFFSET_KEYS = new Set([
  "location",
  "list_start",
  "list_end",
  "rexpr_list_start",
  "rexpr_list_end",
]);

function stripOffsets(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripOffsets);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (OFFSET_KEYS.has(k)) continue;
    out[k] = stripOffsets(v);
  }
  return out;
}

const fixtureFiles = readdirSync(FIXTURES_DIR)
  .filter(f => f.endsWith(".sql") && f !== "schema.sql")
  .sort();

const outcomes = new Map<string, { outcome: Outcome; detail: string }>();

describe("deparser round-trip (pgsql-deparser vs libpg-query)", () => {
  beforeAll(async () => {
    for (const file of fixtureFiles) {
      const name = basename(file, ".sql");
      const sql = readFileSync(join(FIXTURES_DIR, file), "utf8");
      const original = await parseSql(sql);

      let regenerated: string;
      try {
        regenerated = deparseSync(original);
      } catch (e) {
        outcomes.set(name, { outcome: "deparse-threw", detail: (e as Error).message });
        continue;
      }

      try {
        const reparsed = await parseSql(regenerated);
        const before = stripOffsets(original.stmts?.map(s => s.stmt) ?? []);
        const after = stripOffsets(reparsed.stmts?.map(s => s.stmt) ?? []);
        outcomes.set(name, {
          outcome: JSON.stringify(before) === JSON.stringify(after) ? "identical" : "ast-differed",
          detail: regenerated,
        });
      } catch (e) {
        outcomes.set(name, { outcome: "reparse-failed", detail: (e as Error).message });
      }
    }
  }, 120_000);

  for (const file of fixtureFiles) {
    const name = basename(file, ".sql");
    it(name, () => {
      const r = outcomes.get(name)!;
      const expected: Outcome = KNOWN_DEVIATIONS[name] ?? "identical";
      expect(
        r.outcome,
        `deparser behaviour changed for this fixture (was pinned as ` +
          `"${expected}", now "${r.outcome}"). If a pgsql-deparser upgrade ` +
          `fixed or introduced a deviation, update KNOWN_DEVIATIONS — and if ` +
          `the new outcome is "ast-differed", find what got dropped, because ` +
          `the generator must not request that construct without an ` +
          `expected-node check.\n${r.detail}`,
      ).toBe(expected);
    });
  }

  it("prints the round-trip table", () => {
    const counts = new Map<Outcome, number>();
    for (const { outcome } of outcomes.values()) {
      counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
    }
    console.log(
      `\ndeparser round-trip over ${outcomes.size} fixtures:\n` +
        `  identical:      ${counts.get("identical") ?? 0}\n` +
        `  deparse threw:  ${counts.get("deparse-threw") ?? 0}\n` +
        `  reparse failed: ${counts.get("reparse-failed") ?? 0}\n` +
        `  AST differed:   ${counts.get("ast-differed") ?? 0}`,
    );
  });
});
