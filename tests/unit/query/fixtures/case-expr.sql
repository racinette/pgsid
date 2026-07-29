-- CASE: conservative nullable even with non-null branches
SELECT
  CASE WHEN val IS NOT NULL THEN val ELSE '' END AS c1,  -- @nullable
  CASE WHEN id = 1 THEN 'a' ELSE 'b' END         AS c2   -- @nullable
FROM t
