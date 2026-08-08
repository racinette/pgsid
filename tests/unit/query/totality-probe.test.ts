import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import {
  ALWAYS_NOT_NULL_BUILTINS,
  FIRST_ARG_BUILTINS,
  STRICT_TOTAL_BUILTINS,
} from "../../../src/query/nullability-walk.js";
import {
  TOTAL_OPERATORS,
  STRICT_OPERATORS,
  PARTIAL_OVERLOADS,
  NON_STRICT_OVERLOADS,
  NON_TOTAL_OPERATOR_SIGNATURES,
} from "../../../src/query/operators.js";

// ---------------------------------------------------------------------------
// The totality tables, probed by EXECUTION.
//
// `docs/generated-surface.md` item 3, and the half item 2 could not reach.
// Four tables encode TOTALITY — never NULL for non-null arguments — and
// PostgreSQL does not record it. `proisstrict` is STRICTNESS, a different
// property that 2548 of PG18's 2726 builtin names carry, so it is no proxy;
// totality lives only in the C implementations. A source scanner for it was
// built and discarded (`docs/type-aware-overloads.md` records why in full, so
// that nobody rebuilds it). Execution is what is left, and it refutes exactly
// rather than heuristically.
//
// Three sweeps did this by hand and each found members failing their own
// criterion — `substring`, `array_position`, `extract`/`date_part`,
// `to_number`, `to_char`, `scale`/`min_scale`, then `lower`/`upper` over an
// empty range. This automates it once.
//
// The probe asks each table's OWN claim, because they are three different
// claims and a single assertion would be wrong for two of them:
//
//   ALWAYS_NOT_NULL_BUILTINS — never NULL, WHATEVER the arguments. NULL
//     arguments included: `concat(NULL)` is '', which is the whole point.
//   FIRST_ARG_BUILTINS      — non-null exactly when the FIRST argument is.
//     Probed with a non-null first argument and NULL for the rest.
//   STRICT_TOTAL_BUILTINS   — non-null for non-null arguments.
//   TOTAL_OPERATORS         — never NULL for non-null operands. Probed here.
//   STRICT_OPERATORS        — NULL for any NULL operand. That is a catalog
//     fact (`oprcode` → `proisstrict`) and is asserted from the catalog,
//     because the exact oracle should be preferred where one exists. These
//     were ONE set until this suite ran and found a member failing each half
//     in opposite directions; `src/query/operators.ts` records the split.
//
// **A raise is not a finding.** "Raising on bad input still counts — an error
// is not a NULL" is the tables' own admission criterion. So an erroring
// combination is skipped. That makes silent non-coverage the failure mode to
// guard against, and two assertions do: every parameter type must have a
// value generator, and every signature must have at least one combination
// that actually evaluated. A signature whose every combination raised was not
// probed, and says so.
//
// **The harness carries its own positive control.** A probe that finds
// nothing is worthless unless it can be shown to find something, so the ten
// expressions three sweeps removed from these tables are asserted to STILL
// come back NULL. If a PostgreSQL upgrade makes `to_number('', '')` return a
// value, that assertion fails and this suite's silence stops meaning anything.
// ---------------------------------------------------------------------------

/**
 * Non-NULL literals per rendered type name, chosen for the input CLASSES that
 * have historically broken a totality claim rather than for coverage of the
 * type: NaN and the infinities, the empty string, the empty array, the empty
 * range, the empty format, the JSON null, and a boring value to sit beside
 * them. A type absent from here makes its signatures unprobed, and the suite
 * says so rather than passing quietly.
 */
