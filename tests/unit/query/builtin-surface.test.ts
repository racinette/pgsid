import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import {
  ALWAYS_NOT_NULL_BUILTINS,
  FIRST_ARG_BUILTINS,
  STRICT_TOTAL_BUILTINS,
  STRICT_TOTAL_BUILTIN_SIGNATURES,
  SWEPT_TOTAL_SIGNATURES,
  NON_NULL_OVER_NONEMPTY_AGGREGATES,
  NEVER_NULL_WINDOW_SIGNATURES,
  STRICT_TOTAL_WINDOW_SIGNATURES,
} from "../../../src/query/nullability-walk.js";
import {
  TOTAL_OPERATORS,
  STRICT_OPERATORS,
  TOTAL_OPERATOR_SIGNATURES,
} from "../../../src/query/operators.js";
import {
  VALUES,
  POLYMORPHIC_FAMILIES,
  POLYMORPHIC,
  combinations,
  qualify,
  createProbeDb,
  REFUSED_CALLS,
  srfQuery,
  nullTestExpr,
  variadicArgTypes,
  COHERENT_CALLS,
  EXPR_PROBES,
  runOutOfBandProbes,
  OUT_OF_BAND_KEYS,
} from "./probe-values.js";

// ---------------------------------------------------------------------------
// The FULL builtin scalar surface, witnessed or classified (2026-08-09, by
// decision — superseding the charter's open question about extending past
// the curated set).
//
// The engine's default for a builtin outside the claim tables is "nullable",
// and that is a CLAIM: this project's discipline says a nullable claim is
// either witnessed by a NULL or its unwitnessability is explicit. The
// fixture suite enforces that per output column and then exempted the
// entire unclaimed builtin surface; this suite removes the exemption. Every
// pg_catalog `prokind = 'f'` signature lands in EXACTLY ONE category:
//
//   claimed          — a totality table or signature addition covers it; the
//                      totality probe holds the claim to execution.
//   no-generator     — a parameter type the shared corpus has no values for
//                      (internal, cstring, reg* …). Explicit, not silent.
//
// A `volatile` category sat between those two until 2026-08-21, excluding 276
// signatures from execution on the catalog's own `provolatile = 'v'`. It is
// gone, and its removal is the point: volatility says a repeat call may answer
// differently, which is not the question here — `nextval` is volatile, strict
// and TOTAL, and sat unwitnessed in that bucket until a borrowed corpus found
// it by accident. Those rows now classify by execution like every other row,
// against a probe database `PROBE_OBJECTS_SQL` gives the objects to answer
// about. `REFUSED_CALLS` names the three whose GENERATED calls must not be
// made and supplies bounded ones instead; nothing else is exempt.
//
// SET-RETURNING rows are probed too, under the question their shape asks —
// does ANY emitted row hold a NULL in ANY output column — via `srfprobe`
// rather than `probe`. They are not a category: they classify like
// everything else, and probe-values.ts records why the construction has to
// put the call in the TARGET LIST to be affordable at all.
//   raised-everywhere — every combination raised; probed in name only.
//   null-witnessed   — a corner combination returned NULL. The machine
//                      found the witness; the signature may NEVER acquire a
//                      totality claim (asserted below against the tables).
//   no-null-found    — every evaluated combination returned a value. The
//                      engine reads these nullable and this suite cannot
//                      witness it, so the disposition lives somewhere else:
//                      a hand-written fixture, the walk's frame gate, a
//                      source audit, or the register. SETTLED_ELSEWHERE says
//                      which, per row. Promotion stays HUMAN, the discovery/
//                      coverage split the register mandates.
//
// The corpus is `probe-values.ts`, one copy with the totality probe — the
// definition of "corner case" cannot fork between the gating suite and this
// classifying one.
// ---------------------------------------------------------------------------

/**
 * SETTLED ELSEWHERE, PINNED — every signature the engine reads as nullable
 * that this suite evaluated without finding a NULL, and where its disposition
 * actually lives.
 *
 * It was called WORK_LIST while it was one. It opened at 1832 and every entry
 * was a genuine promotion candidate; it is at eighteen now and NONE of them
 * is. The name outlived the fact, which is the failure mode trap 12 records —
 * a pin whose wording stops being true keeps being read as if it were. Four
 * dispositions are in here, and only the first two ever looked like work:
 *
 *   1. WITNESSED BY HAND in tests/unit/functions/, because the NULL route is
 *      session or transaction state the probe cannot vary, or sits past the
 *      combination cap. Seven rows. These are witnessed; this suite just
 *      cannot see it.
 *   2. CLAIMED BY THE WALK rather than by a table — `first_value` and
 *      `last_value` are notNull under the default-frame gate, which no claim
 *      table names. Two rows.
 *   3. CORRECTLY NULLABLE, with a live `PG_RETURN_NULL` read out of the C
 *      source that no single session can reach: an unset debug_query_string,
 *      a concurrent DROP. Seven rows, and promoting one would be a WRONG
 *      notNull. There is nothing to fix here and never will be.
 *   4. EXCLUDED BY THE REGISTER — the two encoding-conversion rows poison the
 *      backend and may not be probed at all.
 *
 * `node-census.test.ts`'s pattern, applied to the builtin surface, and added
 * for the gap that pattern exists to close: without it a PostgreSQL upgrade
 * that adds a function lands it in `no-null-found` and the suite PASSES, so a
 * real candidate hides among eighteen settled ones. Deliberately NOT a count:
 * a ratchet lets a regression hide behind an unrelated improvement, which is
 * the failure mode this project rejects everywhere else. Asserted in BOTH
 * directions, so a row that stops being on the list fails too — its reason has
 * become a claim about PostgreSQL that nothing checks.
 *
 * An entry here is a decision, not a TODO. Adding one means writing down where
 * the disposition lives; if the answer is "nobody has looked yet", the honest
 * move is to look, and the row does not belong here until somebody has.
 */
