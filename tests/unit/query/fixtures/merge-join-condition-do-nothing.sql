-- The other half of the arm-kind reading: a NOT MATCHED arm that writes
-- nothing leaves the JOIN CONDITION as row-implied evidence.
--
-- A NOT MATCHED arm normally fires precisely when the condition FAILS, so its
-- rows are the counterexample that stops the condition being evidence — which
-- is why `allMatched` demands every arm be MATCHED-kind. `DO NOTHING` returns
-- no row, so it has no counterexample to offer, and `p.category_id` — nullable
-- in the catalog — is non-null on every row that comes back, because the
-- strict comparison the row matched on says so.
--
-- Product 3 is the control PostgreSQL supplies: its `category_id` is NULL, it
-- matches nothing, and the dead arm drops it. Turn that arm into a real
-- INSERT and it comes back with the NULL — which is `merge-returning.sql`'s
-- shape and the reason the gate reads the arm kind at all.
--
-- `del` is the witness that the promotion is CONDITION-SHAPED rather than a
-- blanket "the target is fully non-null": it is nullable, nothing in the join
-- condition mentions it, and the dense state has it both ways (product 4 is
-- soft-deleted and in category 1, the rest are not).
--
-- No `@planner-keeps` here, unlike its BY SOURCE sibling: with the source a
-- bare scan of `categories` and no arm that can reach a target row without a
-- match, the planner and the walk both come out at zero surviving joins. The
-- oracle rejected the directive when it was written in by habit.
MERGE INTO products p
USING (SELECT c.id AS cid FROM categories c) s
ON p.category_id = s.cid
WHEN MATCHED THEN
  UPDATE SET name = p.name
WHEN NOT MATCHED THEN
  DO NOTHING
RETURNING
  p.id          AS pid,  -- @notNull
  p.category_id AS cat,  -- @notNull  the condition is strict over it
  p.deleted_at  AS del   -- @nullable the condition says nothing about it
