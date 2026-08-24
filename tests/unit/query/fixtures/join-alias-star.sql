-- A PARENTHESIZED JOIN'S OWN ALIAS — `(a JOIN b …) AS j` exposes the whole
-- visible list.
--
-- The sibling of join-using-alias-star.sql, found by the same pg-regress
-- replay statement family (privileges.sql: `SELECT j.* FROM (atest5 a JOIN
-- atest5 b USING (one)) j` — engine 0 columns, PostgreSQL 7). The alias owns
-- no relation entry, so star expansion emitted nothing; it now expands the
-- join's recorded visible list — the merged column by the merge rule, each
-- side's remainder through its own entry, INNER join flags intact.
SELECT
  j.*
  -- @notNull   (id: merged, both sides NOT NULL)
  -- @nullable  (t.name)
  -- @nullable  (t.val)
  -- @notNull   (t.active)
  -- @notNull   (u.t_id)
  -- @notNull   (u.email)
  -- @nullable  (u.val)
  -- @nullable  (u.status)
FROM (t a JOIN u b USING (id)) AS j
