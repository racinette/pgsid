import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability } from "../../../src/query/nullability-walk.js";
import { createKillableEvaluator, type KillableEvaluator } from "./killable-evaluator.js";
import type { NullabilityCatalog, SubtreeEvaluationCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The RED SUITE for a CAST OVER A COMPUTED ARGUMENT — as built, casts closed
// on LITERAL arguments only.
//
// The evaluator's cast gate was syntactic: `typeSetOf` refused any TypeCast
// whose argument was not an A_Const. The reason is real and measured — a
// computed argument's OUTPUT function crossing an I/O coercion leaks session
// state, `to_timestamp(0)::text` being the pinned example — but the rule
// closed far more than the leak. `('f'::text)::boolean` is two immutable I/O
// functions end to end and was refused for the shape of its argument.
//
// What replaces it is the gate the rest of the module already uses: the TYPES
// govern, not the syntax. A cast over a computed argument closes when the
// argument's own resolved type set lies entirely inside the BUILTIN
// immutable-I/O set — the same 48 pg_catalog types with immutable typinput
// AND typoutput that every other closure question here is decided against.
//
// The soundness argument is a sweep, and it runs below rather than sitting in
// prose. A cast between two members of that set is performed one of three
// ways, and each is immutable:
//
//   - binary coercible (castmethod 'b'): no function at all;
//   - I/O conversion (castmethod 'i', and the no-pg_cast-row fallback an
//     explicit cast takes): the source's typoutput plus the target's
//     typinput, both immutable BY THE SET'S OWN DEFINITION;
//   - a cast function (castmethod 'f'): swept below, and there are none that
//     are not immutable.
//
// The leak keeps its gate, because `date` and `timestamptz` are NOT in the
// set — their output functions are stable, which is precisely why. The guard
// section makes PostgreSQL demonstrate that rather than asserting it.
// ---------------------------------------------------------------------------

/** The engine's own immutable-I/O set, as `src/catalog/snapshot.ts` captures
 *  it. Repeated here so the sweep below is a sweep of the SAME set the gate
 *  consults — a sweep of a different set would prove nothing about it. */
const IMMUTABLE_IO_SET = `
  SELECT t.oid FROM pg_type t
  JOIN pg_proc pi ON pi.oid = t.typinput
  JOIN pg_proc po ON po.oid = t.typoutput
  WHERE pi.provolatile = 'i' AND po.provolatile = 'i'
    AND t.typnamespace = 'pg_catalog'::regnamespace
    AND t.typtype = 'b'
    AND NOT (t.typelem <> 0 AND t.typlen = -1)`;

const DDL = `
  CREATE TABLE rows_t (id integer PRIMARY KEY, v text);

  -- The named case: a dead disjunct behind a cast over a cast. PostgreSQL
  -- stores it verbatim, refuses the NULL behind it, and the engine could not
  -- read it because the evaluator would not close the cast.
  CREATE TABLE guarded (
    id integer PRIMARY KEY,
    c text,
    CONSTRAINT g_c CHECK (('f'::text)::boolean OR c IS NOT NULL)
  );

  -- The face difference, given something to differ about: a domain and an
  -- enum are FIRST-WAVE ADMISSIBLE renderings — their values cross the wire
  -- session-independently — but a cast off one of them routes through
  -- whatever function the user attached, of whatever volatility.
  CREATE DOMAIN pct AS integer CHECK (VALUE >= 0);
  CREATE TYPE color AS ENUM ('red', 'green');
`;

let pg: PGlite;
let catalog: NullabilityCatalog;
let evaluator: KillableEvaluator;

/** What the engine claims for the first output column of `sql`. */
async function claim(sql: string): Promise<boolean> {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const cols = await inferNullability(stmt, catalog, { evaluate: evaluator.evaluate });
  return cols[0]!.notNull;
}

/** PostgreSQL's own verdict: rows returned, and whether any has a NULL in
 *  the first column. */
async function witness(sql: string): Promise<{ rows: number; anyNull: boolean }> {
  const r = await pg.query<Record<string, unknown>>(sql);
  return { rows: r.rows.length, anyNull: r.rows.some(x => Object.values(x)[0] === null) };
}

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(DDL);
  await pg.exec(`INSERT INTO rows_t VALUES (1, 'a'), (2, NULL), (3, 'c')`);
  await pg.exec(`INSERT INTO guarded VALUES (1, 'x'), (2, 'y')`);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), { searchPath: ["public"] });
  evaluator = await createKillableEvaluator({ schema: DDL });
}, 120_000);

