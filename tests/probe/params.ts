// Parameter claims against real NULL bindings — the rank-3 oracle.
import { ProbeLoop } from "./harness.js";
import { parseSql } from "../../src/ast.js";
import { inferQueryContract } from "../../src/query/nullability-walk.js";

const loop = await ProbeLoop.create([
  `CREATE FUNCTION sw4_dom_plpg(x text) RETURNS nn_text LANGUAGE plpgsql AS $$ BEGIN RETURN x; END $$`,
]);
const cases = [
  `SELECT sw4_dom_id($1) AS d`,
  `SELECT sw4_dom_plpg($1) AS d`,
  `SELECT dom_strict($1) AS d`,
  `SELECT dom_lenient($1) AS d`,
  `SELECT def_strict($1) AS d`,
  `SELECT $1::nn_text AS d`,
  `INSERT INTO tags (name) VALUES ($1) RETURNING id`,
];
for (const sql of cases) {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const c = inferQueryContract(stmt, loop.catalog);
  let observed = "";
  await loop.pg.exec("BEGIN");
  try {
    const r = await loop.pg.query(sql, [null], { rowMode: "array" });
    observed = `ACCEPTED, rows=${JSON.stringify(r.rows)}`;
  } catch (e) {
    observed = `RAISED: ${(e as Error).message}`;
  } finally {
    await loop.pg.exec("ROLLBACK");
  }
  console.log(
    `${sql}\n   params: ${JSON.stringify(c.params.map(p => p.notNull))}` +
      `  outputs: ${JSON.stringify(c.outputs.map(o => o.notNull))}\n   NULL binding: ${observed}\n`,
  );
}
await loop.close();
