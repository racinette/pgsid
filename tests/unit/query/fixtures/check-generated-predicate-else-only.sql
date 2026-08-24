-- The alwaysNull direction: [11,inf) is disjoint from BOTH arms, so
-- neither can fire and the ELSE — a bare NULL — is the only producer
-- left. This is the channel `alwaysNullExpr` gained on 2026-08-25: it
-- inlines the generation expression the notNull side already inlined,
-- and its CASE rule now consults the same arm pruning, which is what
-- lets the arms' non-null 'yes'/'maybe' stop standing in the way.
--
-- Verified the strong way, and this is the direction that verifies
-- strongest: every returned row falsifies the claim if it is wrong, and
-- gpc seeds a = 12 in every state, so rows come back.
SELECT
  c -- @alwaysNull
FROM gpc
WHERE a >= 11
