import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { OutputNullability } from "../../../src/query/types.js";
import { catalogCache, type CatalogFor } from "./fixture-catalog.js";
import { parseFixtureDirectives } from "./fixture-args.js";
import { createKillableEvaluator } from "./killable-evaluator.js";

// ---------------------------------------------------------------------------
// Wrap invariance — a verdict must not WEAKEN across a semantics-preserving
// wrapper.
//
// `SELECT * FROM (<q>) w` emits exactly `<q>`'s rows, so any per-column fact
// the engine proves for `<q>` still holds for the wrapper — a column that
// reads notNull inside and nullable outside has lost its claim at a
// REPRESENTATION CROSSING, not at a semantic one. That loss is the August
// crossing-loss bug class in miniature (origins dying at UNION, the CTE
// re-export unable to type computed columns, the alias column list honoured
// by four of its five consumers), and it is
// structurally invisible to the execution oracle, which can falsify a notNull
// claim and can never detect a claim that merely went missing.
//
// So the oracle here is the ENGINE'S OWN MONOTONICITY: analyse each fixture
// statement bare and wrapped, with the same catalog, the same evaluator and
// the same search path, and compare per column BY POSITION. No annotation is
// duplicated — the fixture's claims are not consulted at all, so the suite
// costs nothing to maintain per fixture and covers every fixture
// automatically. Two claim channels are compared:
//
//   notNull     weakening = bare notNull, wrapped nullable;
//   alwaysNull  weakening = bare alwaysNull, wrapped unproven.
//
// The deliberate NON-oracle: strengthening (bare nullable, wrapped notNull)
// is not an error — the wrapper's flat FROM can legitimately know more than
// an arbitrary inner clause context — and presence groups are deliberately
// out of scope here (a group that dissolves across the boundary is a
// CONTRACT change, not a per-column one; it belongs to a later wrapper
// round if a crop justifies it).
//
// Wrapper 1's first crop, measured 2026-08-24: 32 divergences over 432
// fixtures, ALL of one shape — alwaysNull lost, zero notNull weakenings —
// and all one cause: star expansion resolved positionally and never asked
// the alwaysNull channel (`entryColumnAlwaysNull`'s note; the RED cases in
// always-null-red.test.ts and star-alwaysnull-crossing.sql are the capture
// and the graduation). Fixed the same day; the allowlist is EMPTY and must
// stay a finding, never a dumping ground.
//
// Wrapper 2 (CTE) rides along at the cost of one more analysis — same
// embedding, same oracle, and the CTE registration path is a DIFFERENT
// crossing than RangeSubselect's, which is exactly what the August
// re-export bug distinguished. Wrapper 3 (register the body as a VIEW) is
// deliberately deferred: it needs a schema-side mechanism (one view per
// fixture in the snapshot, or a rebuild per fixture) and its analysis reads
// pg_get_viewdef's RE-RENDERING of the statement, which measures the
// deparse round-trip as much as the crossing — scope it when a crop
// justifies it, per the handoff's re-scope gate.
//
// This is not a re-opening of the decided-against "mutation as a generator".
// Blind wrapping buys no coverage and is not meant to — it buys a
// MONOTONICITY oracle over the corpus that already exists.
//
// Skips are counted and NAMED — no silent truncation:
//   - DML fixtures (a RETURNING statement cannot stand in FROM);
//   - fixtures whose statement carries `$n` (the wrapper preserves them, but
//     the engine's param-facts channels read the OUTER statement's clauses,
//     so a bare/wrapped divergence there would measure the param machinery's
//     scoping rather than a crossing — out of wrapper 1's scope);
//   - fixtures the wrapper makes unparseable (none today; counted if ever).
//
// Divergences are allowlisted BY NAME with an adjudicated reason, and the
// list is asserted in both directions: a NEW divergence fails, and an entry
// whose divergence closed fails as stale — the same discipline as
// @unwitnessable. A growing allowlist is the finding, not noise.
// ---------------------------------------------------------------------------

const FIXTURES_DIR = join(__dirname, "fixtures");

/** `file#i (name)` → the adjudicated reason the crossing may erase the claim. */
const WRAP_ALLOWED: Record<string, string> = {};

/** Skips, pinned by name so the corpus cannot silently shrink out of scope. */
const SKIP_KINDS = ["dml", "params", "unparseable-wrapped"] as const;
type SkipKind = (typeof SKIP_KINDS)[number];

