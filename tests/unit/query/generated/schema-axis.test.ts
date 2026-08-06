import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { deparseSync } from "pgsql-deparser";
import { parseSql } from "../../../../src/ast.js";
import { snapshotCatalog } from "../../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../../src/query/catalog-adapter.js";
import { inferNullability, UnsupportedNodeError } from "../../../../src/query/nullability-walk.js";
import type { CatalogSnapshot } from "../../../../src/catalog/types.js";
import type { OutputNullability } from "../../../../src/query/types.js";
import { generateFixtureData } from "../fixture-data/generate.js";
import { fixtureGeneratorRegistry } from "../fixture-data/generators.js";
import { FEATURES } from "../catalog-features.js";
import {
  generateQueries,
  generateDeepJoinQueries,
  type GeneratedQuery,
} from "./generator.js";
import { BASE_SCHEMA_SQL, SCHEMA_VARIANTS, type SchemaVariant } from "./schema-variants.js";

// ---------------------------------------------------------------------------
// The schema axis — `docs/generated-surface.md` item 4.
//
// The corpus becomes a function of (SCHEMA, query shape) rather than of query
// shape alone. The measurement that justifies it: across seven engine changes
// and eight closed findings the generated corpus reported zero disagreements
// both before and after, because it could not EXPRESS a falsifying input —
// five of the eight needed schema vocabulary `fixtures/schema.sql` does not
// have. Worse, two mechanisms the engine now SHIPS have no generated coverage
// at all, because `t`, `u` and `v` declare no keys.
//
// The generator's schema contract is a set of NAMES, so a variant that keeps
// them and changes only the catalog features behind them runs the whole
// structural corpus unchanged; `schema-variants.ts` is that list.
//
// **What this suite can and cannot prove is unchanged and still one-sided**
// (`docs/query-generator.md`). Execution can only falsify a `notNull`, and the
// column-list comparison is complete. So there are exactly two query oracles
// here — ordered column NAMES, and no falsified `notNull` — and deliberately
// none of the base suite's presence-group, parameter-contract or witness
// machinery: a wider schema finds more UNSOUNDNESS and more wrong column
// lists, and finds no imprecision at all.
//
// **The census is the primary signal, not the query failures.** A feature the
// census names and no variant produces is the finding, so the coverage
// assertions below are the ones to read first: they tie each variant to the
// `catalog-features.ts` entries it exists to bring under generation, and the
// report prints which of the census's gaps remain unreachable.
//
// Bounded by default, in the style of GENERATED_ALL_STATES: every variant runs
// a deterministic STRIDE sample of the corpus against `empty` and the
// variant's own generated state. `GENERATED_ALL_SCHEMAS=1` runs the whole
// corpus per variant. The bound is printed either way — a silent cap reads as
// "covered everything" when it did not.
// ---------------------------------------------------------------------------

const WIDE = !!process.env.GENERATED_ALL_SCHEMAS;
/** Queries per variant in the default run. Reported, never silent. */
const SAMPLE = 420;
/** Recreate the instance every N executions; a long-lived PGlite never returns pages. */
const QUERIES_PER_INSTANCE = 1200;

interface Finding {
  schema: string;
  state: string;
  sql: string;
  detail: string;
}

interface VariantResult {
  variant: SchemaVariant;
  queries: number;
  sampledFrom: number;
  /** Parameterised queries skipped — the base suite's business, not this one's. */
  parameterised: number;
  refused: number;
  rejected: Finding[];
  crashes: Finding[];
  shapeMismatches: Finding[];
  violations: Finding[];
  sawRows: boolean;
  /** Census features the variant claims, and whether its snapshot has them. */
  coverage: { feature: string; detected: boolean }[];
  states: string[];
}

/** A deterministic sample: stride the corpus so every axis region is reached. */
function sample<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const stride = items.length / n;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(items[Math.floor(i * stride)]!);
  return out;
}

/** The ordered output column names PostgreSQL reports for `sql`. */
async function pgColumnNames(pg: PGlite, sql: string): Promise<string[] | { error: string }> {
  try {
    const res = await pg.query<unknown[]>(sql, [], { rowMode: "array" });
    return res.fields.map(f => f.name);
  } catch (e) {
    return { error: (e as Error).message.split("\n")[0]! };
  }
}

