-- The two ways a witnessing item can be non-empty for a reason that is not
-- the restriction. Everything else the item may do only REMOVES rows, which
-- drops the outer row and makes the witness vacuous rather than wrong — so
-- these two are the only gates the producing side carries.
--
-- `w` unions a bare constant, so it is non-empty whatever the scan found.
-- `w2` reaches the same result through a disjunction: the second branch holds
-- for every item row, so the equality never had to.
--
-- Both keep order 4 — which has no items — and its group is missing, so both
-- columns are NULL in `dense`.
SELECT
  o.id      AS order_id,  -- @notNull
  setop.n   AS setop_n,   -- @nullable
  disj.n    AS disj_n     -- @nullable
FROM orders o

CROSS JOIN LATERAL (
  SELECT 1 AS one FROM order_items oi WHERE oi.order_id = o.id
  UNION SELECT 1
) w

CROSS JOIN LATERAL (
  SELECT 1 AS one FROM order_items oi9 WHERE oi9.order_id = o.id OR oi9.id > 0
) w2

LEFT JOIN (
  SELECT oi2.order_id AS k, count(*) AS n FROM order_items oi2 GROUP BY oi2.order_id
) setop ON setop.k = o.id

LEFT JOIN (
  SELECT oi3.order_id AS k, count(*) AS n FROM order_items oi3 GROUP BY oi3.order_id
) disj ON disj.k = o.id
