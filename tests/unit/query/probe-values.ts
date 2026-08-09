// ---------------------------------------------------------------------------
// The probe VALUE CORPUS, shared by totality-probe.test.ts (the claimed
// surface, gating) and builtin-surface.test.ts (the full surface,
// classifying). One copy on the catalog-features.ts precedent: the corpus
// is the definition of "corner case", and two drifting copies would let the
// two suites disagree about what was probed.
// ---------------------------------------------------------------------------

/**
 * Non-NULL literals per rendered type name, chosen for the input CLASSES that
 * have historically broken a totality claim rather than for coverage of the
 * type: NaN and the infinities, the empty string, the empty array, the empty
 * range, the empty format, the JSON null, and a boring value to sit beside
 * them. A type absent from here makes its signatures unprobed, and the suite
 * says so rather than passing quietly.
 */
export const VALUES: Record<string, string[]> = {
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
export const POLYMORPHIC_FAMILIES: Record<string, string>[] = [
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

export const POLYMORPHIC = new Set(Object.keys(POLYMORPHIC_FAMILIES[0]!));

/**
 * Beyond this many combinations a signature is sampled rather than crossed,
 * and the run reports how many. Set at 512 because `date_trunc(text,
 * timestamptz, text)` is 363: its unit and its timezone must be valid
 * TOGETHER, and a one-at-a-time sweep from a baseline can only ever make one
 * of them valid at a time, so the signature raised on every combination and
 * went unprobed. Probes are cheap enough that the cap is about the report
 * staying honest rather than about time — 20k of them run in ~130ms.
 */
export const MAX_COMBOS = 512;

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
export const qualify = (name: string): string =>
  `pg_catalog.${/^[a-z_][a-z0-9_]*$/.test(name) ? name : JSON.stringify(name)}`;

/** The cross product, capped — beyond the cap, vary one argument at a time. */
export function combinations(valueLists: string[][]): { combos: string[][]; capped: boolean } {
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
 * Per-expression error isolation: one call per expression inside ONE
 * statement, an exception never aborting the batch.
 */
export const PROBE_FN_SQL = `
  CREATE FUNCTION probe(expr text) RETURNS text LANGUAGE plpgsql AS $probe$
  DECLARE r boolean;
  BEGIN
    EXECUTE 'SELECT (' || expr || ') IS NULL' INTO r;
    RETURN CASE WHEN r THEN 'NULL' ELSE 'value' END;
  EXCEPTION WHEN OTHERS THEN RETURN 'error';
  END $probe$;`;