describe("wrap invariance (wrappers 1–2: subselect, CTE)", () => {
  const divergences = new Map<string, string>();
  const skipped = new Map<SkipKind, string[]>(SKIP_KINDS.map(k => [k, []]));
  let compared = 0;
  let columnsCompared = 0;
  /** file → error, for wrapped analyses that THREW where bare did not. */
  const wrappedRefusals: string[] = [];

  beforeAll(async () => {
    const pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    const schemaSql = readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8");
    await pg.exec(schemaSql);
    const snapshot = await snapshotCatalog(pg);
    await pg.close();
    const catalogFor: CatalogFor = catalogCache(snapshot);
    const evaluator = await createKillableEvaluator({ schema: schemaSql });

    for (const file of readdirSync(FIXTURES_DIR)
      .filter(f => f.endsWith(".sql") && f !== "schema.sql")
      .sort()) {
      const sql = readFileSync(join(FIXTURES_DIR, file), "utf8");
      const directives = parseFixtureDirectives(sql);

      let stmt;
      try {
        stmt = (await parseSql(sql)).stmts?.[0]?.stmt;
      } catch {
        continue; // the base suites own parse failures
      }
      if (!stmt) continue;
      if (!("SelectStmt" in (stmt as Record<string, unknown>))) {
        skipped.get("dml")!.push(file);
        continue;
      }
      if (/\$\d/.test(sql)) {
        skipped.get("params")!.push(file);
        continue;
      }

      // The raw text is embedded whole — comments included — so the wrapped
      // statement analyses exactly the tree the bare one does, one level
      // down. The newline before the close paren keeps a trailing `-- …`
      // comment from swallowing it.
      const wrappers: [string, string][] = [
        ["subselect", `SELECT * FROM (\n${sql}\n) wrap_w`],
        ["cte", `WITH wrap_w AS (\n${sql}\n) SELECT * FROM wrap_w`],
      ];

      const catalog = await catalogFor(directives.searchPath);
      await evaluator.setSearchPath(directives.searchPath);
      const options = { evaluate: evaluator.evaluate };

      let bare: OutputNullability[];
      try {
        bare = await inferNullability(stmt, catalog, options);
      } catch {
        continue; // a refusal of the bare statement is the base suites' business
      }

      compared++;
      for (const [wrapper, wrappedSql] of wrappers) {
        let wrappedStmt;
        try {
          wrappedStmt = (await parseSql(wrappedSql)).stmts?.[0]?.stmt;
          if (!wrappedStmt) throw new Error("no statement");
        } catch {
          skipped.get("unparseable-wrapped")!.push(`${file} (${wrapper})`);
          continue;
        }
        let wrapped: OutputNullability[];
        try {
          wrapped = await inferNullability(wrappedStmt, catalog, options);
        } catch (e) {
          wrappedRefusals.push(`${file} (${wrapper}): ${(e as Error).message.slice(0, 100)}`);
          continue;
        }

        if (bare.length !== wrapped.length) {
          divergences.set(
            `${file} (${wrapper} shape)`,
            `bare ${bare.length} columns, wrapped ${wrapped.length}`,
          );
          continue;
        }
        for (let i = 0; i < bare.length; i++) {
          columnsCompared++;
          const b = bare[i]!;
          const w = wrapped[i]!;
          const key = `${file}#${i} (${b.name}) [${wrapper}]`;
          if (b.notNull && !w.notNull) {
            divergences.set(key, "notNull weakened to nullable across the wrapper");
          } else if (b.alwaysNull && !w.alwaysNull) {
            divergences.set(key, "alwaysNull lost across the wrapper");
          }
        }
      }
    }
    await evaluator.close();
  }, 600_000);

  afterAll(() => {
    console.log(
      `\nwrap invariance: ${compared} fixtures × 2 analyses, ${columnsCompared} columns — ` +
        `${divergences.size} divergence(s), skips: ` +
        SKIP_KINDS.map(k => `${k}=${skipped.get(k)!.length}`).join(", "),
    );
    if (process.env.WRAP_INVARIANCE_REPORT) {
      console.log(
        `\ndivergences:\n` +
          [...divergences.entries()].map(([k, v]) => `  ${k} — ${v}`).join("\n"),
      );
      console.log(
        `\nskips:\n` +
          SKIP_KINDS.map(k => `  ${k}: ${skipped.get(k)!.join(", ")}`).join("\n"),
      );
    }
  });

  it("no verdict weakens across the wrapper, except the allowlisted crossings", () => {
    const unexplained = [...divergences.entries()]
      .filter(([key]) => !WRAP_ALLOWED[key])
      .map(([key, what]) => `${key} — ${what}`)
      .sort();
    expect(
      unexplained,
      `Claims the subselect wrapper erased. Each is a representation crossing ` +
        `dropping a fact the engine had already proven — the August bug class. ` +
        `Fix the crossing (AGENTS.md rule 1: capture RED, fix, graduate), or ` +
        `allowlist BY NAME with the adjudicated reason the erasure is ` +
        `principled:\n  ${unexplained.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every allowlist entry still names a live divergence", () => {
    const stale = Object.keys(WRAP_ALLOWED)
      .filter(key => !divergences.has(key))
      .sort();
    expect(
      stale,
      `Allowlisted crossings that no longer diverge — the loss was fixed; ` +
        `drop the entry so the fix cannot silently regress:\n  ${stale.join("\n  ")}`,
    ).toEqual([]);
  });

  it("the wrapper never turns an analysable statement into a refusal", () => {
    expect(wrappedRefusals).toEqual([]);
  });

  it("the comparison actually ran", () => {
    // Vacuity guard: a filter bug that skipped everything would pass every
    // assertion above.
    expect(compared).toBeGreaterThan(300);
  });
});
