-- Uniqueness-based join removal — the divergence class that is NOT a
-- nullability fact, pinned so the distinction stays visible in the hand
-- corpus (the generated census carries 138 of these; deferred-tasks §4).
--
-- `ck.id` is a PRIMARY KEY, the join equates it, and nothing references
-- `ck`'s columns — so remove_useless_joins deletes the join outright: it
-- can neither duplicate nor filter `t` rows. That is a row-count theorem,
-- not a nullability one. The walk keeps the join surviving, and SHOULD:
-- modelling removal would buy no claim (no ck column exists to claim
-- anything about) at the price of a uniqueness analysis the engine has no
-- other use for. Permanently out of scope, per the classifier's verdict.
--
-- @planner-reduces 1: remove_useless_joins deleted the unique, unreferenced
--   ck side — a row-count fact with no nullability content, permanently out
--   of scope for the walk (the classifier's join-removal verdict).
SELECT
  t.id   AS tid,    -- @notNull
  t.name AS tname   -- @nullable
FROM t
LEFT JOIN ck ON ck.id = t.id
