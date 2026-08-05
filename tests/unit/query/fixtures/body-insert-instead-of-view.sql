-- The body inliner routes its INSERT arm through buildInsertScope
-- (adversarial-2 finding 6): body_ins_view's INSERT targets iot_v, whose
-- INSTEAD OF trigger reports the NEW it builds and never evaluates the
-- view's definition — so the view's literal 'x' says nothing and lit reads
-- nullable, exactly as the top-level and data-modifying-CTE spellings of
-- the identical INSERT already did (both were measured correct; the hole
-- was exactly the body path, which called buildDmlScope directly and ran
-- none of the hook responses). Witnessed: the trigger's NEW has no lit, so
-- the call returns NULL on every row.
SELECT
  body_ins_view('k') AS lit  -- @nullable
