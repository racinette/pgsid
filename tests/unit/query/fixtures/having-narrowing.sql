-- HAVING conjuncts are row-implied WITHOUT the zero-input gate: even the
-- row an ungrouped aggregate emits over empty input must pass HAVING to be
-- emitted, so the strict `u.status <> $1` promotes the group key AND
-- narrows the projected parameter. The argument stays nullable — a NULL
-- binding makes HAVING NULL for every group and returns nothing, cleanly.
-- @args ["zzz"]
-- @args [null]
-- @param 1 nullable
SELECT
  u.status AS st,   -- @notNull
  count(*) AS c,    -- @notNull
  $1 AS echo        -- @notNull
FROM u
GROUP BY u.status
HAVING u.status <> $1
