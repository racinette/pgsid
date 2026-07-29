-- LANGUAGE sql function body (BEGIN ATOMIC, named params):
-- pass_two(a text, b text) → text, body: SELECT b (deparsed from $2)
-- Returns the second arg — nullability follows b.
SELECT
  pass_two(t.val, 'lit')    AS c1,  -- @notNull
  pass_two('lit', t.val)     AS c2,  -- @nullable
  pass_two(t.val, t.name)    AS c3   -- @nullable
FROM t
