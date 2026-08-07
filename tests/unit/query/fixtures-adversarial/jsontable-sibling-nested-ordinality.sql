-- SWEEP-4 FINDING 5 (rank 1). Quarantined: both `na` and `nb` are the
-- engine's CURRENT claims and BOTH are WRONG.
--
-- Falsifying data: none — the JSON literal is in the statement.
-- Observed: two rows, each with one ordinality NULL.
--
--     na     | nb
--     -------+--------
--     1      | (null)
--     (null) | 1
--
-- `collectJsonTableColumns` splices a NESTED PATH's columns into the same
-- output row as its siblings, and marks `JTC_FOR_ORDINALITY` notNull on the
-- true premise that an ordinality counter is generated for every row it
-- counts. What it counts is its OWN path. PostgreSQL evaluates sibling
-- NESTED paths as a UNION: a row produced by `$.a[*]` carries NULL in every
-- column of `$.b[*]`, ordinality included, and the other way round.
--
-- One NESTED path alone is safe (measured), and so is a NESTED path INSIDE
-- another — a child's rows all belong to one parent row, so nothing is
-- unioned (measured, three rows, no NULLs). The unsound case is exactly two
-- or more SIBLINGS, and an empty array on one side is the same shape with
-- one arm contributing nothing (`{"a":[],"b":[3]}` gives one row with `na`
-- NULL).
--
-- The fix is the sibling test, not the ordinality rule: a FOR ORDINALITY
-- column is notNull when its path is the only one at its level, and nullable
-- when it has a sibling. `collectJsonTableColumns` flattens the tree before
-- anything can ask, so the question has to be asked during the descent.
--
-- Suspected mechanism: nullability-walk.ts `collectJsonTableColumns` —
-- `notNull: col.coltype === "JTC_FOR_ORDINALITY"`, with `JTC_NESTED`
-- recursing into the same flat `out` array.
--
-- Attack-catalog entry: none — the free-form session. JSON_TABLE arrived
-- with PG17 and the node census classifies it `handled`, which is how a
-- FROM item nobody had put two nested paths in stayed unfalsified.
SELECT
  j.na,   -- @notNull   <- FALSE
  j.nb    -- @notNull   <- FALSE
FROM JSON_TABLE('{"a":[1],"b":[3]}'::jsonb, '$' COLUMNS (
       NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY),
       NESTED PATH '$.b[*]' COLUMNS (nb FOR ORDINALITY))) j
