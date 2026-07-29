-- INNER JOIN: both sides required
SELECT
  t.id    AS c1,  -- @notNull
  u.email AS c2   -- @notNull
FROM t INNER JOIN u ON u.t_id = t.id
