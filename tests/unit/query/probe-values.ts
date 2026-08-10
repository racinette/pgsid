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
  // them those signatures raise on every combination and go unprobed. Three
  // more joined them the same way (2026-08-09, from the work list's
  // raised-everywhere column): `'hour'` is a unit `date_part`/`extract` accept
  // for a `time`/`timetz` — `'day'` is not, and those four rows raised on
  // every combination; `'month'` is a unit that is NULL for an INFINITE
  // interval while `'day'` and `'hour'` are ±Infinity, so it is what witnesses
  // the interval rows; `'[]'` is a range BOUND spec, without which the six
  // three-argument range constructors raised everywhere.
  text: [
    "'abc'", "''", "'  '", "'NaN'", "'day'", "'base64'", "'hex'", "'escape'",
    "'NFC'", "'9'", "'UTC'", "'hour'", "'month'", "'[]'",
  ],
  "character varying": ["''::varchar", "'abc'::varchar"],
  character: ["''::char", "'a'::char"],
  // `'r'` is an object-type abbreviation `acldefault` accepts; `'a'` is not
  // one, and alone it left that signature raising on every combination.
  '"char"': ["'a'::\"char\"", "'r'::\"char\""],
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
  // The infinite interval is PG17's addition and the same class as the
  // infinite timestamp: `date_part`/`extract` answer ±Infinity for the
  // monotonic fields and NULL for the rest.
  interval: ["'0'::interval", "'1 day'::interval", "'infinity'::interval", "'-infinity'::interval"],

  // --- containers: the EMPTY array is the array_position/cardinality class.
  bytea: ["''::bytea", "'\\x00'::bytea", "'abc'::bytea"],
  "integer[]": ["'{}'::int[]", "ARRAY[1,2]"],
  "text[]": ["'{}'::text[]", "ARRAY['a','b']"],
  // A NON-EMPTY array and a null-VALUED key joined the four originals
  // (2026-08-09, from the set-returning probe): without them every json
  // expander either raised (`json_array_elements` rejects a non-array, and
  // `'[]'` emits nothing) or saw no JSON null — and a JSON null is exactly
  // what separates `json_each_text` from `json_each`, the `_text` half
  // turning it into a SQL NULL while the other returns it as a value.
  json: ["'null'::json", "'{}'::json", "'[]'::json", "'{\"a\":1}'::json", "'[1,null]'::json", "'{\"a\":null}'::json"],
  jsonb: ["'null'::jsonb", "'{}'::jsonb", "'[]'::jsonb", "'{\"a\":1}'::jsonb", "'[1,null]'::jsonb", "'{\"a\":null}'::jsonb"],
  // The CAST spellings matter: an uncast `ROW(1,2)` is decomposed by the
  // parser, so `ROW(1,2) *< ROW(1,2)` looks for `integer *< integer` and
  // raises — which left all six record-image comparison operators probed in
  // name only. The NULL-holding row is the corner of the pair.
  record: ["ROW(1,2)", "ROW(1,2)::record", "ROW(1,NULL)::record"],

  // --- ranges: the EMPTY range removed lower/upper.
  anyrange: ["'empty'::int4range", "'[1,2)'::int4range"],
  anymultirange: ["'{}'::int4multirange", "'{[1,2)}'::int4multirange"],
  // The CONCRETE range types, and the arrays the multirange constructors
  // take variadically (2026-08-09, from the no-generator triage): without
  // them `int4multirange(int4range)` and its five siblings went unprobed,
  // which is the gap this session's promotion batch had to record rather
  // than close.
  int4range: ["'empty'::int4range", "'[1,2)'::int4range"],
  int8range: ["'empty'::int8range", "'[1,2)'::int8range"],
  numrange: ["'empty'::numrange", "'[1,2)'::numrange"],
  daterange: ["'empty'::daterange", "'[2020-01-01,2020-01-02)'::daterange"],
  tsrange: ["'empty'::tsrange", "'[2020-01-01,2020-01-02)'::tsrange"],
  tstzrange: ["'empty'::tstzrange", "'[2020-01-01Z,2020-01-02Z)'::tstzrange"],
  "int4range[]": ["'{}'::int4range[]", "ARRAY['[1,2)'::int4range]"],
  "int8range[]": ["'{}'::int8range[]", "ARRAY['[1,2)'::int8range]"],
  "numrange[]": ["'{}'::numrange[]", "ARRAY['[1,2)'::numrange]"],
  "daterange[]": ["'{}'::daterange[]", "ARRAY['empty'::daterange]"],
  "tsrange[]": ["'{}'::tsrange[]", "ARRAY['empty'::tsrange]"],
  "tstzrange[]": ["'{}'::tstzrange[]", "ARRAY['empty'::tstzrange]"],

  // --- the two application-facing pseudo-ish types the triage kept. A
  //     jsonpath that matches NOTHING is the point: it is what makes
  //     `jsonb_path_query_first` answer NULL, the walk's own excluded-list
  //     example, which until now had no witness. `regconfig` is full-text
  //     search — to_tsvector and the four tsquery spellings take it.
  // The STRICT path is its own class and the lax ones cannot stand in for
  // it: under `silent => true` a strict path error is SUPPRESSED into a
  // NULL rather than a false, so `jsonb_path_exists`, its _tz twin, the
  // `@?` operator and `jsonb_path_match` all answer NULL for input that is
  // entirely non-null — while the same call on a lax path answers false.
  jsonpath: ["'$'::jsonpath", "'$.a'::jsonpath", "'$.a == 1'::jsonpath", "'strict $.a'::jsonpath"],
  regconfig: ["'english'::regconfig", "'simple'::regconfig"],
  // ts_rank's weight vector; the short array raises rather than answering.
  "real[]": ["'{0.1,0.2,0.4,1.0}'::float4[]", "'{}'::float4[]"],

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
  // The VERTICAL line is its own class: `line ## lseg` is NULL only when the
  // line has no horizontal component, so the diagonal alone missed the defect
  // even once the zero-length segment was in the corpus (measured — both
  // halves of that combination are needed).
  line: ["'{1,1,0}'::line", "'{1,0,0}'::line"],
  // The ZERO-LENGTH segment is the lseg counterpart of the single-point path
  // below (2026-08-09): `line ## lseg` — the closest point on the segment —
  // is NULL when the segment has no length, and a segment between two
  // distinct points cannot reach it.
  lseg: ["'[(0,0),(1,1)]'::lseg", "'[(0,0),(0,0)]'::lseg"],
  // The DEGENERATE shapes are here for corpus PARITY: the operator batch
  // convicted `&<|`, `|&>`, `<<|`, `~=` and their siblings against a
  // zero-area box, a zero-radius circle and a single-point polygon, and a
  // conviction resting on a value the standing probe never re-tries is a
  // claim held more weakly than it was made.
  box: ["'((0,0),(1,1))'::box", "'((0,0),(0,0))'::box"],
  // Both spellings: `path + path` is NULL whenever EITHER operand is a CLOSED
  // path, and open + open is a value — so one spelling alone either misses
  // the defect or misses the control. The SINGLE-POINT path joined them
  // (2026-08-09): `path <-> path` is NULL whenever either side has one point,
  // and two two-point paths cannot reach it — the same shape as the closed
  // path one row up, found the same way.
  path: ["'[(0,0),(1,1)]'::path", "'((0,0),(1,1))'::path", "'[(0,0)]'::path"],
  circle: ["'<(0,0),1>'::circle", "'<(0,0),0>'::circle"],
  polygon: ["'((0,0),(1,1),(1,0))'::polygon", "'((0,0))'::polygon"],
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
  // A third family whose ARRAY holds a NULL ELEMENT (2026-08-09). The array
  // is still a non-null argument, so this is a totality question and not a
  // strictness one — and it is the only way to reach `unnest`'s NULL row,
  // which a hand fixture had witnessed while the probe read the signature as
  // no-null-found. The scalar members repeat family 1 so the family stays a
  // legal instantiation for signatures mixing element and array parameters.
  {
    anyelement: "1", anynonarray: "1", anycompatible: "1", anycompatiblenonarray: "1",
    anyarray: "ARRAY[1,NULL]", anycompatiblearray: "ARRAY[1,NULL]",
    '"any"': "1", anyenum: "'a'::probe_enum", anyrange: "'[1,2)'::int4range",
    anymultirange: "'{[1,2)}'::int4multirange", anycompatiblerange: "'[1,2)'::int4range",
  },
];

