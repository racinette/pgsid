import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import type { CatalogSnapshot } from "../../../src/catalog/types.js";
import { FEATURES, type Category, type CensusEnv } from "./catalog-features.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability, inferQueryContract } from "../../../src/query/nullability-walk.js";
import { parseSql } from "../../../src/ast.js";
import { spyOnCatalog, catalogMembers } from "./catalog-spy.js";
import {
  DEP_CATALOG_ONLY,
  EVALUATION_CATALOG_ONLY,
  OVERLOAD_CATALOG_ONLY,
} from "../../../src/query/types.js";
import { GRAMMAR_SAMPLER } from "./grammar-sampler.js";

// ---------------------------------------------------------------------------
// Catalog-feature census.
//
// `node-census.test.ts`'s shape, on the other axis. The engine is a function
// of (AST, CATALOG), and that suite censuses only the first argument: it
// enumerates every parse-tree node type the walk has considered and fails when
// reality moves outside the set. Nothing censused the catalog features those
// nodes are interpreted against — and that is where the defects were. All
// eight adversarial-sweep-3 findings arrived through node types already
// classified `handled`; five of them needed schema vocabulary
// `fixtures/schema.sql` did not have, so the generated corpus's 8980 queries
// could not express a single falsifying input (docs/generated-surface.md).
//
// So: enumerate the CATALOG features the walk branches on, classify each, and
// fail when the fixture schema stops carrying one. The classification is the
// deliverable. A generator silently does not generate a feature nobody wrote
// down; a census fails loudly on it, and the ABSENT entries below are the
// axis vocabulary for the schema axis (docs/generated-surface.md item 4).
//
// Five assertions:
//
//   1. Every classified feature is present in the fixture schema's snapshot.
//      Deleting the only NOT VALID foreign key, or the only quoted `TABLE(…)`
//      column name, fails here rather than silently retiring a branch's
//      coverage.
//
//   2. Every feature marked `absent` really is absent. That marker is the
//      census's output — a branch the walk has and the fixture schema does not
//      reach — and its note says where the branch IS exercised, or what it
//      would take. When somebody adds the DDL, the marker has to come off,
//      which is the moment to declare the coverage.
//
//   3. Every `environment` feature's captured set is non-empty. These are
//      properties of the PostgreSQL version rather than of a user schema, so
//      assertion 1 cannot speak for them.
//
//   4. Every value each enumerated catalog column actually takes is
//      classified. This is the half that catches an unknown-unknown the way
//      the node census does: the feature list above is hand-written and can
//      only fail on what somebody thought to list, but `pg_type.typtype` and
//      its siblings have finite, PostgreSQL-defined domains, so a version
//      that introduces a new relkind or argument mode fails here.
//
//   5. Every classified value is observed, unless marked `absent`. The
//      complement of 4, and the same argument as the node census's third
//      assertion: a classification for a value reality never produces is an
//      untested claim.
//
// Note on scope: this censuses the catalog as the SNAPSHOT captures it, which
// is what the walk can see. A fact PostgreSQL records and the snapshot does
// not is invisible here by construction — that gap belongs to
// `tests/unit/catalog/snapshot.test.ts`, not to this suite.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// The enumerated catalog columns.
//
// The feature list above is hand-written, which is the disease
// `docs/generated-surface.md` diagnoses in the curated name tables: no test
// asserts what should be *in* one, so a missing entry is invisible until
// somebody writes the query. These columns are the antidote available on this
// axis. Their domains are finite and defined by PostgreSQL, so the values
// reality actually produces can be compared against a declared set, and a
// version that introduces a new one fails assertion 4 the way a new parse-tree
// node type fails the node census.
//
// Observed across the WHOLE live catalog — pg_catalog included — because that
// is the universe the engine's environment captures range over, and because
// several values (relkind 'i', 't') only ever appear there.
// ---------------------------------------------------------------------------

interface EnumValue {
  meaning: string;
  /** No entity in the live catalog carries it; the note says what it needs. */
  absent?: string;
}

interface EnumeratedColumn {
  /** Returns one `v` column: every distinct value the live catalog carries. */
  sql: string;
  values: Record<string, EnumValue>;
}

