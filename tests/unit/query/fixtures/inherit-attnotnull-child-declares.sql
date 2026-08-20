-- INHERITS, the direction inherit-attnotnull-divergence.sql does not carry:
-- the CHILD declares NOT NULL on the inherited column and the PARENT does not.
--
-- Constraint merging under INHERITS runs parent → child. A child may ADD a
-- not-null the parent lacks — `cnn_c` does — and that addition binds the
-- child's own rows and nothing else. A tree scan of `cnn_p` therefore stays
-- nullable, and the parent-stored rows the generator gives a NULL
-- `legal_name` are what come back through it.
--
-- The engine reaches this by the same subtree conjunction that
-- inherit-attnotnull-divergence.sql exercises in the opposite direction: over
-- {cnn_p, cnn_c} the conjunction is false because the parent's own flag is.
-- The two fixtures pin the two directions of one rule, which is what keeps a
-- future "read the descendants too" from looking like an improvement.
--
-- The divergence docs/sqlc-disagreements.md records for
-- `ddl_create_table_inherits/GetAllOrganisations`. Measured on the pinned sqlc
-- v1.31.1: it marks the PARENT's column NOT NULL, and deleting the child from
-- the schema makes it nullable again — so the constraint flows child → parent
-- there, the direction PostgreSQL does not have.
SELECT
  p.id,          -- @notNull
  p.legal_name   -- @nullable  (only the child declares it NOT NULL)
FROM cnn_p p
