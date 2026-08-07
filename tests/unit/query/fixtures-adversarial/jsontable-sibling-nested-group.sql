-- SWEEP-4 FINDING 5, its RANK-4 face. Quarantined: the group is the
-- engine's CURRENT claim and is WRONG.
--
-- Falsifying data:
--   INSERT INTO customers (id, email, name) VALUES (1, 'a@x', 'ay'), (2, 'b@x', NULL);
-- Observed: three rows.
--
--     id | na     | nb
--     ---+--------+--------
--      1 | 1      | (null)
--      1 | (null) | 1
--      2 | (null) | (null)
--
-- The engine emits `{ columns: [1,2], discriminants: [1,2] }` — both
-- ordinalities are discriminants, because finding 5 has them provably
-- non-null on the present arm. Rows one and two each have ONE discriminant
-- NULL, which is the first group assertion's failure exactly: "discriminants
-- disagree in one row — they are supposed to be NULL only together, as the
-- unit's absence".
--
-- Row three is the genuine absent arm and is the reason the group is not
-- merely noise: a consumer narrowing on `na !== null` would conclude the
-- whole unit is present, and row two is a row where it is present and `na`
-- is NULL anyway.
--
-- Suspected mechanism: nullability-walk.ts `collectJsonTableColumns`
-- (finding 5), consumed by the presence-group assembly.
--
-- Attack-catalog entry: the free-form session, crossed with G.
-- @null-group 1,2
SELECT
  c.id,    -- @notNull
  j.na,    -- @nullable  (discriminant)
  j.nb     -- @nullable  (discriminant)
FROM customers c
LEFT JOIN JSON_TABLE('{"a":[1],"b":[3]}'::jsonb, '$' COLUMNS (
       NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY),
       NESTED PATH '$.b[*]' COLUMNS (nb FOR ORDINALITY))) j ON c.id = 1
