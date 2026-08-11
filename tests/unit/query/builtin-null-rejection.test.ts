import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import {
  BUILTIN_NULL_REJECTING_ARGS,
  BUILTIN_NULL_REJECTING_ARRAY_ELEMENTS,
} from "../../../src/query/param-nullability.js";
import { NULL_REJECTION } from "./fixture-args.js";

// ---------------------------------------------------------------------------
// Mechanism D's table, DERIVED by execution rather than checked.
//
// Sweep-4 finding 8. Some builtin argument positions reject NULL in the
// function's C implementation, and pg_catalog records nothing about it:
// `array_fill(1, NULL)` raises "dimension array or low bound array cannot be
// null" where a strict function would simply return NULL. Strictness cannot
// express the class — a strict function does not run at all — so the whole of
// it lives inside the NON-strict set.
//
// That is the same shape as TOTALITY, and this project's totality tables
// drifted three times (`docs/generated-surface.md` items 2 and 3). The
// difference, and the reason this table is allowed to exist: the property is
// cheaply DECIDABLE BY EXECUTION. Call the function with NULL in one position,
// call it again with a value, and the pair answers exactly.
//
// So this suite does not ask "is every table entry real". It re-derives the
// class from pg_catalog — every non-strict function, every argument position,
// each with its own control — and asserts the derived set EQUALS the table. A
// PostgreSQL upgrade that adds, removes or moves a rejection fails with the
// diff. Both directions, in one assertion.
//
// **A raise is evidence about NULL only when the control succeeds.** The
// probe's own literals are wrong often enough to matter: `NULL::anyelement` is
// not a cast PostgreSQL accepts, `'a'` is not a valid range-flags string, and
// `json_build_object` rejects an odd argument count whatever is in it. Every
// one of those first read as a rejection and every one is the probe failing to
// write a legal call. The control removes them, and two of the ten real
// entries were recovered by fixing a control literal rather than by finding
// something new — which is why the excluded and uncontrolled counts are
// REPORTED rather than silently dropped.
// ---------------------------------------------------------------------------

/** Families that are not called: catalog mutators, handlers, GUC writes. */
const EXCLUDED =
  /^(binary_upgrade_|pg_|plpgsql_call_handler|tsvector_update_trigger|satisfies_hash_partition|set_config|current_query|inet_(client|server)_)/;

/** A literal for each declared argument type the probe can produce. */
const LITERALS: Record<string, string> = {
  text: `'a'`, integer: `1`, bigint: `1`, smallint: `1`, numeric: `1`,
  "double precision": `1`, real: `1`, boolean: `true`, oid: `1`,
  date: `'2020-01-01'::date`, "timestamp without time zone": `'2020-01-01'::timestamp`,
  "timestamp with time zone": `'2020-01-01'::timestamptz`,
  "time without time zone": `'01:00'::time`, "time with time zone": `'01:00'::timetz`,
  interval: `'1 day'::interval`, json: `'{}'::json`, jsonb: `'{}'::jsonb`,
  xml: `'<a/>'::xml`, "integer[]": `ARRAY[1]`, "text[]": `ARRAY['a']`,
  "oid[]": `ARRAY[1]::oid[]`, "char": `'a'::"char"`, pg_lsn: `'0/0'::pg_lsn`,
  anyelement: `1`, anyarray: `ARRAY[1]`, anycompatible: `1`,
  anycompatiblearray: `ARRAY[1]`, anynonarray: `1`, '"any"': `1`,
};

/**
 * The NULL-ELEMENT spelling for each array-typed declared position — the
 * SECOND class. `array_fill(1, ARRAY[NULL])` is a different check from
 * `array_fill(1, NULL)`, with a different message, and neither implies the
 * other: `jsonb_set_lax` accepts a NULL path array and rejects a NULL path
 * ELEMENT.
 */
const NULL_ELEMENT: Record<string, string> = {
  "integer[]": `ARRAY[NULL::integer]`, "text[]": `ARRAY[NULL::text]`,
  "oid[]": `ARRAY[NULL::oid]`, anyarray: `ARRAY[NULL::integer]`,
  anycompatiblearray: `ARRAY[NULL::integer]`,
};

