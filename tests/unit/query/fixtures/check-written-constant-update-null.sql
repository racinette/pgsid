-- @null-groups none
-- @param-rejections none
-- RETURNING reads the NEW row. The statement changes the discriminator from
-- checked-out to in-flight, and the validated CHECK then forces arrived_at
-- NULL even though that column was not itself written. Selecting by id keeps
-- the OLD-row predicate from proving the result independently.
UPDATE guest
SET status = 'in-flight'
WHERE id = 4
RETURNING
  arrived_at, -- @alwaysNull
  CASE WHEN arrived_at IS NULL THEN 'yes' ELSE NULL END AS selected, -- @notNull
  CASE WHEN arrived_at IS NOT NULL THEN 'yes' ELSE NULL END AS rejected -- @alwaysNull
