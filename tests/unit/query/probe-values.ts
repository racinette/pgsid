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
    // The PRIVILEGE words (2026-08-09): the `has_*_privilege` family and
    // `pg_has_role` reject anything else, which left 84 rows — the largest
    // block in raised-everywhere — probed in name only. They are worth the
    // seven values because the family SPLITS: `has_table_privilege(oid, …)`
    // answers NULL for an object that does not exist while
    // `has_database_privilege` answers a value, and no amount of staring at
    // the names predicts which.
    "'SELECT'", "'USAGE'", "'EXECUTE'", "'CREATE'", "'CONNECT'", "'SET'", "'MEMBER'",
    // A real RELATION name, for the same family's spellings that identify the
    // object by text rather than by OID — `has_table_privilege('abc', …)`
    // raises because no such relation exists. `pg_class` exists in every
    // PostgreSQL there has ever been.
    "'pg_class'",
    // A real GUC name and a real text-search parser name, each closing a row
    // that raises for anything else: `current_setting('abc')` does not exist,
    // and `ts_parse`/`ts_token_type` take a parser.
    "'search_path'", "'default'",
  ],
  "character varying": ["''::varchar", "'abc'::varchar"],
  character: ["''::char", "'a'::char"],
  // `'r'` is an object-type abbreviation `acldefault` accepts; `'a'` is not
  // one, and alone it left that signature raising on every combination.
  '"char"': ["'a'::\"char\"", "'r'::\"char\""],
  // A REAL role name (2026-08-09): the `has_*_privilege` family takes its
  // grantee as a `name` and raises for one that does not exist, which left
  // 52 rows probed in name only — every spelling that identifies the role by
  // name rather than by OID. `'postgres'` is the role PGlite runs as.
  //
  // Nothing that looks like an ENCODING may join this list, however useful:
  // `convert_to(text, name)` reads its second argument as one, and a real
  // conversion attempt returns a zero-row "success" and leaves the backend
  // answering plain SELECTs while lying (the register's poison finding). A
  // role name cannot be mistaken for an encoding, which is why this one is
  // safe and `'LATIN1'` would not be.
  name: ["''::name", "'abc'::name", "'postgres'::name"],

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
  // The second value has FF:FE in the middle, which is what `macaddr(macaddr8)`
  // requires to narrow to six bytes — it raises for any other eight.
  macaddr8: ["'08:00:2b:01:02:03:04:05'::macaddr8", "'08:00:2b:ff:fe:01:02:03'::macaddr8"],
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
  // --- the types the no-generator PIN forced a decision about (2026-08-09).
  //     Each is here because writing "no literal exists" next to it would
  //     have been FALSE, which is the question that pin asks and nobody had
  //     asked before. Between them they unblock ~90 signatures that had been
  //     classified unprobeable for no reason anybody could state.
  // `cstring` was DELIBERATELY skipped and the skip was wrong (2026-08-09,
  // corrected on review): it is one corpus value, and 186 signatures reading
  // nullable with nothing witnessing it is exactly the state this surface
  // exists to flag — "nobody calls them" is not a reason, and `int4in('42')`
  // is a legal call. The values are one that parses as most types and one
  // that parses as few, since an I/O function RAISES on input it cannot read
  // and a raise is not a NULL.
  cstring: ["'abc'::cstring", "'42'::cstring", "''::cstring"],
  "double precision[]": ["'{}'::float8[]", "'{1,2}'::float8[]"],
  "bigint[]": ["'{}'::int8[]", "'{1,2}'::int8[]"],
  "oid[]": ["'{}'::oid[]", "'{1,2}'::oid[]"],
  "cstring[]": ["'{}'::cstring[]", "'{a}'::cstring[]"],
  '"char"[]': ["ARRAY['a'::\"char\"]"],
  int2vector: ["'1 2'::int2vector"],
  xml: ["''::xml", "'<a/>'::xml"],
  // A refcursor value is a PORTAL NAME, so the literal is trivial and the
  // open cursor is the hard part — `PROBE_OBJECTS_SQL` declares one WITH
  // HOLD so it outlives the declaring transaction. `cursor_to_xml` and
  // `cursor_to_xmlschema` are the only two signatures that take one, and
  // both were classified no-generator until this asked the pin's own
  // question: impossible, or merely absent?
  refcursor: ["'probe_cursor'::refcursor", "'abc'::refcursor"],
  // The reg* family names a live catalog object; an ambiguous name RAISES,
  // so `regproc` and `regoper` take a symbol with exactly one entry.
  // A relation AND a sequence: the sequence functions take `regclass` and
  // raise "is not a sequence" for anything else, so a relation-only vocabulary
  // left every one of their signatures unevaluated — a claim nothing tested.
  //
  // The two corners joined them with the volatile sweep (2026-08-21), and
  // both were hiding a NULL behind a vocabulary of objects that all EXIST
  // and are all in use. A regclass whose relation is GONE is what
  // `pg_relation_size`, `pg_table_size`, `pg_indexes_size` and
  // `pg_total_relation_size` answer NULL for — `try_relation_open` returns
  // nothing and each has a `PG_RETURN_NULL` for it — and a regclass names a
  // dropped OID without raising, so this is an ordinary input rather than a
  // race. An UN-CALLED sequence is the same shape one layer down:
  // `pg_sequence_last_value` is NULL until `nextval` has run, and
  // `PROBE_OBJECTS_SQL` primes `probe_seq` for `currval`/`lastval` — so the
  // object that makes five signatures evaluable was hiding a sixth's witness.
  regclass: [
    "'pg_class'::regclass", "'probe_seq'::regclass",
    "'probe_seq_unused'::regclass", "999999::oid::regclass",
  ],
  regtype: ["'integer'::regtype"],
  regproc: ["'pg_backend_pid'::regproc"],
  regprocedure: ["'upper(text)'::regprocedure"],
  regoper: ["'||/'::regoper"],
  regoperator: ["'+(integer,integer)'::regoperator"],
  regnamespace: ["'pg_catalog'::regnamespace"],
  regrole: ["'postgres'::regrole"],
  regcollation: ["'\"C\"'::regcollation"],
  regdictionary: ["'simple'::regdictionary"],
  pg_snapshot: ["'1:1:'::pg_snapshot"],
  txid_snapshot: ["'1:1:'::txid_snapshot"],

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
    anycompatiblemultirange: "'{[1,2)}'::int4multirange",
  },
  {
    anyelement: "'x'", anynonarray: "'x'", anycompatible: "'x'", anycompatiblenonarray: "'x'",
    anyarray: "'{}'::text[]", anycompatiblearray: "'{}'::text[]",
    '"any"': "'x'", anyenum: "'b'::probe_enum", anyrange: "'empty'::int4range",
    anymultirange: "'{}'::int4multirange", anycompatiblerange: "'empty'::int4range",
    anycompatiblemultirange: "'{}'::int4multirange",
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
    anycompatiblemultirange: "'{[1,2)}'::int4multirange",
  },
];

