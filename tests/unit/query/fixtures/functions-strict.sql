-- Functions: strict scalar, user aggregate.
-- lower_strict is strict AND LANGUAGE sql: a nullable argument concludes
-- nullable outright (strictness's one sound direction), while non-null
-- arguments fall through to the body walk — `SELECT $1` — which is what
-- keeps c2 and c4 notNull now that strictness alone no longer claims
-- totality. count_it's INITCOND fixes the EMPTY-input result only; over
-- this non-empty group the result is its transition function's, which the
-- engine cannot analyse.
-- @unwitnessable 2: count_it's transition ('SELECT state + 1') in fact
-- preserves non-null state, so no data can witness the conservative claim.
SELECT
  lower_strict(val)    AS c1,  -- @nullable
  lower_strict('lit')  AS c2,  -- @notNull
  count_it(id)         AS c3,  -- @nullable
  lower_strict(id::text) AS c4   -- @notNull
FROM t
GROUP BY id, val
