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
    "'abc'",
    "'a '",
    "''",
    "'  '",
    "'NaN'",
    "'day'",
    "'base64'",
    "'hex'",
    "'escape'",
    "'NFC'",
    "'9'",
    "'UTC'",
    "'hour'",
    "'month'",
    "'[]'",
    // The PRIVILEGE words (2026-08-09): the `has_*_privilege` family and
    // `pg_has_role` reject anything else, which left 84 rows — the largest
    // block in raised-everywhere — probed in name only. They are worth the
    // seven values because the family SPLITS: `has_table_privilege(oid, …)`
    // answers NULL for an object that does not exist while
    // `has_database_privilege` answers a value, and no amount of staring at
    // the names predicts which.
    "'SELECT'",
    "'USAGE'",
    "'EXECUTE'",
    "'CREATE'",
    "'CONNECT'",
    "'SET'",
    "'MEMBER'",
    // A real RELATION name, for the same family's spellings that identify the
    // object by text rather than by OID — `has_table_privilege('abc', …)`
    // raises because no such relation exists. `pg_class` exists in every
    // PostgreSQL there has ever been.
    "'pg_class'",
    // A real GUC name and a real text-search parser name, each closing a row
    // that raises for anything else: `current_setting('abc')` does not exist,
    // and `ts_parse`/`ts_token_type` take a parser.
    "'search_path'",
    "'default'",
  ],
  'character varying': ["''::varchar", "'abc'::varchar", "'a '::varchar"],
  character: ["''::char", "'a'::char"],
  // `'r'` is an object-type abbreviation `acldefault` accepts; `'a'` is not
  // one, and alone it left that signature raising on every combination.
  '"char"': ['\'a\'::"char"', '\'r\'::"char"'],
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
  // The replication SLOT, ORIGIN and PUBLICATION names joined 2026-08-21:
  // the slot and origin families take their object as a `name` and raise for
  // one that does not exist, which is what left them unprobed. None of the
  // three can be mistaken for an encoding, which is the only bar this list
  // has (see the note above).
  name: [
    "''::name",
    "'abc'::name",
    "'postgres'::name",
    "'public'::name",
    "'probe_role'::name",
    "'probe_slot'::name",
    "'probe_lslot'::name",
    "'probe_origin'::name",
  ],

  // --- numbers: NaN and the infinities (scale/min_scale, and every float).
  smallint: ['1::smallint', '0::smallint', '(-1)::smallint', '32767::smallint'],
  // 1 leads: a zero or negative baseline makes `make_date`, `chr` and
  // `width_bucket`'s bucket count raise on every combination. 65 is a legal
  // code point for `chr`.
  integer: ['1', '0', '(-1)', '65', '2147483647'],
  bigint: ['1::bigint', '0::bigint', '(-1)::bigint', '9223372036854775807::bigint'],
  numeric: [
    '0::numeric',
    '(-1.5)::numeric',
    '1.4::numeric',
    '9007199254740993.4::numeric',
    "'NaN'::numeric",
    "'Infinity'::numeric",
  ],
  'double precision': [
    '1::float8',
    '0::float8',
    '(-1.5)::float8',
    "'NaN'::float8",
    "'Infinity'::float8",
    "'-Infinity'::float8",
  ],
  real: ['0::float4', "'NaN'::float4", "'Infinity'::float4"],
  money: ['0::money', '(-1)::money'],

  // --- date/time: the infinities are what removed extract/date_part.
  date: ["'2020-01-01'::date", "'infinity'::date", "'-infinity'::date"],
  'timestamp without time zone': [
    "'2020-01-01'::timestamp",
    "'infinity'::timestamp",
    "'-infinity'::timestamp",
  ],
  'timestamp with time zone': [
    "'2020-01-01Z'::timestamptz",
    "'infinity'::timestamptz",
    "'-infinity'::timestamptz",
  ],
  'time without time zone': ["'00:00'::time", "'23:59:59'::time"],
  'time with time zone': ["'00:00+00'::timetz"],
  // The infinite interval is PG17's addition and the same class as the
  // infinite timestamp: `date_part`/`extract` answer ±Infinity for the
  // monotonic fields and NULL for the rest.
  interval: ["'0'::interval", "'1 day'::interval", "'infinity'::interval", "'-infinity'::interval"],

  // --- containers: the EMPTY array is the array_position/cardinality class.
  bytea: ["''::bytea", "'\\x00'::bytea", "'abc'::bytea"],
  'integer[]': ["'{}'::int[]", 'ARRAY[1,2]'],
  'text[]': ["'{}'::text[]", "ARRAY['a','b']"],
  // A NON-EMPTY array and a null-VALUED key joined the four originals
  // (2026-08-09, from the set-returning probe): without them every json
  // expander either raised (`json_array_elements` rejects a non-array, and
  // `'[]'` emits nothing) or saw no JSON null — and a JSON null is exactly
  // what separates `json_each_text` from `json_each`, the `_text` half
  // turning it into a SQL NULL while the other returns it as a value.
  json: [
    "'null'::json",
    "'{}'::json",
    "'[]'::json",
    '\'{"a":1}\'::json',
    "'[1,null]'::json",
    '\'{"a":null}\'::json',
  ],
  jsonb: [
    "'null'::jsonb",
    "'{}'::jsonb",
    "'[]'::jsonb",
    '\'{"a":1}\'::jsonb',
    "'[1,null]'::jsonb",
    '\'{"a":null}\'::jsonb',
  ],
  // The CAST spellings matter: an uncast `ROW(1,2)` is decomposed by the
  // parser, so `ROW(1,2) *< ROW(1,2)` looks for `integer *< integer` and
  // raises — which left all six record-image comparison operators probed in
  // name only. The NULL-holding row is the corner of the pair.
  record: ['ROW(1,2)', 'ROW(1,2)::record', 'ROW(1,NULL)::record'],

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
  'int4range[]': ["'{}'::int4range[]", "ARRAY['[1,2)'::int4range]"],
  'int8range[]': ["'{}'::int8range[]", "ARRAY['[1,2)'::int8range]"],
  'numrange[]': ["'{}'::numrange[]", "ARRAY['[1,2)'::numrange]"],
  'daterange[]': ["'{}'::daterange[]", "ARRAY['empty'::daterange]"],
  'tsrange[]': ["'{}'::tsrange[]", "ARRAY['empty'::tsrange]"],
  'tstzrange[]': ["'{}'::tstzrange[]", "ARRAY['empty'::tstzrange]"],

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
  'real[]': ["'{0.1,0.2,0.4,1.0}'::float4[]", "'{}'::float4[]"],

  // --- bits, network, identifiers and the geometry the operators reach.
  boolean: ['true', 'false'],
  bit: ["B'0'", "B'1'"],
  'bit varying': ["B'0'::varbit", "B'101'::varbit"],
  inet: ["'127.0.0.1'::inet", "'::1'::inet"],
  cidr: ["'127.0.0.0/8'::cidr"],
  macaddr: ["'08:00:2b:01:02:03'::macaddr"],
  // The second value has FF:FE in the middle, which is what `macaddr(macaddr8)`
  // requires to narrow to six bytes — it raises for any other eight.
  macaddr8: ["'08:00:2b:01:02:03:04:05'::macaddr8", "'08:00:2b:ff:fe:01:02:03'::macaddr8"],
  uuid: ["'00000000-0000-0000-0000-000000000000'::uuid"],
  // 999999 names NOTHING, which is a corner in its own right: the privilege
  // family answers NULL for an object that is not there while raising for a
  // malformed one, and the two are only told apart by trying both.
  oid: ['0::oid', '1::oid', '999999::oid'],
  // A transaction id with no COMMIT TIMESTAMP recorded, which is what
  // pg_xact_commit_timestamp answers NULL for once track_commit_timestamp is
  // on. Xid 0 raises instead, so one value could not reach the distinction.
  xid: ["'0'::xid", "'3'::xid"],
  xid8: ["'0'::xid8"],
  cid: ["'0'::cid"],
  tid: ["'(0,1)'::tid"],
  pg_lsn: ["'0/0'::pg_lsn", "'FFFFFFFF/FFFFFFFF'::pg_lsn"],
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
  // One literal per TYPE whose input function takes a cstring (2026-08-21).
  // `'abc'`, `'42'` and `''` parse as a handful of types and as none of these,
  // which is what left 57 rows in the io-syntax group; an input function
  // RAISES on text it cannot read, so a vocabulary that misses a type's
  // syntax probes that type's row in name only. Growing this list rather
  // than writing 57 coherent calls, because a cstring good for `date_in` is
  // good in any cstring position — which is the shape a per-type corpus is
  // for.
  cstring: [
    "'abc'::cstring",
    "'42'::cstring",
    "''::cstring",
    "'t'::cstring",
    "'2020-01-01'::cstring",
    "'2020-01-01Z'::cstring",
    "'00:00'::cstring",
    "'00:00+00'::cstring",
    "'(0,0)'::cstring",
    "'(0,1)'::cstring",
    "'(1,2)'::cstring",
    "'((0,0),(1,1))'::cstring",
    "'((0,0),(1,1),(1,0))'::cstring",
    "'[(0,0),(1,1)]'::cstring",
    "'<(0,0),1>'::cstring",
    "'{1,1,0}'::cstring",
    "'127.0.0.1'::cstring",
    "'08:00:2b:01:02:03'::cstring",
    "'08:00:2b:01:02:03:04:05'::cstring",
    "'0/0'::cstring",
    "'00000000-0000-0000-0000-000000000000'::cstring",
    "'1:1:'::cstring",
    "'postgres=r/postgres'::cstring",
    "'{1,2}'::cstring",
    "'[1,2)'::cstring",
    "'{[1,2)}'::cstring",
  ],
  // The three- and six-element members are aggregate TRANSITION STATES, not
  // arrays of numbers: `float8_accum` wants (N, sum, sumX2) and
  // `float8_regr_accum` wants six, and every one of the twenty-four rows in
  // the aggstate group raised because the corpus could only offer it an
  // arbitrary float8[]. A populated state sits beside a zeroed one because
  // `float8_corr` divides by N.
  'double precision[]': [
    "'{}'::float8[]",
    "'{1,2}'::float8[]",
    "'{0,0,0}'::float8[]",
    "'{2,3,0}'::float8[]",
    "'{0,0,0,0,0,0}'::float8[]",
    "'{2,1,1,1,1,1}'::float8[]",
  ],
  // The two-element members are the int accumulators' (count, sum) state.
  'bigint[]': ["'{}'::int8[]", "'{1,2}'::int8[]", "'{0,0}'::int8[]", "'{2,4}'::int8[]"],
  'oid[]': ["'{}'::oid[]", "'{1,2}'::oid[]"],
  // A type MODIFIER list, which is what the ten `*typmodin` rows take: one
  // number for a length or precision, two for numeric's precision and scale.
  'cstring[]': ["'{}'::cstring[]", "'{a}'::cstring[]", "'{8}'::cstring[]", "'{10,2}'::cstring[]"],
  '"char"[]': ['ARRAY[\'a\'::"char"]'],
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
  // The index, partition and plain-relation members joined with the probe
  // schema: `brin_summarize_new_values` and its siblings raise "is not an
  // index" for anything else, and `pg_partition_tree` returns NO ROWS for a
  // relation that is neither a partition nor partitioned — which reads
  // exactly like a raise and is just as far from a verdict.
  regclass: [
    "'pg_class'::regclass",
    "'probe_seq'::regclass",
    "'probe_seq_unused'::regclass",
    '999999::oid::regclass',
    "'probe_rel'::regclass",
    "'probe_brin'::regclass",
    "'probe_gin'::regclass",
    "'probe_part'::regclass",
    "'probe_part1'::regclass",
  ],
  regtype: ["'integer'::regtype"],
  regproc: ["'pg_backend_pid'::regproc"],
  regprocedure: ["'upper(text)'::regprocedure"],
  regoper: ["'||/'::regoper"],
  regoperator: ["'+(integer,integer)'::regoperator"],
  regnamespace: ["'pg_catalog'::regnamespace"],
  regrole: ["'postgres'::regrole"],
  regcollation: ['\'"C"\'::regcollation'],
  regdictionary: ["'simple'::regdictionary"],
  // The second member has IN-PROGRESS xids, which is the only thing
  // `pg_snapshot_xip`/`txid_snapshot_xip` emit — over the empty one they
  // return no rows, and no row is not a value.
  pg_snapshot: ["'1:1:'::pg_snapshot", "'1:3:1,2'::pg_snapshot"],
  txid_snapshot: ["'1:1:'::txid_snapshot", "'1:3:1,2'::txid_snapshot"],

  aclitem: ["makeaclitem('postgres'::regrole, 'postgres'::regrole, 'SELECT', true)"],
  'aclitem[]': ["ARRAY[makeaclitem('postgres'::regrole, 'postgres'::regrole, 'SELECT', true)]"],
}

