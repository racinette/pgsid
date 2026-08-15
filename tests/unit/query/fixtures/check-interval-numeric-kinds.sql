-- Numeric anchors of different LITERAL KINDS: the CHECK's 5.5 is an fval
-- token, the guard's 5 an ival — token reasoning can never order them
-- (the multiwhen-numeric lesson), but the evaluated `5 <= 5.5` read at
-- numeric can, and (5.5, inf) misses (-inf, 5]. The overlap guard keeps
-- the boundary honest: (-inf, 6] reaches into (5.5, 6], where the
-- generator's n = 6 row fires the arm.
SELECT
  CASE WHEN t.n <= 5 THEN NULL ELSE 5 END AS kinds_order,   -- @notNull
  CASE WHEN t.n <= 6 THEN NULL ELSE 5 END AS kinds_overlap  -- @nullable
FROM ivnm t
