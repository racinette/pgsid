-- A function returning SETOF a standalone composite type expands to that
-- type's fields, exactly as SETOF <table> expands to the table's columns.
--
-- Both are row types, so neither carries NOT NULL constraints — every field is
-- nullable however the composite or table was declared, and what puts a
-- constraint back is the BODY. `SELECT p.sku, 1 FROM products p` is two
-- columns against the composite's two fields, read positionally, and
-- products.sku is NOT NULL. A body may also deliver its row as ONE
-- composite-typed column (both spellings accepted, measured) —
-- function-single-out-composite.sql is that shape.
SELECT *   -- @notNull
           -- @notNull
FROM sku_pairs() z
