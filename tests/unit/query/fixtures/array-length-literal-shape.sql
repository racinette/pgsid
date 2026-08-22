-- `array_length` is excluded from the totality tables and correctly so — it is
-- NULL for an EMPTY array and for a dimension the array does not have. Both
-- causes are SHAPE, and a literal `ARRAY[...]` constructor settles both, which
-- the walk did not ask until 2026-08-22.
--
-- The three columns are the rule and its two refusals, measured:
--
--     array_length(ARRAY[1,2], 1)         -> 2
--     array_length(ARRAY[]::int[], 1)     -> NULL
--     array_length(ARRAY[1], 2)           -> NULL
--     array_length(ARRAY[NULL::int], 1)   -> 1
--
-- The last line is why no operand walk enters the rule: the ELEMENTS' nullness
-- is not this function's question, only how many there are. `len` below is
-- built from `p.id` twice for exactly that reason — the claim would be the
-- same over a nullable column.
--
-- Both refusals are witnessed on every row, so the two nullable claims have
-- NULLs behind them rather than an argument.
SELECT
  array_length(ARRAY[p.id, p.id], 1) AS len,       -- @notNull
  array_length(ARRAY[]::int[], 1)    AS empty_arr, -- @nullable
  array_length(ARRAY[p.id], 2)       AS no_dim     -- @nullable
FROM products p
