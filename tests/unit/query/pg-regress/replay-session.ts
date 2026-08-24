import { fork, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { PGlite } from "@electric-sql/pglite";

// ---------------------------------------------------------------------------
// A time-bounded PGlite SESSION for the regress replay — killable-evaluator's
// architecture, generalised from "evaluate one probe" to "hold a database the
// replay accumulates state in", and moved from a worker THREAD to a child
// PROCESS. The move is load-bearing: the regress corpus can make PGlite's
// WASM `abort()`, and emscripten's abort exits the PROCESS — a worker thread
// shares the runner's process and took it down (measured on the first full
// replay attempt); a child's exit is just an event here.
//
// Everything AGENTS.md rule 8 says applies with more force: a statement that
// wedges the instance can only be ended from OUTSIDE (SIGKILL — a wedged
// child cannot even service `terminate`-style messages). A kill LOSES THE
// DATABASE; the replay counts it, reboots, and abandons the file rather than
// pretending the accumulated state survived.
//
// `asPGlite()` is the piece the snapshot needs: `snapshotCatalog(pg)` only
// ever calls `pg.query(sql)`, so a duck-typed shim that forwards queries over
// the channel lets the capture run on the MAIN process against the child's
// database, under the same watchdog as every other call.
// ---------------------------------------------------------------------------

export interface ReplayResult {
  ok: boolean;
  error?: string;
  fields?: string[];
  rows?: unknown[];
}

export interface ReplaySession {
  /** Run ONE statement; fields carry the shape oracle's half. */
  query(sql: string, timeoutMs?: number): Promise<ReplayResult>;
  /** Multi-statement bookkeeping (never user corpus text). */
  exec(sql: string, timeoutMs?: number): Promise<ReplayResult>;
  /** Kill the instance and boot a fresh one. Counted by the caller. */
  reboot(): Promise<void>;
  /** How many kills the watchdog performed, with the SQL that caused each. */
  readonly killedSql: readonly string[];
  /** A PGlite-shaped shim over query(), for snapshotCatalog. */
  asPGlite(): PGlite;
  close(): Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export async function createReplaySession(): Promise<ReplaySession> {
  const childPath = fileURLToPath(new URL("./replay-worker.mjs", import.meta.url));
  let child: ChildProcess | null = null;
  let booting: Promise<void> | null = null;
  let nextId = 0;
  let closed = false;
  const killedSql: string[] = [];
  interface Pending {
    resolve(r: ReplayResult): void;
    timer: NodeJS.Timeout;
    sql: string;
  }
  const pending = new Map<number, Pending>();

  const spawn = (): Promise<void> => {
    const c = fork(childPath, [], { stdio: ["ignore", "ignore", "ignore", "ipc"] });
    child = c;
    c.on("message", (m: { ready?: boolean; id?: number } & ReplayResult) => {
      if (m.ready || m.id === undefined) return;
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      clearTimeout(p.timer);
      p.resolve(m);
    });
    c.on("exit", () => {
      // A child that dies uninvited — a WASM abort, the crash class
      // poison-hunt records — must not leave callers waiting; they get a
      // failure result and the caller decides whether to reboot.
      for (const [id, p] of pending) {
        pending.delete(id);
        clearTimeout(p.timer);
        p.resolve({ ok: false, error: "replay worker exited before answering" });
      }
      // And the next call must respawn rather than post into the corpse.
      if (child === c) child = null;
    });
    return new Promise<void>((res, rej) => {
      c.once("message", m => ((m as { ready?: boolean }).ready ? res() : undefined));
      c.once("error", rej);
    });
  };

  const ready = async (): Promise<ChildProcess> => {
    if (!child && !booting) booting = spawn();
    if (booting) {
      await booting;
      booting = null;
    }
    return child!;
  };

  const call = async (
    sql: string,
    op: "query" | "exec",
    timeoutMs: number,
    params?: unknown[],
  ): Promise<ReplayResult> => {
    if (closed) return { ok: false, error: "session closed" };
    const c = await ready();
    const id = nextId++;
    return new Promise<ReplayResult>(resolve => {
      const timer = setTimeout(() => {
        pending.delete(id);
        killedSql.push(sql);
        resolve({
          ok: false,
          error: `replay watchdog killed the instance after ${timeoutMs}ms`,
        });
        const dying = child;
        child = null;
        booting = (async () => {
          dying?.kill("SIGKILL");
          await spawn();
        })();
      }, timeoutMs);
      pending.set(id, { resolve, timer, sql });
      try {
        c.send({ id, sql, params, op });
      } catch {
        // The channel died between ready() and send — the exit handler will
        // resolve us; nothing to do.
      }
    });
  };

  await ready();

  return {
    query: (sql, timeoutMs = DEFAULT_TIMEOUT_MS) => call(sql, "query", timeoutMs),
    exec: (sql, timeoutMs = DEFAULT_TIMEOUT_MS) => call(sql, "exec", timeoutMs),
    async reboot() {
      const dying = child;
      child = null;
      booting = (async () => {
        dying?.kill("SIGKILL");
        await spawn();
      })();
      await ready();
    },
    get killedSql() {
      return killedSql;
    },
    asPGlite(): PGlite {
      const shim = {
        query: async (sql: string, params?: unknown[]) => {
          const r = await call(sql, "query", DEFAULT_TIMEOUT_MS, params);
          if (!r.ok) throw new Error(r.error ?? "replay query failed");
          return { rows: r.rows ?? [], fields: (r.fields ?? []).map(name => ({ name })) };
        },
        exec: async (sql: string) => {
          const r = await call(sql, "exec", DEFAULT_TIMEOUT_MS);
          if (!r.ok) throw new Error(r.error ?? "replay exec failed");
          return [];
        },
      };
      return shim as unknown as PGlite;
    },
    async close() {
      closed = true;
      for (const [, p] of pending) clearTimeout(p.timer);
      pending.clear();
      if (booting) await booting.catch(() => undefined);
      child?.kill("SIGKILL");
      child = null;
    },
  };
}
