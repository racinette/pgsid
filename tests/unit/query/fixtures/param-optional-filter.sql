-- The optional-filter idiom: NULL deliberately disables the filter. This is
-- why "NULL would be useless here" must never be folded into notNull — here
-- NULL is not merely tolerated but meaningful, and both bindings return rows.
--
-- The comparison comes FIRST because parameter type deduction is first-use:
-- `$1 IS NULL OR val = $1` fails PREPARE with "could not determine data type
-- of parameter $1" (pinned in param-mechanism.test.ts).
-- The projection of $1 stays @nullable too: WHERE-conjunct narrowing must
-- not see through the OR — the [null] binding returns rows carrying NULL in
-- echo, via the IS NULL disjunct.
-- @args ["x"]
-- @args [null]
-- @param 1 nullable
SELECT
  id,          -- @notNull
  $1 AS echo   -- @nullable
FROM t
WHERE val = $1 OR $1 IS NULL
