-- The schema-qualified star under a JOIN rather than a flat from-list:
-- the join tree registers its aliases through a different path, and the
-- shape fix must find the relation there too. Inner join, so t's row is
-- present in every emitted row and both catalog-NOT NULL columns keep
-- their claims — the placement that would have masked the defect by
-- ARITY (nine columns for four is loud) but not by NAME.
SELECT public.t.*
FROM u JOIN t ON u.t_id = t.id
-- @notNull    (id)
-- @nullable   (name)
-- @nullable   (val)
-- @notNull    (active)
