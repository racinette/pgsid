-- Strict function: non-null only when ALL arguments are non-null.
-- lower_strict is STRICT; a nullable column (from a LEFT JOIN) makes the
-- result nullable, while a NOT NULL column or literal keeps it non-null.
SELECT
  lower_strict(p.name)        AS name_lower,    -- @notNull
  lower_strict(p.deleted_at::text)  AS deleted_lower, -- @nullable
  lower_strict('literal')     AS lit_lower      -- @notNull
FROM products p
