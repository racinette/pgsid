-- BLAME FILE for `srf-refilter-implies-the-function-row-is-present` in
-- tests/unit/query/generated/generated-soundness.test.ts (the srf-left half of
-- the plain/a_tb bucket). See body-parameter-by-name-is-untyped.blame.sql for
-- what a blame file is.
--
-- The mechanism the reason rests on: a `RETURNS SETOF u` function erases u's
-- column constraints at the signature, and the walk recovers them by reading
-- the body back — so on a row the function actually returned, `email` carries
-- u's catalog NOT NULL. That is what makes the refilter wrappers' claim
-- unwitnessable: they pin a_tc IS NOT NULL, which can only hold on a returned
-- row, and on a returned row a_tb is non-null too.
--
-- `present` flipping to nullable would mean the read-back stopped recovering
-- what SETOF erased, and the reason would be blaming the refilter for a claim
-- that had become nullable for an unrelated reason. `extended` flipping to
-- notNull would mean the LEFT JOIN LATERAL's extension stopped being modelled
-- — the other half of the reason, and unsound.
SELECT
  gi.email AS present,   -- @notNull   returned row, read back through SETOF u
  gl.email AS extended   -- @nullable  no key -1 exists, so every row extends
FROM t
JOIN LATERAL gfn_urows(t.id) AS gi ON true
LEFT JOIN LATERAL gfn_urows(-1) AS gl ON true
