-- @unwitnessable 1: RETURNING reports the literal just written into name; nullability comes from the catalog, not the written value (known imprecision)
-- RETURNING: INSERT — target table required
INSERT INTO t (id, name, active) VALUES (1, 'a', true)
RETURNING
  id    AS c1,  -- @notNull
  name  AS c2   -- @nullable
