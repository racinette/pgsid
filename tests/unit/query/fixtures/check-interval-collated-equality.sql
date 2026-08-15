-- The equality arm under an EXPLICIT collation: ivstxeq's column says
-- COLLATE "C" — order anchors are refused (collation identity fails) but
-- equality transfers, because every deterministic collation's equality is
-- byte equality. CHECK (s = 'alpha') is notFALSE per stored row, the '='
-- question answers false for 'beta', the anchor relation is `ne`, and the
-- point misses the point. The own-point guard fires on every planted
-- 'alpha' row — the boundary the `ne` relation must not cross.
SELECT
  CASE WHEN t.s = 'beta'  THEN NULL ELSE 5 END AS other_point, -- @notNull
  CASE WHEN t.s = 'alpha' THEN NULL ELSE 5 END AS own_point    -- @nullable
FROM ivstxeq t
