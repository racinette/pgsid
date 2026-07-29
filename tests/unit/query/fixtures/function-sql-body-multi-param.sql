-- LANGUAGE sql function body recursion (old-style, positional $1/$2):
-- concat_val(a text, b text) → text, body: SELECT $2
-- Returns the second arg — nullability follows $2.
SELECT
  concat_val(t.val, 'lit')   AS c1,  -- @notNull
  concat_val('lit', t.val)   AS c2,  -- @nullable
  concat_val(t.val, t.name)  AS c3   -- @nullable
FROM t
