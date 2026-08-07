// A STANDING CHECK, not a sweep round: which BUILTIN functions reject a NULL
// argument, and therefore where the engine owes a `notNull` parameter claim it
// does not currently make.
//
// The contract says no claim is made about a USER function's arguments beyond
// its declared parameter types — a body is not an interface. Builtins are the
// other side of that line: their behaviour is documented and knowable, so a
// rejection they perform is one the engine should be able to state. This
// measures the gap rather than assuming it is empty, and it found 10
// signatures across 11 argument positions (docs/argument-nullability.md, "What
// a nullable parameter does not promise").
//
// Strictness is catalog-visible and a strict function cannot be in the class
// (it returns NULL rather than running), so the universe is the NON-STRICT
// pg_catalog functions. "Raises on NULL" is in no catalog column at all, which
// is what makes the fix a curated table and the reason this script exists: run
// it against a new PostgreSQL and the table's drift is a measurement, not a
// guess.
//
// Run: `pnpm exec tsx tests/probe/params5.ts`
//
// The administrative and handler families are excluded by name rather than
// called: `binary_upgrade_*` mutates catalogs, the trigger handlers are not
// callable as functions, and `set_config` is a GUC write.
import { ProbeLoop } from "./harness.js";

const loop = await ProbeLoop.create();

const EXCLUDED = /^(binary_upgrade_|pg_|plpgsql_call_handler|tsvector_update_trigger|satisfies_hash_partition|set_config|current_query|inet_(client|server)_)/;

/** A literal for each declared argument type the probe can produce. */
const LITERALS: Record<string, string> = {
  text: `'a'`, integer: `1`, bigint: `1`, smallint: `1`, numeric: `1`,
  "double precision": `1`, real: `1`, boolean: `true`, oid: `1`,
  date: `'2020-01-01'::date`, "timestamp without time zone": `'2020-01-01'::timestamp`,
  "timestamp with time zone": `'2020-01-01'::timestamptz`,
  "time without time zone": `'01:00'::time`, "time with time zone": `'01:00'::timetz`,
  interval: `'1 day'::interval`, json: `'{}'::json`, jsonb: `'{}'::jsonb`,
  xml: `'<a/>'::xml`, "integer[]": `ARRAY[1]`, "text[]": `ARRAY['a']`,
  "oid[]": `ARRAY[1]::oid[]`, "char": `'a'::"char"`, pg_lsn: `'0/0'::pg_lsn`,
  anyelement: `1`, anyarray: `ARRAY[1]`, anycompatible: `1`,
  anycompatiblearray: `ARRAY[1]`, anyenum: `'a'::mood`, anynonarray: `1`,
  '"any"': `1`,
};

interface Sig { proname: string; argtypes: string[]; variadic: boolean }

const rows = (await loop.pg.query(`
  SELECT p.proname,
         coalesce(array_to_string(ARRAY(
           SELECT format_type(t, NULL) FROM unnest(p.proargtypes) AS t), '|'), '') AS argtypes,
         p.provariadic <> 0 AS variadic
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'pg_catalog' AND p.prokind = 'f' AND NOT p.proisstrict
    AND p.pronargs > 0
  ORDER BY p.proname`)).rows as { proname: string; argtypes: string; variadic: boolean }[];

const sigs: Sig[] = rows
  .filter(r => !EXCLUDED.test(r.proname))
  .map(r => ({ proname: r.proname, argtypes: r.argtypes.split("|"), variadic: r.variadic }))
  .filter(s => s.argtypes.every(t => t in LITERALS));

const run = async (sql: string): Promise<string | null> => {
  await loop.pg.exec("BEGIN");
  try {
    await loop.pg.query(sql);
    return null;
  } catch (e) {
    return (e as Error).message;
  } finally {
    await loop.pg.exec("ROLLBACK");
  }
};

const rejecting = new Map<string, string[]>();
let called = 0;
let controlFailed = 0;

for (const s of sigs) {
  for (let i = 0; i < s.argtypes.length; i++) {
    // A NULL cannot be spelled at a PSEUDO-type: `NULL::anycompatiblearray`
    // is not a cast PostgreSQL accepts, and the resulting "function does not
    // exist" is the probe failing to write the call, not a rejection. Each
    // pseudo-type gets the concrete stand-in its LITERALS entry resolves to,
    // which is what a real call at that position would carry.
    const CONCRETE: Record<string, string> = {
      '"any"': "text", anyelement: "integer", anynonarray: "integer",
      anyarray: "integer[]", anycompatible: "integer",
      anycompatiblearray: "integer[]", anyenum: "mood",
    };
    const at = (t: string): string => CONCRETE[t] ?? t;
    // Two positions take a literal from a CLOSED vocabulary, and the generic
    // `'a'` makes their control fail for a reason that has nothing to do with
    // NULL — which would drop a genuine rejection as a probe artefact. Both
    // were found exactly that way.
    const OVERRIDE: Record<string, Record<number, string>> = {
      daterange: { 3: `'[]'` }, int4range: { 3: `'[]'` }, int8range: { 3: `'[]'` },
      numrange: { 3: `'[]'` }, tsrange: { 3: `'[]'` }, tstzrange: { 3: `'[]'` },
      jsonb_set_lax: { 5: `'use_json_null'` },
    };
    const lit = (t: string, j: number): string =>
      OVERRIDE[s.proname]?.[j + 1] ?? LITERALS[t]!;
    const args = (nullAt: number): string[] =>
      s.argtypes.map((t, j) => (j === nullAt ? `NULL::${at(t)}` : lit(t, j)));
    const err = await run(`SELECT ${s.proname}(${args(i).join(", ")})`);
    if (err === null) {
      called++;
      continue;
    }
    // The control the suite insists on everywhere else: a raise is evidence
    // about NULL only if the SAME call with a value in that position
    // succeeds. Otherwise the raise belongs to the probe's own literals —
    // an unresolvable polymorphic call, a bad flags string, an arity rule.
    const control = await run(`SELECT ${s.proname}(${args(-1).join(", ")})`);
    if (control !== null) {
      controlFailed++;
      continue;
    }
    called++;
    const key = `${s.proname}(${s.argtypes.join(", ")})`;
    if (!rejecting.has(key)) rejecting.set(key, []);
    rejecting.get(key)!.push(`arg ${i + 1} (${s.argtypes[i]}): ${err}`);
  }
}

const positions = [...rejecting.values()].reduce((n, v) => n + v.length, 0);
console.log(`signatures probed:      ${sigs.length}`);
console.log(`calls with a control:   ${called} (+${controlFailed} whose control also failed — the probe's, not NULL's)`);
console.log(`REJECTING signatures:   ${rejecting.size}, in ${positions} argument positions\n`);
for (const [k, v] of rejecting) {
  console.log(`  ${k}`);
  for (const m of v) console.log(`      ${m}`);
}

await loop.close();
