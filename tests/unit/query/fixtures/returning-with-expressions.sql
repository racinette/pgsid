-- UPDATE RETURNING with expressions in the RETURNING list.
-- The target table is required (no join nullability). Catalog NOT NULL
-- columns are non-null; A_Expr math is nullable; COALESCE with a literal
-- is non-null.
UPDATE products SET price = price * 2 WHERE id = 1
RETURNING
  id                        AS id,          -- @notNull
  name                      AS name,        -- @notNull
  COALESCE(deleted_at, '1970-01-01'::timestamptz) AS deleted,  -- @notNull
  price * 2                 AS new_price    -- @nullable
