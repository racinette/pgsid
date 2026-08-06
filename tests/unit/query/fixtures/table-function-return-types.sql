-- Set-returning functions in FROM: resolving the return type into columns,
-- and then reading the BODY that fills them.
--
-- The declared rule is a negative one. A `SETOF <table>` result carries the
-- table's *row type*, which describes column types and nothing else — the NOT
-- NULL constraints do NOT travel with it, and PostgreSQL re-imposes nothing:
-- a function declared `RETURNS SETOF order_items` whose body selects NULL into
-- a NOT NULL column is accepted and comes back NULL (measured). So the erasure
-- is correct in general, and the only sound source of a guarantee is the body.
--
-- These bodies select the very columns the constraints sit on, so the columns
-- are non-null after all. What holds without any body reading is whatever is
-- part of the *type*:
--   - a domain's NOT NULL, still enforced on function output;
--   - WITH ORDINALITY, a generated bigint counter.
--
-- Resolving the columns matters even where they come out nullable: without it
-- `SELECT * FROM f()` expands to nothing and the statement's output shape is
-- wrong.
SELECT
  -- SETOF order_items, body `SELECT * FROM order_items WHERE order_id = $1`:
  -- the row type erases five NOT NULLs and the body puts them back.
  g.id                          AS setof_id,        -- @notNull
  g.quantity                    AS setof_qty,       -- @notNull

  -- RETURNS TABLE(...): the declared types give `label` its domain NOT NULL,
  -- and the body — `SELECT oi.id, oi.id::text, oi.quantity` — gives the other
  -- two theirs, positionally.
  ol.line_id                    AS table_line_id,   -- @notNull
  ol.label                      AS table_label,     -- @notNull
  ol.qty                        AS table_qty,       -- @notNull

  -- SETOF <NOT NULL domain>: the element type carries the constraint, with no
  -- body reading needed.
  s                             AS domain_row,      -- @notNull

  -- WITH ORDINALITY: a generated counter, always present. `val` is
  -- order_items.id under an alias, so the body reading survives the rename —
  -- the column list is refined before the alias applies positionally.
  n.val                         AS ord_value,       -- @notNull
  n.pos                         AS ord_position,    -- @notNull

  -- COALESCE still recovers non-nullness in the usual way.
  COALESCE(g.quantity, 0)       AS safe_qty         -- @notNull
FROM get_order_items(1) g
CROSS JOIN order_lines(1) ol
CROSS JOIN active_skus() s
CROSS JOIN get_order_items(1) WITH ORDINALITY n(val, a, b, c, d, pos)
