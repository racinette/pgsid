-- @world checks
CREATE DOMAIN nonnegative_reading AS real CHECK (VALUE >= '0'::real);

CREATE TABLE sensor_limits (
  id integer PRIMARY KEY,
  minimum_reading nonnegative_reading,
  maximum_reading double precision,
  nominal_reading real,
  CONSTRAINT sensor_bounds CHECK (minimum_reading <= maximum_reading),
  CONSTRAINT sensor_nominal CHECK (nominal_reading BETWEEN minimum_reading AND maximum_reading)
);

CREATE TABLE sensor_samples (
  id integer PRIMARY KEY,
  sensor_id integer NOT NULL REFERENCES sensor_limits (id),
  reading real,
  reference_reading double precision,
  divisor real,
  expected_ratio real,
  skip_ratio boolean,
  CONSTRAINT sensor_sample_match CHECK (reading IS NOT DISTINCT FROM reference_reading),
  CONSTRAINT sensor_sample_ratio CHECK (CASE WHEN skip_ratio THEN true ELSE reading / divisor IS NOT DISTINCT FROM expected_ratio END)
);

CREATE TABLE reading_imports (
  id integer PRIMARY KEY,
  sensor_id integer NOT NULL REFERENCES sensor_limits (id),
  raw_reading text,
  expected_reading real,
  skip_import boolean,
  CONSTRAINT reading_import_match CHECK (CASE WHEN skip_import THEN true ELSE raw_reading::real IS NOT DISTINCT FROM expected_reading END)
);
