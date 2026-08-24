-- The one set operation that cannot empty itself.
--
-- `UNION SELECT 7` supplies a row whatever the left branch counts, so the
-- subquery is never zero-row and the inner claim propagates outward. Its
-- neighbours in `scalar-subquery-zero-row-guards.sql` are the other half of
-- the same fact: EXCEPT and INTERSECT can delete every row they were given,
-- so they stay nullable.
--
-- This lives in its own file because it RAISES. Two rows come back for every
-- product whose review count is not 7, and while this sat in the guards' SELECT
-- list that raise took three neighbouring columns' witnesses with it — the
-- claims were correct and simply never executed. `uniform` is the data state
-- built for the seven, and it is the only one this file returns rows under.
--
-- The three columns after it separate the two questions a set operation
-- answers. `union_agreeing` is the row count alone: no relation, no aggregate,
-- non-null only because a branch guarantees the row. `union_null_both` fires
-- the same rule and is still NULL, because what the row CONTAINS is the AND
-- across branches — a guaranteed row is not a guaranteed value. And the last
-- two are the rejected operators at identical shape: same constants, one
-- keyword different, zero rows, NULL.
SELECT
  p.id                                            AS product_id,       -- @notNull

  (
    SELECT count(*) FROM reviews r WHERE r.product_id = p.id
    UNION SELECT 7
  )                                               AS union_count,      -- @notNull

  -- Row count only: both branches are FROM-less, and they agree, so the
  -- deduplication that makes UNION lossy leaves exactly the one row.
  (SELECT 7::bigint UNION SELECT 7::bigint)       AS union_agreeing,   -- @notNull

  -- Same rule, same guaranteed row, and NULL anyway. This read @nullable
  -- until 2026-08-24, with a note saying the alwaysNull channel needed both
  -- branches to claim it — true of the SYMBOLIC channel, and beside the point
  -- for a body with no relation in it. The whole sublink is a closed subtree,
  -- the statement map already held its NULL, and the channel simply was not
  -- reading the map in that direction. The three below flipped with it.
  (SELECT NULL::bigint UNION SELECT NULL::bigint) AS union_null_both,  -- @alwaysNull

  -- EXCEPT deletes the row it was given.
  (SELECT 7::bigint EXCEPT SELECT 7::bigint)      AS except_empties,   -- @alwaysNull

  -- INTERSECT keeps only what both branches hold, which here is nothing.
  (SELECT 7::bigint INTERSECT SELECT 8::bigint)   AS intersect_empties, -- @alwaysNull

  -- LIMIT sits on the set-operation node and takes the row back off after
  -- the union produced it. The branch still guarantees its row; the node
  -- does not, which is why the guard is on the node and not inside a branch.
  (
    SELECT 7::bigint UNION SELECT 7::bigint LIMIT 0
  )                                               AS union_limited,    -- @nullable

  -- `A UNION B UNION C` nests to the LEFT, so here the only branch that
  -- guarantees a row is buried one level down and the outer node's own two
  -- branches settle nothing. Reading it needs the recursive step; without it
  -- this column is nullable and PostgreSQL still always answers 7.
  (
    SELECT 7::bigint
    UNION SELECT p2.id::bigint FROM products p2 WHERE false
    UNION SELECT p3.id::bigint FROM products p3 WHERE false
  )                                               AS union_nested_arm -- @notNull
FROM products p
