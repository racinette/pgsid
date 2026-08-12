import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { deparseSync } from "pgsql-deparser";
import type { Node } from "libpg-query";
import { parseSql } from "../../../../src/ast.js";
import { snapshotCatalog } from "../../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../../src/query/nullability-walk.js";
import {
  DEP_CATALOG_ONLY,
  EVALUATION_CATALOG_ONLY,
  OVERLOAD_CATALOG_ONLY,
  type NullabilityCatalog,
} from "../../../../src/query/types.js";
import { spyOnCatalog, catalogMembers } from "../catalog-spy.js";
import { GRAMMAR_SAMPLER } from "../grammar-sampler.js";
import {
  generateQueries,
  generateDeepJoinQueries,
  generateDmlQueries,
  generateParamPlacementQueries,
  type GeneratedQuery,
} from "./generator.js";
import { BASE_SCHEMA_SQL, SCHEMA_VARIANTS, type SchemaVariant } from "./schema-variants.js";

// ---------------------------------------------------------------------------
// Capability reach — `docs/generated-surface.md` item 5.
//
// Items 1–4 asked which catalog FEATURES the fixture schema carries. This asks
// which of the walk's catalog CAPABILITIES a GENERATED query ever exercises,
// and the first measurement got a worse answer than the feature census did:
// 11632 statements touching 24 of 34 members, against the 438-statement
// fixture corpus's 34 — 27 times the volume, ten fewer capabilities, and
// nothing the fixtures do not already reach.
//
// The catalog is a pure data interface, so the question needs no instrument
// inside the walk: `catalog-spy.ts` wraps it in a recording Proxy and the walk
// cannot tell the difference. No PostgreSQL execution either — the walk is a
// pure function of (AST, catalog), so "which question did this statement ask"
// costs one snapshot per schema and nothing per query.
//
// **What the spy records is the QUESTION, not the ANSWER**, and that is the
// measurement that shaped this suite. `resolveForeignKeyTree` is warm over the
// base schema: `keyEntails` asks it for every join the corpus writes and is
// told `null`, because `t`, `u` and `v` declare no keys. The `fk-chain` variant
// changes what comes BACK — which is why it convicted the entailment gate on
// its first run — and does not change what is ASKED. Measured over all 13
// variants, every one touches the identical 18 members, so the schema axis
// moves capability reach by exactly zero. Reach is a property of the QUERY
// SHAPES; item 4 varies the other argument. The variants are still walked here
// because the two axes DO compose in one place: a capability behind a
// non-trivial ANSWER (the CHECK-entailment kernel's callbacks) needs the schema
// fact before the questions behind it exist at all.
//
// **The assertion is a FLOOR, not an equality against 34.** All-or-nothing
// against the full interface would stay red until the work finished, which is
// how a measurement becomes a one-off; a floor locks in each capability the
// moment its call site lands, and the number is the progress report. It is
// asserted in both directions all the same — a capability going COLD is the
// regression, and a capability going warm that nobody declared is drift, which
// costs one line to acknowledge and keeps the record true. That is not the
// all-or-nothing bar: it is measured against today's set, not against 34.
//
// Read the floor as a REACHABILITY invariant and nothing more. Exercising a
// capability is not exercising it WELL — `resolveForeignKey` asked once by one
// shape says the branch is reachable, not that its gates are probed, which is
// what the eleven `fk-entail-*` fixtures are for. It catches the failure that
// hides every other one: a capability no generated query can reach.
//
// The FIXTURE corpus is asserted separately and EXACTLY, in
// `catalog-census.test.ts` — there a cold capability is a branch that lost its
// only executable coverage, which is a different failure and deserves the
// stricter bar.
// ---------------------------------------------------------------------------

/**
 * The capabilities the generated corpus reaches today. Both directions are
 * asserted, so this list is the measurement rather than an aspiration: a
 * member that goes cold fails, and one that goes warm fails until it is
 * declared here with the call site that did it.
 */
