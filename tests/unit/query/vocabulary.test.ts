import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseSql } from "../../../src/ast.js";
import { splitPsql } from "./pg-regress/split.js";

// ---------------------------------------------------------------------------
// Vocabulary — which CONSTRUCTS the corpus has ever analysed.
//
// The other shape instruments count how the corpus composes what it has. This
// one counts what it has at all, and answers two questions neither of them
// can.
//
//   FRAGILITY — node types carried by exactly ONE statement. Deleting that one
//   fixture takes the construct out of the corpus, and no suite notices,
//   because reach assertions are satisfied by a single occurrence.
//
//   ABSENCE — node types a borrowed corpus produces and this one never has.
//
// Why absence is measured against a borrowed corpus rather than against a list
// of every node the parser can emit: most of that list is DDL the walk never
// sees or post-analysis vocabulary no parse can produce, and the rest varies
// enormously in how often real SQL uses it. Normalising against a corpus of
// real queries removes both problems without anyone having to judge which
// constructs are "rare enough not to matter" — rarity is measured, not ruled.
//
// READ ABSENCE PRECISELY: it means absent as a TAGGED node. PostgreSQL
// declares some fields as concrete structs rather than generic nodes, and the
// parser emits those inline with no tag — a window specification written
// `OVER (...)` is one, so it cannot appear here however many queries use it.
// That is not a flaw in the comparison: the borrowed corpus can only report a
// node it has itself seen tagged, so anything listed is genuinely reachable in
// tagged form and genuinely missing. It does mean the finding is narrower than
// the node name suggests, and reading it as "the corpus has no window
// functions" would be wrong where "the corpus has no NAMED window clause" is
// right.
//
// Set CORPUS to `shared`, `worlds` or `both` (default). The borrowed-corpus
// half needs VOCABULARY_REGRESS=1 and a sibling checkout; it parses tens of
// thousands of statements, which is too slow to run every time.
// ---------------------------------------------------------------------------

const HERE = __dirname;
const FIXTURES_DIR = join(HERE, "fixtures");
const WORLDS_DIR = join(HERE, "worlds");
const REGRESS_SQL = join(HERE, "..", "..", "..", "..",
  "pglite", "postgres-pglite", "src", "test", "regress", "sql");

const WHICH = (process.env.CORPUS ?? "both").toLowerCase();
const WANT_SHARED = WHICH === "both" || WHICH === "shared";
const WANT_WORLDS = WHICH === "both" || WHICH === "worlds";
const WITH_REGRESS = !!process.env.VOCABULARY_REGRESS && existsSync(REGRESS_SQL);

/** Only statements the walk would ever be asked to analyse. */
const ROOTS = new Set(["SelectStmt", "InsertStmt", "UpdateStmt", "DeleteStmt", "MergeStmt"]);

/** Node types appearing anywhere under a value, tagged form only. */
function taggedTypes(v: unknown, out: Set<string>): void {
  if (Array.isArray(v)) { for (const x of v) taggedTypes(x, out); return; }
  if (!v || typeof v !== "object") return;
  const keys = Object.keys(v as object);
  const k = keys[0];
  if (keys.length === 1 && k !== undefined && /^[A-Z]/.test(k)) {
    out.add(k);
    taggedTypes((v as Record<string, unknown>)[k], out);
    return;
  }
  for (const x of Object.values(v as object)) taggedTypes(x, out);
}

interface Vocabulary {
  /** node type → statements containing it (presence per statement, not uses). */
  byType: Map<string, number>;
  statements: number;
}

async function absorb(sqls: string[], into: Vocabulary): Promise<void> {
  for (const sql of sqls) {
    let p: { stmts?: { stmt?: unknown }[] };
    try {
      p = await parseSql(sql) as { stmts?: { stmt?: unknown }[] };
    } catch {
      continue; // a statement the parser refuses is another suite's business
    }
    for (const s of p.stmts ?? []) {
      if (!s.stmt) continue;
      const root = Object.keys(s.stmt as object)[0];
      if (root === undefined || !ROOTS.has(root)) continue;
      into.statements++;
      const seen = new Set<string>();
      taggedTypes(s.stmt, seen);
      for (const t of seen) into.byType.set(t, (into.byType.get(t) ?? 0) + 1);
    }
  }
}

