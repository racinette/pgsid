-- WHERE: OR clause — no promotion, u stays optional
SELECT
  t.id    AS c1,  -- 
  u.email AS c2   -- 
FROM t LEFT JOIN u ON u.t_id = t.id
WHERE u.email IS NOT NULL OR t.name IS NOT NULL