afterAll(async () => {
  await evaluator?.close();
  if (pg && !pg.closed) await pg.close();
});

describe("a cast over a computed argument — the soundness sweep", () => {
  it("the set is the 48, and `unknown` is not one of them", async () => {
    // The size pins the set against drift; `unknown` matters on its own,
    // because an unknown-typed argument is the one shape where the type says
    // nothing about which input function will run.
    const size = await pg.query<{ c: number }>(
      `SELECT count(*)::int AS c FROM (${IMMUTABLE_IO_SET}) s`,
    );
    expect(size.rows[0]!.c).toBe(48);
    const unknown = await pg.query<{ c: number }>(
      `SELECT count(*)::int AS c FROM (${IMMUTABLE_IO_SET}) s WHERE s.oid = 'unknown'::regtype`,
    );
    expect(unknown.rows[0]!.c).toBe(0);
  });

  it("no cast BETWEEN two set members runs a non-immutable function", async () => {
    // The whole widening rests on this row being empty. If PostgreSQL ever
    // adds a stable cast function between two immutable-I/O types, this fails
    // before any claim built on it can.
    const bad = await pg.query<{ src: string; tgt: string; fn: string; vol: string }>(`
      SELECT format_type(c.castsource, NULL) AS src,
             format_type(c.casttarget, NULL) AS tgt,
             p.proname AS fn, p.provolatile AS vol
        FROM pg_cast c JOIN pg_proc p ON p.oid = c.castfunc
       WHERE c.castsource IN (${IMMUTABLE_IO_SET})
         AND c.casttarget IN (${IMMUTABLE_IO_SET})
         AND c.castmethod = 'f'
         AND p.provolatile <> 'i'`);
    expect(bad.rows).toEqual([]);
  });

  it("the datetime types are OUT of the set, which is what keeps the leak gated", async () => {
    const inSet = async (t: string): Promise<boolean> =>
      (
        await pg.query<{ c: number }>(
          `SELECT count(*)::int AS c FROM (${IMMUTABLE_IO_SET}) s WHERE s.oid = '${t}'::regtype`,
        )
      ).rows[0]!.c > 0;
    expect(await inSet("date")).toBe(false);
    expect(await inSet("timestamptz")).toBe(false);
    expect(await inSet("timestamp")).toBe(false);
    // ...and the types the targets below travel through are IN it.
    expect(await inSet("text")).toBe(true);
    expect(await inSet("boolean")).toBe(true);
    expect(await inSet("jsonb")).toBe(true);
    expect(await inSet("integer")).toBe(true);
  });
});

describe("a cast over a computed argument — targets", () => {
  // FLIPPED from `it.fails` by widening `typeSetOf`'s TypeCast case.

  it("the CHECK case the register named — `('f'::text)::boolean`", async () => {
    // PostgreSQL refuses the NULL, adjudicated below rather than assumed.
    await expect(pg.exec(`INSERT INTO guarded VALUES (9, NULL)`)).rejects.toThrow(/g_c/);
    expect(await claim("SELECT c FROM guarded")).toBe(true);
  });

  it("the same expression as a dead disjunct of a WHERE clause", async () => {
    const sql = "SELECT v FROM rows_t WHERE ('f'::text)::boolean OR v IS NOT NULL";
    const w = await witness(sql);
    expect(w.rows).toBeGreaterThan(0);
    expect(w.anyNull).toBe(false);
    expect(await claim(sql)).toBe(true);
  });

  it("a CASE guard — the statement map's arm pruning", async () => {
    const sql = "SELECT CASE WHEN ('f'::text)::boolean THEN NULL ELSE 'x' END AS v FROM rows_t";
    const w = await witness(sql);
    expect(w.anyNull).toBe(false);
    expect(await claim(sql)).toBe(true);
  });

  it("a value the cast makes reachable — the statement map's isNull reading", async () => {
    // Not a truth this time: `->>` returns NULL for a missing key, so the
    // walk calls it nullable on shape alone. The whole tree is closed once
    // the cast is, and PostgreSQL says the key is there.
    const sql = `SELECT ('{"a":1}'::text)::jsonb ->> 'a' AS v FROM rows_t`;
    const w = await witness(sql);
    expect(w.anyNull).toBe(false);
    expect(await claim(sql)).toBe(true);
  });

  it("an ARRAY target, where the element cast carries the same argument", async () => {
    // `text[] → integer[]` is not a pg_cast row: PostgreSQL coerces
    // element-wise, so the sweep's guarantee applies one level down.
    const sql = "SELECT v FROM rows_t WHERE 3 = ANY (('{1,2}'::text)::int[]) OR v IS NOT NULL";
    const w = await witness(sql);
    expect(w.rows).toBeGreaterThan(0);
    expect(w.anyNull).toBe(false);
    expect(await claim(sql)).toBe(true);
  });

  it("the negative direction still reads as NULL", async () => {
    // The widening must not turn a closed NULL into a claim: a missing jsonb
    // key evaluates NULL, and the reading has to keep saying so.
    const sql = `SELECT ('{"a":1}'::text)::jsonb ->> 'zz' AS v FROM rows_t`;
    expect((await witness(sql)).anyNull).toBe(true);
    expect(await claim(sql)).toBe(false);
  });
});

