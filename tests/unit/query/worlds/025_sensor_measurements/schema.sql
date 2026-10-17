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

CREATE TABLE calibrated_magnitudes (
  id integer PRIMARY KEY,
  sensor_id integer NOT NULL REFERENCES sensor_limits (id),
  squared_value double precision,
  recorded_magnitude double precision,
  recorded_wire bytea,
  skip_validation boolean NOT NULL,
  CONSTRAINT calibrated_magnitude_value CHECK (CASE WHEN skip_validation THEN true ELSE sqrt(squared_value) IS NOT DISTINCT FROM recorded_magnitude END),
  CONSTRAINT calibrated_magnitude_wire CHECK (CASE WHEN skip_validation THEN true ELSE float8send(dsqrt(squared_value)) = recorded_wire END)
);

CREATE TABLE hashed_readings (
  id integer PRIMARY KEY,
  sensor_id integer NOT NULL REFERENCES sensor_limits(id),
  label text NOT NULL,
  reading real,
  precise_reading double precision,
  seed bigint,
  recorded_hash integer,
  recorded_seeded bigint,
  recorded_precise_hash integer,
  recorded_precise_seeded bigint,
  bypass boolean NOT NULL,
  CONSTRAINT reading_hash CHECK(CASE WHEN bypass THEN true ELSE hashfloat4(reading)=recorded_hash END),
  CONSTRAINT reading_seeded CHECK(CASE WHEN bypass THEN true ELSE hashfloat4extended(reading,seed)=recorded_seeded END),
  CONSTRAINT precise_hash CHECK(CASE WHEN bypass THEN true ELSE hashfloat8(precise_reading)=recorded_precise_hash END),
  CONSTRAINT precise_seeded CHECK(CASE WHEN bypass THEN true ELSE hashfloat8extended(precise_reading,seed)=recorded_precise_seeded END),
  CONSTRAINT reading_widened CHECK(CASE WHEN bypass THEN true ELSE hashfloat8(reading::float8)=recorded_hash END)
);
