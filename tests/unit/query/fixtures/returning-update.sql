-- RETURNING: UPDATE — target table required. RETURNING reports the NEW
-- row, so a SET column's returned value IS its SET expression: the literal
-- makes name notNull (the imprecision this fixture used to record, closed
-- by Wave 3 — and the exact complement of update-set-mask, where the
-- written value is NULL and the WHERE guarantee must not survive).
UPDATE t SET name = 'x' WHERE id = 1
RETURNING
  id    AS c1,  -- @notNull
  name  AS c2,  -- @notNull
  COALESCE(name, '') AS c3   -- @notNull
