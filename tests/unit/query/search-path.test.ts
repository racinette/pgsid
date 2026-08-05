import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { parseSql } from "../../../src/ast.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// Search-path resolution pins (adversarial-2 finding 5).
//
// `NullabilityCatalog.resolveTable`'s documented contract is search-path
// resolution; the adapter hardcoded "public". That had two halves under a
// real `SET search_path = app_s, public`: the SHADOWING half answered for
// public.t while PostgreSQL resolves app_s.t — different arity, names and
// flags, silently — and the REFUSAL half turned app_s-only relations into
// `unresolvable relation` errors for queries PostgreSQL accepts. Both are
// the same missing input, threaded here as `buildNullabilityCatalog`'s
// `searchPath` option (default ["public"], so every existing caller is
// byte-identical). WHERE the path comes from is the consumer's decision —
// a per-connection input the engine cannot discover — and stays with the
// consumer design (finding 5's fix 9(b)).
//
// These pins live in a dedicated suite because the fixture harness builds
// ONE catalog under the default path; the shadow can only be observed by
// building a second catalog. PGlite's RowDescription under the real
// search_path is the referee for the shape.
// ---------------------------------------------------------------------------

let pg: PGlite;
let defaultCatalog: NullabilityCatalog;
let pathCatalog: NullabilityCatalog;
let reverseCatalog: NullabilityCatalog;

async function infer(catalog: NullabilityCatalog, sql: string) {
  const parsed = await parseSql(sql);
  return inferNullability(parsed.stmts![0]!.stmt!, catalog);
}

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`
    CREATE TABLE t (id integer NOT NULL, name text, val text, active boolean NOT NULL);
    CREATE SCHEMA app_s;
    CREATE TABLE app_s.t (zzz integer NOT NULL, qqq text NOT NULL, www text);
    CREATE TABLE app_s.app_only (o1 integer NOT NULL, o2 text);

    -- Function resolution is by name AND argument types, so the two schemas
    -- hold DIFFERENT signatures: PostgreSQL considers both and picks by type.
    CREATE DOMAIN non_empty_text AS text NOT NULL CHECK (value <> '');
    CREATE FUNCTION app_s.f(x text) RETURNS non_empty_text
      LANGUAGE sql AS $$ SELECT 'always'::non_empty_text $$;
    CREATE FUNCTION public.f(x integer) RETURNS text
      LANGUAGE sql AS $$ SELECT NULL::text $$;
    -- Same NAME, same SIGNATURE: here the hiding rule applies and the
    -- earlier schema in the path really does win.
    CREATE FUNCTION app_s.h(x text) RETURNS non_empty_text
      LANGUAGE sql AS $$ SELECT 'from_app'::non_empty_text $$;
    CREATE FUNCTION public.h(x text) RETURNS text
      LANGUAGE sql AS $$ SELECT NULL::text $$;
    -- Different ARITY across schemas, not just different types.
    CREATE FUNCTION app_s.m(a text, b text) RETURNS non_empty_text
      LANGUAGE sql AS $$ SELECT 'two'::non_empty_text $$;
    CREATE FUNCTION public.m(a integer) RETURNS text
      LANGUAGE sql AS $$ SELECT NULL::text $$;
  `);
  const snapshot = await snapshotCatalog(pg);
  defaultCatalog = await buildNullabilityCatalog(snapshot);
  pathCatalog = await buildNullabilityCatalog(snapshot, { searchPath: ["app_s", "public"] });
  reverseCatalog = await buildNullabilityCatalog(snapshot, { searchPath: ["public", "app_s"] });
}, 60_000);

