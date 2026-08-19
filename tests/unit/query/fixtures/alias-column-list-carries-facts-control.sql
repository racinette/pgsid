-- The control for `alias-column-list-carries-facts.sql`: the identical four
-- claims, over the identical four mechanisms, with no rename anywhere.
--
-- Without it the pinned fixture proves only that the engine says notNull for
-- those columns, not that the RENAME is what it survives — a version of the
-- engine that guessed notNull for everything would pass one and fail this.
--
-- @planner-keeps 1: the LEFT JOIN settles by foreign-key entailment
--   (orders.customer_id, NOT NULL onto customers), and the planner does
--   not reason from keys.
SELECT
  s1.qty AS flag_col,             -- @notNull
  s1.discontinued_at AS check_col,  -- @notNull
  s2.weight_g AS generated_col,   -- @notNull
  s3.email AS fk_col              -- @notNull
FROM stock s1
CROSS JOIN shipment_tracking s2
CROSS JOIN orders o
LEFT JOIN customers s3 ON s3.id = o.customer_id
WHERE s1.qty <= 0
