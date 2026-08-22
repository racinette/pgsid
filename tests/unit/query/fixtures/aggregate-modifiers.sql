-- Aggregate modifiers and how each interacts with the non-empty-group rule.
--
-- A plain GROUP BY emits no empty groups, so an aggregate over a non-null
-- expression is non-null. FILTER breaks that — it can exclude every row of a
-- group. DISTINCT and ORDER BY inside the call do not.
--
-- order_items.quantity/unit_price are NOT NULL; reviews.comment is nullable.
SELECT
  oi.order_id                                        AS order_id,      -- @notNull

  -- DISTINCT and an intra-aggregate ORDER BY change which values are seen,
  -- not whether any are.
  string_agg(DISTINCT oi.product_id::text, ',' ORDER BY oi.product_id::text)
                                                     AS ids,           -- @notNull
  array_agg(oi.quantity ORDER BY oi.quantity DESC)   AS qtys,          -- @notNull

  -- count is never NULL, FILTER or not.
  count(*)                                           AS n,             -- @notNull
  count(*) FILTER (WHERE oi.quantity > 1)            AS n_filtered,    -- @notNull

  -- Any other aggregate with a FILTER can see an empty group.
  sum(oi.quantity) FILTER (WHERE oi.quantity > 1)    AS sum_filtered,  -- @nullable
  array_agg(oi.quantity) FILTER (WHERE false)        AS agg_filtered,  -- @nullable

  -- Sample statistics divide by `n - 1` and are undefined for a single-row
  -- group, so a non-empty group is not sufficient.
  stddev_samp(oi.quantity)                           AS sd,            -- @nullable
  var_samp(oi.quantity)                              AS variance,      -- @nullable

  -- The POPULATION variant divides by `n` and is defined at one row. It sat
  -- outside the non-null-preserving table until 2026-08-22, on a comment that
  -- said the whole statistical family was undefined for a single row — six of
  -- the twelve are not, and the family was re-measured at once rather than one
  -- name at a time. The pair above and this line are the same call, one
  -- estimator apart.
  stddev_pop(oi.quantity)                            AS sd_pop,        -- @notNull

  -- Ordered-set aggregates follow the plain-aggregate gates with the WITHIN
  -- GROUP sort expression visible: non-empty group (plain GROUP BY),
  -- non-null sort input (quantity is NOT NULL), non-null fraction.
  percentile_cont(0.5) WITHIN GROUP (ORDER BY oi.quantity)
                                                     AS median,        -- @notNull

  -- An aggregate over a nullable expression can see only NULLs.
  max(p.deleted_at)                                  AS last_deleted   -- @nullable
FROM order_items oi
JOIN products p ON p.id = oi.product_id
GROUP BY oi.order_id
