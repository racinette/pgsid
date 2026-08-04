-- The literal-branch closure: set-operation origins carry one SLOT per
-- branch, and a branch that cannot attribute a column (the literal row)
-- contributes an explicit NULL slot with its flat verdict recorded —
-- goal proof then runs per alternative: branch one proves sid/carrier by
-- presence (the pinned tracking number, same rowPath) plus catalog,
-- branch two settles by its literals being non-null. Under the old
-- all-or-nothing encoding one literal branch voided the whole column's
-- provenance and these read nullable with unreachable NULLs (the
-- retired refilter-union-literal-branch rule). dense: shipment 2's 'T2'
-- survives the pin alongside the literal row.
WITH j AS (
  SELECT o.id AS oid, s.id AS sid, s.carrier, s.tracking_no AS trk
  FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
  UNION ALL
  SELECT 90, 91, 'road', 'trk-x'
)
SELECT
  j.oid,      -- @notNull
  j.sid,      -- @notNull
  j.carrier,  -- @notNull
  j.trk       -- @notNull
FROM j
WHERE j.trk IS NOT NULL
