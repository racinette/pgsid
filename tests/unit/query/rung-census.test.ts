import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { inferNullabilityTraced } from "../../../src/query/nullability-walk.js";
import type { TraceNode } from "../../../src/query/types.js";
import {
  extractConcludeRungs,
  declaredRung,
  matchRung,
  type RungPattern,
} from "./rung-extractor.js";
import { catalogCache, type CatalogFor } from "./fixture-catalog.js";
import { parseFixtureDirectives } from "./fixture-args.js";
import { createKillableEvaluator } from "./killable-evaluator.js";
import { GRAMMAR_SAMPLER } from "./grammar-sampler.js";

// ---------------------------------------------------------------------------
// Decision-site reach — the rung census.
//
// `capability-reach.test.ts` holds a both-directions floor over what the walk
// ASKS the catalog. This is the same instrument one level up: over what the
// walk CONCLUDES. Every verdict site in the walk stamps
// `trace.conclude(decision, reason)`, and the reason strings are the natural
// rung identifiers — so the rung inventory is EXTRACTED FROM THE SOURCE
// (rung-extractor.ts) rather than hand-maintained, and the census runs the
// corpus under `inferNullabilityTraced` and holds floors over the observed
// set. No engine change; the trace was already there.
//
// What a row here means:
//
//   - a FLOOR rung going cold is a regression: a rule lost its only corpus
//     reach, or the rule was rewritten and its rung renamed (update the key —
//     the extraction already carries the new spelling as an undeclared rung).
//   - an observed rung the floor does not declare is drift in the direction
//     that matters most: a NEW RULE landed with corpus reach nobody recorded,
//     or — worse — an existing rule started firing where it did not before.
//     Acknowledging it costs one line; silence would cost the record.
//   - a rung in DARK is a rule the corpus never fires. Each entry names what
//     it is waiting for, and per the project's rule an "unreachable" there is
//     a claim the next reader should re-test.
//   - a rung firing with only ONE outcome where both exist is recorded in the
//     floor as that outcome — the one-outcome list is readable directly from
//     the floor's values, which is the capability-reach treatment: the other
//     direction is a case nobody has invented yet.
//
// The outcome direction is part of the floor because most conclude sites
// spell their two outcomes as two reason strings (the ternary), so a rung key
// usually carries exactly one direction BY CONSTRUCTION — `"both"` marks the
// sites whose one string serves both verdicts.
//
// Boundary, recorded rather than implied:
//
//   - the presence fixpoint's inner rules (`resolveJoinImplications`) and the
//     guard channels run at SCOPE BUILD, outside any column's trace, and emit
//     no conclude — so they are invisible to this census by construction.
//     Extending ITrace into the fixpoint is an ENGINE change and is not
//     authorized here; their reach is held by the mechanism fixtures
//     (promotion-guarded-fixpoint.sql and siblings) until someone charters
//     that.
//   - param-nullability's mechanisms are untraced for the same reason; the
//     fallback census covers their fallback class, and param-mechanism.test.ts
//     their conclusions.
//
// The corpus is the hand fixtures plus the grammar sampler, walked WITH the
// evaluator on (killable, per AGENTS.md rule 8) — the evaluation-informed
// rungs are rungs too, and a pass without `evaluate` would leave every one of
// them dark by harness construction, which is exactly the mistake the r_ce
// register entry records.
//
// RUNG_CENSUS_REPORT=1 prints every rung with outcomes and reaching files.
// ---------------------------------------------------------------------------

const FIXTURES_DIR = join(__dirname, "fixtures");
const WALK_SOURCE = join(__dirname, "..", "..", "..", "src", "query", "nullability-walk.ts");

type Outcome = "true" | "false" | "both";

