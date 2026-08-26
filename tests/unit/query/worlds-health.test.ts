import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../../src/ast.js";

// ---------------------------------------------------------------------------
// Health of the isolated-world corpus.
//
// The shared fixture corpus asks every question of one schema, so the SHAPE of
// the input is a constant across it. This suite governs the directory where
// that constant is allowed to vary: each world brings its own schema, its own
// data and the fixtures that query it.
//
// Two kinds of assertion, and they fail for different reasons.
//
//   - Absolute rules, per table and per world. A violation names the world and
//     the table, because a world is authored as a unit and its author is the
//     person who can fix it.
//   - Ratcheted ratios, across the whole directory. No single world can be
//     judged against these, so they are stored and may not FALL. A ratchet
//     catches a world being deleted or replaced by a poorer one; it does not
//     by itself push the numbers up, and it is not claimed to.
//
// The shared corpus is deliberately NOT measured here. It is small-table-heavy
// because it was built to maximise queries per table, so it fails most of the
// shape rules below, and rewriting the schema that hundreds of fixtures depend
// on would be a large change to a suite that already works. Grandfathered.
// ---------------------------------------------------------------------------

const WORLDS_DIR = join(__dirname, "worlds");
const BASELINE = join(__dirname, "worlds-ratchet.json");
const REPORT = !!process.env.WORLDS_REPORT;
const UPDATE = !!process.env.WORLDS_RATCHET_UPDATE;

/** Ratios that may improve or hold, never fall. */
interface Ratchet {
  /** Columns carrying two or more CHECKs. */
  additivity: number;
  /** CHECK pairs sharing a column without covering identical columns. */
  chaining: number;
  /** Generated columns whose expression reads a CHECK-constrained column. */
  generatedOverConstrained: number;
  /** Distinct ordered join-type chains of length two or more. */
  joinChains: number;
  /** Deepest nested join tree in any fixture. */
  maxJoinDepth: number;
}
const ZERO: Ratchet = {
  additivity: 0, chaining: 0, generatedOverConstrained: 0,
  joinChains: 0, maxJoinDepth: 0,
};

interface WorldStats {
  name: string;
  tables: number;
  nonKeyCols: number;
  nonKeyNotNull: number;
  checks: number;
  checkArityTotal: number;
  generated: number;
  fks: number;
  fkNotNull: number;
  additivity: number;
  chaining: number;
  generatedOverConstrained: number;
  /** CHECK expressions carrying a literal NULL, and carrying a null test. */
  checkNullLiteral: number;
  checkNullTest: number;
  /** Generation expressions carrying a literal NULL. */
  generatedNullLiteral: number;
  // --- query side ---
  statements: number;
  /** Statements that modify, at the root OR inside a CTE. */
  modifying: number;
  /** Statements with a parameter somewhere its nullness can matter. */
  parametrized: number;
  /** Distinct qualifying parameters, summed over parametrized statements. */
  paramTotal: number;
  /** Modifying-statement kind → count, one per kind present in a statement. */
  dmlKinds: Map<string, number>;
  /** Absolute-rule failures, each already naming its world and table. */
  violations: string[];
}

// --- AST helpers -----------------------------------------------------------

function tagged(v: unknown): [string, Record<string, unknown>] | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const keys = Object.keys(v as object);
  const k = keys[0];
  if (keys.length !== 1 || k === undefined || !/^[A-Z]/.test(k)) return null;
  return [k, (v as Record<string, unknown>)[k] as Record<string, unknown>];
}

/** Every `field: value` under a node, whether or not the node is tagged. */
function fields(v: unknown): unknown[] {
  const t = tagged(v);
  return Object.values((t ? t[1] : v) as object);
}

function collect(v: unknown, type: string, out: Record<string, unknown>[]): void {
  if (Array.isArray(v)) { for (const x of v) collect(x, type, out); return; }
  if (!v || typeof v !== "object") return;
  const t = tagged(v);
  if (t && t[0] === type) out.push(t[1]);
  for (const x of fields(v)) collect(x, type, out);
}

function maxJoinDepth(v: unknown, d = 0): number {
  if (Array.isArray(v)) return v.reduce<number>((m, x) => Math.max(m, maxJoinDepth(x, d)), d);
  if (!v || typeof v !== "object") return d;
  const t = tagged(v);
  const next = t && t[0] === "JoinExpr" ? d + 1 : d;
  return fields(v).reduce<number>((m, x) => Math.max(m, maxJoinDepth(x, next)), next);
}

