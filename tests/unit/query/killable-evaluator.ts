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
  /**
   * Hold the evaluator's session on a `search_path`, the way a harness holds
   * one on the instance it executes against.
   *
   * Probes are not all path-blind: comparison-groundings renders
   * `SELECT NULL::<type>` to resolve a type name, and which type that is can
   * move with the path — `search-path-type-shadow.sql` exists for exactly
   * that. A probe answered under one path and applied to a claim made under
   * another is not an answer.
   *
   * REMEMBERED, so a rebuild after a kill restores it. A fresh instance
   * silently back on `public` would be the same defect one recovery later.
   */
  setSearchPath(path: readonly string[] | null): Promise<void>;
  /**
   * Open a throwaway transaction holding `schema`, for a consumer whose schema
   * changes per case — `sqlc-corpus.test.ts` runs 253 of them, each created
   * and rolled back.
   *
   * Rebuilding an instance per case would cost ~500ms against a 27s suite, so
   * the scope reuses one instance instead and costs a round trip. Like the
   * search path it is REMEMBERED: a kill mid-case rebuilds and re-opens the
   * scope, because a case that silently continued against an empty database
   * would answer a different question than the one asked.
   */
  beginScope(schema: string): Promise<void>;
  endScope(): Promise<void>;
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
  /**
   * Contrib extensions the evaluator must hold, by name — it needs whatever
   * the consumer's own instance has, or a schema saying `CREATE EXTENSION
   * pgcrypto` fails here and the failure is misread as the schema's.
   */
  extensions?: readonly string[];
}): Promise<KillableEvaluator> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_EVAL_TIMEOUT_MS;
  const workerUrl = new URL("./killable-evaluator.worker.mjs", import.meta.url);

  let worker: Worker | null = null;
  let booting: Promise<void> | null = null;
  let nextId = 0;
  let closed = false;
  const pending = new Map<number, Pending>();
  const killedSql: string[] = [];

  /** The path this evaluator's session is held on, re-applied on every
   *  rebuild — see `setSearchPath`. */
  let searchPath: readonly string[] | null = null;
  /** The open scope's schema, re-applied on every rebuild — see `beginScope`. */
  let scopeSchema: string | null = null;

  const spawn = (): Promise<void> => {
    const w = new Worker(workerUrl, {
      workerData: { schema: opts.schema, extensions: opts.extensions ?? [] },
    });
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
    })
      .then(() => (searchPath ? send(w, `SET search_path = ${searchPath.join(", ")}`) : undefined))
      .then(() => (scopeSchema ? send(w, `BEGIN; ${scopeSchema}`, "begin") : undefined))
      .then(() => undefined);
  };

  /**
   * Session bookkeeping, sent outside the probe path: a `SET`, a `BEGIN`, a
   * `ROLLBACK`. None can wedge, and each has to complete while the instance is
   * still booting rather than queue behind a probe that would then run under
   * the wrong path or against no schema.
   */
  const send = (w: Worker, sql: string, scope?: "begin" | "end"): Promise<void> =>
    new Promise<void>((res, rej) => {
      const id = nextId++;
      const onMessage = (m: { id?: number; ok?: boolean; error?: string }): void => {
        if (m.id !== id) return;
        w.off("message", onMessage);
        m.ok ? res() : rej(new Error(m.error ?? `evaluator rejected: ${sql.slice(0, 60)}`));
      };
      w.on("message", onMessage);
      w.postMessage({ id, sql, scope, session: true });
    });

  const ready = async (): Promise<Worker> => {
    // `!booting` matters as much as `!worker`: a recycle nulls the worker and
    // leaves a boot running, and starting a second one here would race it —
    // two spawns, `worker` left pointing at one while this awaited the other,
    // so a probe could run on an instance whose `SET search_path` had not
    // landed yet. Intermittent by construction, which is how it presented.
    if (!worker && !booting) booting = spawn();
    if (booting) {
      await booting;
      booting = null;
    }
    return worker!;
  };

  /** Kill and rebuild. Every in-flight probe is lost with the instance — the
   *  database is gone, not just the one query. */
  const recycle = (): void => {
    const dying = worker;
    worker = null;
    // `booting` is assigned SYNCHRONOUSLY, before the terminate is awaited, so
    // that a probe arriving in the gap waits for this rebuild rather than
    // starting a competing one.
    booting = (async () => {
      if (dying) await dying.terminate();
      await spawn();
    })();
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
        recycle();
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer, sql });
      w.postMessage({ id, sql });
    });
  };

  return {
    evaluate,
    async setSearchPath(path) {
      searchPath = path && path.length > 0 ? [...path] : null;
      await send(await ready(), `SET search_path = ${(searchPath ?? ["public"]).join(", ")}`);
    },
    async beginScope(schema) {
      scopeSchema = schema;
      await send(await ready(), `BEGIN; ${schema}`, "begin");
    },
    async endScope() {
      scopeSchema = null;
      // A rebuild during the scope already discarded the transaction, so a
      // failure here is the instance telling us there is nothing to roll back.
      await send(await ready(), "ROLLBACK", "end").catch(() => undefined);
    },
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
