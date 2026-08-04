-- The dup-name hazard through UNQUALIFIED star — the occurrence-counting
-- branch of the positional fix (`s.*` takes the alias-list branch; bare
-- `*` walks scope.visible and recovers each column's ordinal by counting
-- same-name occurrences per entry). Same claims as the alias-star pin:
-- the shipments unit is {0,2}, and g.a — despite sharing sh.id's name —
-- stays out. dense: orders 2/4 unshipped (absent), 1/3 shipped
-- (present); no gm rows, witnessing column 1.
-- @null-group 0*,2*
SELECT * FROM (
  SELECT
    sh.id,          -- @nullable
    g.a AS id,      -- @nullable
    sh.carrier      -- @nullable
  FROM orders o
  LEFT JOIN shipments sh ON sh.order_id = o.id
  LEFT JOIN gm g ON g.a = o.id
) s
