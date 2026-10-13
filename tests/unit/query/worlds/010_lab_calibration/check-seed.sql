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
-- name: observation_note_describes_evidence
INSERT INTO observations (observation_id, run_id, sequence_number, observed_at, raw_reading, reference_reading, observation_note) VALUES (10000, 1000, 100, '2026-09-01 09:10+00', NULL, 10, 'manual observation');
-- name: observation_note_repeats_sequence
INSERT INTO observations (observation_id, run_id, sequence_number, observed_at, raw_reading, reference_reading, observation_note) VALUES (10000, 1000, 100, '2026-09-01 09:10+00', NULL, 10, '100');
-- name: observation_note_distinguishes_maximum_sequence
INSERT INTO observations (observation_id, run_id, sequence_number, observed_at, raw_reading, reference_reading, observation_note) VALUES (10000, 1000, 2147483647, '2026-09-01 09:10+00', NULL, 10, 'final observation');
-- name: observation_note_repeats_maximum_sequence
INSERT INTO observations (observation_id, run_id, sequence_number, observed_at, raw_reading, reference_reading, observation_note) VALUES (10000, 1000, 2147483647, '2026-09-01 09:10+00', NULL, 10, '2147483647');

-- name: instrument_with_identity_and_no_service
INSERT INTO instruments (instrument_id, laboratory_id, serial_number, model_name, installed_on, retired_on, last_service_on, service_note) VALUES (10000, 1, 'CHECK-INSTRUMENT', 'Thermal reference', '2026-01-01', NULL, NULL, NULL);

-- name: instrument_serviced_and_retired_at_installation
INSERT INTO instruments (instrument_id, laboratory_id, serial_number, model_name, installed_on, retired_on, last_service_on, service_note) VALUES (10000, 1, 'CHECK-INSTRUMENT', 'Thermal reference', '2026-01-01', '2026-01-01', '2026-01-01', 'installation check');

-- name: instrument_without_serial_number
INSERT INTO instruments (instrument_id, laboratory_id, serial_number, model_name, installed_on, retired_on, last_service_on, service_note) VALUES (10000, 1, '', 'Thermal reference', '2026-01-01', NULL, NULL, NULL);

-- name: instrument_without_model
INSERT INTO instruments (instrument_id, laboratory_id, serial_number, model_name, installed_on, retired_on, last_service_on, service_note) VALUES (10000, 1, 'CHECK-INSTRUMENT', '', '2026-01-01', NULL, NULL, NULL);

-- name: instrument_retired_before_installation
INSERT INTO instruments (instrument_id, laboratory_id, serial_number, model_name, installed_on, retired_on, last_service_on, service_note) VALUES (10000, 1, 'CHECK-INSTRUMENT', 'Thermal reference', '2026-01-01', '2025-12-31', NULL, NULL);

-- name: instrument_serviced_before_installation
INSERT INTO instruments (instrument_id, laboratory_id, serial_number, model_name, installed_on, retired_on, last_service_on, service_note) VALUES (10000, 1, 'CHECK-INSTRUMENT', 'Thermal reference', '2026-01-01', NULL, '2025-12-31', NULL);

-- name: instrument_note_repeats_serial_number
INSERT INTO instruments (instrument_id, laboratory_id, serial_number, model_name, installed_on, retired_on, last_service_on, service_note) VALUES (10000, 1, 'CHECK-INSTRUMENT', 'Thermal reference', '2026-01-01', NULL, NULL, 'CHECK-INSTRUMENT');

-- name: policy_with_positive_tolerance_and_no_fallback
INSERT INTO calibration_policies (policy_id, laboratory_id, policy_code, tolerance, effective_on, expires_on, fallback_reading, policy_note) VALUES (10000, 1, 'CHECK-POLICY', 0.5, '2026-01-01', NULL, NULL, NULL);

-- name: policy_expires_on_effective_day_with_zero_fallback
INSERT INTO calibration_policies (policy_id, laboratory_id, policy_code, tolerance, effective_on, expires_on, fallback_reading, policy_note) VALUES (10000, 1, 'CHECK-POLICY', 0.5, '2026-01-01', '2026-01-01', 0, 'reference policy');

-- name: policy_without_code
INSERT INTO calibration_policies (policy_id, laboratory_id, policy_code, tolerance, effective_on, expires_on, fallback_reading, policy_note) VALUES (10000, 1, '', 0.5, '2026-01-01', NULL, NULL, NULL);

