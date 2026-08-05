-- FINDING 2 (rank 1) — CHECK … NO INHERIT entailment over a tree scan.
-- The RC-3 closure argued the CHECK path needed no tree analogue because
-- "children carry their own pg_constraint rows and cannot drop or
-- invalidate them (measured)". True for an inheritable CHECK; a NO INHERIT
-- constraint is never copied to the child at all, and `connoinherit` is
-- not captured by the snapshot. The kernel then derives `x IS NOT NULL`
-- from a constraint no child row ever satisfied.
--
-- Falsifying data: INSERT INTO ni_c (id, x) VALUES (1, NULL).
-- Observed: [1, NULL] through `FROM ni_p`.
-- Mechanism: catalog/snapshot.ts queryConstraints (connoinherit not
-- selected) → check-entailment.ts, which sees an ordinary validated CHECK.
--
-- `FROM ONLY ni_p` would be sound — the parent's own rows do satisfy it.
SELECT
  p.id,  -- @notNull
  p.x    -- @notNull  <-- FALSIFIED
FROM ni_p p
