-- Unfiltered, neither disjunct is refuted, so the CHECK pins nothing and
-- the generated column reads as its own declaration. The three siblings'
-- claims are the PREDICATE choosing a disjunct, not evb's data landing
-- in one band — the pending rows come back NULL here and the rest carry
-- a timestamp.
SELECT
  projected -- @nullable
FROM evb
