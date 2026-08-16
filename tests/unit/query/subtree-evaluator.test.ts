import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { Node } from "libpg-query";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import {
  collectClosedSubtrees,
  evaluateClosedSubtrees,
  type Evaluate,
  type SubtreeEvaluationCatalog,
} from "../../../src/query/subtree-evaluator.js";
import { GRAMMAR_SAMPLER } from "./grammar-sampler.js";

// ---------------------------------------------------------------------------
// The subtree evaluator's pins (docs/subtree-evaluation.md, rollout step 1).
//
// Two halves. The ALLOWLIST CENSUS makes the closure gate's vocabulary
// explicit the way node-census.test.ts does the walk's: every node kind that
// can appear inside a collected subtree is classified below with the gate
// that admits it, both directions asserted over the corpus — an unclassified
// kind inside a closed tree is the failure that matters most, because
// closure is a soundness claim ("no session state can change this value"),
// not a precision preference. The BEHAVIOR half pins the evaluation
// protocol: one PREPARE fixes the types, one SELECT returns values beside
// `result_types`, a raising batch degrades to per-subtree SELECTs, and
// every answer is keyed by node identity over the caller's own AST.
//
// The PostgreSQL facts the gates rest on — I/O-function volatilities, the
// DateStyle face of stable input functions, result_types round-trip — are
// pinned in param-mechanism.test.ts beside the Mechanism E section.
// ---------------------------------------------------------------------------

type Category =
  /** The gate can prove this kind closed; it appears as a collected root. */
  | "closed"
  /** Closed as a member, never a root: alone it answers nothing the AST
   *  does not already say syntactically. */
  | "literal"
  /** Appears inside closed subtrees only as structure a parent consumes. */
  | "structural";

const CLASSIFICATION: Record<string, { category: Category; why: string }> = {
  A_Const: { category: "literal", why: "every literal, NULL included" },
  TypeCast: {
    category: "closed",
    why: "LITERAL cast to a pg_catalog immutable-I/O base type — a computed argument could carry a stable OUTPUT function through an I/O coercion, and an array target's input function is array_in (stable)",
  },
  A_Expr: {
    category: "closed",
    why: "operator kinds that resolve through the operator name the AST carries (OP/ANY/ALL/DISTINCT/NULLIF/IN/LIKE/ILIKE), gated by the survivor consensus over the per-signature volatility capture; BETWEEN desugars through its >=/<= bound comparisons; SIMILAR resolves through a helper function and stays open",
  },
  BoolExpr: { category: "closed", why: "AND/OR/NOT over closed operands" },
  NullTest: { category: "closed", why: "IS [NOT] NULL of a closed operand" },
  BooleanTest: { category: "closed", why: "IS [NOT] TRUE/FALSE/UNKNOWN of a closed operand" },
  CaseExpr: {
    category: "closed",
    why: "guards, results and the implicit simple-CASE comparisons all closed, with the unification guard on both member lists",
  },
  CoalesceExpr: { category: "closed", why: "closed arguments, unification-guarded" },
  MinMaxExpr: { category: "closed", why: "GREATEST/LEAST: closed arguments, unification-guarded" },
  RowExpr: { category: "closed", why: "independently-typed closed fields" },
  A_ArrayExpr: { category: "closed", why: "closed elements, unification-guarded" },
  FuncCall: {
    category: "closed",
    why: "plain scalar call admitted by the survivor consensus at the call's arity; aggregate, window, VARIADIC-spread and ordered shapes are open",
  },
  CaseWhen: { category: "structural", why: "one CASE branch, consumed by CaseExpr" },
  List: { category: "structural", why: "IN-list wrapper inside A_Expr" },
  String: { category: "structural", why: "operator/function name parts" },
  Integer: {
    category: "structural",
    why: "an array bound inside a closed array cast's TypeName — type syntax, never a value (first-wave widening)",
  },
};

/** Kinds the design names as open BY DESIGN, asserted never to appear
 *  inside a collected subtree while the corpus demonstrably produces them.
 *  Everything else unclassified is open by default and caught by the same
 *  assertion without being listed. */
