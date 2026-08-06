-- @unwitnessable 1: the ON is `c.id = 1`, a CONSTANT — not a key of any
--   kind — and `dense` is the one state that seeds coupons row 1, so the
--   join matches wherever this fixture returns rows and the optional side
--   never null-extends. A state seeding coupons WITHOUT id 1 would witness
--   both claims: a seed-data gap, not engine imprecision. (The reason
--   recorded here before named a NOT NULL foreign key, which this join
--   does not have.)
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
