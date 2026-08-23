-- @unwitnessable 0: the INSERT one statement earlier writes `val = $1`, which
--   is exactly the scan's predicate, so the scan always finds at least the row
--   it just wrote — and `multi_stmt_log.val` is NOT NULL
-- Multi-statement LANGUAGE sql function: body has INSERT + SELECT from
-- a table. The catalog-adapter correctly takes the last statement (SELECT).
-- The row-count check sees that this SELECT has a FROM clause and is not an
-- aggregate, so it can return zero rows and the walk claims nullable.
--
-- PostgreSQL never returns NULL here, and the reason is the statement the
-- walk does not read: `INSERT INTO multi_stmt_log VALUES (1, $1)` runs first
-- and its row satisfies the following `WHERE val = $1`. Closing this needs a
-- nonempty entailment BETWEEN statements of one body, which is a different
-- question from the row count of any one of them. The claim is conservative
-- rather than wrong; what was wrong was the recorded reason, which said the
-- return derives from the argument. It derives from a table scan.
--
-- Compare with double_val (body: SELECT $1, no FROM → single row).
-- count_it sits here as the contrast: a body the walk DOES read all the way
-- through. Its transition is one statement, so no entailment between
-- statements is needed and the fold's induction closes.
SELECT
  multi_stmt_fn(p.name)            AS from_table,   -- @nullable
  double_val(p.id)                 AS no_from,      -- @notNull
  pass_through(p.name)             AS atomic_no_from, -- @notNull
  count_it(p.id)                   AS user_agg      -- @notNull
FROM products p
GROUP BY p.id
