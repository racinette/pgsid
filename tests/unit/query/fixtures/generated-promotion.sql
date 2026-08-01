-- The stored row IS the read row, so reading-scope guarantees apply inside
-- the generation expression: the WHERE proves b non-null on every returned
-- row, and label = b || '!' follows through the strict concatenation.
-- Without the WHERE, label is nullable (generated-columns.sql).
SELECT
  gm.label AS l   -- @notNull
FROM gm
WHERE gm.b IS NOT NULL
