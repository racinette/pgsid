-- Branch guards as kernel evidence: the THEN branch runs only when its
-- condition is TRUE, which is the same row-implied strength as a WHERE
-- conjunct — so inside the branch, the CHECK CASE's WHEN condition is
-- discharged by the guard and arrived_at is non-null; the ELSE supplies
-- now(). Wave 6 fed guards to the promotion analyzer but not to the
-- entailment kernel; this pins the closure.
SELECT
  CASE WHEN status = 'arrived' OR status = 'housed'
       THEN arrived_at
       ELSE now() END AS reached_at   -- @notNull
FROM guest
