-- Distinctness never applies to numerics: 1 and 1.0 are distinct tokens
-- naming equal values, so TRUE(n = 2) must not falsify the CHECK's n = 1
-- arm and the second arm stays unreachable — b remains nullable although
-- the constraint in fact forces it non-null on every n = 2 row, which is
-- exactly why no witness can exist.
-- @unwitnessable 0: the CHECK's second arm forces b non-null on every
-- returned row; the engine refuses numeric token distinctness by design
-- (the type gate), so the imprecision is recorded, not witnessed.
SELECT
  b   -- @nullable
FROM audit_log
WHERE n = 2
