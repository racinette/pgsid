import { PGlite } from "@electric-sql/pglite";

// The child-process half of the regress replay session (replay-session.ts).
//
// A CHILD PROCESS, not a worker thread, and the distinction is the whole
// point: the regress corpus can make PGlite's WASM call `abort()`, and
// emscripten's abort takes the PROCESS down — inside a worker thread that is
// the test runner's own process (measured: the first full replay attempt
// died with the tinypool channel closed). A child's death is an event the
// parent observes; a sibling thread's abort is shared fate.
//
// The kill story is the same as killable-evaluator's otherwise: a PGlite
// query is a synchronous WASM call this process cannot interrupt, so the
// parent owns the clock and SIGKILLs on timeout.
//
// Two operations:
//   { id, sql, op: "query" }  — ONE statement via pg.query, answering the
//     FIELD NAMES (the shape oracle's half) and the rows (the catalog
//     snapshot runs through this channel via the parent's shim).
//   { id, sql, op: "exec" }   — multi-statement bookkeeping via pg.exec.

const pg = await PGlite.create();
process.send({ ready: true });

process.on("message", async ({ id, sql, params, op }) => {
  try {
    if (op === "exec") {
      await pg.exec(sql);
      process.send({ id, ok: true });
      return;
    }
    const result = await pg.query(sql, params ?? []);
    process.send({
      id,
      ok: true,
      fields: (result.fields ?? []).map(f => f.name),
      rows: result.rows,
    });
  } catch (e) {
    process.send({ id, ok: false, error: e?.message ?? String(e) });
  }
});
