-- @unwitnessable 9: population statistics are outside the curated builtin tables (known imprecision); the group's quantities are non-null, so stddev_pop is always defined
-- @unwitnessable 10: ordered-set aggregate: the WITHIN GROUP argument is invisible to the argument check (known imprecision), and the group is never empty
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

  -- Sample statistics are undefined for a single-row group, so a non-empty
  -- group is not sufficient.
  stddev_samp(oi.quantity)                           AS sd,            -- @nullable
  var_samp(oi.quantity)                              AS variance,      -- @nullable

  -- Population variants are defined for one row, but are not on the
  -- non-null-preserving list, so they stay conservative.
  stddev_pop(oi.quantity)                            AS sd_pop,        -- @nullable

  -- Ordered-set aggregates are not modelled: their WITHIN GROUP argument is
  -- not visible to the arg-nullability check.
  percentile_cont(0.5) WITHIN GROUP (ORDER BY oi.quantity)
                                                     AS median,        -- @nullable

  -- An aggregate over a nullable expression can see only NULLs.
  max(p.deleted_at)                                  AS last_deleted   -- @nullable
FROM order_items oi
JOIN products p ON p.id = oi.product_id
GROUP BY oi.order_id
