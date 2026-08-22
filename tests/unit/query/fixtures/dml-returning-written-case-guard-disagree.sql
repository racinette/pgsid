-- COUNTEREXAMPLE for `written-value-guards.ts`: two VALUES rows that write
-- different constants into the guarded column.
--
-- The mechanism's soundness rests on one quantifier — EVERY path that can
-- return a row wrote the SAME constant — and this is the cheapest way to
-- break it. Row 1 has `active` true and takes the THEN arm; row 2 has it
-- false and takes the ELSE, where `name` was written NULL. So PostgreSQL
-- returns two rows, `'a'` and NULL, and the column is nullable.
--
-- Widen the agreement in `writtenConstants` to a union — or take the first
-- row's constant, or the last — and this column flips to notNull while the
-- rest of the corpus stays green. It fails as a FALSIFIED claim rather than a
-- stale annotation, because row 2's NULL is right there.
--
-- The same quantifier is what drops an `ON CONFLICT DO UPDATE` writing
-- something else, a MERGE arm that disagrees, and a MERGE DELETE arm
-- outright — a deleted row is returned as it was BEFORE the statement, so
-- nothing this statement wrote describes it.
INSERT INTO t (id, name, val, active) VALUES (1, NULL, 'paid', true), (2, NULL, 'paid', false)
RETURNING
  CASE WHEN active THEN 'a' ELSE name END  AS disagreeing, -- @nullable
  CASE WHEN val = 'paid' THEN 'a' ELSE name END AS agreeing -- @notNull