const MODIFYING = new Set(["InsertStmt", "UpdateStmt", "DeleteStmt", "MergeStmt"]);

/** A literal NULL — an `A_Const` carrying `isnull` rather than a value. */
function hasNullLiteral(v: unknown): boolean {
  const out: Record<string, unknown>[] = [];
  collect(v, "A_Const", out);
  return out.some(c => c.isnull === true);
}

function hasNullTest(v: unknown): boolean {
  const out: Record<string, unknown>[] = [];
  collect(v, "NullTest", out);
  return out.length > 0;
}

/**
 * Parameters in a position where being NULL can actually be concluded about.
 *
 * A parameter in `LIMIT` or `OFFSET` only bounds a row count, and a bare
 * parameter in a select list is a nullable output column with no reasoning
 * behind it — counting either would let a world satisfy a parametrization
 * floor by tacking `LIMIT $1` onto every query, which is the same degeneracy
 * a single-column CHECK is to the constraint density rule.
 *
 * Qualifying: predicates (WHERE, ON, HAVING), written values (VALUES, a SET
 * target, a MERGE arm) and function arguments — every place a NULL binding can
 * be rejected or can carry into a claim.
 */
function qualifyingParams(v: unknown, out: Set<number>, live = false): void {
  if (Array.isArray(v)) { for (const x of v) qualifyingParams(x, out, live); return; }
  if (!v || typeof v !== "object") return;
  const t = tagged(v);
  if (t && t[0] === "ParamRef") {
    if (live) out.add(Number(t[1].number ?? 0));
    return;
  }
  const [type, body] = t ?? [null, v as Record<string, unknown>];
  const isUpdate = type === "UpdateStmt";
  const isMerge = type === "MergeStmt";
  for (const [key, child] of Object.entries(body)) {
    // Row-count positions carry no nullability question at all.
    if (key === "limitCount" || key === "limitOffset") continue;
    const opens =
      key === "whereClause" || key === "quals" || key === "havingClause" ||
      key === "valuesLists" || key === "mergeWhenClauses" || key === "args" ||
      ((isUpdate || isMerge) && key === "targetList");
    qualifyingParams(child, out, live || opens);
  }
}

/** Ordered join-type chains, outermost inward. A qual starts a fresh chain. */
function joinChains(v: unknown, out: Set<string>, cur: string[] = []): void {
  if (Array.isArray(v)) { for (const x of v) joinChains(x, out, cur); return; }
  if (!v || typeof v !== "object") return;
  const t = tagged(v);
  if (t && t[0] === "JoinExpr") {
    const next = [...cur, String(t[1].jointype ?? "JOIN_INNER")];
    if (next.length > 1) out.add(next.join(" > "));
    joinChains(t[1].larg, out, next);
    joinChains(t[1].rarg, out, next);
    joinChains(t[1].quals, out, []);
    return;
  }
  for (const x of fields(v)) joinChains(x, out, cur);
}

// --- world discovery -------------------------------------------------------

function worldDirs(): string[] {
  if (!existsSync(WORLDS_DIR)) return [];
  return readdirSync(WORLDS_DIR)
    .filter(d => statSync(join(WORLDS_DIR, d)).isDirectory())
    .sort();
}

function fixtureFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter(f => f.endsWith(".sql") && f !== "schema.sql" && f !== "data.sql")
    .sort();
}

// --- per-world measurement -------------------------------------------------

/**
 * Catalog facts, read from the world after its schema is applied. Every one of
 * these is asked of PostgreSQL rather than of the SQL text, because a schema's
 * text and the catalog it produces are not the same thing — an inherited
 * constraint has no line anyone wrote.
 */
