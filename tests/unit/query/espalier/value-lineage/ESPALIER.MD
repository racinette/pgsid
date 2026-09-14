---
description: hand-authored value-lineage contracts over one focused schema
---

Each fixture isolates one transformation or composition rule. Keep the schema
small and stable so fixture changes describe lineage behavior rather than
unrelated catalog differences.

The `dml/` tier composes transformations across write assignments, row images,
and data-modifying CTEs. Its fixtures may deliberately combine several syntax
features when their interaction is the contract under test.
