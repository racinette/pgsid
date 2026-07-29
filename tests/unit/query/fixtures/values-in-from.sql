-- VALUES in FROM with NULL and non-null literals.
-- Column nullability is the AND across all rows' expression at that position.
SELECT
  v.x AS x,   -- @notNull
  v.y AS y,   -- @nullable
  v.z AS z    -- @notNull
FROM (VALUES
  (1, NULL, 'a'),
  (2, 3,    'b'),
  (3, 4,    'c')
) v(x, y, z)
