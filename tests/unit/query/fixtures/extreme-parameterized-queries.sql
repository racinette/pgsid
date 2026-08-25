-- Parameterized queries ($1, $2, $3) in multiple contexts.
-- ParamRef is conservative nullable (no PREPARE type info).
-- Tests: params in SELECT, WHERE, function args, subqueries, COALESCE, CASE.
--
-- $1 is used both as text and as `$1::integer`, so it is bound to a numeric
-- string. $2 selects the customer the query is about; NULL there makes the
-- WHERE false and the fixture asserts nothing.
-- @args ["10", 1, 1]
-- @args [null, 1, 1]
-- Every use is a comparison, a cast to a base type, or a text-typed function
-- argument — none rejects NULL.
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 nullable
SELECT
  $1                                    AS direct_param,       -- @nullable
  COALESCE($1, 'fallback')              AS coalesced_param,     -- @notNull
  lower_strict($1)                       AS strict_with_param,  -- @nullable
  COALESCE(lower_strict($1), 'x')       AS strict_coalesced,    -- @notNull
  $1::integer                           AS cast_param,           -- @nullable
  CASE WHEN $1 IS NULL THEN 'empty' ELSE 'val' END AS case_param,  -- @notNull
  (SELECT count(*) FROM orders WHERE customer_id = $2) AS order_count,  -- @notNull
  COALESCE((SELECT max(rating) FROM reviews WHERE product_id = $3), 0) AS max_rating  -- @notNull
FROM customers c
WHERE c.id = $2
