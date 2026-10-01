-- name: member_with_email
INSERT INTO library_members (id, full_name, email, phone, state, joined_on)
VALUES (100, 'Daria Novak', 'daria@example.test', NULL, 'active', '2024-04-01');
-- name: member_with_phone
INSERT INTO library_members (id, full_name, email, phone, state, joined_on)
VALUES (100, 'Daria Novak', NULL, '+7-555-0110', 'active', '2024-04-01');
-- name: member_without_contact
INSERT INTO library_members (id, full_name, email, phone, state, joined_on)
VALUES (100, 'Daria Novak', NULL, NULL, 'active', '2024-04-01');
-- name: expired_member_without_expiry
INSERT INTO library_members (id, full_name, email, phone, state, joined_on)
VALUES (100, 'Daria Novak', 'daria@example.test', NULL, 'expired', '2024-04-01');

-- name: member_with_both_contacts
INSERT INTO library_members (id, full_name, email, phone, state, joined_on) VALUES (10000, 'Daria Novak', 'daria@example.test', '+7-555-0110', 'active', '2024-04-01');
-- name: member_with_empty_but_present_email
INSERT INTO library_members (id, full_name, email, phone, state, joined_on) VALUES (10000, 'Daria Novak', '', NULL, 'active', '2024-04-01');
-- name: member_expiry_before_joining
INSERT INTO library_members (id, full_name, email, state, joined_on, expires_on) VALUES (10000, 'Daria Novak', 'daria@example.test', 'expired', '2024-04-01', '2024-03-31');
-- name: retired_book_without_shelf
INSERT INTO books (id, isbn, title, author, retired_on, shelf_code) VALUES (10000, 'CHECK-BOOK', 'A Small Atlas', 'Niko Vale', '2026-01-01', NULL);
-- name: retired_book_still_on_shelf
INSERT INTO books (id, isbn, title, author, retired_on, shelf_code) VALUES (10000, 'CHECK-BOOK', 'A Small Atlas', 'Niko Vale', '2026-01-01', 'SCI-1');
-- name: unshelved_book_with_negative_cost
INSERT INTO books (id, isbn, title, author, replacement_cost, shelf_code) VALUES (10000, 'CHECK-BOOK', 'A Small Atlas', 'Niko Vale', -1, NULL);
-- name: loan_return_before_checkout
INSERT INTO loans (id, member_id, book_id, checked_out_on, due_on, returned_on, renewal_count, state) VALUES (10000, 1, 1, '2026-01-10', '2026-01-20', '2026-01-09', 0, 'returned');
-- name: loan_fee_waiver_without_return
INSERT INTO loans (id, member_id, book_id, checked_out_on, due_on, renewal_count, state, fee_waived_on) VALUES (10000, 1, 1, '2026-01-10', '2026-01-20', 0, 'open', '2026-01-11');
-- name: reservation_with_zero_priority
INSERT INTO reservations (id, member_id, book_id, requested_on, priority, state) VALUES (10000, 1, 1, '2026-01-10', 0, 'waiting');
-- name: reservation_with_maximum_priority
INSERT INTO reservations (id, member_id, book_id, requested_on, priority, state) VALUES (10000, 1, 1, '2026-01-10', 2147483647, 'waiting');
