-- Loan 1 and reservation 3 match through fulfillment. Loan 2 has no matching
-- reservation, while reservations 1 and 2 have no fulfilled loan; together
-- those rows witness both extension arms of the circulation reconciliation.

INSERT INTO library_members
  (id, full_name, email, phone, state, joined_on, expires_on, suspended_on)
VALUES
  (1, 'Ada Moreno', 'ada@example.test', NULL, 'active', '2024-01-10', NULL, NULL),
  (2, 'Boris Petrov', NULL, '+7-555-0102', 'suspended', '2023-06-01', NULL, '2024-03-02'),
  (3, 'Chen Wei', 'chen@example.test', '+7-555-0103', 'expired', '2022-09-15', '2024-09-15', NULL);

INSERT INTO books
  (id, isbn, title, author, published_on, retired_on, replacement_cost, shelf_code)
VALUES
  (1, '978-0-00-000001-1', 'Gardens at Dusk', 'Mira Hall', '2019-04-12', NULL, 25.00, 'FIC-HAL'),
  (2, '978-0-00-000002-8', 'A Small Atlas', 'Niko Vale', NULL, '2024-02-01', 12.50, NULL),
  (3, '978-0-00-000003-5', 'Practical Astronomy', 'S. Ilyin', '2021-08-30', NULL, NULL, NULL);

INSERT INTO loans
  (id, member_id, book_id, checked_out_on, due_on, returned_on, renewal_count, state, fee_waived_on)
VALUES
  (1, 1, 1, '2024-01-15', '2024-02-05', NULL, 0, 'open', NULL),
  (2, 2, 2, '2024-02-01', '2024-02-22', '2024-02-20', 1, 'returned', '2024-02-20'),
  (3, 3, 3, '2024-03-01', '2024-03-22', NULL, 0, 'lost', NULL);

INSERT INTO reservations
  (id, member_id, book_id, requested_on, ready_on, expires_on, priority, state, fulfilled_loan_id)
VALUES
  (1, 1, 2, '2024-02-10', NULL, NULL, 1, 'waiting', NULL),
  (2, 2, 1, '2024-02-11', '2024-02-15', '2024-02-20', 2, 'ready', NULL),
  (3, 1, 1, '2024-01-12', '2024-01-14', '2024-01-18', 1, 'fulfilled', 1),
  (4, 3, 2, '2024-03-04', NULL, NULL, 3, 'cancelled', NULL);
