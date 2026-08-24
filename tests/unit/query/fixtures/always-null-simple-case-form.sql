-- The simple-form gate on `alwaysNullExpr`'s arm pruning (added with the
-- pruning itself, 2026-08-25). In `CASE x WHEN v THEN …` the WHEN slot
-- holds a VALUE, not a predicate — but it is an expression in the same
-- AST position a searched CASE puts its guard, and the kernel reads a
-- bare `false` there as FALSE and would prune the arm. That is exactly
-- backwards: `CASE has_duration WHEN false …` fires its arm when
-- has_duration IS false.
--
-- Without the gate the engine claims @alwaysNull here; the null policy
-- rotates has_duration by row index, so the false rows come back holding
-- 'a' and PostgreSQL falsifies it. With the gate the ELSE stays
-- reachable and the true rows witness the NULL.
SELECT
  CASE has_duration WHEN false THEN 'a' ELSE NULL END AS arm_or_else -- @nullable
FROM evg
WHERE status >= 1
