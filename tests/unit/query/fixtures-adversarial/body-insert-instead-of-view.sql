-- FINDING 6 (rank 1) — the LANGUAGE sql body's DML path bypasses the
-- rewrite-hook machinery. RC-1's fix made body inlining load-bearing for
-- strict functions; `analyzeSqlFunctionReturn`'s INSERT arm builds its
-- RETURNING scope with `buildDmlScope` DIRECTLY, not `buildInsertScope`,
-- so none of finding 2's responses run: no INSTEAD OF void of the view
-- analysis, no DO INSTEAD rule refusal, no written-value map.
--
-- Falsifying data: none needed — body_ins_view inserts into iot_v, whose
-- INSTEAD OF INSERT trigger reports the NEW it builds and never evaluates
-- the view's own definition (measured in the fix phase).
-- Observed: NULL. Engine: notNull, from the view definition's `'x'::text`.
-- Mechanism: nullability-walk.ts analyzeSqlFunctionReturn(Traced),
-- "InsertStmt" arm.
--
-- The top-level and data-modifying-CTE spellings of the same INSERT ARE
-- voided correctly (measured) — the hole is exactly the body path.
SELECT
  body_ins_view('k') AS lit  -- @notNull  <-- FALSIFIED