const VALUES: Record<string, string[]> = {
  // --- text family: the empty string is the historical killer (to_char,
  //     to_number) and the no-match case belongs to the patterns below.
  // The baseline (first) value is the BORING one, because a capped signature
  // varies one argument at a time from the baselines and needs the rest to be
  // valid for anything to evaluate. The adversarial members follow it. The
  // format/unit words are here because `date_trunc`, `encode`/`decode` and
  // `normalize` take their mode as text and raise on anything else — without
  // them those signatures raise on every combination and go unprobed.
  text: ["'abc'", "''", "'  '", "'NaN'", "'day'", "'base64'", "'hex'", "'escape'", "'NFC'", "'9'", "'UTC'"],
  "character varying": ["''::varchar", "'abc'::varchar"],
  character: ["''::char", "'a'::char"],
  '"char"': ["'a'::\"char\""],
  name: ["''::name", "'abc'::name"],

  // --- numbers: NaN and the infinities (scale/min_scale, and every float).
  smallint: ["1::smallint", "0::smallint", "(-1)::smallint", "32767::smallint"],
  // 1 leads: a zero or negative baseline makes `make_date`, `chr` and
  // `width_bucket`'s bucket count raise on every combination. 65 is a legal
  // code point for `chr`.
  integer: ["1", "0", "(-1)", "65", "2147483647"],
  bigint: ["1::bigint", "0::bigint", "(-1)::bigint", "9223372036854775807::bigint"],
  numeric: ["0::numeric", "(-1.5)::numeric", "'NaN'::numeric", "'Infinity'::numeric"],
  "double precision": ["1::float8", "0::float8", "(-1.5)::float8", "'NaN'::float8", "'Infinity'::float8", "'-Infinity'::float8"],
  real: ["0::float4", "'NaN'::float4", "'Infinity'::float4"],
  money: ["0::money", "(-1)::money"],

  // --- date/time: the infinities are what removed extract/date_part.
  date: ["'2020-01-01'::date", "'infinity'::date", "'-infinity'::date"],
  "timestamp without time zone": ["'2020-01-01'::timestamp", "'infinity'::timestamp", "'-infinity'::timestamp"],
  "timestamp with time zone": ["'2020-01-01Z'::timestamptz", "'infinity'::timestamptz", "'-infinity'::timestamptz"],
  "time without time zone": ["'00:00'::time", "'23:59:59'::time"],
  "time with time zone": ["'00:00+00'::timetz"],
  interval: ["'0'::interval", "'1 day'::interval"],

  // --- containers: the EMPTY array is the array_position/cardinality class.
  bytea: ["''::bytea", "'\\x00'::bytea", "'abc'::bytea"],
  "integer[]": ["'{}'::int[]", "ARRAY[1,2]"],
  "text[]": ["'{}'::text[]", "ARRAY['a','b']"],
  json: ["'null'::json", "'{}'::json", "'[]'::json", "'{\"a\":1}'::json"],
  jsonb: ["'null'::jsonb", "'{}'::jsonb", "'[]'::jsonb", "'{\"a\":1}'::jsonb"],
  record: ["ROW(1,2)"],

  // --- ranges: the EMPTY range removed lower/upper.
  anyrange: ["'empty'::int4range", "'[1,2)'::int4range"],
  anymultirange: ["'{}'::int4multirange", "'{[1,2)}'::int4multirange"],

  // --- bits, network, identifiers and the geometry the operators reach.
  boolean: ["true", "false"],
  bit: ["B'0'", "B'1'"],
  "bit varying": ["B'0'::varbit", "B'101'::varbit"],
  inet: ["'127.0.0.1'::inet", "'::1'::inet"],
  cidr: ["'127.0.0.0/8'::cidr"],
  macaddr: ["'08:00:2b:01:02:03'::macaddr"],
  macaddr8: ["'08:00:2b:01:02:03:04:05'::macaddr8"],
  uuid: ["'00000000-0000-0000-0000-000000000000'::uuid"],
  oid: ["0::oid", "1::oid"],
  xid: ["'0'::xid"],
  xid8: ["'0'::xid8"],
  cid: ["'0'::cid"],
  tid: ["'(0,1)'::tid"],
  "pg_lsn": ["'0/0'::pg_lsn", "'FFFFFFFF/FFFFFFFF'::pg_lsn"],
  oidvector: ["'1 2'::oidvector"],
  tsvector: ["''::tsvector", "'a b'::tsvector"],
  tsquery: ["'a'::tsquery", "'a & b'::tsquery"],
  point: ["'(0,0)'::point", "'(1,1)'::point"],
  line: ["'{1,1,0}'::line"],
  lseg: ["'[(0,0),(1,1)]'::lseg"],
  box: ["'((0,0),(1,1))'::box"],
  // Both spellings: `path + path` is NULL whenever EITHER operand is a CLOSED
  // path, and open + open is a value — so one spelling alone either misses
  // the defect or misses the control.
  path: ["'[(0,0),(1,1)]'::path", "'((0,0),(1,1))'::path"],
  circle: ["'<(0,0),1>'::circle"],
  polygon: ["'((0,0),(1,1),(1,0))'::polygon"],
  aclitem: ["makeaclitem('postgres'::regrole, 'postgres'::regrole, 'SELECT', true)"],
  "aclitem[]": ["ARRAY[makeaclitem('postgres'::regrole, 'postgres'::regrole, 'SELECT', true)]"],
};

