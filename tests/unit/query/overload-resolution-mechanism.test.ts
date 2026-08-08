import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";

// ---------------------------------------------------------------------------
// Pins the PostgreSQL behaviours the type-aware overload design rests on.
// See docs/type-aware-overloads.md, "Still uncovered" — the three questions
// that section named are answered here as executable assertions, the way
// param-mechanism.test.ts pins the argument-nullability mechanisms. The
// engine is not involved anywhere: this is a test of PostgreSQL (and of its
// parser, for the call-shape fields tier 1 would key on), so an upgrade that
// moves a load-bearing behaviour fails loudly with the design consequence
// named, rather than silently invalidating the rule built on it.
//
// Q1 — operator resolution under search_path. The path is a VISIBILITY
//      filter on the candidate set; position decides nothing except ties
//      between IDENTICAL signatures, where earliest wins and pg_catalog
//      sits implicitly FIRST unless the path names it later.
//
// Q2 — aggregates and window functions. An ordered-set aggregate's pg_proc
//      signature INCLUDES the ORDER BY types; the hypothetical-set family
//      resolves by call SHAPE (WITHIN GROUP vs OVER), not by types, because
//      its declared parameter is VARIADIC "any"; FILTER and DISTINCT are
//      orthogonal to resolution.
//
// Q3 — domain-following. A domain resolves as its base for every base
//      measured, but the smash is the FALLBACK: a candidate declared ON the
//      domain type is exact-matched first and wins. Polymorphic parameters
//      admit domains over their required structure — except anyenum.
// ---------------------------------------------------------------------------

let pg: PGlite;

async function rows(sql: string): Promise<Record<string, unknown>[]> {
  return (await pg.query<Record<string, unknown>>(sql)).rows;
}

async function errorOf(sql: string): Promise<string | null> {
  try {
    await pg.query(sql);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(`
    CREATE SCHEMA s1;
    CREATE SCHEMA s2;
    CREATE TYPE mood AS ENUM ('a', 'b');

    -- Q1: a user operator with a builtin NAME on operand types pg_catalog
    -- has no candidate for.
    CREATE FUNCTION s1.badd(boolean, boolean) RETURNS boolean
      LANGUAGE sql AS 'SELECT NULL::boolean';
    CREATE OPERATOR s1.+ (leftarg = boolean, rightarg = boolean, function = s1.badd);

    -- Q1: identical signatures in two user schemas, sentinel results.
    CREATE FUNCTION s1.madd(mood, mood) RETURNS integer LANGUAGE sql AS 'SELECT 1';
    CREATE FUNCTION s2.madd(mood, mood) RETURNS integer LANGUAGE sql AS 'SELECT 2';
    CREATE OPERATOR s1.+ (leftarg = mood, rightarg = mood, function = s1.madd);
    CREATE OPERATOR s2.+ (leftarg = mood, rightarg = mood, function = s2.madd);

    -- Q1: a POLYMORPHIC candidate in one schema vs an EXACT match in another.
    CREATE FUNCTION s2.eadd(anyenum, anyenum) RETURNS integer LANGUAGE sql AS 'SELECT 100';
    CREATE OPERATOR s2.- (leftarg = anyenum, rightarg = anyenum, function = s2.eadd);
    CREATE FUNCTION s1.eadd2(mood, mood) RETURNS integer LANGUAGE sql AS 'SELECT 200';
    CREATE OPERATOR s1.- (leftarg = mood, rightarg = mood, function = s1.eadd2);

    -- Q1: a user DUPLICATE of a builtin signature, + (integer, integer).
    CREATE FUNCTION s1.iadd(integer, integer) RETURNS integer LANGUAGE sql AS 'SELECT 999';
    CREATE OPERATOR s1.+ (leftarg = integer, rightarg = integer, function = s1.iadd);

    -- Q2: typed columns for signature-selection probes.
    CREATE TABLE tq2 (val integer NOT NULL, txt text NOT NULL, iv interval NOT NULL);
    INSERT INTO tq2 VALUES (1, 'x', '1 hour'), (2, 'y', '2 hours');

    -- Q3: domains over varied bases.
    CREATE DOMAIN dtext AS text;
    CREATE DOMAIN dvc AS varchar(5);
    CREATE DOMAIN dnum AS numeric(6,2);
    CREATE DOMAIN dint AS integer;
    CREATE DOMAIN dint2 AS dint;
    CREATE DOMAIN darr AS integer[];
    CREATE DOMAIN drange AS int4range;
    CREATE DOMAIN denum AS mood;
    CREATE DOMAIN dck AS integer CHECK (VALUE > 0) NOT NULL;
    CREATE TABLE td (
      a dtext, b dvc, c dnum, d dint, e dint2, f darr, g drange, h denum, i dck
    );
    INSERT INTO td VALUES ('x', 'y', 1.5, 2, 3, ARRAY[1], int4range(1,5), 'a', 7);

    -- Q3: candidates declared ON a domain type, beside the base's.
    CREATE FUNCTION dplus(dint, dint) RETURNS text LANGUAGE sql AS 'SELECT ''DOMAIN OP''';
    CREATE OPERATOR + (leftarg = dint, rightarg = dint, function = dplus);
    CREATE FUNCTION gd(dint) RETURNS text LANGUAGE sql AS 'SELECT ''DOMAIN FN''';
    CREATE FUNCTION gd(integer) RETURNS text LANGUAGE sql AS 'SELECT ''BASE FN''';
    CREATE FUNCTION hd(dint) RETURNS text LANGUAGE sql AS 'SELECT ''ONLY DOMAIN FN''';
  `);
});

