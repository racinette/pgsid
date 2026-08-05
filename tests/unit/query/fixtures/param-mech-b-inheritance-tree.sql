-- Mechanism B reads the flags of the relation the written row LIVES in,
-- and an UPDATE targets the TREE (adversarial-2 finding 8): `ALTER TABLE
-- ONLY pnn_p … SET NOT NULL` leaves pnn_c unconstrained, so a child-stored
-- row ACCEPTS the NULL binding a parent-stored row raises on (measured,
-- both states). columnRejection now takes resolveColumnNotNullTree for
-- update-command targets — closing the asymmetry with the output side,
-- which has read the tree since RC-3 — so no claim is filed: a dropped
-- claim, never a wrong one, and the nullable reading is witnessable in
-- every data state instead of only parent-row ones. The WHERE addresses
-- the child's disjoint id range, which is what lets the universal
-- nullable oracle hold; the INSERT command keeps the named relation's own
-- flag, as inserted rows are stored there.
-- @args ["kept"]
-- @args [null]
-- @param 1 nullable
UPDATE pnn_p SET a = $1 WHERE id > 200
RETURNING
  id  -- @notNull
