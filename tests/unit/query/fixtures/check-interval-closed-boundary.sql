-- The closed-ray boundary: CHECK (g >= 5). [5, inf) misses (-inf, 4]
-- because 4 < 5, and misses (-inf, 5) because the question ray is open —
-- but [5, inf) and (-inf, 5] SHARE exactly {5}, and the generator's g = 5
-- row is the witness that fires the third column's arm. The off-by-one
-- the emptiness table must never blur, held by data forever.
SELECT
  CASE WHEN t.g <= 4 THEN NULL ELSE 5 END AS ray_adjacent,   -- @notNull
  CASE WHEN t.g < 5  THEN NULL ELSE 5 END AS ray_open_touch, -- @notNull
  CASE WHEN t.g <= 5 THEN NULL ELSE 5 END AS ray_shares_5    -- @nullable
FROM ivge t