const SETTLED_ELSEWHERE: Record<string, string> = {
  // The encoding-conversion family POISONS the PGlite backend — a real
  // conversion attempt returns a zero-row "success" and leaves the instance
  // answering plain SELECTs while lying. Permanently excluded by the
  // register; `tests/probe/poison-hunt.ts` re-derives the list.
  "convert_from(bytea,name)": "PGlite backend poisoner, excluded by the register",
  "convert_to(text,name)": "PGlite backend poisoner, excluded by the register",
  // WITNESSED by hand, where the probe cannot reach the NULL. `current_schema`
  // needs a `search_path` naming nothing that exists — session state rather
  // than input — and the regexp rows sit past the combination cap, which
  // varies ONE argument from a baseline while these need two at once (a
  // non-matching pattern AND a valid flags string).
  "current_schema()": "witnessed in tests/unit/functions; its NULL route is search_path state",
  "pg_current_xact_id_if_assigned()":
    "witnessed in tests/unit/functions; its NULL route is transaction state — no xid until something writes, and the probe assigns one per batch so the verdict stops depending on chunk boundaries",
  "txid_current_if_assigned()":
    "witnessed in tests/unit/functions; the pre-PG13 spelling of the row above, same C function and same transaction-state NULL",
  "regexp_match(text,text,text)": "witnessed in tests/unit/functions; past the combination cap",
  "regexp_substr(text,text,integer,integer,text)":
    "witnessed in tests/unit/functions; past the combination cap",
  "regexp_substr(text,text,integer,integer,text,integer)":
    "witnessed in tests/unit/functions; past the combination cap",
  // Decided at the FRAME rather than by a table, so no claim table names
  // them and this suite cannot see the walk's reasoning. `first_value` and
  // `last_value` ARE notNull under the parser's default frame (the walk's
  // FRAMEOPTION_DEFAULTS gate); `nth_value` is witnessed — a frame shorter
  // than N has no Nth row, and unlike lag/lead it has no DEFAULT to answer
  // with.
  "first_value(anyelement)": "claimed by the walk's default-frame gate, not by a table",
  "last_value(anyelement)": "claimed by the walk's default-frame gate, not by a table",
  "nth_value(anyelement,integer)": "witnessed in tests/unit/functions; a short frame has no Nth row",
  // The volatile sweep's residue (2026-08-21). Each of these was convicted
  // by the probe and REFUSED promotion on the PostgreSQL source PGlite
  // builds from: the `PG_RETURN_NULL` is live, and the state that reaches it
  // is not an input the probe can vary. This is the `current_schema()` shape
  // one bucket over, and it is why the sweep read the source at all — 118
  // rows were promoted on the probe's evidence and these four were not.
  "current_query()":
    "NULL when `debug_query_string` is unset (a background worker, a portal with no source text); the probe always runs inside a statement",
  "pg_database_size(name)":
    "NULL when the database's directory is gone — a concurrent DROP DATABASE, which the probe cannot race; a missing OID raises instead",
  "pg_database_size(oid)":
    "NULL when the database's directory is gone — a concurrent DROP DATABASE, which the probe cannot race; a missing OID raises instead",
  "pg_get_loaded_modules()":
    "the module_name and version columns are NULL for a module that declares neither; every module PGlite loads declares both",
  // RACE-ONLY null routes (2026-08-21, from reaching the unprobed surface).
  // Each has a live `PG_RETURN_NULL` that fires when the object is gone
  // between the catalog lookup and the read — a concurrent DROP, which one
  // session cannot arrange. Held on the same rule as `pg_database_size`
  // above: a null route the source shows is a null route, and a probe that
  // cannot race one is not evidence against it.
  "pg_tablespace_size(name)":
    "NULL when the tablespace directory is gone — a concurrent DROP TABLESPACE, which the probe cannot race; a missing OID raises instead",
  "pg_tablespace_size(oid)":
    "NULL when the tablespace directory is gone — a concurrent DROP TABLESPACE, which the probe cannot race; a missing OID raises instead",
  "pg_show_replication_origin_status()":
    "its external_id column is NULL when the origin is dropped between the snapshot and the name lookup, which one session cannot arrange",
};

/**
 * THE TYPES WITH NO GENERATOR, PINNED — why the corner corpus carries no
 * literal for each, keyed by TYPE because that is where the reason lives: one
 * missing type blocks every signature that takes it, and `internal` alone
 * blocks 520.
 *
 * The third of the three pins, and the one that paid immediately. Writing
 * these reasons is what forced the question nobody had asked — is a literal
 * IMPOSSIBLE, or merely absent? — and the answer for nineteen types was
 * "merely absent": `'{1,2}'::float8[]`, `'<a/>'::xml`, `'pg_class'::regclass`
 * and `'{a}'::cstring[]` all run, and 102 signatures had been classified
 * unprobeable behind them for no reason anybody could state. Those types have
 * generators now; what is left is the list below, and every entry names which
 * of the two it is.
 *
 * Both directions are asserted, so a type that acquires a generator must lose
 * its entry — the reason would otherwise outlive the gap it explains.
 */
const NO_GENERATOR: Record<string, string> = {
  // --- refused: PostgreSQL will not accept a value of the type from SQL ---
  internal:
    "PostgreSQL refuses a value of this type from SQL outright (\"cannot accept a value of type internal\"), so no literal exists at any effort. Aggregate transition functions, index AM support and selectivity estimators take it, and none of them is reachable from a query",
  pg_node_tree: "an internal parse-tree rendering; the cast is refused",
  gtsvector: "a GiST index entry for tsvector; the cast is refused",
  pg_mcv_list: "extended statistics, most-common-values; the cast is refused",
  pg_dependencies: "extended statistics, functional dependencies; the cast is refused",
  pg_ndistinct: "extended statistics, n-distinct counts; the cast is refused",
  pg_brin_bloom_summary: "a BRIN bloom summary; the cast is refused",
  pg_brin_minmax_multi_summary: "a BRIN minmax-multi summary; the cast is refused",
  pg_ddl_command: "an event-trigger DDL command; the cast is refused",
  // --- pseudo-types: a return marker or a handler contract, never a value --
  void: "a RESULT marker, not a value — nothing can be passed as one",
  unknown: "the type of an unadorned literal before resolution; it never survives to be an argument",
  trigger: "the return contract of a trigger function, not a value",
  event_trigger: "the return contract of an event-trigger function",
  fdw_handler: "the return contract of a foreign-data-wrapper handler",
  index_am_handler: "the return contract of an index access-method handler",
  table_am_handler: "the return contract of a table access-method handler",
  language_handler: "the return contract of a procedural-language handler",
  tsm_handler: "the return contract of a tablesample method handler",
  // --- possible, and deliberately skipped ---------------------------------
};

/**
 * THE UNPROBED SURFACE, PINNED — every signature PostgreSQL declined for
 * EVERY combination the corpus can build, grouped by the reason it declined.
 *
 * The work-list pin above covers rows that evaluated and never answered NULL;
 * this covers rows that never evaluated at all. Both are the same claim in
 * the end — the engine reads these nullable and nothing witnesses it — and
 * both need the same guard, because a function a future PostgreSQL adds can
 * land in either and the run would pass with the surface quietly changed.
 *
 * A reason here is about the PROBE, not about the function: "capped sampling
 * cannot make three arguments valid at once" is a limit of this harness, and
 * a row leaving this list because somebody widened the corpus is progress,
 * not a failure. That is why the assertion names the group.
 */
