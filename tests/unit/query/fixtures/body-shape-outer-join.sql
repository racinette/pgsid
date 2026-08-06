-- A body-proven notNull is INTRINSIC to the function's rows, and the join
-- state still applies on top: the optional side of a LEFT JOIN contributes
-- NULL-extended rows whatever the body guarantees.
--
-- get_order_items(1) returns order 1's items, whose id and quantity are NOT
-- NULL at the base table and read notNull in the plain spelling
-- (table-function-return-types.sql). Here every order that is not order 1
-- extends them, which dense's orders 2, 3 and 4 witness.
-- The two extended columns are one unit: they are absent together, and each
-- is non-null when present, so both discriminate.
-- @null-group 1*,2*
SELECT
  o.id          AS order_id,   -- @notNull
  g.id          AS item_id,    -- @nullable
  g.quantity    AS qty         -- @nullable
FROM orders o
LEFT JOIN get_order_items(1) g ON g.order_id = o.id
