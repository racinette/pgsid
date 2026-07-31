-- The guard on WHERE-conjunct narrowing: an ungrouped aggregate query emits
-- its row even over ZERO input rows, so a returned row does NOT prove the
-- WHERE ever evaluated TRUE — the [null] binding returns [NULL, 0], and c1
-- must stay @nullable. Had the narrowing ignored this, that row would
-- falsify it here.
-- @args ["x"]
-- @args [null]
-- @param 1 nullable
SELECT
  $1 AS c1,        -- @nullable
  count(*) AS c2   -- @notNull
FROM t
WHERE val = $1
