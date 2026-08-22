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

  -- The array form needs to SEE the elements, and there are two ways to. A
  -- literal ARRAY[...] exposes them as AST children; a CLOSED array
  -- expression exposes them as a value, through the statement map (2026-08-22
  -- — the map held `{1,2}` all along and the walk read only whether the ARRAY
  -- itself was NULL, which is not the question). Casts are looked through
  -- because the collector takes the maximal closed subtree, which is the
  -- FuncCall inside the cast; an array cast is element-wise, so the pre-cast
  -- value answers the same question.
  --
  -- The last two are the same call with the same shape and opposite answers:
  -- string_to_array's third argument is a null_string, so `'2'` comes back a
  -- real SQL NULL and the ANY can be NULL on any row that matches neither
  -- element.
  p.id = ANY (ARRAY[1, 2])                                     AS any_literal,  -- @notNull
  p.id = ANY (ARRAY[1, NULL])                                  AS any_has_null, -- @nullable
  p.category_id = ANY (ARRAY[1, 2])                            AS any_lhs_null, -- @nullable
  p.id = ANY (string_to_array('1,2', ',')::int[])              AS any_closed,   -- @notNull
  p.id = ANY (string_to_array('1,2', ',', '2')::int[])         AS any_closed_null, -- @nullable
  -- Opaque: the array is built from a COLUMN, so no map entry can hold it.
  -- Witnessed rather than merely refused — `deleted_at` is NULL on most rows,
  -- `string_to_array(NULL, ',')` is a NULL array, and ANY over one is NULL.
  p.sku = ANY (string_to_array(p.deleted_at::text, ','))       AS any_opaque    -- @nullable
FROM products p
