-- The unit-chain closure, same-unit form (found by the widened generated
-- axis): (t JOIN u) is ONE extension unit under the RIGHT JOIN, and
-- extension is atomic per unit — so pinning u.email proves t's slice
-- present too, across TABLES, and t.id's catalog NOT NULL applies.
-- Origins carry their unit-crossing chains out of the re-export; the
-- certifier rides the rename map under a NUL sentinel only the presence
-- gate can see. tname stays nullable (intrinsic), witnessed by t.1's
-- NULL name on the surviving matched chain.
WITH j AS (
  SELECT t.id AS tid, t.name AS tname, u.email AS uemail
  FROM (t JOIN u ON u.t_id = t.id)
  RIGHT JOIN v ON v.u_id = u.id
)
SELECT
  j.tid,      -- @notNull
  j.tname,    -- @nullable
  j.uemail    -- @notNull
FROM j
WHERE j.uemail IS NOT NULL
