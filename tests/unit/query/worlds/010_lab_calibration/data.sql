INSERT INTO public.laboratories
  (laboratory_id, laboratory_code, display_name, region_code,
   commissioned_on, retired_on, operating_note)
VALUES
  (1, 'METRO', 'Metro Calibration Laboratory', 'NORTH', '2022-01-10', NULL,
   'primary electrical bench'),
  (2, 'FIELD', 'Field Calibration Laboratory', 'SOUTH', '2023-03-15', NULL, NULL);

INSERT INTO public.instruments
  (instrument_id, laboratory_id, serial_number, model_name, installed_on,
   retired_on, last_service_on, service_note)
VALUES
  (10, 1, 'TMP-100', 'Thermal reference', '2024-01-01', NULL,
   '2026-07-01', 'annual service complete'),
  (11, 1, 'TMP-101', 'Thermal field probe', '2025-02-01', NULL, NULL, NULL),
  (20, 2, 'PRS-200', 'Pressure reference', '2024-06-01', NULL, NULL, NULL);

INSERT INTO public.calibration_policies
  (policy_id, laboratory_id, policy_code, tolerance, effective_on,
   expires_on, fallback_reading, policy_note)
VALUES
  (100, 1, 'THERMAL-A', 0.5, '2026-01-01', NULL, 10.0, 'metro tolerance'),
  (200, 2, 'PRESSURE-B', 1.0, '2026-01-01', NULL, NULL, NULL);

INSERT INTO public.calibration_runs
  (run_id, instrument_id, policy_id, run_code, started_at, completed_at,
   run_state, operator_label, run_note)
VALUES
  (1000, 10, 100, 'RUN-METRO-1', '2026-09-01 09:00+00',
   '2026-09-01 10:00+00', 'complete', 'Dana', 'reference cycle'),
  (1001, 11, 100, 'RUN-METRO-2', '2026-09-01 11:00+00',
   '2026-09-01 12:00+00', 'complete', 'Dana', NULL),
  (2000, 20, 200, 'RUN-FIELD-1', '2026-09-02 09:00+00',
   NULL, 'open', 'Lee', NULL);

INSERT INTO public.observations
  (observation_id, run_id, sequence_number, observed_at, raw_reading,
   reference_reading, ambient_celsius, observation_note)
VALUES
  (1, 1000, 1, '2026-09-01 09:10+00', 10.2, 10.0, 21.5, 'stable sample'),
  (2, 1000, 2, '2026-09-01 09:20+00', NULL, 12.0, 21.7, 'sensor dropout'),
  (3, 1000, 3, '2026-09-01 09:30+00', 14.0, 13.8, NULL, NULL),
  (4, 1001, 1, '2026-09-01 11:10+00', 9.0, 9.0, NULL, NULL);

INSERT INTO public.review_audits
  (audit_id, run_id, observation_id, reviewer_label, normalized_value,
   control_value, review_state, reviewed_at, review_note)
VALUES
  (5000, 1000, 1, 'Mira', 10.2, 10.0, 'pending',
   '2026-09-03 08:00+00', 'awaiting adjustment');

INSERT INTO public.calibration_requests
  (request_id, run_id, observation_id, requested_reading, normalized_value,
   adjustment_value, request_kind, requested_by, requested_at, applied_at,
   request_note)
VALUES
  (900, 1000, 1, 10.4, 10.4, 0.2, 'adjust', 'Quinn',
   '2026-09-03 09:00+00', NULL, 'align reference'),
  (901, 1000, 3, NULL, 14.0, 0.1, 'review', 'Rae',
   '2026-09-03 09:05+00', NULL, NULL);
