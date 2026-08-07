-- The OVERSHOOT control: a ROOT-level FOR ORDINALITY keeps its claim however
-- many NESTED siblings sit beside it.
--
-- The counter counts the ROOT's rows and is generated for every row the item
-- emits, so it is present on both of these — including the row where each
-- nested counter is NULL:
--
--     rn | na     | nb
--     ---+--------+--------
--      1 | 1      | (null)
--      1 | (null) | 1
--
-- A fix that read "this JSON_TABLE has sibling NESTED paths" and cleared every
-- ordinality in it would take `rn` too. The boundary is INSIDE a NESTED path,
-- and this is the fixture that fails if it moves outward.
--
-- `rn` repeating 1 across both rows is PostgreSQL's own answer, not an
-- accident: the root path `$` matches once, and the nested paths multiply
-- that single root row.
SELECT
  j.rn,   -- @notNull   (the root counter — one row of the root, present on every emitted row)
  j.na,   -- @nullable
  j.nb    -- @nullable
FROM JSON_TABLE('{"a":[1],"b":[3]}'::jsonb, '$' COLUMNS (
       rn FOR ORDINALITY,
       NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY),
       NESTED PATH '$.b[*]' COLUMNS (nb FOR ORDINALITY))) j
