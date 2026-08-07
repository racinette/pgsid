// Round 7 — the free-form session the stop condition asks for: parameters,
// DML placements, set operations and star expansion over the new shapes.
import { runProbes, type Probe } from "./harness.js";

const SEED = [
  `INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay'), (2, 'b@x', NULL)`,
  `INSERT INTO orders (id, customer_id, status, placed_at) VALUES (5, 1, 'new', now())`,
  `INSERT INTO tags (id, name) VALUES (1, 'tag')`,
  `INSERT INTO t (id, name, val, active) VALUES (1, 'n', NULL, true)`,
];

const probes: Probe[] = [
  {
    id: "P1-param-into-domain-body",
    note: "a NULL binding that RAISES inside a non-strict function's domain cast — is $1 claimed nullable?",
    sql: `SELECT sw4_dom_id($1) AS d`,
    params: [null],
  },
  {
    id: "P2-param-into-strict-domain",
    note: "the strict counterpart: NULL short-circuits and is ACCEPTED",
    sql: `SELECT dom_strict($1) AS d`,
    params: [null],
  },
  {
    id: "P3-param-defaulted-position",
    note: "a parameter in a defaulted position",
    sql: `SELECT def_strict($1) AS d`,
    params: [null],
  },
  {
    id: "S1-setop-rowsfrom-arities",
    note: "set operation over two ROWS FROM branches",
    sql: `SELECT * FROM ROWS FROM (dom_lenient('a'), generate_series(1, 3)) AS x
          UNION ALL
          SELECT * FROM ROWS FROM (dom_lenient('b'), generate_series(1, 1)) AS y`,
  },
  {
    id: "S2-except-left-branch-padded",
    note: "EXCEPT keeps the left branch's claims — including a padded one",
    sql: `SELECT x.dom_lenient FROM ROWS FROM (dom_lenient('a'), generate_series(1, 3)) AS x
          EXCEPT ALL
          SELECT 'zzz'::text`,
  },
  {
    id: "S3-insert-select-from-padded",
    note: "the padded arm feeding an INSERT … SELECT into a NOT NULL column",
    sql: `INSERT INTO tags (name)
          SELECT x.dom_lenient FROM ROWS FROM (dom_lenient('a'), generate_series(1, 3)) AS x
          RETURNING tags.id, tags.name`,
    seed: SEED,
  },
  {
    id: "S4-star-over-crossjoin-side",
    note: "star expansion over the side finding 2 mis-reads",
    sql: `SELECT c.* FROM orders o LEFT JOIN (customers c CROSS JOIN tags g)
            ON c.id = o.customer_id`,
    seed: [SEED[0]!, SEED[1]!],
  },
  {
    id: "S5-groupby-over-padded",
    note: "GROUP BY a padded column",
    sql: `SELECT x.dom_lenient, count(*) AS n
          FROM ROWS FROM (dom_lenient('a'), generate_series(1, 3)) AS x
          GROUP BY x.dom_lenient`,
  },
  {
    id: "S6-where-refilters-padded",
    note: "a WHERE that removes the padded rows recovers the claim (soundly, by refiltering)",
    sql: `SELECT x.dom_lenient FROM ROWS FROM (dom_lenient('a'), generate_series(1, 3)) AS x
          WHERE x.dom_lenient IS NOT NULL`,
  },
  {
    id: "S7-view-over-rowsfrom-alias",
    note: "the ROWS FROM naming defect behind a view",
    sql: `SELECT * FROM sw4_rf_view`,
  },
  {
    id: "S8-recursive-cte-over-crossjoin",
    note: "the unrecorded CROSS JOIN inside a recursive CTE's recursive arm",
    sql: `WITH RECURSIVE r AS (
            SELECT c.id FROM customers c WHERE c.id = 1
            UNION ALL
            SELECT c2.id FROM r JOIN (customers c2 CROSS JOIN tags g) ON c2.id = r.id + 1)
          SELECT r.id FROM r`,
    seed: SEED,
  },
  {
    id: "S9-distinct-on-padded",
    note: "DISTINCT ON over a padded column",
    sql: `SELECT DISTINCT ON (x.dom_lenient) x.dom_lenient, x.generate_series
          FROM ROWS FROM (dom_lenient('a'), generate_series(1, 3)) AS x`,
  },
  {
    id: "S10-window-over-padded",
    note: "a window aggregate over the default frame reading a padded column",
    sql: `SELECT max(x.dom_lenient) OVER () AS m
          FROM ROWS FROM (dom_lenient('a'), generate_series(1, 3)) AS x`,
  },
];

await runProbes(probes, [
  `CREATE VIEW sw4_rf_view AS SELECT * FROM ROWS FROM (generate_series(1, 2)) AS z`,
]);