describe("a cast over a computed argument — the leak that keeps its gate", () => {
  it("a DATE source moves with DateStyle, and PostgreSQL shows it moving", async () => {
    const read = async (style: string): Promise<string> => {
      await pg.exec(`SET DateStyle = '${style}'`);
      const r = await pg.query<{ t: string }>(`SELECT ('2020-01-02'::date)::text AS t`);
      return r.rows[0]!.t;
    };
    expect(await read("ISO, MDY")).toBe("2020-01-02");
    expect(await read("German, DMY")).toBe("02.01.2020");
    await pg.exec(`SET DateStyle = 'ISO, MDY'`);
  });

  it("so a predicate resting on that rendering claims nothing, and must not", async () => {
    // Under ISO the disjunct is FALSE and the claim would hold. Under German
    // it is TRUE, the WHERE admits every row, and a NULL comes back — so an
    // analysis-time answer here does not bind enforcement. The engine refuses,
    // and this is the row that says refusing was necessary rather than shy.
    const sql =
      "SELECT v FROM rows_t WHERE (('2020-01-02'::date)::text) <> '2020-01-02' OR v IS NOT NULL";
    expect(await claim(sql)).toBe(false);

    await pg.exec(`SET DateStyle = 'ISO, MDY'`);
    expect((await witness(sql)).anyNull).toBe(false);
    await pg.exec(`SET DateStyle = 'German, DMY'`);
    expect((await witness(sql)).anyNull).toBe(true);
    await pg.exec(`SET DateStyle = 'ISO, MDY'`);
  });

  it("and the pinned example is refused at its own level", async () => {
    // `to_timestamp(0)::text` — the measured leak the literal-only rule was
    // written for. Its source is timestamptz, which is out of the set.
    const sql = "SELECT v FROM rows_t WHERE to_timestamp(0)::text = 'zzz' OR v IS NOT NULL";
    expect(await claim(sql)).toBe(false);
  });
});

describe("a cast over a computed argument — the face the gate consults", () => {
  it("admissible USER renderings cross the wire but may not be a cast source", async () => {
    // `isImmutableIoRendering` is the ROOT gate: may this value reach the
    // driver? A domain over integer and an enum both may — their output
    // routes are the base's and the snapshot-pinned labels. The CAST gate is
    // a different question, and the sweep that answers it swept pg_catalog
    // only: a cast off a user type runs whatever function the user attached.
    // So the two faces must differ, and here is the difference.
    const face = catalog as NullabilityCatalog & SubtreeEvaluationCatalog;
    for (const t of ["pct", "color"]) {
      expect(face.isImmutableIoRendering(t), t).toBe(true);
      expect(face.isBuiltinImmutableIoRendering(t), t).toBe(false);
    }
    for (const t of ["text", "boolean", "integer", "jsonb", "text[]"]) {
      expect(face.isBuiltinImmutableIoRendering(t), t).toBe(true);
    }
    for (const t of ["date", "timestamp with time zone", "record"]) {
      expect(face.isBuiltinImmutableIoRendering(t), t).toBe(false);
    }
  });
});

describe("a cast over a computed argument — the probe budget", () => {
  it("no probe had to be killed", () => {
    expect(evaluator.killedSql).toEqual([]);
  });
});
