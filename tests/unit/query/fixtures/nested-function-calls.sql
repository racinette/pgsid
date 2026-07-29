-- Nested function calls: a function calling another function.
-- Body recursion threads arg nullability through the call chain.
SELECT
  double_val(double_val(p.id))            AS double_double,   -- @notNull
  lower_strict(pass_through(p.name))      AS nested,          -- @notNull
  lower_strict(pass_through(p.deleted_at::text)) AS nested_nullable -- @nullable
FROM products p
