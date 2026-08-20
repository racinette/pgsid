import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// The sqlc borrowed corpus: enumeration and the expected-verdict reader.
//
// See sqlc-corpus/PROVENANCE.md for what is vendored and why. Two consumers:
// sqlc-corpus.test.ts (PostgreSQL-judged oracles + the disagreement CENSUS,
// pinned) and tests/probe/sqlc-register.ts (the full disagreement register
// the adjudicator walks). sqlc's expectations are NEVER a bar — the register
// exists because either side may be wrong, and only a counterexample with
// data settles it.
//
// The expectations are sqlc's own IR, not its generated code: each case's
// expected.json is produced by tests/probe/sqlc-extract-expected.ts running
// the PINNED sqlc release with the built-in `json` codegen, whose per-column
// `not_null` is sqlc's inference BEFORE any Go type mapping — so type
// `overrides` and emit-flags never blur the verdicts, and nothing here
// parses Go.
// ---------------------------------------------------------------------------

/**
 * The vendored release (PROVENANCE.md). One source of truth: the extractor
 * runs THIS version to produce every `expected.json`, and each case's
 * `adjudication.json` records the version its conclusions were drawn against
 * — the suite fails when the two part, so a bump cannot silently inherit
 * reasoning about the old IR.
 */
export const SQLC_VERSION = "v1.31.1";

export const CORPUS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "sqlc-corpus",
  "cases",
);

export interface SqlcQuery {
  /** `-- name: GetFoo :many` → GetFoo. */
  name: string;
  /** one | many | exec | execrows | execresult | copyfrom | batchexec … */
  cmd: string;
  sql: string;
}

export interface SqlcExpectedQuery {
  name: string;
  cmd: string;
  columns: { name: string; notNull: boolean }[];
  params: boolean[];
}

/**
 * OUR half of a case, in `adjudication.json` beside the vendored files.
 *
 * The vendored corpus ships a schema, queries and sqlc's verdicts and no
 * DATA, which is why the suite could judge shape and validity but never
 * soundness. This is the missing half, plus the conclusion it supports:
 * the bindings that reach the disputed column, and per disagreeing column a
 * disposition that says what the observation MEANT.
 *
 * `adjudicatedAgainst` is the staleness catch. A conclusion is only about the
 * sqlc release it was drawn against; the suite compares this to the pinned
 * SQLC_VERSION and fails when they part, so bumping sqlc cannot silently
 * inherit reasoning done against the old IR.
 */
export interface SqlcAdjudication {
  /** The sqlc release these conclusions were drawn against, e.g. `v1.31.1`. */
  adjudicatedAgainst: string;
  /** Why this data state is the one that decides the case. */
  why: string;
  /** Binding vectors per query name, positionally `$1..$n`. */
  args?: Record<string, unknown[][]>;
  /** Keyed `Query#column (name)`, or bare `Query` for a shape skew. */
  entries: Record<
    string,
    {
      /** ticket-ready | pgsid-imprecision | conservatism-expected | unresolved */
      disposition: string;
      /** The upstream draft this rides, for `ticket-ready`. */
      ticket?: string;
      note: string;
    }
  >;
}

export interface SqlcCase {
  name: string;
  dir: string;
  schema: string;
  queries: SqlcQuery[];
  /** sqlc's own verdicts, by query name; null when sqlc refused the case. */
  expected: Map<string, SqlcExpectedQuery> | null;
  /** `data.sql` — ours, applied after the schema; null when the case has none. */
  data: string | null;
  /** `adjudication.json` — ours; null when the register says nothing here. */
  adjudication: SqlcAdjudication | null;
}

const NAME_RE = /^-- name:\s+(\S+)\s+:(\S+)\s*$/m;

/** sqlc-isms that make a query not-PostgreSQL; the suite skips these. */
export const SQLC_MACRO_RE = /@\w+|sqlc\.(arg|narg|embed|slice)\b/;

