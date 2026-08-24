-- A closed witness inside a STRICT arm needs a strictly greater anchor:
-- [4,inf) fits (3,inf) because 4 > 3, so even the witness's own anchor
-- clears the arm's excluded boundary.
SELECT
  o -- @notNull
FROM caist
WHERE a >= 4
