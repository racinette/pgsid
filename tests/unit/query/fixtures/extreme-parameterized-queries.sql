-- Parameterized queries ($1, $2, $3) in multiple contexts.
-- ParamRef is conservative nullable (no PREPARE type info).
-- Tests: params in SELECT, WHERE, function args, subqueries, COALESCE, CASE.
SELECT
  $1                                    AS direct_param,       -- @nullable
  COALESCE($1, 'fallback')              AS coalesced_param,     -- @notNull
  lower_strict($1)                       AS strict_with_param,  -- @nullable
  COALESCE(lower_strict($1), 'x')       AS strict_coalesced,    -- @notNull
  $1::integer                           AS cast_param,           -- @nullable
  CASE WHEN $1 IS NULL THEN 'empty' ELSE 'val' END AS case_param,  -- @nullable
  (SELECT count(*) FROM orders WHERE customer_id = $2) AS order_count,  -- @notNull
  COALESCE((SELECT max(rating) FROM reviews WHERE product_id = $3), 0) AS max_rating  -- @notNull
FROM customers c
WHERE c.name = $2
