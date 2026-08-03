-- Implicants compose: the strict || makes the fallback NULL when EITHER of
-- $2, $3 is, so the cross-union with $1 yields TWO minimal sets — {1,2}
-- and {1,3} — each independently claimed, annotated, and witnessed (the
-- INSERT executes in every state). No parameter is individually forced,
-- so all three stay nullable in the flat contract.
-- @args ["direct", "pre", "fix"]
-- @param 1 nullable
-- @param 2 nullable
-- @param 3 nullable
-- @param-reject 1,2
-- @param-reject 1,3
INSERT INTO tags (name)
VALUES (COALESCE($1, $2 || $3))
RETURNING
  id,    -- @notNull
  name   -- @notNull
