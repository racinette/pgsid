-- EXTRACT OF A TOTAL FIELD, WITH THE ARGUMENT NULLABLE.
--
-- EXTRACT_TOTAL_FIELDS is two-dimensional — FIELD × argument TYPE — and
-- builtin-extract-infinity.sql pins the claiming direction (day of an interval
-- is total, infinite input included). The refusing direction of the SAME rung
-- — the field qualifies but the argument does not — was dark
-- (rung-census.test.ts): strictness is still the caller's to satisfy, and no
-- fixture handed a qualifying field a nullable argument. delivered_at is NULL
-- on undelivered shipments, the subtraction passes that through, and the
-- extract answers NULL — the witness.
SELECT
  extract(day from (s.delivered_at - s.shipped_at)) AS transit_days  -- @nullable
FROM shipments s
