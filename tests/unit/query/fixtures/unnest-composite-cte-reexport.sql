-- Staging a composite array through a WITH (adversarial-3 finding 3). The
-- ColumnRef arm needed `owner.table`, which a CTE entry does not have, so
-- this fell to one column — and the report's point about this spelling is
-- that it is not exotic: it is what any query that stages an array through
-- a CTE looks like. The walk follows the CTE's target list to the base
-- column it re-exports and reads the type from there; a CTE column the
-- inner query COMPUTES has no base column and refuses instead.
WITH w AS (SELECT id, pairs FROM pair_holder)
SELECT * FROM w, unnest(w.pairs)
-- @notNull    (id)
-- @nullable   (pairs)
-- @nullable   (sku)
-- @nullable   (qty)
-- @unwitnessable 1: unnesting a NULL array produces no rows, so the column
--   being unnested is never observed NULL through this join.