export const POLYMORPHIC = new Set(Object.keys(POLYMORPHIC_FAMILIES[0]!));

/**
 * Beyond this many combinations a signature is sampled rather than crossed,
 * and the run reports how many. Sized by `date_trunc(text, timestamptz,
 * text)`: its unit and its timezone must be valid TOGETHER, and a
 * one-at-a-time sweep from a baseline can only ever make one of them valid at
 * a time, so above the cap the signature raises on every combination and goes
 * unprobed. It was 363 combinations against a cap of 512; the three text
 * values the 2026-08-09 batch added took it to 588, and the cap moved with it
 * rather than letting a signature the cap exists for fall out. Probes are
 * cheap enough that the cap is about the report staying honest rather than
 * about time — the claimed surface is 26k of them in ~4s.
 */
export const MAX_COMBOS = 1024;

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

/**
 * How many emitted rows a set-returning probe inspects. A BOUND, recorded
 * rather than assumed: a NULL past this row goes unseen, which is the price
 * of asking the question at all.
 *
 * 100 because the corpus's set-returning inputs are small by construction —
 * two-element arrays, one- and two-key json, series over the corpus's
 * integers — with one exception that is exactly why the bound exists:
 * `generate_series(1::bigint, 9223372036854775807)` emits more rows than
 * exist time to count.
 */
