-- The residual's trigger fixture, shipped with the quantifier split: $1
-- defines only ROW ONE of the source column, yet that row always reaches
-- the INSERT arm (a NULL sid matches nothing), so binding NULL raises
-- against the PRIMARY KEY. The contract consumes the EXISTENTIAL face of
-- attribution — one forced row is enough; param-narrow-multirow pins why
-- narrowing must keep the universal face.
-- @args [770]
-- @param 1 notNull
-- @planner-keeps 1: EXPLAIN plans the NOT MATCHED search as an outer join
--   over the source; it is no JoinExpr, so the join audit has no record.
MERGE INTO ck USING (VALUES ($1::int), (771)) s(sid) ON ck.id = s.sid
WHEN NOT MATCHED THEN INSERT (id, name) VALUES (s.sid, 'mr')
RETURNING ck.id AS r_id  -- @notNull
