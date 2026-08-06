-- `lower`/`upper` over an EMPTY range are NULL (measured), and the argument
-- is a NOT NULL column — so nothing about the call site rescues it. Both
-- names carry a total `(text)` form as well, and the walk dispatches
-- builtins by NAME, so the totality table's claim covered both meanings and
-- was falsifiable through the range one. Out of the table, on the same
-- criterion that removed `substring`: the total form is indistinguishable
-- from the NULL-capable one at name level.
-- Recovering the text meaning needs the ARGUMENT's type, which the builtin
-- rules deliberately do not read — recorded in the register as the path.
SELECT
  r.span                AS span,   -- @notNull
  lower(r.span)         AS lo,     -- @nullable
  upper(r.span)         AS hi      -- @nullable
FROM rng r
