// Round 2 — the rank-4 shape finding 1 opens, section D's remaining forms,
// and the routes into `scope.joins` that record nothing.
import { runProbes, type Probe } from "./harness.js";

const SEED = [
  `INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay'), (2, 'b@x', NULL)`,
  `INSERT INTO orders (id, customer_id, status, placed_at) VALUES (5, 1, 'new', now())`,
  `INSERT INTO products (id, sku, name, price) VALUES (1, 's', 'n', 1)`,
  `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (1, 5, 1, 1, 1)`,
  `INSERT INTO sw4_self (id, up) VALUES (1, 1), (2, 1)`,
  `INSERT INTO sw4_c (id, v) VALUES (1, 'x')`,
  `INSERT INTO sw4_r (rid, id, v) VALUES (100, 1, 'x')`,
  `INSERT INTO t (id, name, val, active) VALUES (1, 'n', NULL, true)`,
];

const probes: Probe[] = [
  {
    id: "G7-rowsfrom-group-survivor",
    note: "the padded arm's discriminant is NULL while the LONG arm's member is not — rank 4",
    sql: `SELECT o.id, x.a, x.b, x.generate_series FROM orders o
          LEFT JOIN LATERAL ROWS FROM (sw4_tab_srf(o.id), generate_series(1, 3)) x ON true`,
    seed: SEED,
  },
  {
    id: "G8-rowsfrom-group-plain-join",
    note: "the same without LATERAL",
    sql: `SELECT o.id, x.a, x.generate_series FROM orders o
          LEFT JOIN ROWS FROM (sw4_tab_srf(1), generate_series(1, 3)) x ON x.b = o.id`,
    seed: SEED,
  },
  {
    id: "A19-rowsfrom-coldeflist-body",
    note: "the column-definition-list arm of ROWS FROM, whose body reading is gated",
    sql: `SELECT * FROM ROWS FROM (sw4_rec(1) AS (p nn_text, q integer), generate_series(1, 3))`,
  },
  {
    id: "A20-rowsfrom-single-call-control",
    note: "control: ROWS FROM with ONE arm has nothing to be padded against",
    sql: `SELECT * FROM ROWS FROM (dom_lenient('a'))`,
  },
  {
    id: "C25-natural-unresolvable-owner",
    note: "a NATURAL join over an already-merged column: usingNames resolve to no entry, so nothing is recorded",
    sql: `SELECT c.id FROM orders o LEFT JOIN
            (sw4_r r JOIN sw4_c x USING (id) NATURAL JOIN sw4_c c) ON c.id = o.customer_id`,
    seed: SEED,
  },
  {
    id: "C26-selfjoin-key",
    note: "a NOT NULL self-referencing key across a self-join",
    sql: `SELECT b.id FROM sw4_self a LEFT JOIN sw4_self b ON a.up = b.id`,
    seed: SEED,
  },
  {
    id: "C27-selfjoin-key-crossjoined",
    note: "the same with the referenced side cross-joined to an empty relation",
    sql: `SELECT b.id FROM sw4_self a LEFT JOIN (sw4_self b CROSS JOIN tags g) ON a.up = b.id`,
    seed: SEED,
  },
  {
    id: "C28-cte-shadows-table",
    note: "a CTE shadowing the referenced table's name",
    sql: `WITH customers AS (SELECT 99 AS id, 'z'::text AS email)
          SELECT c.id FROM orders o LEFT JOIN customers c ON c.id = o.customer_id`,
    seed: SEED,
  },
  {
    id: "D9-anchor-third-subtree-qual",
    note: "a join inside the subquery whose ON references a relation from a third subtree",
    sql: `SELECT oi.id, (SELECT c.email FROM orders o JOIN customers c ON c.id = o.customer_id
             JOIN addresses a ON a.customer_id = o.customer_id WHERE o.id = oi.order_id) AS e
          FROM order_items oi`,
    seed: SEED,
  },
  {
    id: "D10-anchor-in-lateral",
    note: "the chain inside a LATERAL rather than a scalar sublink",
    sql: `SELECT oi.id, l.email FROM order_items oi
          LEFT JOIN LATERAL (SELECT c.email FROM orders o JOIN customers c ON c.id = o.customer_id
             WHERE o.id = oi.order_id) l ON true`,
    seed: SEED,
  },
  {
    id: "D11-anchor-self-lookup-chain",
    note: "the anchor settled by a self-lookup, then one key hop",
    sql: `SELECT o.id, (SELECT c.email FROM orders o2 JOIN customers c ON c.id = o2.customer_id
             WHERE o2.id = o.id) AS e FROM orders o`,
    seed: SEED,
  },
  {
    id: "D12-anchor-self-lookup-only-partitioned",
    note: "a self-lookup where both sides are ONLY a partitioned parent",
    sql: `SELECT p.id, (SELECT p2.k FROM ONLY sw4_pp p2 WHERE p2.id = p.id) AS k FROM sw4_pp p`,
    seed: [`INSERT INTO sw4_pp (id, k) VALUES (1, 'a')`],
  },
  {
    id: "D13-anchor-outer-not-required",
    note: "the outer relation the WHERE keys into is itself NULL-extendable",
    sql: `SELECT oi.id, (SELECT c.email FROM customers c WHERE c.id = o.customer_id) AS e
          FROM order_items oi LEFT JOIN orders o ON o.id = oi.order_id`,
    seed: SEED,
  },
];

await runProbes(probes);
