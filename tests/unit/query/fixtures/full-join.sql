-- FULL JOIN: both sides optional
SELECT
  t.id    AS c1,  -- 
  u.email AS c2   -- 
FROM t FULL JOIN u ON u.t_id = t.id
