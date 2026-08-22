-- The counted arm read as a CEILING rather than as a floor — the other half of
-- `generate_series` over constant bounds, and the only place in the set where
-- the series arm is the one that gets padded.
--
--     dom_lenient | generate_series
--     ------------+-----------------
--     d           |          (null)
--
-- `generate_series(3, 1)` runs BACKWARDS over a step of 1 and emits no rows at
-- all (measured), so the item's length is the scalar arm's single row and the
-- series column is padding on it. The NULL is witnessed on that row, which
-- makes this the one padding fixture whose nullable claim needs no argument.
--
-- Forgetting the count entirely — reading `generate_series` as an SRF of
-- unknown length, which is what every arm looked like before 2026-08-22 —
-- takes `dom_lenient` down with it, since an unknown ceiling covers every
-- floor. That is the assertion: a bound is load-bearing in both directions,
-- and the arm it saves here is not the arm that carries it.
SELECT
  x.dom_lenient,     -- @notNull
  x.generate_series  -- @nullable
FROM ROWS FROM (dom_lenient('a'), generate_series(3, 1)) AS x
