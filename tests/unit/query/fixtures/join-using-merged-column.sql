-- The merged column of a USING join is a distinct thing from either
-- constituent, and in a FULL JOIN it is strictly less nullable than both.
--
-- Every row of a full join has at least one side present, and the merged
-- column is drawn from whichever that is. So with both underlying columns
-- NOT NULL the merged column can never be NULL — even though each side's own
-- column goes NULL on the rows where that side is absent.
--
-- Per join type the merged column is non-null when:
--   INNER  either side's column is       LEFT   the left column is
--   RIGHT  the right column is           FULL   both columns are
SELECT
  id        AS merged_id,   -- @notNull
  p.id      AS product_id,  -- @nullable
  oi.id     AS item_id      -- @nullable
FROM products p FULL JOIN order_items oi USING (id)
