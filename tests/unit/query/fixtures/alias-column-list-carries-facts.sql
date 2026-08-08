-- A renamed column is still the SAME column, and must keep every fact the
-- catalog states about it.
--
-- This is the half of the alias-column-list fix that is easy to miss. Making
-- star expansion emit the right NAMES while the renamed column quietly stops
-- reaching its own CHECKs, its generation expression and its keys would look
-- fixed and be a different defect: `c0` would become a column the engine knows
-- nothing about. That degrades to nullable, so it is sound — and it is exactly
-- the kind of soundness that hides a hole.
--
-- Four mechanisms, each over a rename, each notNull for a DIFFERENT reason:
--
--   * `qty` — the plain `attnotnull` flag, through `entryColumnNotNull`.
--   * `discontinued_at` — CHECK ENTAILMENT. `stock` declares
--     `CHECK (qty > 0 OR discontinued_at IS NOT NULL)`, and the WHERE pins the
--     left disjunct false, so the right one must hold. The CHECK is stated in
--     CATALOG names and the WHERE is written in the query's, so the expression
--     is renamed into this scope's vocabulary before the two are compared.
--   * `weight_g` — a GENERATED column, whose expression `weight_kg * 1000` is
--     likewise a catalog-name expression walked in a renamed scope.
--   * `s3.k1` — FOREIGN-KEY entailment across a LEFT JOIN, where the key lives
--     in `pg_constraint` under catalog names and the ON clause is written in
--     the query's.
--
-- The controls are the same claims without a rename, in
-- `alias-column-list-carries-facts-control.sql`.
SELECT
  s1.k0 AS flag_col,        -- @notNull
  s1.k1 AS check_col,       -- @notNull
  s2.k5 AS generated_col,   -- @notNull
  s3.k1 AS fk_col           -- @notNull
FROM stock s1(k0, k1)
CROSS JOIN shipment_tracking s2(k0, k1, k2, k3, k4, k5)
CROSS JOIN orders o
LEFT JOIN customers s3(k0, k1) ON s3.k0 = o.customer_id
WHERE s1.k0 <= 0
