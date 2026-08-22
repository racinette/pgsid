-- COUNTEREXAMPLE 1 for `returningRejectedParams`: a second MERGE arm that
-- returns rows without writing the parameter.
--
-- This statement is why the mechanism intersects over arms instead of asking
-- the flat `rejected` set. `$1` IS rejected — routed into ck.val through the
-- NOT MATCHED arm, a NULL binding raises there — and the parameter contract
-- says notNull on exactly that basis. But the MATCHED arm returns a row
-- having touched nothing but `name`, so PostgreSQL answers a NULL binding
-- with one row carrying `r_snm = NULL`. Measured before the mechanism was
-- written; it is the reason the obvious version (params[i].notNull ⟹ a
-- projected $i is notNull) is unsound.
--
-- A param claim is a PRECONDITION — "a NULL binding may raise" — and an
-- output claim is a POSTCONDITION — "no returned row is NULL here". Reading
-- one as the other falsifies on this statement.
--
-- The source key is `1`, and `sparse` is the ONLY data state that seeds ck
-- (id 1). That split is what lets both claims be witnessed by execution
-- rather than excused, and each needs the state the other cannot use:
--
--   sparse/generated  ck.id 1 exists → the MATCHED arm runs, writes nothing
--                     but `name`, and returns a row with `r_snm` NULL. The
--                     nullable claim, witnessed.
--   empty/dense/…     no ck row → the NOT MATCHED arm runs, puts NULL into
--                     ck.val and RAISES. The `@param 1 notNull` claim,
--                     witnessed — the two cannot share a state, because a
--                     raise aborts the statement and returns nothing.
--
-- Hence the FIRST binding, which is the one with a value: the shape is taken
-- from the leading @args line, and the NULL binding raises in three states
-- out of five. Ordered the other way the fixture is shapeless and the suite
-- says so rather than guessing.
--
-- Delete the arm intersection in `returningRejectedParams` and `r_snm` flips
-- to notNull here while the whole hand corpus stays green — this file is the
-- only thing that fails, and it fails as a FALSIFIED claim rather than a
-- stale annotation, because sparse returns the NULL.
-- @args ["a"]
-- @args [null]
-- @param 1 notNull
-- @planner-keeps 1: EXPLAIN plans the NOT MATCHED search as an outer join
--   over the source; it is no JoinExpr, so the join audit has no record.
MERGE INTO ck USING (VALUES (1, $1::text)) AS s(sid, snm)
ON ck.id = s.sid
WHEN MATCHED THEN UPDATE SET name = 'x'
WHEN NOT MATCHED THEN INSERT (id, val) VALUES (s.sid, s.snm)
RETURNING
  s.sid AS r_sid,  -- @notNull   literal, and the source is REQUIRED
  s.snm AS r_snm   -- @nullable  the MATCHED arm returns a row without writing it
