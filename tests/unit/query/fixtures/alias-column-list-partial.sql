-- The list may be PARTIAL: PostgreSQL renames the columns it covers and
-- leaves the rest with their own names (measured). So the rename is a
-- positional overlay, not a replacement — reading it as "the item's columns
-- are exactly this list" would drop the two columns the list does not reach.
--
-- The control half of `alias-column-list-star.sql`: same relation, same star,
-- one name in the list. `order_id` and `amount` must come back under the
-- catalog's names and `id` must not.
SELECT *
  -- @notNull
  -- @notNull
  -- @notNull
FROM refunds_archive AS r(c0)
