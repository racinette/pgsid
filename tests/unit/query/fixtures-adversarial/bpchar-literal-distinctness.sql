-- ADVERSARIAL FINDING 4 — rank 1, notNull unsoundness.
--
-- Falsifying data: `INSERT INTO bp VALUES ('a', NULL);` — stored as 'a   ',
-- and admissible because the CHECK's `k = 'a '` is TRUE for it.
-- Observed: PostgreSQL returns (NULL, 'a   ') — the WHERE matches, `x` is
-- NULL — while the engine claims `x` notNull.
--
-- Suspected mechanism: the collation-gated distinctness judgment
-- (`CheckEntailment.litsDistinct`, gated by
-- `resolveLiteralDistinctnessSound` in catalog-adapter.ts) admits the builtin
-- text family by OID whitelist {25 text, 1043 varchar, 1042 bpchar} under a
-- deterministic collation, on the reasoning that "unequal bytes are unequal
-- values by the definition of a deterministic collation". That reasoning does
-- not hold for **bpchar**: `character(n)` comparison strips trailing blanks
-- BEFORE the collation is consulted, so 'a' and 'a ' are distinct tokens and
-- equal values (measured). TRUE(`k = 'a'`) therefore falsifies the CHECK's
-- `k = 'a '` disjunct, the OR passes notFALSE to `x IS NOT NULL`, and
-- totality finishes a derivation whose first step was wrong.
--
-- `colTypeRef` strips the typmod, so `character(4)` and the constraintdef's
-- `'a '::bpchar` both normalise to `character` and the effective-type guard
-- lets the pair through.
--
-- The varchar control (table `vc`) cannot reach the shape: without padding
-- the CHECK is FALSE for the analogous row, so no such row can be stored.
SELECT
  b.x,  -- @notNull  <-- FALSE: the stored row has NULL there
  b.k   -- @notNull
FROM bp b
WHERE b.k = 'a'