afterAll(async () => {
  await pg.close();
});

describe("Q1: operator resolution under search_path", () => {
  it("gathers a user operator iff its schema is on the path — position irrelevant", async () => {
    // On the path, first or last, the sole candidate resolves; off the path
    // it does not exist. The path is a visibility FILTER on the candidate
    // set, so tier 1's gathering must take path MEMBERSHIP, not path order.
    await pg.exec("SET search_path = s1, public");
    expect((await rows("SELECT (true + false) IS NULL AS r"))[0]!.r).toBe(true);
    await pg.exec("SET search_path = public, s1");
    expect((await rows("SELECT (true + false) IS NULL AS r"))[0]!.r).toBe(true);
    await pg.exec("SET search_path = public");
    expect(await errorOf("SELECT true + false")).toContain(
      "operator does not exist",
    );
  });

  it("breaks ties between IDENTICAL signatures by path position, earliest first", async () => {
    // The only place order matters — the dedup key the function side already
    // uses (pg_get_function_identity_arguments) applies to operators too.
    await pg.exec("SET search_path = s1, s2");
    expect((await rows("SELECT 'a'::public.mood + 'b'::public.mood AS r"))[0]!.r).toBe(1);
    await pg.exec("SET search_path = s2, s1");
    expect((await rows("SELECT 'a'::public.mood + 'b'::public.mood AS r"))[0]!.r).toBe(2);
  });

  it("lets an exact match in a LATER schema beat a polymorphic candidate in an EARLIER one", async () => {
    // Non-identical candidates compete on types alone, wherever they live.
    // A gathering rule that stopped at the first schema holding the name
    // would resolve to the wrong candidate here.
    await pg.exec("SET search_path = s2, s1");
    expect((await rows("SELECT 'a'::public.mood - 'b'::public.mood AS r"))[0]!.r).toBe(200);
    // Control: the polymorphic candidate alone does resolve.
    await pg.exec("SET search_path = s2");
    expect((await rows("SELECT 'a'::public.mood - 'b'::public.mood AS r"))[0]!.r).toBe(100);
  });

  it("searches pg_catalog implicitly FIRST, demoted only by naming it later", async () => {
    // The operator half of adversarial-3 finding 6, measured: a user
    // duplicate of `+ (integer, integer)` loses the identical-signature tie
    // under an implicit pg_catalog, and WINS when the path lists pg_catalog
    // after the user schema. The engine's hardwired pg_catalog-first model
    // is right for the default path and wrong for an explicit demotion.
    await pg.exec("SET search_path = s1");
    expect((await rows("SELECT 1 + 2 AS r"))[0]!.r).toBe(3);
    await pg.exec("SET search_path = s1, pg_catalog");
    expect((await rows("SELECT 1 + 2 AS r"))[0]!.r).toBe(999);
    await pg.exec("SET search_path = pg_catalog, s1");
    expect((await rows("SELECT 1 + 2 AS r"))[0]!.r).toBe(3);
  });

  it("bypasses the path entirely for OPERATOR(schema.op)", async () => {
    await pg.exec("SET search_path = public");
    expect((await rows("SELECT 1 OPERATOR(s1.+) 2 AS r"))[0]!.r).toBe(999);
  });
});

