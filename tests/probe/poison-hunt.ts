// Which expressions poison a PGlite backend? The surface probe bisects
// AROUND them; this round attributes exactly: batch-first for speed, and on
// any failure or short result the batch is walked expression by expression
// with the poison sentinel (an exception-path call — a poisoned backend
// answers plain SELECTs and lies) after each. Every suspect is then
// re-verified on a FRESH instance, so the report separates deterministic
// self-contained poisoners from order-dependent ones.
// Run: pnpm exec tsx tests/probe/poison-hunt.ts
import { PGlite } from "@electric-sql/pglite";
import {
  VALUES,
  POLYMORPHIC,
  POLYMORPHIC_FAMILIES,
  combinations,
  qualify,
  PROBE_FN_SQL,
} from "../unit/query/probe-values.js";

let pg = await PGlite.create();
const setup = async (db: PGlite): Promise<void> => {
  await db.exec(`CREATE TYPE probe_enum AS ENUM ('a','b');`);
  await db.exec(PROBE_FN_SQL);
};
await setup(pg);

const sentinelOk = async (db: PGlite): Promise<boolean> => {
  try {
    const r = await db.query<{ v: string }>(`SELECT probe('1') AS v`);
    return r.rows[0]?.v === "value";
  } catch {
    return false;
  }
};
const rebuild = async (): Promise<void> => {
  try {
    await pg.close();
  } catch {
    /* dead */
  }
  pg = await PGlite.create();
  await setup(pg);
};

// --- the same expression universe the surface suite builds (fn + op) ------
const fnRows = (
  await pg.query<{ name: string; types: string[]; volatile: boolean }>(
    `SELECT p.proname AS name,
            COALESCE((SELECT array_agg(format_type(t, null) ORDER BY o)
                        FROM unnest(p.proargtypes) WITH ORDINALITY AS z(t, o)), '{}') AS types,
            p.provolatile = 'v' AS volatile
       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'pg_catalog' AND p.prokind = 'f'
      ORDER BY p.proname, 2;`,
  )
).rows;
const opRows = (
  await pg.query<{ name: string; left: string | null; right: string | null; volatile: boolean }>(
    `SELECT o.oprname AS name,
            CASE WHEN o.oprleft = 0 THEN NULL ELSE format_type(o.oprleft, null) END AS left,
            CASE WHEN o.oprright = 0 THEN NULL ELSE format_type(o.oprright, null) END AS right,
            p.provolatile = 'v' AS volatile
       FROM pg_operator o
       JOIN pg_namespace n ON n.oid = o.oprnamespace
       JOIN pg_proc p ON p.oid = o.oprcode
      WHERE n.nspname = 'pg_catalog'
      ORDER BY o.oprname, 2, 3;`,
  )
).rows;

const exprs: string[] = [];
for (const r of fnRows) {
  if (r.volatile || r.types.some(t => !POLYMORPHIC.has(t) && !VALUES[t])) continue;
  for (const family of POLYMORPHIC_FAMILIES) {
    const lists = r.types.map(t => (t in family ? [family[t]!] : VALUES[t]!));
    for (const combo of combinations(lists).combos) {
      exprs.push(`${qualify(r.name)}(${combo.join(", ")})`);
    }
    if (r.types.every(t => !POLYMORPHIC.has(t))) break;
  }
}
for (const r of opRows) {
  const types = [r.left, r.right].filter((t): t is string => t !== null);
  if (r.volatile || types.some(t => !POLYMORPHIC.has(t) && !VALUES[t])) continue;
  for (const family of POLYMORPHIC_FAMILIES) {
    const lists = types.map(t => (t in family ? [family[t]!] : VALUES[t]!));
    for (const combo of combinations(lists).combos) {
      exprs.push(
        r.left === null
          ? `OPERATOR(pg_catalog.${r.name}) ${combo[0]}`
          : `${combo[0]} OPERATOR(pg_catalog.${r.name}) ${combo[1]}`,
      );
    }
    if (types.every(t => !POLYMORPHIC.has(t))) break;
  }
}
const all = [...new Set(exprs)];
console.log(`hunting across ${all.length} expressions`);

interface Suspect {
  expr: string;
  ownCall: string;
}
const suspects: Suspect[] = [];

const walkOneByOne = async (batch: string[]): Promise<void> => {
  for (const e of batch) {
    let ownCall: string;
    try {
      const r = await pg.query<{ v: string }>(`SELECT probe($1) AS v`, [e]);
      ownCall = r.rows.length === 1 ? `returned '${r.rows[0]!.v}'` : "returned SHORT result";
    } catch (err) {
      ownCall = `threw: ${(err as Error).message.split("\n")[0]}`;
    }
    if (!(await sentinelOk(pg))) {
      suspects.push({ expr: e, ownCall });
      await rebuild();
    }
  }
};

for (let i = 0; i < all.length; i += 500) {
  const batch = all.slice(i, i + 500);
  try {
    const res = await pg.query<{ e: string; v: string }>(
      `SELECT e, probe(e) AS v FROM unnest($1::text[]) AS e;`,
      [batch],
    );
    if (res.rows.length !== batch.length) throw new Error("short result");
  } catch {
    if (!(await sentinelOk(pg))) await rebuild();
    await walkOneByOne(batch);
  }
}

console.log(`\n${suspects.length} suspect(s) attributed by sentinel:`);
for (const s of suspects) console.log(`  ${s.expr}\n    own call ${s.ownCall}`);

// --- determinism: each suspect alone on a fresh instance ------------------
console.log(`\nfresh-instance verification:`);
for (const s of suspects) {
  const fresh = await PGlite.create();
  await setup(fresh);
  let ownCall: string;
  try {
    const r = await fresh.query<{ v: string }>(`SELECT probe($1) AS v`, [s.expr]);
    ownCall = r.rows.length === 1 ? `returned '${r.rows[0]!.v}'` : "returned SHORT result";
  } catch (err) {
    ownCall = `threw: ${(err as Error).message.split("\n")[0]}`;
  }
  const poisoned = !(await sentinelOk(fresh));
  console.log(
    `  ${poisoned ? "DETERMINISTIC POISONER" : "order-dependent only"}: ${s.expr}` +
      `\n    own call ${ownCall}`,
  );
  try {
    await fresh.close();
  } catch {
    /* dead */
  }
}
await pg.close();
