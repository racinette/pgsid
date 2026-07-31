-- @unwitnessable 0: SETOF composite results carry no NOT NULL constraints, but the function selects NOT NULL columns and cannot emit NULL
-- @unwitnessable 1: same row-type erasure as sku
-- A function returning SETOF a standalone composite type expands to that
-- type's fields, exactly as SETOF <table> expands to the table's columns.
--
-- Both are row types, so neither carries NOT NULL constraints — every field is
-- nullable however the composite or table was declared.
SELECT *   -- @nullable
           -- @nullable
FROM sku_pairs() z
