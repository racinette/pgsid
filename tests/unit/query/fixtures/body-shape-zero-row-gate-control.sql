-- The positive control for gate (a): the same NON set-returning shape whose
-- body DOES guarantee its single row — a FROM-less SELECT with nothing to
-- filter it — so the refusal above is not blanket. Both fields are literals.
SELECT * FROM one_pair()
-- @notNull   (s)
-- @notNull   (q)
