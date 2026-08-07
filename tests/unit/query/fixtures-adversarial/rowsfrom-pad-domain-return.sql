-- SWEEP-4 FINDING 1 (rank 1). Quarantined: the annotations below are the
-- engine's CURRENT claims, and `dom_lenient` is one of them and is WRONG.
--
-- Falsifying data: none — the shape alone does it, over no tables at all.
-- Observed: PostgreSQL returns three rows, and only the first carries a value
-- for `dom_lenient`:
--
--     dom_lenient | generate_series
--     ------------+-----------------
--     d           |               1
--     (null)      |               2
--     (null)      |               3
--
-- `ROWS FROM` expands its arms in lockstep to the LONGEST one and NULL-pads
-- every arm that has already returned — the same rule the target list's SRF
-- padding follows, and `resolveTableFunctionColumns` states it in its own
-- comment. It acts on that rule for the BODY reading only (`bodyReadable`
-- is `functions.length === 1`) and not for the DECLARED one, so a function
-- whose declaration promises a NOT NULL DOMAIN keeps its claim through the
-- padding that falsifies it.
--
-- Suspected mechanism: nullability-walk.ts `resolveTableFunctionColumns` —
-- `push(bodyReadable ? refineColumnsFromBody(declared, …) : declared)`, and
-- the same `declared` on the coldeflist and consensus arms above it. The
-- clearance that belongs here is the one `clearShortCircuitedColumns`
-- already performs for a different reason at the same point.
--
-- Attack-catalog entry: A (the strict short-circuit) — its `ROWS FROM`
-- padding probe. Four further shapes are in the sibling fixtures.
SELECT
  x.dom_lenient,        -- @notNull   <- FALSE
  x.generate_series     -- @nullable
FROM ROWS FROM (dom_lenient('a'), generate_series(1, 3)) AS x
