-- WHERE promotion: LEFT JOIN + WHERE u.col IS NOT NULL promotes u to required
SELECT
  t.id    AS c1,  -- 
  u.email AS c2   -- 
FROM t LEFT JOIN u ON u.t_id = t.id
WHERE u.email IS NOT NULL
