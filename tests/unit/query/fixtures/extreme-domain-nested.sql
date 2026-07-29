-- Domain NOT NULL function returns in nested contexts: inside COALESCE,
-- inside CASE, in a subquery, and in a CTE. The NOT NULL domain return
-- (Priority 1) wins over everything, making the function result non-null
-- regardless of argument nullability. The CASE around it has an ELSE and
-- non-null branches, so it stays non-null too.
WITH domain_cte AS (
  SELECT
    p.id,
    CASE
      WHEN p.deleted_at IS NULL THEN COALESCE(always_text(p.name), 'active')
      ELSE 'archived'
    END AS status,
    COALESCE(
      always_positive(p.price),
      always_positive(0)
    ) AS safe_price,
    (
      SELECT always_text(p2.name)
      FROM products p2 WHERE p2.id = p.id
    ) AS subquery_val
  FROM products p
)
SELECT
  dc.id             AS product_id,   -- @notNull
  dc.status         AS status,      -- @notNull
  dc.safe_price     AS safe_price,  -- @notNull
  dc.subquery_val   AS subquery_val  -- @nullable
FROM domain_cte dc
