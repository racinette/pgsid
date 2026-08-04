-- ADVERSARIAL FINDING 7 — rank 1, notNull unsoundness.
--
-- Falsifying data: none needed; every argument here is a non-null literal.
-- Observed: PostgreSQL returns NULL in all six columns.
--
-- Suspected mechanism: six members of `STRICT_TOTAL_BUILTINS`
-- (nullability-walk.ts) are strict but NOT total — the table's own admission
-- criterion. Measured 2026-08-04:
--
--   array_position(arr, elem)   NULL when the element is not present
--   substring(text FROM regex)  NULL when the pattern does not match — the
--                               POSITIONAL form is total, and name-level
--                               dispatch cannot tell the two apart
--   scale('NaN'::numeric)       NULL
--   min_scale('NaN'::numeric)   NULL
--   to_number('', '')           NULL
--   to_char(<datetime>, '')     NULL — for timestamp, date and interval;
--                               to_char(numeric, '') and to_char(int, '')
--                               return '' and are total
--
-- The rest of the table was swept with adversarial non-null inputs in the
-- same session and held (the findings doc lists what was tried).
SELECT
  array_position(ARRAY['a','b'], 'z') AS a,   -- @notNull  <-- FALSE
  substring('abc' FROM 'z+')          AS b,   -- @notNull  <-- FALSE
  scale('NaN'::numeric)               AS c,   -- @notNull  <-- FALSE
  min_scale('NaN'::numeric)           AS d,   -- @notNull  <-- FALSE
  to_number('', '')                   AS e,   -- @notNull  <-- FALSE
  to_char(now(), '')                  AS f    -- @notNull  <-- FALSE
