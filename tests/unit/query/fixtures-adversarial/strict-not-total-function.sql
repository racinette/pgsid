-- ADVERSARIAL FINDING 5 — rank 1, notNull unsoundness.
--
-- Falsifying data: one `t` row; `customers` empty.
-- Observed: PostgreSQL returns NULL in all three columns. `strict_nullish`
-- returns NULL outright; `lookup_name` is the realistic shape — a strict
-- lookup whose row does not exist; `<->` is the same hole reached through an
-- operator's backing function.
--
-- Suspected mechanism: nullability-walk.ts, the FuncCall dispatch's
-- **priority 4** (`if (meta && meta.strict && !meta.isAggregate)` — and its
-- by-consensus twin immediately below): a declared-STRICT function with all
-- arguments non-null is concluded non-null. Strictness says NULL in ⇒ NULL
-- out and nothing whatever about non-null in. The engine applies exactly this
-- distinction rigorously everywhere else — `TOTAL_OPERATORS`
-- ("Strictness is NOT the criterion"), `STRICT_TOTAL_BUILTINS` ("Membership
-- requires being *total*, not merely strict"), and the operator gate's own
-- note that "totality is deliberately NOT inferred from it" — but the user
-- function path infers it.
--
-- Priority 4 also runs BEFORE priority 5 (LANGUAGE sql body recursion), so
-- for `lookup_name` it discards an answer the engine could have got right:
-- the body has a FROM clause and can return zero rows, which the body walk
-- would have reported as nullable.
SELECT
  strict_nullish('a')  AS a,   -- @notNull  <-- FALSE
  lookup_name(t.id)    AS b,   -- @notNull  <-- FALSE
  ('a' <-> 'b')        AS c,   -- @notNull  <-- FALSE
  t.id                         -- @notNull
FROM t
