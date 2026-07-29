-- RETURNING: UPDATE — target table required
UPDATE t SET name = 'x' WHERE id = 1
RETURNING
  id    AS c1,  -- 
  name  AS c2,  -- 
  COALESCE(name, '') AS c3   -- 
