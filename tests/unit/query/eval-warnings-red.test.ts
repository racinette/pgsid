import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferQueryContract } from "../../../src/query/nullability-walk.js";
import type { EvalWarning } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The RED SUITE for the evaluation WARNING channel — FLIPPED 2026-08-23,
// when the recording wrapper landed (see AGENTS.md, rule 1).
//
// A probe that cannot be answered costs the statement PRECISION, never
// soundness: the round records no answer and the walk falls back to whatever
// it claimed before evaluation existed. That degradation is already correct
// and already measured — a rejecting `evaluate` returns `[false]` where a
// working one returns `[true]`, and nothing throws.
//
// What is missing is that it happens SILENTLY. A consumer whose evaluator was
// killed on a timeout gets a less precise contract and no way to know it, so
// "my types got worse" has no diagnosis. The channel is a sink on
// WalkOptions, the shape `joinAudit` and `typeSetAudit` already use, so no
// consumer contract changes and consumers opt in by passing an array.
//
// A timeout is the case this exists for and is modelled here the way a
// consumer's killable evaluator surfaces it: `evaluate` rejects. The engine
// cannot enforce a time bound itself — `src/query` imports no database type,
// and PGlite ignores `statement_timeout` (measured: set to 400ms, a 1473ms
// query ran to completion) — so the bound lives in the consumer's callback
// and the engine's job is only to report that it fired.
//
// The plain `it` blocks are the BOUNDARY GUARDS: a working evaluator must
// stay silent, and a killed one must still degrade rather than throw.
// ---------------------------------------------------------------------------

let pg: PGlite;
let catalog: NullabilityCatalog;

const SCHEMA = `
  CREATE TABLE orders (id int NOT NULL, status text);
  CREATE DOMAIN nn_text AS text NOT NULL;
  CREATE FUNCTION dom_lenient(x text) RETURNS nn_text
    LANGUAGE sql AS $$ SELECT 'v'::nn_text $$;
`;

/** A closed guard the statement map answers, so the claim depends on a probe. */
const CLOSED_GUARD =
  "SELECT CASE WHEN 2 + 2 = 4 THEN o.id ELSE NULL END AS c FROM orders o";

/** A closed set-returning call, so the cardinality round has a question. */
const CLOSED_SRF =
  "SELECT * FROM ROWS FROM (dom_lenient('a'), generate_series(1, 1))";

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(SCHEMA);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
}, 60_000);

afterAll(async () => {
  if (!pg.closed) await pg.close();
});

const live = async (s: string) => (await pg.query<Record<string, unknown>>(s)).rows[0];
const killed = async (): Promise<never> => {
  throw new Error("evaluator terminated after 500ms");
};

async function contractOf(sql: string, evaluate: typeof live, sink?: EvalWarning[]) {
  const parsed = await parseSql(sql);
  return inferQueryContract(parsed.stmts![0]!.stmt!, catalog, {
    evaluate,
    evalWarnings: sink,
  });
}

describe("evaluation warning channel", () => {
  it("a killed evaluator is reported, not just absorbed", async () => {
    const sink: EvalWarning[] = [];
    await contractOf(CLOSED_GUARD, killed as never, sink);
    expect(sink.length).toBeGreaterThan(0);
  });

  it("the warning names the round that went unanswered", async () => {
    const sink: EvalWarning[] = [];
    await contractOf(CLOSED_SRF, killed as never, sink);
    expect(sink.map(w => w.round)).toContain("srf-cardinality");
  });

  it("the warning carries the evaluator's own reason", async () => {
    const sink: EvalWarning[] = [];
    await contractOf(CLOSED_GUARD, killed as never, sink);
    expect(sink[0]?.detail).toContain("terminated after 500ms");
  });

  // --- Boundary guards: these must not move. --------------------------------

  it("a working evaluator emits no warnings", async () => {
    const sink: EvalWarning[] = [];
    const c = await contractOf(CLOSED_GUARD, live, sink);
    expect(c.outputs[0]!.notNull).toBe(true);
    expect(sink).toEqual([]);
  });

  it("a killed evaluator degrades rather than throwing", async () => {
    // The whole reason this is a WARNING and not an error: the contract is
    // still returned, still sound, only less precise.
    const c = await contractOf(CLOSED_GUARD, killed as never);
    expect(c.outputs[0]!.notNull).toBe(false);
  });

  it("no sink means no bookkeeping, and the same answer", async () => {
    const c = await contractOf(CLOSED_SRF, live);
    expect(c.outputs[0]!.notNull).toBe(true);
  });
});
