-- A join whose qual is never recorded is invisible to the subtree readings —
-- sweep-4 finding 2.
--
-- This is `fk-entail-referenced-not-preserved.sql`'s counterexample with the
-- INNER join replaced by a CROSS join. The reasoning that fixture pins is
-- right: the key says the match exists in the TABLE, and the join finds it
-- only if it is still in the SLICE. The cross join to an EMPTY `tags` empties
-- the referenced side, so every order is NULL-extended.
--
-- What could not see it was the data structure. `scope.joins` was built to
-- carry QUALS for the presence fixpoint, and a join was pushed onto it only
-- when it HAD one; the subtree readings arrived later, want the join TREE, and
-- inherited that filter. A side containing an unrecorded join read as a leaf
-- that drops nothing.
--
-- Four routes in, all measured: CROSS JOIN, a comma join, CROSS JOIN LATERAL
-- over a subquery returning nothing, and a NATURAL JOIN sharing no column
-- name. Every join is recorded now, with its qual as the optional part.
--
-- `tags` is empty in every data state, so this is witnessed throughout.
SELECT
  c.id AS cid   -- @nullable  (the cross join to an empty relation empties the side)
FROM orders o
LEFT JOIN (customers c CROSS JOIN tags g) ON c.id = o.customer_id
