-- @null-groups none
-- @param-rejections none
-- bpchar equality ignores trailing blanks, so the WHERE selects the first
-- CHECK arm, which requires x to be NULL. The second arm never supplies a
-- non-NULL value for these rows.
SELECT
  b.x,  -- @alwaysNull
  b.k   -- @notNull
FROM bp2 b
WHERE b.k = 'a '
