// The discovery instrument, slice 1 — `docs/catalog-driven-generation.md` §3.
//
//   pnpm exec tsx tests/probe/discovery.ts [queries] [seed]
//
// It generates random join queries over the tables the fixture schema's
// FOREIGN KEYS connect (§7's list 2), runs each against both the engine and
// PostgreSQL, and classifies every outcome into one of §6's buckets. It gates
// nothing and asserts nothing: per §4 this is the DISCOVERY half, whose only
// product is a falsifying query, and whose success measure is findings per run
// rather than green.
//
// What slice 1 does and does not do, so the report is not read as more than it
// is:
//
//   - joins 2..4 tables by following foreign keys, in any of the four join
//     kinds, plus a self-join where a key points a table at itself;
//   - projects a random subset of columns, qualified and aliased;
//   - puts a WHERE on about 70% of them, built from `IS [NOT] NULL` and the
//     six comparisons against a literal DRAWN FROM the column's own seeded
//     values (§3 — a literal from a type generator matches nothing), combined
//     with AND, OR, NOT and one mixed tree. OR and NOT are generated on
//     purpose rather than avoided: they must BLOCK the promotion that a strict
//     comparison licenses, and getting that backwards is the classic
//     unsoundness in this area;
//   - SELECT only. No DML, no set operations, no subqueries.
//
// Everything absent from that list is a later slice. The bound is printed with
// the result, because §6's closing rule is that a run finding nothing must
// state what it covered — and beside it the saturation curve, which says
// whether running longer would have bought anything.
import { deparseSync } from "pgsql-deparser";
import { snapshotCatalog } from "../../src/catalog/snapshot.js";
import type { CatalogSnapshot, TableInfo } from "../../src/catalog/types.js";
import { generateFixtureData } from "../unit/query/fixture-data/generate.js";
import { fixtureGeneratorRegistry } from "../unit/query/fixture-data/generators.js";
import { makeRand, type Rand } from "../unit/query/fixture-data/random.js";
import { ProbeLoop, type ProbeResult } from "./harness.js";

// ---------------------------------------------------------------------------
// The join graph
// ---------------------------------------------------------------------------

interface Edge {
  /** The table holding the key column. */
  child: string;
  /** The table it references. */
  parent: string;
  childColumn: string;
  parentColumn: string;
  /**
   * Whether an outer join over this key can actually produce a NULL-extended
   * row (§5.2). PostgreSQL enforces the key, so joining child -> parent finds
   * a parent for every child row unless the key column is nullable or the key
   * is NOT VALID. Joining parent -> child is always inhabitable: a parent with
   * no children violates nothing.
   */
  childToParentCanExtend: boolean;
}

function edgesOf(snapshot: CatalogSnapshot): Edge[] {
  const out: Edge[] = [];
  for (const t of snapshot.tables) {
    const notNull = new Map(t.columns.map(c => [c.name, c.notNull]));
    for (const c of t.constraints) {
      if (c.type !== "foreign" || c.columns.length !== 1) continue;
      if (!c.foreignTable || c.foreignColumns?.length !== 1) continue;
      // A clone is the same key recorded again for a partition; following it
      // would emit the same join twice under a different name.
      if (c.inheritedClone) continue;
      const childColumn = c.columns[0]!;
      out.push({
        child: `${t.schema}.${t.name}`,
        parent: `${c.foreignSchema ?? t.schema}.${c.foreignTable}`,
        childColumn,
        parentColumn: c.foreignColumns[0]!,
        childToParentCanExtend: !c.validated || !(notNull.get(childColumn) ?? false),
      });
    }
  }
  return out;
}