export const POLYMORPHIC = new Set(Object.keys(POLYMORPHIC_FAMILIES[0]!));

/**
 * Beyond this many combinations a signature is sampled rather than crossed,
 * and the run reports how many. Sized by `date_trunc(text, timestamptz,
 * text)`: its unit and its timezone must be valid TOGETHER, and a
 * one-at-a-time sweep from a baseline can only ever make one of them valid at
 * a time, so above the cap the signature raises on every combination and goes
 * unprobed. It was 363 combinations against a cap of 512; the text values
 * the 2026-08-09 batches added took it to 588 and then to 1323, and the cap
 * moved with it each time rather than letting the signature the cap exists
 * for fall out. The rule, since it has now fired three times: this row is
 * `len(text)^2 * 3`, so growing the text corpus is what moves the cap. Probes are
 * cheap enough that the cap is about the report staying honest rather than
 * about time — the claimed surface is 26k of them in ~4s.
 */
export const MAX_COMBOS = 2048;

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
/**
 * Objects the probes need in order to REACH a result, as opposed to a raise.
 *
 * The sequence exists because `nextval`/`currval`/`setval` take a `regclass`
 * and refuse anything that is not a sequence, and `lastval()` refuses until
 * the session has called `nextval` at least once — so without both the
 * sequence and the priming call, all five signatures raise for every input and
 * their totality claims are asserted by nothing. Recording them UNEVALUABLE
 * would have been the dishonest alternative: PostgreSQL answers them fine, it
 * just needs a sequence to answer about.
 *
 * The SECOND sequence is deliberately not primed, and it is here because the
 * first one's priming turned out to hide a witness: `pg_sequence_last_value`
 * is NULL for a sequence `nextval` has never run on, and with one primed
 * sequence in the vocabulary it read total. Supplying an object to reach a
 * result and supplying one to reach a NULL are the same job.
 *
 * The LARGE OBJECT and the file it exports are the volatile bucket's demand
 * (2026-08-21), and both need a separate statement rather than a nested call:
 * `lo_export(lo_from_bytea(...), …)` raises "large object does not exist"
 * because the export cannot see a row its own command inserted. Its OID is
 * 16000 rather than 0 or 1 for a reason — those two ARE in the corpus, so
 * `lo_unlink(1::oid)` would delete the object the export and `lo_get` rows
 * are probed against, and which of them ran first would decide their verdict.
 */
