-- NullTest: IS NULL / IS NOT NULL → always returns bool (non-null)
SELECT
  val IS NULL       AS c1,  -- 
  val IS NOT NULL   AS c2,  -- 
  id IS NULL        AS c3   -- 
FROM t
