-- @unwitnessable 6: any returned row proves $2 passed the BETWEEN filter, so the projected parameter is non-null on every row: the output-narrowing fact deferred in docs/argument-nullability.md
-- @unwitnessable 8: same as $2: $3 must be non-null for any row to pass the BETWEEN
-- Extreme fixture: parameterized query with params in every possible
-- position — SELECT, WHERE, JOIN ON, subquery, function args, CASE,
-- COALESCE, VALUES, ORDER BY, aggregate filter, and window partition.
--
-- ParamRef is conservative nullable (no PREPARE type info). This fixture
-- verifies that params combined with COALESCE, strict functions, CASE,
-- and subqueries produce the correct nullability.
--
-- $1 = customer email filter, $2 = min price, $3 = max price,
-- $4 = category id, $5 = min rating, $6 = search term, $7 = limit
--
-- $2 and $3 bound the price range and $7 the row count, so all three carry
-- values in every binding: NULL in any of them makes the WHERE false and the
-- fixture asserts nothing. $4, $5 and $6 are each guarded by an `OR $n IS NULL`
-- disjunct and so are exercised both ways.
-- @args ["a@b.c", 0, 10000, null, null, null, 10]
-- @args [null, 0, 10000, null, 1, "%", 10]
-- No parameter position here rejects NULL: comparisons and base-type casts
-- throughout, and the only functions touched take plain text.
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 nullable
-- @param 4 nullable
-- @param 5 nullable
-- @param 6 nullable
-- @param 7 nullable

SELECT
  p.id                                      AS product_id,       -- @notNull
  p.name                                    AS product_name,     -- @notNull
  p.sku                                     AS sku,              -- @notNull
  p.price                                   AS price,            -- @notNull
  $1                                        AS param_email,      -- @nullable
  COALESCE($1, 'default@example.com')       AS safe_email,      -- @notNull
  $2::numeric                               AS min_price_param,  -- @nullable
  COALESCE($2::numeric, 0)                  AS safe_min_price,  -- @notNull
  $3::numeric                               AS max_price_param,  -- @nullable
  COALESCE($3::numeric, 999999)             AS safe_max_price,  -- @notNull
  lower_strict($6)                          AS lower_search,    -- @nullable
  COALESCE(lower_strict($6), 'no search')   AS safe_search,     -- @notNull
  $4::integer                               AS category_param,  -- @nullable
  COALESCE($4::integer, 0)                  AS safe_category,   -- @notNull
  CASE
    WHEN p.price > $3::numeric THEN 'expensive'
    WHEN p.price < $2::numeric THEN 'cheap'
    ELSE 'fair'
  END                                       AS price_tier,      -- @notNull
  CASE
    WHEN $1 IS NULL THEN 'no filter'
    ELSE 'filtered'
  END                                       AS filter_status,   -- @notNull
  (
    SELECT count(*)
    FROM reviews r
    WHERE r.product_id = p.id
    AND r.rating >= $5::integer
  )                                         AS high_rating_count,  -- @notNull
  (
    SELECT COALESCE(avg(r.rating), 0)
    FROM reviews r
    WHERE r.product_id = p.id
  )                                         AS avg_rating,      -- @notNull
  COALESCE(
    (SELECT max(r.rating) FROM reviews r WHERE r.product_id = p.id),
    $5::integer
  )                                         AS best_or_param,   -- @nullable
  COALESCE(
    (SELECT min(r.rating) FROM reviews r WHERE r.product_id = p.id),
    0
  )                                         AS worst_rating,    -- @notNull
  count(r.id) FILTER (WHERE r.rating >= $5::integer) AS good_reviews,  -- @notNull
  count(r.id) FILTER (WHERE r.rating < $5::integer)  AS bad_reviews,   -- @notNull
  count(*) OVER (PARTITION BY p.category_id)         AS cat_product_count,  -- @notNull
  rank() OVER (
    PARTITION BY p.category_id
    ORDER BY p.price DESC
  )                                         AS price_rank,      -- @notNull
  count(*) OVER ()                          AS total_results,   -- @notNull
  COALESCE(
    lower_strict(p.name),
    $6
  )                                         AS name_or_search,  -- @notNull
  always_text($6)                           AS guaranteed_search,  -- @notNull
  concat_val(b => p.name, a => $6)          AS named_with_param,  -- @notNull
  concat_val(b => $1, a => p.name)          AS param_in_named,   -- @nullable
  ROW($1, $2, $3, $4, $5, $6)              AS param_row,       -- @notNull
  ARRAY[$1, $2::text, $3::text]            AS param_array,     -- @notNull
  EXISTS (
    SELECT 1 FROM order_items oi
    WHERE oi.product_id = p.id
    AND oi.quantity > $7::integer
  )                                         AS has_bulk_orders, -- @notNull
  NOT EXISTS (
    SELECT 1 FROM order_items oi
    WHERE oi.product_id = p.id
    AND oi.unit_price > $3::numeric
  )                                         AS within_budget,   -- @notNull
  COALESCE(
    (SELECT c.name FROM categories c WHERE c.id = p.category_id),
    $6
  )                                         AS category_or_search  -- @nullable
FROM products p
LEFT JOIN reviews r ON r.product_id = p.id
WHERE p.deleted_at IS NULL
  AND p.price BETWEEN $2::numeric AND $3::numeric
  AND (
    p.category_id = $4::integer
    OR $4 IS NULL
  )
  AND (
    EXISTS (
      SELECT 1 FROM reviews r2
      WHERE r2.product_id = p.id
      AND r2.rating >= $5::integer
    )
    OR $5 IS NULL
  )
  AND (
    lower_strict(p.name) LIKE COALESCE(lower_strict($6), '%%')
    OR $6 IS NULL
  )
GROUP BY p.id, p.name, p.sku, p.price, p.category_id
ORDER BY
  CASE WHEN $6 IS NOT NULL THEN p.name END,
  p.price DESC
LIMIT $7::integer
