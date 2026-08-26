import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";

// ---------------------------------------------------------------------------
// Corpus SHAPE — the input-side frontier.
//
// Three instruments answer three different questions, and mixing them up is
// how a corpus grows without getting better.
//
//   worlds-health      the FLOOR: is the corpus collapsing?
//   rung-cooccurrence  the ENGINE-side frontier: did a world buy anything?
//   this one           the INPUT-side frontier: what should someone write?
//
// The third is what an author reads FIRST, because nobody can write SQL from a
// rung pair. A pair says whether the thing worked; a shape gap says what to
// type — "no MERGE has ever appeared inside a CTE" is a specification, and
// "pair 14 x 88 is uncovered" is not.
//
// This is a REPORT, deliberately. Its only assertion is that collection
// actually ran, which catches the instrument silently printing zeroes. The
// gates live in the two suites above; a threshold invented here would turn a
// map of unexplored input into a chore, which is the same reason coverage
// carries no threshold in this repo.
//
// Scope note: the SHARED corpus is measured as its fixtures alone, without the
// grammar sampler. The sampler is a synthetic probe for parse-tree reach, not
// a body of queries anyone would write, and averaging the two would flatter
// every distribution below.
//
// Set CORPUS to `shared`, `worlds` or `both` (default).
// ---------------------------------------------------------------------------

const HERE = __dirname;
const FIXTURES_DIR = join(HERE, "fixtures");
const WORLDS_DIR = join(HERE, "worlds");

const WHICH = (process.env.CORPUS ?? "both").toLowerCase();
const WANT_SHARED = WHICH === "both" || WHICH === "shared";
const WANT_WORLDS = WHICH === "both" || WHICH === "worlds";

type Counter = Map<string, number>;

interface Shape {
  label: string;
  statements: number;
  depth: Map<number, number>;
  chains: Counter;
  roots: Counter;
  dml: Counter;
  cteCount: Counter;
  cteKinds: Counter;
  // schema side
  tables: number;
  nonKeyCols: number;
  checkArity: Map<number, number>;
  checksPerColumn: Map<number, number>;
  chainingPairs: number;
  generated: number;
  generatedOverConstrained: number;
  generatedKinds: Counter;
}

function emptyShape(label: string): Shape {
  return {
    label, statements: 0, depth: new Map(), chains: new Map(), roots: new Map(),
    dml: new Map(), cteCount: new Map(), cteKinds: new Map(),
    tables: 0, nonKeyCols: 0, checkArity: new Map(), checksPerColumn: new Map(),
    chainingPairs: 0, generated: 0, generatedOverConstrained: 0,
    generatedKinds: new Map(),
  };
}

function bump<K>(m: Map<K, number>, k: K, by = 1): void {
  m.set(k, (m.get(k) ?? 0) + by);
}

// --- AST helpers -----------------------------------------------------------

function tagged(v: unknown): [string, Record<string, unknown>] | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const keys = Object.keys(v as object);
  const k = keys[0];
  if (keys.length !== 1 || k === undefined || !/^[A-Z]/.test(k)) return null;
  return [k, (v as Record<string, unknown>)[k] as Record<string, unknown>];
}

function fields(v: unknown): unknown[] {
  const t = tagged(v);
  return Object.values((t ? t[1] : v) as object);
}

function has(v: unknown, type: string): boolean {
  if (Array.isArray(v)) return v.some(x => has(x, type));
  if (!v || typeof v !== "object") return false;
  const t = tagged(v);
  if (t && t[0] === type) return true;
  return fields(v).some(x => has(x, type));
}

function maxJoinDepth(v: unknown, d = 0): number {
  if (Array.isArray(v)) return v.reduce<number>((m, x) => Math.max(m, maxJoinDepth(x, d)), d);
  if (!v || typeof v !== "object") return d;
  const t = tagged(v);
  const next = t && t[0] === "JoinExpr" ? d + 1 : d;
  return fields(v).reduce<number>((m, x) => Math.max(m, maxJoinDepth(x, next)), next);
}

/** Ordered join-type chains, outermost inward. A qual starts a fresh chain. */
function joinChains(v: unknown, out: Counter, cur: string[] = []): void {
  if (Array.isArray(v)) { for (const x of v) joinChains(x, out, cur); return; }
  if (!v || typeof v !== "object") return;
  const t = tagged(v);
  if (t && t[0] === "JoinExpr") {
    const next = [...cur, String(t[1].jointype ?? "JOIN_INNER").replace("JOIN_", "")];
    if (next.length > 1) bump(out, next.join(" > "));
    joinChains(t[1].larg, out, next);
    joinChains(t[1].rarg, out, next);
    joinChains(t[1].quals, out, []);
    return;
  }
  for (const x of fields(v)) joinChains(x, out, cur);
}

