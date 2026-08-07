// Round 11 — the joins `scope.joins` could not see, and the promotions that
// must survive recording them.
//
// C11/C27/C9/C30 are the four routes into an unrecorded join. C31 is the
// control that already behaved (`ON TRUE` carries a qual, so the join WAS
// recorded and the INNER type refused the promotion). C23 is the second
// reading site, through `joinCannotExtendSide`. The rest are the promotions
// the fix must not cost: an ordinary key join, the USING synthesis, the
// join-level composition, and the FULL-FULL chain.
import { runProbes, type Probe } from "./harness.js";

const SEED = [
  `INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay')`,
  `INSERT INTO orders (id, customer_id, status, placed_at) VALUES (5, 1, 'new', now())`,
  `INSERT INTO shipments (id, order_id, carrier, shipped_at) VALUES (9, 5, 'ups', now())`,
  `INSERT INTO sw4_c (id, v) VALUES (1, 'x')`,
  `INSERT INTO sw4_r (rid, id, v) VALUES (1, 1, 'y')`,
  // `tags` and `sw4_none` deliberately left EMPTY — they are the emptiers.
];

const probes: Probe[] = [
  {
    id: "C11-crossjoin-referenced-side",
    note: "finding 2: a CROSS JOIN empties the referenced side",
    seed: SEED,
    sql: `SELECT c.id AS cid FROM orders o
          LEFT JOIN (customers c CROSS JOIN tags g) ON c.id = o.customer_id`,
  },
  {
    id: "C23-crossjoin-join-level",
    note: "the second site: the same through joinCannotExtendSide",
    seed: SEED,
    sql: `SELECT c.id AS cid FROM shipments s
          FULL JOIN (orders o FULL JOIN (customers c CROSS JOIN tags g) ON o.customer_id = c.id)
            ON s.order_id = o.id`,
  },
  {
    id: "C9-crossjoin-lateral-empty",
    note: "CROSS JOIN LATERAL over a subquery that returns nothing",
    seed: SEED,
    sql: `SELECT c.id AS cid FROM orders o
          LEFT JOIN (customers c CROSS JOIN LATERAL (SELECT 1 AS z WHERE false) q)
            ON c.id = o.customer_id`,
  },
  {
    id: "C30-natural-no-common-columns",
    note: "NATURAL JOIN with no common column names — a cross join in disguise",
    seed: SEED,
    sql: `SELECT c.id AS cid FROM orders o
          LEFT JOIN (customers c NATURAL JOIN sw4_none) ON c.id = o.customer_id`,
  },
  {
    id: "C31-on-true-control",
    note: "control: ON TRUE carries a qual, so this was always recorded and refused",
    seed: SEED,
    sql: `SELECT c.id AS cid FROM orders o
          LEFT JOIN (customers c JOIN tags g ON true) ON c.id = o.customer_id`,
  },
  {
    id: "P1-plain-key-promotion",
    note: "the promotion that must survive: an ordinary NOT NULL key join",
    seed: SEED,
    sql: `SELECT c.id AS cid FROM orders o LEFT JOIN customers c ON c.id = o.customer_id`,
  },
  {
    id: "P2-using-synthesis",
    note: "the USING synthesis must still promote (C5)",
    seed: SEED,
    sql: `SELECT c.id AS cid FROM sw4_r r LEFT JOIN sw4_c c USING (id)`,
  },
  {
    id: "P3-full-full-chain",
    note: "the join-level composition — customers recovered, orders correctly not",
    seed: SEED,
    sql: `SELECT c.id AS cid, o.id AS oid FROM shipments s
          FULL JOIN (orders o FULL JOIN customers c ON o.customer_id = c.id)
            ON s.order_id = o.id`,
  },
  {
    id: "P4-crossjoin-referencing-side",
    note: "an unrecorded CROSS JOIN in the REFERENCING side is genuinely harmless (C14/C24)",
    seed: SEED,
    sql: `SELECT c.id AS cid FROM (orders o CROSS JOIN tags g)
          LEFT JOIN customers c ON c.id = o.customer_id`,
  },
];

await runProbes(probes);
