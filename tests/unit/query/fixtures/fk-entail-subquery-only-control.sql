-- The control for the scan-mode gate: an `ONLY` outer with a tree-scanning
-- subquery reads a SUPERSET of the outer's rows, so the self-lookup holds and
-- the refusal beside it is not blanket.
SELECT
  f.id                                                   AS id,      -- @notNull
  (SELECT f2.o_id FROM fk_par f2 WHERE f2.id = f.id)     AS tree_sq  -- @notNull
FROM ONLY fk_par f
