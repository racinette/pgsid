-- @unwitnessable 0: $1 is typed nn_text by the cast, so any returned row proves it non-null and the strict concatenation never yields NULL; output narrowing from mechanism-A facts is deferred
-- One domain-typed use types the parameter for every use that does not
-- deduce a type of its own: here `$1 || 'x'` leaves $1 unconstrained, so the
-- cast's nn_text applies everywhere and NULL rejects once and for all. (A
-- use that DOES deduce its own type — a bare `SELECT $1` deduces text — makes
-- PostgreSQL reject the statement outright with "inconsistent types deduced";
-- pinned in param-mechanism.test.ts.)
--
-- c1 stays conservatively @nullable for now: consuming the mechanism-A fact
-- on the output side is the first deferred item in
-- docs/argument-nullability.md. When it lands, c1 — a strict concatenation
-- whose operands are then both non-null — becomes @notNull.
-- @args ["m"]
-- @param 1 notNull
SELECT
  $1 || 'x' AS c1,    -- @nullable
  $1::nn_text AS c2   -- @notNull