const nonEmpty = (v: unknown): boolean => Array.isArray(v) && v.length > 0;

function recordStatement(stmt: unknown, s: Shape): void {
  const t = tagged(stmt);
  if (!t) return;
  const [root, body] = t;
  s.statements++;
  bump(s.roots, root);
  bump(s.depth, maxJoinDepth(stmt));
  joinChains(stmt, s.chains);

  // --- writing-statement features ---
  if (root !== "SelectStmt") {
    // The clause is a `ReturningClause` node in this parser, not the bare
    // `returningList` older trees carried. Reading the old name reports "no
    // RETURNING" for a corpus whose DML claims come entirely from RETURNING,
    // which is how this was caught: every writing statement scored the same.
    const ret = body.returningClause !== undefined || nonEmpty(body.returningList);
    bump(s.dml, `${root}: ${ret ? "RETURNING" : "no RETURNING"}`);
  }
  if (body.onConflictClause) bump(s.dml, "INSERT: ON CONFLICT");
  if (root === "UpdateStmt" && nonEmpty(body.fromClause)) bump(s.dml, "UPDATE: FROM");
  if (root === "DeleteStmt" && nonEmpty(body.usingClause)) bump(s.dml, "DELETE: USING");
  if (root === "InsertStmt") {
    const sel = tagged(body.selectStmt);
    if (sel && nonEmpty(sel[1].valuesLists))
      bump(s.dml, (sel[1].valuesLists as unknown[]).length > 1
        ? "INSERT: multi-row VALUES" : "INSERT: single-row VALUES");
    else if (sel) bump(s.dml, "INSERT: SELECT source");
    else bump(s.dml, "INSERT: DEFAULT VALUES");
  }
  if (root === "MergeStmt") {
    for (const w of (body.mergeWhenClauses as unknown[]) ?? []) {
      const c = tagged(w);
      if (c) bump(s.dml, `MERGE arm: ${String(c[1].matchKind ?? "?")}`);
    }
  }
  if (has(stmt, "MergeSupportFunc")) bump(s.dml, "MERGE: merge_action()");

  // --- common table expressions ---
  const w = body.withClause as Record<string, unknown> | undefined;
  const ctes = (w?.ctes as unknown[]) ?? [];
  bump(s.cteCount, ctes.length === 0 ? "0" : ctes.length === 1 ? "1"
    : ctes.length <= 3 ? "2-3" : "4+");
  if (w?.recursive) bump(s.cteKinds, "RECURSIVE");
  for (const c of ctes) {
    const cte = tagged(c);
    if (!cte) continue;
    const inner = tagged(cte[1].ctequery);
    bump(s.cteKinds, `body: ${inner ? inner[0] : "?"}`);
    const m = Number(cte[1].ctematerialized ?? 0);
    if (m === 1) bump(s.cteKinds, "MATERIALIZED");
    if (m === 2) bump(s.cteKinds, "NOT MATERIALIZED");
    if (cte[1].search_clause) bump(s.cteKinds, "SEARCH");
    if (cte[1].cycle_clause) bump(s.cteKinds, "CYCLE");
    if (inner && (inner[1].withClause)) bump(s.cteKinds, "nested WITH");
  }
}

// --- schema-side measurement ----------------------------------------------

const SCHEMA_SQL = `
WITH tabs AS (
  SELECT r.oid, r.relname FROM pg_class r
  JOIN pg_namespace n ON n.oid=r.relnamespace
  WHERE r.relkind IN ('r','p') AND n.nspname='public'),
keyed AS (
  SELECT c.conrelid, unnest(c.conkey) AS attnum FROM pg_constraint c
  JOIN tabs t ON t.oid=c.conrelid WHERE c.contype IN ('p','f','u')),
chk AS (
  SELECT c.oid, c.conrelid, c.conkey, coalesce(array_length(c.conkey,1),0) AS arity
  FROM pg_constraint c JOIN tabs t ON t.oid=c.conrelid WHERE c.contype='c')
SELECT
  (SELECT count(*) FROM tabs) AS tables,
  (SELECT count(*) FROM tabs t
     JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped
     LEFT JOIN keyed k ON k.conrelid=t.oid AND k.attnum=a.attnum
     WHERE k.attnum IS NULL) AS nonkey,
  (SELECT count(*) FROM chk a JOIN chk b ON a.conrelid=b.conrelid AND a.oid<b.oid
     AND a.conkey && b.conkey
     AND NOT (a.conkey @> b.conkey AND b.conkey @> a.conkey)) AS chaining`;

