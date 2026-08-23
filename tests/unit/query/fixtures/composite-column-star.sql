-- The composite-star value arms the first fix phase refused (the sweep's
-- rank-7 over-refusal, closed with adversarial-2 finding 13): a qualified
-- composite COLUMN `(c.p).*` expands its type's fields, and a ROW
-- constructor `(ROW(…)).*` has parse-time-countable arity with fields
-- named f1..fN (both measured).
--
-- The two arms take DIFFERENT rules, and f1 is why. `(c.p).*` is all-nullable
-- because the composite can be NULL AS A WHOLE, and a NULL composite nulls
-- every field however it was declared, NOT NULL domains included — the same
-- rule as the FuncCall arm. A ROW CONSTRUCTOR has no such state: it is never
-- itself NULL, so nothing propagates and each field is exactly its own
-- argument. f1 is the literal 1 and is notNull; f2 is `(c.p).qty` and stays
-- nullable, by the first rule one level down.
--
-- f1 used to be nullable behind a recorded reason, and the reason named its
-- own cause: "the all-nullable rule is the composite expansion's uniform
-- conservatism". It was uniform over two arms that are not the same case.
--
-- sku and qty are witnessed by the generated NULL composites; f2 by c.p's qty
-- being NULL exactly when the composite is not (the empty-qty third).
SELECT
  (c.p).*,
  (ROW(1, (c.p).qty)).*
FROM cc c
-- @nullable   (sku)
-- @nullable   (qty)
-- @notNull    (f1)
-- @nullable   (f2)
