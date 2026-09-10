-- A fulfilled reservation and its loan are one reconciled event. A loan may
-- have no originating reservation, and an unfulfilled reservation has no loan,
-- so the FULL JOIN independently makes each side absent in returned rows.
-- @params none
-- @null-group 0*,1*
-- @null-group 2*,3*
-- @param-rejections none
SELECT
  l.id,           -- @nullable
  l.due_on,       -- @nullable
  r.id,           -- @nullable
  r.requested_on  -- @nullable
FROM loans l
FULL JOIN reservations r ON r.fulfilled_loan_id = l.id
