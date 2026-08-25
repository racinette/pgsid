-- Casting a parameter to a NOT NULL domain types the parameter AS the domain,
-- so binding NULL raises at Bind, before execution — mechanism A, measured
-- in param-mechanism.test.ts.
-- @args ["x"]
-- @param 1 notNull
SELECT $1::nn_text AS c1  -- @notNull
