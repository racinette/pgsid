// The partitioned-parent foreign key: which relation does the key point at?
import { runProbes, ProbeLoop, type Probe } from "./harness.js";

const SEED = [
  `INSERT INTO sw4_pp (id, k) VALUES (1, 'a'), (150, 'b')`,
  // Two referencing rows, one landing in each partition.
  `INSERT INTO sw4_pref (id, p_id) VALUES (10, 1), (11, 150)`,
  `INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay')`,
  `INSERT INTO orders (id, customer_id, status, placed_at) VALUES (5, 1, 'new', now())`,
  `INSERT INTO shipments (id, order_id, carrier) VALUES (1, 5, 'ups')`,
];

const probes: Probe[] = [
  {
    id: "C19-fk-clone-partition-1",
    note: "the key resolves to a PARTITION; a referencing row in the other partition has no match here",
    sql: `SELECT p.id, p.k FROM sw4_pref r LEFT JOIN sw4_pp1 p ON p.id = r.p_id`,
    seed: SEED,
  },
  {
    id: "C20-fk-clone-partition-2",
    note: "the mirror",
    sql: `SELECT p.id, p.k FROM sw4_pref r LEFT JOIN sw4_pp2 p ON p.id = r.p_id`,
    seed: SEED,
  },
  {
    id: "C21-fk-clone-declared-parent",
    note: "the DECLARED key's own relation, which the capture lost",
    sql: `SELECT p.id, p.k FROM sw4_pref r LEFT JOIN sw4_pp p ON p.id = r.p_id`,
    seed: SEED,
  },
  {
    id: "C22-fk-clone-subquery-chain",
    note: "the same key through the correlated-subquery anchor rule",
    sql: `SELECT r.id, (SELECT p.k FROM sw4_pp1 p WHERE p.id = r.p_id) AS k FROM sw4_pref r`,
    seed: SEED,
  },
  {
    id: "C23-crossjoin-inside-extendable-side",
    note: "joinCannotExtendSide's own subtreePreserves, over a side hiding a CROSS JOIN",
    sql: `SELECT c.id FROM shipments s FULL JOIN
            (orders o FULL JOIN (customers c CROSS JOIN tags g) ON o.customer_id = c.id)
            ON s.order_id = o.id`,
    seed: SEED,
  },
  {
    id: "C24-crossjoin-otherside-alwaysPresent",
    note: "subtreeAlwaysPresent over a side hiding a CROSS JOIN",
    sql: `SELECT c.id FROM (order_items oi CROSS JOIN tags g) FULL JOIN orders o
            ON oi.order_id = o.id FULL JOIN customers c ON o.customer_id = c.id`,
    seed: SEED,
  },
];

await runProbes(probes);

const loop = await ProbeLoop.create();
const cat = loop.catalog as unknown as {
  resolveForeignKey: (s: string, t: string, c: string) => unknown;
};
console.log("sw4_pref.p_id fk:", JSON.stringify(cat.resolveForeignKey("public", "sw4_pref", "p_id")));
await loop.close();
