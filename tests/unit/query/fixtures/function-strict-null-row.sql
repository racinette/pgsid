-- The FROM position, where a short-circuited call is loudest: a strict
-- function with a ROW return and a NULL argument emits one row of all NULLs
-- (measured) — the arity is the function's, the values are nobody's. Both
-- columns here are what the body proves (`SELECT 'p'::text, 1`), and both
-- come back NULL, so the body reading has to be refused for this call rather
-- than ORed into the declared list.
--
-- The NULL argument is the DEFAULT one: pair_strict's second parameter
-- declares `DEFAULT NULL` and the call omits it, which is the substitution
-- and the short-circuit in one statement.
SELECT
  p.sku,  -- @nullable
  p.qty   -- @nullable
FROM pair_strict(1) p
