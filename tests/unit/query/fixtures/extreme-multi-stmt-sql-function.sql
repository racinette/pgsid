-- @unwitnessable 0: the INSERT one statement earlier writes `val = $1`, which
--   is exactly the scan's predicate, so the scan always finds at least the row
--   it just wrote — and `multi_stmt_log.val` is NOT NULL
-- @unwitnessable 3: count_it's transition ('SELECT state + 1') in fact preserves non-null state, so the conservative INITCOND-free claim has no witness
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
-- count_it: INITCOND fixes the empty-input result only, and this group is
-- never empty — the unanalysable transition keeps the claim nullable.
SELECT
  multi_stmt_fn(p.name)            AS from_table,   -- @nullable
  double_val(p.id)                 AS no_from,      -- @notNull
  pass_through(p.name)             AS atomic_no_from, -- @notNull
  count_it(p.id)                   AS user_agg      -- @nullable
FROM products p
GROUP BY p.id
