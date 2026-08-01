-- The branch-guard analogue of where-promotion-strict-closure: the CASE
-- condition can only be TRUE when c.name is non-null (length is strict), so
-- the THEN branch sees a non-null name and the ELSE is a literal — the exact
-- example the known-imprecisions register carried for "branch guards
-- pattern-matched, not solved".
SELECT
  c.id AS cid,                                                    -- @notNull
  CASE WHEN length(c.name) > 0 THEN c.name ELSE 'anon' END AS label  -- @notNull
FROM customers c
