-- @world checks

CREATE TABLE flight_arrivals (
  id integer PRIMARY KEY,
  arrival_zone text NOT NULL,
  local_arrival timestamp,
  arrival_at timestamptz,
  CONSTRAINT arrival_interpretation
    CHECK (timezone(arrival_zone, local_arrival) = arrival_at)
);

CREATE TABLE arrival_displays (
  id integer PRIMARY KEY,
  display_zone text NOT NULL,
  arrival_at timestamptz,
  local_display timestamp,
  CONSTRAINT displayed_arrival
    CHECK (timezone(display_zone, arrival_at) = local_display)
);
