-- A body's final scan settled by a statement that ran before it.
--
-- `multi_stmt_fn` is `INSERT INTO multi_stmt_log VALUES (1, $1); SELECT val
-- FROM multi_stmt_log WHERE val = $1`. The scan has a FROM clause and no
-- aggregate, so on its own it could return zero rows and the function could
-- return NULL — and it cannot, because the insert one statement earlier wrote
-- the row the WHERE looks for. A SQL function advances the command counter
-- between statements, so the scan sees it: `multi_stmt_fn('brand-new-value')`
-- returns that value out of a table that did not contain it (measured).
--
-- At-least-one is the predicate again — a scalar SQL function returns the
-- FIRST row, or NULL over none — so this is the third route to it, after the
-- key-entailed subquery and the UNION arm. It is the first whose evidence is
-- not in the statement being judged at all.
--
-- The six columns after it are that same shape with ONE thing changed, and
-- PostgreSQL answers NULL for every one. Three break the insert's promise and
-- three break the scan's ability to keep it.
SELECT
  multi_stmt_fn(p.name)        AS entailed,      -- @notNull

  -- The insert side.
  ms_ctl_delete(p.name)        AS then_deleted,  -- @nullable
  ms_ctl_other(p.name)         AS other_value,   -- @nullable
  ms_ctl_conflict(p.name)      AS on_conflict,   -- @nullable
  ms_ctl_select(p.name)        AS insert_select, -- @nullable

  -- The scan side.
  ms_ctl_limit(p.name)         AS limited,       -- @nullable
  ms_ctl_having(p.name)        AS having_side    -- @nullable
FROM products p
