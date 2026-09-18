import { PGlite } from '@electric-sql/pglite'

export {
  VALUES,
  POLYMORPHIC_FAMILIES,
  POLYMORPHIC,
  MAX_COMBOS,
  qualify,
  combinations,
} from '../../support/postgres/values.js'

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

  -- A relation with an index of each kind the maintenance functions take,
  -- a partitioned pair, a publication and a serial column.
  CREATE TABLE probe_rel(i int PRIMARY KEY, t tsvector, s text);
  INSERT INTO probe_rel VALUES (1, 'a b'::tsvector, 'x'), (2, 'c'::tsvector, 'y');
  CREATE INDEX probe_brin ON probe_rel USING brin (i);
  CREATE INDEX probe_gin ON probe_rel USING gin (t);
  CREATE TABLE probe_part(i int) PARTITION BY RANGE (i);
  CREATE TABLE probe_part1 PARTITION OF probe_part FOR VALUES FROM (0) TO (10);
  CREATE PUBLICATION probe_pub FOR TABLE probe_rel;
  CREATE TABLE probe_serial(id serial);

  -- A HASH-partitioned pair, which is what satisfies_hash_partition needs
  -- and no range partition can stand in for.
  CREATE TABLE probe_hash(i int) PARTITION BY HASH (i);
  CREATE TABLE probe_hash1 PARTITION OF probe_hash FOR VALUES WITH (MODULUS 2, REMAINDER 0);

  -- A DOMAIN and a COMPOSITE type: domain_in and record_in take the
  -- target type's OID and refuse a base type or record itself, and the
  -- json/jsonb record populators need a composite to populate.
  CREATE DOMAIN probe_dom AS int;
  CREATE TYPE probe_comp AS (a int, b text);

  -- A NON-SUPERUSER role. Every probe of the has_*_privilege family had
  -- used the role PGlite runs as, and a superuser short-circuits to true
  -- before the object is looked up at all -- which hid the NULL those
  -- functions answer for an object that does not exist. The grantee is the
  -- argument that decides whether the rest of the call is even reached.
  CREATE ROLE probe_role NOLOGIN;

  -- A collation, a foreign-data wrapper and a foreign server: the three
  -- objects the no-such-object group was pinned on.
  CREATE COLLATION probe_coll (provider = libc, locale = 'C');
  CREATE FOREIGN DATA WRAPPER probe_fdw;
  CREATE SERVER probe_srv FOREIGN DATA WRAPPER probe_fdw;

  -- One function per procedural language, for the language validators.
  CREATE FUNCTION probe_plpgsql() RETURNS int LANGUAGE plpgsql AS $x$ BEGIN RETURN 1; END $x$;
  CREATE FUNCTION probe_sql() RETURNS int LANGUAGE sql AS $x$ SELECT 1 $x$;

  -- Replication: a physical slot and an origin. The LOGICAL slot cannot go
  -- here — see PROBE_STANDALONE_SQL.
  SELECT pg_create_physical_replication_slot('probe_slot', true, false);
  SELECT pg_replication_origin_create('probe_origin');
  -- A SECOND origin, because the session claims the first: advancing an
  -- origin that is active for this backend raises "already active for PID".
  SELECT pg_replication_origin_create('probe_origin2');

  -- The session's replication ORIGIN. It lives here rather than in a probe
  -- of its own because a session can have exactly one: with it configured,
  -- pg_replication_origin_session_progress, _xact_setup and
  -- pg_show_replication_origin_status all evaluate, and the two rows that
  -- SET and CLEAR it are recorded unprobed instead — a verdict for those
  -- would only say which of them the batch happened to run first.
  SELECT pg_replication_origin_session_setup('probe_origin');

  -- A listening channel and a prepared statement.
  LISTEN probe_channel;
  PREPARE probe_stmt AS SELECT 1;
  -- A prepared statement with NO result types, which is the only thing
  -- pg_prepared_statement() reports a null column for.
  PREPARE probe_dml AS INSERT INTO probe_rel VALUES (3, 'd'::tsvector, 'z');
