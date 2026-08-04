-- ADVERSARIAL FINDING A-1 — rank 1, notNull unsoundness.
--
-- Falsifying data: one `t` row (id 1), no `u` rows.
-- Observed: PostgreSQL returns (1, NULL, NULL) — the LEFT JOIN extends u —
-- while the engine claims `uid` notNull.
--
-- Suspected mechanism: nullability-walk.ts `columnMatches`, the
-- `parts.length === 1` branch. An UNQUALIFIED ColumnRef in a predicate is
-- matched by column NAME alone, on the comment's assumption that "the caller
-- already knows this alias owns this column". The caller
-- (`checkWhereGuarantee(alias, colName, scope)`) knows only that the alias
-- owns a column of that name — not that the predicate's unqualified
-- reference RESOLVES to that alias. USING/NATURAL is the shape that
-- separates the two: the merged column is what `id` resolves to (and is the
-- only visible `id`, so PostgreSQL accepts the query), while both
-- constituents stay addressable through `aliases`. The merged column of a
-- LEFT JOIN is the LEFT side's value, so `WHERE id IS NOT NULL` says nothing
-- about u — but the engine reads it as a guarantee for `u.id` and overrides
-- the OPTIONAL joinState.
--
-- The annotations below are the claims the engine CURRENTLY makes.
SELECT
  t.id AS tid,   -- @notNull
  u.id AS uid,   -- @notNull  <-- FALSE: NULL on every u-extended row
  u.email,       -- @nullable
  u.t_id         -- @nullable
FROM t LEFT JOIN u USING (id)
WHERE id IS NOT NULL
