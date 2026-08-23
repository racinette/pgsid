// ---------------------------------------------------------------------------
// The builtin TOTALITY tables — pure data, lifted verbatim out of
// nullability-walk.ts (2026-08-23) because 1368 lines of identifiers were 9%
// of that file and none of it is walk logic.
//
// Nothing is reorganised, renamed or merged. The three tables stay separate
// for the reason SWEPT_TOTAL_SIGNATURES' own comment gives: the curated ones
// are an ARGUMENT, name by name, and the swept one is a machine result. They
// are held to execution by the totality probe either way
// (tests/unit/query/totality-probe.test.ts), which is what makes them safe to
// keep as data rather than as prose.
//
// `nullability-walk.ts` re-exports all three, so every existing import site
// is unchanged.
// ---------------------------------------------------------------------------

/**
 * Built-ins that are total over non-null arguments: non-null in, non-null out.
 * Raising on bad input still counts — an error is not a NULL.
 */
export const STRICT_TOTAL_BUILTINS = new Set([
  // Math
  "abs", "ceil", "ceiling", "floor", "round", "trunc", "sign", "sqrt", "cbrt",
  "exp", "ln", "log", "log10", "power", "mod", "div", "gcd", "lcm",
  "degrees", "radians", "sin", "cos", "tan", "asin", "acos", "atan", "atan2",
  "width_bucket",
  // String. Six former members failed the table's own admission criterion
  // and are out (adversarial finding 7, all measured 2026-08-04):
  // `substring` — the FROM-regex form is NULL on no match, and the total
  // positional form is indistinguishable at name level (`substr`, which is
  // positional-only, stays); `to_number('','')` and `to_char(<datetime>,'')`
  // are NULL (the numeric/int to_char forms return '' and are total, but
  // name-level dispatch cannot tell); `scale` and `min_scale` of NaN are
  // NULL; `array_position` is NULL when the element is absent.
  //
  // `lower` and `upper` left for the SAME reason, found by the curated-table
  // auditor rather than by hand: each has a total `(text)` form AND a
  // `(anyrange)`/`(anymultirange)` form that returns NULL for an EMPTY range
  // (measured — `lower('empty'::int4range)` is NULL, and the engine claimed
  // notNull). Name-level dispatch cannot tell the two apart, so the text
  // meaning loses its precision with the range one. Recovering it needs the
  // ARGUMENT's type, which this rule deliberately does not read; the register
  // records that as the recovery path.
  "initcap", "length", "char_length", "character_length",
  "octet_length", "bit_length", "md5", "ascii", "chr", "repeat", "reverse",
  "substr", "replace", "translate", "overlay",
  // `trim` was here and is gone: PostgreSQL's grammar rewrites every TRIM
  // spelling to `pg_catalog.btrim` before the walk sees it (measured), and
  // there is no pg_catalog.trim for a quoted call to reach either.
  "ltrim", "rtrim", "btrim", "lpad", "rpad",
  "split_part", "strpos", "position", "left", "right", "starts_with",
  "quote_ident", "quote_literal", "quote_nullable",
  "to_date", "to_timestamp", "to_hex",
  "encode", "decode", "sha256",
  // Arrays / rows
  "array_to_string", "string_to_array", "cardinality", "array_append",
  "array_prepend", "array_cat", "array_remove",
  // Date / time. `extract`/`date_part` (one function, two names) are OUT
  // (adversarial-2 finding 11, measured): for an infinite timestamp,
  // timestamptz, date or interval they return ±Infinity only for the
  // monotonically-increasing fields and NULL for every other one —
  // month/day/hour of 'infinity' are NULL, so the pair fails the table's
  // admission criterion on an input CLASS the first sweep's finite probes
  // never tried.
  "date_trunc", "age", "justify_days", "justify_hours",
  "justify_interval", "make_date", "make_time", "make_timestamp",
  "make_timestamptz", "make_interval", "isfinite",
  // JSON
  "to_json", "to_jsonb", "jsonb_typeof", "json_typeof", "jsonb_array_length",
  "json_array_length", "row_to_json", "jsonb_strip_nulls", "jsonb_pretty",
  // Misc
  "num_nulls", "num_nonnulls", "pg_typeof",
  // Sequences (2026-08-20, docs/sqlc-disagreements.md `nextval/GetNextID`).
  // VOLATILE by nature — the side effect is the point — which is why they are
  // outside the immutable-only totality capture and had no verdict at all.
  // Volatility is not totality: each either RAISES (a sequence that does not
  // exist, `currval` before `nextval` in the session, a value past the type's
  // range) or returns a bigint, and a raise is not a NULL — the same admission
  // criterion the rest of this table is held to. STRICT and measured NULL on a
  // NULL argument (`nextval(NULL::regclass)`), so strict-total is the correct
  // set and `ALWAYS_NOT_NULL_BUILTINS` would be wrong. `lastval` takes no
  // arguments, so the strict premise is vacuous and it belongs here too.
  "nextval", "currval", "setval", "lastval",
  // Wave-4 batch, each measured 2026-08-01 with adversarial non-null inputs
  // (no-match regexps, empty arrays, missing jsonb paths — jsonb_set on a
  // scalar target RAISES, which counts: an error is not a NULL).
  "pow", "factorial", "sinh", "cosh", "tanh", "asinh", "acosh", "atanh",
  "trim_scale", "bit_count", "normalize",
  "regexp_like", "regexp_count", "regexp_replace", "regexp_split_to_array",
  "array_fill", "array_positions", "trim_array",
  "jsonb_set", "jsonb_insert",
  // ---------------------------------------------------------------------
  // The work-list batch (2026-08-09, docs/builtin-surface-classification.md). Each
  // name below had EVERY one of its pg_catalog rows in `no-null-found` —
  // claimed nullable with no witness across the corner corpus — and each was
  // then convicted individually on input classes the corpus does not carry.
  // A raise is not a NULL, and these raise freely: `gamma(0)` overflows,
  // `asind(2)` is out of range, `parse_ident('')` rejects the string,
  // `date_bin` rejects a zero stride, `inet_merge` rejects mixed families.
  // The totality probe holds every row of every name from here on.
  // ---------------------------------------------------------------------
  // Math: the degree-argument trig (PG14) and the special functions (PG18).
  "erf", "erfc", "gamma", "lgamma", "cot", "cotd",
  "sind", "cosd", "tand", "asind", "acosd", "atand", "atan2d",
  // String. `regexp_instr` answers 0 for no match and for a subexpression
  // that did not participate — the position where its `regexp_substr`
  // sibling answers NULL, which is why that one is witnessed and not here.
  "parse_ident", "unistr", "casefold", "to_bin", "to_oct", "regexp_instr",
  // Date/time. `timezone` is what `AT TIME ZONE` parses to, and `overlaps`
  // what the OVERLAPS grammar does, so both are ordinary application SQL
  // reaching this dispatch under a name nobody writes. Infinite timestamps
  // and infinite intervals are values through all of them (measured) — the
  // class that removed `extract`/`date_part` does not touch these.
  "timezone", "overlaps", "date_bin", "date_add", "date_subtract",
  // JSON. `json_strip_nulls` is the missing half of `jsonb_strip_nulls`
  // above; `jsonb_set_lax`'s NULL routes are all reached by a NULL
  // `new_value`, which is nullable input and not a totality question.
  "json_object", "jsonb_object", "json_strip_nulls", "jsonb_set_lax",
  // Arrays. An array holding NULL ELEMENTS is still a non-null array, and
  // each of these returns one (`array_to_json(ARRAY[NULL]::int[])` is
  // `[null]`, a JSON value).
  "array_replace", "array_reverse", "array_sort", "array_to_json",
  // Ranges: the predicates, over the empty range and the empty multirange
  // that removed `lower`/`upper`. These read the bound, they do not return
  // it, so the empty range is a `false` rather than a NULL.
  "isempty", "lower_inc", "upper_inc", "lower_inf", "upper_inf", "range_merge",
  // Ranges, constructing. A lower bound above the upper one raises; an
  // empty result is the EMPTY range, which is a value. The multirange
  // constructors are deliberately NOT here — their rows are VARIADIC over a
  // range-array the corpus has no generator for, so the claim would be
  // unprobed on the rows that matter.
  "int4range", "int8range", "numrange", "daterange", "tsrange", "tstzrange",
  "multirange",
  // Network.
  "abbrev", "broadcast", "family", "host", "hostmask", "inet_merge",
  "inet_same_family", "masklen", "netmask", "network", "set_masklen",
  // ---------------------------------------------------------------------
  // CAST implementation functions (2026-08-09, from the `cast` role sweep).
  // These are what `x::type` runs, and the walk now resolves a TypeCast
  // through pg_cast to the verdict tables — so an unclaimed cast function
  // costs `n::integer` its notNull, and claiming the total ones is what
  // keeps the soundness fix from being a precision regression. Every row of
  // every name here was probed by tests/probe/cluster-sweep.ts; the names
  // whose rows DISAGREE are signature-keyed below instead, which is most of
  // the numeric family — `int4(numeric)` is total and `int4(jsonb)` is NULL.
  // ---------------------------------------------------------------------
  "bit", "box", "bpchar", "bytea", "char", "cidr", "circle", "date", "interval", "lseg", "macaddr8", "money", "name", "oid", "path", "point", "polygon", "regclass", "timestamp", "timestamptz", "varbit", "varchar", "xid", "xml",
  // Bits and bytes — out-of-range indexes raise rather than answering NULL.
  "get_bit", "get_byte", "set_bit", "set_byte",
  // ---------------------------------------------------------------------
  // The no-generator triage's harvest (2026-08-09, same day): full-text
  // search was unprobed for want of a `regconfig` value, not for want of a
  // verdict. Empty input is the class to beat here and every one of these
  // survives it — `to_tsvector('english','')` is the empty tsvector,
  // `plainto_tsquery('  ')` the empty tsquery, `ts_rank` over an empty
  // tsvector is 0 — while a malformed tsquery raises (`to_tsquery('')`).
  // ---------------------------------------------------------------------
  "to_tsvector", "to_tsquery", "plainto_tsquery", "phraseto_tsquery",
  "websearch_to_tsquery", "json_to_tsvector", "jsonb_to_tsvector",
  "ts_headline", "ts_rank", "ts_rank_cd",
  "setweight", "strip", "numnode", "querytree",
  "tsvector_to_array", "array_to_tsvector",
  // jsonpath, the ARRAY-returning half only. Its siblings are witnessed and
  // stay out: under `silent => true` a STRICT path error is suppressed into
  // a NULL, which takes `jsonb_path_exists`, `jsonb_path_match` and
  // `jsonb_path_query_first` out permanently. These two answer `[]` for the
  // same input, which is a value.
  "jsonb_path_query_array", "jsonb_path_query_array_tz",
  // ---------------------------------------------------------------------
  // The third batch (2026-08-09): what the first two skipped that is still
  // reachable from an application query. `sha256` was already here and its
  // three siblings were not, which is the shape of most of this group —
  // a claimed name with unclaimed relatives.
  // ---------------------------------------------------------------------
  "sha224", "sha384", "sha512", "crc32", "crc32c",
  // `is_normalized` is the predicate half of the claimed `normalize`.
  "is_normalized", "unicode_assigned", "unicode_version", "icu_unicode_version",
  // XML: the constructors escape their input rather than rejecting it, and
  // the three well-formedness predicates answer false rather than NULL.
  "xmlcomment", "xmltext",
  "xml_is_well_formed", "xml_is_well_formed_content", "xml_is_well_formed_document",
  // What `LIKE … ESCAPE` and `SIMILAR TO` rewrite to. Grammar, like `btrim`
  // and `position` above, so the name is reached by SQL nobody wrote.
  "like_escape", "similar_escape", "similar_to_escape",
  // ---------------------------------------------------------------------
  // SET-RETURNING names (2026-08-09). Their claim is about every EMITTED
  // row — zero rows is no row at all rather than a NULL — and both probes
  // now ask exactly that, through `srfprobe`: any row, any output column.
  // The construction is the whole story and probe-values.ts carries it
  // (target list, not FROM; PGlite materialises a function scan and the
  // corpus's own bigint bound exhausts memory in that position).
  //
  // The `_text` json expanders are the sharp exclusion: they turn a JSON
  // null into a SQL NULL where their non-`_text` twins return it as a
  // value, so `json_each` is here and `json_each_text` is witnessed.
  // `unnest` stays out entirely — an array holding a NULL element, and a
  // tsvector lexeme with no positions, are both witnessed.
  // ---------------------------------------------------------------------
  "generate_series", "generate_subscripts",
  "regexp_split_to_table", "regexp_matches",
  "json_object_keys", "jsonb_object_keys",
  "json_each", "jsonb_each",
  "json_array_elements", "jsonb_array_elements",
  "jsonb_path_query", "jsonb_path_query_tz",
]);

