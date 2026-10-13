-- name: dispatch_inside_window
INSERT INTO dispatch_windows (id, requested_priority, requested_ticket, opening_priority, opening_ticket, closing_priority, closing_ticket) VALUES (100, 2, 3, 1, 10, 3, 10);
-- name: dispatch_at_exclusive_opening
INSERT INTO dispatch_windows (id, requested_priority, requested_ticket, opening_priority, opening_ticket, closing_priority, closing_ticket) VALUES (100, 1, 10, 1, 10, 3, 10);
-- name: dispatch_before_opening_ticket
INSERT INTO dispatch_windows (id, requested_priority, requested_ticket, opening_priority, opening_ticket, closing_priority, closing_ticket) VALUES (100, 1, 9, 1, 10, 3, 10);
-- name: dispatch_at_inclusive_closing
INSERT INTO dispatch_windows (id, requested_priority, requested_ticket, opening_priority, opening_ticket, closing_priority, closing_ticket) VALUES (100, 3, 10, 1, 10, 3, 10);
-- name: dispatch_after_closing_ticket
INSERT INTO dispatch_windows (id, requested_priority, requested_ticket, opening_priority, opening_ticket, closing_priority, closing_ticket) VALUES (100, 3, 11, 1, 10, 3, 10);
-- name: dispatch_first_field_decides_despite_null_ticket
INSERT INTO dispatch_windows (id, requested_priority, requested_ticket, opening_priority, opening_ticket, closing_priority, closing_ticket) VALUES (100, 2, NULL, 1, 10, 3, 10);
-- name: dispatch_null_first_field
INSERT INTO dispatch_windows (id, requested_priority, requested_ticket, opening_priority, opening_ticket, closing_priority, closing_ticket) VALUES (100, NULL, 100, 1, 10, 3, 10);
-- name: dispatch_tied_priority_with_null_ticket
INSERT INTO dispatch_windows (id, requested_priority, requested_ticket, opening_priority, opening_ticket, closing_priority, closing_ticket) VALUES (100, 3, NULL, 1, 10, 3, 10);
-- name: dispatch_bigint_ticket_boundary
INSERT INTO dispatch_windows (id, requested_priority, requested_ticket, opening_priority, opening_ticket, closing_priority, closing_ticket) VALUES (100, 3, 9223372036854775807, 1, 10, 3, 9223372036854775807);

-- name: parcel_complete_confirmation
INSERT INTO parcel_reconciliations (id, recorded_count, recorded_label, observed_count, observed_label, confirmation_required) VALUES (100, 2, 'Box A', 2, 'Box A', true);
-- name: parcel_count_disagrees
INSERT INTO parcel_reconciliations (id, recorded_count, recorded_label, observed_count, observed_label, confirmation_required) VALUES (100, 2, 'Box A', 3, 'Box A', false);
-- name: parcel_label_disagrees
INSERT INTO parcel_reconciliations (id, recorded_count, recorded_label, observed_count, observed_label, confirmation_required) VALUES (100, 2, 'Box A', 2, 'Box B', false);
-- name: parcel_incomplete_unconfirmed_label
INSERT INTO parcel_reconciliations (id, recorded_count, recorded_label, observed_count, observed_label, confirmation_required) VALUES (100, 2, NULL, 2, 'Box A', false);
-- name: parcel_incomplete_confirmed_label
INSERT INTO parcel_reconciliations (id, recorded_count, recorded_label, observed_count, observed_label, confirmation_required) VALUES (100, 2, NULL, 2, 'Box A', true);
-- name: parcel_null_count_does_not_hide_label_disagreement
INSERT INTO parcel_reconciliations (id, recorded_count, recorded_label, observed_count, observed_label, confirmation_required) VALUES (100, NULL, 'Box A', NULL, 'Box B', false);
-- name: parcel_matching_null_fields
INSERT INTO parcel_reconciliations (id, recorded_count, recorded_label, observed_count, observed_label, confirmation_required) VALUES (100, NULL, 'Box A', NULL, 'Box A', true);
-- name: parcel_all_fields_null
INSERT INTO parcel_reconciliations (id, recorded_count, recorded_label, observed_count, observed_label, confirmation_required) VALUES (100, NULL, NULL, NULL, NULL, true);