export const SRF_ROW_LIMIT = 100;

/**
 * The set-returning probe, and the reason it is written THIS way.
 *
 * `probe()` above cannot answer a set: `EXECUTE … INTO` takes the FIRST
 * emitted row and reads zero rows as a value, so `unnest(ARRAY[NULL,1])`
 * witnesses and `unnest(ARRAY[1,NULL])` does not — the same function over the
 * same elements, decided by sort order. It also RAISES on a multi-row result,
 * and raising costs 2-3.5s over the corpus's large bounds because PostgreSQL
 * runs the query out first.
 *
 * So the call goes in the TARGET LIST, not in FROM. That distinction is the
 * whole mechanism and was measured the expensive way: a FROM-position
 * function scan MATERIALISES in PGlite, so `LIMIT` does not bound it,
 * `statement_timeout` does not cancel it, and the corpus's bigint bound
 * exhausts the machine's memory — the WASM backend blocks the event loop, so
 * nothing in JavaScript can intervene either. A target-list `ProjectSet` is
 * lazy, `LIMIT` stops it, and the same expression answers in ~2ms.
 *
 * The caller passes a complete inner query (see `srfQuery`) rather than a
 * bare expression, because the null test has to name each output column: a
 * record-returning row's whole-row `IS NULL` is true only when EVERY field is
 * null, which would miss `unnest(tsvector)`'s NULL positions beside a
 * non-null lexeme.
 */
export const SRF_PROBE_FN_SQL = `
  CREATE FUNCTION srfprobe(q text) RETURNS text LANGUAGE plpgsql AS $srf$
  DECLARE n bigint; anynull boolean;
  BEGIN
    EXECUTE q INTO n, anynull;
    IF n = 0 THEN RETURN 'empty'; END IF;
    RETURN CASE WHEN anynull THEN 'NULL' ELSE 'value' END;
  EXCEPTION WHEN OTHERS THEN RETURN 'error';
  END $srf$;`;

/**
 * The inner query for one set-returning call: how many rows it emitted (up to
 * the bound) and whether any of them holds a NULL in any output column.
 * Order-independent, which is the property `probe()` lacks.
 */
export function srfQuery(call: string, ncols: number): string {
  const cols = Array.from({ length: ncols }, (_, i) => `c${i}`);
  const projection = ncols === 1 ? `(${call})` : `(${call}).*`;
  return (
    `SELECT count(*), bool_or(${cols.map(c => `${c} IS NULL`).join(" OR ")})` +
    ` FROM (SELECT ${projection} LIMIT ${SRF_ROW_LIMIT}) s(${cols.join(", ")})`
  );
}

