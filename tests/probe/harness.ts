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
import { NULL_REJECTION } from "../unit/query/fixture-args.js";
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
  /** The contract's parameter claims, dense $1..$n. */
  params: { number: number; notNull: boolean }[];
  /** Minimal joint rejection sets of size ≥ 2. */
  paramRejectionSets: number[][];
  /**
   * rank 3 — a parameter the contract left nullable whose NULL binding raised
   * while the all-valid control succeeded. ANY raise counts, not only the
   * enumerated null-rejections: either the engine missed a catalog-visible
   * channel, or the channel is opaque (a trigger body, a plpgsql RAISE) and
   * the triage decides which — the same fork `@param-opaque` records in the
   * fixture corpus.
   */
  paramViolations: string[];
  /**
   * NOT a finding — a raise the ALL-NULL corner refutes as a claimable
   * fact: binding $n NULL raised beside sibling VALUES, and the same
   * statement with EVERY parameter NULL passes. The all-NULL corner is the
   * one binding pattern with no value freedom left, so its pass proves the
   * rejection rides a sibling's VALUE ("$1 <= 1 OR $2 IS NOT NULL" is the
   * measured shape) — a condition no flat notNull and no rejection set can
   * carry, adjudicated 2026-08-12 (the value-conditional decision in
   * docs/subtree-evaluation.md). Counted and fingerprinted per run; the
   * bucket growing past a few per 20,000 is the revisit trigger.
   */
  valueConditional: string[];
  /**
   * Witness accounting for the one-directional claims (§4: the instrument
   * makes no coverage claim, so an unwitnessed notNull is a COUNT, never a
   * finding). `raisedOther` is a raise the enumerated null-rejection list
   * does not recognise — reported separately so it cannot inflate either
   * side.
   */
  paramWitness: {
    notNullWitnessed: number[];
    notNullUnwitnessed: number[];
    notNullRaisedOther: number[];
    setsWitnessed: number[][];
    setsUnwitnessed: number[][];
    setsRaisedOther: number[][];
  };
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
      params: [],
      paramRejectionSets: [],
      paramViolations: [],
      valueConditional: [],
      paramWitness: {
        notNullWitnessed: [],
        notNullUnwitnessed: [],
        notNullRaisedOther: [],
        setsWitnessed: [],
        setsUnwitnessed: [],
        setsRaisedOther: [],
      },
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
      // Both evaluation consumers run live (docs/subtree-evaluation.md):
      // the instrument adjudicates the same claims the harnesses pin.
      const evaluate = async (s: string) =>
        (await this.pg.query<Record<string, unknown>>(s)).rows[0];
      const contract = await inferQueryContract(stmt, this.catalog, { paramTypes, evaluate });
      out.engineColumns = contract.outputs.map(o => ({ name: o.name, notNull: o.notNull }));
      out.groups = contract.outputPresenceGroups.map(g => ({
        columns: [...g.columns],
        discriminants: [...g.discriminants],
      }));
      out.params = contract.params.map(p => ({ number: p.number, notNull: p.notNull }));
      out.paramRejectionSets = contract.paramRejectionSets.map(s => [...s]);
      // Parity: the traced walk must reach the same columns and groups.
      const plain = await inferNullability(stmt, this.catalog, { paramTypes, evaluate });
      const traced = await inferNullabilityTraced(stmt, this.catalog, undefined, {
        paramTypes,
        evaluate,
      });
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
    try {
      await this.begin();
      for (const s of probe.seed ?? []) await this.pg.exec(s);
      const res = await this.pg.query(probe.sql, probe.params ?? [], { rowMode: "array" });
      out.pgColumns = res.fields.map(f => f.name);
      out.rows = res.rows as unknown[][];
    } catch (e) {
      out.pgError = (e as Error).message;
    } finally {
      await this.pg.exec("ROLLBACK").catch(() => {});
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
    this.checkRows(out, out.rows, "");

    // --- the parameter contract, adjudicated by binding — rank 3 -----------
    // The verification directions of docs/argument-nullability.md, run per
    // statement instead of per fixture: the target parameter NULL, every
    // other one holding its control value. Attribution needs the control —
    // these variants only run when the all-valid binding succeeded above, so
    // a raise here is evidence about the NULL and nothing else. Variant rows
    // feed the same output oracle as control rows, because output claims are
    // binding-independent — a WHERE-narrowing defect that only shows under a
    // NULL binding shows exactly here.
    if ((probe.params?.length ?? 0) > 0) {
      if (out.params.length !== probe.params!.length) {
        // The contract owes a dense $1..$n; the caller bound what it emitted.
        out.paramViolations.push(
          `contract lists ${out.params.length} parameters, statement binds ${probe.params!.length}`,
        );
        return out;
      }
      const bind = (nulls: Set<number>): unknown[] =>
        probe.params!.map((v, i) => (nulls.has(i + 1) ? null : v));
      // The ALL-NULL corner, run at most once per statement: the one binding
      // pattern with no value freedom left, so its answer routes a nullable
      // raise — raising there too demands a pure-nullness claim (rank 3),
      // passing there proves the rejection rides a sibling's VALUE, which no
      // claim in the contract's vocabulary can carry (recorded, not a
      // finding). With one parameter the per-param variant IS the corner.
      let allNullRaises: boolean | null = null;
      const allNullCorner = async (): Promise<boolean> => {
        if (allNullRaises === null) {
          const r = await this.exec(
            probe,
            bind(new Set(out.params.map(q => q.number))),
          );
          allNullRaises = r.error !== null;
        }
        return allNullRaises;
      };
      for (const p of out.params) {
        const r = await this.exec(probe, bind(new Set([p.number])));
        if (r.error !== null) {
          if (!p.notNull) {
            const demandable = out.params.length === 1 || (await allNullCorner());
            (demandable ? out.paramViolations : out.valueConditional).push(
              demandable
                ? `$${p.number} claimed nullable, binding NULL raised: ${r.error}`
                : `$${p.number} raised beside sibling values, all-NULL passes: ${r.error}`,
            );
          } else if (NULL_REJECTION.test(r.error)) {
            out.paramWitness.notNullWitnessed.push(p.number);
          } else {
            out.paramWitness.notNullRaisedOther.push(p.number);
          }
        } else {
          if (p.notNull) out.paramWitness.notNullUnwitnessed.push(p.number);
          this.checkRows(out, r.rows, `$${p.number}=NULL`);
        }
      }
      // Joint sets, existential like notNull: every member NULL together,
      // the rest valid. The members' individual runs above are what keep a
      // witnessed set irreducible.
      for (const set of out.paramRejectionSets) {
        const r = await this.exec(probe, bind(new Set(set)));
        if (r.error !== null) {
          (NULL_REJECTION.test(r.error)
            ? out.paramWitness.setsWitnessed
            : out.paramWitness.setsRaisedOther
          ).push(set);
        } else {
          out.paramWitness.setsUnwitnessed.push(set);
          this.checkRows(out, r.rows, `$${set.join(",$")}=NULL`);
        }
      }
    }
    return out;
  }

  /**
   * BEGIN, recovering from a session a prior raise left inside an aborted
   * transaction. Measured with a 54001 stack-depth error: the raise
   * re-fires on the very ROLLBACK that would clear it, the swallow leaves
   * the transaction aborted, and the NEXT query's BEGIN then raises 25P02 —
   * one poisonous query killing a 20,000-query run. A clearing ROLLBACK and
   * one retry recover it; a second failure surfaces as the query's own
   * error rather than a crash, because every caller runs this inside its
   * catch.
   */
  private async begin(): Promise<void> {
    try {
      await this.pg.exec("BEGIN");
    } catch {
      await this.pg.exec("ROLLBACK").catch(() => {});
      await this.pg.exec("BEGIN");
    }
  }

  /** One rolled-back execution with the given bindings. */
  private async exec(
    probe: Probe,
    params: unknown[],
  ): Promise<{ rows: unknown[][]; error: string | null }> {
    try {
      await this.begin();
      for (const s of probe.seed ?? []) await this.pg.exec(s);
      const res = await this.pg.query(probe.sql, params, { rowMode: "array" });
      return { rows: res.rows as unknown[][], error: null };
    } catch (e) {
      return { rows: [], error: (e as Error).message };
    } finally {
      await this.pg.exec("ROLLBACK").catch(() => {});
    }
  }

  /**
   * The row-level output oracle — rank 1, and rank 4's group contract as
   * `nullability-soundness.test.ts` states it: the discriminants are NULL
   * only together (that is the unit's absence), and on the absent arm EVERY
   * member is NULL. Shared by the control run and the NULL-binding variants;
   * `label` says which binding produced the row.
   */
  private checkRows(out: ProbeResult, rows: unknown[][], label: string): void {
    const tag = label ? `[${label}] ` : "";
    const width = Math.min(out.engineColumns.length, out.pgColumns.length);
    for (const row of rows) {
      for (let i = 0; i < width; i++) {
        if (out.engineColumns[i]!.notNull && row[i] === null) {
          const msg = `${tag}col ${i} (${out.pgColumns[i]}) claimed notNull, row has NULL`;
          if (!out.violations.includes(msg)) out.violations.push(msg);
        }
      }
    }
    for (const g of out.groups) {
      for (const row of rows) {
        const nullDiscs = g.discriminants.filter(d => row[d] === null);
        if (nullDiscs.length === 0) continue;
        const note = (m: string): void => {
          if (!out.groupViolations.includes(m)) out.groupViolations.push(m);
        };
        if (nullDiscs.length < g.discriminants.length) {
          note(`${tag}group {${g.columns}}: discriminants disagree (NULL: ${nullDiscs})`);
          continue;
        }
        const survivors = g.columns.filter(c => row[c] !== null);
        if (survivors.length) {
          note(`${tag}group {${g.columns}}: absent arm but member(s) ${survivors} are non-NULL`);
        }
      }
    }
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
      : r.paramViolations.length
        ? "RANK3"
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
  if (r.params.length) {
    const w = r.paramWitness;
    lines.push(
      `    params: ${r.params.map(p => `$${p.number}${p.notNull ? "!" : "?"}`).join(" ")}` +
      (r.paramRejectionSets.length ? `  sets: ${JSON.stringify(r.paramRejectionSets)}` : "") +
      (w.notNullWitnessed.length ? `  witnessed: ${w.notNullWitnessed.map(n => `$${n}`).join(" ")}` : "") +
      (w.notNullUnwitnessed.length ? `  unwitnessed: ${w.notNullUnwitnessed.map(n => `$${n}`).join(" ")}` : ""),
    );
  }
  for (const v of r.violations) lines.push(`    !! ${v}`);
  for (const v of r.paramViolations) lines.push(`    !! ${v}`);
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
    if (r.violations.length || r.shape || r.parity || r.groupViolations.length || r.paramViolations.length) hits++;
    console.log(report(r, p));
    console.log("");
  }
  console.log(`--- ${probes.length} probes, ${hits} with a disagreement ---`);
  await loop.close();
}
