-- The control for check-no-inherit-tree.sql: `FROM ONLY ni_p` stays in the
-- named relation, whose own rows DO satisfy its NO INHERIT constraint, so
-- the full CHECK list applies and `CHECK (x IS NOT NULL)` still derives
-- x's notNull — the same scanInh split entryColumnNotNull draws for the
-- attnotnull flags. The generated parent rows keep x non-NULL by policy
-- (they must: the CHECK gates their INSERT).
SELECT
  p.id,  -- @notNull
  p.x    -- @notNull
FROM ONLY ni_p p
