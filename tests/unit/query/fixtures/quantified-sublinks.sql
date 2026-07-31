-- @unwitnessable 13: p.id and both array elements are non-null so = ANY always yields a boolean; the array expression is opaque to the walk
-- ANY / ALL / IN / NOT IN sublinks do NOT always return a boolean.
--
-- The comparison runs per row under three-valued logic and the results are
-- OR-ed (ANY) or AND-ed (ALL), so a NULL row poisons the outcome whenever no
-- row settles it:
--
--   1 IN (SELECT NULL)      -> NULL      NULL IN (SELECT 1)  -> NULL
--   1 NOT IN (SELECT NULL)  -> NULL      1 = ALL (SELECT NULL) -> NULL
--
-- So the result is non-null only when BOTH sides are: the left operand and
-- every output column of the subquery. EXISTS is the exception — it never
-- inspects a value, only whether a row came back.
--
-- order_items.product_id is NOT NULL; products.category_id is nullable.
SELECT
  p.id                                                        AS product_id,   -- @notNull

  -- Both sides non-null.
  p.id IN (SELECT oi.product_id FROM order_items oi)          AS in_notnull,   -- @notNull
  p.id = ANY (SELECT oi.product_id FROM order_items oi)        AS any_notnull,  -- @notNull

  -- The subquery column is nullable: a NULL row with no match yields NULL.
  p.id IN (SELECT p2.category_id FROM products p2)             AS in_nullable,  -- @nullable
  p.id NOT IN (SELECT p2.category_id FROM products p2)         AS notin_null,   -- @nullable
  p.id = ALL (SELECT p2.category_id FROM products p2)          AS all_nullable, -- @nullable

  -- The left operand is nullable.
  p.category_id IN (SELECT oi.product_id FROM order_items oi)  AS lhs_nullable, -- @nullable

  -- EXISTS never looks at a value.
  EXISTS (SELECT p2.category_id FROM products p2)              AS exists_ok,    -- @notNull
  NOT EXISTS (SELECT p2.category_id FROM products p2)          AS not_exists_ok, -- @notNull

  -- ARRAY(...) yields an empty array rather than NULL when nothing matches.
  ARRAY(SELECT p2.category_id FROM products p2)                AS arr,          -- @notNull

  -- The array form: a literal ARRAY[...] exposes its elements, so it can be
  -- judged. An opaque array expression cannot.
  p.id = ANY (ARRAY[1, 2])                                     AS any_literal,  -- @notNull
  p.id = ANY (ARRAY[1, NULL])                                  AS any_has_null, -- @nullable
  p.category_id = ANY (ARRAY[1, 2])                            AS any_lhs_null, -- @nullable
  p.id = ANY (string_to_array('1,2', ',')::int[])              AS any_opaque    -- @nullable
FROM products p
