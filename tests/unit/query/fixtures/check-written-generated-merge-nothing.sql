-- @null-groups none
-- @param-rejections none
-- DO NOTHING emits no row, so it does not dilute the constant written by the
-- sole row-producing arm. The generated expression is therefore non-NULL on
-- every row RETURNING can observe.
MERGE INTO written_state AS w
USING (VALUES (1, true), (2, false)) AS incoming(id, do_update)
ON incoming.id = w.id
WHEN MATCHED AND incoming.do_update THEN UPDATE SET state = 'full'
WHEN MATCHED THEN DO NOTHING
RETURNING
  w.display_value -- @notNull
