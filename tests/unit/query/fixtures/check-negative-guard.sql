-- A NOT-taken guard as kernel evidence: the ELSE runs only when
-- `combo IS NULL` was not TRUE, and IS NULL is total — not-TRUE means
-- FALSE — so the branch carries FALSE(combo IS NULL) into the kernel,
-- where the implication CHECK's OR loses its first disjunct and forces
-- opened_at. The THEN branch is now(); both arms non-null.
SELECT
  CASE WHEN combo IS NULL THEN now() ELSE opened_at END AS reached   -- @notNull
FROM locker
