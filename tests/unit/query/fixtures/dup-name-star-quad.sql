-- The dup-name hazard at strength FOUR, on the occurrence-counting branch
-- (bare `*`): four `id` columns from four different entries, interleaved
-- with unique names, PLUS a second independent duplicate (`status` twice)
-- — the counters are per name and per entry, and the nullabilities
-- alternate (n,N,n,n,N,N,n) so ANY off-by-one flips a visible claim
-- rather than passing silently. The shipments unit assembles from three
-- positions, two of them duplicate-named: id occurrence 0 and status
-- occurrence 1, with tracking_no (as status) the nullable member. dense:
-- orders 2/4 unshipped (absent arm), 1/3 shipped (present, shipment 1's
-- NULL tracking witnessing the member); gm empty (column 3's NULL);
-- customers required through the NOT NULL FK.
-- @null-group 0*,2*,6
SELECT * FROM (
  SELECT
    sh.id,                    -- @nullable
    o.id AS id,               -- @notNull
    sh.carrier,               -- @nullable
    g.a AS id,                -- @nullable
    o.status,                 -- @notNull
    c.id AS id,               -- @notNull
    sh.tracking_no AS status  -- @nullable
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  LEFT JOIN shipments sh ON sh.order_id = o.id
  LEFT JOIN gm g ON g.a = o.id
) s