const STATS_SQL = `
WITH tabs AS (
  SELECT r.oid, r.relname FROM pg_class r
  JOIN pg_namespace n ON n.oid = r.relnamespace
  WHERE r.relkind IN ('r','p') AND n.nspname = 'public'),
keyed AS (
  SELECT c.conrelid, unnest(c.conkey) AS attnum
  FROM pg_constraint c JOIN tabs t ON t.oid = c.conrelid
  WHERE c.contype IN ('p','f','u')),
cols AS (
  SELECT t.oid AS relid, t.relname, a.attname, a.attnotnull, a.attnum,
         (k.attnum IS NOT NULL) AS is_key, a.attgenerated <> '' AS generated
  FROM tabs t
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN keyed k ON k.conrelid = t.oid AND k.attnum = a.attnum),
chk AS (
  SELECT c.oid, c.conrelid, c.conkey, coalesce(array_length(c.conkey,1),0) AS arity
  FROM pg_constraint c JOIN tabs t ON t.oid = c.conrelid WHERE c.contype = 'c'),
chkcol AS (SELECT conrelid, oid, unnest(conkey) AS attnum FROM chk)
SELECT
  (SELECT count(*) FROM tabs)                                        AS tables,
  (SELECT count(*) FROM cols WHERE NOT is_key)                       AS nonkey,
  (SELECT count(*) FROM cols WHERE NOT is_key AND attnotnull)        AS nonkey_notnull,
  (SELECT count(*) FROM chk)                                         AS checks,
  (SELECT coalesce(sum(arity),0) FROM chk)                           AS arity_total,
  (SELECT count(*) FROM cols WHERE generated)                        AS generated,
  (SELECT count(*) FROM pg_constraint c JOIN tabs t ON t.oid=c.conrelid
     WHERE c.contype='f')                                            AS fks,
  (SELECT count(*) FROM pg_constraint c
     JOIN tabs t ON t.oid = c.conrelid
     JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum = ANY(c.conkey)
     WHERE c.contype='f' AND a.attnotnull)                           AS fk_notnull,
  (SELECT count(*) FROM (
     SELECT conrelid, attnum FROM chkcol GROUP BY 1,2 HAVING count(*) >= 2) s)
                                                                     AS additivity,
  (SELECT count(*) FROM chk a JOIN chk b
     ON a.conrelid = b.conrelid AND a.oid < b.oid
     AND a.conkey && b.conkey AND NOT (a.conkey @> b.conkey AND b.conkey @> a.conkey))
                                                                     AS chaining
`;

/** Tables whose every column participates in a key — a pure join table. */
const JOIN_ONLY_SQL = `
WITH tabs AS (
  SELECT r.oid, r.relname FROM pg_class r
  JOIN pg_namespace n ON n.oid = r.relnamespace
  WHERE r.relkind IN ('r','p') AND n.nspname='public'),
keyed AS (
  SELECT c.conrelid, unnest(c.conkey) AS attnum FROM pg_constraint c
  WHERE c.contype IN ('p','f','u'))
SELECT t.relname,
       count(*) FILTER (WHERE k.attnum IS NULL) AS nonkey,
       bool_and(k.attnum IS NOT NULL)           AS join_only,
       EXISTS (SELECT 1 FROM pg_constraint c
               WHERE c.conrelid = t.oid AND c.contype='c') AS has_check
FROM tabs t
JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped
LEFT JOIN keyed k ON k.conrelid=t.oid AND k.attnum=a.attnum
GROUP BY t.oid, t.relname ORDER BY t.relname`;

/** Every CHECK as the catalog renders it, for its three-valued content. */
const CHECK_EXPR_SQL = `
SELECT pg_get_expr(c.conbin, c.conrelid) AS expr
FROM pg_constraint c
JOIN pg_class r ON r.oid = c.conrelid
JOIN pg_namespace n ON n.oid = r.relnamespace
WHERE c.contype = 'c' AND n.nspname = 'public'`;

/**
 * A rendered expression as a parse tree. Wrapping it in a select is the only
 * way to hand a bare expression to a statement parser; a rendering that will
 * not parse is skipped rather than counted, because guessing at its content
 * would be worse than admitting it was not read.
 */
async function parseExpression(expr: string): Promise<unknown | null> {
  try {
    const p = await parseSql(`SELECT ${expr}`) as { stmts?: { stmt?: unknown }[] };
    const sel = tagged(p.stmts?.[0]?.stmt);
    const target = tagged(((sel?.[1].targetList as unknown[]) ?? [])[0]);
    return target?.[1].val ?? null;
  } catch {
    return null;
  }
}

