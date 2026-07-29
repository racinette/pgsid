-- LANGUAGE sql function body (BEGIN ATOMIC, named param):
-- pass_through(x text) → text, body: SELECT x (deparsed from $1)
SELECT
  pass_through(t.val)    AS c1,  -- @nullable
  pass_through('lit')    AS c2   -- @notNull
FROM t
