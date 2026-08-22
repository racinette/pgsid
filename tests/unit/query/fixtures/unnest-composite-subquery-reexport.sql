-- The subquery spelling of the same re-export (adversarial-3 finding 3),
-- which failed for the same reason and must now agree with the CTE one:
-- the two branches of the fix are one code path, and the fixture pair
-- holds them to it.
SELECT * FROM (SELECT id, pairs FROM pair_holder) s, unnest(s.pairs)
-- @notNull    (id)
-- @notNull    (pairs: the strict SRF filters its own argument)
-- @nullable   (sku)
-- @nullable   (qty)
