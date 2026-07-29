-- INNER JOIN: both sides required
SELECT
  t.id    AS c1,  -- 
  u.email AS c2   -- 
FROM t INNER JOIN u ON u.t_id = t.id