export function loadSqlcCases(): SqlcCase[] {
  return readdirSync(CORPUS_DIR)
    .sort()
    .map(name => {
      const dir = join(CORPUS_DIR, name);
      const schema = readFileSync(join(dir, "schema.sql"), "utf8");
      const raw = readFileSync(join(dir, "query.sql"), "utf8");
      const queries: SqlcQuery[] = raw
        .split(/^(?=-- name:)/m)
        .filter(b => NAME_RE.test(b))
        .map(b => {
          const m = NAME_RE.exec(b)!;
          return { name: m[1]!, cmd: m[2]!, sql: b.replace(/^-- name:[^\n]*\n/, "").trim() };
        })
        .filter(q => q.sql.length > 0);

      let expected: Map<string, SqlcExpectedQuery> | null = null;
      const expectedPath = join(dir, "expected.json");
      if (existsSync(expectedPath)) {
        const parsed = JSON.parse(readFileSync(expectedPath, "utf8")) as {
          error?: string;
          queries?: SqlcExpectedQuery[];
        };
        if (parsed.queries) {
          expected = new Map(parsed.queries.map(q => [q.name, q]));
        }
      }
      // Ours. Both optional: most of the 253 cases carry no disagreement and
      // need no state, and a case whose entries are all agreement needs no
      // conclusion either.
      const dataPath = join(dir, "data.sql");
      const data = existsSync(dataPath) ? readFileSync(dataPath, "utf8") : null;
      const adjPath = join(dir, "adjudication.json");
      const adjudication = existsSync(adjPath)
        ? (JSON.parse(readFileSync(adjPath, "utf8")) as SqlcAdjudication)
        : null;

      return { name, dir, schema, queries, expected, data, adjudication };
    });
}

/**
 * sqlc's expected nullability for one query, or a string reason there is
 * none: the case was refused by sqlc, the command has no row shape, or the
 * query is missing from the IR.
 */
export function sqlcExpectedNullability(
  c: SqlcCase,
  q: SqlcQuery,
): { column: string; notNull: boolean }[] | string {
  if (!c.expected) return "sqlc refused the case";
  if (q.cmd !== "one" && q.cmd !== "many") return `:${q.cmd} has no row shape`;
  const e = c.expected.get(q.name);
  if (!e) return "query missing from IR";
  return e.columns.map(col => ({ column: col.name, notNull: col.notNull }));
}

/**
 * The disagreements BY NAME — the identity `expect(tally).toEqual(PINS)`
 * cannot carry. Counts absorb a swap: one entry settled and one appearing
 * leaves the tally exactly where it was, and the register then describes a
 * corpus that no longer exists. This map moves per ENTRY, so a change
 * produces a diff that says which one.
 *
 * Worked twice already, both on 2026-08-20. The function overload merge closed
 * six entries (25 → 19); the imprecision batch closed four more (19 → 15) —
 * `nextval` totality, the strict-SRF `returnsSet` exclusion, and wiring the
 * subtree evaluator into this harness. Each time it was this map that said
 * WHICH, and the counts alone would have been equally consistent with the same
 * number closing and reopening elsewhere.
 *
 * Derivable with no data — it is expected.json against the walk — which is
 * why it is pinned separately from the adjudication below.
 */
export const DISAGREEMENTS: Record<string, string> = {
  "accurate_cte/GetProductStats#1 (avg_price)": "sqlc-stronger",
  "coalesce_as/SumBaz#1 (quantity)": "pgsid-stronger",
  "create_table_as/GetFirst#0 (val)": "sqlc-stronger",
  "create_view/GetSecond#1 (val2)": "pgsid-stronger",
  "cte_recursive_star/GetDictTree#5 (path)": "pgsid-stronger",
  "ddl_create_table_inherits/GetAllOrganisations#2 (legal_name)": "sqlc-stronger",
  "emit_result_and_params_struct_pointers/GetOne#0 (a)": "pgsid-stronger",
  "emit_result_and_params_struct_pointers/GetOne#1 (b)": "pgsid-stronger",
  "func_aggregate/Percentile#0 (percentile_disc)": "sqlc-stronger",
  "func_call_cast/Demo#0 (col1)": "sqlc-stronger",
  "func_star_expansion/TestFuncSelectBlog": "shape-skew: sqlc 1, walk 4",
  "join_full/FullJoin#0 (id)": "pgsid-stronger",
  "join_inner/SelectAllJoined#0 (id)": "pgsid-stronger",
  "join_inner/SelectAllJoinedAlias#0 (id)": "pgsid-stronger",
  "join_right/RightJoin#0 (id)": "pgsid-stronger",
  "join_right/RightJoin#1 (bar_id)": "pgsid-stronger",
  "min_max_date/ActivityStats#1 (mindate)": "sqlc-stronger",
  "min_max_date/ActivityStats#2 (maxdate)": "sqlc-stronger",
  "null_if_type/GetRestrictedId#0 (restricted_id)": "sqlc-stronger",
  "omit_unused_structs/query_param_enum_table#2 (value)": "pgsid-stronger",
  "params_two/FooByAandB#0 (a)": "pgsid-stronger",
  "params_two/FooByAandB#1 (b)": "pgsid-stronger",
  "pg_advisory_xact_lock/AdvisoryLockOne#0 (pg_advisory_lock)": "sqlc-stronger",
  "pg_advisory_xact_lock/AdvisoryUnlock#0 (pg_advisory_unlock)": "sqlc-stronger",
  "returning/DeleteUserAndReturnUser#0 (name)": "pgsid-stronger",
  "star_expansion_series/CountAlertReportBy#0 (datetime)": "sqlc-stronger",
  "subquery_calculated_column/SubqueryCalcColumn#0 (sum)": "sqlc-stronger",
  "sum_type/SumOrder#0 (sum)": "sqlc-stronger",
  "unnest_with_ordinality/GetValues#2 (value)": "sqlc-stronger",
  "valid_group_by_reference/ListMetrics#2 (avg)": "sqlc-stronger",
};

