-- A LONE NESTED path whose array is EMPTY — no sibling anywhere, and the
-- ordinality counter is NULL anyway.
--
-- This is the shape that decides what the rule is. The sweep's report reached
-- for a SIBLING test, on the measurement that one nested path is sound; that
-- measurement was taken over a non-empty array. A NESTED path is an OUTER
-- JOIN against the level above it, so when it matches nothing the parent row
-- survives with the counter NULL, sibling or no sibling.
--
--     rv | na
--     ---+--------
--      1 | (null)
--
-- The root column `rv` is here to show the parent row is what survives: the
-- statement returns a row, and only the nested column is missing from it. The
-- key-absent spelling (`'{"z":1}'` with a path of `$.a[*]`) behaves
-- identically — measured.
-- @unwitnessable 0: the document is a literal in the statement, so `$.z` is
--   present in every state and this column has nothing to be NULL over. The
--   exact probe exists — run the item and read `bool_and(rv IS NOT NULL)` —
--   and cannot be built: pgsql-deparser 18.1.1 throws on every SQL/JSON node,
--   so a closed JSON_TABLE cannot be rendered to run. Conservative, not
--   wrong. docs/deparser-limitations.md §1; blocked on upstream support
SELECT
  j.rv,   -- @nullable  (an ordinary JSON_TABLE column)
  j.na    -- @nullable  (the counter of a path that matched nothing)
FROM JSON_TABLE('{"z":1,"a":[]}'::jsonb, '$' COLUMNS (
       rv integer PATH '$.z',
       NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY))) j
