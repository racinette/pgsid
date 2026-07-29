-- LANGUAGE sql body recursion in both styles, with positional ($1/$2) and
-- named parameter references. A nullable argument propagates through the body.
SELECT
  double_val(p.id)            AS doubled,       -- 
  pass_through(p.name)        AS passed,        -- 
  concat_val(p.name, p.sku)   AS concatenated,  -- 
  pass_two(p.name, p.sku)     AS two,           -- 
  double_val(p.category_id)   AS cat_doubled    -- 
FROM products p
