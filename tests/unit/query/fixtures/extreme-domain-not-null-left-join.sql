-- NOT NULL domain columns on the optional side of a LEFT JOIN become
-- nullable. The domain's NOT NULL constraint guarantees the value is
-- non-null when a row exists, but the outer join can produce NULL-extended
-- rows where no match is found — the entire row (including the domain
-- column) is NULL. The walk reports this as nullable because the join's
-- OPTIONAL state overrides the catalog's notNull flag.
--
-- coupons.discount_percent is typed as the discount_percent domain (NOT
-- NULL). The catalog reports attnotnull = true. But on the optional side
-- of the LEFT JOIN, it becomes nullable. WHERE promotion recovers non-null.
SELECT
  o.id                              AS order_id,      -- @notNull
  c.discount_percent                AS discount,       -- @nullable
  c.code                            AS coupon_code,    -- @nullable
  COALESCE(c.code, 'none')          AS safe_code,     -- @notNull
  c2.discount_percent               AS promoted_discount  -- @notNull
FROM orders o
LEFT JOIN coupons c ON c.id = 1
LEFT JOIN coupons c2 ON c2.id = 1
WHERE c2.code IS NOT NULL