/** Generated columns, with whether the expression mentions a checked column. */
const GENERATED_SQL = `
WITH tabs AS (
  SELECT r.oid, r.relname FROM pg_class r
  JOIN pg_namespace n ON n.oid=r.relnamespace
  WHERE r.relkind IN ('r','p') AND n.nspname='public'),
cc AS (
  SELECT c.conrelid, unnest(c.conkey) AS attnum
  FROM pg_constraint c JOIN tabs t ON t.oid=c.conrelid WHERE c.contype='c')
SELECT t.relname, a.attname, pg_get_expr(d.adbin, d.adrelid) AS expr,
       EXISTS (SELECT 1 FROM cc JOIN pg_attribute a2
               ON a2.attrelid=cc.conrelid AND a2.attnum=cc.attnum
               WHERE cc.conrelid=t.oid
                 AND pg_get_expr(d.adbin, d.adrelid) LIKE '%'||a2.attname||'%')
       AS reads_checked
FROM tabs t
JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped
JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
WHERE a.attgenerated <> '' ORDER BY t.relname, a.attname`;

async function measureWorld(
  name: string,
  chains: Set<string>,
  depth: { max: number },
): Promise<WorldStats> {
  const dir = join(WORLDS_DIR, name);
  const violations: string[] = [];
  const where = (msg: string) => violations.push(`${name}: ${msg}`);

  const schemaPath = join(dir, "schema.sql");
  if (!existsSync(schemaPath)) {
    where("has no schema.sql — a world owns its schema");
    return { ...emptyStats(name), violations };
  }

  const pg = await PGlite.create({ extensions: { plpgsql_check } });
  try {
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(readFileSync(schemaPath, "utf8"));

    const [s] = (await pg.query(STATS_SQL)).rows as Record<string, number>[];
    if (!s) {
      // The aggregate query returns exactly one row for any schema, so no row
      // means the schema did not apply the way this suite assumes.
      where("produced no catalog statistics — check that schema.sql applies");
      return { ...emptyStats(name), violations };
    }
    const perTable = (await pg.query(JOIN_ONLY_SQL)).rows as {
      relname: string; nonkey: number; join_only: boolean; has_check: boolean;
    }[];
    const gen = (await pg.query(GENERATED_SQL)).rows as {
      relname: string; attname: string; expr: string; reads_checked: boolean;
    }[];
    const checkExprs = (await pg.query(CHECK_EXPR_SQL)).rows as { expr: string }[];

    // Three-valued content of the schema's own expressions. Parsing what the
    // catalog RENDERS rather than what the author typed is deliberate: an
    // inherited constraint has no source line, and the rendering is what every
    // other reader of these constraints sees.
    let checkNullLiteral = 0;
    let checkNullTest = 0;
    for (const c of checkExprs) {
      const e = await parseExpression(c.expr);
      if (e === null) continue;
      if (hasNullLiteral(e)) checkNullLiteral++;
      if (hasNullTest(e)) checkNullTest++;
    }
    let generatedNullLiteral = 0;
    for (const g of gen) {
      const e = await parseExpression(g.expr);
      if (e !== null && hasNullLiteral(e)) generatedNullLiteral++;
    }

    // --- fixtures: what does this world actually ask? ---
    const files = fixtureFiles(dir);
    if (files.length === 0) where("has no fixtures — a world with no questions is dead schema");
    const referenced = new Set<string>();
    const columnRefs = new Set<string>();
    let anyStar = false;
    let statements = 0;
    let modifying = 0;
    let parametrized = 0;
    let paramTotal = 0;
    const dmlKinds = new Map<string, number>();
    for (const f of files) {
      let parsed: unknown;
      try {
        parsed = await parseSql(readFileSync(join(dir, f), "utf8"));
      } catch (e) {
        where(`${f} does not parse — ${(e as Error).message}`);
        continue;
      }
      for (const st of (parsed as { stmts?: { stmt?: unknown }[] }).stmts ?? []) {
        if (!st.stmt) continue;
        const rv: Record<string, unknown>[] = [];
        collect(st.stmt, "RangeVar", rv);
        for (const r of rv) if (typeof r.relname === "string") referenced.add(r.relname);
        const cr: Record<string, unknown>[] = [];
        collect(st.stmt, "ColumnRef", cr);
        for (const c of cr)
          for (const part of (c.fields as unknown[]) ?? []) {
            const t = tagged(part);
            if (t && t[0] === "String" && typeof t[1].sval === "string") columnRefs.add(t[1].sval);
            if (t && t[0] === "A_Star") anyStar = true;
          }
        joinChains(st.stmt, chains);
        depth.max = Math.max(depth.max, maxJoinDepth(st.stmt));

        statements++;
        // A statement modifies if it modifies ANYWHERE — a data-modifying CTE
        // writes exactly as much as a top-level one, and its RETURNING is a
        // claim surface either way.
        const kinds = new Set<string>();
        for (const k of MODIFYING) {
          const found: Record<string, unknown>[] = [];
          collect(st.stmt, k, found);
          if (found.length) kinds.add(k);
        }
        if (kinds.size) {
          modifying++;
          for (const k of kinds) dmlKinds.set(k, (dmlKinds.get(k) ?? 0) + 1);
        }
        const params = new Set<number>();
        qualifyingParams(st.stmt, params);
        if (params.size) { parametrized++; paramTotal += params.size; }
      }
    }

    // --- absolute rules ---
    if (Number(s.tables) < 3) where(`has ${s.tables} table(s); at least 3 are required`);

    for (const t of perTable) {
      if (!referenced.has(t.relname))
        where(`table ${t.relname} is never referenced by a fixture in this world`);
      if (t.join_only) continue;
      if (Number(t.nonkey) < 3)
        where(`table ${t.relname} has ${t.nonkey} non-key column(s); 3 are required unless it exists only to join`);
      else if (!t.has_check)
        where(`table ${t.relname} has ${t.nonkey} non-key columns and no CHECK`);
    }

    const needChecks = Math.ceil(Number(s.nonkey) / 3);
    if (Number(s.checks) < needChecks)
      where(`${s.checks} CHECK(s) for ${s.nonkey} non-key columns; ${needChecks} required (one per three)`);

    if (Number(s.checks) > 0) {
      const avg = Number(s.arity_total) / Number(s.checks);
      if (avg < 2)
        where(`CHECKs average ${avg.toFixed(2)} columns; at least 2 required`);
    }

    const share = Number(s.nonkey) === 0 ? 0 : Number(s.nonkey_notnull) / Number(s.nonkey);
    if (Number(s.nonkey) > 0 && (share < 0.25 || share > 0.75))
      where(`${(share * 100).toFixed(0)}% of non-key columns are NOT NULL; the band is 25–75%`);

    if (Number(s.fks) < 1) where("declares no foreign key");
    else if (Number(s.fk_notnull) < 1) where("has foreign keys but none is NOT NULL");

    for (const g of gen)
      if (!columnRefs.has(g.attname) && !anyStar)
        where(`generated column ${g.relname}.${g.attname} is never read by a fixture in this world`);

    return {
      name,
      tables: Number(s.tables),
      nonKeyCols: Number(s.nonkey),
      nonKeyNotNull: Number(s.nonkey_notnull),
      checks: Number(s.checks),
      checkArityTotal: Number(s.arity_total),
      generated: Number(s.generated),
      fks: Number(s.fks),
      fkNotNull: Number(s.fk_notnull),
      additivity: Number(s.additivity),
      chaining: Number(s.chaining),
      generatedOverConstrained: gen.filter(g => g.reads_checked).length,
      checkNullLiteral,
      checkNullTest,
      generatedNullLiteral,
      statements,
      modifying,
      parametrized,
      paramTotal,
      dmlKinds,
      violations,
    };
  } finally {
    if (!pg.closed) await pg.close();
  }
}

