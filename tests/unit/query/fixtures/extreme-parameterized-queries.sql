-- Parameterized queries ($1, $2, $3) in multiple contexts.
-- ParamRef is conservative nullable (no PREPARE type info).
-- Tests: params in SELECT, WHERE, function args, subqueries, COALESCE, CASE.
SELECT
  $1                                    AS direct_param,       -- 
  COALESCE($1, 'fallback')              AS coalesced_param,     -- 
  lower_strict($1)                       AS strict_with_param,  -- 
  COALESCE(lower_strict($1), 'x')       AS strict_coalesced,    -- 
  $1::integer                           AS cast_param,           -- 
  CASE WHEN $1 IS NULL THEN 'empty' ELSE 'val' END AS case_param,  -- 
  (SELECT count(*) FROM orders WHERE customer_id = $2) AS order_count,  -- 
  COALESCE((SELECT max(rating) FROM reviews WHERE product_id = $3), 0) AS max_rating  -- 
FROM customers c
WHERE c.name = $2
