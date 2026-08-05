-- FINDING 7 (rank 1) — set-returning functions in the TARGET LIST are
-- expanded in lockstep and the SHORT one is NULL-padded. `one_sku()`
-- returns SETOF non_empty_text, a NOT NULL domain, so priority 1 claims
-- notNull — a claim about the function's OWN output, which is true. The
-- padding NULL is manufactured by the projection after the function has
-- returned, so no domain constraint applies to it.
--
-- Falsifying data: none — the literal generate_series is longer.
-- Observed: [1,'only'], [2,NULL], [3,NULL].
-- Mechanism: nullability-walk.ts target-list SRF handling — the row-count
-- interaction between two SRFs in one target list is not modelled. The
-- same padding was measured for `active_skus()` (a SETOF domain over a
-- table) and does NOT apply to a scalar call (`always_text('x')` repeats).
SELECT
  generate_series(1, 3) AS g,  -- @nullable
  one_sku() AS s               -- @notNull  <-- FALSIFIED (padding rows)
