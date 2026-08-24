-- AN INSERT…SELECT…RETURNING BODY — the zero-row insert's verdict site.
--
-- An INSERT whose source is a SELECT can insert nothing, so its RETURNING
-- yields no row and the scalar call is NULL — a distinct verdict site from
-- the single-row VALUES form (which body-insert fixtures cover) and dark
-- until this fixture (rung-census.test.ts). fb_ins_sel's source is
-- `SELECT x WHERE x > 0`: a NULL or non-positive category inserts nothing,
-- and the seeded NULL categories witness the claim.
SELECT
  fb_ins_sel(p.category_id) AS logged,  -- @nullable
  p.id                      AS pid      -- @notNull
FROM products p
