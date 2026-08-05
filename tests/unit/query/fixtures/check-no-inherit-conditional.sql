-- The discriminated NO INHERIT form (adversarial-2 finding 2) — the shape
-- the entailment kernel exists for: `CHECK (status <> 'open' OR note IS
-- NOT NULL) NO INHERIT` on the parent, `WHERE status = 'open'` in the
-- query. The kernel would discharge the OR's live disjunct and pin note —
-- but the constraint was never copied to ni2_c, whose open/NULL rows come
-- back through the tree scan and witness the dropped claim. The same
-- falsification reaches through origin tracking (a CTE re-export with the
-- filter outside) — pinned separately in check-no-inherit-origin.sql.
SELECT
  p.id,   -- @notNull
  p.note  -- @nullable
FROM ni2_p p WHERE p.status = 'open'
