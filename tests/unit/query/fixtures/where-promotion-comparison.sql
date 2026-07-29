-- WHERE promotion: comparison (= 'active') promotes u
SELECT
  t.id       AS c1,  -- 
  u.status   AS c2   -- 
FROM t LEFT JOIN u ON u.t_id = t.id
WHERE u.status = 'active'
