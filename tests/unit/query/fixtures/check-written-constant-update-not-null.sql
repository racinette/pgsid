-- @null-groups none
-- @param-rejections none
-- The mirror arm: changing housed to arrived preserves a non-NULL arrived_at,
-- and the written discriminator plus the validated CHECK proves that every
-- successfully returned NEW row carries a value.
UPDATE guest
SET status = 'arrived'
WHERE id = 2
RETURNING
  arrived_at, -- @notNull
  CASE WHEN arrived_at IS NOT NULL THEN 'yes' ELSE NULL END AS selected, -- @notNull
  CASE WHEN arrived_at IS NULL THEN 'yes' ELSE NULL END AS rejected -- @alwaysNull
