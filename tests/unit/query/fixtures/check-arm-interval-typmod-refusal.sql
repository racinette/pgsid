-- The typmodded DATETIME record, DOUBLE-HELD (measured 2026-08-24): read
-- at timestamp(3) the WHERE's .1234 would round to .123 and fit the
-- arm's ray exactly, while the query's comparison keeps full precision —
-- the t = .123 row satisfies the WHERE, took the ELSE arm, and its o
-- NULL is in the result. The route is held one gate UPSTREAM of the
-- read gate: the evaluator's closure rule refuses the typmodded datetime
-- cast, so the anchor questions never answer, and `litReadExactAt`'s
-- typmod bar stands second in line. A notNull here means both have
-- opened. The numeric twin is check-arm-interval-typmod-numeric.sql.
SELECT
  o -- @nullable
FROM caitt
WHERE t < '2020-01-01 00:00:00.1234'
