-- R1 closed, the CTE form — and the refilter counterweight: the first
-- query lifts the inner unit through the CTE reference; the WHERE in the
-- second re-export site would kill its absent arm, which is the lifted
-- dead rule (a lifted member the outer analysis proves notNull drops the
-- group). Only the unfiltered site is this fixture; the filtered shape is
-- presence-group-reexport-refilter.sql.
-- @null-group 1*,2*
WITH j AS (
  SELECT o.id AS oid, s.id AS sid, s.carrier
  FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
)
SELECT
  j.oid,       -- @notNull
  j.sid,       -- @nullable
  j.carrier    -- @nullable
FROM j
