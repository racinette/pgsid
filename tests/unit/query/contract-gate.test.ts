import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferQueryContract } from "../../../src/query/nullability-walk.js";
import {
  compareShapes,
  gateContract,
  type DescribeStatement,
  type DescribedShape,
} from "../../../src/contract-gate.js";
import type { NullabilityCatalog, OutputNullability } from "../../../src/query/types.js";
import type { QueryContract } from "../../../src/query/nullability-walk.js";
import { parseFixtureDirectives } from "./fixture-args.js";

// ---------------------------------------------------------------------------
// The arity-and-order gate.
//
// Two halves, and the second is the one that means anything.
//
// The LIVE half runs the gate over every fixture with a real PGlite
// description and asserts it agrees. That proves the gate is not a
// permanently-red alarm, and it proves `describeQuery` is a usable source:
// every statement in the corpus describes, DML with RETURNING and `$n`
// parameters included, and nothing executes.
//
// The MUTATION half is what tests the gate itself. A gate that agrees with
// everything is indistinguishable from no gate, so each shape of divergence
// is INJECTED into a real contract and the gate has to catch it — including
// the four ARITY-PRESERVING shapes from the adversarial sweeps, which are the
// reason a length check would not have done.
//
// The gate is a boundary assertion, not a precision feature. It is expected
// to be silent forever, and the day it is not is the day it earns four
// sweeps' worth of defects.
// ---------------------------------------------------------------------------

const FIXTURES_DIR = join(__dirname, "fixtures");
const SCHEMA = readFileSync(join(FIXTURES_DIR, "schema.sql"), "utf8");

let pg: PGlite;
let catalog: NullabilityCatalog;
let describe_: DescribeStatement;

beforeAll(async () => {
  pg = await PGlite.create();
  await pg.exec(SCHEMA);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg), { searchPath: ["public"] });
  // The reference adapter, exactly as `DescribeStatement` documents it.
  describe_ = async sql => {
    const d = await pg.describeQuery(sql);
    return { columns: d.resultFields.map(f => f.name), params: d.queryParams.length };
  };
}, 120_000);

afterAll(async () => {
  if (pg && !pg.closed) await pg.close();
});

async function contractOf(sql: string): Promise<QueryContract> {
  return inferQueryContract((await parseSql(sql)).stmts![0]!.stmt!, catalog);
}

describe("the gate, live over the corpus", () => {
  it("agrees on every fixture, and every fixture describes", async () => {
    const files = readdirSync(FIXTURES_DIR)
      .filter(f => f.endsWith(".sql") && f !== "schema.sql")
      .sort();
    const disagreed: string[] = [];
    let gated = 0;
    for (const file of files) {
      const sql = readFileSync(join(FIXTURES_DIR, file), "utf8");
      // The search-path axis belongs to the suites that implement it; a
      // catalog built on a different path would be gating a different
      // statement than the one it analysed.
      if (parseFixtureDirectives(sql).searchPath) continue;
      let contract: QueryContract;
      try {
        contract = await contractOf(sql);
      } catch {
        continue; // a refused statement has no contract to gate
      }
      const result = await gateContract(sql, contract, describe_);
      gated++;
      if (result.gate.kind !== "agreed") disagreed.push(`${file}: ${JSON.stringify(result.gate)}`);
    }
    expect(gated).toBeGreaterThan(500);
    expect(
      disagreed,
      `The gate disagreed with PostgreSQL. Either the engine's shape is wrong ` +
        `for these statements — which is the whole point of the gate — or the ` +
        `gate is:\n  ${disagreed.join("\n  ")}`,
    ).toEqual([]);
  }, 300_000);

  it("describing executes nothing", async () => {
    // A gate that ran the statement would fire triggers, advance sequences and
    // write rows for every DML query a consumer analysed. This is the reason
    // the callback is `describeQuery` and not `query`.
    await pg.exec(`CREATE TEMP SEQUENCE gate_probe_seq; CREATE TEMP TABLE gate_probe (v int);`);
    await describe_("INSERT INTO gate_probe VALUES (nextval('gate_probe_seq')) RETURNING v");
    await describe_("SELECT nextval('gate_probe_seq') AS n");
    const seq = await pg.query<{ v: string }>("SELECT last_value::text AS v FROM gate_probe_seq");
    const rows = await pg.query<{ c: number }>("SELECT count(*)::int AS c FROM gate_probe");
    expect(seq.rows[0]!.v).toBe("1");
    expect(rows.rows[0]!.c).toBe(0);
  });
});