/** The tables reachable from each other by following edges in either direction. */
function groupsOf(tables: string[], edges: Edge[]): string[][] {
  const up = new Map(tables.map(t => [t, t]));
  const find = (x: string): string => {
    let r = x;
    while (up.get(r) !== r) r = up.get(r)!;
    return r;
  };
  for (const e of edges) {
    if (up.has(e.child) && up.has(e.parent)) up.set(find(e.child), find(e.parent));
  }
  const byRoot = new Map<string, string[]>();
  for (const t of tables) {
    const root = find(t);
    const arr = byRoot.get(root);
    if (arr) arr.push(t); else byRoot.set(root, [t]);
  }
  return [...byRoot.values()].filter(g => g.length > 1).sort((a, b) => b.length - a.length);
}

// ---------------------------------------------------------------------------
// AST construction
//
// ASTs, not text — the decision recorded in §5.1. The deparser round trip is a
// measured 97% clean over the fixture corpus and its five defects are pinned
// upstream bugs, where emitting text means writing a query builder whose hard
// parts DO arise once generation is randomised.
// ---------------------------------------------------------------------------

type Ast = Record<string, unknown>;

const str = (s: string): Ast => ({ String: { sval: s } });
const colRef = (alias: string, column: string): Ast =>
  ({ ColumnRef: { fields: [str(alias), str(column)] } });
const target = (val: Ast, name: string): Ast => ({ ResTarget: { name, val } });
const rangeVar = (schema: string, table: string, alias: string): Ast =>
  ({ RangeVar: { schemaname: schema, relname: table, inh: true, relpersistence: "p", alias: { aliasname: alias } } });
const eq = (l: Ast, r: Ast): Ast =>
  ({ A_Expr: { kind: "AEXPR_OP", name: [str("=")], lexpr: l, rexpr: r } });
const op = (name: string, l: Ast, r: Ast): Ast =>
  ({ A_Expr: { kind: "AEXPR_OP", name: [str(name)], lexpr: l, rexpr: r } });
const nullTest = (arg: Ast, isNull: boolean): Ast =>
  ({ NullTest: { arg, nulltesttype: isNull ? "IS_NULL" : "IS_NOT_NULL" } });
const boolExpr = (boolop: "AND_EXPR" | "OR_EXPR" | "NOT_EXPR", args: Ast[]): Ast =>
  ({ BoolExpr: { boolop, args } });

/**
 * A literal for a value the DATA actually holds.
 *
 * §3: volume does not buy overlap. `WHERE p.name = 'zeta-17'` returns nothing
 * against a million rows if the literal came from a type generator, so every
 * predicate literal is drawn from the column it is compared against — the same
 * mechanism that makes the seeded foreign keys resolve, one layer up.
 */
function literalFor(v: unknown): Ast | null {
  if (v === null) return null;
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? { A_Const: { ival: v === 0 ? {} : { ival: v } } }
      : { A_Const: { fval: { fval: String(v) } } };
  }
  if (typeof v === "boolean") return { A_Const: { boolval: v ? { boolval: true } : {} } };
  if (typeof v === "string") return { A_Const: { sval: { sval: v } } };
  if (typeof v === "bigint") return { A_Const: { ival: { ival: Number(v) } } };
  // Dates, arrays, json and the rest: rendering them faithfully is a type
  // problem, and a wrong rendering is a TOOL defect masquerading as a finding.
  // They are skipped, and the run reports how often.
  return null;
}

const JOIN_KINDS = ["JOIN_INNER", "JOIN_LEFT", "JOIN_RIGHT", "JOIN_FULL"] as const;

interface Built {
  sql: string;
  /** Aliases in the order they were joined, with the table each stands for. */
  used: { alias: string; table: string }[];
  kinds: string[];
  /** Stable description of the query's shape, literals and names erased. */
  shape: string;
}

/** Sampled values per `schema.table.column`, for drawing predicate literals. */
type ValuePool = Map<string, unknown[]>;

/**
 * One WHERE predicate over an alias in the query.
 *
 * The shapes are chosen for what they do to PRESENCE, which is where the walk
 * reasons and so where it can be wrong:
 *
 *   - a STRICT comparison cannot hold on a NULL-extended row, so it cancels an
 *     outer join's extension and promotes the alias — the rule
 *     `whereImpliesAliasNotNull` implements;
 *   - `IS NOT NULL` promotes the one column, and `IS NULL` does the opposite,
 *     keeping only extended rows;
 *   - OR and NOT must BLOCK promotion (`a.x = 1 OR b.y = 2` proves neither
 *     side), and getting that wrong is the classic unsoundness in this area,
 *     so both are generated deliberately rather than avoided.
 */
