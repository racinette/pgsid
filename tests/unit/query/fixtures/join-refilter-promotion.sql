-- The strict-qual-over-a-NULL-extended-side closure, on the register's own
-- example: in (t LEFT u) INNER v ON v.u_id = u.id, no NULL-extended u row
-- can pass the strict inner qual, so the presence fixpoint proves u present
-- in every emitted row and u's columns revert to base nullability. u.val
-- stays nullable — presence cancels null-EXTENSION, not the catalog.
SELECT
  u.email AS em,   -- @notNull
  u.val AS uv,     -- @nullable
  v.amount AS am   -- @nullable
FROM (t LEFT JOIN u ON u.t_id = t.id)
JOIN v ON v.u_id = u.id
