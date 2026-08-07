-- The route into an unrecorded join that does not LOOK like one: a NATURAL
-- JOIN whose two sides share no column name is a cross join in disguise.
--
-- `sw4_none` has one column, `zz`, which nothing else carries. The merge
-- synthesises no equality, so the old code recorded nothing for this join at
-- all — and the reader could not tell it from a leaf.
--
-- The USING spelling has the same hole by construction, one step further in: a
-- merged name whose side has no concrete owning entry (an already-merged
-- column of a nested USING) skips its synthesis too. Both are structural
-- entries now.
--
-- `sw4_none` is empty in every state.
SELECT
  c.id AS cid   -- @nullable
FROM orders o
LEFT JOIN (customers c NATURAL JOIN sw4_none) ON c.id = o.customer_id