/**
 * SIGNATURE-keyed strict-total verdicts for rows whose NAME cannot carry
 * the claim — the recovery half of the removals recorded above, and the
 * operator side's `NON_TOTAL_OPERATOR_SIGNATURES` in the other direction.
 * A key is `name(arg,arg)` in format_type renderings, matching the
 * signature capture; the typed dispatch reads it per SURVIVOR, so
 * `lower(<text column>)` claims notNull again while `lower(<range>)` keeps
 * reading nullable — the charter's founding case. Grows only with
 * per-signature evidence (the totality probe holds each entry to
 * execution); the other removed names (`substring`, `to_char`, `extract`,
 * …) wait for the witness corpus to earn theirs.
 */
export const STRICT_TOTAL_BUILTIN_SIGNATURES: ReadonlySet<string> = new Set([
  "lower(text)",
  "upper(text)",
  // The POSITIONAL substring forms (2026-08-09). `substring` left the name
  // table because the FROM-regex spellings — `substring(text,text)` and
  // `substring(text,text,text)` — are NULL on no match, and they are
  // witnessed. The offset/length forms are total for every operand type:
  // an offset past the end gives '', a negative length raises.
  "substring(text,integer)",
  "substring(text,integer,integer)",
  "substring(bytea,integer)",
  "substring(bytea,integer,integer)",
  "substring(bit,integer)",
  "substring(bit,integer,integer)",
  // The NUMERIC to_char forms (2026-08-09) — the recovery the removal note
  // above predicted. `to_char(<datetime>,'')` and `to_char(<interval>,'')`
  // are NULL and witnessed; the number forms answer '' for an empty format
  // and a value for every corner of their input (NaN, ±Infinity, 'RN',
  // 'EEEE'), raising on a malformed pattern rather than answering NULL.
  "to_char(numeric,text)",
  "to_char(integer,text)",
  "to_char(bigint,text)",
  "to_char(double precision,text)",
  "to_char(real,text)",
  // The TIME rows of extract/date_part (2026-08-09). The pair left the name
  // table over the infinities, and its date, timestamp, timestamptz and
  // interval rows are all witnessed — but `time` and `timetz` HAVE no
  // infinity, so every unit those two types accept answers a value and every
  // other unit raises ("unit \"month\" not supported for type time without
  // time zone"). `extract(hour FROM <time column>)` recovers its notNull.
  "date_part(text,time without time zone)",
  "date_part(text,time with time zone)",
  "extract(text,time without time zone)",
  "extract(text,time with time zone)",
  // The cast functions whose NAME cannot carry the claim (2026-08-09):
  // the numeric conversions are total from every source but `jsonb`, where
  // a JSON null becomes a SQL NULL, and the time conversions are total from
  // every source but a timestamp, where an infinite one has no time of day.
  "bool(integer)",
  "datemultirange(daterange)",
  "float4(bigint)",
  "float4(double precision)",
  "float4(integer)",
  "float4(numeric)",
  "float4(smallint)",
  "float8(bigint)",
  "float8(integer)",
  "float8(numeric)",
  "float8(real)",
  "float8(smallint)",
  "int2(bigint)",
  "int2(bytea)",
  "int2(double precision)",
  "int2(integer)",
  "int2(numeric)",
  "int2(real)",
  'int4("char")',
  "int4(bigint)",
  "int4(bit)",
  "int4(boolean)",
  "int4(bytea)",
  "int4(double precision)",
  "int4(numeric)",
  "int4(real)",
  "int4(smallint)",
  "int4multirange(int4range)",
  "int8(bit)",
  "int8(bytea)",
  "int8(double precision)",
  "int8(integer)",
  "int8(numeric)",
  "int8(oid)",
  "int8(real)",
  "int8(smallint)",
  "int8multirange(int8range)",
  "numeric(bigint)",
  "numeric(double precision)",
  "numeric(integer)",
  "numeric(money)",
  "numeric(numeric,integer)",
  "numeric(real)",
  "numeric(smallint)",
  "nummultirange(numrange)",
  'text("char")',
  "text(boolean)",
  "text(character)",
  "text(inet)",
  "text(name)",
  "time(interval)",
  "time(time with time zone)",
  "time(time without time zone,integer)",
  "timetz(time with time zone,integer)",
  "timetz(time without time zone)",
  "tsmultirange(tsrange)",
  "tstzmultirange(tstzrange)",
  // The two-argument `string_to_table` (2026-08-09). Its three-argument row
  // takes a null_string and emits SQL NULL for every field equal to it —
  // `string_to_table('a,,b', ',', 'a')` — which is witnessed and bars the
  // NAME. Splitting without one yields the empty string where the input was
  // empty, never a NULL.
  "string_to_table(text,text)",
]);


/**
 * Signatures convicted by `tests/probe/cluster-sweep.ts`, role by role — the
 * machine-swept half of the totality surface, kept SEPARATE from the curated
 * tables above on purpose.
 *
 * Those tables are an argument: each name is there because somebody reasoned
 * about it, and the comments carry why `lower` left and why `substring` is
 * signature-keyed. Merging a thousand rows nobody argued about individually
 * would bury that. These were established the other way — every ROW of a
 * catalog ROLE probed against the corner corpus plus the sweep's degenerate
 * staging values, with the roles (`pg_amproc.amproc`, `pg_operator.oprcode`,
 * `pg_cast.castfunc`, `pg_type.typoutput`, `pg_aggregate.aggtransfn`,
 * `pg_range.rngcanonical`, and what none of those claim) partitioning the
 * surface so "every row swept" means something.
 *
 * SIGNATURE-keyed without exception, even where every row of a name qualifies:
 * a name-level claim would re-import the family-resemblance reasoning the
 * sweep exists to refute — `json_each` is total and `json_each_text` is NULL,
 * `int4(numeric)` is total and `int4(jsonb)` is NULL.
 *
 * The totality probe holds every row here by execution, exactly as it holds
 * the curated ones; a row that starts answering NULL fails the run.
 */
