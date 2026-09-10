-- Both catalog arms preserve the required title, while only the retired arm
-- supplies a date.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  b.title,       -- @notNull
  b.retired_on   -- @nullable
FROM books b
WHERE b.retired_on IS NOT NULL
UNION ALL
SELECT
  b.title,
  NULL::date
FROM books b
WHERE b.retired_on IS NULL
