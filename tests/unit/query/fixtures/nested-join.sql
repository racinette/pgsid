-- Nested joins: t INNER JOIN u LEFT JOIN v
SELECT
  t.id      AS c1,  -- 
  u.email   AS c2,  -- 
  v.amount  AS c3   -- 
FROM t
  INNER JOIN u ON u.t_id = t.id
  LEFT JOIN v ON v.u_id = u.id
