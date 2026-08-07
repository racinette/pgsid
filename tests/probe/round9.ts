// Round 9 — TABLESAMPLE as a row-dropper the walk did not model, and the two
// things the fix must not disturb.
//
// T1 is finding 3 itself. T2/T3 are the correlated-subquery anchor rule, which
// the sweep recorded SOUND for a reason that is not a gate — `subqueryFromTree`
// accepts only a plain RangeVar leaf and a sampled relation arrives wrapped —
// so the fix must leave them refusing rather than turn the accident into a
// wrong answer. T4/T5 are the un-sampled controls: the promotion the engine is
// SUPPOSED to make must still happen.
import { runProbes, type Probe } from "./harness.js";

const SEED = [
  `INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay')`,
  `INSERT INTO orders (id, customer_id, status, placed_at) VALUES (5, 1, 'new', now())`,
  `INSERT INTO products (id, name, price, sku) VALUES (1, 'p', 1, 's1')`,
  `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (7, 5, 1, 2, 3)`,
];

const probes: Probe[] = [
  {
    id: "T1-sampled-referenced-side",
    note: "finding 3: the key's referenced side sampled to nothing",
    seed: SEED,
    sql: `SELECT c.id AS cid FROM orders o
          LEFT JOIN customers c TABLESAMPLE BERNOULLI (0) ON c.id = o.customer_id`,
  },
  {
    id: "T2-sampled-anchor-subquery",
    note: "the anchor rule: the correlated subquery's own relation sampled",
    seed: SEED,
    sql: `SELECT oi.id, (SELECT o.status FROM orders o TABLESAMPLE BERNOULLI (0)
            WHERE o.id = oi.order_id) AS st FROM order_items oi`,
  },
  {
    id: "T3-sampled-second-hop",
    note: "the anchor rule, one hop in: the JOINED relation sampled",
    seed: SEED,
    sql: `SELECT oi.id, (SELECT c.email FROM orders o
            JOIN customers c TABLESAMPLE BERNOULLI (0) ON c.id = o.customer_id
            WHERE o.id = oi.order_id) AS em FROM order_items oi`,
  },
  {
    id: "T4-unsampled-control",
    note: "the control: the same join with no TABLESAMPLE must still promote",
    seed: SEED,
    sql: `SELECT c.id AS cid FROM orders o LEFT JOIN customers c ON c.id = o.customer_id`,
  },
  {
    id: "T5-unsampled-anchor-control",
    note: "the control for T3: the chain with no TABLESAMPLE",
    seed: SEED,
    sql: `SELECT oi.id, (SELECT c.email FROM orders o
            JOIN customers c ON c.id = o.customer_id
            WHERE o.id = oi.order_id) AS em FROM order_items oi`,
  },
  {
    id: "T6-sampled-referencing-side",
    note: "the REFERENCING side sampled — harmless in fact, refused conservatively",
    seed: SEED,
    sql: `SELECT c.id AS cid FROM orders o TABLESAMPLE BERNOULLI (100)
          LEFT JOIN customers c ON c.id = o.customer_id`,
  },
  {
    id: "T7-sampled-full-fraction",
    note: "BERNOULLI (100) on the referenced side keeps every row — still refused, and must be",
    seed: SEED,
    sql: `SELECT c.id AS cid FROM orders o
          LEFT JOIN customers c TABLESAMPLE BERNOULLI (100) ON c.id = o.customer_id`,
  },
];

await runProbes(probes);
