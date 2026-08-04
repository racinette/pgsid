-- @unwitnessable 0: multi-statement function bodies are analysed conservatively; the returned expression derives from a NOT NULL argument and never yields NULL
-- @unwitnessable 3: count_it's transition ('SELECT state + 1') in fact preserves non-null state, so the conservative INITCOND-free claim has no witness
-- Multi-statement LANGUAGE sql function: body has INSERT + SELECT from
-- a table. The catalog-adapter correctly takes the last statement (SELECT).
-- The row-count check detects that this SELECT has a FROM clause and is
-- not an aggregate → can return zero rows → function returns NULL.
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
