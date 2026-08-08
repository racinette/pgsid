// Catalog reach — a diagnostic, not a test. Run it with
// `pnpm exec tsx tests/probe/catalog-reach.ts`.
//
// Which of the fixture schema's tables carry a catalog feature no generated
// query can reach? It is `docs/catalog-driven-generation.md` §7 (Step 0) as a
// re-runnable meter, and it prints three things:
//
//   - how many distinct CATALOG SHAPES the corpus queries — how many genuinely
//     different combinations of declared features it has ever seen on a table,
//     against how many the schema has (§6 calls this level 2);
//   - LIST 1, the fewest tables that would touch every feature it misses;
//   - LIST 2, which tables can be joined to each other at all by following
//     foreign keys, since list 1's tables mostly cannot.
//
// It gates nothing and asserts nothing, which is deliberate. It is also NOT a
// replacement for `capability-reach.test.ts`, whatever an earlier draft of that
// handoff said: that suite counts the accessors the WALK ASKS, which is the
// only check that a newly landed capability is reached by any query at all,
// and no amount of catalog variety implies it. This counts what was
// GENERATED. Two questions, two instruments.
//
// The vocabulary is `catalog-features.ts` LITERALLY — its own `detect`
// predicates, called against a snapshot restricted to one relation. A
// hand-written second list was the first draft and it drifted immediately: it
// tested `identity` against the catalog chars rather than the enum, and it
// minted `quoted-identifier-for-case`, a name the census already uses for a
// FUNCTION's return-type identifiers. Both were caught only by asking which
// detectors never fired anywhere — the check any list like this needs.
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { snapshotCatalog } from "../../src/catalog/snapshot.js";
import type { CatalogSnapshot } from "../../src/catalog/types.js";
import { FEATURES, type CensusEnv } from "../unit/query/catalog-features.js";
import {
  generateQueries,
  generateDmlQueries,
  generateDeepJoinQueries,
  generateParamPlacementQueries,
} from "../unit/query/generated/generator.js";

// --- 1. which relation NAMES does the corpus mention? ----------------------
// Any `relname` key, at any depth: the generator spells a FROM item as
// `{RangeVar: {relname}}` and a DML target as an INLINED `{relname}` struct
// (`relation()` in generator.ts), and keying on the wrapper alone missed every
// write target. Derived-table and CTE aliases ride along and are filtered out
// by intersecting with the snapshot's relation names.
const relNames = new Set<string>();
const walk = (node: unknown): void => {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) { for (const n of node) walk(n); return; }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === "relname" && typeof v === "string") relNames.add(v);
    walk(v);
  }
};
const corpora = [
  ["generateQueries", generateQueries()],
  ["generateDmlQueries", generateDmlQueries()],
  ["generateDeepJoinQueries", generateDeepJoinQueries()],
  ["generateParamPlacementQueries", generateParamPlacementQueries()],
] as const;
let total = 0;
for (const [name, qs] of corpora) {
  total += qs.length;
  for (const q of qs) walk(q.ast);
  console.log(`${name.padEnd(30)} ${qs.length} queries`);
}
console.log(`TOTAL ${total} queries; relation names in the ASTs: ${[...relNames].sort().join(" ")}`);

// --- 2. the snapshot -------------------------------------------------------
const pg = await PGlite.create({ extensions: { plpgsql_check } });
await pg.exec("CREATE EXTENSION plpgsql_check;");
await pg.exec(readFileSync("tests/unit/query/fixtures/schema.sql", "utf8"));
const s: CatalogSnapshot = await snapshotCatalog(pg);
// pg_inherits itself — the census's CensusEnv, read the way catalog-census
// reads it. The snapshot has no parent pointer, which is the whole reason
// CensusEnv exists.
const inh = await pg.query<{ child: string; parent: string }>(
  `SELECT cc.relname AS child, pc.relname AS parent
     FROM pg_inherits i
     JOIN pg_class cc ON cc.oid = i.inhrelid
     JOIN pg_class pc ON pc.oid = i.inhparent
    WHERE cc.relkind IN ('r','p','f')`,
);
await pg.close();
const env: CensusEnv = { childToParent: new Map(inh.rows.map(r => [r.child, r.parent])) };

const restrict = (keep: (id: string) => boolean): CatalogSnapshot => ({
  ...s,
  tables: s.tables.filter(t => keep(`${t.schema}.${t.name}`)),
  views: s.views.filter(v => keep(`${v.schema}.${v.name}`)),
  materializedViews: s.materializedViews.filter(v => keep(`${v.schema}.${v.name}`)),
});

