-- The OVERSHOOT control for the padding: `WITH ORDINALITY`'s counter belongs
-- to the `ROWS FROM` as a whole, not to any one arm, so the padding does not
-- reach it.
--
--     a      | b      | generate_series | ordinality
--     -------+--------+-----------------+------------
--     (null) | (null) |               1 |          1
--     (null) | (null) |               2 |          2
--     (null) | (null) |               3 |          3
--
-- Every arm's columns are padded here and the counter is present on all three
-- rows, which is the whole distinction: a clearance written as "this item is
-- padded, clear its flags" must not be written as "this FROM item is padded".
-- @unwitnessable 2: generate_series is the LONGER arm and is never padded; a
--   builtin SRF's column is uniformly conservative
SELECT
  x.a,                  -- @nullable
  x.b,                  -- @nullable
  x.generate_series,    -- @nullable
  x.ordinality          -- @notNull   (generated per emitted row, padding or not)
FROM ROWS FROM (sw4_tab_srf(NULL::integer), generate_series(1, 3)) WITH ORDINALITY AS x
