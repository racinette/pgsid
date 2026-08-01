-- Custom operators, both directions of the trust boundary. ==== is backed
-- by the STRICT strict_same, so its declared strictness gates promotion and
-- parameter narrowing exactly like a builtin comparison: any returned row
-- passed `t.val ==== $1`, which cannot be TRUE with a NULL operand. === is
-- backed by the NON-strict lenient_eq — the engine's first measured
-- unsoundness, pinned in where-promotion-non-strict-op.sql — so it still
-- promotes nothing; but its RESULT now dispatches through the backing
-- function's body (SELECT true) and is notNull. Resolution is the
-- single-candidate policy over the snapshot's pg_operator capture.
-- @args ["x"]
-- @args [null]
-- @param 1 nullable
SELECT
  t.val AS v,                     -- @notNull
  $1 AS echo,                     -- @notNull
  (t.name === t.val) AS lenient,  -- @notNull
  t.name AS nm                    -- @nullable
FROM t
WHERE t.val ==== $1