/**
 * Polymorphic parameters have no type of their own, so every one of them in a
 * signature is instantiated together from one FAMILY. Instantiating them
 * independently would spend most combinations on calls PostgreSQL rejects for
 * type mismatch — `array_append(ARRAY[1,2], 'x')` — which the probe would
 * record as an error and skip, quietly losing the coverage it was after.
 */
const POLYMORPHIC_FAMILIES: Record<string, string>[] = [
  {
    anyelement: "1", anynonarray: "1", anycompatible: "1", anycompatiblenonarray: "1",
    anyarray: "ARRAY[1,2]", anycompatiblearray: "ARRAY[1,2]",
    '"any"': "1", anyenum: "'a'::probe_enum", anyrange: "'[1,2)'::int4range",
    anymultirange: "'{[1,2)}'::int4multirange", anycompatiblerange: "'[1,2)'::int4range",
  },
  {
    anyelement: "'x'", anynonarray: "'x'", anycompatible: "'x'", anycompatiblenonarray: "'x'",
    anyarray: "'{}'::text[]", anycompatiblearray: "'{}'::text[]",
    '"any"': "'x'", anyenum: "'b'::probe_enum", anyrange: "'empty'::int4range",
    anymultirange: "'{}'::int4multirange", anycompatiblerange: "'empty'::int4range",
  },
];

const POLYMORPHIC = new Set(Object.keys(POLYMORPHIC_FAMILIES[0]!));

/**
 * Beyond this many combinations a signature is sampled rather than crossed,
 * and the run reports how many. Set at 512 because `date_trunc(text,
 * timestamptz, text)` is 363: its unit and its timezone must be valid
 * TOGETHER, and a one-at-a-time sweep from a baseline can only ever make one
 * of them valid at a time, so the signature raised on every combination and
 * went unprobed. Probes are cheap enough that the cap is about the report
 * staying honest rather than about time — 20k of them run in ~130ms.
 */
const MAX_COMBOS = 512;

interface Signature {
  /** Which table's claim applies. */
  table: "alwaysNotNull" | "firstArg" | "strictTotal" | "operator";
  name: string;
  /** Rendered parameter types, in order. Operand types for an operator. */
  types: string[];
  /** Prefix operator: the single operand is on the right. */
  prefix?: boolean;
}

/**
 * Calls are written `pg_catalog.name(...)`, which is not decoration: several
 * of these names are GRAMMAR, and the bare spelling is a syntax error.
 * `position('a','b')`, `overlay(a,b,1)`, `current_user()` and
 * `session_user()` all raise unqualified — the parser wants `position(a IN b)`
 * and treats the last two as keywords — so six signatures raised on every
 * combination and went unprobed until the qualifier went on. It is also the
 * more faithful spelling: these tables are about pg_catalog functions, and
 * `docs/nullability-walk.md` has them consulted for exactly that.
 */
const qualify = (name: string): string =>
  `pg_catalog.${/^[a-z_][a-z0-9_]*$/.test(name) ? name : JSON.stringify(name)}`;

/** The cross product, capped — beyond the cap, vary one argument at a time. */
function combinations(valueLists: string[][]): { combos: string[][]; capped: boolean } {
  const total = valueLists.reduce((n, l) => n * l.length, 1);
  if (total <= MAX_COMBOS) {
    let combos: string[][] = [[]];
    for (const list of valueLists) combos = combos.flatMap(c => list.map(v => [...c, v]));
    return { combos, capped: false };
  }
  // One-at-a-time from a baseline, plus the diagonals — every argument taking
  // its i-th value together, which is what reaches the corners a
  // one-at-a-time sweep cannot (`to_number('', '')` needs both).
  const baseline = valueLists.map(l => l[0]!);
  const combos: string[][] = [baseline];
  valueLists.forEach((list, i) => {
    for (const v of list.slice(1)) {
      const c = [...baseline];
      c[i] = v;
      combos.push(c);
    }
  });
  const widest = Math.max(...valueLists.map(l => l.length));
  for (let i = 1; i < widest; i++) combos.push(valueLists.map(l => l[Math.min(i, l.length - 1)]!));
  return { combos, capped: true };
}

