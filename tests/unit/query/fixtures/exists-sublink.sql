-- EXISTS / NOT EXISTS / IN / = ANY / = ALL / ARRAY sublinks
SELECT
  EXISTS (SELECT 1 FROM t WHERE t.id = 5)      AS c1,  -- 
  NOT EXISTS (SELECT 1 FROM t WHERE t.id = 5)  AS c2,  -- 
  id IN (SELECT id FROM t)                     AS c3,  -- 
  id = ANY (SELECT id FROM t)                  AS c4,  -- 
  id = ALL (SELECT id FROM t)                  AS c5,  -- 
  ARRAY (SELECT val FROM t)                    AS c6   -- 
FROM t
