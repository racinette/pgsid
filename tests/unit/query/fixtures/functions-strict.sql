-- Functions: strict scalar, user aggregate
-- lower_strict is strict: nullable if arg nullable, non-null if arg non-null
-- count_it is a user aggregate: conservative nullable (not count)
SELECT
  lower_strict(val)    AS c1,  -- 
  lower_strict('lit')  AS c2,  -- 
  count_it(id)         AS c3,  -- 
  lower_strict(id)     AS c4   -- 
FROM t
