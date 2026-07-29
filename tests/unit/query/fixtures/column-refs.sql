-- ColumnRefs: single table, catalog notNull vs nullable
SELECT
  id     AS c1,  -- @notNull
  name   AS c2,  -- @nullable
  active AS c3   -- @notNull
FROM t
