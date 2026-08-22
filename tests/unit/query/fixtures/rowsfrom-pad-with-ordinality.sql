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
-- Two things survive the padding here for two DIFFERENT reasons, which is
-- what makes the pairing worth keeping: `ordinality` because it belongs to no
-- arm, and `generate_series` because its arm is the one the padding cannot
-- reach. The distinction the fixture was written for is untouched — a
-- clearance written as "this FROM item is padded" would still be wrong, and
-- now so would one written as "this item has two arms".
SELECT
  x.a,                  -- @nullable
  x.b,                  -- @nullable
  x.generate_series,    -- @notNull   (three rows against at most one)
  x.ordinality          -- @notNull   (generated per emitted row, padding or not)
FROM ROWS FROM (sw4_tab_srf(NULL::integer), generate_series(1, 3)) WITH ORDINALITY AS x
