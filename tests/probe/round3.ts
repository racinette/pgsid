// Round 3 — the other routes into an unrecorded join, and a free-form pass
// over shapes, DML placements, set operations and repeated CTE references.
import { runProbes, type Probe } from "./harness.js";

const SEED = [
  `INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay'), (2, 'b@x', NULL)`,
  `INSERT INTO orders (id, customer_id, status, placed_at) VALUES (5, 1, 'new', now())`,
  `INSERT INTO products (id, sku, name, price) VALUES (1, 's', 'n', 1)`,
  `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (1, 5, 1, 1, 1)`,
  `INSERT INTO sw4_c (id, v) VALUES (1, 'x')`,
  `INSERT INTO sw4_r (rid, id, v) VALUES (100, 1, 'x')`,
  `INSERT INTO t (id, name, val, active) VALUES (1, 'n', NULL, true)`,
  `INSERT INTO pair_holder (id, pairs) VALUES (1, ARRAY[ROW('a', 1)::sku_pair])`,
];

const probes: Probe[] = [
  {
    id: "C29-nested-using-unrecorded",
    note: "the OUTER USING merges a column the inner USING already merged, so no owning entry and no record",
    sql: `SELECT c.id FROM orders o LEFT JOIN
            (customers c JOIN (sw4_r r JOIN sw4_c x USING (id)) USING (id))
            ON c.id = o.customer_id`,
    seed: SEED,
  },
  {
    id: "C30-natural-no-common-columns",
    note: "a NATURAL join with nothing to merge behaves as CROSS and records nothing",
    sql: `SELECT c.id FROM orders o LEFT JOIN (customers c NATURAL JOIN sw4_none n)
            ON c.id = o.customer_id`,
    seed: SEED,
  },
  {
    id: "C31-join-on-true-control",
    note: "control: `ON TRUE` carries a qual, so the join IS recorded",
    sql: `SELECT c.id FROM orders o LEFT JOIN (customers c JOIN tags g ON true)
            ON c.id = o.customer_id`,
    seed: SEED,
  },
  {
    id: "FF1-rowsfrom-star-shape",
    note: "star expansion over a ROWS FROM whose arms have composite and scalar shapes",
    sql: `SELECT * FROM ROWS FROM (unnest(ARRAY[ROW('a',1)::sku_pair]), generate_series(1, 2))
            WITH ORDINALITY`,
  },
  {
    id: "FF2-rowsfrom-alias-columns",
    note: "a ROWS FROM renamed by an alias column list",
    sql: `SELECT * FROM ROWS FROM (sw4_tab_srf(1), generate_series(1, 2)) AS z(p, q, r)`,
  },
  {
    id: "FF3-strict-domain-in-returning",
    note: "the strict short-circuit in an INSERT RETURNING",
    sql: `INSERT INTO customers (id, email, name) VALUES (7, 'g@x', NULL)
          RETURNING dom_strict(name) AS d, dom_lenient(name) AS l`,
    seed: SEED,
  },
  {
    id: "FF4-rowsfrom-as-merge-source",
    note: "a padded ROWS FROM as a MERGE source",
    sql: `MERGE INTO tags g USING ROWS FROM (dom_lenient('a'), generate_series(1, 3)) AS s(nm, i)
            ON g.name = s.nm
          WHEN NOT MATCHED THEN INSERT (name) VALUES (coalesce(s.nm, 'z'))
          RETURNING merge_action() AS act, s.nm AS snm`,
    seed: SEED,
  },
  {
    id: "FF5-setop-over-padded-arm",
    note: "a set operation whose left branch is a padded ROWS FROM",
    sql: `SELECT x.dom_lenient FROM ROWS FROM (dom_lenient('a'), generate_series(1, 3)) AS x
          UNION ALL
          SELECT c.email FROM customers c`,
    seed: SEED,
  },
  {
    id: "FF6-cte-referenced-twice",
    note: "one CTE at two different join states — the join-level fact mutates joins in place",
    sql: `WITH k AS (SELECT c.id, c.email FROM customers c)
          SELECT a.id, b.id FROM k a LEFT JOIN k b ON b.id = a.id`,
    seed: SEED,
  },
  {
    id: "FF7-strict-domain-in-check-guarded-branch",
    note: "a strict call inside a CASE arm that is never taken",
    sql: `SELECT CASE WHEN false THEN dom_strict(c.name) ELSE 'z' END AS d FROM customers c`,
    seed: SEED,
  },
  {
    id: "FF8-fk-promotion-through-view",
    note: "the key entailment through a VIEW's own join tree",
    sql: `SELECT s.order_id, s.customer_email FROM order_shipment_summary s`,
    seed: SEED,
  },
  {
    id: "FF9-rowsfrom-inside-cte-then-join",
    note: "the padded arm re-exported by a CTE and then LEFT joined",
    sql: `WITH x AS (SELECT * FROM ROWS FROM (dom_lenient('a'), generate_series(1, 3)))
          SELECT c.id, x.dom_lenient FROM customers c LEFT JOIN x ON x.generate_series = c.id`,
    seed: SEED,
  },
  {
    id: "FF10-unnest-in-rowsfrom-shape",
    note: "unnest of a composite array beside another arm — one column per FIELD, padded",
    sql: `SELECT * FROM pair_holder p, ROWS FROM (unnest(p.pairs), generate_series(1, 3)) z`,
    seed: SEED,
  },
  {
    id: "FF11-strict-srf-left-join-lateral-ordinality",
    note: "WITH ORDINALITY under a LEFT JOIN LATERAL over a strict SRF with no rows",
    sql: `SELECT t.id, s.* FROM t LEFT JOIN LATERAL sw4_dom_srf(NULL::integer)
            WITH ORDINALITY AS s ON true`,
    seed: SEED,
  },
  {
    id: "FF12-update-from-crossjoin-side",
    note: "the unrecorded CROSS JOIN reached through UPDATE … FROM",
    sql: `UPDATE orders SET status = 'x' FROM (customers c CROSS JOIN tags g)
          WHERE c.id = orders.customer_id RETURNING orders.id, c.id AS cid`,
    seed: SEED,
  },
];

await runProbes(probes);