/**
 * A corpus-wide proportion.
 *
 * Every one of these binds only once its denominator can EXPRESS the
 * threshold — a five percent floor means nothing over twelve statements, since
 * one statement is already eight percent. The gate is therefore derived from
 * the threshold itself rather than chosen per rule, and a proportion below its
 * gate is reported without failing. That is what lets these be designed now,
 * while the corpus they govern is still small enough to be arithmetic.
 */
interface Ratio {
  label: string;
  n: number;
  d: number;
  unit: string;
  floor: number;
  ceiling?: number;
}

function ratiosFor(all: WorldStats[]): Ratio[] {
  const sum = (pick: (w: WorldStats) => number) => all.reduce((n, w) => n + pick(w), 0);
  const statements = sum(w => w.statements);
  const modifying = sum(w => w.modifying);
  const checks = sum(w => w.checks);
  const generated = sum(w => w.generated);
  const kind = (k: string) => sum(w => w.dmlKinds.get(k) ?? 0);
  return [
    { label: "statements that modify (root or in a CTE)", n: modifying, d: statements, unit: "statements", floor: 0.2 },
    { label: "statements with a qualifying parameter", n: sum(w => w.parametrized), d: statements, unit: "statements", floor: 0.4, ceiling: 0.7 },
    { label: "modifying statements that INSERT", n: kind("InsertStmt"), d: modifying, unit: "modifying statements", floor: 0.2 },
    { label: "modifying statements that UPDATE", n: kind("UpdateStmt"), d: modifying, unit: "modifying statements", floor: 0.2 },
    { label: "modifying statements that MERGE", n: kind("MergeStmt"), d: modifying, unit: "modifying statements", floor: 0.2 },
    { label: "modifying statements that DELETE", n: kind("DeleteStmt"), d: modifying, unit: "modifying statements", floor: 0.05 },
    { label: "CHECKs carrying a null test", n: sum(w => w.checkNullTest), d: checks, unit: "CHECKs", floor: 0.5 },
    { label: "CHECKs carrying a literal NULL", n: sum(w => w.checkNullLiteral), d: checks, unit: "CHECKs", floor: 0.1 },
    { label: "generation expressions carrying a literal NULL", n: sum(w => w.generatedNullLiteral), d: generated, unit: "generated columns", floor: 0.3 },
  ];
}

