// Round 8 — the BUILTIN half of the finding-7 wording decision.
//
// The decision narrows "nullable is universal" to the builtins: a user
// function's body may raise for reasons no catalog records, so no claim is
// made about its arguments beyond what the DECLARED types say, while a
// builtin is documented and its rejections are in principle knowable. That
// narrowing is only worth writing down if it HOLDS, so this asks the obvious
// question of it: is there a builtin that RAISES on a NULL argument where the
// engine claims the parameter nullable?
//
// A strict builtin cannot be one (it returns NULL rather than running), so the
// candidates are the NON-strict ones that document a NULL rejection.
import { ProbeLoop } from "./harness.js";
import { parseSql } from "../../src/ast.js";
import { inferQueryContract } from "../../src/query/nullability-walk.js";

const loop = await ProbeLoop.create();

const cases: { id: string; sql: string; note: string }[] = [
  { id: "P1", sql: `SELECT array_fill(1, $1) AS a`, note: "non-strict; dims NULL" },
  { id: "P2", sql: `SELECT array_fill(1, ARRAY[2], $1) AS a`, note: "non-strict; low bounds NULL" },
  { id: "P3", sql: `SELECT array_fill($1::integer, ARRAY[2]) AS a`, note: "the ELEMENT position — NULL is legal" },
  { id: "P4", sql: `SELECT width_bucket(1.0, $1) AS a`, note: "thresholds NULL" },
  { id: "P5", sql: `SELECT concat_ws($1, 'a', 'b') AS a`, note: "non-strict separator" },
  { id: "P6", sql: `SELECT format($1, 'a') AS a`, note: "non-strict format string" },
  { id: "P7", sql: `SELECT num_nonnulls($1, 1) AS a`, note: "non-strict by design" },
  { id: "P8", sql: `SELECT * FROM generate_series(1, $1)`, note: "strict SRF — no rows" },
  { id: "P9", sql: `SELECT * FROM unnest($1::integer[]) AS u`, note: "strict SRF — no rows" },
  { id: "P10", sql: `SELECT json_object($1::text[]) AS a`, note: "non-strict array argument" },
  { id: "P11", sql: `SELECT jsonb_set('{}'::jsonb, $1::text[], '1'::jsonb) AS a`, note: "path NULL" },
  { id: "P12", sql: `SELECT * FROM json_each($1::json) AS j`, note: "strict SRF over NULL" },
  { id: "P13", sql: `SELECT to_char(now(), $1) AS a`, note: "strict" },
  { id: "P14", sql: `SELECT string_to_array('a,b', $1) AS a`, note: "non-strict delimiter" },
  { id: "P15", sql: `SELECT array_position(ARRAY[1,2], $1::integer) AS a`, note: "non-strict element" },
  { id: "P16", sql: `SELECT count(*) OVER (ORDER BY 1 ROWS $1 PRECEDING) AS a`, note: "the frame offset — already modelled" },
  { id: "P17", sql: `SELECT sw4_raiser($1) AS a`, note: "the WIDE control: a plpgsql body that RAISEs" },
  { id: "P18", sql: `SELECT sw4_dom_id($1) AS a`, note: "finding 7 itself" },
];

for (const c of cases) {
  let claims = "";
  try {
    const stmt = (await parseSql(c.sql)).stmts![0]!.stmt!;
    const contract = inferQueryContract(stmt, loop.catalog);
    claims = JSON.stringify(contract.params.map(p => (p.notNull ? "notNull" : "nullable")));
  } catch (e) {
    claims = `engine: ${(e as Error).name}`;
  }
  let observed = "";
  await loop.pg.exec("BEGIN");
  try {
    const r = await loop.pg.query(c.sql, [null], { rowMode: "array" });
    observed = `ACCEPTED rows=${JSON.stringify(r.rows).slice(0, 60)}`;
  } catch (e) {
    observed = `RAISED: ${(e as Error).message}`;
  } finally {
    await loop.pg.exec("ROLLBACK");
  }
  const bad = observed.startsWith("RAISED") && claims.includes("nullable");
  console.log(`[${bad ? "HIT " : "ok  "}] ${c.id} — ${c.note}`);
  console.log(`    ${c.sql}`);
  console.log(`    engine params: ${claims}`);
  console.log(`    NULL binding: ${observed}\n`);
}
await loop.close();
