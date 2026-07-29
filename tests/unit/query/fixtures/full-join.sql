-- FULL JOIN: both sides optional
SELECT
  t.id    AS c1,  -- @nullable
  u.email AS c2   -- @nullable
FROM t FULL JOIN u ON u.t_id = t.id