/**
 * Signatures that can NEVER produce a value, with the reason. The "every
 * signature was evaluated" assertion exists to catch a probe that silently
 * covers nothing, so an exemption from it has to be explicit and has to stay
 * true — both directions are asserted, exactly like the census's `absent`
 * markers. An entry here is a claim about PostgreSQL, not a way to quiet a
 * failure.
 */
const UNEVALUABLE: Record<string, string> = {
  // PostgreSQL still DECLARES both operators and removed both implementations,
  // so each raises for every input. They are the clearest example of why a
  // raise cannot be treated as a pass: these two signatures can never be
  // probed, and saying so is the only honest coverage claim available.
  "+(aclitem[], aclitem)":
    "backed by aclinsert, whose implementation PostgreSQL removed — it raises " +
    "'aclinsert is no longer supported' for every input (measured)",
  "-(aclitem[], aclitem)":
    "backed by aclremove, whose implementation PostgreSQL removed — it raises " +
    "'aclremove is no longer supported' for every input (measured)",
};

/** The ten expressions three sweeps removed. The harness must still convict. */
const POSITIVE_CONTROL = [
  "substring('abc' FROM 'zzz')",
  "array_position(ARRAY[1,2], 9)",
  "date_part('month', 'infinity'::timestamp)",
  "extract(month FROM 'infinity'::timestamp)",
  "to_number('', '')",
  "to_char('2020-01-01'::timestamp, '')",
  "scale('NaN'::numeric)",
  "min_scale('NaN'::numeric)",
  "lower('empty'::int4range)",
  "upper('empty'::int4range)",
];

