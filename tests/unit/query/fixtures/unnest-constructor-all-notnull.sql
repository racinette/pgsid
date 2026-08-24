-- UNNEST OF A CONSTRUCTOR WHOSE EVERY ELEMENT IS NON-NULL.
--
-- The unnest column-value rung reads the array constructor's own elements —
-- but only concludes notNull when EVERY element is provably non-null, and the
-- existing unnest fixtures all carry a nullable element (that is what their
-- presence-group and shape claims are about). So the claiming direction of
-- "follows its array constructor's elements" was dark (rung-census.test.ts).
-- Two literals settle it: the value column of this unnest can never be NULL,
-- and PostgreSQL's rows agree on every execution.
SELECT g.e AS elem  -- @notNull
FROM unnest(ARRAY[1, 2]) AS g(e)
