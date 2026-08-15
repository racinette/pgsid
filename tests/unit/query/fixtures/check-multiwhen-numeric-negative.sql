-- Token distinctness never applies to numerics: 1 and 1.0 are distinct
-- tokens naming equal values, so TRUE(n = 2) must not falsify the CHECK's
-- n = 1 arm BY TOKENS — and the kernel still refuses that. What answers
-- instead (flipped nullable→notNull when the entailment consumer landed,
-- 2026-08-12) is the evaluated comparison: `2 = 1` read at integer is
-- FALSE by PostgreSQL's own arithmetic — and 1 vs 1.0 would evaluate
-- EQUAL, exactly the case token reasoning is unsound for — so the arm
-- falsifies soundly, the second arm is selected, and b is forced non-null
-- on every returned row. The generator's n=2 rows carry non-null b, which
-- is the witness the old annotation recorded as impossible.
SELECT
  b   -- @notNull
FROM audit_log
WHERE n = 2