const OPEN_BY_DESIGN = [
  "ColumnRef", // any name of any kind opens the subtree
  "ParamRef",
  "SubLink", // even a table-free (SELECT 7) — recorded later in the charter
  "SQLValueFunction", // CURRENT_DATE is session state
  "CollateClause", // collation choice is the walk's business, never folded
  "GroupingFunc",
  "A_Indirection", // structural facts over open trees are refused
  "XmlExpr",
] as const;

const FIXTURES_DIR = join(__dirname, "fixtures");

/** Seeds that put every closed-candidate kind in closed position at least
 *  once — the corpus alone leaves some kinds reachable only in open
 *  contexts, and the census's reachability half needs the closed one. */
const CLOSED_SEEDS = [
  "SELECT CASE WHEN length(trim('  x  ')) = 1 THEN 1 ELSE 0 END",
  "SELECT CASE 'a' WHEN 'b' THEN 1 ELSE 0 END",
  "SELECT COALESCE(NULLIF('a', 'a'), 'b')",
  "SELECT GREATEST(1, 2) < LEAST(3, 4)",
  "SELECT ROW(1, 'x') = ROW(1, 'x')",
  "SELECT ARRAY[1, 2] = ARRAY[1, 3]",
  "SELECT 'a'::char(4) <> 'a '::char(4)",
  "SELECT (5 <= 1 OR NULL::text IS NOT NULL) AND true IS NOT FALSE",
  "SELECT NULL::text IS NULL",
  "SELECT true IS NOT FALSE",
  "SELECT 'abc' LIKE 'a%' OR 'abc' ILIKE 'A%'",
  "SELECT 5 IN (1, 2, 3) OR 5 = ANY (ARRAY[1, 2])",
  "SELECT 1 IS DISTINCT FROM 2, abs(-5), round(1.5, 0), substr('abc', 2)",
];

function collectTags(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const n of node) collectTags(n, out);
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    if (/^[A-Z]/.test(k)) out.add(k);
    collectTags(v, out);
  }
}

let pg: PGlite;
let catalog: SubtreeEvaluationCatalog;
let evaluate: Evaluate;

const SCHEMA = `
  CREATE TABLE orders (id int NOT NULL, qty int NOT NULL);
  -- First-wave widening subjects (docs/subtree-evaluation.md): a unique
  -- enum and unique domains fold; the duplicated enum, the datetime-based
  -- domain and the GUC-reading CHECK are the guards.
  CREATE TYPE mood AS ENUM ('sad', 'ok', 'happy');
  CREATE DOMAIN posint AS int CHECK (VALUE > 0);
  CREATE DOMAIN nested AS posint CHECK (VALUE < 100);
  CREATE DOMAIN dday AS date;
  CREATE DOMAIN gated AS int CHECK (VALUE <= current_setting('app.mx')::int);
  CREATE SCHEMA s2;
  CREATE TYPE color AS ENUM ('red', 'blue');
  CREATE TYPE s2.color AS ENUM ('blue', 'red');
  CREATE DOMAIN ctext AS text COLLATE "C";
  CREATE TABLE coll_probe (a text, b text COLLATE "C", c int, d ctext);
`;

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(SCHEMA);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
  evaluate = async sql => (await pg.query<Record<string, unknown>>(sql)).rows[0];
}, 60_000);

afterAll(async () => {
  if (!pg.closed) await pg.close();
});

async function subtreesOf(sql: string): Promise<{ stmt: Node; roots: Node[] }> {
  const parsed = await parseSql(sql);
  const stmt = parsed.stmts![0]!.stmt!;
  return { stmt, roots: collectClosedSubtrees(stmt, catalog) };
}

async function answers(sql: string) {
  const { stmt } = await subtreesOf(sql);
  return [...(await evaluateClosedSubtrees(stmt, catalog, evaluate)).values()];
}

// ---------------------------------------------------------------------------

