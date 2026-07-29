-- Functions: strict scalar, user aggregate
-- lower_strict is strict: nullable if arg nullable, non-null if arg non-null
-- count_it is a user aggregate with INITCOND '0': non-null even over zero rows
SELECT
  lower_strict(val)    AS c1,  -- @nullable
  lower_strict('lit')  AS c2,  -- @notNull
  count_it(id)         AS c3,  -- @notNull
  lower_strict(id::text) AS c4   -- @notNull
FROM t
GROUP BY id, val
