-- Self-join: same table with different aliases
SELECT
  a.id    AS c1,  -- 
  b.name  AS c2   -- 
FROM t a INNER JOIN t b ON a.id = b.id
