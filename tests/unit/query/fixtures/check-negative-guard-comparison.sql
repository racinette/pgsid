-- Comparison totality for a NOT-taken guard, token-pure: qty is catalog
-- NOT NULL and > is total+strict, so `qty > 0` cannot evaluate NULL and
-- the ELSE certifies FALSE(qty > 0) — which meets the CHECK's IDENTICAL
-- atom and forces discontinued_at. Nothing about > is interpreted: a query
-- branching on `qty > -20` would prove nothing (crossing literals is order
-- reasoning over VALUES — the refused theory-solver rung).
SELECT
  CASE WHEN qty > 0 THEN 'stocked'
       ELSE discontinued_at::text END AS state   -- @notNull
FROM stock
