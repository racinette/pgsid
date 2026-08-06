-- Strictness asked per PARAMETER, not per supplied argument.
--
-- mid_out declares an OUT parameter between its two inputs, so a call's
-- positional arguments no longer line up with the parameter list and the walk
-- binds nothing past it. What survives that is the question strictness needs:
-- is every INPUT parameter proven non-null? Here the last one is not — the
-- call omits it and its default is NULL — so the call returns NULL without
-- running `SELECT a`, and every row witnesses it.
--
-- The second column pays for the same gap in precision rather than soundness.
-- @unwitnessable 1: with the argument SUPPLIED PostgreSQL passes 2 and returns
--   the non-null id, so nothing can witness this claim. The walk does not bind
--   arguments past an interleaved OUT parameter — a misaligned binding is
--   worse than an unbound one — so the supplied value is not read and
--   strictness stays unproven.
SELECT
  mid_out(t.id)     AS omitted,  -- @nullable
  mid_out(t.id, 2)  AS supplied  -- @nullable
FROM t
