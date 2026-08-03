-- Inter-CHECK chaining at depth three: the WHERE discharges the first
-- constraint's implication (negator pairing), whose harvested `a IS NOT
-- NULL` falsifies the second's first disjunct, whose harvested `b IS NOT
-- NULL` does the same for the third — one fact per fixpoint round, no
-- constraint aware of any other. The idle row keeps each column's claim
-- witnessable in the unchained direction (see check-chain-idle).
SELECT
  a,   -- @notNull
  b,   -- @notNull
  c    -- @notNull
FROM chain3
WHERE stage = 'go'
