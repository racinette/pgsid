-- A data-modifying CTE's RETURNING groups lift through the reference
-- like any subquery's: analyzeReturning stores them under the statement
-- key, and the outer bare projection translates. Same deterministic
-- pairing as presence-group-delete-using: dense tag 1 pairs with
-- unshipped order 2 (absent arm), tag 2 with shipped order 3 (present).
-- The delete rolls back with the fixture's transaction.
-- @null-group 1*,2*
WITH removed AS (
  DELETE FROM product_tags
  USING orders o
  LEFT JOIN shipments s ON s.order_id = o.id
  WHERE product_tags.tag_id + 1 = o.id
  RETURNING product_tags.tag_id, s.id AS sid, s.carrier
)
SELECT
  r.tag_id,    -- @notNull
  r.sid,       -- @nullable
  r.carrier    -- @nullable
FROM removed r