function predicate(rand: Rand, used: { alias: string; table: string }[], byId: Map<string, TableInfo>, pool: ValuePool): Ast | null {
  const u = rand.pick(used);
  const t = byId.get(u.table);
  if (!t) return null;
  const cols = t.columns.filter(c => c.generated !== "virtual");
  if (cols.length === 0) return null;
  const col = rand.pick(cols);
  const ref = colRef(u.alias, col.name);

  const form = rand.int(0, 5);
  if (form === 0) return nullTest(ref, true);
  if (form === 1) return nullTest(ref, false);

  const values = (pool.get(`${u.table}.${col.name}`) ?? []).filter(v => v !== null);
  if (values.length === 0) return null;
  const lit = literalFor(rand.pick(values));
  if (!lit) return null;
  if (form === 2) return op("=", ref, lit);
  if (form === 3) return op("<>", ref, lit);
  if (form === 4) return op(rand.pick([">", "<", ">=", "<="]), ref, lit);
  return op("=", ref, lit);
}

function whereClause(rand: Rand, used: { alias: string; table: string }[], byId: Map<string, TableInfo>, pool: ValuePool): { node: Ast; shape: string } | null {
  const one = (): Ast | null => predicate(rand, used, byId, pool);
  const form = rand.int(0, 4);
  if (form === 0) {
    const p = one();
    return p ? { node: p, shape: "1" } : null;
  }
  if (form === 1 || form === 2) {
    const a = one(), b = one();
    if (!a || !b) return null;
    const boolop = form === 1 ? "AND_EXPR" : "OR_EXPR";
    return { node: boolExpr(boolop, [a, b]), shape: form === 1 ? "AND" : "OR" };
  }
  if (form === 3) {
    const p = one();
    return p ? { node: boolExpr("NOT_EXPR", [p]), shape: "NOT" } : null;
  }
  const a = one(), b = one(), c = one();
  if (!a || !b || !c) return null;
  // A mixed tree — the shape where promotion has to survive one level and be
  // blocked at another.
  return { node: boolExpr("AND_EXPR", [a, boolExpr("OR_EXPR", [b, c])]), shape: "AND(OR)" };
}

/**
 * Walk the join graph from a random table, emitting a join tree.
 *
 * Left-deep only in slice 1: the existing enumerated corpus already crosses
 * five tree shapes (`generateDeepJoinQueries`), and what is unexplored here is
 * the CATALOG, not the tree.
 */