const UNPROBED: Record<string, readonly string[]> = {
  // refuses unless the server is in BINARY UPGRADE MODE, which pg_upgrade sets on the command line and no session can reach: "function can only be called when server is in binary upgrade mode", whatever the arguments
  "binary-upgrade": [
    "binary_upgrade_add_sub_rel_state(text,oid,\"char\",pg_lsn)",
    "binary_upgrade_create_empty_extension(text,text,boolean,text,oid[],text[],text[])",
    "binary_upgrade_logical_slot_has_caught_up(name)",
    "binary_upgrade_replorigin_advance(text,pg_lsn)",
    "binary_upgrade_set_missing_value(oid,text,text)",
    "binary_upgrade_set_next_array_pg_type_oid(oid)",
    "binary_upgrade_set_next_heap_pg_class_oid(oid)",
    "binary_upgrade_set_next_heap_relfilenode(oid)",
    "binary_upgrade_set_next_index_pg_class_oid(oid)",
    "binary_upgrade_set_next_index_relfilenode(oid)",
    "binary_upgrade_set_next_multirange_array_pg_type_oid(oid)",
    "binary_upgrade_set_next_multirange_pg_type_oid(oid)",
    "binary_upgrade_set_next_pg_authid_oid(oid)",
    "binary_upgrade_set_next_pg_enum_oid(oid)",
    "binary_upgrade_set_next_pg_tablespace_oid(oid)",
    "binary_upgrade_set_next_pg_type_oid(oid)",
    "binary_upgrade_set_next_toast_pg_class_oid(oid)",
    "binary_upgrade_set_next_toast_relfilenode(oid)",
    "binary_upgrade_set_record_init_privs(boolean)",
  ],
  // only its own caller may call it: an extension CREATE EXTENSION script, the executor language dispatch, initdb. Each says so and raises for a plain SELECT
  "call-context": [
    "pg_extension_config_dump(regclass,text)",
    "pg_stop_making_pinned_objects()",
    "plpgsql_call_handler()",
  ],
  // takes its collation from the CALL site rather than from the oid it is passed, and an oid argument is not collatable - so there is no spelling that gives it one: "could not determine which collation to use"
  "collation-context": [
    "btvarstrequalimage(oid)",
  ],
  // set-returning and EMPTY for every combination, which is no more evidence of totality than a raise. The probe database has no asynchronous IO in flight, no walsender, no subscription, no temporary file, no command in progress, no ident mapping and no WAL summary - and each of those is a fact about a RUNNING server rather than about an input
  "empty-set": [
    "pg_available_wal_summaries()",
    "pg_extension_update_paths(name)",
    "pg_get_aios()",
    "pg_ident_file_mappings()",
    "pg_ls_archive_statusdir()",
    "pg_ls_logicalmapdir()",
    "pg_ls_logicalsnapdir()",
    "pg_ls_summariesdir()",
    "pg_ls_tmpdir()",
    "pg_ls_tmpdir(oid)",
    "pg_stat_get_backend_io(integer)",
    "pg_stat_get_progress_info(text)",
    "pg_stat_get_subscription(oid)",
    "pg_stat_get_wal_senders()",
  ],
  // needs an object no SQL statement can create here: a multixact needs two concurrent sessions, a log directory needs a collector that has written, a WAL summary needs the summarizer to have run
  "live-object": [
    "pg_get_multixact_members(xid)",
    "pg_ls_logdir()",
    "pg_wal_summary_contents(bigint,pg_lsn,pg_lsn)",
  ],
  // READING a slot, which needs an output plugin whose result a SELECT can consume. The only plugin in this build is pgoutput, which writes to a replication connection's stream: with no walsender behind it the call does not raise and does not answer empty, it takes the BACKEND DOWN - every later statement returns zero rows and pg_current_wal_lsn() then reports ERRORDATA_STACK_SIZE exceeded. test_decoding is contrib, and the PGlite dist ships none. The four are REFUSED as well as unprobed, since a corpus value spelling pgoutput's options would turn a run into a dead one
  "logical-decoding": [
    "pg_logical_slot_get_binary_changes(name,pg_lsn,integer,text[])",
    "pg_logical_slot_get_changes(name,pg_lsn,integer,text[])",
    "pg_logical_slot_peek_binary_changes(name,pg_lsn,integer,text[])",
    "pg_logical_slot_peek_changes(name,pg_lsn,integer,text[])",
  ],
  // an internal representation with no external form the parser will build: extended statistics, a GiST tsvector entry, a BRIN summary, a parse-tree rendering. PostgreSQL declares the input function and refuses the cast that would feed it
  "no-external-form": [
    "brin_bloom_summary_in(cstring)",
    "brin_minmax_multi_summary_in(cstring)",
    "gtsvectorin(cstring)",
    "pg_ddl_command_in(cstring)",
    "pg_dependencies_in(cstring)",
    "pg_mcv_list_in(cstring)",
    "pg_ndistinct_in(cstring)",
    "pg_node_tree_in(cstring)",
  ],
  // an aggregate TRANSITION or COMBINE function, which checks it was called by the aggregate machinery: "called in non-aggregate context". Its siblings that do not check are claimed
  "non-aggregate-context": [
    "int4_avg_combine(bigint[],bigint[])",
    "multirange_intersect_agg_transfn(anymultirange,anymultirange)",
    "range_intersect_agg_transfn(anyrange,anyrange)",
  ],
  // the probe database is a PRIMARY that is not replaying, so these refuse on the server role rather than on their arguments: "recovery is not in progress", "replication slots can only be synchronized to a standby server"
  "not-a-standby": [
    "pg_get_wal_replay_pause_state()",
    "pg_is_wal_replay_paused()",
    "pg_promote(boolean,integer)",
    "pg_sync_replication_slots()",
    "pg_wal_replay_pause()",
    "pg_wal_replay_resume()",
  ],
  // DECLARED and not implemented - two whose implementation PostgreSQL removed and one it never wrote. They are the clearest reason a raise cannot count as a pass: these can never be probed, and saying so is the only honest coverage claim available
  "not-implemented": [
    "aclinsert(aclitem[],aclitem)",
    "aclremove(aclitem[],aclitem)",
    "xmlvalidate(xml,text)",
  ],
  // a PSEUDO-TYPE argument or result: PostgreSQL refuses one outright — "cannot accept a value of type anyelement", "cannot display a value of type any" — so no literal at any effort reaches these, and the reason is the type rather than the corpus
  "pseudotype": [
    "any_in(cstring)",
    "any_out(\"any\")",
    "anyarray_in(cstring)",
    "anycompatible_in(cstring)",
    "anycompatible_out(anycompatible)",
    "anycompatiblearray_in(cstring)",
    "anycompatiblemultirange_in(cstring,oid,integer)",
    "anycompatiblenonarray_in(cstring)",
    "anycompatiblenonarray_out(anycompatiblenonarray)",
    "anycompatiblerange_in(cstring,oid,integer)",
    "anyelement_in(cstring)",
    "anyelement_out(anyelement)",
    "anyenum_in(cstring)",
    "anymultirange_in(cstring,oid,integer)",
    "anynonarray_in(cstring)",
    "anynonarray_out(anynonarray)",
    "anyrange_in(cstring,oid,integer)",
    "event_trigger_in(cstring)",
    "fdw_handler_in(cstring)",
    "index_am_handler_in(cstring)",
    "internal_in(cstring)",
    "language_handler_in(cstring)",
    "shell_in(cstring)",
    "table_am_handler_in(cstring)",
    "trigger_in(cstring)",
    "tsm_handler_in(cstring)",
  ],
  // a trigger function, which checks its calling context first and raises for anything else - "was not called by trigger manager". There is no call from a query, which is why the walk never meets one
  "trigger-manager": [
    "RI_FKey_cascade_del()",
    "RI_FKey_cascade_upd()",
    "RI_FKey_check_ins()",
    "RI_FKey_check_upd()",
    "RI_FKey_noaction_del()",
    "RI_FKey_noaction_upd()",
    "RI_FKey_restrict_del()",
    "RI_FKey_restrict_upd()",
    "RI_FKey_setdefault_del()",
    "RI_FKey_setdefault_upd()",
    "RI_FKey_setnull_del()",
    "RI_FKey_setnull_upd()",
    "suppress_redundant_updates_trigger()",
    "tsvector_update_trigger()",
    "tsvector_update_trigger_column()",
    "unique_key_recheck()",
  ],
  // the WASM build declines it - libnuma for the NUMA allocation view, and no ASCII conversion from the UTF8 database encoding for the one-argument to_ascii. Its two- and three-argument spellings take the source encoding explicitly and are claimed
  "wasm": [
    "pg_get_shmem_allocations_numa()",
    "to_ascii(text)",
  ],
};

interface SurfaceRow {
  name: string;
  types: string[];
  retset: boolean;
  ncols: number;
  composite: boolean;
  variadic: string | null;
}

