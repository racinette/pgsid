-- Grouped optional keys: GROUP BY separates the NULL-extended rows into
-- their own (NULL, NULL) group, so the per-row group facts survive
-- aggregation — every output row's keys are one input slice's values,
-- NULL together exactly when it is the all-extended slice. Both keys
-- discriminate (NOT NULL given present). The originMode "keys" gate is
-- what admits them: only plain grouping keys stay bare. dense: orders
-- 2/4 unshipped form the NULL group (absent); shipments 1/2 form present
-- groups.
-- @null-group 0*,1*
SELECT
  s.id      AS sid,      -- @nullable
  s.carrier AS carrier,  -- @nullable
  count(*)  AS n         -- @notNull
FROM orders o
LEFT JOIN shipments s ON s.order_id = o.id
GROUP BY s.id, s.carrier
