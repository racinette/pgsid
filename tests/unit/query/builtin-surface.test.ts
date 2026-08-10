import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFileSync } from "node:fs";
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
  PROBE_FN_SQL,
  SRF_PROBE_FN_SQL,
  srfQuery,
  nullTestExpr,
  variadicArgTypes,
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
//   volatile         — excluded from execution on the catalog's own
//                      side-effect marker (`provolatile = 'v'`: setval,
//                      pg_terminate_backend live here). Claimed volatile
//                      names stay probed via the claimed path, whose curated
//                      list is known-safe.
//   no-generator     — a parameter type the shared corpus has no values for
//                      (internal, cstring, reg* …). Explicit, not silent.
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
//   no-null-found    — every evaluated combination returned a value. THE
//                      WORK LIST: the engine claims these can be NULL and
//                      cannot witness it, so each is a graduation candidate
//                      — promote it (name table or signature addition, where
//                      the totality probe takes over) or find the missing
//                      input class. Promotion stays HUMAN, the discovery/
//                      coverage split the register mandates.
//
// The corpus is `probe-values.ts`, one copy with the totality probe — the
// definition of "corner case" cannot fork between the gating suite and this
// classifying one.
// ---------------------------------------------------------------------------

/**
 * THE WORK LIST, PINNED — every signature the engine still reads as nullable
 * with no witness, and the reason it is still there.
 *
 * `node-census.test.ts`'s pattern, applied to the builtin surface, and added
 * for the gap that pattern exists to close: without it a PostgreSQL upgrade
 * that adds a function lands it in `no-null-found` and the suite PASSES, so
 * the queue grows back from nine and nobody learns until somebody
 * regenerates the work-list document by hand. Deliberately NOT a count: a
 * ratchet lets a regression hide behind an unrelated improvement, which is
 * the failure mode this project rejects everywhere else. Asserted in BOTH
 * directions, so a row that stops being on the list fails too — its reason
 * has become a claim about PostgreSQL that nothing checks.
 *
 * An entry here is a decision, not a TODO. Adding one means writing down why
 * the signature cannot be promoted or witnessed; if that reason is "nobody
 * has looked yet", the honest move is to look.
 */
