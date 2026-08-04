-- ADVERSARIAL FINDING 6 — rank 1, notNull unsoundness.
--
-- Falsifying data: one `t` row — the aggregate must see at least one input.
-- Observed: PostgreSQL returns (NULL, NULL). `agg_nullify`'s transition
-- function returns NULL for every row; `agg_finalnull`'s FINALFUNC does.
--
-- Suspected mechanism: nullability-walk.ts, the aggregate dispatch's first
-- rule (`if (meta?.aggInitVal != null)` → non-null, "aggregate has a non-null
-- INITCOND → non-null even over zero rows"). The premise is right and the
-- conclusion is wider than it: `agginitval` fixes the result over EMPTY input
-- only. Over non-empty input the result is whatever the transition function
-- accumulated and the final function returned, both of which may be NULL —
-- neither is analysed, and for a plpgsql or C transition function neither
-- could be.
--
-- The rule is correct in the case it was written for and the engine has the
-- gate that would make it sound: `groupGuaranteesNonEmpty` distinguishes the
-- two input cases already, and the WINDOW path over the same aggregate
-- already reports nullable (measured), so the conservative half exists.
SELECT
  agg_nullify(t.id)   AS a,   -- @notNull  <-- FALSE
  agg_finalnull(t.id) AS b    -- @notNull  <-- FALSE
FROM t