`

/**
 * Objects that cannot be made inside the block above, run one statement at a
 * time. `exec` puts its whole string in ONE transaction, and both of these
 * refuse that: a logical slot cannot be created in a transaction that has
 * written, and PREPARE TRANSACTION is what ends the one it is in.
 *
 * The prepared transaction gets its own table on purpose. Its locks outlive
 * the setup by construction — that is the point, since `pg_prepared_xact()`
 * is empty without one — so they must not sit on anything else the probe
 * touches. Sharing `probe_rel` would have deadlocked the run:
 * `brin_summarize_new_values` wants ShareUpdateExclusive on an index of a
 * table this transaction holds RowExclusive on, and the probe has no timeout
 * that would notice.
 */
export const PROBE_STANDALONE_SQL: readonly string[] = [
  `SELECT pg_create_logical_replication_slot('probe_lslot', 'pgoutput', false, false, false)`,
  `CREATE TABLE probe_prepared(i int)`,
  `BEGIN`,
  `INSERT INTO probe_prepared VALUES (1)`,
  `PREPARE TRANSACTION 'probe_gid'`,
]

/**
 * postgresql.conf lines every probe instance starts with.
 *
 * Four groups of signatures refuse on the SERVER's configuration rather than
 * on their arguments, and each was pinned unprobeable for it until PGlite's
 * `postgresqlconf` option turned out to reach all four: logical decoding
 * needs `wal_level`, `pg_xact_commit_timestamp` and friends need
 * `track_commit_timestamp`, `pg_prepared_xact()` needs a non-zero
 * `max_prepared_transactions`, and the WAL summary readers need
 * `summarize_wal`. A setting is not an input, so nothing here weakens what a
 * verdict means — it only decides whether PostgreSQL will answer at all.
 */
export const PROBE_CONF: readonly string[] = [
  'wal_level = logical',
  'track_commit_timestamp = on',
  'max_prepared_transactions = 4',
  'summarize_wal = on',
  // The slot COPY rows create a slot per combination that succeeds, and the
  // default cap of ten is reached part way through them — after which every
  // later slot row fails on the cap rather than on itself, which reads as a
  // verdict and is not one.
  'max_replication_slots = 100',
]

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
  'pg_sleep(double precision)':
    "the corpus carries 'Infinity'::float8, and the sleep is uninterruptible in WASM",
  'pg_sleep_for(interval)': "the corpus carries 'infinity'::interval and '1 day'",
  'pg_sleep_until(timestamp with time zone)': "the corpus carries 'infinity'::timestamptz",
  // The second reason a call is refused: it changes what the probes AFTER it
  // can see. `set_config('search_path', 'abc', false)` is a legal call the
  // corpus builds from two of its own text values, `is_local = false` makes
  // it outlive the call, and the whole surface runs in one statement — so
  // `'a'::probe_enum` stopped resolving and twenty-four enum signatures went
  // from claimed-and-held to probed-in-name-only, in silence. The coherent
  // call keeps the mechanism (a GUC is set and its new value returned) with
  // a setting nothing reads and `is_local = true`.
  'set_config(text,text,boolean)':
    "sets a SESSION GUC that outlives the call — search_path among the corpus's own values, which hides the probe's enum type from every later expression in the statement",
  // The third reason: creating a LOGICAL slot waits for every in-progress
  // transaction to finish before it can reach a consistent snapshot, and this
  // probe database holds a PREPARED transaction — which never finishes. Two of
  // its own objects, each added for an unrelated row, and neither one predicts
  // the other. A temporary slot waits the same way, so there is no bounded
  // spelling to put here; the row is probed in the SIDE instance instead
  // (SIDE_DB_SCRIPT), which holds neither object.
  'pg_create_logical_replication_slot(name,name,boolean,boolean,boolean)':
    "waits forever for the probe database's prepared transaction to finish; probed in the side instance instead",
  // The fourth reason, and the worst consequence of the four: READING a slot
  // through pgoutput kills the backend outright rather than raising. It
  // survives today only because no corpus value spells the plugin's required
  // options — the generated calls stop at "option proto_version missing" — and
  // that is a corpus edit away from being a dead run instead of a verdict.
  // SIDE_DB_SCRIPT records the full measurement and why no plugin in this
  // build can answer these.
  'pg_logical_slot_get_changes(name,pg_lsn,integer,text[])':
    'reading a slot through pgoutput takes the backend down; no textual output plugin exists in this build',
  'pg_logical_slot_get_binary_changes(name,pg_lsn,integer,text[])':
    'reading a slot through pgoutput takes the backend down; no textual output plugin exists in this build',
  'pg_logical_slot_peek_changes(name,pg_lsn,integer,text[])':
    'reading a slot through pgoutput takes the backend down; no textual output plugin exists in this build',
  'pg_logical_slot_peek_binary_changes(name,pg_lsn,integer,text[])':
    'reading a slot through pgoutput takes the backend down; no textual output plugin exists in this build',
  // Clears the session replication origin PROBE_OBJECTS_SQL configures, which
  // three other rows need — the set_config shape again, one family over. Its
  // own verdict comes from the SIDE instance, which configures no origin until
  // the two origin rows ask it to.
  'pg_replication_origin_session_reset()':
    'clears the session replication origin the probe database configures, which three other rows are evaluated against; probed in the side instance instead',
  // DROPS the probe database's replication slots. The `name` corpus carries
  // their names — that is what made the slot family probeable at all — so
  // its generated combinations delete the objects `pg_replication_slot_advance`
  // and the copy rows are evaluated against, and which ran first decided
  // their verdict. Its coherent call creates a slot of its own to drop.
  'pg_drop_replication_slot(name)':
    "drops the probe database's own replication slots, which four other rows are evaluated against",
}

export const PROBE_FN_SQL = `
  CREATE FUNCTION probe(expr text) RETURNS text LANGUAGE plpgsql AS $probe$
  DECLARE r boolean;
  BEGIN
    EXECUTE 'SELECT (' || expr || ') IS NULL' INTO r;
    RETURN CASE WHEN r THEN 'NULL' ELSE 'value' END;
  EXCEPTION WHEN OTHERS THEN RETURN 'error';
  END $probe$;`

/** A large object created by the call itself, and a descriptor open on one. */
const LO_NEW = 'pg_catalog.lo_create(0::oid)'
const LO_FD = `pg_catalog.lo_open(${LO_NEW}, 393216)`

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
  'date_trunc(text,timestamp with time zone,text)': [
    ["'day'", "'2020-01-01Z'::timestamptz", "'UTC'"],
    ["'hour'", "'infinity'::timestamptz", "'UTC'"],
  ],
  // A role, an object of the right KIND, and a privilege that kind accepts.
  // `pg_class`, `pg_catalog`, `sql` and `pg_default` exist in every
  // PostgreSQL; the role is the one PGlite runs as.
  'has_column_privilege(name,text,smallint,text)': [
    ["'postgres'::name", "'pg_class'", '1::smallint', "'SELECT'"],
  ],
  'has_column_privilege(name,text,text,text)': [
    ["'postgres'::name", "'pg_class'", "'relname'", "'SELECT'"],
  ],
  'has_column_privilege(oid,text,smallint,text)': [
    ["'postgres'::regrole::oid", "'pg_class'", '1::smallint', "'SELECT'"],
  ],
  'has_column_privilege(oid,text,text,text)': [
    ["'postgres'::regrole::oid", "'pg_class'", "'relname'", "'SELECT'"],
  ],
  'has_column_privilege(text,smallint,text)': [["'pg_class'", '1::smallint', "'SELECT'"]],
  'has_column_privilege(text,text,text)': [["'pg_class'", "'relname'", "'SELECT'"]],
  'has_database_privilege(name,text,text)': [
    ["'postgres'::name", 'current_database()', "'CONNECT'"],
  ],
  'has_database_privilege(oid,text,text)': [
    ["'postgres'::regrole::oid", 'current_database()', "'CONNECT'"],
  ],
  'has_database_privilege(text,text)': [['current_database()', "'CONNECT'"]],
  'has_function_privilege(oid,text,text)': [
    ["'postgres'::regrole::oid", "'upper(text)'", "'EXECUTE'"],
  ],
  'has_language_privilege(name,text,text)': [["'postgres'::name", "'sql'", "'USAGE'"]],
  // Five more (name,text,text) spellings, which the name corpus's growth
  // pushed past the combination cap: above it the sampler varies ONE
  // argument from a baseline, and these need the role, the object and the
  // privilege valid at once. Trap 5 — a coherent call, not a bigger cap.
  'has_any_column_privilege(name,text,text)': [["'postgres'::name", "'pg_class'", "'SELECT'"]],
  'has_function_privilege(name,text,text)': [["'postgres'::name", "'upper(text)'", "'EXECUTE'"]],
  'has_parameter_privilege(name,text,text)': [["'postgres'::name", "'search_path'", "'SET'"]],
  'has_table_privilege(name,text,text)': [["'postgres'::name", "'pg_class'", "'SELECT'"]],
  'has_type_privilege(name,text,text)': [["'postgres'::name", "'integer'", "'USAGE'"]],
  'has_language_privilege(oid,text,text)': [["'postgres'::regrole::oid", "'sql'", "'USAGE'"]],
  'has_language_privilege(text,text)': [["'sql'", "'USAGE'"]],
  'has_schema_privilege(name,text,text)': [["'postgres'::name", "'pg_catalog'", "'USAGE'"]],
  'has_schema_privilege(oid,text,text)': [["'postgres'::regrole::oid", "'pg_catalog'", "'USAGE'"]],
  'has_schema_privilege(text,text)': [["'pg_catalog'", "'USAGE'"]],
  'has_tablespace_privilege(name,text,text)': [["'postgres'::name", "'pg_default'", "'CREATE'"]],
  'has_tablespace_privilege(oid,text,text)': [
    ["'postgres'::regrole::oid", "'pg_default'", "'CREATE'"],
  ],
  'has_tablespace_privilege(text,text)': [["'pg_default'", "'CREATE'"]],
  // The SEQUENCE privileges (2026-08-21). They were pinned unprobeable
  // because "a fresh PGlite has no sequence" — true when it was written, and
  // false as soon as `PROBE_OBJECTS_SQL` reached the classifying suite. The
  // foreign-data-wrapper and foreign-server rows keep that reason; these
  // three lost it.
  'has_sequence_privilege(name,text,text)': [["'postgres'::name", "'probe_seq'", "'USAGE'"]],
  'has_sequence_privilege(oid,text,text)': [["'postgres'::regrole::oid", "'probe_seq'", "'USAGE'"]],
  'has_sequence_privilege(text,text)': [["'probe_seq'", "'USAGE'"]],
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
  'lo_export(oid,text)': [['16000::oid', "'probe_export'"]],
  'lo_get(oid)': [['16000::oid']],
  'lo_get(oid,bigint,integer)': [['16000::oid', '0::bigint', '1']],
  'lo_import(text)': [["'probe_lo'"]],
  'lo_import(text,oid)': [["'probe_lo'", '0::oid']],
  'lo_open(oid,integer)': [[LO_NEW, '393216']],
  'lo_put(oid,bigint,bytea)': [[LO_NEW, '0::bigint', "'abc'::bytea"]],
  'lo_unlink(oid)': [[LO_NEW]],
  // The server-side file readers, against the file the large object exported.
  // They convicted before this entry existed because `lo_export(0::oid,'abc')`
  // had written a file called `abc` earlier in the same statement — a
  // promotion resting on alphabetical order, which the totality probe (whose
  // fetch has no ORDER BY) did not reproduce.
  'pg_read_binary_file(text)': [["'probe_lo'"]],
  'pg_read_binary_file(text,bigint,bigint)': [["'probe_lo'", '0::bigint', '1::bigint']],
  'pg_read_file(text)': [["'probe_lo'"]],
  'pg_read_file(text,bigint,bigint)': [["'probe_lo'", '0::bigint', '1::bigint']],
  'pg_stat_file(text)': [["'probe_lo'"]],
  // A slot created by the call itself. The same order accident: `pg_create_*`
  // sorts before `pg_drop_*` and left one lying around.
  'pg_drop_replication_slot(name)': [
    [
      "(pg_catalog.pg_create_physical_replication_slot('probe_drop'::name, false, false)).slot_name",
    ],
  ],
  // A slot name that is FREE. Every name the corpus carries is one the probe
  // database already made, and creating a slot that exists raises — so once
  // the DROP row stopped clearing them, this row had nothing left to create.
  'pg_create_physical_replication_slot(name,boolean,boolean)': [
    ["'probe_create'::name", 'true', 'false'],
  ],
  // The refused row's bounded call: a GUC nothing reads, set LOCALLY.
  'set_config(text,text,boolean)': [["'application_name'", "'probe'", 'true']],
  'lo_close(integer)': [[LO_FD]],
  'lo_lseek(integer,integer,integer)': [[LO_FD, '0', '0']],
  'lo_lseek64(integer,bigint,integer)': [[LO_FD, '0::bigint', '0']],
  'lo_tell(integer)': [[LO_FD]],
  'lo_tell64(integer)': [[LO_FD]],
  'lo_truncate(integer,integer)': [[LO_FD, '0']],
  'lo_truncate64(integer,bigint)': [[LO_FD, '0::bigint']],
  'loread(integer,integer)': [[LO_FD, '1']],
  'lowrite(integer,bytea)': [[LO_FD, "'abc'::bytea"]],
  // A statistics KIND, a reset TARGET and a log FORMAT — each a small closed
  // vocabulary its function raises for anything outside, the same shape as
  // the privilege words above. `pg_current_logfile` is the one that answers
  // rather than convicting: with no logging collector running there is no
  // file, and it returns NULL exactly as its no-argument sibling does.
  'pg_stat_have_stats(text,oid,bigint)': [["'relation'", "'pg_class'::regclass::oid", '0::bigint']],
  'pg_stat_reset_shared(text)': [["'bgwriter'"]],
  'pg_current_logfile(text)': [["'stderr'"]],
  // A QUERY, which is what these three take rather than a string: `ts_stat`
  // wants one returning a single tsvector column and `ts_rewrite` one
  // returning two tsqueries. The corpus's `'SELECT'` is a legal query and
  // reaches neither shape.
  'ts_stat(text)': [["'SELECT ''a b''::tsvector'"]],
  'ts_stat(text,text)': [["'SELECT ''a:1A b:2B''::tsvector'", "'A'"]],
  'ts_rewrite(tsquery,text)': [["'a'::tsquery", "'SELECT ''a''::tsquery, ''b''::tsquery'"]],
  // A directory that EXISTS. `pg_ls_dir` raises for one that does not, and
  // every corpus text is a name rather than a path; `base` is in every data
  // directory PostgreSQL has ever laid out. The three-argument spelling
  // needed it more, not less: `missing_ok` turns the raise into an EMPTY
  // set, which is no more evidence of totality than the raise was.
  'pg_ls_dir(text)': [["'base'"]],
  'pg_ls_dir(text,boolean,boolean)': [["'base'", 'false', 'false']],
  // A schema and a relation in it. These take the object by NAME in two
  // parts, so one text list cannot be both — the `has_column_privilege`
  // shape again.
  'pg_clear_relation_stats(text,text)': [["'pg_catalog'", "'pg_class'"]],
  'pg_clear_attribute_stats(text,text,text,boolean)': [
    ["'pg_catalog'", "'pg_class'", "'relname'", 'false'],
  ],
  // The FOREIGN-DATA-WRAPPER and FOREIGN-SERVER privileges (2026-08-21).
  // Both objects exist in the probe database now, closing the last of the
  // no-such-object group.
  'has_foreign_data_wrapper_privilege(name,text,text)': [
    ["'postgres'::name", "'probe_fdw'", "'USAGE'"],
  ],
  'has_foreign_data_wrapper_privilege(oid,text,text)': [
    ["'postgres'::regrole::oid", "'probe_fdw'", "'USAGE'"],
  ],
  'has_foreign_data_wrapper_privilege(text,text)': [["'probe_fdw'", "'USAGE'"]],
  'has_server_privilege(name,text,text)': [["'postgres'::name", "'probe_srv'", "'USAGE'"]],
  'has_server_privilege(oid,text,text)': [["'postgres'::regrole::oid", "'probe_srv'", "'USAGE'"]],
  'has_server_privilege(text,text)': [["'probe_srv'", "'USAGE'"]],
  // The I/O entry points that take a TARGET TYPE's oid beside the string.
  // The cstring corpus can carry the syntax but not the type: `array_in`
  // wants an element type, `domain_in` a domain, `record_in` a composite,
  // and the two the probe database had to grow a `probe_dom`/`probe_comp`
  // for cannot be spelled with a base type at all.
  'array_in(cstring,oid,integer)': [["'{1,2}'::cstring", "'int4'::regtype::oid", '(-1)']],
  'domain_in(cstring,oid,integer)': [["'1'::cstring", "'probe_dom'::regtype::oid", '(-1)']],
  'record_in(cstring,oid,integer)': [["'(1,abc)'::cstring", "'probe_comp'::regtype::oid", '(-1)']],
  'range_in(cstring,oid,integer)': [["'[1,2)'::cstring", "'int4range'::regtype::oid", '(-1)']],
  'multirange_in(cstring,oid,integer)': [
    ["'{[1,2)}'::cstring", "'int4multirange'::regtype::oid", '(-1)'],
  ],
  'enum_in(cstring,oid)': [["'a'::cstring", "'probe_enum'::regtype::oid"]],
  // A composite TARGET, which is what these populate into. The polymorphic
  // families instantiate `anyelement` as an integer, and an integer has no
  // fields to fill.
  'json_populate_record(anyelement,json,boolean)': [
    ['NULL::probe_comp', '\'{"a":1}\'::json', 'false'],
  ],
  'json_populate_recordset(anyelement,json,boolean)': [
    ['NULL::probe_comp', '\'[{"a":1}]\'::json', 'false'],
  ],
  'jsonb_populate_record(anyelement,jsonb)': [['NULL::probe_comp', '\'{"a":1}\'::jsonb']],
  'jsonb_populate_record_valid(anyelement,jsonb)': [['NULL::probe_comp', '\'{"a":1}\'::jsonb']],
  'jsonb_populate_recordset(anyelement,jsonb)': [['NULL::probe_comp', '\'[{"a":1}]\'::jsonb']],
  // A real modulus/remainder pair against a HASH-partitioned parent.
  'satisfies_hash_partition(oid,integer,integer,"any")': [
    ["'probe_hash'::regclass::oid", '2', '0', '1'],
  ],
  // Objects identified by OID where the corpus can only offer 0 and 1, and
  // where the KIND of object is the whole question — an opclass, a
  // collation, a function of a particular language, a sequence.
  'amvalidate(oid)': [["(SELECT oid FROM pg_opclass WHERE opcname = 'int4_ops' LIMIT 1)"]],
  'pg_collation_actual_version(oid)': [["'probe_coll'::regcollation::oid"]],
  'fmgr_sql_validator(oid)': [["'probe_sql()'::regprocedure::oid"]],
  'fmgr_internal_validator(oid)': [["'upper(text)'::regprocedure::oid"]],
  'fmgr_c_validator(oid)': [["'plpgsql_call_handler()'::regprocedure::oid"]],
  'plpgsql_validator(oid)': [["'probe_plpgsql()'::regprocedure::oid"]],
  'pg_sequence_parameters(oid)': [["'probe_seq'::regclass::oid"]],
  'pg_nextoid(regclass,name,regclass)': [
    ["'pg_class'::regclass", "'oid'::name", "'pg_class_oid_index'::regclass"],
  ],
  // A committed transaction's id, which only `track_commit_timestamp` makes
  // answerable and only a real xid reaches — the corpus's xid is 0.
  'pg_xact_commit_timestamp(xid)': [['(SELECT xmin FROM probe_rel LIMIT 1)']],
  'pg_xact_commit_timestamp_origin(xid)': [['(SELECT xmin FROM probe_rel LIMIT 1)']],
  // A relation and one of its columns, in two parts.
  // Both sides: a column that HAS an owned sequence and one that does not —
  // the second is NULL, and no corpus of relation names finds it by chance.
  'pg_get_serial_sequence(text,text)': [
    ["'probe_serial'", "'id'"],
    ["'probe_rel'", "'i'"],
  ],
  // An object ADDRESS: a catalog oid, an object oid in it, and a sub-id.
  'pg_identify_object(oid,oid,integer)': [
    ["'pg_class'::regclass::oid", "'probe_rel'::regclass::oid", '0'],
  ],
  'pg_identify_object_as_address(oid,oid,integer)': [
    ["'pg_class'::regclass::oid", "'probe_rel'::regclass::oid", '0'],
  ],
  'pg_get_object_address(text,text[],text[])': [
    ["'table'", "ARRAY['probe_rel']", 'ARRAY[]::text[]'],
  ],
  // The last has_column_privilege spelling, which takes the relation by OID
  // and the column by name — no per-type choice can be both.
  // Both corners. A SUPERUSER grantee short-circuits to true before the
  // object is looked up, so the first call reaches a value and only the
  // second reaches the NULL a missing relation gives — and past the
  // combination cap the sampler can vary one argument at a time, never four.
  'has_column_privilege(name,oid,text,text)': [
    ["'postgres'::name", "'probe_rel'::regclass::oid", "'i'", "'SELECT'"],
    ["'probe_role'::name", '999999::oid', "'i'", "'SELECT'"],
  ],
  'has_column_privilege(name,oid,smallint,text)': [
    ["'postgres'::name", "'probe_rel'::regclass::oid", '1::smallint', "'SELECT'"],
    ["'probe_role'::name", '999999::oid', '1::smallint', "'SELECT'"],
  ],
  // Copying a replication slot needs an existing source and a name that is
  // FREE, and the corpus can only offer names that already exist. Each
  // spelling gets its own destination for the same reason.
  'pg_copy_physical_replication_slot(name,name)': [["'probe_slot'::name", "'probe_copy1'::name"]],
  'pg_copy_physical_replication_slot(name,name,boolean)': [
    ["'probe_slot'::name", "'probe_copy2'::name", 'false'],
  ],
  'pg_copy_logical_replication_slot(name,name)': [["'probe_lslot'::name", "'probe_copy3'::name"]],
  'pg_copy_logical_replication_slot(name,name,boolean)': [
    ["'probe_lslot'::name", "'probe_copy4'::name", 'false'],
  ],
  'pg_copy_logical_replication_slot(name,name,boolean,name)': [
    ["'probe_lslot'::name", "'probe_copy5'::name", 'false', "'pgoutput'::name"],
  ],
  // A replication ORIGIN by name. These take `text` rather than `name`, so
  // the corpus entry that unblocked the slot family does not reach them.
  'pg_replication_origin_advance(text,pg_lsn)': [["'probe_origin2'", "'0/1'::pg_lsn"]],
  // A slot by name and a target the server will accept: advancing past the
  // current WAL position raises, and the corpus's pg_lsn values are 0/0 and
  // the maximum. The RESET row takes its slot as `text`, where the corpus
  // carries no slot name at all — only `name` gained one.
  'pg_replication_slot_advance(name,pg_lsn)': [
    ["'probe_slot'::name", 'pg_catalog.pg_current_wal_lsn()'],
  ],
  'pg_stat_reset_replication_slot(text)': [["'probe_slot'"]],
  'pg_replication_origin_progress(text,boolean)': [["'probe_origin'", 'false']],
  // A real WAL file name, which only the server can spell.
  'pg_split_walfile_name(text)': [['pg_catalog.pg_walfile_name(pg_catalog.pg_current_wal_lsn())']],
  // The default TABLESPACE, by name and by OID. Creating one needs a
  // directory the WASM filesystem has no way to make, but pg_default is
  // there in every cluster.
  'pg_tablespace_size(name)': [["'pg_default'::name"]],
  'pg_tablespace_size(oid)': [['1663::oid']],
  'pg_tablespace_databases(oid)': [['1663::oid']],
  // A text-search PARSER's oid, which is a different kind of object from
  // anything the oid corpus carries.
  'ts_parse(oid,text)': [['(SELECT oid FROM pg_ts_parser LIMIT 1)', "'abc'"]],
  'ts_token_type(oid)': [['(SELECT oid FROM pg_ts_parser LIMIT 1)']],
  // An explicit source ENCODING, which is the whole point of the two- and
  // three-argument spellings: the one-argument form reads the DATABASE
  // encoding and PGlite's is UTF8, which `to_ascii` refuses.
  'to_ascii(text,integer)': [["'abc'", '8']],
  // The NAME spelling takes the encoding as a name, and this is the ONE
  // place an encoding name may be written: `probe-values.ts` bars them from
  // the `name` CORPUS because `convert_to(text,name)` reads whatever is
  // there as one and a real conversion poisons the backend. A coherent call
  // reaches `to_ascii` and nothing else.
  'to_ascii(text,name)': [["'abc'", "'LATIN1'::name"]],
  // Statistics restored as VARIADIC name/value pairs, which no per-type
  // choice can build — the first element must be a known key and the second
  // its value, alternating.
  'pg_restore_relation_stats("any")': [
    [
      "VARIADIC ARRAY['schemaname','public','relname','probe_rel'," +
        "'relpages','1','reltuples','2','relallvisible','0','version','180000']",
    ],
  ],
  // Written as loose arguments rather than a VARIADIC array, because
  // `inherited` must arrive as a real boolean and an array makes every
  // element text — "argument \"inherited\" must not be null" is what that
  // looks like from the outside.
  'pg_restore_attribute_stats("any")': [
    [
      "'schemaname'",
      "'public'",
      "'relname'",
      "'probe_rel'",
      "'attname'",
      "'i'",
      "'inherited'",
      'false',
      "'version'",
      '180000',
    ],
  ],
  // A publication name. The row is VARIADIC over text, so the call takes
  // the element rather than the array its signature is keyed by.
  'pg_get_publication_tables(text[])': [["'probe_pub'"]],
  // The BOUNDED sleeps, which is the whole probed universe for those three
  // rows — every generated combination is refused above.
  'pg_sleep(double precision)': [['0::float8']],
  'pg_sleep_for(interval)': [["'0'::interval"]],
  'pg_sleep_until(timestamp with time zone)': [["'2020-01-01Z'::timestamptz"]],
}

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
  variadicElem === null ? [...types] : [...types.slice(0, -1), variadicElem, variadicElem]

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
  composite ? `(${call})::text` : call

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
export const SRF_ROW_LIMIT = 100

/**
 * A probe instance, complete: the configuration, the enum type, both probe
 * functions, every object and the prepared transaction.
 *
 * One factory because there are FIVE creation sites — two suites, the sweep,
 * and the two rebuild paths a poisoned backend takes — and they had already
 * drifted once: `PROBE_OBJECTS_SQL` existed for a year and the classifying
 * suite never ran it, so `'probe_seq'::regclass` raised there while the
 * gating suite answered. Same argument as the corpus itself: what the probes
 * are probing AGAINST cannot fork either.
 */
export async function createProbeDb(): Promise<PGlite> {
  const db = await PGlite.create({ postgresqlconf: [...PROBE_CONF] })
  await db.exec(`CREATE TYPE probe_enum AS ENUM ('a','b');`)
  await db.exec(PROBE_FN_SQL)
  await db.exec(SRF_PROBE_FN_SQL)
  await db.exec(PROBE_OBJECTS_SQL)
  // Separate statements: `exec` runs its whole string in one transaction, and
  // PREPARE TRANSACTION is what ends this one.
  for (const sql of PROBE_STANDALONE_SQL) await db.query(sql)
  return db
}

/**
 * Complete EXPRESSIONS supplied verbatim for one signature, for the rows whose
 * call SHAPE the builder cannot spell.
 *
 * COHERENT_CALLS supplies ARGUMENTS and the builder still writes the call as
 * `name(args)`. These four need something else entirely: a record-returning
 * json function refuses to be an expression at all — "could not determine row
 * type for result" — because its result type comes from a COLUMN DEFINITION
 * LIST, which is FROM-clause syntax. They were pinned unprobed for exactly
 * that, under a `coldeflist` group saying no expression can carry one.
 *
 * The group was wrong, and cheaply: a scalar SUBQUERY over that FROM clause IS
 * an ordinary expression, so no new probe path is needed. `(SELECT s.b FROM
 * json_to_record('{"a":1}'::json) AS s(a int, b text))` sits in a target list
 * like anything else and answers NULL for a key the json does not carry.
 *
 * The FROM-position materialisation trap `srfQuery` exists to avoid does not
 * bite here: the input is a LITERAL of one or two elements, so the scan is
 * bounded by the literal rather than by a corpus value. `OFFSET 1` is what
 * reaches the second row of a recordset without the subquery raising on a
 * multi-row result.
 */
export const EXPR_PROBES: Record<string, readonly string[]> = {
  'json_to_record(json)': [
    `(SELECT s.b FROM pg_catalog.json_to_record('{"a":1,"b":"x"}'::json) AS s(a int, b text))`,
    `(SELECT s.b FROM pg_catalog.json_to_record('{"a":1}'::json) AS s(a int, b text))`,
  ],
  'json_to_recordset(json)': [
    `(SELECT s.b FROM pg_catalog.json_to_recordset('[{"a":1,"b":"x"}]'::json) AS s(a int, b text))`,
    `(SELECT s.b FROM pg_catalog.json_to_recordset('[{"a":1,"b":"x"},{"a":2}]'::json) AS s(a int, b text) OFFSET 1)`,
  ],
  'jsonb_to_record(jsonb)': [
    `(SELECT s.b FROM pg_catalog.jsonb_to_record('{"a":1,"b":"x"}'::jsonb) AS s(a int, b text))`,
    `(SELECT s.b FROM pg_catalog.jsonb_to_record('{"a":1}'::jsonb) AS s(a int, b text))`,
  ],
  'jsonb_to_recordset(jsonb)': [
    `(SELECT s.b FROM pg_catalog.jsonb_to_recordset('[{"a":1,"b":"x"}]'::jsonb) AS s(a int, b text))`,
    `(SELECT s.b FROM pg_catalog.jsonb_to_recordset('[{"a":1,"b":"x"},{"a":2}]'::jsonb) AS s(a int, b text) OFFSET 1)`,
  ],
}

/**
 * Expressions that must NOT go through `probe()`, and the one reason there is.
 *
 * `probe()` catches per-expression errors in a plpgsql EXCEPTION block, and an
 * EXCEPTION block is a SUBTRANSACTION. PostgreSQL refuses to export a snapshot
 * from one — "cannot export a snapshot from a subtransaction" — so the row was
 * pinned unprobed under a group naming the harness rather than the database.
 * It was the only such row, and the pin was right about the cause: run the same
 * call as a statement of its own and it answers.
 *
 * The price is one round trip per expression and no error isolation from the
 * batch, which is why this table is a list rather than a mode. The recorded
 * expression carries an SQL comment so the work list says which path produced
 * the verdict — the bare call is ALSO probed by the batch, where it errors, and
 * two identical strings would collapse into one entry.
 */
export const DIRECT_PROBES: Record<string, readonly string[]> = {
  'pg_export_snapshot()': ['pg_catalog.pg_export_snapshot() /* no subtransaction */'],
}

/**
 * A SECOND probe instance, and the two groups that need one.
 *
 * The main probe database holds a PREPARED transaction (so `pg_prepared_xact()`
 * is non-empty) and a configured session replication ORIGIN (so three origin
 * rows evaluate). Both were added for unrelated rows, and each BLOCKS a family:
 *
 *   - creating or copying a logical slot waits for every in-progress
 *     transaction to reach a consistent snapshot, and a prepared transaction
 *     never reaches one. The wait is uninterruptible in WASM, so this is not a
 *     slow probe but a hung run — it cost a session once.
 *   - a session has exactly ONE replication origin, so the row that SETS one
 *     raises and the row that CLEARS one destroys what the three configured
 *     rows are measured against.
 *
 * Neither is a fact about the functions, so neither belongs in a verdict. A
 * second instance without those two objects answers all ten, and its own setup
 * is deliberately thin: a table, a publication for the decoding readers to
 * decode, a table to rewrite, and a log the event triggers write to.
 */
export const SIDE_PROBE_CONF: readonly string[] = [
  'wal_level = logical',
  'max_replication_slots = 100',
]

export const SIDE_PROBE_OBJECTS_SQL = `
  CREATE TABLE side_rw(x int);
  INSERT INTO side_rw VALUES (1);
  CREATE TABLE side_log(e text, v text);
  -- A grantee and a schema, each of which exists to make one event-trigger
  -- row answer NULL rather than merely answer. See EVENT_TRIGGER_PROBES.
  CREATE ROLE side_role NOLOGIN;
  CREATE SCHEMA side_schema;