describe("Q2: aggregate and window signatures", () => {
  beforeAll(async () => {
    await pg.exec("SET search_path = public");
  });

  it("keys an ordered-set aggregate's overload on the ORDER BY type", async () => {
    // percentile_cont's four pg_proc rows differ in the position AFTER
    // aggnumdirectargs — (float8, float8)→float8 vs (float8, interval)→
    // interval. Exact match that ignores agg_order picks a wrong row or
    // none: the WITHIN GROUP type key is direct args ++ ORDER BY types.
    expect((await rows(
      "SELECT pg_typeof(percentile_cont(0.5) WITHIN GROUP (ORDER BY val))::text AS t FROM tq2",
    ))[0]!.t).toBe("double precision");
    expect((await rows(
      "SELECT pg_typeof(percentile_cont(0.5) WITHIN GROUP (ORDER BY iv))::text AS t FROM tq2",
    ))[0]!.t).toBe("interval");
    expect((await rows(
      "SELECT pg_typeof(percentile_cont(ARRAY[0.5]) WITHIN GROUP (ORDER BY iv))::text AS t FROM tq2",
    ))[0]!.t).toBe("interval[]");
  });

  it("carries exactly two rank rows — window and hypothetical — split by prokind", async () => {
    // The hypothetical-set family (rank, dense_rank, percent_rank,
    // cume_dist) is one window row plus one aggkind='h' row declared
    // VARIADIC "any". "any" admits everything without coercion, so type
    // equality can never select here; the call SHAPE is the whole key.
    const r = await rows(`
      SELECT p.prokind, p.provariadic::regtype::text AS variadic, a.aggkind
      FROM pg_proc p LEFT JOIN pg_aggregate a ON a.aggfnoid = p.oid
      WHERE p.proname = 'rank' AND p.pronamespace = 'pg_catalog'::regnamespace
      ORDER BY p.prokind`);
    expect(r).toEqual([
      { prokind: "a", variadic: '"any"', aggkind: "h" },
      { prokind: "w", variadic: "-", aggkind: null },
    ]);
  });

  it("makes the two rank shapes mutually exclusive", async () => {
    // Bare rank() selects the WINDOW row and demands OVER; WITHIN GROUP
    // selects the aggregate row and refuses OVER. agg_within_group is a
    // deterministic dispatch, never a tiebreak among typed candidates.
    expect((await rows(
      "SELECT rank() OVER (ORDER BY val) AS r FROM tq2 LIMIT 1",
    ))[0]!.r).toBe(1);
    expect(await errorOf("SELECT rank() FROM tq2")).toContain(
      "requires an OVER clause",
    );
    expect(await errorOf(
      "SELECT rank(1) WITHIN GROUP (ORDER BY val) OVER () FROM tq2",
    )).toContain("OVER is not supported");
  });

  it("unifies a hypothetical call's direct arguments with the ORDER BY types", async () => {
    // The VARIADIC "any" parameter contributes no type of its own: 'a' is
    // coerced to the ORDER BY column's type, failing on integer content and
    // succeeding on text. Direct args never key the resolution.
    expect(await errorOf(
      "SELECT rank('a') WITHIN GROUP (ORDER BY val) FROM tq2",
    )).toContain("invalid input syntax for type integer");
    expect((await rows(
      "SELECT rank('a') WITHIN GROUP (ORDER BY txt) AS r FROM tq2",
    ))[0]!.r).toBe(1);
  });

  it("keeps the totality split the curated tables record: rank 1 over empty, percentile NULL", async () => {
    expect((await rows(
      "SELECT rank(1) WITHIN GROUP (ORDER BY val) AS r FROM tq2 WHERE false",
    ))[0]!.r).toBe(1);
    expect((await rows(
      "SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY val) AS r FROM tq2 WHERE false",
    ))[0]!.r).toBeNull();
  });

  it("accepts mixed untouched types through VARIADIC \"any\"", async () => {
    // No coercion to a common type — each argument keeps its own, so a
    // variadic-"any" candidate can never be eliminated by argument type.
    expect((await rows(
      "SELECT concat(val, txt, iv) AS r FROM tq2 LIMIT 1",
    ))[0]!.r).toBe("1x01:00:00");
  });

  it("parses the call shapes into distinct FuncCall fields", async () => {
    // The fields tier 1 would dispatch on, pinned against the parser:
    // agg_within_group marks the signature-relevant ORDER BY; a plain
    // aggregate ORDER BY populates agg_order WITHOUT the flag; FILTER and
    // DISTINCT sit beside args; explicit VARIADIC sets func_variadic.
    const fc = async (sql: string): Promise<Record<string, unknown>> => {
      const parsed = await parseSql(sql);
      const json = JSON.stringify(parsed.stmts![0]!.stmt);
      const m = /"FuncCall":/.exec(json);
      // The first FuncCall subtree, fields only.
      const sub = json.slice(m!.index + '"FuncCall":'.length);
      let depth = 0;
      for (let i = 0; i < sub.length; i++) {
        if (sub[i] === "{") depth++;
        else if (sub[i] === "}" && --depth === 0) {
          return JSON.parse(sub.slice(0, i + 1)) as Record<string, unknown>;
        }
      }
      throw new Error("unbalanced");
    };

    const wg = await fc("SELECT rank('a') WITHIN GROUP (ORDER BY val) FROM tq2");
    expect(wg.agg_within_group).toBe(true);
    expect(wg.agg_order).toHaveLength(1);

    const plain = await fc("SELECT string_agg(txt, ',' ORDER BY val) FROM tq2");
    expect(plain.agg_within_group).toBeUndefined();
    expect(plain.agg_order).toHaveLength(1);

    const win = await fc("SELECT rank() OVER (ORDER BY val) FROM tq2");
    expect(win.over).toBeDefined();
    expect(win.args).toBeUndefined();

    const filter = await fc("SELECT count(val) FILTER (WHERE val > 1) FROM tq2");
    expect(filter.agg_filter).toBeDefined();
    expect(filter.args).toHaveLength(1);

    const star = await fc("SELECT count(*) FROM tq2");
    expect(star.agg_star).toBe(true);
    expect(star.args).toBeUndefined();

    const variadic = await fc("SELECT concat(VARIADIC ARRAY['a','b'])");
    expect(variadic.func_variadic).toBe(true);
  });
});