const results: VariantResult[] = [];

async function runVariant(variant: SchemaVariant): Promise<VariantResult> {
  const searchPath = variant.searchPath ?? ["public"];
  const setPath = `SET search_path TO ${searchPath.join(", ")};`;

  // --- catalog, from an instance that then goes away ----------------------
  const catalogPg = await PGlite.create({ extensions: { plpgsql_check } });
  await catalogPg.exec("CREATE EXTENSION plpgsql_check;");
  await catalogPg.exec(BASE_SCHEMA_SQL);
  await catalogPg.exec(variant.patch);
  const snapshot: CatalogSnapshot = await snapshotCatalog(catalogPg);
  const catalog = await buildNullabilityCatalog(snapshot, { searchPath });
  await catalogPg.close();

  const seed = generateFixtureData(snapshot, {
    registry: variant.registry ?? fixtureGeneratorRegistry,
  });
  // `empty` is where an ungrouped aggregate or a scalar sublink is most
  // adversarial; the generated state is derived from THIS variant's snapshot,
  // so it satisfies the keys and domains the patch introduced by construction.
  const states = [
    { name: "empty", sql: "" },
    { name: "generated", sql: seed.sql },
  ];

  const pool = [...generateQueries(), ...generateDeepJoinQueries()];
  const chosen = WIDE ? pool : sample(pool, SAMPLE);

  const result: VariantResult = {
    variant,
    queries: chosen.length,
    sampledFrom: pool.length,
    parameterised: 0,
    refused: 0,
    rejected: [],
    crashes: [],
    shapeMismatches: [],
    violations: [],
    sawRows: false,
    coverage: variant.covers.map(feature => ({
      feature,
      detected: FEATURES[feature]!.detect(snapshot, { childToParent: new Map() }),
    })),
    states: states.map(s => s.name),
  };

  // --- deparse, re-parse, engine claims -----------------------------------
  interface Prepared {
    sql: string;
    claimed: OutputNullability[] | null;
  }
  const prepared: Prepared[] = [];
  for (const q of chosen as GeneratedQuery[]) {
    let sql: string;
    try {
      sql = deparseSync(q.ast as never).trim();
    } catch {
      continue; // a deparser failure is the base suite's business, not this one
    }
    // A parameterised query needs bindings to execute, and the parameter
    // CONTRACT is the base suite's oracle rather than this one's — this suite
    // asks only what the catalog does to the OUTPUT. Skipped, and counted:
    // a bounded run has to say what it dropped.
    if (/\$\d/.test(sql)) {
      result.parameterised++;
      continue;
    }
    let claimed: OutputNullability[] | null = null;
    try {
      const parsed = await parseSql(sql);
      const stmt = parsed.stmts?.[0]?.stmt;
      if (stmt) claimed = inferNullability(stmt, catalog);
    } catch (e) {
      if (e instanceof UnsupportedNodeError) result.refused++;
      else result.crashes.push({ schema: variant.name, state: "-", sql, detail: (e as Error).message });
      continue;
    }
    prepared.push({ sql, claimed });
  }

  // --- execute, state-major -----------------------------------------------
  for (const state of states) {
    let pg = await PGlite.create({ extensions: { plpgsql_check } });
    let sinceRecycle = 0;
    const load = async (instance: PGlite): Promise<void> => {
      await instance.exec("CREATE EXTENSION plpgsql_check;");
      await instance.exec(BASE_SCHEMA_SQL);
      await instance.exec(variant.patch);
      if (state.sql.trim()) await instance.exec(state.sql);
      if (variant.postLoad) await instance.exec(variant.postLoad);
      await instance.exec(setPath);
    };
    await load(pg);

    for (const p of prepared) {
      if (sinceRecycle >= QUERIES_PER_INSTANCE) {
        await pg.close();
        pg = await PGlite.create({ extensions: { plpgsql_check } });
        await load(pg);
        sinceRecycle = 0;
      }
      sinceRecycle++;

      const names = await pgColumnNames(pg, p.sql);
      if (!Array.isArray(names)) {
        // A generated query PostgreSQL rejects is a generator or variant
        // defect, not a finding — but it is never silently discarded.
        result.rejected.push({ schema: variant.name, state: state.name, sql: p.sql, detail: names.error });
        continue;
      }
      if (p.claimed) {
        const engine = p.claimed.map(c => c.name);
        if (engine.length !== names.length || engine.some((n, i) => n !== "" && n !== names[i])) {
          result.shapeMismatches.push({
            schema: variant.name,
            state: state.name,
            sql: p.sql,
            detail: `engine [${engine.join(", ")}] vs PostgreSQL [${names.join(", ")}]`,
          });
          continue;
        }
      }

      const rows = await pg.query<unknown[]>(p.sql, [], { rowMode: "array" }).then(r => r.rows);
      if (rows.length > 0) result.sawRows = true;
      if (!p.claimed) continue;
      for (const row of rows) {
        for (let i = 0; i < p.claimed.length; i++) {
          if (p.claimed[i]!.notNull && row[i] === null) {
            result.violations.push({
              schema: variant.name,
              state: state.name,
              sql: p.sql,
              detail: `column ${i} (${p.claimed[i]!.name || "?"}) claimed notNull, returned NULL`,
            });
          }
        }
      }
    }
    await pg.close();
  }
  return result;
}

