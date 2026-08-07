// Sections C and D — join-level presence, and the correlated-subquery chain.
import { runProbes, type Probe } from "./harness.js";

const SEED = [
  `INSERT INTO sw4_pp (id, k) VALUES (1, 'a'), (2, 'b')`,
  `INSERT INTO sw4_pref (id, p_id) VALUES (10, 1), (11, 2)`,
  `INSERT INTO sw4_ip (id, k) VALUES (1, 'a')`,
  `INSERT INTO sw4_ic (id, k) VALUES (5, 'c')`,
  `INSERT INTO sw4_iref (id, p_id) VALUES (10, 1)`,
  `INSERT INTO sw4_c (id, v) VALUES (1, 'x')`,
  `INSERT INTO sw4_r (rid, id, v) VALUES (100, 1, 'y')`,
  `INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay'), (2, 'b@x', NULL)`,
  `INSERT INTO orders (id, customer_id, status, placed_at) VALUES (5, 1, 'new', now())`,
  `INSERT INTO addresses (id, customer_id, line1, city, state) VALUES (1, 1, 'l', 'c', 's')`,
];

const probes: Probe[] = [
  {
    id: "C1-only-partitioned-referenced",
    note: "FK entailment promotes the referenced side; ONLY on a PARTITIONED parent scans no rows",
    sql: `SELECT p.id, p.k FROM sw4_pref r LEFT JOIN ONLY sw4_pp p ON p.id = r.p_id`,
    seed: SEED,
  },
  {
    id: "C2-only-inherited-referenced-control",
    note: "control: ONLY on an INHERITANCE parent is exactly where the FK target lives",
    sql: `SELECT p.id, p.k FROM sw4_iref r LEFT JOIN ONLY sw4_ip p ON p.id = r.p_id`,
    seed: SEED,
  },
  {
    id: "C3-partitioned-tree-control",
    note: "control: the tree scan finds the match",
    sql: `SELECT p.id, p.k FROM sw4_pref r LEFT JOIN sw4_pp p ON p.id = r.p_id`,
    seed: SEED,
  },
  {
    id: "C4-tablesample-referenced",
    note: "TABLESAMPLE drops rows without being a join type; the match leaves the slice",
    sql: `SELECT c.id FROM orders o LEFT JOIN customers TABLESAMPLE BERNOULLI (0) c ON c.id = o.customer_id`,
    seed: SEED,
  },
  {
    id: "C5-using-synthesised-key",
    note: "USING synthesises exactly the key equality — is it read the same way?",
    sql: `SELECT c.id, c.v FROM sw4_r r LEFT JOIN sw4_c c USING (id)`,
    seed: SEED,
  },
  {
    id: "C6-natural-synthesised-two-columns",
    note: "NATURAL merges id AND v, so the synthesised qual is a conjunction",
    sql: `SELECT c.id FROM sw4_r r NATURAL LEFT JOIN sw4_c c`,
    seed: SEED,
  },
  {
    id: "C7-two-unaliased-functions",
    note: "both register under the empty alias; the side slicing indexes scope.aliases.size",
    sql: `SELECT * FROM customers c LEFT JOIN generate_series(1, 2) ON true
          LEFT JOIN unnest(ARRAY['a','b']) ON true`,
    seed: SEED,
  },
  {
    id: "C8-unaliased-function-then-key",
    note: "an unaliased function between the two relations a key relates",
    sql: `SELECT c.id FROM orders o CROSS JOIN generate_series(1, 2)
          FULL JOIN customers c ON c.id = o.customer_id`,
    seed: SEED,
  },
  {
    id: "C9-lateral-empty-inside-side",
    note: "a LATERAL that returns nothing inside the referenced side",
    sql: `SELECT c.id FROM orders o LEFT JOIN
            (customers c CROSS JOIN LATERAL (SELECT 1 AS z WHERE c.id > 1000) l)
            ON c.id = o.customer_id`,
    seed: SEED,
  },
  {
    id: "C10-subquery-with-where-inside-side",
    note: "the referenced side is a subquery with its own WHERE (must refuse: not a table)",
    sql: `SELECT c.id FROM orders o LEFT JOIN (SELECT * FROM customers WHERE id > 1000) c
            ON c.id = o.customer_id`,
    seed: SEED,
  },
  {
    id: "D1-subquery-anchor-only-partitioned",
    note: "the anchor is ONLY a partitioned parent; keyEntails ignores the anchor's scan mode",
    sql: `SELECT r.id, (SELECT p.k FROM ONLY sw4_pp p WHERE p.id = r.p_id) AS k FROM sw4_pref r`,
    seed: SEED,
  },
  {
    id: "D2-subquery-anchor-only-inherited-control",
    note: "control: the same over an inheritance parent",
    sql: `SELECT r.id, (SELECT p.k FROM ONLY sw4_ip p WHERE p.id = r.p_id) AS k FROM sw4_iref r`,
    seed: SEED,
  },
  {
    id: "D3-subquery-chain-only-partitioned-inner",
    note: "the composition's second hop lands on ONLY a partitioned parent",
    sql: `SELECT r.id, (SELECT p.k FROM sw4_pref r2 JOIN ONLY sw4_pp p ON p.id = r2.p_id
             WHERE r2.id = r.id) AS k FROM sw4_pref r`,
    seed: SEED,
  },
  {
    id: "D4-subquery-chain-tablesample",
    note: "the second hop's referenced relation is TABLESAMPLE'd out of the slice",
    sql: `SELECT o.id, (SELECT c.email FROM orders o2 JOIN customers TABLESAMPLE BERNOULLI (0) c
             ON c.id = o2.customer_id WHERE o2.id = o.id) AS e FROM orders o`,
    seed: SEED,
  },
  {
    id: "D5-subquery-chain-control",
    note: "control: the composition the fix phase built, unmolested",
    sql: `SELECT oi.id, (SELECT c.email FROM orders o JOIN customers c ON c.id = o.customer_id
             WHERE o.id = oi.order_id) AS e FROM order_items oi`,
    seed: [
      ...SEED,
      `INSERT INTO products (id, sku, name, price) VALUES (1, 's', 'n', 1)`,
      `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (1, 5, 1, 1, 1)`,
    ],
  },
  {
    id: "D6-subquery-in-returning",
    note: "the same chain inside a RETURNING clause",
    sql: `UPDATE orders o SET status = 'x'
          RETURNING o.id, (SELECT c.email FROM customers c WHERE c.id = o.customer_id) AS e`,
    seed: SEED,
  },
];

await runProbes(probes);