// --- 3. which census features are RELATION-SCOPED? -------------------------
// Mechanically, not by hand: a feature is relation-scoped exactly when
// removing every relation from the snapshot turns its detector off. Domains,
// composites, functions and the environment sets survive that, so they fall
// out on their own — and no feature has to be classified twice.
const empty = restrict(() => false);
const relationScoped = Object.keys(FEATURES).filter(k => {
  try { return !FEATURES[k]!.detect(empty, env); } catch { return false; }
});
const detectOn = (snap: CatalogSnapshot, k: string): boolean => {
  try { return FEATURES[k]!.detect(snap, env); } catch { return false; }
};
console.log(`\ncensus features: ${Object.keys(FEATURES).length}; relation-scoped: ${relationScoped.length}`);
const carriedBySchema = relationScoped.filter(k => detectOn(s, k));
const notInSchema = relationScoped.filter(k => !detectOn(s, k));
console.log(`  carried by the fixture schema: ${carriedBySchema.length}`);
console.log(`  relation-scoped but absent (census 'absent' markers): ${notInSchema.length} — ${notInSchema.join(", ")}`);

// --- 4. per-relation profiles ---------------------------------------------
const ids = [
  ...s.tables.map(t => ({ id: `${t.schema}.${t.name}`, name: t.name, kind: `table:${t.relkind}` })),
  ...s.views.map(v => ({ id: `${v.schema}.${v.name}`, name: v.name, kind: "view" })),
  ...s.materializedViews.map(v => ({ id: `${v.schema}.${v.name}`, name: v.name, kind: "matview" })),
];
// A relation carries a feature two ways, and both are needed:
//
//   SUFFICIENT — the feature still detects with only this relation present.
//     The common case, and the one that says "admit this and you get it".
//   NECESSARY  — the feature detects over the whole schema and stops when
//     this relation is removed. Catches the features that take a PAIR:
//     `table-row-type-column` needs the holder AND the table whose row type
//     it is, so restriction alone credited it to neither and it vanished
//     between the schema total and the per-relation sum.
const rels = ids.map(r => {
  const one = restrict(id => id === r.id);
  const without = restrict(id => id !== r.id);
  const sufficient = carriedBySchema.filter(k => detectOn(one, k));
  const necessary = carriedBySchema.filter(k => !sufficient.includes(k) && !detectOn(without, k));
  return { ...r, features: new Set([...sufficient, ...necessary]), necessaryOnly: new Set(necessary) };
});
const perRelation = new Set(rels.flatMap(r => [...r.features]));
const unattributed = carriedBySchema.filter(k => !perRelation.has(k));
console.log(`  attributed to at least one relation: ${perRelation.size}` +
  (unattributed.length ? `; UNATTRIBUTED: ${unattributed.join(", ")}` : ""));
const pairOnly = [...new Set(rels.flatMap(r => [...r.necessaryOnly]))];
if (pairOnly.length) console.log(`  credited only via the NECESSARY test (takes more than one relation): ${pairOnly.join(", ")}`);

// --- 5. reach ---------------------------------------------------------------
const queried = rels.filter(r => relNames.has(r.name));
const reached = new Set(queried.flatMap(r => [...r.features]));
const unreached = [...perRelation].filter(f => !reached.has(f)).sort();

console.log(`\nrelations declared: ${rels.length}`);
console.log(`relations a generated query names: ${queried.length} — ${queried.map(r => r.id).join(", ")}`);
for (const r of queried) console.log(`    ${r.id.padEnd(14)} ${[...r.features].sort().join(", ") || "(nothing classified)"}`);
const profileKey = (r: (typeof rels)[number]) => [...r.features].sort().join("|");
console.log(`distinct catalog profiles: ${new Set(rels.map(profileKey)).size} across the schema, ` +
  `${new Set(queried.map(profileKey)).size} across the queried set`);
console.log(`\nrelation-scoped features present on some relation: ${perRelation.size}`);
console.log(`  REACHABLE by a generated query: ${reached.size} — ${[...reached].sort().join(", ")}`);
console.log(`  UNREACHABLE: ${unreached.length} — ${unreached.join(", ")}`);

// --- 6a. per-relation carry ------------------------------------------------
console.log(`\nRELATIONS BY UNREACHED FEATURES CARRIED (top 15)`);
for (const x of rels
  .map(r => ({ r, gain: [...r.features].filter(f => !reached.has(f)).sort() }))
  .filter(x => x.gain.length > 0)
  .sort((a, b) => b.gain.length - a.gain.length || (a.r.id < b.r.id ? -1 : 1))
  .slice(0, 15)) {
  console.log(`  ${String(x.gain.length).padStart(2)}  ${x.r.id.padEnd(24)} [${x.r.kind}]  ${x.gain.join(", ")}`);
}

