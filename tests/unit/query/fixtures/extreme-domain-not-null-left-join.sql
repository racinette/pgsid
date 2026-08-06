-- @unwitnessable 1: the ON is `c.id = 1`, a CONSTANT — not a key of any
--   kind — and c2 joins on the SAME constant while the WHERE requires
--   c2.code IS NOT NULL. So any state that returns a row is one where coupon
--   1 exists, and then c matches too: the two joins cannot be separated by
--   data. Measured — deleting coupon 1 from dense returns no rows at all,
--   which is why the seed-data reading recorded here on 2026-08-05 was
--   wrong, as was the foreign-key reading before it.
-- @unwitnessable 2: same join, same reason
-- @null-group 1*,2*
-- (c's unit; its absent arm is unwitnessable by the discriminants' own
-- recorded reasons above — the derived exemption. c2's unit forms no group:
-- the WHERE promotes it, so its absent arm is refiltered.)
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