function buildQuery(
  rand: Rand,
  snapshot: CatalogSnapshot,
  group: string[],
  edges: Edge[],
  pool: ValuePool,
): Built | null {
  const byId = new Map(snapshot.tables.map(t => [`${t.schema}.${t.name}`, t]));
  const target_ = rand.int(2, 4);
  const start = rand.pick(group);
  const used: { alias: string; table: string }[] = [{ alias: "r0", table: start }];
  const kinds: string[] = [];

  let from: Ast = fromItem(byId.get(start)!, "r0");
  const shapeParts: string[] = [];

  for (let i = 1; i < target_; i++) {
    // Any edge touching a table already in the query, in either direction. A
    // self-referencing key qualifies too: it joins the table to itself under a
    // second alias, which §7 measured to be the only way two of the three
    // inhabitable child->parent keys can be reached at all.
    const candidates = edges.filter(e =>
      used.some(u => u.table === e.child) || used.some(u => u.table === e.parent));
    if (candidates.length === 0) break;
    const edge = rand.pick(candidates);

    // Which end is already present decides which end we are adding, and a
    // self-reference is present at both ends — pick a direction.
    const childIn = used.some(u => u.table === edge.child);
    const parentIn = used.some(u => u.table === edge.parent);
    const addParent = edge.child === edge.parent ? rand.chance(0.5) : childIn && !parentIn;
    if (!addParent && parentIn === false) continue;

    const anchorTable = addParent ? edge.child : edge.parent;
    const anchor = rand.pick(used.filter(u => u.table === anchorTable));
    const added = addParent ? edge.parent : edge.child;
    const addedTable = byId.get(added);
    if (!addedTable) continue;

    const alias = `r${i}`;
    const kind = rand.pick(JOIN_KINDS);
    kinds.push(kind);
    const anchorCol = addParent ? edge.childColumn : edge.parentColumn;
    const addedCol = addParent ? edge.parentColumn : edge.childColumn;

    from = {
      JoinExpr: {
        jointype: kind,
        larg: from,
        rarg: fromItem(addedTable, alias),
        quals: eq(colRef(anchor.alias, anchorCol), colRef(alias, addedCol)),
      },
    };
    used.push({ alias, table: added });
    shapeParts.push(`${kind}:${addParent ? "child->parent" : "parent->child"}`);
  }
  if (used.length < 2) return null;

  // Project a few columns per table, always at least one, so a claim exists.
  const targetList: Ast[] = [];
  for (const u of used) {
    const t = byId.get(u.table)!;
    const cols = t.columns.filter(c => c.generated !== "virtual");
    if (cols.length === 0) continue;
    const take = Math.min(cols.length, rand.int(1, 3));
    const chosen = new Set<string>();
    for (let k = 0; k < take; k++) chosen.add(rand.pick(cols).name);
    for (const name of chosen) {
      targetList.push(target(colRef(u.alias, name), `${u.alias}_${name}`));
    }
  }
  if (targetList.length === 0) return null;

  // A WHERE clause on most queries, and deliberately none on the rest: the
  // unfiltered path is the one every existing claim was measured on.
  const where = rand.chance(0.7) ? whereClause(rand, used, byId, pool) : null;

  const stmt = {
    SelectStmt: {
      targetList,
      fromClause: [from],
      ...(where ? { whereClause: where.node } : {}),
      limitOption: "LIMIT_OPTION_DEFAULT",
      op: "SETOP_NONE",
    },
  };
  const sql = deparseSync(stmt as Parameters<typeof deparseSync>[0]);
  return {
    sql,
    used,
    kinds,
    // Table identities matter here — the whole point is that the catalog
    // varies — so the shape keys on tables and join kinds, not on the aliases
    // or the projected column names. The WHERE contributes its STRUCTURE only,
    // for the same reason: a random literal must not mint a fresh shape.
    shape: `${used.map(u => u.table).join("+")}|${shapeParts.join(",")}|W:${where?.shape ?? "-"}`,
  };
}

function fromItem(t: TableInfo, alias: string): Ast {
  return rangeVar(t.schema, t.name, alias);
}

// ---------------------------------------------------------------------------
// Buckets — §6. Every query lands in exactly one; an outcome nothing
// classifies fails the run rather than being swallowed.
// ---------------------------------------------------------------------------

type Bucket =
  | "generator-threw" | "deparse-threw" | "reparse-failed" | "pg-rejected" | "pg-raised"
  | "engine-refused" | "engine-crashed" | "shape-mismatch" | "notnull-violated"
  | "group-violated" | "parity-broke" | "agreed-rows" | "agreed-norows";

const TIER: Record<Bucket, "TOOL" | "BUDGET" | "FINDING" | "EXPECTED" | "OK"> = {
  "generator-threw": "TOOL", "deparse-threw": "TOOL", "reparse-failed": "TOOL",
  "pg-rejected": "TOOL", "pg-raised": "BUDGET",
  "engine-refused": "EXPECTED",
  "engine-crashed": "FINDING", "shape-mismatch": "FINDING", "notnull-violated": "FINDING",
  "group-violated": "FINDING", "parity-broke": "FINDING",
  "agreed-rows": "OK", "agreed-norows": "OK",
};

