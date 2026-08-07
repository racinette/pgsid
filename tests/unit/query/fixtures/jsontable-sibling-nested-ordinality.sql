-- Sibling NESTED paths NULL each other's columns, ordinality included —
-- sweep-4 finding 5, where the engine claimed BOTH counters notNull.
--
-- PostgreSQL evaluates sibling NESTED paths as a UNION: two rows come back,
-- each carrying one of the two counters and NULL for the other.
--
--     na     | nb
--     -------+--------
--     1      | (null)
--     (null) | 1
--
-- No seed data — the JSON literal is in the statement, so every state
-- witnesses both NULLs.
--
-- The premise the old rule rested on is true and does not reach: an ordinality
-- counter IS generated for every row it counts. What it counts is its OWN
-- path, and a row the sibling produced is not one of those.
SELECT
  j.na,   -- @nullable  (NULL on the row `$.b[*]` produced)
  j.nb    -- @nullable  (NULL on the row `$.a[*]` produced)
FROM JSON_TABLE('{"a":[1],"b":[3]}'::jsonb, '$' COLUMNS (
       NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY),
       NESTED PATH '$.b[*]' COLUMNS (nb FOR ORDINALITY))) j
