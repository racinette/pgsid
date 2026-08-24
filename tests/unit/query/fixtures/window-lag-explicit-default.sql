-- lag WITH AN EXPLICIT DEFAULT — the strict-total WINDOW signature, both ways.
--
-- The window re-key exists so `lag(x, 1, 0)` can claim what `lag(x)` may not
-- (a three-argument lag substitutes its default instead of answering NULL past
-- the partition edge), and the never-NULL half of that dispatch is exercised
-- all over the corpus by the ranking functions. The STRICT-TOTAL half was dark
-- (rung-census.test.ts): no fixture spelled the three-argument form. Both of
-- its directions live here — non-null arguments claim, a nullable argument
-- refuses, and the seeded NULL categories witness the refusal.
SELECT
  lag(p.id, 1, 0)          OVER (ORDER BY p.id) AS l_id,  -- @notNull
  lag(p.category_id, 1, 0) OVER (ORDER BY p.id) AS l_cat  -- @nullable
FROM products p
