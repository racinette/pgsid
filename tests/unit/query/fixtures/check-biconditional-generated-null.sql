-- The complement, and the direction a one-sided CHECK cannot give: the
-- working disjunct's `status <> 'pending'` is FALSE here, so the
-- survivor is the pending one and it carries `started_at IS NULL`. NULL
-- under a strict `+` is NULL, so the generated column is NULL on every
-- returned row.
--
-- Both facts come off ONE constraint — the harvest reads a NullTest of
-- either polarity as TRUE outright, since a NullTest never evaluates
-- NULL — which is why the biconditional spelling reads in two directions
-- where `CHECK (status = 'pending' OR started_at IS NOT NULL)` reads in
-- one.
SELECT
  projected -- @alwaysNull
FROM evb
WHERE status = 'pending'
