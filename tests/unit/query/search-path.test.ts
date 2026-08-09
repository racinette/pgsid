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
    CREATE SCHEMA mid_s;
    CREATE TABLE mid_s.t (m1 integer NOT NULL, m2 text);

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
    -- A user function whose signature is IDENTICAL to a pg_catalog one.
    CREATE FUNCTION public.min_scale(v numeric) RETURNS non_empty_text
      LANGUAGE sql IMMUTABLE AS $$ SELECT 'user'::non_empty_text $$;
    -- A user function under a CAPTURED builtin name with a DIFFERENT
    -- signature — the charter's own example of the drop rule's cost: the
    -- engine saw the user overload as the sole candidate, dropped the set,
    -- and lost the NOT NULL domain return the metadata carries.
    CREATE FUNCTION public.lower(v integer) RETURNS non_empty_text
      LANGUAGE sql IMMUTABLE AS $$ SELECT 'low'::non_empty_text $$;

    -- The operator shadowing blind spot (closed by the narrowing): a user +
    -- on operand types pg_catalog has no candidate for, whose backing
    -- function returns NULL from NON-NULL inputs — the curated bare-name
    -- allowlist claimed notNull here, the demonstrated rank-1.
    CREATE FUNCTION public.badd(a boolean, b boolean) RETURNS boolean
      LANGUAGE sql AS $$ SELECT NULL::boolean $$;
    CREATE OPERATOR public.+ (LEFTARG = boolean, RIGHTARG = boolean, FUNCTION = public.badd);
    -- The same shape visible only under the app_s path, for the
    -- visibility pin: the path is a candidate FILTER (measured, Q1).
    CREATE FUNCTION app_s.tsub(a text, b text) RETURNS text
      LANGUAGE sql AS $$ SELECT NULL::text $$;
    CREATE OPERATOR app_s.- (LEFTARG = text, RIGHTARG = text, FUNCTION = app_s.tsub);
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
// Operator narrowing under the path — the shadowing blind spot, closed.
// The curated sets matched BARE NAMES, so a user operator named `+` was
// invisible and the walk claimed the builtin's totality for it; measured as
// a live rank-1 while answering the charter's first pre-refactor question.
// With operand types readable, the merged candidate set resolves the user
// signature exactly and dispatches its backing function instead.
// ---------------------------------------------------------------------------

describe("operator narrowing: user operators on curated names", () => {
  it("PostgreSQL runs the user + on booleans, and it answers NULL from non-null inputs", async () => {
    const r = await pg.query<{ s: boolean | null }>(`SELECT true + false AS s`);
    expect(r.rows[0]!.s).toBeNull();
  });

  it("the walk dispatches the user operator where the curated name once answered", async () => {
    const results = await infer(defaultCatalog, "SELECT active + active AS s FROM t");
    expect(results.map(r => r.notNull)).toEqual([false]);
  });

  it("integer + integer keeps its claim through the same merged candidate set", async () => {
    // The integer operands ELIMINATE both the user row and the path row;
    // every survivor is total, so the general case costs nothing.
    const results = await infer(defaultCatalog, "SELECT id + 1 AS s FROM t");
    expect(results.map(r => r.notNull)).toEqual([true]);
  });

  it("recovers a builtin-named user function where the argument type decides", async () => {
    // The referee first: PostgreSQL runs the USER lower(integer) — no
    // builtin lower takes an integer — and its NOT NULL domain guarantees
    // the value.
    const r = await pg.query<{ v: string }>(`SELECT lower(41) AS v`);
    expect(r.rows[0]!.v).toBe("low");

    // The typed merged set resolves the user row (integer eliminates every
    // builtin lower), so the domain-return metadata is back: notNull. The
    // drop rule had cost exactly this — the user overload was the sole
    // candidate the engine could see, and seeing pg_catalog beside it
    // meant seeing nothing.
    const results = await infer(defaultCatalog, "SELECT lower(id) AS v FROM t");
    expect(results.map(x => x.notNull)).toEqual([true]);

    // The builtin side is untouched: a text argument resolves the captured
    // (text) row and its signature-keyed verdict, not the user function.
    const text = await infer(defaultCatalog, "SELECT lower('ABC'::text) AS v FROM t");
    expect(text.map(x => x.notNull)).toEqual([true]);
  });

  it("the user operator is a candidate only where its schema is on the path", async () => {
    // Referee both ways: the app_s operator resolves under the app_s path
    // and does not exist under the default one.
    await pg.exec(`SET search_path = app_s, public`);
    const r = await pg.query<{ d: string | null }>(`SELECT 'a'::text - 'b'::text AS d`);
    expect(r.rows[0]!.d).toBeNull();
    await pg.exec(`SET search_path = public`);
    await expect(pg.query(`SELECT 'a'::text - 'b'::text`)).rejects.toThrow(
      /operator does not exist/,
    );

    const results = await infer(pathCatalog, "SELECT qqq - qqq AS d FROM t");
    expect(results.map(r => r.notNull)).toEqual([false]);
  });
});

