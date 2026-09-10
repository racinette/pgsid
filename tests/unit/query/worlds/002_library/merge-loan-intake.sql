-- The first source row renews loan 1; the second creates loan 10. This makes
-- one MERGE execute both its MATCHED update and NOT MATCHED insert arms.
-- @args ["2024-02-12", "2024-05-20"]
-- @param 1 notNull
-- @param 2 notNull
-- @null-groups none
-- @param-rejections none
MERGE INTO loans AS l
USING (VALUES
  (1, 1, 1, DATE '2024-01-15', $1::date),
  (10, 2, 3, DATE '2024-05-01', $2::date)
) AS incoming (id, member_id, book_id, checked_out_on, due_on)
ON l.id = incoming.id
WHEN MATCHED THEN
  UPDATE SET due_on = incoming.due_on, renewal_count = l.renewal_count + 1
WHEN NOT MATCHED THEN
  INSERT (id, member_id, book_id, checked_out_on, due_on, renewal_count, state)
  VALUES (incoming.id, incoming.member_id, incoming.book_id,
          incoming.checked_out_on, incoming.due_on, 0, 'open')
RETURNING
  merge_action(), -- @notNull
  l.id,           -- @notNull
  l.due_on,       -- @notNull
  incoming.id     -- @notNull
