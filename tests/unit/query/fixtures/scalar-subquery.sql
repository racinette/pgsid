-- Scalar subqueries (EXPR_SUBLINK)
--
-- The outer FROM is `products`, not `t`, and that is the whole reason these
-- claims have witnesses. While the outer query scanned the same table the
-- subqueries do, an empty `t` was exactly the state that produced the NULL
-- *and* exactly the state that returned no rows to see it in — the NULL
-- coincided with rowlessness and nothing could observe it. Decoupling the two
-- relations costs the fixture nothing: an uncorrelated scalar subquery reads
-- no outer column, so what the outer query scans was never part of the claim.
-- `dense` and `uniform` populate products and leave `t` empty, which is the
-- state that witnesses c1, c3 and c4 at once.
--
-- c3 aggregates `name` rather than `val` because an aggregate has a SECOND
-- route to NULL that c1's and c4's emptiness does not: max is NULL over a
-- non-empty input whose values are all NULL. That route needs `sparse`, whose
-- single t row has a NULL name and a non-NULL val. Over `val` this claim had
-- no witness at all and carried a reason that mistook it for c1's coincidence.
--
-- c1 still raises where `t` holds more than one row, so `generated` returns
-- nothing here. Two states witness what one has to.
SELECT
  (SELECT id FROM t)           AS c1,  -- @nullable
  (SELECT count(*) FROM t)     AS c2,  -- @notNull
  (SELECT max(name) FROM t)    AS c3,  -- @nullable
  (SELECT id FROM t LIMIT 1)   AS c4   -- @nullable
FROM products p