const ARITY_SQL = `
SELECT coalesce(array_length(c.conkey,1),0) AS arity, count(*) AS n
FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
JOIN pg_namespace ns ON ns.oid=r.relnamespace
WHERE c.contype='c' AND ns.nspname='public' GROUP BY 1 ORDER BY 1`;

const PER_COLUMN_SQL = `
WITH cc AS (
  SELECT c.conrelid, unnest(c.conkey) AS attnum
  FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
  JOIN pg_namespace ns ON ns.oid=r.relnamespace
  WHERE c.contype='c' AND ns.nspname='public')
SELECT n, count(*) AS cols FROM (
  SELECT conrelid, attnum, count(*) AS n FROM cc GROUP BY 1,2) s
GROUP BY 1 ORDER BY 1`;

const GENERATED_SQL = `
WITH tabs AS (
  SELECT r.oid, r.relname FROM pg_class r
  JOIN pg_namespace n ON n.oid=r.relnamespace
  WHERE r.relkind IN ('r','p') AND n.nspname='public'),
cc AS (
  SELECT c.conrelid, unnest(c.conkey) AS attnum
  FROM pg_constraint c JOIN tabs t ON t.oid=c.conrelid WHERE c.contype='c')
SELECT pg_get_expr(d.adbin, d.adrelid) AS expr,
       EXISTS (SELECT 1 FROM cc JOIN pg_attribute a2
               ON a2.attrelid=cc.conrelid AND a2.attnum=cc.attnum
               WHERE cc.conrelid=t.oid
                 AND pg_get_expr(d.adbin, d.adrelid) LIKE '%'||a2.attname||'%')
       AS reads_checked
FROM tabs t
JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped
JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
WHERE a.attgenerated <> ''`;

/**
 * The generation expression's own top node, taken from the parser rather than
 * from a list of expression "kinds" someone maintains. A CASE reads
 * differently from an arithmetic operator, and the parse tree already knows
 * which is which.
 */
async function generationKind(expr: string): Promise<string> {
  try {
    const p = await parseSql(`SELECT ${expr}`) as { stmts?: { stmt?: unknown }[] };
    const sel = tagged(p.stmts?.[0]?.stmt);
    const target = tagged(((sel?.[1].targetList as unknown[]) ?? [])[0]);
    const val = tagged(target?.[1].val);
    return val ? val[0] : "?";
  } catch {
    return "unparsed";
  }
}

async function measureSchema(schemaSql: string, s: Shape): Promise<void> {
  const pg = await PGlite.create({ extensions: { plpgsql_check } });
  try {
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(schemaSql);
    const [tot] = (await pg.query(SCHEMA_SQL)).rows as Record<string, number>[];
    if (tot) {
      s.tables += Number(tot.tables);
      s.nonKeyCols += Number(tot.nonkey);
      s.chainingPairs += Number(tot.chaining);
    }
    for (const r of (await pg.query(ARITY_SQL)).rows as { arity: number; n: number }[])
      bump(s.checkArity, Number(r.arity), Number(r.n));
    for (const r of (await pg.query(PER_COLUMN_SQL)).rows as { n: number; cols: number }[])
      bump(s.checksPerColumn, Number(r.n), Number(r.cols));
    for (const g of (await pg.query(GENERATED_SQL)).rows as
      { expr: string; reads_checked: boolean }[]) {
      s.generated++;
      if (g.reads_checked) s.generatedOverConstrained++;
      bump(s.generatedKinds, await generationKind(g.expr));
    }
  } finally {
    if (!pg.closed) await pg.close();
  }
}

async function measureQueries(dir: string, files: string[], s: Shape): Promise<void> {
  for (const f of files) {
    let p: { stmts?: { stmt?: unknown }[] };
    try {
      p = await parseSql(readFileSync(join(dir, f), "utf8")) as { stmts?: { stmt?: unknown }[] };
    } catch {
      continue;
    }
    for (const st of p.stmts ?? []) if (st.stmt) recordStatement(st.stmt, s);
  }
}

function worldDirs(): string[] {
  if (!existsSync(WORLDS_DIR)) return [];
  return readdirSync(WORLDS_DIR)
    .filter(d => statSync(join(WORLDS_DIR, d)).isDirectory()).sort();
}

// --- reporting -------------------------------------------------------------

