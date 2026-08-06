-- One invariant rules three of these, and it is the fixture's own doing: the
-- UNION case returns TWO rows unless the review count is exactly 7, and two
-- rows raise. So a state that returns anything is a state where every product
-- has exactly seven reviews — `uniform` is the only one (measured; adding a
-- reviewless product makes every state raise).
-- @unwitnessable 2: HAVING filters only a count of five or less, which the
--   seven-review invariant above forbids wherever this fixture returns rows
-- @unwitnessable 5: the EXCEPT arm is empty only for a count of exactly 1,
--   which the same invariant forbids
-- @unwitnessable 7: `UNION SELECT 7` always supplies a row, so this subquery
--   can never be empty — structural, and independent of the data
-- @unwitnessable 8: the group is empty exactly for a product with no reviews,
--   and such a product makes the UNION case raise before any row is returned
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