// ---------------------------------------------------------------------------
// The ORDERED SET itself. The path is an ordered list and every consumer will
// hand over a different one; these pin the orderings the engine has to get
// right, each against PostgreSQL under the SAME path via `SET search_path`.
// Six of them were measured during sweep 3 as negative results and never
// pinned — a behaviour nobody has written down is one nobody can regress
// deliberately.
// ---------------------------------------------------------------------------

describe("search-path orderings", () => {
  const cases: { path: string[]; expect: string[] | "refuses"; why: string }[] = [
    { path: ["public"], expect: ["id", "name", "val", "active"], why: "the default" },
    { path: ["app_s", "public"], expect: ["zzz", "qqq", "www"], why: "first wins" },
    { path: ["public", "app_s"], expect: ["id", "name", "val", "active"], why: "…and reversed" },
    {
      path: ["mid_s", "app_s", "public"],
      expect: ["m1", "m2"],
      why: "THREE schemas: the first still wins, and the later two are not consulted",
    },
    {
      path: ["nope", "public"],
      expect: ["id", "name", "val", "active"],
      why: "a nonexistent schema is skipped, not an error",
    },
    {
      path: ["public", "public"],
      expect: ["id", "name", "val", "active"],
      why: "duplicates are idempotent",
    },
    {
      path: ["pg_catalog", "public"],
      expect: ["id", "name", "val", "active"],
      why: "naming pg_catalog FIRST changes nothing for a relation — it holds no `t`",
    },
    {
      path: ["app_s"],
      expect: ["zzz", "qqq", "www"],
      why: "a single non-public schema: public is not implicitly searched",
    },
    {
      path: [],
      expect: "refuses",
      why: "the empty path resolves no unqualified name; PostgreSQL rejects it too",
    },
  ];

  for (const { path, expect: want, why } of cases) {
    it(`resolves \`SELECT * FROM t\` under [${path.join(", ")}] — ${why}`, async () => {
      // PostgreSQL first, under the identical path.
      if (want !== "refuses") {
        await pg.exec(`SET search_path = ${path.map(x => `"${x}"`).join(", ")}`);
        const fields = (await pg.query(`SELECT * FROM t`)).fields.map(f => f.name);
        await pg.exec(`SET search_path = public`);
        expect(fields, "PostgreSQL's own answer under this path").toEqual(want);
      }

      const catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), {
        searchPath: path,
      });
      if (want === "refuses") {
        await expect(infer(catalog, "SELECT * FROM t")).rejects.toMatchObject({
          name: "UnsupportedNodeError",
          site: "from-item",
        });
        return;
      }
      expect((await infer(catalog, "SELECT * FROM t")).map(r => r.name)).toEqual(want);
    });
  }

  it("a qualified reference is unaffected by every one of them", async () => {
    for (const { path } of cases) {
      const catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), {
        searchPath: path,
      });
      expect(
        (await infer(catalog, "SELECT * FROM app_s.t")).map(r => r.name),
        JSON.stringify(path),
      ).toEqual(["zzz", "qqq", "www"]);
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

  // --- pg_catalog's implicit position (adversarial-3 finding 6) ------------

  // The path is not the whole resolution order: PostgreSQL prepends
  // pg_catalog unless the path names it, so for an identical signature the
  // BUILTIN hides the user function — the opposite of what every builtin
  // table in the engine documented. Measured both directions below.
  it("pg_catalog hides an identically-signed user function under the default path", async () => {
    const observed = (await pg.query(`SELECT min_scale('NaN'::numeric) AS v`, [], {
      rowMode: "array",
    })).rows as unknown[][];
    expect(observed[0]![0]).toBeNull();

    expect((await infer(defaultCatalog, "SELECT min_scale('NaN'::numeric) AS v"))[0]!.notNull)
      .toBe(false);
  });

  it("…and the user's runs when the path names pg_catalog after it — a COST, not a claim", async () => {
    // The one configuration where the user function wins, and the engine
    // drops the claim anyway: the fix keys on the NAME, because the snapshot
    // carries no pg_catalog signatures to merge into the candidate set. A
    // dropped claim, never a wrong one. The full form (pg_catalog signatures)
    // waits for the consumer's search-path input, which it interacts with.
    await pg.exec(`SET search_path = public, pg_catalog`);
    const observed = (await pg.query(`SELECT min_scale('NaN'::numeric) AS v`, [], {
      rowMode: "array",
    })).rows as unknown[][];
    await pg.exec(`SET search_path = public`);
    expect(observed[0]![0]).toBe("user");

    const catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), {
      searchPath: ["public", "pg_catalog"],
    });
    expect((await infer(catalog, "SELECT min_scale('NaN'::numeric) AS v"))[0]!.notNull).toBe(false);
  });

  // --- the qualifier as a DISAMBIGUATOR ------------------------------------

  // `Scope.aliases` is keyed by NAME, so two same-named relations from
  // different schemas in one FROM leave only one entry there — and that is
  // exactly the scope a schema-qualified star exists to disambiguate:
  // PostgreSQL rejects the bare `t.*` as ambiguous and answers either
  // qualified spelling (measured). Resolving through the alias map answered
  // for whichever registered last and an EMPTY column list for the other.
  it("a schema-qualified star picks its relation out of a duplicate-named scope", async () => {
    await pg.exec(`SET search_path = public`);
    const bare = await pg.query(`SELECT t.* FROM app_s.t, t`).then(
      () => null,
      (e: Error) => e.message,
    );
    expect(bare).toMatch(/ambiguous/);

    const appFields = (await pg.query(`SELECT app_s.t.* FROM app_s.t, t`)).fields.map(f => f.name);
    const pubFields = (await pg.query(`SELECT public.t.* FROM app_s.t, t`)).fields.map(f => f.name);
    expect(appFields).toEqual(["zzz", "qqq", "www"]);
    expect(pubFields).toEqual(["id", "name", "val", "active"]);

    expect((await infer(defaultCatalog, "SELECT app_s.t.* FROM app_s.t, t")).map(r => r.name))
      .toEqual(appFields);
    expect((await infer(defaultCatalog, "SELECT public.t.* FROM app_s.t, t")).map(r => r.name))
      .toEqual(pubFields);
  });

  it("a QUALIFIED call to the shadowed name keeps its precision", async () => {
    const observed = (await pg.query(`SELECT public.min_scale('NaN'::numeric) AS v`, [], {
      rowMode: "array",
    })).rows as unknown[][];
    expect(observed[0]![0]).toBe("user");

    expect(
      (await infer(defaultCatalog, "SELECT public.min_scale('NaN'::numeric) AS v"))[0]!.notNull,
    ).toBe(true);
  });
});