export const PROBE_OBJECTS_SQL = `
  CREATE SEQUENCE probe_seq;
  SELECT nextval('probe_seq');
  CREATE SEQUENCE probe_seq_unused;
  DECLARE probe_cursor CURSOR WITH HOLD FOR SELECT 1 AS a;
  SELECT lo_from_bytea(16000, 'probe'::bytea);
  SELECT lo_export(16000, 'probe_lo');
`;

/**
 * Signatures whose GENERATED combinations must not be run, and why.
 *
 * The corpus carries the infinities because they are what break a totality
 * claim, and for these three rows an infinity is not an input class but a
 * call that never comes back: `pg_sleep('Infinity'::float8)` sleeps until
 * something kills the process. `statement_timeout` cannot stop it and no JS
 * timer can fire while the WASM backend holds the event loop — the same shape
 * as the FROM-position function scan `srfQuery` exists to avoid, and that one
 * is recorded because it exhausted a developer machine twice. The finite
 * members are refused with them: `'1 day'::interval` is a legal sleep too.
 *
 * A refusal is about the CALL the corpus builds, not about the function, so
 * each of these has a `COHERENT_CALLS` entry supplying a bounded sleep — the
 * row is probed by that call and convicts or witnesses like any other.
 */
export const REFUSED_CALLS: Record<string, string> = {
  "pg_sleep(double precision)": "the corpus carries 'Infinity'::float8, and the sleep is uninterruptible in WASM",
  "pg_sleep_for(interval)": "the corpus carries 'infinity'::interval and '1 day'",
  "pg_sleep_until(timestamp with time zone)": "the corpus carries 'infinity'::timestamptz",
  // The second reason a call is refused: it changes what the probes AFTER it
  // can see. `set_config('search_path', 'abc', false)` is a legal call the
  // corpus builds from two of its own text values, `is_local = false` makes
  // it outlive the call, and the whole surface runs in one statement — so
  // `'a'::probe_enum` stopped resolving and twenty-four enum signatures went
  // from claimed-and-held to probed-in-name-only, in silence. The coherent
  // call keeps the mechanism (a GUC is set and its new value returned) with
  // a setting nothing reads and `is_local = true`.
  "set_config(text,text,boolean)":
    "sets a SESSION GUC that outlives the call — search_path among the corpus's own values, which hides the probe's enum type from every later expression in the statement",
};

export const PROBE_FN_SQL = `
  CREATE FUNCTION probe(expr text) RETURNS text LANGUAGE plpgsql AS $probe$
  DECLARE r boolean;
  BEGIN
    EXECUTE 'SELECT (' || expr || ') IS NULL' INTO r;
    RETURN CASE WHEN r THEN 'NULL' ELSE 'value' END;
  EXCEPTION WHEN OTHERS THEN RETURN 'error';
  END $probe$;`;

/** A large object created by the call itself, and a descriptor open on one. */
const LO_NEW = "pg_catalog.lo_create(0::oid)";
const LO_FD = `pg_catalog.lo_open(${LO_NEW}, 393216)`;

