// C, second pass: what the subtree readings can and cannot see.
import { runProbes, ProbeLoop, type Probe } from "./harness.js";

const SEED = [
  `INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay'), (2, 'b@x', NULL)`,
  `INSERT INTO orders (id, customer_id, status, placed_at) VALUES (5, 1, 'new', now())`,
  `INSERT INTO sw4_pp (id, k) VALUES (1, 'a')`,
  `INSERT INTO sw4_pref (id, p_id) VALUES (10, 1)`,
  `INSERT INTO sw4_c (id, v) VALUES (1, 'x')`,
  `INSERT INTO sw4_r (rid, id, v) VALUES (100, 1, 'x')`,
];

const probes: Probe[] = [
  {
    id: "C11-cross-join-empty-inside-side",
    note: "the minimal form of C9: a CROSS JOIN carries no qual, so it is never recorded in scope.joins",
    sql: `SELECT c.id FROM orders o LEFT JOIN (customers c CROSS JOIN tags g)
            ON c.id = o.customer_id`,
    seed: SEED,
  },
  {
    id: "C12-comma-join-empty-inside-side",
    note: "the comma spelling of the same",
    sql: `SELECT c2.id FROM orders o LEFT JOIN (SELECT c.id FROM customers c, tags g) c2
            ON c2.id = o.customer_id`,
    seed: SEED,
  },
  {
    id: "C13-cross-join-inner-arm",
    note: "the proven-present arm: a FULL join whose referenced side hides a CROSS JOIN",
    sql: `SELECT c.id FROM order_items oi FULL JOIN
            (customers c CROSS JOIN tags g) ON c.id = oi.order_id`,
    seed: SEED,
  },
  {
    id: "C14-cross-join-joinCannotExtend",
    note: "the join-level fact composing over a side with an unrecorded CROSS JOIN",
    sql: `SELECT c.id FROM customers c FULL JOIN (orders o CROSS JOIN tags g)
            ON o.customer_id = c.id FULL JOIN shipments s ON s.order_id = o.id`,
    seed: SEED,
  },
  {
    id: "C15-tablesample-referenced",
    note: "TABLESAMPLE (alias first) drops rows without being a join type",
    sql: `SELECT c.id FROM orders o LEFT JOIN customers c TABLESAMPLE BERNOULLI (0)
            ON c.id = o.customer_id`,
    seed: SEED,
  },
  {
    id: "C16-cross-join-control-nonempty",
    note: "control: the same shape with the cross-joined relation non-empty",
    sql: `SELECT c.id FROM orders o LEFT JOIN (customers c CROSS JOIN tags g)
            ON c.id = o.customer_id`,
    seed: [...SEED, `INSERT INTO tags (id, name) VALUES (1, 'n')`],
  },
  {
    id: "D7-subquery-chain-cross-join",
    note: "the subquery chain's other side hides a CROSS JOIN",
    sql: `SELECT oi.id, (SELECT c.email FROM orders o JOIN (customers c CROSS JOIN tags g)
             ON c.id = o.customer_id WHERE o.id = oi.order_id) AS e FROM order_items oi`,
    seed: [
      ...SEED,
      `INSERT INTO products (id, sku, name, price) VALUES (1, 's', 'n', 1)`,
      `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (1, 5, 1, 1, 1)`,
    ],
  },
  {
    id: "D8-subquery-chain-tablesample",
    note: "the chain's second hop TABLESAMPLE'd out of the slice",
    sql: `SELECT oi.id, (SELECT c.email FROM orders o JOIN customers c TABLESAMPLE BERNOULLI (0)
             ON c.id = o.customer_id WHERE o.id = oi.order_id) AS e FROM order_items oi`,
    seed: [
      ...SEED,
      `INSERT INTO products (id, sku, name, price) VALUES (1, 's', 'n', 1)`,
      `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (1, 5, 1, 1, 1)`,
    ],
  },
  {
    id: "C17-partitioned-fk-precision",
    note: "why did the partitioned key not promote at all? (rank 7 if the key is simply unread)",
    sql: `SELECT p.id FROM sw4_pref r LEFT JOIN sw4_pp p ON p.id = r.p_id`,
    seed: SEED,
  },
  {
    id: "C18-plain-fk-precision-control",
    note: "control: the same shape over a non-partitioned key",
    sql: `SELECT c.id FROM sw4_r r LEFT JOIN sw4_c c ON c.id = r.id`,
    seed: SEED,
  },
];

await runProbes(probes);

// Why C17 differs from C18: ask the catalog directly.
const loop = await ProbeLoop.create();
const cat = loop.catalog as unknown as {
  resolveForeignKey: (s: string, t: string, c: string) => unknown;
  resolveForeignKeyTree: (s: string, t: string, c: string) => unknown;
};
console.log("sw4_pref.p_id fk       :", JSON.stringify(cat.resolveForeignKey("public", "sw4_pref", "p_id")));
console.log("sw4_pref.p_id fk (tree):", JSON.stringify(cat.resolveForeignKeyTree("public", "sw4_pref", "p_id")));
console.log("sw4_r.id fk            :", JSON.stringify(cat.resolveForeignKey("public", "sw4_r", "id")));
console.log("sw4_r.id fk (tree)     :", JSON.stringify(cat.resolveForeignKeyTree("public", "sw4_r", "id")));
console.log(
  "pg_constraint:",
  JSON.stringify(
    (
      await loop.pg.query(
        `SELECT conname, conrelid::regclass::text AS rel, confrelid::regclass::text AS fref,
                convalidated, conenforced, condeferrable, coninhcount, conparentid
         FROM pg_constraint WHERE contype = 'f' AND conrelid::regclass::text IN ('sw4_pref','sw4_r')`,
      )
    ).rows,
  ),
);
await loop.close();
