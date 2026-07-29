-- RETURNING: INSERT — target table required
INSERT INTO t (id, name, active) VALUES (1, 'a', true)
RETURNING
  id    AS c1,  -- @notNull
  name  AS c2   -- @nullable
