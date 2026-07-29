-- MinMaxExpr (GREATEST/LEAST): PostgreSQL skips NULL arguments, so the
-- result is non-null as soon as ONE argument is non-null, and nullable only
-- when every argument is.
SELECT
  GREATEST(val, 'z')  AS c1,  -- @notNull
  LEAST(name, val)    AS c2   -- @nullable
FROM t
