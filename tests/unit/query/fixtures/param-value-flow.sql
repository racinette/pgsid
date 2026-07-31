-- Mechanism C (value-flow rejection), the trigger case found by hand before
-- the generator could: $2's VALUE, forced NULL through the strict
-- concatenation, hits the runtime nn_text coercion in RETURNING, so binding
-- NULL raises when the written row is evaluated. Execution-time like
-- mechanism B — the parameter itself stays typed text — and therefore
-- non-narrowing. $3 shows the attribution boundary: COALESCE absorbs its
-- NULL before the coercion, so it remains a safe binding.
-- @args [910, "e", "g"]
-- @args [911, "e", null]
-- @param 1 notNull
-- @param 2 notNull
-- @param 3 nullable
INSERT INTO t (id, name, active)
VALUES ($1, $2, true)
RETURNING
  ($2 || '!')::nn_text AS echo,                    -- @notNull
  (COALESCE($3, 'd') || '?')::nn_text AS guarded   -- @notNull
