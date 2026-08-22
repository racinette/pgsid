-- An outer join's ON qual is evidence a NULL goal may use and a non-null
-- goal may not — found 2026-08-22 while measuring whether the always-null
-- channel's OPTIONAL gate was worth keeping. It was not: with the gate
-- removed nothing changed, because every evidence source that constrains an
-- alias also PROMOTES it out of OPTIONAL. The one that does not is the
-- extending join's own ON qual, which `scope.impliedQuals` deliberately
-- withholds — on a NULL-extended row that qual was not TRUE, so a non-null
-- goal may conclude nothing from it.
--
-- For a NULL goal the case-split closes it. Every emitted row is either:
--   matched   — the ON qual held, g's stored row exists, the CHECKs apply,
--               and 'in-flight' takes the ELSE arm: arrived_at IS NULL;
--   extended  — every column of g is NULL, arrived_at among them.
-- Both arms end at NULL, so the conclusion is unconditional even though the
-- evidence is not. Same one-directional asymmetry as the kernel's presence
-- gate: the rows where the facts fail to apply are the rows that hand you
-- the answer for free.
--
-- `full_arm` is the control that makes the LEFT/RIGHT restriction real
-- rather than decorative. A FULL join emits rows where g is PRESENT and the
-- qual was FALSE — an 'arrived' guest matching no t — so "present implies
-- the qual held" is simply untrue there, and arrived_at can come back
-- non-NULL. If it ever flips to @alwaysNull the restriction has been lost
-- and the claim is wrong, not merely imprecise.
-- `gr` is parenthesised deliberately. Chained as `... RIGHT JOIN guest gr`
-- it would sit on the join's PRESERVED side and never be extended at all —
-- the annotation caught that on the first run, which is the bidirectional
-- check earning its place: a one-directional one would have passed a
-- fixture that pinned nothing.
SELECT
  gl.arrived_at AS left_arm,   -- @alwaysNull  LEFT, entry on the extended side
  gr.arrived_at AS right_arm,  -- @alwaysNull  RIGHT, the mirror shape
  gf.arrived_at AS full_arm    -- @nullable    FULL: present with the qual FALSE
FROM (guest gr RIGHT JOIN t ON gr.id = t.id AND gr.status = 'in-flight')
LEFT JOIN guest gl ON gl.id = t.id AND gl.status = 'in-flight'
FULL JOIN guest gf ON gf.id = t.id AND gf.status = 'in-flight'
