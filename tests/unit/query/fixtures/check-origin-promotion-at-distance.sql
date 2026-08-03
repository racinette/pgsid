-- Promotion-at-distance (Wave 12, née residue-origin-promotion-at-distance):
-- the guest slice is OPTIONAL inside the body, so its origins carry the
-- optional mark — and the outer filter itself supplies the presence proof
-- (a NULL-extended slice has NULL status, which `status = 'housed'` cannot
-- pass), evidence-checked BEFORE the harvest fixpoint. The CHECK then
-- speaks as if the filter stood next to the join.
WITH g AS (
  SELECT t.id AS tid, x.status, x.arrived_at
  FROM t LEFT JOIN guest x ON x.id = t.id + 1
)
SELECT
  arrived_at   -- @notNull
FROM g
WHERE status = 'housed'
