-- Gate: a parent's foreign key does not reach its children.
--
-- pg_constraint records the key on fk_par alone and a violating row inserts
-- into fk_chi without complaint (measured), so `FROM fk_par` — which scans the
-- tree — reads rows nothing checked. The tree/named split is the same one
-- notNullTree and resolveCheckConstraintsTree already take.
--
-- Witnessed: every data state seeds fk_chi with a dangling o_id, so the join
-- really does null-extend.
SELECT
  f.o_id   AS o_id,     -- @notNull
  o.status AS status    -- @nullable
FROM fk_par f
LEFT JOIN orders o ON o.id = f.o_id
