-- A composite array staged through TWO CTEs. The re-export read followed a
-- CTE's target list to a base RELATION and stopped there, so a chain — a
-- CTE selecting from another CTE, which is what any query built up in
-- stages looks like — refused. It follows the chain now, with a seen-set so
-- a WITH RECURSIVE self-reference cannot loop.
WITH a AS (SELECT id, pairs FROM pair_holder),
     w AS (SELECT id, pairs FROM a)
SELECT * FROM w, unnest(w.pairs)
-- @notNull    (id)
-- @notNull    (pairs: the strict SRF filters its own argument — a NULL array
--              yields no rows and the comma join drops the h row)
-- @nullable   (sku)
-- @nullable   (qty)
