-- The positive control for the inheritance gate: `FROM ONLY fk_par` reads the
-- named relation's own rows, which the key does constrain, so the entailment
-- holds and the refusal above is not blanket.
--
-- @planner-keeps 1: the LEFT JOIN settles by foreign-key entailment over
--   the ONLY scan's own rows; the planner does not reason from keys.
SELECT
  f.o_id   AS o_id,     -- @notNull
  o.status AS status    -- @notNull
FROM ONLY fk_par f
LEFT JOIN orders o ON o.id = f.o_id