/**
 * The same keys with what the ROWS said and what it MEANT: `<verdict> ·
 * <disposition>`, the verdict re-derived on every run from each case's
 * `data.sql`, the disposition read from its `adjudication.json`.
 *
 * This one is louder than the map above when it moves. A classification
 * changing means an engine changed its mind; a VERDICT changing means
 * PostgreSQL answered differently under a state we recorded, which is either
 * a fixed defect or a broken assumption and never a re-pin without reading.
 *
 * `pgsid-convicted` cannot appear here: a NULL in a column the walk calls
 * notNull is an unsoundness and lands in hardViolations, where no pin can
 * absorb it.
 */
export const ADJUDICATED: Record<string, string> = {
  "accurate_cte/GetProductStats#1 (avg_price)": "sqlc-convicted · ticket-ready (T1)",
  "coalesce_as/SumBaz#1 (quantity)": "attempted · conservatism-expected",
  "create_table_as/GetFirst#0 (val)": "sqlc-convicted · ticket-ready (T3)",
  "create_view/GetSecond#1 (val2)": "attempted · conservatism-expected",
  "cte_recursive_star/GetDictTree#5 (path)": "attempted · conservatism-expected",
  "ddl_create_table_inherits/GetAllOrganisations#2 (legal_name)":
    "sqlc-convicted · ticket-ready (T4)",
  "emit_result_and_params_struct_pointers/GetOne#0 (a)": "attempted · conservatism-expected",
  "emit_result_and_params_struct_pointers/GetOne#1 (b)": "attempted · conservatism-expected",
  "func_aggregate/Percentile#0 (percentile_disc)": "sqlc-convicted · ticket-ready (T1)",
  "func_call_cast/Demo#0 (col1)": "sqlc-convicted · ticket-ready (T2)",
  "func_star_expansion/TestFuncSelectBlog": "shape-skew · ticket-ready (T5)",
  "join_full/FullJoin#0 (id)": "attempted · conservatism-expected",
  "join_inner/SelectAllJoined#0 (id)": "attempted · conservatism-expected",
  "join_inner/SelectAllJoinedAlias#0 (id)": "attempted · conservatism-expected",
  "join_right/RightJoin#0 (id)": "attempted · conservatism-expected",
  "join_right/RightJoin#1 (bar_id)": "attempted · conservatism-expected",
  "min_max_date/ActivityStats#1 (mindate)": "sqlc-convicted · ticket-ready (T1)",
  "min_max_date/ActivityStats#2 (maxdate)": "sqlc-convicted · ticket-ready (T1)",
  "null_if_type/GetRestrictedId#0 (restricted_id)": "sqlc-convicted · ticket-ready (T2)",
  "omit_unused_structs/query_param_enum_table#2 (value)": "attempted · conservatism-expected",
  "params_two/FooByAandB#0 (a)": "attempted · conservatism-expected",
  "params_two/FooByAandB#1 (b)": "attempted · conservatism-expected",
  "pg_advisory_xact_lock/AdvisoryLockOne#0 (pg_advisory_lock)":
    "sqlc-convicted · ticket-ready (T1)",
  "pg_advisory_xact_lock/AdvisoryUnlock#0 (pg_advisory_unlock)":
    "sqlc-convicted · ticket-ready (T1)",
  "returning/DeleteUserAndReturnUser#0 (name)": "attempted · conservatism-expected",
  "star_expansion_series/CountAlertReportBy#0 (datetime)": "sqlc-convicted · ticket-ready (T2)",
  "subquery_calculated_column/SubqueryCalcColumn#0 (sum)": "sqlc-convicted · ticket-ready (T2)",
  "sum_type/SumOrder#0 (sum)": "sqlc-convicted · ticket-ready (T1)",
  "unnest_with_ordinality/GetValues#2 (value)": "sqlc-convicted · ticket-ready (T2)",
  "valid_group_by_reference/ListMetrics#2 (avg)": "sqlc-convicted · ticket-ready (T1)",
};
