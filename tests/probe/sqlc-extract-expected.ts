// Extract sqlc's expected nullability as JSON IR — the corpus-refresh step.
//
//   pnpm exec tsx tests/probe/sqlc-extract-expected.ts
//
// For every vendored case (tests/unit/query/sqlc-corpus/cases/*), runs the
// PINNED sqlc release (PROVENANCE.md) with the built-in `json` codegen and
// saves the verdicts as expected.json: per query, per column, sqlc's own
// `not_null` — the IR, BEFORE any Go type mapping, so `overrides` and
// emit-flags in the cases' own configs never enter the picture. The cases'
// sqlc.json/sqlc.yaml are ignored entirely; a minimal config pointing at
// schema.sql/query.sql is injected per run.
//
// A case sqlc itself refuses to compile (the corpus carries deliberately
// invalid cases) gets `{"error": ...}` instead — counted by the suite, so a
// refresh that changes the refusal set moves a pin.
//
// Requires a Go toolchain; the sqlc version is `SQLC_VERSION` in
// tests/unit/query/sqlc-corpus.ts — one source of truth, because each case's
// adjudication.json records the version its conclusions were drawn against
// and the suite fails when the two part. Bumping it must move together with
// the vendored corpus (see PROVENANCE.md).

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SQLC_VERSION } from "../unit/query/sqlc-corpus.js";

const CASES = join(dirname(fileURLToPath(import.meta.url)), "..", "unit", "query", "sqlc-corpus", "cases");

interface ExpectedColumn { name: string; notNull: boolean }
interface ExpectedQuery { name: string; cmd: string; columns: ExpectedColumn[]; params: boolean[] }

const cases = readdirSync(CASES).sort();
let ok = 0;
let failed = 0;
for (const c of cases) {
  const dir = join(CASES, c);
  if (!existsSync(join(dir, "schema.sql"))) continue;
  const work = mkdtempSync(join(tmpdir(), "sqlc-extract-"));
  try {
    copyFileSync(join(dir, "schema.sql"), join(work, "schema.sql"));
    copyFileSync(join(dir, "query.sql"), join(work, "query.sql"));
    writeFileSync(
      join(work, "sqlc.json"),
      JSON.stringify({
        version: "2",
        sql: [{
          engine: "postgresql",
          schema: "schema.sql",
          queries: "query.sql",
          gen: { json: { out: "out", filename: "codegen.json" } },
        }],
      }),
    );
    try {
      execFileSync("go", ["run", `github.com/sqlc-dev/sqlc/cmd/sqlc@${SQLC_VERSION}`, "generate"], {
        cwd: work,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 60_000,
      });
    } catch (e) {
      const msg = (e as { stderr?: Buffer }).stderr?.toString().slice(0, 300) ?? String(e);
      writeFileSync(join(dir, "expected.json"), JSON.stringify({ error: msg.trim() }, null, 1));
      failed++;
      continue;
    }
    const raw = JSON.parse(readFileSync(join(work, "out", "codegen.json"), "utf8")) as {
      queries?: {
        name: string;
        cmd: string;
        columns?: { name: string; not_null?: boolean }[];
        params?: { column?: { not_null?: boolean } }[];
      }[];
    };
    const queries: ExpectedQuery[] = (raw.queries ?? []).map(q => ({
      name: q.name,
      cmd: q.cmd.replace(/^:/, ""),
      columns: (q.columns ?? []).map(col => ({ name: col.name, notNull: col.not_null ?? false })),
      params: (q.params ?? []).map(p => p.column?.not_null ?? false),
    }));
    writeFileSync(join(dir, "expected.json"), JSON.stringify({ queries }, null, 1));
    ok++;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
console.log(`extracted=${ok} sqlc-refused=${failed} total=${cases.length}`);