/**
 * Argument lists known to be valid TOGETHER, appended to the generated
 * combinations for ONE signature.
 *
 * The corpus is keyed by TYPE, which is the right shape for almost
 * everything: a value good for `text` is good in any text position. It breaks
 * where a row needs several arguments valid AT ONCE and no per-type choice
 * can be right in every position — `has_column_privilege(name, text, text,
 * text)` wants a role, a relation, a column of THAT relation and a privilege,
 * and one `text` list cannot be a relation and a privilege simultaneously.
 * Past the combination cap the sampler varies one argument from a baseline,
 * so every combination it builds has at least one invalid member and the row
 * raises everywhere — probed in name only, with the corpus holding every
 * value it needed.
 *
 * This is the general answer to that, and it arrives late: `date_trunc(text,
 * timestamptz, text)` is the same problem and was answered three times by
 * RAISING `MAX_COMBOS` instead, which works only while the cross product
 * stays affordable and cost a cap increase each time the text corpus grew.
 * Its entry is here too, so that row's coverage no longer depends on the cap.
 *
 * An entry is EVIDENCE, not a shortcut: these are calls, run like any other
 * combination, and a NULL from one witnesses exactly as loudly.
 */
export const COHERENT_CALLS: Record<string, readonly (readonly string[])[]> = {
  // The unit and the timezone must be valid together — the signature the
  // combination cap was sized for, twice.
  "date_trunc(text,timestamp with time zone,text)": [
    ["'day'", "'2020-01-01Z'::timestamptz", "'UTC'"],
    ["'hour'", "'infinity'::timestamptz", "'UTC'"],
  ],
  // A role, an object of the right KIND, and a privilege that kind accepts.
  // `pg_class`, `pg_catalog`, `sql` and `pg_default` exist in every
  // PostgreSQL; the role is the one PGlite runs as.
  "has_column_privilege(name,text,smallint,text)": [["'postgres'::name", "'pg_class'", "1::smallint", "'SELECT'"]],
  "has_column_privilege(name,text,text,text)": [["'postgres'::name", "'pg_class'", "'relname'", "'SELECT'"]],
  "has_column_privilege(oid,text,smallint,text)": [["'postgres'::regrole::oid", "'pg_class'", "1::smallint", "'SELECT'"]],
  "has_column_privilege(oid,text,text,text)": [["'postgres'::regrole::oid", "'pg_class'", "'relname'", "'SELECT'"]],
  "has_column_privilege(text,smallint,text)": [["'pg_class'", "1::smallint", "'SELECT'"]],
  "has_column_privilege(text,text,text)": [["'pg_class'", "'relname'", "'SELECT'"]],
  "has_database_privilege(name,text,text)": [["'postgres'::name", "current_database()", "'CONNECT'"]],
  "has_database_privilege(oid,text,text)": [["'postgres'::regrole::oid", "current_database()", "'CONNECT'"]],
  "has_database_privilege(text,text)": [["current_database()", "'CONNECT'"]],
  "has_function_privilege(oid,text,text)": [["'postgres'::regrole::oid", "'upper(text)'", "'EXECUTE'"]],
  "has_language_privilege(name,text,text)": [["'postgres'::name", "'sql'", "'USAGE'"]],
  "has_language_privilege(oid,text,text)": [["'postgres'::regrole::oid", "'sql'", "'USAGE'"]],
  "has_language_privilege(text,text)": [["'sql'", "'USAGE'"]],
  "has_schema_privilege(name,text,text)": [["'postgres'::name", "'pg_catalog'", "'USAGE'"]],
  "has_schema_privilege(oid,text,text)": [["'postgres'::regrole::oid", "'pg_catalog'", "'USAGE'"]],
  "has_schema_privilege(text,text)": [["'pg_catalog'", "'USAGE'"]],
  "has_tablespace_privilege(name,text,text)": [["'postgres'::name", "'pg_default'", "'CREATE'"]],
  "has_tablespace_privilege(oid,text,text)": [["'postgres'::regrole::oid", "'pg_default'", "'CREATE'"]],
  "has_tablespace_privilege(text,text)": [["'pg_default'", "'CREATE'"]],
  // The SEQUENCE privileges (2026-08-21). They were pinned unprobeable
  // because "a fresh PGlite has no sequence" — true when it was written, and
  // false as soon as `PROBE_OBJECTS_SQL` reached the classifying suite. The
  // foreign-data-wrapper and foreign-server rows keep that reason; these
  // three lost it.
  "has_sequence_privilege(name,text,text)": [["'postgres'::name", "'probe_seq'", "'USAGE'"]],
  "has_sequence_privilege(oid,text,text)": [["'postgres'::regrole::oid", "'probe_seq'", "'USAGE'"]],
  "has_sequence_privilege(text,text)": [["'probe_seq'", "'USAGE'"]],
  // A large-object DESCRIPTOR, opened inside the call. These five raise for
  // any integer the corpus carries, and the descriptor `lo_open` returns is
  // only valid inside the transaction that opened it — so the argument has
  // to be the open itself rather than a number. Without it their verdicts
  // depended on where each name SORTED in the batch: `lo_tell` came after
  // `lo_open` and evaluated, `lo_close` came before it and did not.
  // The rest of the large-object family, on the same principle: an OID or a
  // file the call can be sure of. `lo_export` and `lo_get` take the object
  // PROBE_OBJECTS_SQL made, because neither can see one created by its own
  // command; the others create their own. Without these the family's verdicts
  // came from whichever row happened to run first — `lo_create(1::oid)` made
  // OID 1 exist and `lo_open(1::oid, …)` then worked, in the classifier's
  // name-ordered batch and not in the totality probe's unordered one.
  "lo_export(oid,text)": [["16000::oid", "'probe_export'"]],
  "lo_get(oid)": [["16000::oid"]],
  "lo_get(oid,bigint,integer)": [["16000::oid", "0::bigint", "1"]],
  "lo_import(text)": [["'probe_lo'"]],
  "lo_import(text,oid)": [["'probe_lo'", "0::oid"]],
  "lo_open(oid,integer)": [[LO_NEW, "393216"]],
  "lo_put(oid,bigint,bytea)": [[LO_NEW, "0::bigint", "'abc'::bytea"]],
  "lo_unlink(oid)": [[LO_NEW]],
  // The server-side file readers, against the file the large object exported.
  // They convicted before this entry existed because `lo_export(0::oid,'abc')`
  // had written a file called `abc` earlier in the same statement — a
  // promotion resting on alphabetical order, which the totality probe (whose
  // fetch has no ORDER BY) did not reproduce.
  "pg_read_binary_file(text)": [["'probe_lo'"]],
  "pg_read_binary_file(text,bigint,bigint)": [["'probe_lo'", "0::bigint", "1::bigint"]],
  "pg_read_file(text)": [["'probe_lo'"]],
  "pg_read_file(text,bigint,bigint)": [["'probe_lo'", "0::bigint", "1::bigint"]],
  "pg_stat_file(text)": [["'probe_lo'"]],
  // A slot created by the call itself. The same order accident: `pg_create_*`
  // sorts before `pg_drop_*` and left one lying around.
  "pg_drop_replication_slot(name)": [
    ["(pg_catalog.pg_create_physical_replication_slot('probe_slot'::name, false, false)).slot_name"],
  ],
  // The refused row's bounded call: a GUC nothing reads, set LOCALLY.
  "set_config(text,text,boolean)": [["'application_name'", "'probe'", "true"]],
  "lo_close(integer)": [[LO_FD]],
  "lo_lseek(integer,integer,integer)": [[LO_FD, "0", "0"]],
  "lo_lseek64(integer,bigint,integer)": [[LO_FD, "0::bigint", "0"]],
  "lo_tell(integer)": [[LO_FD]],
  "lo_tell64(integer)": [[LO_FD]],
  "lo_truncate(integer,integer)": [[LO_FD, "0"]],
  "lo_truncate64(integer,bigint)": [[LO_FD, "0::bigint"]],
  "loread(integer,integer)": [[LO_FD, "1"]],
  "lowrite(integer,bytea)": [[LO_FD, "'abc'::bytea"]],
  // A statistics KIND, a reset TARGET and a log FORMAT — each a small closed
  // vocabulary its function raises for anything outside, the same shape as
  // the privilege words above. `pg_current_logfile` is the one that answers
  // rather than convicting: with no logging collector running there is no
  // file, and it returns NULL exactly as its no-argument sibling does.
  "pg_stat_have_stats(text,oid,bigint)": [
    ["'relation'", "'pg_class'::regclass::oid", "0::bigint"],
  ],
  "pg_stat_reset_shared(text)": [["'bgwriter'"]],
  "pg_current_logfile(text)": [["'stderr'"]],
  // A QUERY, which is what these three take rather than a string: `ts_stat`
  // wants one returning a single tsvector column and `ts_rewrite` one
  // returning two tsqueries. The corpus's `'SELECT'` is a legal query and
  // reaches neither shape.
  "ts_stat(text)": [["'SELECT ''a b''::tsvector'"]],
  "ts_stat(text,text)": [["'SELECT ''a:1A b:2B''::tsvector'", "'A'"]],
  "ts_rewrite(tsquery,text)": [
    ["'a'::tsquery", "'SELECT ''a''::tsquery, ''b''::tsquery'"],
  ],
  // A directory that EXISTS. `pg_ls_dir` raises for one that does not, and
  // every corpus text is a name rather than a path; `base` is in every data
  // directory PostgreSQL has ever laid out. The three-argument spelling
  // needed it more, not less: `missing_ok` turns the raise into an EMPTY
  // set, which is no more evidence of totality than the raise was.
  "pg_ls_dir(text)": [["'base'"]],
  "pg_ls_dir(text,boolean,boolean)": [["'base'", "false", "false"]],
  // A schema and a relation in it. These take the object by NAME in two
  // parts, so one text list cannot be both — the `has_column_privilege`
  // shape again.
  "pg_clear_relation_stats(text,text)": [["'pg_catalog'", "'pg_class'"]],
  "pg_clear_attribute_stats(text,text,text,boolean)": [
    ["'pg_catalog'", "'pg_class'", "'relname'", "false"],
  ],
  // No entry for the foreign-data-wrapper or foreign-server privileges: a
  // fresh PGlite has neither object, so the blocker is the DATABASE rather
  // than the corpus, and they stay pinned under the no-such-object reason.
  // The BOUNDED sleeps, which is the whole probed universe for those three
  // rows — every generated combination is refused above.
  "pg_sleep(double precision)": [["0::float8"]],
  "pg_sleep_for(interval)": [["'0'::interval"]],
  "pg_sleep_until(timestamp with time zone)": [["'2020-01-01Z'::timestamptz"]],
};

