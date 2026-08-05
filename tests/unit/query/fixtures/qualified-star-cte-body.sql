-- The schema-qualified star inside a CTE body, re-exported by an
-- unqualified star. The CTE's own column list is what the outer `*`
-- expands, so a wrong inner shape propagates outward with every later
-- position shifted — the placement that turns finding 5's four-for-nine
-- into the whole statement's contract.
WITH w AS (
  SELECT public.t.*
  FROM u, t
)
SELECT * FROM w
-- @notNull    (id)
-- @nullable   (name)
-- @nullable   (val)
-- @notNull    (active)
