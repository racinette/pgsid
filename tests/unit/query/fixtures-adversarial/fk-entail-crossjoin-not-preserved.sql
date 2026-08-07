-- SWEEP-4 FINDING 2 (rank 1). Quarantined: `cid` below is the engine's
-- CURRENT claim and is WRONG.
--
-- Falsifying data:
--   INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay');
--   INSERT INTO orders (id, customer_id, status, placed_at)
--     VALUES (5, 1, 'new', now());
--   -- and `tags` left EMPTY.
-- Observed: one row, `cid` NULL.
--
-- This is `fk-entail-referenced-not-preserved.sql`'s counterexample with the
-- INNER join replaced by a CROSS join. The reasoning the fixture pins — the
-- key says the match exists in the TABLE, and the join finds it only if it is
-- still in the SLICE — is exactly what fails here: the cross join to an empty
-- `tags` empties the referenced side, so every order is NULL-extended.
--
-- `subtreePreserves` reads that off `scope.joins`, and a join is only pushed
-- there when it HAS a qual to record: `walkFromItem` calls `record(...)` from
-- `if (join.quals)` and from the USING/NATURAL synthesis, and a CROSS JOIN
-- (or `JOIN … ON TRUE`, or a comma join under a parenthesised side) has
-- neither. So the join is invisible to `subtreePreserves`,
-- `subtreeAlwaysPresent` and `joinWithin` alike, and a side containing one
-- reads as a leaf that drops nothing.
--
-- Recording the qual is what the presence fixpoint wants a qual FOR; what the
-- subtree readings want is the join's TYPE and its two alias sets, which
-- exist whether or not there is a qual to imply.
--
-- Suspected mechanism: nullability-walk.ts `walkFromItem` (the JoinExpr arm,
-- `record` reached only from `join.quals` / `usingNames`), read by
-- `subtreePreserves`.
--
-- Attack-catalog entry: C (join-level presence) — "anything that drops or
-- extends rows without being a join type". A CROSS JOIN is a join type and
-- still not one the walk can see.
SELECT
  c.id AS cid   -- @notNull   <- FALSE
FROM orders o
LEFT JOIN (customers c CROSS JOIN tags g) ON c.id = o.customer_id
