INSERT INTO dispatch_windows (id, requested_priority, requested_ticket, opening_priority, opening_ticket, closing_priority, closing_ticket)
VALUES (1, 2, 3, 1, 10, 3, 10);

INSERT INTO parcel_reconciliations (id, recorded_count, recorded_label, observed_count, observed_label, confirmation_required)
VALUES (1, 2, 'Box A', 2, 'Box A', true);

INSERT INTO batch_quality_samples (id, quality_category, total_score, sample_count, minimum_category, minimum_score, review_waived)
VALUES (1, 2, 10, 2, 2, 5, false);

INSERT INTO replacement_requests (id, current_quantity, current_size, proposed_quantity, proposed_size, shrink_only, change_confirmed)
VALUES (1, 3, 10, 2, 10, true, true);
