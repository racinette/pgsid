-- The float family under NaN: the generator plants 'NaN' rows, which
-- SATISFY CHECK (f > 5) — btree order sorts NaN above everything
-- (measured, pinned in param-mechanism.test.ts) — and fail `f <= 3` with
-- every other conforming value. The claim survives the strangest row the
-- type has, because the anchor question answers under PostgreSQL's own
-- order, not IEEE's.
SELECT
  CASE WHEN t.f <= 3 THEN NULL ELSE 5 END AS ray_gap,     -- @notNull
  CASE WHEN t.f <= 6 THEN NULL ELSE 5 END AS ray_overlap  -- @nullable
FROM ivf t