describe("Q3: domain-following", () => {
  beforeAll(async () => {
    await pg.exec("SET search_path = public");
  });

  it("resolves a domain as its base across every base measured", async () => {
    // The one prior measurement (dint + dint → integer) generalised: text,
    // varchar (two hops — domain smash, then binary coercion to text),
    // numeric, nested domains (recursive smash), arrays including the
    // element-append overload, ranges, constrained domains (CHECK and NOT
    // NULL never join resolution), and cross-domain numeric towers.
    const t = async (expr: string): Promise<string> =>
      (await rows(`SELECT pg_typeof(${expr})::text AS t FROM td`))[0]!.t as string;
    expect(await t("a || a")).toBe("text");
    expect(await t("b || b")).toBe("text");
    expect(await t("c + c")).toBe("numeric");
    expect(await t("e + e")).toBe("integer");
    expect(await t("f || f")).toBe("integer[]");
    expect(await t("f || 5")).toBe("integer[]");
    expect(await t("g + g")).toBe("int4range");
    expect(await t("i + i")).toBe("integer");
    expect(await t("d + c")).toBe("numeric");
  });

  it("exact-matches a candidate declared ON the domain type BEFORE smashing", async () => {
    // The smash is the fallback, not the first step: with `+ (dint, dint)`
    // declared, the domain operator beats integer's builtin; with gd(dint)
    // beside gd(integer), the domain overload wins for a domain argument
    // and the base overload for a base argument. Canonicalise-then-lookup
    // alone would resolve all four to the base candidate — the wrong row
    // whenever a domain-typed candidate exists.
    expect((await rows("SELECT (d + d)::text AS r FROM td"))[0]!.r).toBe("DOMAIN OP");
    expect((await rows("SELECT gd(d) AS r FROM td"))[0]!.r).toBe("DOMAIN FN");
    expect((await rows("SELECT gd(42) AS r"))[0]!.r).toBe("BASE FN");
    // And the base type coerces INTO a domain parameter implicitly.
    expect((await rows("SELECT hd(42) AS r"))[0]!.r).toBe("ONLY DOMAIN FN");
  });

  it("admits domains through every polymorphic family except anyenum", async () => {
    // anyarray, anyrange, anyelement/anynonarray and the anycompatible
    // family all accept a domain over their required structure; anyenum
    // alone refuses, so a domain over an enum reaches NO builtin equality
    // operator without a cast. For the elimination rule the asymmetry is
    // safe in the only direction that matters: admitting generously can
    // only RETAIN a candidate PostgreSQL discarded, never eliminate one it
    // ran.
    expect((await rows("SELECT (f = f) AS r FROM td"))[0]!.r).toBe(true);
    expect((await rows("SELECT lower(g) AS r FROM td"))[0]!.r).toBe(1);
    expect((await rows("SELECT array_agg(h)::text AS r FROM td"))[0]!.r).toBe("{a}");
    expect((await rows("SELECT array_position(f, 1) AS r FROM td"))[0]!.r).toBe(1);
    expect(await errorOf("SELECT h = h FROM td")).toContain("operator does not exist");
    expect(await errorOf("SELECT enum_first(h) FROM td")).toContain("does not exist");
    // Control: the cast to the base restores every candidate.
    expect((await rows("SELECT (h::mood = h::mood) AS r FROM td"))[0]!.r).toBe(true);
  });
});
