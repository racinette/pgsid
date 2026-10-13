INSERT INTO payment_reconciliations (id, expected_amount, posted_amount, manually_approved)
VALUES (1, 12.00, 12.0, false), (2, NULL, NULL, false);
INSERT INTO credential_rotations (id, previous_token, replacement_token, rotation_required)
VALUES (1, NULL, '00000000-0000-0000-0000-000000000001', true);
INSERT INTO routing_handoffs (id, previous_route, next_route, confirmed)
VALUES (1, '192.0.2.0/24', '192.0.2.0/24', true);
INSERT INTO allocation_corrections (id, requested_units, assigned_units, split_count, bypass_review)
VALUES (1, 12, 3, 4, false);
