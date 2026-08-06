-- R1 closed, the view form: order_shipment_summary is a stored FULL
-- JOIN, and the shipment side's unit rides out of the view definition
-- exactly like view column nullability does. The order side re-exports
-- only one bare column here — below the two-member floor either way, and
-- non-null besides: shipments.order_id is a NOT NULL foreign key onto
-- orders, so the view's order side always matches (presence-group-full.sql
-- pins the same asymmetry at the top level).
-- dense: orders 2/4 unshipped witness the absent arm through the view.
-- @null-group 1*,2*
SELECT
  order_id,      -- @notNull
  shipment_id,   -- @nullable
  carrier        -- @nullable
FROM order_shipment_summary
