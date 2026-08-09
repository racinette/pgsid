import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import {
  ALWAYS_NOT_NULL_BUILTINS,
  FIRST_ARG_BUILTINS,
  STRICT_TOTAL_BUILTINS,
  STRICT_TOTAL_BUILTIN_SIGNATURES,
} from "../../../src/query/nullability-walk.js";
import { TOTAL_OPERATORS, STRICT_OPERATORS } from "../../../src/query/operators.js";
import {
  VALUES,
  POLYMORPHIC_FAMILIES,
  POLYMORPHIC,
  combinations,
  qualify,
  PROBE_FN_SQL,
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

interface SurfaceRow {
  name: string;
  types: string[];
  volatile: boolean;
}

describe("builtin scalar surface, witnessed or classified", () => {
  let pg: PGlite;
  const category = new Map<string, string>();
  const nullWitness = new Map<string, string>();
  const noNullFound: string[] = [];
  const noGeneratorTypes = new Map<string, number>();
  let capped = 0;
  let totalRows = 0;

  beforeAll(async () => {
    pg = await PGlite.create();
    await pg.exec(`CREATE TYPE probe_enum AS ENUM ('a','b');`);
    await pg.exec(PROBE_FN_SQL);

    const rows = (
      await pg.query<SurfaceRow>(
        `SELECT p.proname AS name,
                COALESCE((SELECT array_agg(format_type(t, null) ORDER BY o)
                            FROM unnest(p.proargtypes) WITH ORDINALITY AS z(t, o)), '{}') AS types,
                p.provolatile = 'v' AS volatile
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'pg_catalog' AND p.prokind = 'f'
          ORDER BY p.proname, 2;`,
      )
    ).rows;
    totalRows = rows.length;

    const claimedNames = new Set([
      ...ALWAYS_NOT_NULL_BUILTINS,
      ...FIRST_ARG_BUILTINS,
      ...STRICT_TOTAL_BUILTINS,
      ...[...STRICT_TOTAL_BUILTIN_SIGNATURES].map(k => k.slice(0, k.indexOf("("))),
    ]);

    const exprsBySig = new Map<string, string[]>();
    for (const r of rows) {
      const key = `${r.name}(${r.types.join(",")})`;
      if (claimedNames.has(r.name)) {
        category.set(key, "claimed");
        continue;
      }
      if (r.volatile) {
        category.set(key, "volatile");
        continue;
      }
      const missing = r.types.filter(t => !POLYMORPHIC.has(t) && !VALUES[t]);
      if (missing.length > 0) {
        category.set(key, "no-generator");
        for (const t of missing) noGeneratorTypes.set(t, (noGeneratorTypes.get(t) ?? 0) + 1);
        continue;
      }
      const mine: string[] = [];
      for (const family of POLYMORPHIC_FAMILIES) {
        const lists = r.types.map(t => (t in family ? [family[t]!] : VALUES[t]!));
        const { combos, capped: wasCapped } = combinations(lists);
        if (wasCapped) capped++;
        for (const combo of combos) mine.push(`${qualify(r.name)}(${combo.join(", ")})`);
        if (r.types.every(t => !POLYMORPHIC.has(t))) break;
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
      const types = [r.left, r.right].filter((t): t is string => t !== null);
      if (claimedOps.has(r.name)) {
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
    };
    const evalBatch = async (batch: string[]): Promise<void> => {
      try {
        const res = await pg.query<{ e: string; v: string }>(
          `SELECT e, probe(e) AS v FROM unnest($1::text[]) AS e;`,
          [batch],
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
                const r = await pg.query<{ v: string }>(`SELECT probe($1) AS v`, [e]);
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
      let evaluated = 0;
      let witness: string | null = null;
      for (const e of mine) {
        const v = verdicts.get(e);
        if (v === "NULL" && witness === null) witness = e;
        if (v !== "error") evaluated++;
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
  });

  it("actually evaluated a substantial surface", () => {
    // The guard against the probe silently covering nothing: witnessing plus
    // the work list must together dwarf the claimed set.
    const evaluated = [...category.values()].filter(
      c => c === "null-witnessed" || c === "no-null-found",
    ).length;
    expect(evaluated).toBeGreaterThan(500);
  });

  it("no null-witnessed signature carries a totality claim", () => {
    // The loop-closer, extended from the witness corpus to the whole
    // surface: the machine found a NULL, so no table may claim the row.
    // Structurally guaranteed for the name tables (claimed names are never
    // evaluated), so the live half is the signature additions.
    const offenders = [...nullWitness.keys()].filter(k =>
      STRICT_TOTAL_BUILTIN_SIGNATURES.has(k),
    );
    expect(offenders).toEqual([]);
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
    ]) {
      expect(
        nullWitness.has(key),
        `${key} should be null-witnessed (got: ${category.get(key) ?? "NO SUCH KEY"})`,
      ).toBe(true);
    }
  });
});
