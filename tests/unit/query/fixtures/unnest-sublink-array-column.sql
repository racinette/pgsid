-- A scalar sublink as the unnest argument: its single output column is the
-- expression to type, and `pair_holder.pairs` is a base column the catalog
-- answers directly.
--
-- The predicate keeps the fixture live rather than being part of the reading —
-- typing a sublink's output looks at the target list, not at how many rows the
-- subquery returns. (A scalar sublink yielding several rows raises, which is
-- no counterexample to a shape.)
SELECT
  u.sku,   -- @nullable
  u.qty    -- @nullable
FROM unnest((SELECT h.pairs FROM pair_holder h WHERE h.pairs IS NOT NULL LIMIT 1)) u