-- name: policy_with_zero_tolerance
INSERT INTO calibration_policies (policy_id, laboratory_id, policy_code, tolerance, effective_on, expires_on, fallback_reading, policy_note) VALUES (10000, 1, 'CHECK-POLICY', 0, '2026-01-01', NULL, NULL, NULL);

-- name: policy_with_negative_tolerance
INSERT INTO calibration_policies (policy_id, laboratory_id, policy_code, tolerance, effective_on, expires_on, fallback_reading, policy_note) VALUES (10000, 1, 'CHECK-POLICY', -0.001, '2026-01-01', NULL, NULL, NULL);

-- name: policy_expires_before_effective_day
INSERT INTO calibration_policies (policy_id, laboratory_id, policy_code, tolerance, effective_on, expires_on, fallback_reading, policy_note) VALUES (10000, 1, 'CHECK-POLICY', 0.5, '2026-01-01', '2025-12-31', NULL, NULL);

-- name: policy_with_negative_fallback
INSERT INTO calibration_policies (policy_id, laboratory_id, policy_code, tolerance, effective_on, expires_on, fallback_reading, policy_note) VALUES (10000, 1, 'CHECK-POLICY', 0.5, '2026-01-01', NULL, -0.001, NULL);

-- name: policy_note_repeats_code
INSERT INTO calibration_policies (policy_id, laboratory_id, policy_code, tolerance, effective_on, expires_on, fallback_reading, policy_note) VALUES (10000, 1, 'CHECK-POLICY', 0.5, '2026-01-01', NULL, NULL, 'CHECK-POLICY');

-- name: run_open_without_completion
INSERT INTO calibration_runs (run_id, instrument_id, policy_id, run_code, started_at, completed_at, run_state, operator_label, run_note) VALUES (10000, 10, 100, 'CHECK-RUN', '2026-09-01 09:00+00', NULL, 'open', 'Dana', NULL);

-- name: run_completed_at_start
INSERT INTO calibration_runs (run_id, instrument_id, policy_id, run_code, started_at, completed_at, run_state, operator_label, run_note) VALUES (10000, 10, 100, 'CHECK-RUN', '2026-09-01 09:00+00', '2026-09-01 09:00+00', 'complete', 'Dana', 'reference cycle');

-- name: run_without_code
INSERT INTO calibration_runs (run_id, instrument_id, policy_id, run_code, started_at, completed_at, run_state, operator_label, run_note) VALUES (10000, 10, 100, '', '2026-09-01 09:00+00', NULL, 'open', 'Dana', NULL);

-- name: run_without_operator
INSERT INTO calibration_runs (run_id, instrument_id, policy_id, run_code, started_at, completed_at, run_state, operator_label, run_note) VALUES (10000, 10, 100, 'CHECK-RUN', '2026-09-01 09:00+00', NULL, 'open', '', NULL);

-- name: run_open_with_completion
INSERT INTO calibration_runs (run_id, instrument_id, policy_id, run_code, started_at, completed_at, run_state, operator_label, run_note) VALUES (10000, 10, 100, 'CHECK-RUN', '2026-09-01 09:00+00', '2026-09-01 09:00+00', 'open', 'Dana', NULL);

-- name: run_complete_without_completion
INSERT INTO calibration_runs (run_id, instrument_id, policy_id, run_code, started_at, completed_at, run_state, operator_label, run_note) VALUES (10000, 10, 100, 'CHECK-RUN', '2026-09-01 09:00+00', NULL, 'complete', 'Dana', NULL);

-- name: run_complete_before_start
INSERT INTO calibration_runs (run_id, instrument_id, policy_id, run_code, started_at, completed_at, run_state, operator_label, run_note) VALUES (10000, 10, 100, 'CHECK-RUN', '2026-09-01 09:00+00', '2026-09-01 08:59:59.999999+00', 'complete', 'Dana', NULL);

-- name: run_with_unknown_state
INSERT INTO calibration_runs (run_id, instrument_id, policy_id, run_code, started_at, completed_at, run_state, operator_label, run_note) VALUES (10000, 10, 100, 'CHECK-RUN', '2026-09-01 09:00+00', NULL, 'queued', 'Dana', NULL);

-- name: run_note_repeats_code
INSERT INTO calibration_runs (run_id, instrument_id, policy_id, run_code, started_at, completed_at, run_state, operator_label, run_note) VALUES (10000, 10, 100, 'CHECK-RUN', '2026-09-01 09:00+00', NULL, 'open', 'Dana', 'CHECK-RUN');
