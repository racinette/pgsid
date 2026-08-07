-- SWEEP-4 FINDING 1, the shape that also reaches the `returnsSet` exclusion
-- (rank 1). Quarantined: `a` below is the engine's CURRENT claim and is WRONG.
--
-- Falsifying data: none.
-- Observed: three rows, `a` NULL in every one.
--
--     a      | b      | generate_series
--     -------+--------+-----------------
--     (null) | (null) |               1
--     (null) | (null) |               2
--     (null) | (null) |               3
--
-- `sw4_tab_srf` is STRICT and handed NULL, so it returns NO rows.
-- `callCanShortCircuit` excludes `returnsSet` on the argument that "a claim
-- about columns of rows that do not exist cannot be contradicted" — which is
-- true of the call alone and false of the call inside a `ROWS FROM`, where
-- the longer arm supplies the rows and the padding supplies the NULLs. The
-- exclusion is not itself wrong: the padding rule clears these flags for a
-- reason that has nothing to do with strictness, and clearing them there
-- covers this shape too.
--
-- Suspected mechanism: nullability-walk.ts `resolveTableFunctionColumns`
-- (the declared reading survives the padding) meeting `callCanShortCircuit`'s
-- `returnsSet` early return.
--
-- Attack-catalog entry: A. The `WITH ORDINALITY` spelling behaves the same
-- way, and the lone-call spelling `SELECT * FROM sw4_tab_srf(NULL)
-- WITH ORDINALITY` returns no rows at all and so contradicts nothing.
SELECT
  x.a,                  -- @notNull   <- FALSE
  x.b,                  -- @nullable
  x.generate_series     -- @nullable
FROM ROWS FROM (sw4_tab_srf(NULL::integer), generate_series(1, 3)) AS x
