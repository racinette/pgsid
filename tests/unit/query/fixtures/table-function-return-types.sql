-- Set-returning functions in FROM: resolving the return type into columns.
--
-- The central rule is a negative one. A `SETOF <table>` result carries the
-- table's *row type*, which describes column types and nothing else — the
-- NOT NULL constraints do NOT travel with it. A function declared
-- `RETURNS SETOF order_items` can return a row of all NULLs without error,
-- even though four of those columns are NOT NULL in the table. So every
-- column of a composite result is nullable.
--
-- What does survive is anything that is part of the *type*:
--   - a domain's NOT NULL, still enforced on function output;
--   - WITH ORDINALITY, a generated bigint counter.
--
-- Resolving the columns matters even where they all come out nullable:
-- without it `SELECT * FROM f()` expands to nothing and the statement's
-- output shape is wrong.
SELECT
  -- SETOF order_items: id/order_id/product_id/quantity/unit_price are all
  -- NOT NULL in the table, and all nullable here.
  g.id                          AS setof_id,        -- @nullable
  g.quantity                    AS setof_qty,       -- @nullable

  -- RETURNS TABLE(...): plain types are nullable, a NOT NULL domain is not.
  ol.line_id                    AS table_line_id,   -- @nullable
  ol.label                      AS table_label,     -- @notNull
  ol.qty                        AS table_qty,       -- @nullable

  -- SETOF <NOT NULL domain>: the element type carries the constraint.
  s                             AS domain_row,      -- @notNull

  -- WITH ORDINALITY: a generated counter, always present.
  n.val                         AS ord_value,       -- @nullable
  n.pos                         AS ord_position,    -- @notNull

  -- COALESCE still recovers non-nullness in the usual way.
  COALESCE(g.quantity, 0)       AS safe_qty         -- @notNull
FROM get_order_items(1) g
CROSS JOIN order_lines(1) ol
CROSS JOIN active_skus() s
CROSS JOIN get_order_items(1) WITH ORDINALITY n(val, a, b, c, d, pos)
