-- RETURNING: DELETE — target table required
DELETE FROM t WHERE id = 1
RETURNING
  id    AS c1,  -- @notNull
  name  AS c2   -- @nullable
