-- The discovery instrument's first parameter conviction (2026-08-11, 36
-- instances in 5,000 queries): a multi-assignment routes each source
-- expression into its target column, and the collector attributed nothing
-- through MultiAssignRef — $2, assigned into slug (NOT NULL), read as
-- nullable while binding NULL raised the not-null violation. $1 into the
-- nullable parent_id is the same shape with no rejection channel, which is
-- what keeps the fix from over-claiming. The parameters are typed by their
-- casts, not by the target columns, so even a domain target would reject at
-- execution time here — the claim licenses no narrowing.
-- @args [null, "cat-1"]
-- @param 1 nullable
-- @param 2 notNull
UPDATE categories SET (parent_id, slug) = (SELECT $1::int, $2::text)
WHERE categories.slug = 'cat-1'
RETURNING
  categories.id   AS r_id,  -- @notNull
  categories.slug AS r_slug -- @notNull
