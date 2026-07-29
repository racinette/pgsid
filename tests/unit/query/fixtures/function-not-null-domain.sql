-- Function returning a NOT NULL domain → non-null
SELECT
  always_text(val)   AS c1   -- @notNull
FROM t
