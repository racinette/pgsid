-- CASE: non-null when there is an ELSE and every branch result is non-null;
-- nullable without an ELSE, since an unmatched CASE evaluates to NULL.
-- Branch results are walked under the condition that must hold for that
-- branch to run, so `val` reads as non-null inside a branch that tested it.
SELECT
  CASE WHEN val IS NOT NULL THEN val ELSE '' END AS c1,  -- @notNull
  CASE WHEN id = 1 THEN 'a' ELSE 'b' END         AS c2   -- @notNull
FROM t