function readDirSql(dir: string, skip: string[]): string[] {
  return readdirSync(dir)
    .filter(f => f.endsWith(".sql") && !skip.includes(f))
    .map(f => readFileSync(join(dir, f), "utf8"));
}

// ---------------------------------------------------------------------------

describe("corpus vocabulary", () => {
  const ours: Vocabulary = { byType: new Map(), statements: 0 };
  const borrowed: Vocabulary = { byType: new Map(), statements: 0 };

  beforeAll(async () => {
    if (WANT_SHARED) await absorb(readDirSql(FIXTURES_DIR, ["schema.sql"]), ours);
    if (WANT_WORLDS && existsSync(WORLDS_DIR))
      for (const name of readdirSync(WORLDS_DIR)) {
        const dir = join(WORLDS_DIR, name);
        if (!statSync(dir).isDirectory()) continue;
        await absorb(readDirSql(dir, ["schema.sql", "data.sql"]), ours);
      }

    if (WITH_REGRESS) {
      const units: string[] = [];
      for (const f of readdirSync(REGRESS_SQL).filter(f => f.endsWith(".sql")))
        for (const u of splitPsql(readFileSync(join(REGRESS_SQL, f), "utf8")))
          if (u.kind === "statement") units.push(u.text);
      await absorb(units, borrowed);
    }

    console.log(`\ncorpus vocabulary (CORPUS=${WHICH}) — ${ours.statements} analysable ` +
      `statements, ${ours.byType.size} tagged node types`);

    const fragile = [...ours.byType.entries()]
      .filter(([, n]) => n === 1).map(([t]) => t).sort();
    console.log(`\ncarried by exactly ONE statement (${fragile.length}) — deleting that ` +
      `fixture removes the construct, and a reach assertion satisfied by one\n` +
      `occurrence will not notice:`);
    console.log(fragile.length ? `  ${fragile.join(", ")}` : "  none");

    if (!WITH_REGRESS) {
      console.log("\nabsence not measured: set VOCABULARY_REGRESS=1 with a sibling " +
        "regress checkout.\n  Without a borrowed corpus there is nothing to be absent " +
        "FROM, and a list of every\n  node the parser can emit is mostly DDL and " +
        "post-analysis vocabulary.");
      return;
    }

    const rate = (v: Vocabulary, t: string) =>
      v.statements ? (100 * (v.byType.get(t) ?? 0)) / v.statements : 0;
    const rows = [...borrowed.byType.keys()]
      .map(t => ({ t, ours: rate(ours, t), theirs: rate(borrowed, t), n: ours.byType.get(t) ?? 0 }))
      .filter(r => r.theirs >= 0.25) // rare in real SQL too: not a gap, just rare
      .sort((a, b) => (b.theirs - b.ours) - (a.theirs - a.ours));

    console.log(`\nborrowed corpus: ${borrowed.statements} analysable statements`);
    console.log(`\nthinnest against it (rate per 100 statements):`);
    console.log(`  ${"node".padEnd(22)}${"ours".padStart(8)}${"borrowed".padStart(10)}${"our stmts".padStart(11)}`);
    for (const r of rows.slice(0, 15))
      console.log(`  ${r.t.padEnd(22)}${r.ours.toFixed(2).padStart(8)}` +
        `${r.theirs.toFixed(2).padStart(10)}${String(r.n).padStart(11)}`);

    const absent = rows.filter(r => r.n === 0).map(r => r.t);
    console.log(`\nABSENT here, present in at least a quarter percent of the borrowed ` +
      `corpus (${absent.length}):`);
    console.log(absent.length ? `  ${absent.join(", ")}` : "  none");
    console.log("  Read these as absent in TAGGED form — see the header before " +
      "concluding\n  the construct itself is missing.");
  }, 900_000);

  it("collection ran", () => {
    // The only gate. Vocabulary SHRINKAGE is already held bidirectionally by
    // the node-type census, which fails both when an observed node is
    // unclassified and when a classified node stops being reached — so a
    // second gate here would duplicate it. What this suite adds is the shape
    // of the coverage rather than its existence, and neither fragility nor
    // absence is a defect to fail on: both are work to consider.
    expect(ours.statements, "no statements collected").toBeGreaterThan(0);
  });
});