/**
 * Polymorphic parameters have no type of their own, so every one of them in a
 * signature is instantiated together from one FAMILY. Instantiating them
 * independently would spend most combinations on calls PostgreSQL rejects for
 * type mismatch — `array_append(ARRAY[1,2], 'x')` — which the probe would
 * record as an error and skip, quietly losing the coverage it was after.
 */
export const POLYMORPHIC_FAMILIES: Record<string, string>[] = [
  {
    anyelement: '1',
    anynonarray: '1',
    anycompatible: '1',
    anycompatiblenonarray: '1',
    anyarray: 'ARRAY[1,2]',
    anycompatiblearray: 'ARRAY[1,2]',
    '"any"': '1',
    anyenum: "'a'::probe_enum",
    anyrange: "'[1,2)'::int4range",
    anymultirange: "'{[1,2)}'::int4multirange",
    anycompatiblerange: "'[1,2)'::int4range",
    anycompatiblemultirange: "'{[1,2)}'::int4multirange",
  },
  {
    anyelement: "'x'",
    anynonarray: "'x'",
    anycompatible: "'x'",
    anycompatiblenonarray: "'x'",
    anyarray: "'{}'::text[]",
    anycompatiblearray: "'{}'::text[]",
    '"any"': "'x'",
    anyenum: "'b'::probe_enum",
    anyrange: "'empty'::int4range",
    anymultirange: "'{}'::int4multirange",
    anycompatiblerange: "'empty'::int4range",
    anycompatiblemultirange: "'{}'::int4multirange",
  },
  // A third family whose ARRAY holds a NULL ELEMENT (2026-08-09). The array
  // is still a non-null argument, so this is a totality question and not a
  // strictness one — and it is the only way to reach `unnest`'s NULL row,
  // which a hand fixture had witnessed while the probe read the signature as
  // no-null-found. The scalar members repeat family 1 so the family stays a
  // legal instantiation for signatures mixing element and array parameters.
  {
    anyelement: '1',
    anynonarray: '1',
    anycompatible: '1',
    anycompatiblenonarray: '1',
    anyarray: 'ARRAY[1,NULL]',
    anycompatiblearray: 'ARRAY[1,NULL]',
    '"any"': '1',
    anyenum: "'a'::probe_enum",
    anyrange: "'[1,2)'::int4range",
    anymultirange: "'{[1,2)}'::int4multirange",
    anycompatiblerange: "'[1,2)'::int4range",
    anycompatiblemultirange: "'{[1,2)}'::int4multirange",
  },
]

