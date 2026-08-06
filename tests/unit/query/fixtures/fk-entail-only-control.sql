-- The positive control for the inheritance gate: `FROM ONLY fk_par` reads the
-- named relation's own rows, which the key does constrain, so the entailment
-- holds and the refusal above is not blanket.
SELECT
  f.o_id   AS o_id,     -- @notNull
  o.status AS status    -- @notNull
FROM ONLY fk_par f
LEFT JOIN orders o ON o.id = f.o_id
