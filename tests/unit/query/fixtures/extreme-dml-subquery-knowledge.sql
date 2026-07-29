-- Knowledge preservation: DML in subquery positions.
--
-- PostgreSQL forbids data-modifying statements (INSERT/UPDATE/DELETE) in
-- subquery positions — `SELECT * FROM (INSERT INTO ... RETURNING ...) sub`
-- is a syntax error. DML is only allowed:
--   1. As a top-level statement.
--   2. Inside a CTE: `WITH ins AS (INSERT ... RETURNING ...) SELECT ... FROM ins`.
--   3. Inside a LANGUAGE sql function body — the function wraps the DML
--      and can be called anywhere a regular function can, including
--      scalar subquery contexts.
--
-- This fixture tests case 3: a LANGUAGE sql function wrapping
-- INSERT...RETURNING (single-row VALUES) called in a SELECT. The walk
-- detects the single-row VALUES INSERT → single-row-guaranteed →
-- propagates the RETURNING column's nullability (tags.id is NOT NULL).
-- Compare with the UPDATE function which can match zero rows → nullable.
SELECT
  insert_tag(p.name)                           AS insert_from_fn,  -- @notNull
  COALESCE(insert_tag(p.name), 0)              AS safe_insert,    -- @notNull
  (SELECT insert_tag(p.name))                   AS scalar_subquery,  -- @notNull
  update_tag_price(p.id, p.name)              AS update_from_fn  -- @nullable
FROM products p
