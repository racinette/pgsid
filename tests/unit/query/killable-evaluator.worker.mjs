import { parentPort, workerData } from "node:worker_threads";
import { PGlite } from "@electric-sql/pglite";

// The worker half of the killable evaluator (see killable-evaluator.ts).
//
// Plain .mjs on purpose: `new Worker(url)` needs a file Node can load on its
// own, and a .ts file would need a loader inside the worker thread. Nothing
// here is worth the extra machinery — the protocol is two message shapes.
//
// This thread exists to be KILLED. A PGlite query is a synchronous WASM call,
// so a runaway one blocks this thread's event loop completely and no timer,
// handler or `statement_timeout` here can end it. Only `Worker.terminate()`
// from the parent can, which is why the parent owns the clock.

const pg = await PGlite.create();
if (workerData?.schema) await pg.exec(workerData.schema);
parentPort.postMessage({ ready: true });

parentPort.on("message", async ({ id, sql }) => {
  try {
    const result = await pg.query(sql);
    parentPort.postMessage({ id, ok: true, row: result.rows[0] });
  } catch (e) {
    parentPort.postMessage({ id, ok: false, error: e?.message ?? String(e) });
  }
});
