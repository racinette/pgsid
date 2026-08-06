-- An aggregate over zero input rows is NULL whatever its declared return type
-- says. nn_agg returns `nn_text`, a NOT NULL domain, and there is no value for
-- that domain to be enforced on: with no row to transition, the final function
-- never runs and the result is NULL (measured). The predicate empties the
-- input in every data state, and an ungrouped aggregate still emits its one
-- row — which is the row that witnesses this.
SELECT
  nn_agg(t.name) AS a  -- @nullable
FROM t
WHERE t.id < 0