function classify(r: ProbeResult): Bucket {
  if (r.error) return r.error.startsWith("UnsupportedNodeError") ? "engine-refused" : "engine-crashed";
  if (r.pgError) return /syntax error|does not exist|ambiguous/i.test(r.pgError) ? "pg-rejected" : "pg-raised";
  if (r.shape) return "shape-mismatch";
  if (r.violations.length) return "notnull-violated";
  if (r.groupViolations.length) return "group-violated";
  if (r.parity) return "parity-broke";
  return r.rows.length > 0 ? "agreed-rows" : "agreed-norows";
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const COUNT = Number(process.argv[2] ?? 2000);
const SEED = Number(process.argv[3] ?? 20260808);

const loop = await ProbeLoop.create();
const snapshot = await snapshotCatalog(loop.pg);
// One dataset for the whole session: `run` wraps each query in
// BEGIN/ROLLBACK, so anything seeded here survives every query and every
// query sees the same rows.
await loop.pg.exec(generateFixtureData(snapshot, { registry: fixtureGeneratorRegistry }).sql);

// Values the seeded data actually holds, per column, for drawing predicate
// literals from (§3). Sampled once — the dataset does not change, since every
// query runs inside its own rolled-back transaction.
const pool: ValuePool = new Map();
for (const t of snapshot.tables) {
  if (t.relkind === "p") continue; // a partitioned parent's rows live in its partitions
  for (const c of t.columns) {
    if (c.generated === "virtual") continue;
    try {
      const res = await loop.pg.query<Record<string, unknown>>(
        `SELECT DISTINCT "${c.name}" AS v FROM "${t.schema}"."${t.name}" WHERE "${c.name}" IS NOT NULL LIMIT 8`,
      );
      const vs = res.rows.map(r => r["v"]).filter(v => v !== null && v !== undefined);
      if (vs.length) pool.set(`${t.schema}.${t.name}.${c.name}`, vs);
    } catch {
      // A type DISTINCT cannot order (json has no equality operator): that
      // column simply contributes no literals.
    }
  }
}

const tableIds = snapshot.tables.map(t => `${t.schema}.${t.name}`);
const edges = edgesOf(snapshot);
const groups = groupsOf(tableIds, edges);
const inGroups = new Set(groups.flat());
const usableEdges = edges.filter(e => inGroups.has(e.child) && inGroups.has(e.parent));

console.log(`discovery slice 1 — seed ${SEED}, ${COUNT} queries`);
console.log(`join graph: ${usableEdges.length} single-column foreign keys over ` +
  `${groups.length} groups of joinable tables (largest ${groups[0]!.length})`);
console.log(`  child->parent outer joins that can null-extend: ` +
  usableEdges.filter(e => e.childToParentCanExtend).map(e => `${e.child}.${e.childColumn}`).join(", "));

const rand = makeRand(SEED);
const counts = new Map<Bucket, number>();
const shapes = new Set<string>();
const tablesTouched = new Set<string>();
const findings: { id: string; bucket: Bucket; sql: string; detail: string }[] = [];
const findingKeys = new Set<string>();
const rejectionDetail = new Map<string, number>();
let returnable = 0, returned = 0;
const curve: number[] = [];
let lastMark = 0;

for (let i = 0; i < COUNT; i++) {
  const id = `q${i}`;
  let built: Built | null;
  try {
    built = buildQuery(rand, snapshot, rand.pick(groups), usableEdges, pool);
  } catch (e) {
    counts.set("generator-threw", (counts.get("generator-threw") ?? 0) + 1);
    rejectionDetail.set(`generator: ${(e as Error).message}`, (rejectionDetail.get(`generator: ${(e as Error).message}`) ?? 0) + 1);
    continue;
  }
  if (!built) { i--; continue; }
  // §6's saturation curve: NEW shapes per 1000 queries, not the total. Falling
  // toward zero means the vocabulary is exhausted and further volume is waste
  // — the fix for which is new vocabulary, never a bigger run.
  if (i > 0 && i % 1000 === 0) { curve.push(shapes.size - lastMark); lastMark = shapes.size; }
  shapes.add(built.shape);
  for (const u of built.used) tablesTouched.add(u.table);

  const r = await loop.run({ id, sql: built.sql });
  const bucket = classify(r);
  counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  returnable++;
  if (bucket === "agreed-rows") returned++;

  if (bucket === "pg-rejected" || bucket === "pg-raised") {
    const key = (r.pgError ?? "").split("\n")[0]!.slice(0, 90);
    rejectionDetail.set(key, (rejectionDetail.get(key) ?? 0) + 1);
  }
  if (bucket === "engine-refused") {
    const key = (r.error ?? "").slice(0, 90);
    rejectionDetail.set(key, (rejectionDetail.get(key) ?? 0) + 1);
  }
  if (TIER[bucket] === "FINDING") {
    const detail = r.violations.join("; ") || r.groupViolations.join("; ") ||
      r.shape || r.parity || r.error || "";
    // One entry per (bucket, shape, detail) — 10,000 queries hitting one bug
    // must read as one finding, not as hundreds.
    const key = `${bucket}|${built.shape}|${detail.replace(/\d+/g, "N")}`;
    if (!findingKeys.has(key)) {
      findingKeys.add(key);
      findings.push({ id, bucket, sql: built.sql, detail });
    }
  }
}

console.log(`\nbuckets`);
for (const [b, n] of [...counts.entries()].sort((a, b2) => b2[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${b.padEnd(18)} ${TIER[b]}`);
}
const unclassified = COUNT - [...counts.values()].reduce((a, b) => a + b, 0);
if (unclassified !== 0) {
  console.log(`\n!! ${unclassified} queries landed in no bucket — a bucket is missing, which is itself a finding`);
}

console.log(`\ncoverage of this run`);
console.log(`  distinct query shapes:      ${shapes.size}`);
console.log(`  tables touched:             ${tablesTouched.size} of ${tableIds.length} — ${[...tablesTouched].sort().join(", ")}`);
console.log(`  return rate:                ${returnable ? Math.round((returned / returnable) * 100) : 0}% (${returned}/${returnable} queries returned a row)`);
console.log(`  columns with drawable literals:  ${pool.size}`);
if (curve.length > 1) {
  console.log(`  new shapes per 1000 queries: ${curve.join(" ")}`);
  const tail = curve.slice(-3);
  const last = tail.reduce((a, b) => a + b, 0) / tail.length;
  // Reported, not judged. A falling curve here is ordinary coupon-collecting
  // over a combinatorially large space — 2..4 tables drawn from 13, four join
  // kinds, five WHERE structures — so it will decelerate forever without ever
  // meaning "exhausted". What the number is good for is COMPARING runs: the
  // same figure after a vocabulary is widened says the widening did nothing.
  console.log(`    marginal yield: ${Math.round(last)}/1000 at the end against ` +
    `${curve[0]} at the start (${Math.round((last / curve[0]!) * 100)}%)`);
}
console.log(`  bound: 2..4 tables, left-deep, SELECT only, no subqueries, no set operations, no DML;`);
console.log(`         WHERE on ~70% — IS [NOT] NULL, and = <> < <= > >= against a literal drawn from`);
console.log(`         the column's own seeded values, combined with AND, OR, NOT and AND(OR)`);

if (rejectionDetail.size) {
  console.log(`\nrejections and refusals, by cause`);
  for (const [k, n] of [...rejectionDetail.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`  ${String(n).padStart(5)}  ${k}`);
  }
}

console.log(`\nFINDINGS: ${findings.length} distinct`);
for (const f of findings.slice(0, 20)) {
  console.log(`\n  [${f.bucket}] ${f.id}  (seed ${SEED})`);
  console.log(`  ${f.detail}`);
  console.log(`  ${f.sql}`);
}

await loop.close();
