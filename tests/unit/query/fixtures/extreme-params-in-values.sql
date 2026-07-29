-- Parameters in VALUES and subqueries. ParamRef is conservative nullable.
-- VALUES column nullability is the AND across all rows for that position.
-- A literal fallback in the same column position makes it non-null.
SELECT
  v.a AS val_a,   -- 
  v.b AS val_b,   -- 
  v.c AS val_c    -- 
FROM (VALUES
  ($1, 'default', $3),
  ($2, 'literal', NULL)
) v(a, b, c)
