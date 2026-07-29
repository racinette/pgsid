-- LANGUAGE sql body recursion in both styles, with positional ($1/$2) and
-- named parameter references. A nullable argument propagates through the body.
SELECT
  double_val(p.id)            AS doubled,       -- @notNull
  pass_through(p.name)        AS passed,        -- @notNull
  concat_val(p.name, p.sku)   AS concatenated,  -- @notNull
  pass_two(p.name, p.sku)     AS two,           -- @notNull
  double_val(p.category_id)   AS cat_doubled    -- @nullable
FROM products p
