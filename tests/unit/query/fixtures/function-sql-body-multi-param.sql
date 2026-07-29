-- LANGUAGE sql function body recursion (old-style, positional $1/$2):
-- concat_val(a text, b text) → text, body: SELECT $2
-- Returns the second arg — nullability follows $2.
SELECT
  concat_val(t.val, 'lit')   AS c1,  --   (b='lit' is non-null literal)
  concat_val('lit', t.val)   AS c2,  --  (b=t.val is nullable)
  concat_val(t.val, t.name)  AS c3   --  (both nullable)
FROM t
