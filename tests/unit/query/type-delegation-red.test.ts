import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferNullability, type WalkOptions } from "../../../src/query/nullability-walk.js";
import type {
  NullabilityCatalog,
  ResolveColumnTypes,
  TypeSetAudit,
} from "../../../src/query/types.js";
import { UNION_SCHEMA } from "./type-union-cases.js";
import { exprSql, wireRendering } from "./type-unions.js";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// THE RED SUITE for type-resolution delegation, Stage 1
// (docs/type-resolution-delegation.md).
//
// `operandTypeSet` keeps every candidate an implicit coercion could reach,
// because it does not implement PostgreSQL's preferred-type tiebreak — that
// is a declared non-goal. The result is a union where PostgreSQL has an exact
// answer, and a union constrains less than the answer does.
//
// Route A asks for that answer without reimplementing anything: replace each
// operand the walk ALREADY types with `$n::TYPE`, PREPARE the subexpression
// alone, and read `pg_prepared_statements.result_types`. The context is
// REBUILT rather than discarded, which is what makes it safe where a bare
// standalone probe is not — `'2020-01-01'` alone resolves `text`, but
// `$1::date = '2020-01-01'` resolves the literal as a date.
//
// The guards are the design, not a detail. Measured 2026-08-24: over the
// fixture corpus the safety rule refused 135 nodes it would otherwise have
// typed. Every refusal below is a node PostgreSQL WILL answer for, and
// answering it would be an over-DROP — the failure class that produced the
// only soundness bug this area has had (`bare-name-gates-red.test.ts`).
//
// Every expectation carries PostgreSQL's own answer.
// ---------------------------------------------------------------------------

let pg: PGlite;
let catalog: NullabilityCatalog;

/** The consumer half of the contract: PREPARE, read the resolved output
 *  types, DEALLOCATE. Parse analysis only — nothing runs, nothing is
 *  planned. */
const resolveColumnTypes: ResolveColumnTypes = async sql => {
  try {
    await pg.exec(`PREPARE d AS ${sql}`);
  } catch {
    return []; // a probe PostgreSQL rejects drops to the symbolic path
  }
  try {
    const r = await pg.query<{ rt: string[] }>(
      "SELECT result_types::text[] AS rt FROM pg_prepared_statements WHERE name = 'd'",
    );
    return r.rows[0]?.rt ?? [];
  } finally {
    await pg.exec("DEALLOCATE d");
  }
};

/** Every type set the walk reads for `sql`, keyed by deparsed expression. */
async function sets(sql: string, options?: WalkOptions): Promise<Map<string, string[] | null>> {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const audit: TypeSetAudit[] = [];
  await inferNullability(stmt, catalog, { ...options, typeSetAudit: audit });
  const out = new Map<string, string[] | null>();
  for (const rec of audit) {
    const key = exprSql(rec.expr);
    if (key !== null && !out.has(key)) out.set(key, rec.set);
  }
  return out;
}

/** The reading for one expression, with delegation ON. */
async function delegated(sql: string, expr: string): Promise<string[] | null | undefined> {
  const m = await sets(sql, { resolveColumnTypes });
  expect(m.has(expr), `the walk read nothing for \`${expr}\` in: ${sql}`).toBe(true);
  return m.get(expr);
}

/** The reading for one expression, with delegation OFF. */
async function symbolic(sql: string, expr: string): Promise<string[] | null | undefined> {
  const m = await sets(sql);
  expect(m.has(expr), `the walk read nothing for \`${expr}\` in: ${sql}`).toBe(true);
  return m.get(expr);
}

/** What PostgreSQL resolves the single output column of `sql` to. */
async function pgType(sql: string): Promise<string> {
  const t = await resolveColumnTypes(sql);
  expect(t.length, `PostgreSQL answered nothing for: ${sql}`).toBe(1);
  return t[0]!;
}

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(UNION_SCHEMA);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
}, 120_000);

afterAll(async () => {
  await pg?.close();
});

