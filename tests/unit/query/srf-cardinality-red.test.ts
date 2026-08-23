import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { parseSql } from "../../../src/ast.js";
import { snapshotCatalog } from "../../../src/catalog/snapshot.js";
import { buildNullabilityCatalog } from "../../../src/query/catalog-adapter.js";
import { inferQueryContract, type QueryContract } from "../../../src/query/nullability-walk.js";
import type { NullabilityCatalog } from "../../../src/query/types.js";
import { SUBLINK_SRF_ROW_CAP } from "../../../src/query/subtree-evaluator.js";

// ---------------------------------------------------------------------------
// The RED SUITE for set-returning CARDINALITY — FLIPPED 2026-08-23, when
// `srf-cardinality.ts` landed (see AGENTS.md, rule 1).
//
// The lockstep padding rule expands `ROWS FROM` arms to the LONGEST one's row
// count and NULL-pads the rest, so an arm survives on its MINIMUM and pads the
// others on their MAXIMUM. `armRowBounds` could count two shapes on its own —
// a call returning one value, and `generate_series` over constant integer
// bounds — and everything else was UNBOUNDED, which both fails to survive and
// pads everyone else.
//
// A CLOSED set-returning call has a third answer available, and the engine did
// not ask for it: run it. `jsonb_path_query('[1]'::jsonb, '$[*]')` emits
// exactly one row, and knowing that lets the NOT NULL domain beside it keep
// its flag. Counting `'$[*]'` over a document is not arithmetic on constants
// the way a series is — it is a jsonpath evaluation, which is PostgreSQL's
// job and nobody else's.
//
// Adjudicated against PostgreSQL before this file was written (2026-08-23):
//
//   ROWS FROM (dom_lenient('a'), jsonb_path_query('[1]'::jsonb,   '$[*]'))
//     -> 1 row,  dom_lenient = 'v'                       (the target)
//   ROWS FROM (dom_lenient('a'), jsonb_path_query('[1,2,3]'::jsonb, '$[*]'))
//     -> 3 rows, dom_lenient = 'v', NULL, NULL           (the guard)
//
// The plain `it` blocks are the BOUNDARY GUARDS: behaviour that must stay
// exactly as it is after the round lands. The volatility guard is the one
// where a claim would be UNSOUND rather than merely eager — a STABLE
// function's analysis-time count is not a promise about its count at
// execution time, and the padding turns that count into a notNull claim.
// ---------------------------------------------------------------------------

let pg: PGlite;
let catalog: NullabilityCatalog;

const SCHEMA = `
  CREATE DOMAIN nn_text AS text NOT NULL;
  -- Returns a NOT NULL domain and contributes exactly one row, so it is the
  -- arm with a flag to lose to the padding.
  CREATE FUNCTION dom_lenient(x text) RETURNS nn_text
    LANGUAGE sql AS $$ SELECT 'v'::nn_text $$;
  -- A document the statement reads rather than spells: the open-argument
  -- guard needs a jsonb that is a COLUMN.
  CREATE TABLE doc (data jsonb NOT NULL);
`;

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(SCHEMA);
  catalog = await buildNullabilityCatalog(await snapshotCatalog(pg));
}, 60_000);

afterAll(async () => {
  if (!pg.closed) await pg.close();
});

async function contract(sql: string): Promise<QueryContract> {
  const parsed = await parseSql(sql);
  return inferQueryContract(parsed.stmts![0]!.stmt!, catalog, {
    evaluate: async s => (await pg.query<Record<string, unknown>>(s)).rows[0],
  });
}

describe("closed set-returning cardinality", () => {
  it("a one-row jsonpath query lets the domain arm keep its flag", async () => {
    const c = await contract(
      "SELECT * FROM ROWS FROM (dom_lenient('a'), jsonb_path_query('[1]'::jsonb, '$[*]'))",
    );
    // One row from each arm, so nothing is padded and nn_text survives.
    expect(c.outputs[0]!.notNull).toBe(true);
  });

  it("the count is read per document, not per name", async () => {
    const c = await contract(
      "SELECT * FROM ROWS FROM (dom_lenient('a'), jsonb_path_query('[]'::jsonb, '$[*]'))",
    );
    // An EMPTY match is still a known count: zero rows from that arm, so the
    // one-row arm is the longest and keeps its flag.
    expect(c.outputs[0]!.notNull).toBe(true);
  });

  // --- Boundary guards: these must not move. --------------------------------

  it("a longer jsonpath query still pads the domain arm", async () => {
    const c = await contract(
      "SELECT * FROM ROWS FROM (dom_lenient('a'), jsonb_path_query('[1,2,3]'::jsonb, '$[*]'))",
    );
    // Three rows against one: the domain arm is padded on rows 2 and 3, and
    // PostgreSQL returns NULL there.
    expect(c.outputs[0]!.notNull).toBe(false);
  });

  it("a STABLE set-returning call is never counted", async () => {
    const c = await contract(
      "SELECT * FROM ROWS FROM (dom_lenient('a'), jsonb_path_query_tz('[1]'::jsonb, '$[*]'))",
    );
    // `jsonb_path_query_tz` reads the session TimeZone through jsonpath
    // datetime comparisons, so its count at analysis time binds nothing at
    // execution time. Claiming notNull here would be UNSOUND, not eager.
    expect(c.outputs[0]!.notNull).toBe(false);
  });

  // The WORK bound. Closure says a call has no free variables; it says
  // nothing about how expensive it is, and these two guards are the whole
  // defence. A regression here does not fail — it HANGS — so the per-test
  // timeout is deliberately short: a hang that reports in seconds is a test
  // result, and a hang that reports in ten minutes is a wedged CI job.
  it(
    "a series past the cap yields no bound, and yields it immediately",
    async () => {
      const started = Date.now();
      const c = await contract(
        "SELECT * FROM ROWS FROM (dom_lenient('a'), generate_series(1, 10000000000))",
      );
      // Over the cap is NOT an answer: the arm stays unbounded and the domain
      // arm is padded, exactly as before this round existed.
      expect(c.outputs[0]!.notNull).toBe(false);
      // The probe LIMITs at cap+1 and the call sits in the TARGET LIST, where
      // a LIMIT stops a ProjectSet lazily. Put the same call in the FROM
      // clause and it becomes a FunctionScan, which materialises ten billion
      // rows before any LIMIT above it applies — measured, and the reason
      // this assertion exists at all.
      expect(Date.now() - started).toBeLessThan(5_000);
    },
    10_000,
  );

  it("a count at or below the cap is exact", async () => {
    const c = await contract(
      `SELECT * FROM ROWS FROM (dom_lenient('a'), generate_series(1, ${SUBLINK_SRF_ROW_CAP}))`,
    );
    // Exactly at the cap: still an answer, and 1000 rows against one pads the
    // domain arm. One more would be no answer at all — same claim here, from
    // the other side of the boundary.
    expect(c.outputs[0]!.notNull).toBe(false);
  });

  it("an OPEN argument is never counted", async () => {
    const c = await contract(
      "SELECT x.dom_lenient FROM doc d, " +
        "ROWS FROM (dom_lenient('a'), jsonb_path_query(d.data, '$[*]')) x",
    );
    // The document is a column reference, so there is nothing to run ahead of
    // the statement and the arm stays unbounded.
    expect(c.outputs[0]!.notNull).toBe(false);
  });
});