-- name: quality_tied_category_meets_score
INSERT INTO batch_quality_samples (id, quality_category, total_score, sample_count, minimum_category, minimum_score, review_waived) VALUES (100, 2, 10, 2, 2, 5, false);
-- name: quality_tied_category_below_score
INSERT INTO batch_quality_samples (id, quality_category, total_score, sample_count, minimum_category, minimum_score, review_waived) VALUES (100, 2, 8, 2, 2, 5, false);
-- name: higher_quality_category_skips_zero_divisor
INSERT INTO batch_quality_samples (id, quality_category, total_score, sample_count, minimum_category, minimum_score, review_waived) VALUES (100, 3, 10, 0, 2, 5, false);
-- name: lower_quality_category_rejects_without_division
INSERT INTO batch_quality_samples (id, quality_category, total_score, sample_count, minimum_category, minimum_score, review_waived) VALUES (100, 1, 10, 0, 2, 5, false);
-- name: null_quality_category_skips_zero_divisor
INSERT INTO batch_quality_samples (id, quality_category, total_score, sample_count, minimum_category, minimum_score, review_waived) VALUES (100, NULL, 10, 0, 2, 5, false);
-- name: tied_quality_category_reaches_zero_divisor
INSERT INTO batch_quality_samples (id, quality_category, total_score, sample_count, minimum_category, minimum_score, review_waived) VALUES (100, 2, 10, 0, 2, 5, false);
-- name: tied_quality_category_reaches_integer_overflow
INSERT INTO batch_quality_samples (id, quality_category, total_score, sample_count, minimum_category, minimum_score, review_waived) VALUES (100, 2, -2147483648, -1, 2, 5, false);
-- name: quality_waiver_skips_zero_divisor
INSERT INTO batch_quality_samples (id, quality_category, total_score, sample_count, minimum_category, minimum_score, review_waived) VALUES (100, 2, 10, 0, 2, 5, true);
-- name: tied_quality_category_with_null_score
INSERT INTO batch_quality_samples (id, quality_category, total_score, sample_count, minimum_category, minimum_score, review_waived) VALUES (100, 2, NULL, 0, 2, 5, false);

-- name: replacement_smaller_quantity
INSERT INTO replacement_requests (id, current_quantity, current_size, proposed_quantity, proposed_size, shrink_only, change_confirmed) VALUES (100, 3, 10, 2, 10, true, true);
-- name: replacement_smaller_size
INSERT INTO replacement_requests (id, current_quantity, current_size, proposed_quantity, proposed_size, shrink_only, change_confirmed) VALUES (100, 3, 10, 3, 9, true, true);
-- name: replacement_larger_quantity_rejected_for_shrink
INSERT INTO replacement_requests (id, current_quantity, current_size, proposed_quantity, proposed_size, shrink_only, change_confirmed) VALUES (100, 3, 10, 4, 9, true, true);
-- name: replacement_larger_quantity_when_growth_allowed
INSERT INTO replacement_requests (id, current_quantity, current_size, proposed_quantity, proposed_size, shrink_only, change_confirmed) VALUES (100, 3, 10, 4, 9, false, true);
-- name: replacement_identical_known_fields
INSERT INTO replacement_requests (id, current_quantity, current_size, proposed_quantity, proposed_size, shrink_only, change_confirmed) VALUES (100, 3, 10, 3, 10, false, false);
-- name: replacement_null_first_field_with_changed_size
INSERT INTO replacement_requests (id, current_quantity, current_size, proposed_quantity, proposed_size, shrink_only, change_confirmed) VALUES (100, NULL, 10, NULL, 9, true, true);
-- name: replacement_identical_null_fields_unconfirmed
INSERT INTO replacement_requests (id, current_quantity, current_size, proposed_quantity, proposed_size, shrink_only, change_confirmed) VALUES (100, NULL, NULL, NULL, NULL, false, false);
-- name: replacement_identical_null_fields_confirmed
INSERT INTO replacement_requests (id, current_quantity, current_size, proposed_quantity, proposed_size, shrink_only, change_confirmed) VALUES (100, NULL, NULL, NULL, NULL, false, true);
