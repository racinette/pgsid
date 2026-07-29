-- RIGHT JOIN: left side optional, right side required
SELECT
  t.id    AS c1,  -- 
  u.email AS c2   -- 
FROM t RIGHT JOIN u ON u.t_id = t.id
