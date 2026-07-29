-- LEFT JOIN: right side optional (nullable), left side required
SELECT
  t.id    AS c1,  -- 
  t.name  AS c2,  -- 
  u.email AS c3   -- 
FROM t LEFT JOIN u ON u.t_id = t.id
