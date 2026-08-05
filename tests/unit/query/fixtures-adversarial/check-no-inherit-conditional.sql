-- FINDING 2, second shape — the discriminated form, which is the motivating
-- shape the entailment kernel exists for. `CHECK (status <> 'open' OR note
-- IS NOT NULL) NO INHERIT` on the parent, `WHERE status = 'open'` in the
-- query: the kernel discharges the OR's live disjunct and pins note.
--
-- Falsifying data: INSERT INTO ni2_c (id, status, note) VALUES (1, 'open', NULL).
-- Observed: [1, NULL].
-- Same mechanism as check-no-inherit-tree.sql. Recorded separately because
-- it also reaches through ORIGIN tracking: wrapping the scan in a CTE and
-- filtering outside it produces the identical falsification (measured), so
-- the fix must reach the origin-side CHECK consumer too.
SELECT
  p.id,   -- @notNull
  p.note  -- @notNull  <-- FALSIFIED
FROM ni2_p p WHERE p.status = 'open'
