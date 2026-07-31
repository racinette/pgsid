-- One domain-typed use types the parameter for every use that does not
-- deduce a type of its own: here `$1 || 'x'` leaves $1 unconstrained, so the
-- cast's nn_text applies everywhere and NULL rejects once and for all. (A
-- use that DOES deduce its own type — a bare `SELECT $1` deduces text — makes
-- PostgreSQL reject the statement outright with "inconsistent types deduced";
-- pinned in param-mechanism.test.ts.)
--
-- c1 is @notNull by mechanism-A narrowing: $1 rejects NULL at Bind, so any
-- returned row proves it non-null, and a strict concatenation of two
-- non-null operands never yields NULL (docs/argument-nullability.md).
-- @args ["m"]
-- @param 1 notNull
SELECT
  $1 || 'x' AS c1,    -- @notNull
  $1::nn_text AS c2   -- @notNull
