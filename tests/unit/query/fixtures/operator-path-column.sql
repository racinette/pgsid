-- The READABLE half of `name-level-partial-overload.sql`, and the case that
-- was always right.
--
-- `operator-path-plus.sql` proves the signature narrowing over path LITERALS.
-- This proves it over a path COLUMN, which is the input the register named as
-- the falsifying one and which the corpus did not contain until 2026-08-24:
-- the operand types are readable straight from the catalog, `+(path,path)`
-- survives the narrowing, and the claim is refused. Both columns are closed
-- paths, so PostgreSQL returns NULL on every row and the claim is witnessed.
SELECT
  r.seg           AS seg,   -- @notNull
  r.seg + r.alt   AS sum    -- @nullable
FROM route r
