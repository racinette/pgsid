-- The same one level down: a NESTED path INSIDE another, where the inner
-- array is empty for one outer element.
--
-- "A child's rows all belong to one parent row" is true and does not make the
-- child's counter non-null: the outer element with no children still emits,
-- with `nb` NULL.
--
--     na | nb
--     ---+--------
--      1 | 1
--      2 | (null)
--
-- The control that says the fix reaches every DEPTH rather than only the top
-- level: the descent carries "inside a NESTED path" down instead of asking
-- the question once.
-- @unwitnessable 0: the outer path matches both elements of a literal array,
--   so `na` is nullable by the rule and no state can witness it — the inner
--   counter is what this fixture falsifies, and it does. Closing it needs the
--   item RUN as a probe, which pgsql-deparser 18.1.1 cannot render: it throws
--   on every SQL/JSON node. Conservative, not wrong —
--   docs/deparser-limitations.md §1, blocked on upstream support
SELECT
  j.na,   -- @nullable  (nested itself, so nullable for the same reason)
  j.nb    -- @nullable  (NULL for the outer element whose array is empty)
FROM JSON_TABLE('{"a":[{"c":[1]},{"c":[]}]}'::jsonb, '$' COLUMNS (
       NESTED PATH '$.a[*]' COLUMNS (na FOR ORDINALITY,
         NESTED PATH '$.c[*]' COLUMNS (nb FOR ORDINALITY)))) j