describe("type-resolution delegation, Stage 1 (Route A)", () => {
  it("collapses a mixed-numeric union to the type PostgreSQL resolves", async () => {
    const sql = "SELECT abs(m.i + m.n) AS v FROM m";
    expect(await pgType("SELECT $1::integer + $2::numeric")).toBe("numeric");
    // The union the walk reads on its own — wide, sound, and less than the
    // answer. This is also what the containment invariant is measured against.
    expect(await symbolic(sql, "m.i + m.n")).toEqual([
      "double precision",
      "numeric",
      "real",
    ]);
    expect(await delegated(sql, "m.i + m.n")).toEqual(["numeric"]);
  });

  it("the delegated answer is a MEMBER of the union it replaces", async () => {
    const sql = "SELECT abs(m.r + m.n) AS v FROM m";
    const wide = await symbolic(sql, "m.r + m.n");
    const exact = await delegated(sql, "m.r + m.n");
    expect(exact).toHaveLength(1);
    expect(wide).toContain(exact![0]);
  });

  it("substitutes a DECLARED parameter type, which pins its neighbour", async () => {
    // A parameter is refused as a delegation TARGET and accepted as a
    // delegation SOURCE, and the two are not in tension: this never asks what
    // `$1` is, it uses what the engine declared. The distinction buys the
    // whole mixed-parameter arithmetic surface.
    expect(await pgType("SELECT $1::numeric + $2::integer")).toBe("numeric");
    const sql = "SELECT abs($1 + m.i) AS v FROM m";
    const off = await sets(sql, { paramTypes: ["numeric"] });
    expect(off.get("$1 + m.i")).toEqual(["double precision", "numeric", "real"]);
    const on = await sets(sql, { resolveColumnTypes, paramTypes: ["numeric"] });
    expect(on.get("$1 + m.i")).toEqual(["numeric"]);
  });

  describe("Route B — splice a probe into the statement's own output list", () => {
    it("types a derived column the walk cannot follow to a base column", async () => {
      // `unnest(m.arr)` is a function scan; `reExportedBaseColumn` requires a
      // bare ColumnRef target and there is no base column to look up.
      const sql = "SELECT s.v || 'x' AS r FROM (SELECT unnest(m.arr) AS v FROM m) s";
      expect(await pgType(sql)).toBe("text");
      expect(await symbolic(sql, "s.v")).toBeNull();
      expect(await delegated(sql, "s.v")).toEqual(["text"]);
    });

    it("types a COMPUTED derived column", async () => {
      const sql = "SELECT abs(s.c) AS r FROM (SELECT count(*) AS c FROM m) s";
      expect(await pgType(sql)).toBe("bigint");
      expect(await symbolic(sql, "s.c")).toBeNull();
      expect(await delegated(sql, "s.c")).toEqual(["bigint"]);
    });

    it("COMPOSES with Route A: typed columns become typed leaves", async () => {
      // The whole argument for doing both. Route B types `a.c` and `b.c`;
      // neither the sum nor its operands were typeable before, and with the
      // leaves pinned Route A resolves the operator over them.
      const sql =
        "SELECT abs(a.c + b.c) AS r FROM (SELECT count(*) AS c FROM m) a, (SELECT count(*) AS c FROM m) b";
      expect(await pgType(sql)).toBe("bigint");
      expect(await symbolic(sql, "a.c + b.c")).toBeNull();
      expect(await delegated(sql, "a.c")).toEqual(["bigint"]);
      expect(await delegated(sql, "a.c + b.c")).toEqual(["bigint"]);
    });

    it("GUARD: refuses an alias bound more than once in the statement", async () => {
      // Two relations answer to `s`. A top-level probe would resolve against
      // whichever one is visible there, and nothing in the probe records
      // which one the walk was asking about.
      const sql =
        "SELECT abs(s.c) AS r FROM (SELECT count(*) AS c FROM m) s " +
        "WHERE EXISTS (SELECT 1 FROM (SELECT count(*) AS c FROM m) s WHERE s.c > 0)";
      expect(await pgType(sql)).toBe("bigint");
      expect(await delegated(sql, "s.c")).toBeNull();
    });

    it("GUARD: a qualifier not visible at the top level drops to the union", async () => {
      // `z` is bound inside the CTE. The probe raises, and a probe that
      // raises must never fail the statement.
      const sql =
        "WITH w AS (SELECT abs(z.c) AS r FROM (SELECT count(*) AS c FROM m) z) SELECT w.r FROM w";
      expect(await pgType(sql)).toBe("bigint");
      expect(await delegated(sql, "z.c")).toBeNull();
    });
  });

  it("without the callback the walk is byte-for-byte what it was", async () => {
    const sql = "SELECT abs(m.i + m.n) AS v, abs(m.r + m.n) AS w FROM m";
    const off = await sets(sql);
    expect(off.get("m.i + m.n")).toEqual(["double precision", "numeric", "real"]);
    expect(off.get("m.r + m.n")).toEqual(["double precision", "real"]);
  });

  describe("the safety rule — nodes PostgreSQL answers and we must refuse", () => {
    it("a bare string literal stays untyped", async () => {
      // PostgreSQL says `text`; the walk must not, because the type of an
      // unknown literal comes from whatever consumes it. In
      // `WHERE m.d = '2020-01-01'` that same token is a DATE, and neither
      // answer is a property of the literal — so we claim neither.
      expect(await pgType("SELECT 'a'")).toBe("text");
      expect(await pgType("SELECT ($1::date = '2020-01-01')")).toBe("boolean");
      expect(await delegated("SELECT m.t || 'a' AS v FROM m", "'a'")).toBeNull();
      expect(
        await delegated("SELECT abs(m.i) AS v FROM m WHERE m.d = '2020-01-01'", "'2020-01-01'"),
      ).toBeNull();
    });

    it("an ARRAY of unknown literals stays untyped", async () => {
      expect(await pgType("SELECT ARRAY['a','b']")).toBe("text[]");
      expect(
        await delegated("SELECT m.arr || ARRAY['a','b'] AS v FROM m", "ARRAY['a', 'b']"),
      ).toBeNull();
    });

    it("a parameter is typed by its DECLARATION, never by delegation", async () => {
      // A bare `$1` comes back `text` from PostgreSQL; the engine's declared
      // paramTypes is the contract and wins.
      expect(await pgType("SELECT $1")).toBe("text");
      const sql = "SELECT abs($1 + m.i) AS v FROM m";
      const m = await sets(sql, { resolveColumnTypes, paramTypes: ["numeric"] });
      expect(m.get("$1")).toEqual(["numeric"]);
    });

    it("refuses to reach inside a SubLink, whose columns are another scope's", async () => {
      // Rewriting `m2.i` here would produce `(SELECT max($1::integer) FROM m
      // AS m2)` — a different expression that PostgreSQL answers confidently.
      // The enclosing union keeps `pg_lsn`, which is the honest cost of the
      // refusal and exactly what Route B is sequenced to fix.
      const sql = "SELECT abs((SELECT max(m2.i) FROM m m2) + m.n) AS v FROM m";
      const expr = "((SELECT max(m2.i) FROM m AS m2)) + m.n";
      const wide = ["double precision", "numeric", "pg_lsn", "real"];
      expect(await symbolic(sql, expr)).toEqual(wide);
      expect(await delegated(sql, expr)).toEqual(wide);
      expect(await delegated(sql, "(SELECT max(m2.i) FROM m AS m2)")).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// THE SAFETY NET.
//
// The cases above pin the mechanism on expressions chosen to exercise it.
// This runs the WHOLE fixture corpus twice — delegation off, then on — and
// holds the one invariant that must never break: a delegated answer is a
// MEMBER of the union it replaced. Delegation exists to narrow a union the
// walk could already state, so an answer outside that union is an over-DROP,
// and an over-drop is how the walk claims notNull for an expression
// PostgreSQL answers NULL for.
//
// Readings are matched by NODE IDENTITY across the two passes, which is why
// both run against one parse. They cannot be matched by position: a delegated
// answer returns before recursing, so the sub-operands under it are never
// read and the two audits have different lengths by construction.
// ---------------------------------------------------------------------------
describe("delegation over the fixture corpus", () => {
  const DIR = join(__dirname, "fixtures");
  let fpg: PGlite;
  let fcatalog: NullabilityCatalog;
  let fresolve: ResolveColumnTypes;

  beforeAll(async () => {
    fpg = await PGlite.create();
    await fpg.exec(readFileSync(join(DIR, "schema.sql"), "utf8"));
    fcatalog = await buildNullabilityCatalog(await snapshotCatalog(fpg));
    fresolve = async sql => {
      try {
        await fpg.exec(`PREPARE c AS ${sql}`);
      } catch {
        return [];
      }
      try {
        const r = await fpg.query<{ rt: string[] }>(
          "SELECT result_types::text[] AS rt FROM pg_prepared_statements WHERE name = 'c'",
        );
        return r.rows[0]?.rt ?? [];
      } finally {
        await fpg.exec("DEALLOCATE c");
      }
    };
  }, 120_000);

  afterAll(async () => {
    await fpg?.close();
  });

  it("never answers outside the union it replaced", async () => {
    const files = readdirSync(DIR)
      .filter(f => f.endsWith(".sql") && f !== "schema.sql")
      .sort();

    let compared = 0;
    let probes = 0;
    let narrowed = 0;
    let wideOff = 0;
    let wideOn = 0;
    const violations: string[] = [];
    const counting: ResolveColumnTypes = async sql => {
      probes++;
      return fresolve(sql);
    };

    for (const file of files) {
      const sql = readFileSync(join(DIR, file), "utf8");
      const off: TypeSetAudit[] = [];
      const on: TypeSetAudit[] = [];
      try {
        const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
        await inferNullability(stmt, fcatalog, { typeSetAudit: off });
        await inferNullability(stmt, fcatalog, {
          typeSetAudit: on,
          resolveColumnTypes: counting,
        });
      } catch {
        continue; // a statement the walk refuses is not this test's subject
      }
      const byNode = new Map<unknown, string[] | null>();
      for (const r of on) if (!byNode.has(r.expr)) byNode.set(r.expr, r.set);
      const seen = new Set<unknown>();
      for (const rec of off) {
        if (seen.has(rec.expr) || !byNode.has(rec.expr)) continue;
        seen.add(rec.expr);
        compared++;
        const before = rec.set;
        const after = byNode.get(rec.expr)!;
        if (before !== null && before.length > 1) wideOff++;
        if (after !== null && after.length > 1) wideOn++;
        if (JSON.stringify(before) === JSON.stringify(after)) continue;
        const text = exprSql(rec.expr) ?? "?";
        if (after === null || after.length !== 1) {
          violations.push(`${file}: ${text} WIDENED to ${JSON.stringify(after)}`);
          continue;
        }
        narrowed++;
        if (before === null) continue; // no union to be a member of
        const target = await wireRendering(fpg, after[0]!);
        let member = false;
        for (const m of before) {
          const rendered = await wireRendering(fpg, m);
          if (rendered === "*" || (rendered !== null && rendered === target)) {
            member = true;
            break;
          }
        }
        if (!member) {
          violations.push(`${file}: ${text} → ${after[0]} NOT IN ${JSON.stringify(before)}`);
        }
      }
    }

    console.log(
      `\ntype-delegation over the fixture corpus\n` +
        `  readings compared:     ${compared}\n` +
        `  probes to PostgreSQL:  ${probes}   (deduped by expression text)\n` +
        `  multi-member off→on:   ${wideOff} → ${wideOn}\n` +
        `  narrowed:              ${narrowed}\n` +
        `  CONTAINMENT VIOLATIONS: ${violations.length}\n`,
    );
    expect(narrowed, "delegation must actually reach the corpus").toBeGreaterThan(0);
    expect(violations).toEqual([]);
  }, 300_000);
});
