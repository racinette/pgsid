-- The CASE guard does NOT protect the parameter: its type resolves to the
-- domain at parse analysis and NULL is rejected at Bind, before any branch is
-- evaluated. Guard-immunity is measured in param-mechanism.test.ts.
-- @args ["y"]
-- @param 1 notNull
SELECT
  CASE WHEN active THEN $1::nn_text ELSE 'e' END AS c1  -- @notNull
FROM t
