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

export interface SqlcCase {
  name: string;
  dir: string;
  schema: string;
  queries: SqlcQuery[];
  /** sqlc's own verdicts, by query name; null when sqlc refused the case. */
  expected: Map<string, SqlcExpectedQuery> | null;
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
      return { name, dir, schema, queries, expected };
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
