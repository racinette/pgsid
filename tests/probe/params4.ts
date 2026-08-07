// Round 8b — sizing the class params3.ts's P1/P2 opened.
//
// `array_fill(1, $1)` is a BUILTIN that RAISES on a NULL argument, and the
// engine claims the parameter nullable. Under the decided wording that is a
// live claim rather than an absent one, so the question is how big the class
// is: a curated table is only worth building if the thing it approximates is
// bounded, and the register's standing lesson is that a hand-curated table
// drifts from the catalog it stands in for.
//
// Strictness is catalog-visible and a strict function cannot be in the class
// (it returns NULL rather than running), so this counts the NON-STRICT
// pg_catalog functions and then narrows to the ones a query could plausibly
// reach. Nothing is CALLED here: calling arbitrary catalog functions has side
// effects (pg_sleep, the pg_terminate_* family, the file-access set).
import { ProbeLoop } from "./harness.js";

const loop = await ProbeLoop.create();

const q = async (sql: string): Promise<Record<string, unknown>[]> =>
  (await loop.pg.query(sql)).rows as Record<string, unknown>[];

const total = await q(`
  SELECT count(*) AS n FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'pg_catalog' AND p.prokind = 'f'`);
console.log(`pg_catalog functions:            ${total[0]!.n}`);

const nonstrict = await q(`
  SELECT count(*) AS n FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'pg_catalog' AND p.prokind = 'f' AND NOT p.proisstrict`);
console.log(`  non-strict:                    ${nonstrict[0]!.n}`);

// The reachable slice: no internal/pseudo argument types, not a system
// information function, not obviously administrative.
const reachable = await q(`
  SELECT p.proname, pg_get_function_arguments(p.oid) AS args
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'pg_catalog' AND p.prokind = 'f' AND NOT p.proisstrict
    AND p.proargtypes::oid[] <@ (
      SELECT array_agg(t.oid) FROM pg_type t
      WHERE t.typtype IN ('b', 'd', 'p') AND t.typname NOT IN ('internal', 'cstring', 'trigger', 'event_trigger', 'language_handler', 'fdw_handler', 'index_am_handler', 'tsm_handler', 'void', 'record'))
    AND p.proname NOT LIKE 'pg\\_%'
    AND p.proname NOT LIKE '%\\_in' AND p.proname NOT LIKE '%\\_out'
    AND p.proname NOT LIKE '%\\_recv' AND p.proname NOT LIKE '%\\_send'
  ORDER BY p.proname`);
console.log(`  reachable, non-system:         ${reachable.length}`);
console.log("");
for (const r of reachable) console.log(`    ${r.proname}(${r.args})`);

await loop.close();
