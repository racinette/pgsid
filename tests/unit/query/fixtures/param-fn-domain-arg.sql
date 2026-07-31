-- @unwitnessable 0: takes_nn echoes an argument that can never be NULL (a NULL binding raises at the call); consuming that fact on the output side is deferred (docs/argument-nullability.md)
-- Coercing an argument to a function's declared NOT NULL domain parameter
-- applies the domain constraint: NULL raises at the call, even though the
-- function's own body never rejects anything. The output stays nullable —
-- takes_nn returns plain text and its body just echoes a nullable argument.
-- @args ["v"]
-- @param 1 notNull
SELECT takes_nn($1) AS c1  -- @nullable