const ENUMERATED_COLUMNS: Record<string, EnumeratedColumn> = {
  "pg_type.typtype": {
    sql: "SELECT DISTINCT typtype::text AS v FROM pg_type",
    values: {
      b: { meaning: "base type — the ordinary scalar case" },
      c: { meaning: "composite; resolveCompositeType's own predicate, and every relation's row type" },
      d: { meaning: "domain; the NOT NULL carrier and the thing resolveDomainBaseTypeName sees through" },
      e: { meaning: "enum — shipment_state; captured in CatalogSnapshot.enums and an ordinary scalar to the walk" },
      m: { meaning: "multirange — PG14+; a scalar to the walk, like a range" },
      p: { meaning: "pseudo-type; note that builtinPolymorphicFunctions keys on THIS, which is wider than polymorphic (it admits trigger, void, cstring, record, internal)" },
      r: { meaning: "range; the `range-type-column` feature's type" },
    },
  },
  "pg_class.relkind": {
    sql: "SELECT DISTINCT relkind::text AS v FROM pg_class",
    values: {
      r: { meaning: "ordinary table — TableInfo.relkind 'r'" },
      p: { meaning: "partitioned table — resolveIsPartitioned's whole question" },
      f: { meaning: "foreign table", absent: "see the `foreign-table` feature" },
      v: { meaning: "view — analysed through viewAsts" },
      m: { meaning: "materialized view — warehouse_totals; ViewInfo like a view, and it holds its own rows so the data states refresh it" },
      c: { meaning: "composite type's relation row — captured as a compositeType, never as a table" },
      i: { meaning: "index — IndexInfo; the nullability engine reads none of it" },
      I: { meaning: "partitioned index — sw4_pp's PRIMARY KEY, which is what makes a key onto a partitioned parent expressible at all; the walk reads none of it" },
      S: { meaning: "sequence — SequenceInfo; unread by the walk" },
      t: { meaning: "TOAST table — never captured" },
    },
  },
  "pg_proc.prokind": {
    sql: "SELECT DISTINCT prokind::text AS v FROM pg_proc",
    values: {
      f: { meaning: "plain function — every builtin environment set filters on this" },
      a: { meaning: "aggregate — FunctionInfo.isAggregate, and the INITCOND question" },
      w: { meaning: "window function — FunctionInfo.isWindow" },
      p: { meaning: "procedure — close_shipment; no SELECT has a call site for it, so it is a snapshot branch rather than a walk one" },
    },
  },
  "pg_constraint.contype": {
    sql: "SELECT DISTINCT contype::text AS v FROM pg_constraint",
    values: {
      c: { meaning: "check — the entailment kernel's input" },
      f: { meaning: "foreign key — the entailment's input and four gates" },
      n: { meaning: "PG18 NOT NULL constraint row; folded into \"check\" by mapConstraintType and filtered by parsed node type" },
      p: { meaning: "primary key" },
      u: {
        meaning:
          "unique. Observed — but only in pg_catalog's own relations, which is where the two halves of this suite part company: this map asks what the PostgreSQL VERSION produces, and the `unique-constraint` feature asks what the FIXTURE SCHEMA carries. It answers no",
      },
      x: { meaning: "exclusion — dock_slots forbids double-booking a slot; captured and unread" },
      t: { meaning: "constraint trigger", absent: "no CREATE CONSTRAINT TRIGGER; write hooks are read from pg_trigger, not from here" },
    },
  },
  "pg_proc.proargmodes": {
    sql: "SELECT DISTINCT unnest(proargmodes)::text AS v FROM pg_proc WHERE proargmodes IS NOT NULL",
    values: {
      i: { meaning: "IN — ArgMode 'in'" },
      o: { meaning: "OUT — what functionOutputColumns reads" },
      b: { meaning: "INOUT — an input for the arity filter and an output column for functionOutputColumns, in one declaration" },
      v: { meaning: "VARIADIC — the candidate set resolveFunctionCandidates refuses outright" },
      t: { meaning: "TABLE — RETURNS TABLE(…)'s output columns" },
    },
  },
  "pg_attribute.attgenerated": {
    sql: "SELECT DISTINCT attgenerated::text AS v FROM pg_attribute",
    values: {
      "": { meaning: "not generated — ColumnInfo.generated 'none'" },
      s: { meaning: "STORED — resolveGenerationExpr's subject" },
      v: { meaning: "VIRTUAL (PG18) — shipment_tracking.weight_g; ColumnInfo.generated carries it and the generation-expression path treats it as STORED" },
    },
  },
  "pg_attribute.attidentity": {
    sql: "SELECT DISTINCT attidentity::text AS v FROM pg_attribute",
    values: {
      "": { meaning: "not an identity column" },
      d: { meaning: "GENERATED BY DEFAULT — captured, unread" },
      a: { meaning: "GENERATED ALWAYS — shipment_tracking.id; the seeder never supplies a value for one" },
    },
  },
};

