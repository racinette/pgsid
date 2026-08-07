// How wide is the nullable-param gap: is it the DOMAIN return, or any body?
import { ProbeLoop } from "./harness.js";
import { parseSql } from "../../src/ast.js";
import { inferQueryContract } from "../../src/query/nullability-walk.js";

const loop = await ProbeLoop.create();
const cases: [string, string][] = [
  ["domain return, body casts the argument", `SELECT sw4_dom_id($1) AS d`],
  ["domain return, body echoes the argument", `SELECT sw4_dom_echo($1) AS d`],
  ["domain return, body is a constant (control)", `SELECT dom_lenient($1) AS d`],
  ["plain return, body RAISEs on NULL", `SELECT sw4_raiser($1) AS d`],
  ["domain return through a column, not a param", `SELECT sw4_dom_echo(c.name) AS d FROM customers c`],
];
for (const [note, sql] of cases) {
  const stmt = (await parseSql(sql)).stmts![0]!.stmt!;
  const c = inferQueryContract(stmt, loop.catalog);
  let observed = "";
  await loop.pg.exec("BEGIN");
  try {
    await loop.pg.exec(`INSERT INTO customers (id, email, name) VALUES (1, 'a@x', NULL)`);
    const r = await loop.pg.query(sql, sql.includes("$1") ? [null] : [], { rowMode: "array" });
    observed = `ACCEPTED, rows=${JSON.stringify(r.rows)}`;
  } catch (e) {
    observed = `RAISED: ${(e as Error).message}`;
  } finally {
    await loop.pg.exec("ROLLBACK");
  }
  console.log(
    `${note}\n   ${sql}\n   params=${JSON.stringify(c.params.map(p => p.notNull))} ` +
      `outputs=${JSON.stringify(c.outputs.map(o => o.notNull))}\n   ${observed}\n`,
  );
}
await loop.close();
