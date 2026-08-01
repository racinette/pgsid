-- ON CONFLICT DO UPDATE is a second producing path, and the written map
-- intersects over both: name is a literal on the insert path AND a literal
-- on the update path, so RETURNING name is notNull whichever path produced
-- the row. Under `sparse` (ck.1 seeded) the conflict fires and returns
-- 'upd'; under `empty` the plain insert returns 'nm' — both paths execute
-- across the suite's states, so the claim is falsified on either if wrong.
INSERT INTO ck (id, name) VALUES (1, 'nm')
ON CONFLICT (id) DO UPDATE SET name = 'upd'
RETURNING
  id AS c1,   -- @notNull
  name AS c2  -- @notNull
