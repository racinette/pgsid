-- Origins through UNION ALL (Wave 12, née residue-origin-setop): each
-- branch attributes the column, the alternative lists concatenate
-- positionally, and entailment proves EVERY alternative — both branches
-- are guest pass-throughs here, so both runs discharge the same CHECK.
WITH g AS (
  SELECT * FROM guest WHERE id < 100
  UNION ALL
  SELECT * FROM guest WHERE id >= 100
)
SELECT
  arrived_at   -- @notNull
FROM g
WHERE status = 'housed'
