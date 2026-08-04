-- The USING resolution pin: a predicate's unqualified `id` DENOTES the
-- join's merged column — the only visible occurrence of the name, which is
-- what keeps the query legal — not either constituent, and a LEFT JOIN's
-- merged value is the LEFT side's. `WHERE id IS NOT NULL` therefore
-- restates t.id's catalog flag and says NOTHING about u. Name-only
-- matching once read it as a guarantee for `u.id` and overrode the
-- OPTIONAL join state — falsified by any t row without a match, whose u
-- side comes back NULL-extended as one unit.
SELECT
  t.id AS tid,   -- @notNull
  u.id AS uid,   -- @nullable
  u.email,       -- @nullable
  u.t_id         -- @nullable
FROM t LEFT JOIN u USING (id)
WHERE id IS NOT NULL
-- @null-group 1*,2*,3*
