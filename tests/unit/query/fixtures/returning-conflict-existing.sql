-- The intersection's negative: the update path does not SET name, so a
-- conflicting row returns the EXISTING name — sparse's seeded ck.1 has name
-- NULL, which witnesses the claim on the conflict path even though the
-- insert path writes a literal. The written map must not let one path's
-- literal speak for both.
INSERT INTO ck (id, name) VALUES (1, 'nm')
ON CONFLICT (id) DO UPDATE SET val = 'v2'
RETURNING
  id AS c1,   -- @notNull
  name AS c2  -- @nullable
