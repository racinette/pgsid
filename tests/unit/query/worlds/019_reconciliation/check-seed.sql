-- name: amounts_ignore_display_scale
INSERT INTO payment_reconciliations (id, expected_amount, posted_amount, manually_approved)
VALUES (10, 12.00, 12.0, false);
-- name: absent_amounts_agree
INSERT INTO payment_reconciliations (id, expected_amount, posted_amount, manually_approved)
VALUES (10, NULL, NULL, false);
-- name: missing_posted_amount_disagrees
INSERT INTO payment_reconciliations (id, expected_amount, posted_amount, manually_approved)
VALUES (10, 12, NULL, false);
-- name: different_amounts_disagree
INSERT INTO payment_reconciliations (id, expected_amount, posted_amount, manually_approved)
VALUES (10, 12, 13, false);
-- name: approved_difference_is_allowed
INSERT INTO payment_reconciliations (id, expected_amount, posted_amount, manually_approved)
VALUES (10, 12, 13, true);
-- name: nan_amounts_agree
INSERT INTO payment_reconciliations (id, expected_amount, posted_amount, manually_approved)
VALUES (10, 'NaN', 'NaN', false);

-- name: initial_token_counts_as_rotation
INSERT INTO credential_rotations (id, previous_token, replacement_token, rotation_required)
VALUES (10, NULL, '00000000-0000-0000-0000-000000000001', true);
-- name: unchanged_token_fails_rotation
INSERT INTO credential_rotations (id, previous_token, replacement_token, rotation_required)
VALUES (10, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', true);
-- name: absent_tokens_fail_rotation
INSERT INTO credential_rotations (id, previous_token, replacement_token, rotation_required)
VALUES (10, NULL, NULL, true);
-- name: absent_tokens_agree_without_rotation
INSERT INTO credential_rotations (id, previous_token, replacement_token, rotation_required)
VALUES (10, NULL, NULL, false);

-- name: confirmed_routes_agree
INSERT INTO routing_handoffs (id, previous_route, next_route, confirmed)
VALUES (10, '192.0.2.0/24', '192.0.2.0/24', true);
-- name: prefix_difference_prevents_confirmation
INSERT INTO routing_handoffs (id, previous_route, next_route, confirmed)
VALUES (10, '192.0.2.0/32', '192.0.2.0/24', true);
-- name: missing_route_is_unconfirmed
INSERT INTO routing_handoffs (id, previous_route, next_route, confirmed)
VALUES (10, NULL, '192.0.2.0/24', false);
-- name: missing_confirmation_is_rejected
INSERT INTO routing_handoffs (id, previous_route, next_route, confirmed)
VALUES (10, NULL, NULL, NULL);

-- name: divided_share_agrees
INSERT INTO allocation_corrections (id, requested_units, assigned_units, split_count, bypass_review)
VALUES (10, 12, 3, 4, false);
-- name: missing_share_disagrees
INSERT INTO allocation_corrections (id, requested_units, assigned_units, split_count, bypass_review)
VALUES (10, 12, NULL, 4, false);
-- name: missing_allocation_agrees
INSERT INTO allocation_corrections (id, requested_units, assigned_units, split_count, bypass_review)
VALUES (10, NULL, NULL, 4, false);
-- name: null_share_does_not_hide_division_error
INSERT INTO allocation_corrections (id, requested_units, assigned_units, split_count, bypass_review)
VALUES (10, 12, NULL, 0, false);
-- name: bypass_skips_division_error
INSERT INTO allocation_corrections (id, requested_units, assigned_units, split_count, bypass_review)
VALUES (10, 12, NULL, 0, true);
-- name: division_overflow_is_preserved
INSERT INTO allocation_corrections (id, requested_units, assigned_units, split_count, bypass_review)
VALUES (10, -2147483648, NULL, -1, false);
