-- Parameters in VALUES and subqueries. ParamRef is conservative nullable.
-- VALUES column nullability is the AND across all rows for that position.
-- A literal fallback in the same column position makes it non-null.
--
-- A VALUES list in FROM has no target columns, so nothing here rejects NULL —
-- unlike the same VALUES under an INSERT (see param-insert-target).
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 nullable
SELECT
  v.a AS val_a,   -- @nullable
  v.b AS val_b,   -- @notNull
  v.c AS val_c    -- @nullable
FROM (VALUES
  ($1, 'default', $3),
  ($2, 'literal', NULL)
) v(a, b, c)
