import { Worker } from "node:worker_threads";
import type { Evaluate, EvaluateRow } from "../../../src/query/subtree-evaluator.js";

// ---------------------------------------------------------------------------
// A time-bounded `evaluate` for the test harnesses.
//
// The engine cannot bound its own probes in time. `src/query` imports no
// database type by charter, and there is no in-process way to stop a runaway:
// `statement_timeout` does not fire under PGlite (measured 2026-08-23 — `SHOW`
// reports 400ms and a 1473ms query ran to completion), and a same-thread timer
// never runs, because the event loop is blocked inside WASM for the duration.
// So the bound belongs to whoever supplies the callback, and it has to be a
// KILL FROM OUTSIDE the thread running the query.
//
// The harness is the first consumer that needs one, and it needs it because a
// probe wedged the suite: an early draft of the cardinality round counted a
// FROM-position `generate_series(1, 10000000000)`, which materialises before
// any LIMIT applies (Trap 1, docs/subtree-evaluation.md). The suite did not
// fail — it hung, and had to be killed from the shell. A hang that reports in
// half a second is a test result; a hang that reports in ten minutes is a
// wedged CI job.
//
// `Worker.terminate()` ends a wedged PGlite in ~8ms (measured, against a
// control proving it wedged rather than slow). Rebuilding costs ~500ms, which
// is what sets the floor on the timeout: below the rebuild cost, a kill spends
// more on recovery than it saves on waiting.
//
// The timeout is also the MEMORY bound, and that is why there is no separate
// one. A single datum cannot exceed PostgreSQL's 1GB varlena limit —
// `repeat('x', 2e9)` raises in 2ms without allocating — and accumulation is
// bounded by the clock, allocation running at roughly 160 MB/s (measured:
// 500MB in 3157ms). At 500ms that is ~80 MB.
// ---------------------------------------------------------------------------

/** Below the ~500ms rebuild a kill costs more than it saves; see above. */
export const DEFAULT_EVAL_TIMEOUT_MS = 500;

export interface KillableEvaluator {
  /** Hand this to `WalkOptions.evaluate`. */
  evaluate: Evaluate;
  /** How many probes have been killed — for assertions and for reporting. */
  readonly kills: number;
  /** Every killed probe's SQL, so a wedge names itself instead of hanging. */
  readonly killedSql: readonly string[];
  close(): Promise<void>;
}

interface Pending {
  resolve(row: EvaluateRow | undefined): void;
  reject(e: Error): void;
  timer: NodeJS.Timeout;
  sql: string;
}

/**
 * A PGlite in a worker thread, with the clock held out here where it can still
 * tick. `schema` should be the IMMUTABLE slice — types and IMMUTABLE functions
 * — since closed subtrees read no table: measured over the fixture corpus, 397
 * of 423 evaluator queries run against a bare PGlite with no schema at all,
 * and the remainder wanted one domain and one user immutable function. The
 * harness passes its whole `schema.sql` regardless, because it already has the
 * text and the extra objects cost ~60ms once.
 */
export async function createKillableEvaluator(opts: {
  schema?: string;
  timeoutMs?: number;
}): Promise<KillableEvaluator> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_EVAL_TIMEOUT_MS;
  const workerUrl = new URL("./killable-evaluator.worker.mjs", import.meta.url);

  let worker: Worker | null = null;
  let booting: Promise<void> | null = null;
  let nextId = 0;
  let closed = false;
  const pending = new Map<number, Pending>();
  const killedSql: string[] = [];

  const spawn = (): Promise<void> => {
    const w = new Worker(workerUrl, { workerData: { schema: opts.schema } });
    worker = w;
    w.on("message", (m: { ready?: boolean; id?: number; ok?: boolean; row?: EvaluateRow; error?: string }) => {
      if (m.ready || m.id === undefined) return;
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      clearTimeout(p.timer);
      if (m.ok) p.resolve(m.row);
      else p.reject(new Error(m.error ?? "evaluator error"));
    });
    // A worker that dies for any reason — terminate, or a crash we did not
    // ask for — must not leave a probe waiting forever.
    w.on("exit", () => {
      for (const [id, p] of pending) {
        pending.delete(id);
        clearTimeout(p.timer);
        p.reject(new Error("evaluator exited before answering"));
      }
    });
    return new Promise<void>((res, rej) => {
      w.once("message", m => ((m as { ready?: boolean }).ready ? res() : undefined));
      w.once("error", rej);
    });
  };

  const ready = async (): Promise<Worker> => {
    if (!worker) booting = spawn();
    if (booting) {
      await booting;
      booting = null;
    }
    return worker!;
  };

  /** Kill and rebuild. Every in-flight probe is lost with the instance — the
   *  database is gone, not just the one query. */
  const recycle = async (): Promise<void> => {
    const dying = worker;
    worker = null;
    if (dying) await dying.terminate();
    booting = spawn();
  };

  await ready();

  const evaluate: Evaluate = async sql => {
    if (closed) throw new Error("evaluator closed");
    const w = await ready();
    const id = nextId++;
    return new Promise<EvaluateRow | undefined>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        killedSql.push(sql);
        // Reject FIRST, then recycle: the caller's round degrades on the
        // rejection, and the ~500ms rebuild happens behind it rather than in
        // front of the next probe's answer.
        reject(
          new Error(
            `evaluator terminated after ${timeoutMs}ms: ${sql.replace(/\s+/g, " ").slice(0, 120)}`,
          ),
        );
        void recycle();
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer, sql });
      w.postMessage({ id, sql });
    });
  };

  return {
    evaluate,
    get kills() {
      return killedSql.length;
    },
    get killedSql() {
      return killedSql;
    },
    async close() {
      closed = true;
      for (const [, p] of pending) clearTimeout(p.timer);
      pending.clear();
      if (booting) await booting.catch(() => undefined);
      await worker?.terminate();
      worker = null;
    },
  };
}
