-- Multi-statement LANGUAGE sql functions: positional, named (BEGIN ATOMIC),
-- and strict variants. Tests the interaction of multi-statement body
-- parsing, named-param reordering, strict dispatch, and the row-count check.
--
-- The two body-read columns are notNull because each body's INSERT writes the
-- row its own scan then looks for; see `multi-stmt-insert-entails-row.sql`.
--
-- The ATOMIC one carries a second fact worth naming. PostgreSQL's deparser
-- renders a `BEGIN ATOMIC` body back with its parameters QUALIFIED BY THE
-- FUNCTION NAME once the body has a FROM clause — `SELECT b FROM t WHERE …`
-- returns as `multi_stmt_atomic.b` — and the walk read only the bare form, so
-- the returned expression resolved to nothing and stayed nullable even once
-- the row count was settled. Both halves had to land for this column to move.
--
-- multi_stmt_fn: old-style $1, body SELECT col FROM table, insert-entailed
-- multi_stmt_atomic: BEGIN ATOMIC named params, same shape, qualified params
-- strict_multi: STRICT + $1, all-non-null arg → strict dispatch returns true (body skipped)
-- strict_multi_atomic: STRICT + named params, all-non-null args → true (body skipped)
SELECT
  multi_stmt_fn(p.name)             AS pos_from_table,    -- @notNull
  multi_stmt_atomic(p.name, p.sku)  AS atomic_from_table, -- @notNull
  strict_multi(p.name)              AS strict_pos_allnn,  -- @notNull
  strict_multi(p.deleted_at::text)  AS strict_pos_nullarg, -- @nullable
  strict_multi_atomic(p.name, p.sku) AS strict_atomic_allnn,  -- @notNull
  strict_multi_atomic(p.name, p.deleted_at::text) AS strict_atomic_nullarg  -- @nullable
FROM products p
