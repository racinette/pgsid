-- The typmodded NUMERIC record, DOUBLE-HELD (measured 2026-08-24): the
-- anchor questions read literals at the full declared type, and at
-- numeric(3,1) the WHERE's '2.44' rounds to 2.4 — the evaluated
-- `2.4 = '2.44'` answers TRUE there — while the query keeps the literal
-- at full precision, so the a = 2.4 row satisfies `a < '2.44'`, took the
-- ELSE arm, and carries o NULL into the result. Two gates hold the
-- refusal: `litReadExactAt`'s typmod bar refuses the sval side, and its
-- fval whitelist refuses the arm's own anchor (a CHECK-side numeric
-- literal deparses as an fval, and "numeric(3,1)" is not "numeric").
-- Neither gate can be killed alone through this shape; a notNull here
-- means BOTH have opened.
SELECT
  o -- @nullable
FROM caitm
WHERE a < '2.44'
