// The adversarial PROBE LOOP. Not a test file (vitest's glob is *.test.ts): a
// standalone script run with `pnpm exec tsx tests/probe/<file>.ts`.
//
// This is TOOLING and it stays. Three sweeps rebuilt it privately and threw it
// away; the fourth's fix phase kept it, because what retires with a quarantine
// directory is the FIXTURES — which graduate — and this has no destination of
// its own. Writing a round file is how a claim gets measured against
// PostgreSQL before anyone writes a rule about it, and that is the project's
// first discipline.
//
// One PGlite holds the fixture schema; each probe runs inferQueryContract on
// the parsed statement AND executes the same text against seed data inside a
// transaction that is rolled back, so probes stay independent. Comparison is
// the rank table: names first (a wrong column list misassigns every flag past
// it), then notNull against the returned rows, then traced/untraced parity.
//
// `extraDdl` is how a round introduces objects the fixture schema does not
// carry, without touching it: a shape that earns its place graduates into
// `fixtures/schema.sql` with the fix, and one that does not leaves no trace.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { plpgsql_check } from "@electric-sql/pglite-plpgsql-check";
import { parseSql } from "../../src/ast.js";
import { snapshotCatalog } from "../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../src/query/catalog-adapter.js";
import {
  inferQueryContract,
  inferNullability,
  inferNullabilityTraced,
  inferPresenceGroups,
} from "../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../src/query/types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "..", "unit", "query", "fixtures");

export interface Probe {
  id: string;
  sql: string;
  /** Statements run inside the probe's transaction before the query. */
  seed?: string[];
  /** Positional parameter values, when the statement is parameterized. */
  params?: unknown[];
  note?: string;
}

export interface ProbeResult {
  id: string;
  engineColumns: { name: string; notNull: boolean }[];
  pgColumns: string[];
  rows: unknown[][];
  /** rank 1 — engine said notNull, a row had NULL. */
  violations: string[];
  /** rank 2 — ordered name lists disagree. */
  shape: string | null;
  /** rank 4 — a returned row a presence group's contract forbids. */
  groupViolations: string[];
  /** rank 5 — traced vs untraced. */
  parity: string | null;
  /**
   * The TRACED walk's per-column result. The traced run happens anyway for the
   * parity check and used to be discarded; a caller grouping findings needs
   * the decisive REASON it carries, because that names the rule that
   * concluded rather than the query that tripped it.
   */
  traced: { name: string; notNull: boolean; reason: string }[];
  /** rank 6, or an expected refusal. */
  error: string | null;
  pgError: string | null;
  groups: { columns: number[]; discriminants: number[] }[];
}

export class ProbeLoop {
  private constructor(
    readonly pg: PGlite,
    readonly catalog: NullabilityCatalog,
  ) {}

  static async create(extraDdl: string[] = []): Promise<ProbeLoop> {
    const pg = await PGlite.create({ extensions: { plpgsql_check } });
    await pg.exec("CREATE EXTENSION plpgsql_check;");
    await pg.exec(readFileSync(join(FIXTURES, "schema.sql"), "utf8"));
    for (const ddl of extraDdl) await pg.exec(ddl);
    const catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
    return new ProbeLoop(pg, catalog);
  }

  /** Rebuild the catalog after DDL run mid-session. */
  async refresh(): Promise<ProbeLoop> {
    return new ProbeLoop(this.pg, await buildNullabilityCatalog(await snapshotCatalog(this.pg)));
  }

