-- Finding 5's RANK-4 face, and what it looks like once the flag is gone: NO
-- presence group is emitted here at all.
--
-- Before the fix both ordinalities were notNull, which made them presence-group
-- DISCRIMINANTS — "proven non-null on the present arm" is exactly what a
-- discriminant means. The engine emitted `{ columns: [1,2], discriminants:
-- [1,2] }` over these three rows:
--
--     id | na     | nb
--     ---+--------+--------
--      1 | 1      | (null)
--      1 | (null) | 1
--      2 | (null) | (null)
--
-- Rows one and two each have ONE discriminant NULL, which is the first group
-- assertion's failure verbatim — discriminants are supposed to be NULL only
-- together, as the unit's absence. Row three is the genuine absent arm, and it
-- is what made the group look meaningful: a consumer narrowing on
-- `na !== null` would conclude the whole unit is present, and row two is a row
-- where it IS present and `na` is NULL anyway.
--
-- A group needs at least one discriminant, so clearing the flags removes it
-- rather than correcting it. The absence is the assertion: this suite checks
-- engine-claimed groups against `@null-group` annotations in BOTH directions,
-- so a group reappearing here fails as an unannotated claim.
SELECT
  c.id,    -- @notNull
  j.na,    -- @nullable
  j.nb     -- @nullable
FROM customers c
LEFT JOIN JSON_TABLE('{"a":[1],"b":[3]}'::jsonb, '$' COLUMNS (
       NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY),
       NESTED PATH '$.b[*]' COLUMNS (nb FOR ORDINALITY))) j ON c.id = 1
