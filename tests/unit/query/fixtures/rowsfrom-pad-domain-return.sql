-- `ROWS FROM` NULL-pads its shorter arms, and the DECLARED column reading has
-- to be clipped by that too — sweep-4 finding 1.
--
-- Three rows come back and only the first carries a value for `dom_lenient`:
--
--     dom_lenient | generate_series
--     ------------+-----------------
--     d           |               1
--     (null)      |               2
--     (null)      |               3
--
-- No seed data — the shape alone does it, over no tables at all.
--
-- The rule was already stated at the site and applied to ONE of the three
-- readings: `bodyReadable` gated the body reading, while the declared one — a
-- NOT NULL domain return, or a NOT NULL domain among the OUT/TABLE parameters
-- — was pushed unclipped on the coldeflist arm, the overload-consensus arm and
-- the single-candidate arm alike. It is clipped where the item's columns are
-- ASSEMBLED now, which is the same point the strict short-circuit is cleared
-- at and one line from where the rule was written down.
-- The clip is per-arm as of 2026-08-22, and this is the shape that shows the
-- difference in both directions at once. `dom_lenient` returns ONE VALUE, so
-- it contributes exactly one row; `generate_series(1, 3)` over constant
-- integer bounds contributes exactly three. Three covers one, so the series
-- arm cannot be padded and keeps its own reading — which is the whole table
-- above, read off the shape rather than off the seeds.
SELECT
  x.dom_lenient,        -- @nullable  (padded once the one-row arm has returned)
  x.generate_series     -- @notNull   (three rows against one — never padded)
FROM ROWS FROM (dom_lenient('a'), generate_series(1, 3)) AS x
