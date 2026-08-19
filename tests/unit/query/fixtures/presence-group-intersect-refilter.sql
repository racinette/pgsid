-- The setop dead rule, found by the generated corpus's two-arm bar (67
-- groups with unreachable absent arms before it): INTERSECT strengthens
-- flat claims from the right branch (a row must appear in BOTH, and the
-- inner-joined right has no all-NULL row to pair), so sid/carrier read
-- notNull here — and the left branch's group is dropped rather than
-- emitted with an uninhabitable absent arm. The stale direction fires if
-- the engine ever claims a group here.
--
-- @planner-keeps 1: the INTERSECT refilters the left branch's LEFT JOIN —
--   the inner-joined right admits no all-NULL pairing — a cross-branch
--   fact the planner never reads into a branch's plan.
SELECT
  o.id      AS oid,   -- @notNull
  s.id      AS sid,   -- @notNull
  s.carrier           -- @notNull
FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
INTERSECT
SELECT
  o.id,
  s.id,
  s.carrier
FROM orders o JOIN shipments s ON s.order_id = o.id
