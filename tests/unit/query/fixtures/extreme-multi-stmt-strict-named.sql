-- @unwitnessable 0: the body's INSERT writes `val = $1` and the scan that
--   follows filters on `val = $1`, so it always finds the row just written;
--   `multi_stmt_log.val` is NOT NULL, so no data state makes this NULL
-- @unwitnessable 1: same entailment in the BEGIN ATOMIC body — `VALUES (2, a)`
--   satisfies `WHERE val = a` — and what it returns is `b`, a NOT NULL column
-- Multi-statement LANGUAGE sql functions: positional, named (BEGIN ATOMIC),
-- and strict variants. Tests the interaction of multi-statement body
-- parsing, named-param reordering, strict dispatch, and the row-count check.
--
-- multi_stmt_fn: old-style $1, body SELECT col FROM table → nullable (row-count)
-- multi_stmt_atomic: BEGIN ATOMIC named params, body SELECT b FROM table → nullable (row-count)
-- strict_multi: STRICT + $1, all-non-null arg → strict dispatch returns true (body skipped)
-- strict_multi_atomic: STRICT + named params, all-non-null args → true (body skipped)
SELECT
  multi_stmt_fn(p.name)             AS pos_from_table,    -- @nullable
  multi_stmt_atomic(p.name, p.sku)  AS atomic_from_table, -- @nullable
  strict_multi(p.name)              AS strict_pos_allnn,  -- @notNull
  strict_multi(p.deleted_at::text)  AS strict_pos_nullarg, -- @nullable
  strict_multi_atomic(p.name, p.sku) AS strict_atomic_allnn,  -- @notNull
  strict_multi_atomic(p.name, p.deleted_at::text) AS strict_atomic_nullarg  -- @nullable
FROM products p
