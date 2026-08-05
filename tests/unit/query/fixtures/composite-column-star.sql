-- @unwitnessable 2: f1 is the literal 1 — the all-nullable rule is the
--   composite expansion's uniform conservatism, and no data reaches it
-- The composite-star value arms the first fix phase refused (the sweep's
-- rank-7 over-refusal, closed with adversarial-2 finding 13): a qualified
-- composite COLUMN `(c.p).*` expands its type's fields, and a ROW
-- constructor `(ROW(…)).*` has parse-time-countable arity with fields
-- named f1..fN (both measured). All nullable — the same rule as the
-- FuncCall arm, since a NULL composite nulls every field. sku and qty are
-- witnessed by the generated NULL composites; f2 by c.p's qty being NULL
-- exactly when the composite is not (the empty-qty third).
SELECT
  (c.p).*,
  (ROW(1, (c.p).qty)).*
FROM cc c
-- @nullable   (sku)
-- @nullable   (qty)
-- @nullable   (f1)
-- @nullable   (f2)
