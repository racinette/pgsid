-- Where the two mechanisms meet: the substituted value is itself NULL, and
-- the function is STRICT. PostgreSQL substitutes the declared NULL, sees a
-- NULL argument, and returns NULL without entering the body — so `SELECT a`,
-- which would hand back the non-null id, never runs. Measured: every row
-- comes back NULL.
--
-- The same call with the parameter SUPPLIED runs the body, and the body's
-- guarantee holds — which is what makes the first column's claim about
-- strictness rather than about the body.
SELECT
  def_strict(t.id)     AS omitted,  -- @nullable
  def_strict(t.id, 3)  AS supplied  -- @notNull
FROM t