// --- 6b. greedy cover: the minimum admission set ---------------------------
console.log(`\nLIST 1 — FEWEST TABLES THAT TOUCH EVERY MISSING FEATURE\n(each line: what this table brings that nothing above it has)`);
const covered = new Set(reached);
const done = new Set<string>();
const pool = rels.filter(r => !relNames.has(r.name));
for (let rank = 1; ; rank++) {
  let best: (typeof pool)[number] | null = null;
  let bestNew: string[] = [];
  for (const r of pool) {
    if (done.has(r.id)) continue;
    const gain = [...r.features].filter(f => !covered.has(f)).sort();
    if (gain.length > bestNew.length) { best = r; bestNew = gain; }
  }
  if (!best || bestNew.length === 0) break;
  console.log(`${String(rank).padStart(2)}. ${best.id.padEnd(24)} [${best.kind}] +${bestNew.length}  ${bestNew.join(", ")}`);
  for (const f of bestNew) covered.add(f);
  done.add(best.id);
}
const rest = pool.filter(r => !done.has(r.id));
console.log(`\n${rest.length} further relations add nothing beyond the above:`);
console.log("  " + rest.map(r => r.id).join(", "));

// --- 7. which tables can be joined to each other ----------------------------
// §5.2 — an FK join always matches, so LEFT/RIGHT/FULL over a key witnesses no
// null extension unless the schema permits an absent arm.
const notNullCol = new Map<string, boolean>();
for (const t of s.tables) for (const c of t.columns) notNullCol.set(`${t.schema}.${t.name}.${c.name}`, c.notNull);
const edges: { child: string; parent: string; col: string; verdict: string }[] = [];
for (const t of s.tables) {
  for (const c of t.constraints) {
    if (c.type !== "foreign" || c.columns.length !== 1 || !c.foreignSchema || !c.foreignTable) continue;
    if (c.inheritedClone) continue;
    const child = `${t.schema}.${t.name}`;
    const nn = notNullCol.get(`${child}.${c.columns[0]}`) ?? false;
    edges.push({
      child, parent: `${c.foreignSchema}.${c.foreignTable}`, col: c.columns[0]!,
      verdict: !c.validated ? "yes — key is NOT VALID" : nn ? "only joining parent -> child" : "yes — key column is nullable",
    });
  }
}
console.log(`\nSINGLE-COLUMN FOREIGN KEYS — ${edges.length}`);
for (const e of edges.sort((a, b) => (a.child + a.col < b.child + b.col ? -1 : 1))) {
  console.log(`  ${(e.child + "." + e.col).padEnd(38)} -> ${e.parent.padEnd(20)} NULL-extended row possible: ${e.verdict}`);
}
const up = new Map<string, string>();
const find = (x: string): string => { let r = x; while (up.get(r) !== r) r = up.get(r)!; return r; };
for (const r of rels) up.set(r.id, r.id);
for (const e of edges) if (up.has(e.child) && up.has(e.parent)) up.set(find(e.child), find(e.parent));
const comp = new Map<string, string[]>();
for (const r of rels) {
  const root = find(r.id);
  const arr = comp.get(root);
  if (arr) arr.push(r.id); else comp.set(root, [r.id]);
}
const joined = [...comp.values()].filter(c => c.length > 1).sort((a, b) => b.length - a.length);
console.log(`\nLIST 2 — GROUPS OF TABLES A QUERY CAN JOIN (following those keys): ${joined.length}`);
for (const c of joined) console.log(`  ${c.length}: ${c.sort().join(", ")}`);
console.log(`  no single-column key in either direction, so nothing joins to them: ${[...comp.values()].filter(c => c.length === 1).length} tables`);

const inComponent = new Set(joined.flat());
const onlyIsolated = unreached.filter(f => !rels.some(r => inComponent.has(r.id) && r.features.has(f)));
console.log(`\nof the ${unreached.length} unreachable features:`);
console.log(`  ${unreached.length - onlyIsolated.length} are on a table inside one of those joinable groups — ` +
  unreached.filter(f => !onlyIsolated.includes(f)).join(", "));
console.log(`  ${onlyIsolated.length} are ONLY on tables no key connects to anything — ${onlyIsolated.join(", ")}`);