const WORK_LIST: Record<string, string> = {
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
  cstring:
    "NOT refused — `textin('abc'::cstring)` runs, measured. These are the type I/O entry points, one per type, and no query writes one; a generator would classify 186 rows of pure machinery. A DECISION rather than an impossibility, which is why it is written here rather than left to be re-derived",
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
  // an aggregate TRANSITION STATE, whose array has an internal shape the corpus cannot guess — float8_accum wants a three-element accumulator, not any float8[]
  "aggstate": [
    "float4_accum(double precision[],real)",
    "float8_accum(double precision[],double precision)",
    "float8_avg(double precision[])",
    "float8_combine(double precision[],double precision[])",
    "float8_corr(double precision[])",
    "float8_covar_pop(double precision[])",
    "float8_covar_samp(double precision[])",
    "float8_regr_accum(double precision[],double precision,double precision)",
    "float8_regr_avgx(double precision[])",
    "float8_regr_avgy(double precision[])",
    "float8_regr_combine(double precision[],double precision[])",
    "float8_regr_intercept(double precision[])",
    "float8_regr_r2(double precision[])",
    "float8_regr_slope(double precision[])",
    "float8_regr_sxx(double precision[])",
    "float8_regr_sxy(double precision[])",
    "float8_regr_syy(double precision[])",
    "float8_stddev_pop(double precision[])",
    "float8_stddev_samp(double precision[])",
    "float8_var_pop(double precision[])",
    "float8_var_samp(double precision[])",
    "int4_avg_combine(bigint[],bigint[])",
    "multirange_intersect_agg_transfn(anymultirange,anymultirange)",
    "range_intersect_agg_transfn(anyrange,anyrange)",
  ],
  // needs an OID or name of an object that exists in the probe database, which holds only the probe enum
  "live-object": [
    "btvarstrequalimage(oid)",
    "fmgr_c_validator(oid)",
    "fmgr_internal_validator(oid)",
    "fmgr_sql_validator(oid)",
    "pg_event_trigger_ddl_commands()",
    "pg_event_trigger_dropped_objects()",
    "pg_event_trigger_table_rewrite_oid()",
    "pg_event_trigger_table_rewrite_reason()",
    "pg_extension_update_paths(name)",
    "pg_get_object_address(text,text[],text[])",
    "pg_get_publication_tables(text[])",
    "pg_get_replication_slots()",
    "pg_get_serial_sequence(text,text)",
    "pg_identify_object(oid,oid,integer)",
    "pg_identify_object_as_address(oid,oid,integer)",
    "pg_listening_channels()",
    "pg_prepared_statement()",
    "pg_sequence_parameters(oid)",
    "pg_snapshot_xip(pg_snapshot)",
    "pg_split_walfile_name(text)",
    "pg_stat_get_progress_info(text)",
    "pg_stat_get_subscription(oid)",
    "pg_stat_get_wal_senders()",
    "pg_tablespace_databases(oid)",
    "pg_timezone_abbrevs_zone()",
    "ts_parse(oid,text)",
    "ts_token_type(oid)",
  ],
  // three arguments must be valid TOGETHER — a role, an object and a privilege — and capped sampling varies one at a time from a baseline
  "privilege-triple": [
    "has_column_privilege(name,text,smallint,text)",
    "has_column_privilege(name,text,text,text)",
    "has_column_privilege(oid,text,smallint,text)",
    "has_column_privilege(oid,text,text,text)",
    "has_column_privilege(text,smallint,text)",
    "has_column_privilege(text,text,text)",
    "has_database_privilege(name,text,text)",
    "has_database_privilege(oid,text,text)",
    "has_database_privilege(text,text)",
    "has_foreign_data_wrapper_privilege(name,text,text)",
    "has_foreign_data_wrapper_privilege(oid,text,text)",
    "has_foreign_data_wrapper_privilege(text,text)",
    "has_function_privilege(oid,text,text)",
    "has_language_privilege(name,text,text)",
    "has_language_privilege(oid,text,text)",
    "has_language_privilege(text,text)",
    "has_schema_privilege(name,text,text)",
    "has_schema_privilege(oid,text,text)",
    "has_schema_privilege(text,text)",
    "has_sequence_privilege(name,text,text)",
    "has_sequence_privilege(oid,text,text)",
    "has_sequence_privilege(text,text)",
    "has_server_privilege(name,text,text)",
    "has_server_privilege(oid,text,text)",
    "has_server_privilege(text,text)",
    "has_tablespace_privilege(name,text,text)",
    "has_tablespace_privilege(oid,text,text)",
    "has_tablespace_privilege(text,text)",
  ],
  // a pseudo-type argument no SQL literal can construct
  "pseudotype": [
    "any_out(\"any\")",
    "anycompatible_out(anycompatible)",
    "anycompatiblenonarray_out(anycompatiblenonarray)",
    "anyelement_out(anyelement)",
    "anynonarray_out(anynonarray)",
  ],
  // PostgreSQL removed the implementation and the declaration raises for every input
  "removed": [
    "aclinsert(aclitem[],aclitem)",
    "aclremove(aclitem[],aclitem)",
  ],
  // needs a shape the probe cannot supply — a column definition list, a composite target, or a valid modulus/remainder pair
  "shape": [
    "json_populate_record(anyelement,json,boolean)",
    "json_populate_recordset(anyelement,json,boolean)",
    "json_to_record(json)",
    "json_to_recordset(json)",
    "jsonb_populate_record(anyelement,jsonb)",
    "jsonb_populate_record_valid(anyelement,jsonb)",
    "jsonb_populate_recordset(anyelement,jsonb)",
    "jsonb_to_record(jsonb)",
    "jsonb_to_recordset(jsonb)",
    "satisfies_hash_partition(oid,integer,integer,\"any\")",
    "txid_snapshot_xip(txid_snapshot)",
    "xmlvalidate(xml,text)",
  ],
  // a type MODIFIER list, valid only for the modifiers its own type accepts
  "typmod": [
    "bittypmodin(cstring[])",
    "bpchartypmodin(cstring[])",
    "intervaltypmodin(cstring[])",
    "numerictypmodin(cstring[])",
    "timestamptypmodin(cstring[])",
    "timestamptztypmodin(cstring[])",
    "timetypmodin(cstring[])",
    "timetztypmodin(cstring[])",
    "varbittypmodin(cstring[])",
    "varchartypmodin(cstring[])",
  ],
  // the WASM build declines it for every input — libnuma for the XML exporters, and no LATIN source encoding for to_ascii
  "wasm": [
    "schema_to_xml(name,boolean,boolean,text)",
    "schema_to_xml_and_xmlschema(name,boolean,boolean,text)",
    "schema_to_xmlschema(name,boolean,boolean,text)",
    "to_ascii(text)",
    "to_ascii(text,integer)",
    "to_ascii(text,name)",
  ],
};

