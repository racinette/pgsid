-- EXISTS / NOT EXISTS / IN / = ANY / = ALL / ARRAY sublinks
SELECT
  EXISTS (SELECT 1 FROM t WHERE t.id = 5)      AS c1,  -- @notNull
  NOT EXISTS (SELECT 1 FROM t WHERE t.id = 5)  AS c2,  -- @notNull
  id IN (SELECT id FROM t)                     AS c3,  -- @notNull
  id = ANY (SELECT id FROM t)                  AS c4,  -- @notNull
  id = ALL (SELECT id FROM t)                  AS c5,  -- @notNull
  ARRAY (SELECT val FROM t)                    AS c6   -- @notNull
FROM t
