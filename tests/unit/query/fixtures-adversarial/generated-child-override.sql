-- FINDING 3 (rank 1) — a generation expression diverging across the tree.
-- PostgreSQL accepts a child that defines its OWN generation expression for
-- an inherited column (measured — every other divergence route was
-- REJECTED: DROP of an inherited constraint, ONLY VALIDATE, per-child
-- enforceability, ONLY RENAME, ONLY ADD CHECK without NO INHERIT). The
-- walk evaluates the PARENT's expression at the reading site; there is no
-- `generatedTree` analogue of notNullTree, so a tree scan reads a formula
-- the child's rows were never computed with.
--
-- Falsifying data: INSERT INTO gen_c (a) VALUES (5) — the child computes
-- d = nullif(a, a) = NULL, the parent's formula is a * 2.
-- Observed: [5, NULL] through `FROM gen_p`.
-- Mechanism: catalog/snapshot.ts (ColumnInfo.generated / defaultExpr are
-- per named relation) → nullability-walk.ts generated-column dispatch.
SELECT
  g.a,  -- @notNull
  g.d   -- @notNull  <-- FALSIFIED
FROM gen_p g
