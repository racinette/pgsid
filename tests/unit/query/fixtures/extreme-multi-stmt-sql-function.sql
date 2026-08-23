-- Multi-statement LANGUAGE sql function: body has INSERT + SELECT from a
-- table. The catalog keeps every statement now and hands the walk the last one
-- plus the ones before it, which is what makes `from_table` notNull: the scan
-- has a FROM clause and no aggregate, so alone it could return zero rows, and
-- the `INSERT INTO multi_stmt_log VALUES (1, $1)` above it wrote exactly the
-- row its `WHERE val = $1` looks for.
--
-- The claim used to be nullable with a recorded reason, and the reason was
-- wrong before it was right: it said the return derives from a NOT NULL
-- argument. It derives from a table scan. See
-- `multi-stmt-insert-entails-row.sql` for the rule and its controls.
--
-- Compare with double_val (body: SELECT $1, no FROM → single row).
-- count_it sits here as the contrast: a body the walk reads all the way
-- through in a different way — its transition is one statement, so no
-- entailment between statements is needed and the fold's induction closes.
SELECT
  multi_stmt_fn(p.name)            AS from_table,   -- @notNull
  double_val(p.id)                 AS no_from,      -- @notNull
  pass_through(p.name)             AS atomic_no_from, -- @notNull
  count_it(p.id)                   AS user_agg      -- @notNull
FROM products p
GROUP BY p.id
