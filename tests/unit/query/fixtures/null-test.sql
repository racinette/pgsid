-- NullTest: IS NULL / IS NOT NULL → always returns bool (non-null)
SELECT
  val IS NULL       AS c1,  -- @notNull
  val IS NOT NULL   AS c2,  -- @notNull
  id IS NULL        AS c3   -- @notNull
FROM t
