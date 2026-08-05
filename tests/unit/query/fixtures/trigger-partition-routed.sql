-- Tuple routing fires the PARTITION's BEFORE ROW trigger: the statement
-- names trig_part, the row lands in trig_part_1, and its trigger rewrites
-- NEW — nulling the written a and rescuing a NULL b (both measured). The
-- hooks therefore answer for the relation SET (writeRewritesTree): the
-- written-value map is void, so a stays nullable, witnessed on every
-- returned row — and mechanism B makes no claim for $1, whose NULL
-- binding the rescue lets through (the second binding exercises exactly
-- that). Catalog flags survive: the stored row still passes the parent's
-- constraints, which partitions provably carry.
-- @args ["bee"]
-- @args [null]
-- @param 1 nullable
INSERT INTO trig_part (id, a, b) VALUES (7, 'x', $1)
RETURNING
  id,  -- @notNull
  a,   -- @nullable
  b    -- @notNull
