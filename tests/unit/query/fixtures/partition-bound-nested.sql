-- A nested leaf's bound carries the whole ancestor conjunction (measured,
-- pinned in param-mechanism): part_2a renders part_2's [100, 200) AND its
-- own [100, 150), so a direct scan refutes guards against EITHER level —
-- ancestor_low needs the grandparent's conjunct, own_gap the leaf's. The
-- overlap guard keeps the boundary: [120, inf) reaches [120, 150), and
-- the generator's first row (id = 120, row-index rotation) fires the arm
-- in every data state.
SELECT
  CASE WHEN t.id >= 175 THEN NULL ELSE 5 END AS own_gap,      -- @notNull
  CASE WHEN t.id >= 150 THEN NULL ELSE 5 END AS own_adjacent, -- @notNull
  CASE WHEN t.id < 100  THEN NULL ELSE 5 END AS ancestor_low, -- @notNull
  CASE WHEN t.id >= 120 THEN NULL ELSE 5 END AS overlap_kept  -- @nullable
FROM part_2a t