function histogram(label: string, m: Map<number, number>, unit: string): void {
  const rows = [...m].sort((a, b) => a[0] - b[0]);
  if (!rows.length) { console.log(`\n${label}: none`); return; }
  const total = rows.reduce((n, [, v]) => n + v, 0);
  console.log(`\n${label}`);
  for (const [k, v] of rows) {
    const bar = "#".repeat(Math.max(1, Math.round((40 * v) / total)));
    console.log(`  ${String(k).padStart(3)} ${unit.padEnd(10)} ${String(v).padStart(5)}  ${bar}`);
  }
}

function ranked(label: string, m: Counter, limit = 16): void {
  const rows = [...m].sort((a, b) => b[1] - a[1]);
  console.log(`\n${label}  (${m.size} distinct)`);
  if (!rows.length) { console.log("  none"); return; }
  for (const [k, v] of rows.slice(0, limit))
    console.log(`  ${String(v).padStart(5)}  ${k}`);
  if (rows.length > limit) console.log(`        … ${rows.length - limit} more`);
}

function report(s: Shape): void {
  console.log(`\n${"=".repeat(72)}\nCORPUS: ${s.label} — ${s.statements} statements, ` +
    `${s.tables} tables, ${s.nonKeyCols} non-key columns\n${"=".repeat(72)}`);
  ranked("statement roots", s.roots);
  histogram("join nesting depth", s.depth, "deep");
  ranked("join-type chains (length >= 2)", s.chains);
  ranked("writing-statement features", s.dml);
  ranked("CTEs per statement", s.cteCount);
  ranked("CTE kinds", s.cteKinds);
  histogram("CHECK arity", s.checkArity, "column(s)");
  histogram("CHECKs per column", s.checksPerColumn, "CHECK(s)");
  console.log(`\nconstraint chaining pairs: ${s.chainingPairs}`);
  console.log(`generated columns: ${s.generated}, of which ` +
    `${s.generatedOverConstrained} read a CHECK-constrained column`);
  ranked("generation expression kinds", s.generatedKinds);
}

// ---------------------------------------------------------------------------

describe("corpus shape (input-side frontier)", () => {
  const shared = emptyShape("shared (grandfathered)");
  const worlds = emptyShape("worlds (isolated)");

  beforeAll(async () => {
    if (WANT_SHARED) {
      await measureSchema(readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8"), shared);
      await measureQueries(
        FIXTURES_DIR,
        readdirSync(FIXTURES_DIR).filter(f => f.endsWith(".sql") && f !== "schema.sql"),
        shared,
      );
    }
    if (WANT_WORLDS) {
      for (const name of worldDirs()) {
        const dir = join(WORLDS_DIR, name);
        if (!existsSync(join(dir, "schema.sql"))) continue;
        await measureSchema(readFileSync(join(dir, "schema.sql"), "utf8"), worlds);
        await measureQueries(
          dir,
          readdirSync(dir).filter(f =>
            f.endsWith(".sql") && f !== "schema.sql" && f !== "data.sql"),
          worlds,
        );
      }
    }

    if (WANT_SHARED) report(shared);
    if (WANT_WORLDS) report(worlds);

    if (WANT_SHARED && WANT_WORLDS) {
      const only = (a: Counter, b: Counter) => [...a.keys()].filter(k => !b.has(k));
      console.log(`\n${"=".repeat(72)}\nMARGINAL — reached by worlds, absent from ` +
        `the grandfathered corpus\n${"=".repeat(72)}`);
      for (const [label, a, b] of [
        ["join-type chains", worlds.chains, shared.chains],
        ["CTE kinds", worlds.cteKinds, shared.cteKinds],
        ["writing-statement features", worlds.dml, shared.dml],
        ["generation expression kinds", worlds.generatedKinds, shared.generatedKinds],
      ] as [string, Counter, Counter][]) {
        const m = only(a, b);
        console.log(`  ${label}: ${m.length ? m.join(", ") : "nothing new"}`);
      }
    }
  }, 600_000);

  it("collection ran over every selected corpus", () => {
    // The only gate here, and it is about the INSTRUMENT rather than the
    // corpus: a report that silently prints zeroes reads exactly like a corpus
    // with nothing in it. The floors live in worlds-health and the frontier
    // gate in rung-cooccurrence; a threshold invented here would turn a map of
    // unexplored input into a chore.
    const empty: string[] = [];
    if (WANT_SHARED && shared.statements === 0) empty.push("shared");
    if (WANT_WORLDS && worldDirs().length > 0 && worlds.statements === 0) empty.push("worlds");
    expect(empty, `no statements collected for: ${empty.join(", ")}`).toEqual([]);
  });
});
