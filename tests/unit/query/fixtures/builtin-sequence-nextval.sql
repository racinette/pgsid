-- The sequence functions are TOTAL, and volatility is not what decides that.
--
-- Each either RAISES — a sequence that does not exist, `currval` before
-- `nextval` in the session, a value past the type's range — or returns a
-- bigint. There is no input for which one answers NULL, and a raise is not a
-- NULL: that is the same admission criterion every other entry in
-- `STRICT_TOTAL_BUILTINS` is held to, and the totality probe holds these to it
-- too.
--
-- They were unreachable for a structural reason worth keeping written down.
-- The builtin totality CAPTURE admits only IMMUTABLE rows
-- (`p.provolatile = 'i'`, src/catalog/snapshot.ts), and these are VOLATILE by
-- nature — the side effect is the point — so no signature row ever reached the
-- dispatch and the call fell to the conservative tail. The subtree evaluator
-- cannot recover them either, and should not try: volatility is exactly what
-- closes a subtree out. The fix is a name-level admission beside the existing
-- entries, which is why the claim is `strict-total` and not `always non-null`:
-- `nextval(NULL::regclass)` IS NULL (measured), so the premise is non-null
-- arguments, not "whatever the arguments".
--
-- Recorded in docs/sqlc-disagreements.md as the imprecision behind both
-- `nextval/GetNextID` entries, and closed 2026-08-20.
SELECT
  nextval('seq_probe')     AS next_id,  -- @notNull
  setval('seq_probe', 10)  AS set_to    -- @notNull