/**
 * A NULL cannot be spelled at a PSEUDO-type — `NULL::anycompatiblearray` is
 * not a cast — so each gets the concrete stand-in its literal resolves to,
 * which is what a real call at that position would carry.
 */
const CONCRETE: Record<string, string> = {
  '"any"': "text", anyelement: "integer", anynonarray: "integer",
  anyarray: "integer[]", anycompatible: "integer", anycompatiblearray: "integer[]",
};

/**
 * Positions whose legal values are a CLOSED vocabulary, where the generic
 * `'a'` makes the CONTROL fail for a reason that has nothing to do with NULL
 * — which would drop a genuine rejection as a probe artefact. Both were found
 * exactly that way.
 */
const OVERRIDE: Record<string, Record<number, string>> = {
  daterange: { 3: `'[]'` }, int4range: { 3: `'[]'` }, int8range: { 3: `'[]'` },
  numrange: { 3: `'[]'` }, tsrange: { 3: `'[]'` }, tstzrange: { 3: `'[]'` },
  jsonb_set_lax: { 5: `'use_json_null'` },
};

interface Signature {
  proname: string;
  argtypes: string[];
}

let pg: PGlite;
/** name → arity → rejecting 1-based positions, derived by execution. */
const derived = new Map<string, Map<number, number[]>>();
/** The same for a NULL ELEMENT at an array-typed position. */
const derivedElements = new Map<string, Map<number, number[]>>();
let probed = 0;
let controlled = 0;
let uncontrolled = 0;
let untypable = 0;
let elementPositions = 0;
let elementUncontrolled = 0;
/** Every distinct rejection message the derivation observed. */
const messages = new Set<string>();

beforeAll(async () => {
  pg = await PGlite.create();

  const rows = (
    await pg.query<{ proname: string; argtypes: string }>(`
      SELECT p.proname,
             coalesce(array_to_string(ARRAY(
               SELECT format_type(t, NULL) FROM unnest(p.proargtypes) AS t), '|'), '') AS argtypes
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'pg_catalog' AND p.prokind = 'f' AND NOT p.proisstrict
        AND p.pronargs > 0
      ORDER BY p.proname`)
  ).rows;

  const signatures: Signature[] = [];
  for (const r of rows) {
    if (EXCLUDED.test(r.proname)) continue;
    const argtypes = r.argtypes.split("|");
    if (!argtypes.every(t => t in LITERALS)) {
      untypable++;
      continue;
    }
    signatures.push({ proname: r.proname, argtypes });
  }
  probed = signatures.length;

  const run = async (sql: string): Promise<string | null> => {
    await pg.exec("BEGIN");
    try {
      await pg.query(sql);
      return null;
    } catch (e) {
      return (e as Error).message;
    } finally {
      await pg.exec("ROLLBACK");
    }
  };

  for (const s of signatures) {
    for (let i = 0; i < s.argtypes.length; i++) {
      const lit = (t: string, j: number): string =>
        OVERRIDE[s.proname]?.[j + 1] ?? LITERALS[t]!;
      const at = (t: string): string => CONCRETE[t] ?? t;
      const args = (nullAt: number): string[] =>
        s.argtypes.map((t, j) => (j === nullAt ? `NULL::${at(t)}` : lit(t, j)));

      const err = await run(`SELECT ${s.proname}(${args(i).join(", ")})`);
      if (err === null) {
        controlled++;
        continue;
      }
      const control = await run(`SELECT ${s.proname}(${args(-1).join(", ")})`);
      if (control !== null) {
        uncontrolled++;
        continue;
      }
      controlled++;
      messages.add(err);
      record(derived, s.proname, s.argtypes.length, i + 1);
    }

    // The element class, over the array-typed positions only.
    for (let i = 0; i < s.argtypes.length; i++) {
      const spelling = NULL_ELEMENT[s.argtypes[i]!];
      if (!spelling) continue;
      elementPositions++;
      const lit = (t: string, j: number): string =>
        OVERRIDE[s.proname]?.[j + 1] ?? LITERALS[t]!;
      const args = (nullAt: number): string[] =>
        s.argtypes.map((t, j) => (j === nullAt ? spelling : lit(t, j)));
      const err = await run(`SELECT ${s.proname}(${args(i).join(", ")})`);
      if (err === null) continue;
      const control = await run(`SELECT ${s.proname}(${args(-1).join(", ")})`);
      if (control !== null) {
        elementUncontrolled++;
        continue;
      }
      messages.add(err);
      record(derivedElements, s.proname, s.argtypes.length, i + 1);
    }
  }
}, 300_000);