interface SurfaceRow {
  name: string;
  types: string[];
  volatile: boolean;
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
    pg = await PGlite.create();
    await pg.exec(`CREATE TYPE probe_enum AS ENUM ('a','b');`);
    await pg.exec(PROBE_FN_SQL);
    await pg.exec(SRF_PROBE_FN_SQL);

    const rows = (
      await pg.query<SurfaceRow>(
        `SELECT p.proname AS name,
                COALESCE((SELECT array_agg(format_type(t, null) ORDER BY o)
                            FROM unnest(p.proargtypes) WITH ORDINALITY AS z(t, o)), '{}') AS types,
                p.provolatile = 'v' AS volatile,
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
      if (r.volatile) {
        category.set(key, "volatile");
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
      for (const family of POLYMORPHIC_FAMILIES) {
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
      // A SET-RETURNING row is the same call under a different question —
      // "does any EMITTED row hold a NULL" rather than "is the value NULL" —
      // so it runs through srfprobe with its output-column count. `probe()`
      // reads one arbitrary row and an empty set as a value, which made the
      // verdict depend on sort order: `unnest(ARRAY[NULL,1])` witnessed and
      // `unnest(ARRAY[1,NULL])` did not, the same function over the same
      // elements. probe-values.ts records why the call must sit in the
      // TARGET LIST for that to be affordable.
      if (r.retset) for (const e of mine) srfNcols.set(e, r.ncols);
      exprsBySig.set(key, [...new Set(mine)]);
    }

    // The OPERATOR surface, same discipline: every pg_operator row lands in
    // one category. Claimed symbols are the totality probe's jurisdiction;
    // the rest — `->` and the geometric, network and range families — sat
    // in the same exemption the function surface lost, defaulting nullable
    // with no witness. The JOIN on pg_proc is the shell-operator drop the
    // register's 1a sweep measured sound; pg_catalog ships none.
    const opRows = (
      await pg.query<{ name: string; left: string | null; right: string | null; volatile: boolean }>(
        `SELECT o.oprname AS name,
                CASE WHEN o.oprleft = 0 THEN NULL ELSE format_type(o.oprleft, null) END AS left,
                CASE WHEN o.oprright = 0 THEN NULL ELSE format_type(o.oprright, null) END AS right,
                p.provolatile = 'v' AS volatile
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
      if (r.volatile) {
        category.set(key, "volatile");
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
        volatile: boolean;
        aggkind: string;
        ndirect: number;
      }>(
        `SELECT p.proname AS name,
                COALESCE((SELECT array_agg(format_type(t, null) ORDER BY o)
                            FROM unnest(p.proargtypes) WITH ORDINALITY AS z(t, o)), '{}') AS types,
                p.provolatile = 'v' AS volatile,
                a.aggkind, a.aggnumdirectargs::int AS ndirect
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
           JOIN pg_aggregate a ON a.aggfnoid = p.oid
          WHERE n.nspname = 'pg_catalog' AND p.prokind = 'a'
          ORDER BY p.proname, 2;`,
      )
    ).rows;
    const winRows = (
      await pg.query<{ name: string; types: string[]; volatile: boolean }>(
        `SELECT p.proname AS name,
                COALESCE((SELECT array_agg(format_type(t, null) ORDER BY o)
                            FROM unnest(p.proargtypes) WITH ORDINALITY AS z(t, o)), '{}') AS types,
                p.provolatile = 'v' AS volatile
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
      if (r.volatile) {
        category.set(key, "volatile");
        continue;
      }
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
      if (r.volatile) {
        category.set(key, "volatile");
        continue;
      }
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
      pg = await PGlite.create();
      await pg.exec(`CREATE TYPE probe_enum AS ENUM ('a','b');`);
      await pg.exec(PROBE_FN_SQL);
      await pg.exec(SRF_PROBE_FN_SQL);
    };
    // The probe an expression needs: a set-returning call answers a
    // different question, over its own output columns, through srfprobe.
    const argFor = (e: string): string => {
      const n = srfNcols.get(e);
      return n === undefined ? e : srfQuery(e, n);
    };
    const fnFor = (e: string): string => (srfNcols.has(e) ? "srfprobe" : "probe");
    const evalBatch = async (batch: string[]): Promise<void> => {
      try {
        const res = await pg.query<{ e: string; v: string }>(
          `SELECT e, CASE WHEN srf THEN srfprobe(q) ELSE probe(q) END AS v
             FROM unnest($1::text[], $2::text[], $3::bool[]) AS z(e, q, srf);`,
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
                  `SELECT ${fnFor(e)}($1) AS v`, [argFor(e)],
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
        `\n  no-null-found is the WORK LIST: claimed nullable, no witness found — ` +
        `promote or find the input class. BUILTIN_SURFACE_REPORT=1 prints it.`,
    );
    if (process.env["BUILTIN_SURFACE_REPORT"]) {
      console.log(`\nno-null-found (${noNullFound.length}):\n  ${noNullFound.join("\n  ")}`);
      console.log(
        `\nno-generator types:\n  ` +
          [...noGeneratorTypes.entries()].sort((a, b) => b[1] - a[1])
            .map(([t, n]) => `${t} (${n})`).join("\n  "),
      );
    }
    // The durable handoff, for a session working the lists rather than a
    // human reading a console: BUILTIN_SURFACE_WORKLIST=<path> writes the
    // full classification as markdown. Same run, same data — the file is a
    // snapshot whose provenance and regeneration command it states itself.
    const worklistPath = process.env["BUILTIN_SURFACE_WORKLIST"];
    if (worklistPath) {
      const byCat = (cat: string): string[] =>
        [...category.entries()].filter(([, c]) => c === cat).map(([k]) => k).sort();
      const split = (keys: string[]): string =>
        (["function", "operator", "aggregate", "window"] as const)
          .map(kind => `${kind}s ${keys.filter(k => sigKind.get(k) === kind).length}`)
          .join(", ");
      const lines: string[] = [
        `# Builtin surface work list`,
        ``,
        `Generated by builtin-surface.test.ts (regenerate:`,
        `\`BUILTIN_SURFACE_WORKLIST=docs/builtin-surface-worklist.md pnpm exec vitest run tests/unit/query/builtin-surface.test.ts\`).`,
        `A snapshot of the classification, for working the lists; the SUITE is`,
        `the source of truth and re-derives it every run.`,
        ``,
        `Every entry below is a signature the engine reads as nullable. A`,
        `null-witnessed entry has its witness — promote nothing there. A`,
        `no-null-found entry is claimed nullable with NO witness found across`,
        `the corner corpus: either promote it into the claim tables (the`,
        `totality probe then holds it to execution) or find the input class`,
        `the corpus is missing. Promotion is human, per signature, with the`,
        `probe as the evidence bar.`,
        ``,
      ];
      for (const cat of [
        "null-witnessed", "no-null-found", "raised-everywhere",
        "no-generator", "volatile",
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
      writeFileSync(worklistPath, lines.join("\n"));
      console.log(`worklist written to ${worklistPath}`);
    }
  });

  it("actually evaluated a substantial surface", () => {
    // The guard against the probe silently covering nothing. It used to read
    // "witnessing plus the work list must dwarf the claimed set", and that
    // premise INVERTED once the cluster sweep promoted most of the surface:
    // the rows did not stop being executed, they moved into `claimed`, where
    // the totality probe executes them instead of this suite. So the count
    // that matters is every row some suite decides by RUNNING it — claimed,
    // witnessed, or on the work list — against the ones no execution reaches
    // (no-generator, volatile, raised-everywhere).
    const decided = [...category.values()].filter(
      c => c === "claimed" || c === "null-witnessed" || c === "no-null-found",
    ).length;
    expect(decided).toBeGreaterThan(500);
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

  it("the work list is exactly what is recorded, in both directions", () => {
    // The drift guard the classification lacked. A signature PostgreSQL adds
    // in a future release arrives unclaimed and lands here, and without this
    // the run would pass with the queue quietly larger.
    const actual = new Set(noNullFound);
    const unexplained = [...actual].filter(k => !(k in WORK_LIST)).sort();
    const stale = Object.keys(WORK_LIST).filter(k => !actual.has(k)).sort();
    expect(
      unexplained,
      `Signature(s) the engine reads as nullable with no witness and no ` +
        `recorded reason. Either promote them (probe first — ` +
        `tests/probe/cluster-sweep.ts sweeps by catalog role), witness them ` +
        `in tests/unit/functions/, or add an entry to WORK_LIST saying why ` +
        `neither is possible:\n  ${unexplained.join("\n  ")}`,
    ).toEqual([]);
    expect(
      stale,
      `WORK_LIST records a signature that is no longer on the work list. ` +
        `Either it was promoted or witnessed — drop the entry — or ` +
        `PostgreSQL removed it, and the entry is a reason about a signature ` +
        `that no longer exists:\n  ${stale.join("\n  ")}`,
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
