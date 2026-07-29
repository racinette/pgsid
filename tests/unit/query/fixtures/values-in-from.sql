-- VALUES in FROM with NULL and non-null literals.
-- Column nullability is the AND across all rows' expression at that position.
SELECT
  v.x AS x,   -- 
  v.y AS y,   -- 
  v.z AS z    -- 
FROM (VALUES
  (1, NULL, 'a'),
  (2, 3,    'b'),
  (3, 4,    'c')
) v(x, y, z)
