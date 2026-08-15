-- The point shape: CHECK (p = 5) is notFALSE per stored row, so p is 5 or
-- NULL — rays that miss the point never fire their arm, in either
-- direction. The guard column's ray CONTAINS the point: p = 5 is a
-- conforming row whose arm fires, the witness the boundary needs.
SELECT
  CASE WHEN t.p > 7 THEN NULL ELSE 5 END AS ray_above,   -- @notNull
  CASE WHEN t.p < 3 THEN NULL ELSE 5 END AS ray_below,   -- @notNull
  CASE WHEN t.p >= 5 THEN NULL ELSE 5 END AS ray_holds   -- @nullable
FROM ivp t
