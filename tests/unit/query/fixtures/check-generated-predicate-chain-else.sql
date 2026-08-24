-- The alwaysNull direction on the CHECK-carrying table: status = 1 is
-- disjoint from [2,inf), so the only arm is refuted and the ELSE's NULL
-- is what every returned row holds — however thoroughly `has_duration`
-- pins the operand the arm would have read. The pin is deliberate: a
-- rule that concluded from the OPERANDS rather than from the ARM would
-- claim notNull here.
SELECT
  finished_at -- @alwaysNull
FROM evg
WHERE status = 1 AND has_duration
