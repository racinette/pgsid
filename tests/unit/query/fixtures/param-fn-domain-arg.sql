-- Coercing an argument to a function's declared NOT NULL domain parameter
-- applies the domain constraint: NULL raises at the call, even though the
-- function's own body never rejects anything. The output is @notNull by
-- mechanism-A narrowing: the inlined body echoes an argument that any
-- returned row proves non-null.
-- @args ["v"]
-- @param 1 notNull
SELECT takes_nn($1) AS c1  -- @notNull