function record(
  into: Map<string, Map<number, number[]>>,
  name: string,
  arity: number,
  position: number,
): void {
  let byArity = into.get(name);
  if (!byArity) {
    byArity = new Map();
    into.set(name, byArity);
  }
  byArity.set(arity, [...(byArity.get(arity) ?? []), position]);
}

afterAll(async () => {
  if (pg && !pg.closed) await pg.close();
});

/** Both sides rendered the same way, so a failure prints a readable diff. */
function render(t: ReadonlyMap<string, ReadonlyMap<number, readonly number[]>>): string[] {
  const out: string[] = [];
  for (const [name, byArity] of [...t].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    for (const [arity, positions] of [...byArity].sort((a, b) => a[0] - b[0])) {
      out.push(`${name}/${arity}: ${[...positions].sort((a, b) => a - b).join(",")}`);
    }
  }
  return out;
}

describe("builtin NULL-rejecting argument positions", () => {
  it("the table equals the class derived from pg_catalog by execution", () => {
    expect(
      render(derived),
      "BUILTIN_NULL_REJECTING_ARGS and PostgreSQL disagree. This table is a " +
        "CACHE of this measurement, not a curated list: if PostgreSQL added, " +
        "removed or moved a rejection, update the table to match and add a " +
        "fixture for anything new. If a line appeared that is a probe " +
        "artefact, its CONTROL succeeded — check the literal for that " +
        "position in OVERRIDE before believing it.",
    ).toEqual(render(BUILTIN_NULL_REJECTING_ARGS));
  });

  it("the ELEMENT table equals the class derived the same way", () => {
    expect(
      render(derivedElements),
      "BUILTIN_NULL_REJECTING_ARRAY_ELEMENTS and PostgreSQL disagree. Same " +
        "rule as its sibling: this is a cache of the measurement below it.",
    ).toEqual(render(BUILTIN_NULL_REJECTING_ARRAY_ELEMENTS));
  });

  it("every derived rejection message is one the soundness oracle recognises", () => {
    // The tie that keeps the shared NULL_REJECTION list (fixture-args.ts) from
    // going stale. A claim mechanism D makes is only WITNESSED if the binding
    // oracles recognise the raise as a null-rejection; an unmatched message would
    // silently turn a notNull claim into an unwitnessed one, which is a
    // different failure and a confusing one. So the messages travel with the
    // table they came from.
    expect([...messages].filter(m => !NULL_REJECTION.test(m)).sort()).toEqual([]);
  });

  it("the probe reached enough of pg_catalog to mean something", () => {
    // Silent non-coverage is the failure mode: a probe that typed nothing
    // would agree with an EMPTY table. These are the bounds, asserted rather
    // than printed, so shrinking coverage fails instead of passing quietly.
    expect(probed).toBeGreaterThanOrEqual(60);
    expect(controlled).toBeGreaterThanOrEqual(120);
    expect(derived.size).toBeGreaterThan(0);
    expect(elementPositions).toBeGreaterThanOrEqual(12);
    expect(derivedElements.size).toBeGreaterThan(0);
  });

  it("prints the coverage bounds", () => {
    console.log(
      `\nbuiltin NULL-rejection derivation:\n` +
        `  non-strict pg_catalog signatures probed: ${probed}` +
        ` (+${untypable} whose argument types the probe cannot spell)\n` +
        `  calls with a passing control:            ${controlled}` +
        ` (+${uncontrolled} whose control also failed — the probe's fault, not NULL's)\n` +
        `  rejecting signatures:                    ${render(derived).length}` +
        `, in ${[...derived.values()].flatMap(m => [...m.values()]).flat().length} argument positions\n` +
        render(derived).map(l => `    ${l}`).join("\n") +
        `\n  array-typed positions probed for a NULL ELEMENT: ${elementPositions}` +
        ` (+${elementUncontrolled} uncontrolled)\n` +
        render(derivedElements).map(l => `    ${l}`).join("\n"),
    );
  });
});
