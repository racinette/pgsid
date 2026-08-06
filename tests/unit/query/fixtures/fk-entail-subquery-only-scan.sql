-- Gate: an `ONLY` subquery under a TREE-scanning outer reads a SUBSET.
--
-- The self-lookup licence is that the outer row is in the set the subquery
-- scans. `FROM fk_par` reads the inheritance tree, `FROM ONLY fk_par` reads
-- the parent's own rows — so for a row stored in the CHILD the subquery finds
-- nothing, and the data states seed exactly such a row.
--
-- The reverse pairing is sound and is the control below: an ONLY outer with a
-- tree subquery reads a superset.
SELECT
  f.id                                                        AS id,     -- @notNull
  (SELECT f2.o_id FROM ONLY fk_par f2 WHERE f2.id = f.id)     AS only_sq -- @nullable
FROM fk_par f