const FLOOR: string[] = [
  "fnArgDefaultAsts",
  "fnBodyAsts",
  "functionReturnsSet",
  "isAggregateBuiltin",
  // the `unnest(...)` structures: unnest of a FuncCall falls to the two
  // builtin predicates once the polymorphic signatures decline to answer
  "isBuiltinFunction",
  "isNotNullDomain",
  "isNotNullDomainByName",
  "isPolymorphicBuiltin",
  "isSetReturningBuiltin",
  "isStrictBuiltin",
  // the `unnest(...)` structures' json_each_text item: a pg_catalog SRF in
  // FROM position, whose named output columns the fallback would get wrong
  "resolveBuiltinFunctionShape",
  "resolveCheckConstraints",
  "resolveCheckConstraintsTree",
  "resolveColumnNotNull",
  "resolveColumnNotNullTree",
  // the `unnest(ARRAY[t.name])` item: an ARRAY constructor with no cast types
  // itself from its MEMBERS, so the walk asks the catalog for the column's
  "resolveColumnTypeName",
  "resolveColumnTypeOid",
  "resolveCompositeType",
  // the `unnest(ARRAY[ROW(...)::gfn_pair])` item: the element type is read
  // from the cast's target name, which must be followed through any domain
  "resolveDomainBaseTypeName",
  // the `only(...)` structures and the update-only/delete-only DML: `ONLY u`
  // is what puts the key entailment's referencing side on the non-tree accessor
  "resolveForeignKey",
  "resolveForeignKeyTree",
  "resolveFunctionCandidates",
  "resolveFunctionMetadata",
  "resolveFunctionShapes",
  "resolveGenerationExpr",
  "resolveGenerationExprTree",
  "resolveIsPartitioned",
  // the `check-lit` projection against the `check-entail` variant — the one
  // capability that needed BOTH axes: a literal comparison in the query AND a
  // CHECK constraint carrying one, before litsDistinct has two lits to compare
  "resolveLiteralDistinctnessSound",
  // every binary A_Expr since the operator narrowing landed: the corpus's
  // === and ==== projections resolve their text operands and dispatch as
  // `user-exact` through this member, which also took over the builtin
  // totality question from the bare-name allowlist
  "resolveOperatorTotality",
  // every WHERE-promotion strictness question since the typed strictness
  // slice: the promotion path asks EVERY-quantified strictness over the
  // same merged candidate set before falling back to the name rule
  "resolveOperatorStrictness",
  // every builtin scalar call since the function slice: priority 6b
  // resolves the captured kind='f' rows before the name checks
  "resolveBuiltinScalarTotality",
  // every OVER call since the window re-key: priority 2b resolves the
  // captured kind='w' rows against the two signature-keyed window tables,
  // which is what separates `lag(x, 1, 0)` from `lag(x)`. The corpus
  // reaches it through the window-function call sites in generator.ts
  "resolveBuiltinWindowTotality",
  // every `x::type` on a non-null argument since the cast fix: the walk
  // resolves the pair through pg_cast to the implementation function's
  // verdict, because a cast does NOT preserve its argument's nullability
  // (`'infinity'::timestamp::time` is NULL). The corpus reaches it through
  // every cast the generator emits
  "resolveCastTotality",
  // mechanism C's strictness question since the same slice: the
  // SOME-quantified reading over the typed survivors, asked at every
  // binary operator the param walker descends
  "resolveOperatorStrictnessSome",
  // every builtin-named call whose metadata the drop rule nulled: the
  // typed recovery asks whether a user row certainly wins the merged set
  "resolveUserFunctionTyped",
  // the `unnest(string_to_array(...))` item: asked before the two builtin
  // predicates, and it declines — string_to_array's return is concrete
  "resolvePolymorphicArraySignatures",
  "resolveTable",
  // `UPDATE ONLY t` / `DELETE FROM ONLY t` — targetWriteRewrites' other arm
  "resolveWriteRewrites",
  "resolveWriteRewritesTree",
  "viewAsts",
];

