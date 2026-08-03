-- RESIDUE fixture (register: harvested facts are NullTests only). The
-- WHERE selects CHECK₁'s team arm, whose `seats IS NOT NULL` is harvested
-- — but its `seats > 1` is not, although seats is pinned by then and a
-- strict comparison over pinned operands cannot be NULL. Promoted, it
-- would negator-falsify CHECK₂'s same-token `seats <= 1` and force the
-- contact. Token-pure and charter-compliant; awaiting the decision to
-- build, pinned meanwhile.
-- @unwitnessable 0: the two CHECKs jointly force overflow_contact non-null
-- on every team row, so no witness can exist; the engine stops at
-- NullTest harvesting. Recorded in the register's residue row.
SELECT
  overflow_contact   -- @nullable
FROM subscription
WHERE plan = 'team'
