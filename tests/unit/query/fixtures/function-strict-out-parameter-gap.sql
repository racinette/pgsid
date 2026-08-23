-- Strictness asked per PARAMETER, not per supplied argument.
--
-- mid_out declares an OUT parameter BETWEEN its two inputs, so a call's
-- positional arguments do not line up with the parameter list: `mid_out(1, 2)`
-- passes 2 to `b`, which sits at position THREE. The walk maps that now — a
-- positional argument's index is its INPUT ORDINAL, skipping the OUT slot —
-- and the two columns here are the two sides of what the map decides.
--
-- `omitted` is nullable and witnessed on every row: `b` is not supplied, its
-- declared default is NULL, and mid_out is STRICT, so PostgreSQL returns
-- without ever running `SELECT a`. The default is bound now where the pass
-- used to stop at the first non-input parameter; the two facts agree.
--
-- `supplied` is notNull. It used to be nullable behind a recorded reason, and
-- the reason was a real gap rather than a refusal: the walk did not bind past
-- the OUT parameter, so the literal 2 landed on `x` and `b` read unbound,
-- which left strictness unproven for a call whose inputs are all proven. It
-- took three aligned fixes — the positional map, the default pass no longer
-- terminating at an OUT parameter, and `allArgumentsNonNull` no longer reading
-- the OUT parameter's own empty slot as a nullable argument.
SELECT
  mid_out(t.id)     AS omitted,  -- @nullable
  mid_out(t.id, 2)  AS supplied  -- @notNull
FROM t