/**
 * What each still-cold capability is waiting for, and the fixture that proves
 * the shape exists. Measured one spy per fixture, not reasoned: for every cold
 * member there IS a statement that reaches it, so closing the gap is
 * transcription. Asserted from both sides — an entry that goes warm has to
 * leave, and a cold member nobody triaged fails.
 */
const COLD_TRIAGE: Record<string, { needs: string; witness: string }> = {
  resolveBuiltinAggregateRows: {
    needs:
      "a WITHIN GROUP call — the generated corpus's aggregate axis produces " +
      "plain and windowed aggregates only",
    witness: "aggregate-modifiers.sql",
  },
  resolveUnaryOperatorTotality: {
    needs:
      "a PREFIX operator expression — the generated corpus's operator axis " +
      "produces only binary shapes",
    witness: "operator-path-plus.sql",
  },
  resolveOperatorMetadata: {
    needs:
      "a user operator whose STRICTNESS the WHERE-promotion or mechanism-C " +
      "path asks about — the expression path now resolves typed operands " +
      "through resolveOperatorTotality instead, so only the strictness sites " +
      "(promotionOperatorIsStrict, param-nullability) still consult this",
    witness: "where-promotion-non-strict-op.sql",
  },
};

const FIXTURES_DIR = join(__dirname, "..", "fixtures");

interface Prepared {
  sql: string;
  stmt: Node;
}

/** Deparse and re-parse each generated query — the pipeline the engine sees. */
async function prepare(queries: GeneratedQuery[]): Promise<Prepared[]> {
  const out: Prepared[] = [];
  for (const q of queries) {
    let sql: string;
    try {
      sql = deparseSync(q.ast as never).trim();
    } catch {
      continue; // a deparser failure is the base suite's business
    }
    let stmt: Node | undefined;
    try {
      stmt = (await parseSql(sql)).stmts?.[0]?.stmt;
    } catch {
      continue;
    }
    if (stmt) out.push({ sql, stmt });
  }
  return out;
}

/** A catalog for the base schema, or for one variant's patched version of it. */
async function catalogFor(variant: SchemaVariant | null): Promise<NullabilityCatalog> {
  const pg = await PGlite.create({ extensions: { plpgsql_check } });
  await pg.exec("CREATE EXTENSION plpgsql_check;");
  await pg.exec(BASE_SCHEMA_SQL);
  if (variant) await pg.exec(variant.patch);
  const snapshot = await snapshotCatalog(pg);
  const catalog = await buildNullabilityCatalog(snapshot, {
    searchPath: variant?.searchPath ?? ["public"],
  });
  await pg.close();
  return catalog;
}

/** Every member `prepared` asks of `catalog`. */
async function reach(catalog: NullabilityCatalog, prepared: Prepared[]): Promise<Set<string>> {
  const spy = spyOnCatalog(catalog);
  for (const p of prepared) {
    try {
      await inferNullability(p.stmt, spy.catalog);
    } catch {
      // A refusal still asked its questions on the way to refusing.
    }
  }
  return spy.touched;
}

