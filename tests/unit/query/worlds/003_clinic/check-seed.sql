-- name: patient_without_optional_contacts
INSERT INTO patients (id, full_name, date_of_birth, email, phone)
VALUES (100, 'Daria Novak', '1988-04-12', NULL, NULL);
-- name: patient_with_identical_contacts
INSERT INTO patients (id, full_name, date_of_birth, email, phone)
VALUES (100, 'Daria Novak', '1988-04-12', 'same-contact', 'same-contact');

-- name: patient_with_email_only
INSERT INTO patients (id, full_name, date_of_birth, email, phone) VALUES (10000, 'Daria Novak', '1988-04-12', 'daria@example.test', NULL);
-- name: patient_with_phone_only
INSERT INTO patients (id, full_name, date_of_birth, email, phone) VALUES (10000, 'Daria Novak', '1988-04-12', NULL, '+7-555-0110');
-- name: visit_with_left_summary_only
INSERT INTO visits (id, patient_id, clinician, scheduled_at, state, summary_left, summary_right) VALUES (10000, 1, 'Dr Chen', '2026-01-10 10:00+00', 'scheduled', 'Routine review', NULL);
-- name: visit_with_right_summary_only
INSERT INTO visits (id, patient_id, clinician, scheduled_at, state, summary_left, summary_right) VALUES (10000, 1, 'Dr Chen', '2026-01-10 10:00+00', 'scheduled', NULL, 'Routine review');
-- name: visit_with_repeated_summary
INSERT INTO visits (id, patient_id, clinician, scheduled_at, state, summary_left, summary_right) VALUES (10000, 1, 'Dr Chen', '2026-01-10 10:00+00', 'scheduled', 'Routine review', 'Routine review');
-- name: sample_without_result
INSERT INTO lab_samples (id, visit_id, test_name, state, result_value, result_unit) VALUES (10000, 1, 'Hemoglobin', 'ordered', NULL, NULL);
-- name: sample_with_result_and_unit
INSERT INTO lab_samples (id, visit_id, test_name, state, collected_at, result_value, result_unit) VALUES (10000, 1, 'Hemoglobin', 'collected', '2026-01-10 10:00+00', '142', 'g/L');
-- name: sample_with_result_without_unit
INSERT INTO lab_samples (id, visit_id, test_name, state, collected_at, result_value, result_unit) VALUES (10000, 1, 'Hemoglobin', 'collected', '2026-01-10 10:00+00', '142', NULL);
-- name: sample_with_unit_but_no_result
INSERT INTO lab_samples (id, visit_id, test_name, state, result_value, result_unit) VALUES (10000, 1, 'Hemoglobin', 'ordered', NULL, 'g/L');
-- name: verified_sample_without_reviewer
INSERT INTO lab_samples (id, visit_id, test_name, state, collected_at, result_value, result_unit, verified_at, reviewer) VALUES (10000, 1, 'Hemoglobin', 'verified', '2026-01-10 10:00+00', '142', 'g/L', '2026-01-10 11:00+00', NULL);
