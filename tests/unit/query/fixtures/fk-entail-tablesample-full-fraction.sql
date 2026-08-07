-- The other side of the TABLESAMPLE refusal, and what it deliberately costs.
--
-- `BERNOULLI (100)` keeps every row, so this join does match and `c.id` is
-- non-null in fact. The engine refuses anyway: the flag records that the alias
-- stands for a SAMPLE, and the walk does not reason about which rows a
-- sampling fraction keeps — the same stance it takes on which rows a qual
-- keeps.
--
-- Recorded here rather than left implicit, because a fix that read the
-- fraction would look like an improvement and would be one shape away from
-- unsound: `BERNOULLI (99)` keeps every row in almost every execution.
-- @unwitnessable 0: the sample keeps all of them and the key guarantees the
--   match, so no state produces the NULL — a conservative claim, not a data
--   gap
SELECT
  c.id AS cid   -- @nullable  (conservative: the walk does not read the fraction)
FROM orders o
LEFT JOIN customers c TABLESAMPLE BERNOULLI (100) ON c.id = o.customer_id