/**
 * The argument types to build a call from, given the declared `proargtypes`
 * and `provariadic`'s ELEMENT type (null when the row is not variadic).
 *
 * A VARIADIC declaration carries one parameter of the ARRAY type and
 * PostgreSQL wants the ELEMENTS — `json_extract_path(j, 'a', 'b')`, not
 * `json_extract_path(j, ARRAY['a','b'])`, which is a type error rather than a
 * call. Two elements stand for "some".
 *
 * Shared because it was written three times before it was written once: the
 * surface suite passed the array positionally and every variadic row raised
 * on every combination, and the totality probe appended the ARRAY type a
 * second time, which is the same mistake spelled differently.
 */
export const variadicArgTypes = (
  types: readonly string[],
  variadicElem: string | null,
): string[] =>
  variadicElem === null ? [...types] : [...types.slice(0, -1), variadicElem, variadicElem];

/**
 * The expression to run the NULL test on, given whether the call's result is
 * a COMPOSITE. Shared, because the alternative is what happened when it was
 * not: one suite cast and the other did not, and they disagreed about
 * `pg_stat_get_backend_subxact` within the same run.
 *
 * `IS NULL` on a composite is ROW-is-null — true when every field is null —
 * which is a different question from the one both suites ask. A record of
 * NULLs is a VALUE: the driver receives `(,)` for it, and a NOT NULL output
 * column holding one is not lying. Casting to text separates the two, since
 * a NULL composite casts to NULL and a composite of NULLs casts to its
 * rendering.
 */
export const nullTestExpr = (call: string, composite: boolean): string =>
  composite ? `(${call})::text` : call;

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