describe("allowlist census", () => {
  const rootTags = new Set<string>();
  const insideTags = new Set<string>();
  const corpusTags = new Set<string>();

  beforeAll(async () => {
    const corpus = [
      ...CLOSED_SEEDS,
      ...GRAMMAR_SAMPLER,
      ...readdirSync(FIXTURES_DIR)
        .filter(f => f.endsWith(".sql") && f !== "schema.sql")
        .map(f => readFileSync(join(FIXTURES_DIR, f), "utf8")),
    ];
    for (const sql of corpus) {
      let parsed;
      try {
        parsed = await parseSql(sql);
      } catch {
        continue; // the corpus is for shapes; a non-parsing probe file is fine
      }
      for (const raw of parsed.stmts ?? []) {
        if (!raw.stmt) continue;
        collectTags(raw.stmt, corpusTags);
        for (const root of collectClosedSubtrees(raw.stmt, catalog)) {
          rootTags.add(Object.keys(root)[0]!);
          collectTags(root, insideTags);
        }
      }
    }
  }, 120_000);

  it("every node kind inside a collected subtree is classified", () => {
    // The soundness direction: closure quantifies over everything the
    // subtree contains, so a kind nobody classified reaching the inside of
    // one means the gate admitted a node no one argued about.
    const unclassified = [...insideTags].filter(t => !CLASSIFICATION[t]).sort();
    expect(
      unclassified,
      `Inside a collected subtree but not classified — argue each kind's ` +
        `closure (or find the gate that wrongly admits it):\n  ${unclassified.join(", ")}`,
    ).toEqual([]);
  });

  it("every `closed` kind is observed as a collected root", () => {
    // The reachability direction: a gate no corpus statement exercises is
    // an untested claim. CLOSED_SEEDS exists exactly to keep this red bar
    // honest — extend it when classifying a new kind.
    const unreached = Object.entries(CLASSIFICATION)
      .filter(([, c]) => c.category === "closed")
      .map(([k]) => k)
      .filter(k => !rootTags.has(k))
      .sort();
    expect(
      unreached,
      `Classified 'closed' but never collected as a root over the corpus — ` +
        `add a seed statement that closes it:\n  ${unreached.join(", ")}`,
    ).toEqual([]);
  });

  it("`literal` and `structural` kinds appear inside subtrees, never as roots", () => {
    const misplaced = Object.entries(CLASSIFICATION)
      .filter(([, c]) => c.category !== "closed")
      .map(([k]) => k)
      .filter(k => rootTags.has(k) || !insideTags.has(k))
      .sort();
    expect(
      misplaced,
      `Either collected as a root (a bare literal answers nothing) or never ` +
        `observed inside a subtree (an untested entry):\n  ${misplaced.join(", ")}`,
    ).toEqual([]);
  });

  it("the design's open kinds stay outside every collected subtree", () => {
    // OPEN_BY_DESIGN entries are the charter's own exclusions; asserting
    // the corpus PRODUCES them keeps each refusal a tested claim rather
    // than a comment.
    const missing = OPEN_BY_DESIGN.filter(t => !corpusTags.has(t));
    expect(missing, `Not produced by the corpus at all: ${missing.join(", ")}`).toEqual([]);
    const leaked = OPEN_BY_DESIGN.filter(t => insideTags.has(t));
    expect(
      leaked,
      `Open by design, found inside a collected subtree — a closure gate is ` +
        `admitting names or session state:\n  ${leaked.join(", ")}`,
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe("closure gates", () => {
  const open = async (sql: string) => (await subtreesOf(sql)).roots.length === 0;

  it("closes the doc's canonical folds", async () => {
    expect(await answers("SELECT 5::integer <= 1 AS g")).toEqual([
      { isNull: false, value: false, type: "boolean" },
    ]);
    expect(await answers("SELECT 'a'::char(4) <> 'a '::char(4) AS g")).toEqual([
      { isNull: false, value: false, type: "boolean" },
    ]);
    expect(await answers("SELECT NULL::text IS NOT NULL AS g")).toEqual([
      { isNull: false, value: false, type: "boolean" },
    ]);
  });

  it("volatile and stable calls are open", async () => {
    expect(await open("SELECT random() < 2 AS g")).toBe(true);
    expect(await open("SELECT concat('a', 'b') AS g")).toBe(true); // stable
  });

  it("a stable input function keeps the literal cast open — unless the shape gate answers", async () => {
    // Design B (docs/subtree-evaluation.md, "Settings-independent datetime
    // literals"): 'now' and the interval fail the value-shape test and stay
    // fully open; '2020-01-01'::date CLOSES as a member (the swept ISO
    // shape) but never collects alone — date_out reads DateStyle, and the
    // rendering gate is untouched. The comparison shows the member side:
    // both casts close, the boolean answers, no datetime crosses the wire.
    expect(await open("SELECT 'now'::timestamptz AS g")).toBe(true);
    expect(await open("SELECT interval '1 day' AS g")).toBe(true);
    expect(await open("SELECT '2020-01-01'::date AS g")).toBe(true);
    expect(await answers("SELECT '2020-01-01'::date < '2020-06-01'::date AS g")).toEqual([
      { isNull: false, value: true, type: "boolean" },
    ]);
    // The ambiguous form fails by shape, exactly as 'now' does; a typmod
    // spelling is outside the swept language and stays open too.
    expect(await open("SELECT '1/2/2020'::date < '2020-06-01'::date AS g")).toBe(true);
    expect(await open("SELECT '2020-01-01 12:34:56'::timestamp(0) < '2021-01-01'::timestamp AS g")).toBe(true);
    // timestamptz closes ONLY with an explicit numeric offset: the
    // offset-less spelling reads TimeZone (measured, param-mechanism).
    expect(await answers(
      "SELECT '2020-01-01T12:34:56+00'::timestamptz < '2021-01-01 00:00:00+00'::timestamptz AS g",
    )).toEqual([{ isNull: false, value: true, type: "boolean" }]);
    expect(await open(
      "SELECT '2020-01-01 12:34:56'::timestamptz < '2021-01-01 00:00:00+00'::timestamptz AS g",
    )).toBe(true);
  });

  it("a computed cast argument is open even to an immutable-I/O target", async () => {
    // to_timestamp(0)::text moves with TimeZone (measured, pinned in
    // param-mechanism.test.ts): the stable face is the ARGUMENT type's
    // output function, which a scope-blind gate cannot see — so only
    // literal casts close. The computation INSIDE the cast still folds as
    // its own maximal subtree; the cast node itself is never collected.
    expect(await open("SELECT to_timestamp(0)::text AS g")).toBe(true);
    expect(await answers("SELECT (1 + 1)::bigint AS g")).toEqual([
      { isNull: false, value: 2, type: "integer" },
    ]);
  });

  it("array-typed cast targets are gated per ELEMENT (first-wave widening)", async () => {
    // array_in's blanket-stable flag stood for "elements could be
    // datetime"; the element gate answers it per element, so int4[] closes
    // (pinned in the widenings block) and date[] keeps the flag's reason.
    expect(await open("SELECT '{2020-01-01}'::date[] AS g")).toBe(true);
    expect(await open("SELECT '{}'::int4[] AS g")).toBe(false);
  });

  it("a bare unknown literal beside a constructor is open", async () => {
    // Measured: the literal coerces through array_in under the
    // constructor's type. The comparison never folds — only the
    // constructor itself answers, as its own maximal subtree — while the
    // same trees with both sides constructed fold whole.
    expect(await answers("SELECT ARRAY[1,2] = '{1,3}' AS g")).toEqual([
      { isNull: false, value: [1, 2], type: "integer[]" },
    ]);
    expect(await open("SELECT 5 = ANY ('{1,3}') AS g")).toBe(true);
    expect(await answers("SELECT COALESCE(ARRAY[1], '{7}') AS g")).toEqual([
      { isNull: false, value: [1], type: "integer[]" },
    ]);
    expect(await answers("SELECT ARRAY[1,2] = ARRAY[1,3] AS g")).toEqual([
      { isNull: false, value: false, type: "boolean" },
    ]);
    expect(await answers("SELECT 5 = ANY (ARRAY[1,3]) AS g")).toEqual([
      { isNull: false, value: false, type: "boolean" },
    ]);
  });

  it("a unary operator over a bare unknown literal is open", async () => {
    // `- 5` is no counterexample: the grammar folds the sign into the
    // literal. `- (1 + 1)` is a real unary A_Expr and closes.
    expect(await open("SELECT - '5' AS g")).toBe(true);
    expect(await answers("SELECT - (1 + 1) AS g")).toEqual([
      { isNull: false, value: -2, type: "integer" },
    ]);
  });

  it("aggregate, window and VARIADIC shapes are open", async () => {
    expect(await open("SELECT sum(1) AS g")).toBe(true);
    expect(await open("SELECT count(*) AS g")).toBe(true);
    expect(await open("SELECT row_number() OVER () AS g")).toBe(true);
    expect(await open("SELECT length(VARIADIC 'x') AS g").catch(() => true)).toBe(true);
  });

  it("one known operand types the unknown beside it", async () => {
    // The landing rule's exact-match face, pinned in
    // param-mechanism.test.ts: '3' assumes integer, int4pl is exact.
    expect(await answers("SELECT 5 + '3' AS g")).toEqual([
      { isNull: false, value: 8, type: "integer" },
    ]);
  });

  it("composition crosses no I/O; collection does — the root gate", async () => {
    // make_date is immutable over integers, so it CLOSES — but its date
    // result renders through date_out (DateStyle), so it never answers
    // alone. Under date_part, the lone row exact at the known date
    // position is PostgreSQL's own selection ("a declared parameter types
    // the literal"), and the double precision answer is immutable-I/O all
    // the way out — no settings assumption anywhere.
    expect(await open("SELECT make_date(2020, 1, 1) AS g")).toBe(true);
    expect(await answers("SELECT date_part('day', make_date(2020, 1, 1)) AS g")).toEqual([
      { isNull: false, value: 1, type: "double precision" },
    ]);
    expect(await answers("SELECT make_date(2020, 1, 1) = make_date(2020, 1, 1) AS g")).toEqual([
      { isNull: false, value: true, type: "boolean" },
    ]);
  });

  it("names of any kind are open — scope-blindness", async () => {
    expect(await open("SELECT o.id + 0 AS g FROM orders o")).toBe(true);
    expect(await open("SELECT $1::int AS g")).toBe(true);
    expect(await open("SELECT (SELECT 7) AS g")).toBe(true);
    expect(await open("SELECT current_schema AS g")).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe("evaluation protocol", () => {
  function countingEvaluate(): { evaluate: Evaluate; calls: string[] } {
    const calls: string[] = [];
    return {
      calls,
      evaluate: async sql => {
        calls.push(sql);
        return (await pg.query<Record<string, unknown>>(sql)).rows[0];
      },
    };
  }

  it("batches every subtree into one SELECT: PREPARE, fetch, DEALLOCATE", async () => {
    const { stmt } = await subtreesOf(
      "SELECT CASE WHEN 2 + 2 = 4 THEN o.id ELSE NULL END AS a," +
        " CASE WHEN length(trim('  x  ')) = 1 THEN o.id ELSE NULL END AS b FROM orders o",
    );
    const { evaluate: counted, calls } = countingEvaluate();
    const map = await evaluateClosedSubtrees(stmt, catalog, counted);
    expect(map.size).toBe(2);
    expect(calls).toHaveLength(3);
    expect(calls[0]).toMatch(/^PREPARE pgsid_subtree_eval_\d+ AS SELECT/);
    expect(calls[1]).toContain("result_types");
    expect(calls[2]).toMatch(/^DEALLOCATE pgsid_subtree_eval_\d+$/);
  });

  it("answers are keyed by node identity over the caller's AST", async () => {
    const parsed = await parseSql(
      "SELECT CASE WHEN 1 > 2 THEN NULL ELSE 'val' END AS c FROM orders o",
    );
    const stmt = parsed.stmts![0]!.stmt!;
    const caseNode = (stmt as never as {
      SelectStmt: { targetList: { ResTarget: { val: Node } }[] };
    }).SelectStmt.targetList[0]!.ResTarget.val;
    const map = await evaluateClosedSubtrees(stmt, catalog, evaluate);
    // The MAXIMAL subtree is the whole CaseExpr — the very object in the
    // caller's tree, so a consumer holding the node needs no translation.
    expect(map.size).toBe(1);
    expect(map.get(caseNode)).toEqual({ isNull: false, value: "val", type: "text" });
  });

  it("collects maximal subtrees: nothing nested inside another root", async () => {
    const { roots } = await subtreesOf(
      "SELECT CASE WHEN length(trim('  x  ')) = 1" +
        " THEN CASE WHEN 2 + 2 = 4 THEN o.id ELSE NULL END ELSE NULL END AS c FROM orders o",
    );
    // The two guards are the maximal closed subtrees (the CASEs hold o.id);
    // `2 + 2 = 4` sits INSIDE the second guard's map answer, not beside it.
    expect(roots).toHaveLength(2);
    const tags = new Set<string>();
    for (const r of roots) collectTags(r, tags);
    expect(tags.has("ColumnRef")).toBe(false);
  });

  it("a raising subtree contributes nothing; its neighbours still answer", async () => {
    const { stmt } = await subtreesOf("SELECT 5 / 0 AS boom, 2 + 2 AS ok");
    const { roots } = await subtreesOf("SELECT 5 / 0 AS boom, 2 + 2 AS ok");
    expect(roots).toHaveLength(2);
    const map = await evaluateClosedSubtrees(stmt, catalog, evaluate);
    expect([...map.values()]).toEqual([{ isNull: false, value: 4, type: "integer" }]);
  });

  it("no closed subtrees → the callback is never invoked", async () => {
    const { stmt } = await subtreesOf("SELECT o.id FROM orders o WHERE o.qty > o.id");
    const { evaluate: counted, calls } = countingEvaluate();
    const map = await evaluateClosedSubtrees(stmt, catalog, counted);
    expect(map.size).toBe(0);
    expect(calls).toEqual([]);
  });

  it("a NULL answer is isNull with its resolved type", async () => {
    expect(await answers("SELECT NULLIF('a', 'a') AS g")).toEqual([
      { isNull: true, value: null, type: "text" },
    ]);
  });

  it("evaluation reaches closed subtrees inside CTE bodies and set operations", async () => {
    expect(
      await answers(
        "WITH flags AS (SELECT CASE WHEN 1 = 1 THEN 'on' ELSE NULL END AS flag)" +
          " SELECT f.flag FROM flags f",
      ),
    ).toEqual([{ isNull: false, value: "on", type: "text" }]);
    expect(
      await answers("SELECT CASE WHEN 1 > 2 THEN NULL ELSE 'val' END AS c UNION ALL SELECT 'other'"),
    ).toEqual([{ isNull: false, value: "val", type: "text" }]);
  });
});

// ---------------------------------------------------------------------------
// The acceptance frame for TYPED OPERAND TRACKING (chartered and LANDED
// 2026-08-12, docs/subtree-evaluation.md). The four targets below were
// written as `it.fails` before the code existed and flipped to plain `it`
// in the commit that landed the survivor-level gate — a scope-free type
// pass over the closed grammar, `unknown` first-class under the landing
// rules pinned in param-mechanism.test.ts, per-signature volatility, and
// candidate elimination that may over-keep but never over-drop. Every
// oracle value was adjudicated against PostgreSQL (2026-08-12) before
// being written down.
//
// The guards are the other direction: shapes NO gate refinement may ever
// fold, because the session-dependence is in the very signature the
// expression resolves to. The syntactic-guard pins above ("a bare unknown
// literal beside a constructor is open") are this rung's transition
// guards too: they stayed green while the pattern-match was replaced by
// the general landing-type rule, and they stay.
// ---------------------------------------------------------------------------

describe("typed operand tracking: the acceptance targets", () => {
  it("all-unknown || lands on text and folds through textcat", async () => {
    expect(await answers("SELECT 'a' || 'b' AS g")).toEqual([
      { isNull: false, value: "ab", type: "text" },
    ]);
  });

  it("a known text operand types the unknown beside it", async () => {
    // Under the name-level gate only the inner call folded (answering
    // 'A'); the target is the WHOLE concatenation: upper's singleton
    // return type meets the one-known landing rule, and text || text is
    // textcat.
    expect(await answers("SELECT upper('a') || 'b' AS g")).toEqual([
      { isNull: false, value: "Ab", type: "text" },
    ]);
  });

  it("composition: a chained || folds whole", async () => {
    expect(await answers("SELECT 'a' || 'b' || 'c' AS g")).toEqual([
      { isNull: false, value: "abc", type: "text" },
    ]);
  });

  it("BETWEEN folds through its bound comparisons", async () => {
    // The AST carries the word BETWEEN instead of an operator name; the
    // desugar gates on <= and >=, which hold per-signature verdicts.
    expect(await answers("SELECT 5 BETWEEN 1 AND 9 AS g")).toEqual([
      { isNull: false, value: true, type: "boolean" },
    ]);
  });
});

describe("GUARD: what no gate refinement may ever fold", () => {
  it("'a' || 5 stays open: it resolves textanycat, which is STABLE", async () => {
    // The mixed shape renders 5 through session-dependent output
    // machinery. If this ever folds, the survivor gate is consulting the
    // wrong signature's volatility.
    expect(await answers("SELECT 'a' || 5 AS g")).toEqual([]);
  });

  it("a stable-returning call keeps its concatenation open", async () => {
    // 'at: ' || to_timestamp(0) — measured moving with TimeZone. Both the
    // call (timestamptz return) and the operator row it forces are outside
    // every capture, on purpose.
    expect(await answers("SELECT 'at: ' || to_timestamp(0) AS g")).toEqual([]);
  });

  it("text @@ text stays open: the text row is stable ITSELF", async () => {
    // Unlike ||, no signature split can rescue @@ — ts_match_tt reads
    // default_text_search_config, so the all-unknown landing (text, text)
    // IS the stable row. The counterpart pin holds its pg_proc declaration.
    expect(await answers("SELECT 'fat cats ate rats' @@ 'fat' AS g")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// First-wave widenings (docs/subtree-evaluation.md, "The dependence model,
// corrected"): enums, domains over immutable-I/O bases with closed CHECKs,
// array literals over immutable-I/O elements — all foldable under the
// snapshot contract, because their I/O reads CATALOG state only and catalog
// change is the system's re-analysis trigger. Admission is by UNIQUENESS:
// two same-named enums answer oppositely as search_path moves (measured),
// so consensus is not enough. Every fold value below was adjudicated
// against PGlite before being written down (2026-08-12).
// ---------------------------------------------------------------------------

describe("first-wave widenings", () => {
  const open = async (sql: string) => (await subtreesOf(sql)).roots.length === 0;

  it("a unique enum's cast and comparison fold", async () => {
    expect(await answers("SELECT 'sad'::mood < 'happy'::mood AS g")).toEqual([
      { isNull: false, value: true, type: "boolean" },
    ]);
    expect(await answers("SELECT 'ok'::mood AS g")).toEqual([
      { isNull: false, value: "ok", type: "mood" },
    ]);
  });

  it("a domain threads its canonical base; the chain's CHECKs gate it", async () => {
    // posint threads as integer (operators resolve on the base — measured,
    // pinned in param-mechanism.test.ts); nested runs BOTH chain CHECKs at
    // cast time and still folds, its constraint rendering VALUE pre-cast.
    expect(await answers("SELECT 5::posint <= 1 AS g")).toEqual([
      { isNull: false, value: false, type: "boolean" },
    ]);
    expect(await answers("SELECT 5::nested <= 1 AS g")).toEqual([
      { isNull: false, value: false, type: "boolean" },
    ]);
  });

  it("a CHECK-violating cast raises at evaluation and contributes nothing", async () => {
    expect(await answers("SELECT 500::nested <= 1 AS g")).toEqual([]);
  });

  it("an array-typed literal cast closes on its ELEMENT gate", async () => {
    // array_in's blanket-stable flag means "elements could be datetime";
    // the element gate answers per element. array_eq is immutable, so the
    // whole comparison folds.
    expect(await answers("SELECT '{1,3}'::int4[] = ARRAY[1,3] AS g")).toEqual([
      { isNull: false, value: true, type: "boolean" },
    ]);
    expect(await open("SELECT '{2020-01-01}'::date[] AS g")).toBe(true);
  });

  it("GUARD: a GUC-reading domain CHECK keeps every cast open", async () => {
    // gated's CHECK calls current_setting — not immutable, so the recursive
    // gate refuses the domain wholesale; its analysis-time answer would not
    // bind other sessions.
    expect(await answers("SELECT 5::gated <= 9 AS g")).toEqual([]);
  });

  it("GUARD: a datetime-based domain stays out with its base", async () => {
    expect(await answers("SELECT '2020-01-01'::dday AS g")).toEqual([]);
  });

  it("GUARD: a duplicated enum name stays open — uniqueness, not consensus", async () => {
    // public.color and s2.color order their labels oppositely: the same
    // spelling answers TRUE or FALSE as search_path moves (measured), so
    // only a name exactly one user type carries may close.
    expect(await answers("SELECT 'red'::color < 'blue'::color AS g")).toEqual([]);
  });

  it("capture shape: the face answers threading renderings", () => {
    expect(catalog.closedCastTargetType("mood")).toBe("public.mood");
    expect(catalog.closedCastTargetType("posint")).toBe("integer");
    expect(catalog.closedCastTargetType("nested")).toBe("integer");
    expect(catalog.closedCastTargetType("color")).toBeNull();
    expect(catalog.closedCastTargetType("dday")).toBeNull();
    expect(catalog.closedCastTargetType("gated")).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe("catalog face: user names open builtin spellings", () => {
  let shadowPg: PGlite;
  let shadowCatalog: SubtreeEvaluationCatalog;

  beforeAll(async () => {
    shadowPg = new PGlite();
    await shadowPg.exec(`
      CREATE FUNCTION length(v int) RETURNS int LANGUAGE sql VOLATILE
        AS 'SELECT 1';
      CREATE DOMAIN int4 AS text;
      CREATE OPERATOR = (LEFTARG = point, RIGHTARG = point,
        FUNCTION = point_eq);
    `);
    shadowCatalog = await buildNullabilityCatalog(await snapshotCatalog(shadowPg));
  }, 60_000);

  afterAll(async () => {
    if (!shadowPg.closed) await shadowPg.close();
  });

  it("a user function, operator or type name disqualifies the builtin", () => {
    // Scope-blind means unresolvable: the evaluator cannot know whether
    // `length` is pg_catalog's — so any user object of the name, in any
    // schema, answers false. The unshadowed catalog says true for all three.
    expect(catalog.isImmutableFunction("length", 1)).toBe(true);
    expect(catalog.isImmutableOperator("=")).toBe(true);
    expect(catalog.isImmutableIoType("int4")).toBe(true);
    expect(shadowCatalog.isImmutableFunction("length", 1)).toBe(false);
    expect(shadowCatalog.isImmutableOperator("=")).toBe(false);
    expect(shadowCatalog.isImmutableIoType("int4")).toBe(false);
  });

  it("the interval faces: strategies by consensus, complement by negator, shadowed names refused", () => {
    // The five canonical shapes come straight off pg_amop; `<>` answers
    // through the equality-negator capture; `||` has no btree membership
    // and never will. The shadow catalog carries a user `=` operator, so
    // the collision rule closes both faces for that name there.
    expect(catalog.btreeStrategyOf("<")).toBe(1);
    expect(catalog.btreeStrategyOf("<=")).toBe(2);
    expect(catalog.btreeStrategyOf("=")).toBe(3);
    expect(catalog.btreeStrategyOf(">=")).toBe(4);
    expect(catalog.btreeStrategyOf(">")).toBe(5);
    expect(catalog.btreeStrategyOf("<>")).toBeNull();
    expect(catalog.btreeStrategyOf("||")).toBeNull();
    expect(catalog.isEqualityComplement("<>")).toBe(true);
    expect(catalog.isEqualityComplement("=")).toBe(false);
    expect(shadowCatalog.btreeStrategyOf("=")).toBeNull();
    expect(shadowCatalog.isEqualityComplement("=")).toBe(false);
  });

  it("the collation lattice's capture: identity, explicit, non-collatable", () => {
    // The IDENTITY arm rests on this face: a default-collated column's
    // comparisons run under the session's own collation (all ops), an
    // explicit COLLATE keeps deterministic-equality only, and integers
    // read null — the safe arm only a captured column may claim.
    expect(catalog.resolveColumnCollationIsDefault("public", "coll_probe", "a")).toBe(true);
    expect(catalog.resolveColumnCollationIsDefault("public", "coll_probe", "b")).toBe(false);
    expect(catalog.resolveColumnCollationIsDefault("public", "coll_probe", "c")).toBeNull();
    expect(catalog.resolveColumnCollationIsDefault("public", "coll_probe", "ghost")).toBe(false);
    // A DOMAIN's collation flows into pg_attribute (measured: the ctext
    // column reads the domain's "C", not the default), so domain-collated
    // columns take the explicit arm with no special case in the capture.
    expect(catalog.resolveColumnCollationIsDefault("public", "coll_probe", "d")).toBe(false);
    expect(catalog.resolveColumnCollationDeterministic("public", "coll_probe", "d")).toBe(true);
  });

  it("the arity axis: `length` is immutable at one argument, not at two", () => {
    // length(bytea, name) is STABLE — the row that forced (name, arity)
    // keys onto the capture.
    expect(catalog.isImmutableFunction("length", 1)).toBe(true);
    expect(catalog.isImmutableFunction("length", 2)).toBe(false);
  });
});
