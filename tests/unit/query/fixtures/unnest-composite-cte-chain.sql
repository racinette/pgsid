-- A composite array staged through TWO CTEs. The re-export read followed a
-- CTE's target list to a base RELATION and stopped there, so a chain — a
-- CTE selecting from another CTE, which is what any query built up in
-- stages looks like — refused. It follows the chain now, with a seen-set so
-- a WITH RECURSIVE self-reference cannot loop.
WITH a AS (SELECT id, pairs FROM pair_holder),
     w AS (SELECT id, pairs FROM a)
SELECT * FROM w, unnest(w.pairs)
-- @notNull    (id)
-- @nullable   (pairs)
-- @nullable   (sku)
-- @nullable   (qty)
-- @unwitnessable 1: unnesting a NULL array produces no rows, so the column
--   being unnested is never observed NULL through this join.
