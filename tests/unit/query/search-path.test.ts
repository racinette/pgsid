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
  `);
  const snapshot = await snapshotCatalog(pg);
  defaultCatalog = await buildNullabilityCatalog(snapshot);
  pathCatalog = await buildNullabilityCatalog(snapshot, { searchPath: ["app_s", "public"] });
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
