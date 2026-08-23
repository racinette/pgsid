import { describe, it, expect, afterAll } from "vitest";
import {
  createKillableEvaluator,
  DEFAULT_EVAL_TIMEOUT_MS,
  type KillableEvaluator,
} from "./killable-evaluator.js";

// ---------------------------------------------------------------------------
// The killable evaluator's own pins.
//
// The case that matters is the one that wedged the suite: a probe PGlite will
// never finish. `LIMIT` does not bound a FROM-position function scan (Trap 1,
// docs/subtree-evaluation.md), so the query below materialises ten billion
// rows and no timer, handler or `statement_timeout` inside that thread can end
// it. Only a kill from out here can, and these tests are the proof that it
// does — each carries a short vitest timeout, because a REGRESSION HERE DOES
// NOT FAIL, IT HANGS, and a hang that reports in seconds is a test result.
// ---------------------------------------------------------------------------

/** Ten billion rows behind a LIMIT that cannot bind. Never finishes. */
const WEDGE = `SELECT count(*) FROM (SELECT 1 FROM generate_series(1, 10000000000) LIMIT 1001) z`;

const evaluators: KillableEvaluator[] = [];
const make = async (timeoutMs?: number): Promise<KillableEvaluator> => {
  const e = await createKillableEvaluator({ timeoutMs });
  evaluators.push(e);
  return e;
};

afterAll(async () => {
  for (const e of evaluators) await e.close();
});

describe("killable evaluator", () => {
  it(
    "kills a probe PGlite would never finish",
    async () => {
      const ev = await make(500);
      const t0 = Date.now();
      await expect(ev.evaluate(WEDGE)).rejects.toThrow(/terminated after 500ms/);
      const elapsed = Date.now() - t0;
      expect(elapsed).toBeGreaterThanOrEqual(450);
      // The kill itself is ~8ms; anything near the vitest timeout means the
      // terminate did not take.
      expect(elapsed).toBeLessThan(3_000);
      expect(ev.kills).toBe(1);
      expect(ev.killedSql[0]).toContain("10000000000");
    },
    15_000,
  );

  it(
    "survives the kill and answers the next probe",
    async () => {
      const ev = await make(500);
      await expect(ev.evaluate(WEDGE)).rejects.toThrow();
      // The instance was destroyed, not just the query — this answer comes
      // from a rebuilt one.
      const row = await ev.evaluate(`SELECT 2 + 2 AS n`);
      expect(row?.["n"]).toBe(4);
      expect(ev.kills).toBe(1);
    },
    20_000,
  );

  it(
    "carries the schema into the rebuilt instance",
    async () => {
      const ev = await createKillableEvaluator({
        schema: `CREATE DOMAIN kv_text AS text NOT NULL;
                 CREATE FUNCTION kv_up(x text) RETURNS text
                   LANGUAGE sql IMMUTABLE AS $$ SELECT upper(x) $$;`,
        timeoutMs: 500,
      });
      evaluators.push(ev);
      expect((await ev.evaluate(`SELECT kv_up('a') AS v`))?.["v"]).toBe("A");
      await expect(ev.evaluate(WEDGE)).rejects.toThrow();
      // A rebuild that forgot the schema would fail here, and the whole point
      // of the evaluator is that the objects it needs are cheap to restore.
      expect((await ev.evaluate(`SELECT kv_up('a') AS v`))?.["v"]).toBe("A");
      expect((await ev.evaluate(`SELECT 'x'::kv_text AS v`))?.["v"]).toBe("x");
    },
    25_000,
  );

  it("passes an ordinary probe straight through", async () => {
    const ev = await make();
    expect((await ev.evaluate(`SELECT 1 + 1 AS n`))?.["n"]).toBe(2);
    expect(ev.kills).toBe(0);
  });

  it("reports a RAISING probe as an error, not a kill", async () => {
    const ev = await make();
    // A closed subtree may raise on its own — `5 / 0`, a bad jsonpath. The
    // rounds already degrade on that, and it must not be counted as a wedge
    // or cost a rebuild.
    await expect(ev.evaluate(`SELECT 1 / 0 AS n`)).rejects.toThrow(/division by zero/);
    expect(ev.kills).toBe(0);
    expect((await ev.evaluate(`SELECT 3 AS n`))?.["n"]).toBe(3);
  });

  it("defaults to the rebuild-cost floor", () => {
    // A timeout below the ~500ms rebuild spends more on recovery than it saves
    // on waiting; the default sits just above it.
    expect(DEFAULT_EVAL_TIMEOUT_MS).toBe(500);
  });
});
