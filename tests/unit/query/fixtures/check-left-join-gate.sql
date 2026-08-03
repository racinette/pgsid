-- The joinState gate over CHECK entailment, pinned by its counterexample —
-- the CHECK analogue of generated-left-join-gate.sql. The ON qual carries
-- exactly the predicate that would prove g.arrived_at non-null, but an
-- unproven LEFT JOIN's qual is not row-implied evidence and a NULL-extended
-- row satisfies no CHECK, so the entry stays OPTIONAL and the claim stays
-- nullable. sparse: t's one row has id 1 and guest 1 is in-flight, so the
-- equality matches, the status conjunct fails, and the extension is witnessed.
SELECT
  h.id AS hid,          -- @notNull
  g.arrived_at AS ga    -- @nullable
FROM t h
LEFT JOIN guest g ON g.id = h.id AND g.status = 'housed'
