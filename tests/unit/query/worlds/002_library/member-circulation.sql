-- Three joins connect a reservation to its member, book, and optional
-- fulfillment. One loan column is selected, so no multi-column group is made.
-- @params none
-- @null-groups none
-- @param-rejections none
SELECT
  m.full_name,    -- @notNull
  b.title,        -- @notNull
  r.requested_on, -- @notNull
  l.returned_on   -- @nullable
FROM reservations r
JOIN library_members m ON m.id = r.member_id
JOIN books b ON b.id = r.book_id
LEFT JOIN loans l ON l.id = r.fulfilled_loan_id
