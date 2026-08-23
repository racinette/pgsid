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

// Extensions arrive by NAME, not by value: they are code, and code does not
// cross a worker boundary. A consumer whose schemas say `CREATE EXTENSION
// pgcrypto` needs the evaluator to hold the same ones its own instance does,
// or every such schema fails here and the failure is misread as the schema's.
//
// Resolved by CONVENTION rather than from a list. PGlite ships 33 contrib
// extensions under one uniform path, each exporting a binding of its own name,
// so a hardcoded subset would be an arbitrary line that some future harness
// walks into. `plpgsql_check` is the one that lives in its own package.
const extensions = {};
for (const name of workerData?.extensions ?? []) {
  const mod =
    name === "plpgsql_check"
      ? await import("@electric-sql/pglite-plpgsql-check")
      : await import(`@electric-sql/pglite/contrib/${name}`);
  if (!mod[name]) throw new Error(`killable evaluator: ${name} exports no binding of that name`);
  extensions[name] = mod[name];
}

const pg = await PGlite.create({ extensions });
if (workerData?.schema) await pg.exec(workerData.schema);
parentPort.postMessage({ ready: true });

// While a SCOPE is open the instance is inside a transaction holding schema
// this consumer created for one case. A probe may RAISE on its own — a closed
// subtree is allowed to — and an unguarded raise aborts that transaction,
// taking every later probe with it. So each probe inside a scope runs behind a
// savepoint that is always released. Done here rather than in the parent so a
// probe stays ONE message.
let inScope = false;

parentPort.on("message", async ({ id, sql, scope, session }) => {
  if (scope === "begin") inScope = true;
  try {
    // Session bookkeeping goes through `exec`, not `query`: it may be several
    // statements (`BEGIN; <schema>`) and `query` is one prepared statement —
    // "cannot insert multiple commands into a prepared statement".
    if (session) {
      await pg.exec(sql);
      parentPort.postMessage({ id, ok: true });
      return;
    }
    if (inScope) {
      await pg.exec("SAVEPOINT probe;");
      try {
        const result = await pg.query(sql);
        parentPort.postMessage({ id, ok: true, row: result.rows[0] });
      } finally {
        await pg.exec("ROLLBACK TO SAVEPOINT probe;");
      }
      return;
    }
    const result = await pg.query(sql);
    parentPort.postMessage({ id, ok: true, row: result.rows[0] });
  } catch (e) {
    parentPort.postMessage({ id, ok: false, error: e?.message ?? String(e) });
  } finally {
    if (scope === "end") inScope = false;
  }
});
