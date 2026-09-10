-- Patient 3 has no visit. Visits 2 and 3 have no samples. Together with visit
-- 1 and its samples, these rows witness every arm of the dependent presence
-- groups. Sample 2 is the removable collected sample used by the DELETE CTE.

INSERT INTO patients
  (id, full_name, date_of_birth, email, phone, emergency_contact)
VALUES
  (1, 'Anika Rao', '1988-04-12', 'anika@example.test', NULL, 'Dev Rao'),
  (2, 'Mikhail Sokolov', '1975-11-03', NULL, '+7-555-0202', NULL),
  (3, 'Sofia Marin', '2001-07-19', 'sofia@example.test', '+7-555-0203', NULL);

INSERT INTO visits
  (id, patient_id, clinician, scheduled_at, state, arrived_at, closed_at,
   room, summary_left, summary_right)
VALUES
  (1, 1, 'Dr Ilyin', '2025-01-08 09:00+00', 'closed',
   '2025-01-08 09:00+00', '2025-01-08 09:35+00', 'A-12', 'Routine', 'review'),
  (2, 1, 'Dr Chen', '2025-02-10 14:00+00', 'arrived',
   '2025-02-10 14:00+00', NULL, 'B-04', NULL, 'Awaiting consultation'),
  (3, 2, 'Dr Ilyin', '2025-03-15 11:30+00', 'scheduled',
   NULL, NULL, NULL, NULL, NULL);

INSERT INTO lab_samples
  (id, visit_id, test_name, state, collected_at, result_value, result_unit,
   verified_at, reviewer)
VALUES
  (1, 1, 'Hemoglobin', 'verified', '2025-01-08 09:10+00', '142', 'g/L',
   '2025-01-08 10:20+00', 'Dr Patel'),
  (2, 1, 'Culture', 'collected', '2025-01-08 09:15+00', NULL, NULL, NULL, NULL);