/** Every walk source, for the "nothing reads this" half of the census. */
function walkSources(): string[] {
  const dir = join(__dirname, "..", "..", "..", "src", "query");
  return readdirSync(dir)
    .filter(f => f.endsWith(".ts"))
    .map(f => readFileSync(join(dir, f), "utf8"));
}

const FIXTURES_DIR = join(__dirname, "fixtures");

describe("catalog-feature census", () => {
  let pg: PGlite;
  let snapshot: CatalogSnapshot;
  let env: CensusEnv;
  /** column name → the distinct values the live catalog carries. */
  const observedValues = new Map<string, Set<string>>();
  /** Catalog members the corpus actually asked (see catalog-spy.ts). */
  let touched: Set<string>;
  let evaluationTouched: Set<string>;
  let catalogMemberNames: string[];

  beforeAll(async () => {
    pg = await PGlite.create();
    await pg.exec(readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8"));
    snapshot = await snapshotCatalog(pg);

    const inherits = await pg.query<{ child: string; parent: string }>(
      `SELECT c.relname AS child, p.relname AS parent
         FROM pg_inherits i
         JOIN pg_class c ON c.oid = i.inhrelid
         JOIN pg_class p ON p.oid = i.inhparent
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public';`,
    );
    env = { childToParent: new Map(inherits.rows.map(r => [r.child, r.parent])) };

    for (const [column, spec] of Object.entries(ENUMERATED_COLUMNS)) {
      const res = await pg.query<{ v: string }>(spec.sql);
      observedValues.set(column, new Set(res.rows.map(r => r.v)));
    }

    // Which catalog QUESTIONS the corpus actually asks. The catalog is a pure
    // data interface, so this is observable by wrapping it — no instrument
    // inside the walk, and the walk cannot tell the difference.
    const spy = spyOnCatalog(await buildNullabilityCatalog(snapshot));
    catalogMemberNames = catalogMembers(spy.catalog);
    touched = spy.touched;
    const corpus = [
      ...GRAMMAR_SAMPLER,
      ...readdirSync(FIXTURES_DIR)
        .filter(f => f.endsWith(".sql") && f !== "schema.sql")
        .map(f => readFileSync(join(FIXTURES_DIR, f), "utf8")),
    ];
    for (const sql of corpus) {
      const stmt = (await parseSql(sql)).stmts?.[0]?.stmt;
      if (!stmt) continue;
      try {
        inferNullability(stmt, spy.catalog);
      } catch {
        // A refusal still asked its questions on the way to refusing.
      }
    }

    // The SECOND pass, with the evaluator ON. The run above deliberately has
    // no `evaluate`, which makes every `SubtreeEvaluationCatalog` member
    // unreachable BY CONSTRUCTION — so the cold-member check could never
    // flag one, and `askedAnyway` could never fire for one either. That is
    // how `isImmutableFunction` and `isImmutableOperator` sat dead behind
    // their exemption until 2026-08-20: the list's comment claimed "the
    // subtree evaluator's own census covers them instead", and no such
    // census existed. This is it.
    //
    // BOTH entry points, because they reach different consumers: mechanism E
    // rides the CONTRACT path and `resolveEnforcedCheckConstraints` is
    // reached through nothing else — measured, 12 of 13 without it.
    const evalSpy = spyOnCatalog(await buildNullabilityCatalog(snapshot));
    const evaluate = async (sql: string) =>
      (await pg.query<Record<string, unknown>>(sql)).rows[0];
    for (const sql of corpus) {
      const stmt = (await parseSql(sql)).stmts?.[0]?.stmt;
      if (!stmt) continue;
      try {
        await inferNullability(stmt, evalSpy.catalog, { evaluate });
        await inferQueryContract(stmt, evalSpy.catalog, { evaluate });
      } catch {
        // As above: a refusal still asked its questions.
      }
    }
    evaluationTouched = evalSpy.touched;
  }, 300_000);

  afterAll(async () => {
    // The gap list is this suite's product, not a by-product: every `absent`
    // entry is a catalog feature the walk branches on and the generated corpus
    // cannot reach, which is the specification for the schema axis
    // (docs/generated-surface.md item 4). Printed every run in the style of the
    // WITNESS_REPORT / GENERATED_ALL_STATES knobs, with the reasons behind
    // CATALOG_CENSUS_REPORT=1.
    const entries = Object.entries(FEATURES);
    const gaps = entries.filter(([, f]) => f.absent);
    const byCategory = (c: Category) => entries.filter(([, f]) => f.category === c).length;
    console.log(
      `\ncatalog-feature census: ${entries.length} features — ` +
        `${byCategory("handled")} handled, ${byCategory("gated")} gated, ` +
        `${byCategory("conservative")} conservative, ${byCategory("environment")} environment.\n` +
        `  ${entries.length - gaps.length} carried by the fixture schema, ` +
        `${gaps.length} not reachable from it.`,
    );
    if (process.env.CATALOG_CENSUS_REPORT) {
      console.log(
        `\nfeatures the fixture schema cannot reach (${gaps.length}):\n  ` +
          gaps.map(([k, f]) => `${k} [${f.category}] — ${f.absent}`).join("\n  "),
      );
    }
    if (!pg.closed) await pg.close();
  });

  it("every classified feature is present in the fixture schema", () => {
    const missing = Object.entries(FEATURES)
      .filter(([, f]) => f.category !== "environment" && !f.absent)
      .filter(([, f]) => !f.detect(snapshot, env))
      .map(([k, f]) => `${k} — ${f.why}`)
      .sort();
    expect(
      missing,
      `Classified as carried by the fixture schema, but the snapshot does not ` +
        `have it. Either the DDL was removed — in which case a walk branch just ` +
        `lost its only coverage and the DDL should come back — or the feature ` +
        `is genuinely gone and its entry should be marked \`absent\` with a note ` +
        `saying where the branch is exercised instead:\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every feature marked `absent` really is absent", () => {
    // The other side of the marker, and the census's actual output: an
    // `absent` entry names a branch the fixture schema cannot reach, which is
    // a line item for the schema axis (docs/generated-surface.md item 4).
    // Adding the DDL is exactly when somebody has to say what now covers it.
    const present = Object.entries(FEATURES)
      .filter(([, f]) => f.absent && f.detect(snapshot, env))
      .map(([k]) => k)
      .sort();
    expect(
      present,
      `Marked \`absent\` but the fixture schema now carries it. Drop the ` +
        `marker, and check that a fixture actually exercises the branch — the ` +
        `DDL existing is not the same as a query reaching it:\n  ${present.join(", ")}`,
    ).toEqual([]);
  });

  it("every catalog capability the corpus can exercise is exercised", () => {
    // A member nothing calls is either a branch no query reaches or a capture
    // nobody needs, and neither is visible from outside the walk. The
    // exemptions name where a member IS covered, so the two stay apart.
    // The adapter's product wears two faces; only the walk's is in scope here.
    // `DEP_CATALOG_ONLY` lives beside the interfaces and is type-checked
    // against `keyof DepCatalog`, so this is a type boundary rather than a
    // list of excuses.
    const depOnly = new Set<string>(DEP_CATALOG_ONLY);
    const overloadOnly = new Set<string>(OVERLOAD_CATALOG_ONLY);
    const evaluationOnly = new Set<string>(EVALUATION_CATALOG_ONLY);
    const cold = catalogMemberNames
      .filter(m => !touched.has(m) && !depOnly.has(m) && !overloadOnly.has(m)
        && !evaluationOnly.has(m))
      .sort();
    expect(
      cold,
      `Catalog members no statement in the corpus asked. Either add SQL that ` +
        `reaches the branch, or — if the member is not a nullability question ` +
        `at all — move it off NullabilityCatalog:\n  ${cold.join("\n  ")}`,
    ).toEqual([]);

    const askedAnyway = [...depOnly, ...overloadOnly, ...evaluationOnly]
      .filter(m => touched.has(m))
      .sort();
    expect(
      askedAnyway,
      `Declared DepCatalog-, OverloadCatalog- or SubtreeEvaluationCatalog-only, but the walk asked them — ` +
        `the member belongs on NullabilityCatalog now, with its exemption ` +
        `removed and a fixture reaching it:\n  ` +
        askedAnyway.join("\n  "),
    ).toEqual([]);

    // ... and the exemption is a PROMISE, not a pass. Every member excused
    // above must be reached by the evaluator-on pass, or it is dead code
    // hiding behind the excuse — which is exactly what two of them were.
    const deadBehindTheExemption = [...evaluationOnly]
      .filter(m => !evaluationTouched.has(m))
      .sort();
    expect(
      deadBehindTheExemption,
      `On EVALUATION_CATALOG_ONLY, and not reached even with the evaluator ` +
        `on. The exemption says the evaluator covers these; for these it does ` +
        `not. Either a corpus statement should reach it, or the member is ` +
        `dead and should go:\n  ${deadBehindTheExemption.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every `handled` feature names an accessor the corpus actually asks", () => {
    // The converse of the `conservative` check below, and the reason the
    // catalog spy exists: `handled` claims a branch keys on this fact, and
    // nothing verified that the branch is still there. Accessor granularity —
    // see `Feature.reads` for what that does and does not prove.
    const unannotated: string[] = [];
    const cold: string[] = [];
    for (const [key, f] of Object.entries(FEATURES)) {
      if (f.category !== "handled" && f.category !== "gated") continue;
      if (!f.reads) {
        unannotated.push(`${key} — add \`reads\`, the accessor the walk asks this through`);
        continue;
      }
      if (!touched.has(f.reads)) cold.push(`${key} — \`${f.reads}\` was never called`);
    }
    expect(
      unannotated,
      `\`handled\`/\`gated\` entries whose label nothing can falsify:\n  ${unannotated.join("\n  ")}`,
    ).toEqual([]);
    expect(
      cold,
      `These features claim a branch keys on them, but the accessor that ` +
        `carries the fact was never asked across the corpus — the branch is ` +
        `gone, or the entry names the wrong accessor:\n  ${cold.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every `conservative` feature is really unread by the walk", () => {
    // The label claims the snapshot captures the fact and no branch reads it.
    // Nothing checked that, so it could only ever go stale in the direction
    // that matters: a fact someone STARTS reading leaves an entry reading as
    // open work that is already done. Ten node-census entries drifted exactly
    // that way before its own converse assertion landed (2026-08-07).
    //
    // Comments are stripped before the search, because prose is not a read:
    // the word "identity" appears twelve times under src/query and every one
    // is English, not `ColumnInfo.identity`.
    const stripped = walkSources()
      .map(src => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""))
      .join("\n");

    const unannotated: string[] = [];
    const nowRead: string[] = [];
    for (const [key, f] of Object.entries(FEATURES)) {
      if (f.category !== "conservative") continue;
      if (f.unread === undefined) {
        unannotated.push(`${key} — add \`unread\` (the token nothing may read) or \`unread: null\` with a note`);
        continue;
      }
      if (f.unread === null) {
        if (!f.unreadNote) unannotated.push(`${key} — \`unread: null\` needs \`unreadNote\``);
        continue;
      }
      if (stripped.includes(f.unread)) nowRead.push(`${key} — \`${f.unread}\` now appears under src/query`);
    }

    expect(
      unannotated,
      `\`conservative\` entries whose label nothing can falsify:\n  ${unannotated.join("\n  ")}`,
    ).toEqual([]);
    expect(
      nowRead,
      `These features are classified 'conservative' but the walk now reads ` +
        `them. Reclassify as 'handled' (or 'gated') and say what the branch ` +
        `concludes — an entry claiming an imprecision that is closed reads as ` +
        `work nobody needs to do:\n  ${nowRead.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every `environment` capture is non-empty", () => {
    const empty = Object.entries(FEATURES)
      .filter(([, f]) => f.category === "environment" && !f.detect(snapshot, env))
      .map(([k, f]) => `${k} — ${f.why}`)
      .sort();
    expect(
      empty,
      `An environment set the snapshot captures came back empty. These describe ` +
        `the PostgreSQL version rather than the user schema, so an empty one ` +
        `means the capturing query stopped matching — silently turning a ` +
        `measured answer back into the hand-curated table it replaced:\n  ${empty.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every value an enumerated catalog column takes is classified", () => {
    const unclassified: string[] = [];
    for (const [column, spec] of Object.entries(ENUMERATED_COLUMNS)) {
      for (const v of observedValues.get(column) ?? []) {
        if (!(v in spec.values)) unclassified.push(`${column} = '${v}'`);
      }
    }
    unclassified.sort();
    expect(
      unclassified,
      `Unclassified catalog value(s). PostgreSQL has produced a value this ` +
        `census does not know about — a version bump, or an extension. Classify ` +
        `each with what it means and what the walk does with it; if a walk ` +
        `branch is needed, an entry here is not a substitute for one:\n  ${unclassified.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every classified value is observed, unless marked `absent`", () => {
    // The complement, and the node census's third assertion transposed: a
    // classification for a value reality never produces is an untested claim,
    // and a value that is not a member of the column's domain at all fails
    // here too, since nothing can ever observe it.
    const unobserved: string[] = [];
    for (const [column, spec] of Object.entries(ENUMERATED_COLUMNS)) {
      const observed = observedValues.get(column) ?? new Set<string>();
      for (const [v, meta] of Object.entries(spec.values)) {
        if (meta.absent) {
          if (observed.has(v)) unobserved.push(`${column} = '${v}' is marked absent but IS observed — drop the marker`);
        } else if (!observed.has(v)) {
          unobserved.push(`${column} = '${v}' (${meta.meaning}) is classified but never observed`);
        }
      }
    }
    unobserved.sort();
    expect(
      unobserved,
      `A classified catalog value and reality disagree about whether it ` +
        `exists. Mark it \`absent\` with what it would take, or — if it is not ` +
        `a member of the column's domain at all — delete it:\n  ${unobserved.join("\n  ")}`,
    ).toEqual([]);
  });

  // The body map's KEY, asserted structurally.
  //
  // `fnBodyAsts` is keyed by full signature, and not for tidiness: under
  // `schema.name` an overloaded name's SQL bodies COLLIDED, and whichever the
  // snapshot listed last answered for all of them. What kept that from being
  // read was resolveFunctionMetadata's single-candidate shortcut — an
  // invariant, not a check — and the padding bound's consensus is the first
  // consumer that asks every candidate.
  //
  // srf-padding-overload-body-split.sql catches the collision through a claim,
  // and only for the ordering that happens to hold today: which body a
  // collision would keep is nothing more than the order the rows came back in.
  // This is the half that does not depend on it.
  it("holds one body AST per sql-bodied SIGNATURE, not per name", async () => {
    const catalog = await buildNullabilityCatalog(snapshot);
    const byName = new Map<string, CatalogSnapshot["functions"]>();
    for (const f of snapshot.functions) {
      if (f.language !== "sql" || f.isAggregate) continue;
      const key = `${f.schema}.${f.name}`;
      byName.set(key, [...(byName.get(key) ?? []), f]);
    }
    const overloaded = [...byName.values()].filter(fs => fs.length > 1).flat();
    // Vacuous over a schema with no sql-bodied overload at all, so say so
    // rather than pass.
    expect(overloaded.length).toBeGreaterThan(0);
    const unanswered = overloaded
      .map(f => `${f.schema}.${f.name}(${f.argTypes})`)
      .filter(sig => !catalog.fnBodyAsts.has(sig))
      .sort();
    expect(
      unanswered,
      `an overloaded sql body the map cannot answer for on its OWN signature ` +
        `— the key has collapsed back to the name, and one overload is ` +
        `speaking for another:\n  ${unanswered.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every aggregate's recorded transition key names a body the map holds", async () => {
    const catalog = await buildNullabilityCatalog(snapshot);
    // `aggTransFn`/`aggFinalFn` and the body map's keys are rendered by two
    // DIFFERENT queries. They agree only because both go through
    // pg_get_function_identity_arguments, and if either rendering drifts the
    // fold rule stops resolving anything — silently, and reading as
    // conservatism rather than as breakage. This is that tripwire.
    //
    // The steps are filtered by SCHEMA and not by "is this a signature the
    // snapshot knows", which was the first spelling and was no tripwire at
    // all: a drifted key matches no snapshot signature, so filtering on that
    // DROPPED exactly the rows the test exists to catch. A builtin step is
    // recognised by living in pg_catalog, which drift does not move it out of.
    const steps = snapshot.functions
      .filter(f => f.isAggregate)
      .flatMap(f =>
        [f.aggTransFn, f.aggFinalFn]
          .filter((k): k is string => k !== null)
          // A transition implemented in C has no body to hold.
          .filter(k => !k.startsWith("pg_catalog."))
          .map(k => ({ agg: f.name, key: k })),
      );
    expect(steps.length).toBeGreaterThan(0);
    const missing = steps
      .filter(s => !catalog.fnBodyAsts.has(s.key))
      .map(s => `${s.agg} -> ${s.key}`)
      .sort();
    expect(
      missing,
      `an aggregate names a sql-bodied step the body map cannot answer for — ` +
        `the two renderings have drifted apart and every user aggregate has ` +
        `quietly become unreadable:\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });
});
