-- @null-groups none
-- @param-rejections none
-- DELETE returns OLD rather than a row carrying the UPDATE arm's written
-- state. Its presence clears the shared NEW-row fact; PostgreSQL returns the
-- existing generated NULL from id 2 as the witness.
MERGE INTO written_state AS w
USING (VALUES (1, true), (2, false)) AS incoming(id, do_update)
ON incoming.id = w.id
WHEN MATCHED AND incoming.do_update THEN UPDATE SET state = 'full'
WHEN MATCHED THEN DELETE
RETURNING
  w.display_value -- @nullable
