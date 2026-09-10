-- A small freight domain. Carriers move shipments; a shipment travels in legs.
-- Every constraint here is one a schema of this shape would actually carry,
-- which is the point: a reader can tell whether a claim about it is plausible.

CREATE TABLE carriers (
  id            int PRIMARY KEY,
  name          text NOT NULL,
  scac          text,
  min_weight_kg numeric,
  max_weight_kg numeric,
  CONSTRAINT carrier_weight_band
    CHECK (min_weight_kg <= max_weight_kg),
  CONSTRAINT carrier_names_non_empty
    CHECK (name <> '' AND (scac IS NULL OR scac <> ''))
);

CREATE TABLE shipments (
  id           int PRIMARY KEY,
  carrier_id   int NOT NULL REFERENCES carriers (id),
  declared_kg  numeric NOT NULL,
  billed_kg    numeric,
  status       text NOT NULL,
  shipped_at   timestamptz,
  delivered_at timestamptz,
  CONSTRAINT shipment_billed_covers_declared
    CHECK (billed_kg >= declared_kg),
  CONSTRAINT shipment_delivery_follows_dispatch
    CHECK (delivered_at IS NULL OR shipped_at IS NOT NULL),
  CONSTRAINT shipment_delivered_is_dated
    CHECK (status <> 'delivered'
           OR (delivered_at IS NOT NULL AND shipped_at IS NOT NULL)),
  CONSTRAINT shipment_dates_ordered
    CHECK (shipped_at IS NULL OR delivered_at IS NULL OR shipped_at <= delivered_at)
);

CREATE TABLE shipment_legs (
  id          int PRIMARY KEY,
  shipment_id int NOT NULL REFERENCES shipments (id),
  seq         int NOT NULL,
  origin      text NOT NULL,
  destination text,
  distance_km numeric,
  surcharge   numeric,
  billable_km numeric GENERATED ALWAYS AS (distance_km + surcharge) STORED,
  UNIQUE (shipment_id, seq),
  CONSTRAINT leg_distance_and_surcharge_sane
    CHECK (distance_km > 0 AND surcharge >= 0),
  CONSTRAINT leg_endpoints_differ
    CHECK (destination IS NULL OR origin <> destination)
);
