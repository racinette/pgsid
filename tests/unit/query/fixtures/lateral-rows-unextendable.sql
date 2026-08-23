-- @planner-keeps 1: the `a` join is the one the walk settles, and the planner
--   keeps it — a set-returning function's row count is an estimate to the
--   planner and never a proof. The other two it keeps for the same reason the
--   walk does.
-- A LEFT JOIN whose optional side cannot be empty and whose qual cannot fail
-- is an inner join that says LEFT. NULL-extension is not a property of the
-- join TYPE — it is what the join does when the optional side contributes no
-- row — so proving it never happens needs both halves, and each half is a
-- control here.
--
-- `always` is the promotion. `generate_series(1, 3)` guarantees the item three
-- rows and the qual is a literal TRUE, so no outer row can be extended. The
-- minimum is the same number `armRowBounds` already computes for the lockstep
-- padding; the join state simply never asked it before.
--
-- `qual_fails` is the ON gate. Same item, same guaranteed three rows — and
-- `o.id + 100` is never one of them, so EVERY outer row is extended. A qual
-- that is not a literal true can be false or NULL for some row, and each is an
-- extension however many rows the item has. Nothing here evaluates the
-- predicate; the literal is the whole test, which is why an expression that
-- happens to be constantly false still reads as falsifiable.
--
-- `item_empty` is the row gate. The qual IS `true`, and the item still empties:
-- `get_order_items` is a table scan, so it guarantees nothing and returns
-- nothing at all for an order with no items. That is the ordinary case the
-- promotion must not reach.
--
-- A LONE `ROWS FROM` arm takes its column name from the ITEM's alias, not from
-- the function (measured: `ROWS FROM (generate_series(1,3)) a` has one column
-- called `a`), so the column lists here are spelled out rather than relied on.
SELECT
  o.id       AS oid,        -- @notNull
  a.gs       AS always,     -- @notNull
  b.gs       AS qual_fails, -- @nullable
  c.order_id AS item_empty  -- @nullable
FROM orders o
LEFT JOIN LATERAL ROWS FROM (generate_series(1, 3)) a(gs) ON true
LEFT JOIN LATERAL ROWS FROM (generate_series(1, 3)) b(gs) ON b.gs = o.id + 100
LEFT JOIN LATERAL ROWS FROM (get_order_items(o.id)) c ON true
