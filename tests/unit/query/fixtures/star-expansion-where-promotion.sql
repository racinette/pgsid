-- WHERE promotion must apply to star-expanded columns too.
--
-- `c.email IS NOT NULL` proves the customers row exists, promoting the alias
-- from OPTIONAL to REQUIRED — so every NOT NULL column of c is non-null here,
-- exactly as it would be for an explicitly named reference.
SELECT *   -- @notNull   products.id
           -- @nullable  products.category_id
           -- @notNull   products.sku
           -- @notNull   products.name
           -- @notNull   products.price
           -- @nullable  products.deleted_at
           -- @notNull   customers.id        (promoted)
           -- @notNull   customers.email     (promoted)
           -- @nullable  customers.name
           -- @nullable  customers.deleted_at
FROM products p
LEFT JOIN customers c ON c.id = p.id
WHERE c.email IS NOT NULL
