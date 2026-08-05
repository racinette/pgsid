-- A grouping-set ORDINAL numbers the EXPANDED output list (adversarial-2
-- finding 10): `g.*` is ONE ResTarget and THREE output columns, so ROLLUP
-- (1, 2, 3) groups by a, b and c — while the recorder once indexed the RAW
-- target list, found a ColumnRef whose fields are [String, A_Star],
-- recorded nothing, and the NULLing override never applied: every grouped
-- key kept its catalog notNull against the super-aggregate rows that NULL
-- all three. The recorder now runs after the FROM walk and resolves
-- ordinals against groupingOrdinalPositions — a star position carries its
-- (column, alias.column) keys directly — witnessed by the rollup rows in
-- every non-empty state. The plain spelling over explicit refs was always
-- correct (sweep-1 finding 9's pins hold).
SELECT
  g.*,
  count(*)
FROM gs g GROUP BY ROLLUP(1, 2, 3)
-- @nullable   (a: NULL on the (), (1) and (1,2) super-aggregate rows)
-- @nullable   (b)
-- @nullable   (c)
-- @notNull    (count)