describe("the gate, against injected divergence", () => {
  const SQL = "SELECT p.id AS pid, p.sku AS sku, p.name AS name FROM products p";

  /** The real contract for SQL, with its outputs replaced. */
  async function withOutputs(outputs: OutputNullability[]): Promise<QueryContract> {
    return { ...(await contractOf(SQL)), outputs };
  }

  it("the control: untouched, it agrees and every claim survives", async () => {
    const contract = await contractOf(SQL);
    const result = await gateContract(SQL, contract, describe_);
    expect(result.gate).toEqual({ kind: "agreed" });
    expect(result.outputs).toEqual(contract.outputs);
    expect(result.outputs.some(o => o.notNull)).toBe(true);
  });

  it("a column too few", async () => {
    const contract = await withOutputs((await contractOf(SQL)).outputs.slice(0, 2));
    const result = await gateContract(SQL, contract, describe_);
    expect(result.gate.kind).toBe("column-arity");
  });

  it("a column too many", async () => {
    const outputs = (await contractOf(SQL)).outputs;
    const contract = await withOutputs([...outputs, { name: "ghost", notNull: true }]);
    const result = await gateContract(SQL, contract, describe_);
    expect(result.gate.kind).toBe("column-arity");
  });

  it("a PERMUTATION — the shape a length check cannot see", async () => {
    // This is the sweeps' `MERGE RETURNING *` defect in miniature: right
    // count, wrong correspondence, and every flag past position 0 lands on
    // the wrong column.
    const outputs = (await contractOf(SQL)).outputs;
    const contract = await withOutputs([outputs[1]!, outputs[0]!, outputs[2]!]);
    const result = await gateContract(SQL, contract, describe_);
    expect(result.gate.kind).toBe("column-order");
    if (result.gate.kind === "column-order") {
      expect(result.gate.at).toBe(0);
      expect(result.gate.engine).toEqual(["sku", "pid", "name"]);
      expect(result.gate.database).toEqual(["pid", "sku", "name"]);
    }
  });

  it("a RENAME at one position — `(p).*` reading the alias", async () => {
    // Arity-preserving too, and it reports the position rather than just the
    // fact: a consumer has to be able to say WHERE they diverged.
    const outputs = (await contractOf(SQL)).outputs;
    const contract = await withOutputs([
      outputs[0]!,
      { ...outputs[1]!, name: "p" },
      outputs[2]!,
    ]);
    const result = await gateContract(SQL, contract, describe_);
    expect(result.gate.kind).toBe("column-order");
    if (result.gate.kind === "column-order") expect(result.gate.at).toBe(1);
  });

  it("a parameter count that disagrees", async () => {
    const base = await contractOf("SELECT p.id AS pid FROM products p WHERE p.sku = $1");
    const contract: QueryContract = { ...base, params: [] };
    const result = await gateContract(
      "SELECT p.id AS pid FROM products p WHERE p.sku = $1",
      contract,
      describe_,
    );
    expect(result.gate).toEqual({ kind: "param-arity", engine: 0, database: 1 });
  });
});

