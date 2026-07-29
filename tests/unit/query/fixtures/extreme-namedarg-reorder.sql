-- NamedArgExpr with different-arity args in reversed order.
-- Tests the NamedArgExpr reordering fix: concat_val(a text, b text) has
-- body SELECT $2. When called with named args in reversed order
-- (b => nullable, a => notNull), $2 must resolve to param b (nullable),
-- not to the second positional arg (which is param a = notNull).
-- Without the reordering fix, $2 would incorrectly map to the second
-- call-order arg and return notNull.
SELECT
  concat_val(b => p.deleted_at::text, a => p.name) AS reordered_old,     -- @nullable
  concat_val(a => p.name, b => p.deleted_at::text) AS correct_order,     -- @nullable
  pass_two(b => p.deleted_at::text, a => p.name) AS reordered_atomic,    -- @nullable
  pass_two(a => p.name, b => p.sku) AS correct_atomic,                  -- @notNull
  concat_val(b => p.name, a => p.sku) AS both_nonnull_reordered          -- @notNull
FROM products p
