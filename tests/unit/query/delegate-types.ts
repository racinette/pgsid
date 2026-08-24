import type { Evaluate } from "../../../src/query/subtree-evaluator.js";
import type { ResolveColumnTypes } from "../../../src/query/types.js";

// ---------------------------------------------------------------------------
// The reference `resolveColumnTypes` — PREPARE, read `result_types`,
// DEALLOCATE (docs/type-resolution-delegation.md).
//
// The engine's other database callbacks are all `Evaluate`, so this is built
// on one rather than on a driver: the harness that already owns a
// time-bounded evaluator gets a time-bounded delegation round for free, and
// the module keeps `src/query`'s no-database-type discipline.
//
// EVERY failure answers `[]`, which the walk reads as "no delegation" and
// falls back to the symbolic union. That is the whole error contract, and it
// has to be, because the failures are ordinary: a probe PostgreSQL will not
// plan, a statement kind PREPARE refuses, an evaluator killed mid-sequence.
// A delegation round that threw would turn a conservative answer into a
// suite failure.
// ---------------------------------------------------------------------------

let counter = 0;

export function delegateTypesVia(evaluate: Evaluate): ResolveColumnTypes {
  return async sql => {
    // Unique per call: a PREPARE whose name is still held by an earlier probe
    // raises, and the raise would read as "PostgreSQL rejected the probe".
    const name = `pgsid_delegate_${counter++}`;
    try {
      await evaluate(`PREPARE ${name} AS ${sql}`);
    } catch {
      return [];
    }
    try {
      const row = await evaluate(
        `SELECT result_types::text[] AS rt FROM pg_prepared_statements WHERE name = '${name}'`,
      );
      const types = row?.["rt"];
      return Array.isArray(types) ? (types as string[]) : [];
    } catch {
      return [];
    } finally {
      // A kill between the PREPARE and here leaves nothing to deallocate, and
      // the rebuilt instance has no prepared statements at all.
      try {
        await evaluate(`DEALLOCATE ${name}`);
      } catch {
        /* the statement is gone with the session that held it */
      }
    }
  };
}
