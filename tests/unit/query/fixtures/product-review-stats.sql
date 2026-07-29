-- LEFT JOIN to a nullable-side table with aggregates.
-- count(*) is non-null even over zero matching rows. avg/max are nullable
-- (aggregates return NULL over zero rows, and the join side is optional).
SELECT
  p.id          AS product_id,   -- @notNull
  p.name        AS name,         -- @notNull
  count(r.id)   AS review_count, -- @notNull
  avg(r.rating) AS avg_rating,   -- @nullable
  max(r.rating) AS max_rating    -- @nullable
FROM products p
LEFT JOIN reviews r ON r.product_id = p.id
GROUP BY p.id, p.name
