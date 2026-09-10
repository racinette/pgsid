-- Rows chosen for the situations they create, not for volume.
--
--   carrier 2 has no weight band and no code, so the band CHECK evaluates NULL
--   and the row is still admitted;
--   shipment 2 is a draft: unbilled, never dispatched, and it owns NO LEGS, so
--   an outer join to legs produces a null-extended row;
--   shipment 3 is in flight, so it is dispatched with no delivery date;
--   leg 2 ends nowhere yet, leaving a nullable endpoint beside a non-null one.

INSERT INTO carriers (id, name, scac, min_weight_kg, max_weight_kg) VALUES
  (1, 'Northwind Freight', 'NWFR', 1,    20000),
  (2, 'Halden Logistics',  NULL,   NULL, NULL);

INSERT INTO shipments (id, carrier_id, declared_kg, billed_kg, status, shipped_at, delivered_at) VALUES
  (1, 1, 120.0, 130.0, 'delivered', '2024-01-02 08:00+00', '2024-01-05 17:30+00'),
  (2, 1,  40.0, NULL,  'draft',     NULL,                  NULL),
  (3, 2, 900.0, 900.0, 'shipped',   '2024-02-11 06:15+00', NULL);

INSERT INTO shipment_legs (id, shipment_id, seq, origin, destination, distance_km, surcharge) VALUES
  (1, 1, 1, 'Oslo',   'Bergen', 465.0, 12.5),
  (2, 1, 2, 'Bergen', NULL,     190.0,  0.0),
  (3, 3, 1, 'Malmo',  'Lund',    18.0,  0.0);