describe("search-path resolution", () => {
  it("the shadow: an unqualified name resolves to the FIRST schema in the path", async () => {
    // The referee first: PostgreSQL's own RowDescription under the path.
    await pg.exec(`SET search_path = app_s, public`);
    const fields = (await pg.query(`SELECT * FROM t`)).fields.map(f => f.name);
    await pg.exec(`SET search_path = public`);
    expect(fields).toEqual(["zzz", "qqq", "www"]);

    const results = await infer(pathCatalog, "SELECT * FROM t");
    expect(results.map(r => r.name)).toEqual(fields);
    expect(results.map(r => r.notNull)).toEqual([true, true, false]);
  });

  it("the control: the default path still answers for public.t", async () => {
    const results = await infer(defaultCatalog, "SELECT * FROM t");
    expect(results.map(r => r.name)).toEqual(["id", "name", "val", "active"]);
    expect(results.map(r => r.notNull)).toEqual([true, false, false, true]);
  });

  it("the refusal half closes: an app_s-only relation resolves under the path", async () => {
    const results = await infer(pathCatalog, "SELECT * FROM app_only");
    expect(results.map(r => r.name)).toEqual(["o1", "o2"]);
    expect(results.map(r => r.notNull)).toEqual([true, false]);
  });

  it("…and still refuses under the default path, where PostgreSQL would too", async () => {
    await expect(infer(defaultCatalog, "SELECT * FROM app_only")).rejects.toMatchObject({
      name: "UnsupportedNodeError",
      site: "from-item",
    });
  });

  it("a qualified reference is path-independent", async () => {
    for (const catalog of [defaultCatalog, pathCatalog]) {
      const results = await infer(catalog, "SELECT * FROM app_s.t");
      expect(results.map(r => r.name)).toEqual(["zzz", "qqq", "www"]);
    }
  });
});

// ---------------------------------------------------------------------------
// Functions resolve by name AND argument types, so the first-schema-wins rule
// that is correct for relations is WRONG for them: PostgreSQL gathers
// candidates from every schema in the path. Reading the first schema's
// metadata claimed its NOT NULL domain return, inlined its body, and expanded
// its return type into a column list — three mechanisms, all measured
// falsified. Unqualified lookups now merge across the path (deduped by
// `argTypes`, which is what the hiding rule keys on) and "one candidate"
// means one across the merged set, so an ambiguous name falls to the existing
// overload-consensus rule.
// ---------------------------------------------------------------------------

describe("search-path function resolution", () => {
  it("an unqualified call considers candidates from EVERY schema in the path", async () => {
    // PostgreSQL runs public.f(integer) — app_s.f takes text — and returns
    // NULL. The engine once read app_s.f's NOT NULL domain return here.
    await pg.exec(`SET search_path = app_s, public`);
    const observed = (await pg.query(`SELECT f(42) AS v`, [], { rowMode: "array" }))
      .rows as unknown[][];
    await pg.exec(`SET search_path = public`);
    expect(observed[0]![0]).toBeNull();

    const results = await infer(pathCatalog, "SELECT f(42) AS v");
    expect(results[0]!.notNull).toBe(false);
  });

  it("…including a candidate of a different ARITY, which the lookup once ignored", async () => {
    await pg.exec(`SET search_path = app_s, public`);
    const observed = (await pg.query(`SELECT m(7) AS v`, [], { rowMode: "array" }))
      .rows as unknown[][];
    await pg.exec(`SET search_path = public`);
    expect(observed[0]![0]).toBeNull();

    const results = await infer(pathCatalog, "SELECT m(7) AS v");
    expect(results[0]!.notNull).toBe(false);
  });

  it("an IDENTICAL signature IS hidden by the earlier schema — both directions", async () => {
    // The one place first-in-path is right, and the reason the merge dedupes
    // by argTypes rather than dropping to consensus for every clash: this
    // call keeps its precision.
    await pg.exec(`SET search_path = app_s, public`);
    const appRow = (await pg.query(`SELECT h('q') AS v`, [], { rowMode: "array" }))
      .rows as unknown[][];
    await pg.exec(`SET search_path = public, app_s`);
    const pubRow = (await pg.query(`SELECT h('q') AS v`, [], { rowMode: "array" }))
      .rows as unknown[][];
    await pg.exec(`SET search_path = public`);
    expect(appRow[0]![0]).toBe("from_app");
    expect(pubRow[0]![0]).toBeNull();

    expect((await infer(pathCatalog, "SELECT h('q') AS v"))[0]!.notNull).toBe(true);
    expect((await infer(reverseCatalog, "SELECT h('q') AS v"))[0]!.notNull).toBe(false);
  });

  it("a qualified call is unaffected by the path", async () => {
    const results = await infer(pathCatalog, "SELECT app_s.f('a') AS v");
    expect(results[0]!.notNull).toBe(true);
  });
});
