-- @unwitnessable 1: same as returning-insert: RETURNING reports the SET literal, the claim comes from the catalog
-- RETURNING: UPDATE — target table required
UPDATE t SET name = 'x' WHERE id = 1
RETURNING
  id    AS c1,  -- @notNull
  name  AS c2,  -- @nullable
  COALESCE(name, '') AS c3   -- @notNull
