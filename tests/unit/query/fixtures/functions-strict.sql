-- Functions: strict scalar, user aggregate.
-- lower_strict is strict AND LANGUAGE sql: a nullable argument concludes
-- nullable outright (strictness's one sound direction), while non-null
-- arguments fall through to the body walk — `SELECT $1` — which is what
-- keeps c2 and c4 notNull now that strictness alone no longer claims
-- totality. count_it's INITCOND fixes the EMPTY-input result only; over this
-- non-empty group the result is its transition function's — which is read,
-- not assumed: `SELECT state + 1` is non-null whenever the state is, the
-- INITCOND makes the state non-null to begin with, and there is no FINALFUNC
-- to undo it.
SELECT
  lower_strict(val)    AS c1,  -- @nullable
  lower_strict('lit')  AS c2,  -- @notNull
  count_it(id)         AS c3,  -- @notNull
  lower_strict(id::text) AS c4   -- @notNull
FROM t
GROUP BY id, val