describe("generated-query soundness across schema variants", () => {
  beforeAll(async () => {
    for (const variant of SCHEMA_VARIANTS) results.push(await runVariant(variant));
  }, 900_000);

  it("every variant covers the census features it claims", () => {
    // The primary signal. A variant exists to bring named `catalog-features.ts`
    // entries under generation; if its DDL does not actually produce them, the
    // corpus is running over a schema that looks wider and is not.
    const missing = results.flatMap(r =>
      r.coverage.filter(c => !c.detected).map(c => `${r.variant.name}: ${c.feature}`),
    );
    expect(
      missing,
      `A variant claims a census feature its own snapshot does not carry. The ` +
        `patch and the claim disagree, and the queries that ran over it proved ` +
        `nothing about the feature:\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every claimed feature name is a real census entry", () => {
    const unknown = SCHEMA_VARIANTS.flatMap(v =>
      v.covers.filter(f => !FEATURES[f]).map(f => `${v.name}: ${f}`),
    );
    expect(
      unknown,
      `A variant claims a feature that is not in catalog-features.ts. The ` +
        `census list is the axis vocabulary, so a name outside it covers ` +
        `nothing measurable:\n  ${unknown.join("\n  ")}`,
    ).toEqual([]);
  });

  it("PostgreSQL accepts every generated query, under every schema", () => {
    const bad = results.flatMap(r => r.rejected);
    expect(
      bad.slice(0, 10),
      `A generated query was rejected. Under a VARIANT schema that is a ` +
        `variant defect rather than a generator one — the patch changed a type ` +
        `or a constraint the structure relies on — and either way it is not a ` +
        `finding, it is lost coverage:\n  ` +
        bad.slice(0, 10).map(f => `[${f.schema}/${f.state}] ${f.detail}\n    ${f.sql}`).join("\n  "),
    ).toEqual([]);
  });

  it("the engine throws nothing but UnsupportedNodeError", () => {
    const bad = results.flatMap(r => r.crashes);
    expect(
      bad.slice(0, 5),
      `The walk threw something other than its refusal:\n  ` +
        bad.slice(0, 5).map(f => `[${f.schema}] ${f.detail}\n    ${f.sql}`).join("\n  "),
    ).toEqual([]);
  });

  it("output column lists agree with PostgreSQL, under every schema", () => {
    const bad = results.flatMap(r => r.shapeMismatches);
    expect(
      bad.slice(0, 10),
      `The engine's ordered column names disagree with PostgreSQL's. This is ` +
        `the complete oracle — a wrong ORDER misassigns every flag past the ` +
        `divergence while looking authoritative:\n  ` +
        bad.slice(0, 10).map(f => `[${f.schema}/${f.state}] ${f.detail}\n    ${f.sql}`).join("\n  "),
    ).toEqual([]);
  });

  it("no notNull claim is falsified, under every schema", () => {
    const bad = results.flatMap(r => r.violations);
    expect(
      bad.slice(0, 10),
      `The engine claimed notNull and PostgreSQL returned NULL. Reproduce from ` +
        `the schema NAME plus the SQL — with a varying schema the DDL is half ` +
        `the reproduction:\n  ` +
        bad.slice(0, 10).map(f => `[${f.schema}/${f.state}] ${f.detail}\n    ${f.sql}`).join("\n  "),
    ).toEqual([]);
  });

  it("execution is not vacuous under any variant", () => {
    // A variant whose every query returns zero rows falsifies nothing, and
    // would pass every assertion above while proving nothing at all.
    const vacuous = results.filter(r => !r.sawRows).map(r => r.variant.name);
    expect(
      vacuous,
      `No query returned a row under this variant, so no notNull claim could ` +
        `be falsified by it. Its seed data or its patch is wrong:\n  ${vacuous.join(", ")}`,
    ).toEqual([]);
  });

  it("no variant claims a feature no query can reach", () => {
    // The marker's other side. A variant claiming `procedure` would be
    // claiming something no DDL can deliver, and the coverage assertion above
    // would pass on the snapshot while the corpus reached nothing.
    const impossible = SCHEMA_VARIANTS.flatMap(v =>
      v.covers.filter(f => FEATURES[f]?.unreachableByQuery).map(f => `${v.name}: ${f}`),
    );
    expect(
      impossible,
      `A variant claims a feature marked unreachable by any query. The DDL may ` +
        `well exist; what does not exist is a call site:\n  ${impossible.join("\n  ")}`,
    ).toEqual([]);
  });

  it("prints the report", () => {
    const gaps = Object.entries(FEATURES).filter(([, f]) => f.absent);
    const covered = new Set(SCHEMA_VARIANTS.flatMap(v => v.covers));
    const uncovered = gaps.filter(([k]) => !covered.has(k));
    const impossible = uncovered.filter(([, f]) => f.unreachableByQuery).map(([k]) => k);
    const stillUnreachable = uncovered.filter(([, f]) => !f.unreachableByQuery).map(([k]) => k);
    const lines = [
      `\nschema axis: ${results.length} variants${WIDE ? " (GENERATED_ALL_SCHEMAS)" : ""}`,
      ...results.map(
        r =>
          `  ${r.variant.name.padEnd(15)} ${String(r.queries).padStart(5)} queries` +
          `${r.queries < r.sampledFrom ? ` of ${r.sampledFrom} (stride sample)` : ""}` +
          ` × ${r.states.join(", ")} — ${r.parameterised} parameterised (skipped), ${r.refused} refused, ` +
          `${r.shapeMismatches.length} column-list, ${r.violations.length} nullability, ` +
          `${r.rejected.length} rejected` +
          `\n${" ".repeat(19)}covers ${r.coverage.map(c => c.feature).join(", ")}`,
      ),
      ``,
      `  census features the fixture schema cannot reach: ${gaps.length}`,
      `  of those, now under generation:                  ${gaps.length - uncovered.length}`,
      `  no query can EVER reach (not pending work):      ${impossible.length}`,
      `    ${impossible.join(", ")}`,
      `  actionable gaps remaining:                       ${stillUnreachable.length}`,
      `    ${stillUnreachable.join(", ")}`,
      ``,
      `  "Actionable" counts census features the FIXTURE SCHEMA lacks. It is`,
      `  not a claim that everything is generated: a feature can be carried by`,
      `  the schema and pinned by a hand-written fixture without the corpus`,
      `  reaching it. The sub-partition tree is the standing example — the`,
      `  fact that distinguishes a two-level tree is a write hook on a`,
      `  GRANDCHILD, which is a DML/RETURNING shape the corpus does not`,
      `  generate over partitioned targets, and the facts it DOES generate`,
      `  (notNullTree and friends) cannot diverge at depth because a partition`,
      `  may not drop a parent's NOT NULL. trigger-subpartition-routed.sql`,
      `  carries it instead, mutation-tested against a one-level union.`,
    ];
    console.log(lines.join("\n"));
    expect(results.length).toBe(SCHEMA_VARIANTS.length);
  });
});