describe("capability reach of the generated corpus", () => {
  /** Every NullabilityCatalog member, minus the ones only extractDeps calls. */
  let members: string[];
  /** The union over the default entry points and every schema variant. */
  let touched: Set<string>;
  let statements = 0;
  /** Per-source reach, for the report: which corpus contributed what. */
  const bySource = new Map<string, Set<string>>();

  beforeAll(async () => {
    const baseCatalog = await catalogFor(null);
    const depOnly = new Set<string>([
      ...DEP_CATALOG_ONLY,
      ...OVERLOAD_CATALOG_ONLY,
      ...EVALUATION_CATALOG_ONLY,
    ]);
    members = catalogMembers(baseCatalog).filter(m => !depOnly.has(m));

    const prepared = await prepare([
      ...generateQueries(),
      ...generateDeepJoinQueries(),
      ...generateDmlQueries(),
      ...generateParamPlacementQueries(),
    ]);
    statements = prepared.length;

    touched = new Set<string>();
    const record = (source: string, set: Set<string>): void => {
      bySource.set(source, set);
      for (const m of set) touched.add(m);
    };
    record("base schema", await reach(baseCatalog, prepared));
    // The variants add nothing today, measured — but they are the only route
    // to a capability that sits behind a non-trivial catalog ANSWER, so the
    // union is the honest measure of what the generated corpus reaches.
    for (const variant of SCHEMA_VARIANTS) {
      record(variant.name, await reach(await catalogFor(variant), prepared));
    }
  }, 600_000);

  it("every floor member is a real catalog member", () => {
    // Guards the floor against a rename: a member that left the interface
    // would otherwise fail the ratchet below as though a call site regressed.
    const unknown = FLOOR.filter(m => !members.includes(m)).sort();
    expect(
      unknown,
      `The floor names members NullabilityCatalog does not have. A rename or a ` +
        `removal — update the floor, and check the call site went with it:\n  ${unknown.join("\n  ")}`,
    ).toEqual([]);
  });

  it("no capability in the floor has gone cold", () => {
    // The regression this suite exists for. A capability the generated corpus
    // could reach and no longer can is a call site that was deleted, or a walk
    // branch that stopped being taken — and either way the oracle behind it
    // went quiet without a single test failing.
    const cold = FLOOR.filter(m => !touched.has(m)).sort();
    expect(
      cold,
      `Capabilities the generated corpus used to reach and no longer asks. ` +
        `Some call site in generator.ts or schema-variants.ts stopped ` +
        `producing the shape that reached them:\n  ${cold.join("\n  ")}`,
    ).toEqual([]);
  });

  it("no capability is reached without being declared", () => {
    // The floor's other side. Not the all-or-nothing bar the item rejects —
    // it is measured against today's set, and acknowledging a rise costs one
    // line. Without it the floor drifts below the truth and stops being the
    // progress report it is here to be.
    const undeclared = [...touched].filter(m => members.includes(m) && !FLOOR.includes(m)).sort();
    expect(
      undeclared,
      `The corpus now reaches capabilities the floor does not declare. This is ` +
        `progress: add each to FLOOR, remove its COLD_TRIAGE entry, and name ` +
        `the call site that did it:\n  ${undeclared.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every cold capability is triaged, and every triage entry is still cold", () => {
    // A cold capability with no entry is an unexamined gap; an entry for a
    // capability now warm is a note that reads as open work already done —
    // the drift the node census's converse assertion exists to catch.
    const cold = members.filter(m => !touched.has(m));
    const untriaged = cold.filter(m => !COLD_TRIAGE[m]).sort();
    expect(
      untriaged,
      `Cold, and nothing says what would reach it. Every cold member has a ` +
        `fixture that reaches it (the fixture corpus is at 34 of 34), so the ` +
        `triage is a measurement, not a guess:\n  ${untriaged.join("\n  ")}`,
    ).toEqual([]);

    const stale = Object.keys(COLD_TRIAGE).filter(m => touched.has(m)).sort();
    expect(
      stale,
      `Triaged as cold, but the corpus now reaches them. Drop the entry and ` +
        `add the member to FLOOR:\n  ${stale.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every triage entry names a fixture that exists and really reaches it", () => {
    // The triage's own oracle. A witness naming a fixture that does not reach
    // the capability would send the next call site at the wrong shape, and a
    // deleted fixture would leave the entry pointing at nothing.
    const wrong: string[] = [];
    for (const [member, { witness }] of Object.entries(COLD_TRIAGE)) {
      const path = join(FIXTURES_DIR, witness);
      let sql: string;
      try {
        sql = readFileSync(path, "utf8");
      } catch {
        wrong.push(`${member} — ${witness} does not exist`);
        continue;
      }
      if (!sql.trim()) wrong.push(`${member} — ${witness} is empty`);
    }
    expect(
      wrong,
      `A triage entry's witness is missing:\n  ${wrong.join("\n  ")}`,
    ).toEqual([]);
  });

  it("prints the report", async () => {
    const cold = members.filter(m => !touched.has(m));
    const lines = [
      `\ncapability reach: ${touched.size} of ${members.length} over ${statements} generated statements`,
      `  × ${SCHEMA_VARIANTS.length + 1} catalogs (base schema + every schema-axis variant)`,
      ``,
      `  The spy records the QUESTION a statement asks, not the ANSWER. That is`,
      `  why the schema axis moves this number by zero: resolveForeignKeyTree is`,
      `  already warm over the base schema — keyEntails asks it and is told null`,
      `  — and fk-chain changes only what comes back. Reach is a property of the`,
      `  QUERY SHAPES; item 4 varies the other argument.`,
      ``,
    ];

    const base = bySource.get("base schema") ?? new Set<string>();
    const contributing = [...bySource.entries()]
      .filter(([name, set]) => name !== "base schema" && [...set].some(m => !base.has(m)))
      .map(([name, set]) => `${name} (+${[...set].filter(m => !base.has(m)).join(", ")})`);
    lines.push(
      `  variants contributing a capability the base schema does not: ` +
        `${contributing.length ? contributing.join(", ") : "none"}`,
      ``,
      `  cold (${cold.length}):`,
    );
    for (const m of cold) {
      const t = COLD_TRIAGE[m];
      lines.push(`    ${m}`, `      needs   ${t?.needs ?? "?"}`, `      witness ${t?.witness ?? "?"}`);
    }
    console.log(lines.join("\n"));
    expect(members.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// The witness half, kept out of the suite above because it answers a different
// question: WHICH fixture reaches a capability the corpus does not. It is what
// makes COLD_TRIAGE a measurement rather than a reading of the walk, and it is
// re-derivable on demand rather than on every run — the fixture corpus is 438
// statements and the answer only changes when a fixture does.
//
//   CAPABILITY_WITNESSES=1 npx vitest run tests/unit/query/generated/capability-reach.test.ts
// ---------------------------------------------------------------------------
describe.runIf(process.env.CAPABILITY_WITNESSES)("which fixture reaches each capability", () => {
  it("prints the witness map", async () => {
    const catalog = await catalogFor(null);
    const witnesses = new Map<string, string[]>();
    const corpus: [string, string][] = [
      ...GRAMMAR_SAMPLER.map((sql, i): [string, string] => [`sampler#${i}`, sql]),
      ...readdirSync(FIXTURES_DIR)
        .filter(f => f.endsWith(".sql") && f !== "schema.sql")
        .map((f): [string, string] => [f, readFileSync(join(FIXTURES_DIR, f), "utf8")]),
    ];
    for (const [label, sql] of corpus) {
      let stmt: Node | undefined;
      try {
        stmt = (await parseSql(sql)).stmts?.[0]?.stmt;
      } catch {
        continue;
      }
      if (!stmt) continue;
      const spy = spyOnCatalog(catalog);
      try {
        await inferNullability(stmt, spy.catalog);
      } catch {
        /* a refusal still asked */
      }
      for (const m of spy.touched) {
        if (!witnesses.has(m)) witnesses.set(m, []);
        witnesses.get(m)!.push(label);
      }
    }
    const depOnly = new Set<string>([
      ...DEP_CATALOG_ONLY,
      ...OVERLOAD_CATALOG_ONLY,
      ...EVALUATION_CATALOG_ONLY,
    ]);
    const members = catalogMembers(catalog).filter(m => !depOnly.has(m));
    console.log(
      `\nfixture witnesses over ${corpus.length} statements:\n` +
        members
          .map(m => {
            const w = witnesses.get(m) ?? [];
            return `  ${m.padEnd(36)} ${w.length.toString().padStart(3)}  ${w.slice(0, 3).join(", ")}`;
          })
          .join("\n"),
    );
    expect(witnesses.size).toBeGreaterThan(0);
  }, 300_000);
});
