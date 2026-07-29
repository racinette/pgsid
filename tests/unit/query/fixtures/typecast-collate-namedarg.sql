-- TypeCast, CollateClause, and NamedArgExpr (named function arguments).
-- TypeCast and CollateClause recurse into their arg. NamedArgExpr unwraps
-- and recurses. concat_val body is `SELECT $2`; named args reorder but the
-- walk maps by parameter name → position, so $2 resolves to the `b` param.
SELECT
  '42'::integer              AS num,           -- @notNull
  p.name COLLATE "C"         AS collated,      -- @notNull
  p.deleted_at::date         AS deleted_date,  -- @nullable
  concat_val(b => p.sku, a => p.name) AS named -- @notNull
FROM products p
