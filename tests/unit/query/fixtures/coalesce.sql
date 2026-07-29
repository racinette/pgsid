-- COALESCE: with literal fallback → non-null; with two columns → nullable
SELECT
  COALESCE(t.val, '')        AS c1,  -- @notNull
  COALESCE(t.val, u.val)     AS c2,  -- @nullable
  COALESCE(t.val, u.val, '') AS c3   -- @notNull
FROM t LEFT JOIN u ON u.t_id = t.id
