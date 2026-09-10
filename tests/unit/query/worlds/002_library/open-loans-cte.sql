-- The due date is constrained inside the CTE and re-exported after joining to
-- the member who owns the loan.
-- @params none
-- @null-groups none
-- @param-rejections none
WITH open_loans AS (
  SELECT member_id, book_id, due_on
  FROM loans
  WHERE state = 'open'
)
SELECT
  m.full_name,  -- @notNull
  o.due_on,     -- @notNull
  b.title       -- @notNull
FROM open_loans o
JOIN library_members m ON m.id = o.member_id
JOIN books b ON b.id = o.book_id
