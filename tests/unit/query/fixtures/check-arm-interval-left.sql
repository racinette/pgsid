-- The left-ray direction, closed witness into a strict arm: (-inf,2]
-- fits (-inf,3) because 2 < 3 — the witness's whole reach stays short of
-- the arm's excluded anchor.
SELECT
  o -- @notNull
FROM cail
WHERE a <= 2
