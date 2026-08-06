-- A NOT NULL domain in the return type is enforced on a value the function
-- RETURNS, and a strict call handed a NULL argument returns none: it stops at
-- the call boundary, past the body and past the domain. dom_strict of a NULL
-- name is NULL despite `RETURNS nn_text` — measured, and sparse's NULL-named
-- row witnesses it.
--
-- Both controls run the function, and there the domain claim stands: the
-- literal argument is non-null, and dom_lenient is not strict, so a NULL
-- argument reaches its body and the returned value is domain-checked.
SELECT
  dom_strict(t.name)   AS strict_arg,  -- @nullable
  dom_strict('lit')    AS strict_lit,  -- @notNull
  dom_lenient(t.name)  AS lenient      -- @notNull
FROM t