export const SWEPT_TOTAL_SIGNATURES: ReadonlySet<string> = new Set([
  // The privilege rows COHERENT_CALLS unblocked (2026-08-09): a role, an
  // object of the right kind and a privilege that kind accepts, which no
  // per-type choice can produce past the combination cap. Their
  // OID-taking siblings answer NULL for an object that does not exist and
  // are witnessed; these name objects that do.
  "has_column_privilege(name,text,smallint,text)",
  "has_column_privilege(name,text,text,text)",
  "has_column_privilege(oid,text,smallint,text)",
  "has_column_privilege(oid,text,text,text)",
  "has_column_privilege(text,smallint,text)",
  "has_column_privilege(text,text,text)",
  "has_database_privilege(name,text,text)",
  "has_database_privilege(oid,text,text)",
  "has_database_privilege(text,text)",
  "has_function_privilege(oid,text,text)",
  "has_language_privilege(name,text,text)",
  "has_language_privilege(oid,text,text)",
  "has_language_privilege(text,text)",
  "has_schema_privilege(name,text,text)",
  "has_schema_privilege(oid,text,text)",
  "has_schema_privilege(text,text)",
  // The SEQUENCE rows joined them 2026-08-21. They were pinned unprobeable
  // because a fresh PGlite has no sequence, and `PROBE_OBJECTS_SQL` — which
  // creates one — did not reach the classifying suite until the volatile
  // sweep took it there.
  "has_sequence_privilege(name,text,text)",
  "has_sequence_privilege(oid,text,text)",
  "has_sequence_privilege(text,text)",
  "has_tablespace_privilege(name,text,text)",
  "has_tablespace_privilege(oid,text,text)",
  "has_tablespace_privilege(text,text)",
  // The type I/O entry points, reachable once `cstring` had a generator
  // (2026-08-09). An input function RAISES on text it cannot read and
  // returns a value on text it can; neither is a NULL.
  "bit_in(cstring,oid,integer)",
  "bpcharin(cstring,oid,integer)",
  "byteain(cstring)",
  "cash_in(cstring)",
  "charin(cstring)",
  "cidin(cstring)",
  "cidr_in(cstring)",
  "cstring_in(cstring)",
  "cstring_out(cstring)",
  "cstring_send(cstring)",
  "float4in(cstring)",
  "float8in(cstring)",
  "int2in(cstring)",
  "int2vectorin(cstring)",
  "int4in(cstring)",
  "int8in(cstring)",
  "interval_in(cstring,oid,integer)",
  "json_in(cstring)",
  "jsonb_in(cstring)",
  "jsonpath_in(cstring)",
  "namein(cstring)",
  "numeric_in(cstring,oid,integer)",
  "oidin(cstring)",
  "oidvectorin(cstring)",
  "regclassin(cstring)",
  "regcollationin(cstring)",
  "regconfigin(cstring)",
  "regdictionaryin(cstring)",
  "regnamespacein(cstring)",
  "regoperatorin(cstring)",
  "regoperin(cstring)",
  "regprocedurein(cstring)",
  "regprocin(cstring)",
  "regrolein(cstring)",
  "regtypein(cstring)",
  "textin(cstring)",
  "tsqueryin(cstring)",
  "tsvectorin(cstring)",
  "unknownin(cstring)",
  "varbit_in(cstring,oid,integer)",
  "varcharin(cstring,oid,integer)",
  "void_in(cstring)",
  "xid8in(cstring)",
  "xidin(cstring)",
  "xml_in(cstring)",
  // Unblocked by the generators the no-generator pin forced a decision
  // about (2026-08-09) — reg* object references, xml, the snapshot
  // types, cstring and float8/int8 arrays. Their unprobeability had no
  // reason anybody could state, which is what the pin asks for.
  "anycompatiblemultirange_out(anycompatiblemultirange)",
  // `int8_avg(bigint[])` and `int2int4_sum(bigint[])` were HERE and are gone
  // (2026-08-21). Both take an aggregate TRANSITION STATE of (count, sum)
  // and answer NULL when the count is zero — an average over nothing. The
  // sweep that claimed them ran against an arbitrary bigint[], which is not
  // a state at all; a zeroed accumulator joined probe-values.ts with the
  // aggstate group and falsified them the same run.
  "int2_avg_accum(bigint[],smallint)",
  "int2_avg_accum_inv(bigint[],smallint)",
  "int2vectorout(int2vector)",
  "int2vectorsend(int2vector)",
  "int4_avg_accum(bigint[],integer)",
  "int4_avg_accum_inv(bigint[],integer)",
  "pg_basetype(regtype)",
  "pg_column_is_updatable(regclass,smallint,boolean)",
  // `pg_relation_filenode`, `pg_relation_filepath` and
  // `pg_relation_is_publishable` were HERE and are gone (2026-08-21). They
  // answer NULL for a regclass whose relation does not exist — `try_relation_open`
  // returns nothing and each has a `PG_RETURN_NULL` for it — and the sweep
  // that convicted them ran against a regclass vocabulary in which every
  // object existed. A missing-relation regclass joined probe-values.ts with
  // the volatile bucket and the totality probe falsified all three the same
  // run. The two rows left below survive it: they answer `false` and `0`
  // where these answer NULL.
  "pg_relation_is_updatable(regclass,boolean)",
  "pg_snapshot_out(pg_snapshot)",
  "pg_snapshot_send(pg_snapshot)",
  "pg_snapshot_xmax(pg_snapshot)",
  "pg_snapshot_xmin(pg_snapshot)",
  "pg_visible_in_snapshot(xid8,pg_snapshot)",
  "regclassout(regclass)",
  "regclasssend(regclass)",
  "regcollationout(regcollation)",
  "regcollationsend(regcollation)",
  "regdictionaryout(regdictionary)",
  "regdictionarysend(regdictionary)",
  "regnamespaceout(regnamespace)",
  "regnamespacesend(regnamespace)",
  "regoperatorout(regoperator)",
  "regoperatorsend(regoperator)",
  "regoperout(regoper)",
  "regopersend(regoper)",
  "regprocedureout(regprocedure)",
  "regproceduresend(regprocedure)",
  "regprocout(regproc)",
  "regprocsend(regproc)",
  "regroleout(regrole)",
  "regrolesend(regrole)",
  "regtypeout(regtype)",
  "regtypesend(regtype)",
  "table_to_xml(regclass,boolean,boolean,text)",
  "table_to_xml_and_xmlschema(regclass,boolean,boolean,text)",
  "table_to_xmlschema(regclass,boolean,boolean,text)",
  "text(xml)",
  "ts_filter(tsvector,\"char\"[])",
  "ts_lexize(regdictionary,text)",
  "txid_snapshot_out(txid_snapshot)",
  "txid_snapshot_send(txid_snapshot)",
  "txid_snapshot_xmax(txid_snapshot)",
  "txid_snapshot_xmin(txid_snapshot)",
  "txid_visible_in_snapshot(bigint,txid_snapshot)",
  "xml_out(xml)",
  "xml_send(xml)",
  "xmlconcat2(xml,xml)",
  "xmlexists(text,xml)",
  "xpath(text,xml)",
  "xpath(text,xml,text[])",
  "xpath_exists(text,xml)",
  "xpath_exists(text,xml,text[])",
  // Reached once the corpus carried a real GUC name, a real text-search
  // parser and a macaddr8 with FF:FE in the middle (2026-08-09).
  // `current_setting(text)` raises for a setting that does not exist —
  // its two-argument form with `missing_ok` is the one that answers
  // NULL, and that row is witnessed.
  "current_setting(text)", "macaddr(macaddr8)",
  "ts_parse(text,text)", "ts_token_type(text)",
  // The VARIADIC rows, reachable once the surface probe passed ELEMENTS
  // rather than an array (2026-08-09). A multirange constructor always
  // builds a multirange — the empty range makes an empty one, not a
  // NULL — and `jsonb_delete` returns the object minus the keys, or
  // RAISES on a scalar target. Their neighbours in the same fix went the
  // other way: all four `*_extract_path*` rows are NULL for a missing
  // path and are now witnessed by the machine.
  "int4multirange(int4range[])", "int8multirange(int8range[])",
  "nummultirange(numrange[])", "datemultirange(daterange[])",
  "tsmultirange(tsrange[])", "tstzmultirange(tstzrange[])",
  "jsonb_delete(jsonb,text[])",
  // The eight `has_*_privilege(name, oid, text)` rows were HERE and are gone
  // (2026-08-21). They answer NULL for an object that does not exist, and
  // every probe that ever ran them asked as the role PGlite runs as — a
  // SUPERUSER, whose privilege check short-circuits to true before the
  // object is looked up at all. The probe database has a non-superuser
  // `probe_role` now and the corpus an OID naming nothing; with either
  // grantee all eight are falsified, and the sibling spellings survive
  // because a missing object named by TEXT raises instead.
  "has_any_column_privilege(name,text,text)",
  "has_any_column_privilege(oid,text,text)",
  "has_any_column_privilege(text,text)",
  "has_function_privilege(name,text,text)",
  "has_parameter_privilege(name,text,text)",
  "has_table_privilege(name,text,text)",
  "has_table_privilege(oid,text,text)",
  "has_table_privilege(text,text)",
  "has_type_privilege(name,text,text)",
  "has_type_privilege(oid,text,text)",
  "pg_has_role(name,name,text)",
  "pg_has_role(name,oid,text)",
  "pg_has_role(name,text)",
  "pg_has_role(oid,name,text)",
  // `pg_input_is_valid` answers a plain boolean; `row_security_active`
  // answers one for a relation that exists and for one that does not.
  // `pg_input_error_info` joins them, and the reason it nearly did not is
  // worth the line: for VALID input it returns a record whose fields are
  // all NULL, and `(record) IS NULL` is ROW-is-null, so it reads as a
  // witness. The driver receives `(,,,)` — a value. The surface probe now
  // casts a composite result to text before the NULL test for exactly
  // this reason.
  "pg_input_error_info(text,text)",
  // The same composite trap as its neighbour above: a record of NULLs for
  // a backend that does not exist, which `IS NULL` calls NULL and the
  // driver receives as `(,)`.
  "pg_stat_get_backend_subxact(integer)",
  "pg_input_is_valid(text,text)",
  "row_security_active(oid)",
  "row_security_active(text)",
  // The privilege predicates that answer a VALUE for an object that does
  // not exist (2026-08-09). Their siblings answer NULL for the same input
  // and are witnessed — `has_table_privilege(oid, …)` against
  // `has_database_privilege(oid, …)` — which is why this family is keyed
  // row by row and not by any rule about its names.
  "has_database_privilege(oid,text)",
  "has_foreign_data_wrapper_privilege(oid,text)",
  "has_function_privilege(oid,text)",
  "has_function_privilege(text,text)",
  "has_language_privilege(oid,text)",
  "has_parameter_privilege(oid,text,text)",
  "has_parameter_privilege(text,text)",
  "has_schema_privilege(oid,text)",
  "has_server_privilege(oid,text)",
  "has_tablespace_privilege(oid,text)",
  "has_type_privilege(oid,text)",
  "has_type_privilege(text,text)",
  "makeaclitem(oid,oid,text,boolean)",
  "pg_has_role(oid,oid,text)",
  "pg_has_role(oid,text)",
  // The money-division rows are here on the CORNER CORPUS's evidence, not
  // the sweep's: the sweep stages a money value at the type's negative
  // extreme, and every combination of it overflows, so the row came back
  // all-raised — a staged value can HIDE a row as well as convict one. A
  // zero divisor raises; every other divisor is a value (measured).
  "cash_div_int2(money,smallint)", "cash_div_int4(money,integer)",
  "cash_div_int8(money,bigint)",
  "aclcontains(aclitem[],aclitem)", 'acldefault("char",oid)', "aclexplode(aclitem[])",
  "aclitemeq(aclitem,aclitem)", "aclitemout(aclitem)",
  "any_value_transfn(anyelement,anyelement)", "anyarray_out(anyarray)",
  "anyarray_send(anyarray)", "anycompatiblearray_out(anycompatiblearray)",
  "anycompatiblearray_send(anycompatiblearray)", "anycompatiblerange_out(anycompatiblerange)",
  "anyenum_out(anyenum)", "anymultirange_out(anymultirange)", "anyrange_out(anyrange)",
  "anytextcat(anynonarray,text)", "area(box)", "area(circle)", "array_eq(anyarray,anyarray)",
  "array_ge(anyarray,anyarray)", "array_gt(anyarray,anyarray)",
  "array_larger(anyarray,anyarray)", "array_le(anyarray,anyarray)",
  "array_lt(anyarray,anyarray)", "array_ne(anyarray,anyarray)", "array_out(anyarray)",
  "array_send(anyarray)", "array_smaller(anyarray,anyarray)",
  "arraycontained(anyarray,anyarray)", "arraycontains(anyarray,anyarray)",
  "arrayoverlap(anyarray,anyarray)", "bit_out(bit)", "bit_send(bit)", "bitand(bit,bit)",
  "bitcat(bit varying,bit varying)", "bitcmp(bit,bit)", "biteq(bit,bit)", "bitge(bit,bit)",
  "bitgt(bit,bit)", "bitle(bit,bit)", "bitlt(bit,bit)", "bitne(bit,bit)", "bitnot(bit)",
  "bitor(bit,bit)", "bitshiftleft(bit,integer)", "bitshiftright(bit,integer)",
  "bittypmodout(integer)", "bitxor(bit,bit)", "booland_statefunc(boolean,boolean)",
  "booleq(boolean,boolean)", "boolge(boolean,boolean)", "boolgt(boolean,boolean)",
  "boolle(boolean,boolean)", "boollt(boolean,boolean)", "boolne(boolean,boolean)",
  "boolor_statefunc(boolean,boolean)", "boolout(boolean)", "boolsend(boolean)",
  "bound_box(box,box)", "box_above(box,box)", "box_above_eq(box,box)", "box_add(box,point)",
  "box_below(box,box)", "box_below_eq(box,box)", "box_center(box)", "box_contain(box,box)",
  "box_contain_pt(box,point)", "box_contained(box,box)", "box_distance(box,box)",
  "box_div(box,point)", "box_eq(box,box)", "box_ge(box,box)", "box_gt(box,box)",
  "box_intersect(box,box)", "box_le(box,box)", "box_left(box,box)", "box_lt(box,box)",
  "box_mul(box,point)", "box_out(box)", "box_overabove(box,box)", "box_overbelow(box,box)",
  "box_overlap(box,box)", "box_overleft(box,box)", "box_overright(box,box)",
  "box_right(box,box)", "box_same(box,box)", "box_send(box)", "box_sub(box,point)",
  "bpchar_larger(character,character)", "bpchar_pattern_ge(character,character)",
  "bpchar_pattern_gt(character,character)", "bpchar_pattern_le(character,character)",
  "bpchar_pattern_lt(character,character)", "bpchar_smaller(character,character)",
  "bpcharcmp(character,character)", "bpchareq(character,character)",
  "bpcharge(character,character)", "bpchargt(character,character)",
  "bpchariclike(character,text)", "bpcharicnlike(character,text)",
  "bpcharicregexeq(character,text)", "bpcharicregexne(character,text)",
  "bpcharle(character,character)", "bpcharlike(character,text)",
  "bpcharlt(character,character)", "bpcharne(character,character)",
  "bpcharnlike(character,text)", "bpcharout(character)", "bpcharregexeq(character,text)",
  "bpcharregexne(character,text)", "bpcharsend(character)", "bpchartypmodout(integer)",
  "btarraycmp(anyarray,anyarray)", "btboolcmp(boolean,boolean)",
  "btbpchar_pattern_cmp(character,character)", 'btcharcmp("char","char")', "btequalimage(oid)",
  "btfloat48cmp(real,double precision)", "btfloat4cmp(real,real)",
  "btfloat84cmp(double precision,real)", "btfloat8cmp(double precision,double precision)",
  "btint24cmp(smallint,integer)", "btint28cmp(smallint,bigint)",
  "btint2cmp(smallint,smallint)", "btint42cmp(integer,smallint)", "btint48cmp(integer,bigint)",
  "btint4cmp(integer,integer)", "btint82cmp(bigint,smallint)", "btint84cmp(bigint,integer)",
  "btint8cmp(bigint,bigint)", "btnamecmp(name,name)", "btnametextcmp(name,text)",
  "btoidcmp(oid,oid)", "btoidvectorcmp(oidvector,oidvector)", "btrecordcmp(record,record)",
  "btrecordimagecmp(record,record)", "bttext_pattern_cmp(text,text)", "bttextcmp(text,text)",
  "bttextnamecmp(text,name)", "bttidcmp(tid,tid)", "bytea_larger(bytea,bytea)",
  "bytea_smaller(bytea,bytea)", "byteacat(bytea,bytea)", "byteacmp(bytea,bytea)",
  "byteaeq(bytea,bytea)", "byteage(bytea,bytea)", "byteagt(bytea,bytea)",
  "byteale(bytea,bytea)", "bytealike(bytea,bytea)", "bytealt(bytea,bytea)",
  "byteane(bytea,bytea)", "byteanlike(bytea,bytea)", "byteaout(bytea)", "byteasend(bytea)",
  "cash_cmp(money,money)", "cash_div_cash(money,money)", "cash_div_flt4(money,real)",
  "cash_div_flt8(money,double precision)", "cash_eq(money,money)", "cash_ge(money,money)",
  "cash_gt(money,money)", "cash_le(money,money)", "cash_lt(money,money)",
  "cash_mi(money,money)", "cash_mul_flt4(money,real)", "cash_mul_flt8(money,double precision)",
  "cash_mul_int2(money,smallint)", "cash_mul_int4(money,integer)",
  "cash_mul_int8(money,bigint)", "cash_ne(money,money)", "cash_out(money)",
  "cash_pl(money,money)", "cash_send(money)", "cash_words(money)", "cashlarger(money,money)",
  "cashsmaller(money,money)", "center(box)", "center(circle)", 'chareq("char","char")',
  'charge("char","char")', 'chargt("char","char")', 'charle("char","char")',
  'charlt("char","char")', 'charne("char","char")', 'charout("char")', 'charsend("char")',
  "cideq(cid,cid)", "cidout(cid)", "cidr_out(cidr)", "cidr_send(cidr)", "cidsend(cid)",
  "circle_above(circle,circle)", "circle_add_pt(circle,point)", "circle_below(circle,circle)",
  "circle_center(circle)", "circle_contain(circle,circle)", "circle_contain_pt(circle,point)",
  "circle_contained(circle,circle)", "circle_distance(circle,circle)",
  "circle_div_pt(circle,point)", "circle_eq(circle,circle)", "circle_ge(circle,circle)",
  "circle_gt(circle,circle)", "circle_le(circle,circle)", "circle_left(circle,circle)",
  "circle_lt(circle,circle)", "circle_mul_pt(circle,point)", "circle_ne(circle,circle)",
  "circle_out(circle)", "circle_overabove(circle,circle)", "circle_overbelow(circle,circle)",
  "circle_overlap(circle,circle)", "circle_overleft(circle,circle)",
  "circle_overright(circle,circle)", "circle_right(circle,circle)",
  "circle_same(circle,circle)", "circle_send(circle)", "circle_sub_pt(circle,point)",
  "close_pb(point,box)", "close_pl(point,line)", "close_ps(point,lseg)", "close_sb(lseg,box)",
  "convert(bytea,name,name)", "current_schemas(boolean)",
  "database_to_xml(boolean,boolean,text)",
  "database_to_xml_and_xmlschema(boolean,boolean,text)",
  "database_to_xmlschema(boolean,boolean,text)", "date_cmp(date,date)",
  "date_cmp_timestamp(date,timestamp without time zone)",
  "date_cmp_timestamptz(date,timestamp with time zone)", "date_eq(date,date)",
  "date_eq_timestamp(date,timestamp without time zone)",
  "date_eq_timestamptz(date,timestamp with time zone)", "date_ge(date,date)",
  "date_ge_timestamp(date,timestamp without time zone)",
  "date_ge_timestamptz(date,timestamp with time zone)", "date_gt(date,date)",
  "date_gt_timestamp(date,timestamp without time zone)",
  "date_gt_timestamptz(date,timestamp with time zone)", "date_larger(date,date)",
  "date_le(date,date)", "date_le_timestamp(date,timestamp without time zone)",
  "date_le_timestamptz(date,timestamp with time zone)", "date_lt(date,date)",
  "date_lt_timestamp(date,timestamp without time zone)",
  "date_lt_timestamptz(date,timestamp with time zone)", "date_mi(date,date)",
  "date_mi_interval(date,interval)", "date_mii(date,integer)", "date_ne(date,date)",
  "date_ne_timestamp(date,timestamp without time zone)",
  "date_ne_timestamptz(date,timestamp with time zone)", "date_out(date)",
  "date_pl_interval(date,interval)", "date_pli(date,integer)", "date_send(date)",
  "date_smaller(date,date)", "datemultirange()", "daterange_canonical(daterange)",
  "daterange_subdiff(date,date)", "datetime_pl(date,time without time zone)",
  "datetimetz_pl(date,time with time zone)", "dcbrt(double precision)",
  "dexp(double precision)", "diagonal(box)", "diameter(circle)", "dist_bp(box,point)",
  "dist_bs(box,lseg)", "dist_cpoint(circle,point)", "dist_cpoly(circle,polygon)",
  "dist_lp(line,point)", "dist_ls(line,lseg)", "dist_pathp(path,point)", "dist_pb(point,box)",
  "dist_pc(point,circle)", "dist_pl(point,line)", "dist_polyc(polygon,circle)",
  "dist_polyp(polygon,point)", "dist_ppath(point,path)", "dist_ppoly(point,polygon)",
  "dist_ps(point,lseg)", "dist_sb(lseg,box)", "dist_sl(lseg,line)", "dist_sp(lseg,point)",
  "dlog1(double precision)", "dlog10(double precision)",
  "dpow(double precision,double precision)", "dround(double precision)",
  "dsqrt(double precision)", "dtrunc(double precision)",
  "elem_contained_by_multirange(anyelement,anymultirange)",
  "elem_contained_by_range(anyelement,anyrange)", "enum_cmp(anyenum,anyenum)",
  "enum_eq(anyenum,anyenum)", "enum_first(anyenum)", "enum_ge(anyenum,anyenum)",
  "enum_gt(anyenum,anyenum)", "enum_larger(anyenum,anyenum)", "enum_last(anyenum)",
  "enum_le(anyenum,anyenum)", "enum_lt(anyenum,anyenum)", "enum_ne(anyenum,anyenum)",
  "enum_out(anyenum)", "enum_range(anyenum)", "enum_range(anyenum,anyenum)",
  "enum_send(anyenum)", "enum_smaller(anyenum,anyenum)", "float48div(real,double precision)",
  "float48eq(real,double precision)", "float48ge(real,double precision)",
  "float48gt(real,double precision)", "float48le(real,double precision)",
  "float48lt(real,double precision)", "float48mi(real,double precision)",
  "float48mul(real,double precision)", "float48ne(real,double precision)",
  "float48pl(real,double precision)", "float4abs(real)", "float4div(real,real)",
  "float4eq(real,real)", "float4ge(real,real)", "float4gt(real,real)",
  "float4larger(real,real)", "float4le(real,real)", "float4lt(real,real)",
  "float4mi(real,real)", "float4mul(real,real)", "float4ne(real,real)", "float4out(real)",
  "float4pl(real,real)", "float4send(real)", "float4smaller(real,real)", "float4um(real)",
  "float4up(real)", "float84div(double precision,real)", "float84eq(double precision,real)",
  "float84ge(double precision,real)", "float84gt(double precision,real)",
  "float84le(double precision,real)", "float84lt(double precision,real)",
  "float84mi(double precision,real)", "float84mul(double precision,real)",
  "float84ne(double precision,real)", "float84pl(double precision,real)",
  "float8abs(double precision)", "float8div(double precision,double precision)",
  "float8eq(double precision,double precision)", "float8ge(double precision,double precision)",
  "float8gt(double precision,double precision)",
  "float8larger(double precision,double precision)",
  "float8le(double precision,double precision)", "float8lt(double precision,double precision)",
  "float8mi(double precision,double precision)",
  "float8mul(double precision,double precision)",
  "float8ne(double precision,double precision)", "float8out(double precision)",
  "float8pl(double precision,double precision)", "float8send(double precision)",
  "float8smaller(double precision,double precision)", "float8um(double precision)",
  "float8up(double precision)", "flt4_mul_cash(real,money)",
  "flt8_mul_cash(double precision,money)", "format_type(oid,integer)",
  "get_current_ts_config()", "getdatabaseencoding()", "getpgusername()",
  "gin_cmp_tslexeme(text,text)", "gin_compare_jsonb(text,text)",
  "gist_translate_cmptype_common(integer)", "hash_aclitem(aclitem)",
  "hash_aclitem_extended(aclitem,bigint)", "hash_array(anyarray)",
  "hash_array_extended(anyarray,bigint)", "hash_multirange(anymultirange)",
  "hash_multirange_extended(anymultirange,bigint)", "hash_numeric(numeric)",
  "hash_numeric_extended(numeric,bigint)", "hash_range(anyrange)",
  "hash_range_extended(anyrange,bigint)", "hash_record(record)",
  "hash_record_extended(record,bigint)", "hashbool(boolean)",
  "hashboolextended(boolean,bigint)", "hashbpchar(character)",
  "hashbpcharextended(character,bigint)", "hashbytea(bytea)",
  "hashbyteaextended(bytea,bigint)", 'hashchar("char")', 'hashcharextended("char",bigint)',
  "hashcid(cid)", "hashcidextended(cid,bigint)", "hashdate(date)",
  "hashdateextended(date,bigint)", "hashenum(anyenum)", "hashenumextended(anyenum,bigint)",
  "hashfloat4(real)", "hashfloat4extended(real,bigint)", "hashfloat8(double precision)",
  "hashfloat8extended(double precision,bigint)", "hashinet(inet)",
  "hashinetextended(inet,bigint)", "hashint2(smallint)", "hashint2extended(smallint,bigint)",
  "hashint4(integer)", "hashint4extended(integer,bigint)", "hashint8(bigint)",
  "hashint8extended(bigint,bigint)", "hashmacaddr(macaddr)", "hashmacaddr8(macaddr8)",
  "hashmacaddr8extended(macaddr8,bigint)", "hashmacaddrextended(macaddr,bigint)",
  "hashname(name)", "hashnameextended(name,bigint)", "hashoid(oid)",
  "hashoidextended(oid,bigint)", "hashoidvector(oidvector)",
  "hashoidvectorextended(oidvector,bigint)", "hashtext(text)", "hashtextextended(text,bigint)",
  "hashtid(tid)", "hashtidextended(tid,bigint)", "hashxid(xid)", "hashxid8(xid8)",
  "hashxid8extended(xid8,bigint)", "hashxidextended(xid,bigint)", "height(box)",
  "in_range(bigint,bigint,bigint,boolean,boolean)",
  "in_range(date,date,interval,boolean,boolean)",
  "in_range(double precision,double precision,double precision,boolean,boolean)",
  "in_range(integer,integer,bigint,boolean,boolean)",
  "in_range(integer,integer,integer,boolean,boolean)",
  "in_range(integer,integer,smallint,boolean,boolean)",
  "in_range(interval,interval,interval,boolean,boolean)",
  "in_range(numeric,numeric,numeric,boolean,boolean)",
  "in_range(real,real,double precision,boolean,boolean)",
  "in_range(smallint,smallint,bigint,boolean,boolean)",
  "in_range(smallint,smallint,integer,boolean,boolean)",
  "in_range(smallint,smallint,smallint,boolean,boolean)",
  "in_range(time with time zone,time with time zone,interval,boolean,boolean)",
  "in_range(time without time zone,time without time zone,interval,boolean,boolean)",
  "in_range(timestamp with time zone,timestamp with time zone,interval,boolean,boolean)",
  "in_range(timestamp without time zone,timestamp without time zone,interval,boolean,boolean)",
  "inet_client_addr()", "inet_client_port()", "inet_out(inet)", "inet_send(inet)",
  "inetand(inet,inet)", "inetmi(inet,inet)", "inetmi_int8(inet,bigint)", "inetnot(inet)",
  "inetor(inet,inet)", "inetpl(inet,bigint)", "int24div(smallint,integer)",
  "int24eq(smallint,integer)", "int24ge(smallint,integer)", "int24gt(smallint,integer)",
  "int24le(smallint,integer)", "int24lt(smallint,integer)", "int24mi(smallint,integer)",
  "int24mul(smallint,integer)", "int24ne(smallint,integer)", "int24pl(smallint,integer)",
  "int28div(smallint,bigint)", "int28eq(smallint,bigint)", "int28ge(smallint,bigint)",
  "int28gt(smallint,bigint)", "int28le(smallint,bigint)", "int28lt(smallint,bigint)",
  "int28mi(smallint,bigint)", "int28mul(smallint,bigint)", "int28ne(smallint,bigint)",
  "int28pl(smallint,bigint)", "int2_mul_cash(smallint,money)", "int2_sum(bigint,smallint)",
  "int2abs(smallint)", "int2and(smallint,smallint)", "int2div(smallint,smallint)",
  "int2eq(smallint,smallint)", "int2ge(smallint,smallint)", "int2gt(smallint,smallint)",
  "int2larger(smallint,smallint)", "int2le(smallint,smallint)", "int2lt(smallint,smallint)",
  "int2mi(smallint,smallint)", "int2mod(smallint,smallint)", "int2mul(smallint,smallint)",
  "int2ne(smallint,smallint)", "int2not(smallint)", "int2or(smallint,smallint)",
  "int2out(smallint)", "int2pl(smallint,smallint)", "int2send(smallint)",
  "int2shl(smallint,integer)", "int2shr(smallint,integer)", "int2smaller(smallint,smallint)",
  "int2um(smallint)", "int2up(smallint)", "int2xor(smallint,smallint)",
  "int42div(integer,smallint)", "int42eq(integer,smallint)", "int42ge(integer,smallint)",
  "int42gt(integer,smallint)", "int42le(integer,smallint)", "int42lt(integer,smallint)",
  "int42mi(integer,smallint)", "int42mul(integer,smallint)", "int42ne(integer,smallint)",
  "int42pl(integer,smallint)", "int48div(integer,bigint)", "int48eq(integer,bigint)",
  "int48ge(integer,bigint)", "int48gt(integer,bigint)", "int48le(integer,bigint)",
  "int48lt(integer,bigint)", "int48mi(integer,bigint)", "int48mul(integer,bigint)",
  "int48ne(integer,bigint)", "int48pl(integer,bigint)", "int4_mul_cash(integer,money)",
  "int4_sum(bigint,integer)", "int4abs(integer)", "int4and(integer,integer)",
  "int4div(integer,integer)", "int4eq(integer,integer)", "int4ge(integer,integer)",
  "int4gt(integer,integer)", "int4inc(integer)", "int4larger(integer,integer)",
  "int4le(integer,integer)", "int4lt(integer,integer)", "int4mi(integer,integer)",
  "int4mod(integer,integer)", "int4mul(integer,integer)", "int4multirange()",
  "int4ne(integer,integer)", "int4not(integer)", "int4or(integer,integer)", "int4out(integer)",
  "int4pl(integer,integer)", "int4range_canonical(int4range)",
  "int4range_subdiff(integer,integer)", "int4send(integer)", "int4shl(integer,integer)",
  "int4shr(integer,integer)", "int4smaller(integer,integer)", "int4um(integer)",
  "int4up(integer)", "int4xor(integer,integer)", "int82div(bigint,smallint)",
  "int82eq(bigint,smallint)", "int82ge(bigint,smallint)", "int82gt(bigint,smallint)",
  "int82le(bigint,smallint)", "int82lt(bigint,smallint)", "int82mi(bigint,smallint)",
  "int82mul(bigint,smallint)", "int82ne(bigint,smallint)", "int82pl(bigint,smallint)",
  "int84div(bigint,integer)", "int84eq(bigint,integer)", "int84ge(bigint,integer)",
  "int84gt(bigint,integer)", "int84le(bigint,integer)", "int84lt(bigint,integer)",
  "int84mi(bigint,integer)", "int84mul(bigint,integer)", "int84ne(bigint,integer)",
  "int84pl(bigint,integer)", "int8_mul_cash(bigint,money)", "int8_sum(numeric,bigint)",
  "int8abs(bigint)", "int8and(bigint,bigint)", "int8dec(bigint)", 'int8dec_any(bigint,"any")',
  "int8div(bigint,bigint)", "int8eq(bigint,bigint)", "int8ge(bigint,bigint)",
  "int8gt(bigint,bigint)", "int8inc(bigint)", 'int8inc_any(bigint,"any")',
  "int8inc_float8_float8(bigint,double precision,double precision)",
  "int8larger(bigint,bigint)", "int8le(bigint,bigint)", "int8lt(bigint,bigint)",
  "int8mi(bigint,bigint)", "int8mod(bigint,bigint)", "int8mul(bigint,bigint)",
  "int8multirange()", "int8ne(bigint,bigint)", "int8not(bigint)", "int8or(bigint,bigint)",
  "int8out(bigint)", "int8pl(bigint,bigint)", "int8pl_inet(bigint,inet)",
  "int8range_canonical(int8range)", "int8range_subdiff(bigint,bigint)", "int8send(bigint)",
  "int8shl(bigint,integer)", "int8shr(bigint,integer)", "int8smaller(bigint,bigint)",
  "int8um(bigint)", "int8up(bigint)", "int8xor(bigint,bigint)",
  "integer_pl_date(integer,date)", "inter_lb(line,box)", "inter_sb(lseg,box)",
  "inter_sl(lseg,line)", "interval_cmp(interval,interval)",
  "interval_div(interval,double precision)", "interval_eq(interval,interval)",
  "interval_ge(interval,interval)", "interval_gt(interval,interval)",
  "interval_hash(interval)", "interval_hash_extended(interval,bigint)",
  "interval_larger(interval,interval)", "interval_le(interval,interval)",
  "interval_lt(interval,interval)", "interval_mi(interval,interval)",
  "interval_mul(interval,double precision)", "interval_ne(interval,interval)",
  "interval_out(interval)", "interval_pl(interval,interval)",
  "interval_pl_date(interval,date)", "interval_pl_time(interval,time without time zone)",
  "interval_pl_timestamp(interval,timestamp without time zone)",
  "interval_pl_timestamptz(interval,timestamp with time zone)",
  "interval_pl_timetz(interval,time with time zone)", "interval_send(interval)",
  "interval_smaller(interval,interval)", "interval_um(interval)", "intervaltypmodout(integer)",
  "isclosed(path)", "ishorizontal(line)", "ishorizontal(lseg)", "ishorizontal(point,point)",
  "isopen(path)", "isparallel(line,line)", "isparallel(lseg,lseg)", "isperp(line,line)",
  "isperp(lseg,lseg)", "isvertical(line)", "isvertical(lseg)", "isvertical(point,point)",
  "json_out(json)", "json_send(json)", "jsonb_cmp(jsonb,jsonb)", "jsonb_concat(jsonb,jsonb)",
  "jsonb_contained(jsonb,jsonb)", "jsonb_contains(jsonb,jsonb)", "jsonb_delete(jsonb,integer)",
  "jsonb_delete(jsonb,text)", "jsonb_delete_path(jsonb,text[])", "jsonb_eq(jsonb,jsonb)",
  "jsonb_exists(jsonb,text)", "jsonb_exists_all(jsonb,text[])",
  "jsonb_exists_any(jsonb,text[])", "jsonb_ge(jsonb,jsonb)", "jsonb_gt(jsonb,jsonb)",
  "jsonb_hash(jsonb)", "jsonb_hash_extended(jsonb,bigint)", "jsonb_le(jsonb,jsonb)",
  "jsonb_lt(jsonb,jsonb)", "jsonb_ne(jsonb,jsonb)", "jsonb_out(jsonb)", "jsonb_send(jsonb)",
  "jsonpath_out(jsonpath)", "jsonpath_send(jsonpath)", "like(bytea,bytea)", "like(name,text)",
  "like(text,text)", "line(point,point)", "line_distance(line,line)", "line_eq(line,line)",
  "line_horizontal(line)", "line_intersect(line,line)", "line_out(line)",
  "line_parallel(line,line)", "line_perp(line,line)", "line_send(line)", "line_vertical(line)",
  "lseg_center(lseg)", "lseg_distance(lseg,lseg)", "lseg_eq(lseg,lseg)", "lseg_ge(lseg,lseg)",
  "lseg_gt(lseg,lseg)", "lseg_horizontal(lseg)", "lseg_intersect(lseg,lseg)",
  "lseg_le(lseg,lseg)", "lseg_length(lseg)", "lseg_lt(lseg,lseg)", "lseg_ne(lseg,lseg)",
  "lseg_out(lseg)", "lseg_parallel(lseg,lseg)", "lseg_perp(lseg,lseg)", "lseg_send(lseg)",
  "lseg_vertical(lseg)", "macaddr8_and(macaddr8,macaddr8)", "macaddr8_cmp(macaddr8,macaddr8)",
  "macaddr8_eq(macaddr8,macaddr8)", "macaddr8_ge(macaddr8,macaddr8)",
  "macaddr8_gt(macaddr8,macaddr8)", "macaddr8_le(macaddr8,macaddr8)",
  "macaddr8_lt(macaddr8,macaddr8)", "macaddr8_ne(macaddr8,macaddr8)", "macaddr8_not(macaddr8)",
  "macaddr8_or(macaddr8,macaddr8)", "macaddr8_out(macaddr8)", "macaddr8_send(macaddr8)",
  "macaddr8_set7bit(macaddr8)", "macaddr_and(macaddr,macaddr)", "macaddr_cmp(macaddr,macaddr)",
  "macaddr_eq(macaddr,macaddr)", "macaddr_ge(macaddr,macaddr)", "macaddr_gt(macaddr,macaddr)",
  "macaddr_le(macaddr,macaddr)", "macaddr_lt(macaddr,macaddr)", "macaddr_ne(macaddr,macaddr)",
  "macaddr_not(macaddr)", "macaddr_or(macaddr,macaddr)", "macaddr_out(macaddr)",
  "macaddr_send(macaddr)", "mul_d_interval(double precision,interval)",
  "multirange_adjacent_multirange(anymultirange,anymultirange)",
  "multirange_adjacent_range(anymultirange,anyrange)",
  "multirange_after_multirange(anymultirange,anymultirange)",
  "multirange_after_range(anymultirange,anyrange)",
  "multirange_before_multirange(anymultirange,anymultirange)",
  "multirange_before_range(anymultirange,anyrange)",
  "multirange_cmp(anymultirange,anymultirange)",
  "multirange_contained_by_multirange(anymultirange,anymultirange)",
  "multirange_contained_by_range(anymultirange,anyrange)",
  "multirange_contains_elem(anymultirange,anyelement)",
  "multirange_contains_multirange(anymultirange,anymultirange)",
  "multirange_contains_range(anymultirange,anyrange)",
  "multirange_eq(anymultirange,anymultirange)", "multirange_ge(anymultirange,anymultirange)",
  "multirange_gt(anymultirange,anymultirange)",
  "multirange_intersect(anymultirange,anymultirange)",
  "multirange_le(anymultirange,anymultirange)", "multirange_lt(anymultirange,anymultirange)",
  "multirange_minus(anymultirange,anymultirange)",
  "multirange_ne(anymultirange,anymultirange)", "multirange_out(anymultirange)",
  "multirange_overlaps_multirange(anymultirange,anymultirange)",
  "multirange_overlaps_range(anymultirange,anyrange)",
  "multirange_overleft_multirange(anymultirange,anymultirange)",
  "multirange_overleft_range(anymultirange,anyrange)",
  "multirange_overright_multirange(anymultirange,anymultirange)",
  "multirange_overright_range(anymultirange,anyrange)", "multirange_send(anymultirange)",
  "multirange_union(anymultirange,anymultirange)", "mxid_age(xid)", "nameconcatoid(name,oid)",
  "nameeq(name,name)", "nameeqtext(name,text)", "namege(name,name)", "namegetext(name,text)",
  "namegt(name,name)", "namegttext(name,text)", "nameiclike(name,text)",
  "nameicnlike(name,text)", "nameicregexeq(name,text)", "nameicregexne(name,text)",
  "namele(name,name)", "nameletext(name,text)", "namelike(name,text)", "namelt(name,name)",
  "namelttext(name,text)", "namene(name,name)", "namenetext(name,text)",
  "namenlike(name,text)", "nameout(name)", "nameregexeq(name,text)", "nameregexne(name,text)",
  "namesend(name)", "network_cmp(inet,inet)", "network_eq(inet,inet)", "network_ge(inet,inet)",
  "network_gt(inet,inet)", "network_larger(inet,inet)", "network_le(inet,inet)",
  "network_lt(inet,inet)", "network_ne(inet,inet)", "network_overlap(inet,inet)",
  "network_smaller(inet,inet)", "network_sub(inet,inet)", "network_subeq(inet,inet)",
  "network_sup(inet,inet)", "network_supeq(inet,inet)", "notlike(bytea,bytea)",
  "notlike(name,text)", "notlike(text,text)", "npoints(path)", "npoints(polygon)",
  "numeric_abs(numeric)", "numeric_add(numeric,numeric)", "numeric_cmp(numeric,numeric)",
  "numeric_div(numeric,numeric)", "numeric_div_trunc(numeric,numeric)",
  "numeric_eq(numeric,numeric)", "numeric_exp(numeric)", "numeric_ge(numeric,numeric)",
  "numeric_gt(numeric,numeric)", "numeric_inc(numeric)", "numeric_larger(numeric,numeric)",
  "numeric_le(numeric,numeric)", "numeric_ln(numeric)", "numeric_log(numeric,numeric)",
  "numeric_lt(numeric,numeric)", "numeric_mod(numeric,numeric)",
  "numeric_mul(numeric,numeric)", "numeric_ne(numeric,numeric)", "numeric_out(numeric)",
  "numeric_pl_pg_lsn(numeric,pg_lsn)", "numeric_power(numeric,numeric)",
  "numeric_send(numeric)", "numeric_smaller(numeric,numeric)", "numeric_sqrt(numeric)",
  "numeric_sub(numeric,numeric)", "numeric_uminus(numeric)", "numeric_uplus(numeric)",
  "numerictypmodout(integer)", "nummultirange()", "numrange_subdiff(numeric,numeric)",
  "oideq(oid,oid)", "oidge(oid,oid)", "oidgt(oid,oid)", "oidlarger(oid,oid)", "oidle(oid,oid)",
  "oidlt(oid,oid)", "oidne(oid,oid)", "oidout(oid)", "oidsend(oid)", "oidsmaller(oid,oid)",
  "oidvectoreq(oidvector,oidvector)", "oidvectorge(oidvector,oidvector)",
  "oidvectorgt(oidvector,oidvector)", "oidvectorle(oidvector,oidvector)",
  "oidvectorlt(oidvector,oidvector)", "oidvectorne(oidvector,oidvector)",
  "oidvectorout(oidvector)", "oidvectorsend(oidvector)", "oidvectortypes(oidvector)",
  "on_pb(point,box)", "on_pl(point,line)", "on_ppath(point,path)", "on_ps(point,lseg)",
  "on_sb(lseg,box)", "on_sl(lseg,line)", "path_add_pt(path,point)",
  "path_contain_pt(path,point)", "path_div_pt(path,point)", "path_inter(path,path)",
  "path_length(path)", "path_mul_pt(path,point)", "path_n_eq(path,path)",
  "path_n_ge(path,path)", "path_n_gt(path,path)", "path_n_le(path,path)",
  "path_n_lt(path,path)", "path_npoints(path)", "path_out(path)", "path_send(path)",
  "path_sub_pt(path,point)", "pclose(path)", "pg_available_extensions()",
  "pg_char_to_encoding(name)", "pg_client_encoding()", 'pg_column_size("any")',
  "pg_conf_load_time()", "pg_config()", "pg_current_snapshot()", "pg_current_xact_id()",
  "pg_cursor()", "pg_encoding_to_char(integer)", "pg_get_catalog_foreign_keys()",
  "pg_get_keywords()", "pg_get_userbyid(oid)", "pg_is_other_temp_schema(oid)",
  "pg_lsn(numeric)", "pg_lsn_cmp(pg_lsn,pg_lsn)", "pg_lsn_eq(pg_lsn,pg_lsn)",
  "pg_lsn_ge(pg_lsn,pg_lsn)", "pg_lsn_gt(pg_lsn,pg_lsn)", "pg_lsn_hash(pg_lsn)",
  "pg_lsn_hash_extended(pg_lsn,bigint)", "pg_lsn_larger(pg_lsn,pg_lsn)",
  "pg_lsn_le(pg_lsn,pg_lsn)", "pg_lsn_lt(pg_lsn,pg_lsn)", "pg_lsn_mi(pg_lsn,pg_lsn)",
  "pg_lsn_mii(pg_lsn,numeric)", "pg_lsn_ne(pg_lsn,pg_lsn)", "pg_lsn_out(pg_lsn)",
  "pg_lsn_pli(pg_lsn,numeric)", "pg_lsn_send(pg_lsn)", "pg_lsn_smaller(pg_lsn,pg_lsn)",
  "pg_my_temp_schema()", "pg_numa_available()", "pg_postmaster_start_time()",
  "pg_size_bytes(text)", "pg_size_pretty(bigint)", "pg_size_pretty(numeric)",
  "pg_stat_get_analyze_count(oid)", "pg_stat_get_archiver()",
  "pg_stat_get_autoanalyze_count(oid)", "pg_stat_get_autovacuum_count(oid)",
  "pg_stat_get_backend_activity(integer)", "pg_stat_get_backend_idset()",
  "pg_stat_get_bgwriter_buf_written_clean()", "pg_stat_get_bgwriter_maxwritten_clean()",
  "pg_stat_get_bgwriter_stat_reset_time()", "pg_stat_get_blocks_fetched(oid)",
  "pg_stat_get_blocks_hit(oid)", "pg_stat_get_buf_alloc()",
  "pg_stat_get_checkpointer_buffers_written()", "pg_stat_get_checkpointer_num_performed()",
  "pg_stat_get_checkpointer_num_requested()", "pg_stat_get_checkpointer_num_timed()",
  "pg_stat_get_checkpointer_restartpoints_performed()",
  "pg_stat_get_checkpointer_restartpoints_requested()",
  "pg_stat_get_checkpointer_restartpoints_timed()", "pg_stat_get_checkpointer_slru_written()",
  "pg_stat_get_checkpointer_stat_reset_time()", "pg_stat_get_checkpointer_sync_time()",
  "pg_stat_get_checkpointer_write_time()", "pg_stat_get_db_active_time(oid)",
  "pg_stat_get_db_blk_read_time(oid)", "pg_stat_get_db_blk_write_time(oid)",
  "pg_stat_get_db_blocks_fetched(oid)", "pg_stat_get_db_blocks_hit(oid)",
  "pg_stat_get_db_checksum_failures(oid)", "pg_stat_get_db_conflict_all(oid)",
  "pg_stat_get_db_conflict_bufferpin(oid)", "pg_stat_get_db_conflict_lock(oid)",
  "pg_stat_get_db_conflict_logicalslot(oid)", "pg_stat_get_db_conflict_snapshot(oid)",
  "pg_stat_get_db_conflict_startup_deadlock(oid)", "pg_stat_get_db_conflict_tablespace(oid)",
  "pg_stat_get_db_deadlocks(oid)", "pg_stat_get_db_idle_in_transaction_time(oid)",
  "pg_stat_get_db_numbackends(oid)", "pg_stat_get_db_parallel_workers_launched(oid)",
  "pg_stat_get_db_parallel_workers_to_launch(oid)", "pg_stat_get_db_session_time(oid)",
  "pg_stat_get_db_sessions(oid)", "pg_stat_get_db_sessions_abandoned(oid)",
  "pg_stat_get_db_sessions_fatal(oid)", "pg_stat_get_db_sessions_killed(oid)",
  "pg_stat_get_db_temp_bytes(oid)", "pg_stat_get_db_temp_files(oid)",
  "pg_stat_get_db_tuples_deleted(oid)", "pg_stat_get_db_tuples_fetched(oid)",
  "pg_stat_get_db_tuples_inserted(oid)", "pg_stat_get_db_tuples_returned(oid)",
  "pg_stat_get_db_tuples_updated(oid)", "pg_stat_get_db_xact_commit(oid)",
  "pg_stat_get_db_xact_rollback(oid)", "pg_stat_get_dead_tuples(oid)",
  "pg_stat_get_ins_since_vacuum(oid)", "pg_stat_get_live_tuples(oid)",
  "pg_stat_get_mod_since_analyze(oid)", "pg_stat_get_numscans(oid)",
  "pg_stat_get_replication_slot(text)", "pg_stat_get_slru()",
  "pg_stat_get_subscription_stats(oid)", "pg_stat_get_total_analyze_time(oid)",
  "pg_stat_get_total_autoanalyze_time(oid)", "pg_stat_get_total_autovacuum_time(oid)",
  "pg_stat_get_total_vacuum_time(oid)", "pg_stat_get_tuples_deleted(oid)",
  "pg_stat_get_tuples_fetched(oid)", "pg_stat_get_tuples_hot_updated(oid)",
  "pg_stat_get_tuples_inserted(oid)", "pg_stat_get_tuples_newpage_updated(oid)",
  "pg_stat_get_tuples_returned(oid)", "pg_stat_get_tuples_updated(oid)",
  "pg_stat_get_vacuum_count(oid)", "pg_stat_get_wal()", "pg_tablespace_location(oid)",
  "pg_timezone_abbrevs_abbrevs()", "pg_timezone_names()", "pg_trigger_depth()",
  "pg_wal_lsn_diff(pg_lsn,pg_lsn)", "pg_walfile_name(pg_lsn)",
  "pg_walfile_name_offset(pg_lsn)", "point_above(point,point)", "point_add(point,point)",
  "point_below(point,point)", "point_distance(point,point)", "point_div(point,point)",
  "point_eq(point,point)", "point_horiz(point,point)", "point_left(point,point)",
  "point_mul(point,point)", "point_ne(point,point)", "point_out(point)",
  "point_right(point,point)", "point_send(point)", "point_sub(point,point)",
  "point_vert(point,point)", "poly_above(polygon,polygon)", "poly_below(polygon,polygon)",
  "poly_center(polygon)", "poly_contain(polygon,polygon)", "poly_contain_pt(polygon,point)",
  "poly_contained(polygon,polygon)", "poly_distance(polygon,polygon)",
  "poly_left(polygon,polygon)", "poly_npoints(polygon)", "poly_out(polygon)",
  "poly_overabove(polygon,polygon)", "poly_overbelow(polygon,polygon)",
  "poly_overlap(polygon,polygon)", "poly_overleft(polygon,polygon)",
  "poly_overright(polygon,polygon)", "poly_right(polygon,polygon)",
  "poly_same(polygon,polygon)", "poly_send(polygon)", "popen(path)",
  "postgresql_fdw_validator(text[],oid)", "pt_contained_circle(point,circle)",
  "pt_contained_poly(point,polygon)", "radius(circle)", "range_adjacent(anyrange,anyrange)",
  "range_adjacent_multirange(anyrange,anymultirange)", "range_after(anyrange,anyrange)",
  "range_after_multirange(anyrange,anymultirange)", "range_before(anyrange,anyrange)",
  "range_before_multirange(anyrange,anymultirange)", "range_cmp(anyrange,anyrange)",
  "range_contained_by(anyrange,anyrange)",
  "range_contained_by_multirange(anyrange,anymultirange)", "range_contains(anyrange,anyrange)",
  "range_contains_elem(anyrange,anyelement)",
  "range_contains_multirange(anyrange,anymultirange)", "range_eq(anyrange,anyrange)",
  "range_ge(anyrange,anyrange)", "range_gt(anyrange,anyrange)",
  "range_intersect(anyrange,anyrange)", "range_le(anyrange,anyrange)",
  "range_lt(anyrange,anyrange)", "range_minus(anyrange,anyrange)",
  "range_ne(anyrange,anyrange)", "range_out(anyrange)", "range_overlaps(anyrange,anyrange)",
  "range_overlaps_multirange(anyrange,anymultirange)", "range_overleft(anyrange,anyrange)",
  "range_overleft_multirange(anyrange,anymultirange)", "range_overright(anyrange,anyrange)",
  "range_overright_multirange(anyrange,anymultirange)", "range_send(anyrange)",
  "range_union(anyrange,anyrange)", "record_eq(record,record)", "record_ge(record,record)",
  "record_gt(record,record)", "record_image_eq(record,record)",
  "record_image_ge(record,record)", "record_image_gt(record,record)",
  "record_image_le(record,record)", "record_image_lt(record,record)",
  "record_image_ne(record,record)", "record_larger(record,record)", "record_le(record,record)",
  "record_lt(record,record)", "record_ne(record,record)", "record_out(record)",
  "record_send(record)", "record_smaller(record,record)", "regconfigout(regconfig)",
  "regconfigsend(regconfig)", "row_security_active(oid)", "slope(point,point)",
  "spg_poly_quad_compress(polygon)", "text_ge(text,text)", "text_gt(text,text)",
  "text_larger(text,text)", "text_le(text,text)", "text_lt(text,text)",
  "text_pattern_ge(text,text)", "text_pattern_gt(text,text)", "text_pattern_le(text,text)",
  "text_pattern_lt(text,text)", "text_smaller(text,text)", "textanycat(text,anynonarray)",
  "textcat(text,text)", "texteq(text,text)", "texteqname(text,name)", "textgename(text,name)",
  "textgtname(text,name)", "texticlike(text,text)", "texticnlike(text,text)",
  "texticregexeq(text,text)", "texticregexne(text,text)", "textlen(text)",
  "textlename(text,name)", "textlike(text,text)", "textltname(text,name)", "textne(text,text)",
  "textnename(text,name)", "textnlike(text,text)", "textout(text)", "textregexeq(text,text)",
  "textregexne(text,text)", "textsend(text)", "tideq(tid,tid)", "tidge(tid,tid)",
  "tidgt(tid,tid)", "tidlarger(tid,tid)", "tidle(tid,tid)", "tidlt(tid,tid)", "tidne(tid,tid)",
  "tidout(tid)", "tidsend(tid)", "tidsmaller(tid,tid)",
  "time_cmp(time without time zone,time without time zone)",
  "time_eq(time without time zone,time without time zone)",
  "time_ge(time without time zone,time without time zone)",
  "time_gt(time without time zone,time without time zone)",
  "time_hash(time without time zone)", "time_hash_extended(time without time zone,bigint)",
  "time_larger(time without time zone,time without time zone)",
  "time_le(time without time zone,time without time zone)",
  "time_lt(time without time zone,time without time zone)",
  "time_mi_interval(time without time zone,interval)",
  "time_mi_time(time without time zone,time without time zone)",
  "time_ne(time without time zone,time without time zone)", "time_out(time without time zone)",
  "time_pl_interval(time without time zone,interval)", "time_send(time without time zone)",
  "time_smaller(time without time zone,time without time zone)",
  "timedate_pl(time without time zone,date)",
  "timestamp_cmp(timestamp without time zone,timestamp without time zone)",
  "timestamp_cmp_date(timestamp without time zone,date)",
  "timestamp_cmp_timestamptz(timestamp without time zone,timestamp with time zone)",
  "timestamp_eq(timestamp without time zone,timestamp without time zone)",
  "timestamp_eq_date(timestamp without time zone,date)",
  "timestamp_eq_timestamptz(timestamp without time zone,timestamp with time zone)",
  "timestamp_ge(timestamp without time zone,timestamp without time zone)",
  "timestamp_ge_date(timestamp without time zone,date)",
  "timestamp_ge_timestamptz(timestamp without time zone,timestamp with time zone)",
  "timestamp_gt(timestamp without time zone,timestamp without time zone)",
  "timestamp_gt_date(timestamp without time zone,date)",
  "timestamp_gt_timestamptz(timestamp without time zone,timestamp with time zone)",
  "timestamp_hash(timestamp without time zone)",
  "timestamp_hash_extended(timestamp without time zone,bigint)",
  "timestamp_larger(timestamp without time zone,timestamp without time zone)",
  "timestamp_le(timestamp without time zone,timestamp without time zone)",
  "timestamp_le_date(timestamp without time zone,date)",
  "timestamp_le_timestamptz(timestamp without time zone,timestamp with time zone)",
  "timestamp_lt(timestamp without time zone,timestamp without time zone)",
  "timestamp_lt_date(timestamp without time zone,date)",
  "timestamp_lt_timestamptz(timestamp without time zone,timestamp with time zone)",
  "timestamp_mi(timestamp without time zone,timestamp without time zone)",
  "timestamp_mi_interval(timestamp without time zone,interval)",
  "timestamp_ne(timestamp without time zone,timestamp without time zone)",
  "timestamp_ne_date(timestamp without time zone,date)",
  "timestamp_ne_timestamptz(timestamp without time zone,timestamp with time zone)",
  "timestamp_out(timestamp without time zone)",
  "timestamp_pl_interval(timestamp without time zone,interval)",
  "timestamp_send(timestamp without time zone)",
  "timestamp_smaller(timestamp without time zone,timestamp without time zone)",
  "timestamptypmodout(integer)",
  "timestamptz_cmp(timestamp with time zone,timestamp with time zone)",
  "timestamptz_cmp_date(timestamp with time zone,date)",
  "timestamptz_cmp_timestamp(timestamp with time zone,timestamp without time zone)",
  "timestamptz_eq(timestamp with time zone,timestamp with time zone)",
  "timestamptz_eq_date(timestamp with time zone,date)",
  "timestamptz_eq_timestamp(timestamp with time zone,timestamp without time zone)",
  "timestamptz_ge(timestamp with time zone,timestamp with time zone)",
  "timestamptz_ge_date(timestamp with time zone,date)",
  "timestamptz_ge_timestamp(timestamp with time zone,timestamp without time zone)",
  "timestamptz_gt(timestamp with time zone,timestamp with time zone)",
  "timestamptz_gt_date(timestamp with time zone,date)",
  "timestamptz_gt_timestamp(timestamp with time zone,timestamp without time zone)",
  "timestamptz_hash(timestamp with time zone)",
  "timestamptz_hash_extended(timestamp with time zone,bigint)",
  "timestamptz_larger(timestamp with time zone,timestamp with time zone)",
  "timestamptz_le(timestamp with time zone,timestamp with time zone)",
  "timestamptz_le_date(timestamp with time zone,date)",
  "timestamptz_le_timestamp(timestamp with time zone,timestamp without time zone)",
  "timestamptz_lt(timestamp with time zone,timestamp with time zone)",
  "timestamptz_lt_date(timestamp with time zone,date)",
  "timestamptz_lt_timestamp(timestamp with time zone,timestamp without time zone)",
  "timestamptz_mi(timestamp with time zone,timestamp with time zone)",
  "timestamptz_mi_interval(timestamp with time zone,interval)",
  "timestamptz_ne(timestamp with time zone,timestamp with time zone)",
  "timestamptz_ne_date(timestamp with time zone,date)",
  "timestamptz_ne_timestamp(timestamp with time zone,timestamp without time zone)",
  "timestamptz_out(timestamp with time zone)",
  "timestamptz_pl_interval(timestamp with time zone,interval)",
  "timestamptz_send(timestamp with time zone)",
  "timestamptz_smaller(timestamp with time zone,timestamp with time zone)",
  "timestamptztypmodout(integer)", "timetypmodout(integer)",
  "timetz_cmp(time with time zone,time with time zone)",
  "timetz_eq(time with time zone,time with time zone)",
  "timetz_ge(time with time zone,time with time zone)",
  "timetz_gt(time with time zone,time with time zone)", "timetz_hash(time with time zone)",
  "timetz_hash_extended(time with time zone,bigint)",
  "timetz_larger(time with time zone,time with time zone)",
  "timetz_le(time with time zone,time with time zone)",
  "timetz_lt(time with time zone,time with time zone)",
  "timetz_mi_interval(time with time zone,interval)",
  "timetz_ne(time with time zone,time with time zone)", "timetz_out(time with time zone)",
  "timetz_pl_interval(time with time zone,interval)", "timetz_send(time with time zone)",
  "timetz_smaller(time with time zone,time with time zone)",
  "timetzdate_pl(time with time zone,date)", "timetztypmodout(integer)",
  "ts_delete(tsvector,text)", "ts_delete(tsvector,text[])", "ts_match_qv(tsquery,tsvector)",
  "ts_match_tq(text,tsquery)", "ts_match_tt(text,text)", "ts_match_vq(tsvector,tsquery)",
  "ts_rewrite(tsquery,tsquery,tsquery)", "tsmultirange()", "tsq_mcontained(tsquery,tsquery)",
  "tsq_mcontains(tsquery,tsquery)", "tsquery_and(tsquery,tsquery)",
  "tsquery_cmp(tsquery,tsquery)", "tsquery_eq(tsquery,tsquery)", "tsquery_ge(tsquery,tsquery)",
  "tsquery_gt(tsquery,tsquery)", "tsquery_le(tsquery,tsquery)", "tsquery_lt(tsquery,tsquery)",
  "tsquery_ne(tsquery,tsquery)", "tsquery_not(tsquery)", "tsquery_or(tsquery,tsquery)",
  "tsquery_phrase(tsquery,tsquery)", "tsquery_phrase(tsquery,tsquery,integer)",
  "tsqueryout(tsquery)", "tsquerysend(tsquery)",
  "tsrange_subdiff(timestamp without time zone,timestamp without time zone)",
  "tstzmultirange()", "tstzrange_subdiff(timestamp with time zone,timestamp with time zone)",
  "tsvector_cmp(tsvector,tsvector)", "tsvector_concat(tsvector,tsvector)",
  "tsvector_eq(tsvector,tsvector)", "tsvector_ge(tsvector,tsvector)",
  "tsvector_gt(tsvector,tsvector)", "tsvector_le(tsvector,tsvector)",
  "tsvector_lt(tsvector,tsvector)", "tsvector_ne(tsvector,tsvector)", "tsvectorout(tsvector)",
  "tsvectorsend(tsvector)", "txid_current_snapshot()", "unnest(anymultirange)",
  "uuid_cmp(uuid,uuid)", "uuid_eq(uuid,uuid)", "uuid_ge(uuid,uuid)", "uuid_gt(uuid,uuid)",
  "uuid_hash(uuid)", "uuid_hash_extended(uuid,bigint)", "uuid_le(uuid,uuid)",
  "uuid_lt(uuid,uuid)", "uuid_ne(uuid,uuid)", "uuid_out(uuid)", "uuid_send(uuid)",
  "varbit_out(bit varying)", "varbit_send(bit varying)", "varbitcmp(bit varying,bit varying)",
  "varbiteq(bit varying,bit varying)", "varbitge(bit varying,bit varying)",
  "varbitgt(bit varying,bit varying)", "varbitle(bit varying,bit varying)",
  "varbitlt(bit varying,bit varying)", "varbitne(bit varying,bit varying)",
  "varbittypmodout(integer)", "varcharout(character varying)",
  "varcharsend(character varying)", "varchartypmodout(integer)", "width(box)",
  "xid8_larger(xid8,xid8)", "xid8_smaller(xid8,xid8)", "xid8cmp(xid8,xid8)",
  "xid8eq(xid8,xid8)", "xid8ge(xid8,xid8)", "xid8gt(xid8,xid8)", "xid8le(xid8,xid8)",
  "xid8lt(xid8,xid8)", "xid8ne(xid8,xid8)", "xid8out(xid8)", "xid8send(xid8)",
  "xideq(xid,xid)", "xideqint4(xid,integer)", "xidneq(xid,xid)", "xidneqint4(xid,integer)",
  "xidout(xid)", "xidsend(xid)",
  // -----------------------------------------------------------------------
  // THE VOLATILE BUCKET (2026-08-21). 276 pg_catalog signatures were excluded
  // from execution on `provolatile = 'v'` and had no verdict from anything —
  // not claimed, not witnessed, just skipped. Volatility says a repeat call
  // may answer differently; it says nothing about whether a result exists,
  // and `nextval` proved the difference by being strict, volatile and total
  // while reading nullable. The gate is gone from all three probes and these
  // rows classify by execution like the rest of the surface.
  //
  // Every row here was convicted by tests/probe/cluster-sweep.ts --volatile
  // and then by builtin-surface.test.ts, and each was read against the
  // PostgreSQL source PGlite builds from, because a probe that finds no NULL
  // in one server state is not the same as a function with no NULL to find.
  // That reading is what kept eight rows out: four whose `PG_RETURN_NULL` is
  // live in a state no query can reach (recorded in the surface suite's
  // SETTLED_ELSEWHERE) and four whose NULL the probe DATABASE was hiding — a
  // regclass naming a dropped relation and an un-called sequence joined
  // probe-values.ts, and six signatures moved to witnessed instead.
  //
  // A COMPOSITE row's claim is about the row VALUE. `pg_control_system()`
  // never returns a NULL record; its FIELDS stay nullable either way, since
  // a function's composite result carries no constraints
  // (`resolveTableFunctionColumns`).
  // -----------------------------------------------------------------------
  // Randomness and generated identifiers. `random` is why the sweep was
  // needed at all: the NAME left ALWAYS_NOT_NULL_BUILTINS because PG17's
  // two-argument overloads are strict, so `random(NULL, NULL)` is NULL —
  // and the rows themselves are total for non-null arguments, which is what
  // signature keying can say and a name cannot.
  "array_sample(anyarray,integer)", "array_shuffle(anyarray)", "random()",
  "random(bigint,bigint)", "random(integer,integer)", "random(numeric,numeric)",
  "random_normal(double precision,double precision)", "setseed(double precision)",
  "timeofday()", "uuidv4()", "uuidv7()", "uuidv7(interval)",
  // Large objects. Every one raises on a descriptor or OID that is not
  // there — "large object 0 does not exist", "invalid large-object
  // descriptor" — and a raise is not a NULL. The nine that take a
  // DESCRIPTOR are probed through a `COHERENT_CALLS` entry that opens one
  // inline, because a descriptor lives only inside the transaction that
  // opened it and no integer the corpus carries is ever a valid one.
  "lo_close(integer)", "lo_creat(integer)", "lo_create(oid)", "lo_export(oid,text)",
  "lo_from_bytea(oid,bytea)", "lo_get(oid)", "lo_get(oid,bigint,integer)",
  "lo_import(text)", "lo_import(text,oid)", "lo_lseek(integer,integer,integer)",
  "lo_lseek64(integer,bigint,integer)", "lo_open(oid,integer)",
  "lo_put(oid,bigint,bytea)", "lo_tell(integer)", "lo_tell64(integer)",
  "lo_truncate(integer,integer)", "lo_truncate64(integer,bigint)", "lo_unlink(oid)",
  "loread(integer,integer)", "lowrite(integer,bytea)",
  // Advisory locks: void for the waiting spellings, boolean for the `try`
  // and `unlock` ones. An unlock that held nothing warns and answers false.
  "pg_advisory_lock(bigint)", "pg_advisory_lock(integer,integer)",
  "pg_advisory_lock_shared(bigint)", "pg_advisory_lock_shared(integer,integer)",
  "pg_advisory_unlock(bigint)", "pg_advisory_unlock(integer,integer)",
  "pg_advisory_unlock_all()", "pg_advisory_unlock_shared(bigint)",
  "pg_advisory_unlock_shared(integer,integer)", "pg_advisory_xact_lock(bigint)",
  "pg_advisory_xact_lock(integer,integer)", "pg_advisory_xact_lock_shared(bigint)",
  "pg_advisory_xact_lock_shared(integer,integer)", "pg_try_advisory_lock(bigint)",
  "pg_try_advisory_lock(integer,integer)", "pg_try_advisory_lock_shared(bigint)",
  "pg_try_advisory_lock_shared(integer,integer)", "pg_try_advisory_xact_lock(bigint)",
  "pg_try_advisory_xact_lock(integer,integer)",
  "pg_try_advisory_xact_lock_shared(bigint)",
  "pg_try_advisory_xact_lock_shared(integer,integer)",
  // Statistics. The per-transaction table counters answer 0 for a relation
  // with no entry rather than NULL — their macro says `result = 0` where
  // `find_tabstat_entry` returns nothing. Their FUNCTION-stat siblings do
  // the opposite and are witnessed, which is why the name carries no claim.
  "pg_stat_clear_snapshot()", "pg_stat_force_next_flush()",
  "pg_stat_get_xact_blocks_fetched(oid)", "pg_stat_get_xact_blocks_hit(oid)",
  "pg_stat_get_xact_numscans(oid)", "pg_stat_get_xact_tuples_deleted(oid)",
  "pg_stat_get_xact_tuples_fetched(oid)", "pg_stat_get_xact_tuples_hot_updated(oid)",
  "pg_stat_get_xact_tuples_inserted(oid)",
  "pg_stat_get_xact_tuples_newpage_updated(oid)",
  "pg_stat_get_xact_tuples_returned(oid)", "pg_stat_get_xact_tuples_updated(oid)",
  "pg_stat_have_stats(text,oid,bigint)",
  "pg_stat_reset()", "pg_stat_reset_backend_stats(integer)",
  "pg_stat_reset_shared(text)",
  "pg_stat_reset_single_function_counters(oid)",
  "pg_stat_reset_single_table_counters(oid)", "pg_stat_reset_slru(text)",
  "pg_stat_reset_subscription_stats(oid)",
  // WAL, backup and replication. Each answers an LSN, a void or a composite,
  // and refuses out of context by raising — `pg_switch_wal()` and the
  // `pg_current_wal_*` trio raise during recovery, `pg_wal_replay_pause()`
  // raises outside it and is unprobed for exactly that reason.
  "pg_backup_start(text,boolean)", "pg_backup_stop(boolean)",
  "pg_create_physical_replication_slot(name,boolean,boolean)",
  "pg_create_restore_point(text)", "pg_current_wal_flush_lsn()",
  "pg_current_wal_insert_lsn()", "pg_current_wal_lsn()",
  "pg_drop_replication_slot(name)", "pg_get_wal_resource_managers()",
  "pg_get_wal_summarizer_state()", "pg_is_in_recovery()", "pg_log_standby_snapshot()",
  "pg_logical_emit_message(boolean,text,bytea,boolean)",
  "pg_logical_emit_message(boolean,text,text,boolean)", "pg_ls_waldir()",
  "pg_replication_origin_create(text)", "pg_replication_origin_drop(text)",
  "pg_replication_origin_session_is_setup()", "pg_replication_origin_xact_reset()",
  "pg_switch_wal()",
  // Signals, notifications and settings. `set_config` is the one that is
  // ordinary application SQL: it is NON-STRICT and raises rather than
  // answering NULL for a NULL name, and returns the new value as text.
  "pg_cancel_backend(integer)", "pg_log_backend_memory_contexts(integer)",
  "pg_notify(text,text)", "pg_reload_conf()", "pg_rotate_logfile()",
  "pg_terminate_backend(integer,bigint)", "set_config(text,text,boolean)",
  // Server-side files, the spellings WITHOUT `missing_ok`. Their
  // `missing_ok` twins return NULL for a file that is not there and are
  // witnessed; these pass the flag as false and raise instead.
  "pg_clear_attribute_stats(text,text,text,boolean)",
  "pg_clear_relation_stats(text,text)",
  "pg_ls_dir(text)", "pg_ls_dir(text,boolean,boolean)", "pg_read_binary_file(text)",
  "pg_read_binary_file(text,bigint,bigint)",
  "pg_read_file(text)", "pg_read_file(text,bigint,bigint)", "pg_stat_file(text)",
  // The sleeps, whose claim is a `void` and whose probed universe is the
  // BOUNDED call in COHERENT_CALLS. `REFUSED_CALLS` drops their generated
  // combinations: the corner corpus carries the infinities, and
  // `pg_sleep('Infinity')` does not come back.
  "pg_sleep(double precision)", "pg_sleep_for(interval)",
  "pg_sleep_until(timestamp with time zone)",
  // What none of those groups claims. `pg_get_sequence_data` is the pair to
  // the witness one line down in the corpus: for a missing sequence it
  // returns a record whose FIELDS are both null, which is a value and not a
  // NULL, while `pg_sequence_last_value` returns the NULL itself.
  "cursor_to_xml(refcursor,integer,boolean,boolean,text)",
  "cursor_to_xmlschema(refcursor,boolean,boolean,text)",
  "currtid2(text,tid)", "pg_blocking_pids(integer)", "pg_control_checkpoint()",
  "pg_control_init()", "pg_control_recovery()", "pg_control_system()",
  "pg_get_sequence_data(regclass)", "pg_get_wait_events()",
  "pg_import_system_collations(regnamespace)",
  "pg_isolation_test_session_is_blocked(integer,integer[])", "pg_jit_available()",
  "pg_notification_queue_usage()", "pg_safe_snapshot_blocking_pids(integer)",
  "pg_stat_get_recovery_prefetch()", "query_to_xml(text,boolean,boolean,text)",
  "query_to_xml_and_xmlschema(text,boolean,boolean,text)",
  "query_to_xmlschema(text,boolean,boolean,text)",
  // The three that take a QUERY rather than a string, and were unprobed
  // because the corpus's texts are names — `ts_stat` wants a query yielding
  // one tsvector column and `ts_rewrite` one yielding two tsqueries.
  "ts_rewrite(tsquery,text)", "ts_stat(text)", "ts_stat(text,text)",
  // -----------------------------------------------------------------------
  // REACHING THE UNPROBED SURFACE (2026-08-21). The volatile sweep left 246
  // rows that PostgreSQL had declined for every call the corpus could build,
  // and "the corpus cannot build one" turned out to be the reason for most
  // of them rather than a fact about the function. The probe database grew a
  // schema — indexes of each kind, a partitioned pair, a publication, a
  // collation, a foreign-data wrapper and server, a non-superuser role, a
  // domain, a composite type, replication slots and origins, a prepared
  // statement and a prepared transaction — and PGlite's `postgresqlconf`
  // option turned on the four settings whole families refuse without.
  // Unprobed went 246 to 124; these are what convicted.
  //
  // Audited against the PostgreSQL source PGlite builds from, as before, and
  // that audit is what separates two groups the probe cannot tell apart: a
  // `PG_RETURN_NULL` guarded by an `escontext` is the PG16 SOFT-ERROR path,
  // reachable only through `pg_input_is_valid`, and a direct call raises
  // there instead. Every input function below is in that class.
  // -----------------------------------------------------------------------
  // Type INPUT and TYPMOD entry points, reachable once the cstring corpus
  // carried one literal per type's syntax and the probe database had a
  // domain and a composite for the two that take a target type.
  "aclitemin(cstring)", "array_in(cstring,oid,integer)", "bittypmodin(cstring[])",
  "boolin(cstring)", "box_in(cstring)", "bpchartypmodin(cstring[])",
  "circle_in(cstring)", "date_in(cstring)", "domain_in(cstring,oid,integer)",
  "enum_in(cstring,oid)", "inet_in(cstring)", "intervaltypmodin(cstring[])",
  "line_in(cstring)", "lseg_in(cstring)", "macaddr8_in(cstring)",
  "macaddr_in(cstring)", "multirange_in(cstring,oid,integer)",
  "numerictypmodin(cstring[])", "path_in(cstring)", "pg_lsn_in(cstring)",
  "pg_snapshot_in(cstring)", "point_in(cstring)", "poly_in(cstring)",
  "range_in(cstring,oid,integer)", "record_in(cstring,oid,integer)", "tidin(cstring)",
  "time_in(cstring,oid,integer)", "timestamp_in(cstring,oid,integer)",
  "timestamptypmodin(cstring[])", "timestamptz_in(cstring,oid,integer)",
  "timestamptztypmodin(cstring[])", "timetypmodin(cstring[])",
  "timetz_in(cstring,oid,integer)", "timetztypmodin(cstring[])",
  "txid_snapshot_in(cstring)", "uuid_in(cstring)", "varbittypmodin(cstring[])",
  "varchartypmodin(cstring[])",
  // Aggregate TRANSITION functions, over a correctly shaped accumulator.
  // Their `avg`/`sum` finalisers are NOT here: a zero count is NULL, which
  // the same corpus value falsified two standing claims with.
  "float4_accum(double precision[],real)",
  "float8_accum(double precision[],double precision)",
  "float8_combine(double precision[],double precision[])",
  "float8_regr_accum(double precision[],double precision,double precision)",
  "float8_regr_combine(double precision[],double precision[])",
  // What the probe database's own objects unblocked, and the four settings.
  "amvalidate(oid)", "brin_desummarize_range(regclass,bigint)",
  "brin_summarize_new_values(regclass)", "brin_summarize_range(regclass,bigint)",
  "fmgr_c_validator(oid)", "fmgr_internal_validator(oid)", "fmgr_sql_validator(oid)",
  "gin_clean_pending_list(regclass)",
  "has_foreign_data_wrapper_privilege(name,text,text)",
  "has_foreign_data_wrapper_privilege(oid,text,text)",
  "has_foreign_data_wrapper_privilege(text,text)",
  "has_server_privilege(name,text,text)", "has_server_privilege(oid,text,text)",
  "has_server_privilege(text,text)", "json_populate_record(anyelement,json,boolean)",
  "json_populate_recordset(anyelement,json,boolean)",
  "jsonb_populate_record(anyelement,jsonb)",
  "jsonb_populate_record_valid(anyelement,jsonb)",
  "jsonb_populate_recordset(anyelement,jsonb)",
  "pg_copy_physical_replication_slot(name,name)",
  "pg_copy_physical_replication_slot(name,name,boolean)",
  "pg_get_object_address(text,text[],text[])", "pg_identify_object(oid,oid,integer)",
  "pg_identify_object_as_address(oid,oid,integer)", "pg_last_committed_xact()",
  "pg_listening_channels()", "pg_ls_replslotdir(text)",
  "pg_nextoid(regclass,name,regclass)", "pg_partition_ancestors(regclass)",
  "pg_prepared_xact()", "pg_replication_origin_advance(text,pg_lsn)",
  "pg_replication_origin_xact_setup(pg_lsn,timestamp with time zone)",
  "pg_replication_slot_advance(name,pg_lsn)", "pg_restore_attribute_stats(\"any\")",
  "pg_restore_relation_stats(\"any\")", "pg_sequence_parameters(oid)",
  "pg_snapshot_xip(pg_snapshot)", "pg_split_walfile_name(text)",
  "pg_stat_reset_replication_slot(text)", "pg_tablespace_databases(oid)",
  "pg_timezone_abbrevs_zone()", "pg_xact_commit_timestamp_origin(xid)",
  "plpgsql_validator(oid)", "satisfies_hash_partition(oid,integer,integer,\"any\")",
  "schema_to_xml(name,boolean,boolean,text)",
  "schema_to_xml_and_xmlschema(name,boolean,boolean,text)",
  "schema_to_xmlschema(name,boolean,boolean,text)", "to_ascii(text,integer)",
  "to_ascii(text,name)", "ts_parse(oid,text)", "ts_token_type(oid)",
  "txid_snapshot_xip(txid_snapshot)",
  // -----------------------------------------------------------------------
  // PAST THE SELECT (2026-08-21). Nine rows that no expression in an ordinary
  // probe statement can reach at all — not because the corpus lacks a value,
  // but because the CALL needs a context a batched `SELECT` does not have: a
  // statement with no subtransaction around it, an instance holding neither a
  // prepared transaction nor a session origin, or an event trigger firing.
  // `runOutOfBandProbes()` in tests/unit/query/probe-values.ts is the three
  // mechanisms, and BOTH probes use it — the classifying suite to categorise
  // these rows and totality-probe.test.ts to hold them, which is what makes
  // them claimable rather than merely measured.
  //
  // Audited in the source as the rest were. Every one returns unconditionally
  // and every other exit from its body is an `ereport(ERROR)`:
  // `PG_RETURN_VOID` for the two origin rows, `PG_RETURN_OID` and
  // `PG_RETURN_INT32` for the table-rewrite pair, `pstrdup` for the snapshot
  // export, and `memset(nulls, 0, sizeof(nulls))` before `heap_form_tuple`
  // for the slot rows. The slot claim is about the RECORD, which is the
  // granularity these tables work at — `copy_replication_slot` does leave the
  // lsn FIELD null for an unset confirmed_flush, and a field of a composite
  // result is nullable in the walk regardless.
  //
  // Their two set-returning siblings are NOT here and are witnessed instead:
  // `pg_event_trigger_ddl_commands()` nulls five columns on the `SCT_Grant`
  // branch, and `pg_event_trigger_dropped_objects()` nulls `schema_name` for
  // an object that has no schema. The source is what said which four of the
  // six were promotable, after the probe said all six returned a value.
  "pg_copy_logical_replication_slot(name,name)",
  "pg_copy_logical_replication_slot(name,name,boolean)",
  "pg_copy_logical_replication_slot(name,name,boolean,name)",
  "pg_create_logical_replication_slot(name,name,boolean,boolean,boolean)",
  "pg_event_trigger_table_rewrite_oid()",
  "pg_event_trigger_table_rewrite_reason()",
  "pg_export_snapshot()",
  "pg_replication_origin_session_reset()",
  "pg_replication_origin_session_setup(text)",
]);
