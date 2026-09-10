-- The cost predicate makes a nullable catalog value present, while the
-- generated circulation label remains nullable for books without a shelf.
-- @args [1, 30]
-- @param 1 nullable
-- @param 2 nullable
-- @null-groups none
-- @param-rejections none
SELECT
  b.id,                -- @notNull
  b.title,             -- @notNull
  b.replacement_cost,  -- @notNull
  b.circulation_label  -- @nullable
FROM books b
WHERE b.replacement_cost BETWEEN $1 AND $2
