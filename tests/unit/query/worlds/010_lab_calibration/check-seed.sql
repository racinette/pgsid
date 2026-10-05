-- name: observation_with_sequence
INSERT INTO observations (observation_id, run_id, sequence_number, observed_at, raw_reading, reference_reading)
VALUES (10000, 1000, 100, '2026-09-01 09:10+00', NULL, 10);
-- name: observation_with_zero_sequence
INSERT INTO observations (observation_id, run_id, sequence_number, observed_at, raw_reading, reference_reading)
VALUES (10000, 1000, 0, '2026-09-01 09:10+00', NULL, 10);

-- name: observation_with_minimum_sequence
INSERT INTO observations (observation_id, run_id, sequence_number, observed_at, raw_reading, reference_reading) VALUES (10000, 1000, -2147483648, '2026-09-01 09:10+00', NULL, 10);
-- name: observation_with_maximum_sequence
INSERT INTO observations (observation_id, run_id, sequence_number, observed_at, raw_reading, reference_reading) VALUES (10000, 1000, 2147483647, '2026-09-01 09:10+00', NULL, 10);
-- name: observation_below_ambient_range
INSERT INTO observations (observation_id, run_id, sequence_number, observed_at, raw_reading, reference_reading, ambient_celsius) VALUES (10000, 1000, 100, '2026-09-01 09:10+00', NULL, 10, -81);
-- name: observation_with_negative_reading
INSERT INTO observations (observation_id, run_id, sequence_number, observed_at, raw_reading, reference_reading) VALUES (10000, 1000, 100, '2026-09-01 09:10+00', -1, 10);
-- name: audit_with_observation
INSERT INTO review_audits (audit_id, run_id, observation_id, reviewer_label, normalized_value, control_value, review_state, reviewed_at) VALUES (10000, 1000, 1, 'Daria', 10, 10, 'accepted', '2026-09-02 10:00+00');
-- name: accepted_audit_without_observation
INSERT INTO review_audits (audit_id, run_id, observation_id, reviewer_label, normalized_value, control_value, review_state, reviewed_at) VALUES (10000, 1000, NULL, 'Daria', 10, 10, 'accepted', '2026-09-02 10:00+00');
-- name: calibration_request_without_note
INSERT INTO calibration_requests (request_id, run_id, observation_id, normalized_value, adjustment_value, request_kind, requested_by, requested_at) VALUES (10000, 1000, 1, 10, 0, 'review', 'Daria', '2026-09-02 10:00+00');
-- name: calibration_request_with_invalid_kind
INSERT INTO calibration_requests (request_id, run_id, observation_id, normalized_value, adjustment_value, request_kind, requested_by, requested_at) VALUES (10000, 1000, 1, 10, 0, 'discard', 'Daria', '2026-09-02 10:00+00');
-- name: laboratory_without_operating_note
INSERT INTO laboratories (laboratory_id, laboratory_code, display_name, region_code, commissioned_on, operating_note) VALUES (10000, 'CHECK-LAB', 'Check Laboratory', 'NORTH', '2024-01-01', NULL);
-- name: laboratory_note_repeats_code
INSERT INTO laboratories (laboratory_id, laboratory_code, display_name, region_code, commissioned_on, operating_note) VALUES (10000, 'CHECK-LAB', 'Check Laboratory', 'NORTH', '2024-01-01', 'CHECK-LAB');

-- name: observation_with_fractional_domain_reading
INSERT INTO observations (observation_id, run_id, sequence_number, observed_at, raw_reading, reference_reading) VALUES (10000, 1000, 100, '2026-09-01 09:10+00', 0.001, 0.001);
-- name: observation_with_negative_domain_reference
INSERT INTO observations (observation_id, run_id, sequence_number, observed_at, raw_reading, reference_reading) VALUES (10000, 1000, 100, '2026-09-01 09:10+00', NULL, -0.001);
-- name: observation_with_domain_reading_rounded_to_zero
INSERT INTO observations (observation_id, run_id, sequence_number, observed_at, raw_reading, reference_reading) VALUES (10000, 1000, 100, '2026-09-01 09:10+00', -0.0004, 0.0004);
-- name: observation_with_negative_domain_reading_after_rounding
INSERT INTO observations (observation_id, run_id, sequence_number, observed_at, raw_reading, reference_reading) VALUES (10000, 1000, 100, '2026-09-01 09:10+00', -0.0005, 10);
-- name: observation_with_nan_domain_reading
INSERT INTO observations (observation_id, run_id, sequence_number, observed_at, raw_reading, reference_reading) VALUES (10000, 1000, 100, '2026-09-01 09:10+00', 'NaN', 'NaN');
-- name: audit_with_negative_domain_value
INSERT INTO review_audits (audit_id, run_id, observation_id, reviewer_label, normalized_value, control_value, review_state, reviewed_at) VALUES (10000, 1000, 1, 'Daria', -0.001, 10, 'accepted', '2026-09-02 10:00+00');
-- name: audit_with_domain_value_rounded_to_zero
INSERT INTO review_audits (audit_id, run_id, observation_id, reviewer_label, normalized_value, control_value, review_state, reviewed_at) VALUES (10000, 1000, 1, 'Daria', -0.0004, 10, 'accepted', '2026-09-02 10:00+00');
-- name: audit_with_negative_base_numeric_value
INSERT INTO review_audits (audit_id, run_id, observation_id, reviewer_label, normalized_value, control_value, review_state, reviewed_at) VALUES (10000, 1000, 1, 'Daria', 10, -0.0001, 'accepted', '2026-09-02 10:00+00');
