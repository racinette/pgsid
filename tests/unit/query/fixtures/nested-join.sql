-- Nested joins: t INNER JOIN u LEFT JOIN v
SELECT
  t.id      AS c1,  -- @notNull
  u.email   AS c2,  -- @notNull
  v.amount  AS c3   -- @nullable
FROM t
  INNER JOIN u ON u.t_id = t.id
  LEFT JOIN v ON v.u_id = u.id
