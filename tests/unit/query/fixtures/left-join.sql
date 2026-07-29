-- LEFT JOIN: right side optional (nullable), left side required
SELECT
  t.id    AS c1,  -- @notNull
  t.name  AS c2,  -- @nullable
  u.email AS c3   -- @nullable
FROM t LEFT JOIN u ON u.t_id = t.id
