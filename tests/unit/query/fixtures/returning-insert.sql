-- RETURNING: INSERT — target table required
INSERT INTO t (id, name) VALUES (1, 'a')
RETURNING
  id    AS c1,  -- @notNull
  name  AS c2   -- @nullable
