// Round 6 — the rank-4 face of the JSON_TABLE sibling shape, plus the last
// structurally distinct forms each section still owes.
import { runProbes, type Probe } from "./harness.js";

const SEED = [
  `INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay'), (2, 'b@x', NULL)`,
  `INSERT INTO orders (id, customer_id, status, placed_at) VALUES (5, 1, 'new', now())`,
  `INSERT INTO products (id, sku, name, price) VALUES (1, 's', 'n', 1)`,
  `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (1, 5, 1, 1, 1)`,
  `INSERT INTO tags (id, name) VALUES (1, 'tag')`,
];

const probes: Probe[] = [
  {
    id: "R1-jsontable-sibling-group",
    note: "two sibling ordinalities under a matching outer join — both are discriminants and they disagree",
    sql: `SELECT c.id, j.na, j.nb FROM customers c LEFT JOIN
            JSON_TABLE('{"a":[1],"b":[3]}'::jsonb, '$' COLUMNS (
              NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY),
              NESTED PATH '$.b[*]' COLUMNS (nb FOR ORDINALITY))) j ON c.id = 1`,
    seed: SEED,
  },
  {
    id: "R2-jsontable-sibling-plain",
    note: "the same without a join, for the flat claim",
    sql: `SELECT j.na, j.nb FROM JSON_TABLE('{"a":[1],"b":[3]}'::jsonb, '$' COLUMNS (
              NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY),
              NESTED PATH '$.b[*]' COLUMNS (nb FOR ORDINALITY))) j`,
  },
  {
    id: "R3-rowsfrom-alias-in-cte",
    note: "the ROWS FROM naming defect re-exported by a CTE",
    sql: `WITH k AS (SELECT * FROM ROWS FROM (generate_series(1, 2)) AS z) SELECT * FROM k`,
  },
  {
    id: "R4-rowsfrom-alias-star-qualified",
    note: "the same reached through a qualified star",
    sql: `SELECT z.* FROM ROWS FROM (dom_lenient('a')) AS z`,
  },
  {
    id: "A21-strict-srf-in-merge-source",
    note: "section A, a third placement: a strict SRF as a MERGE source",
    sql: `MERGE INTO tags g USING sw4_dom_srf(NULL::integer) AS s(nm) ON g.name = s.nm
          WHEN NOT MATCHED THEN INSERT (name) VALUES ('z')
          RETURNING merge_action() AS act, s.nm AS snm`,
    seed: SEED,
  },
  {
    id: "B12-default-through-from-item-overload",
    note: "section B: the FROM-position candidate sweep over an overloaded name with a NULL default",
    sql: `SELECT * FROM sw4_ovd(1) AS s`,
  },
  {
    id: "D14-anchor-tablesample",
    note: "section D: the ANCHOR itself sampled away",
    sql: `SELECT o.id, (SELECT c.email FROM customers c TABLESAMPLE BERNOULLI (0)
             WHERE c.id = o.customer_id) AS e FROM orders o`,
    seed: SEED,
  },
  {
    id: "F4-merge-action-not-matched-by-source-delete-only",
    note: "section F: an arm that emits a row for a source that never matched",
    sql: `MERGE INTO tags g USING (SELECT 1 AS id WHERE false) s ON g.id = s.id
          WHEN NOT MATCHED BY SOURCE THEN UPDATE SET name = g.name || '!'
          RETURNING merge_action() AS act, g.name`,
    seed: SEED,
  },
  {
    id: "G9-crossjoin-hole-through-view",
    note: "section G: finding 2's hole inside a VIEW definition",
    sql: `SELECT v.cid FROM sw4_cross_view v`,
    seed: SEED,
  },
  {
    id: "G10-rowsfrom-padding-into-strict-call",
    note: "section G: a padded ROWS FROM column feeding a strict call's argument",
    sql: `SELECT dom_strict(x.dom_lenient) AS d
          FROM ROWS FROM (dom_lenient('a'), generate_series(1, 3)) AS x`,
  },
];

await runProbes(probes, [
  `CREATE VIEW sw4_cross_view AS
     SELECT c.id AS cid FROM orders o
     LEFT JOIN (customers c CROSS JOIN tags g) ON c.id = o.customer_id`,
]);
