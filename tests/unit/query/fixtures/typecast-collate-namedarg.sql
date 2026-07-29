-- TypeCast, CollateClause, and NamedArgExpr (named function arguments).
-- TypeCast and CollateClause recurse into their arg. NamedArgExpr unwraps
-- and recurses. concat_val body is `SELECT $2`; named args reorder but the
-- walk maps by parameter name → position, so $2 resolves to the `b` param.
SELECT
  '42'::integer              AS num,           -- 
  p.name COLLATE "C"         AS collated,      -- 
  p.deleted_at::date         AS deleted_date,  -- 
  concat_val(b => p.sku, a => p.name) AS named -- 
FROM products p
