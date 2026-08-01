-- RETURNING: INSERT — target table required, and the WRITTEN value now
-- carries: name receives a literal on the only path that can produce a
-- returned row, so it is notNull even though the catalog column is nullable
-- (the imprecision this fixture used to record, closed by Wave 3).
INSERT INTO t (id, name, active) VALUES (1, 'a', true)
RETURNING
  id    AS c1,  -- @notNull
  name  AS c2   -- @notNull
