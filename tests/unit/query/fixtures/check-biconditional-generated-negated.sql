-- The same conclusion off the NEGATED spelling: `status <> 'pending'`
-- refutes the pending disjunct by the negator relation rather than by
-- literal distinctness, and matches the survivor's own first conjunct
-- atom-for-atom. Two different routes to one fact, which is what makes
-- this worth a file beside its `=` sibling — a distinctness rung that
-- stopped working would leave this one green.
SELECT
  projected -- @notNull
FROM evb
WHERE status <> 'pending'
