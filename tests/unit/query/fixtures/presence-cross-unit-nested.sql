-- The unit-chain closure, nested form: u's unit sits INSIDE the left
-- composite's — its chain is [composite, u-slice] where t's is
-- [composite] — and a child unit's presence implies every enclosing
-- one's, so pinning u.email certifies t present and t.id reads notNull.
-- Before the closure this shape kept a dead-armed t-unit group and a
-- nullable t.id whose NULL the refilter excluded (the generated corpus's
-- two-arm bar exposed both).
WITH j AS (
  SELECT t.id AS tid, t.name AS tname, u.email AS uemail
  FROM (t LEFT JOIN u ON u.t_id = t.id)
  RIGHT JOIN v ON v.u_id = u.id
)
SELECT
  j.tid,      -- @notNull
  j.tname,    -- @nullable
  j.uemail    -- @notNull
FROM j
WHERE j.uemail IS NOT NULL