`

export async function createSideProbeDb(): Promise<PGlite> {
  const db = await PGlite.create({ postgresqlconf: [...SIDE_PROBE_CONF] })
  await db.exec(PROBE_FN_SQL)
  await db.exec(SRF_PROBE_FN_SQL)
  await db.exec(SIDE_PROBE_OBJECTS_SQL)
  return db
}

/** One step of the side instance's script: an object to make, or a row to probe. */
export type SideStep =
  | { readonly setup: string }
  | {
      readonly key: string
      readonly expr: string
      /** A composite result needs `nullTestExpr`; see that function for why. */
      readonly composite?: boolean
      /** Output-column count for a SET-RETURNING row, absent for a scalar one. */
      readonly ncols?: number
    }

/**
 * The side instance's script, in ORDER — and the order is the mechanism, not a
 * convenience. A slot must exist before it can be copied, changes must be
 * written AFTER a slot is created for the slot to see them, and the origin row
 * that clears the session's origin must run after the one that sets it.
 *
 * Each reader gets a slot of its own because `_get_` CONSUMES what it reads:
 * sharing one would make the second reader's verdict depend on which ran first,
 * the same defect `pg_drop_replication_slot` was refused for.
 */
export const SIDE_DB_SCRIPT: readonly SideStep[] = [
  {
    key: 'pg_create_logical_replication_slot(name,name,boolean,boolean,boolean)',
    expr: "pg_catalog.pg_create_logical_replication_slot('side_l1', 'pgoutput', false, false, false)",
    composite: true,
  },
  {
    key: 'pg_copy_logical_replication_slot(name,name)',
    expr: "pg_catalog.pg_copy_logical_replication_slot('side_l1', 'side_c1')",
    composite: true,
  },
  {
    key: 'pg_copy_logical_replication_slot(name,name,boolean)',
    expr: "pg_catalog.pg_copy_logical_replication_slot('side_l1', 'side_c2', true)",
    composite: true,
  },
  {
    key: 'pg_copy_logical_replication_slot(name,name,boolean,name)',
    expr: "pg_catalog.pg_copy_logical_replication_slot('side_l1', 'side_c3', true, 'pgoutput')",
    composite: true,
  },
  // The four READERS are not here, and the reason is measured rather than
  // reasoned: a slot READ through pgoutput does not raise and does not return
  // an empty set — it takes the BACKEND DOWN. Every statement after it on that
  // connection answers zero rows, `pg_replication_slots` included, and
  // `pg_current_wal_lsn()` then reports ERRORDATA_STACK_SIZE exceeded.
  //
  // A first attempt read that zero-row answer as an empty set and put the
  // readers first in this script, which silently un-probed the two origin rows
  // below: they reported `error` because the connection was already gone, not
  // because PostgreSQL declined them. Their real verdict is `value`.
  //
  // pgoutput writes to a REPLICATION connection's stream, and there is no
  // walsender behind a SELECT. The plugin that produces SQL-readable output is
  // `test_decoding`, which is contrib rather than core and is absent from the
  // PGlite build (checked: it exists in the pglite source tree, not in the
  // published dist). So the four readers stay unprobed, and their generated
  // combinations are refused so a future corpus value cannot reach the fatal
  // path by accident — an option name away is too close for something that
  // costs the whole run.
  { setup: "SELECT pg_catalog.pg_replication_origin_create('side_origin')" },
  {
    key: 'pg_replication_origin_session_setup(text)',
    expr: "pg_catalog.pg_replication_origin_session_setup('side_origin')",
  },
  {
    key: 'pg_replication_origin_session_reset()',
    expr: 'pg_catalog.pg_replication_origin_session_reset()',
  },
]

/**
 * The EVENT TRIGGER rows, and the only shape that reaches them.
 *
 * Each of these four checks its calling context and raises for a plain SELECT —
 * "not fired by event trigger manager" — so the verdict has to be computed
 * INSIDE a trigger body and carried out in a table. That is what `side_log` is
 * for: the trigger function calls the same `probe()`/`srfprobe()` the batch
 * calls, over the same inner query, and inserts the answer.
 *
 * One trigger at a time, created and dropped around its own firing DDL. A
 * standing `ddl_command_end` trigger would also fire for the CREATE and DROP of
 * the NEXT probe's trigger, and every row it logged then would be a verdict
 * about the harness's own bookkeeping.
 *
 * The DDL is chosen from the C source, not for convenience. Two of the four
 * rows are set-returning and `event_trigger.c` fills `nulls[]` on named
 * branches, so the firing statement decides whether the row can WITNESS or
 * only evaluate:
 *
 *   - `pg_event_trigger_ddl_commands()` takes the `SCT_Grant` branch for a
 *     GRANT or REVOKE, which sets classid, objid, objsubid, schema and
 *     identity NULL in one row. A `CREATE TABLE` takes the ordinary branch and
 *     fills all nine columns.
 *   - `pg_event_trigger_dropped_objects()` leaves `schema_name` NULL for an
 *     object that HAS no schema. Dropping a table gives 'public' for both the
 *     table and its composite type; dropping a SCHEMA gives NULL.
 *
 * So each of those two is fired twice, and the pair is the evidence: the
 * ordinary DDL shows the row evaluates, the chosen one shows it answers NULL.
 * The recorded expression carries the firing statement as an SQL comment,
 * which is what keeps two firings of the same call from collapsing into one
 * verdict — and what makes the work-list line say which DDL produced it.
 */
export const EVENT_TRIGGER_PROBES: readonly {
  readonly when: string
  readonly fire: string
  readonly probes: readonly { readonly key: string; readonly call: string }[]
}[] = [
  {
    when: 'ddl_command_end',
    fire: 'CREATE TABLE side_et(x int)',
    probes: [
      {
        key: 'pg_event_trigger_ddl_commands()',
        call: 'pg_catalog.pg_event_trigger_ddl_commands()',
      },
    ],
  },
  {
    when: 'sql_drop',
    fire: 'DROP TABLE side_et',
    probes: [
      {
        key: 'pg_event_trigger_dropped_objects()',
        call: 'pg_catalog.pg_event_trigger_dropped_objects()',
      },
    ],
  },
  {
    // int to bigint changes the stored width, which is what makes this a
    // REWRITE rather than a catalog update — `ALTER COLUMN … TYPE text` would
    // not fire the trigger at all.
    when: 'table_rewrite',
    fire: 'ALTER TABLE side_rw ALTER COLUMN x TYPE bigint',
    probes: [
      {
        key: 'pg_event_trigger_table_rewrite_oid()',
        call: 'pg_catalog.pg_event_trigger_table_rewrite_oid()',
      },
      {
        key: 'pg_event_trigger_table_rewrite_reason()',
        call: 'pg_catalog.pg_event_trigger_table_rewrite_reason()',
      },
    ],
  },
  // The two firings chosen from `event_trigger.c` for their NULL branches.
  {
    when: 'ddl_command_end',
    fire: 'GRANT SELECT ON side_rw TO side_role',
    probes: [
      {
        key: 'pg_event_trigger_ddl_commands()',
        call: 'pg_catalog.pg_event_trigger_ddl_commands()',
      },
    ],
  },
  {
    when: 'sql_drop',
    fire: 'DROP SCHEMA side_schema',
    probes: [
      {
        key: 'pg_event_trigger_dropped_objects()',
        call: 'pg_catalog.pg_event_trigger_dropped_objects()',
      },
    ],
  },
]

/**
 * Every signature some out-of-band mechanism probes, derived from the three
 * tables rather than listed a fourth time.
 *
 * A refusal owes an accounting — a bounded call that reaches a result, or a
 * record saying the probe declines the row — and being probed somewhere else
 * is a third answer the pin did not have. Two rows are refused precisely
 * BECAUSE the side instance is where they can be asked.
 */
export const OUT_OF_BAND_KEYS: ReadonlySet<string> = new Set([
  ...Object.keys(DIRECT_PROBES),
  ...SIDE_DB_SCRIPT.flatMap((s) => ('setup' in s ? [] : [s.key])),
  ...EVENT_TRIGGER_PROBES.flatMap((g) => g.probes.map((p) => p.key)),
])

/** One out-of-band verdict, in the shape the classifier merges. */
export interface OutOfBandVerdict {
  readonly key: string
  readonly expr: string
  readonly verdict: string
}

/**
 * Run one expression and read its verdict WITHOUT `probe()` — the caller's
 * connection, one statement, the error caught in JavaScript.
 *
 * Same three answers the plpgsql probes give, decided the same way: an
 * emitted-nothing set is `empty` rather than a value, and a composite is cast
 * before the NULL test.
 */
async function directVerdict(
  db: PGlite,
  expr: string,
  ncols?: number,
  composite?: boolean,
): Promise<string> {
  try {
    if (ncols !== undefined) {
      const r = await db.query<{ count: string | number; bool_or: boolean | null }>(
        srfQuery(expr, ncols),
      )
      if (Number(r.rows[0]?.count ?? 0) === 0) return 'empty'
      return r.rows[0]?.bool_or ? 'NULL' : 'value'
    }
    const r = await db.query<{ v: boolean | null }>(
      `SELECT (${nullTestExpr(expr, composite ?? false)}) IS NULL AS v`,
    )
    return r.rows[0]?.v ? 'NULL' : 'value'
  } catch {
    return 'error'
  }
}

/**
 * Every probe the classifying batch cannot make, run and reported as verdicts
 * the batch's own merge understands.
 *
 * Three mechanisms, one per reason the batch is the wrong place: a snapshot
 * export that a subtransaction forbids, a family the main instance's own
 * objects block, and four rows whose only caller is the event trigger manager.
 * The fourth reason — a call shape with no expression spelling — needed no
 * mechanism in the end and lives in `EXPR_PROBES` as ordinary expressions.
 *
 * A verdict here is evidence of exactly the same weight as a batch verdict.
 * What differs is where the call ran, and nothing about where a call runs
 * changes whether its result was NULL.
 */
export async function runOutOfBandProbes(pg: PGlite): Promise<OutOfBandVerdict[]> {
  const out: OutOfBandVerdict[] = []

  for (const [key, exprs] of Object.entries(DIRECT_PROBES)) {
    for (const expr of exprs) {
      out.push({ key, expr, verdict: await directVerdict(pg, expr) })
    }
  }

  const side = await createSideProbeDb()
  try {
    // The event triggers first: their firing DDL is the noisiest thing in the
    // script, and doing it before any slot exists keeps it out of what the
    // decoding readers decode.
    const ncols = await srfColumnCounts(
      side,
      EVENT_TRIGGER_PROBES.flatMap((g) => g.probes.map((p) => p.key)),
    )
    // The recorded expression names its firing DDL in an SQL comment, so the
    // two firings of a row that is probed twice stay two verdicts rather than
    // one overwriting the other. It is still the call that runs — a comment
    // inside the expression is inert, and it travels into the trigger body's
    // inner query with it.
    const firedExpr = (call: string, fire: string): string => `${call} /* fired by: ${fire} */`
    for (const group of EVENT_TRIGGER_PROBES) {
      const body = group.probes
        .map((p) => {
          const n = ncols.get(p.key)
          const expr = firedExpr(p.call, group.fire)
          const inner = n === undefined ? expr : srfQuery(expr, n)
          const fn = n === undefined ? 'probe' : 'srfprobe'
          return `INSERT INTO side_log VALUES ($e$${expr}$e$, ${fn}($q$${inner}$q$));`
        })
        .join('\n        ')
      await side.exec(`
        CREATE FUNCTION side_et_fn() RETURNS event_trigger LANGUAGE plpgsql AS $et$
        BEGIN
        ${body}
        END $et$;
        CREATE EVENT TRIGGER side_et ON ${group.when} EXECUTE FUNCTION side_et_fn();
      `)
      try {
        await side.exec(group.fire)
      } catch {
        // The firing DDL itself failed; every probe of the group stays
        // unlogged and is reported as an error below.
      }
      await side.exec(`DROP EVENT TRIGGER side_et; DROP FUNCTION side_et_fn();`)
      const logged = new Map(
        (await side.query<{ e: string; v: string }>(`SELECT e, v FROM side_log`)).rows.map(
          (r) => [r.e, r.v] as const,
        ),
      )
      await side.exec(`DELETE FROM side_log;`)
      for (const p of group.probes) {
        const expr = firedExpr(p.call, group.fire)
        out.push({ key: p.key, expr, verdict: logged.get(expr) ?? 'error' })
      }
    }

    for (const step of SIDE_DB_SCRIPT) {
      if ('setup' in step) {
        try {
          await side.query(step.setup)
        } catch {
          // A setup statement that fails leaves the rows depending on it to
          // report their own error; it is not itself a verdict about anything.
        }
        continue
      }
      out.push({
        key: step.key,
        expr: step.expr,
        verdict: await directVerdict(side, step.expr, step.ncols, step.composite),
      })
    }
  } finally {
    if (!side.closed) await side.close()
  }
  return out
}

/**
 * Output-column count per signature key, for the set-returning rows among a
 * given set — the same expression the two suites compute it with, asked of the
 * catalog rather than written down. A scalar row is absent from the result.
 */
async function srfColumnCounts(db: PGlite, keys: string[]): Promise<Map<string, number>> {
  const names = [...new Set(keys.map((k) => k.slice(0, k.indexOf('('))))]
  const rows = (
    await db.query<{ key: string; ncols: number }>(
      `SELECT p.proname || '(' ||
              COALESCE((SELECT string_agg(format_type(t, null), ',' ORDER BY o)
                          FROM unnest(p.proargtypes) WITH ORDINALITY AS z(t, o)), '') || ')' AS key,
              CASE WHEN p.proargmodes IS NULL THEN 1
                   ELSE greatest(1, (SELECT count(*) FROM unnest(p.proargmodes) m
                                      WHERE m IN ('o','b','t'))) END::int AS ncols
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'pg_catalog' AND p.prokind = 'f'
          AND p.proretset AND p.proname = ANY($1);`,
      [names],
    )
  ).rows
  return new Map(rows.filter((r) => keys.includes(r.key)).map((r) => [r.key, r.ncols] as const))
}

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
  END $srf$;`

/**
 * The inner query for one set-returning call: how many rows it emitted (up to
 * the bound) and whether any of them holds a NULL in any output column.
 * Order-independent, which is the property `probe()` lacks.
 */
export function srfQuery(call: string, ncols: number): string {
  const cols = Array.from({ length: ncols }, (_, i) => `c${i}`)
  const projection = ncols === 1 ? `(${call})` : `(${call}).*`
  return (
    `SELECT count(*), bool_or(${cols.map((c) => `${c} IS NULL`).join(' OR ')})` +
    ` FROM (SELECT ${projection} LIMIT ${SRF_ROW_LIMIT}) s(${cols.join(', ')})`
  )
}
