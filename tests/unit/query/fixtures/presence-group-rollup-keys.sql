-- ROLLUP beside plain optional keys: the rolled column is refused as a
-- producer (a set-wrapped key never resolves bare — Wave 12's origins
-- rule) and blanks on subtotal rows, but the PLAIN keys survive every
-- emitted row, so the shipments unit still groups — the all-extended
-- rows collapse into the (NULL, NULL) key group, subtotals included.
-- dense: orders 2/4 feed the NULL group (absent), shipments 1/2 the
-- present ones; the rolled status blanks on subtotal rows (its witness).
-- @null-group 0*,1*
SELECT
  s.id      AS sid,      -- @nullable
  s.carrier AS carrier,  -- @nullable
  o.status,              -- @nullable
  count(*)  AS n         -- @notNull
FROM orders o
LEFT JOIN shipments s ON s.order_id = o.id
GROUP BY s.id, s.carrier, ROLLUP (o.status)