describe("rung census (decision-site reach)", () => {
  let patterns: RungPattern[];
  let opaqueSites: { line: number; expr: string }[];
  /** rung key → outcomes observed over the corpus. */
  const observed = new Map<string, Set<string>>();
  /** rung key → files that fired it (bounded, for the report). */
  const reachedBy = new Map<string, string[]>();
  /** reasons no extracted pattern matches — extraction drift, must stay []. */
  const unmatched = new Map<string, string>();
  let statements = 0;

  beforeAll(async () => {
    const extraction = extractConcludeRungs(readFileSync(WALK_SOURCE, "utf8"));
    patterns = [...extraction.patterns, ...EXTRA_RUNGS.map(declaredRung)];
    opaqueSites = extraction.opaque;

    const pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    const schemaSql = readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8");
    await pg.exec(schemaSql);
    const snapshot = await snapshotCatalog(pg);
    await pg.close();
    const catalogFor: CatalogFor = catalogCache(snapshot);

    const evaluator = await createKillableEvaluator({ schema: schemaSql });

    const corpus: { file: string; sql: string; searchPath: string[] | null }[] = [
      ...GRAMMAR_SAMPLER.map((sql, i) => ({
        file: `sampler#${i}`,
        sql,
        searchPath: null,
      })),
      ...readdirSync(FIXTURES_DIR)
        .filter(f => f.endsWith(".sql") && f !== "schema.sql")
        .map(f => {
          const sql = readFileSync(join(FIXTURES_DIR, f), "utf8");
          return { file: f, sql, searchPath: parseFixtureDirectives(sql).searchPath };
        }),
    ];

    const record = (file: string, node: TraceNode): void => {
      const rung = matchRung(patterns, node.reason);
      if (!rung) {
        if (node.reason !== "" && !unmatched.has(node.reason)) {
          unmatched.set(node.reason, file);
        }
      } else {
        const outcomes = observed.get(rung.key) ?? new Set<string>();
        outcomes.add(String(node.decision));
        observed.set(rung.key, outcomes);
        const files = reachedBy.get(rung.key) ?? [];
        if (files.length < 4 && !files.includes(file)) files.push(file);
        reachedBy.set(rung.key, files);
      }
      for (const child of node.children) record(file, child);
    };

    for (const { file, sql, searchPath } of corpus) {
      let stmt;
      try {
        stmt = (await parseSql(sql)).stmts?.[0]?.stmt;
      } catch {
        continue; // a fixture the parser refuses is the base suite's business
      }
      if (!stmt) continue;
      const catalog = await catalogFor(searchPath);
      await evaluator.setSearchPath(searchPath);
      statements++;
      try {
        const columns = await inferNullabilityTraced(stmt, catalog, undefined, {
          evaluate: evaluator.evaluate,
        });
        for (const c of columns) if (c.trace) record(file, c.trace);
      } catch {
        // a refusal's partial trace is not returned; nothing to record
      }
    }
    await evaluator.close();
  }, 600_000);

  afterAll(() => {
    const cold = patterns.filter(p => !observed.has(p.key));
    console.log(
      `\nrung census: ${patterns.length} rungs extracted from ${opaqueSites.length === 0 ? "every" : "most"} ` +
        `conclude site — ${observed.size} fired over ${statements} statements, ${cold.length} dark.`,
    );
    if (process.env.RUNG_CENSUS_REPORT) {
      const lines = [...observed.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, outcomes]) => {
          const o = [...outcomes].sort().join("+");
          return `  [${o}] ${JSON.stringify(key)}\n      ${(reachedBy.get(key) ?? []).join(", ")}`;
        });
      console.log(`\nfired rungs:\n${lines.join("\n")}`);
      console.log(
        `\ndark rungs:\n` +
          cold
            .map(p => `  ${JSON.stringify(p.key)} (line ${p.lines.join(", ")})`)
            .join("\n"),
      );
      if (unmatched.size) {
        console.log(
          `\nunmatched reasons:\n` +
            [...unmatched.entries()].map(([r, f]) => `  ${JSON.stringify(r)} (${f})`).join("\n"),
        );
      }
    }
  });

  it("every variable-reason conclude site is a declared one", () => {
    // A site that passes its reason by variable is invisible to the source
    // extraction, so its strings must be DECLARED in EXTRA_RUNGS — and the
    // allowlist is keyed by the reason EXPRESSION's own text, which survives
    // the line drift this file's header warns about. A new variable-reason
    // site fails here until its strings are declared.
    const undeclared = opaqueSites
      .map(s => s.expr)
      .filter(expr => !OPAQUE_REASON_EXPRS.includes(expr))
      .sort();
    expect(
      undeclared,
      `conclude sites whose reason is a variable the census does not know. ` +
        `Add each variable's possible strings to EXTRA_RUNGS and the ` +
        `expression to OPAQUE_REASON_EXPRS:\n  ${undeclared.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every observed reason maps to an extracted rung", () => {
    expect(
      [...unmatched.entries()].map(([r, f]) => `${JSON.stringify(r)} (${f})`),
      `Reasons the source extraction does not know. Either the extractor ` +
        `missed a spelling (fix rung-extractor.ts) or a reason is built ` +
        `somewhere other than its conclude call:`,
    ).toEqual([]);
  });

  it("the floor holds: every declared rung fires with its declared outcomes, and nothing fires undeclared", () => {
    const observedFlat: Record<string, Outcome> = {};
    for (const [key, outcomes] of observed) {
      observedFlat[key] =
        outcomes.size === 2 ? "both" : ([...outcomes][0] as Outcome);
    }
    expect(observedFlat).toEqual(FLOOR);
  });

  it("every dark rung is triaged, and every triage entry is still dark and still extracted", () => {
    const extractedKeys = new Set(patterns.map(p => p.key));
    const cold = patterns.filter(p => !observed.has(p.key)).map(p => p.key);

    const untriaged = cold.filter(k => !(k in DARK_RUNGS)).sort();
    expect(
      untriaged,
      `Rungs the corpus never fires, with no triage. Either write the input ` +
        `that reaches each (AGENTS.md rule 1 — "nothing in the corpus would ` +
        `move" means INVENT the case), or record what it is waiting for:\n  ` +
        untriaged.map(k => JSON.stringify(k)).join("\n  "),
    ).toEqual([]);

    const stale = Object.keys(DARK_RUNGS)
      .filter(k => observed.has(k))
      .sort();
    expect(
      stale,
      `Triaged as dark, but the corpus now fires them — move each to FLOOR:\n  ` +
        stale.map(k => JSON.stringify(k)).join("\n  "),
    ).toEqual([]);

    const orphaned = Object.keys(DARK_RUNGS)
      .filter(k => !extractedKeys.has(k))
      .sort();
    expect(
      orphaned,
      `Triaged rungs the source no longer contains — the rule was removed or ` +
        `renamed; delete the entry or re-key it:\n  ` +
        orphaned.map(k => JSON.stringify(k)).join("\n  "),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The floor: every rung the corpus fires, with the outcome direction(s) it
// fires in. `⟨*⟩` is the extraction's wildcard for an interpolated fragment.
// Filled by measurement (RUNG_CENSUS_REPORT=1) and asserted as an equality —
// a rung going cold and a rung firing undeclared both fail, and a rung whose
// OUTCOME SET changes fails too, which is what catches a two-direction rule
// quietly losing one side's coverage.
// ---------------------------------------------------------------------------

/**
 * Reason expressions the extractor is ALLOWED to find opaque — each passes a
 * variable whose possible strings EXTRA_RUNGS declares. Anything else fails.
 */
const OPAQUE_REASON_EXPRS: string[] = ["why"];

/**
 * The strings behind the variable-reason sites (`escape` in the CTE/subquery
 * column resolution — the origin-entailment and presence-pin escapes, built
 * once and concluded at four sites). Declared by hand because no extraction
 * can see them; self-policing per declaredRung's note.
 */
const EXTRA_RUNGS: string[] = [
  "origin CHECK entailment through the CTE/subquery → notNull",
  "⟨*⟩ is pinned here and shares this column's presence group, so the inner " +
    "row is present on every returned row → notNull",
];

const FLOOR: Record<string, Outcome> = {
  "$⟨*⟩ rejects NULL at Bind, so any returned row proves it non-null": "true",
  "$⟨*⟩ rejects NULL on every path that returns a row, so this row proves it non-null": "true",
  "'⟨*⟩' carries a recorded non-total signature and the operand types did not narrow it away → nullable": "false",
  "ANY/ALL over an opaque array — elements may be NULL → nullable": "false",
  "ARRAY constructor → never NULL": "true",
  "ARRAY subquery constructor, never NULL": "true",
  "ARRAY[...] is never NULL, and ⟨*⟩() is non-null when its first argument is": "true",
  "ARRAY[...] is never NULL, and ⟨*⟩() never returns NULL for any arguments": "true",
  "CASE without ELSE → NULL when no branch matches": "false",
  "CHECK-constraint entailment (⟨*⟩) → notNull": "true",
  "COLLATE preserves arg nullability": "true",
  "CTE/subquery col '⟨*⟩' notNull + join ⟨*⟩": "both",
  "CTE/subquery col '⟨*⟩' nullable + join ⟨*⟩": "false",
  "CTE/subquery column[⟨*⟩] notNull + join ⟨*⟩": "true",
  "CTE/subquery column[⟨*⟩] nullable + join ⟨*⟩": "false",
  "DELETE can match zero rows -> nullable": "false",
  "ELSE result is nullable → CASE nullable": "false",
  "EXISTS returns bool, never NULL": "true",
  "GROUP BY makes the group non-empty and ⟨*⟩() over non-null input is non-null": "true",
  "GROUPING() returns a bitmask, never NULL": "true",
  "INSERT ... ON CONFLICT can return zero rows -> nullable": "false",
  "INSERT RETURNING first column: notNull": "true",
  "INSERT RETURNING first column: nullable": "false",
  "INSERT without RETURNING -> nullable": "false",
  "INSERT...SELECT can return zero rows -> nullable": "false",
  "IS NULL / IS NOT NULL → always returns bool": "true",
  "IS [NOT] DISTINCT FROM → always a non-null boolean": "true",
  "IS [NOT] TRUE/FALSE/UNKNOWN → always returns bool": "true",
  "JSON_EXISTS over a non-null context is a plain boolean (ON ERROR defaults FALSE)": "both",
  "JSON_VALUE/JSON_QUERY map a found JSON null to SQL NULL through every handler; UNKNOWN ON ERROR does the same for JSON_EXISTS → nullable": "false",
  "NOT → recurse into arg": "both",
  "NULL literal": "false",
  "NULLIF returns NULL when the operands are equal": "false",
  "NamedArgExpr → recurse into arg": "both",
  "ROW constructor → never NULL": "true",
  "SELECT first column: notNull": "true",
  "SELECT first column: nullable": "false",
  "SQL value function is always defined": "true",
  "SQL/JSON value-list constructor always produces a container → notNull": "true",
  "UPDATE can match zero rows -> nullable": "false",
  "VALUES first column: notNull": "true",
  "VALUES first column: nullable": "false",
  "VARIADIC passes the parameter as one array, and a NULL array yields NULL → nullable": "false",
  "WHEN[⟨*⟩] guard evaluated TRUE → later arms and ELSE never run; every reachable branch non-null → CASE non-null": "true",
  "WHEN[⟨*⟩] result is nullable → CASE nullable": "false",
  "WHERE guarantee on this column → notNull": "true",
  "XMLELEMENT always constructs an element → notNull": "true",
  "XmlExpr → conservative nullable": "false",
  "a NULL array or bound makes the slice NULL → nullable": "false",
  "a constant index inside a literal ARRAY[...] selects element ⟨*⟩, which is non-null": "true",
  "a non-empty ARRAY[...] has a dimension 1 → array_length is non-null": "true",
  "a schema on the analysis search path exists → CURRENT_SCHEMA has an answer": "true",
  "a surviving signature of ⟨*⟩() carries no totality claim → nullable": "false",
  "a validated CHECK plus row-implied evidence entails `col IS NOT NULL`": "true",
  "aggregate returns NULL over zero rows": "false",
  "alias '⟨*⟩' not found → nullable": "false",
  "all args nullable → COALESCE nullable": "false",
  "all args nullable → GREATEST/LEAST nullable": "false",
  "all operands non-null → AND/OR yields a non-null boolean": "true",
  "an operand is nullable → three-valued logic → nullable": "false",
  "arg[⟨*⟩] is non-null → COALESCE is non-null": "true",
  "arg[⟨*⟩] is non-null → GREATEST/LEAST skips NULLs → non-null": "true",
  "body can return zero rows -> nullable": "false",
  "body's INSERT is refused (DO INSTEAD rule) -> nullable": "false",
  "branch condition guarantees this column is non-null → notNull": "true",
  "can return zero rows -> nullable": "false",
  "cast preserves arg nullability": "both",
  "cast to NOT NULL domain → never NULL (throws instead)": "true",
  "catalog.notNull=⟨*⟩ && join ⟨*⟩ (OPTIONAL → nullable)": "false",
  "catalog.notNull=⟨*⟩ && join ⟨*⟩": "both",
  "closed subtree evaluated non-null": "true",
  "closed subtree evaluated to NULL": "false",
  "column is collapsed by ROLLUP/CUBE/GROUPING SETS → NULL in super-aggregate rows": "false",
  "conservative nullable": "false",
  "count never returns NULL": "true",
  "custom operator dispatched through its backing function → notNull": "true",
  "custom operator dispatched through its backing function → nullable": "false",
  "element ⟨*⟩ of the literal array is itself nullable": "false",
  "element/field/jsonb subscript → correctly nullable (out-of-range and missing-key are NULL)": "false",
  "empty group, NULL sort input or NULL direct arg can yield NULL → nullable": "false",
  "every branch and ELSE non-null → CASE non-null": "true",
  "every candidate returns a NOT NULL domain → notNull whichever runs": "true",
  "every returned row passed a WHERE conjunct that is only TRUE with $⟨*⟩ non-null": "true",
  "every surviving candidate of '⟨*⟩' is total and all operands non-null → non-null": "true",
  "every surviving candidate of '⟨*⟩' is total and the operand non-null → non-null": "true",
  "every surviving signature of ⟨*⟩() is total: non-null arguments → non-null result": "true",
  "every surviving signature of ⟨*⟩() over is total: non-null arguments → non-null result": "true",
  "generation expression over this row's columns → notNull": "true",
  "literal is not NULL": "true",
  "lockstep SRF expansion NULL-pads the shorter call after it returned → nullable": "false",
  "merge_action() names the arm every returned row came from → notNull": "true",
  "merged USING/NATURAL column '⟨*⟩' → notNull": "true",
  "merged USING/NATURAL column '⟨*⟩' → nullable": "false",
  "no derivation reaches `col IS NOT NULL`": "false",
  "no derivation reaches the origin column": "false",
  "no schema on the analysis search path exists → CURRENT_SCHEMA is NULL": "false",
  "non-empty group, non-null sort input and direct args → notNull": "true",
  "operand of '⟨*⟩' is nullable → nullable": "false",
  "operator '⟨*⟩' keeps a non-total or unvouched candidate for these operand types → nullable": "false",
  "operator '⟨*⟩' keeps a non-total or unvouched candidate for this operand type → nullable": "false",
  "operator '⟨*⟩' may return NULL for non-null inputs → nullable": "false",
  "origin CHECK entailment through the CTE/subquery → notNull": "true",
  "origin CHECK entailment through the view → notNull": "true",
  "query-level param → conservative nullable": "false",
  "required alternative + non-null per stored row": "true",
  "returns NOT NULL domain -> PG enforces at call boundary": "true",
  "single-row subquery propagates inner result: notNull": "true",
  "single-row subquery propagates inner result: nullable": "false",
  "slice of a non-null array with non-null bounds clamps, never NULLs → notNull": "true",
  "strict by consensus, and an arg is nullable": "false",
  "strict conversion: NULL in → NULL out, else a value": "both",
  "strict: at least one arg nullable": "false",
  "table-function column '⟨*⟩' notNull (domain) + join ⟨*⟩": "both",
  "table-function column '⟨*⟩' nullable (row type carries no constraints) + join ⟨*⟩": "false",
  "the cast to ⟨*⟩ can return NULL for non-null input": "false",
  "the origin table's validated CHECK plus this scope's evidence entails non-null": "true",
  "the written value is non-null → notNull in RETURNING": "true",
  "total operator '⟨*⟩' with non-null operands → non-null": "true",
  "type-narrowed operator dispatched through its backing function → notNull": "true",
  "type-narrowed operator dispatched through its backing function → nullable": "false",
  "unhandled node type '⟨*⟩' → conservative nullable": "false",
  "unknown ordered-set aggregate → conservative nullable": "false",
  "unnest column '⟨*⟩' follows its array constructor's elements + join ⟨*⟩": "true",
  "view column[⟨*⟩] notNull + join ⟨*⟩": "true",
  "view column[⟨*⟩] nullable + join ⟨*⟩": "false",
  "window frame may be empty or the offset may fall outside the partition → nullable": "false",
  "⟨*⟩ is never NULL for a ⟨*⟩, infinite input included": "true",
  "⟨*⟩ is pinned here and shares this column's presence group, so the inner row is present on every returned row → notNull": "true",
  "⟨*⟩ of a ⟨*⟩ is total, but the argument is nullable": "false",
  "⟨*⟩ over a literal array with no NULL elements → non-null boolean": "true",
  "⟨*⟩ with a nullable left operand → nullable": "false",
  "⟨*⟩ with a nullable operand or array element → nullable": "false",
  "⟨*⟩ with a nullable operand → nullable": "false",
  "⟨*⟩ with all operands non-null → non-null boolean": "true",
  "⟨*⟩() WITHIN GROUP assigns the hypothetical row a position → never NULL": "true",
  "⟨*⟩() assigns a value to every row → never NULL": "true",
  "⟨*⟩() has a nullable argument → nullable": "false",
  "⟨*⟩() is a strict SRF: a nullable argument subtracts ROWS, not values": "true",
  "⟨*⟩() is non-null when its first argument is": "true",
  "⟨*⟩() is total: non-null arguments → non-null result": "true",
  "⟨*⟩() never returns NULL (every surviving signature)": "true",
  "⟨*⟩() over has a nullable argument → nullable": "false",
  "⟨*⟩() over the never-empty default frame with non-null input → notNull": "true",
  "⟨*⟩() with a nullable first argument → nullable": "false",
  "⟨*⟩()'s INITCOND is non-null and its fold preserves that": "true",
  "⟨*⟩: a NULL from the subquery makes the result NULL when nothing matches": "false",
  "⟨*⟩: both operands and every subquery column are non-null → non-null boolean": "true",
};

/**
 * Rungs the corpus never fires. Each entry says what the rung is waiting for
 * — a fixture that would reach it, or the measured reason it cannot be
 * reached (which, per the project's rule, is the claim to re-test).
 *
 * Three categories recur, spelled out once here and referenced by name:
 *
 * INSTRUMENT-BLIND — the branch IS corpus-reached, and only under the
 * untraced inner analysis: `analyzeSqlFunctionReturnTraced` concludes a
 * traced SUMMARY rung ("SELECT first column: …") over an inner statement
 * walk that runs with the noop trace (measured: concat_val's `SELECT $2`
 * body and pass_two's named-param body both conclude with no function-arg
 * reason anywhere in the tree). The trace channel structurally cannot see
 * these; tracing body innards is an engine change the handoff does not
 * authorize, and the summary rungs in the FLOOR are the observable face of
 * the same conclusions.
 *
 * DEFENSIVE — the branch fires only on statements PostgreSQL itself rejects
 * (an unresolvable or ambiguous name, an empty scalar subquery, a cross-
 * database reference) or on trees no parser emits (a CASE arm without a
 * result). The corpus is PREPARE-gated by design — PGlite is the referee —
 * so no valid input can arrive; every one is a refusal that can only
 * under-claim. Re-test if a consumer ever feeds the walk unprepared SQL.
 *
 * CAPTURE-BACKSTOP — the branch answers only if a snapshot capture loses
 * rows, which is exactly when it must still be right; unreachable while the
 * capture is whole (the fallback census carries the same triage for the
 * name-table twins, with the measurement).
 */
const DARK_RUNGS: Record<string, string> = {
  "function arg $⟨*⟩ → notNull": "INSTRUMENT-BLIND — every $n-bodied sql function reaches it untraced.",
  "function arg $⟨*⟩ → nullable": "INSTRUMENT-BLIND — as above, nullable direction.",
  "function param '⟨*⟩' → notNull": "INSTRUMENT-BLIND — named-param bodies (pass_two) reach it untraced.",
  "function param '⟨*⟩' → nullable": "INSTRUMENT-BLIND — as above.",
  "function param '⟨*⟩' (deparsed qualified) → notNull":
    "INSTRUMENT-BLIND — multi_stmt_atomic's qualified-parameter body reaches it untraced.",
  "function param '⟨*⟩' (deparsed qualified) → nullable": "INSTRUMENT-BLIND — as above.",
  "cycle in function body recursion -> nullable":
    "INSTRUMENT-BLIND, twice over: the analyzing set is empty at every traced " +
    "top-level dispatch, so a cycle can only be re-entered from the untraced " +
    "inner walk — and the schema carries no recursive sql function to enter " +
    "one with (creating one needs the CREATE OR REPLACE dance; PostgreSQL " +
    "validates a body's references at creation).",

  "CASE branch with no result → nullable":
    "DEFENSIVE — the parser always populates CaseWhen.result.",
  "NOT with no arg → nullable": "DEFENSIVE — the parser always populates BoolExpr.args.",
  "strict JSON/XML conversion with no operand → conservative":
    "DEFENSIVE — the parser always populates the operand.",
  "SetToDefault → conservative nullable":
    "DEFENSIVE — DEFAULT appears only as an UPDATE/INSERT assignment source, " +
    "and the DML analysis answers those from the catalog flag and the " +
    "written-value maps without dispatching the node (measured: UPDATE ck SET " +
    "val = DEFAULT RETURNING val concludes from catalog.notNull).",
  "unresolvable ColumnRef (⟨*⟩ parts)":
    "DEFENSIVE — a four-part reference is a cross-database name; PostgreSQL rejects it.",
  "column '⟨*⟩' not found in any scope → nullable": "DEFENSIVE — PostgreSQL rejects the name.",
  "column '⟨*⟩' is ambiguous in the ⟨*⟩ (⟨*⟩ visible columns: ⟨*⟩) → nullable":
    "DEFENSIVE — PostgreSQL rejects ambiguous references at parse analysis; " +
    "this is the decided-against diagnostics channel's documented residue.",
  "column '⟨*⟩' not found in view definition output": "DEFENSIVE — PostgreSQL rejects the name.",
  "column '⟨*⟩' not found in the function's return type": "DEFENSIVE — PostgreSQL rejects the name.",
  "ordinal ⟨*⟩ out of range for CTE/subquery output":
    "DEFENSIVE — star expansion supplies the ordinal from the same inner list " +
    "it indexes; a mismatch is an engine invariant violation, not an input.",
  "column '⟨*⟩' not found in CTE/subquery output": "DEFENSIVE — PostgreSQL rejects the name.",
  "CTE/subquery has no AST → nullable":
    "DEFENSIVE — every registered CTE and subquery entry carries the AST it " +
    "was registered from.",
  "'⟨*⟩' is not a column of ⟨*⟩": "DEFENSIVE — PostgreSQL rejects the name.",
  "unresolved relation → nullable": "DEFENSIVE — PostgreSQL rejects the reference.",
  "unknown subLinkType '⟨*⟩' -> nullable":
    "DEFENSIVE — the remaining kinds (ROWCOMPARE, MULTIEXPR, CTE) are " +
    "analyzed-tree vocabulary; measured: ROW(1,2) = (SELECT 1,2) parses as an " +
    "A_Expr over an EXPR_SUBLINK, not a ROWCOMPARE_SUBLINK.",
  "⟨*⟩ with no subquery → nullable": "DEFENSIVE — the parser always emits subselect.",
  "⟨*⟩ subquery has no output columns → nullable":
    "DEFENSIVE — PostgreSQL rejects `x IN (SELECT)` (subquery has too few columns).",
  "no subselect -> nullable": "DEFENSIVE — the parser always emits subselect.",
  "subselect is not a SelectStmt -> nullable":
    "DEFENSIVE — the grammar only admits a select_with_parens there.",
  "single-row subquery has no output columns -> nullable":
    "DEFENSIVE — PostgreSQL rejects `(SELECT)` as a scalar subquery.",
  "unknown body statement type -> nullable":
    "DEFENSIVE — CREATE FUNCTION validates a sql body's statement kinds; the " +
    "walk only sees what the catalog accepted.",

  "⟨*⟩() never returns NULL":
    "CAPTURE-BACKSTOP — the ALWAYS_NOT_NULL name-table branch at priority 6b; " +
    "the fallback census carries the full measurement (no ALWAYS name has " +
    "parameter names, the capture's scope derives from the table, variadic " +
    "arity admits every valid call).",
  "no pre-parsed body -> nullable":
    "CAPTURE-BACKSTOP — fires when fnBodyAsts lacks a LANGUAGE sql function's " +
    "body; every body PostgreSQL renders today parses (the capture reads with " +
    "the same libpg_query the engine does), and catalog-census pins the " +
    "per-signature keying.",
};