describe("totality tables, probed by execution", () => {
  let pg: PGlite;
  let signatures: Signature[];
  /** Findings: a claimed-total call that returned NULL. */
  const nullResults: string[] = [];
  /** Signatures whose every combination raised — probed in name only. */
  const allRaised: string[] = [];
  /** Parameter types with no value generator. */
  const noGenerator = new Map<string, Set<string>>();
  const controlSurvivors: string[] = [];
  /** Exempt signatures that did raise everywhere, as claimed. */
  const exemptAndRaising = new Set<string>();
  /** Exempt signatures that produced a value after all — a stale exemption. */
  const exemptButEvaluated: string[] = [];
  let nonStrictOperators: string[] = [];
  let stats = { signatures: 0, probes: 0, evaluated: 0, raised: 0, capped: 0, skipped: 0 };

  beforeAll(async () => {
    pg = await PGlite.create();
    await pg.exec(`CREATE TYPE probe_enum AS ENUM ('a','b');`);
    await pg.exec(`
      CREATE FUNCTION probe(expr text) RETURNS text LANGUAGE plpgsql AS $$
      DECLARE r boolean;
      BEGIN
        EXECUTE 'SELECT (' || expr || ') IS NULL' INTO r;
        RETURN CASE WHEN r THEN 'NULL' ELSE 'value' END;
      EXCEPTION WHEN OTHERS THEN RETURN 'error';
      END $$;`);

    const tableOf = (n: string): Signature["table"] =>
      ALWAYS_NOT_NULL_BUILTINS.has(n) ? "alwaysNotNull" : FIRST_ARG_BUILTINS.has(n) ? "firstArg" : "strictTotal";
    const fnNames = [...new Set([...ALWAYS_NOT_NULL_BUILTINS, ...FIRST_ARG_BUILTINS, ...STRICT_TOTAL_BUILTINS])];

    const fnRows = (
      await pg.query<{ name: string; types: string[]; variadic: boolean }>(
        `SELECT p.proname AS name,
                COALESCE((SELECT array_agg(format_type(t, null) ORDER BY o)
                            FROM unnest(p.proargtypes) WITH ORDINALITY AS z(t, o)), '{}') AS types,
                p.provariadic <> 0 AS variadic
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'pg_catalog' AND p.prokind = 'f' AND p.proname = ANY($1);`,
        [fnNames],
      )
    ).rows.map(r =>
      // A VARIADIC declaration carries ONE parameter of the element type, and
      // several of these reject an odd argument count outright
      // (`json_build_object` wants key/value pairs). Probing the declared
      // arity alone left them raising on every combination, so the variadic
      // tail is supplied twice.
      r.variadic ? { ...r, types: [...r.types, r.types[r.types.length - 1]!] } : r,
    );

    const opRows = (
      await pg.query<{ name: string; left: string | null; right: string | null }>(
        `SELECT o.oprname AS name,
                CASE WHEN o.oprleft = 0 THEN NULL ELSE format_type(o.oprleft, null) END  AS left,
                CASE WHEN o.oprright = 0 THEN NULL ELSE format_type(o.oprright, null) END AS right
           FROM pg_operator o
           JOIN pg_namespace ns ON ns.oid = o.oprnamespace
          WHERE ns.nspname = 'pg_catalog' AND o.oprname = ANY($1);`,
        [[...TOTAL_OPERATORS]],
      )
    ).rows;

    // Strictness is a catalog fact; take it from the catalog rather than
    // re-deriving it by execution. The table claims BOTH properties.
    nonStrictOperators = (
      await pg.query<{ sig: string }>(
        `SELECT o.oprname || ' (' || COALESCE(format_type(o.oprleft, null), '') || ',' ||
                COALESCE(format_type(o.oprright, null), '') || ')' AS sig
           FROM pg_operator o
           JOIN pg_namespace ns ON ns.oid = o.oprnamespace
           JOIN pg_proc p ON p.oid = o.oprcode
          WHERE ns.nspname = 'pg_catalog' AND o.oprname = ANY($1) AND NOT p.proisstrict
          ORDER BY 1;`,
        [[...STRICT_OPERATORS]],
      )
    ).rows.map(r => r.sig);

    signatures = [
      ...fnRows.map(r => ({ table: tableOf(r.name), name: r.name, types: r.types })),
      ...opRows.map(r => ({
        table: "operator" as const,
        name: r.name,
        types: [r.left, r.right].filter((t): t is string => t !== null),
        prefix: r.left === null,
      })),
    ];
    stats.signatures = signatures.length;

    // Build every expression, then evaluate them all in one statement.
    const exprs: string[] = [];
    /** expression → the signature it came from, for attributing results. */
    const owner = new Map<string, Signature>();
    const perSignature = new Map<Signature, string[]>();

    for (const sig of signatures) {
      const families = sig.types.some(t => POLYMORPHIC.has(t)) ? POLYMORPHIC_FAMILIES : [{}];
      const mine: string[] = [];
      let generatorMissing = false;

      // "Never NULL whatever the arguments" includes NULL arguments, and that
      // is one expression per signature rather than one per combination.
      if (sig.table === "alwaysNotNull" && sig.types.length > 0) {
        mine.push(`${qualify(sig.name)}(${sig.types.map(t => `NULL::${t}`).join(", ")})`);
      }

      for (const family of families) {
        const lists = sig.types.map(t => (t in family ? [family[t]!] : VALUES[t]));
        if (lists.some(l => l === undefined)) {
          generatorMissing = true;
          for (const t of sig.types) {
            if (!(t in family) && !VALUES[t]) {
              if (!noGenerator.has(t)) noGenerator.set(t, new Set());
              noGenerator.get(t)!.add(`${sig.name}(${sig.types.join(", ")})`);
            }
          }
          continue;
        }
        const { combos, capped } = combinations(lists as string[][]);
        if (capped) stats.capped++;
        for (const combo of combos) {
          // Each table's own claim decides what the arguments look like.
          const args =
            sig.table === "firstArg"
              ? combo.map((v, i) => (i === 0 ? v : `NULL::${sig.types[i]}`))
              : combo;
          const expr =
            sig.table === "operator"
              ? sig.prefix
                ? `OPERATOR(pg_catalog.${sig.name}) ${args[0]}`
                : `${args[0]} OPERATOR(pg_catalog.${sig.name}) ${args[1]}`
              : `${qualify(sig.name)}(${args.join(", ")})`;
          mine.push(expr);
        }
      }
      if (generatorMissing && mine.length === 0) stats.skipped++;
      perSignature.set(sig, mine);
      for (const e of mine) {
        if (!owner.has(e)) {
          owner.set(e, sig);
          exprs.push(e);
        }
      }
    }

    stats.probes = exprs.length;
    const all = [...exprs, ...POSITIVE_CONTROL];
    const verdicts = new Map<string, string>();
    // One statement, per-expression error isolation inside plpgsql. 20k
    // probes run in ~130ms, so the whole surface costs a fraction of a second.
    const res = await pg.query<{ e: string; v: string }>(
      `SELECT e, probe(e) AS v FROM unnest($1::text[]) AS e;`,
      [all],
    );
    for (const r of res.rows) verdicts.set(r.e, r.v);

    for (const [sig, mine] of perSignature) {
      let evaluated = 0;
      for (const e of mine) {
        const v = verdicts.get(e);
        if (v === "error") stats.raised++;
        else {
          evaluated++;
          stats.evaluated++;
          if (v === "NULL") nullResults.push(`${sig.table}: ${e}`);
        }
      }
      const key = `${sig.name}(${sig.types.join(", ")})`;
      if (mine.length > 0 && evaluated === 0) {
        if (key in UNEVALUABLE) exemptAndRaising.add(key);
        else allRaised.push(`${key} — ${mine.length} combinations, all raised`);
      } else if (key in UNEVALUABLE) {
        exemptButEvaluated.push(`${key} — ${UNEVALUABLE[key]}`);
      }
    }
    for (const c of POSITIVE_CONTROL) if (verdicts.get(c) !== "NULL") controlSurvivors.push(`${c} → ${verdicts.get(c)}`);

    nullResults.sort();
    allRaised.sort();
  }, 120_000);

  afterAll(async () => {
    console.log(
      `\ntotality probe: ${stats.signatures} signatures → ${stats.probes} expressions — ` +
        `${stats.evaluated} evaluated, ${stats.raised} raised (a raise is not a finding).\n` +
        `  ${stats.capped} signature(s) sampled rather than crossed (cap ${MAX_COMBOS}: ` +
        `one-at-a-time plus diagonals), ${stats.skipped} skipped for a missing value generator.`,
    );
    if (!pg.closed) await pg.close();
  });

  it("the positive control still convicts", () => {
    // Asserted FIRST, because every other assertion in this suite is a
    // negative and a negative is only worth what the harness can detect.
    // These ten came out of the tables across three sweeps.
    expect(
      controlSurvivors,
      `The harness no longer detects a NULL it is known to detect. Until this ` +
        `passes, the rest of this suite proves nothing:\n  ${controlSurvivors.join("\n  ")}`,
    ).toEqual([]);
  });

  it("no member of a totality table returns NULL under its own claim", () => {
    // An operator name in PARTIAL_OVERLOADS is a KNOWN hole, kept because the
    // falsifying operand types are exotic and removing the name costs the
    // general case. Excluded here and asserted still-earned below, so the
    // record cannot outlive the defect it excuses.
    const unrecorded = nullResults.filter(
      r => !Object.keys(PARTIAL_OVERLOADS).some(op => r.includes(`OPERATOR(pg_catalog.${op})`)),
    );
    expect(
      unrecorded,
      `A curated totality claim is falsified by execution: non-null arguments ` +
        `in, NULL out. The table's own admission criterion is that a raise is ` +
        `acceptable and a NULL is not, so each of these is a wrong notNull the ` +
        `walk would emit. Remove the name, or narrow the rule that reads it ` +
        `(docs/type-aware-overloads.md), or record it in PARTIAL_OVERLOADS with ` +
        `the measured reason for keeping it:\n  ${unrecorded.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every PARTIAL_OVERLOADS record is still earned", () => {
    // The other side of that marker, and the same shape as the census's
    // `absent` and the probe's UNEVALUABLE. A recorded hole PostgreSQL has
    // since closed is an unsoundness note protecting nothing, and it would
    // keep a real one hidden if the name ever acquires a second.
    const stale = Object.keys(PARTIAL_OVERLOADS)
      .filter(op => !nullResults.some(r => r.includes(`OPERATOR(pg_catalog.${op})`)))
      .sort();
    expect(
      stale,
      `PARTIAL_OVERLOADS records a hole no probe can reproduce. Either ` +
        `PostgreSQL made the overload total — drop the entry and the name is ` +
        `simply sound — or the corpus stopped reaching it, which is worse ` +
        `because the entry now hides whatever else the name does:\n  ${stale.join(", ")}`,
    ).toEqual([]);
  });

  it("the prose record and the signature verdicts list the same holes", () => {
    // PARTIAL_OVERLOADS carries the human-facing reason; the operator
    // narrowing consults NON_TOTAL_OPERATOR_SIGNATURES per survivor. Two
    // copies of one fact drift unless something holds them together: every
    // recorded name must carry at least one signature verdict, and every
    // verdict's name must have a recorded reason.
    const proseNames = new Set(Object.keys(PARTIAL_OVERLOADS));
    const verdictNames = new Set(
      [...NON_TOTAL_OPERATOR_SIGNATURES].map(k => k.slice(0, k.indexOf("("))),
    );
    expect([...proseNames].filter(n => !verdictNames.has(n))).toEqual([]);
    expect([...verdictNames].filter(n => !proseNames.has(n))).toEqual([]);
  });

  it("every parameter type has a value generator", () => {
    // The `fixture-data/generate.ts` discipline: a type with no generator
    // stops the run rather than silently shrinking the surface. Here it
    // reports, because the surface is pg_catalog's rather than ours.
    const missing = [...noGenerator.entries()]
      .map(([t, sigs]) => `${t} — needed by ${sigs.size} signature(s), e.g. ${[...sigs][0]}`)
      .sort();
    expect(
      missing,
      `No literal to probe with, so every signature taking this type went ` +
        `unprobed. Add an entry to VALUES — and prefer the adversarial member ` +
        `of the type (the empty one, the NaN, the infinity):\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every signature was actually evaluated at least once", () => {
    // The other silent-non-coverage guard. A raise is skipped by design, so a
    // signature whose every combination raised has been probed in name only —
    // which reads as a pass and is not one.
    expect(
      allRaised,
      `Every combination raised, so this signature's totality claim was never ` +
        `tested. The values are the wrong shape for it, not the function's ` +
        `fault — add one that reaches a result, or record it in UNEVALUABLE ` +
        `with the reason PostgreSQL can never answer it:\n  ${allRaised.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every UNEVALUABLE exemption is still earned", () => {
    // The other side of that marker. An exemption that starts producing values
    // is an untested signature hiding behind a stale reason.
    const stale = [
      ...exemptButEvaluated,
      ...Object.keys(UNEVALUABLE)
        .filter(k => !exemptAndRaising.has(k))
        .map(k => `${k} — listed, but no signature by that name was probed at all`),
    ].sort();
    expect(
      stale,
      `An UNEVALUABLE entry no longer describes reality. Either PostgreSQL can ` +
        `answer it now — drop the entry, the signature is probeable — or the ` +
        `signature is gone and so should the entry be:\n  ${stale.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every STRICT_OPERATORS member is STRICT per pg_catalog", () => {
    // The table claims totality AND strictness, and one of the two has an
    // exact oracle: `oprcode` → `proisstrict`. Mechanism-C attribution
    // consumes the strict half, so a non-strict member would be wrong for one
    // consumer while looking right to the other — the file's own warning.
    const unrecorded = nonStrictOperators.filter(sig => !(sig.split(" ")[0]! in NON_STRICT_OVERLOADS));
    const staleRecords = Object.keys(NON_STRICT_OVERLOADS).filter(
      op => !nonStrictOperators.some(sig => sig.split(" ")[0] === op),
    );
    expect(
      staleRecords,
      `NON_STRICT_OVERLOADS records an exception PostgreSQL no longer has. ` +
        `Every overload of this name is strict now, so the note is stale and ` +
        `the over-report it excused is gone:\n  ${staleRecords.join(", ")}`,
    ).toEqual([]);
    expect(
      unrecorded,
      `Listed in STRICT_OPERATORS, but its backing function is not strict. ` +
        `Mechanism-C attribution concludes that a NULL operand forces the ` +
        `expression NULL, which this member does not honour. Either drop it, ` +
        `or record it in NON_STRICT_OVERLOADS with the measured reason keeping ` +
        `it:\n  ${unrecorded.join("\n  ")}`,
    ).toEqual([]);
  });
});
