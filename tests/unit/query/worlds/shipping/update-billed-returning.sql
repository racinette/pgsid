-- A SET target and a predicate, so the two bindings are rejected for different
-- reasons: one by the constraint that compares it, one by the key it matches.
UPDATE shipments
SET billed_kg = $1
WHERE id = $2
RETURNING
  id,
  billed_kg,
  status
