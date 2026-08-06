-- Gate: the ON must be EXACTLY the key equality.
--
-- A further conjunct can only remove matches, and removing a match is exactly
-- the null-extension the entailment denies. `c.deleted_at IS NULL` is the
-- ordinary shape — a soft-delete filter moved into the join — and dense's
-- soft-deleted customer 4 witnesses the extension it produces.
SELECT
  o.id    AS order_id,       -- @notNull
  c.email AS customer_email  -- @nullable
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id AND c.deleted_at IS NULL