describe("what a refused gate leaves behind", () => {
  const SQL = "SELECT p.id AS pid, p.sku AS sku FROM products p";

  it("every column nullable, named by the DATABASE, with no claims left", async () => {
    // The names come from PostgreSQL because those are the names the
    // consumer's rows arrive under. Everything else goes: a presence group or
    // a rejection set is a claim about POSITIONS, and positions are what the
    // gate just refused to vouch for.
    const base = await contractOf(SQL);
    const contract: QueryContract = {
      ...base,
      outputs: [{ name: "wrong", notNull: true }],
      paramRejectionSets: [[1, 2]],
      alwaysRaises: true,
    };
    const result = await gateContract(SQL, contract, describe_);
    expect(result.gate.kind).toBe("column-arity");
    expect(result.outputs).toEqual([
      { name: "pid", notNull: false },
      { name: "sku", notNull: false },
    ]);
    expect(result.paramRejectionSets).toEqual([]);
    expect(result.outputPresenceGroups).toEqual([]);
    expect(result.alwaysRaises).toBe(false);
  });

  it("a statement PostgreSQL cannot describe keeps the engine's names and no claims", async () => {
    // `describe` throwing is the diagnostics contract's ERROR case: broken
    // SQL, or an adapter that failed. There is no database answer to name the
    // columns with, so the engine's own names are all that is left — and not
    // one of its claims may be trusted, because nothing checked them.
    const base = await contractOf(SQL);
    const failing: DescribeStatement = () => Promise.reject(new Error("relation does not exist"));
    const result = await gateContract(SQL, base, failing);
    expect(result.gate.kind).toBe("undescribed");
    if (result.gate.kind === "undescribed") {
      expect(result.gate.detail).toContain("relation does not exist");
    }
    expect(result.outputs.map(o => o.name)).toEqual(["pid", "sku"]);
    expect(result.outputs.every(o => !o.notNull)).toBe(true);
  });
});

describe("the empty-name degradation", () => {
  it("an unaliased expression compares by arity only", async () => {
    // The walk does not implement `FigureColname` (a standing decision), so
    // `SELECT 1 + 1` has no name here and `?column?` there. Measured, and the
    // reason the gate cannot simply compare names at every position: without
    // this rule it would fire on every unaliased expression in every query.
    const sql = "SELECT 1 + 1, p.id AS pid FROM products p";
    const contract = await contractOf(sql);
    expect(contract.outputs.map(o => o.name)).toEqual(["", "pid"]);
    const described: DescribedShape = await describe_(sql);
    expect(described.columns).toEqual(["?column?", "pid"]);
    expect((await gateContract(sql, contract, describe_)).gate).toEqual({ kind: "agreed" });
  });

  it("...and the position beside it is still compared", async () => {
    // The degradation is per-position, not per-statement: one unnamed column
    // must not switch the whole gate off.
    const sql = "SELECT 1 + 1, p.id AS pid FROM products p";
    const base = await contractOf(sql);
    const contract: QueryContract = {
      ...base,
      outputs: [base.outputs[0]!, { name: "elsewhere", notNull: false }],
    };
    const result = await gateContract(sql, contract, describe_);
    expect(result.gate.kind).toBe("column-order");
    if (result.gate.kind === "column-order") expect(result.gate.at).toBe(1);
  });
});

describe("compareShapes, directly", () => {
  it("duplicate names are compared positionally, not matched", () => {
    // `SELECT a, a FROM t` is legal and the corpus contains it, so the gate
    // can never key one list against the other by name.
    expect(
      compareShapes({ columns: ["a", "a"], params: 0 }, { columns: ["a", "a"], params: 0 }),
    ).toEqual({ kind: "agreed" });
    expect(
      compareShapes({ columns: ["a", "b"], params: 0 }, { columns: ["b", "a"], params: 0 }).kind,
    ).toBe("column-order");
  });

  it("the parameter check runs before the column checks", () => {
    // A parameter mismatch means the statement the engine analysed is not the
    // one the database described; reporting a column difference on top of
    // that would name a symptom instead of the cause.
    expect(
      compareShapes({ columns: ["a"], params: 0 }, { columns: ["b", "c"], params: 1 }),
    ).toEqual({ kind: "param-arity", engine: 0, database: 1 });
  });
});
