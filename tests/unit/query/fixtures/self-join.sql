-- Self-join: same table with different aliases
SELECT
  a.id    AS c1,  -- @notNull
  b.name  AS c2   -- @nullable
FROM t a INNER JOIN t b ON a.id = b.id