/** The denominator at which a floor stops being arithmetic and starts binding. */
function bindsAt(floor: number): number {
  return Math.ceil(1 / floor);
}

function emptyStats(name: string): WorldStats {
  return {
    name, tables: 0, nonKeyCols: 0, nonKeyNotNull: 0, checks: 0, checkArityTotal: 0,
    generated: 0, fks: 0, fkNotNull: 0, additivity: 0, chaining: 0,
    generatedOverConstrained: 0, checkNullLiteral: 0, checkNullTest: 0,
    generatedNullLiteral: 0, statements: 0, modifying: 0, parametrized: 0,
    paramTotal: 0, dmlKinds: new Map(), violations: [],
  };
}

// ---------------------------------------------------------------------------

describe("isolated-world corpus health", () => {
  const worlds: WorldStats[] = [];
  const chains = new Set<string>();
  const depth = { max: 0 };
  let current: Ratchet = { ...ZERO };
  let stored: Ratchet = { ...ZERO };

  beforeAll(async () => {
    for (const name of worldDirs()) worlds.push(await measureWorld(name, chains, depth));

    const sum = (pick: (w: WorldStats) => number) => worlds.reduce((n, w) => n + pick(w), 0);
    current = {
      additivity: sum(w => w.additivity),
      chaining: sum(w => w.chaining),
      generatedOverConstrained: sum(w => w.generatedOverConstrained),
      joinChains: chains.size,
      maxJoinDepth: depth.max,
    };
    stored = existsSync(BASELINE)
      ? { ...ZERO, ...(JSON.parse(readFileSync(BASELINE, "utf8")) as Partial<Ratchet>) }
      : { ...ZERO };

    if (UPDATE) {
      const raised = Object.fromEntries(
        (Object.keys(ZERO) as (keyof Ratchet)[]).map(k => [k, Math.max(stored[k], current[k])]),
      );
      writeFileSync(BASELINE, JSON.stringify(raised, null, 2) + "\n");
    }

    if (REPORT) {
      const tables = sum(w => w.tables);
      const generated = sum(w => w.generated);
      console.log(`\nworlds: ${worlds.length}   tables: ${tables}   ` +
        `non-key columns: ${sum(w => w.nonKeyCols)}   CHECKs: ${sum(w => w.checks)}   ` +
        `generated: ${generated}`);
      for (const w of worlds) {
        const avg = w.checks ? (w.checkArityTotal / w.checks).toFixed(2) : "—";
        const nn = w.nonKeyCols ? `${((100 * w.nonKeyNotNull) / w.nonKeyCols).toFixed(0)}%` : "—";
        console.log(`  ${w.name.padEnd(28)} tables ${String(w.tables).padStart(3)}  ` +
          `nonkey ${String(w.nonKeyCols).padStart(3)}  CHECK ${String(w.checks).padStart(3)}` +
          ` (avg ${avg})  NOT NULL ${nn.padStart(4)}  gen ${w.generated}  fk ${w.fks}`);
      }
      console.log("\ncorpus-wide proportions");
      for (const r of ratiosFor(worlds)) {
        const gate = bindsAt(r.floor);
        const share = r.d === 0 ? 0 : (100 * r.n) / r.d;
        const range = `${(100 * r.floor).toFixed(0)}%` +
          (r.ceiling === undefined ? " min" : `–${(100 * r.ceiling).toFixed(0)}%`);
        const status = r.d < gate
          ? `not binding until ${gate} ${r.unit}`
          : share / 100 < r.floor ? "BELOW FLOOR"
          : r.ceiling !== undefined && share / 100 > r.ceiling ? "ABOVE CEILING" : "ok";
        console.log(`  ${r.label.padEnd(46)} ${String(r.n).padStart(4)}/${String(r.d).padEnd(4)} ` +
          `${share.toFixed(0).padStart(4)}%  want ${range.padEnd(9)} ${status}`);
      }

      console.log("\nratcheted   stored → current");
      for (const k of Object.keys(ZERO) as (keyof Ratchet)[])
        console.log(`  ${k.padEnd(26)} ${String(stored[k]).padStart(4)} → ${String(current[k]).padStart(4)}` +
          (current[k] < stored[k] ? "   REGRESSED" : ""));
      if (chains.size) console.log(`\njoin-type chains:\n  ${[...chains].sort().join("\n  ")}`);
    }
  });

  it("every world satisfies the absolute table and world rules", () => {
    const all = worlds.flatMap(w => w.violations);
    expect(
      all,
      `Absolute rule violations. Each names the world that owns the fix; the ` +
        `rules and their reasons are in worlds/AGENTS.md:\n  ${all.join("\n  ")}`,
    ).toEqual([]);
  });

  it("corpus-wide proportions hold wherever they bind", () => {
    const failures: string[] = [];
    for (const r of ratiosFor(worlds)) {
      if (r.d < bindsAt(r.floor)) continue; // still arithmetic, not a measurement
      const share = r.n / r.d;
      const pc = (x: number) => `${(100 * x).toFixed(0)}%`;
      if (share < r.floor)
        failures.push(`${r.label}: ${r.n}/${r.d} = ${pc(share)}, floor is ${pc(r.floor)}`);
      else if (r.ceiling !== undefined && share > r.ceiling)
        failures.push(`${r.label}: ${r.n}/${r.d} = ${pc(share)}, ceiling is ${pc(r.ceiling)}`);
    }
    expect(
      failures,
      `Corpus-wide proportions out of range. These are corpus-wide because a ` +
        `single world built to test one thing should not be forced to carry ` +
        `every shape; the rules and their reasons are in worlds/AGENTS.md:\n  ` +
        failures.join("\n  "),
    ).toEqual([]);
  });

  it("parametrized statements carry more than one parameter on average", () => {
    const parametrized = worlds.reduce((n, w) => n + w.parametrized, 0);
    if (parametrized < 2) return; // an average over one statement is that statement
    const avg = worlds.reduce((n, w) => n + w.paramTotal, 0) / parametrized;
    expect(
      avg,
      `parameters average ${avg.toFixed(2)} per parametrized statement over ` +
        `${parametrized} of them; 1.5 is the floor. A corpus of one-parameter ` +
        `queries never asks whether two bindings interact.`,
    ).toBeGreaterThanOrEqual(1.5);
  });

  it("the corpus carries a generated column per five tables", () => {
    const tables = worlds.reduce((n, w) => n + w.tables, 0);
    const generated = worlds.reduce((n, w) => n + w.generated, 0);
    const need = Math.floor(tables / 5);
    expect(
      generated,
      `${generated} generated column(s) across ${tables} table(s); ${need} required. ` +
        `This ratio is corpus-wide because forcing one into every small world ` +
        `would distort worlds built to test something else.`,
    ).toBeGreaterThanOrEqual(need);
  });

  it("no ratcheted ratio has fallen", () => {
    const fallen = (Object.keys(ZERO) as (keyof Ratchet)[])
      .filter(k => current[k] < stored[k])
      .map(k => `${k}: ${stored[k]} → ${current[k]}`);
    expect(
      fallen,
      `A ratcheted measure fell. Either the change removed composition the ` +
        `corpus had, or it replaced a world with a poorer one. Re-run with ` +
        `WORLDS_RATCHET_UPDATE=1 only when the drop is deliberate and ` +
        `explained in the commit message:\n  ${fallen.join("\n  ")}`,
    ).toEqual([]);
  });
});