export const POLYMORPHIC = new Set(Object.keys(POLYMORPHIC_FAMILIES[0]!))

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
export const MAX_COMBOS = 2048

/**
 * Calls are written `pg_catalog.name(...)`, which is not decoration: several
 * of these names are GRAMMAR, and the bare spelling is a syntax error.
 * `position('a','b')`, `overlay(a,b,1)`, `current_user()` and
 * `session_user()` all raise unqualified — the parser wants `position(a IN b)`
 * and treats the last two as keywords — so six signatures raised on every
 * combination and went unprobed until the qualifier went on. It is also the
 * more faithful spelling: these tables are about pg_catalog functions, and
 * the walk consults them for exactly that.
 */
export const qualify = (name: string): string =>
  `pg_catalog.${/^[a-z_][a-z0-9_]*$/.test(name) ? name : JSON.stringify(name)}`

/** The cross product, capped — beyond the cap, vary one argument at a time. */
export function combinations(valueLists: string[][]): { combos: string[][]; capped: boolean } {
  const total = valueLists.reduce((n, l) => n * l.length, 1)
  if (total <= MAX_COMBOS) {
    let combos: string[][] = [[]]
    for (const list of valueLists) combos = combos.flatMap((c) => list.map((v) => [...c, v]))
    return { combos, capped: false }
  }
  // One-at-a-time from a baseline, plus the diagonals — every argument taking
  // its i-th value together, which is what reaches the corners a
  // one-at-a-time sweep cannot (`to_number('', '')` needs both).
  const baseline = valueLists.map((l) => l[0]!)
  const combos: string[][] = [baseline]
  valueLists.forEach((list, i) => {
    for (const v of list.slice(1)) {
      const c = [...baseline]
      c[i] = v
      combos.push(c)
    }
  })
  const widest = Math.max(...valueLists.map((l) => l.length))
  for (let i = 1; i < widest; i++) combos.push(valueLists.map((l) => l[Math.min(i, l.length - 1)]!))
  return { combos, capped: true }
}
