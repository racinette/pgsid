// Sections B (argument substitution), E (unnest element typing),
// F (merge_action), G (cross-mechanism).
import { runProbes, type Probe } from "./harness.js";

const SEED = [
  `INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay'), (2, 'b@x', NULL)`,
  `INSERT INTO orders (id, customer_id, status, placed_at) VALUES (5, 1, 'new', now())`,
  `INSERT INTO t (id, name, val, active) VALUES (1, 'n', NULL, true)`,
  `INSERT INTO pair_holder (id, pairs, dpairs, dompairs)
     VALUES (1, ARRAY[ROW('a', 1)::sku_pair], ARRAY[ROW('b', 2)::sku_pair]::sku_pair_arr,
             ARRAY[ROW('c', 3)::sku_pair::d_sku])`,
  `INSERT INTO trow_holder (id, rows, row1) VALUES (1, ARRAY[ROW(1, 'z')::trow], ROW(2, 'y')::trow)`,
  `INSERT INTO tags (id, name) VALUES (1, 'tag')`,
];

const probes: Probe[] = [
  // --- B ---------------------------------------------------------------
  {
    id: "B1-default-is-defaulted-call",
    note: "the default is itself a call whose own default is NULL",
    sql: `SELECT sw4_def_outer(1) AS d`,
  },
  {
    id: "B2-default-current-user",
    note: "a default naming CURRENT_USER",
    sql: `SELECT sw4_def_user(1) AS d`,
  },
  {
    id: "B3-default-volatile",
    note: "a volatile default",
    sql: `SELECT sw4_def_vol(1) AS d`,
  },
  {
    id: "B4-default-raises",
    note: "a default that raises when evaluated (a raise contradicts nothing)",
    sql: `SELECT sw4_def_raise(1) AS d`,
  },
  {
    id: "B5-overloaded-null-default",
    note: "an overloaded name whose picked candidate defaults to NULL and is strict",
    sql: `SELECT sw4_ovd(1) AS d`,
  },
  {
    id: "B6-overloaded-other-candidate",
    note: "the same name, the candidate with no default",
    sql: `SELECT sw4_ovd('q') AS d`,
  },
  {
    id: "B7-default-into-body",
    note: "the substituted default reaches the body that is read back",
    sql: `SELECT sw4_def_body(1) AS d`,
  },
  {
    id: "B8-default-into-body-supplied",
    note: "control: the same body with the argument supplied non-null",
    sql: `SELECT sw4_def_body(1, 'q') AS d`,
  },
  {
    id: "B9-named-skips-two",
    note: "named notation skipping the middle of three",
    sql: `SELECT def_two(1, c => 5) AS d`,
  },
  {
    id: "B10-default-in-from-position",
    note: "the FROM-position shape question asks the same argument vector",
    sql: `SELECT * FROM pair_strict(1)`,
  },
  {
    id: "B11-out-parameter-gap",
    note: "the recorded boundary: binding stops at an interleaved OUT parameter",
    sql: `SELECT mid_out(t.id, 2) AS d FROM t`,
    seed: SEED,
  },
  // --- E ---------------------------------------------------------------
  {
    id: "E1-array-agg-of-composite",
    note: "array_agg over a composite column: one column per field, or one?",
    sql: `SELECT * FROM pair_holder p, unnest((SELECT array_agg(q.row1) FROM trow_holder q)) x`,
    seed: SEED,
  },
  {
    id: "E2-array-cat-domain-over-array",
    note: "array_cat mixing a plain array and a DOMAIN over the same array",
    sql: `SELECT * FROM pair_holder p, unnest(array_cat(p.pairs, p.dpairs)) x`,
    seed: SEED,
  },
  {
    id: "E3-array-append-anycompatible",
    note: "anycompatible unification: array position vs element position",
    sql: `SELECT * FROM pair_holder p, unnest(array_append(p.pairs, NULL)) x`,
    seed: SEED,
  },
  {
    id: "E4-array-fill-multidim",
    note: "array_fill's element position plus a dimension, two-dimensional",
    sql: `SELECT * FROM unnest(array_fill(NULL::sku_pair, ARRAY[2, 2])) x`,
  },
  {
    id: "E5-array-of-domain-over-composite",
    note: "an array of a DOMAIN over a composite",
    sql: `SELECT * FROM pair_holder p, unnest(array_remove(p.dompairs, NULL)) x`,
    seed: SEED,
  },
  {
    id: "E6-array-agg-of-array",
    note: "array_agg of an ARRAY: the result is one dimension deeper",
    sql: `SELECT * FROM unnest((SELECT array_agg(q.rows) FROM trow_holder q)) x`,
    seed: SEED,
  },
  {
    id: "E7-computed-derived-column",
    note: "a derived-table column the inner query COMPUTES",
    sql: `WITH x AS (SELECT ARRAY[h.row1] AS arr FROM trow_holder h)
          SELECT * FROM x, unnest(x.arr) y`,
    seed: SEED,
  },
  {
    id: "E8-derived-column-name-collision",
    note: "the derived column's NAME collides with a base column of another table",
    sql: `WITH x AS (SELECT ARRAY[1, 2] AS pairs FROM t)
          SELECT * FROM x, unnest(x.pairs) y`,
    seed: SEED,
  },
  {
    id: "E9-scalar-sublink-element",
    note: "the sublink path",
    sql: `SELECT * FROM unnest((SELECT p.pairs FROM pair_holder p LIMIT 1)) x`,
    seed: SEED,
  },
  {
    id: "E10-array-cat-mixed-composite-scalar",
    note: "signatures disagreeing over composite vs scalar",
    sql: `SELECT * FROM unnest(array_cat(ARRAY[ROW('a',1)::sku_pair], NULL)) x`,
  },
  // --- F ---------------------------------------------------------------
  {
    id: "F1-merge-do-nothing-arm",
    note: "a DO NOTHING arm produces no row, so merge_action has none to name",
    sql: `MERGE INTO tags g USING (VALUES (1, 'tag')) AS s(id, name) ON g.id = s.id
          WHEN MATCHED THEN DO NOTHING
          WHEN NOT MATCHED THEN INSERT (name) VALUES (s.name)
          RETURNING merge_action() AS act, g.id`,
    seed: SEED,
  },
  {
    id: "F2-merge-not-matched-by-source",
    note: "NOT MATCHED BY SOURCE with a RETURNING that names the source",
    sql: `MERGE INTO tags g USING (VALUES (99, 'zz')) AS s(id, name) ON g.id = s.id
          WHEN NOT MATCHED BY SOURCE THEN DELETE
          WHEN NOT MATCHED THEN INSERT (name) VALUES (s.name)
          RETURNING merge_action() AS act, s.name AS sname, g.id`,
    seed: SEED,
  },
  {
    id: "F3-merge-inside-cte",
    note: "a MERGE in a CTE, its RETURNING lifted through a LEFT JOIN",
    sql: `WITH m AS (
            MERGE INTO tags g USING (VALUES (1, 'tag')) AS s(id, name) ON g.id = s.id
            WHEN MATCHED THEN UPDATE SET name = s.name
            RETURNING merge_action() AS act, g.id AS gid)
          SELECT c.id, m.act FROM customers c LEFT JOIN m ON m.gid = c.id`,
    seed: SEED,
  },
  // --- G ---------------------------------------------------------------
  {
    id: "G1-targetlist-srf-padding-domain",
    note: "the TARGET LIST twin of finding 1: does srfPaddedTargets clear the domain claim?",
    sql: `SELECT sw4_dom_rows(1) AS a, generate_series(1, 3) AS b, generate_series(1, 2) AS c`,
  },
  {
    id: "G2-targetlist-strict-srf-padding",
    note: "the same with a strict SRF handed NULL",
    sql: `SELECT sw4_dom_srf(NULL::integer) AS a, generate_series(1, 3) AS b, generate_series(1, 2) AS c`,
  },
  {
    id: "G3-rowsfrom-presence-group",
    note: "a padded ROWS FROM arm inside an optional join unit — do the group's discriminants hold?",
    sql: `SELECT o.id, x.a, x.b FROM orders o
          LEFT JOIN LATERAL ROWS FROM (sw4_tab_srf(o.id), generate_series(1, 3)) x ON true`,
    seed: SEED,
  },
  {
    id: "G4-strict-over-promoted-column",
    note: "a strict call whose argument is a column the presence fixpoint promoted",
    sql: `SELECT dom_strict(c.email) AS d FROM orders o LEFT JOIN customers c ON c.id = o.customer_id`,
    seed: SEED,
  },
  {
    id: "G5-strict-over-crossjoin-promoted",
    note: "the same argument, promoted through finding 2's hole",
    sql: `SELECT dom_strict(c.email) AS d FROM orders o
          LEFT JOIN (customers c CROSS JOIN tags g) ON c.id = o.customer_id`,
    seed: [SEED[0]!, SEED[1]!],
  },
  {
    id: "G6-unnest-of-defaulted-call",
    note: "unnest over a call whose element type comes through a defaulted argument",
    sql: `SELECT * FROM unnest(mk_pairs()) x`,
  },
];

await runProbes(probes);