describe("builtin scalar surface, witnessed or classified", () => {
  let pg: PGlite;
  const category = new Map<string, string>();
  const nullWitness = new Map<string, string>();
  const exprsBySig = new Map<string, string[]>();
  /**
   * Which catalog a key came from — recorded at classification time, from
   * the query that produced the row. Deriving this from the key's SPELLING
   * was tried and bit immediately (`RI_FKey_check_upd` starts uppercase and
   * a first-character regex read it as an operator): provenance is data the
   * builder holds, never something to re-guess from a name.
   */
  const sigKind = new Map<string, "function" | "operator" | "aggregate" | "window">();
  /**
   * Aggregates and window functions run under TWO regimes. Their claimed
   * rows had NO execution hold (the totality probe never probed them), so a
   * claimed row producing NULL under its OWN claim's conditions is a
   * FAILURE collected here — while unclaimed rows classify like the rest.
   * `claimOf` maps a claimed key to the constructions its claim covers:
   * "always" fails on any NULL, "nonempty" only on the nonempty
   * non-null-input construction (empty and all-NULL input are the class's
   * expected NULLs).
   */
  const claimOf = new Map<string, "always" | "nonempty">();
  const constructionOf = new Map<string, "nonempty" | "empty" | "all-null" | "window">();
  const claimFailures: string[] = [];
  const noNullFound: string[] = [];
  /** Output-column count per set-returning expression; absent = scalar. */
  const srfNcols = new Map<string, number>();
  const noGeneratorTypes = new Map<string, number>();
  let capped = 0;
  let totalRows = 0;

  beforeAll(async () => {
    pg = await createProbeDb();

    const rows = (
      await pg.query<SurfaceRow>(
        `SELECT p.proname AS name,
                COALESCE((SELECT array_agg(format_type(t, null) ORDER BY o)
                            FROM unnest(p.proargtypes) WITH ORDINALITY AS z(t, o)), '{}') AS types,
                p.proretset AS retset,
                CASE WHEN p.proargmodes IS NULL THEN 1
                     ELSE greatest(1, (SELECT count(*) FROM unnest(p.proargmodes) m
                                        WHERE m IN ('o','b','t'))) END::int AS ncols,
                (rt.typtype = 'c' OR p.prorettype = 'record'::regtype) AS composite,
                CASE WHEN p.provariadic <> 0
                     THEN format_type(p.provariadic, null) END AS variadic
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           JOIN pg_type rt ON rt.oid = p.prorettype
          WHERE n.nspname = 'pg_catalog' AND p.prokind = 'f'
          ORDER BY p.proname, 2;`,
      )
    ).rows;
    totalRows = rows.length;

    // A NAME table claims every row of the name; a SIGNATURE addition claims
    // exactly the row it names, and the OTHER rows of that name carry no
    // claim and must still classify — `substring`'s regex rows are witnessed
    // NULL while its positional rows are claimed, and reading the name as
    // claimed hid the witnesses and left the loop-closer below with nothing
    // to check. The totality probe already splits them this way.
    const claimedNames = new Set([
      ...ALWAYS_NOT_NULL_BUILTINS,
      ...FIRST_ARG_BUILTINS,
      ...STRICT_TOTAL_BUILTINS,
    ]);

    for (const r of rows) {
      const key = `${r.name}(${r.types.join(",")})`;
      sigKind.set(key, "function");
      if (
        claimedNames.has(r.name) ||
        STRICT_TOTAL_BUILTIN_SIGNATURES.has(key) ||
        SWEPT_TOTAL_SIGNATURES.has(key)
      ) {
        category.set(key, "claimed");
        continue;
      }
      const probeTypes =
        r.variadic === null ? r.types : [...r.types.slice(0, -1), r.variadic];
      const missing = probeTypes.filter(t => !POLYMORPHIC.has(t) && !VALUES[t]);
      if (missing.length > 0) {
        category.set(key, "no-generator");
        for (const t of missing) noGeneratorTypes.set(t, (noGeneratorTypes.get(t) ?? 0) + 1);
        continue;
      }
      // A VARIADIC declaration carries ONE parameter of the ARRAY type, and
      // PostgreSQL wants the ELEMENTS: `json_extract_path(j, 'a', 'b')`, not
      // `json_extract_path(j, ARRAY['a','b'])` — passing the array positionally
      // is a type error, which is why every variadic row raised on every
      // combination and was probed in name only. `provariadic` names the
      // element type; two of them stand for "some".
      const argTypes = variadicArgTypes(r.types, r.variadic);
      const mine: string[] = [];
      // A refused row is probed by its COHERENT_CALLS entry alone: the corpus
      // carries the infinities, and for `pg_sleep` an infinity is a call that
      // never comes back rather than an input class (probe-values.ts).
      for (const family of key in REFUSED_CALLS ? [] : POLYMORPHIC_FAMILIES) {
        const lists = argTypes.map(t => (t in family ? [family[t]!] : VALUES[t]!));
        const { combos, capped: wasCapped } = combinations(lists);
        if (wasCapped) capped++;
        for (const combo of combos) {
          // A COMPOSITE result needs `::text` before the NULL test, because
          // `IS NULL` on a composite is ROW-is-null — true when every field
          // is null — and that is a different question from the one this
          // suite asks. `pg_stat_get_wal_receiver()` returns a record of
          // NULLs when no walreceiver is running, and the driver receives
          // `(,,,)`: a value, not a NULL. Casting first distinguishes them,
          // since a NULL composite casts to NULL and a composite of NULLs
          // casts to its text rendering.
          const call = `${qualify(r.name)}(${combo.join(", ")})`;
          mine.push(nullTestExpr(call, r.composite && !r.retset));
        }
        if (argTypes.every(t => !POLYMORPHIC.has(t))) break;
      }
      // Calls whose arguments must be valid TOGETHER, which no per-type
      // choice can produce past the combination cap.
      for (const c of COHERENT_CALLS[key] ?? []) {
        mine.push(nullTestExpr(`${qualify(r.name)}(${c.join(", ")})`, r.composite && !r.retset));
      }
      // A SET-RETURNING row is the same call under a different question —
      // "does any EMITTED row hold a NULL" rather than "is the value NULL" —
      // so it runs through srfprobe with its output-column count. `probe()`
      // reads one arbitrary row and an empty set as a value, which made the
      // verdict depend on sort order: `unnest(ARRAY[NULL,1])` witnessed and
      // `unnest(ARRAY[1,NULL])` did not, the same function over the same
      // elements. probe-values.ts records why the call must sit in the
      // TARGET LIST for that to be affordable.
      if (r.retset) for (const e of mine) srfNcols.set(e, r.ncols);
      // Verbatim expressions come AFTER the set-returning tagging on purpose.
      // They are scalar subqueries over a FROM-clause column definition list —
      // `json_to_recordset` is a set-returning row whose EXPR_PROBES spelling
      // returns one value — so tagging them by their signature's `proretset`
      // would route a scalar through `srfprobe`, whose inner query wants two
      // columns and gets one.
      for (const e of EXPR_PROBES[key] ?? []) mine.push(e);
      // A refusal with no bounded call to replace it leaves the row with no
      // expressions at all. It is UNPROBED — the reason is the probe's rather
      // than PostgreSQL's, which the group's own wording carries — and saying
      // so is what keeps it out of the silent gap between the categories.
      if (mine.length === 0 && key in REFUSED_CALLS) {
        category.set(key, "raised-everywhere");
        continue;
      }
      exprsBySig.set(key, [...new Set(mine)]);
    }

    // The OPERATOR surface, same discipline: every pg_operator row lands in
    // one category. Claimed symbols are the totality probe's jurisdiction;
    // the rest — `->` and the geometric, network and range families — sat
    // in the same exemption the function surface lost, defaulting nullable
    // with no witness. The JOIN on pg_proc is the shell-operator drop the
    // register's 1a sweep measured sound; pg_catalog ships none.
    const opRows = (
      await pg.query<{ name: string; left: string | null; right: string | null }>(
        `SELECT o.oprname AS name,
                CASE WHEN o.oprleft = 0 THEN NULL ELSE format_type(o.oprleft, null) END AS left,
                CASE WHEN o.oprright = 0 THEN NULL ELSE format_type(o.oprright, null) END AS right
           FROM pg_operator o
           JOIN pg_namespace n ON n.oid = o.oprnamespace
           JOIN pg_proc p ON p.oid = o.oprcode
          WHERE n.nspname = 'pg_catalog'
          ORDER BY o.oprname, 2, 3;`,
      )
    ).rows;
    totalRows += opRows.length;
    const claimedOps = new Set([...TOTAL_OPERATORS, ...STRICT_OPERATORS]);
    for (const r of opRows) {
      const key = `${r.name}(${r.left ?? ""},${r.right ?? ""})`;
      sigKind.set(key, "operator");
      const types = [r.left, r.right].filter((t): t is string => t !== null);
      if (claimedOps.has(r.name) || TOTAL_OPERATOR_SIGNATURES.has(key)) {
        category.set(key, "claimed");
        continue;
      }
      const missing = types.filter(t => !POLYMORPHIC.has(t) && !VALUES[t]);
      if (missing.length > 0) {
        category.set(key, "no-generator");
        for (const t of missing) noGeneratorTypes.set(t, (noGeneratorTypes.get(t) ?? 0) + 1);
        continue;
      }
      const mine: string[] = [];
      for (const family of POLYMORPHIC_FAMILIES) {
        const lists = types.map(t => (t in family ? [family[t]!] : VALUES[t]!));
        const { combos, capped: wasCapped } = combinations(lists);
        if (wasCapped) capped++;
        for (const combo of combos) {
          mine.push(
            r.left === null
              ? `OPERATOR(pg_catalog.${r.name}) ${combo[0]}`
              : `${combo[0]} OPERATOR(pg_catalog.${r.name}) ${combo[1]}`,
          );
        }
        if (types.every(t => !POLYMORPHIC.has(t))) break;
      }
      exprsBySig.set(key, [...new Set(mine)]);
    }

    // The AGGREGATE and WINDOW surface. Their NULL routes are not argument
    // values — empty input, discarded all-NULL input, and frame boundaries
    // — so the constructions differ: an aggregate is probed over a
    // three-row corner-value table, over the same table WHERE false, and
    // over all-NULL arguments; an ordered/hypothetical-set row gets the
    // WITHIN GROUP spelling with the ORDER BY types taken from the
    // positions after aggnumdirectargs; a window row is probed as a scalar
    // subquery at the first row, the last row, and over a single-row
    // partition. Every expression is tagged with its construction, which
    // is what lets a claimed row's NULL be judged against the claim's own
    // conditions.
    const aggRows = (
      await pg.query<{
        name: string;
        types: string[];
        aggkind: string;
        ndirect: number;
      }>(
        `SELECT p.proname AS name,
                COALESCE((SELECT array_agg(format_type(t, null) ORDER BY o)
                            FROM unnest(p.proargtypes) WITH ORDINALITY AS z(t, o)), '{}') AS types,
                a.aggkind, a.aggnumdirectargs::int AS ndirect
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           JOIN pg_aggregate a ON a.aggfnoid = p.oid
          WHERE n.nspname = 'pg_catalog' AND p.prokind = 'a'
          ORDER BY p.proname, 2;`,
      )
    ).rows;
    const winRows = (
      await pg.query<{ name: string; types: string[] }>(
        `SELECT p.proname AS name,
                COALESCE((SELECT array_agg(format_type(t, null) ORDER BY o)
                            FROM unnest(p.proargtypes) WITH ORDINALITY AS z(t, o)), '{}') AS types
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'pg_catalog' AND p.prokind = 'w'
          ORDER BY p.proname, 2;`,
      )
    ).rows;
    totalRows += aggRows.length + winRows.length;

    /** A value for `t` at corner index `i`, from the corpus or the family. */
    const valueAt = (t: string, i: number): string | null => {
      const family = POLYMORPHIC_FAMILIES[Math.min(i, POLYMORPHIC_FAMILIES.length - 1)]!;
      if (t in family) return family[t]!;
      const list = VALUES[t];
      return list ? list[Math.min(i, list.length - 1)]! : null;
    };

    for (const r of aggRows) {
      const key = `${r.name}(${r.types.join(",")})`;
      sigKind.set(key, "aggregate");
      if (r.types.some(t => !POLYMORPHIC.has(t) && !VALUES[t] && t !== '"any"')) {
        category.set(key, "no-generator");
        continue;
      }
      // The claim regimes: count and the hypothetical class are total; the
      // nonempty table and the ordered-set gate promise non-null exactly
      // over a nonempty group with non-null input.
      if (r.name === "count" || r.aggkind === "h") claimOf.set(key, "always");
      else if (NON_NULL_OVER_NONEMPTY_AGGREGATES.has(r.name) || r.aggkind === "o") {
        claimOf.set(key, "nonempty");
      }
      const mine: string[] = [];
      const tag = (exprs: string[], c: "nonempty" | "empty" | "all-null"): void => {
        for (const e of exprs) {
          if (!constructionOf.has(e)) constructionOf.set(e, c);
          mine.push(e);
        }
      };
      if (r.aggkind === "h") {
        // Direct args are unified with the ORDER BY types (measured, Q2);
        // one integer column stands for both.
        tag([
          `(SELECT ${qualify(r.name)}(1) WITHIN GROUP (ORDER BY x) FROM (VALUES (1),(2)) t(x))`,
        ], "nonempty");
        tag([
          `(SELECT ${qualify(r.name)}(1) WITHIN GROUP (ORDER BY x) FROM (VALUES (1)) t(x) WHERE false)`,
        ], "empty");
      } else if (r.aggkind === "o") {
        const direct = r.types.slice(0, r.ndirect);
        const ordered = r.types.slice(r.ndirect);
        for (const i of [0, 1]) {
          const dv = direct.map(t => valueAt(t, i));
          if (dv.some(v => v === null) || ordered.length === 0) continue;
          const cols = ordered.map((_, j) => `c${j}`).join(", ");
          const row = (k: number): string | null => {
            const vs = ordered.map(t => valueAt(t, k));
            return vs.some(v => v === null) ? null : `(${vs.join(", ")})`;
          };
          const rows3 = [row(0), row(1), row(2)].filter((x): x is string => x !== null);
          if (rows3.length === 0) continue;
          const call = `${qualify(r.name)}(${dv.join(", ")}) WITHIN GROUP (ORDER BY ${cols})`;
          tag([`(SELECT ${call} FROM (VALUES ${rows3.join(",")}) t(${cols}))`], "nonempty");
          tag([`(SELECT ${call} FROM (VALUES ${rows3[0]}) t(${cols}) WHERE false)`], "empty");
        }
      } else {
        const cols = r.types.map((_, j) => `c${j}`).join(", ");
        const callCols = `${qualify(r.name)}(${r.types.map((_, j) => `c${j}`).join(", ")})`;
        for (const i of [0, 1]) {
          const row = (k: number): string | null => {
            const vs = r.types.map(t => (t === '"any"' ? "1" : valueAt(t, k)));
            return vs.some(v => v === null) ? null : `(${vs.join(", ")})`;
          };
          // Rows 0..2 shifted by the combo index, so corner values reach
          // every position without a full cross product.
          const rows3 = [row(i), row(i + 1), row(i + 2)].filter((x): x is string => x !== null);
          if (rows3.length === 0 || r.types.length === 0) break;
          tag([`(SELECT ${callCols} FROM (VALUES ${rows3.join(",")}) t(${cols}))`], "nonempty");
          // The SINGLE-row group is its own class: stddev and friends are
          // NULL over one row however non-null it is, which is exactly why
          // they are excluded from the nonempty table — a member that NULLs
          // here fails the claim.
          tag([`(SELECT ${callCols} FROM (VALUES ${rows3[0]}) t(${cols}))`], "nonempty");
          tag([`(SELECT ${callCols} FROM (VALUES ${rows3[0]}) t(${cols}) WHERE false)`], "empty");
        }
        if (r.types.length === 0) {
          tag([`(SELECT ${qualify(r.name)}(*) FROM (VALUES (1),(2)) t(x))`], "nonempty");
          tag([`(SELECT ${qualify(r.name)}(*) FROM (VALUES (1)) t(x) WHERE false)`], "empty");
        } else {
          const nulls = r.types
            .map(t => (t === '"any"' || POLYMORPHIC.has(t) ? "NULL::int" : `NULL::${t}`))
            .join(", ");
          tag([
            `(SELECT ${qualify(r.name)}(${nulls}) FROM (VALUES (1),(2)) s(z))`,
          ], "all-null");
        }
      }
      if (mine.length === 0) {
        category.set(key, "no-generator");
        claimOf.delete(key);
        continue;
      }
      exprsBySig.set(key, [...new Set(mine)]);
    }

    for (const r of winRows) {
      const key = `${r.name}(${r.types.join(",")})`;
      sigKind.set(key, "window");
      if (r.types.some(t => !POLYMORPHIC.has(t) && !VALUES[t] && t !== '"any"')) {
        category.set(key, "no-generator");
        continue;
      }
      // never-null ranking set: any NULL fails. ntile's claim is
      // conditional on its argument, which these constructions supply
      // non-null — so it holds to "always" under them too.
      if (NEVER_NULL_WINDOW_SIGNATURES.has(key) || STRICT_TOTAL_WINDOW_SIGNATURES.has(key)) {
        claimOf.set(key, "always");
      }
      const args = r.types
        .map(t => (t === '"any"' ? "1" : valueAt(t, 0)))
        .filter((v): v is string => v !== null);
      if (args.length !== r.types.length) {
        category.set(key, "no-generator");
        claimOf.delete(key);
        continue;
      }
      const call = `${qualify(r.name)}(${args.join(", ")}) OVER (ORDER BY x)`;
      const mine = [
        `(SELECT ${call} FROM (VALUES (1),(2)) t(x) LIMIT 1)`,
        `(SELECT ${call} FROM (VALUES (1),(2)) t(x) ORDER BY x DESC LIMIT 1)`,
        `(SELECT ${call} FROM (VALUES (1)) t(x))`,
      ];
      for (const e of mine) if (!constructionOf.has(e)) constructionOf.set(e, "window");
      exprsBySig.set(key, [...new Set(mine)]);
    }

    // Evaluate in batches; per-expression error isolation via probe(). The
    // full surface holds expressions the claimed probe never met — at least
    // one raises in a way that overflows the backend's error stack
    // (ERRORDATA_STACK_SIZE) and aborts the whole batch — so a failed batch
    // BISECTS down to the culprit, which is recorded as an error rather
    // than killing the run, and the connection is revived if it died.
    const allExprs = [...new Set([...exprsBySig.values()].flat())];
    const verdicts = new Map<string, string>();
    // The errordata overflow POISONS the backend past the statement: a
    // plain SELECT still answers, but every later probe() batch re-fails —
    // so liveness is tested with the probe itself, and a poisoned backend
    // is rebuilt. Below the singleton threshold the culprit hunt goes
    // expression-by-expression to bound the rebuild count.
    const ensureAlive = async (): Promise<void> => {
      try {
        const r = await pg.query<{ v: string }>(`SELECT probe('1') AS v`);
        if (r.rows[0]?.v === "value") return;
      } catch {
        // fall through to rebuild
      }
      try {
        await pg.close();
      } catch {
        // already dead
      }
      pg = await createProbeDb();
    };
    // The probe an expression needs: a set-returning call answers a
    // different question, over its own output columns, through srfprobe.
    const argFor = (e: string): string => {
      const n = srfNcols.get(e);
      return n === undefined ? e : srfQuery(e, n);
    };
    const fnFor = (e: string): string => (srfNcols.has(e) ? "srfprobe" : "probe");
    // `pg_current_xact_id()` in the FROM clause, so a transaction id is
    // ASSIGNED before any probe in the statement runs — and `xid` is selected
    // because an unreferenced subquery column is optimised away and the call
    // never happens (measured).
    //
    // Without it the batch's own WRITES decide the answer for the one row
    // that reads this state. `pg_current_xact_id_if_assigned()` is NULL until
    // something in the transaction has written, the large-object probes write,
    // and every expression runs in a 2000-wide chunk — so whether that row
    // witnessed depended on where a chunk boundary fell relative to `lo_open`,
    // and adding fifteen unrelated expressions elsewhere flipped it. Its NULL
    // is transaction state rather than input, the class this probe is
    // structurally blind to, and it is witnessed by hand in
    // tests/unit/functions/ with a SETTLED_ELSEWHERE entry saying so — the
    // `current_schema()` shape exactly. Forcing the assignment makes the
    // classification say the same thing every run.
    const evalBatch = async (batch: string[]): Promise<void> => {
      try {
        const res = await pg.query<{ e: string; v: string }>(
          `SELECT z.e, x.xid, CASE WHEN z.srf THEN srfprobe(z.q) ELSE probe(z.q) END AS v
             FROM pg_catalog.pg_current_xact_id() AS x(xid),
                  unnest($1::text[], $2::text[], $3::bool[]) AS z(e, q, srf);`,
          [batch, batch.map(argFor), batch.map(e => srfNcols.has(e))],
        );
        // A poisoned backend can "succeed" with a SHORT or empty result —
        // no exception, no rows. Route that into the recovery path too.
        if (res.rows.length !== batch.length) throw new Error("short result");
        for (const row of res.rows) verdicts.set(row.e, row.v);
      } catch {
        await ensureAlive();
        if (batch.length <= 32) {
          for (const e of batch) {
            // Two attempts: a failure can be a PREDECESSOR's poison, which
            // ensureAlive clears — only an expression that fails on a fresh
            // backend records as its own error.
            let v: string | null = null;
            for (let attempt = 0; attempt < 2 && v === null; attempt++) {
              try {
                const r = await pg.query<{ v: string }>(
                  `SELECT x.xid, ${fnFor(e)}($1) AS v
                     FROM pg_catalog.pg_current_xact_id() AS x(xid)`,
                  [argFor(e)],
                );
                v = r.rows[0]?.v ?? null;
                if (v === null) await ensureAlive();
              } catch {
                await ensureAlive();
              }
            }
            verdicts.set(e, v ?? "error");
          }
          return;
        }
        const mid = Math.floor(batch.length / 2);
        await evalBatch(batch.slice(0, mid));
        await evalBatch(batch.slice(mid));
      }
    };
    for (let i = 0; i < allExprs.length; i += 2_000) {
      await evalBatch(allExprs.slice(i, i + 2_000));
    }

    // The probes the batch cannot make, merged as ordinary verdicts: a
    // snapshot export a subtransaction forbids, ten rows the main instance's
    // own prepared transaction and session origin block, and four whose only
    // caller is the event trigger manager (probe-values.ts records each).
    //
    // A key here may have NO entry in `exprsBySig` — a row refused with no
    // bounded call was categorised `raised-everywhere` above and skipped the
    // map entirely. Adding one now puts it back in the loop below, which
    // re-categorises it from the verdict rather than from the refusal.
    //
    // The expression may also be one the batch ALREADY ran and recorded an
    // error for: the four event-trigger rows take no arguments, so the call
    // the batch generates and the call the trigger body makes are the same
    // string. The out-of-band verdict replaces it, which is the right way
    // round — the batch ran that call where it cannot succeed, and this ran
    // the same call where it can.
    // A CLAIMED key is skipped, and skipping it is the point rather than an
    // optimisation. Nine of these rows were promoted on these very verdicts,
    // and a claimed row is the GATE's jurisdiction — this suite never
    // evaluates one. Merging anyway put them back in the loop below, which
    // re-categorised them out of `claimed` and failed the SETTLED_ELSEWHERE
    // pin with nine rows that had nowhere else to be settled.
    for (const { key, expr, verdict } of await runOutOfBandProbes(pg)) {
      if (category.get(key) === "claimed") continue;
      const mine = exprsBySig.get(key);
      if (!mine) exprsBySig.set(key, [expr]);
      else if (!mine.includes(expr)) mine.push(expr);
      verdicts.set(expr, verdict);
    }

    for (const [key, mine] of exprsBySig) {
      // The claim regime: a claimed aggregate or window row is judged
      // against its OWN conditions — an "always" claim fails on any NULL,
      // a "nonempty" claim only on the nonempty non-null-input
      // construction; the empty and all-NULL NULLs are the class behaving
      // as documented.
      const claim = claimOf.get(key);
      if (claim) {
        category.set(key, "claimed");
        for (const e of mine) {
          if (verdicts.get(e) !== "NULL") continue;
          const c = constructionOf.get(e);
          if (claim === "always" || c === "nonempty") {
            claimFailures.push(`${key} [${c ?? "?"}]: SELECT ${e};`);
          }
        }
        continue;
      }
      let evaluated = 0;
      let witness: string | null = null;
      for (const e of mine) {
        const v = verdicts.get(e);
        if (v === "NULL" && witness === null) witness = e;
        // `empty` is a set-returning combination that emitted no rows. Like a
        // raise it is not evidence of non-nullness, so it does not count as
        // evaluated — `generate_series(1, 0)` must not pass for a probe.
        if (v !== "error" && v !== "empty") evaluated++;
      }
      if (witness !== null) {
        category.set(key, "null-witnessed");
        nullWitness.set(key, witness);
      } else if (evaluated === 0) {
        category.set(key, "raised-everywhere");
      } else {
        category.set(key, "no-null-found");
        noNullFound.push(key);
      }
    }
    noNullFound.sort();
    claimFailures.sort();
  }, 240_000);

  afterAll(async () => {
    if (!pg.closed) await pg.close();
  });

  it("classifies every scalar and operator signature into exactly one category", () => {
    expect(category.size).toBe(totalRows);
    const counts = new Map<string, number>();
    for (const c of category.values()) counts.set(c, (counts.get(c) ?? 0) + 1);
    console.log(
      `\nbuiltin surface: ${totalRows} scalar + operator signatures — ` +
        [...counts.entries()].sort().map(([c, n]) => `${c}: ${n}`).join(", ") +
        `${capped ? ` (${capped} signatures sampled past the combo cap)` : ""}.` +
        `\n  no-null-found: read nullable, no witness found HERE — every one is ` +
        `settled elsewhere and SETTLED_ELSEWHERE says where. ` +
        `BUILTIN_SURFACE_REPORT=1 prints them.`,
    );
    if (process.env["BUILTIN_SURFACE_REPORT"]) {
      console.log(`\nno-null-found (${noNullFound.length}):\n  ${noNullFound.join("\n  ")}`);
      console.log(
        `\nno-generator types:\n  ` +
          [...noGeneratorTypes.entries()].sort((a, b) => b[1] - a[1])
            .map(([t, n]) => `${t} (${n})`).join("\n  "),
      );
    }
    // The durable handoff, for a session reading the surface rather than a
    // human reading a console: BUILTIN_SURFACE_CLASSIFICATION=<path> writes
    // the full classification as markdown. Same run, same data — the file is a
    // snapshot whose provenance and regeneration command it states itself.
    const snapshotPath = process.env["BUILTIN_SURFACE_CLASSIFICATION"];
    if (snapshotPath) {
      const byCat = (cat: string): string[] =>
        [...category.entries()].filter(([, c]) => c === cat).map(([k]) => k).sort();
      const split = (keys: string[]): string =>
        (["function", "operator", "aggregate", "window"] as const)
          .map(kind => `${kind}s ${keys.filter(k => sigKind.get(k) === kind).length}`)
          .join(", ");
      const lines: string[] = [
        `# Builtin surface classification`,
        ``,
        `Generated by builtin-surface.test.ts (regenerate:`,
        `\`BUILTIN_SURFACE_CLASSIFICATION=artifacts/builtin-surface-classification.md pnpm exec vitest run tests/unit/query/builtin-surface.test.ts\`).`,
        `A snapshot for reading the surface; the SUITE is the source of truth`,
        `and re-derives it every run.`,
        ``,
        `Every entry below is a signature the engine reads as nullable, and`,
        `every one of them is decided — this file is a record, not a queue.`,
        `A null-witnessed entry carries its witness; promote nothing there. A`,
        `no-null-found entry evaluated without ever answering NULL, and its`,
        `disposition lives outside this suite — see SETTLED_ELSEWHERE in`,
        `builtin-surface.test.ts, which names one of four per row. A`,
        `raised-everywhere entry is pinned in UNPROBED with the measured reason`,
        `PostgreSQL declined every call. Promotion is human, per signature,`,
        `with the probe as the evidence bar and the totality probe as the hold.`,
        ``,
      ];
      for (const cat of [
        "null-witnessed", "no-null-found", "raised-everywhere", "no-generator",
      ]) {
        const keys = byCat(cat);
        lines.push(`## ${cat} (${keys.length}: ${split(keys)})`, ``);
        for (const k of keys) {
          if (cat === "null-witnessed") {
            lines.push(`- \`${k}\` — witness: \`SELECT ${nullWitness.get(k)};\``);
          } else if (cat === "raised-everywhere") {
            lines.push(`- \`${k}\` — e.g. \`${exprsBySig.get(k)?.[0] ?? ""}\` raises`);
          } else {
            lines.push(`- \`${k}\``);
          }
        }
        lines.push(``);
      }
      mkdirSync(dirname(snapshotPath), { recursive: true });
      writeFileSync(snapshotPath, lines.join("\n"));
      console.log(`classification written to ${snapshotPath}`);
    }
  });

  it("actually evaluated a substantial surface", () => {
    // The guard against the probe silently covering nothing. It used to read
    // "witnessing plus the work list must dwarf the claimed set", and that
    // premise INVERTED once the cluster sweep promoted most of the surface:
    // the rows did not stop being executed, they moved into `claimed`, where
    // the totality probe executes them instead of this suite. So the count
    // that matters is every row some suite decides by RUNNING it — claimed,
    // witnessed, or no-null-found — against the ones no execution reaches
    // (no-generator, raised-everywhere).
    const decided = [...category.values()].filter(
      c => c === "claimed" || c === "null-witnessed" || c === "no-null-found",
    ).length;
    expect(decided).toBeGreaterThan(500);
  });

  it("every refused signature is either probed by a bounded call or recorded unprobed", () => {
    // REFUSED_CALLS drops a row's GENERATED combinations, which would leave it
    // with no expressions at all and no category — the classification would
    // shrink and the count assertion above would be the only thing that
    // noticed. So a refusal owes one of THREE things: a COHERENT_CALLS entry
    // that reaches a result, an out-of-band mechanism that probes the row
    // somewhere the refusal does not apply, or an UNPROBED entry saying the
    // probe declines this row and why. Refusing quietly is the case this
    // forbids.
    //
    // The third arrived with the side instance and is not a loosening: two
    // rows are refused BECAUSE they belong there — creating a logical slot
    // hangs on this instance's prepared transaction, and clearing the session
    // origin destroys what three other rows are measured against. The refusal
    // is what routes them, so it is accounted for by the route.
    const recorded = new Set(Object.values(UNPROBED).flat());
    const unaccounted = Object.keys(REFUSED_CALLS)
      .filter(
        k =>
          !(COHERENT_CALLS[k] ?? []).length &&
          !OUT_OF_BAND_KEYS.has(k) &&
          !recorded.has(k),
      )
      .sort();
    expect(
      unaccounted,
      `REFUSED_CALLS refuses a signature's generated combinations with none of ` +
        `the three accountings: no COHERENT_CALLS entry to probe it by, no ` +
        `out-of-band mechanism that reaches it, and no UNPROBED entry saying ` +
        `so:\n  ${unaccounted.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every out-of-band mechanism still reaches its rows", () => {
    // The mechanisms are the only thing standing between these rows and the
    // unprobed list, and each is a live moving part: a second PGlite instance,
    // an event trigger created and fired, a scalar subquery over a column
    // definition list, a statement run outside `probe()`. If one silently
    // stops working, every row it carries falls back to `raised-everywhere`
    // and the UNPROBED pin fails — correctly, but pointing at the wrong table
    // and reading as "PostgreSQL declines this" when the truth is "the harness
    // broke". This says which it is.
    //
    // `claimed` counts: nine of these rows were promoted on the mechanisms'
    // own evidence, and this suite never evaluates a claimed row. The hold
    // moved rather than lapsed — totality-probe.test.ts runs the same
    // mechanisms and fails its "actually evaluated" assertion if one stops
    // reaching them.
    const stalled = [...OUT_OF_BAND_KEYS, ...Object.keys(EXPR_PROBES)]
      .filter(k => {
        const c = category.get(k);
        return c !== "claimed" && c !== "null-witnessed" && c !== "no-null-found";
      })
      .sort();
    expect(
      stalled,
      `An out-of-band probe reached no result. Its row is unprobed again, and ` +
        `the mechanism is what to look at first — probe-values.ts records what ` +
        `each one needs and what breaks it:\n  ${stalled.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every claimed aggregate and window row survives its own claim's conditions", () => {
    // The execution hold those rows never had: the totality probe covers
    // scalar claims only, so until this suite a nonempty-table aggregate
    // or never-null window function could NULL under its own claim with
    // nothing failing.
    expect(claimFailures).toEqual([]);
  });

  it("no null-witnessed signature carries a totality claim", () => {
    // The loop-closer, extended from the witness corpus to the whole
    // surface: the machine found a NULL, so no table may claim the row.
    // Structurally guaranteed for the name tables (claimed names are never
    // evaluated), so the live half is the signature additions — which it is
    // only because an addition's OTHER rows still classify; reading an
    // addition's name as claimed made this assertion vacuous.
    const offenders = [...nullWitness.keys()].filter(
      k =>
        STRICT_TOTAL_BUILTIN_SIGNATURES.has(k) ||
        SWEPT_TOTAL_SIGNATURES.has(k) ||
        TOTAL_OPERATOR_SIGNATURES.has(k),
    );
    expect(offenders).toEqual([]);
  });

  it("the settled-elsewhere set is exactly what is recorded, in both directions", () => {
    // The drift guard the classification lacked. A signature PostgreSQL adds
    // in a future release arrives unclaimed and lands here, and without this
    // the run would pass with a real candidate hidden among the settled ones.
    const actual = new Set(noNullFound);
    const unexplained = [...actual].filter(k => !(k in SETTLED_ELSEWHERE)).sort();
    const stale = Object.keys(SETTLED_ELSEWHERE).filter(k => !actual.has(k)).sort();
    expect(
      unexplained,
      `Signature(s) the engine reads as nullable with no witness and no ` +
        `recorded disposition — the one thing this suite calls actual work. ` +
        `Either promote them (probe first — tests/probe/cluster-sweep.ts ` +
        `sweeps by catalog role), witness them in tests/unit/functions/, or ` +
        `add an entry to SETTLED_ELSEWHERE saying where the decision lives ` +
        `and why it is not here:\n  ${unexplained.join("\n  ")}`,
    ).toEqual([]);
    expect(
      stale,
      `SETTLED_ELSEWHERE records a signature this suite no longer classifies ` +
        `no-null-found. Either it was promoted or witnessed — drop the entry ` +
        `— or PostgreSQL removed it, and the entry is a disposition for a ` +
        `signature that no longer exists:\n  ${stale.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every type with no generator has a recorded reason, in both directions", () => {
    // The third pin. A type absent from VALUES blocks every signature taking
    // it, so the reason belongs to the TYPE — and the reason has to say which
    // of two things it is, because "impossible" and "not worth it" ask
    // completely different things of the next reader.
    const blocking = new Set(
      [...noGeneratorTypes.keys()].filter(t => !POLYMORPHIC.has(t) && !VALUES[t]),
    );
    const unexplained = [...blocking].filter(t => !(t in NO_GENERATOR)).sort();
    const stale = Object.keys(NO_GENERATOR).filter(t => !blocking.has(t)).sort();
    expect(
      unexplained,
      `Type(s) blocking a signature with no recorded reason. Try the literal ` +
        `before writing one: nineteen types were assumed impossible and were ` +
        `merely absent, and 102 signatures came back when somebody checked:\n  ` +
        `${unexplained.join("\n  ")}`,
    ).toEqual([]);
    expect(
      stale,
      `NO_GENERATOR explains a type that no longer blocks anything — it ` +
        `acquired a generator, or PostgreSQL stopped using it here:\n  ` +
        `${stale.join("\n  ")}`,
    ).toEqual([]);
  });

  it("the unprobed surface is exactly what is recorded, in both directions", () => {
    // The other half of the work-list pin: a row nothing could evaluate is
    // as unwitnessed as a row that evaluated and never answered NULL.
    const recorded = new Set(Object.values(UNPROBED).flat());
    const actual = new Set(
      [...category.entries()].filter(([, c]) => c === "raised-everywhere").map(([k]) => k),
    );
    const unexplained = [...actual].filter(k => !recorded.has(k)).sort();
    const stale = [...recorded].filter(k => !actual.has(k)).sort();
    expect(
      unexplained,
      `Signature(s) PostgreSQL declined for every combination, with no ` +
        `recorded reason. Widen the corpus so one combination reaches a ` +
        `result, or add it to the UNPROBED group whose reason fits:\n  ` +
        `${unexplained.join("\n  ")}`,
    ).toEqual([]);
    expect(
      stale,
      `UNPROBED records a signature that now evaluates — progress, and the ` +
        `entry should go so the next reader is not told it cannot be ` +
        `probed:\n  ${stale.join("\n  ")}`,
    ).toEqual([]);
  });

  it("re-finds the historical witnesses, so its silence means something", () => {
    // Positive controls: unclaimed signatures the sweeps proved NULL-capable
    // (the witness corpus's seed) must land in null-witnessed here — a
    // classifier that cannot re-find the known findings classifies nothing.
    for (const key of [
      "to_number(text,text)",
      "scale(numeric)",
      "min_scale(numeric)",
      "array_position(anycompatiblearray,anycompatible)",
      // The operator control: `->` on a missing key is the walk's own
      // documented example of strict-but-not-total.
      "->(jsonb,text)",
      // The aggregate control: stddev_samp over a single row is the
      // documented reason the nonempty table excludes it.
      "stddev_samp(double precision)",
      // The window control: lag on the partition's first row.
      "lag(anyelement)",
    ]) {
      expect(
        nullWitness.has(key),
        `${key} should be null-witnessed (got: ${category.get(key) ?? "NO SUCH KEY"})`,
      ).toBe(true);
    }
  });
});
