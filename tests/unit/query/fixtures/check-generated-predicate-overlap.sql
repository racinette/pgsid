-- The gate on the selection rung, one boundary out from
-- check-generated-predicate-containment.sql: [5,inf) refutes the first
-- arm exactly as it does there, but WITHOUT the upper conjunct it does
-- not sit inside (-inf,10] — it overlaps it — so the second arm is not
-- selected and the ELSE stays reachable. A rung that answered "contained"
-- on overlap would claim this notNull; a = 12 makes the NULL appear.
SELECT
  c -- @nullable
FROM gpc
WHERE a >= 5
