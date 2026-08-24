-- PG14's `USING (…) AS x` — the alias names exactly the merged columns.
--
-- Found by the pg-regress replay (join.sql: `SELECT x.* FROM J1_TBL JOIN
-- J2_TBL USING (i) AS x` — engine 0 columns, PostgreSQL 1). The alias owns
-- no relation entry, so star expansion resolved nothing and emitted
-- nothing; it now carries a scope-level map from the alias to the USING
-- list, and `x.*` expands through the same merged-column rule the
-- unqualified star uses — an INNER join's merged column is non-null when
-- both constituents are, which `t.id` and `u.id` are.
SELECT
  x.*,          -- @notNull
  a.name AS nm  -- @nullable
FROM t a JOIN u b USING (id) AS x