  async run(probe: Probe): Promise<ProbeResult> {
    const out: ProbeResult = {
      id: probe.id,
      engineColumns: [],
      pgColumns: [],
      rows: [],
      violations: [],
      groupViolations: [],
      traced: [],
      shape: null,
      parity: null,
      error: null,
      pgError: null,
      groups: [],
    };

    // --- tier 0: the statement's parameter types, from PREPARE -------------
    // The walk's optional input (docs/type-aware-overloads.md tier 0): the
    // caller holds the database, so it asks PostgreSQL rather than leaving
    // every ParamRef untyped. A statement PREPARE rejects (or one with no
    // parameters) simply supplies nothing.
    let paramTypes: string[] | undefined;
    if (/\$\d/.test(probe.sql)) {
      try {
        await this.pg.exec(`PREPARE pgsid_t0_probe AS ${probe.sql}`);
        const r = await this.pg.query<{ t: string[] }>(
          `SELECT parameter_types::text[] AS t FROM pg_prepared_statements
           WHERE name = 'pgsid_t0_probe'`,
        );
        paramTypes = r.rows[0]?.t;
      } catch {
        paramTypes = undefined;
      } finally {
        await this.pg.exec("DEALLOCATE ALL").catch(() => {});
      }
    }

    // --- engine half -------------------------------------------------------
    let stmt;
    try {
      const parsed = await parseSql(probe.sql);
      stmt = parsed.stmts![0]!.stmt!;
      const contract = inferQueryContract(stmt, this.catalog, { paramTypes });
      out.engineColumns = contract.outputs.map(o => ({ name: o.name, notNull: o.notNull }));
      out.groups = contract.outputPresenceGroups.map(g => ({
        columns: [...g.columns],
        discriminants: [...g.discriminants],
      }));
      // Parity: the traced walk must reach the same columns and groups.
      const plain = inferNullability(stmt, this.catalog, { paramTypes });
      const traced = inferNullabilityTraced(stmt, this.catalog, undefined, { paramTypes });
      out.traced = traced.map(c => ({
        name: c.name,
        notNull: c.notNull,
        reason: (c as { trace?: { reason?: string } }).trace?.reason ?? "",
      }));
      if (
        plain.length !== traced.length ||
        plain.some((p, i) => p.name !== traced[i]!.name || p.notNull !== traced[i]!.notNull)
      ) {
        out.parity =
          `columns differ: plain=${fmt(plain)} traced=${fmt(traced)}`;
      }
      const gp = inferPresenceGroups(stmt, this.catalog, false);
      const gt = inferPresenceGroups(stmt, this.catalog, true);
      if (JSON.stringify(gp) !== JSON.stringify(gt)) {
        out.parity = (out.parity ? out.parity + "; " : "") +
          `groups differ: plain=${JSON.stringify(gp)} traced=${JSON.stringify(gt)}`;
      }
    } catch (e) {
      out.error = `${(e as Error).name}: ${(e as Error).message}`;
    }

    // --- PostgreSQL half ---------------------------------------------------
    await this.pg.exec("BEGIN");
    try {
      for (const s of probe.seed ?? []) await this.pg.exec(s);
      const res = await this.pg.query(probe.sql, probe.params ?? [], { rowMode: "array" });
      out.pgColumns = res.fields.map(f => f.name);
      out.rows = res.rows as unknown[][];
    } catch (e) {
      out.pgError = (e as Error).message;
    } finally {
      await this.pg.exec("ROLLBACK");
    }

    if (out.error || out.pgError) return out;

    // --- compare -----------------------------------------------------------
    const engineNames = out.engineColumns.map(c => c.name);
    if (
      engineNames.length !== out.pgColumns.length ||
      engineNames.some((n, i) => n !== out.pgColumns[i])
    ) {
      out.shape = `engine=[${engineNames.join(", ")}] pg=[${out.pgColumns.join(", ")}]`;
    }
    const width = Math.min(out.engineColumns.length, out.pgColumns.length);
    for (const row of out.rows) {
      for (let i = 0; i < width; i++) {
        if (out.engineColumns[i]!.notNull && row[i] === null) {
          const msg = `col ${i} (${out.pgColumns[i]}) claimed notNull, row has NULL`;
          if (!out.violations.includes(msg)) out.violations.push(msg);
        }
      }
    }
    // The group contract, as `nullability-soundness.test.ts` states it: the
    // discriminants are NULL only together (that is the unit's absence), and
    // on the absent arm EVERY member is NULL.
    for (const g of out.groups) {
      for (const row of out.rows) {
        const nullDiscs = g.discriminants.filter(d => row[d] === null);
        if (nullDiscs.length === 0) continue;
        const note = (m: string): void => {
          if (!out.groupViolations.includes(m)) out.groupViolations.push(m);
        };
        if (nullDiscs.length < g.discriminants.length) {
          note(`group {${g.columns}}: discriminants disagree (NULL: ${nullDiscs})`);
          continue;
        }
        const survivors = g.columns.filter(c => row[c] !== null);
        if (survivors.length) {
          note(`group {${g.columns}}: absent arm but member(s) ${survivors} are non-NULL`);
        }
      }
    }
    return out;
  }

  async close(): Promise<void> {
    if (!this.pg.closed) await this.pg.close();
  }
}

function fmt(cols: { name: string; notNull: boolean }[]): string {
  return cols.map(c => `${c.name}${c.notNull ? "!" : "?"}`).join(", ");
}

export function report(r: ProbeResult, probe: Probe): string {
  const lines: string[] = [];
  const verdict = r.violations.length
    ? "RANK1"
    : r.shape
      ? "RANK2"
      : r.groupViolations.length
        ? "RANK4"
        : r.parity
        ? "RANK5"
        : r.error && !r.error.startsWith("UnsupportedNodeError")
          ? "RANK6"
          : r.error
            ? "refused"
            : r.pgError
              ? "pg-error"
              : r.rows.length === 0
                ? "no-rows"
                : "ok";
  lines.push(`[${verdict}] ${r.id}${probe.note ? ` — ${probe.note}` : ""}`);
  lines.push(`    sql: ${probe.sql.replace(/\s+/g, " ").trim()}`);
  if (r.error) lines.push(`    engine: ${r.error}`);
  else lines.push(`    engine: ${fmt(r.engineColumns)}`);
  if (r.groups.length) lines.push(`    groups: ${JSON.stringify(r.groups)}`);
  if (r.pgError) lines.push(`    pg: ERROR ${r.pgError}`);
  else {
    lines.push(`    pg cols: [${r.pgColumns.join(", ")}]`);
    lines.push(
      `    rows(${r.rows.length}): ${r.rows.slice(0, 4).map(row => JSON.stringify(row)).join(" ")}`,
    );
  }
  for (const v of r.violations) lines.push(`    !! ${v}`);
  for (const v of r.groupViolations) lines.push(`    !! ${v}`);
  if (r.shape) lines.push(`    !! shape: ${r.shape}`);
  if (r.parity) lines.push(`    !! parity: ${r.parity}`);
  return lines.join("\n");
}

export async function runProbes(probes: Probe[], extraDdl: string[] = []): Promise<void> {
  const loop = await ProbeLoop.create(extraDdl);
  let hits = 0;
  for (const p of probes) {
    const r = await loop.run(p);
    if (r.violations.length || r.shape || r.parity || r.groupViolations.length) hits++;
    console.log(report(r, p));
    console.log("");
  }
  console.log(`--- ${probes.length} probes, ${hits} with a disagreement ---`);
  await loop.close();
}
