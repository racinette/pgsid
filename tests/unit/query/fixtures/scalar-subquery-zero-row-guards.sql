-- Constructs that break a scalar subquery's single-row guarantee.
--
-- An ungrouped aggregate normally collapses any input, including zero rows,
-- to exactly one row — that is what lets a scalar subquery propagate the
-- inner column's nullability outward. Each subquery below defeats that
-- guarantee in a different way, so every column here must be nullable even
-- though the inner expression is a non-null count(*).
--
-- Each case is a proven counterexample: with a product that has no reviews,
-- PostgreSQL returns NULL for every one of these columns.
SELECT
  p.id                                      AS product_id,        -- @notNull

  -- Baseline: a plain ungrouped aggregate IS single-row.
  (
    SELECT count(*) FROM reviews r WHERE r.product_id = p.id
  )                                         AS baseline_count,    -- @notNull

  -- HAVING filters the single aggregate row away entirely.
  (
    SELECT count(*) FROM reviews r
    WHERE r.product_id = p.id
    HAVING count(*) > 5
  )                                         AS having_count,      -- @nullable

  -- OFFSET skips the single aggregate row.
  (
    SELECT count(*) FROM reviews r
    WHERE r.product_id = p.id
    OFFSET 1
  )                                         AS offset_count,      -- @nullable

  -- LIMIT can leave zero rows.
  (
    SELECT count(*) FROM reviews r
    WHERE r.product_id = p.id
    LIMIT 0
  )                                         AS limit_count,       -- @nullable

  -- EXCEPT can eliminate the aggregate row. A set-operation node carries no
  -- FROM clause of its own, so it must not be mistaken for a FROM-less
  -- (always-one-row) SELECT.
  (
    SELECT count(*) FROM reviews r WHERE r.product_id = p.id
    EXCEPT SELECT 1
  )                                         AS except_count,      -- @nullable

  -- INTERSECT likewise.
  (
    SELECT count(*) FROM reviews r WHERE r.product_id = p.id
    INTERSECT SELECT 999
  )                                         AS intersect_count,   -- @nullable

  -- UNION: row count unconstrained.
  (
    SELECT count(*) FROM reviews r WHERE r.product_id = p.id
    UNION SELECT 7
  )                                         AS union_count,       -- @nullable

  -- GROUP BY emits no row at all for a product with no reviews.
  (
    SELECT count(*) FROM reviews r
    WHERE r.product_id = p.id
    GROUP BY r.product_id
  )                                         AS grouped_count,     -- @nullable

  -- A FROM-less SELECT is one row only when nothing can filter it out.
  (SELECT 1 WHERE false)                    AS filtered_constant, -- @nullable
  (SELECT 1)                                AS bare_constant      -- @notNull
FROM products p
